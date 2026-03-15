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
exports.editTool = void 0;
exports.createEditTool = createEditTool;
var typebox_1 = require("@sinclair/typebox");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var edit_diff_js_1 = require("./edit-diff.js");
var path_utils_js_1 = require("./path-utils.js");
var editSchema = typebox_1.Type.Object({
    path: typebox_1.Type.String({ description: "Path to the file to edit (relative or absolute)" }),
    oldText: typebox_1.Type.String({ description: "Exact text to find and replace (must match exactly)" }),
    newText: typebox_1.Type.String({ description: "New text to replace the old text with" }),
});
var defaultEditOperations = {
    readFile: function (path) { return (0, promises_1.readFile)(path); },
    writeFile: function (path, content) { return (0, promises_1.writeFile)(path, content, "utf-8"); },
    access: function (path) { return (0, promises_1.access)(path, fs_1.constants.R_OK | fs_1.constants.W_OK); },
};
function createEditTool(cwd, options) {
    var _this = this;
    var _a;
    var ops = (_a = options === null || options === void 0 ? void 0 : options.operations) !== null && _a !== void 0 ? _a : defaultEditOperations;
    return {
        name: "edit",
        label: "edit",
        description: "Edit a file by replacing exact text. The oldText must match exactly (including whitespace). Use this for precise, surgical edits.",
        parameters: editSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var absolutePath;
            var _this = this;
            var path = _b.path, oldText = _b.oldText, newText = _b.newText;
            return __generator(this, function (_c) {
                absolutePath = (0, path_utils_js_1.resolveToCwd)(path, cwd);
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // Check if already aborted
                        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                            reject(new Error("Operation aborted"));
                            return;
                        }
                        var aborted = false;
                        // Set up abort handler
                        var onAbort = function () {
                            aborted = true;
                            reject(new Error("Operation aborted"));
                        };
                        if (signal) {
                            signal.addEventListener("abort", onAbort, { once: true });
                        }
                        // Perform the edit operation
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, buffer, rawContent, _b, bom, content, originalEnding, normalizedContent, normalizedOldText, normalizedNewText, matchResult, fuzzyContent, fuzzyOldText, occurrences, baseContent, newContent, finalContent, diffResult, error_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 7, , 8]);
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, ops.access(absolutePath)];
                                    case 2:
                                        _c.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        _a = _c.sent();
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        reject(new Error("File not found: ".concat(path)));
                                        return [2 /*return*/];
                                    case 4:
                                        // Check if aborted before reading
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, ops.readFile(absolutePath)];
                                    case 5:
                                        buffer = _c.sent();
                                        rawContent = buffer.toString("utf-8");
                                        // Check if aborted after reading
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        _b = (0, edit_diff_js_1.stripBom)(rawContent), bom = _b.bom, content = _b.text;
                                        originalEnding = (0, edit_diff_js_1.detectLineEnding)(content);
                                        normalizedContent = (0, edit_diff_js_1.normalizeToLF)(content);
                                        normalizedOldText = (0, edit_diff_js_1.normalizeToLF)(oldText);
                                        normalizedNewText = (0, edit_diff_js_1.normalizeToLF)(newText);
                                        matchResult = (0, edit_diff_js_1.fuzzyFindText)(normalizedContent, normalizedOldText);
                                        if (!matchResult.found) {
                                            if (signal) {
                                                signal.removeEventListener("abort", onAbort);
                                            }
                                            reject(new Error("Could not find the exact text in ".concat(path, ". The old text must match exactly including all whitespace and newlines.")));
                                            return [2 /*return*/];
                                        }
                                        fuzzyContent = (0, edit_diff_js_1.normalizeForFuzzyMatch)(normalizedContent);
                                        fuzzyOldText = (0, edit_diff_js_1.normalizeForFuzzyMatch)(normalizedOldText);
                                        occurrences = fuzzyContent.split(fuzzyOldText).length - 1;
                                        if (occurrences > 1) {
                                            if (signal) {
                                                signal.removeEventListener("abort", onAbort);
                                            }
                                            reject(new Error("Found ".concat(occurrences, " occurrences of the text in ").concat(path, ". The text must be unique. Please provide more context to make it unique.")));
                                            return [2 /*return*/];
                                        }
                                        // Check if aborted before writing
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        baseContent = matchResult.contentForReplacement;
                                        newContent = baseContent.substring(0, matchResult.index) +
                                            normalizedNewText +
                                            baseContent.substring(matchResult.index + matchResult.matchLength);
                                        // Verify the replacement actually changed something
                                        if (baseContent === newContent) {
                                            if (signal) {
                                                signal.removeEventListener("abort", onAbort);
                                            }
                                            reject(new Error("No changes made to ".concat(path, ". The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.")));
                                            return [2 /*return*/];
                                        }
                                        finalContent = bom + (0, edit_diff_js_1.restoreLineEndings)(newContent, originalEnding);
                                        return [4 /*yield*/, ops.writeFile(absolutePath, finalContent)];
                                    case 6:
                                        _c.sent();
                                        // Check if aborted after writing
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        diffResult = (0, edit_diff_js_1.generateDiffString)(baseContent, newContent);
                                        resolve({
                                            content: [
                                                {
                                                    type: "text",
                                                    text: "Successfully replaced text in ".concat(path, "."),
                                                },
                                            ],
                                            details: { diff: diffResult.diff, firstChangedLine: diffResult.firstChangedLine },
                                        });
                                        return [3 /*break*/, 8];
                                    case 7:
                                        error_1 = _c.sent();
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        if (!aborted) {
                                            reject(error_1);
                                        }
                                        return [3 /*break*/, 8];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default edit tool using process.cwd() - for backwards compatibility */
exports.editTool = createEditTool(process.cwd());
