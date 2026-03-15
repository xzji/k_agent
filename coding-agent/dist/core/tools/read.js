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
exports.readTool = void 0;
exports.createReadTool = createReadTool;
var typebox_1 = require("@sinclair/typebox");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var image_resize_js_1 = require("../../utils/image-resize.js");
var mime_js_1 = require("../../utils/mime.js");
var path_utils_js_1 = require("./path-utils.js");
var truncate_js_1 = require("./truncate.js");
var readSchema = typebox_1.Type.Object({
    path: typebox_1.Type.String({ description: "Path to the file to read (relative or absolute)" }),
    offset: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Line number to start reading from (1-indexed)" })),
    limit: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Maximum number of lines to read" })),
});
var defaultReadOperations = {
    readFile: function (path) { return (0, promises_1.readFile)(path); },
    access: function (path) { return (0, promises_1.access)(path, fs_1.constants.R_OK); },
    detectImageMimeType: mime_js_1.detectSupportedImageMimeTypeFromFile,
};
function createReadTool(cwd, options) {
    var _this = this;
    var _a, _b;
    var autoResizeImages = (_a = options === null || options === void 0 ? void 0 : options.autoResizeImages) !== null && _a !== void 0 ? _a : true;
    var ops = (_b = options === null || options === void 0 ? void 0 : options.operations) !== null && _b !== void 0 ? _b : defaultReadOperations;
    return {
        name: "read",
        label: "read",
        description: "Read the contents of a file. Supports text files and images (jpg, png, gif, webp). Images are sent as attachments. For text files, output is truncated to ".concat(truncate_js_1.DEFAULT_MAX_LINES, " lines or ").concat(truncate_js_1.DEFAULT_MAX_BYTES / 1024, "KB (whichever is hit first). Use offset/limit for large files. When you need the full file, continue with offset until complete."),
        parameters: readSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var absolutePath;
            var _this = this;
            var path = _b.path, offset = _b.offset, limit = _b.limit;
            return __generator(this, function (_c) {
                absolutePath = (0, path_utils_js_1.resolveReadPath)(path, cwd);
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
                        // Perform the read operation
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var mimeType, _a, content, details, buffer, base64, resized, dimensionNote, textNote, textNote, buffer, textContent, allLines, totalFileLines, startLine, startLineDisplay, selectedContent, userLimitedLines, endLine, truncation, outputText, firstLineSize, endLineDisplay, nextOffset, remaining, nextOffset, error_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 12, , 13]);
                                        // Check if file exists
                                        return [4 /*yield*/, ops.access(absolutePath)];
                                    case 1:
                                        // Check if file exists
                                        _b.sent();
                                        // Check if aborted before reading
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        if (!ops.detectImageMimeType) return [3 /*break*/, 3];
                                        return [4 /*yield*/, ops.detectImageMimeType(absolutePath)];
                                    case 2:
                                        _a = _b.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        _a = undefined;
                                        _b.label = 4;
                                    case 4:
                                        mimeType = _a;
                                        content = void 0;
                                        details = void 0;
                                        if (!mimeType) return [3 /*break*/, 9];
                                        return [4 /*yield*/, ops.readFile(absolutePath)];
                                    case 5:
                                        buffer = _b.sent();
                                        base64 = buffer.toString("base64");
                                        if (!autoResizeImages) return [3 /*break*/, 7];
                                        return [4 /*yield*/, (0, image_resize_js_1.resizeImage)({ type: "image", data: base64, mimeType: mimeType })];
                                    case 6:
                                        resized = _b.sent();
                                        dimensionNote = (0, image_resize_js_1.formatDimensionNote)(resized);
                                        textNote = "Read image file [".concat(resized.mimeType, "]");
                                        if (dimensionNote) {
                                            textNote += "\n".concat(dimensionNote);
                                        }
                                        content = [
                                            { type: "text", text: textNote },
                                            { type: "image", data: resized.data, mimeType: resized.mimeType },
                                        ];
                                        return [3 /*break*/, 8];
                                    case 7:
                                        textNote = "Read image file [".concat(mimeType, "]");
                                        content = [
                                            { type: "text", text: textNote },
                                            { type: "image", data: base64, mimeType: mimeType },
                                        ];
                                        _b.label = 8;
                                    case 8: return [3 /*break*/, 11];
                                    case 9: return [4 /*yield*/, ops.readFile(absolutePath)];
                                    case 10:
                                        buffer = _b.sent();
                                        textContent = buffer.toString("utf-8");
                                        allLines = textContent.split("\n");
                                        totalFileLines = allLines.length;
                                        startLine = offset ? Math.max(0, offset - 1) : 0;
                                        startLineDisplay = startLine + 1;
                                        // Check if offset is out of bounds
                                        if (startLine >= allLines.length) {
                                            throw new Error("Offset ".concat(offset, " is beyond end of file (").concat(allLines.length, " lines total)"));
                                        }
                                        selectedContent = void 0;
                                        userLimitedLines = void 0;
                                        if (limit !== undefined) {
                                            endLine = Math.min(startLine + limit, allLines.length);
                                            selectedContent = allLines.slice(startLine, endLine).join("\n");
                                            userLimitedLines = endLine - startLine;
                                        }
                                        else {
                                            selectedContent = allLines.slice(startLine).join("\n");
                                        }
                                        truncation = (0, truncate_js_1.truncateHead)(selectedContent);
                                        outputText = void 0;
                                        if (truncation.firstLineExceedsLimit) {
                                            firstLineSize = (0, truncate_js_1.formatSize)(Buffer.byteLength(allLines[startLine], "utf-8"));
                                            outputText = "[Line ".concat(startLineDisplay, " is ").concat(firstLineSize, ", exceeds ").concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit. Use bash: sed -n '").concat(startLineDisplay, "p' ").concat(path, " | head -c ").concat(truncate_js_1.DEFAULT_MAX_BYTES, "]");
                                            details = { truncation: truncation };
                                        }
                                        else if (truncation.truncated) {
                                            endLineDisplay = startLineDisplay + truncation.outputLines - 1;
                                            nextOffset = endLineDisplay + 1;
                                            outputText = truncation.content;
                                            if (truncation.truncatedBy === "lines") {
                                                outputText += "\n\n[Showing lines ".concat(startLineDisplay, "-").concat(endLineDisplay, " of ").concat(totalFileLines, ". Use offset=").concat(nextOffset, " to continue.]");
                                            }
                                            else {
                                                outputText += "\n\n[Showing lines ".concat(startLineDisplay, "-").concat(endLineDisplay, " of ").concat(totalFileLines, " (").concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit). Use offset=").concat(nextOffset, " to continue.]");
                                            }
                                            details = { truncation: truncation };
                                        }
                                        else if (userLimitedLines !== undefined && startLine + userLimitedLines < allLines.length) {
                                            remaining = allLines.length - (startLine + userLimitedLines);
                                            nextOffset = startLine + userLimitedLines + 1;
                                            outputText = truncation.content;
                                            outputText += "\n\n[".concat(remaining, " more lines in file. Use offset=").concat(nextOffset, " to continue.]");
                                        }
                                        else {
                                            // No truncation, no user limit exceeded
                                            outputText = truncation.content;
                                        }
                                        content = [{ type: "text", text: outputText }];
                                        _b.label = 11;
                                    case 11:
                                        // Check if aborted after reading
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        resolve({ content: content, details: details });
                                        return [3 /*break*/, 13];
                                    case 12:
                                        error_1 = _b.sent();
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        if (!aborted) {
                                            reject(error_1);
                                        }
                                        return [3 /*break*/, 13];
                                    case 13: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default read tool using process.cwd() - for backwards compatibility */
exports.readTool = createReadTool(process.cwd());
