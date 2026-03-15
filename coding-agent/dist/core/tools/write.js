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
exports.writeTool = void 0;
exports.createWriteTool = createWriteTool;
var typebox_1 = require("@sinclair/typebox");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var path_utils_js_1 = require("./path-utils.js");
var writeSchema = typebox_1.Type.Object({
    path: typebox_1.Type.String({ description: "Path to the file to write (relative or absolute)" }),
    content: typebox_1.Type.String({ description: "Content to write to the file" }),
});
var defaultWriteOperations = {
    writeFile: function (path, content) { return (0, promises_1.writeFile)(path, content, "utf-8"); },
    mkdir: function (dir) { return (0, promises_1.mkdir)(dir, { recursive: true }).then(function () { }); },
};
function createWriteTool(cwd, options) {
    var _this = this;
    var _a;
    var ops = (_a = options === null || options === void 0 ? void 0 : options.operations) !== null && _a !== void 0 ? _a : defaultWriteOperations;
    return {
        name: "write",
        label: "write",
        description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
        parameters: writeSchema,
        execute: function (_toolCallId_1, _a, signal_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1], void 0, function (_toolCallId, _b, signal) {
            var absolutePath, dir;
            var _this = this;
            var path = _b.path, content = _b.content;
            return __generator(this, function (_c) {
                absolutePath = (0, path_utils_js_1.resolveToCwd)(path, cwd);
                dir = (0, path_1.dirname)(absolutePath);
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
                        // Perform the write operation
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        // Create parent directories if needed
                                        return [4 /*yield*/, ops.mkdir(dir)];
                                    case 1:
                                        // Create parent directories if needed
                                        _a.sent();
                                        // Check if aborted before writing
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        // Write the file
                                        return [4 /*yield*/, ops.writeFile(absolutePath, content)];
                                    case 2:
                                        // Write the file
                                        _a.sent();
                                        // Check if aborted after writing
                                        if (aborted) {
                                            return [2 /*return*/];
                                        }
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        resolve({
                                            content: [{ type: "text", text: "Successfully wrote ".concat(content.length, " bytes to ").concat(path) }],
                                            details: undefined,
                                        });
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_1 = _a.sent();
                                        // Clean up abort handler
                                        if (signal) {
                                            signal.removeEventListener("abort", onAbort);
                                        }
                                        if (!aborted) {
                                            reject(error_1);
                                        }
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })();
                    })];
            });
        }); },
    };
}
/** Default write tool using process.cwd() - for backwards compatibility */
exports.writeTool = createWriteTool(process.cwd());
