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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lsTool = void 0;
exports.createLsTool = createLsTool;
var typebox_1 = require("@sinclair/typebox");
var fs_1 = require("fs");
var path_1 = require("path");
var path_utils_js_1 = require("./path-utils.js");
var truncate_js_1 = require("./truncate.js");
var lsSchema = typebox_1.Type.Object({
    path: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Directory to list (default: current directory)" })),
    limit: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Maximum number of entries to return (default: 500)" })),
});
var DEFAULT_LIMIT = 500;
var defaultLsOperations = {
    exists: fs_1.existsSync,
    stat: fs_1.statSync,
    readdir: fs_1.readdirSync,
};
function createLsTool(cwd, options) {
    var _this = this;
    var _a;
    var ops = (_a = options === null || options === void 0 ? void 0 : options.operations) !== null && _a !== void 0 ? _a : defaultLsOperations;
    return {
        name: "ls",
        label: "ls",
        description: "List directory contents. Returns entries sorted alphabetically, with '/' suffix for directories. Includes dotfiles. Output is truncated to ".concat(DEFAULT_LIMIT, " entries or ").concat(truncate_js_1.DEFAULT_MAX_BYTES / 1024, "KB (whichever is hit first)."),
        parameters: lsSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var _this = this;
            var path = _b.path, limit = _b.limit;
            return __generator(this, function (_c) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                            reject(new Error("Operation aborted"));
                            return;
                        }
                        var onAbort = function () { return reject(new Error("Operation aborted")); };
                        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var dirPath, effectiveLimit, stat, entries, e_1, results, entryLimitReached, _i, entries_1, entry, fullPath, suffix, entryStat, _a, rawOutput, truncation, output, details, notices, e_2;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 14, , 15]);
                                        dirPath = (0, path_utils_js_1.resolveToCwd)(path || ".", cwd);
                                        effectiveLimit = limit !== null && limit !== void 0 ? limit : DEFAULT_LIMIT;
                                        return [4 /*yield*/, ops.exists(dirPath)];
                                    case 1:
                                        // Check if path exists
                                        if (!(_b.sent())) {
                                            reject(new Error("Path not found: ".concat(dirPath)));
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, ops.stat(dirPath)];
                                    case 2:
                                        stat = _b.sent();
                                        if (!stat.isDirectory()) {
                                            reject(new Error("Not a directory: ".concat(dirPath)));
                                            return [2 /*return*/];
                                        }
                                        entries = void 0;
                                        _b.label = 3;
                                    case 3:
                                        _b.trys.push([3, 5, , 6]);
                                        return [4 /*yield*/, ops.readdir(dirPath)];
                                    case 4:
                                        entries = _b.sent();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        e_1 = _b.sent();
                                        reject(new Error("Cannot read directory: ".concat(e_1.message)));
                                        return [2 /*return*/];
                                    case 6:
                                        // Sort alphabetically (case-insensitive)
                                        entries.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
                                        results = [];
                                        entryLimitReached = false;
                                        _i = 0, entries_1 = entries;
                                        _b.label = 7;
                                    case 7:
                                        if (!(_i < entries_1.length)) return [3 /*break*/, 13];
                                        entry = entries_1[_i];
                                        if (results.length >= effectiveLimit) {
                                            entryLimitReached = true;
                                            return [3 /*break*/, 13];
                                        }
                                        fullPath = path_1.default.join(dirPath, entry);
                                        suffix = "";
                                        _b.label = 8;
                                    case 8:
                                        _b.trys.push([8, 10, , 11]);
                                        return [4 /*yield*/, ops.stat(fullPath)];
                                    case 9:
                                        entryStat = _b.sent();
                                        if (entryStat.isDirectory()) {
                                            suffix = "/";
                                        }
                                        return [3 /*break*/, 11];
                                    case 10:
                                        _a = _b.sent();
                                        // Skip entries we can't stat
                                        return [3 /*break*/, 12];
                                    case 11:
                                        results.push(entry + suffix);
                                        _b.label = 12;
                                    case 12:
                                        _i++;
                                        return [3 /*break*/, 7];
                                    case 13:
                                        signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
                                        if (results.length === 0) {
                                            resolve({ content: [{ type: "text", text: "(empty directory)" }], details: undefined });
                                            return [2 /*return*/];
                                        }
                                        rawOutput = results.join("\n");
                                        truncation = (0, truncate_js_1.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
                                        output = truncation.content;
                                        details = {};
                                        notices = [];
                                        if (entryLimitReached) {
                                            notices.push("".concat(effectiveLimit, " entries limit reached. Use limit=").concat(effectiveLimit * 2, " for more"));
                                            details.entryLimitReached = effectiveLimit;
                                        }
                                        if (truncation.truncated) {
                                            notices.push("".concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit reached"));
                                            details.truncation = truncation;
                                        }
                                        if (notices.length > 0) {
                                            output += "\n\n[".concat(notices.join(". "), "]");
                                        }
                                        resolve({
                                            content: [{ type: "text", text: output }],
                                            details: Object.keys(details).length > 0 ? details : undefined,
                                        });
                                        return [3 /*break*/, 15];
                                    case 14:
                                        e_2 = _b.sent();
                                        signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
                                        reject(e_2);
                                        return [3 /*break*/, 15];
                                    case 15: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default ls tool using process.cwd() - for backwards compatibility */
exports.lsTool = createLsTool(process.cwd());
