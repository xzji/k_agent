"use strict";
/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
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
exports.InteractiveMode = void 0;
var crypto = require("node:crypto");
var fs = require("node:fs");
var os = require("node:os");
var path = require("node:path");
var pi_tui_1 = require("@mariozechner/pi-tui");
var child_process_1 = require("child_process");
var config_js_1 = require("../../config.js");
var agent_session_js_1 = require("../../core/agent-session.js");
var footer_data_provider_js_1 = require("../../core/footer-data-provider.js");
var keybindings_js_1 = require("../../core/keybindings.js");
var messages_js_1 = require("../../core/messages.js");
var model_resolver_js_1 = require("../../core/model-resolver.js");
var session_manager_js_1 = require("../../core/session-manager.js");
var slash_commands_js_1 = require("../../core/slash-commands.js");
var changelog_js_1 = require("../../utils/changelog.js");
var clipboard_js_1 = require("../../utils/clipboard.js");
var clipboard_image_js_1 = require("../../utils/clipboard-image.js");
var tools_manager_js_1 = require("../../utils/tools-manager.js");
var armin_js_1 = require("./components/armin.js");
var assistant_message_js_1 = require("./components/assistant-message.js");
var bash_execution_js_1 = require("./components/bash-execution.js");
var bordered_loader_js_1 = require("./components/bordered-loader.js");
var branch_summary_message_js_1 = require("./components/branch-summary-message.js");
var compaction_summary_message_js_1 = require("./components/compaction-summary-message.js");
var custom_editor_js_1 = require("./components/custom-editor.js");
var custom_message_js_1 = require("./components/custom-message.js");
var daxnuts_js_1 = require("./components/daxnuts.js");
var dynamic_border_js_1 = require("./components/dynamic-border.js");
var extension_editor_js_1 = require("./components/extension-editor.js");
var extension_input_js_1 = require("./components/extension-input.js");
var extension_selector_js_1 = require("./components/extension-selector.js");
var footer_js_1 = require("./components/footer.js");
var keybinding_hints_js_1 = require("./components/keybinding-hints.js");
var login_dialog_js_1 = require("./components/login-dialog.js");
var model_selector_js_1 = require("./components/model-selector.js");
var oauth_selector_js_1 = require("./components/oauth-selector.js");
var scoped_models_selector_js_1 = require("./components/scoped-models-selector.js");
var session_selector_js_1 = require("./components/session-selector.js");
var settings_selector_js_1 = require("./components/settings-selector.js");
var skill_invocation_message_js_1 = require("./components/skill-invocation-message.js");
var tool_execution_js_1 = require("./components/tool-execution.js");
var tree_selector_js_1 = require("./components/tree-selector.js");
var user_message_js_1 = require("./components/user-message.js");
var user_message_selector_js_1 = require("./components/user-message-selector.js");
var theme_js_1 = require("./theme/theme.js");
function isExpandable(obj) {
    return typeof obj === "object" && obj !== null && "setExpanded" in obj && typeof obj.setExpanded === "function";
}
var InteractiveMode = /** @class */ (function () {
    function InteractiveMode(session, options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.isInitialized = false;
        this.loadingAnimation = undefined;
        this.pendingWorkingMessage = undefined;
        this.defaultWorkingMessage = "Working...";
        this.lastSigintTime = 0;
        this.lastEscapeTime = 0;
        this.changelogMarkdown = undefined;
        // Status line tracking (for mutating immediately-sequential status updates)
        this.lastStatusSpacer = undefined;
        this.lastStatusText = undefined;
        // Streaming message tracking
        this.streamingComponent = undefined;
        this.streamingMessage = undefined;
        // Tool execution tracking: toolCallId -> component
        this.pendingTools = new Map();
        // Tool output expansion state
        this.toolOutputExpanded = false;
        // Thinking block visibility state
        this.hideThinkingBlock = false;
        // Skill commands: command name -> skill file path
        this.skillCommands = new Map();
        // Track if editor is in bash mode (text starts with !)
        this.isBashMode = false;
        // Track current bash execution component
        this.bashComponent = undefined;
        // Track pending bash components (shown in pending area, moved to chat on submit)
        this.pendingBashComponents = [];
        // Auto-compaction state
        this.autoCompactionLoader = undefined;
        // Auto-retry state
        this.retryLoader = undefined;
        // Messages queued while compaction is running
        this.compactionQueuedMessages = [];
        // Shutdown state
        this.shutdownRequested = false;
        // Extension UI state
        this.extensionSelector = undefined;
        this.extensionInput = undefined;
        this.extensionEditor = undefined;
        this.extensionTerminalInputUnsubscribers = new Set();
        // Extension widgets (components rendered above/below the editor)
        this.extensionWidgetsAbove = new Map();
        this.extensionWidgetsBelow = new Map();
        // Custom footer from extension (undefined = use built-in footer)
        this.customFooter = undefined;
        // Built-in header (logo + keybinding hints + changelog)
        this.builtInHeader = undefined;
        // Custom header from extension (undefined = use built-in header)
        this.customHeader = undefined;
        /**
         * Gracefully shutdown the agent.
         * Emits shutdown event to extensions, then exits.
         */
        this.isShuttingDown = false;
        this.session = session;
        this.version = config_js_1.VERSION;
        this.ui = new pi_tui_1.TUI(new pi_tui_1.ProcessTerminal(), this.settingsManager.getShowHardwareCursor());
        this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
        this.headerContainer = new pi_tui_1.Container();
        this.chatContainer = new pi_tui_1.Container();
        this.pendingMessagesContainer = new pi_tui_1.Container();
        this.statusContainer = new pi_tui_1.Container();
        this.widgetContainerAbove = new pi_tui_1.Container();
        this.widgetContainerBelow = new pi_tui_1.Container();
        this.keybindings = keybindings_js_1.KeybindingsManager.create();
        var editorPaddingX = this.settingsManager.getEditorPaddingX();
        var autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
        this.defaultEditor = new custom_editor_js_1.CustomEditor(this.ui, (0, theme_js_1.getEditorTheme)(), this.keybindings, {
            paddingX: editorPaddingX,
            autocompleteMaxVisible: autocompleteMaxVisible,
        });
        this.editor = this.defaultEditor;
        this.editorContainer = new pi_tui_1.Container();
        this.editorContainer.addChild(this.editor);
        this.footerDataProvider = new footer_data_provider_js_1.FooterDataProvider();
        this.footer = new footer_js_1.FooterComponent(session, this.footerDataProvider);
        this.footer.setAutoCompactEnabled(session.autoCompactionEnabled);
        // Load hide thinking block setting
        this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
        // Register themes from resource loader and initialize
        (0, theme_js_1.setRegisteredThemes)(this.session.resourceLoader.getThemes().themes);
        (0, theme_js_1.initTheme)(this.settingsManager.getTheme(), true);
    }
    Object.defineProperty(InteractiveMode.prototype, "agent", {
        // Convenience accessors
        get: function () {
            return this.session.agent;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InteractiveMode.prototype, "sessionManager", {
        get: function () {
            return this.session.sessionManager;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InteractiveMode.prototype, "settingsManager", {
        get: function () {
            return this.session.settingsManager;
        },
        enumerable: false,
        configurable: true
    });
    InteractiveMode.prototype.setupAutocomplete = function (fdPath) {
        var _this = this;
        var _a, _b, _c, _d;
        // Define commands for autocomplete
        var slashCommands = slash_commands_js_1.BUILTIN_SLASH_COMMANDS.map(function (command) { return ({
            name: command.name,
            description: command.description,
        }); });
        var modelCommand = slashCommands.find(function (command) { return command.name === "model"; });
        if (modelCommand) {
            modelCommand.getArgumentCompletions = function (prefix) {
                // Get available models (scoped or from registry)
                var models = _this.session.scopedModels.length > 0
                    ? _this.session.scopedModels.map(function (s) { return s.model; })
                    : _this.session.modelRegistry.getAvailable();
                if (models.length === 0)
                    return null;
                // Create items with provider/id format
                var items = models.map(function (m) { return ({
                    id: m.id,
                    provider: m.provider,
                    label: "".concat(m.provider, "/").concat(m.id),
                }); });
                // Fuzzy filter by model ID + provider (allows "opus anthropic" to match)
                var filtered = (0, pi_tui_1.fuzzyFilter)(items, prefix, function (item) { return "".concat(item.id, " ").concat(item.provider); });
                if (filtered.length === 0)
                    return null;
                return filtered.map(function (item) { return ({
                    value: item.label,
                    label: item.id,
                    description: item.provider,
                }); });
            };
        }
        // Convert prompt templates to SlashCommand format for autocomplete
        var templateCommands = this.session.promptTemplates.map(function (cmd) { return ({
            name: cmd.name,
            description: cmd.description,
        }); });
        // Convert extension commands to SlashCommand format
        var builtinCommandNames = new Set(slashCommands.map(function (c) { return c.name; }));
        var extensionCommands = ((_b = (_a = this.session.extensionRunner) === null || _a === void 0 ? void 0 : _a.getRegisteredCommands(builtinCommandNames)) !== null && _b !== void 0 ? _b : []).map(function (cmd) {
            var _a;
            return ({
                name: cmd.name,
                description: (_a = cmd.description) !== null && _a !== void 0 ? _a : "(extension command)",
                getArgumentCompletions: cmd.getArgumentCompletions,
            });
        });
        // Build skill commands from session.skills (if enabled)
        this.skillCommands.clear();
        var skillCommandList = [];
        if (this.settingsManager.getEnableSkillCommands()) {
            for (var _i = 0, _e = this.session.resourceLoader.getSkills().skills; _i < _e.length; _i++) {
                var skill = _e[_i];
                var commandName = "skill:".concat(skill.name);
                this.skillCommands.set(commandName, skill.filePath);
                skillCommandList.push({ name: commandName, description: skill.description });
            }
        }
        // Setup autocomplete
        this.autocompleteProvider = new pi_tui_1.CombinedAutocompleteProvider(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], slashCommands, true), templateCommands, true), extensionCommands, true), skillCommandList, true), process.cwd(), fdPath);
        this.defaultEditor.setAutocompleteProvider(this.autocompleteProvider);
        if (this.editor !== this.defaultEditor) {
            (_d = (_c = this.editor).setAutocompleteProvider) === null || _d === void 0 ? void 0 : _d.call(_c, this.autocompleteProvider);
        }
    };
    InteractiveMode.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fdPath, logo, kb_1, hint, instructions, versionMatch, latestVersion, condensedText, versionMatch, latestVersion, condensedText;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isInitialized)
                            return [2 /*return*/];
                        // Load changelog (only show new entries, skip for resumed sessions)
                        this.changelogMarkdown = this.getChangelogForDisplay();
                        return [4 /*yield*/, Promise.all([(0, tools_manager_js_1.ensureTool)("fd"), (0, tools_manager_js_1.ensureTool)("rg")])];
                    case 1:
                        fdPath = (_a.sent())[0];
                        this.fdPath = fdPath;
                        // Add header container as first child
                        this.ui.addChild(this.headerContainer);
                        // Add header with keybindings from config (unless silenced)
                        if (this.options.verbose || !this.settingsManager.getQuietStartup()) {
                            logo = theme_js_1.theme.bold(theme_js_1.theme.fg("accent", config_js_1.APP_NAME)) + theme_js_1.theme.fg("dim", " v".concat(this.version));
                            kb_1 = this.keybindings;
                            hint = function (action, desc) { return (0, keybinding_hints_js_1.appKeyHint)(kb_1, action, desc); };
                            instructions = [
                                hint("interrupt", "to interrupt"),
                                hint("clear", "to clear"),
                                (0, keybinding_hints_js_1.rawKeyHint)("".concat((0, keybinding_hints_js_1.appKey)(kb_1, "clear"), " twice"), "to exit"),
                                hint("exit", "to exit (empty)"),
                                hint("suspend", "to suspend"),
                                (0, keybinding_hints_js_1.keyHint)("deleteToLineEnd", "to delete to end"),
                                hint("cycleThinkingLevel", "to cycle thinking level"),
                                (0, keybinding_hints_js_1.rawKeyHint)("".concat((0, keybinding_hints_js_1.appKey)(kb_1, "cycleModelForward"), "/").concat((0, keybinding_hints_js_1.appKey)(kb_1, "cycleModelBackward")), "to cycle models"),
                                hint("selectModel", "to select model"),
                                hint("expandTools", "to expand tools"),
                                hint("toggleThinking", "to expand thinking"),
                                hint("externalEditor", "for external editor"),
                                (0, keybinding_hints_js_1.rawKeyHint)("/", "for commands"),
                                (0, keybinding_hints_js_1.rawKeyHint)("!", "to run bash"),
                                (0, keybinding_hints_js_1.rawKeyHint)("!!", "to run bash (no context)"),
                                hint("followUp", "to queue follow-up"),
                                hint("dequeue", "to edit all queued messages"),
                                hint("pasteImage", "to paste image"),
                                (0, keybinding_hints_js_1.rawKeyHint)("drop files", "to attach"),
                            ].join("\n");
                            this.builtInHeader = new pi_tui_1.Text("".concat(logo, "\n").concat(instructions), 1, 0);
                            // Setup UI layout
                            this.headerContainer.addChild(new pi_tui_1.Spacer(1));
                            this.headerContainer.addChild(this.builtInHeader);
                            this.headerContainer.addChild(new pi_tui_1.Spacer(1));
                            // Add changelog if provided
                            if (this.changelogMarkdown) {
                                this.headerContainer.addChild(new dynamic_border_js_1.DynamicBorder());
                                if (this.settingsManager.getCollapseChangelog()) {
                                    versionMatch = this.changelogMarkdown.match(/##\s+\[?(\d+\.\d+\.\d+)\]?/);
                                    latestVersion = versionMatch ? versionMatch[1] : this.version;
                                    condensedText = "Updated to v".concat(latestVersion, ". Use ").concat(theme_js_1.theme.bold("/changelog"), " to view full changelog.");
                                    this.headerContainer.addChild(new pi_tui_1.Text(condensedText, 1, 0));
                                }
                                else {
                                    this.headerContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.bold(theme_js_1.theme.fg("accent", "What's New")), 1, 0));
                                    this.headerContainer.addChild(new pi_tui_1.Spacer(1));
                                    this.headerContainer.addChild(new pi_tui_1.Markdown(this.changelogMarkdown.trim(), 1, 0, this.getMarkdownThemeWithSettings()));
                                    this.headerContainer.addChild(new pi_tui_1.Spacer(1));
                                }
                                this.headerContainer.addChild(new dynamic_border_js_1.DynamicBorder());
                            }
                        }
                        else {
                            // Minimal header when silenced
                            this.builtInHeader = new pi_tui_1.Text("", 0, 0);
                            this.headerContainer.addChild(this.builtInHeader);
                            if (this.changelogMarkdown) {
                                // Still show changelog notification even in silent mode
                                this.headerContainer.addChild(new pi_tui_1.Spacer(1));
                                versionMatch = this.changelogMarkdown.match(/##\s+\[?(\d+\.\d+\.\d+)\]?/);
                                latestVersion = versionMatch ? versionMatch[1] : this.version;
                                condensedText = "Updated to v".concat(latestVersion, ". Use ").concat(theme_js_1.theme.bold("/changelog"), " to view full changelog.");
                                this.headerContainer.addChild(new pi_tui_1.Text(condensedText, 1, 0));
                            }
                        }
                        this.ui.addChild(this.chatContainer);
                        this.ui.addChild(this.pendingMessagesContainer);
                        this.ui.addChild(this.statusContainer);
                        this.renderWidgets(); // Initialize with default spacer
                        this.ui.addChild(this.widgetContainerAbove);
                        this.ui.addChild(this.editorContainer);
                        this.ui.addChild(this.widgetContainerBelow);
                        this.ui.addChild(this.footer);
                        this.ui.setFocus(this.editor);
                        this.setupKeyHandlers();
                        this.setupEditorSubmitHandler();
                        // Start the UI before initializing extensions so session_start handlers can use interactive dialogs
                        this.ui.start();
                        this.isInitialized = true;
                        // Initialize extensions first so resources are shown before messages
                        return [4 /*yield*/, this.initExtensions()];
                    case 2:
                        // Initialize extensions first so resources are shown before messages
                        _a.sent();
                        // Render initial messages AFTER showing loaded resources
                        this.renderInitialMessages();
                        // Set terminal title
                        this.updateTerminalTitle();
                        // Subscribe to agent events
                        this.subscribeToAgent();
                        // Set up theme file watcher
                        (0, theme_js_1.onThemeChange)(function () {
                            _this.ui.invalidate();
                            _this.updateEditorBorderColor();
                            _this.ui.requestRender();
                        });
                        // Set up git branch watcher (uses provider instead of footer)
                        this.footerDataProvider.onBranchChange(function () {
                            _this.ui.requestRender();
                        });
                        // Initialize available provider count for footer display
                        return [4 /*yield*/, this.updateAvailableProviderCount()];
                    case 3:
                        // Initialize available provider count for footer display
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update terminal title with session name and cwd.
     */
    InteractiveMode.prototype.updateTerminalTitle = function () {
        var cwdBasename = path.basename(process.cwd());
        var sessionName = this.sessionManager.getSessionName();
        if (sessionName) {
            this.ui.terminal.setTitle("\u03C0 - ".concat(sessionName, " - ").concat(cwdBasename));
        }
        else {
            this.ui.terminal.setTitle("\u03C0 - ".concat(cwdBasename));
        }
    };
    /**
     * Run the interactive mode. This is the main entry point.
     * Initializes the UI, shows warnings, processes initial messages, and starts the interactive loop.
     */
    InteractiveMode.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, migratedProviders, modelFallbackMessage, initialMessage, initialImages, initialMessages, modelsJsonError, error_1, errorMessage, _i, initialMessages_1, message, error_2, errorMessage, userInput, error_3, errorMessage;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _b.sent();
                        // Start version check asynchronously
                        this.checkForNewVersion().then(function (newVersion) {
                            if (newVersion) {
                                _this.showNewVersionNotification(newVersion);
                            }
                        });
                        // Check tmux keyboard setup asynchronously
                        this.checkTmuxKeyboardSetup().then(function (warning) {
                            if (warning) {
                                _this.showWarning(warning);
                            }
                        });
                        _a = this.options, migratedProviders = _a.migratedProviders, modelFallbackMessage = _a.modelFallbackMessage, initialMessage = _a.initialMessage, initialImages = _a.initialImages, initialMessages = _a.initialMessages;
                        if (migratedProviders && migratedProviders.length > 0) {
                            this.showWarning("Migrated credentials to auth.json: ".concat(migratedProviders.join(", ")));
                        }
                        modelsJsonError = this.session.modelRegistry.getError();
                        if (modelsJsonError) {
                            this.showError("models.json error: ".concat(modelsJsonError));
                        }
                        if (modelFallbackMessage) {
                            this.showWarning(modelFallbackMessage);
                        }
                        if (!initialMessage) return [3 /*break*/, 5];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.session.prompt(initialMessage, { images: initialImages })];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : "Unknown error occurred";
                        this.showError(errorMessage);
                        return [3 /*break*/, 5];
                    case 5:
                        if (!initialMessages) return [3 /*break*/, 11];
                        _i = 0, initialMessages_1 = initialMessages;
                        _b.label = 6;
                    case 6:
                        if (!(_i < initialMessages_1.length)) return [3 /*break*/, 11];
                        message = initialMessages_1[_i];
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.session.prompt(message)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _b.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : "Unknown error occurred";
                        this.showError(errorMessage);
                        return [3 /*break*/, 10];
                    case 10:
                        _i++;
                        return [3 /*break*/, 6];
                    case 11:
                        if (!true) return [3 /*break*/, 17];
                        return [4 /*yield*/, this.getUserInput()];
                    case 12:
                        userInput = _b.sent();
                        _b.label = 13;
                    case 13:
                        _b.trys.push([13, 15, , 16]);
                        return [4 /*yield*/, this.session.prompt(userInput)];
                    case 14:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 15:
                        error_3 = _b.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : "Unknown error occurred";
                        this.showError(errorMessage);
                        return [3 /*break*/, 16];
                    case 16: return [3 /*break*/, 11];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check npm registry for a newer version.
     */
    InteractiveMode.prototype.checkForNewVersion = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, latestVersion, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (process.env.PI_SKIP_VERSION_CHECK || process.env.PI_OFFLINE)
                            return [2 /*return*/, undefined];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch("https://registry.npmjs.org/@mariozechner/pi-coding-agent/latest", {
                                signal: AbortSignal.timeout(10000),
                            })];
                    case 2:
                        response = _b.sent();
                        if (!response.ok)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = (_b.sent());
                        latestVersion = data.version;
                        if (latestVersion && latestVersion !== this.version) {
                            return [2 /*return*/, latestVersion];
                        }
                        return [2 /*return*/, undefined];
                    case 4:
                        _a = _b.sent();
                        return [2 /*return*/, undefined];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.checkTmuxKeyboardSetup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var runTmuxShow, _a, extendedKeys, extendedKeysFormat;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!process.env.TMUX)
                            return [2 /*return*/, undefined];
                        runTmuxShow = function (option) {
                            return new Promise(function (resolve) {
                                var _a;
                                var proc = (0, child_process_1.spawn)("tmux", ["show", "-gv", option], {
                                    stdio: ["ignore", "pipe", "ignore"],
                                });
                                var stdout = "";
                                var timer = setTimeout(function () {
                                    proc.kill();
                                    resolve(undefined);
                                }, 2000);
                                (_a = proc.stdout) === null || _a === void 0 ? void 0 : _a.on("data", function (data) {
                                    stdout += data.toString();
                                });
                                proc.on("error", function () {
                                    clearTimeout(timer);
                                    resolve(undefined);
                                });
                                proc.on("close", function (code) {
                                    clearTimeout(timer);
                                    resolve(code === 0 ? stdout.trim() : undefined);
                                });
                            });
                        };
                        return [4 /*yield*/, Promise.all([
                                runTmuxShow("extended-keys"),
                                runTmuxShow("extended-keys-format"),
                            ])];
                    case 1:
                        _a = _b.sent(), extendedKeys = _a[0], extendedKeysFormat = _a[1];
                        if (extendedKeys !== "on" && extendedKeys !== "always") {
                            return [2 /*return*/, "tmux extended-keys is off. Modified Enter keys may not work. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux."];
                        }
                        if (extendedKeysFormat === "xterm") {
                            return [2 /*return*/, "tmux extended-keys-format is xterm. Pi works best with csi-u. Add `set -g extended-keys-format csi-u` to ~/.tmux.conf and restart tmux."];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    /**
     * Get changelog entries to display on startup.
     * Only shows new entries since last seen version, skips for resumed sessions.
     */
    InteractiveMode.prototype.getChangelogForDisplay = function () {
        // Skip changelog for resumed/continued sessions (already have messages)
        if (this.session.state.messages.length > 0) {
            return undefined;
        }
        var lastVersion = this.settingsManager.getLastChangelogVersion();
        var changelogPath = (0, changelog_js_1.getChangelogPath)();
        var entries = (0, changelog_js_1.parseChangelog)(changelogPath);
        if (!lastVersion) {
            // Fresh install - just record the version, don't show changelog
            this.settingsManager.setLastChangelogVersion(config_js_1.VERSION);
            return undefined;
        }
        else {
            var newEntries = (0, changelog_js_1.getNewEntries)(entries, lastVersion);
            if (newEntries.length > 0) {
                this.settingsManager.setLastChangelogVersion(config_js_1.VERSION);
                return newEntries.map(function (e) { return e.content; }).join("\n\n");
            }
        }
        return undefined;
    };
    InteractiveMode.prototype.getMarkdownThemeWithSettings = function () {
        return __assign(__assign({}, (0, theme_js_1.getMarkdownTheme)()), { codeBlockIndent: this.settingsManager.getCodeBlockIndent() });
    };
    // =========================================================================
    // Extension System
    // =========================================================================
    InteractiveMode.prototype.formatDisplayPath = function (p) {
        var home = os.homedir();
        var result = p;
        // Replace home directory with ~
        if (result.startsWith(home)) {
            result = "~".concat(result.slice(home.length));
        }
        return result;
    };
    /**
     * Get a short path relative to the package root for display.
     */
    InteractiveMode.prototype.getShortPath = function (fullPath, source) {
        // For npm packages, show path relative to node_modules/pkg/
        var npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
        if (npmMatch && source.startsWith("npm:")) {
            return npmMatch[2];
        }
        // For git packages, show path relative to repo root
        var gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
        if (gitMatch && source.startsWith("git:")) {
            return gitMatch[1];
        }
        // For local/auto, just use formatDisplayPath
        return this.formatDisplayPath(fullPath);
    };
    InteractiveMode.prototype.getDisplaySourceInfo = function (source, scope) {
        if (source === "local") {
            if (scope === "user") {
                return { label: "user", color: "muted" };
            }
            if (scope === "project") {
                return { label: "project", color: "muted" };
            }
            if (scope === "temporary") {
                return { label: "path", scopeLabel: "temp", color: "muted" };
            }
            return { label: "path", color: "muted" };
        }
        if (source === "cli") {
            return { label: "path", scopeLabel: scope === "temporary" ? "temp" : undefined, color: "muted" };
        }
        var scopeLabel = scope === "user" ? "user" : scope === "project" ? "project" : scope === "temporary" ? "temp" : undefined;
        return { label: source, scopeLabel: scopeLabel, color: "accent" };
    };
    InteractiveMode.prototype.getScopeGroup = function (source, scope) {
        if (source === "cli" || scope === "temporary")
            return "path";
        if (scope === "user")
            return "user";
        if (scope === "project")
            return "project";
        return "path";
    };
    InteractiveMode.prototype.isPackageSource = function (source) {
        return source.startsWith("npm:") || source.startsWith("git:");
    };
    InteractiveMode.prototype.buildScopeGroups = function (paths, metadata) {
        var _a, _b, _c;
        var groups = {
            user: { scope: "user", paths: [], packages: new Map() },
            project: { scope: "project", paths: [], packages: new Map() },
            path: { scope: "path", paths: [], packages: new Map() },
        };
        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
            var p = paths_1[_i];
            var meta = this.findMetadata(p, metadata);
            var source = (_a = meta === null || meta === void 0 ? void 0 : meta.source) !== null && _a !== void 0 ? _a : "local";
            var scope = (_b = meta === null || meta === void 0 ? void 0 : meta.scope) !== null && _b !== void 0 ? _b : "project";
            var groupKey = this.getScopeGroup(source, scope);
            var group = groups[groupKey];
            if (this.isPackageSource(source)) {
                var list = (_c = group.packages.get(source)) !== null && _c !== void 0 ? _c : [];
                list.push(p);
                group.packages.set(source, list);
            }
            else {
                group.paths.push(p);
            }
        }
        return [groups.project, groups.user, groups.path].filter(function (group) { return group.paths.length > 0 || group.packages.size > 0; });
    };
    InteractiveMode.prototype.formatScopeGroups = function (groups, options) {
        var lines = [];
        for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
            var group = groups_1[_i];
            lines.push("  ".concat(theme_js_1.theme.fg("accent", group.scope)));
            var sortedPaths = __spreadArray([], group.paths, true).sort(function (a, b) { return a.localeCompare(b); });
            for (var _a = 0, sortedPaths_1 = sortedPaths; _a < sortedPaths_1.length; _a++) {
                var p = sortedPaths_1[_a];
                lines.push(theme_js_1.theme.fg("dim", "    ".concat(options.formatPath(p))));
            }
            var sortedPackages = Array.from(group.packages.entries()).sort(function (_a, _b) {
                var a = _a[0];
                var b = _b[0];
                return a.localeCompare(b);
            });
            for (var _b = 0, sortedPackages_1 = sortedPackages; _b < sortedPackages_1.length; _b++) {
                var _c = sortedPackages_1[_b], source = _c[0], paths = _c[1];
                lines.push("    ".concat(theme_js_1.theme.fg("mdLink", source)));
                var sortedPackagePaths = __spreadArray([], paths, true).sort(function (a, b) { return a.localeCompare(b); });
                for (var _d = 0, sortedPackagePaths_1 = sortedPackagePaths; _d < sortedPackagePaths_1.length; _d++) {
                    var p = sortedPackagePaths_1[_d];
                    lines.push(theme_js_1.theme.fg("dim", "      ".concat(options.formatPackagePath(p, source))));
                }
            }
        }
        return lines.join("\n");
    };
    /**
     * Find metadata for a path, checking parent directories if exact match fails.
     * Package manager stores metadata for directories, but we display file paths.
     */
    InteractiveMode.prototype.findMetadata = function (p, metadata) {
        // Try exact match first
        var exact = metadata.get(p);
        if (exact)
            return exact;
        // Try parent directories (package manager stores directory paths)
        var current = p;
        while (current.includes("/")) {
            current = current.substring(0, current.lastIndexOf("/"));
            var parent_1 = metadata.get(current);
            if (parent_1)
                return parent_1;
        }
        return undefined;
    };
    /**
     * Format a path with its source/scope info from metadata.
     */
    InteractiveMode.prototype.formatPathWithSource = function (p, metadata) {
        var meta = this.findMetadata(p, metadata);
        if (meta) {
            var shortPath = this.getShortPath(p, meta.source);
            var _a = this.getDisplaySourceInfo(meta.source, meta.scope), label = _a.label, scopeLabel = _a.scopeLabel;
            var labelText = scopeLabel ? "".concat(label, " (").concat(scopeLabel, ")") : label;
            return "".concat(labelText, " ").concat(shortPath);
        }
        return this.formatDisplayPath(p);
    };
    /**
     * Format resource diagnostics with nice collision display using metadata.
     */
    InteractiveMode.prototype.formatDiagnostics = function (diagnostics, metadata) {
        var _a, _b;
        var lines = [];
        // Group collision diagnostics by name
        var collisions = new Map();
        var otherDiagnostics = [];
        for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
            var d = diagnostics_1[_i];
            if (d.type === "collision" && d.collision) {
                var list = (_a = collisions.get(d.collision.name)) !== null && _a !== void 0 ? _a : [];
                list.push(d);
                collisions.set(d.collision.name, list);
            }
            else {
                otherDiagnostics.push(d);
            }
        }
        // Format collision diagnostics grouped by name
        for (var _c = 0, collisions_1 = collisions; _c < collisions_1.length; _c++) {
            var _d = collisions_1[_c], name_1 = _d[0], collisionList = _d[1];
            var first = (_b = collisionList[0]) === null || _b === void 0 ? void 0 : _b.collision;
            if (!first)
                continue;
            lines.push(theme_js_1.theme.fg("warning", "  \"".concat(name_1, "\" collision:")));
            // Show winner
            lines.push(theme_js_1.theme.fg("dim", "    ".concat(theme_js_1.theme.fg("success", "✓"), " ").concat(this.formatPathWithSource(first.winnerPath, metadata))));
            // Show all losers
            for (var _e = 0, collisionList_1 = collisionList; _e < collisionList_1.length; _e++) {
                var d = collisionList_1[_e];
                if (d.collision) {
                    lines.push(theme_js_1.theme.fg("dim", "    ".concat(theme_js_1.theme.fg("warning", "✗"), " ").concat(this.formatPathWithSource(d.collision.loserPath, metadata), " (skipped)")));
                }
            }
        }
        // Format other diagnostics (skill name collisions, parse errors, etc.)
        for (var _f = 0, otherDiagnostics_1 = otherDiagnostics; _f < otherDiagnostics_1.length; _f++) {
            var d = otherDiagnostics_1[_f];
            if (d.path) {
                // Use metadata-aware formatting for paths
                var sourceInfo = this.formatPathWithSource(d.path, metadata);
                lines.push(theme_js_1.theme.fg(d.type === "error" ? "error" : "warning", "  ".concat(sourceInfo)));
                lines.push(theme_js_1.theme.fg(d.type === "error" ? "error" : "warning", "    ".concat(d.message)));
            }
            else {
                lines.push(theme_js_1.theme.fg(d.type === "error" ? "error" : "warning", "  ".concat(d.message)));
            }
        }
        return lines.join("\n");
    };
    InteractiveMode.prototype.showLoadedResources = function (options) {
        var _this = this;
        var _a, _b, _c, _d, _e;
        var showListing = (options === null || options === void 0 ? void 0 : options.force) || this.options.verbose || !this.settingsManager.getQuietStartup();
        var showDiagnostics = showListing || (options === null || options === void 0 ? void 0 : options.showDiagnosticsWhenQuiet) === true;
        if (!showListing && !showDiagnostics) {
            return;
        }
        var metadata = this.session.resourceLoader.getPathMetadata();
        var sectionHeader = function (name, color) {
            if (color === void 0) { color = "mdHeading"; }
            return theme_js_1.theme.fg(color, "[".concat(name, "]"));
        };
        var skillsResult = this.session.resourceLoader.getSkills();
        var promptsResult = this.session.resourceLoader.getPrompts();
        var themesResult = this.session.resourceLoader.getThemes();
        if (showListing) {
            var contextFiles = this.session.resourceLoader.getAgentsFiles().agentsFiles;
            if (contextFiles.length > 0) {
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                var contextList = contextFiles
                    .map(function (f) { return theme_js_1.theme.fg("dim", "  ".concat(_this.formatDisplayPath(f.path))); })
                    .join("\n");
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(sectionHeader("Context"), "\n").concat(contextList), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var skills = skillsResult.skills;
            if (skills.length > 0) {
                var skillPaths = skills.map(function (s) { return s.filePath; });
                var groups = this.buildScopeGroups(skillPaths, metadata);
                var skillList = this.formatScopeGroups(groups, {
                    formatPath: function (p) { return _this.formatDisplayPath(p); },
                    formatPackagePath: function (p, source) { return _this.getShortPath(p, source); },
                });
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(sectionHeader("Skills"), "\n").concat(skillList), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var templates = this.session.promptTemplates;
            if (templates.length > 0) {
                var templatePaths = templates.map(function (t) { return t.filePath; });
                var groups = this.buildScopeGroups(templatePaths, metadata);
                var templateByPath_1 = new Map(templates.map(function (t) { return [t.filePath, t]; }));
                var templateList = this.formatScopeGroups(groups, {
                    formatPath: function (p) {
                        var template = templateByPath_1.get(p);
                        return template ? "/".concat(template.name) : _this.formatDisplayPath(p);
                    },
                    formatPackagePath: function (p) {
                        var template = templateByPath_1.get(p);
                        return template ? "/".concat(template.name) : _this.formatDisplayPath(p);
                    },
                });
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(sectionHeader("Prompts"), "\n").concat(templateList), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var extensionPaths = (_a = options === null || options === void 0 ? void 0 : options.extensionPaths) !== null && _a !== void 0 ? _a : [];
            if (extensionPaths.length > 0) {
                var groups = this.buildScopeGroups(extensionPaths, metadata);
                var extList = this.formatScopeGroups(groups, {
                    formatPath: function (p) { return _this.formatDisplayPath(p); },
                    formatPackagePath: function (p, source) { return _this.getShortPath(p, source); },
                });
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(sectionHeader("Extensions", "mdHeading"), "\n").concat(extList), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            // Show loaded themes (excluding built-in)
            var loadedThemes = themesResult.themes;
            var customThemes = loadedThemes.filter(function (t) { return t.sourcePath; });
            if (customThemes.length > 0) {
                var themePaths = customThemes.map(function (t) { return t.sourcePath; });
                var groups = this.buildScopeGroups(themePaths, metadata);
                var themeList = this.formatScopeGroups(groups, {
                    formatPath: function (p) { return _this.formatDisplayPath(p); },
                    formatPackagePath: function (p, source) { return _this.getShortPath(p, source); },
                });
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(sectionHeader("Themes"), "\n").concat(themeList), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
        }
        if (showDiagnostics) {
            var skillDiagnostics = skillsResult.diagnostics;
            if (skillDiagnostics.length > 0) {
                var warningLines = this.formatDiagnostics(skillDiagnostics, metadata);
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("warning", "[Skill conflicts]"), "\n").concat(warningLines), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var promptDiagnostics = promptsResult.diagnostics;
            if (promptDiagnostics.length > 0) {
                var warningLines = this.formatDiagnostics(promptDiagnostics, metadata);
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("warning", "[Prompt conflicts]"), "\n").concat(warningLines), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var extensionDiagnostics = [];
            var extensionErrors = this.session.resourceLoader.getExtensions().errors;
            if (extensionErrors.length > 0) {
                for (var _i = 0, extensionErrors_1 = extensionErrors; _i < extensionErrors_1.length; _i++) {
                    var error = extensionErrors_1[_i];
                    extensionDiagnostics.push({ type: "error", message: error.error, path: error.path });
                }
            }
            var commandDiagnostics = (_c = (_b = this.session.extensionRunner) === null || _b === void 0 ? void 0 : _b.getCommandDiagnostics()) !== null && _c !== void 0 ? _c : [];
            extensionDiagnostics.push.apply(extensionDiagnostics, commandDiagnostics);
            var shortcutDiagnostics = (_e = (_d = this.session.extensionRunner) === null || _d === void 0 ? void 0 : _d.getShortcutDiagnostics()) !== null && _e !== void 0 ? _e : [];
            extensionDiagnostics.push.apply(extensionDiagnostics, shortcutDiagnostics);
            if (extensionDiagnostics.length > 0) {
                var warningLines = this.formatDiagnostics(extensionDiagnostics, metadata);
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("warning", "[Extension issues]"), "\n").concat(warningLines), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
            var themeDiagnostics = themesResult.diagnostics;
            if (themeDiagnostics.length > 0) {
                var warningLines = this.formatDiagnostics(themeDiagnostics, metadata);
                this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("warning", "[Theme conflicts]"), "\n").concat(warningLines), 0, 0));
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
            }
        }
    };
    /**
     * Initialize the extension system with TUI-based UI context.
     */
    InteractiveMode.prototype.initExtensions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var uiContext, extensionRunner;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        uiContext = this.createExtensionUIContext();
                        return [4 /*yield*/, this.session.bindExtensions({
                                uiContext: uiContext,
                                commandContextActions: {
                                    waitForIdle: function () { return _this.session.agent.waitForIdle(); },
                                    newSession: function (options) { return __awaiter(_this, void 0, void 0, function () {
                                        var success;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    if (this.loadingAnimation) {
                                                        this.loadingAnimation.stop();
                                                        this.loadingAnimation = undefined;
                                                    }
                                                    this.statusContainer.clear();
                                                    return [4 /*yield*/, this.session.newSession(options)];
                                                case 1:
                                                    success = _a.sent();
                                                    if (!success) {
                                                        return [2 /*return*/, { cancelled: true }];
                                                    }
                                                    // Clear UI state
                                                    this.chatContainer.clear();
                                                    this.pendingMessagesContainer.clear();
                                                    this.compactionQueuedMessages = [];
                                                    this.streamingComponent = undefined;
                                                    this.streamingMessage = undefined;
                                                    this.pendingTools.clear();
                                                    // Render any messages added via setup, or show empty session
                                                    this.renderInitialMessages();
                                                    this.ui.requestRender();
                                                    return [2 /*return*/, { cancelled: false }];
                                            }
                                        });
                                    }); },
                                    fork: function (entryId) { return __awaiter(_this, void 0, void 0, function () {
                                        var result;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.session.fork(entryId)];
                                                case 1:
                                                    result = _a.sent();
                                                    if (result.cancelled) {
                                                        return [2 /*return*/, { cancelled: true }];
                                                    }
                                                    this.chatContainer.clear();
                                                    this.renderInitialMessages();
                                                    this.editor.setText(result.selectedText);
                                                    this.showStatus("Forked to new session");
                                                    return [2 /*return*/, { cancelled: false }];
                                            }
                                        });
                                    }); },
                                    navigateTree: function (targetId, options) { return __awaiter(_this, void 0, void 0, function () {
                                        var result;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.session.navigateTree(targetId, {
                                                        summarize: options === null || options === void 0 ? void 0 : options.summarize,
                                                        customInstructions: options === null || options === void 0 ? void 0 : options.customInstructions,
                                                        replaceInstructions: options === null || options === void 0 ? void 0 : options.replaceInstructions,
                                                        label: options === null || options === void 0 ? void 0 : options.label,
                                                    })];
                                                case 1:
                                                    result = _a.sent();
                                                    if (result.cancelled) {
                                                        return [2 /*return*/, { cancelled: true }];
                                                    }
                                                    this.chatContainer.clear();
                                                    this.renderInitialMessages();
                                                    if (result.editorText && !this.editor.getText().trim()) {
                                                        this.editor.setText(result.editorText);
                                                    }
                                                    this.showStatus("Navigated to selected point");
                                                    return [2 /*return*/, { cancelled: false }];
                                            }
                                        });
                                    }); },
                                    switchSession: function (sessionPath) { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.handleResumeSession(sessionPath)];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/, { cancelled: false }];
                                            }
                                        });
                                    }); },
                                    reload: function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.handleReloadCommand()];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); },
                                },
                                shutdownHandler: function () {
                                    _this.shutdownRequested = true;
                                    if (!_this.session.isStreaming) {
                                        void _this.shutdown();
                                    }
                                },
                                onError: function (error) {
                                    _this.showExtensionError(error.extensionPath, error.error, error.stack);
                                },
                            })];
                    case 1:
                        _a.sent();
                        (0, theme_js_1.setRegisteredThemes)(this.session.resourceLoader.getThemes().themes);
                        this.setupAutocomplete(this.fdPath);
                        extensionRunner = this.session.extensionRunner;
                        if (!extensionRunner) {
                            this.showLoadedResources({ extensionPaths: [], force: false });
                            return [2 /*return*/];
                        }
                        this.setupExtensionShortcuts(extensionRunner);
                        this.showLoadedResources({ extensionPaths: extensionRunner.getExtensionPaths(), force: false });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get a registered tool definition by name (for custom rendering).
     */
    InteractiveMode.prototype.getRegisteredToolDefinition = function (toolName) {
        var _a, _b;
        var tools = (_b = (_a = this.session.extensionRunner) === null || _a === void 0 ? void 0 : _a.getAllRegisteredTools()) !== null && _b !== void 0 ? _b : [];
        var registeredTool = tools.find(function (t) { return t.definition.name === toolName; });
        return registeredTool === null || registeredTool === void 0 ? void 0 : registeredTool.definition;
    };
    /**
     * Set up keyboard shortcuts registered by extensions.
     */
    InteractiveMode.prototype.setupExtensionShortcuts = function (extensionRunner) {
        var _this = this;
        var shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
        if (shortcuts.size === 0)
            return;
        // Create a context for shortcut handlers
        var createContext = function () { return ({
            ui: _this.createExtensionUIContext(),
            hasUI: true,
            cwd: process.cwd(),
            sessionManager: _this.sessionManager,
            modelRegistry: _this.session.modelRegistry,
            model: _this.session.model,
            isIdle: function () { return !_this.session.isStreaming; },
            abort: function () { return _this.session.abort(); },
            hasPendingMessages: function () { return _this.session.pendingMessageCount > 0; },
            shutdown: function () {
                _this.shutdownRequested = true;
            },
            getContextUsage: function () { return _this.session.getContextUsage(); },
            compact: function (options) {
                void (function () { return __awaiter(_this, void 0, void 0, function () {
                    var result, error_4, err;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, this.executeCompaction(options === null || options === void 0 ? void 0 : options.customInstructions, false)];
                            case 1:
                                result = _c.sent();
                                if (result) {
                                    (_a = options === null || options === void 0 ? void 0 : options.onComplete) === null || _a === void 0 ? void 0 : _a.call(options, result);
                                }
                                return [3 /*break*/, 3];
                            case 2:
                                error_4 = _c.sent();
                                err = error_4 instanceof Error ? error_4 : new Error(String(error_4));
                                (_b = options === null || options === void 0 ? void 0 : options.onError) === null || _b === void 0 ? void 0 : _b.call(options, err);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); })();
            },
            getSystemPrompt: function () { return _this.session.systemPrompt; },
        }); };
        // Set up the extension shortcut handler on the default editor
        this.defaultEditor.onExtensionShortcut = function (data) {
            for (var _i = 0, shortcuts_1 = shortcuts; _i < shortcuts_1.length; _i++) {
                var _a = shortcuts_1[_i], shortcutStr = _a[0], shortcut = _a[1];
                // Cast to KeyId - extension shortcuts use the same format
                if ((0, pi_tui_1.matchesKey)(data, shortcutStr)) {
                    // Run handler async, don't block input
                    Promise.resolve(shortcut.handler(createContext())).catch(function (err) {
                        _this.showError("Shortcut handler error: ".concat(err instanceof Error ? err.message : String(err)));
                    });
                    return true;
                }
            }
            return false;
        };
    };
    /**
     * Set extension status text in the footer.
     */
    InteractiveMode.prototype.setExtensionStatus = function (key, text) {
        this.footerDataProvider.setExtensionStatus(key, text);
        this.ui.requestRender();
    };
    /**
     * Set an extension widget (string array or custom component).
     */
    InteractiveMode.prototype.setExtensionWidget = function (key, content, options) {
        var _a;
        var placement = (_a = options === null || options === void 0 ? void 0 : options.placement) !== null && _a !== void 0 ? _a : "aboveEditor";
        var removeExisting = function (map) {
            var existing = map.get(key);
            if (existing === null || existing === void 0 ? void 0 : existing.dispose)
                existing.dispose();
            map.delete(key);
        };
        removeExisting(this.extensionWidgetsAbove);
        removeExisting(this.extensionWidgetsBelow);
        if (content === undefined) {
            this.renderWidgets();
            return;
        }
        var component;
        if (Array.isArray(content)) {
            // Wrap string array in a Container with Text components
            var container = new pi_tui_1.Container();
            for (var _i = 0, _b = content.slice(0, InteractiveMode.MAX_WIDGET_LINES); _i < _b.length; _i++) {
                var line = _b[_i];
                container.addChild(new pi_tui_1.Text(line, 1, 0));
            }
            if (content.length > InteractiveMode.MAX_WIDGET_LINES) {
                container.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "... (widget truncated)"), 1, 0));
            }
            component = container;
        }
        else {
            // Factory function - create component
            component = content(this.ui, theme_js_1.theme);
        }
        var targetMap = placement === "belowEditor" ? this.extensionWidgetsBelow : this.extensionWidgetsAbove;
        targetMap.set(key, component);
        this.renderWidgets();
    };
    InteractiveMode.prototype.clearExtensionWidgets = function () {
        var _a, _b;
        for (var _i = 0, _c = this.extensionWidgetsAbove.values(); _i < _c.length; _i++) {
            var widget = _c[_i];
            (_a = widget.dispose) === null || _a === void 0 ? void 0 : _a.call(widget);
        }
        for (var _d = 0, _e = this.extensionWidgetsBelow.values(); _d < _e.length; _d++) {
            var widget = _e[_d];
            (_b = widget.dispose) === null || _b === void 0 ? void 0 : _b.call(widget);
        }
        this.extensionWidgetsAbove.clear();
        this.extensionWidgetsBelow.clear();
        this.renderWidgets();
    };
    InteractiveMode.prototype.resetExtensionUI = function () {
        if (this.extensionSelector) {
            this.hideExtensionSelector();
        }
        if (this.extensionInput) {
            this.hideExtensionInput();
        }
        if (this.extensionEditor) {
            this.hideExtensionEditor();
        }
        this.ui.hideOverlay();
        this.clearExtensionTerminalInputListeners();
        this.setExtensionFooter(undefined);
        this.setExtensionHeader(undefined);
        this.clearExtensionWidgets();
        this.footerDataProvider.clearExtensionStatuses();
        this.footer.invalidate();
        this.setCustomEditorComponent(undefined);
        this.defaultEditor.onExtensionShortcut = undefined;
        this.updateTerminalTitle();
        if (this.loadingAnimation) {
            this.loadingAnimation.setMessage("".concat(this.defaultWorkingMessage, " (").concat((0, keybinding_hints_js_1.appKey)(this.keybindings, "interrupt"), " to interrupt)"));
        }
    };
    /**
     * Render all extension widgets to the widget container.
     */
    InteractiveMode.prototype.renderWidgets = function () {
        if (!this.widgetContainerAbove || !this.widgetContainerBelow)
            return;
        this.renderWidgetContainer(this.widgetContainerAbove, this.extensionWidgetsAbove, true, true);
        this.renderWidgetContainer(this.widgetContainerBelow, this.extensionWidgetsBelow, false, false);
        this.ui.requestRender();
    };
    InteractiveMode.prototype.renderWidgetContainer = function (container, widgets, spacerWhenEmpty, leadingSpacer) {
        container.clear();
        if (widgets.size === 0) {
            if (spacerWhenEmpty) {
                container.addChild(new pi_tui_1.Spacer(1));
            }
            return;
        }
        if (leadingSpacer) {
            container.addChild(new pi_tui_1.Spacer(1));
        }
        for (var _i = 0, _a = widgets.values(); _i < _a.length; _i++) {
            var component = _a[_i];
            container.addChild(component);
        }
    };
    /**
     * Set a custom footer component, or restore the built-in footer.
     */
    InteractiveMode.prototype.setExtensionFooter = function (factory) {
        var _a;
        // Dispose existing custom footer
        if ((_a = this.customFooter) === null || _a === void 0 ? void 0 : _a.dispose) {
            this.customFooter.dispose();
        }
        // Remove current footer from UI
        if (this.customFooter) {
            this.ui.removeChild(this.customFooter);
        }
        else {
            this.ui.removeChild(this.footer);
        }
        if (factory) {
            // Create and add custom footer, passing the data provider
            this.customFooter = factory(this.ui, theme_js_1.theme, this.footerDataProvider);
            this.ui.addChild(this.customFooter);
        }
        else {
            // Restore built-in footer
            this.customFooter = undefined;
            this.ui.addChild(this.footer);
        }
        this.ui.requestRender();
    };
    /**
     * Set a custom header component, or restore the built-in header.
     */
    InteractiveMode.prototype.setExtensionHeader = function (factory) {
        var _a;
        // Header may not be initialized yet if called during early initialization
        if (!this.builtInHeader) {
            return;
        }
        // Dispose existing custom header
        if ((_a = this.customHeader) === null || _a === void 0 ? void 0 : _a.dispose) {
            this.customHeader.dispose();
        }
        // Find the index of the current header in the header container
        var currentHeader = this.customHeader || this.builtInHeader;
        var index = this.headerContainer.children.indexOf(currentHeader);
        if (factory) {
            // Create and add custom header
            this.customHeader = factory(this.ui, theme_js_1.theme);
            if (index !== -1) {
                this.headerContainer.children[index] = this.customHeader;
            }
            else {
                // If not found (e.g. builtInHeader was never added), add at the top
                this.headerContainer.children.unshift(this.customHeader);
            }
        }
        else {
            // Restore built-in header
            this.customHeader = undefined;
            if (index !== -1) {
                this.headerContainer.children[index] = this.builtInHeader;
            }
        }
        this.ui.requestRender();
    };
    InteractiveMode.prototype.addExtensionTerminalInputListener = function (handler) {
        var _this = this;
        var unsubscribe = this.ui.addInputListener(handler);
        this.extensionTerminalInputUnsubscribers.add(unsubscribe);
        return function () {
            unsubscribe();
            _this.extensionTerminalInputUnsubscribers.delete(unsubscribe);
        };
    };
    InteractiveMode.prototype.clearExtensionTerminalInputListeners = function () {
        for (var _i = 0, _a = this.extensionTerminalInputUnsubscribers; _i < _a.length; _i++) {
            var unsubscribe = _a[_i];
            unsubscribe();
        }
        this.extensionTerminalInputUnsubscribers.clear();
    };
    /**
     * Create the ExtensionUIContext for extensions.
     */
    InteractiveMode.prototype.createExtensionUIContext = function () {
        var _this = this;
        return {
            select: function (title, options, opts) { return _this.showExtensionSelector(title, options, opts); },
            confirm: function (title, message, opts) { return _this.showExtensionConfirm(title, message, opts); },
            input: function (title, placeholder, opts) { return _this.showExtensionInput(title, placeholder, opts); },
            notify: function (message, type) { return _this.showExtensionNotify(message, type); },
            onTerminalInput: function (handler) { return _this.addExtensionTerminalInputListener(handler); },
            setStatus: function (key, text) { return _this.setExtensionStatus(key, text); },
            setWorkingMessage: function (message) {
                if (_this.loadingAnimation) {
                    if (message) {
                        _this.loadingAnimation.setMessage(message);
                    }
                    else {
                        _this.loadingAnimation.setMessage("".concat(_this.defaultWorkingMessage, " (").concat((0, keybinding_hints_js_1.appKey)(_this.keybindings, "interrupt"), " to interrupt)"));
                    }
                }
                else {
                    // Queue message for when loadingAnimation is created (handles agent_start race)
                    _this.pendingWorkingMessage = message;
                }
            },
            setWidget: function (key, content, options) { return _this.setExtensionWidget(key, content, options); },
            setFooter: function (factory) { return _this.setExtensionFooter(factory); },
            setHeader: function (factory) { return _this.setExtensionHeader(factory); },
            setTitle: function (title) { return _this.ui.terminal.setTitle(title); },
            custom: function (factory, options) { return _this.showExtensionCustom(factory, options); },
            pasteToEditor: function (text) { return _this.editor.handleInput("\u001B[200~".concat(text, "\u001B[201~")); },
            setEditorText: function (text) { return _this.editor.setText(text); },
            getEditorText: function () { var _a, _b, _c; return (_c = (_b = (_a = _this.editor).getExpandedText) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : _this.editor.getText(); },
            editor: function (title, prefill) { return _this.showExtensionEditor(title, prefill); },
            setEditorComponent: function (factory) { return _this.setCustomEditorComponent(factory); },
            get theme() {
                return theme_js_1.theme;
            },
            getAllThemes: function () { return (0, theme_js_1.getAvailableThemesWithPaths)(); },
            getTheme: function (name) { return (0, theme_js_1.getThemeByName)(name); },
            setTheme: function (themeOrName) {
                if (themeOrName instanceof theme_js_1.Theme) {
                    (0, theme_js_1.setThemeInstance)(themeOrName);
                    _this.ui.requestRender();
                    return { success: true };
                }
                var result = (0, theme_js_1.setTheme)(themeOrName, true);
                if (result.success) {
                    if (_this.settingsManager.getTheme() !== themeOrName) {
                        _this.settingsManager.setTheme(themeOrName);
                    }
                    _this.ui.requestRender();
                }
                return result;
            },
            getToolsExpanded: function () { return _this.toolOutputExpanded; },
            setToolsExpanded: function (expanded) { return _this.setToolsExpanded(expanded); },
        };
    };
    /**
     * Show a selector for extensions.
     */
    InteractiveMode.prototype.showExtensionSelector = function (title, options, opts) {
        var _this = this;
        return new Promise(function (resolve) {
            var _a, _b;
            if ((_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
                resolve(undefined);
                return;
            }
            var onAbort = function () {
                _this.hideExtensionSelector();
                resolve(undefined);
            };
            (_b = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _b === void 0 ? void 0 : _b.addEventListener("abort", onAbort, { once: true });
            _this.extensionSelector = new extension_selector_js_1.ExtensionSelectorComponent(title, options, function (option) {
                var _a;
                (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", onAbort);
                _this.hideExtensionSelector();
                resolve(option);
            }, function () {
                var _a;
                (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", onAbort);
                _this.hideExtensionSelector();
                resolve(undefined);
            }, { tui: _this.ui, timeout: opts === null || opts === void 0 ? void 0 : opts.timeout });
            _this.editorContainer.clear();
            _this.editorContainer.addChild(_this.extensionSelector);
            _this.ui.setFocus(_this.extensionSelector);
            _this.ui.requestRender();
        });
    };
    /**
     * Hide the extension selector.
     */
    InteractiveMode.prototype.hideExtensionSelector = function () {
        var _a;
        (_a = this.extensionSelector) === null || _a === void 0 ? void 0 : _a.dispose();
        this.editorContainer.clear();
        this.editorContainer.addChild(this.editor);
        this.extensionSelector = undefined;
        this.ui.setFocus(this.editor);
        this.ui.requestRender();
    };
    /**
     * Show a confirmation dialog for extensions.
     */
    InteractiveMode.prototype.showExtensionConfirm = function (title, message, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.showExtensionSelector("".concat(title, "\n").concat(message), ["Yes", "No"], opts)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result === "Yes"];
                }
            });
        });
    };
    /**
     * Show a text input for extensions.
     */
    InteractiveMode.prototype.showExtensionInput = function (title, placeholder, opts) {
        var _this = this;
        return new Promise(function (resolve) {
            var _a, _b;
            if ((_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
                resolve(undefined);
                return;
            }
            var onAbort = function () {
                _this.hideExtensionInput();
                resolve(undefined);
            };
            (_b = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _b === void 0 ? void 0 : _b.addEventListener("abort", onAbort, { once: true });
            _this.extensionInput = new extension_input_js_1.ExtensionInputComponent(title, placeholder, function (value) {
                var _a;
                (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", onAbort);
                _this.hideExtensionInput();
                resolve(value);
            }, function () {
                var _a;
                (_a = opts === null || opts === void 0 ? void 0 : opts.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", onAbort);
                _this.hideExtensionInput();
                resolve(undefined);
            }, { tui: _this.ui, timeout: opts === null || opts === void 0 ? void 0 : opts.timeout });
            _this.editorContainer.clear();
            _this.editorContainer.addChild(_this.extensionInput);
            _this.ui.setFocus(_this.extensionInput);
            _this.ui.requestRender();
        });
    };
    /**
     * Hide the extension input.
     */
    InteractiveMode.prototype.hideExtensionInput = function () {
        var _a;
        (_a = this.extensionInput) === null || _a === void 0 ? void 0 : _a.dispose();
        this.editorContainer.clear();
        this.editorContainer.addChild(this.editor);
        this.extensionInput = undefined;
        this.ui.setFocus(this.editor);
        this.ui.requestRender();
    };
    /**
     * Show a multi-line editor for extensions (with Ctrl+G support).
     */
    InteractiveMode.prototype.showExtensionEditor = function (title, prefill) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.extensionEditor = new extension_editor_js_1.ExtensionEditorComponent(_this.ui, _this.keybindings, title, prefill, function (value) {
                _this.hideExtensionEditor();
                resolve(value);
            }, function () {
                _this.hideExtensionEditor();
                resolve(undefined);
            });
            _this.editorContainer.clear();
            _this.editorContainer.addChild(_this.extensionEditor);
            _this.ui.setFocus(_this.extensionEditor);
            _this.ui.requestRender();
        });
    };
    /**
     * Hide the extension editor.
     */
    InteractiveMode.prototype.hideExtensionEditor = function () {
        this.editorContainer.clear();
        this.editorContainer.addChild(this.editor);
        this.extensionEditor = undefined;
        this.ui.setFocus(this.editor);
        this.ui.requestRender();
    };
    /**
     * Set a custom editor component from an extension.
     * Pass undefined to restore the default editor.
     */
    InteractiveMode.prototype.setCustomEditorComponent = function (factory) {
        var _this = this;
        // Save text from current editor before switching
        var currentText = this.editor.getText();
        this.editorContainer.clear();
        if (factory) {
            // Create the custom editor with tui, theme, and keybindings
            var newEditor = factory(this.ui, (0, theme_js_1.getEditorTheme)(), this.keybindings);
            // Wire up callbacks from the default editor
            newEditor.onSubmit = this.defaultEditor.onSubmit;
            newEditor.onChange = this.defaultEditor.onChange;
            // Copy text from previous editor
            newEditor.setText(currentText);
            // Copy appearance settings if supported
            if (newEditor.borderColor !== undefined) {
                newEditor.borderColor = this.defaultEditor.borderColor;
            }
            if (newEditor.setPaddingX !== undefined) {
                newEditor.setPaddingX(this.defaultEditor.getPaddingX());
            }
            // Set autocomplete if supported
            if (newEditor.setAutocompleteProvider && this.autocompleteProvider) {
                newEditor.setAutocompleteProvider(this.autocompleteProvider);
            }
            // If extending CustomEditor, copy app-level handlers
            // Use duck typing since instanceof fails across jiti module boundaries
            var customEditor = newEditor;
            if ("actionHandlers" in customEditor && customEditor.actionHandlers instanceof Map) {
                if (!customEditor.onEscape) {
                    customEditor.onEscape = function () { var _a, _b; return (_b = (_a = _this.defaultEditor).onEscape) === null || _b === void 0 ? void 0 : _b.call(_a); };
                }
                if (!customEditor.onCtrlD) {
                    customEditor.onCtrlD = function () { var _a, _b; return (_b = (_a = _this.defaultEditor).onCtrlD) === null || _b === void 0 ? void 0 : _b.call(_a); };
                }
                if (!customEditor.onPasteImage) {
                    customEditor.onPasteImage = function () { var _a, _b; return (_b = (_a = _this.defaultEditor).onPasteImage) === null || _b === void 0 ? void 0 : _b.call(_a); };
                }
                if (!customEditor.onExtensionShortcut) {
                    customEditor.onExtensionShortcut = function (data) { var _a, _b; return (_b = (_a = _this.defaultEditor).onExtensionShortcut) === null || _b === void 0 ? void 0 : _b.call(_a, data); };
                }
                // Copy action handlers (clear, suspend, model switching, etc.)
                for (var _i = 0, _a = this.defaultEditor.actionHandlers; _i < _a.length; _i++) {
                    var _b = _a[_i], action = _b[0], handler = _b[1];
                    customEditor.actionHandlers.set(action, handler);
                }
            }
            this.editor = newEditor;
        }
        else {
            // Restore default editor with text from custom editor
            this.defaultEditor.setText(currentText);
            this.editor = this.defaultEditor;
        }
        this.editorContainer.addChild(this.editor);
        this.ui.setFocus(this.editor);
        this.ui.requestRender();
    };
    /**
     * Show a notification for extensions.
     */
    InteractiveMode.prototype.showExtensionNotify = function (message, type) {
        if (type === "error") {
            this.showError(message);
        }
        else if (type === "warning") {
            this.showWarning(message);
        }
        else {
            this.showStatus(message);
        }
    };
    /** Show a custom component with keyboard focus. Overlay mode renders on top of existing content. */
    InteractiveMode.prototype.showExtensionCustom = function (factory, options) {
        return __awaiter(this, void 0, void 0, function () {
            var savedText, isOverlay, restoreEditor;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                savedText = this.editor.getText();
                isOverlay = (_a = options === null || options === void 0 ? void 0 : options.overlay) !== null && _a !== void 0 ? _a : false;
                restoreEditor = function () {
                    _this.editorContainer.clear();
                    _this.editorContainer.addChild(_this.editor);
                    _this.editor.setText(savedText);
                    _this.ui.setFocus(_this.editor);
                    _this.ui.requestRender();
                };
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var component;
                        var closed = false;
                        var close = function (result) {
                            var _a;
                            if (closed)
                                return;
                            closed = true;
                            if (isOverlay)
                                _this.ui.hideOverlay();
                            else
                                restoreEditor();
                            // Note: both branches above already call requestRender
                            resolve(result);
                            try {
                                (_a = component === null || component === void 0 ? void 0 : component.dispose) === null || _a === void 0 ? void 0 : _a.call(component);
                            }
                            catch (_b) {
                                /* ignore dispose errors */
                            }
                        };
                        Promise.resolve(factory(_this.ui, theme_js_1.theme, _this.keybindings, close))
                            .then(function (c) {
                            var _a;
                            if (closed)
                                return;
                            component = c;
                            if (isOverlay) {
                                // Resolve overlay options - can be static or dynamic function
                                var resolveOptions = function () {
                                    if (options === null || options === void 0 ? void 0 : options.overlayOptions) {
                                        var opts = typeof options.overlayOptions === "function"
                                            ? options.overlayOptions()
                                            : options.overlayOptions;
                                        return opts;
                                    }
                                    // Fallback: use component's width property if available
                                    var w = component.width;
                                    return w ? { width: w } : undefined;
                                };
                                var handle = _this.ui.showOverlay(component, resolveOptions());
                                // Expose handle to caller for visibility control
                                (_a = options === null || options === void 0 ? void 0 : options.onHandle) === null || _a === void 0 ? void 0 : _a.call(options, handle);
                            }
                            else {
                                _this.editorContainer.clear();
                                _this.editorContainer.addChild(component);
                                _this.ui.setFocus(component);
                                _this.ui.requestRender();
                            }
                        })
                            .catch(function (err) {
                            if (closed)
                                return;
                            if (!isOverlay)
                                restoreEditor();
                            reject(err);
                        });
                    })];
            });
        });
    };
    /**
     * Show an extension error in the UI.
     */
    InteractiveMode.prototype.showExtensionError = function (extensionPath, error, stack) {
        var errorMsg = "Extension \"".concat(extensionPath, "\" error: ").concat(error);
        var errorText = new pi_tui_1.Text(theme_js_1.theme.fg("error", errorMsg), 1, 0);
        this.chatContainer.addChild(errorText);
        if (stack) {
            // Show stack trace in dim color, indented
            var stackLines = stack
                .split("\n")
                .slice(1) // Skip first line (duplicates error message)
                .map(function (line) { return theme_js_1.theme.fg("dim", "  ".concat(line.trim())); })
                .join("\n");
            if (stackLines) {
                this.chatContainer.addChild(new pi_tui_1.Text(stackLines, 1, 0));
            }
        }
        this.ui.requestRender();
    };
    // =========================================================================
    // Key Handlers
    // =========================================================================
    InteractiveMode.prototype.setupKeyHandlers = function () {
        var _this = this;
        // Set up handlers on defaultEditor - they use this.editor for text access
        // so they work correctly regardless of which editor is active
        this.defaultEditor.onEscape = function () {
            if (_this.loadingAnimation) {
                _this.restoreQueuedMessagesToEditor({ abort: true });
            }
            else if (_this.session.isBashRunning) {
                _this.session.abortBash();
            }
            else if (_this.isBashMode) {
                _this.editor.setText("");
                _this.isBashMode = false;
                _this.updateEditorBorderColor();
            }
            else if (!_this.editor.getText().trim()) {
                // Double-escape with empty editor triggers /tree, /fork, or nothing based on setting
                var action = _this.settingsManager.getDoubleEscapeAction();
                if (action !== "none") {
                    var now = Date.now();
                    if (now - _this.lastEscapeTime < 500) {
                        if (action === "tree") {
                            _this.showTreeSelector();
                        }
                        else {
                            _this.showUserMessageSelector();
                        }
                        _this.lastEscapeTime = 0;
                    }
                    else {
                        _this.lastEscapeTime = now;
                    }
                }
            }
        };
        // Register app action handlers
        this.defaultEditor.onAction("clear", function () { return _this.handleCtrlC(); });
        this.defaultEditor.onCtrlD = function () { return _this.handleCtrlD(); };
        this.defaultEditor.onAction("suspend", function () { return _this.handleCtrlZ(); });
        this.defaultEditor.onAction("cycleThinkingLevel", function () { return _this.cycleThinkingLevel(); });
        this.defaultEditor.onAction("cycleModelForward", function () { return _this.cycleModel("forward"); });
        this.defaultEditor.onAction("cycleModelBackward", function () { return _this.cycleModel("backward"); });
        // Global debug handler on TUI (works regardless of focus)
        this.ui.onDebug = function () { return _this.handleDebugCommand(); };
        this.defaultEditor.onAction("selectModel", function () { return _this.showModelSelector(); });
        this.defaultEditor.onAction("expandTools", function () { return _this.toggleToolOutputExpansion(); });
        this.defaultEditor.onAction("toggleThinking", function () { return _this.toggleThinkingBlockVisibility(); });
        this.defaultEditor.onAction("externalEditor", function () { return _this.openExternalEditor(); });
        this.defaultEditor.onAction("followUp", function () { return _this.handleFollowUp(); });
        this.defaultEditor.onAction("dequeue", function () { return _this.handleDequeue(); });
        this.defaultEditor.onAction("newSession", function () { return _this.handleClearCommand(); });
        this.defaultEditor.onAction("tree", function () { return _this.showTreeSelector(); });
        this.defaultEditor.onAction("fork", function () { return _this.showUserMessageSelector(); });
        this.defaultEditor.onAction("resume", function () { return _this.showSessionSelector(); });
        this.defaultEditor.onChange = function (text) {
            var wasBashMode = _this.isBashMode;
            _this.isBashMode = text.trimStart().startsWith("!");
            if (wasBashMode !== _this.isBashMode) {
                _this.updateEditorBorderColor();
            }
        };
        // Handle clipboard image paste (triggered on Ctrl+V)
        this.defaultEditor.onPasteImage = function () {
            _this.handleClipboardImagePaste();
        };
    };
    InteractiveMode.prototype.handleClipboardImagePaste = function () {
        return __awaiter(this, void 0, void 0, function () {
            var image, tmpDir, ext, fileName, filePath, _a;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, clipboard_image_js_1.readClipboardImage)()];
                    case 1:
                        image = _e.sent();
                        if (!image) {
                            return [2 /*return*/];
                        }
                        tmpDir = os.tmpdir();
                        ext = (_b = (0, clipboard_image_js_1.extensionForImageMimeType)(image.mimeType)) !== null && _b !== void 0 ? _b : "png";
                        fileName = "pi-clipboard-".concat(crypto.randomUUID(), ".").concat(ext);
                        filePath = path.join(tmpDir, fileName);
                        fs.writeFileSync(filePath, Buffer.from(image.bytes));
                        // Insert file path directly
                        (_d = (_c = this.editor).insertTextAtCursor) === null || _d === void 0 ? void 0 : _d.call(_c, filePath);
                        this.ui.requestRender();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _e.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.setupEditorSubmitHandler = function () {
        var _this = this;
        this.defaultEditor.onSubmit = function (text) { return __awaiter(_this, void 0, void 0, function () {
            var searchTerm, customInstructions, isExcluded, command;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        text = text.trim();
                        if (!text)
                            return [2 /*return*/];
                        // Handle commands
                        if (text === "/settings") {
                            this.showSettingsSelector();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (!(text === "/scoped-models")) return [3 /*break*/, 2];
                        this.editor.setText("");
                        return [4 /*yield*/, this.showModelsSelector()];
                    case 1:
                        _j.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(text === "/model" || text.startsWith("/model "))) return [3 /*break*/, 4];
                        searchTerm = text.startsWith("/model ") ? text.slice(7).trim() : undefined;
                        this.editor.setText("");
                        return [4 /*yield*/, this.handleModelCommand(searchTerm)];
                    case 3:
                        _j.sent();
                        return [2 /*return*/];
                    case 4:
                        if (!text.startsWith("/export")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.handleExportCommand(text)];
                    case 5:
                        _j.sent();
                        this.editor.setText("");
                        return [2 /*return*/];
                    case 6:
                        if (!(text === "/share")) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.handleShareCommand()];
                    case 7:
                        _j.sent();
                        this.editor.setText("");
                        return [2 /*return*/];
                    case 8:
                        if (text === "/copy") {
                            this.handleCopyCommand();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/name" || text.startsWith("/name ")) {
                            this.handleNameCommand(text);
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/session") {
                            this.handleSessionCommand();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/changelog") {
                            this.handleChangelogCommand();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/hotkeys") {
                            this.handleHotkeysCommand();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/fork") {
                            this.showUserMessageSelector();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/tree") {
                            this.showTreeSelector();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/login") {
                            this.showOAuthSelector("login");
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/logout") {
                            this.showOAuthSelector("logout");
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (!(text === "/new")) return [3 /*break*/, 10];
                        this.editor.setText("");
                        return [4 /*yield*/, this.handleClearCommand()];
                    case 9:
                        _j.sent();
                        return [2 /*return*/];
                    case 10:
                        if (!(text === "/compact" || text.startsWith("/compact "))) return [3 /*break*/, 12];
                        customInstructions = text.startsWith("/compact ") ? text.slice(9).trim() : undefined;
                        this.editor.setText("");
                        return [4 /*yield*/, this.handleCompactCommand(customInstructions)];
                    case 11:
                        _j.sent();
                        return [2 /*return*/];
                    case 12:
                        if (!(text === "/reload")) return [3 /*break*/, 14];
                        this.editor.setText("");
                        return [4 /*yield*/, this.handleReloadCommand()];
                    case 13:
                        _j.sent();
                        return [2 /*return*/];
                    case 14:
                        if (text === "/debug") {
                            this.handleDebugCommand();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/arminsayshi") {
                            this.handleArminSaysHi();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (text === "/resume") {
                            this.showSessionSelector();
                            this.editor.setText("");
                            return [2 /*return*/];
                        }
                        if (!(text === "/quit")) return [3 /*break*/, 16];
                        this.editor.setText("");
                        return [4 /*yield*/, this.shutdown()];
                    case 15:
                        _j.sent();
                        return [2 /*return*/];
                    case 16:
                        if (!text.startsWith("!")) return [3 /*break*/, 18];
                        isExcluded = text.startsWith("!!");
                        command = isExcluded ? text.slice(2).trim() : text.slice(1).trim();
                        if (!command) return [3 /*break*/, 18];
                        if (this.session.isBashRunning) {
                            this.showWarning("A bash command is already running. Press Esc to cancel it first.");
                            this.editor.setText(text);
                            return [2 /*return*/];
                        }
                        (_b = (_a = this.editor).addToHistory) === null || _b === void 0 ? void 0 : _b.call(_a, text);
                        return [4 /*yield*/, this.handleBashCommand(command, isExcluded)];
                    case 17:
                        _j.sent();
                        this.isBashMode = false;
                        this.updateEditorBorderColor();
                        return [2 /*return*/];
                    case 18:
                        if (!this.session.isCompacting) return [3 /*break*/, 22];
                        if (!this.isExtensionCommand(text)) return [3 /*break*/, 20];
                        (_d = (_c = this.editor).addToHistory) === null || _d === void 0 ? void 0 : _d.call(_c, text);
                        this.editor.setText("");
                        return [4 /*yield*/, this.session.prompt(text)];
                    case 19:
                        _j.sent();
                        return [3 /*break*/, 21];
                    case 20:
                        this.queueCompactionMessage(text, "steer");
                        _j.label = 21;
                    case 21: return [2 /*return*/];
                    case 22:
                        if (!this.session.isStreaming) return [3 /*break*/, 24];
                        (_f = (_e = this.editor).addToHistory) === null || _f === void 0 ? void 0 : _f.call(_e, text);
                        this.editor.setText("");
                        return [4 /*yield*/, this.session.prompt(text, { streamingBehavior: "steer" })];
                    case 23:
                        _j.sent();
                        this.updatePendingMessagesDisplay();
                        this.ui.requestRender();
                        return [2 /*return*/];
                    case 24:
                        // Normal message submission
                        // First, move any pending bash components to chat
                        this.flushPendingBashComponents();
                        if (this.onInputCallback) {
                            this.onInputCallback(text);
                        }
                        (_h = (_g = this.editor).addToHistory) === null || _h === void 0 ? void 0 : _h.call(_g, text);
                        return [2 /*return*/];
                }
            });
        }); };
    };
    InteractiveMode.prototype.subscribeToAgent = function () {
        var _this = this;
        this.unsubscribe = this.session.subscribe(function (event) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.handleEvent(event)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    InteractiveMode.prototype.handleEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _i, _b, content, component, component, errorMessage, retryAttempt, _c, _d, _e, component, _f, _g, _h, component, component, component, component, reasonText, delaySeconds;
            var _this = this;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.init()];
                    case 1:
                        _j.sent();
                        _j.label = 2;
                    case 2:
                        this.footer.invalidate();
                        _a = event.type;
                        switch (_a) {
                            case "agent_start": return [3 /*break*/, 3];
                            case "message_start": return [3 /*break*/, 4];
                            case "message_update": return [3 /*break*/, 5];
                            case "message_end": return [3 /*break*/, 6];
                            case "tool_execution_start": return [3 /*break*/, 7];
                            case "tool_execution_update": return [3 /*break*/, 8];
                            case "tool_execution_end": return [3 /*break*/, 9];
                            case "agent_end": return [3 /*break*/, 10];
                            case "auto_compaction_start": return [3 /*break*/, 12];
                            case "auto_compaction_end": return [3 /*break*/, 13];
                            case "auto_retry_start": return [3 /*break*/, 14];
                            case "auto_retry_end": return [3 /*break*/, 15];
                        }
                        return [3 /*break*/, 16];
                    case 3:
                        // Restore main escape handler if retry handler is still active
                        // (retry success event fires later, but we need main handler now)
                        if (this.retryEscapeHandler) {
                            this.defaultEditor.onEscape = this.retryEscapeHandler;
                            this.retryEscapeHandler = undefined;
                        }
                        if (this.retryLoader) {
                            this.retryLoader.stop();
                            this.retryLoader = undefined;
                        }
                        if (this.loadingAnimation) {
                            this.loadingAnimation.stop();
                        }
                        this.statusContainer.clear();
                        this.loadingAnimation = new pi_tui_1.Loader(this.ui, function (spinner) { return theme_js_1.theme.fg("accent", spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, this.defaultWorkingMessage);
                        this.statusContainer.addChild(this.loadingAnimation);
                        // Apply any pending working message queued before loader existed
                        if (this.pendingWorkingMessage !== undefined) {
                            if (this.pendingWorkingMessage) {
                                this.loadingAnimation.setMessage(this.pendingWorkingMessage);
                            }
                            this.pendingWorkingMessage = undefined;
                        }
                        this.ui.requestRender();
                        return [3 /*break*/, 16];
                    case 4:
                        if (event.message.role === "custom") {
                            this.addMessageToChat(event.message);
                            this.ui.requestRender();
                        }
                        else if (event.message.role === "user") {
                            this.addMessageToChat(event.message);
                            this.updatePendingMessagesDisplay();
                            this.ui.requestRender();
                        }
                        else if (event.message.role === "assistant") {
                            this.streamingComponent = new assistant_message_js_1.AssistantMessageComponent(undefined, this.hideThinkingBlock, this.getMarkdownThemeWithSettings());
                            this.streamingMessage = event.message;
                            this.chatContainer.addChild(this.streamingComponent);
                            this.streamingComponent.updateContent(this.streamingMessage);
                            this.ui.requestRender();
                        }
                        return [3 /*break*/, 16];
                    case 5:
                        if (this.streamingComponent && event.message.role === "assistant") {
                            this.streamingMessage = event.message;
                            this.streamingComponent.updateContent(this.streamingMessage);
                            for (_i = 0, _b = this.streamingMessage.content; _i < _b.length; _i++) {
                                content = _b[_i];
                                if (content.type === "toolCall") {
                                    if (!this.pendingTools.has(content.id)) {
                                        component = new tool_execution_js_1.ToolExecutionComponent(content.name, content.arguments, {
                                            showImages: this.settingsManager.getShowImages(),
                                        }, this.getRegisteredToolDefinition(content.name), this.ui);
                                        component.setExpanded(this.toolOutputExpanded);
                                        this.chatContainer.addChild(component);
                                        this.pendingTools.set(content.id, component);
                                    }
                                    else {
                                        component = this.pendingTools.get(content.id);
                                        if (component) {
                                            component.updateArgs(content.arguments);
                                        }
                                    }
                                }
                            }
                            this.ui.requestRender();
                        }
                        return [3 /*break*/, 16];
                    case 6:
                        if (event.message.role === "user")
                            return [3 /*break*/, 16];
                        if (this.streamingComponent && event.message.role === "assistant") {
                            this.streamingMessage = event.message;
                            errorMessage = void 0;
                            if (this.streamingMessage.stopReason === "aborted") {
                                retryAttempt = this.session.retryAttempt;
                                errorMessage =
                                    retryAttempt > 0
                                        ? "Aborted after ".concat(retryAttempt, " retry attempt").concat(retryAttempt > 1 ? "s" : "")
                                        : "Operation aborted";
                                this.streamingMessage.errorMessage = errorMessage;
                            }
                            this.streamingComponent.updateContent(this.streamingMessage);
                            if (this.streamingMessage.stopReason === "aborted" || this.streamingMessage.stopReason === "error") {
                                if (!errorMessage) {
                                    errorMessage = this.streamingMessage.errorMessage || "Error";
                                }
                                for (_c = 0, _d = this.pendingTools.entries(); _c < _d.length; _c++) {
                                    _e = _d[_c], component = _e[1];
                                    component.updateResult({
                                        content: [{ type: "text", text: errorMessage }],
                                        isError: true,
                                    });
                                }
                                this.pendingTools.clear();
                            }
                            else {
                                // Args are now complete - trigger diff computation for edit tools
                                for (_f = 0, _g = this.pendingTools.entries(); _f < _g.length; _f++) {
                                    _h = _g[_f], component = _h[1];
                                    component.setArgsComplete();
                                }
                            }
                            this.streamingComponent = undefined;
                            this.streamingMessage = undefined;
                            this.footer.invalidate();
                        }
                        this.ui.requestRender();
                        return [3 /*break*/, 16];
                    case 7:
                        {
                            if (!this.pendingTools.has(event.toolCallId)) {
                                component = new tool_execution_js_1.ToolExecutionComponent(event.toolName, event.args, {
                                    showImages: this.settingsManager.getShowImages(),
                                }, this.getRegisteredToolDefinition(event.toolName), this.ui);
                                component.setExpanded(this.toolOutputExpanded);
                                this.chatContainer.addChild(component);
                                this.pendingTools.set(event.toolCallId, component);
                                this.ui.requestRender();
                            }
                            return [3 /*break*/, 16];
                        }
                        _j.label = 8;
                    case 8:
                        {
                            component = this.pendingTools.get(event.toolCallId);
                            if (component) {
                                component.updateResult(__assign(__assign({}, event.partialResult), { isError: false }), true);
                                this.ui.requestRender();
                            }
                            return [3 /*break*/, 16];
                        }
                        _j.label = 9;
                    case 9:
                        {
                            component = this.pendingTools.get(event.toolCallId);
                            if (component) {
                                component.updateResult(__assign(__assign({}, event.result), { isError: event.isError }));
                                this.pendingTools.delete(event.toolCallId);
                                this.ui.requestRender();
                            }
                            return [3 /*break*/, 16];
                        }
                        _j.label = 10;
                    case 10:
                        if (this.loadingAnimation) {
                            this.loadingAnimation.stop();
                            this.loadingAnimation = undefined;
                            this.statusContainer.clear();
                        }
                        if (this.streamingComponent) {
                            this.chatContainer.removeChild(this.streamingComponent);
                            this.streamingComponent = undefined;
                            this.streamingMessage = undefined;
                        }
                        this.pendingTools.clear();
                        return [4 /*yield*/, this.checkShutdownRequested()];
                    case 11:
                        _j.sent();
                        this.ui.requestRender();
                        return [3 /*break*/, 16];
                    case 12:
                        {
                            // Keep editor active; submissions are queued during compaction.
                            // Set up escape to abort auto-compaction
                            this.autoCompactionEscapeHandler = this.defaultEditor.onEscape;
                            this.defaultEditor.onEscape = function () {
                                _this.session.abortCompaction();
                            };
                            // Show compacting indicator with reason
                            this.statusContainer.clear();
                            reasonText = event.reason === "overflow" ? "Context overflow detected, " : "";
                            this.autoCompactionLoader = new pi_tui_1.Loader(this.ui, function (spinner) { return theme_js_1.theme.fg("accent", spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, "".concat(reasonText, "Auto-compacting... (").concat((0, keybinding_hints_js_1.appKey)(this.keybindings, "interrupt"), " to cancel)"));
                            this.statusContainer.addChild(this.autoCompactionLoader);
                            this.ui.requestRender();
                            return [3 /*break*/, 16];
                        }
                        _j.label = 13;
                    case 13:
                        {
                            // Restore escape handler
                            if (this.autoCompactionEscapeHandler) {
                                this.defaultEditor.onEscape = this.autoCompactionEscapeHandler;
                                this.autoCompactionEscapeHandler = undefined;
                            }
                            // Stop loader
                            if (this.autoCompactionLoader) {
                                this.autoCompactionLoader.stop();
                                this.autoCompactionLoader = undefined;
                                this.statusContainer.clear();
                            }
                            // Handle result
                            if (event.aborted) {
                                this.showStatus("Auto-compaction cancelled");
                            }
                            else if (event.result) {
                                // Rebuild chat to show compacted state
                                this.chatContainer.clear();
                                this.rebuildChatFromMessages();
                                // Add compaction component at bottom so user sees it without scrolling
                                this.addMessageToChat({
                                    role: "compactionSummary",
                                    tokensBefore: event.result.tokensBefore,
                                    summary: event.result.summary,
                                    timestamp: Date.now(),
                                });
                                this.footer.invalidate();
                            }
                            else if (event.errorMessage) {
                                // Compaction failed (e.g., quota exceeded, API error)
                                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                                this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("error", event.errorMessage), 1, 0));
                            }
                            void this.flushCompactionQueue({ willRetry: event.willRetry });
                            this.ui.requestRender();
                            return [3 /*break*/, 16];
                        }
                        _j.label = 14;
                    case 14:
                        {
                            // Set up escape to abort retry
                            this.retryEscapeHandler = this.defaultEditor.onEscape;
                            this.defaultEditor.onEscape = function () {
                                _this.session.abortRetry();
                            };
                            // Show retry indicator
                            this.statusContainer.clear();
                            delaySeconds = Math.round(event.delayMs / 1000);
                            this.retryLoader = new pi_tui_1.Loader(this.ui, function (spinner) { return theme_js_1.theme.fg("warning", spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, "Retrying (".concat(event.attempt, "/").concat(event.maxAttempts, ") in ").concat(delaySeconds, "s... (").concat((0, keybinding_hints_js_1.appKey)(this.keybindings, "interrupt"), " to cancel)"));
                            this.statusContainer.addChild(this.retryLoader);
                            this.ui.requestRender();
                            return [3 /*break*/, 16];
                        }
                        _j.label = 15;
                    case 15:
                        {
                            // Restore escape handler
                            if (this.retryEscapeHandler) {
                                this.defaultEditor.onEscape = this.retryEscapeHandler;
                                this.retryEscapeHandler = undefined;
                            }
                            // Stop loader
                            if (this.retryLoader) {
                                this.retryLoader.stop();
                                this.retryLoader = undefined;
                                this.statusContainer.clear();
                            }
                            // Show error only on final failure (success shows normal response)
                            if (!event.success) {
                                this.showError("Retry failed after ".concat(event.attempt, " attempts: ").concat(event.finalError || "Unknown error"));
                            }
                            this.ui.requestRender();
                            return [3 /*break*/, 16];
                        }
                        _j.label = 16;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /** Extract text content from a user message */
    InteractiveMode.prototype.getUserMessageText = function (message) {
        if (message.role !== "user")
            return "";
        var textBlocks = typeof message.content === "string"
            ? [{ type: "text", text: message.content }]
            : message.content.filter(function (c) { return c.type === "text"; });
        return textBlocks.map(function (c) { return c.text; }).join("");
    };
    /**
     * Show a status message in the chat.
     *
     * If multiple status messages are emitted back-to-back (without anything else being added to the chat),
     * we update the previous status line instead of appending new ones to avoid log spam.
     */
    InteractiveMode.prototype.showStatus = function (message) {
        var children = this.chatContainer.children;
        var last = children.length > 0 ? children[children.length - 1] : undefined;
        var secondLast = children.length > 1 ? children[children.length - 2] : undefined;
        if (last && secondLast && last === this.lastStatusText && secondLast === this.lastStatusSpacer) {
            this.lastStatusText.setText(theme_js_1.theme.fg("dim", message));
            this.ui.requestRender();
            return;
        }
        var spacer = new pi_tui_1.Spacer(1);
        var text = new pi_tui_1.Text(theme_js_1.theme.fg("dim", message), 1, 0);
        this.chatContainer.addChild(spacer);
        this.chatContainer.addChild(text);
        this.lastStatusSpacer = spacer;
        this.lastStatusText = text;
        this.ui.requestRender();
    };
    InteractiveMode.prototype.addMessageToChat = function (message, options) {
        var _a, _b, _c;
        switch (message.role) {
            case "bashExecution": {
                var component = new bash_execution_js_1.BashExecutionComponent(message.command, this.ui, message.excludeFromContext);
                if (message.output) {
                    component.appendOutput(message.output);
                }
                component.setComplete(message.exitCode, message.cancelled, message.truncated ? { truncated: true } : undefined, message.fullOutputPath);
                this.chatContainer.addChild(component);
                break;
            }
            case "custom": {
                if (message.display) {
                    var renderer = (_a = this.session.extensionRunner) === null || _a === void 0 ? void 0 : _a.getMessageRenderer(message.customType);
                    var component = new custom_message_js_1.CustomMessageComponent(message, renderer, this.getMarkdownThemeWithSettings());
                    component.setExpanded(this.toolOutputExpanded);
                    this.chatContainer.addChild(component);
                }
                break;
            }
            case "compactionSummary": {
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                var component = new compaction_summary_message_js_1.CompactionSummaryMessageComponent(message, this.getMarkdownThemeWithSettings());
                component.setExpanded(this.toolOutputExpanded);
                this.chatContainer.addChild(component);
                break;
            }
            case "branchSummary": {
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                var component = new branch_summary_message_js_1.BranchSummaryMessageComponent(message, this.getMarkdownThemeWithSettings());
                component.setExpanded(this.toolOutputExpanded);
                this.chatContainer.addChild(component);
                break;
            }
            case "user": {
                var textContent = this.getUserMessageText(message);
                if (textContent) {
                    var skillBlock = (0, agent_session_js_1.parseSkillBlock)(textContent);
                    if (skillBlock) {
                        // Render skill block (collapsible)
                        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                        var component = new skill_invocation_message_js_1.SkillInvocationMessageComponent(skillBlock, this.getMarkdownThemeWithSettings());
                        component.setExpanded(this.toolOutputExpanded);
                        this.chatContainer.addChild(component);
                        // Render user message separately if present
                        if (skillBlock.userMessage) {
                            var userComponent = new user_message_js_1.UserMessageComponent(skillBlock.userMessage, this.getMarkdownThemeWithSettings());
                            this.chatContainer.addChild(userComponent);
                        }
                    }
                    else {
                        var userComponent = new user_message_js_1.UserMessageComponent(textContent, this.getMarkdownThemeWithSettings());
                        this.chatContainer.addChild(userComponent);
                    }
                    if (options === null || options === void 0 ? void 0 : options.populateHistory) {
                        (_c = (_b = this.editor).addToHistory) === null || _c === void 0 ? void 0 : _c.call(_b, textContent);
                    }
                }
                break;
            }
            case "assistant": {
                var assistantComponent = new assistant_message_js_1.AssistantMessageComponent(message, this.hideThinkingBlock, this.getMarkdownThemeWithSettings());
                this.chatContainer.addChild(assistantComponent);
                break;
            }
            case "toolResult": {
                // Tool results are rendered inline with tool calls, handled separately
                break;
            }
            default: {
                var _exhaustive = message;
            }
        }
    };
    /**
     * Render session context to chat. Used for initial load and rebuild after compaction.
     * @param sessionContext Session context to render
     * @param options.updateFooter Update footer state
     * @param options.populateHistory Add user messages to editor history
     */
    InteractiveMode.prototype.renderSessionContext = function (sessionContext, options) {
        if (options === void 0) { options = {}; }
        this.pendingTools.clear();
        if (options.updateFooter) {
            this.footer.invalidate();
            this.updateEditorBorderColor();
        }
        for (var _i = 0, _a = sessionContext.messages; _i < _a.length; _i++) {
            var message = _a[_i];
            // Assistant messages need special handling for tool calls
            if (message.role === "assistant") {
                this.addMessageToChat(message);
                // Render tool call components
                for (var _b = 0, _c = message.content; _b < _c.length; _b++) {
                    var content = _c[_b];
                    if (content.type === "toolCall") {
                        var component = new tool_execution_js_1.ToolExecutionComponent(content.name, content.arguments, { showImages: this.settingsManager.getShowImages() }, this.getRegisteredToolDefinition(content.name), this.ui);
                        component.setExpanded(this.toolOutputExpanded);
                        this.chatContainer.addChild(component);
                        if (message.stopReason === "aborted" || message.stopReason === "error") {
                            var errorMessage = void 0;
                            if (message.stopReason === "aborted") {
                                var retryAttempt = this.session.retryAttempt;
                                errorMessage =
                                    retryAttempt > 0
                                        ? "Aborted after ".concat(retryAttempt, " retry attempt").concat(retryAttempt > 1 ? "s" : "")
                                        : "Operation aborted";
                            }
                            else {
                                errorMessage = message.errorMessage || "Error";
                            }
                            component.updateResult({ content: [{ type: "text", text: errorMessage }], isError: true });
                        }
                        else {
                            this.pendingTools.set(content.id, component);
                        }
                    }
                }
            }
            else if (message.role === "toolResult") {
                // Match tool results to pending tool components
                var component = this.pendingTools.get(message.toolCallId);
                if (component) {
                    component.updateResult(message);
                    this.pendingTools.delete(message.toolCallId);
                }
            }
            else {
                // All other messages use standard rendering
                this.addMessageToChat(message, options);
            }
        }
        this.pendingTools.clear();
        this.ui.requestRender();
    };
    InteractiveMode.prototype.renderInitialMessages = function () {
        // Get aligned messages and entries from session context
        var context = this.sessionManager.buildSessionContext();
        this.renderSessionContext(context, {
            updateFooter: true,
            populateHistory: true,
        });
        // Show compaction info if session was compacted
        var allEntries = this.sessionManager.getEntries();
        var compactionCount = allEntries.filter(function (e) { return e.type === "compaction"; }).length;
        if (compactionCount > 0) {
            var times = compactionCount === 1 ? "1 time" : "".concat(compactionCount, " times");
            this.showStatus("Session compacted ".concat(times));
        }
    };
    InteractiveMode.prototype.getUserInput = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.onInputCallback = function (text) {
                            _this.onInputCallback = undefined;
                            resolve(text);
                        };
                    })];
            });
        });
    };
    InteractiveMode.prototype.rebuildChatFromMessages = function () {
        this.chatContainer.clear();
        var context = this.sessionManager.buildSessionContext();
        this.renderSessionContext(context);
    };
    // =========================================================================
    // Key handlers
    // =========================================================================
    InteractiveMode.prototype.handleCtrlC = function () {
        var now = Date.now();
        if (now - this.lastSigintTime < 500) {
            void this.shutdown();
        }
        else {
            this.clearEditor();
            this.lastSigintTime = now;
        }
    };
    InteractiveMode.prototype.handleCtrlD = function () {
        // Only called when editor is empty (enforced by CustomEditor)
        void this.shutdown();
    };
    InteractiveMode.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var extensionRunner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isShuttingDown)
                            return [2 /*return*/];
                        this.isShuttingDown = true;
                        extensionRunner = this.session.extensionRunner;
                        if (!(extensionRunner === null || extensionRunner === void 0 ? void 0 : extensionRunner.hasHandlers("session_shutdown"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, extensionRunner.emit({
                                type: "session_shutdown",
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: 
                    // Wait for any pending renders to complete
                    // requestRender() uses process.nextTick(), so we wait one tick
                    return [4 /*yield*/, new Promise(function (resolve) { return process.nextTick(resolve); })];
                    case 3:
                        // Wait for any pending renders to complete
                        // requestRender() uses process.nextTick(), so we wait one tick
                        _a.sent();
                        // Drain any in-flight Kitty key release events before stopping.
                        // This prevents escape sequences from leaking to the parent shell over slow SSH.
                        return [4 /*yield*/, this.ui.terminal.drainInput(1000)];
                    case 4:
                        // Drain any in-flight Kitty key release events before stopping.
                        // This prevents escape sequences from leaking to the parent shell over slow SSH.
                        _a.sent();
                        this.stop();
                        process.exit(0);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if shutdown was requested and perform shutdown if so.
     */
    InteractiveMode.prototype.checkShutdownRequested = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.shutdownRequested)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.shutdown()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleCtrlZ = function () {
        var _this = this;
        // Ignore SIGINT while suspended so Ctrl+C in the terminal does not
        // kill the backgrounded process. The handler is removed on resume.
        var ignoreSigint = function () { };
        process.on("SIGINT", ignoreSigint);
        // Set up handler to restore TUI when resumed
        process.once("SIGCONT", function () {
            process.removeListener("SIGINT", ignoreSigint);
            _this.ui.start();
            _this.ui.requestRender(true);
        });
        // Stop the TUI (restore terminal to normal mode)
        this.ui.stop();
        // Send SIGTSTP to process group (pid=0 means all processes in group)
        process.kill(0, "SIGTSTP");
    };
    InteractiveMode.prototype.handleFollowUp = function () {
        return __awaiter(this, void 0, void 0, function () {
            var text;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        text = ((_c = (_b = (_a = this.editor).getExpandedText) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.editor.getText()).trim();
                        if (!text)
                            return [2 /*return*/];
                        if (!this.session.isCompacting) return [3 /*break*/, 4];
                        if (!this.isExtensionCommand(text)) return [3 /*break*/, 2];
                        (_e = (_d = this.editor).addToHistory) === null || _e === void 0 ? void 0 : _e.call(_d, text);
                        this.editor.setText("");
                        return [4 /*yield*/, this.session.prompt(text)];
                    case 1:
                        _h.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.queueCompactionMessage(text, "followUp");
                        _h.label = 3;
                    case 3: return [2 /*return*/];
                    case 4:
                        if (!this.session.isStreaming) return [3 /*break*/, 6];
                        (_g = (_f = this.editor).addToHistory) === null || _g === void 0 ? void 0 : _g.call(_f, text);
                        this.editor.setText("");
                        return [4 /*yield*/, this.session.prompt(text, { streamingBehavior: "followUp" })];
                    case 5:
                        _h.sent();
                        this.updatePendingMessagesDisplay();
                        this.ui.requestRender();
                        return [3 /*break*/, 7];
                    case 6:
                        if (this.editor.onSubmit) {
                            this.editor.onSubmit(text);
                        }
                        _h.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleDequeue = function () {
        var restored = this.restoreQueuedMessagesToEditor();
        if (restored === 0) {
            this.showStatus("No queued messages to restore");
        }
        else {
            this.showStatus("Restored ".concat(restored, " queued message").concat(restored > 1 ? "s" : "", " to editor"));
        }
    };
    InteractiveMode.prototype.updateEditorBorderColor = function () {
        if (this.isBashMode) {
            this.editor.borderColor = theme_js_1.theme.getBashModeBorderColor();
        }
        else {
            var level = this.session.thinkingLevel || "off";
            this.editor.borderColor = theme_js_1.theme.getThinkingBorderColor(level);
        }
        this.ui.requestRender();
    };
    InteractiveMode.prototype.cycleThinkingLevel = function () {
        var newLevel = this.session.cycleThinkingLevel();
        if (newLevel === undefined) {
            this.showStatus("Current model does not support thinking");
        }
        else {
            this.footer.invalidate();
            this.updateEditorBorderColor();
            this.showStatus("Thinking level: ".concat(newLevel));
        }
    };
    InteractiveMode.prototype.cycleModel = function (direction) {
        return __awaiter(this, void 0, void 0, function () {
            var result, msg, thinkingStr, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.session.cycleModel(direction)];
                    case 1:
                        result = _a.sent();
                        if (result === undefined) {
                            msg = this.session.scopedModels.length > 0 ? "Only one model in scope" : "Only one model available";
                            this.showStatus(msg);
                        }
                        else {
                            this.footer.invalidate();
                            this.updateEditorBorderColor();
                            thinkingStr = result.model.reasoning && result.thinkingLevel !== "off" ? " (thinking: ".concat(result.thinkingLevel, ")") : "";
                            this.showStatus("Switched to ".concat(result.model.name || result.model.id).concat(thinkingStr));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        this.showError(error_5 instanceof Error ? error_5.message : String(error_5));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.toggleToolOutputExpansion = function () {
        this.setToolsExpanded(!this.toolOutputExpanded);
    };
    InteractiveMode.prototype.setToolsExpanded = function (expanded) {
        this.toolOutputExpanded = expanded;
        for (var _i = 0, _a = this.chatContainer.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (isExpandable(child)) {
                child.setExpanded(expanded);
            }
        }
        this.ui.requestRender();
    };
    InteractiveMode.prototype.toggleThinkingBlockVisibility = function () {
        this.hideThinkingBlock = !this.hideThinkingBlock;
        this.settingsManager.setHideThinkingBlock(this.hideThinkingBlock);
        // Rebuild chat from session messages
        this.chatContainer.clear();
        this.rebuildChatFromMessages();
        // If streaming, re-add the streaming component with updated visibility and re-render
        if (this.streamingComponent && this.streamingMessage) {
            this.streamingComponent.setHideThinkingBlock(this.hideThinkingBlock);
            this.streamingComponent.updateContent(this.streamingMessage);
            this.chatContainer.addChild(this.streamingComponent);
        }
        this.showStatus("Thinking blocks: ".concat(this.hideThinkingBlock ? "hidden" : "visible"));
    };
    InteractiveMode.prototype.openExternalEditor = function () {
        var _a, _b, _c;
        // Determine editor (respect $VISUAL, then $EDITOR)
        var editorCmd = process.env.VISUAL || process.env.EDITOR;
        if (!editorCmd) {
            this.showWarning("No editor configured. Set $VISUAL or $EDITOR environment variable.");
            return;
        }
        var currentText = (_c = (_b = (_a = this.editor).getExpandedText) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.editor.getText();
        var tmpFile = path.join(os.tmpdir(), "pi-editor-".concat(Date.now(), ".pi.md"));
        try {
            // Write current content to temp file
            fs.writeFileSync(tmpFile, currentText, "utf-8");
            // Stop TUI to release terminal
            this.ui.stop();
            // Split by space to support editor arguments (e.g., "code --wait")
            var _d = editorCmd.split(" "), editor = _d[0], editorArgs = _d.slice(1);
            // Spawn editor synchronously with inherited stdio for interactive editing
            var result = (0, child_process_1.spawnSync)(editor, __spreadArray(__spreadArray([], editorArgs, true), [tmpFile], false), {
                stdio: "inherit",
                shell: process.platform === "win32",
            });
            // On successful exit (status 0), replace editor content
            if (result.status === 0) {
                var newContent = fs.readFileSync(tmpFile, "utf-8").replace(/\n$/, "");
                this.editor.setText(newContent);
            }
            // On non-zero exit, keep original text (no action needed)
        }
        finally {
            // Clean up temp file
            try {
                fs.unlinkSync(tmpFile);
            }
            catch (_e) {
                // Ignore cleanup errors
            }
            // Restart TUI
            this.ui.start();
            // Force full re-render since external editor uses alternate screen
            this.ui.requestRender(true);
        }
    };
    // =========================================================================
    // UI helpers
    // =========================================================================
    InteractiveMode.prototype.clearEditor = function () {
        this.editor.setText("");
        this.ui.requestRender();
    };
    InteractiveMode.prototype.showError = function (errorMessage) {
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("error", "Error: ".concat(errorMessage)), 1, 0));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.showWarning = function (warningMessage) {
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("warning", "Warning: ".concat(warningMessage)), 1, 0));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.showNewVersionNotification = function (newVersion) {
        var action = theme_js_1.theme.fg("accent", (0, config_js_1.getUpdateInstruction)("@mariozechner/pi-coding-agent"));
        var updateInstruction = theme_js_1.theme.fg("muted", "New version ".concat(newVersion, " is available. ")) + action;
        var changelogUrl = theme_js_1.theme.fg("accent", "https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/CHANGELOG.md");
        var changelogLine = theme_js_1.theme.fg("muted", "Changelog: ") + changelogUrl;
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder(function (text) { return theme_js_1.theme.fg("warning", text); }));
        this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.bold(theme_js_1.theme.fg("warning", "Update Available")), "\n").concat(updateInstruction, "\n").concat(changelogLine), 1, 0));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder(function (text) { return theme_js_1.theme.fg("warning", text); }));
        this.ui.requestRender();
    };
    /**
     * Get all queued messages (read-only).
     * Combines session queue and compaction queue.
     */
    InteractiveMode.prototype.getAllQueuedMessages = function () {
        return {
            steering: __spreadArray(__spreadArray([], this.session.getSteeringMessages(), true), this.compactionQueuedMessages.filter(function (msg) { return msg.mode === "steer"; }).map(function (msg) { return msg.text; }), true),
            followUp: __spreadArray(__spreadArray([], this.session.getFollowUpMessages(), true), this.compactionQueuedMessages.filter(function (msg) { return msg.mode === "followUp"; }).map(function (msg) { return msg.text; }), true),
        };
    };
    /**
     * Clear all queued messages and return their contents.
     * Clears both session queue and compaction queue.
     */
    InteractiveMode.prototype.clearAllQueues = function () {
        var _a = this.session.clearQueue(), steering = _a.steering, followUp = _a.followUp;
        var compactionSteering = this.compactionQueuedMessages
            .filter(function (msg) { return msg.mode === "steer"; })
            .map(function (msg) { return msg.text; });
        var compactionFollowUp = this.compactionQueuedMessages
            .filter(function (msg) { return msg.mode === "followUp"; })
            .map(function (msg) { return msg.text; });
        this.compactionQueuedMessages = [];
        return {
            steering: __spreadArray(__spreadArray([], steering, true), compactionSteering, true),
            followUp: __spreadArray(__spreadArray([], followUp, true), compactionFollowUp, true),
        };
    };
    InteractiveMode.prototype.updatePendingMessagesDisplay = function () {
        this.pendingMessagesContainer.clear();
        var _a = this.getAllQueuedMessages(), steeringMessages = _a.steering, followUpMessages = _a.followUp;
        if (steeringMessages.length > 0 || followUpMessages.length > 0) {
            this.pendingMessagesContainer.addChild(new pi_tui_1.Spacer(1));
            for (var _i = 0, steeringMessages_1 = steeringMessages; _i < steeringMessages_1.length; _i++) {
                var message = steeringMessages_1[_i];
                var text = theme_js_1.theme.fg("dim", "Steering: ".concat(message));
                this.pendingMessagesContainer.addChild(new pi_tui_1.TruncatedText(text, 1, 0));
            }
            for (var _b = 0, followUpMessages_1 = followUpMessages; _b < followUpMessages_1.length; _b++) {
                var message = followUpMessages_1[_b];
                var text = theme_js_1.theme.fg("dim", "Follow-up: ".concat(message));
                this.pendingMessagesContainer.addChild(new pi_tui_1.TruncatedText(text, 1, 0));
            }
            var dequeueHint = this.getAppKeyDisplay("dequeue");
            var hintText = theme_js_1.theme.fg("dim", "\u21B3 ".concat(dequeueHint, " to edit all queued messages"));
            this.pendingMessagesContainer.addChild(new pi_tui_1.TruncatedText(hintText, 1, 0));
        }
    };
    InteractiveMode.prototype.restoreQueuedMessagesToEditor = function (options) {
        var _a;
        var _b = this.clearAllQueues(), steering = _b.steering, followUp = _b.followUp;
        var allQueued = __spreadArray(__spreadArray([], steering, true), followUp, true);
        if (allQueued.length === 0) {
            this.updatePendingMessagesDisplay();
            if (options === null || options === void 0 ? void 0 : options.abort) {
                this.agent.abort();
            }
            return 0;
        }
        var queuedText = allQueued.join("\n\n");
        var currentText = (_a = options === null || options === void 0 ? void 0 : options.currentText) !== null && _a !== void 0 ? _a : this.editor.getText();
        var combinedText = [queuedText, currentText].filter(function (t) { return t.trim(); }).join("\n\n");
        this.editor.setText(combinedText);
        this.updatePendingMessagesDisplay();
        if (options === null || options === void 0 ? void 0 : options.abort) {
            this.agent.abort();
        }
        return allQueued.length;
    };
    InteractiveMode.prototype.queueCompactionMessage = function (text, mode) {
        var _a, _b;
        this.compactionQueuedMessages.push({ text: text, mode: mode });
        (_b = (_a = this.editor).addToHistory) === null || _b === void 0 ? void 0 : _b.call(_a, text);
        this.editor.setText("");
        this.updatePendingMessagesDisplay();
        this.showStatus("Queued message for after compaction");
    };
    InteractiveMode.prototype.isExtensionCommand = function (text) {
        if (!text.startsWith("/"))
            return false;
        var extensionRunner = this.session.extensionRunner;
        if (!extensionRunner)
            return false;
        var spaceIndex = text.indexOf(" ");
        var commandName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
        return !!extensionRunner.getCommand(commandName);
    };
    InteractiveMode.prototype.flushCompactionQueue = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var queuedMessages, restoreQueue, _i, queuedMessages_1, message, firstPromptIndex, _a, queuedMessages_2, message, preCommands, firstPrompt, rest, _b, preCommands_1, message, promptPromise, _c, rest_1, message, error_6;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (this.compactionQueuedMessages.length === 0) {
                            return [2 /*return*/];
                        }
                        queuedMessages = __spreadArray([], this.compactionQueuedMessages, true);
                        this.compactionQueuedMessages = [];
                        this.updatePendingMessagesDisplay();
                        restoreQueue = function (error) {
                            _this.session.clearQueue();
                            _this.compactionQueuedMessages = queuedMessages;
                            _this.updatePendingMessagesDisplay();
                            _this.showError("Failed to send queued message".concat(queuedMessages.length > 1 ? "s" : "", ": ").concat(error instanceof Error ? error.message : String(error)));
                        };
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 28, , 29]);
                        if (!(options === null || options === void 0 ? void 0 : options.willRetry)) return [3 /*break*/, 10];
                        _i = 0, queuedMessages_1 = queuedMessages;
                        _d.label = 2;
                    case 2:
                        if (!(_i < queuedMessages_1.length)) return [3 /*break*/, 9];
                        message = queuedMessages_1[_i];
                        if (!this.isExtensionCommand(message.text)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.session.prompt(message.text)];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 4:
                        if (!(message.mode === "followUp")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.session.followUp(message.text)];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, this.session.steer(message.text)];
                    case 7:
                        _d.sent();
                        _d.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 2];
                    case 9:
                        this.updatePendingMessagesDisplay();
                        return [2 /*return*/];
                    case 10:
                        firstPromptIndex = queuedMessages.findIndex(function (message) { return !_this.isExtensionCommand(message.text); });
                        if (!(firstPromptIndex === -1)) return [3 /*break*/, 15];
                        _a = 0, queuedMessages_2 = queuedMessages;
                        _d.label = 11;
                    case 11:
                        if (!(_a < queuedMessages_2.length)) return [3 /*break*/, 14];
                        message = queuedMessages_2[_a];
                        return [4 /*yield*/, this.session.prompt(message.text)];
                    case 12:
                        _d.sent();
                        _d.label = 13;
                    case 13:
                        _a++;
                        return [3 /*break*/, 11];
                    case 14: return [2 /*return*/];
                    case 15:
                        preCommands = queuedMessages.slice(0, firstPromptIndex);
                        firstPrompt = queuedMessages[firstPromptIndex];
                        rest = queuedMessages.slice(firstPromptIndex + 1);
                        _b = 0, preCommands_1 = preCommands;
                        _d.label = 16;
                    case 16:
                        if (!(_b < preCommands_1.length)) return [3 /*break*/, 19];
                        message = preCommands_1[_b];
                        return [4 /*yield*/, this.session.prompt(message.text)];
                    case 17:
                        _d.sent();
                        _d.label = 18;
                    case 18:
                        _b++;
                        return [3 /*break*/, 16];
                    case 19:
                        promptPromise = this.session.prompt(firstPrompt.text).catch(function (error) {
                            restoreQueue(error);
                        });
                        _c = 0, rest_1 = rest;
                        _d.label = 20;
                    case 20:
                        if (!(_c < rest_1.length)) return [3 /*break*/, 27];
                        message = rest_1[_c];
                        if (!this.isExtensionCommand(message.text)) return [3 /*break*/, 22];
                        return [4 /*yield*/, this.session.prompt(message.text)];
                    case 21:
                        _d.sent();
                        return [3 /*break*/, 26];
                    case 22:
                        if (!(message.mode === "followUp")) return [3 /*break*/, 24];
                        return [4 /*yield*/, this.session.followUp(message.text)];
                    case 23:
                        _d.sent();
                        return [3 /*break*/, 26];
                    case 24: return [4 /*yield*/, this.session.steer(message.text)];
                    case 25:
                        _d.sent();
                        _d.label = 26;
                    case 26:
                        _c++;
                        return [3 /*break*/, 20];
                    case 27:
                        this.updatePendingMessagesDisplay();
                        void promptPromise;
                        return [3 /*break*/, 29];
                    case 28:
                        error_6 = _d.sent();
                        restoreQueue(error_6);
                        return [3 /*break*/, 29];
                    case 29: return [2 /*return*/];
                }
            });
        });
    };
    /** Move pending bash components from pending area to chat */
    InteractiveMode.prototype.flushPendingBashComponents = function () {
        for (var _i = 0, _a = this.pendingBashComponents; _i < _a.length; _i++) {
            var component = _a[_i];
            this.pendingMessagesContainer.removeChild(component);
            this.chatContainer.addChild(component);
        }
        this.pendingBashComponents = [];
    };
    // =========================================================================
    // Selectors
    // =========================================================================
    /**
     * Shows a selector component in place of the editor.
     * @param create Factory that receives a `done` callback and returns the component and focus target
     */
    InteractiveMode.prototype.showSelector = function (create) {
        var _this = this;
        var done = function () {
            _this.editorContainer.clear();
            _this.editorContainer.addChild(_this.editor);
            _this.ui.setFocus(_this.editor);
        };
        var _a = create(done), component = _a.component, focus = _a.focus;
        this.editorContainer.clear();
        this.editorContainer.addChild(component);
        this.ui.setFocus(focus);
        this.ui.requestRender();
    };
    InteractiveMode.prototype.showSettingsSelector = function () {
        var _this = this;
        this.showSelector(function (done) {
            var selector = new settings_selector_js_1.SettingsSelectorComponent({
                autoCompact: _this.session.autoCompactionEnabled,
                showImages: _this.settingsManager.getShowImages(),
                autoResizeImages: _this.settingsManager.getImageAutoResize(),
                blockImages: _this.settingsManager.getBlockImages(),
                enableSkillCommands: _this.settingsManager.getEnableSkillCommands(),
                steeringMode: _this.session.steeringMode,
                followUpMode: _this.session.followUpMode,
                transport: _this.settingsManager.getTransport(),
                thinkingLevel: _this.session.thinkingLevel,
                availableThinkingLevels: _this.session.getAvailableThinkingLevels(),
                currentTheme: _this.settingsManager.getTheme() || "dark",
                availableThemes: (0, theme_js_1.getAvailableThemes)(),
                hideThinkingBlock: _this.hideThinkingBlock,
                collapseChangelog: _this.settingsManager.getCollapseChangelog(),
                doubleEscapeAction: _this.settingsManager.getDoubleEscapeAction(),
                treeFilterMode: _this.settingsManager.getTreeFilterMode(),
                showHardwareCursor: _this.settingsManager.getShowHardwareCursor(),
                editorPaddingX: _this.settingsManager.getEditorPaddingX(),
                autocompleteMaxVisible: _this.settingsManager.getAutocompleteMaxVisible(),
                quietStartup: _this.settingsManager.getQuietStartup(),
                clearOnShrink: _this.settingsManager.getClearOnShrink(),
            }, {
                onAutoCompactChange: function (enabled) {
                    _this.session.setAutoCompactionEnabled(enabled);
                    _this.footer.setAutoCompactEnabled(enabled);
                },
                onShowImagesChange: function (enabled) {
                    _this.settingsManager.setShowImages(enabled);
                    for (var _i = 0, _a = _this.chatContainer.children; _i < _a.length; _i++) {
                        var child = _a[_i];
                        if (child instanceof tool_execution_js_1.ToolExecutionComponent) {
                            child.setShowImages(enabled);
                        }
                    }
                },
                onAutoResizeImagesChange: function (enabled) {
                    _this.settingsManager.setImageAutoResize(enabled);
                },
                onBlockImagesChange: function (blocked) {
                    _this.settingsManager.setBlockImages(blocked);
                },
                onEnableSkillCommandsChange: function (enabled) {
                    _this.settingsManager.setEnableSkillCommands(enabled);
                    _this.setupAutocomplete(_this.fdPath);
                },
                onSteeringModeChange: function (mode) {
                    _this.session.setSteeringMode(mode);
                },
                onFollowUpModeChange: function (mode) {
                    _this.session.setFollowUpMode(mode);
                },
                onTransportChange: function (transport) {
                    _this.settingsManager.setTransport(transport);
                    _this.session.agent.setTransport(transport);
                },
                onThinkingLevelChange: function (level) {
                    _this.session.setThinkingLevel(level);
                    _this.footer.invalidate();
                    _this.updateEditorBorderColor();
                },
                onThemeChange: function (themeName) {
                    var result = (0, theme_js_1.setTheme)(themeName, true);
                    _this.settingsManager.setTheme(themeName);
                    _this.ui.invalidate();
                    if (!result.success) {
                        _this.showError("Failed to load theme \"".concat(themeName, "\": ").concat(result.error, "\nFell back to dark theme."));
                    }
                },
                onThemePreview: function (themeName) {
                    var result = (0, theme_js_1.setTheme)(themeName, true);
                    if (result.success) {
                        _this.ui.invalidate();
                        _this.ui.requestRender();
                    }
                },
                onHideThinkingBlockChange: function (hidden) {
                    _this.hideThinkingBlock = hidden;
                    _this.settingsManager.setHideThinkingBlock(hidden);
                    for (var _i = 0, _a = _this.chatContainer.children; _i < _a.length; _i++) {
                        var child = _a[_i];
                        if (child instanceof assistant_message_js_1.AssistantMessageComponent) {
                            child.setHideThinkingBlock(hidden);
                        }
                    }
                    _this.chatContainer.clear();
                    _this.rebuildChatFromMessages();
                },
                onCollapseChangelogChange: function (collapsed) {
                    _this.settingsManager.setCollapseChangelog(collapsed);
                },
                onQuietStartupChange: function (enabled) {
                    _this.settingsManager.setQuietStartup(enabled);
                },
                onDoubleEscapeActionChange: function (action) {
                    _this.settingsManager.setDoubleEscapeAction(action);
                },
                onTreeFilterModeChange: function (mode) {
                    _this.settingsManager.setTreeFilterMode(mode);
                },
                onShowHardwareCursorChange: function (enabled) {
                    _this.settingsManager.setShowHardwareCursor(enabled);
                    _this.ui.setShowHardwareCursor(enabled);
                },
                onEditorPaddingXChange: function (padding) {
                    _this.settingsManager.setEditorPaddingX(padding);
                    _this.defaultEditor.setPaddingX(padding);
                    if (_this.editor !== _this.defaultEditor && _this.editor.setPaddingX !== undefined) {
                        _this.editor.setPaddingX(padding);
                    }
                },
                onAutocompleteMaxVisibleChange: function (maxVisible) {
                    _this.settingsManager.setAutocompleteMaxVisible(maxVisible);
                    _this.defaultEditor.setAutocompleteMaxVisible(maxVisible);
                    if (_this.editor !== _this.defaultEditor && _this.editor.setAutocompleteMaxVisible !== undefined) {
                        _this.editor.setAutocompleteMaxVisible(maxVisible);
                    }
                },
                onClearOnShrinkChange: function (enabled) {
                    _this.settingsManager.setClearOnShrink(enabled);
                    _this.ui.setClearOnShrink(enabled);
                },
                onCancel: function () {
                    done();
                    _this.ui.requestRender();
                },
            });
            return { component: selector, focus: selector.getSettingsList() };
        });
    };
    InteractiveMode.prototype.handleModelCommand = function (searchTerm) {
        return __awaiter(this, void 0, void 0, function () {
            var model, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!searchTerm) {
                            this.showModelSelector();
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.findExactModelMatch(searchTerm)];
                    case 1:
                        model = _a.sent();
                        if (!model) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.session.setModel(model)];
                    case 3:
                        _a.sent();
                        this.footer.invalidate();
                        this.updateEditorBorderColor();
                        this.showStatus("Model: ".concat(model.id));
                        this.checkDaxnutsEasterEgg(model);
                        return [3 /*break*/, 5];
                    case 4:
                        error_7 = _a.sent();
                        this.showError(error_7 instanceof Error ? error_7.message : String(error_7));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                    case 6:
                        this.showModelSelector(searchTerm);
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.findExactModelMatch = function (searchTerm) {
        return __awaiter(this, void 0, void 0, function () {
            var term, targetProvider, targetModelId, parts, models, exactMatches;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        term = searchTerm.trim();
                        if (!term)
                            return [2 /*return*/, undefined];
                        targetModelId = "";
                        if (term.includes("/")) {
                            parts = term.split("/", 2);
                            targetProvider = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
                            targetModelId = (_c = (_b = parts[1]) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) !== null && _c !== void 0 ? _c : "";
                        }
                        else {
                            targetModelId = term.toLowerCase();
                        }
                        if (!targetModelId)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.getModelCandidates()];
                    case 1:
                        models = _d.sent();
                        exactMatches = models.filter(function (item) {
                            var idMatch = item.id.toLowerCase() === targetModelId;
                            var providerMatch = !targetProvider || item.provider.toLowerCase() === targetProvider;
                            return idMatch && providerMatch;
                        });
                        return [2 /*return*/, exactMatches.length === 1 ? exactMatches[0] : undefined];
                }
            });
        });
    };
    InteractiveMode.prototype.getModelCandidates = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.session.scopedModels.length > 0) {
                            return [2 /*return*/, this.session.scopedModels.map(function (scoped) { return scoped.model; })];
                        }
                        this.session.modelRegistry.refresh();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.session.modelRegistry.getAvailable()];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /** Update the footer's available provider count from current model candidates */
    InteractiveMode.prototype.updateAvailableProviderCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models, uniqueProviders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getModelCandidates()];
                    case 1:
                        models = _a.sent();
                        uniqueProviders = new Set(models.map(function (m) { return m.provider; }));
                        this.footerDataProvider.setAvailableProviderCount(uniqueProviders.size);
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.showModelSelector = function (initialSearchInput) {
        var _this = this;
        this.showSelector(function (done) {
            var selector = new model_selector_js_1.ModelSelectorComponent(_this.ui, _this.session.model, _this.settingsManager, _this.session.modelRegistry, _this.session.scopedModels, function (model) { return __awaiter(_this, void 0, void 0, function () {
                var error_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.session.setModel(model)];
                        case 1:
                            _a.sent();
                            this.footer.invalidate();
                            this.updateEditorBorderColor();
                            done();
                            this.showStatus("Model: ".concat(model.id));
                            this.checkDaxnutsEasterEgg(model);
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _a.sent();
                            done();
                            this.showError(error_8 instanceof Error ? error_8.message : String(error_8));
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); }, function () {
                done();
                _this.ui.requestRender();
            }, initialSearchInput);
            return { component: selector, focus: selector };
        });
    };
    InteractiveMode.prototype.showModelsSelector = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allModels, sessionScopedModels, hasSessionScope, enabledModelIds, hasFilter, _i, sessionScopedModels_1, sm, patterns, scopedModels, _a, scopedModels_1, sm, currentEnabledIds, currentHasFilter, updateSessionModels;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Get all available models
                        this.session.modelRegistry.refresh();
                        allModels = this.session.modelRegistry.getAvailable();
                        if (allModels.length === 0) {
                            this.showStatus("No models available");
                            return [2 /*return*/];
                        }
                        sessionScopedModels = this.session.scopedModels;
                        hasSessionScope = sessionScopedModels.length > 0;
                        enabledModelIds = new Set();
                        hasFilter = false;
                        if (!hasSessionScope) return [3 /*break*/, 1];
                        // Use current session's scoped models
                        for (_i = 0, sessionScopedModels_1 = sessionScopedModels; _i < sessionScopedModels_1.length; _i++) {
                            sm = sessionScopedModels_1[_i];
                            enabledModelIds.add("".concat(sm.model.provider, "/").concat(sm.model.id));
                        }
                        hasFilter = true;
                        return [3 /*break*/, 3];
                    case 1:
                        patterns = this.settingsManager.getEnabledModels();
                        if (!(patterns !== undefined && patterns.length > 0)) return [3 /*break*/, 3];
                        hasFilter = true;
                        return [4 /*yield*/, (0, model_resolver_js_1.resolveModelScope)(patterns, this.session.modelRegistry)];
                    case 2:
                        scopedModels = _b.sent();
                        for (_a = 0, scopedModels_1 = scopedModels; _a < scopedModels_1.length; _a++) {
                            sm = scopedModels_1[_a];
                            enabledModelIds.add("".concat(sm.model.provider, "/").concat(sm.model.id));
                        }
                        _b.label = 3;
                    case 3:
                        currentEnabledIds = new Set(enabledModelIds);
                        currentHasFilter = hasFilter;
                        updateSessionModels = function (enabledIds) { return __awaiter(_this, void 0, void 0, function () {
                            var newScopedModels;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!(enabledIds.size > 0 && enabledIds.size < allModels.length)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, (0, model_resolver_js_1.resolveModelScope)(Array.from(enabledIds), this.session.modelRegistry)];
                                    case 1:
                                        newScopedModels = _a.sent();
                                        this.session.setScopedModels(newScopedModels.map(function (sm) { return ({
                                            model: sm.model,
                                            thinkingLevel: sm.thinkingLevel,
                                        }); }));
                                        return [3 /*break*/, 3];
                                    case 2:
                                        // All enabled or none enabled = no filter
                                        this.session.setScopedModels([]);
                                        _a.label = 3;
                                    case 3: return [4 /*yield*/, this.updateAvailableProviderCount()];
                                    case 4:
                                        _a.sent();
                                        this.ui.requestRender();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        this.showSelector(function (done) {
                            var selector = new scoped_models_selector_js_1.ScopedModelsSelectorComponent({
                                allModels: allModels,
                                enabledModelIds: currentEnabledIds,
                                hasEnabledModelsFilter: currentHasFilter,
                            }, {
                                onModelToggle: function (modelId, enabled) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (enabled) {
                                                    currentEnabledIds.add(modelId);
                                                }
                                                else {
                                                    currentEnabledIds.delete(modelId);
                                                }
                                                currentHasFilter = true;
                                                return [4 /*yield*/, updateSessionModels(currentEnabledIds)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                onEnableAll: function (allModelIds) { return __awaiter(_this, void 0, void 0, function () {
                                    var _i, allModelIds_1, id;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                currentEnabledIds.clear();
                                                for (_i = 0, allModelIds_1 = allModelIds; _i < allModelIds_1.length; _i++) {
                                                    id = allModelIds_1[_i];
                                                    currentEnabledIds.add(id);
                                                }
                                                currentHasFilter = false;
                                                return [4 /*yield*/, updateSessionModels(currentEnabledIds)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                onClearAll: function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                currentEnabledIds.clear();
                                                currentHasFilter = true;
                                                return [4 /*yield*/, updateSessionModels(currentEnabledIds)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                onToggleProvider: function (_provider, modelIds, enabled) { return __awaiter(_this, void 0, void 0, function () {
                                    var _i, modelIds_1, id;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                for (_i = 0, modelIds_1 = modelIds; _i < modelIds_1.length; _i++) {
                                                    id = modelIds_1[_i];
                                                    if (enabled) {
                                                        currentEnabledIds.add(id);
                                                    }
                                                    else {
                                                        currentEnabledIds.delete(id);
                                                    }
                                                }
                                                currentHasFilter = true;
                                                return [4 /*yield*/, updateSessionModels(currentEnabledIds)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                onPersist: function (enabledIds) {
                                    // Persist to settings
                                    var newPatterns = enabledIds.length === allModels.length
                                        ? undefined // All enabled = clear filter
                                        : enabledIds;
                                    _this.settingsManager.setEnabledModels(newPatterns);
                                    _this.showStatus("Model selection saved to settings");
                                },
                                onCancel: function () {
                                    done();
                                    _this.ui.requestRender();
                                },
                            });
                            return { component: selector, focus: selector };
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.showUserMessageSelector = function () {
        var _this = this;
        var userMessages = this.session.getUserMessagesForForking();
        if (userMessages.length === 0) {
            this.showStatus("No messages to fork from");
            return;
        }
        this.showSelector(function (done) {
            var selector = new user_message_selector_js_1.UserMessageSelectorComponent(userMessages.map(function (m) { return ({ id: m.entryId, text: m.text }); }), function (entryId) { return __awaiter(_this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.session.fork(entryId)];
                        case 1:
                            result = _a.sent();
                            if (result.cancelled) {
                                // Extension cancelled the fork
                                done();
                                this.ui.requestRender();
                                return [2 /*return*/];
                            }
                            this.chatContainer.clear();
                            this.renderInitialMessages();
                            this.editor.setText(result.selectedText);
                            done();
                            this.showStatus("Branched to new session");
                            return [2 /*return*/];
                    }
                });
            }); }, function () {
                done();
                _this.ui.requestRender();
            });
            return { component: selector, focus: selector.getMessageList() };
        });
    };
    InteractiveMode.prototype.showTreeSelector = function (initialSelectedId) {
        var _this = this;
        var tree = this.sessionManager.getTree();
        var realLeafId = this.sessionManager.getLeafId();
        var initialFilterMode = this.settingsManager.getTreeFilterMode();
        if (tree.length === 0) {
            this.showStatus("No entries in session");
            return;
        }
        this.showSelector(function (done) {
            var selector = new tree_selector_js_1.TreeSelectorComponent(tree, realLeafId, _this.ui.terminal.rows, function (entryId) { return __awaiter(_this, void 0, void 0, function () {
                var wantsSummary, customInstructions, summaryChoice, summaryLoader, originalOnEscape, result, error_9;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Selecting the current leaf is a no-op (already there)
                            if (entryId === realLeafId) {
                                done();
                                this.showStatus("Already at this point");
                                return [2 /*return*/];
                            }
                            // Ask about summarization
                            done(); // Close selector first
                            wantsSummary = false;
                            if (!!this.settingsManager.getBranchSummarySkipPrompt()) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            if (!true) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.showExtensionSelector("Summarize branch?", [
                                    "No summary",
                                    "Summarize",
                                    "Summarize with custom prompt",
                                ])];
                        case 2:
                            summaryChoice = _a.sent();
                            if (summaryChoice === undefined) {
                                // User pressed escape - re-show tree selector with same selection
                                this.showTreeSelector(entryId);
                                return [2 /*return*/];
                            }
                            wantsSummary = summaryChoice !== "No summary";
                            if (!(summaryChoice === "Summarize with custom prompt")) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.showExtensionEditor("Custom summarization instructions")];
                        case 3:
                            customInstructions = _a.sent();
                            if (customInstructions === undefined) {
                                // User cancelled - loop back to summary selector
                                return [3 /*break*/, 1];
                            }
                            _a.label = 4;
                        case 4: 
                        // User made a complete choice
                        return [3 /*break*/, 5];
                        case 5:
                            originalOnEscape = this.defaultEditor.onEscape;
                            if (wantsSummary) {
                                this.defaultEditor.onEscape = function () {
                                    _this.session.abortBranchSummary();
                                };
                                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                                summaryLoader = new pi_tui_1.Loader(this.ui, function (spinner) { return theme_js_1.theme.fg("accent", spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, "Summarizing branch... (".concat((0, keybinding_hints_js_1.appKey)(this.keybindings, "interrupt"), " to cancel)"));
                                this.statusContainer.addChild(summaryLoader);
                                this.ui.requestRender();
                            }
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, 9, 10]);
                            return [4 /*yield*/, this.session.navigateTree(entryId, {
                                    summarize: wantsSummary,
                                    customInstructions: customInstructions,
                                })];
                        case 7:
                            result = _a.sent();
                            if (result.aborted) {
                                // Summarization aborted - re-show tree selector with same selection
                                this.showStatus("Branch summarization cancelled");
                                this.showTreeSelector(entryId);
                                return [2 /*return*/];
                            }
                            if (result.cancelled) {
                                this.showStatus("Navigation cancelled");
                                return [2 /*return*/];
                            }
                            // Update UI
                            this.chatContainer.clear();
                            this.renderInitialMessages();
                            if (result.editorText && !this.editor.getText().trim()) {
                                this.editor.setText(result.editorText);
                            }
                            this.showStatus("Navigated to selected point");
                            return [3 /*break*/, 10];
                        case 8:
                            error_9 = _a.sent();
                            this.showError(error_9 instanceof Error ? error_9.message : String(error_9));
                            return [3 /*break*/, 10];
                        case 9:
                            if (summaryLoader) {
                                summaryLoader.stop();
                                this.statusContainer.clear();
                            }
                            this.defaultEditor.onEscape = originalOnEscape;
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            }); }, function () {
                done();
                _this.ui.requestRender();
            }, function (entryId, label) {
                _this.sessionManager.appendLabelChange(entryId, label);
                _this.ui.requestRender();
            }, initialSelectedId, initialFilterMode);
            return { component: selector, focus: selector };
        });
    };
    InteractiveMode.prototype.showSessionSelector = function () {
        var _this = this;
        this.showSelector(function (done) {
            var selector = new session_selector_js_1.SessionSelectorComponent(function (onProgress) {
                return session_manager_js_1.SessionManager.list(_this.sessionManager.getCwd(), _this.sessionManager.getSessionDir(), onProgress);
            }, session_manager_js_1.SessionManager.listAll, function (sessionPath) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            done();
                            return [4 /*yield*/, this.handleResumeSession(sessionPath)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); }, function () {
                done();
                _this.ui.requestRender();
            }, function () {
                void _this.shutdown();
            }, function () { return _this.ui.requestRender(); }, {
                renameSession: function (sessionFilePath, nextName) { return __awaiter(_this, void 0, void 0, function () {
                    var next, mgr;
                    return __generator(this, function (_a) {
                        next = (nextName !== null && nextName !== void 0 ? nextName : "").trim();
                        if (!next)
                            return [2 /*return*/];
                        mgr = session_manager_js_1.SessionManager.open(sessionFilePath);
                        mgr.appendSessionInfo(next);
                        return [2 /*return*/];
                    });
                }); },
                showRenameHint: true,
                keybindings: _this.keybindings,
            }, _this.sessionManager.getSessionFile());
            return { component: selector, focus: selector };
        });
    };
    InteractiveMode.prototype.handleResumeSession = function (sessionPath) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Stop loading animation
                        if (this.loadingAnimation) {
                            this.loadingAnimation.stop();
                            this.loadingAnimation = undefined;
                        }
                        this.statusContainer.clear();
                        // Clear UI state
                        this.pendingMessagesContainer.clear();
                        this.compactionQueuedMessages = [];
                        this.streamingComponent = undefined;
                        this.streamingMessage = undefined;
                        this.pendingTools.clear();
                        // Switch session via AgentSession (emits extension session events)
                        return [4 /*yield*/, this.session.switchSession(sessionPath)];
                    case 1:
                        // Switch session via AgentSession (emits extension session events)
                        _a.sent();
                        // Clear and re-render the chat
                        this.chatContainer.clear();
                        this.renderInitialMessages();
                        this.showStatus("Resumed session");
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.showOAuthSelector = function (mode) {
        return __awaiter(this, void 0, void 0, function () {
            var providers, loggedInProviders;
            var _this = this;
            return __generator(this, function (_a) {
                if (mode === "logout") {
                    providers = this.session.modelRegistry.authStorage.list();
                    loggedInProviders = providers.filter(function (p) { var _a; return ((_a = _this.session.modelRegistry.authStorage.get(p)) === null || _a === void 0 ? void 0 : _a.type) === "oauth"; });
                    if (loggedInProviders.length === 0) {
                        this.showStatus("No OAuth providers logged in. Use /login first.");
                        return [2 /*return*/];
                    }
                }
                this.showSelector(function (done) {
                    var selector = new oauth_selector_js_1.OAuthSelectorComponent(mode, _this.session.modelRegistry.authStorage, function (providerId) { return __awaiter(_this, void 0, void 0, function () {
                        var providerInfo, providerName, error_10;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    done();
                                    if (!(mode === "login")) return [3 /*break*/, 2];
                                    return [4 /*yield*/, this.showLoginDialog(providerId)];
                                case 1:
                                    _a.sent();
                                    return [3 /*break*/, 6];
                                case 2:
                                    providerInfo = this.session.modelRegistry.authStorage
                                        .getOAuthProviders()
                                        .find(function (p) { return p.id === providerId; });
                                    providerName = (providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.name) || providerId;
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    this.session.modelRegistry.authStorage.logout(providerId);
                                    this.session.modelRegistry.refresh();
                                    return [4 /*yield*/, this.updateAvailableProviderCount()];
                                case 4:
                                    _a.sent();
                                    this.showStatus("Logged out of ".concat(providerName));
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_10 = _a.sent();
                                    this.showError("Logout failed: ".concat(error_10 instanceof Error ? error_10.message : String(error_10)));
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); }, function () {
                        done();
                        _this.ui.requestRender();
                    });
                    return { component: selector, focus: selector };
                });
                return [2 /*return*/];
            });
        });
    };
    InteractiveMode.prototype.showLoginDialog = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var providerInfo, providerName, usesCallbackServer, dialog, manualCodeResolve, manualCodeReject, manualCodePromise, restoreEditor, error_11, errorMsg;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        providerInfo = this.session.modelRegistry.authStorage.getOAuthProviders().find(function (p) { return p.id === providerId; });
                        providerName = (providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.name) || providerId;
                        usesCallbackServer = (_a = providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.usesCallbackServer) !== null && _a !== void 0 ? _a : false;
                        dialog = new login_dialog_js_1.LoginDialogComponent(this.ui, providerId, function (_success, _message) {
                            // Completion handled below
                        });
                        // Show dialog in editor container
                        this.editorContainer.clear();
                        this.editorContainer.addChild(dialog);
                        this.ui.setFocus(dialog);
                        this.ui.requestRender();
                        manualCodePromise = new Promise(function (resolve, reject) {
                            manualCodeResolve = resolve;
                            manualCodeReject = reject;
                        });
                        restoreEditor = function () {
                            _this.editorContainer.clear();
                            _this.editorContainer.addChild(_this.editor);
                            _this.ui.setFocus(_this.editor);
                            _this.ui.requestRender();
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.session.modelRegistry.authStorage.login(providerId, {
                                onAuth: function (info) {
                                    dialog.showAuth(info.url, info.instructions);
                                    if (usesCallbackServer) {
                                        // Show input for manual paste, racing with callback
                                        dialog
                                            .showManualInput("Paste redirect URL below, or complete login in browser:")
                                            .then(function (value) {
                                            if (value && manualCodeResolve) {
                                                manualCodeResolve(value);
                                                manualCodeResolve = undefined;
                                            }
                                        })
                                            .catch(function () {
                                            if (manualCodeReject) {
                                                manualCodeReject(new Error("Login cancelled"));
                                                manualCodeReject = undefined;
                                            }
                                        });
                                    }
                                    else if (providerId === "github-copilot") {
                                        // GitHub Copilot polls after onAuth
                                        dialog.showWaiting("Waiting for browser authentication...");
                                    }
                                    // For Anthropic: onPrompt is called immediately after
                                },
                                onPrompt: function (prompt) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        return [2 /*return*/, dialog.showPrompt(prompt.message, prompt.placeholder)];
                                    });
                                }); },
                                onProgress: function (message) {
                                    dialog.showProgress(message);
                                },
                                onManualCodeInput: function () { return manualCodePromise; },
                                signal: dialog.signal,
                            })];
                    case 2:
                        _b.sent();
                        // Success
                        restoreEditor();
                        this.session.modelRegistry.refresh();
                        return [4 /*yield*/, this.updateAvailableProviderCount()];
                    case 3:
                        _b.sent();
                        this.showStatus("Logged in to ".concat(providerName, ". Credentials saved to ").concat((0, config_js_1.getAuthPath)()));
                        return [3 /*break*/, 5];
                    case 4:
                        error_11 = _b.sent();
                        restoreEditor();
                        errorMsg = error_11 instanceof Error ? error_11.message : String(error_11);
                        if (errorMsg !== "Login cancelled") {
                            this.showError("Failed to login to ".concat(providerName, ": ").concat(errorMsg));
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // =========================================================================
    // Command handlers
    // =========================================================================
    InteractiveMode.prototype.handleReloadCommand = function () {
        return __awaiter(this, void 0, void 0, function () {
            var loader, previousEditor, dismissLoader, themeName, themeResult, editorPaddingX, autocompleteMaxVisible, runner, modelsJsonError, error_12;
            var _this = this;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (this.session.isStreaming) {
                            this.showWarning("Wait for the current response to finish before reloading.");
                            return [2 /*return*/];
                        }
                        if (this.session.isCompacting) {
                            this.showWarning("Wait for compaction to finish before reloading.");
                            return [2 /*return*/];
                        }
                        this.resetExtensionUI();
                        loader = new bordered_loader_js_1.BorderedLoader(this.ui, theme_js_1.theme, "Reloading extensions, skills, prompts, themes...", {
                            cancellable: false,
                        });
                        previousEditor = this.editor;
                        this.editorContainer.clear();
                        this.editorContainer.addChild(loader);
                        this.ui.setFocus(loader);
                        this.ui.requestRender();
                        dismissLoader = function (editor) {
                            loader.dispose();
                            _this.editorContainer.clear();
                            _this.editorContainer.addChild(editor);
                            _this.ui.setFocus(editor);
                            _this.ui.requestRender();
                        };
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.session.reload()];
                    case 2:
                        _f.sent();
                        (0, theme_js_1.setRegisteredThemes)(this.session.resourceLoader.getThemes().themes);
                        this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
                        themeName = this.settingsManager.getTheme();
                        themeResult = themeName ? (0, theme_js_1.setTheme)(themeName, true) : { success: true };
                        if (!themeResult.success) {
                            this.showError("Failed to load theme \"".concat(themeName, "\": ").concat(themeResult.error, "\nFell back to dark theme."));
                        }
                        editorPaddingX = this.settingsManager.getEditorPaddingX();
                        autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
                        this.defaultEditor.setPaddingX(editorPaddingX);
                        this.defaultEditor.setAutocompleteMaxVisible(autocompleteMaxVisible);
                        if (this.editor !== this.defaultEditor) {
                            (_b = (_a = this.editor).setPaddingX) === null || _b === void 0 ? void 0 : _b.call(_a, editorPaddingX);
                            (_d = (_c = this.editor).setAutocompleteMaxVisible) === null || _d === void 0 ? void 0 : _d.call(_c, autocompleteMaxVisible);
                        }
                        this.ui.setShowHardwareCursor(this.settingsManager.getShowHardwareCursor());
                        this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
                        this.setupAutocomplete(this.fdPath);
                        runner = this.session.extensionRunner;
                        if (runner) {
                            this.setupExtensionShortcuts(runner);
                        }
                        this.rebuildChatFromMessages();
                        dismissLoader(this.editor);
                        this.showLoadedResources({
                            extensionPaths: (_e = runner === null || runner === void 0 ? void 0 : runner.getExtensionPaths()) !== null && _e !== void 0 ? _e : [],
                            force: false,
                            showDiagnosticsWhenQuiet: true,
                        });
                        modelsJsonError = this.session.modelRegistry.getError();
                        if (modelsJsonError) {
                            this.showError("models.json error: ".concat(modelsJsonError));
                        }
                        this.showStatus("Reloaded extensions, skills, prompts, themes");
                        return [3 /*break*/, 4];
                    case 3:
                        error_12 = _f.sent();
                        dismissLoader(previousEditor);
                        this.showError("Reload failed: ".concat(error_12 instanceof Error ? error_12.message : String(error_12)));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleExportCommand = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var parts, outputPath, filePath, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parts = text.split(/\s+/);
                        outputPath = parts.length > 1 ? parts[1] : undefined;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.session.exportToHtml(outputPath)];
                    case 2:
                        filePath = _a.sent();
                        this.showStatus("Session exported to: ".concat(filePath));
                        return [3 /*break*/, 4];
                    case 3:
                        error_13 = _a.sent();
                        this.showError("Failed to export session: ".concat(error_13 instanceof Error ? error_13.message : "Unknown error"));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleShareCommand = function () {
        return __awaiter(this, void 0, void 0, function () {
            var authResult, tmpFile, error_14, loader, restoreEditor, proc, result, errorMsg, gistUrl, gistId, previewUrl, error_15;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Check if gh is available and logged in
                        try {
                            authResult = (0, child_process_1.spawnSync)("gh", ["auth", "status"], { encoding: "utf-8" });
                            if (authResult.status !== 0) {
                                this.showError("GitHub CLI is not logged in. Run 'gh auth login' first.");
                                return [2 /*return*/];
                            }
                        }
                        catch (_d) {
                            this.showError("GitHub CLI (gh) is not installed. Install it from https://cli.github.com/");
                            return [2 /*return*/];
                        }
                        tmpFile = path.join(os.tmpdir(), "session.html");
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.session.exportToHtml(tmpFile)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_14 = _c.sent();
                        this.showError("Failed to export session: ".concat(error_14 instanceof Error ? error_14.message : "Unknown error"));
                        return [2 /*return*/];
                    case 4:
                        loader = new bordered_loader_js_1.BorderedLoader(this.ui, theme_js_1.theme, "Creating gist...");
                        this.editorContainer.clear();
                        this.editorContainer.addChild(loader);
                        this.ui.setFocus(loader);
                        this.ui.requestRender();
                        restoreEditor = function () {
                            loader.dispose();
                            _this.editorContainer.clear();
                            _this.editorContainer.addChild(_this.editor);
                            _this.ui.setFocus(_this.editor);
                            try {
                                fs.unlinkSync(tmpFile);
                            }
                            catch (_a) {
                                // Ignore cleanup errors
                            }
                        };
                        proc = null;
                        loader.onAbort = function () {
                            proc === null || proc === void 0 ? void 0 : proc.kill();
                            restoreEditor();
                            _this.showStatus("Share cancelled");
                        };
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var _a, _b;
                                proc = (0, child_process_1.spawn)("gh", ["gist", "create", "--public=false", tmpFile]);
                                var stdout = "";
                                var stderr = "";
                                (_a = proc.stdout) === null || _a === void 0 ? void 0 : _a.on("data", function (data) {
                                    stdout += data.toString();
                                });
                                (_b = proc.stderr) === null || _b === void 0 ? void 0 : _b.on("data", function (data) {
                                    stderr += data.toString();
                                });
                                proc.on("close", function (code) { return resolve({ stdout: stdout, stderr: stderr, code: code }); });
                            })];
                    case 6:
                        result = _c.sent();
                        if (loader.signal.aborted)
                            return [2 /*return*/];
                        restoreEditor();
                        if (result.code !== 0) {
                            errorMsg = ((_a = result.stderr) === null || _a === void 0 ? void 0 : _a.trim()) || "Unknown error";
                            this.showError("Failed to create gist: ".concat(errorMsg));
                            return [2 /*return*/];
                        }
                        gistUrl = (_b = result.stdout) === null || _b === void 0 ? void 0 : _b.trim();
                        gistId = gistUrl === null || gistUrl === void 0 ? void 0 : gistUrl.split("/").pop();
                        if (!gistId) {
                            this.showError("Failed to parse gist ID from gh output");
                            return [2 /*return*/];
                        }
                        previewUrl = (0, config_js_1.getShareViewerUrl)(gistId);
                        this.showStatus("Share URL: ".concat(previewUrl, "\nGist: ").concat(gistUrl));
                        return [3 /*break*/, 8];
                    case 7:
                        error_15 = _c.sent();
                        if (!loader.signal.aborted) {
                            restoreEditor();
                            this.showError("Failed to create gist: ".concat(error_15 instanceof Error ? error_15.message : "Unknown error"));
                        }
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleCopyCommand = function () {
        var text = this.session.getLastAssistantText();
        if (!text) {
            this.showError("No agent messages to copy yet.");
            return;
        }
        try {
            (0, clipboard_js_1.copyToClipboard)(text);
            this.showStatus("Copied last agent message to clipboard");
        }
        catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        }
    };
    InteractiveMode.prototype.handleNameCommand = function (text) {
        var name = text.replace(/^\/name\s*/, "").trim();
        if (!name) {
            var currentName = this.sessionManager.getSessionName();
            if (currentName) {
                this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", "Session name: ".concat(currentName)), 1, 0));
            }
            else {
                this.showWarning("Usage: /name <name>");
            }
            this.ui.requestRender();
            return;
        }
        this.sessionManager.appendSessionInfo(name);
        this.updateTerminalTitle();
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", "Session name set: ".concat(name)), 1, 0));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.handleSessionCommand = function () {
        var _a;
        var stats = this.session.getSessionStats();
        var sessionName = this.sessionManager.getSessionName();
        var info = "".concat(theme_js_1.theme.bold("Session Info"), "\n\n");
        if (sessionName) {
            info += "".concat(theme_js_1.theme.fg("dim", "Name:"), " ").concat(sessionName, "\n");
        }
        info += "".concat(theme_js_1.theme.fg("dim", "File:"), " ").concat((_a = stats.sessionFile) !== null && _a !== void 0 ? _a : "In-memory", "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "ID:"), " ").concat(stats.sessionId, "\n\n");
        info += "".concat(theme_js_1.theme.bold("Messages"), "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "User:"), " ").concat(stats.userMessages, "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Assistant:"), " ").concat(stats.assistantMessages, "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Tool Calls:"), " ").concat(stats.toolCalls, "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Tool Results:"), " ").concat(stats.toolResults, "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Total:"), " ").concat(stats.totalMessages, "\n\n");
        info += "".concat(theme_js_1.theme.bold("Tokens"), "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Input:"), " ").concat(stats.tokens.input.toLocaleString(), "\n");
        info += "".concat(theme_js_1.theme.fg("dim", "Output:"), " ").concat(stats.tokens.output.toLocaleString(), "\n");
        if (stats.tokens.cacheRead > 0) {
            info += "".concat(theme_js_1.theme.fg("dim", "Cache Read:"), " ").concat(stats.tokens.cacheRead.toLocaleString(), "\n");
        }
        if (stats.tokens.cacheWrite > 0) {
            info += "".concat(theme_js_1.theme.fg("dim", "Cache Write:"), " ").concat(stats.tokens.cacheWrite.toLocaleString(), "\n");
        }
        info += "".concat(theme_js_1.theme.fg("dim", "Total:"), " ").concat(stats.tokens.total.toLocaleString(), "\n");
        if (stats.cost > 0) {
            info += "\n".concat(theme_js_1.theme.bold("Cost"), "\n");
            info += "".concat(theme_js_1.theme.fg("dim", "Total:"), " ").concat(stats.cost.toFixed(4));
        }
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Text(info, 1, 0));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.handleChangelogCommand = function () {
        var changelogPath = (0, changelog_js_1.getChangelogPath)();
        var allEntries = (0, changelog_js_1.parseChangelog)(changelogPath);
        var changelogMarkdown = allEntries.length > 0
            ? allEntries
                .reverse()
                .map(function (e) { return e.content; })
                .join("\n\n")
            : "No changelog entries found.";
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder());
        this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.bold(theme_js_1.theme.fg("accent", "What's New")), 1, 0));
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Markdown(changelogMarkdown, 1, 1, this.getMarkdownThemeWithSettings()));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder());
        this.ui.requestRender();
    };
    /**
     * Capitalize keybinding for display (e.g., "ctrl+c" -> "Ctrl+C").
     */
    InteractiveMode.prototype.capitalizeKey = function (key) {
        return key
            .split("/")
            .map(function (k) {
            return k
                .split("+")
                .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
                .join("+");
        })
            .join("/");
    };
    /**
     * Get capitalized display string for an app keybinding action.
     */
    InteractiveMode.prototype.getAppKeyDisplay = function (action) {
        return this.capitalizeKey((0, keybinding_hints_js_1.appKey)(this.keybindings, action));
    };
    /**
     * Get capitalized display string for an editor keybinding action.
     */
    InteractiveMode.prototype.getEditorKeyDisplay = function (action) {
        return this.capitalizeKey((0, keybinding_hints_js_1.editorKey)(action));
    };
    InteractiveMode.prototype.handleHotkeysCommand = function () {
        var _a;
        // Navigation keybindings
        var cursorWordLeft = this.getEditorKeyDisplay("cursorWordLeft");
        var cursorWordRight = this.getEditorKeyDisplay("cursorWordRight");
        var cursorLineStart = this.getEditorKeyDisplay("cursorLineStart");
        var cursorLineEnd = this.getEditorKeyDisplay("cursorLineEnd");
        var jumpForward = this.getEditorKeyDisplay("jumpForward");
        var jumpBackward = this.getEditorKeyDisplay("jumpBackward");
        var pageUp = this.getEditorKeyDisplay("pageUp");
        var pageDown = this.getEditorKeyDisplay("pageDown");
        // Editing keybindings
        var submit = this.getEditorKeyDisplay("submit");
        var newLine = this.getEditorKeyDisplay("newLine");
        var deleteWordBackward = this.getEditorKeyDisplay("deleteWordBackward");
        var deleteWordForward = this.getEditorKeyDisplay("deleteWordForward");
        var deleteToLineStart = this.getEditorKeyDisplay("deleteToLineStart");
        var deleteToLineEnd = this.getEditorKeyDisplay("deleteToLineEnd");
        var yank = this.getEditorKeyDisplay("yank");
        var yankPop = this.getEditorKeyDisplay("yankPop");
        var undo = this.getEditorKeyDisplay("undo");
        var tab = this.getEditorKeyDisplay("tab");
        // App keybindings
        var interrupt = this.getAppKeyDisplay("interrupt");
        var clear = this.getAppKeyDisplay("clear");
        var exit = this.getAppKeyDisplay("exit");
        var suspend = this.getAppKeyDisplay("suspend");
        var cycleThinkingLevel = this.getAppKeyDisplay("cycleThinkingLevel");
        var cycleModelForward = this.getAppKeyDisplay("cycleModelForward");
        var selectModel = this.getAppKeyDisplay("selectModel");
        var expandTools = this.getAppKeyDisplay("expandTools");
        var toggleThinking = this.getAppKeyDisplay("toggleThinking");
        var externalEditor = this.getAppKeyDisplay("externalEditor");
        var followUp = this.getAppKeyDisplay("followUp");
        var dequeue = this.getAppKeyDisplay("dequeue");
        var hotkeys = "\n**Navigation**\n| Key | Action |\n|-----|--------|\n| `Arrow keys` | Move cursor / browse history (Up when empty) |\n| `".concat(cursorWordLeft, "` / `").concat(cursorWordRight, "` | Move by word |\n| `").concat(cursorLineStart, "` | Start of line |\n| `").concat(cursorLineEnd, "` | End of line |\n| `").concat(jumpForward, "` | Jump forward to character |\n| `").concat(jumpBackward, "` | Jump backward to character |\n| `").concat(pageUp, "` / `").concat(pageDown, "` | Scroll by page |\n\n**Editing**\n| Key | Action |\n|-----|--------|\n| `").concat(submit, "` | Send message |\n| `").concat(newLine, "` | New line").concat(process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : "", " |\n| `").concat(deleteWordBackward, "` | Delete word backwards |\n| `").concat(deleteWordForward, "` | Delete word forwards |\n| `").concat(deleteToLineStart, "` | Delete to start of line |\n| `").concat(deleteToLineEnd, "` | Delete to end of line |\n| `").concat(yank, "` | Paste the most-recently-deleted text |\n| `").concat(yankPop, "` | Cycle through the deleted text after pasting |\n| `").concat(undo, "` | Undo |\n\n**Other**\n| Key | Action |\n|-----|--------|\n| `").concat(tab, "` | Path completion / accept autocomplete |\n| `").concat(interrupt, "` | Cancel autocomplete / abort streaming |\n| `").concat(clear, "` | Clear editor (first) / exit (second) |\n| `").concat(exit, "` | Exit (when editor is empty) |\n| `").concat(suspend, "` | Suspend to background |\n| `").concat(cycleThinkingLevel, "` | Cycle thinking level |\n| `").concat(cycleModelForward, "` | Cycle models |\n| `").concat(selectModel, "` | Open model selector |\n| `").concat(expandTools, "` | Toggle tool output expansion |\n| `").concat(toggleThinking, "` | Toggle thinking block visibility |\n| `").concat(externalEditor, "` | Edit message in external editor |\n| `").concat(followUp, "` | Queue follow-up message |\n| `").concat(dequeue, "` | Restore queued messages |\n| `Ctrl+V` | Paste image from clipboard |\n| `/` | Slash commands |\n| `!` | Run bash command |\n| `!!` | Run bash command (excluded from context) |\n");
        // Add extension-registered shortcuts
        var extensionRunner = this.session.extensionRunner;
        if (extensionRunner) {
            var shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
            if (shortcuts.size > 0) {
                hotkeys += "\n**Extensions**\n| Key | Action |\n|-----|--------|\n";
                for (var _i = 0, shortcuts_2 = shortcuts; _i < shortcuts_2.length; _i++) {
                    var _b = shortcuts_2[_i], key = _b[0], shortcut = _b[1];
                    var description = (_a = shortcut.description) !== null && _a !== void 0 ? _a : shortcut.extensionPath;
                    var keyDisplay = key.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
                    hotkeys += "| `".concat(keyDisplay, "` | ").concat(description, " |\n");
                }
            }
        }
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder());
        this.chatContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.bold(theme_js_1.theme.fg("accent", "Keyboard Shortcuts")), 1, 0));
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Markdown(hotkeys.trim(), 1, 1, this.getMarkdownThemeWithSettings()));
        this.chatContainer.addChild(new dynamic_border_js_1.DynamicBorder());
        this.ui.requestRender();
    };
    InteractiveMode.prototype.handleClearCommand = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Stop loading animation
                        if (this.loadingAnimation) {
                            this.loadingAnimation.stop();
                            this.loadingAnimation = undefined;
                        }
                        this.statusContainer.clear();
                        // New session via session (emits extension session events)
                        return [4 /*yield*/, this.session.newSession()];
                    case 1:
                        // New session via session (emits extension session events)
                        _a.sent();
                        // Clear UI state
                        this.headerContainer.clear();
                        this.chatContainer.clear();
                        this.pendingMessagesContainer.clear();
                        this.compactionQueuedMessages = [];
                        this.streamingComponent = undefined;
                        this.streamingMessage = undefined;
                        this.pendingTools.clear();
                        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                        this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("accent", "✓ New session started")), 1, 1));
                        this.ui.requestRender();
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleDebugCommand = function () {
        var width = this.ui.terminal.columns;
        var height = this.ui.terminal.rows;
        var allLines = this.ui.render(width);
        var debugLogPath = (0, config_js_1.getDebugLogPath)();
        var debugData = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            "Debug output at ".concat(new Date().toISOString()),
            "Terminal: ".concat(width, "x").concat(height),
            "Total lines: ".concat(allLines.length),
            "",
            "=== All rendered lines with visible widths ==="
        ], allLines.map(function (line, idx) {
            var vw = (0, pi_tui_1.visibleWidth)(line);
            var escaped = JSON.stringify(line);
            return "[".concat(idx, "] (w=").concat(vw, ") ").concat(escaped);
        }), true), [
            "",
            "=== Agent messages (JSONL) ==="
        ], false), this.session.messages.map(function (msg) { return JSON.stringify(msg); }), true), [
            "",
        ], false).join("\n");
        fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
        fs.writeFileSync(debugLogPath, debugData);
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new pi_tui_1.Text("".concat(theme_js_1.theme.fg("accent", "✓ Debug log written"), "\n").concat(theme_js_1.theme.fg("muted", debugLogPath)), 1, 1));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.handleArminSaysHi = function () {
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new armin_js_1.ArminComponent(this.ui));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.handleDaxnuts = function () {
        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
        this.chatContainer.addChild(new daxnuts_js_1.DaxnutsComponent(this.ui));
        this.ui.requestRender();
    };
    InteractiveMode.prototype.checkDaxnutsEasterEgg = function (model) {
        if (model.provider === "opencode" && model.id.toLowerCase().includes("kimi-k2.5")) {
            this.handleDaxnuts();
        }
    };
    InteractiveMode.prototype.handleBashCommand = function (command_1) {
        return __awaiter(this, arguments, void 0, function (command, excludeFromContext) {
            var extensionRunner, eventResult, _a, result, isDeferred, result, error_16;
            var _this = this;
            if (excludeFromContext === void 0) { excludeFromContext = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        extensionRunner = this.session.extensionRunner;
                        if (!extensionRunner) return [3 /*break*/, 2];
                        return [4 /*yield*/, extensionRunner.emitUserBash({
                                type: "user_bash",
                                command: command,
                                excludeFromContext: excludeFromContext,
                                cwd: process.cwd(),
                            })];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = undefined;
                        _b.label = 3;
                    case 3:
                        eventResult = _a;
                        // If extension returned a full result, use it directly
                        if (eventResult === null || eventResult === void 0 ? void 0 : eventResult.result) {
                            result = eventResult.result;
                            // Create UI component for display
                            this.bashComponent = new bash_execution_js_1.BashExecutionComponent(command, this.ui, excludeFromContext);
                            if (this.session.isStreaming) {
                                this.pendingMessagesContainer.addChild(this.bashComponent);
                                this.pendingBashComponents.push(this.bashComponent);
                            }
                            else {
                                this.chatContainer.addChild(this.bashComponent);
                            }
                            // Show output and complete
                            if (result.output) {
                                this.bashComponent.appendOutput(result.output);
                            }
                            this.bashComponent.setComplete(result.exitCode, result.cancelled, result.truncated ? { truncated: true, content: result.output } : undefined, result.fullOutputPath);
                            // Record the result in session
                            this.session.recordBashResult(command, result, { excludeFromContext: excludeFromContext });
                            this.bashComponent = undefined;
                            this.ui.requestRender();
                            return [2 /*return*/];
                        }
                        isDeferred = this.session.isStreaming;
                        this.bashComponent = new bash_execution_js_1.BashExecutionComponent(command, this.ui, excludeFromContext);
                        if (isDeferred) {
                            // Show in pending area when agent is streaming
                            this.pendingMessagesContainer.addChild(this.bashComponent);
                            this.pendingBashComponents.push(this.bashComponent);
                        }
                        else {
                            // Show in chat immediately when agent is idle
                            this.chatContainer.addChild(this.bashComponent);
                        }
                        this.ui.requestRender();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.session.executeBash(command, function (chunk) {
                                if (_this.bashComponent) {
                                    _this.bashComponent.appendOutput(chunk);
                                    _this.ui.requestRender();
                                }
                            }, { excludeFromContext: excludeFromContext, operations: eventResult === null || eventResult === void 0 ? void 0 : eventResult.operations })];
                    case 5:
                        result = _b.sent();
                        if (this.bashComponent) {
                            this.bashComponent.setComplete(result.exitCode, result.cancelled, result.truncated ? { truncated: true, content: result.output } : undefined, result.fullOutputPath);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        error_16 = _b.sent();
                        if (this.bashComponent) {
                            this.bashComponent.setComplete(undefined, false);
                        }
                        this.showError("Bash command failed: ".concat(error_16 instanceof Error ? error_16.message : "Unknown error"));
                        return [3 /*break*/, 7];
                    case 7:
                        this.bashComponent = undefined;
                        this.ui.requestRender();
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.handleCompactCommand = function (customInstructions) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, messageCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        entries = this.sessionManager.getEntries();
                        messageCount = entries.filter(function (e) { return e.type === "message"; }).length;
                        if (messageCount < 2) {
                            this.showWarning("Nothing to compact (no messages yet)");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.executeCompaction(customInstructions, false)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    InteractiveMode.prototype.executeCompaction = function (customInstructions_1) {
        return __awaiter(this, arguments, void 0, function (customInstructions, isAuto) {
            var originalOnEscape, cancelHint, label, compactingLoader, result, msg, error_17, message;
            var _this = this;
            if (isAuto === void 0) { isAuto = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Stop loading animation
                        if (this.loadingAnimation) {
                            this.loadingAnimation.stop();
                            this.loadingAnimation = undefined;
                        }
                        this.statusContainer.clear();
                        originalOnEscape = this.defaultEditor.onEscape;
                        this.defaultEditor.onEscape = function () {
                            _this.session.abortCompaction();
                        };
                        // Show compacting status
                        this.chatContainer.addChild(new pi_tui_1.Spacer(1));
                        cancelHint = "(".concat((0, keybinding_hints_js_1.appKey)(this.keybindings, "interrupt"), " to cancel)");
                        label = isAuto ? "Auto-compacting context... ".concat(cancelHint) : "Compacting context... ".concat(cancelHint);
                        compactingLoader = new pi_tui_1.Loader(this.ui, function (spinner) { return theme_js_1.theme.fg("accent", spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, label);
                        this.statusContainer.addChild(compactingLoader);
                        this.ui.requestRender();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, this.session.compact(customInstructions)];
                    case 2:
                        result = _a.sent();
                        // Rebuild UI
                        this.rebuildChatFromMessages();
                        msg = (0, messages_js_1.createCompactionSummaryMessage)(result.summary, result.tokensBefore, new Date().toISOString());
                        this.addMessageToChat(msg);
                        this.footer.invalidate();
                        return [3 /*break*/, 5];
                    case 3:
                        error_17 = _a.sent();
                        message = error_17 instanceof Error ? error_17.message : String(error_17);
                        if (message === "Compaction cancelled" || (error_17 instanceof Error && error_17.name === "AbortError")) {
                            this.showError("Compaction cancelled");
                        }
                        else {
                            this.showError("Compaction failed: ".concat(message));
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        compactingLoader.stop();
                        this.statusContainer.clear();
                        this.defaultEditor.onEscape = originalOnEscape;
                        return [7 /*endfinally*/];
                    case 5:
                        void this.flushCompactionQueue({ willRetry: false });
                        return [2 /*return*/, result];
                }
            });
        });
    };
    InteractiveMode.prototype.stop = function () {
        if (this.loadingAnimation) {
            this.loadingAnimation.stop();
            this.loadingAnimation = undefined;
        }
        this.clearExtensionTerminalInputListeners();
        this.footer.dispose();
        this.footerDataProvider.dispose();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.isInitialized) {
            this.ui.stop();
            this.isInitialized = false;
        }
    };
    // Maximum total widget lines to prevent viewport overflow
    InteractiveMode.MAX_WIDGET_LINES = 10;
    return InteractiveMode;
}());
exports.InteractiveMode = InteractiveMode;
