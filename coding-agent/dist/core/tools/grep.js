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
exports.grepTool = void 0;
exports.createGrepTool = createGrepTool;
var node_readline_1 = require("node:readline");
var typebox_1 = require("@sinclair/typebox");
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
var tools_manager_js_1 = require("../../utils/tools-manager.js");
var path_utils_js_1 = require("./path-utils.js");
var truncate_js_1 = require("./truncate.js");
var grepSchema = typebox_1.Type.Object({
    pattern: typebox_1.Type.String({ description: "Search pattern (regex or literal string)" }),
    path: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Directory or file to search (default: current directory)" })),
    glob: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'" })),
    ignoreCase: typebox_1.Type.Optional(typebox_1.Type.Boolean({ description: "Case-insensitive search (default: false)" })),
    literal: typebox_1.Type.Optional(typebox_1.Type.Boolean({ description: "Treat pattern as literal string instead of regex (default: false)" })),
    context: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Number of lines to show before and after each match (default: 0)" })),
    limit: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Maximum number of matches to return (default: 100)" })),
});
var DEFAULT_LIMIT = 100;
var defaultGrepOperations = {
    isDirectory: function (p) { return (0, fs_1.statSync)(p).isDirectory(); },
    readFile: function (p) { return (0, fs_1.readFileSync)(p, "utf-8"); },
};
function createGrepTool(cwd, options) {
    var _this = this;
    var customOps = options === null || options === void 0 ? void 0 : options.operations;
    return {
        name: "grep",
        label: "grep",
        description: "Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore. Output is truncated to ".concat(DEFAULT_LIMIT, " matches or ").concat(truncate_js_1.DEFAULT_MAX_BYTES / 1024, "KB (whichever is hit first). Long lines are truncated to ").concat(truncate_js_1.GREP_MAX_LINE_LENGTH, " chars."),
        parameters: grepSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var _this = this;
            var pattern = _b.pattern, searchDir = _b.path, glob = _b.glob, ignoreCase = _b.ignoreCase, literal = _b.literal, context = _b.context, limit = _b.limit;
            return __generator(this, function (_c) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                            reject(new Error("Operation aborted"));
                            return;
                        }
                        var settled = false;
                        var settle = function (fn) {
                            if (!settled) {
                                settled = true;
                                fn();
                            }
                        };
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var rgPath, searchPath_1, ops_1, isDirectory_1, _err_1, contextValue_1, effectiveLimit_1, formatPath_1, fileCache_1, getFileLines_1, args, child_1, rl_1, stderr_1, matchCount_1, matchLimitReached_1, linesTruncated_1, aborted_1, killedDueToLimit_1, outputLines_1, cleanup_1, stopChild_1, onAbort_1, formatBlock_1, matches_1, err_1;
                            var _this = this;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 6, , 7]);
                                        return [4 /*yield*/, (0, tools_manager_js_1.ensureTool)("rg", true)];
                                    case 1:
                                        rgPath = _b.sent();
                                        if (!rgPath) {
                                            settle(function () { return reject(new Error("ripgrep (rg) is not available and could not be downloaded")); });
                                            return [2 /*return*/];
                                        }
                                        searchPath_1 = (0, path_utils_js_1.resolveToCwd)(searchDir || ".", cwd);
                                        ops_1 = customOps !== null && customOps !== void 0 ? customOps : defaultGrepOperations;
                                        _b.label = 2;
                                    case 2:
                                        _b.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, ops_1.isDirectory(searchPath_1)];
                                    case 3:
                                        isDirectory_1 = _b.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        _err_1 = _b.sent();
                                        settle(function () { return reject(new Error("Path not found: ".concat(searchPath_1))); });
                                        return [2 /*return*/];
                                    case 5:
                                        contextValue_1 = context && context > 0 ? context : 0;
                                        effectiveLimit_1 = Math.max(1, limit !== null && limit !== void 0 ? limit : DEFAULT_LIMIT);
                                        formatPath_1 = function (filePath) {
                                            if (isDirectory_1) {
                                                var relative = path_1.default.relative(searchPath_1, filePath);
                                                if (relative && !relative.startsWith("..")) {
                                                    return relative.replace(/\\/g, "/");
                                                }
                                            }
                                            return path_1.default.basename(filePath);
                                        };
                                        fileCache_1 = new Map();
                                        getFileLines_1 = function (filePath) { return __awaiter(_this, void 0, void 0, function () {
                                            var lines, content, _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        lines = fileCache_1.get(filePath);
                                                        if (!!lines) return [3 /*break*/, 5];
                                                        _b.label = 1;
                                                    case 1:
                                                        _b.trys.push([1, 3, , 4]);
                                                        return [4 /*yield*/, ops_1.readFile(filePath)];
                                                    case 2:
                                                        content = _b.sent();
                                                        lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
                                                        return [3 /*break*/, 4];
                                                    case 3:
                                                        _a = _b.sent();
                                                        lines = [];
                                                        return [3 /*break*/, 4];
                                                    case 4:
                                                        fileCache_1.set(filePath, lines);
                                                        _b.label = 5;
                                                    case 5: return [2 /*return*/, lines];
                                                }
                                            });
                                        }); };
                                        args = ["--json", "--line-number", "--color=never", "--hidden"];
                                        if (ignoreCase) {
                                            args.push("--ignore-case");
                                        }
                                        if (literal) {
                                            args.push("--fixed-strings");
                                        }
                                        if (glob) {
                                            args.push("--glob", glob);
                                        }
                                        args.push(pattern, searchPath_1);
                                        child_1 = (0, child_process_1.spawn)(rgPath, args, { stdio: ["ignore", "pipe", "pipe"] });
                                        rl_1 = (0, node_readline_1.createInterface)({ input: child_1.stdout });
                                        stderr_1 = "";
                                        matchCount_1 = 0;
                                        matchLimitReached_1 = false;
                                        linesTruncated_1 = false;
                                        aborted_1 = false;
                                        killedDueToLimit_1 = false;
                                        outputLines_1 = [];
                                        cleanup_1 = function () {
                                            rl_1.close();
                                            signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort_1);
                                        };
                                        stopChild_1 = function (dueToLimit) {
                                            if (dueToLimit === void 0) { dueToLimit = false; }
                                            if (!child_1.killed) {
                                                killedDueToLimit_1 = dueToLimit;
                                                child_1.kill();
                                            }
                                        };
                                        onAbort_1 = function () {
                                            aborted_1 = true;
                                            stopChild_1();
                                        };
                                        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", onAbort_1, { once: true });
                                        (_a = child_1.stderr) === null || _a === void 0 ? void 0 : _a.on("data", function (chunk) {
                                            stderr_1 += chunk.toString();
                                        });
                                        formatBlock_1 = function (filePath, lineNumber) { return __awaiter(_this, void 0, void 0, function () {
                                            var relativePath, lines, block, start, end, current, lineText, sanitized, isMatchLine, _a, truncatedText, wasTruncated;
                                            var _b;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0:
                                                        relativePath = formatPath_1(filePath);
                                                        return [4 /*yield*/, getFileLines_1(filePath)];
                                                    case 1:
                                                        lines = _c.sent();
                                                        if (!lines.length) {
                                                            return [2 /*return*/, ["".concat(relativePath, ":").concat(lineNumber, ": (unable to read file)")]];
                                                        }
                                                        block = [];
                                                        start = contextValue_1 > 0 ? Math.max(1, lineNumber - contextValue_1) : lineNumber;
                                                        end = contextValue_1 > 0 ? Math.min(lines.length, lineNumber + contextValue_1) : lineNumber;
                                                        for (current = start; current <= end; current++) {
                                                            lineText = (_b = lines[current - 1]) !== null && _b !== void 0 ? _b : "";
                                                            sanitized = lineText.replace(/\r/g, "");
                                                            isMatchLine = current === lineNumber;
                                                            _a = (0, truncate_js_1.truncateLine)(sanitized), truncatedText = _a.text, wasTruncated = _a.wasTruncated;
                                                            if (wasTruncated) {
                                                                linesTruncated_1 = true;
                                                            }
                                                            if (isMatchLine) {
                                                                block.push("".concat(relativePath, ":").concat(current, ": ").concat(truncatedText));
                                                            }
                                                            else {
                                                                block.push("".concat(relativePath, "-").concat(current, "- ").concat(truncatedText));
                                                            }
                                                        }
                                                        return [2 /*return*/, block];
                                                }
                                            });
                                        }); };
                                        matches_1 = [];
                                        rl_1.on("line", function (line) {
                                            var _a, _b, _c;
                                            if (!line.trim() || matchCount_1 >= effectiveLimit_1) {
                                                return;
                                            }
                                            var event;
                                            try {
                                                event = JSON.parse(line);
                                            }
                                            catch (_d) {
                                                return;
                                            }
                                            if (event.type === "match") {
                                                matchCount_1++;
                                                var filePath = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.path) === null || _b === void 0 ? void 0 : _b.text;
                                                var lineNumber = (_c = event.data) === null || _c === void 0 ? void 0 : _c.line_number;
                                                if (filePath && typeof lineNumber === "number") {
                                                    matches_1.push({ filePath: filePath, lineNumber: lineNumber });
                                                }
                                                if (matchCount_1 >= effectiveLimit_1) {
                                                    matchLimitReached_1 = true;
                                                    stopChild_1(true);
                                                }
                                            }
                                        });
                                        child_1.on("error", function (error) {
                                            cleanup_1();
                                            settle(function () { return reject(new Error("Failed to run ripgrep: ".concat(error.message))); });
                                        });
                                        child_1.on("close", function (code) { return __awaiter(_this, void 0, void 0, function () {
                                            var errorMsg_1, _i, matches_2, match, block, rawOutput, truncation, output, details, notices;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        cleanup_1();
                                                        if (aborted_1) {
                                                            settle(function () { return reject(new Error("Operation aborted")); });
                                                            return [2 /*return*/];
                                                        }
                                                        if (!killedDueToLimit_1 && code !== 0 && code !== 1) {
                                                            errorMsg_1 = stderr_1.trim() || "ripgrep exited with code ".concat(code);
                                                            settle(function () { return reject(new Error(errorMsg_1)); });
                                                            return [2 /*return*/];
                                                        }
                                                        if (matchCount_1 === 0) {
                                                            settle(function () {
                                                                return resolve({ content: [{ type: "text", text: "No matches found" }], details: undefined });
                                                            });
                                                            return [2 /*return*/];
                                                        }
                                                        _i = 0, matches_2 = matches_1;
                                                        _a.label = 1;
                                                    case 1:
                                                        if (!(_i < matches_2.length)) return [3 /*break*/, 4];
                                                        match = matches_2[_i];
                                                        return [4 /*yield*/, formatBlock_1(match.filePath, match.lineNumber)];
                                                    case 2:
                                                        block = _a.sent();
                                                        outputLines_1.push.apply(outputLines_1, block);
                                                        _a.label = 3;
                                                    case 3:
                                                        _i++;
                                                        return [3 /*break*/, 1];
                                                    case 4:
                                                        rawOutput = outputLines_1.join("\n");
                                                        truncation = (0, truncate_js_1.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
                                                        output = truncation.content;
                                                        details = {};
                                                        notices = [];
                                                        if (matchLimitReached_1) {
                                                            notices.push("".concat(effectiveLimit_1, " matches limit reached. Use limit=").concat(effectiveLimit_1 * 2, " for more, or refine pattern"));
                                                            details.matchLimitReached = effectiveLimit_1;
                                                        }
                                                        if (truncation.truncated) {
                                                            notices.push("".concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit reached"));
                                                            details.truncation = truncation;
                                                        }
                                                        if (linesTruncated_1) {
                                                            notices.push("Some lines truncated to ".concat(truncate_js_1.GREP_MAX_LINE_LENGTH, " chars. Use read tool to see full lines"));
                                                            details.linesTruncated = true;
                                                        }
                                                        if (notices.length > 0) {
                                                            output += "\n\n[".concat(notices.join(". "), "]");
                                                        }
                                                        settle(function () {
                                                            return resolve({
                                                                content: [{ type: "text", text: output }],
                                                                details: Object.keys(details).length > 0 ? details : undefined,
                                                            });
                                                        });
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                        return [3 /*break*/, 7];
                                    case 6:
                                        err_1 = _b.sent();
                                        settle(function () { return reject(err_1); });
                                        return [3 /*break*/, 7];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default grep tool using process.cwd() - for backwards compatibility */
exports.grepTool = createGrepTool(process.cwd());
