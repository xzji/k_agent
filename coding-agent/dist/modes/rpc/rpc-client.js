"use strict";
/**
 * RPC Client for programmatic access to the coding agent.
 *
 * Spawns the agent in RPC mode and provides a typed API for all operations.
 */
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
exports.RpcClient = void 0;
var node_child_process_1 = require("node:child_process");
var jsonl_js_1 = require("./jsonl.js");
// ============================================================================
// RPC Client
// ============================================================================
var RpcClient = /** @class */ (function () {
    function RpcClient(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.process = null;
        this.stopReadingStdout = null;
        this.eventListeners = [];
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.stderr = "";
    }
    /**
     * Start the RPC agent process.
     */
    RpcClient.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cliPath, args;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.process) {
                            throw new Error("Client already started");
                        }
                        cliPath = (_a = this.options.cliPath) !== null && _a !== void 0 ? _a : "dist/cli.js";
                        args = ["--mode", "rpc"];
                        if (this.options.provider) {
                            args.push("--provider", this.options.provider);
                        }
                        if (this.options.model) {
                            args.push("--model", this.options.model);
                        }
                        if (this.options.args) {
                            args.push.apply(args, this.options.args);
                        }
                        this.process = (0, node_child_process_1.spawn)("node", __spreadArray([cliPath], args, true), {
                            cwd: this.options.cwd,
                            env: __assign(__assign({}, process.env), this.options.env),
                            stdio: ["pipe", "pipe", "pipe"],
                        });
                        // Collect stderr for debugging
                        (_b = this.process.stderr) === null || _b === void 0 ? void 0 : _b.on("data", function (data) {
                            _this.stderr += data.toString();
                        });
                        // Set up strict JSONL reader for stdout.
                        this.stopReadingStdout = (0, jsonl_js_1.attachJsonlLineReader)(this.process.stdout, function (line) {
                            _this.handleLine(line);
                        });
                        // Wait a moment for process to initialize
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 1:
                        // Wait a moment for process to initialize
                        _c.sent();
                        if (this.process.exitCode !== null) {
                            throw new Error("Agent process exited immediately with code ".concat(this.process.exitCode, ". Stderr: ").concat(this.stderr));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop the RPC agent process.
     */
    RpcClient.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.process)
                            return [2 /*return*/];
                        (_a = this.stopReadingStdout) === null || _a === void 0 ? void 0 : _a.call(this);
                        this.stopReadingStdout = null;
                        this.process.kill("SIGTERM");
                        // Wait for process to exit
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var _a;
                                var timeout = setTimeout(function () {
                                    var _a;
                                    (_a = _this.process) === null || _a === void 0 ? void 0 : _a.kill("SIGKILL");
                                    resolve();
                                }, 1000);
                                (_a = _this.process) === null || _a === void 0 ? void 0 : _a.on("exit", function () {
                                    clearTimeout(timeout);
                                    resolve();
                                });
                            })];
                    case 1:
                        // Wait for process to exit
                        _b.sent();
                        this.process = null;
                        this.pendingRequests.clear();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Subscribe to agent events.
     */
    RpcClient.prototype.onEvent = function (listener) {
        var _this = this;
        this.eventListeners.push(listener);
        return function () {
            var index = _this.eventListeners.indexOf(listener);
            if (index !== -1) {
                _this.eventListeners.splice(index, 1);
            }
        };
    };
    /**
     * Get collected stderr output (useful for debugging).
     */
    RpcClient.prototype.getStderr = function () {
        return this.stderr;
    };
    // =========================================================================
    // Command Methods
    // =========================================================================
    /**
     * Send a prompt to the agent.
     * Returns immediately after sending; use onEvent() to receive streaming events.
     * Use waitForIdle() to wait for completion.
     */
    RpcClient.prototype.prompt = function (message, images) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "prompt", message: message, images: images })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Queue a steering message to interrupt the agent mid-run.
     */
    RpcClient.prototype.steer = function (message, images) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "steer", message: message, images: images })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Queue a follow-up message to be processed after the agent finishes.
     */
    RpcClient.prototype.followUp = function (message, images) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "follow_up", message: message, images: images })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Abort current operation.
     */
    RpcClient.prototype.abort = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "abort" })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start a new session, optionally with parent tracking.
     * @param parentSession - Optional parent session path for lineage tracking
     * @returns Object with `cancelled: true` if an extension cancelled the new session
     */
    RpcClient.prototype.newSession = function (parentSession) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "new_session", parentSession: parentSession })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Get current session state.
     */
    RpcClient.prototype.getState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_state" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Set model by provider and ID.
     */
    RpcClient.prototype.setModel = function (provider, modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_model", provider: provider, modelId: modelId })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Cycle to next model.
     */
    RpcClient.prototype.cycleModel = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "cycle_model" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Get list of available models.
     */
    RpcClient.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_available_models" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response).models];
                }
            });
        });
    };
    /**
     * Set thinking level.
     */
    RpcClient.prototype.setThinkingLevel = function (level) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_thinking_level", level: level })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cycle thinking level.
     */
    RpcClient.prototype.cycleThinkingLevel = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "cycle_thinking_level" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Set steering mode.
     */
    RpcClient.prototype.setSteeringMode = function (mode) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_steering_mode", mode: mode })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set follow-up mode.
     */
    RpcClient.prototype.setFollowUpMode = function (mode) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_follow_up_mode", mode: mode })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Compact session context.
     */
    RpcClient.prototype.compact = function (customInstructions) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "compact", customInstructions: customInstructions })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Set auto-compaction enabled/disabled.
     */
    RpcClient.prototype.setAutoCompaction = function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_auto_compaction", enabled: enabled })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set auto-retry enabled/disabled.
     */
    RpcClient.prototype.setAutoRetry = function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_auto_retry", enabled: enabled })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Abort in-progress retry.
     */
    RpcClient.prototype.abortRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "abort_retry" })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute a bash command.
     */
    RpcClient.prototype.bash = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "bash", command: command })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Abort running bash command.
     */
    RpcClient.prototype.abortBash = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "abort_bash" })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get session statistics.
     */
    RpcClient.prototype.getSessionStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_session_stats" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Export session to HTML.
     */
    RpcClient.prototype.exportHtml = function (outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "export_html", outputPath: outputPath })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Switch to a different session file.
     * @returns Object with `cancelled: true` if an extension cancelled the switch
     */
    RpcClient.prototype.switchSession = function (sessionPath) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "switch_session", sessionPath: sessionPath })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Fork from a specific message.
     * @returns Object with `text` (the message text) and `cancelled` (if extension cancelled)
     */
    RpcClient.prototype.fork = function (entryId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "fork", entryId: entryId })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response)];
                }
            });
        });
    };
    /**
     * Get messages available for forking.
     */
    RpcClient.prototype.getForkMessages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_fork_messages" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response).messages];
                }
            });
        });
    };
    /**
     * Get text of last assistant message.
     */
    RpcClient.prototype.getLastAssistantText = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_last_assistant_text" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response).text];
                }
            });
        });
    };
    /**
     * Set the session display name.
     */
    RpcClient.prototype.setSessionName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "set_session_name", name: name })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all messages in the session.
     */
    RpcClient.prototype.getMessages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_messages" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response).messages];
                }
            });
        });
    };
    /**
     * Get available commands (extension commands, prompt templates, skills).
     */
    RpcClient.prototype.getCommands = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send({ type: "get_commands" })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, this.getData(response).commands];
                }
            });
        });
    };
    // =========================================================================
    // Helpers
    // =========================================================================
    /**
     * Wait for agent to become idle (no streaming).
     * Resolves when agent_end event is received.
     */
    RpcClient.prototype.waitForIdle = function (timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 60000; }
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                unsubscribe();
                reject(new Error("Timeout waiting for agent to become idle. Stderr: ".concat(_this.stderr)));
            }, timeout);
            var unsubscribe = _this.onEvent(function (event) {
                if (event.type === "agent_end") {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve();
                }
            });
        });
    };
    /**
     * Collect events until agent becomes idle.
     */
    RpcClient.prototype.collectEvents = function (timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 60000; }
        return new Promise(function (resolve, reject) {
            var events = [];
            var timer = setTimeout(function () {
                unsubscribe();
                reject(new Error("Timeout collecting events. Stderr: ".concat(_this.stderr)));
            }, timeout);
            var unsubscribe = _this.onEvent(function (event) {
                events.push(event);
                if (event.type === "agent_end") {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(events);
                }
            });
        });
    };
    /**
     * Send prompt and wait for completion, returning all events.
     */
    RpcClient.prototype.promptAndWait = function (message_1, images_1) {
        return __awaiter(this, arguments, void 0, function (message, images, timeout) {
            var eventsPromise;
            if (timeout === void 0) { timeout = 60000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        eventsPromise = this.collectEvents(timeout);
                        return [4 /*yield*/, this.prompt(message, images)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, eventsPromise];
                }
            });
        });
    };
    // =========================================================================
    // Internal
    // =========================================================================
    RpcClient.prototype.handleLine = function (line) {
        try {
            var data = JSON.parse(line);
            // Check if it's a response to a pending request
            if (data.type === "response" && data.id && this.pendingRequests.has(data.id)) {
                var pending = this.pendingRequests.get(data.id);
                this.pendingRequests.delete(data.id);
                pending.resolve(data);
                return;
            }
            // Otherwise it's an event
            for (var _i = 0, _a = this.eventListeners; _i < _a.length; _i++) {
                var listener = _a[_i];
                listener(data);
            }
        }
        catch (_b) {
            // Ignore non-JSON lines
        }
    };
    RpcClient.prototype.send = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var id, fullCommand;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                if (!((_a = this.process) === null || _a === void 0 ? void 0 : _a.stdin)) {
                    throw new Error("Client not started");
                }
                id = "req_".concat(++this.requestId);
                fullCommand = __assign(__assign({}, command), { id: id });
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.pendingRequests.set(id, { resolve: resolve, reject: reject });
                        var timeout = setTimeout(function () {
                            _this.pendingRequests.delete(id);
                            reject(new Error("Timeout waiting for response to ".concat(command.type, ". Stderr: ").concat(_this.stderr)));
                        }, 30000);
                        _this.pendingRequests.set(id, {
                            resolve: function (response) {
                                clearTimeout(timeout);
                                resolve(response);
                            },
                            reject: function (error) {
                                clearTimeout(timeout);
                                reject(error);
                            },
                        });
                        _this.process.stdin.write((0, jsonl_js_1.serializeJsonLine)(fullCommand));
                    })];
            });
        });
    };
    RpcClient.prototype.getData = function (response) {
        if (!response.success) {
            var errorResponse = response;
            throw new Error(errorResponse.error);
        }
        // Type assertion: we trust response.data matches T based on the command sent.
        // This is safe because each public method specifies the correct T for its command.
        var successResponse = response;
        return successResponse.data;
    };
    return RpcClient;
}());
exports.RpcClient = RpcClient;
