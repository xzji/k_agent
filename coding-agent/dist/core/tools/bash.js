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
exports.bashTool = void 0;
exports.createBashTool = createBashTool;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var typebox_1 = require("@sinclair/typebox");
var child_process_1 = require("child_process");
var shell_js_1 = require("../../utils/shell.js");
var truncate_js_1 = require("./truncate.js");
/**
 * Generate a unique temp file path for bash output
 */
function getTempFilePath() {
    var id = (0, node_crypto_1.randomBytes)(8).toString("hex");
    return (0, node_path_1.join)((0, node_os_1.tmpdir)(), "pi-bash-".concat(id, ".log"));
}
var bashSchema = typebox_1.Type.Object({
    command: typebox_1.Type.String({ description: "Bash command to execute" }),
    timeout: typebox_1.Type.Optional(typebox_1.Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});
/**
 * Default bash operations using local shell
 */
var defaultBashOperations = {
    exec: function (command, cwd, _a) {
        var onData = _a.onData, signal = _a.signal, timeout = _a.timeout, env = _a.env;
        return new Promise(function (resolve, reject) {
            var _a = (0, shell_js_1.getShellConfig)(), shell = _a.shell, args = _a.args;
            if (!(0, node_fs_1.existsSync)(cwd)) {
                reject(new Error("Working directory does not exist: ".concat(cwd, "\nCannot execute bash commands.")));
                return;
            }
            var child = (0, child_process_1.spawn)(shell, __spreadArray(__spreadArray([], args, true), [command], false), {
                cwd: cwd,
                detached: true,
                env: env !== null && env !== void 0 ? env : (0, shell_js_1.getShellEnv)(),
                stdio: ["ignore", "pipe", "pipe"],
            });
            var timedOut = false;
            // Set timeout if provided
            var timeoutHandle;
            if (timeout !== undefined && timeout > 0) {
                timeoutHandle = setTimeout(function () {
                    timedOut = true;
                    if (child.pid) {
                        (0, shell_js_1.killProcessTree)(child.pid);
                    }
                }, timeout * 1000);
            }
            // Stream stdout and stderr
            if (child.stdout) {
                child.stdout.on("data", onData);
            }
            if (child.stderr) {
                child.stderr.on("data", onData);
            }
            // Handle shell spawn errors
            child.on("error", function (err) {
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                if (signal)
                    signal.removeEventListener("abort", onAbort);
                reject(err);
            });
            // Handle abort signal - kill entire process tree
            var onAbort = function () {
                if (child.pid) {
                    (0, shell_js_1.killProcessTree)(child.pid);
                }
            };
            if (signal) {
                if (signal.aborted) {
                    onAbort();
                }
                else {
                    signal.addEventListener("abort", onAbort, { once: true });
                }
            }
            // Handle process exit
            child.on("close", function (code) {
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                if (signal)
                    signal.removeEventListener("abort", onAbort);
                if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                    reject(new Error("aborted"));
                    return;
                }
                if (timedOut) {
                    reject(new Error("timeout:".concat(timeout)));
                    return;
                }
                resolve({ exitCode: code });
            });
        });
    },
};
function resolveSpawnContext(command, cwd, spawnHook) {
    var baseContext = {
        command: command,
        cwd: cwd,
        env: __assign({}, (0, shell_js_1.getShellEnv)()),
    };
    return spawnHook ? spawnHook(baseContext) : baseContext;
}
function createBashTool(cwd, options) {
    var _this = this;
    var _a;
    var ops = (_a = options === null || options === void 0 ? void 0 : options.operations) !== null && _a !== void 0 ? _a : defaultBashOperations;
    var commandPrefix = options === null || options === void 0 ? void 0 : options.commandPrefix;
    var spawnHook = options === null || options === void 0 ? void 0 : options.spawnHook;
    return {
        name: "bash",
        label: "bash",
        description: "Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ".concat(truncate_js_1.DEFAULT_MAX_LINES, " lines or ").concat(truncate_js_1.DEFAULT_MAX_BYTES / 1024, "KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds."),
        parameters: bashSchema,
        execute: function (_toolCallId_1, _a, signal_1, onUpdate_1) { return __awaiter(_this, [_toolCallId_1, _a, signal_1, onUpdate_1], void 0, function (_toolCallId, _b, signal, onUpdate) {
            var resolvedCommand, spawnContext;
            var command = _b.command, timeout = _b.timeout;
            return __generator(this, function (_c) {
                resolvedCommand = commandPrefix ? "".concat(commandPrefix, "\n").concat(command) : command;
                spawnContext = resolveSpawnContext(resolvedCommand, cwd, spawnHook);
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // We'll stream to a temp file if output gets large
                        var tempFilePath;
                        var tempFileStream;
                        var totalBytes = 0;
                        // Keep a rolling buffer of the last chunk for tail truncation
                        var chunks = [];
                        var chunksBytes = 0;
                        // Keep more than we need so we have enough for truncation
                        var maxChunksBytes = truncate_js_1.DEFAULT_MAX_BYTES * 2;
                        var handleData = function (data) {
                            totalBytes += data.length;
                            // Start writing to temp file once we exceed the threshold
                            if (totalBytes > truncate_js_1.DEFAULT_MAX_BYTES && !tempFilePath) {
                                tempFilePath = getTempFilePath();
                                tempFileStream = (0, node_fs_1.createWriteStream)(tempFilePath);
                                // Write all buffered chunks to the file
                                for (var _i = 0, chunks_1 = chunks; _i < chunks_1.length; _i++) {
                                    var chunk = chunks_1[_i];
                                    tempFileStream.write(chunk);
                                }
                            }
                            // Write to temp file if we have one
                            if (tempFileStream) {
                                tempFileStream.write(data);
                            }
                            // Keep rolling buffer of recent data
                            chunks.push(data);
                            chunksBytes += data.length;
                            // Trim old chunks if buffer is too large
                            while (chunksBytes > maxChunksBytes && chunks.length > 1) {
                                var removed = chunks.shift();
                                chunksBytes -= removed.length;
                            }
                            // Stream partial output to callback (truncated rolling buffer)
                            if (onUpdate) {
                                var fullBuffer = Buffer.concat(chunks);
                                var fullText = fullBuffer.toString("utf-8");
                                var truncation = (0, truncate_js_1.truncateTail)(fullText);
                                onUpdate({
                                    content: [{ type: "text", text: truncation.content || "" }],
                                    details: {
                                        truncation: truncation.truncated ? truncation : undefined,
                                        fullOutputPath: tempFilePath,
                                    },
                                });
                            }
                        };
                        ops.exec(spawnContext.command, spawnContext.cwd, {
                            onData: handleData,
                            signal: signal,
                            timeout: timeout,
                            env: spawnContext.env,
                        })
                            .then(function (_a) {
                            var exitCode = _a.exitCode;
                            // Close temp file stream
                            if (tempFileStream) {
                                tempFileStream.end();
                            }
                            // Combine all buffered chunks
                            var fullBuffer = Buffer.concat(chunks);
                            var fullOutput = fullBuffer.toString("utf-8");
                            // Apply tail truncation
                            var truncation = (0, truncate_js_1.truncateTail)(fullOutput);
                            var outputText = truncation.content || "(no output)";
                            // Build details with truncation info
                            var details;
                            if (truncation.truncated) {
                                details = {
                                    truncation: truncation,
                                    fullOutputPath: tempFilePath,
                                };
                                // Build actionable notice
                                var startLine = truncation.totalLines - truncation.outputLines + 1;
                                var endLine = truncation.totalLines;
                                if (truncation.lastLinePartial) {
                                    // Edge case: last line alone > 30KB
                                    var lastLineSize = (0, truncate_js_1.formatSize)(Buffer.byteLength(fullOutput.split("\n").pop() || "", "utf-8"));
                                    outputText += "\n\n[Showing last ".concat((0, truncate_js_1.formatSize)(truncation.outputBytes), " of line ").concat(endLine, " (line is ").concat(lastLineSize, "). Full output: ").concat(tempFilePath, "]");
                                }
                                else if (truncation.truncatedBy === "lines") {
                                    outputText += "\n\n[Showing lines ".concat(startLine, "-").concat(endLine, " of ").concat(truncation.totalLines, ". Full output: ").concat(tempFilePath, "]");
                                }
                                else {
                                    outputText += "\n\n[Showing lines ".concat(startLine, "-").concat(endLine, " of ").concat(truncation.totalLines, " (").concat((0, truncate_js_1.formatSize)(truncate_js_1.DEFAULT_MAX_BYTES), " limit). Full output: ").concat(tempFilePath, "]");
                                }
                            }
                            if (exitCode !== 0 && exitCode !== null) {
                                outputText += "\n\nCommand exited with code ".concat(exitCode);
                                reject(new Error(outputText));
                            }
                            else {
                                resolve({ content: [{ type: "text", text: outputText }], details: details });
                            }
                        })
                            .catch(function (err) {
                            // Close temp file stream
                            if (tempFileStream) {
                                tempFileStream.end();
                            }
                            // Combine all buffered chunks for error output
                            var fullBuffer = Buffer.concat(chunks);
                            var output = fullBuffer.toString("utf-8");
                            if (err.message === "aborted") {
                                if (output)
                                    output += "\n\n";
                                output += "Command aborted";
                                reject(new Error(output));
                            }
                            else if (err.message.startsWith("timeout:")) {
                                var timeoutSecs = err.message.split(":")[1];
                                if (output)
                                    output += "\n\n";
                                output += "Command timed out after ".concat(timeoutSecs, " seconds");
                                reject(new Error(output));
                            }
                            else {
                                reject(err);
                            }
                        });
                    })];
            });
        }); },
    };
}
/** Default bash tool using process.cwd() - for backwards compatibility */
exports.bashTool = createBashTool(process.cwd());
