"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.SettingsManager = exports.InMemorySettingsStorage = exports.FileSettingsStorage = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var proper_lockfile_1 = require("proper-lockfile");
var config_js_1 = require("../config.js");
/** Deep merge settings: project/overrides take precedence, nested objects merge recursively */
function deepMergeSettings(base, overrides) {
    var result = __assign({}, base);
    for (var _i = 0, _a = Object.keys(overrides); _i < _a.length; _i++) {
        var key = _a[_i];
        var overrideValue = overrides[key];
        var baseValue = base[key];
        if (overrideValue === undefined) {
            continue;
        }
        // For nested objects, merge recursively
        if (typeof overrideValue === "object" &&
            overrideValue !== null &&
            !Array.isArray(overrideValue) &&
            typeof baseValue === "object" &&
            baseValue !== null &&
            !Array.isArray(baseValue)) {
            result[key] = __assign(__assign({}, baseValue), overrideValue);
        }
        else {
            // For primitives and arrays, override value wins
            result[key] = overrideValue;
        }
    }
    return result;
}
var FileSettingsStorage = /** @class */ (function () {
    function FileSettingsStorage(cwd, agentDir) {
        if (cwd === void 0) { cwd = process.cwd(); }
        if (agentDir === void 0) { agentDir = (0, config_js_1.getAgentDir)(); }
        this.globalSettingsPath = (0, path_1.join)(agentDir, "settings.json");
        this.projectSettingsPath = (0, path_1.join)(cwd, config_js_1.CONFIG_DIR_NAME, "settings.json");
    }
    FileSettingsStorage.prototype.acquireLockSyncWithRetry = function (path) {
        var _a;
        var maxAttempts = 10;
        var delayMs = 20;
        var lastError;
        for (var attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return proper_lockfile_1.default.lockSync(path, { realpath: false });
            }
            catch (error) {
                var code = typeof error === "object" && error !== null && "code" in error
                    ? String(error.code)
                    : undefined;
                if (code !== "ELOCKED" || attempt === maxAttempts) {
                    throw error;
                }
                lastError = error;
                var start = Date.now();
                while (Date.now() - start < delayMs) {
                    // Sleep synchronously to avoid changing callers to async.
                }
            }
        }
        throw (_a = lastError) !== null && _a !== void 0 ? _a : new Error("Failed to acquire settings lock");
    };
    FileSettingsStorage.prototype.withLock = function (scope, fn) {
        var path = scope === "global" ? this.globalSettingsPath : this.projectSettingsPath;
        var dir = (0, path_1.dirname)(path);
        var release;
        try {
            // Only create directory and lock if file exists or we need to write
            var fileExists = (0, fs_1.existsSync)(path);
            if (fileExists) {
                release = this.acquireLockSyncWithRetry(path);
            }
            var current = fileExists ? (0, fs_1.readFileSync)(path, "utf-8") : undefined;
            var next = fn(current);
            if (next !== undefined) {
                // Only create directory when we actually need to write
                if (!(0, fs_1.existsSync)(dir)) {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
                if (!release) {
                    release = this.acquireLockSyncWithRetry(path);
                }
                (0, fs_1.writeFileSync)(path, next, "utf-8");
            }
        }
        finally {
            if (release) {
                release();
            }
        }
    };
    return FileSettingsStorage;
}());
exports.FileSettingsStorage = FileSettingsStorage;
var InMemorySettingsStorage = /** @class */ (function () {
    function InMemorySettingsStorage() {
    }
    InMemorySettingsStorage.prototype.withLock = function (scope, fn) {
        var current = scope === "global" ? this.global : this.project;
        var next = fn(current);
        if (next !== undefined) {
            if (scope === "global") {
                this.global = next;
            }
            else {
                this.project = next;
            }
        }
    };
    return InMemorySettingsStorage;
}());
exports.InMemorySettingsStorage = InMemorySettingsStorage;
var SettingsManager = /** @class */ (function () {
    function SettingsManager(storage, initialGlobal, initialProject, globalLoadError, projectLoadError, initialErrors) {
        if (globalLoadError === void 0) { globalLoadError = null; }
        if (projectLoadError === void 0) { projectLoadError = null; }
        if (initialErrors === void 0) { initialErrors = []; }
        this.modifiedFields = new Set(); // Track global fields modified during session
        this.modifiedNestedFields = new Map(); // Track global nested field modifications
        this.modifiedProjectFields = new Set(); // Track project fields modified during session
        this.modifiedProjectNestedFields = new Map(); // Track project nested field modifications
        this.globalSettingsLoadError = null; // Track if global settings file had parse errors
        this.projectSettingsLoadError = null; // Track if project settings file had parse errors
        this.writeQueue = Promise.resolve();
        this.storage = storage;
        this.globalSettings = initialGlobal;
        this.projectSettings = initialProject;
        this.globalSettingsLoadError = globalLoadError;
        this.projectSettingsLoadError = projectLoadError;
        this.errors = __spreadArray([], initialErrors, true);
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
    }
    /** Create a SettingsManager that loads from files */
    SettingsManager.create = function (cwd, agentDir) {
        if (cwd === void 0) { cwd = process.cwd(); }
        if (agentDir === void 0) { agentDir = (0, config_js_1.getAgentDir)(); }
        var storage = new FileSettingsStorage(cwd, agentDir);
        return SettingsManager.fromStorage(storage);
    };
    /** Create a SettingsManager from an arbitrary storage backend */
    SettingsManager.fromStorage = function (storage) {
        var globalLoad = SettingsManager.tryLoadFromStorage(storage, "global");
        var projectLoad = SettingsManager.tryLoadFromStorage(storage, "project");
        var initialErrors = [];
        if (globalLoad.error) {
            initialErrors.push({ scope: "global", error: globalLoad.error });
        }
        if (projectLoad.error) {
            initialErrors.push({ scope: "project", error: projectLoad.error });
        }
        return new SettingsManager(storage, globalLoad.settings, projectLoad.settings, globalLoad.error, projectLoad.error, initialErrors);
    };
    /** Create an in-memory SettingsManager (no file I/O) */
    SettingsManager.inMemory = function (settings) {
        if (settings === void 0) { settings = {}; }
        var storage = new InMemorySettingsStorage();
        return new SettingsManager(storage, settings, {});
    };
    SettingsManager.loadFromStorage = function (storage, scope) {
        var content;
        storage.withLock(scope, function (current) {
            content = current;
            return undefined;
        });
        if (!content) {
            return {};
        }
        var settings = JSON.parse(content);
        return SettingsManager.migrateSettings(settings);
    };
    SettingsManager.tryLoadFromStorage = function (storage, scope) {
        try {
            return { settings: SettingsManager.loadFromStorage(storage, scope), error: null };
        }
        catch (error) {
            return { settings: {}, error: error };
        }
    };
    /** Migrate old settings format to new format */
    SettingsManager.migrateSettings = function (settings) {
        // Migrate queueMode -> steeringMode
        if ("queueMode" in settings && !("steeringMode" in settings)) {
            settings.steeringMode = settings.queueMode;
            delete settings.queueMode;
        }
        // Migrate legacy websockets boolean -> transport enum
        if (!("transport" in settings) && typeof settings.websockets === "boolean") {
            settings.transport = settings.websockets ? "websocket" : "sse";
            delete settings.websockets;
        }
        // Migrate old skills object format to new array format
        if ("skills" in settings &&
            typeof settings.skills === "object" &&
            settings.skills !== null &&
            !Array.isArray(settings.skills)) {
            var skillsSettings = settings.skills;
            if (skillsSettings.enableSkillCommands !== undefined && settings.enableSkillCommands === undefined) {
                settings.enableSkillCommands = skillsSettings.enableSkillCommands;
            }
            if (Array.isArray(skillsSettings.customDirectories) && skillsSettings.customDirectories.length > 0) {
                settings.skills = skillsSettings.customDirectories;
            }
            else {
                delete settings.skills;
            }
        }
        return settings;
    };
    SettingsManager.prototype.getGlobalSettings = function () {
        return structuredClone(this.globalSettings);
    };
    SettingsManager.prototype.getProjectSettings = function () {
        return structuredClone(this.projectSettings);
    };
    SettingsManager.prototype.reload = function () {
        var globalLoad = SettingsManager.tryLoadFromStorage(this.storage, "global");
        if (!globalLoad.error) {
            this.globalSettings = globalLoad.settings;
            this.globalSettingsLoadError = null;
        }
        else {
            this.globalSettingsLoadError = globalLoad.error;
            this.recordError("global", globalLoad.error);
        }
        this.modifiedFields.clear();
        this.modifiedNestedFields.clear();
        this.modifiedProjectFields.clear();
        this.modifiedProjectNestedFields.clear();
        var projectLoad = SettingsManager.tryLoadFromStorage(this.storage, "project");
        if (!projectLoad.error) {
            this.projectSettings = projectLoad.settings;
            this.projectSettingsLoadError = null;
        }
        else {
            this.projectSettingsLoadError = projectLoad.error;
            this.recordError("project", projectLoad.error);
        }
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
    };
    /** Apply additional overrides on top of current settings */
    SettingsManager.prototype.applyOverrides = function (overrides) {
        this.settings = deepMergeSettings(this.settings, overrides);
    };
    /** Mark a global field as modified during this session */
    SettingsManager.prototype.markModified = function (field, nestedKey) {
        this.modifiedFields.add(field);
        if (nestedKey) {
            if (!this.modifiedNestedFields.has(field)) {
                this.modifiedNestedFields.set(field, new Set());
            }
            this.modifiedNestedFields.get(field).add(nestedKey);
        }
    };
    /** Mark a project field as modified during this session */
    SettingsManager.prototype.markProjectModified = function (field, nestedKey) {
        this.modifiedProjectFields.add(field);
        if (nestedKey) {
            if (!this.modifiedProjectNestedFields.has(field)) {
                this.modifiedProjectNestedFields.set(field, new Set());
            }
            this.modifiedProjectNestedFields.get(field).add(nestedKey);
        }
    };
    SettingsManager.prototype.recordError = function (scope, error) {
        var normalizedError = error instanceof Error ? error : new Error(String(error));
        this.errors.push({ scope: scope, error: normalizedError });
    };
    SettingsManager.prototype.clearModifiedScope = function (scope) {
        if (scope === "global") {
            this.modifiedFields.clear();
            this.modifiedNestedFields.clear();
            return;
        }
        this.modifiedProjectFields.clear();
        this.modifiedProjectNestedFields.clear();
    };
    SettingsManager.prototype.enqueueWrite = function (scope, task) {
        var _this = this;
        this.writeQueue = this.writeQueue
            .then(function () {
            task();
            _this.clearModifiedScope(scope);
        })
            .catch(function (error) {
            _this.recordError(scope, error);
        });
    };
    SettingsManager.prototype.cloneModifiedNestedFields = function (source) {
        var snapshot = new Map();
        for (var _i = 0, _a = source.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            snapshot.set(key, new Set(value));
        }
        return snapshot;
    };
    SettingsManager.prototype.persistScopedSettings = function (scope, snapshotSettings, modifiedFields, modifiedNestedFields) {
        this.storage.withLock(scope, function (current) {
            var _a;
            var currentFileSettings = current
                ? SettingsManager.migrateSettings(JSON.parse(current))
                : {};
            var mergedSettings = __assign({}, currentFileSettings);
            for (var _i = 0, modifiedFields_1 = modifiedFields; _i < modifiedFields_1.length; _i++) {
                var field = modifiedFields_1[_i];
                var value = snapshotSettings[field];
                if (modifiedNestedFields.has(field) && typeof value === "object" && value !== null) {
                    var nestedModified = modifiedNestedFields.get(field);
                    var baseNested = (_a = currentFileSettings[field]) !== null && _a !== void 0 ? _a : {};
                    var inMemoryNested = value;
                    var mergedNested = __assign({}, baseNested);
                    for (var _b = 0, nestedModified_1 = nestedModified; _b < nestedModified_1.length; _b++) {
                        var nestedKey = nestedModified_1[_b];
                        mergedNested[nestedKey] = inMemoryNested[nestedKey];
                    }
                    mergedSettings[field] = mergedNested;
                }
                else {
                    mergedSettings[field] = value;
                }
            }
            return JSON.stringify(mergedSettings, null, 2);
        });
    };
    SettingsManager.prototype.save = function () {
        var _this = this;
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
        if (this.globalSettingsLoadError) {
            return;
        }
        var snapshotGlobalSettings = structuredClone(this.globalSettings);
        var modifiedFields = new Set(this.modifiedFields);
        var modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedNestedFields);
        this.enqueueWrite("global", function () {
            _this.persistScopedSettings("global", snapshotGlobalSettings, modifiedFields, modifiedNestedFields);
        });
    };
    SettingsManager.prototype.saveProjectSettings = function (settings) {
        var _this = this;
        this.projectSettings = structuredClone(settings);
        this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
        if (this.projectSettingsLoadError) {
            return;
        }
        var snapshotProjectSettings = structuredClone(this.projectSettings);
        var modifiedFields = new Set(this.modifiedProjectFields);
        var modifiedNestedFields = this.cloneModifiedNestedFields(this.modifiedProjectNestedFields);
        this.enqueueWrite("project", function () {
            _this.persistScopedSettings("project", snapshotProjectSettings, modifiedFields, modifiedNestedFields);
        });
    };
    SettingsManager.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.writeQueue];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SettingsManager.prototype.drainErrors = function () {
        var drained = __spreadArray([], this.errors, true);
        this.errors = [];
        return drained;
    };
    SettingsManager.prototype.getLastChangelogVersion = function () {
        return this.settings.lastChangelogVersion;
    };
    SettingsManager.prototype.setLastChangelogVersion = function (version) {
        this.globalSettings.lastChangelogVersion = version;
        this.markModified("lastChangelogVersion");
        this.save();
    };
    SettingsManager.prototype.getDefaultProvider = function () {
        return this.settings.defaultProvider;
    };
    SettingsManager.prototype.getDefaultModel = function () {
        return this.settings.defaultModel;
    };
    SettingsManager.prototype.setDefaultProvider = function (provider) {
        this.globalSettings.defaultProvider = provider;
        this.markModified("defaultProvider");
        this.save();
    };
    SettingsManager.prototype.setDefaultModel = function (modelId) {
        this.globalSettings.defaultModel = modelId;
        this.markModified("defaultModel");
        this.save();
    };
    SettingsManager.prototype.setDefaultModelAndProvider = function (provider, modelId) {
        this.globalSettings.defaultProvider = provider;
        this.globalSettings.defaultModel = modelId;
        this.markModified("defaultProvider");
        this.markModified("defaultModel");
        this.save();
    };
    SettingsManager.prototype.getSteeringMode = function () {
        return this.settings.steeringMode || "one-at-a-time";
    };
    SettingsManager.prototype.setSteeringMode = function (mode) {
        this.globalSettings.steeringMode = mode;
        this.markModified("steeringMode");
        this.save();
    };
    SettingsManager.prototype.getFollowUpMode = function () {
        return this.settings.followUpMode || "one-at-a-time";
    };
    SettingsManager.prototype.setFollowUpMode = function (mode) {
        this.globalSettings.followUpMode = mode;
        this.markModified("followUpMode");
        this.save();
    };
    SettingsManager.prototype.getTheme = function () {
        return this.settings.theme;
    };
    SettingsManager.prototype.setTheme = function (theme) {
        this.globalSettings.theme = theme;
        this.markModified("theme");
        this.save();
    };
    SettingsManager.prototype.getDefaultThinkingLevel = function () {
        return this.settings.defaultThinkingLevel;
    };
    SettingsManager.prototype.setDefaultThinkingLevel = function (level) {
        this.globalSettings.defaultThinkingLevel = level;
        this.markModified("defaultThinkingLevel");
        this.save();
    };
    SettingsManager.prototype.getTransport = function () {
        var _a;
        return (_a = this.settings.transport) !== null && _a !== void 0 ? _a : "sse";
    };
    SettingsManager.prototype.setTransport = function (transport) {
        this.globalSettings.transport = transport;
        this.markModified("transport");
        this.save();
    };
    SettingsManager.prototype.getCompactionEnabled = function () {
        var _a, _b;
        return (_b = (_a = this.settings.compaction) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : true;
    };
    SettingsManager.prototype.setCompactionEnabled = function (enabled) {
        if (!this.globalSettings.compaction) {
            this.globalSettings.compaction = {};
        }
        this.globalSettings.compaction.enabled = enabled;
        this.markModified("compaction", "enabled");
        this.save();
    };
    SettingsManager.prototype.getCompactionReserveTokens = function () {
        var _a, _b;
        return (_b = (_a = this.settings.compaction) === null || _a === void 0 ? void 0 : _a.reserveTokens) !== null && _b !== void 0 ? _b : 16384;
    };
    SettingsManager.prototype.getCompactionKeepRecentTokens = function () {
        var _a, _b;
        return (_b = (_a = this.settings.compaction) === null || _a === void 0 ? void 0 : _a.keepRecentTokens) !== null && _b !== void 0 ? _b : 20000;
    };
    SettingsManager.prototype.getCompactionSettings = function () {
        return {
            enabled: this.getCompactionEnabled(),
            reserveTokens: this.getCompactionReserveTokens(),
            keepRecentTokens: this.getCompactionKeepRecentTokens(),
        };
    };
    SettingsManager.prototype.getBranchSummarySettings = function () {
        var _a, _b, _c, _d;
        return {
            reserveTokens: (_b = (_a = this.settings.branchSummary) === null || _a === void 0 ? void 0 : _a.reserveTokens) !== null && _b !== void 0 ? _b : 16384,
            skipPrompt: (_d = (_c = this.settings.branchSummary) === null || _c === void 0 ? void 0 : _c.skipPrompt) !== null && _d !== void 0 ? _d : false,
        };
    };
    SettingsManager.prototype.getBranchSummarySkipPrompt = function () {
        var _a, _b;
        return (_b = (_a = this.settings.branchSummary) === null || _a === void 0 ? void 0 : _a.skipPrompt) !== null && _b !== void 0 ? _b : false;
    };
    SettingsManager.prototype.getRetryEnabled = function () {
        var _a, _b;
        return (_b = (_a = this.settings.retry) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : true;
    };
    SettingsManager.prototype.setRetryEnabled = function (enabled) {
        if (!this.globalSettings.retry) {
            this.globalSettings.retry = {};
        }
        this.globalSettings.retry.enabled = enabled;
        this.markModified("retry", "enabled");
        this.save();
    };
    SettingsManager.prototype.getRetrySettings = function () {
        var _a, _b, _c, _d, _e, _f;
        return {
            enabled: this.getRetryEnabled(),
            maxRetries: (_b = (_a = this.settings.retry) === null || _a === void 0 ? void 0 : _a.maxRetries) !== null && _b !== void 0 ? _b : 3,
            baseDelayMs: (_d = (_c = this.settings.retry) === null || _c === void 0 ? void 0 : _c.baseDelayMs) !== null && _d !== void 0 ? _d : 2000,
            maxDelayMs: (_f = (_e = this.settings.retry) === null || _e === void 0 ? void 0 : _e.maxDelayMs) !== null && _f !== void 0 ? _f : 60000,
        };
    };
    SettingsManager.prototype.getHideThinkingBlock = function () {
        var _a;
        return (_a = this.settings.hideThinkingBlock) !== null && _a !== void 0 ? _a : false;
    };
    SettingsManager.prototype.setHideThinkingBlock = function (hide) {
        this.globalSettings.hideThinkingBlock = hide;
        this.markModified("hideThinkingBlock");
        this.save();
    };
    SettingsManager.prototype.getShellPath = function () {
        return this.settings.shellPath;
    };
    SettingsManager.prototype.setShellPath = function (path) {
        this.globalSettings.shellPath = path;
        this.markModified("shellPath");
        this.save();
    };
    SettingsManager.prototype.getQuietStartup = function () {
        var _a;
        return (_a = this.settings.quietStartup) !== null && _a !== void 0 ? _a : false;
    };
    SettingsManager.prototype.setQuietStartup = function (quiet) {
        this.globalSettings.quietStartup = quiet;
        this.markModified("quietStartup");
        this.save();
    };
    SettingsManager.prototype.getShellCommandPrefix = function () {
        return this.settings.shellCommandPrefix;
    };
    SettingsManager.prototype.setShellCommandPrefix = function (prefix) {
        this.globalSettings.shellCommandPrefix = prefix;
        this.markModified("shellCommandPrefix");
        this.save();
    };
    SettingsManager.prototype.getNpmCommand = function () {
        return this.settings.npmCommand ? __spreadArray([], this.settings.npmCommand, true) : undefined;
    };
    SettingsManager.prototype.setNpmCommand = function (command) {
        this.globalSettings.npmCommand = command ? __spreadArray([], command, true) : undefined;
        this.markModified("npmCommand");
        this.save();
    };
    SettingsManager.prototype.getCollapseChangelog = function () {
        var _a;
        return (_a = this.settings.collapseChangelog) !== null && _a !== void 0 ? _a : false;
    };
    SettingsManager.prototype.setCollapseChangelog = function (collapse) {
        this.globalSettings.collapseChangelog = collapse;
        this.markModified("collapseChangelog");
        this.save();
    };
    SettingsManager.prototype.getPackages = function () {
        var _a;
        return __spreadArray([], ((_a = this.settings.packages) !== null && _a !== void 0 ? _a : []), true);
    };
    SettingsManager.prototype.setPackages = function (packages) {
        this.globalSettings.packages = packages;
        this.markModified("packages");
        this.save();
    };
    SettingsManager.prototype.setProjectPackages = function (packages) {
        var projectSettings = structuredClone(this.projectSettings);
        projectSettings.packages = packages;
        this.markProjectModified("packages");
        this.saveProjectSettings(projectSettings);
    };
    SettingsManager.prototype.getExtensionPaths = function () {
        var _a;
        return __spreadArray([], ((_a = this.settings.extensions) !== null && _a !== void 0 ? _a : []), true);
    };
    SettingsManager.prototype.setExtensionPaths = function (paths) {
        this.globalSettings.extensions = paths;
        this.markModified("extensions");
        this.save();
    };
    SettingsManager.prototype.setProjectExtensionPaths = function (paths) {
        var projectSettings = structuredClone(this.projectSettings);
        projectSettings.extensions = paths;
        this.markProjectModified("extensions");
        this.saveProjectSettings(projectSettings);
    };
    SettingsManager.prototype.getSkillPaths = function () {
        var _a;
        return __spreadArray([], ((_a = this.settings.skills) !== null && _a !== void 0 ? _a : []), true);
    };
    SettingsManager.prototype.setSkillPaths = function (paths) {
        this.globalSettings.skills = paths;
        this.markModified("skills");
        this.save();
    };
    SettingsManager.prototype.setProjectSkillPaths = function (paths) {
        var projectSettings = structuredClone(this.projectSettings);
        projectSettings.skills = paths;
        this.markProjectModified("skills");
        this.saveProjectSettings(projectSettings);
    };
    SettingsManager.prototype.getPromptTemplatePaths = function () {
        var _a;
        return __spreadArray([], ((_a = this.settings.prompts) !== null && _a !== void 0 ? _a : []), true);
    };
    SettingsManager.prototype.setPromptTemplatePaths = function (paths) {
        this.globalSettings.prompts = paths;
        this.markModified("prompts");
        this.save();
    };
    SettingsManager.prototype.setProjectPromptTemplatePaths = function (paths) {
        var projectSettings = structuredClone(this.projectSettings);
        projectSettings.prompts = paths;
        this.markProjectModified("prompts");
        this.saveProjectSettings(projectSettings);
    };
    SettingsManager.prototype.getThemePaths = function () {
        var _a;
        return __spreadArray([], ((_a = this.settings.themes) !== null && _a !== void 0 ? _a : []), true);
    };
    SettingsManager.prototype.setThemePaths = function (paths) {
        this.globalSettings.themes = paths;
        this.markModified("themes");
        this.save();
    };
    SettingsManager.prototype.setProjectThemePaths = function (paths) {
        var projectSettings = structuredClone(this.projectSettings);
        projectSettings.themes = paths;
        this.markProjectModified("themes");
        this.saveProjectSettings(projectSettings);
    };
    SettingsManager.prototype.getEnableSkillCommands = function () {
        var _a;
        return (_a = this.settings.enableSkillCommands) !== null && _a !== void 0 ? _a : true;
    };
    SettingsManager.prototype.setEnableSkillCommands = function (enabled) {
        this.globalSettings.enableSkillCommands = enabled;
        this.markModified("enableSkillCommands");
        this.save();
    };
    SettingsManager.prototype.getThinkingBudgets = function () {
        return this.settings.thinkingBudgets;
    };
    SettingsManager.prototype.getShowImages = function () {
        var _a, _b;
        return (_b = (_a = this.settings.terminal) === null || _a === void 0 ? void 0 : _a.showImages) !== null && _b !== void 0 ? _b : true;
    };
    SettingsManager.prototype.setShowImages = function (show) {
        if (!this.globalSettings.terminal) {
            this.globalSettings.terminal = {};
        }
        this.globalSettings.terminal.showImages = show;
        this.markModified("terminal", "showImages");
        this.save();
    };
    SettingsManager.prototype.getClearOnShrink = function () {
        var _a;
        // Settings takes precedence, then env var, then default false
        if (((_a = this.settings.terminal) === null || _a === void 0 ? void 0 : _a.clearOnShrink) !== undefined) {
            return this.settings.terminal.clearOnShrink;
        }
        return process.env.PI_CLEAR_ON_SHRINK === "1";
    };
    SettingsManager.prototype.setClearOnShrink = function (enabled) {
        if (!this.globalSettings.terminal) {
            this.globalSettings.terminal = {};
        }
        this.globalSettings.terminal.clearOnShrink = enabled;
        this.markModified("terminal", "clearOnShrink");
        this.save();
    };
    SettingsManager.prototype.getImageAutoResize = function () {
        var _a, _b;
        return (_b = (_a = this.settings.images) === null || _a === void 0 ? void 0 : _a.autoResize) !== null && _b !== void 0 ? _b : true;
    };
    SettingsManager.prototype.setImageAutoResize = function (enabled) {
        if (!this.globalSettings.images) {
            this.globalSettings.images = {};
        }
        this.globalSettings.images.autoResize = enabled;
        this.markModified("images", "autoResize");
        this.save();
    };
    SettingsManager.prototype.getBlockImages = function () {
        var _a, _b;
        return (_b = (_a = this.settings.images) === null || _a === void 0 ? void 0 : _a.blockImages) !== null && _b !== void 0 ? _b : false;
    };
    SettingsManager.prototype.setBlockImages = function (blocked) {
        if (!this.globalSettings.images) {
            this.globalSettings.images = {};
        }
        this.globalSettings.images.blockImages = blocked;
        this.markModified("images", "blockImages");
        this.save();
    };
    SettingsManager.prototype.getEnabledModels = function () {
        return this.settings.enabledModels;
    };
    SettingsManager.prototype.setEnabledModels = function (patterns) {
        this.globalSettings.enabledModels = patterns;
        this.markModified("enabledModels");
        this.save();
    };
    SettingsManager.prototype.getDoubleEscapeAction = function () {
        var _a;
        return (_a = this.settings.doubleEscapeAction) !== null && _a !== void 0 ? _a : "tree";
    };
    SettingsManager.prototype.setDoubleEscapeAction = function (action) {
        this.globalSettings.doubleEscapeAction = action;
        this.markModified("doubleEscapeAction");
        this.save();
    };
    SettingsManager.prototype.getTreeFilterMode = function () {
        var mode = this.settings.treeFilterMode;
        var valid = ["default", "no-tools", "user-only", "labeled-only", "all"];
        return mode && valid.includes(mode) ? mode : "default";
    };
    SettingsManager.prototype.setTreeFilterMode = function (mode) {
        this.globalSettings.treeFilterMode = mode;
        this.markModified("treeFilterMode");
        this.save();
    };
    SettingsManager.prototype.getShowHardwareCursor = function () {
        var _a;
        return (_a = this.settings.showHardwareCursor) !== null && _a !== void 0 ? _a : process.env.PI_HARDWARE_CURSOR === "1";
    };
    SettingsManager.prototype.setShowHardwareCursor = function (enabled) {
        this.globalSettings.showHardwareCursor = enabled;
        this.markModified("showHardwareCursor");
        this.save();
    };
    SettingsManager.prototype.getEditorPaddingX = function () {
        var _a;
        return (_a = this.settings.editorPaddingX) !== null && _a !== void 0 ? _a : 0;
    };
    SettingsManager.prototype.setEditorPaddingX = function (padding) {
        this.globalSettings.editorPaddingX = Math.max(0, Math.min(3, Math.floor(padding)));
        this.markModified("editorPaddingX");
        this.save();
    };
    SettingsManager.prototype.getAutocompleteMaxVisible = function () {
        var _a;
        return (_a = this.settings.autocompleteMaxVisible) !== null && _a !== void 0 ? _a : 5;
    };
    SettingsManager.prototype.setAutocompleteMaxVisible = function (maxVisible) {
        this.globalSettings.autocompleteMaxVisible = Math.max(3, Math.min(20, Math.floor(maxVisible)));
        this.markModified("autocompleteMaxVisible");
        this.save();
    };
    SettingsManager.prototype.getCodeBlockIndent = function () {
        var _a, _b;
        return (_b = (_a = this.settings.markdown) === null || _a === void 0 ? void 0 : _a.codeBlockIndent) !== null && _b !== void 0 ? _b : "  ";
    };
    return SettingsManager;
}());
exports.SettingsManager = SettingsManager;
