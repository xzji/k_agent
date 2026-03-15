"use strict";
/**
 * RPC mode: Headless operation with JSON stdin/stdout protocol.
 *
 * Used for embedding the agent in other applications.
 * Receives commands as JSON on stdin, outputs events and responses as JSON on stdout.
 *
 * Protocol:
 * - Commands: JSON objects with `type` field, optional `id` for correlation
 * - Responses: JSON objects with `type: "response"`, `command`, `success`, and optional `data`/`error`
 * - Events: AgentSessionEvent objects streamed as they occur
 * - Extension UI: Extension UI requests are emitted, client responds with extension_ui_response
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRpcMode = runRpcMode;
var crypto = require("node:crypto");
var theme_js_1 = require("../interactive/theme/theme.js");
var jsonl_js_1 = require("./jsonl.js");
/**
 * Run in RPC mode.
 * Listens for JSON commands on stdin, outputs events and responses on stdout.
 */
function runRpcMode(session) {
    return __awaiter(this, void 0, void 0, function () {
        /** Helper for dialog methods with signal/timeout support */
        function createDialogPromise(opts, defaultValue, request, parseResponse) {
            var _a;
            if ((_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.aborted)
                return Promise.resolve(defaultValue);
            var id = crypto.randomUUID();
            return new Promise(function (resolve, reject) {
                var _a;
                var timeoutId;
                var cleanup = function () {
                    var _a;
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", onAbort);
                    pendingExtensionRequests.delete(id);
                };
                var onAbort = function () {
                    cleanup();
                    resolve(defaultValue);
                };
                (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.addEventListener("abort", onAbort, { once: true });
                if (opts === null || opts === void 0 ? void 0 : opts.timeout) {
                    timeoutId = setTimeout(function () {
                        cleanup();
                        resolve(defaultValue);
                    }, opts.timeout);
                }
                pendingExtensionRequests.set(id, {
                    resolve: function (response) {
                        cleanup();
                        resolve(parseResponse(response));
                    },
                    reject: reject,
                });
                output(__assign({ type: "extension_ui_request", id: id }, request));
            });
        }
        function checkShutdownRequested() {
            return __awaiter(this, void 0, void 0, function () {
                var currentRunner;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!shutdownRequested)
                                return [2 /*return*/];
                            currentRunner = session.extensionRunner;
                            if (!(currentRunner === null || currentRunner === void 0 ? void 0 : currentRunner.hasHandlers("session_shutdown"))) return [3 /*break*/, 2];
                            return [4 /*yield*/, currentRunner.emit({ type: "session_shutdown" })];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            detachInput();
                            process.stdin.pause();
                            process.exit(0);
                            return [2 /*return*/];
                    }
                });
            });
        }
        var output, success, error, pendingExtensionRequests, shutdownRequested, createExtensionUIContext, handleCommand, detachInput, handleInputLine;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    output = function (obj) {
                        process.stdout.write((0, jsonl_js_1.serializeJsonLine)(obj));
                    };
                    success = function (id, command, data) {
                        if (data === undefined) {
                            return { id: id, type: "response", command: command, success: true };
                        }
                        return { id: id, type: "response", command: command, success: true, data: data };
                    };
                    error = function (id, command, message) {
                        return { id: id, type: "response", command: command, success: false, error: message };
                    };
                    pendingExtensionRequests = new Map();
                    shutdownRequested = false;
                    createExtensionUIContext = function () { return ({
                        select: function (title, options, opts) {
                            return createDialogPromise(opts, undefined, { method: "select", title: title, options: options, timeout: opts === null || opts === void 0 ? void 0 : opts.timeout }, function (r) {
                                return "cancelled" in r && r.cancelled ? undefined : "value" in r ? r.value : undefined;
                            });
                        },
                        confirm: function (title, message, opts) {
                            return createDialogPromise(opts, false, { method: "confirm", title: title, message: message, timeout: opts === null || opts === void 0 ? void 0 : opts.timeout }, function (r) {
                                return "cancelled" in r && r.cancelled ? false : "confirmed" in r ? r.confirmed : false;
                            });
                        },
                        input: function (title, placeholder, opts) {
                            return createDialogPromise(opts, undefined, { method: "input", title: title, placeholder: placeholder, timeout: opts === null || opts === void 0 ? void 0 : opts.timeout }, function (r) {
                                return "cancelled" in r && r.cancelled ? undefined : "value" in r ? r.value : undefined;
                            });
                        },
                        notify: function (message, type) {
                            // Fire and forget - no response needed
                            output({
                                type: "extension_ui_request",
                                id: crypto.randomUUID(),
                                method: "notify",
                                message: message,
                                notifyType: type,
                            });
                        },
                        onTerminalInput: function () {
                            // Raw terminal input not supported in RPC mode
                            return function () { };
                        },
                        setStatus: function (key, text) {
                            // Fire and forget - no response needed
                            output({
                                type: "extension_ui_request",
                                id: crypto.randomUUID(),
                                method: "setStatus",
                                statusKey: key,
                                statusText: text,
                            });
                        },
                        setWorkingMessage: function (_message) {
                            // Working message not supported in RPC mode - requires TUI loader access
                        },
                        setWidget: function (key, content, options) {
                            // Only support string arrays in RPC mode - factory functions are ignored
                            if (content === undefined || Array.isArray(content)) {
                                output({
                                    type: "extension_ui_request",
                                    id: crypto.randomUUID(),
                                    method: "setWidget",
                                    widgetKey: key,
                                    widgetLines: content,
                                    widgetPlacement: options === null || options === void 0 ? void 0 : options.placement,
                                });
                            }
                            // Component factories are not supported in RPC mode - would need TUI access
                        },
                        setFooter: function (_factory) {
                            // Custom footer not supported in RPC mode - requires TUI access
                        },
                        setHeader: function (_factory) {
                            // Custom header not supported in RPC mode - requires TUI access
                        },
                        setTitle: function (title) {
                            // Fire and forget - host can implement terminal title control
                            output({
                                type: "extension_ui_request",
                                id: crypto.randomUUID(),
                                method: "setTitle",
                                title: title,
                            });
                        },
                        custom: function () {
                            return __awaiter(this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    // Custom UI not supported in RPC mode
                                    return [2 /*return*/, undefined];
                                });
                            });
                        },
                        pasteToEditor: function (text) {
                            // Paste handling not supported in RPC mode - falls back to setEditorText
                            this.setEditorText(text);
                        },
                        setEditorText: function (text) {
                            // Fire and forget - host can implement editor control
                            output({
                                type: "extension_ui_request",
                                id: crypto.randomUUID(),
                                method: "set_editor_text",
                                text: text,
                            });
                        },
                        getEditorText: function () {
                            // Synchronous method can't wait for RPC response
                            // Host should track editor state locally if needed
                            return "";
                        },
                        editor: function (title, prefill) {
                            return __awaiter(this, void 0, void 0, function () {
                                var id;
                                return __generator(this, function (_a) {
                                    id = crypto.randomUUID();
                                    return [2 /*return*/, new Promise(function (resolve, reject) {
                                            pendingExtensionRequests.set(id, {
                                                resolve: function (response) {
                                                    if ("cancelled" in response && response.cancelled) {
                                                        resolve(undefined);
                                                    }
                                                    else if ("value" in response) {
                                                        resolve(response.value);
                                                    }
                                                    else {
                                                        resolve(undefined);
                                                    }
                                                },
                                                reject: reject,
                                            });
                                            output({ type: "extension_ui_request", id: id, method: "editor", title: title, prefill: prefill });
                                        })];
                                });
                            });
                        },
                        setEditorComponent: function () {
                            // Custom editor components not supported in RPC mode
                        },
                        get theme() {
                            return theme_js_1.theme;
                        },
                        getAllThemes: function () {
                            return [];
                        },
                        getTheme: function (_name) {
                            return undefined;
                        },
                        setTheme: function (_theme) {
                            // Theme switching not supported in RPC mode
                            return { success: false, error: "Theme switching not supported in RPC mode" };
                        },
                        getToolsExpanded: function () {
                            // Tool expansion not supported in RPC mode - no TUI
                            return false;
                        },
                        setToolsExpanded: function (_expanded) {
                            // Tool expansion not supported in RPC mode - no TUI
                        },
                    }); };
                    // Set up extensions with RPC-based UI context
                    return [4 /*yield*/, session.bindExtensions({
                            uiContext: createExtensionUIContext(),
                            commandContextActions: {
                                waitForIdle: function () { return session.agent.waitForIdle(); },
                                newSession: function (options) { return __awaiter(_this, void 0, void 0, function () {
                                    var success;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.newSession(options)];
                                            case 1:
                                                success = _a.sent();
                                                return [2 /*return*/, { cancelled: !success }];
                                        }
                                    });
                                }); },
                                fork: function (entryId) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.fork(entryId)];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, { cancelled: result.cancelled }];
                                        }
                                    });
                                }); },
                                navigateTree: function (targetId, options) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.navigateTree(targetId, {
                                                    summarize: options === null || options === void 0 ? void 0 : options.summarize,
                                                    customInstructions: options === null || options === void 0 ? void 0 : options.customInstructions,
                                                    replaceInstructions: options === null || options === void 0 ? void 0 : options.replaceInstructions,
                                                    label: options === null || options === void 0 ? void 0 : options.label,
                                                })];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, { cancelled: result.cancelled }];
                                        }
                                    });
                                }); },
                                switchSession: function (sessionPath) { return __awaiter(_this, void 0, void 0, function () {
                                    var success;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.switchSession(sessionPath)];
                                            case 1:
                                                success = _a.sent();
                                                return [2 /*return*/, { cancelled: !success }];
                                        }
                                    });
                                }); },
                                reload: function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.reload()];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                            },
                            shutdownHandler: function () {
                                shutdownRequested = true;
                            },
                            onError: function (err) {
                                output({ type: "extension_error", extensionPath: err.extensionPath, event: err.event, error: err.error });
                            },
                        })];
                case 1:
                    // Set up extensions with RPC-based UI context
                    _a.sent();
                    // Output all agent events as JSON
                    session.subscribe(function (event) {
                        output(event);
                    });
                    handleCommand = function (command) { return __awaiter(_this, void 0, void 0, function () {
                        var id, _a, options, cancelled, state, models, model, result, models, level, result, result, stats, path, cancelled, result, messages, text, name_1, commands, _i, _b, _c, command_1, extensionPath, _d, _e, template, _f, _g, skill, unknownCommand;
                        var _h, _j;
                        return __generator(this, function (_k) {
                            switch (_k.label) {
                                case 0:
                                    id = command.id;
                                    _a = command.type;
                                    switch (_a) {
                                        case "prompt": return [3 /*break*/, 1];
                                        case "steer": return [3 /*break*/, 2];
                                        case "follow_up": return [3 /*break*/, 4];
                                        case "abort": return [3 /*break*/, 6];
                                        case "new_session": return [3 /*break*/, 8];
                                        case "get_state": return [3 /*break*/, 10];
                                        case "set_model": return [3 /*break*/, 11];
                                        case "cycle_model": return [3 /*break*/, 14];
                                        case "get_available_models": return [3 /*break*/, 16];
                                        case "set_thinking_level": return [3 /*break*/, 18];
                                        case "cycle_thinking_level": return [3 /*break*/, 19];
                                        case "set_steering_mode": return [3 /*break*/, 20];
                                        case "set_follow_up_mode": return [3 /*break*/, 21];
                                        case "compact": return [3 /*break*/, 22];
                                        case "set_auto_compaction": return [3 /*break*/, 24];
                                        case "set_auto_retry": return [3 /*break*/, 25];
                                        case "abort_retry": return [3 /*break*/, 26];
                                        case "bash": return [3 /*break*/, 27];
                                        case "abort_bash": return [3 /*break*/, 29];
                                        case "get_session_stats": return [3 /*break*/, 30];
                                        case "export_html": return [3 /*break*/, 31];
                                        case "switch_session": return [3 /*break*/, 33];
                                        case "fork": return [3 /*break*/, 35];
                                        case "get_fork_messages": return [3 /*break*/, 37];
                                        case "get_last_assistant_text": return [3 /*break*/, 38];
                                        case "set_session_name": return [3 /*break*/, 39];
                                        case "get_messages": return [3 /*break*/, 40];
                                        case "get_commands": return [3 /*break*/, 41];
                                    }
                                    return [3 /*break*/, 42];
                                case 1:
                                    {
                                        // Don't await - events will stream
                                        // Extension commands are executed immediately, file prompt templates are expanded
                                        // If streaming and streamingBehavior specified, queues via steer/followUp
                                        session
                                            .prompt(command.message, {
                                            images: command.images,
                                            streamingBehavior: command.streamingBehavior,
                                            source: "rpc",
                                        })
                                            .catch(function (e) { return output(error(id, "prompt", e.message)); });
                                        return [2 /*return*/, success(id, "prompt")];
                                    }
                                    _k.label = 2;
                                case 2: return [4 /*yield*/, session.steer(command.message, command.images)];
                                case 3:
                                    _k.sent();
                                    return [2 /*return*/, success(id, "steer")];
                                case 4: return [4 /*yield*/, session.followUp(command.message, command.images)];
                                case 5:
                                    _k.sent();
                                    return [2 /*return*/, success(id, "follow_up")];
                                case 6: return [4 /*yield*/, session.abort()];
                                case 7:
                                    _k.sent();
                                    return [2 /*return*/, success(id, "abort")];
                                case 8:
                                    options = command.parentSession ? { parentSession: command.parentSession } : undefined;
                                    return [4 /*yield*/, session.newSession(options)];
                                case 9:
                                    cancelled = !(_k.sent());
                                    return [2 /*return*/, success(id, "new_session", { cancelled: cancelled })];
                                case 10:
                                    {
                                        state = {
                                            model: session.model,
                                            thinkingLevel: session.thinkingLevel,
                                            isStreaming: session.isStreaming,
                                            isCompacting: session.isCompacting,
                                            steeringMode: session.steeringMode,
                                            followUpMode: session.followUpMode,
                                            sessionFile: session.sessionFile,
                                            sessionId: session.sessionId,
                                            sessionName: session.sessionName,
                                            autoCompactionEnabled: session.autoCompactionEnabled,
                                            messageCount: session.messages.length,
                                            pendingMessageCount: session.pendingMessageCount,
                                        };
                                        return [2 /*return*/, success(id, "get_state", state)];
                                    }
                                    _k.label = 11;
                                case 11: return [4 /*yield*/, session.modelRegistry.getAvailable()];
                                case 12:
                                    models = _k.sent();
                                    model = models.find(function (m) { return m.provider === command.provider && m.id === command.modelId; });
                                    if (!model) {
                                        return [2 /*return*/, error(id, "set_model", "Model not found: ".concat(command.provider, "/").concat(command.modelId))];
                                    }
                                    return [4 /*yield*/, session.setModel(model)];
                                case 13:
                                    _k.sent();
                                    return [2 /*return*/, success(id, "set_model", model)];
                                case 14: return [4 /*yield*/, session.cycleModel()];
                                case 15:
                                    result = _k.sent();
                                    if (!result) {
                                        return [2 /*return*/, success(id, "cycle_model", null)];
                                    }
                                    return [2 /*return*/, success(id, "cycle_model", result)];
                                case 16: return [4 /*yield*/, session.modelRegistry.getAvailable()];
                                case 17:
                                    models = _k.sent();
                                    return [2 /*return*/, success(id, "get_available_models", { models: models })];
                                case 18:
                                    {
                                        session.setThinkingLevel(command.level);
                                        return [2 /*return*/, success(id, "set_thinking_level")];
                                    }
                                    _k.label = 19;
                                case 19:
                                    {
                                        level = session.cycleThinkingLevel();
                                        if (!level) {
                                            return [2 /*return*/, success(id, "cycle_thinking_level", null)];
                                        }
                                        return [2 /*return*/, success(id, "cycle_thinking_level", { level: level })];
                                    }
                                    _k.label = 20;
                                case 20:
                                    {
                                        session.setSteeringMode(command.mode);
                                        return [2 /*return*/, success(id, "set_steering_mode")];
                                    }
                                    _k.label = 21;
                                case 21:
                                    {
                                        session.setFollowUpMode(command.mode);
                                        return [2 /*return*/, success(id, "set_follow_up_mode")];
                                    }
                                    _k.label = 22;
                                case 22: return [4 /*yield*/, session.compact(command.customInstructions)];
                                case 23:
                                    result = _k.sent();
                                    return [2 /*return*/, success(id, "compact", result)];
                                case 24:
                                    {
                                        session.setAutoCompactionEnabled(command.enabled);
                                        return [2 /*return*/, success(id, "set_auto_compaction")];
                                    }
                                    _k.label = 25;
                                case 25:
                                    {
                                        session.setAutoRetryEnabled(command.enabled);
                                        return [2 /*return*/, success(id, "set_auto_retry")];
                                    }
                                    _k.label = 26;
                                case 26:
                                    {
                                        session.abortRetry();
                                        return [2 /*return*/, success(id, "abort_retry")];
                                    }
                                    _k.label = 27;
                                case 27: return [4 /*yield*/, session.executeBash(command.command)];
                                case 28:
                                    result = _k.sent();
                                    return [2 /*return*/, success(id, "bash", result)];
                                case 29:
                                    {
                                        session.abortBash();
                                        return [2 /*return*/, success(id, "abort_bash")];
                                    }
                                    _k.label = 30;
                                case 30:
                                    {
                                        stats = session.getSessionStats();
                                        return [2 /*return*/, success(id, "get_session_stats", stats)];
                                    }
                                    _k.label = 31;
                                case 31: return [4 /*yield*/, session.exportToHtml(command.outputPath)];
                                case 32:
                                    path = _k.sent();
                                    return [2 /*return*/, success(id, "export_html", { path: path })];
                                case 33: return [4 /*yield*/, session.switchSession(command.sessionPath)];
                                case 34:
                                    cancelled = !(_k.sent());
                                    return [2 /*return*/, success(id, "switch_session", { cancelled: cancelled })];
                                case 35: return [4 /*yield*/, session.fork(command.entryId)];
                                case 36:
                                    result = _k.sent();
                                    return [2 /*return*/, success(id, "fork", { text: result.selectedText, cancelled: result.cancelled })];
                                case 37:
                                    {
                                        messages = session.getUserMessagesForForking();
                                        return [2 /*return*/, success(id, "get_fork_messages", { messages: messages })];
                                    }
                                    _k.label = 38;
                                case 38:
                                    {
                                        text = session.getLastAssistantText();
                                        return [2 /*return*/, success(id, "get_last_assistant_text", { text: text })];
                                    }
                                    _k.label = 39;
                                case 39:
                                    {
                                        name_1 = command.name.trim();
                                        if (!name_1) {
                                            return [2 /*return*/, error(id, "set_session_name", "Session name cannot be empty")];
                                        }
                                        session.setSessionName(name_1);
                                        return [2 /*return*/, success(id, "set_session_name")];
                                    }
                                    _k.label = 40;
                                case 40:
                                    {
                                        return [2 /*return*/, success(id, "get_messages", { messages: session.messages })];
                                    }
                                    _k.label = 41;
                                case 41:
                                    {
                                        commands = [];
                                        // Extension commands
                                        for (_i = 0, _b = (_j = (_h = session.extensionRunner) === null || _h === void 0 ? void 0 : _h.getRegisteredCommandsWithPaths()) !== null && _j !== void 0 ? _j : []; _i < _b.length; _i++) {
                                            _c = _b[_i], command_1 = _c.command, extensionPath = _c.extensionPath;
                                            commands.push({
                                                name: command_1.name,
                                                description: command_1.description,
                                                source: "extension",
                                                path: extensionPath,
                                            });
                                        }
                                        // Prompt templates (source is always "user" | "project" | "path" in coding-agent)
                                        for (_d = 0, _e = session.promptTemplates; _d < _e.length; _d++) {
                                            template = _e[_d];
                                            commands.push({
                                                name: template.name,
                                                description: template.description,
                                                source: "prompt",
                                                location: template.source,
                                                path: template.filePath,
                                            });
                                        }
                                        // Skills (source is always "user" | "project" | "path" in coding-agent)
                                        for (_f = 0, _g = session.resourceLoader.getSkills().skills; _f < _g.length; _f++) {
                                            skill = _g[_f];
                                            commands.push({
                                                name: "skill:".concat(skill.name),
                                                description: skill.description,
                                                source: "skill",
                                                location: skill.source,
                                                path: skill.filePath,
                                            });
                                        }
                                        return [2 /*return*/, success(id, "get_commands", { commands: commands })];
                                    }
                                    _k.label = 42;
                                case 42:
                                    {
                                        unknownCommand = command;
                                        return [2 /*return*/, error(undefined, unknownCommand.type, "Unknown command: ".concat(unknownCommand.type))];
                                    }
                                    _k.label = 43;
                                case 43: return [2 /*return*/];
                            }
                        });
                    }); };
                    detachInput = function () { };
                    handleInputLine = function (line) { return __awaiter(_this, void 0, void 0, function () {
                        var parsed, response_1, pending, command, response, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    parsed = JSON.parse(line);
                                    // Handle extension UI responses
                                    if (parsed.type === "extension_ui_response") {
                                        response_1 = parsed;
                                        pending = pendingExtensionRequests.get(response_1.id);
                                        if (pending) {
                                            pendingExtensionRequests.delete(response_1.id);
                                            pending.resolve(response_1);
                                        }
                                        return [2 /*return*/];
                                    }
                                    command = parsed;
                                    return [4 /*yield*/, handleCommand(command)];
                                case 1:
                                    response = _a.sent();
                                    output(response);
                                    // Check for deferred shutdown request (idle between commands)
                                    return [4 /*yield*/, checkShutdownRequested()];
                                case 2:
                                    // Check for deferred shutdown request (idle between commands)
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    output(error(undefined, "parse", "Failed to parse command: ".concat(e_1.message)));
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); };
                    detachInput = (0, jsonl_js_1.attachJsonlLineReader)(process.stdin, function (line) {
                        void handleInputLine(line);
                    });
                    // Keep process alive forever
                    return [2 /*return*/, new Promise(function () { })];
            }
        });
    });
}
