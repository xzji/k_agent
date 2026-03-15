"use strict";
/**
 * Extension runner - executes extensions and manages their lifecycle.
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
exports.ExtensionRunner = void 0;
exports.emitSessionShutdownEvent = emitSessionShutdownEvent;
var theme_js_1 = require("../../modes/interactive/theme/theme.js");
// Keybindings for these actions cannot be overridden by extensions
var RESERVED_ACTIONS_FOR_EXTENSION_CONFLICTS = [
    "interrupt",
    "clear",
    "exit",
    "suspend",
    "cycleThinkingLevel",
    "cycleModelForward",
    "cycleModelBackward",
    "selectModel",
    "expandTools",
    "toggleThinking",
    "externalEditor",
    "followUp",
    "submit",
    "selectConfirm",
    "selectCancel",
    "copy",
    "deleteToLineEnd",
];
var buildBuiltinKeybindings = function (effectiveKeybindings) {
    var builtinKeybindings = {};
    for (var _i = 0, _a = Object.entries(effectiveKeybindings); _i < _a.length; _i++) {
        var _b = _a[_i], action = _b[0], keys = _b[1];
        var keyAction = action;
        var keyList = Array.isArray(keys) ? keys : [keys];
        var restrictOverride = RESERVED_ACTIONS_FOR_EXTENSION_CONFLICTS.includes(keyAction);
        for (var _c = 0, keyList_1 = keyList; _c < keyList_1.length; _c++) {
            var key = keyList_1[_c];
            var normalizedKey = key.toLowerCase();
            builtinKeybindings[normalizedKey] = {
                action: keyAction,
                restrictOverride: restrictOverride,
            };
        }
    }
    return builtinKeybindings;
};
/**
 * Helper function to emit session_shutdown event to extensions.
 * Returns true if the event was emitted, false if there were no handlers.
 */
function emitSessionShutdownEvent(extensionRunner) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(extensionRunner === null || extensionRunner === void 0 ? void 0 : extensionRunner.hasHandlers("session_shutdown"))) return [3 /*break*/, 2];
                    return [4 /*yield*/, extensionRunner.emit({
                            type: "session_shutdown",
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2: return [2 /*return*/, false];
            }
        });
    });
}
var noOpUIContext = {
    select: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, undefined];
    }); }); },
    confirm: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, false];
    }); }); },
    input: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, undefined];
    }); }); },
    notify: function () { },
    onTerminalInput: function () { return function () { }; },
    setStatus: function () { },
    setWorkingMessage: function () { },
    setWidget: function () { },
    setFooter: function () { },
    setHeader: function () { },
    setTitle: function () { },
    custom: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, undefined];
    }); }); },
    pasteToEditor: function () { },
    setEditorText: function () { },
    getEditorText: function () { return ""; },
    editor: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, undefined];
    }); }); },
    setEditorComponent: function () { },
    get theme() {
        return theme_js_1.theme;
    },
    getAllThemes: function () { return []; },
    getTheme: function () { return undefined; },
    setTheme: function (_theme) { return ({ success: false, error: "UI not available" }); },
    getToolsExpanded: function () { return false; },
    setToolsExpanded: function () { },
};
var ExtensionRunner = /** @class */ (function () {
    function ExtensionRunner(extensions, runtime, cwd, sessionManager, modelRegistry) {
        var _this = this;
        this.errorListeners = new Set();
        this.getModel = function () { return undefined; };
        this.isIdleFn = function () { return true; };
        this.waitForIdleFn = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); }); };
        this.abortFn = function () { };
        this.hasPendingMessagesFn = function () { return false; };
        this.getContextUsageFn = function () { return undefined; };
        this.compactFn = function () { };
        this.getSystemPromptFn = function () { return ""; };
        this.newSessionHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.forkHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.navigateTreeHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.switchSessionHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.reloadHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); }); };
        this.shutdownHandler = function () { };
        this.shortcutDiagnostics = [];
        this.commandDiagnostics = [];
        this.extensions = extensions;
        this.runtime = runtime;
        this.uiContext = noOpUIContext;
        this.cwd = cwd;
        this.sessionManager = sessionManager;
        this.modelRegistry = modelRegistry;
    }
    ExtensionRunner.prototype.bindCore = function (actions, contextActions) {
        var _this = this;
        // Copy actions into the shared runtime (all extension APIs reference this)
        this.runtime.sendMessage = actions.sendMessage;
        this.runtime.sendUserMessage = actions.sendUserMessage;
        this.runtime.appendEntry = actions.appendEntry;
        this.runtime.setSessionName = actions.setSessionName;
        this.runtime.getSessionName = actions.getSessionName;
        this.runtime.setLabel = actions.setLabel;
        this.runtime.getActiveTools = actions.getActiveTools;
        this.runtime.getAllTools = actions.getAllTools;
        this.runtime.setActiveTools = actions.setActiveTools;
        this.runtime.refreshTools = actions.refreshTools;
        this.runtime.getCommands = actions.getCommands;
        this.runtime.setModel = actions.setModel;
        this.runtime.getThinkingLevel = actions.getThinkingLevel;
        this.runtime.setThinkingLevel = actions.setThinkingLevel;
        // Context actions (required)
        this.getModel = contextActions.getModel;
        this.isIdleFn = contextActions.isIdle;
        this.abortFn = contextActions.abort;
        this.hasPendingMessagesFn = contextActions.hasPendingMessages;
        this.shutdownHandler = contextActions.shutdown;
        this.getContextUsageFn = contextActions.getContextUsage;
        this.compactFn = contextActions.compact;
        this.getSystemPromptFn = contextActions.getSystemPrompt;
        // Flush provider registrations queued during extension loading
        for (var _i = 0, _a = this.runtime.pendingProviderRegistrations; _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b.name, config = _b.config;
            this.modelRegistry.registerProvider(name_1, config);
        }
        this.runtime.pendingProviderRegistrations = [];
        // From this point on, provider registration/unregistration takes effect immediately
        // without requiring a /reload.
        this.runtime.registerProvider = function (name, config) { return _this.modelRegistry.registerProvider(name, config); };
        this.runtime.unregisterProvider = function (name) { return _this.modelRegistry.unregisterProvider(name); };
    };
    ExtensionRunner.prototype.bindCommandContext = function (actions) {
        var _this = this;
        if (actions) {
            this.waitForIdleFn = actions.waitForIdle;
            this.newSessionHandler = actions.newSession;
            this.forkHandler = actions.fork;
            this.navigateTreeHandler = actions.navigateTree;
            this.switchSessionHandler = actions.switchSession;
            this.reloadHandler = actions.reload;
            return;
        }
        this.waitForIdleFn = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); }); };
        this.newSessionHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.forkHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.navigateTreeHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.switchSessionHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ cancelled: false })];
        }); }); };
        this.reloadHandler = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); }); };
    };
    ExtensionRunner.prototype.setUIContext = function (uiContext) {
        this.uiContext = uiContext !== null && uiContext !== void 0 ? uiContext : noOpUIContext;
    };
    ExtensionRunner.prototype.getUIContext = function () {
        return this.uiContext;
    };
    ExtensionRunner.prototype.hasUI = function () {
        return this.uiContext !== noOpUIContext;
    };
    ExtensionRunner.prototype.getExtensionPaths = function () {
        return this.extensions.map(function (e) { return e.path; });
    };
    /** Get all registered tools from all extensions (first registration per name wins). */
    ExtensionRunner.prototype.getAllRegisteredTools = function () {
        var toolsByName = new Map();
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            for (var _b = 0, _c = ext.tools.values(); _b < _c.length; _b++) {
                var tool = _c[_b];
                if (!toolsByName.has(tool.definition.name)) {
                    toolsByName.set(tool.definition.name, tool);
                }
            }
        }
        return Array.from(toolsByName.values());
    };
    /** Get a tool definition by name. Returns undefined if not found. */
    ExtensionRunner.prototype.getToolDefinition = function (toolName) {
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            var tool = ext.tools.get(toolName);
            if (tool) {
                return tool.definition;
            }
        }
        return undefined;
    };
    ExtensionRunner.prototype.getFlags = function () {
        var allFlags = new Map();
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            for (var _b = 0, _c = ext.flags; _b < _c.length; _b++) {
                var _d = _c[_b], name_2 = _d[0], flag = _d[1];
                if (!allFlags.has(name_2)) {
                    allFlags.set(name_2, flag);
                }
            }
        }
        return allFlags;
    };
    ExtensionRunner.prototype.setFlagValue = function (name, value) {
        this.runtime.flagValues.set(name, value);
    };
    ExtensionRunner.prototype.getFlagValues = function () {
        return new Map(this.runtime.flagValues);
    };
    ExtensionRunner.prototype.getShortcuts = function (effectiveKeybindings) {
        var _this = this;
        this.shortcutDiagnostics = [];
        var builtinKeybindings = buildBuiltinKeybindings(effectiveKeybindings);
        var extensionShortcuts = new Map();
        var addDiagnostic = function (message, extensionPath) {
            _this.shortcutDiagnostics.push({ type: "warning", message: message, path: extensionPath });
            if (!_this.hasUI()) {
                console.warn(message);
            }
        };
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            for (var _b = 0, _c = ext.shortcuts; _b < _c.length; _b++) {
                var _d = _c[_b], key = _d[0], shortcut = _d[1];
                var normalizedKey = key.toLowerCase();
                var builtInKeybinding = builtinKeybindings[normalizedKey];
                if ((builtInKeybinding === null || builtInKeybinding === void 0 ? void 0 : builtInKeybinding.restrictOverride) === true) {
                    addDiagnostic("Extension shortcut '".concat(key, "' from ").concat(shortcut.extensionPath, " conflicts with built-in shortcut. Skipping."), shortcut.extensionPath);
                    continue;
                }
                if ((builtInKeybinding === null || builtInKeybinding === void 0 ? void 0 : builtInKeybinding.restrictOverride) === false) {
                    addDiagnostic("Extension shortcut conflict: '".concat(key, "' is built-in shortcut for ").concat(builtInKeybinding.action, " and ").concat(shortcut.extensionPath, ". Using ").concat(shortcut.extensionPath, "."), shortcut.extensionPath);
                }
                var existingExtensionShortcut = extensionShortcuts.get(normalizedKey);
                if (existingExtensionShortcut) {
                    addDiagnostic("Extension shortcut conflict: '".concat(key, "' registered by both ").concat(existingExtensionShortcut.extensionPath, " and ").concat(shortcut.extensionPath, ". Using ").concat(shortcut.extensionPath, "."), shortcut.extensionPath);
                }
                extensionShortcuts.set(normalizedKey, shortcut);
            }
        }
        return extensionShortcuts;
    };
    ExtensionRunner.prototype.getShortcutDiagnostics = function () {
        return this.shortcutDiagnostics;
    };
    ExtensionRunner.prototype.onError = function (listener) {
        var _this = this;
        this.errorListeners.add(listener);
        return function () { return _this.errorListeners.delete(listener); };
    };
    ExtensionRunner.prototype.emitError = function (error) {
        for (var _i = 0, _a = this.errorListeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(error);
        }
    };
    ExtensionRunner.prototype.hasHandlers = function (eventType) {
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            var handlers = ext.handlers.get(eventType);
            if (handlers && handlers.length > 0) {
                return true;
            }
        }
        return false;
    };
    ExtensionRunner.prototype.getMessageRenderer = function (customType) {
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            var renderer = ext.messageRenderers.get(customType);
            if (renderer) {
                return renderer;
            }
        }
        return undefined;
    };
    ExtensionRunner.prototype.getRegisteredCommands = function (reserved) {
        this.commandDiagnostics = [];
        var commands = [];
        var commandOwners = new Map();
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            for (var _b = 0, _c = ext.commands.values(); _b < _c.length; _b++) {
                var command = _c[_b];
                if (reserved === null || reserved === void 0 ? void 0 : reserved.has(command.name)) {
                    var message = "Extension command '".concat(command.name, "' from ").concat(ext.path, " conflicts with built-in commands. Skipping.");
                    this.commandDiagnostics.push({ type: "warning", message: message, path: ext.path });
                    if (!this.hasUI()) {
                        console.warn(message);
                    }
                    continue;
                }
                var existingOwner = commandOwners.get(command.name);
                if (existingOwner) {
                    var message = "Extension command '".concat(command.name, "' from ").concat(ext.path, " conflicts with ").concat(existingOwner, ". Skipping.");
                    this.commandDiagnostics.push({ type: "warning", message: message, path: ext.path });
                    if (!this.hasUI()) {
                        console.warn(message);
                    }
                    continue;
                }
                commandOwners.set(command.name, ext.path);
                commands.push(command);
            }
        }
        return commands;
    };
    ExtensionRunner.prototype.getCommandDiagnostics = function () {
        return this.commandDiagnostics;
    };
    ExtensionRunner.prototype.getRegisteredCommandsWithPaths = function () {
        var result = [];
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            for (var _b = 0, _c = ext.commands.values(); _b < _c.length; _b++) {
                var command = _c[_b];
                result.push({ command: command, extensionPath: ext.path });
            }
        }
        return result;
    };
    ExtensionRunner.prototype.getCommand = function (name) {
        for (var _i = 0, _a = this.extensions; _i < _a.length; _i++) {
            var ext = _a[_i];
            var command = ext.commands.get(name);
            if (command) {
                return command;
            }
        }
        return undefined;
    };
    /**
     * Request a graceful shutdown. Called by extension tools and event handlers.
     * The actual shutdown behavior is provided by the mode via bindExtensions().
     */
    ExtensionRunner.prototype.shutdown = function () {
        this.shutdownHandler();
    };
    /**
     * Create an ExtensionContext for use in event handlers and tool execution.
     * Context values are resolved at call time, so changes via bindCore/bindUI are reflected.
     */
    ExtensionRunner.prototype.createContext = function () {
        var _this = this;
        var getModel = this.getModel;
        return {
            ui: this.uiContext,
            hasUI: this.hasUI(),
            cwd: this.cwd,
            sessionManager: this.sessionManager,
            modelRegistry: this.modelRegistry,
            get model() {
                return getModel();
            },
            isIdle: function () { return _this.isIdleFn(); },
            abort: function () { return _this.abortFn(); },
            hasPendingMessages: function () { return _this.hasPendingMessagesFn(); },
            shutdown: function () { return _this.shutdownHandler(); },
            getContextUsage: function () { return _this.getContextUsageFn(); },
            compact: function (options) { return _this.compactFn(options); },
            getSystemPrompt: function () { return _this.getSystemPromptFn(); },
        };
    };
    ExtensionRunner.prototype.createCommandContext = function () {
        var _this = this;
        return __assign(__assign({}, this.createContext()), { waitForIdle: function () { return _this.waitForIdleFn(); }, newSession: function (options) { return _this.newSessionHandler(options); }, fork: function (entryId) { return _this.forkHandler(entryId); }, navigateTree: function (targetId, options) { return _this.navigateTreeHandler(targetId, options); }, switchSession: function (sessionPath) { return _this.switchSessionHandler(sessionPath); }, reload: function () { return _this.reloadHandler(); } });
    };
    ExtensionRunner.prototype.isSessionBeforeEvent = function (event) {
        return (event.type === "session_before_switch" ||
            event.type === "session_before_fork" ||
            event.type === "session_before_compact" ||
            event.type === "session_before_tree");
    };
    ExtensionRunner.prototype.emit = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, result, _i, _a, ext, handlers, _b, handlers_1, handler, handlerResult, err_1, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get(event.type);
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_1 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_1.length)) return [3 /*break*/, 7];
                        handler = handlers_1[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, handler(event, ctx)];
                    case 4:
                        handlerResult = _c.sent();
                        if (this.isSessionBeforeEvent(event) && handlerResult) {
                            result = handlerResult;
                            if (result.cancel) {
                                return [2 /*return*/, result];
                            }
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _c.sent();
                        message = err_1 instanceof Error ? err_1.message : String(err_1);
                        stack = err_1 instanceof Error ? err_1.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: event.type,
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, result];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitToolResult = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, currentEvent, modified, _i, _a, ext, handlers, _b, handlers_2, handler, handlerResult, err_2, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        currentEvent = __assign({}, event);
                        modified = false;
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get("tool_result");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_2 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_2.length)) return [3 /*break*/, 7];
                        handler = handlers_2[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, handler(currentEvent, ctx)];
                    case 4:
                        handlerResult = (_c.sent());
                        if (!handlerResult)
                            return [3 /*break*/, 6];
                        if (handlerResult.content !== undefined) {
                            currentEvent.content = handlerResult.content;
                            modified = true;
                        }
                        if (handlerResult.details !== undefined) {
                            currentEvent.details = handlerResult.details;
                            modified = true;
                        }
                        if (handlerResult.isError !== undefined) {
                            currentEvent.isError = handlerResult.isError;
                            modified = true;
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_2 = _c.sent();
                        message = err_2 instanceof Error ? err_2.message : String(err_2);
                        stack = err_2 instanceof Error ? err_2.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: "tool_result",
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8:
                        if (!modified) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, {
                                content: currentEvent.content,
                                details: currentEvent.details,
                                isError: currentEvent.isError,
                            }];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitToolCall = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, result, _i, _a, ext, handlers, _b, handlers_3, handler, handlerResult;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        ext = _a[_i];
                        handlers = ext.handlers.get("tool_call");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 5];
                        _b = 0, handlers_3 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_3.length)) return [3 /*break*/, 5];
                        handler = handlers_3[_b];
                        return [4 /*yield*/, handler(event, ctx)];
                    case 3:
                        handlerResult = _c.sent();
                        if (handlerResult) {
                            result = handlerResult;
                            if (result.block) {
                                return [2 /*return*/, result];
                            }
                        }
                        _c.label = 4;
                    case 4:
                        _b++;
                        return [3 /*break*/, 2];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, result];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitUserBash = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, _i, _a, ext, handlers, _b, handlers_4, handler, handlerResult, err_3, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get("user_bash");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_4 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_4.length)) return [3 /*break*/, 7];
                        handler = handlers_4[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, handler(event, ctx)];
                    case 4:
                        handlerResult = _c.sent();
                        if (handlerResult) {
                            return [2 /*return*/, handlerResult];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_3 = _c.sent();
                        message = err_3 instanceof Error ? err_3.message : String(err_3);
                        stack = err_3 instanceof Error ? err_3.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: "user_bash",
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, undefined];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitContext = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, currentMessages, _i, _a, ext, handlers, _b, handlers_5, handler, event_1, handlerResult, err_4, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        currentMessages = structuredClone(messages);
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get("context");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_5 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_5.length)) return [3 /*break*/, 7];
                        handler = handlers_5[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        event_1 = { type: "context", messages: currentMessages };
                        return [4 /*yield*/, handler(event_1, ctx)];
                    case 4:
                        handlerResult = _c.sent();
                        if (handlerResult && handlerResult.messages) {
                            currentMessages = handlerResult.messages;
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_4 = _c.sent();
                        message = err_4 instanceof Error ? err_4.message : String(err_4);
                        stack = err_4 instanceof Error ? err_4.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: "context",
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, currentMessages];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitBeforeProviderRequest = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, currentPayload, _i, _a, ext, handlers, _b, handlers_6, handler, event_2, handlerResult, err_5, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        currentPayload = payload;
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get("before_provider_request");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_6 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_6.length)) return [3 /*break*/, 7];
                        handler = handlers_6[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        event_2 = {
                            type: "before_provider_request",
                            payload: currentPayload,
                        };
                        return [4 /*yield*/, handler(event_2, ctx)];
                    case 4:
                        handlerResult = _c.sent();
                        if (handlerResult !== undefined) {
                            currentPayload = handlerResult;
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_5 = _c.sent();
                        message = err_5 instanceof Error ? err_5.message : String(err_5);
                        stack = err_5 instanceof Error ? err_5.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: "before_provider_request",
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, currentPayload];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitBeforeAgentStart = function (prompt, images, systemPrompt) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, messages, currentSystemPrompt, systemPromptModified, _i, _a, ext, handlers, _b, handlers_7, handler, event_3, handlerResult, result, err_6, message, stack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ctx = this.createContext();
                        messages = [];
                        currentSystemPrompt = systemPrompt;
                        systemPromptModified = false;
                        _i = 0, _a = this.extensions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        handlers = ext.handlers.get("before_agent_start");
                        if (!handlers || handlers.length === 0)
                            return [3 /*break*/, 7];
                        _b = 0, handlers_7 = handlers;
                        _c.label = 2;
                    case 2:
                        if (!(_b < handlers_7.length)) return [3 /*break*/, 7];
                        handler = handlers_7[_b];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        event_3 = {
                            type: "before_agent_start",
                            prompt: prompt,
                            images: images,
                            systemPrompt: currentSystemPrompt,
                        };
                        return [4 /*yield*/, handler(event_3, ctx)];
                    case 4:
                        handlerResult = _c.sent();
                        if (handlerResult) {
                            result = handlerResult;
                            if (result.message) {
                                messages.push(result.message);
                            }
                            if (result.systemPrompt !== undefined) {
                                currentSystemPrompt = result.systemPrompt;
                                systemPromptModified = true;
                            }
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_6 = _c.sent();
                        message = err_6 instanceof Error ? err_6.message : String(err_6);
                        stack = err_6 instanceof Error ? err_6.stack : undefined;
                        this.emitError({
                            extensionPath: ext.path,
                            event: "before_agent_start",
                            error: message,
                            stack: stack,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8:
                        if (messages.length > 0 || systemPromptModified) {
                            return [2 /*return*/, {
                                    messages: messages.length > 0 ? messages : undefined,
                                    systemPrompt: systemPromptModified ? currentSystemPrompt : undefined,
                                }];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    ExtensionRunner.prototype.emitResourcesDiscover = function (cwd, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, skillPaths, promptPaths, themePaths, _loop_1, this_1, _i, _a, ext;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        ctx = this.createContext();
                        skillPaths = [];
                        promptPaths = [];
                        themePaths = [];
                        _loop_1 = function (ext) {
                            var handlers, _f, handlers_8, handler, event_4, handlerResult, result, err_7, message, stack;
                            return __generator(this, function (_g) {
                                switch (_g.label) {
                                    case 0:
                                        handlers = ext.handlers.get("resources_discover");
                                        if (!handlers || handlers.length === 0)
                                            return [2 /*return*/, "continue"];
                                        _f = 0, handlers_8 = handlers;
                                        _g.label = 1;
                                    case 1:
                                        if (!(_f < handlers_8.length)) return [3 /*break*/, 6];
                                        handler = handlers_8[_f];
                                        _g.label = 2;
                                    case 2:
                                        _g.trys.push([2, 4, , 5]);
                                        event_4 = { type: "resources_discover", cwd: cwd, reason: reason };
                                        return [4 /*yield*/, handler(event_4, ctx)];
                                    case 3:
                                        handlerResult = _g.sent();
                                        result = handlerResult;
                                        if ((_b = result === null || result === void 0 ? void 0 : result.skillPaths) === null || _b === void 0 ? void 0 : _b.length) {
                                            skillPaths.push.apply(skillPaths, result.skillPaths.map(function (path) { return ({ path: path, extensionPath: ext.path }); }));
                                        }
                                        if ((_c = result === null || result === void 0 ? void 0 : result.promptPaths) === null || _c === void 0 ? void 0 : _c.length) {
                                            promptPaths.push.apply(promptPaths, result.promptPaths.map(function (path) { return ({ path: path, extensionPath: ext.path }); }));
                                        }
                                        if ((_d = result === null || result === void 0 ? void 0 : result.themePaths) === null || _d === void 0 ? void 0 : _d.length) {
                                            themePaths.push.apply(themePaths, result.themePaths.map(function (path) { return ({ path: path, extensionPath: ext.path }); }));
                                        }
                                        return [3 /*break*/, 5];
                                    case 4:
                                        err_7 = _g.sent();
                                        message = err_7 instanceof Error ? err_7.message : String(err_7);
                                        stack = err_7 instanceof Error ? err_7.stack : undefined;
                                        this_1.emitError({
                                            extensionPath: ext.path,
                                            event: "resources_discover",
                                            error: message,
                                            stack: stack,
                                        });
                                        return [3 /*break*/, 5];
                                    case 5:
                                        _f++;
                                        return [3 /*break*/, 1];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, _a = this.extensions;
                        _e.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        ext = _a[_i];
                        return [5 /*yield**/, _loop_1(ext)];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, { skillPaths: skillPaths, promptPaths: promptPaths, themePaths: themePaths }];
                }
            });
        });
    };
    /** Emit input event. Transforms chain, "handled" short-circuits. */
    ExtensionRunner.prototype.emitInput = function (text, images, source) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, currentText, currentImages, _i, _a, ext, _b, _c, handler, event_5, result, err_8;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        ctx = this.createContext();
                        currentText = text;
                        currentImages = images;
                        _i = 0, _a = this.extensions;
                        _f.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        ext = _a[_i];
                        _b = 0, _c = (_d = ext.handlers.get("input")) !== null && _d !== void 0 ? _d : [];
                        _f.label = 2;
                    case 2:
                        if (!(_b < _c.length)) return [3 /*break*/, 7];
                        handler = _c[_b];
                        _f.label = 3;
                    case 3:
                        _f.trys.push([3, 5, , 6]);
                        event_5 = { type: "input", text: currentText, images: currentImages, source: source };
                        return [4 /*yield*/, handler(event_5, ctx)];
                    case 4:
                        result = (_f.sent());
                        if ((result === null || result === void 0 ? void 0 : result.action) === "handled")
                            return [2 /*return*/, result];
                        if ((result === null || result === void 0 ? void 0 : result.action) === "transform") {
                            currentText = result.text;
                            currentImages = (_e = result.images) !== null && _e !== void 0 ? _e : currentImages;
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_8 = _f.sent();
                        this.emitError({
                            extensionPath: ext.path,
                            event: "input",
                            error: err_8 instanceof Error ? err_8.message : String(err_8),
                            stack: err_8 instanceof Error ? err_8.stack : undefined,
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, currentText !== text || currentImages !== images
                            ? { action: "transform", text: currentText, images: currentImages }
                            : { action: "continue" }];
                }
            });
        });
    };
    return ExtensionRunner;
}());
exports.ExtensionRunner = ExtensionRunner;
