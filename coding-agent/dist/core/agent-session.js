"use strict";
/**
 * AgentSession - Core abstraction for agent lifecycle and session management.
 *
 * This class is shared between all run modes (interactive, print, rpc).
 * It encapsulates:
 * - Agent state access
 * - Event subscription with automatic session persistence
 * - Model and thinking level management
 * - Compaction (manual and auto)
 * - Bash execution
 * - Session switching and branching
 *
 * Modes use this class and add their own I/O layer on top.
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
exports.AgentSession = void 0;
exports.parseSkillBlock = parseSkillBlock;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var pi_ai_1 = require("@mariozechner/pi-ai");
var config_js_1 = require("../config.js");
var theme_js_1 = require("../modes/interactive/theme/theme.js");
var frontmatter_js_1 = require("../utils/frontmatter.js");
var sleep_js_1 = require("../utils/sleep.js");
var bash_executor_js_1 = require("./bash-executor.js");
var index_js_1 = require("./compaction/index.js");
var defaults_js_1 = require("./defaults.js");
var index_js_2 = require("./export-html/index.js");
var tool_renderer_js_1 = require("./export-html/tool-renderer.js");
var index_js_3 = require("./extensions/index.js");
var prompt_templates_js_1 = require("./prompt-templates.js");
var session_manager_js_1 = require("./session-manager.js");
var slash_commands_js_1 = require("./slash-commands.js");
var system_prompt_js_1 = require("./system-prompt.js");
var index_js_4 = require("./tools/index.js");
/**
 * Parse a skill block from message text.
 * Returns null if the text doesn't contain a skill block.
 */
function parseSkillBlock(text) {
    var _a;
    var match = text.match(/^<skill name="([^"]+)" location="([^"]+)">\n([\s\S]*?)\n<\/skill>(?:\n\n([\s\S]+))?$/);
    if (!match)
        return null;
    return {
        name: match[1],
        location: match[2],
        content: match[3],
        userMessage: ((_a = match[4]) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
    };
}
// ============================================================================
// Constants
// ============================================================================
/** Standard thinking levels */
var THINKING_LEVELS = ["off", "minimal", "low", "medium", "high"];
/** Thinking levels including xhigh (for supported models) */
var THINKING_LEVELS_WITH_XHIGH = ["off", "minimal", "low", "medium", "high", "xhigh"];
// ============================================================================
// AgentSession Class
// ============================================================================
var AgentSession = /** @class */ (function () {
    function AgentSession(config) {
        var _this = this;
        var _a, _b;
        this._eventListeners = [];
        this._agentEventQueue = Promise.resolve();
        /** Tracks pending steering messages for UI display. Removed when delivered. */
        this._steeringMessages = [];
        /** Tracks pending follow-up messages for UI display. Removed when delivered. */
        this._followUpMessages = [];
        /** Messages queued to be included with the next user prompt as context ("asides"). */
        this._pendingNextTurnMessages = [];
        // Compaction state
        this._compactionAbortController = undefined;
        this._autoCompactionAbortController = undefined;
        this._overflowRecoveryAttempted = false;
        // Branch summarization state
        this._branchSummaryAbortController = undefined;
        // Retry state
        this._retryAbortController = undefined;
        this._retryAttempt = 0;
        this._retryPromise = undefined;
        this._retryResolve = undefined;
        // Bash execution state
        this._bashAbortController = undefined;
        this._pendingBashMessages = [];
        // Extension system
        this._extensionRunner = undefined;
        this._turnIndex = 0;
        this._baseToolRegistry = new Map();
        // Tool registry for extension getTools/setTools
        this._toolRegistry = new Map();
        this._toolPromptSnippets = new Map();
        this._toolPromptGuidelines = new Map();
        // Base system prompt (without extension appends) - used to apply fresh appends each turn
        this._baseSystemPrompt = "";
        // Track last assistant message for auto-compaction check
        this._lastAssistantMessage = undefined;
        /** Internal handler for agent events - shared by subscribe and reconnect */
        this._handleAgentEvent = function (event) {
            // Create retry promise synchronously before queueing async processing.
            // Agent.emit() calls this handler synchronously, and prompt() calls waitForRetry()
            // as soon as agent.prompt() resolves. If _retryPromise is created only inside
            // _processAgentEvent, slow earlier queued events can delay agent_end processing
            // and waitForRetry() can miss the in-flight retry.
            _this._createRetryPromiseForAgentEnd(event);
            _this._agentEventQueue = _this._agentEventQueue.then(function () { return _this._processAgentEvent(event); }, function () { return _this._processAgentEvent(event); });
            // Keep queue alive if an event handler fails
            _this._agentEventQueue.catch(function () { });
        };
        this.agent = config.agent;
        this.sessionManager = config.sessionManager;
        this.settingsManager = config.settingsManager;
        this._scopedModels = (_a = config.scopedModels) !== null && _a !== void 0 ? _a : [];
        this._resourceLoader = config.resourceLoader;
        this._customTools = (_b = config.customTools) !== null && _b !== void 0 ? _b : [];
        this._cwd = config.cwd;
        this._modelRegistry = config.modelRegistry;
        this._extensionRunnerRef = config.extensionRunnerRef;
        this._initialActiveToolNames = config.initialActiveToolNames;
        this._baseToolsOverride = config.baseToolsOverride;
        // Always subscribe to agent events for internal handling
        // (session persistence, extensions, auto-compaction, retry logic)
        this._unsubscribeAgent = this.agent.subscribe(this._handleAgentEvent);
        this._installAgentToolHooks();
        this._buildRuntime({
            activeToolNames: this._initialActiveToolNames,
            includeAllExtensionTools: true,
        });
    }
    Object.defineProperty(AgentSession.prototype, "modelRegistry", {
        /** Model registry for API key resolution and model discovery */
        get: function () {
            return this._modelRegistry;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Install tool hooks once on the Agent instance.
     *
     * The callbacks read `this._extensionRunner` at execution time, so extension reload swaps in the
     * new runner without reinstalling hooks. Extension-specific tool wrappers are still used to adapt
     * registered tool execution to the extension context. Tool call and tool result interception now
     * happens here instead of in wrappers.
     */
    AgentSession.prototype._installAgentToolHooks = function () {
        var _this = this;
        this.agent.setBeforeToolCall(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var runner, err_1;
            var toolCall = _b.toolCall, args = _b.args;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        runner = this._extensionRunner;
                        if (!(runner === null || runner === void 0 ? void 0 : runner.hasHandlers("tool_call"))) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, this._agentEventQueue];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, runner.emitToolCall({
                                type: "tool_call",
                                toolName: toolCall.name,
                                toolCallId: toolCall.id,
                                input: args,
                            })];
                    case 3: return [2 /*return*/, _c.sent()];
                    case 4:
                        err_1 = _c.sent();
                        if (err_1 instanceof Error) {
                            throw err_1;
                        }
                        throw new Error("Extension failed, blocking execution: ".concat(String(err_1)));
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        this.agent.setAfterToolCall(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var runner, hookResult;
            var toolCall = _b.toolCall, args = _b.args, result = _b.result, isError = _b.isError;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        runner = this._extensionRunner;
                        if (!(runner === null || runner === void 0 ? void 0 : runner.hasHandlers("tool_result"))) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, runner.emitToolResult({
                                type: "tool_result",
                                toolName: toolCall.name,
                                toolCallId: toolCall.id,
                                input: args,
                                content: result.content,
                                details: isError ? undefined : result.details,
                                isError: isError,
                            })];
                    case 1:
                        hookResult = _c.sent();
                        if (!hookResult || isError) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, {
                                content: hookResult.content,
                                details: hookResult.details,
                            }];
                }
            });
        }); });
    };
    // =========================================================================
    // Event Subscription
    // =========================================================================
    /** Emit an event to all listeners */
    AgentSession.prototype._emit = function (event) {
        for (var _i = 0, _a = this._eventListeners; _i < _a.length; _i++) {
            var l = _a[_i];
            l(event);
        }
    };
    AgentSession.prototype._createRetryPromiseForAgentEnd = function (event) {
        var _this = this;
        if (event.type !== "agent_end" || this._retryPromise) {
            return;
        }
        var settings = this.settingsManager.getRetrySettings();
        if (!settings.enabled) {
            return;
        }
        var lastAssistant = this._findLastAssistantInMessages(event.messages);
        if (!lastAssistant || !this._isRetryableError(lastAssistant)) {
            return;
        }
        this._retryPromise = new Promise(function (resolve) {
            _this._retryResolve = resolve;
        });
    };
    AgentSession.prototype._findLastAssistantInMessages = function (messages) {
        for (var i = messages.length - 1; i >= 0; i--) {
            var message = messages[i];
            if (message.role === "assistant") {
                return message;
            }
        }
        return undefined;
    };
    AgentSession.prototype._processAgentEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var messageText, steeringIndex, followUpIndex, assistantMsg, msg, didRetry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // When a user message starts, check if it's from either queue and remove it BEFORE emitting
                        // This ensures the UI sees the updated queue state
                        if (event.type === "message_start" && event.message.role === "user") {
                            this._overflowRecoveryAttempted = false;
                            messageText = this._getUserMessageText(event.message);
                            if (messageText) {
                                steeringIndex = this._steeringMessages.indexOf(messageText);
                                if (steeringIndex !== -1) {
                                    this._steeringMessages.splice(steeringIndex, 1);
                                }
                                else {
                                    followUpIndex = this._followUpMessages.indexOf(messageText);
                                    if (followUpIndex !== -1) {
                                        this._followUpMessages.splice(followUpIndex, 1);
                                    }
                                }
                            }
                        }
                        // Emit to extensions first
                        return [4 /*yield*/, this._emitExtensionEvent(event)];
                    case 1:
                        // Emit to extensions first
                        _a.sent();
                        // Notify all listeners
                        this._emit(event);
                        // Handle session persistence
                        if (event.type === "message_end") {
                            // Check if this is a custom message from extensions
                            if (event.message.role === "custom") {
                                // Persist as CustomMessageEntry
                                this.sessionManager.appendCustomMessageEntry(event.message.customType, event.message.content, event.message.display, event.message.details);
                            }
                            else if (event.message.role === "user" ||
                                event.message.role === "assistant" ||
                                event.message.role === "toolResult") {
                                // Regular LLM message - persist as SessionMessageEntry
                                this.sessionManager.appendMessage(event.message);
                            }
                            // Other message types (bashExecution, compactionSummary, branchSummary) are persisted elsewhere
                            // Track assistant message for auto-compaction (checked on agent_end)
                            if (event.message.role === "assistant") {
                                this._lastAssistantMessage = event.message;
                                assistantMsg = event.message;
                                if (assistantMsg.stopReason !== "error") {
                                    this._overflowRecoveryAttempted = false;
                                }
                                // Reset retry counter immediately on successful assistant response
                                // This prevents accumulation across multiple LLM calls within a turn
                                if (assistantMsg.stopReason !== "error" && this._retryAttempt > 0) {
                                    this._emit({
                                        type: "auto_retry_end",
                                        success: true,
                                        attempt: this._retryAttempt,
                                    });
                                    this._retryAttempt = 0;
                                    this._resolveRetry();
                                }
                            }
                        }
                        if (!(event.type === "agent_end" && this._lastAssistantMessage)) return [3 /*break*/, 5];
                        msg = this._lastAssistantMessage;
                        this._lastAssistantMessage = undefined;
                        if (!this._isRetryableError(msg)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._handleRetryableError(msg)];
                    case 2:
                        didRetry = _a.sent();
                        if (didRetry)
                            return [2 /*return*/]; // Retry was initiated, don't proceed to compaction
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this._checkCompaction(msg)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /** Resolve the pending retry promise */
    AgentSession.prototype._resolveRetry = function () {
        if (this._retryResolve) {
            this._retryResolve();
            this._retryResolve = undefined;
            this._retryPromise = undefined;
        }
    };
    /** Extract text content from a message */
    AgentSession.prototype._getUserMessageText = function (message) {
        if (message.role !== "user")
            return "";
        var content = message.content;
        if (typeof content === "string")
            return content;
        var textBlocks = content.filter(function (c) { return c.type === "text"; });
        return textBlocks.map(function (c) { return c.text; }).join("");
    };
    /** Find the last assistant message in agent state (including aborted ones) */
    AgentSession.prototype._findLastAssistantMessage = function () {
        var messages = this.agent.state.messages;
        for (var i = messages.length - 1; i >= 0; i--) {
            var msg = messages[i];
            if (msg.role === "assistant") {
                return msg;
            }
        }
        return undefined;
    };
    /** Emit extension events based on agent events */
    AgentSession.prototype._emitExtensionEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var extensionEvent, extensionEvent, extensionEvent, extensionEvent, extensionEvent, extensionEvent, extensionEvent, extensionEvent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._extensionRunner)
                            return [2 /*return*/];
                        if (!(event.type === "agent_start")) return [3 /*break*/, 2];
                        this._turnIndex = 0;
                        return [4 /*yield*/, this._extensionRunner.emit({ type: "agent_start" })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 2:
                        if (!(event.type === "agent_end")) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._extensionRunner.emit({ type: "agent_end", messages: event.messages })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 4:
                        if (!(event.type === "turn_start")) return [3 /*break*/, 6];
                        extensionEvent = {
                            type: "turn_start",
                            turnIndex: this._turnIndex,
                            timestamp: Date.now(),
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 6:
                        if (!(event.type === "turn_end")) return [3 /*break*/, 8];
                        extensionEvent = {
                            type: "turn_end",
                            turnIndex: this._turnIndex,
                            message: event.message,
                            toolResults: event.toolResults,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 7:
                        _a.sent();
                        this._turnIndex++;
                        return [3 /*break*/, 20];
                    case 8:
                        if (!(event.type === "message_start")) return [3 /*break*/, 10];
                        extensionEvent = {
                            type: "message_start",
                            message: event.message,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 10:
                        if (!(event.type === "message_update")) return [3 /*break*/, 12];
                        extensionEvent = {
                            type: "message_update",
                            message: event.message,
                            assistantMessageEvent: event.assistantMessageEvent,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 12:
                        if (!(event.type === "message_end")) return [3 /*break*/, 14];
                        extensionEvent = {
                            type: "message_end",
                            message: event.message,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 14:
                        if (!(event.type === "tool_execution_start")) return [3 /*break*/, 16];
                        extensionEvent = {
                            type: "tool_execution_start",
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                            args: event.args,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 15:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 16:
                        if (!(event.type === "tool_execution_update")) return [3 /*break*/, 18];
                        extensionEvent = {
                            type: "tool_execution_update",
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                            args: event.args,
                            partialResult: event.partialResult,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 17:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 18:
                        if (!(event.type === "tool_execution_end")) return [3 /*break*/, 20];
                        extensionEvent = {
                            type: "tool_execution_end",
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                            result: event.result,
                            isError: event.isError,
                        };
                        return [4 /*yield*/, this._extensionRunner.emit(extensionEvent)];
                    case 19:
                        _a.sent();
                        _a.label = 20;
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Subscribe to agent events.
     * Session persistence is handled internally (saves messages on message_end).
     * Multiple listeners can be added. Returns unsubscribe function for this listener.
     */
    AgentSession.prototype.subscribe = function (listener) {
        var _this = this;
        this._eventListeners.push(listener);
        // Return unsubscribe function for this specific listener
        return function () {
            var index = _this._eventListeners.indexOf(listener);
            if (index !== -1) {
                _this._eventListeners.splice(index, 1);
            }
        };
    };
    /**
     * Temporarily disconnect from agent events.
     * User listeners are preserved and will receive events again after resubscribe().
     * Used internally during operations that need to pause event processing.
     */
    AgentSession.prototype._disconnectFromAgent = function () {
        if (this._unsubscribeAgent) {
            this._unsubscribeAgent();
            this._unsubscribeAgent = undefined;
        }
    };
    /**
     * Reconnect to agent events after _disconnectFromAgent().
     * Preserves all existing listeners.
     */
    AgentSession.prototype._reconnectToAgent = function () {
        if (this._unsubscribeAgent)
            return; // Already connected
        this._unsubscribeAgent = this.agent.subscribe(this._handleAgentEvent);
    };
    /**
     * Remove all listeners and disconnect from agent.
     * Call this when completely done with the session.
     */
    AgentSession.prototype.dispose = function () {
        this._disconnectFromAgent();
        this._eventListeners = [];
    };
    Object.defineProperty(AgentSession.prototype, "state", {
        // =========================================================================
        // Read-only State Access
        // =========================================================================
        /** Full agent state */
        get: function () {
            return this.agent.state;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "model", {
        /** Current model (may be undefined if not yet selected) */
        get: function () {
            return this.agent.state.model;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "thinkingLevel", {
        /** Current thinking level */
        get: function () {
            return this.agent.state.thinkingLevel;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "isStreaming", {
        /** Whether agent is currently streaming a response */
        get: function () {
            return this.agent.state.isStreaming;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "systemPrompt", {
        /** Current effective system prompt (includes any per-turn extension modifications) */
        get: function () {
            return this.agent.state.systemPrompt;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "retryAttempt", {
        /** Current retry attempt (0 if not retrying) */
        get: function () {
            return this._retryAttempt;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get the names of currently active tools.
     * Returns the names of tools currently set on the agent.
     */
    AgentSession.prototype.getActiveToolNames = function () {
        return this.agent.state.tools.map(function (t) { return t.name; });
    };
    /**
     * Get all configured tools with name, description, and parameter schema.
     */
    AgentSession.prototype.getAllTools = function () {
        return Array.from(this._toolRegistry.values()).map(function (t) { return ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        }); });
    };
    /**
     * Set active tools by name.
     * Only tools in the registry can be enabled. Unknown tool names are ignored.
     * Also rebuilds the system prompt to reflect the new tool set.
     * Changes take effect on the next agent turn.
     */
    AgentSession.prototype.setActiveToolsByName = function (toolNames) {
        var tools = [];
        var validToolNames = [];
        for (var _i = 0, toolNames_1 = toolNames; _i < toolNames_1.length; _i++) {
            var name_1 = toolNames_1[_i];
            var tool = this._toolRegistry.get(name_1);
            if (tool) {
                tools.push(tool);
                validToolNames.push(name_1);
            }
        }
        this.agent.setTools(tools);
        // Rebuild base system prompt with new tool set
        this._baseSystemPrompt = this._rebuildSystemPrompt(validToolNames);
        this.agent.setSystemPrompt(this._baseSystemPrompt);
    };
    Object.defineProperty(AgentSession.prototype, "isCompacting", {
        /** Whether compaction or branch summarization is currently running */
        get: function () {
            return (this._autoCompactionAbortController !== undefined ||
                this._compactionAbortController !== undefined ||
                this._branchSummaryAbortController !== undefined);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "messages", {
        /** All messages including custom types like BashExecutionMessage */
        get: function () {
            return this.agent.state.messages;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "steeringMode", {
        /** Current steering mode */
        get: function () {
            return this.agent.getSteeringMode();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "followUpMode", {
        /** Current follow-up mode */
        get: function () {
            return this.agent.getFollowUpMode();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "sessionFile", {
        /** Current session file path, or undefined if sessions are disabled */
        get: function () {
            return this.sessionManager.getSessionFile();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "sessionId", {
        /** Current session ID */
        get: function () {
            return this.sessionManager.getSessionId();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "sessionName", {
        /** Current session display name, if set */
        get: function () {
            return this.sessionManager.getSessionName();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "scopedModels", {
        /** Scoped models for cycling (from --models flag) */
        get: function () {
            return this._scopedModels;
        },
        enumerable: false,
        configurable: true
    });
    /** Update scoped models for cycling */
    AgentSession.prototype.setScopedModels = function (scopedModels) {
        this._scopedModels = scopedModels;
    };
    Object.defineProperty(AgentSession.prototype, "promptTemplates", {
        /** File-based prompt templates */
        get: function () {
            return this._resourceLoader.getPrompts().prompts;
        },
        enumerable: false,
        configurable: true
    });
    AgentSession.prototype._normalizePromptSnippet = function (text) {
        if (!text)
            return undefined;
        var oneLine = text
            .replace(/[\r\n]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return oneLine.length > 0 ? oneLine : undefined;
    };
    AgentSession.prototype._normalizePromptGuidelines = function (guidelines) {
        if (!guidelines || guidelines.length === 0) {
            return [];
        }
        var unique = new Set();
        for (var _i = 0, guidelines_1 = guidelines; _i < guidelines_1.length; _i++) {
            var guideline = guidelines_1[_i];
            var normalized = guideline.trim();
            if (normalized.length > 0) {
                unique.add(normalized);
            }
        }
        return Array.from(unique);
    };
    AgentSession.prototype._rebuildSystemPrompt = function (toolNames) {
        var _this = this;
        var validToolNames = toolNames.filter(function (name) { return _this._toolRegistry.has(name); });
        var toolSnippets = {};
        var promptGuidelines = [];
        for (var _i = 0, validToolNames_1 = validToolNames; _i < validToolNames_1.length; _i++) {
            var name_2 = validToolNames_1[_i];
            var snippet = this._toolPromptSnippets.get(name_2);
            if (snippet) {
                toolSnippets[name_2] = snippet;
            }
            var toolGuidelines = this._toolPromptGuidelines.get(name_2);
            if (toolGuidelines) {
                promptGuidelines.push.apply(promptGuidelines, toolGuidelines);
            }
        }
        var loaderSystemPrompt = this._resourceLoader.getSystemPrompt();
        var loaderAppendSystemPrompt = this._resourceLoader.getAppendSystemPrompt();
        var appendSystemPrompt = loaderAppendSystemPrompt.length > 0 ? loaderAppendSystemPrompt.join("\n\n") : undefined;
        var loadedSkills = this._resourceLoader.getSkills().skills;
        var loadedContextFiles = this._resourceLoader.getAgentsFiles().agentsFiles;
        return (0, system_prompt_js_1.buildSystemPrompt)({
            cwd: this._cwd,
            skills: loadedSkills,
            contextFiles: loadedContextFiles,
            customPrompt: loaderSystemPrompt,
            appendSystemPrompt: appendSystemPrompt,
            selectedTools: validToolNames,
            toolSnippets: toolSnippets,
            promptGuidelines: promptGuidelines,
        });
    };
    // =========================================================================
    // Prompting
    // =========================================================================
    /**
     * Send a prompt to the agent.
     * - Handles extension commands (registered via pi.registerCommand) immediately, even during streaming
     * - Expands file-based prompt templates by default
     * - During streaming, queues via steer() or followUp() based on streamingBehavior option
     * - Validates model and API key before sending (when not streaming)
     * @throws Error if streaming and no streamingBehavior specified
     * @throws Error if no model selected or no API key available (when not streaming)
     */
    AgentSession.prototype.prompt = function (text, options) {
        return __awaiter(this, void 0, void 0, function () {
            var expandPromptTemplates, handled, currentText, currentImages, inputResult, expandedText, apiKey, isOAuth, lastAssistant, messages, userContent, _i, _a, msg, result, _b, _c, msg;
            var _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        expandPromptTemplates = (_d = options === null || options === void 0 ? void 0 : options.expandPromptTemplates) !== null && _d !== void 0 ? _d : true;
                        if (!(expandPromptTemplates && text.startsWith("/"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._tryExecuteExtensionCommand(text)];
                    case 1:
                        handled = _h.sent();
                        if (handled) {
                            // Extension command executed, no prompt to send
                            return [2 /*return*/];
                        }
                        _h.label = 2;
                    case 2:
                        currentText = text;
                        currentImages = options === null || options === void 0 ? void 0 : options.images;
                        if (!((_e = this._extensionRunner) === null || _e === void 0 ? void 0 : _e.hasHandlers("input"))) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._extensionRunner.emitInput(currentText, currentImages, (_f = options === null || options === void 0 ? void 0 : options.source) !== null && _f !== void 0 ? _f : "interactive")];
                    case 3:
                        inputResult = _h.sent();
                        if (inputResult.action === "handled") {
                            return [2 /*return*/];
                        }
                        if (inputResult.action === "transform") {
                            currentText = inputResult.text;
                            currentImages = (_g = inputResult.images) !== null && _g !== void 0 ? _g : currentImages;
                        }
                        _h.label = 4;
                    case 4:
                        expandedText = currentText;
                        if (expandPromptTemplates) {
                            expandedText = this._expandSkillCommand(expandedText);
                            expandedText = (0, prompt_templates_js_1.expandPromptTemplate)(expandedText, __spreadArray([], this.promptTemplates, true));
                        }
                        if (!this.isStreaming) return [3 /*break*/, 9];
                        if (!(options === null || options === void 0 ? void 0 : options.streamingBehavior)) {
                            throw new Error("Agent is already processing. Specify streamingBehavior ('steer' or 'followUp') to queue the message.");
                        }
                        if (!(options.streamingBehavior === "followUp")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this._queueFollowUp(expandedText, currentImages)];
                    case 5:
                        _h.sent();
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, this._queueSteer(expandedText, currentImages)];
                    case 7:
                        _h.sent();
                        _h.label = 8;
                    case 8: return [2 /*return*/];
                    case 9:
                        // Flush any pending bash messages before the new prompt
                        this._flushPendingBashMessages();
                        // Validate model
                        if (!this.model) {
                            throw new Error("No model selected.\n\n" +
                                "Use /login or set an API key environment variable. See ".concat((0, node_path_1.join)((0, config_js_1.getDocsPath)(), "providers.md"), "\n\n") +
                                "Then use /model to select a model.");
                        }
                        return [4 /*yield*/, this._modelRegistry.getApiKey(this.model)];
                    case 10:
                        apiKey = _h.sent();
                        if (!apiKey) {
                            isOAuth = this._modelRegistry.isUsingOAuth(this.model);
                            if (isOAuth) {
                                throw new Error("Authentication failed for \"".concat(this.model.provider, "\". ") +
                                    "Credentials may have expired or network is unavailable. " +
                                    "Run '/login ".concat(this.model.provider, "' to re-authenticate."));
                            }
                            throw new Error("No API key found for ".concat(this.model.provider, ".\n\n") +
                                "Use /login or set an API key environment variable. See ".concat((0, node_path_1.join)((0, config_js_1.getDocsPath)(), "providers.md")));
                        }
                        lastAssistant = this._findLastAssistantMessage();
                        if (!lastAssistant) return [3 /*break*/, 12];
                        return [4 /*yield*/, this._checkCompaction(lastAssistant, false)];
                    case 11:
                        _h.sent();
                        _h.label = 12;
                    case 12:
                        messages = [];
                        userContent = [{ type: "text", text: expandedText }];
                        if (currentImages) {
                            userContent.push.apply(userContent, currentImages);
                        }
                        messages.push({
                            role: "user",
                            content: userContent,
                            timestamp: Date.now(),
                        });
                        // Inject any pending "nextTurn" messages as context alongside the user message
                        for (_i = 0, _a = this._pendingNextTurnMessages; _i < _a.length; _i++) {
                            msg = _a[_i];
                            messages.push(msg);
                        }
                        this._pendingNextTurnMessages = [];
                        if (!this._extensionRunner) return [3 /*break*/, 14];
                        return [4 /*yield*/, this._extensionRunner.emitBeforeAgentStart(expandedText, currentImages, this._baseSystemPrompt)];
                    case 13:
                        result = _h.sent();
                        // Add all custom messages from extensions
                        if (result === null || result === void 0 ? void 0 : result.messages) {
                            for (_b = 0, _c = result.messages; _b < _c.length; _b++) {
                                msg = _c[_b];
                                messages.push({
                                    role: "custom",
                                    customType: msg.customType,
                                    content: msg.content,
                                    display: msg.display,
                                    details: msg.details,
                                    timestamp: Date.now(),
                                });
                            }
                        }
                        // Apply extension-modified system prompt, or reset to base
                        if (result === null || result === void 0 ? void 0 : result.systemPrompt) {
                            this.agent.setSystemPrompt(result.systemPrompt);
                        }
                        else {
                            // Ensure we're using the base prompt (in case previous turn had modifications)
                            this.agent.setSystemPrompt(this._baseSystemPrompt);
                        }
                        _h.label = 14;
                    case 14: return [4 /*yield*/, this.agent.prompt(messages)];
                    case 15:
                        _h.sent();
                        return [4 /*yield*/, this.waitForRetry()];
                    case 16:
                        _h.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Try to execute an extension command. Returns true if command was found and executed.
     */
    AgentSession.prototype._tryExecuteExtensionCommand = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var spaceIndex, commandName, args, command, ctx, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._extensionRunner)
                            return [2 /*return*/, false];
                        spaceIndex = text.indexOf(" ");
                        commandName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
                        args = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1);
                        command = this._extensionRunner.getCommand(commandName);
                        if (!command)
                            return [2 /*return*/, false];
                        ctx = this._extensionRunner.createCommandContext();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, command.handler(args, ctx)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        err_2 = _a.sent();
                        // Emit error via extension runner
                        this._extensionRunner.emitError({
                            extensionPath: "command:".concat(commandName),
                            event: "command",
                            error: err_2 instanceof Error ? err_2.message : String(err_2),
                        });
                        return [2 /*return*/, true];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Expand skill commands (/skill:name args) to their full content.
     * Returns the expanded text, or the original text if not a skill command or skill not found.
     * Emits errors via extension runner if file read fails.
     */
    AgentSession.prototype._expandSkillCommand = function (text) {
        var _a;
        if (!text.startsWith("/skill:"))
            return text;
        var spaceIndex = text.indexOf(" ");
        var skillName = spaceIndex === -1 ? text.slice(7) : text.slice(7, spaceIndex);
        var args = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1).trim();
        var skill = this.resourceLoader.getSkills().skills.find(function (s) { return s.name === skillName; });
        if (!skill)
            return text; // Unknown skill, pass through
        try {
            var content = (0, node_fs_1.readFileSync)(skill.filePath, "utf-8");
            var body = (0, frontmatter_js_1.stripFrontmatter)(content).trim();
            var skillBlock = "<skill name=\"".concat(skill.name, "\" location=\"").concat(skill.filePath, "\">\nReferences are relative to ").concat(skill.baseDir, ".\n\n").concat(body, "\n</skill>");
            return args ? "".concat(skillBlock, "\n\n").concat(args) : skillBlock;
        }
        catch (err) {
            // Emit error like extension commands do
            (_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.emitError({
                extensionPath: skill.filePath,
                event: "skill_expansion",
                error: err instanceof Error ? err.message : String(err),
            });
            return text; // Return original on error
        }
    };
    /**
     * Queue a steering message to interrupt the agent mid-run.
     * Delivered after current tool execution, skips remaining tools.
     * Expands skill commands and prompt templates. Errors on extension commands.
     * @param images Optional image attachments to include with the message
     * @throws Error if text is an extension command
     */
    AgentSession.prototype.steer = function (text, images) {
        return __awaiter(this, void 0, void 0, function () {
            var expandedText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Check for extension commands (cannot be queued)
                        if (text.startsWith("/")) {
                            this._throwIfExtensionCommand(text);
                        }
                        expandedText = this._expandSkillCommand(text);
                        expandedText = (0, prompt_templates_js_1.expandPromptTemplate)(expandedText, __spreadArray([], this.promptTemplates, true));
                        return [4 /*yield*/, this._queueSteer(expandedText, images)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Queue a follow-up message to be processed after the agent finishes.
     * Delivered only when agent has no more tool calls or steering messages.
     * Expands skill commands and prompt templates. Errors on extension commands.
     * @param images Optional image attachments to include with the message
     * @throws Error if text is an extension command
     */
    AgentSession.prototype.followUp = function (text, images) {
        return __awaiter(this, void 0, void 0, function () {
            var expandedText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Check for extension commands (cannot be queued)
                        if (text.startsWith("/")) {
                            this._throwIfExtensionCommand(text);
                        }
                        expandedText = this._expandSkillCommand(text);
                        expandedText = (0, prompt_templates_js_1.expandPromptTemplate)(expandedText, __spreadArray([], this.promptTemplates, true));
                        return [4 /*yield*/, this._queueFollowUp(expandedText, images)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Internal: Queue a steering message (already expanded, no extension command check).
     */
    AgentSession.prototype._queueSteer = function (text, images) {
        return __awaiter(this, void 0, void 0, function () {
            var content;
            return __generator(this, function (_a) {
                this._steeringMessages.push(text);
                content = [{ type: "text", text: text }];
                if (images) {
                    content.push.apply(content, images);
                }
                this.agent.steer({
                    role: "user",
                    content: content,
                    timestamp: Date.now(),
                });
                return [2 /*return*/];
            });
        });
    };
    /**
     * Internal: Queue a follow-up message (already expanded, no extension command check).
     */
    AgentSession.prototype._queueFollowUp = function (text, images) {
        return __awaiter(this, void 0, void 0, function () {
            var content;
            return __generator(this, function (_a) {
                this._followUpMessages.push(text);
                content = [{ type: "text", text: text }];
                if (images) {
                    content.push.apply(content, images);
                }
                this.agent.followUp({
                    role: "user",
                    content: content,
                    timestamp: Date.now(),
                });
                return [2 /*return*/];
            });
        });
    };
    /**
     * Throw an error if the text is an extension command.
     */
    AgentSession.prototype._throwIfExtensionCommand = function (text) {
        if (!this._extensionRunner)
            return;
        var spaceIndex = text.indexOf(" ");
        var commandName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
        var command = this._extensionRunner.getCommand(commandName);
        if (command) {
            throw new Error("Extension command \"/".concat(commandName, "\" cannot be queued. Use prompt() or execute the command when not streaming."));
        }
    };
    /**
     * Send a custom message to the session. Creates a CustomMessageEntry.
     *
     * Handles three cases:
     * - Streaming: queues message, processed when loop pulls from queue
     * - Not streaming + triggerTurn: appends to state/session, starts new turn
     * - Not streaming + no trigger: appends to state/session, no turn
     *
     * @param message Custom message with customType, content, display, details
     * @param options.triggerTurn If true and not streaming, triggers a new LLM turn
     * @param options.deliverAs Delivery mode: "steer", "followUp", or "nextTurn"
     */
    AgentSession.prototype.sendCustomMessage = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            var appMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        appMessage = {
                            role: "custom",
                            customType: message.customType,
                            content: message.content,
                            display: message.display,
                            details: message.details,
                            timestamp: Date.now(),
                        };
                        if (!((options === null || options === void 0 ? void 0 : options.deliverAs) === "nextTurn")) return [3 /*break*/, 1];
                        this._pendingNextTurnMessages.push(appMessage);
                        return [3 /*break*/, 5];
                    case 1:
                        if (!this.isStreaming) return [3 /*break*/, 2];
                        if ((options === null || options === void 0 ? void 0 : options.deliverAs) === "followUp") {
                            this.agent.followUp(appMessage);
                        }
                        else {
                            this.agent.steer(appMessage);
                        }
                        return [3 /*break*/, 5];
                    case 2:
                        if (!(options === null || options === void 0 ? void 0 : options.triggerTurn)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.agent.prompt(appMessage)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        this.agent.appendMessage(appMessage);
                        this.sessionManager.appendCustomMessageEntry(message.customType, message.content, message.display, message.details);
                        this._emit({ type: "message_start", message: appMessage });
                        this._emit({ type: "message_end", message: appMessage });
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send a user message to the agent. Always triggers a turn.
     * When the agent is streaming, use deliverAs to specify how to queue the message.
     *
     * @param content User message content (string or content array)
     * @param options.deliverAs Delivery mode when streaming: "steer" or "followUp"
     */
    AgentSession.prototype.sendUserMessage = function (content, options) {
        return __awaiter(this, void 0, void 0, function () {
            var text, images, textParts, _i, content_1, part;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof content === "string") {
                            text = content;
                        }
                        else {
                            textParts = [];
                            images = [];
                            for (_i = 0, content_1 = content; _i < content_1.length; _i++) {
                                part = content_1[_i];
                                if (part.type === "text") {
                                    textParts.push(part.text);
                                }
                                else {
                                    images.push(part);
                                }
                            }
                            text = textParts.join("\n");
                            if (images.length === 0)
                                images = undefined;
                        }
                        // Use prompt() with expandPromptTemplates: false to skip command handling and template expansion
                        return [4 /*yield*/, this.prompt(text, {
                                expandPromptTemplates: false,
                                streamingBehavior: options === null || options === void 0 ? void 0 : options.deliverAs,
                                images: images,
                                source: "extension",
                            })];
                    case 1:
                        // Use prompt() with expandPromptTemplates: false to skip command handling and template expansion
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clear all queued messages and return them.
     * Useful for restoring to editor when user aborts.
     * @returns Object with steering and followUp arrays
     */
    AgentSession.prototype.clearQueue = function () {
        var steering = __spreadArray([], this._steeringMessages, true);
        var followUp = __spreadArray([], this._followUpMessages, true);
        this._steeringMessages = [];
        this._followUpMessages = [];
        this.agent.clearAllQueues();
        return { steering: steering, followUp: followUp };
    };
    Object.defineProperty(AgentSession.prototype, "pendingMessageCount", {
        /** Number of pending messages (includes both steering and follow-up) */
        get: function () {
            return this._steeringMessages.length + this._followUpMessages.length;
        },
        enumerable: false,
        configurable: true
    });
    /** Get pending steering messages (read-only) */
    AgentSession.prototype.getSteeringMessages = function () {
        return this._steeringMessages;
    };
    /** Get pending follow-up messages (read-only) */
    AgentSession.prototype.getFollowUpMessages = function () {
        return this._followUpMessages;
    };
    Object.defineProperty(AgentSession.prototype, "resourceLoader", {
        get: function () {
            return this._resourceLoader;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Abort current operation and wait for agent to become idle.
     */
    AgentSession.prototype.abort = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.abortRetry();
                        this.agent.abort();
                        return [4 /*yield*/, this.agent.waitForIdle()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start a new session, optionally with initial messages and parent tracking.
     * Clears all messages and starts a new session.
     * Listeners are preserved and will continue receiving events.
     * @param options.parentSession - Optional parent session path for tracking
     * @param options.setup - Optional callback to initialize session (e.g., append messages)
     * @returns true if completed, false if cancelled by extension
     */
    AgentSession.prototype.newSession = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var previousSessionFile, result, sessionContext;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        previousSessionFile = this.sessionFile;
                        if (!((_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers("session_before_switch"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_switch",
                                reason: "new",
                            })];
                    case 1:
                        result = (_b.sent());
                        if (result === null || result === void 0 ? void 0 : result.cancel) {
                            return [2 /*return*/, false];
                        }
                        _b.label = 2;
                    case 2:
                        this._disconnectFromAgent();
                        return [4 /*yield*/, this.abort()];
                    case 3:
                        _b.sent();
                        this.agent.reset();
                        this.sessionManager.newSession({ parentSession: options === null || options === void 0 ? void 0 : options.parentSession });
                        this.agent.sessionId = this.sessionManager.getSessionId();
                        this._steeringMessages = [];
                        this._followUpMessages = [];
                        this._pendingNextTurnMessages = [];
                        this.sessionManager.appendThinkingLevelChange(this.thinkingLevel);
                        if (!(options === null || options === void 0 ? void 0 : options.setup)) return [3 /*break*/, 5];
                        return [4 /*yield*/, options.setup(this.sessionManager)];
                    case 4:
                        _b.sent();
                        sessionContext = this.sessionManager.buildSessionContext();
                        this.agent.replaceMessages(sessionContext.messages);
                        _b.label = 5;
                    case 5:
                        this._reconnectToAgent();
                        if (!this._extensionRunner) return [3 /*break*/, 7];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_switch",
                                reason: "new",
                                previousSessionFile: previousSessionFile,
                            })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: 
                    // Emit session event to custom tools
                    return [2 /*return*/, true];
                }
            });
        });
    };
    // =========================================================================
    // Model Management
    // =========================================================================
    AgentSession.prototype._emitModelSelect = function (nextModel, previousModel, source) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._extensionRunner)
                            return [2 /*return*/];
                        if ((0, pi_ai_1.modelsAreEqual)(previousModel, nextModel))
                            return [2 /*return*/];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "model_select",
                                model: nextModel,
                                previousModel: previousModel,
                                source: source,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set model directly.
     * Validates API key, saves to session and settings.
     * @throws Error if no API key available for the model
     */
    AgentSession.prototype.setModel = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, previousModel, thinkingLevel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._modelRegistry.getApiKey(model)];
                    case 1:
                        apiKey = _a.sent();
                        if (!apiKey) {
                            throw new Error("No API key for ".concat(model.provider, "/").concat(model.id));
                        }
                        previousModel = this.model;
                        thinkingLevel = this._getThinkingLevelForModelSwitch();
                        this.agent.setModel(model);
                        this.sessionManager.appendModelChange(model.provider, model.id);
                        this.settingsManager.setDefaultModelAndProvider(model.provider, model.id);
                        // Re-clamp thinking level for new model's capabilities
                        this.setThinkingLevel(thinkingLevel);
                        return [4 /*yield*/, this._emitModelSelect(model, previousModel, "set")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cycle to next/previous model.
     * Uses scoped models (from --models flag) if available, otherwise all available models.
     * @param direction - "forward" (default) or "backward"
     * @returns The new model info, or undefined if only one model available
     */
    AgentSession.prototype.cycleModel = function () {
        return __awaiter(this, arguments, void 0, function (direction) {
            if (direction === void 0) { direction = "forward"; }
            return __generator(this, function (_a) {
                if (this._scopedModels.length > 0) {
                    return [2 /*return*/, this._cycleScopedModel(direction)];
                }
                return [2 /*return*/, this._cycleAvailableModel(direction)];
            });
        });
    };
    AgentSession.prototype._getScopedModelsWithApiKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiKeysByProvider, result, _i, _a, scoped, provider, apiKey;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        apiKeysByProvider = new Map();
                        result = [];
                        _i = 0, _a = this._scopedModels;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        scoped = _a[_i];
                        provider = scoped.model.provider;
                        apiKey = void 0;
                        if (!apiKeysByProvider.has(provider)) return [3 /*break*/, 2];
                        apiKey = apiKeysByProvider.get(provider);
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this._modelRegistry.getApiKeyForProvider(provider)];
                    case 3:
                        apiKey = _b.sent();
                        apiKeysByProvider.set(provider, apiKey);
                        _b.label = 4;
                    case 4:
                        if (apiKey) {
                            result.push(scoped);
                        }
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, result];
                }
            });
        });
    };
    AgentSession.prototype._cycleScopedModel = function (direction) {
        return __awaiter(this, void 0, void 0, function () {
            var scopedModels, currentModel, currentIndex, len, nextIndex, next, thinkingLevel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getScopedModelsWithApiKey()];
                    case 1:
                        scopedModels = _a.sent();
                        if (scopedModels.length <= 1)
                            return [2 /*return*/, undefined];
                        currentModel = this.model;
                        currentIndex = scopedModels.findIndex(function (sm) { return (0, pi_ai_1.modelsAreEqual)(sm.model, currentModel); });
                        if (currentIndex === -1)
                            currentIndex = 0;
                        len = scopedModels.length;
                        nextIndex = direction === "forward" ? (currentIndex + 1) % len : (currentIndex - 1 + len) % len;
                        next = scopedModels[nextIndex];
                        thinkingLevel = this._getThinkingLevelForModelSwitch(next.thinkingLevel);
                        // Apply model
                        this.agent.setModel(next.model);
                        this.sessionManager.appendModelChange(next.model.provider, next.model.id);
                        this.settingsManager.setDefaultModelAndProvider(next.model.provider, next.model.id);
                        // Apply thinking level.
                        // - Explicit scoped model thinking level overrides current session level
                        // - Undefined scoped model thinking level inherits the current session preference
                        // setThinkingLevel clamps to model capabilities.
                        this.setThinkingLevel(thinkingLevel);
                        return [4 /*yield*/, this._emitModelSelect(next.model, currentModel, "cycle")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { model: next.model, thinkingLevel: this.thinkingLevel, isScoped: true }];
                }
            });
        });
    };
    AgentSession.prototype._cycleAvailableModel = function (direction) {
        return __awaiter(this, void 0, void 0, function () {
            var availableModels, currentModel, currentIndex, len, nextIndex, nextModel, apiKey, thinkingLevel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._modelRegistry.getAvailable()];
                    case 1:
                        availableModels = _a.sent();
                        if (availableModels.length <= 1)
                            return [2 /*return*/, undefined];
                        currentModel = this.model;
                        currentIndex = availableModels.findIndex(function (m) { return (0, pi_ai_1.modelsAreEqual)(m, currentModel); });
                        if (currentIndex === -1)
                            currentIndex = 0;
                        len = availableModels.length;
                        nextIndex = direction === "forward" ? (currentIndex + 1) % len : (currentIndex - 1 + len) % len;
                        nextModel = availableModels[nextIndex];
                        return [4 /*yield*/, this._modelRegistry.getApiKey(nextModel)];
                    case 2:
                        apiKey = _a.sent();
                        if (!apiKey) {
                            throw new Error("No API key for ".concat(nextModel.provider, "/").concat(nextModel.id));
                        }
                        thinkingLevel = this._getThinkingLevelForModelSwitch();
                        this.agent.setModel(nextModel);
                        this.sessionManager.appendModelChange(nextModel.provider, nextModel.id);
                        this.settingsManager.setDefaultModelAndProvider(nextModel.provider, nextModel.id);
                        // Re-clamp thinking level for new model's capabilities
                        this.setThinkingLevel(thinkingLevel);
                        return [4 /*yield*/, this._emitModelSelect(nextModel, currentModel, "cycle")];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { model: nextModel, thinkingLevel: this.thinkingLevel, isScoped: false }];
                }
            });
        });
    };
    // =========================================================================
    // Thinking Level Management
    // =========================================================================
    /**
     * Set thinking level.
     * Clamps to model capabilities based on available thinking levels.
     * Saves to session and settings only if the level actually changes.
     */
    AgentSession.prototype.setThinkingLevel = function (level) {
        var availableLevels = this.getAvailableThinkingLevels();
        var effectiveLevel = availableLevels.includes(level) ? level : this._clampThinkingLevel(level, availableLevels);
        // Only persist if actually changing
        var isChanging = effectiveLevel !== this.agent.state.thinkingLevel;
        this.agent.setThinkingLevel(effectiveLevel);
        if (isChanging) {
            this.sessionManager.appendThinkingLevelChange(effectiveLevel);
            if (this.supportsThinking() || effectiveLevel !== "off") {
                this.settingsManager.setDefaultThinkingLevel(effectiveLevel);
            }
        }
    };
    /**
     * Cycle to next thinking level.
     * @returns New level, or undefined if model doesn't support thinking
     */
    AgentSession.prototype.cycleThinkingLevel = function () {
        if (!this.supportsThinking())
            return undefined;
        var levels = this.getAvailableThinkingLevels();
        var currentIndex = levels.indexOf(this.thinkingLevel);
        var nextIndex = (currentIndex + 1) % levels.length;
        var nextLevel = levels[nextIndex];
        this.setThinkingLevel(nextLevel);
        return nextLevel;
    };
    /**
     * Get available thinking levels for current model.
     * The provider will clamp to what the specific model supports internally.
     */
    AgentSession.prototype.getAvailableThinkingLevels = function () {
        if (!this.supportsThinking())
            return ["off"];
        return this.supportsXhighThinking() ? THINKING_LEVELS_WITH_XHIGH : THINKING_LEVELS;
    };
    /**
     * Check if current model supports xhigh thinking level.
     */
    AgentSession.prototype.supportsXhighThinking = function () {
        return this.model ? (0, pi_ai_1.supportsXhigh)(this.model) : false;
    };
    /**
     * Check if current model supports thinking/reasoning.
     */
    AgentSession.prototype.supportsThinking = function () {
        var _a;
        return !!((_a = this.model) === null || _a === void 0 ? void 0 : _a.reasoning);
    };
    AgentSession.prototype._getThinkingLevelForModelSwitch = function (explicitLevel) {
        var _a;
        if (explicitLevel !== undefined) {
            return explicitLevel;
        }
        if (!this.supportsThinking()) {
            return (_a = this.settingsManager.getDefaultThinkingLevel()) !== null && _a !== void 0 ? _a : defaults_js_1.DEFAULT_THINKING_LEVEL;
        }
        return this.thinkingLevel;
    };
    AgentSession.prototype._clampThinkingLevel = function (level, availableLevels) {
        var _a, _b;
        var ordered = THINKING_LEVELS_WITH_XHIGH;
        var available = new Set(availableLevels);
        var requestedIndex = ordered.indexOf(level);
        if (requestedIndex === -1) {
            return (_a = availableLevels[0]) !== null && _a !== void 0 ? _a : "off";
        }
        for (var i = requestedIndex; i < ordered.length; i++) {
            var candidate = ordered[i];
            if (available.has(candidate))
                return candidate;
        }
        for (var i = requestedIndex - 1; i >= 0; i--) {
            var candidate = ordered[i];
            if (available.has(candidate))
                return candidate;
        }
        return (_b = availableLevels[0]) !== null && _b !== void 0 ? _b : "off";
    };
    // =========================================================================
    // Queue Mode Management
    // =========================================================================
    /**
     * Set steering message mode.
     * Saves to settings.
     */
    AgentSession.prototype.setSteeringMode = function (mode) {
        this.agent.setSteeringMode(mode);
        this.settingsManager.setSteeringMode(mode);
    };
    /**
     * Set follow-up message mode.
     * Saves to settings.
     */
    AgentSession.prototype.setFollowUpMode = function (mode) {
        this.agent.setFollowUpMode(mode);
        this.settingsManager.setFollowUpMode(mode);
    };
    // =========================================================================
    // Compaction
    // =========================================================================
    /**
     * Manually compact the session context.
     * Aborts current agent operation first.
     * @param customInstructions Optional instructions for the compaction summary
     */
    AgentSession.prototype.compact = function (customInstructions) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, pathEntries, settings, preparation, lastEntry, extensionCompaction, fromExtension, result, summary_1, firstKeptEntryId, tokensBefore, details, result, newEntries, sessionContext, savedCompactionEntry;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this._disconnectFromAgent();
                        return [4 /*yield*/, this.abort()];
                    case 1:
                        _b.sent();
                        this._compactionAbortController = new AbortController();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 11, 12]);
                        if (!this.model) {
                            throw new Error("No model selected");
                        }
                        return [4 /*yield*/, this._modelRegistry.getApiKey(this.model)];
                    case 3:
                        apiKey = _b.sent();
                        if (!apiKey) {
                            throw new Error("No API key for ".concat(this.model.provider));
                        }
                        pathEntries = this.sessionManager.getBranch();
                        settings = this.settingsManager.getCompactionSettings();
                        preparation = (0, index_js_1.prepareCompaction)(pathEntries, settings);
                        if (!preparation) {
                            lastEntry = pathEntries[pathEntries.length - 1];
                            if ((lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.type) === "compaction") {
                                throw new Error("Already compacted");
                            }
                            throw new Error("Nothing to compact (session too small)");
                        }
                        extensionCompaction = void 0;
                        fromExtension = false;
                        if (!((_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers("session_before_compact"))) return [3 /*break*/, 5];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_compact",
                                preparation: preparation,
                                branchEntries: pathEntries,
                                customInstructions: customInstructions,
                                signal: this._compactionAbortController.signal,
                            })];
                    case 4:
                        result = (_b.sent());
                        if (result === null || result === void 0 ? void 0 : result.cancel) {
                            throw new Error("Compaction cancelled");
                        }
                        if (result === null || result === void 0 ? void 0 : result.compaction) {
                            extensionCompaction = result.compaction;
                            fromExtension = true;
                        }
                        _b.label = 5;
                    case 5:
                        firstKeptEntryId = void 0;
                        tokensBefore = void 0;
                        details = void 0;
                        if (!extensionCompaction) return [3 /*break*/, 6];
                        // Extension provided compaction content
                        summary_1 = extensionCompaction.summary;
                        firstKeptEntryId = extensionCompaction.firstKeptEntryId;
                        tokensBefore = extensionCompaction.tokensBefore;
                        details = extensionCompaction.details;
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, (0, index_js_1.compact)(preparation, this.model, apiKey, customInstructions, this._compactionAbortController.signal)];
                    case 7:
                        result = _b.sent();
                        summary_1 = result.summary;
                        firstKeptEntryId = result.firstKeptEntryId;
                        tokensBefore = result.tokensBefore;
                        details = result.details;
                        _b.label = 8;
                    case 8:
                        if (this._compactionAbortController.signal.aborted) {
                            throw new Error("Compaction cancelled");
                        }
                        this.sessionManager.appendCompaction(summary_1, firstKeptEntryId, tokensBefore, details, fromExtension);
                        newEntries = this.sessionManager.getEntries();
                        sessionContext = this.sessionManager.buildSessionContext();
                        this.agent.replaceMessages(sessionContext.messages);
                        savedCompactionEntry = newEntries.find(function (e) { return e.type === "compaction" && e.summary === summary_1; });
                        if (!(this._extensionRunner && savedCompactionEntry)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_compact",
                                compactionEntry: savedCompactionEntry,
                                fromExtension: fromExtension,
                            })];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10: return [2 /*return*/, {
                            summary: summary_1,
                            firstKeptEntryId: firstKeptEntryId,
                            tokensBefore: tokensBefore,
                            details: details,
                        }];
                    case 11:
                        this._compactionAbortController = undefined;
                        this._reconnectToAgent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel in-progress compaction (manual or auto).
     */
    AgentSession.prototype.abortCompaction = function () {
        var _a, _b;
        (_a = this._compactionAbortController) === null || _a === void 0 ? void 0 : _a.abort();
        (_b = this._autoCompactionAbortController) === null || _b === void 0 ? void 0 : _b.abort();
    };
    /**
     * Cancel in-progress branch summarization.
     */
    AgentSession.prototype.abortBranchSummary = function () {
        var _a;
        (_a = this._branchSummaryAbortController) === null || _a === void 0 ? void 0 : _a.abort();
    };
    /**
     * Check if compaction is needed and run it.
     * Called after agent_end and before prompt submission.
     *
     * Two cases:
     * 1. Overflow: LLM returned context overflow error, remove error message from agent state, compact, auto-retry
     * 2. Threshold: Context over threshold, compact, NO auto-retry (user continues manually)
     *
     * @param assistantMessage The assistant message to check
     * @param skipAbortedCheck If false, include aborted messages (for pre-prompt check). Default: true
     */
    AgentSession.prototype._checkCompaction = function (assistantMessage_1) {
        return __awaiter(this, arguments, void 0, function (assistantMessage, skipAbortedCheck) {
            var settings, contextWindow, sameModel, compactionEntry, assistantIsFromBeforeCompaction, messages, contextTokens, messages, estimate, usageMsg;
            var _a, _b;
            if (skipAbortedCheck === void 0) { skipAbortedCheck = true; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        settings = this.settingsManager.getCompactionSettings();
                        if (!settings.enabled)
                            return [2 /*return*/];
                        // Skip if message was aborted (user cancelled) - unless skipAbortedCheck is false
                        if (skipAbortedCheck && assistantMessage.stopReason === "aborted")
                            return [2 /*return*/];
                        contextWindow = (_b = (_a = this.model) === null || _a === void 0 ? void 0 : _a.contextWindow) !== null && _b !== void 0 ? _b : 0;
                        sameModel = this.model && assistantMessage.provider === this.model.provider && assistantMessage.model === this.model.id;
                        compactionEntry = (0, session_manager_js_1.getLatestCompactionEntry)(this.sessionManager.getBranch());
                        assistantIsFromBeforeCompaction = compactionEntry !== null && assistantMessage.timestamp <= new Date(compactionEntry.timestamp).getTime();
                        if (assistantIsFromBeforeCompaction) {
                            return [2 /*return*/];
                        }
                        if (!(sameModel && (0, pi_ai_1.isContextOverflow)(assistantMessage, contextWindow))) return [3 /*break*/, 2];
                        if (this._overflowRecoveryAttempted) {
                            this._emit({
                                type: "auto_compaction_end",
                                result: undefined,
                                aborted: false,
                                willRetry: false,
                                errorMessage: "Context overflow recovery failed after one compact-and-retry attempt. Try reducing context or switching to a larger-context model.",
                            });
                            return [2 /*return*/];
                        }
                        this._overflowRecoveryAttempted = true;
                        messages = this.agent.state.messages;
                        if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
                            this.agent.replaceMessages(messages.slice(0, -1));
                        }
                        return [4 /*yield*/, this._runAutoCompaction("overflow", true)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                    case 2:
                        if (assistantMessage.stopReason === "error") {
                            messages = this.agent.state.messages;
                            estimate = (0, index_js_1.estimateContextTokens)(messages);
                            if (estimate.lastUsageIndex === null)
                                return [2 /*return*/]; // No usage data at all
                            usageMsg = messages[estimate.lastUsageIndex];
                            if (compactionEntry &&
                                usageMsg.role === "assistant" &&
                                usageMsg.timestamp <= new Date(compactionEntry.timestamp).getTime()) {
                                return [2 /*return*/];
                            }
                            contextTokens = estimate.tokens;
                        }
                        else {
                            contextTokens = (0, index_js_1.calculateContextTokens)(assistantMessage.usage);
                        }
                        if (!(0, index_js_1.shouldCompact)(contextTokens, contextWindow, settings)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._runAutoCompaction("threshold", false)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Internal: Run auto-compaction with events.
     */
    AgentSession.prototype._runAutoCompaction = function (reason, willRetry) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, apiKey, pathEntries, preparation, extensionCompaction, fromExtension, extensionResult, summary_2, firstKeptEntryId, tokensBefore, details, compactResult, newEntries, sessionContext, savedCompactionEntry, result, messages, lastMsg, error_1, errorMessage;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        settings = this.settingsManager.getCompactionSettings();
                        this._emit({ type: "auto_compaction_start", reason: reason });
                        this._autoCompactionAbortController = new AbortController();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, 11, 12]);
                        if (!this.model) {
                            this._emit({ type: "auto_compaction_end", result: undefined, aborted: false, willRetry: false });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this._modelRegistry.getApiKey(this.model)];
                    case 2:
                        apiKey = _b.sent();
                        if (!apiKey) {
                            this._emit({ type: "auto_compaction_end", result: undefined, aborted: false, willRetry: false });
                            return [2 /*return*/];
                        }
                        pathEntries = this.sessionManager.getBranch();
                        preparation = (0, index_js_1.prepareCompaction)(pathEntries, settings);
                        if (!preparation) {
                            this._emit({ type: "auto_compaction_end", result: undefined, aborted: false, willRetry: false });
                            return [2 /*return*/];
                        }
                        extensionCompaction = void 0;
                        fromExtension = false;
                        if (!((_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers("session_before_compact"))) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_compact",
                                preparation: preparation,
                                branchEntries: pathEntries,
                                customInstructions: undefined,
                                signal: this._autoCompactionAbortController.signal,
                            })];
                    case 3:
                        extensionResult = (_b.sent());
                        if (extensionResult === null || extensionResult === void 0 ? void 0 : extensionResult.cancel) {
                            this._emit({ type: "auto_compaction_end", result: undefined, aborted: true, willRetry: false });
                            return [2 /*return*/];
                        }
                        if (extensionResult === null || extensionResult === void 0 ? void 0 : extensionResult.compaction) {
                            extensionCompaction = extensionResult.compaction;
                            fromExtension = true;
                        }
                        _b.label = 4;
                    case 4:
                        firstKeptEntryId = void 0;
                        tokensBefore = void 0;
                        details = void 0;
                        if (!extensionCompaction) return [3 /*break*/, 5];
                        // Extension provided compaction content
                        summary_2 = extensionCompaction.summary;
                        firstKeptEntryId = extensionCompaction.firstKeptEntryId;
                        tokensBefore = extensionCompaction.tokensBefore;
                        details = extensionCompaction.details;
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, (0, index_js_1.compact)(preparation, this.model, apiKey, undefined, this._autoCompactionAbortController.signal)];
                    case 6:
                        compactResult = _b.sent();
                        summary_2 = compactResult.summary;
                        firstKeptEntryId = compactResult.firstKeptEntryId;
                        tokensBefore = compactResult.tokensBefore;
                        details = compactResult.details;
                        _b.label = 7;
                    case 7:
                        if (this._autoCompactionAbortController.signal.aborted) {
                            this._emit({ type: "auto_compaction_end", result: undefined, aborted: true, willRetry: false });
                            return [2 /*return*/];
                        }
                        this.sessionManager.appendCompaction(summary_2, firstKeptEntryId, tokensBefore, details, fromExtension);
                        newEntries = this.sessionManager.getEntries();
                        sessionContext = this.sessionManager.buildSessionContext();
                        this.agent.replaceMessages(sessionContext.messages);
                        savedCompactionEntry = newEntries.find(function (e) { return e.type === "compaction" && e.summary === summary_2; });
                        if (!(this._extensionRunner && savedCompactionEntry)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_compact",
                                compactionEntry: savedCompactionEntry,
                                fromExtension: fromExtension,
                            })];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9:
                        result = {
                            summary: summary_2,
                            firstKeptEntryId: firstKeptEntryId,
                            tokensBefore: tokensBefore,
                            details: details,
                        };
                        this._emit({ type: "auto_compaction_end", result: result, aborted: false, willRetry: willRetry });
                        if (willRetry) {
                            messages = this.agent.state.messages;
                            lastMsg = messages[messages.length - 1];
                            if ((lastMsg === null || lastMsg === void 0 ? void 0 : lastMsg.role) === "assistant" && lastMsg.stopReason === "error") {
                                this.agent.replaceMessages(messages.slice(0, -1));
                            }
                            setTimeout(function () {
                                _this.agent.continue().catch(function () { });
                            }, 100);
                        }
                        else if (this.agent.hasQueuedMessages()) {
                            // Auto-compaction can complete while follow-up/steering/custom messages are waiting.
                            // Kick the loop so queued messages are actually delivered.
                            setTimeout(function () {
                                _this.agent.continue().catch(function () { });
                            }, 100);
                        }
                        return [3 /*break*/, 12];
                    case 10:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : "compaction failed";
                        this._emit({
                            type: "auto_compaction_end",
                            result: undefined,
                            aborted: false,
                            willRetry: false,
                            errorMessage: reason === "overflow"
                                ? "Context overflow recovery failed: ".concat(errorMessage)
                                : "Auto-compaction failed: ".concat(errorMessage),
                        });
                        return [3 /*break*/, 12];
                    case 11:
                        this._autoCompactionAbortController = undefined;
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Toggle auto-compaction setting.
     */
    AgentSession.prototype.setAutoCompactionEnabled = function (enabled) {
        this.settingsManager.setCompactionEnabled(enabled);
    };
    Object.defineProperty(AgentSession.prototype, "autoCompactionEnabled", {
        /** Whether auto-compaction is enabled */
        get: function () {
            return this.settingsManager.getCompactionEnabled();
        },
        enumerable: false,
        configurable: true
    });
    AgentSession.prototype.bindExtensions = function (bindings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (bindings.uiContext !== undefined) {
                            this._extensionUIContext = bindings.uiContext;
                        }
                        if (bindings.commandContextActions !== undefined) {
                            this._extensionCommandContextActions = bindings.commandContextActions;
                        }
                        if (bindings.shutdownHandler !== undefined) {
                            this._extensionShutdownHandler = bindings.shutdownHandler;
                        }
                        if (bindings.onError !== undefined) {
                            this._extensionErrorListener = bindings.onError;
                        }
                        if (!this._extensionRunner) return [3 /*break*/, 3];
                        this._applyExtensionBindings(this._extensionRunner);
                        return [4 /*yield*/, this._extensionRunner.emit({ type: "session_start" })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.extendResourcesFromExtensions("startup")];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AgentSession.prototype.extendResourcesFromExtensions = function (reason) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, skillPaths, promptPaths, themePaths, extensionPaths;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!((_b = this._extensionRunner) === null || _b === void 0 ? void 0 : _b.hasHandlers("resources_discover"))) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this._extensionRunner.emitResourcesDiscover(this._cwd, reason)];
                    case 1:
                        _a = _c.sent(), skillPaths = _a.skillPaths, promptPaths = _a.promptPaths, themePaths = _a.themePaths;
                        if (skillPaths.length === 0 && promptPaths.length === 0 && themePaths.length === 0) {
                            return [2 /*return*/];
                        }
                        extensionPaths = {
                            skillPaths: this.buildExtensionResourcePaths(skillPaths),
                            promptPaths: this.buildExtensionResourcePaths(promptPaths),
                            themePaths: this.buildExtensionResourcePaths(themePaths),
                        };
                        this._resourceLoader.extendResources(extensionPaths);
                        this._baseSystemPrompt = this._rebuildSystemPrompt(this.getActiveToolNames());
                        this.agent.setSystemPrompt(this._baseSystemPrompt);
                        return [2 /*return*/];
                }
            });
        });
    };
    AgentSession.prototype.buildExtensionResourcePaths = function (entries) {
        var _this = this;
        return entries.map(function (entry) {
            var source = _this.getExtensionSourceLabel(entry.extensionPath);
            var baseDir = entry.extensionPath.startsWith("<") ? undefined : (0, node_path_1.dirname)(entry.extensionPath);
            return {
                path: entry.path,
                metadata: {
                    source: source,
                    scope: "temporary",
                    origin: "top-level",
                    baseDir: baseDir,
                },
            };
        });
    };
    AgentSession.prototype.getExtensionSourceLabel = function (extensionPath) {
        if (extensionPath.startsWith("<")) {
            return "extension:".concat(extensionPath.replace(/[<>]/g, ""));
        }
        var base = (0, node_path_1.basename)(extensionPath);
        var name = base.replace(/\.(ts|js)$/, "");
        return "extension:".concat(name);
    };
    AgentSession.prototype._applyExtensionBindings = function (runner) {
        var _a;
        runner.setUIContext(this._extensionUIContext);
        runner.bindCommandContext(this._extensionCommandContextActions);
        (_a = this._extensionErrorUnsubscriber) === null || _a === void 0 ? void 0 : _a.call(this);
        this._extensionErrorUnsubscriber = this._extensionErrorListener
            ? runner.onError(this._extensionErrorListener)
            : undefined;
    };
    AgentSession.prototype._bindExtensionCore = function (runner) {
        var _this = this;
        var normalizeLocation = function (source) {
            if (source === "user" || source === "project" || source === "path") {
                return source;
            }
            return undefined;
        };
        var reservedBuiltins = new Set(slash_commands_js_1.BUILTIN_SLASH_COMMANDS.map(function (command) { return command.name; }));
        var getCommands = function () {
            var extensionCommands = runner
                .getRegisteredCommandsWithPaths()
                .filter(function (_a) {
                var command = _a.command;
                return !reservedBuiltins.has(command.name);
            })
                .map(function (_a) {
                var command = _a.command, extensionPath = _a.extensionPath;
                return ({
                    name: command.name,
                    description: command.description,
                    source: "extension",
                    path: extensionPath,
                });
            });
            var templates = _this.promptTemplates.map(function (template) { return ({
                name: template.name,
                description: template.description,
                source: "prompt",
                location: normalizeLocation(template.source),
                path: template.filePath,
            }); });
            var skills = _this._resourceLoader.getSkills().skills.map(function (skill) { return ({
                name: "skill:".concat(skill.name),
                description: skill.description,
                source: "skill",
                location: normalizeLocation(skill.source),
                path: skill.filePath,
            }); });
            return __spreadArray(__spreadArray(__spreadArray([], extensionCommands, true), templates, true), skills, true);
        };
        runner.bindCore({
            sendMessage: function (message, options) {
                _this.sendCustomMessage(message, options).catch(function (err) {
                    runner.emitError({
                        extensionPath: "<runtime>",
                        event: "send_message",
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            },
            sendUserMessage: function (content, options) {
                _this.sendUserMessage(content, options).catch(function (err) {
                    runner.emitError({
                        extensionPath: "<runtime>",
                        event: "send_user_message",
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            },
            appendEntry: function (customType, data) {
                _this.sessionManager.appendCustomEntry(customType, data);
            },
            setSessionName: function (name) {
                _this.sessionManager.appendSessionInfo(name);
            },
            getSessionName: function () {
                return _this.sessionManager.getSessionName();
            },
            setLabel: function (entryId, label) {
                _this.sessionManager.appendLabelChange(entryId, label);
            },
            getActiveTools: function () { return _this.getActiveToolNames(); },
            getAllTools: function () { return _this.getAllTools(); },
            setActiveTools: function (toolNames) { return _this.setActiveToolsByName(toolNames); },
            refreshTools: function () { return _this._refreshToolRegistry(); },
            getCommands: getCommands,
            setModel: function (model) { return __awaiter(_this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.modelRegistry.getApiKey(model)];
                        case 1:
                            key = _a.sent();
                            if (!key)
                                return [2 /*return*/, false];
                            return [4 /*yield*/, this.setModel(model)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, true];
                    }
                });
            }); },
            getThinkingLevel: function () { return _this.thinkingLevel; },
            setThinkingLevel: function (level) { return _this.setThinkingLevel(level); },
        }, {
            getModel: function () { return _this.model; },
            isIdle: function () { return !_this.isStreaming; },
            abort: function () { return _this.abort(); },
            hasPendingMessages: function () { return _this.pendingMessageCount > 0; },
            shutdown: function () {
                var _a;
                (_a = _this._extensionShutdownHandler) === null || _a === void 0 ? void 0 : _a.call(_this);
            },
            getContextUsage: function () { return _this.getContextUsage(); },
            compact: function (options) {
                void (function () { return __awaiter(_this, void 0, void 0, function () {
                    var result, error_2, err;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, this.compact(options === null || options === void 0 ? void 0 : options.customInstructions)];
                            case 1:
                                result = _c.sent();
                                (_a = options === null || options === void 0 ? void 0 : options.onComplete) === null || _a === void 0 ? void 0 : _a.call(options, result);
                                return [3 /*break*/, 3];
                            case 2:
                                error_2 = _c.sent();
                                err = error_2 instanceof Error ? error_2 : new Error(String(error_2));
                                (_b = options === null || options === void 0 ? void 0 : options.onError) === null || _b === void 0 ? void 0 : _b.call(options, err);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); })();
            },
            getSystemPrompt: function () { return _this.systemPrompt; },
        });
    };
    AgentSession.prototype._refreshToolRegistry = function (options) {
        var _this = this;
        var _a, _b;
        var previousRegistryNames = new Set(this._toolRegistry.keys());
        var previousActiveToolNames = this.getActiveToolNames();
        var registeredTools = (_b = (_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.getAllRegisteredTools()) !== null && _b !== void 0 ? _b : [];
        var allCustomTools = __spreadArray(__spreadArray([], registeredTools, true), this._customTools.map(function (def) { return ({ definition: def, extensionPath: "<sdk>" }); }), true);
        this._toolPromptSnippets = new Map(allCustomTools
            .map(function (registeredTool) {
            var _a;
            var snippet = _this._normalizePromptSnippet((_a = registeredTool.definition.promptSnippet) !== null && _a !== void 0 ? _a : registeredTool.definition.description);
            return snippet ? [registeredTool.definition.name, snippet] : undefined;
        })
            .filter(function (entry) { return entry !== undefined; }));
        this._toolPromptGuidelines = new Map(allCustomTools
            .map(function (registeredTool) {
            var guidelines = _this._normalizePromptGuidelines(registeredTool.definition.promptGuidelines);
            return guidelines.length > 0 ? [registeredTool.definition.name, guidelines] : undefined;
        })
            .filter(function (entry) { return entry !== undefined; }));
        var wrappedExtensionTools = this._extensionRunner
            ? (0, index_js_3.wrapRegisteredTools)(allCustomTools, this._extensionRunner)
            : [];
        var toolRegistry = new Map(this._baseToolRegistry);
        for (var _i = 0, _c = wrappedExtensionTools; _i < _c.length; _i++) {
            var tool = _c[_i];
            toolRegistry.set(tool.name, tool);
        }
        this._toolRegistry = toolRegistry;
        var nextActiveToolNames = (options === null || options === void 0 ? void 0 : options.activeToolNames)
            ? __spreadArray([], options.activeToolNames, true) : __spreadArray([], previousActiveToolNames, true);
        if (options === null || options === void 0 ? void 0 : options.includeAllExtensionTools) {
            for (var _d = 0, wrappedExtensionTools_1 = wrappedExtensionTools; _d < wrappedExtensionTools_1.length; _d++) {
                var tool = wrappedExtensionTools_1[_d];
                nextActiveToolNames.push(tool.name);
            }
        }
        else if (!(options === null || options === void 0 ? void 0 : options.activeToolNames)) {
            for (var _e = 0, _f = this._toolRegistry.keys(); _e < _f.length; _e++) {
                var toolName = _f[_e];
                if (!previousRegistryNames.has(toolName)) {
                    nextActiveToolNames.push(toolName);
                }
            }
        }
        this.setActiveToolsByName(__spreadArray([], new Set(nextActiveToolNames), true));
    };
    AgentSession.prototype._buildRuntime = function (options) {
        var _a;
        var autoResizeImages = this.settingsManager.getImageAutoResize();
        var shellCommandPrefix = this.settingsManager.getShellCommandPrefix();
        var baseTools = this._baseToolsOverride
            ? this._baseToolsOverride
            : (0, index_js_4.createAllTools)(this._cwd, {
                read: { autoResizeImages: autoResizeImages },
                bash: { commandPrefix: shellCommandPrefix },
            });
        this._baseToolRegistry = new Map(Object.entries(baseTools).map(function (_a) {
            var name = _a[0], tool = _a[1];
            return [name, tool];
        }));
        var extensionsResult = this._resourceLoader.getExtensions();
        if (options.flagValues) {
            for (var _i = 0, _b = options.flagValues; _i < _b.length; _i++) {
                var _c = _b[_i], name_3 = _c[0], value = _c[1];
                extensionsResult.runtime.flagValues.set(name_3, value);
            }
        }
        var hasExtensions = extensionsResult.extensions.length > 0;
        var hasCustomTools = this._customTools.length > 0;
        this._extensionRunner =
            hasExtensions || hasCustomTools
                ? new index_js_3.ExtensionRunner(extensionsResult.extensions, extensionsResult.runtime, this._cwd, this.sessionManager, this._modelRegistry)
                : undefined;
        if (this._extensionRunnerRef) {
            this._extensionRunnerRef.current = this._extensionRunner;
        }
        if (this._extensionRunner) {
            this._bindExtensionCore(this._extensionRunner);
            this._applyExtensionBindings(this._extensionRunner);
        }
        var defaultActiveToolNames = this._baseToolsOverride
            ? Object.keys(this._baseToolsOverride)
            : ["read", "bash", "edit", "write"];
        var baseActiveToolNames = (_a = options.activeToolNames) !== null && _a !== void 0 ? _a : defaultActiveToolNames;
        this._refreshToolRegistry({
            activeToolNames: baseActiveToolNames,
            includeAllExtensionTools: options.includeAllExtensionTools,
        });
    };
    AgentSession.prototype.reload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var previousFlagValues, hasBindings;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        previousFlagValues = (_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.getFlagValues();
                        return [4 /*yield*/, ((_b = this._extensionRunner) === null || _b === void 0 ? void 0 : _b.emit({ type: "session_shutdown" }))];
                    case 1:
                        _c.sent();
                        this.settingsManager.reload();
                        (0, pi_ai_1.resetApiProviders)();
                        return [4 /*yield*/, this._resourceLoader.reload()];
                    case 2:
                        _c.sent();
                        this._buildRuntime({
                            activeToolNames: this.getActiveToolNames(),
                            flagValues: previousFlagValues,
                            includeAllExtensionTools: true,
                        });
                        hasBindings = this._extensionUIContext ||
                            this._extensionCommandContextActions ||
                            this._extensionShutdownHandler ||
                            this._extensionErrorListener;
                        if (!(this._extensionRunner && hasBindings)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this._extensionRunner.emit({ type: "session_start" })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, this.extendResourcesFromExtensions("reload")];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // =========================================================================
    // Auto-Retry
    // =========================================================================
    /**
     * Check if an error is retryable (overloaded, rate limit, server errors).
     * Context overflow errors are NOT retryable (handled by compaction instead).
     */
    AgentSession.prototype._isRetryableError = function (message) {
        var _a, _b;
        if (message.stopReason !== "error" || !message.errorMessage)
            return false;
        // Context overflow is handled by compaction, not retry
        var contextWindow = (_b = (_a = this.model) === null || _a === void 0 ? void 0 : _a.contextWindow) !== null && _b !== void 0 ? _b : 0;
        if ((0, pi_ai_1.isContextOverflow)(message, contextWindow))
            return false;
        var err = message.errorMessage;
        // Match: overloaded_error, rate limit, 429, 500, 502, 503, 504, service unavailable, connection errors, fetch failed, terminated, retry delay exceeded
        return /overloaded|rate.?limit|too many requests|429|500|502|503|504|service.?unavailable|server.?error|internal.?error|connection.?error|connection.?refused|other side closed|fetch failed|upstream.?connect|reset before headers|terminated|retry delay/i.test(err);
    };
    /**
     * Handle retryable errors with exponential backoff.
     * @returns true if retry was initiated, false if max retries exceeded or disabled
     */
    AgentSession.prototype._handleRetryableError = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, delayMs, messages, _a, attempt;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        settings = this.settingsManager.getRetrySettings();
                        if (!settings.enabled) {
                            this._resolveRetry();
                            return [2 /*return*/, false];
                        }
                        // Retry promise is created synchronously in _handleAgentEvent for agent_end.
                        // Keep a defensive fallback here in case a future refactor bypasses that path.
                        if (!this._retryPromise) {
                            this._retryPromise = new Promise(function (resolve) {
                                _this._retryResolve = resolve;
                            });
                        }
                        this._retryAttempt++;
                        if (this._retryAttempt > settings.maxRetries) {
                            // Max retries exceeded, emit final failure and reset
                            this._emit({
                                type: "auto_retry_end",
                                success: false,
                                attempt: this._retryAttempt - 1,
                                finalError: message.errorMessage,
                            });
                            this._retryAttempt = 0;
                            this._resolveRetry(); // Resolve so waitForRetry() completes
                            return [2 /*return*/, false];
                        }
                        delayMs = settings.baseDelayMs * Math.pow(2, (this._retryAttempt - 1));
                        this._emit({
                            type: "auto_retry_start",
                            attempt: this._retryAttempt,
                            maxAttempts: settings.maxRetries,
                            delayMs: delayMs,
                            errorMessage: message.errorMessage || "Unknown error",
                        });
                        messages = this.agent.state.messages;
                        if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
                            this.agent.replaceMessages(messages.slice(0, -1));
                        }
                        // Wait with exponential backoff (abortable)
                        this._retryAbortController = new AbortController();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, sleep_js_1.sleep)(delayMs, this._retryAbortController.signal)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        attempt = this._retryAttempt;
                        this._retryAttempt = 0;
                        this._retryAbortController = undefined;
                        this._emit({
                            type: "auto_retry_end",
                            success: false,
                            attempt: attempt,
                            finalError: "Retry cancelled",
                        });
                        this._resolveRetry();
                        return [2 /*return*/, false];
                    case 4:
                        this._retryAbortController = undefined;
                        // Retry via continue() - use setTimeout to break out of event handler chain
                        setTimeout(function () {
                            _this.agent.continue().catch(function () {
                                // Retry failed - will be caught by next agent_end
                            });
                        }, 0);
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Cancel in-progress retry.
     */
    AgentSession.prototype.abortRetry = function () {
        var _a;
        (_a = this._retryAbortController) === null || _a === void 0 ? void 0 : _a.abort();
        // Note: _retryAttempt is reset in the catch block of _autoRetry
        this._resolveRetry();
    };
    /**
     * Wait for any in-progress retry to complete.
     * Returns immediately if no retry is in progress.
     */
    AgentSession.prototype.waitForRetry = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._retryPromise) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._retryPromise];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(AgentSession.prototype, "isRetrying", {
        /** Whether auto-retry is currently in progress */
        get: function () {
            return this._retryPromise !== undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "autoRetryEnabled", {
        /** Whether auto-retry is enabled */
        get: function () {
            return this.settingsManager.getRetryEnabled();
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Toggle auto-retry setting.
     */
    AgentSession.prototype.setAutoRetryEnabled = function (enabled) {
        this.settingsManager.setRetryEnabled(enabled);
    };
    // =========================================================================
    // Bash Execution
    // =========================================================================
    /**
     * Execute a bash command.
     * Adds result to agent context and session.
     * @param command The bash command to execute
     * @param onChunk Optional streaming callback for output
     * @param options.excludeFromContext If true, command output won't be sent to LLM (!! prefix)
     * @param options.operations Custom BashOperations for remote execution
     */
    AgentSession.prototype.executeBash = function (command, onChunk, options) {
        return __awaiter(this, void 0, void 0, function () {
            var prefix, resolvedCommand, result, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this._bashAbortController = new AbortController();
                        prefix = this.settingsManager.getShellCommandPrefix();
                        resolvedCommand = prefix ? "".concat(prefix, "\n").concat(command) : command;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 6, 7]);
                        if (!(options === null || options === void 0 ? void 0 : options.operations)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, bash_executor_js_1.executeBashWithOperations)(resolvedCommand, process.cwd(), options.operations, {
                                onChunk: onChunk,
                                signal: this._bashAbortController.signal,
                            })];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, (0, bash_executor_js_1.executeBash)(resolvedCommand, {
                            onChunk: onChunk,
                            signal: this._bashAbortController.signal,
                        })];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        result = _a;
                        this.recordBashResult(command, result, options);
                        return [2 /*return*/, result];
                    case 6:
                        this._bashAbortController = undefined;
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Record a bash execution result in session history.
     * Used by executeBash and by extensions that handle bash execution themselves.
     */
    AgentSession.prototype.recordBashResult = function (command, result, options) {
        var bashMessage = {
            role: "bashExecution",
            command: command,
            output: result.output,
            exitCode: result.exitCode,
            cancelled: result.cancelled,
            truncated: result.truncated,
            fullOutputPath: result.fullOutputPath,
            timestamp: Date.now(),
            excludeFromContext: options === null || options === void 0 ? void 0 : options.excludeFromContext,
        };
        // If agent is streaming, defer adding to avoid breaking tool_use/tool_result ordering
        if (this.isStreaming) {
            // Queue for later - will be flushed on agent_end
            this._pendingBashMessages.push(bashMessage);
        }
        else {
            // Add to agent state immediately
            this.agent.appendMessage(bashMessage);
            // Save to session
            this.sessionManager.appendMessage(bashMessage);
        }
    };
    /**
     * Cancel running bash command.
     */
    AgentSession.prototype.abortBash = function () {
        var _a;
        (_a = this._bashAbortController) === null || _a === void 0 ? void 0 : _a.abort();
    };
    Object.defineProperty(AgentSession.prototype, "isBashRunning", {
        /** Whether a bash command is currently running */
        get: function () {
            return this._bashAbortController !== undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AgentSession.prototype, "hasPendingBashMessages", {
        /** Whether there are pending bash messages waiting to be flushed */
        get: function () {
            return this._pendingBashMessages.length > 0;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Flush pending bash messages to agent state and session.
     * Called after agent turn completes to maintain proper message ordering.
     */
    AgentSession.prototype._flushPendingBashMessages = function () {
        if (this._pendingBashMessages.length === 0)
            return;
        for (var _i = 0, _a = this._pendingBashMessages; _i < _a.length; _i++) {
            var bashMessage = _a[_i];
            // Add to agent state
            this.agent.appendMessage(bashMessage);
            // Save to session
            this.sessionManager.appendMessage(bashMessage);
        }
        this._pendingBashMessages = [];
    };
    // =========================================================================
    // Session Management
    // =========================================================================
    /**
     * Switch to a different session file.
     * Aborts current operation, loads messages, restores model/thinking.
     * Listeners are preserved and will continue receiving events.
     * @returns true if switch completed, false if cancelled by extension
     */
    AgentSession.prototype.switchSession = function (sessionPath) {
        return __awaiter(this, void 0, void 0, function () {
            var previousSessionFile, result, sessionContext, previousModel, availableModels, match, hasThinkingEntry, defaultThinkingLevel, availableLevels, effectiveLevel;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        previousSessionFile = this.sessionManager.getSessionFile();
                        if (!((_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers("session_before_switch"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_switch",
                                reason: "resume",
                                targetSessionFile: sessionPath,
                            })];
                    case 1:
                        result = (_c.sent());
                        if (result === null || result === void 0 ? void 0 : result.cancel) {
                            return [2 /*return*/, false];
                        }
                        _c.label = 2;
                    case 2:
                        this._disconnectFromAgent();
                        return [4 /*yield*/, this.abort()];
                    case 3:
                        _c.sent();
                        this._steeringMessages = [];
                        this._followUpMessages = [];
                        this._pendingNextTurnMessages = [];
                        // Set new session
                        this.sessionManager.setSessionFile(sessionPath);
                        this.agent.sessionId = this.sessionManager.getSessionId();
                        sessionContext = this.sessionManager.buildSessionContext();
                        if (!this._extensionRunner) return [3 /*break*/, 5];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_switch",
                                reason: "resume",
                                previousSessionFile: previousSessionFile,
                            })];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        // Emit session event to custom tools
                        this.agent.replaceMessages(sessionContext.messages);
                        if (!sessionContext.model) return [3 /*break*/, 8];
                        previousModel = this.model;
                        return [4 /*yield*/, this._modelRegistry.getAvailable()];
                    case 6:
                        availableModels = _c.sent();
                        match = availableModels.find(function (m) { return m.provider === sessionContext.model.provider && m.id === sessionContext.model.modelId; });
                        if (!match) return [3 /*break*/, 8];
                        this.agent.setModel(match);
                        return [4 /*yield*/, this._emitModelSelect(match, previousModel, "restore")];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8:
                        hasThinkingEntry = this.sessionManager.getBranch().some(function (entry) { return entry.type === "thinking_level_change"; });
                        defaultThinkingLevel = (_b = this.settingsManager.getDefaultThinkingLevel()) !== null && _b !== void 0 ? _b : defaults_js_1.DEFAULT_THINKING_LEVEL;
                        if (hasThinkingEntry) {
                            // Restore thinking level if saved (setThinkingLevel clamps to model capabilities)
                            this.setThinkingLevel(sessionContext.thinkingLevel);
                        }
                        else {
                            availableLevels = this.getAvailableThinkingLevels();
                            effectiveLevel = availableLevels.includes(defaultThinkingLevel)
                                ? defaultThinkingLevel
                                : this._clampThinkingLevel(defaultThinkingLevel, availableLevels);
                            this.agent.setThinkingLevel(effectiveLevel);
                            this.sessionManager.appendThinkingLevelChange(effectiveLevel);
                        }
                        this._reconnectToAgent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Set a display name for the current session.
     */
    AgentSession.prototype.setSessionName = function (name) {
        this.sessionManager.appendSessionInfo(name);
    };
    /**
     * Create a fork from a specific entry.
     * Emits before_fork/fork session events to extensions.
     *
     * @param entryId ID of the entry to fork from
     * @returns Object with:
     *   - selectedText: The text of the selected user message (for editor pre-fill)
     *   - cancelled: True if an extension cancelled the fork
     */
    AgentSession.prototype.fork = function (entryId) {
        return __awaiter(this, void 0, void 0, function () {
            var previousSessionFile, selectedEntry, selectedText, skipConversationRestore, result, sessionContext;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        previousSessionFile = this.sessionFile;
                        selectedEntry = this.sessionManager.getEntry(entryId);
                        if (!selectedEntry || selectedEntry.type !== "message" || selectedEntry.message.role !== "user") {
                            throw new Error("Invalid entry ID for forking");
                        }
                        selectedText = this._extractUserMessageText(selectedEntry.message.content);
                        skipConversationRestore = false;
                        if (!((_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers("session_before_fork"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_fork",
                                entryId: entryId,
                            })];
                    case 1:
                        result = (_c.sent());
                        if (result === null || result === void 0 ? void 0 : result.cancel) {
                            return [2 /*return*/, { selectedText: selectedText, cancelled: true }];
                        }
                        skipConversationRestore = (_b = result === null || result === void 0 ? void 0 : result.skipConversationRestore) !== null && _b !== void 0 ? _b : false;
                        _c.label = 2;
                    case 2:
                        // Clear pending messages (bound to old session state)
                        this._pendingNextTurnMessages = [];
                        if (!selectedEntry.parentId) {
                            this.sessionManager.newSession({ parentSession: previousSessionFile });
                        }
                        else {
                            this.sessionManager.createBranchedSession(selectedEntry.parentId);
                        }
                        this.agent.sessionId = this.sessionManager.getSessionId();
                        sessionContext = this.sessionManager.buildSessionContext();
                        if (!this._extensionRunner) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_fork",
                                previousSessionFile: previousSessionFile,
                            })];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        // Emit session event to custom tools (with reason "fork")
                        if (!skipConversationRestore) {
                            this.agent.replaceMessages(sessionContext.messages);
                        }
                        return [2 /*return*/, { selectedText: selectedText, cancelled: false }];
                }
            });
        });
    };
    // =========================================================================
    // Tree Navigation
    // =========================================================================
    /**
     * Navigate to a different node in the session tree.
     * Unlike fork() which creates a new session file, this stays in the same file.
     *
     * @param targetId The entry ID to navigate to
     * @param options.summarize Whether user wants to summarize abandoned branch
     * @param options.customInstructions Custom instructions for summarizer
     * @param options.replaceInstructions If true, customInstructions replaces the default prompt
     * @param options.label Label to attach to the branch summary entry
     * @returns Result with editorText (if user message) and cancelled status
     */
    AgentSession.prototype.navigateTree = function (targetId_1) {
        return __awaiter(this, arguments, void 0, function (targetId, options) {
            var oldLeafId, targetEntry, _a, entriesToSummarize, commonAncestorId, customInstructions, replaceInstructions, label, preparation, extensionSummary, fromExtension, result, summaryText, summaryDetails, model, apiKey, branchSummarySettings, result, newLeafId, editorText, summaryEntry, summaryId, sessionContext;
            var _b, _c;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        oldLeafId = this.sessionManager.getLeafId();
                        // No-op if already at target
                        if (targetId === oldLeafId) {
                            return [2 /*return*/, { cancelled: false }];
                        }
                        // Model required for summarization
                        if (options.summarize && !this.model) {
                            throw new Error("No model available for summarization");
                        }
                        targetEntry = this.sessionManager.getEntry(targetId);
                        if (!targetEntry) {
                            throw new Error("Entry ".concat(targetId, " not found"));
                        }
                        _a = (0, index_js_1.collectEntriesForBranchSummary)(this.sessionManager, oldLeafId, targetId), entriesToSummarize = _a.entries, commonAncestorId = _a.commonAncestorId;
                        customInstructions = options.customInstructions;
                        replaceInstructions = options.replaceInstructions;
                        label = options.label;
                        preparation = {
                            targetId: targetId,
                            oldLeafId: oldLeafId,
                            commonAncestorId: commonAncestorId,
                            entriesToSummarize: entriesToSummarize,
                            userWantsSummary: (_b = options.summarize) !== null && _b !== void 0 ? _b : false,
                            customInstructions: customInstructions,
                            replaceInstructions: replaceInstructions,
                            label: label,
                        };
                        // Set up abort controller for summarization
                        this._branchSummaryAbortController = new AbortController();
                        fromExtension = false;
                        if (!((_c = this._extensionRunner) === null || _c === void 0 ? void 0 : _c.hasHandlers("session_before_tree"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_before_tree",
                                preparation: preparation,
                                signal: this._branchSummaryAbortController.signal,
                            })];
                    case 1:
                        result = (_d.sent());
                        if (result === null || result === void 0 ? void 0 : result.cancel) {
                            return [2 /*return*/, { cancelled: true }];
                        }
                        if ((result === null || result === void 0 ? void 0 : result.summary) && options.summarize) {
                            extensionSummary = result.summary;
                            fromExtension = true;
                        }
                        // Allow extensions to override instructions and label
                        if ((result === null || result === void 0 ? void 0 : result.customInstructions) !== undefined) {
                            customInstructions = result.customInstructions;
                        }
                        if ((result === null || result === void 0 ? void 0 : result.replaceInstructions) !== undefined) {
                            replaceInstructions = result.replaceInstructions;
                        }
                        if ((result === null || result === void 0 ? void 0 : result.label) !== undefined) {
                            label = result.label;
                        }
                        _d.label = 2;
                    case 2:
                        if (!(options.summarize && entriesToSummarize.length > 0 && !extensionSummary)) return [3 /*break*/, 5];
                        model = this.model;
                        return [4 /*yield*/, this._modelRegistry.getApiKey(model)];
                    case 3:
                        apiKey = _d.sent();
                        if (!apiKey) {
                            throw new Error("No API key for ".concat(model.provider));
                        }
                        branchSummarySettings = this.settingsManager.getBranchSummarySettings();
                        return [4 /*yield*/, (0, index_js_1.generateBranchSummary)(entriesToSummarize, {
                                model: model,
                                apiKey: apiKey,
                                signal: this._branchSummaryAbortController.signal,
                                customInstructions: customInstructions,
                                replaceInstructions: replaceInstructions,
                                reserveTokens: branchSummarySettings.reserveTokens,
                            })];
                    case 4:
                        result = _d.sent();
                        this._branchSummaryAbortController = undefined;
                        if (result.aborted) {
                            return [2 /*return*/, { cancelled: true, aborted: true }];
                        }
                        if (result.error) {
                            throw new Error(result.error);
                        }
                        summaryText = result.summary;
                        summaryDetails = {
                            readFiles: result.readFiles || [],
                            modifiedFiles: result.modifiedFiles || [],
                        };
                        return [3 /*break*/, 6];
                    case 5:
                        if (extensionSummary) {
                            summaryText = extensionSummary.summary;
                            summaryDetails = extensionSummary.details;
                        }
                        _d.label = 6;
                    case 6:
                        if (targetEntry.type === "message" && targetEntry.message.role === "user") {
                            // User message: leaf = parent (null if root), text goes to editor
                            newLeafId = targetEntry.parentId;
                            editorText = this._extractUserMessageText(targetEntry.message.content);
                        }
                        else if (targetEntry.type === "custom_message") {
                            // Custom message: leaf = parent (null if root), text goes to editor
                            newLeafId = targetEntry.parentId;
                            editorText =
                                typeof targetEntry.content === "string"
                                    ? targetEntry.content
                                    : targetEntry.content
                                        .filter(function (c) { return c.type === "text"; })
                                        .map(function (c) { return c.text; })
                                        .join("");
                        }
                        else {
                            // Non-user message: leaf = selected node
                            newLeafId = targetId;
                        }
                        if (summaryText) {
                            summaryId = this.sessionManager.branchWithSummary(newLeafId, summaryText, summaryDetails, fromExtension);
                            summaryEntry = this.sessionManager.getEntry(summaryId);
                            // Attach label to the summary entry
                            if (label) {
                                this.sessionManager.appendLabelChange(summaryId, label);
                            }
                        }
                        else if (newLeafId === null) {
                            // No summary, navigating to root - reset leaf
                            this.sessionManager.resetLeaf();
                        }
                        else {
                            // No summary, navigating to non-root
                            this.sessionManager.branch(newLeafId);
                        }
                        // Attach label to target entry when not summarizing (no summary entry to label)
                        if (label && !summaryText) {
                            this.sessionManager.appendLabelChange(targetId, label);
                        }
                        sessionContext = this.sessionManager.buildSessionContext();
                        this.agent.replaceMessages(sessionContext.messages);
                        if (!this._extensionRunner) return [3 /*break*/, 8];
                        return [4 /*yield*/, this._extensionRunner.emit({
                                type: "session_tree",
                                newLeafId: this.sessionManager.getLeafId(),
                                oldLeafId: oldLeafId,
                                summaryEntry: summaryEntry,
                                fromExtension: summaryText ? fromExtension : undefined,
                            })];
                    case 7:
                        _d.sent();
                        _d.label = 8;
                    case 8:
                        // Emit to custom tools
                        this._branchSummaryAbortController = undefined;
                        return [2 /*return*/, { editorText: editorText, cancelled: false, summaryEntry: summaryEntry }];
                }
            });
        });
    };
    /**
     * Get all user messages from session for fork selector.
     */
    AgentSession.prototype.getUserMessagesForForking = function () {
        var entries = this.sessionManager.getEntries();
        var result = [];
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            if (entry.type !== "message")
                continue;
            if (entry.message.role !== "user")
                continue;
            var text = this._extractUserMessageText(entry.message.content);
            if (text) {
                result.push({ entryId: entry.id, text: text });
            }
        }
        return result;
    };
    AgentSession.prototype._extractUserMessageText = function (content) {
        if (typeof content === "string")
            return content;
        if (Array.isArray(content)) {
            return content
                .filter(function (c) { return c.type === "text"; })
                .map(function (c) { return c.text; })
                .join("");
        }
        return "";
    };
    /**
     * Get session statistics.
     */
    AgentSession.prototype.getSessionStats = function () {
        var state = this.state;
        var userMessages = state.messages.filter(function (m) { return m.role === "user"; }).length;
        var assistantMessages = state.messages.filter(function (m) { return m.role === "assistant"; }).length;
        var toolResults = state.messages.filter(function (m) { return m.role === "toolResult"; }).length;
        var toolCalls = 0;
        var totalInput = 0;
        var totalOutput = 0;
        var totalCacheRead = 0;
        var totalCacheWrite = 0;
        var totalCost = 0;
        for (var _i = 0, _a = state.messages; _i < _a.length; _i++) {
            var message = _a[_i];
            if (message.role === "assistant") {
                var assistantMsg = message;
                toolCalls += assistantMsg.content.filter(function (c) { return c.type === "toolCall"; }).length;
                totalInput += assistantMsg.usage.input;
                totalOutput += assistantMsg.usage.output;
                totalCacheRead += assistantMsg.usage.cacheRead;
                totalCacheWrite += assistantMsg.usage.cacheWrite;
                totalCost += assistantMsg.usage.cost.total;
            }
        }
        return {
            sessionFile: this.sessionFile,
            sessionId: this.sessionId,
            userMessages: userMessages,
            assistantMessages: assistantMessages,
            toolCalls: toolCalls,
            toolResults: toolResults,
            totalMessages: state.messages.length,
            tokens: {
                input: totalInput,
                output: totalOutput,
                cacheRead: totalCacheRead,
                cacheWrite: totalCacheWrite,
                total: totalInput + totalOutput + totalCacheRead + totalCacheWrite,
            },
            cost: totalCost,
        };
    };
    AgentSession.prototype.getContextUsage = function () {
        var _a;
        var model = this.model;
        if (!model)
            return undefined;
        var contextWindow = (_a = model.contextWindow) !== null && _a !== void 0 ? _a : 0;
        if (contextWindow <= 0)
            return undefined;
        // After compaction, the last assistant usage reflects pre-compaction context size.
        // We can only trust usage from an assistant that responded after the latest compaction.
        // If no such assistant exists, context token count is unknown until the next LLM response.
        var branchEntries = this.sessionManager.getBranch();
        var latestCompaction = (0, session_manager_js_1.getLatestCompactionEntry)(branchEntries);
        if (latestCompaction) {
            // Check if there's a valid assistant usage after the compaction boundary
            var compactionIndex = branchEntries.lastIndexOf(latestCompaction);
            var hasPostCompactionUsage = false;
            for (var i = branchEntries.length - 1; i > compactionIndex; i--) {
                var entry = branchEntries[i];
                if (entry.type === "message" && entry.message.role === "assistant") {
                    var assistant = entry.message;
                    if (assistant.stopReason !== "aborted" && assistant.stopReason !== "error") {
                        var contextTokens = (0, index_js_1.calculateContextTokens)(assistant.usage);
                        if (contextTokens > 0) {
                            hasPostCompactionUsage = true;
                        }
                        break;
                    }
                }
            }
            if (!hasPostCompactionUsage) {
                return { tokens: null, contextWindow: contextWindow, percent: null };
            }
        }
        var estimate = (0, index_js_1.estimateContextTokens)(this.messages);
        var percent = (estimate.tokens / contextWindow) * 100;
        return {
            tokens: estimate.tokens,
            contextWindow: contextWindow,
            percent: percent,
        };
    };
    /**
     * Export session to HTML.
     * @param outputPath Optional output path (defaults to session directory)
     * @returns Path to exported file
     */
    AgentSession.prototype.exportToHtml = function (outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var themeName, toolRenderer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        themeName = this.settingsManager.getTheme();
                        if (this._extensionRunner) {
                            toolRenderer = (0, tool_renderer_js_1.createToolHtmlRenderer)({
                                getToolDefinition: function (name) { return _this._extensionRunner.getToolDefinition(name); },
                                theme: theme_js_1.theme,
                            });
                        }
                        return [4 /*yield*/, (0, index_js_2.exportSessionToHtml)(this.sessionManager, this.state, {
                                outputPath: outputPath,
                                themeName: themeName,
                                toolRenderer: toolRenderer,
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // =========================================================================
    // Utilities
    // =========================================================================
    /**
     * Get text content of last assistant message.
     * Useful for /copy command.
     * @returns Text content, or undefined if no assistant message exists
     */
    AgentSession.prototype.getLastAssistantText = function () {
        var lastAssistant = this.messages
            .slice()
            .reverse()
            .find(function (m) {
            if (m.role !== "assistant")
                return false;
            var msg = m;
            // Skip aborted messages with no content
            if (msg.stopReason === "aborted" && msg.content.length === 0)
                return false;
            return true;
        });
        if (!lastAssistant)
            return undefined;
        var text = "";
        for (var _i = 0, _a = lastAssistant.content; _i < _a.length; _i++) {
            var content = _a[_i];
            if (content.type === "text") {
                text += content.text;
            }
        }
        return text.trim() || undefined;
    };
    // =========================================================================
    // Extension System
    // =========================================================================
    /**
     * Check if extensions have handlers for a specific event type.
     */
    AgentSession.prototype.hasExtensionHandlers = function (eventType) {
        var _a, _b;
        return (_b = (_a = this._extensionRunner) === null || _a === void 0 ? void 0 : _a.hasHandlers(eventType)) !== null && _b !== void 0 ? _b : false;
    };
    Object.defineProperty(AgentSession.prototype, "extensionRunner", {
        /**
         * Get the extension runner (for setting UI context and error handlers).
         */
        get: function () {
            return this._extensionRunner;
        },
        enumerable: false,
        configurable: true
    });
    return AgentSession;
}());
exports.AgentSession = AgentSession;
