"use strict";
/**
 * Bash command execution with streaming support and cancellation.
 *
 * This module provides a unified bash execution implementation used by:
 * - AgentSession.executeBash() for interactive and RPC modes
 * - Direct calls from modes that need bash execution
 */
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
exports.executeBash = executeBash;
exports.executeBashWithOperations = executeBashWithOperations;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var child_process_1 = require("child_process");
var strip_ansi_1 = require("strip-ansi");
var shell_js_1 = require("../utils/shell.js");
var truncate_js_1 = require("./tools/truncate.js");
// ============================================================================
// Implementation
// ============================================================================
/**
 * Execute a bash command with optional streaming and cancellation support.
 *
 * Features:
 * - Streams sanitized output via onChunk callback
 * - Writes large output to temp file for later retrieval
 * - Supports cancellation via AbortSignal
 * - Sanitizes output (strips ANSI, removes binary garbage, normalizes newlines)
 * - Truncates output if it exceeds the default max bytes
 *
 * @param command - The bash command to execute
 * @param options - Optional streaming callback and abort signal
 * @returns Promise resolving to execution result
 */
function executeBash(command, options) {
    return new Promise(function (resolve, reject) {
        var _a, _b;
        var _c = (0, shell_js_1.getShellConfig)(), shell = _c.shell, args = _c.args;
        var child = (0, child_process_1.spawn)(shell, __spreadArray(__spreadArray([], args, true), [command], false), {
            detached: true,
            env: (0, shell_js_1.getShellEnv)(),
            stdio: ["ignore", "pipe", "pipe"],
        });
        // Track sanitized output for truncation
        var outputChunks = [];
        var outputBytes = 0;
        var maxOutputBytes = truncate_js_1.DEFAULT_MAX_BYTES * 2;
        // Temp file for large output
        var tempFilePath;
        var tempFileStream;
        var totalBytes = 0;
        // Handle abort signal
        var abortHandler = function () {
            if (child.pid) {
                (0, shell_js_1.killProcessTree)(child.pid);
            }
        };
        if (options === null || options === void 0 ? void 0 : options.signal) {
            if (options.signal.aborted) {
                // Already aborted, don't even start
                child.kill();
                resolve({
                    output: "",
                    exitCode: undefined,
                    cancelled: true,
                    truncated: false,
                });
                return;
            }
            options.signal.addEventListener("abort", abortHandler, { once: true });
        }
        var decoder = new TextDecoder();
        var handleData = function (data) {
            totalBytes += data.length;
            // Sanitize once at the source: strip ANSI, replace binary garbage, normalize newlines
            var text = (0, shell_js_1.sanitizeBinaryOutput)((0, strip_ansi_1.default)(decoder.decode(data, { stream: true }))).replace(/\r/g, "");
            // Start writing to temp file if exceeds threshold
            if (totalBytes > truncate_js_1.DEFAULT_MAX_BYTES && !tempFilePath) {
                var id = (0, node_crypto_1.randomBytes)(8).toString("hex");
                tempFilePath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "pi-bash-".concat(id, ".log"));
                tempFileStream = (0, node_fs_1.createWriteStream)(tempFilePath);
                // Write already-buffered chunks to temp file
                for (var _i = 0, outputChunks_1 = outputChunks; _i < outputChunks_1.length; _i++) {
                    var chunk = outputChunks_1[_i];
                    tempFileStream.write(chunk);
                }
            }
            if (tempFileStream) {
                tempFileStream.write(text);
            }
            // Keep rolling buffer of sanitized text
            outputChunks.push(text);
            outputBytes += text.length;
            while (outputBytes > maxOutputBytes && outputChunks.length > 1) {
                var removed = outputChunks.shift();
                outputBytes -= removed.length;
            }
            // Stream to callback if provided
            if (options === null || options === void 0 ? void 0 : options.onChunk) {
                options.onChunk(text);
            }
        };
        (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on("data", handleData);
        (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on("data", handleData);
        child.on("close", function (code) {
            // Clean up abort listener
            if (options === null || options === void 0 ? void 0 : options.signal) {
                options.signal.removeEventListener("abort", abortHandler);
            }
            if (tempFileStream) {
                tempFileStream.end();
            }
            // Combine buffered chunks for truncation (already sanitized)
            var fullOutput = outputChunks.join("");
            var truncationResult = (0, truncate_js_1.truncateTail)(fullOutput);
            // code === null means killed (cancelled)
            var cancelled = code === null;
            resolve({
                output: truncationResult.truncated ? truncationResult.content : fullOutput,
                exitCode: cancelled ? undefined : code,
                cancelled: cancelled,
                truncated: truncationResult.truncated,
                fullOutputPath: tempFilePath,
            });
        });
        child.on("error", function (err) {
            // Clean up abort listener
            if (options === null || options === void 0 ? void 0 : options.signal) {
                options.signal.removeEventListener("abort", abortHandler);
            }
            if (tempFileStream) {
                tempFileStream.end();
            }
            reject(err);
        });
    });
}
/**
 * Execute a bash command using custom BashOperations.
 * Used for remote execution (SSH, containers, etc.).
 */
function executeBashWithOperations(command, cwd, operations, options) {
    return __awaiter(this, void 0, void 0, function () {
        var outputChunks, outputBytes, maxOutputBytes, tempFilePath, tempFileStream, totalBytes, decoder, onData, result, fullOutput, truncationResult, cancelled, err_1, fullOutput, truncationResult;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    outputChunks = [];
                    outputBytes = 0;
                    maxOutputBytes = truncate_js_1.DEFAULT_MAX_BYTES * 2;
                    totalBytes = 0;
                    decoder = new TextDecoder();
                    onData = function (data) {
                        totalBytes += data.length;
                        // Sanitize: strip ANSI, replace binary garbage, normalize newlines
                        var text = (0, shell_js_1.sanitizeBinaryOutput)((0, strip_ansi_1.default)(decoder.decode(data, { stream: true }))).replace(/\r/g, "");
                        // Start writing to temp file if exceeds threshold
                        if (totalBytes > truncate_js_1.DEFAULT_MAX_BYTES && !tempFilePath) {
                            var id = (0, node_crypto_1.randomBytes)(8).toString("hex");
                            tempFilePath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "pi-bash-".concat(id, ".log"));
                            tempFileStream = (0, node_fs_1.createWriteStream)(tempFilePath);
                            for (var _i = 0, outputChunks_2 = outputChunks; _i < outputChunks_2.length; _i++) {
                                var chunk = outputChunks_2[_i];
                                tempFileStream.write(chunk);
                            }
                        }
                        if (tempFileStream) {
                            tempFileStream.write(text);
                        }
                        // Keep rolling buffer
                        outputChunks.push(text);
                        outputBytes += text.length;
                        while (outputBytes > maxOutputBytes && outputChunks.length > 1) {
                            var removed = outputChunks.shift();
                            outputBytes -= removed.length;
                        }
                        // Stream to callback
                        if (options === null || options === void 0 ? void 0 : options.onChunk) {
                            options.onChunk(text);
                        }
                    };
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, operations.exec(command, cwd, {
                            onData: onData,
                            signal: options === null || options === void 0 ? void 0 : options.signal,
                        })];
                case 2:
                    result = _e.sent();
                    if (tempFileStream) {
                        tempFileStream.end();
                    }
                    fullOutput = outputChunks.join("");
                    truncationResult = (0, truncate_js_1.truncateTail)(fullOutput);
                    cancelled = (_b = (_a = options === null || options === void 0 ? void 0 : options.signal) === null || _a === void 0 ? void 0 : _a.aborted) !== null && _b !== void 0 ? _b : false;
                    return [2 /*return*/, {
                            output: truncationResult.truncated ? truncationResult.content : fullOutput,
                            exitCode: cancelled ? undefined : ((_c = result.exitCode) !== null && _c !== void 0 ? _c : undefined),
                            cancelled: cancelled,
                            truncated: truncationResult.truncated,
                            fullOutputPath: tempFilePath,
                        }];
                case 3:
                    err_1 = _e.sent();
                    if (tempFileStream) {
                        tempFileStream.end();
                    }
                    // Check if it was an abort
                    if ((_d = options === null || options === void 0 ? void 0 : options.signal) === null || _d === void 0 ? void 0 : _d.aborted) {
                        fullOutput = outputChunks.join("");
                        truncationResult = (0, truncate_js_1.truncateTail)(fullOutput);
                        return [2 /*return*/, {
                                output: truncationResult.truncated ? truncationResult.content : fullOutput,
                                exitCode: undefined,
                                cancelled: true,
                                truncated: truncationResult.truncated,
                                fullOutputPath: tempFilePath,
                            }];
                    }
                    throw err_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
