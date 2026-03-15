"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.CURRENT_SESSION_VERSION = void 0;
exports.migrateSessionEntries = migrateSessionEntries;
exports.parseSessionEntries = parseSessionEntries;
exports.getLatestCompactionEntry = getLatestCompactionEntry;
exports.buildSessionContext = buildSessionContext;
exports.loadEntriesFromFile = loadEntriesFromFile;
exports.findMostRecentSession = findMostRecentSession;
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var config_js_1 = require("../config.js");
var messages_js_1 = require("./messages.js");
exports.CURRENT_SESSION_VERSION = 3;
/** Generate a unique short ID (8 hex chars, collision-checked) */
function generateId(byId) {
    for (var i = 0; i < 100; i++) {
        var id = (0, crypto_1.randomUUID)().slice(0, 8);
        if (!byId.has(id))
            return id;
    }
    // Fallback to full UUID if somehow we have collisions
    return (0, crypto_1.randomUUID)();
}
/** Migrate v1 → v2: add id/parentId tree structure. Mutates in place. */
function migrateV1ToV2(entries) {
    var ids = new Set();
    var prevId = null;
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (entry.type === "session") {
            entry.version = 2;
            continue;
        }
        entry.id = generateId(ids);
        entry.parentId = prevId;
        prevId = entry.id;
        // Convert firstKeptEntryIndex to firstKeptEntryId for compaction
        if (entry.type === "compaction") {
            var comp = entry;
            if (typeof comp.firstKeptEntryIndex === "number") {
                var targetEntry = entries[comp.firstKeptEntryIndex];
                if (targetEntry && targetEntry.type !== "session") {
                    comp.firstKeptEntryId = targetEntry.id;
                }
                delete comp.firstKeptEntryIndex;
            }
        }
    }
}
/** Migrate v2 → v3: rename hookMessage role to custom. Mutates in place. */
function migrateV2ToV3(entries) {
    for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
        var entry = entries_2[_i];
        if (entry.type === "session") {
            entry.version = 3;
            continue;
        }
        // Update message entries with hookMessage role
        if (entry.type === "message") {
            var msgEntry = entry;
            if (msgEntry.message && msgEntry.message.role === "hookMessage") {
                msgEntry.message.role = "custom";
            }
        }
    }
}
/**
 * Run all necessary migrations to bring entries to current version.
 * Mutates entries in place. Returns true if any migration was applied.
 */
function migrateToCurrentVersion(entries) {
    var _a;
    var header = entries.find(function (e) { return e.type === "session"; });
    var version = (_a = header === null || header === void 0 ? void 0 : header.version) !== null && _a !== void 0 ? _a : 1;
    if (version >= exports.CURRENT_SESSION_VERSION)
        return false;
    if (version < 2)
        migrateV1ToV2(entries);
    if (version < 3)
        migrateV2ToV3(entries);
    return true;
}
/** Exported for testing */
function migrateSessionEntries(entries) {
    migrateToCurrentVersion(entries);
}
/** Exported for compaction.test.ts */
function parseSessionEntries(content) {
    var entries = [];
    var lines = content.trim().split("\n");
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        if (!line.trim())
            continue;
        try {
            var entry = JSON.parse(line);
            entries.push(entry);
        }
        catch (_a) {
            // Skip malformed lines
        }
    }
    return entries;
}
function getLatestCompactionEntry(entries) {
    for (var i = entries.length - 1; i >= 0; i--) {
        if (entries[i].type === "compaction") {
            return entries[i];
        }
    }
    return null;
}
/**
 * Build the session context from entries using tree traversal.
 * If leafId is provided, walks from that entry to root.
 * Handles compaction and branch summaries along the path.
 */
function buildSessionContext(entries, leafId, byId) {
    // Build uuid index if not available
    if (!byId) {
        byId = new Map();
        for (var _i = 0, entries_3 = entries; _i < entries_3.length; _i++) {
            var entry = entries_3[_i];
            byId.set(entry.id, entry);
        }
    }
    // Find leaf
    var leaf;
    if (leafId === null) {
        // Explicitly null - return no messages (navigated to before first entry)
        return { messages: [], thinkingLevel: "off", model: null };
    }
    if (leafId) {
        leaf = byId.get(leafId);
    }
    if (!leaf) {
        // Fallback to last entry (when leafId is undefined)
        leaf = entries[entries.length - 1];
    }
    if (!leaf) {
        return { messages: [], thinkingLevel: "off", model: null };
    }
    // Walk from leaf to root, collecting path
    var path = [];
    var current = leaf;
    while (current) {
        path.unshift(current);
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    // Extract settings and find compaction
    var thinkingLevel = "off";
    var model = null;
    var compaction = null;
    for (var _a = 0, path_2 = path; _a < path_2.length; _a++) {
        var entry = path_2[_a];
        if (entry.type === "thinking_level_change") {
            thinkingLevel = entry.thinkingLevel;
        }
        else if (entry.type === "model_change") {
            model = { provider: entry.provider, modelId: entry.modelId };
        }
        else if (entry.type === "message" && entry.message.role === "assistant") {
            model = { provider: entry.message.provider, modelId: entry.message.model };
        }
        else if (entry.type === "compaction") {
            compaction = entry;
        }
    }
    // Build messages and collect corresponding entries
    // When there's a compaction, we need to:
    // 1. Emit summary first (entry = compaction)
    // 2. Emit kept messages (from firstKeptEntryId up to compaction)
    // 3. Emit messages after compaction
    var messages = [];
    var appendMessage = function (entry) {
        if (entry.type === "message") {
            messages.push(entry.message);
        }
        else if (entry.type === "custom_message") {
            messages.push((0, messages_js_1.createCustomMessage)(entry.customType, entry.content, entry.display, entry.details, entry.timestamp));
        }
        else if (entry.type === "branch_summary" && entry.summary) {
            messages.push((0, messages_js_1.createBranchSummaryMessage)(entry.summary, entry.fromId, entry.timestamp));
        }
    };
    if (compaction) {
        // Emit summary first
        messages.push((0, messages_js_1.createCompactionSummaryMessage)(compaction.summary, compaction.tokensBefore, compaction.timestamp));
        // Find compaction index in path
        var compactionIdx = path.findIndex(function (e) { return e.type === "compaction" && e.id === compaction.id; });
        // Emit kept messages (before compaction, starting from firstKeptEntryId)
        var foundFirstKept = false;
        for (var i = 0; i < compactionIdx; i++) {
            var entry = path[i];
            if (entry.id === compaction.firstKeptEntryId) {
                foundFirstKept = true;
            }
            if (foundFirstKept) {
                appendMessage(entry);
            }
        }
        // Emit messages after compaction
        for (var i = compactionIdx + 1; i < path.length; i++) {
            var entry = path[i];
            appendMessage(entry);
        }
    }
    else {
        // No compaction - emit all messages, handle branch summaries and custom messages
        for (var _b = 0, path_3 = path; _b < path_3.length; _b++) {
            var entry = path_3[_b];
            appendMessage(entry);
        }
    }
    return { messages: messages, thinkingLevel: thinkingLevel, model: model };
}
/**
 * Compute the default session directory for a cwd.
 * Encodes cwd into a safe directory name under ~/.pi/agent/sessions/.
 */
function getDefaultSessionDir(cwd) {
    var safePath = "--".concat(cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-"), "--");
    var sessionDir = (0, path_1.join)((0, config_js_1.getAgentDir)(), "sessions", safePath);
    if (!(0, fs_1.existsSync)(sessionDir)) {
        (0, fs_1.mkdirSync)(sessionDir, { recursive: true });
    }
    return sessionDir;
}
/** Exported for testing */
function loadEntriesFromFile(filePath) {
    if (!(0, fs_1.existsSync)(filePath))
        return [];
    var content = (0, fs_1.readFileSync)(filePath, "utf8");
    var entries = [];
    var lines = content.trim().split("\n");
    for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
        var line = lines_2[_i];
        if (!line.trim())
            continue;
        try {
            var entry = JSON.parse(line);
            entries.push(entry);
        }
        catch (_a) {
            // Skip malformed lines
        }
    }
    // Validate session header
    if (entries.length === 0)
        return entries;
    var header = entries[0];
    if (header.type !== "session" || typeof header.id !== "string") {
        return [];
    }
    return entries;
}
function isValidSessionFile(filePath) {
    try {
        var fd = (0, fs_1.openSync)(filePath, "r");
        var buffer = Buffer.alloc(512);
        var bytesRead = (0, fs_1.readSync)(fd, buffer, 0, 512, 0);
        (0, fs_1.closeSync)(fd);
        var firstLine = buffer.toString("utf8", 0, bytesRead).split("\n")[0];
        if (!firstLine)
            return false;
        var header = JSON.parse(firstLine);
        return header.type === "session" && typeof header.id === "string";
    }
    catch (_a) {
        return false;
    }
}
/** Exported for testing */
function findMostRecentSession(sessionDir) {
    var _a;
    try {
        var files = (0, fs_1.readdirSync)(sessionDir)
            .filter(function (f) { return f.endsWith(".jsonl"); })
            .map(function (f) { return (0, path_1.join)(sessionDir, f); })
            .filter(isValidSessionFile)
            .map(function (path) { return ({ path: path, mtime: (0, fs_1.statSync)(path).mtime }); })
            .sort(function (a, b) { return b.mtime.getTime() - a.mtime.getTime(); });
        return ((_a = files[0]) === null || _a === void 0 ? void 0 : _a.path) || null;
    }
    catch (_b) {
        return null;
    }
}
function isMessageWithContent(message) {
    return typeof message.role === "string" && "content" in message;
}
function extractTextContent(message) {
    var content = message.content;
    if (typeof content === "string") {
        return content;
    }
    return content
        .filter(function (block) { return block.type === "text"; })
        .map(function (block) { return block.text; })
        .join(" ");
}
function getLastActivityTime(entries) {
    var lastActivityTime;
    for (var _i = 0, entries_4 = entries; _i < entries_4.length; _i++) {
        var entry = entries_4[_i];
        if (entry.type !== "message")
            continue;
        var message = entry.message;
        if (!isMessageWithContent(message))
            continue;
        if (message.role !== "user" && message.role !== "assistant")
            continue;
        var msgTimestamp = message.timestamp;
        if (typeof msgTimestamp === "number") {
            lastActivityTime = Math.max(lastActivityTime !== null && lastActivityTime !== void 0 ? lastActivityTime : 0, msgTimestamp);
            continue;
        }
        var entryTimestamp = entry.timestamp;
        if (typeof entryTimestamp === "string") {
            var t = new Date(entryTimestamp).getTime();
            if (!Number.isNaN(t)) {
                lastActivityTime = Math.max(lastActivityTime !== null && lastActivityTime !== void 0 ? lastActivityTime : 0, t);
            }
        }
    }
    return lastActivityTime;
}
function getSessionModifiedDate(entries, header, statsMtime) {
    var lastActivityTime = getLastActivityTime(entries);
    if (typeof lastActivityTime === "number" && lastActivityTime > 0) {
        return new Date(lastActivityTime);
    }
    var headerTime = typeof header.timestamp === "string" ? new Date(header.timestamp).getTime() : NaN;
    return !Number.isNaN(headerTime) ? new Date(headerTime) : statsMtime;
}
function buildSessionInfo(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, entries, lines, _i, lines_3, line, header, stats, messageCount, firstMessage, allMessages, name_1, _a, entries_5, entry, infoEntry, message, textContent, cwd, parentSessionPath, modified, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.readFile)(filePath, "utf8")];
                case 1:
                    content = _c.sent();
                    entries = [];
                    lines = content.trim().split("\n");
                    for (_i = 0, lines_3 = lines; _i < lines_3.length; _i++) {
                        line = lines_3[_i];
                        if (!line.trim())
                            continue;
                        try {
                            entries.push(JSON.parse(line));
                        }
                        catch (_d) {
                            // Skip malformed lines
                        }
                    }
                    if (entries.length === 0)
                        return [2 /*return*/, null];
                    header = entries[0];
                    if (header.type !== "session")
                        return [2 /*return*/, null];
                    return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                case 2:
                    stats = _c.sent();
                    messageCount = 0;
                    firstMessage = "";
                    allMessages = [];
                    for (_a = 0, entries_5 = entries; _a < entries_5.length; _a++) {
                        entry = entries_5[_a];
                        // Extract session name (use latest)
                        if (entry.type === "session_info") {
                            infoEntry = entry;
                            if (infoEntry.name) {
                                name_1 = infoEntry.name.trim();
                            }
                        }
                        if (entry.type !== "message")
                            continue;
                        messageCount++;
                        message = entry.message;
                        if (!isMessageWithContent(message))
                            continue;
                        if (message.role !== "user" && message.role !== "assistant")
                            continue;
                        textContent = extractTextContent(message);
                        if (!textContent)
                            continue;
                        allMessages.push(textContent);
                        if (!firstMessage && message.role === "user") {
                            firstMessage = textContent;
                        }
                    }
                    cwd = typeof header.cwd === "string" ? header.cwd : "";
                    parentSessionPath = header.parentSession;
                    modified = getSessionModifiedDate(entries, header, stats.mtime);
                    return [2 /*return*/, {
                            path: filePath,
                            id: header.id,
                            cwd: cwd,
                            name: name_1,
                            parentSessionPath: parentSessionPath,
                            created: new Date(header.timestamp),
                            modified: modified,
                            messageCount: messageCount,
                            firstMessage: firstMessage || "(no messages)",
                            allMessagesText: allMessages.join(" "),
                        }];
                case 3:
                    _b = _c.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function listSessionsFromDir(dir_1, onProgress_1) {
    return __awaiter(this, arguments, void 0, function (dir, onProgress, progressOffset, progressTotal) {
        var sessions, dirEntries, files, total_1, loaded_1, results, _i, results_1, info, _a;
        var _this = this;
        if (progressOffset === void 0) { progressOffset = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sessions = [];
                    if (!(0, fs_1.existsSync)(dir)) {
                        return [2 /*return*/, sessions];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, promises_1.readdir)(dir)];
                case 2:
                    dirEntries = _b.sent();
                    files = dirEntries.filter(function (f) { return f.endsWith(".jsonl"); }).map(function (f) { return (0, path_1.join)(dir, f); });
                    total_1 = progressTotal !== null && progressTotal !== void 0 ? progressTotal : files.length;
                    loaded_1 = 0;
                    return [4 /*yield*/, Promise.all(files.map(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var info;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, buildSessionInfo(file)];
                                    case 1:
                                        info = _a.sent();
                                        loaded_1++;
                                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(progressOffset + loaded_1, total_1);
                                        return [2 /*return*/, info];
                                }
                            });
                        }); }))];
                case 3:
                    results = _b.sent();
                    for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                        info = results_1[_i];
                        if (info) {
                            sessions.push(info);
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, sessions];
            }
        });
    });
}
/**
 * Manages conversation sessions as append-only trees stored in JSONL files.
 *
 * Each session entry has an id and parentId forming a tree structure. The "leaf"
 * pointer tracks the current position. Appending creates a child of the current leaf.
 * Branching moves the leaf to an earlier entry, allowing new branches without
 * modifying history.
 *
 * Use buildSessionContext() to get the resolved message list for the LLM, which
 * handles compaction summaries and follows the path from root to current leaf.
 */
var SessionManager = /** @class */ (function () {
    function SessionManager(cwd, sessionDir, sessionFile, persist) {
        this.sessionId = "";
        this.flushed = false;
        this.fileEntries = [];
        this.byId = new Map();
        this.labelsById = new Map();
        this.leafId = null;
        this.cwd = cwd;
        this.sessionDir = sessionDir;
        this.persist = persist;
        if (persist && sessionDir && !(0, fs_1.existsSync)(sessionDir)) {
            (0, fs_1.mkdirSync)(sessionDir, { recursive: true });
        }
        if (sessionFile) {
            this.setSessionFile(sessionFile);
        }
        else {
            this.newSession();
        }
    }
    /** Switch to a different session file (used for resume and branching) */
    SessionManager.prototype.setSessionFile = function (sessionFile) {
        var _a;
        this.sessionFile = (0, path_1.resolve)(sessionFile);
        if ((0, fs_1.existsSync)(this.sessionFile)) {
            this.fileEntries = loadEntriesFromFile(this.sessionFile);
            // If file was empty or corrupted (no valid header), truncate and start fresh
            // to avoid appending messages without a session header (which breaks the session)
            if (this.fileEntries.length === 0) {
                var explicitPath = this.sessionFile;
                this.newSession();
                this.sessionFile = explicitPath;
                this._rewriteFile();
                this.flushed = true;
                return;
            }
            var header = this.fileEntries.find(function (e) { return e.type === "session"; });
            this.sessionId = (_a = header === null || header === void 0 ? void 0 : header.id) !== null && _a !== void 0 ? _a : (0, crypto_1.randomUUID)();
            if (migrateToCurrentVersion(this.fileEntries)) {
                this._rewriteFile();
            }
            this._buildIndex();
            this.flushed = true;
        }
        else {
            var explicitPath = this.sessionFile;
            this.newSession();
            this.sessionFile = explicitPath; // preserve explicit path from --session flag
        }
    };
    SessionManager.prototype.newSession = function (options) {
        var _a;
        this.sessionId = (_a = options === null || options === void 0 ? void 0 : options.id) !== null && _a !== void 0 ? _a : (0, crypto_1.randomUUID)();
        var timestamp = new Date().toISOString();
        var header = {
            type: "session",
            version: exports.CURRENT_SESSION_VERSION,
            id: this.sessionId,
            timestamp: timestamp,
            cwd: this.cwd,
            parentSession: options === null || options === void 0 ? void 0 : options.parentSession,
        };
        this.fileEntries = [header];
        this.byId.clear();
        this.labelsById.clear();
        this.leafId = null;
        this.flushed = false;
        if (this.persist) {
            var fileTimestamp = timestamp.replace(/[:.]/g, "-");
            this.sessionFile = (0, path_1.join)(this.getSessionDir(), "".concat(fileTimestamp, "_").concat(this.sessionId, ".jsonl"));
        }
        return this.sessionFile;
    };
    SessionManager.prototype._buildIndex = function () {
        this.byId.clear();
        this.labelsById.clear();
        this.leafId = null;
        for (var _i = 0, _a = this.fileEntries; _i < _a.length; _i++) {
            var entry = _a[_i];
            if (entry.type === "session")
                continue;
            this.byId.set(entry.id, entry);
            this.leafId = entry.id;
            if (entry.type === "label") {
                if (entry.label) {
                    this.labelsById.set(entry.targetId, entry.label);
                }
                else {
                    this.labelsById.delete(entry.targetId);
                }
            }
        }
    };
    SessionManager.prototype._rewriteFile = function () {
        if (!this.persist || !this.sessionFile)
            return;
        var content = "".concat(this.fileEntries.map(function (e) { return JSON.stringify(e); }).join("\n"), "\n");
        (0, fs_1.writeFileSync)(this.sessionFile, content);
    };
    SessionManager.prototype.isPersisted = function () {
        return this.persist;
    };
    SessionManager.prototype.getCwd = function () {
        return this.cwd;
    };
    SessionManager.prototype.getSessionDir = function () {
        return this.sessionDir;
    };
    SessionManager.prototype.getSessionId = function () {
        return this.sessionId;
    };
    SessionManager.prototype.getSessionFile = function () {
        return this.sessionFile;
    };
    SessionManager.prototype._persist = function (entry) {
        if (!this.persist || !this.sessionFile)
            return;
        var hasAssistant = this.fileEntries.some(function (e) { return e.type === "message" && e.message.role === "assistant"; });
        if (!hasAssistant) {
            // Mark as not flushed so when assistant arrives, all entries get written
            this.flushed = false;
            return;
        }
        if (!this.flushed) {
            for (var _i = 0, _a = this.fileEntries; _i < _a.length; _i++) {
                var e = _a[_i];
                (0, fs_1.appendFileSync)(this.sessionFile, "".concat(JSON.stringify(e), "\n"));
            }
            this.flushed = true;
        }
        else {
            (0, fs_1.appendFileSync)(this.sessionFile, "".concat(JSON.stringify(entry), "\n"));
        }
    };
    SessionManager.prototype._appendEntry = function (entry) {
        this.fileEntries.push(entry);
        this.byId.set(entry.id, entry);
        this.leafId = entry.id;
        this._persist(entry);
    };
    /** Append a message as child of current leaf, then advance leaf. Returns entry id.
     * Does not allow writing CompactionSummaryMessage and BranchSummaryMessage directly.
     * Reason: we want these to be top-level entries in the session, not message session entries,
     * so it is easier to find them.
     * These need to be appended via appendCompaction() and appendBranchSummary() methods.
     */
    SessionManager.prototype.appendMessage = function (message) {
        var entry = {
            type: "message",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            message: message,
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Append a thinking level change as child of current leaf, then advance leaf. Returns entry id. */
    SessionManager.prototype.appendThinkingLevelChange = function (thinkingLevel) {
        var entry = {
            type: "thinking_level_change",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            thinkingLevel: thinkingLevel,
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Append a model change as child of current leaf, then advance leaf. Returns entry id. */
    SessionManager.prototype.appendModelChange = function (provider, modelId) {
        var entry = {
            type: "model_change",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            provider: provider,
            modelId: modelId,
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Append a compaction summary as child of current leaf, then advance leaf. Returns entry id. */
    SessionManager.prototype.appendCompaction = function (summary, firstKeptEntryId, tokensBefore, details, fromHook) {
        var entry = {
            type: "compaction",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            summary: summary,
            firstKeptEntryId: firstKeptEntryId,
            tokensBefore: tokensBefore,
            details: details,
            fromHook: fromHook,
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Append a custom entry (for extensions) as child of current leaf, then advance leaf. Returns entry id. */
    SessionManager.prototype.appendCustomEntry = function (customType, data) {
        var entry = {
            type: "custom",
            customType: customType,
            data: data,
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Append a session info entry (e.g., display name). Returns entry id. */
    SessionManager.prototype.appendSessionInfo = function (name) {
        var entry = {
            type: "session_info",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            name: name.trim(),
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /** Get the current session name from the latest session_info entry, if any. */
    SessionManager.prototype.getSessionName = function () {
        // Walk entries in reverse to find the latest session_info with a name
        var entries = this.getEntries();
        for (var i = entries.length - 1; i >= 0; i--) {
            var entry = entries[i];
            if (entry.type === "session_info" && entry.name) {
                return entry.name;
            }
        }
        return undefined;
    };
    /**
     * Append a custom message entry (for extensions) that participates in LLM context.
     * @param customType Extension identifier for filtering on reload
     * @param content Message content (string or TextContent/ImageContent array)
     * @param display Whether to show in TUI (true = styled display, false = hidden)
     * @param details Optional extension-specific metadata (not sent to LLM)
     * @returns Entry id
     */
    SessionManager.prototype.appendCustomMessageEntry = function (customType, content, display, details) {
        var entry = {
            type: "custom_message",
            customType: customType,
            content: content,
            display: display,
            details: details,
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
        };
        this._appendEntry(entry);
        return entry.id;
    };
    // =========================================================================
    // Tree Traversal
    // =========================================================================
    SessionManager.prototype.getLeafId = function () {
        return this.leafId;
    };
    SessionManager.prototype.getLeafEntry = function () {
        return this.leafId ? this.byId.get(this.leafId) : undefined;
    };
    SessionManager.prototype.getEntry = function (id) {
        return this.byId.get(id);
    };
    /**
     * Get all direct children of an entry.
     */
    SessionManager.prototype.getChildren = function (parentId) {
        var children = [];
        for (var _i = 0, _a = this.byId.values(); _i < _a.length; _i++) {
            var entry = _a[_i];
            if (entry.parentId === parentId) {
                children.push(entry);
            }
        }
        return children;
    };
    /**
     * Get the label for an entry, if any.
     */
    SessionManager.prototype.getLabel = function (id) {
        return this.labelsById.get(id);
    };
    /**
     * Set or clear a label on an entry.
     * Labels are user-defined markers for bookmarking/navigation.
     * Pass undefined or empty string to clear the label.
     */
    SessionManager.prototype.appendLabelChange = function (targetId, label) {
        if (!this.byId.has(targetId)) {
            throw new Error("Entry ".concat(targetId, " not found"));
        }
        var entry = {
            type: "label",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            targetId: targetId,
            label: label,
        };
        this._appendEntry(entry);
        if (label) {
            this.labelsById.set(targetId, label);
        }
        else {
            this.labelsById.delete(targetId);
        }
        return entry.id;
    };
    /**
     * Walk from entry to root, returning all entries in path order.
     * Includes all entry types (messages, compaction, model changes, etc.).
     * Use buildSessionContext() to get the resolved messages for the LLM.
     */
    SessionManager.prototype.getBranch = function (fromId) {
        var path = [];
        var startId = fromId !== null && fromId !== void 0 ? fromId : this.leafId;
        var current = startId ? this.byId.get(startId) : undefined;
        while (current) {
            path.unshift(current);
            current = current.parentId ? this.byId.get(current.parentId) : undefined;
        }
        return path;
    };
    /**
     * Build the session context (what gets sent to the LLM).
     * Uses tree traversal from current leaf.
     */
    SessionManager.prototype.buildSessionContext = function () {
        return buildSessionContext(this.getEntries(), this.leafId, this.byId);
    };
    /**
     * Get session header.
     */
    SessionManager.prototype.getHeader = function () {
        var h = this.fileEntries.find(function (e) { return e.type === "session"; });
        return h ? h : null;
    };
    /**
     * Get all session entries (excludes header). Returns a shallow copy.
     * The session is append-only: use appendXXX() to add entries, branch() to
     * change the leaf pointer. Entries cannot be modified or deleted.
     */
    SessionManager.prototype.getEntries = function () {
        return this.fileEntries.filter(function (e) { return e.type !== "session"; });
    };
    /**
     * Get the session as a tree structure. Returns a shallow defensive copy of all entries.
     * A well-formed session has exactly one root (first entry with parentId === null).
     * Orphaned entries (broken parent chain) are also returned as roots.
     */
    SessionManager.prototype.getTree = function () {
        var entries = this.getEntries();
        var nodeMap = new Map();
        var roots = [];
        // Create nodes with resolved labels
        for (var _i = 0, entries_6 = entries; _i < entries_6.length; _i++) {
            var entry = entries_6[_i];
            var label = this.labelsById.get(entry.id);
            nodeMap.set(entry.id, { entry: entry, children: [], label: label });
        }
        // Build tree
        for (var _a = 0, entries_7 = entries; _a < entries_7.length; _a++) {
            var entry = entries_7[_a];
            var node = nodeMap.get(entry.id);
            if (entry.parentId === null || entry.parentId === entry.id) {
                roots.push(node);
            }
            else {
                var parent_1 = nodeMap.get(entry.parentId);
                if (parent_1) {
                    parent_1.children.push(node);
                }
                else {
                    // Orphan - treat as root
                    roots.push(node);
                }
            }
        }
        // Sort children by timestamp (oldest first, newest at bottom)
        // Use iterative approach to avoid stack overflow on deep trees
        var stack = __spreadArray([], roots, true);
        while (stack.length > 0) {
            var node = stack.pop();
            node.children.sort(function (a, b) { return new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime(); });
            stack.push.apply(stack, node.children);
        }
        return roots;
    };
    // =========================================================================
    // Branching
    // =========================================================================
    /**
     * Start a new branch from an earlier entry.
     * Moves the leaf pointer to the specified entry. The next appendXXX() call
     * will create a child of that entry, forming a new branch. Existing entries
     * are not modified or deleted.
     */
    SessionManager.prototype.branch = function (branchFromId) {
        if (!this.byId.has(branchFromId)) {
            throw new Error("Entry ".concat(branchFromId, " not found"));
        }
        this.leafId = branchFromId;
    };
    /**
     * Reset the leaf pointer to null (before any entries).
     * The next appendXXX() call will create a new root entry (parentId = null).
     * Use this when navigating to re-edit the first user message.
     */
    SessionManager.prototype.resetLeaf = function () {
        this.leafId = null;
    };
    /**
     * Start a new branch with a summary of the abandoned path.
     * Same as branch(), but also appends a branch_summary entry that captures
     * context from the abandoned conversation path.
     */
    SessionManager.prototype.branchWithSummary = function (branchFromId, summary, details, fromHook) {
        if (branchFromId !== null && !this.byId.has(branchFromId)) {
            throw new Error("Entry ".concat(branchFromId, " not found"));
        }
        this.leafId = branchFromId;
        var entry = {
            type: "branch_summary",
            id: generateId(this.byId),
            parentId: branchFromId,
            timestamp: new Date().toISOString(),
            fromId: branchFromId !== null && branchFromId !== void 0 ? branchFromId : "root",
            summary: summary,
            details: details,
            fromHook: fromHook,
        };
        this._appendEntry(entry);
        return entry.id;
    };
    /**
     * Create a new session file containing only the path from root to the specified leaf.
     * Useful for extracting a single conversation path from a branched session.
     * Returns the new session file path, or undefined if not persisting.
     */
    SessionManager.prototype.createBranchedSession = function (leafId) {
        var _a, _b;
        var previousSessionFile = this.sessionFile;
        var path = this.getBranch(leafId);
        if (path.length === 0) {
            throw new Error("Entry ".concat(leafId, " not found"));
        }
        // Filter out LabelEntry from path - we'll recreate them from the resolved map
        var pathWithoutLabels = path.filter(function (e) { return e.type !== "label"; });
        var newSessionId = (0, crypto_1.randomUUID)();
        var timestamp = new Date().toISOString();
        var fileTimestamp = timestamp.replace(/[:.]/g, "-");
        var newSessionFile = (0, path_1.join)(this.getSessionDir(), "".concat(fileTimestamp, "_").concat(newSessionId, ".jsonl"));
        var header = {
            type: "session",
            version: exports.CURRENT_SESSION_VERSION,
            id: newSessionId,
            timestamp: timestamp,
            cwd: this.cwd,
            parentSession: this.persist ? previousSessionFile : undefined,
        };
        // Collect labels for entries in the path
        var pathEntryIds = new Set(pathWithoutLabels.map(function (e) { return e.id; }));
        var labelsToWrite = [];
        for (var _i = 0, _c = this.labelsById; _i < _c.length; _i++) {
            var _d = _c[_i], targetId = _d[0], label = _d[1];
            if (pathEntryIds.has(targetId)) {
                labelsToWrite.push({ targetId: targetId, label: label });
            }
        }
        if (this.persist) {
            // Build label entries
            var lastEntryId = ((_a = pathWithoutLabels[pathWithoutLabels.length - 1]) === null || _a === void 0 ? void 0 : _a.id) || null;
            var parentId_1 = lastEntryId;
            var labelEntries_1 = [];
            for (var _e = 0, labelsToWrite_1 = labelsToWrite; _e < labelsToWrite_1.length; _e++) {
                var _f = labelsToWrite_1[_e], targetId = _f.targetId, label = _f.label;
                var labelEntry = {
                    type: "label",
                    id: generateId(new Set(pathEntryIds)),
                    parentId: parentId_1,
                    timestamp: new Date().toISOString(),
                    targetId: targetId,
                    label: label,
                };
                pathEntryIds.add(labelEntry.id);
                labelEntries_1.push(labelEntry);
                parentId_1 = labelEntry.id;
            }
            this.fileEntries = __spreadArray(__spreadArray([header], pathWithoutLabels, true), labelEntries_1, true);
            this.sessionId = newSessionId;
            this.sessionFile = newSessionFile;
            this._buildIndex();
            // Only write the file now if it contains an assistant message.
            // Otherwise defer to _persist(), which creates the file on the
            // first assistant response, matching the newSession() contract
            // and avoiding the duplicate-header bug when _persist()'s
            // no-assistant guard later resets flushed to false.
            var hasAssistant = this.fileEntries.some(function (e) { return e.type === "message" && e.message.role === "assistant"; });
            if (hasAssistant) {
                this._rewriteFile();
                this.flushed = true;
            }
            else {
                this.flushed = false;
            }
            return newSessionFile;
        }
        // In-memory mode: replace current session with the path + labels
        var labelEntries = [];
        var parentId = ((_b = pathWithoutLabels[pathWithoutLabels.length - 1]) === null || _b === void 0 ? void 0 : _b.id) || null;
        for (var _g = 0, labelsToWrite_2 = labelsToWrite; _g < labelsToWrite_2.length; _g++) {
            var _h = labelsToWrite_2[_g], targetId = _h.targetId, label = _h.label;
            var labelEntry = {
                type: "label",
                id: generateId(new Set(__spreadArray(__spreadArray([], pathEntryIds, true), labelEntries.map(function (e) { return e.id; }), true))),
                parentId: parentId,
                timestamp: new Date().toISOString(),
                targetId: targetId,
                label: label,
            };
            labelEntries.push(labelEntry);
            parentId = labelEntry.id;
        }
        this.fileEntries = __spreadArray(__spreadArray([header], pathWithoutLabels, true), labelEntries, true);
        this.sessionId = newSessionId;
        this._buildIndex();
        return undefined;
    };
    /**
     * Create a new session.
     * @param cwd Working directory (stored in session header)
     * @param sessionDir Optional session directory. If omitted, uses default (~/.pi/agent/sessions/<encoded-cwd>/).
     */
    SessionManager.create = function (cwd, sessionDir) {
        var dir = sessionDir !== null && sessionDir !== void 0 ? sessionDir : getDefaultSessionDir(cwd);
        return new SessionManager(cwd, dir, undefined, true);
    };
    /**
     * Open a specific session file.
     * @param path Path to session file
     * @param sessionDir Optional session directory for /new or /branch. If omitted, derives from file's parent.
     */
    SessionManager.open = function (path, sessionDir) {
        var _a;
        // Extract cwd from session header if possible, otherwise use process.cwd()
        var entries = loadEntriesFromFile(path);
        var header = entries.find(function (e) { return e.type === "session"; });
        var cwd = (_a = header === null || header === void 0 ? void 0 : header.cwd) !== null && _a !== void 0 ? _a : process.cwd();
        // If no sessionDir provided, derive from file's parent directory
        var dir = sessionDir !== null && sessionDir !== void 0 ? sessionDir : (0, path_1.resolve)(path, "..");
        return new SessionManager(cwd, dir, path, true);
    };
    /**
     * Continue the most recent session, or create new if none.
     * @param cwd Working directory
     * @param sessionDir Optional session directory. If omitted, uses default (~/.pi/agent/sessions/<encoded-cwd>/).
     */
    SessionManager.continueRecent = function (cwd, sessionDir) {
        var dir = sessionDir !== null && sessionDir !== void 0 ? sessionDir : getDefaultSessionDir(cwd);
        var mostRecent = findMostRecentSession(dir);
        if (mostRecent) {
            return new SessionManager(cwd, dir, mostRecent, true);
        }
        return new SessionManager(cwd, dir, undefined, true);
    };
    /** Create an in-memory session (no file persistence) */
    SessionManager.inMemory = function (cwd) {
        if (cwd === void 0) { cwd = process.cwd(); }
        return new SessionManager(cwd, "", undefined, false);
    };
    /**
     * Fork a session from another project directory into the current project.
     * Creates a new session in the target cwd with the full history from the source session.
     * @param sourcePath Path to the source session file
     * @param targetCwd Target working directory (where the new session will be stored)
     * @param sessionDir Optional session directory. If omitted, uses default for targetCwd.
     */
    SessionManager.forkFrom = function (sourcePath, targetCwd, sessionDir) {
        var sourceEntries = loadEntriesFromFile(sourcePath);
        if (sourceEntries.length === 0) {
            throw new Error("Cannot fork: source session file is empty or invalid: ".concat(sourcePath));
        }
        var sourceHeader = sourceEntries.find(function (e) { return e.type === "session"; });
        if (!sourceHeader) {
            throw new Error("Cannot fork: source session has no header: ".concat(sourcePath));
        }
        var dir = sessionDir !== null && sessionDir !== void 0 ? sessionDir : getDefaultSessionDir(targetCwd);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        // Create new session file with new ID but forked content
        var newSessionId = (0, crypto_1.randomUUID)();
        var timestamp = new Date().toISOString();
        var fileTimestamp = timestamp.replace(/[:.]/g, "-");
        var newSessionFile = (0, path_1.join)(dir, "".concat(fileTimestamp, "_").concat(newSessionId, ".jsonl"));
        // Write new header pointing to source as parent, with updated cwd
        var newHeader = {
            type: "session",
            version: exports.CURRENT_SESSION_VERSION,
            id: newSessionId,
            timestamp: timestamp,
            cwd: targetCwd,
            parentSession: sourcePath,
        };
        (0, fs_1.appendFileSync)(newSessionFile, "".concat(JSON.stringify(newHeader), "\n"));
        // Copy all non-header entries from source
        for (var _i = 0, sourceEntries_1 = sourceEntries; _i < sourceEntries_1.length; _i++) {
            var entry = sourceEntries_1[_i];
            if (entry.type !== "session") {
                (0, fs_1.appendFileSync)(newSessionFile, "".concat(JSON.stringify(entry), "\n"));
            }
        }
        return new SessionManager(targetCwd, dir, newSessionFile, true);
    };
    /**
     * List all sessions for a directory.
     * @param cwd Working directory (used to compute default session directory)
     * @param sessionDir Optional session directory. If omitted, uses default (~/.pi/agent/sessions/<encoded-cwd>/).
     * @param onProgress Optional callback for progress updates (loaded, total)
     */
    SessionManager.list = function (cwd, sessionDir, onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dir = sessionDir !== null && sessionDir !== void 0 ? sessionDir : getDefaultSessionDir(cwd);
                        return [4 /*yield*/, listSessionsFromDir(dir, onProgress)];
                    case 1:
                        sessions = _a.sent();
                        sessions.sort(function (a, b) { return b.modified.getTime() - a.modified.getTime(); });
                        return [2 /*return*/, sessions];
                }
            });
        });
    };
    /**
     * List all sessions across all project directories.
     * @param onProgress Optional callback for progress updates (loaded, total)
     */
    SessionManager.listAll = function (onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionsDir, entries, dirs, totalFiles_1, dirFiles, _loop_1, _i, dirs_1, dir, loaded_2, sessions, allFiles, results, _a, results_2, info, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sessionsDir = (0, config_js_1.getSessionsDir)();
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        if (!(0, fs_1.existsSync)(sessionsDir)) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, (0, promises_1.readdir)(sessionsDir, { withFileTypes: true })];
                    case 2:
                        entries = _c.sent();
                        dirs = entries.filter(function (e) { return e.isDirectory(); }).map(function (e) { return (0, path_1.join)(sessionsDir, e.name); });
                        totalFiles_1 = 0;
                        dirFiles = [];
                        _loop_1 = function (dir) {
                            var files, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, (0, promises_1.readdir)(dir)];
                                    case 1:
                                        files = (_e.sent()).filter(function (f) { return f.endsWith(".jsonl"); });
                                        dirFiles.push(files.map(function (f) { return (0, path_1.join)(dir, f); }));
                                        totalFiles_1 += files.length;
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _d = _e.sent();
                                        dirFiles.push([]);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, dirs_1 = dirs;
                        _c.label = 3;
                    case 3:
                        if (!(_i < dirs_1.length)) return [3 /*break*/, 6];
                        dir = dirs_1[_i];
                        return [5 /*yield**/, _loop_1(dir)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        loaded_2 = 0;
                        sessions = [];
                        allFiles = dirFiles.flat();
                        return [4 /*yield*/, Promise.all(allFiles.map(function (file) { return __awaiter(_this, void 0, void 0, function () {
                                var info;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, buildSessionInfo(file)];
                                        case 1:
                                            info = _a.sent();
                                            loaded_2++;
                                            onProgress === null || onProgress === void 0 ? void 0 : onProgress(loaded_2, totalFiles_1);
                                            return [2 /*return*/, info];
                                    }
                                });
                            }); }))];
                    case 7:
                        results = _c.sent();
                        for (_a = 0, results_2 = results; _a < results_2.length; _a++) {
                            info = results_2[_a];
                            if (info) {
                                sessions.push(info);
                            }
                        }
                        sessions.sort(function (a, b) { return b.modified.getTime() - a.modified.getTime(); });
                        return [2 /*return*/, sessions];
                    case 8:
                        _b = _c.sent();
                        return [2 /*return*/, []];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return SessionManager;
}());
exports.SessionManager = SessionManager;
