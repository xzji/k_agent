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
exports.findTool = void 0;
exports.createFindTool = createFindTool;
var typebox_1 = require("@sinclair/typebox");
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var glob_1 = require("glob");
var path_1 = require("path");
var tools_manager_js_1 = require("../../utils/tools-manager.js");
var path_utils_js_1 = require("./path-utils.js");
var truncate_js_1 = require("./truncate.js");
function toPosixPath(value) {
    return value.split(path_1.default.sep).join("/");
}
var findSchema = typebox_1.Type.Object({
    pattern: typebox_1.Type.String({
        description: "Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.spec.ts'",
    }),
    path: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Directory to search in (default: current directory)" })),
    limit: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Maximum number of results (default: 1000)" })),
});
var DEFAULT_LIMIT = 1000;
var defaultFindOperations = {
    exists: fs_1.existsSync,
    glob: function (_pattern, _searchCwd, _options) {
        // This is a placeholder - actual fd execution happens in execute
        return [];
    },
};
function createFindTool(cwd, options) {
    var _this = this;
    var customOps = options === null || options === void 0 ? void 0 : options.operations;
    return {
        name: "find",
        label: "find",
        description: "Search for files by glob pattern. Returns matching file paths relative to the search directory. Respects .gitignore. Output is truncated to ".concat(DEFAULT_LIMIT, " results or ").concat(truncate_js_1.DEFAULT_MAX_BYTES / 1024, "KB (whichever is hit first)."),
        parameters: findSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var _this = this;
            var pattern = _b.pattern, searchDir = _b.path, limit = _b.limit;
            return __generator(this, function (_c) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                            reject(new Error("Operation aborted"));
                            return;
                        }
                        var onAbort = function () { return reject(new Error("Operation aborted")); };
                        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var searchPath_1, effectiveLimit, ops, results, relativized_1, resultLimitReached_1, rawOutput_1, truncation_1, resultOutput_1, details_1, notices_1, fdPath, args, gitignoreFiles, rootGitignore, nestedGitignores, _i, nestedGitignores_1, file, _a, gitignoreFiles_1, gitignorePath, result, output, errorMsg, lines, relativized, _b, lines_1, rawLine, line, hadTrailingSlash, relativePath, resultLimitReached, rawOutput, truncation, resultOutput, details, notices, e_1;
                            var _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 5, , 6]);
                                        searchPath_1 = (0, path_utils_js_1.resolveToCwd)(searchDir || ".", cwd);
                                        effectiveLimit = limit !== null && limit !== void 0 ? limit : DEFAULT_LIMIT;
                                        ops = customOps !== null && customOps !== void 0 ? customOps : defaultFindOperations;
                                        if (!(customOps === null || customOps === void 0 ? void 0 : customOps.glob)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, ops.exists(searchPath_1)];
                                    case 1:
                                        if (!(_e.sent())) {
                                            reject(new Error("Path not found: ".concat(searchPath_1)));
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, ops.glob(pattern, searchPath_1, {
                                                ignore: ["**/node_modules/**", "**/.git/**"],
                                                limit: effectiveLimit,
                                            })];
                                    case 2:
                                        results = _e.sent();
                                        signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
                                        if (results.length === 0) {
                                            resolve({
                                                content: [{ type: "text", text: "No files found matching pattern" }],
                                                details: undefined,
                                            });
                                            return [2 /*return*/];
                                        }
                                        relativized_1 = results.map(function (p) {
                                            if (p.startsWith(searchPath_1)) {
                                                return toPosixPath(p.slice(searchPath_1.length + 1));
                                            }
                                            return toPosixPath(path_1.default.relative(searchPath_1, p));
                                        });
                                        resultLimitReached_1 = relativized_1.length >= effectiveLimit;
                                        rawOutput_1 = relativized_1.join("\n");
                                        truncation_1 = (0, truncate_js_1.truncateHead)(rawOutput_1, { maxLines: Number.MAX_SAFE_INTEGER });
                                        resultOutput_1 = truncation_1.content;
                                        details_1 = {};
                                        notices_1 = [];
                                        if (resultLimitReached_1) {
                                            notices_1.push("".concat(effectiveLimit, " results limit reached"));
                                            details_1.resultLimitReached = effectiveLimit;
                                        }
                                        if (truncation_1.truncated) {
                                            notices_1.push("".concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit reached"));
                                            details_1.truncation = truncation_1;
                                        }
                                        if (notices_1.length > 0) {
                                            resultOutput_1 += "\n\n[".concat(notices_1.join(". "), "]");
                                        }
                                        resolve({
                                            content: [{ type: "text", text: resultOutput_1 }],
                                            details: Object.keys(details_1).length > 0 ? details_1 : undefined,
                                        });
                                        return [2 /*return*/];
                                    case 3: return [4 /*yield*/, (0, tools_manager_js_1.ensureTool)("fd", true)];
                                    case 4:
                                        fdPath = _e.sent();
                                        if (!fdPath) {
                                            reject(new Error("fd is not available and could not be downloaded"));
                                            return [2 /*return*/];
                                        }
                                        args = [
                                            "--glob",
                                            "--color=never",
                                            "--hidden",
                                            "--max-results",
                                            String(effectiveLimit),
                                        ];
                                        gitignoreFiles = new Set();
                                        rootGitignore = path_1.default.join(searchPath_1, ".gitignore");
                                        if ((0, fs_1.existsSync)(rootGitignore)) {
                                            gitignoreFiles.add(rootGitignore);
                                        }
                                        try {
                                            nestedGitignores = (0, glob_1.globSync)("**/.gitignore", {
                                                cwd: searchPath_1,
                                                dot: true,
                                                absolute: true,
                                                ignore: ["**/node_modules/**", "**/.git/**"],
                                            });
                                            for (_i = 0, nestedGitignores_1 = nestedGitignores; _i < nestedGitignores_1.length; _i++) {
                                                file = nestedGitignores_1[_i];
                                                gitignoreFiles.add(file);
                                            }
                                        }
                                        catch (_f) {
                                            // Ignore glob errors
                                        }
                                        for (_a = 0, gitignoreFiles_1 = gitignoreFiles; _a < gitignoreFiles_1.length; _a++) {
                                            gitignorePath = gitignoreFiles_1[_a];
                                            args.push("--ignore-file", gitignorePath);
                                        }
                                        args.push(pattern, searchPath_1);
                                        result = (0, child_process_1.spawnSync)(fdPath, args, {
                                            encoding: "utf-8",
                                            maxBuffer: 10 * 1024 * 1024,
                                        });
                                        signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
                                        if (result.error) {
                                            reject(new Error("Failed to run fd: ".concat(result.error.message)));
                                            return [2 /*return*/];
                                        }
                                        output = ((_c = result.stdout) === null || _c === void 0 ? void 0 : _c.trim()) || "";
                                        if (result.status !== 0) {
                                            errorMsg = ((_d = result.stderr) === null || _d === void 0 ? void 0 : _d.trim()) || "fd exited with code ".concat(result.status);
                                            if (!output) {
                                                reject(new Error(errorMsg));
                                                return [2 /*return*/];
                                            }
                                        }
                                        if (!output) {
                                            resolve({
                                                content: [{ type: "text", text: "No files found matching pattern" }],
                                                details: undefined,
                                            });
                                            return [2 /*return*/];
                                        }
                                        lines = output.split("\n");
                                        relativized = [];
                                        for (_b = 0, lines_1 = lines; _b < lines_1.length; _b++) {
                                            rawLine = lines_1[_b];
                                            line = rawLine.replace(/\r$/, "").trim();
                                            if (!line)
                                                continue;
                                            hadTrailingSlash = line.endsWith("/") || line.endsWith("\\");
                                            relativePath = line;
                                            if (line.startsWith(searchPath_1)) {
                                                relativePath = line.slice(searchPath_1.length + 1);
                                            }
                                            else {
                                                relativePath = path_1.default.relative(searchPath_1, line);
                                            }
                                            if (hadTrailingSlash && !relativePath.endsWith("/")) {
                                                relativePath += "/";
                                            }
                                            relativized.push(toPosixPath(relativePath));
                                        }
                                        resultLimitReached = relativized.length >= effectiveLimit;
                                        rawOutput = relativized.join("\n");
                                        truncation = (0, truncate_js_1.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
                                        resultOutput = truncation.content;
                                        details = {};
                                        notices = [];
                                        if (resultLimitReached) {
                                            notices.push("".concat(effectiveLimit, " results limit reached. Use limit=").concat(effectiveLimit * 2, " for more, or refine pattern"));
                                            details.resultLimitReached = effectiveLimit;
                                        }
                                        if (truncation.truncated) {
                                            notices.push("".concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit reached"));
                                            details.truncation = truncation;
                                        }
                                        if (notices.length > 0) {
                                            resultOutput += "\n\n[".concat(notices.join(". "), "]");
                                        }
                                        resolve({
                                            content: [{ type: "text", text: resultOutput }],
                                            details: Object.keys(details).length > 0 ? details : undefined,
                                        });
                                        return [3 /*break*/, 6];
                                    case 5:
                                        e_1 = _e.sent();
                                        signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
                                        reject(e_1);
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default find tool using process.cwd() - for backwards compatibility */
exports.findTool = createFindTool(process.cwd());
