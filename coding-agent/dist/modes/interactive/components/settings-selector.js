"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var SETTINGS_SUBMENU_SELECT_LIST_LAYOUT = {
    minPrimaryColumnWidth: 12,
    maxPrimaryColumnWidth: 32,
};
var THINKING_DESCRIPTIONS = {
    off: "No reasoning",
    minimal: "Very brief reasoning (~1k tokens)",
    low: "Light reasoning (~2k tokens)",
    medium: "Moderate reasoning (~8k tokens)",
    high: "Deep reasoning (~16k tokens)",
    xhigh: "Maximum reasoning (~32k tokens)",
};
/**
 * A submenu component for selecting from a list of options.
 */
var SelectSubmenu = /** @class */ (function (_super) {
    __extends(SelectSubmenu, _super);
    function SelectSubmenu(title, description, options, currentValue, onSelect, onCancel, onSelectionChange) {
        var _this = _super.call(this) || this;
        // Title
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.bold(theme_js_1.theme.fg("accent", title)), 0, 0));
        // Description
        if (description) {
            _this.addChild(new pi_tui_1.Spacer(1));
            _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", description), 0, 0));
        }
        // Spacer
        _this.addChild(new pi_tui_1.Spacer(1));
        // Select list
        _this.selectList = new pi_tui_1.SelectList(options, Math.min(options.length, 10), (0, theme_js_1.getSelectListTheme)(), SETTINGS_SUBMENU_SELECT_LIST_LAYOUT);
        // Pre-select current value
        var currentIndex = options.findIndex(function (o) { return o.value === currentValue; });
        if (currentIndex !== -1) {
            _this.selectList.setSelectedIndex(currentIndex);
        }
        _this.selectList.onSelect = function (item) {
            onSelect(item.value);
        };
        _this.selectList.onCancel = onCancel;
        if (onSelectionChange) {
            _this.selectList.onSelectionChange = function (item) {
                onSelectionChange(item.value);
            };
        }
        _this.addChild(_this.selectList);
        // Hint
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", "  Enter to select · Esc to go back"), 0, 0));
        return _this;
    }
    SelectSubmenu.prototype.handleInput = function (data) {
        this.selectList.handleInput(data);
    };
    return SelectSubmenu;
}(pi_tui_1.Container));
/**
 * Main settings selector component.
 */
var SettingsSelectorComponent = /** @class */ (function (_super) {
    __extends(SettingsSelectorComponent, _super);
    function SettingsSelectorComponent(config, callbacks) {
        var _this = _super.call(this) || this;
        var supportsImages = (0, pi_tui_1.getCapabilities)().images;
        var items = [
            {
                id: "autocompact",
                label: "Auto-compact",
                description: "Automatically compact context when it gets too large",
                currentValue: config.autoCompact ? "true" : "false",
                values: ["true", "false"],
            },
            {
                id: "steering-mode",
                label: "Steering mode",
                description: "Enter while streaming queues steering messages. 'one-at-a-time': deliver one, wait for response. 'all': deliver all at once.",
                currentValue: config.steeringMode,
                values: ["one-at-a-time", "all"],
            },
            {
                id: "follow-up-mode",
                label: "Follow-up mode",
                description: "Alt+Enter queues follow-up messages until agent stops. 'one-at-a-time': deliver one, wait for response. 'all': deliver all at once.",
                currentValue: config.followUpMode,
                values: ["one-at-a-time", "all"],
            },
            {
                id: "transport",
                label: "Transport",
                description: "Preferred transport for providers that support multiple transports",
                currentValue: config.transport,
                values: ["sse", "websocket", "auto"],
            },
            {
                id: "hide-thinking",
                label: "Hide thinking",
                description: "Hide thinking blocks in assistant responses",
                currentValue: config.hideThinkingBlock ? "true" : "false",
                values: ["true", "false"],
            },
            {
                id: "collapse-changelog",
                label: "Collapse changelog",
                description: "Show condensed changelog after updates",
                currentValue: config.collapseChangelog ? "true" : "false",
                values: ["true", "false"],
            },
            {
                id: "quiet-startup",
                label: "Quiet startup",
                description: "Disable verbose printing at startup",
                currentValue: config.quietStartup ? "true" : "false",
                values: ["true", "false"],
            },
            {
                id: "double-escape-action",
                label: "Double-escape action",
                description: "Action when pressing Escape twice with empty editor",
                currentValue: config.doubleEscapeAction,
                values: ["tree", "fork", "none"],
            },
            {
                id: "tree-filter-mode",
                label: "Tree filter mode",
                description: "Default filter when opening /tree",
                currentValue: config.treeFilterMode,
                values: ["default", "no-tools", "user-only", "labeled-only", "all"],
            },
            {
                id: "thinking",
                label: "Thinking level",
                description: "Reasoning depth for thinking-capable models",
                currentValue: config.thinkingLevel,
                submenu: function (currentValue, done) {
                    return new SelectSubmenu("Thinking Level", "Select reasoning depth for thinking-capable models", config.availableThinkingLevels.map(function (level) { return ({
                        value: level,
                        label: level,
                        description: THINKING_DESCRIPTIONS[level],
                    }); }), currentValue, function (value) {
                        callbacks.onThinkingLevelChange(value);
                        done(value);
                    }, function () { return done(); });
                },
            },
            {
                id: "theme",
                label: "Theme",
                description: "Color theme for the interface",
                currentValue: config.currentTheme,
                submenu: function (currentValue, done) {
                    return new SelectSubmenu("Theme", "Select color theme", config.availableThemes.map(function (t) { return ({
                        value: t,
                        label: t,
                    }); }), currentValue, function (value) {
                        callbacks.onThemeChange(value);
                        done(value);
                    }, function () {
                        var _a;
                        // Restore original theme on cancel
                        (_a = callbacks.onThemePreview) === null || _a === void 0 ? void 0 : _a.call(callbacks, currentValue);
                        done();
                    }, function (value) {
                        var _a;
                        // Preview theme on selection change
                        (_a = callbacks.onThemePreview) === null || _a === void 0 ? void 0 : _a.call(callbacks, value);
                    });
                },
            },
        ];
        // Only show image toggle if terminal supports it
        if (supportsImages) {
            // Insert after autocompact
            items.splice(1, 0, {
                id: "show-images",
                label: "Show images",
                description: "Render images inline in terminal",
                currentValue: config.showImages ? "true" : "false",
                values: ["true", "false"],
            });
        }
        // Image auto-resize toggle (always available, affects both attached and read images)
        items.splice(supportsImages ? 2 : 1, 0, {
            id: "auto-resize-images",
            label: "Auto-resize images",
            description: "Resize large images to 2000x2000 max for better model compatibility",
            currentValue: config.autoResizeImages ? "true" : "false",
            values: ["true", "false"],
        });
        // Block images toggle (always available, insert after auto-resize-images)
        var autoResizeIndex = items.findIndex(function (item) { return item.id === "auto-resize-images"; });
        items.splice(autoResizeIndex + 1, 0, {
            id: "block-images",
            label: "Block images",
            description: "Prevent images from being sent to LLM providers",
            currentValue: config.blockImages ? "true" : "false",
            values: ["true", "false"],
        });
        // Skill commands toggle (insert after block-images)
        var blockImagesIndex = items.findIndex(function (item) { return item.id === "block-images"; });
        items.splice(blockImagesIndex + 1, 0, {
            id: "skill-commands",
            label: "Skill commands",
            description: "Register skills as /skill:name commands",
            currentValue: config.enableSkillCommands ? "true" : "false",
            values: ["true", "false"],
        });
        // Hardware cursor toggle (insert after skill-commands)
        var skillCommandsIndex = items.findIndex(function (item) { return item.id === "skill-commands"; });
        items.splice(skillCommandsIndex + 1, 0, {
            id: "show-hardware-cursor",
            label: "Show hardware cursor",
            description: "Show the terminal cursor while still positioning it for IME support",
            currentValue: config.showHardwareCursor ? "true" : "false",
            values: ["true", "false"],
        });
        // Editor padding toggle (insert after show-hardware-cursor)
        var hardwareCursorIndex = items.findIndex(function (item) { return item.id === "show-hardware-cursor"; });
        items.splice(hardwareCursorIndex + 1, 0, {
            id: "editor-padding",
            label: "Editor padding",
            description: "Horizontal padding for input editor (0-3)",
            currentValue: String(config.editorPaddingX),
            values: ["0", "1", "2", "3"],
        });
        // Autocomplete max visible toggle (insert after editor-padding)
        var editorPaddingIndex = items.findIndex(function (item) { return item.id === "editor-padding"; });
        items.splice(editorPaddingIndex + 1, 0, {
            id: "autocomplete-max-visible",
            label: "Autocomplete max items",
            description: "Max visible items in autocomplete dropdown (3-20)",
            currentValue: String(config.autocompleteMaxVisible),
            values: ["3", "5", "7", "10", "15", "20"],
        });
        // Clear on shrink toggle (insert after autocomplete-max-visible)
        var autocompleteIndex = items.findIndex(function (item) { return item.id === "autocomplete-max-visible"; });
        items.splice(autocompleteIndex + 1, 0, {
            id: "clear-on-shrink",
            label: "Clear on shrink",
            description: "Clear empty rows when content shrinks (may cause flicker)",
            currentValue: config.clearOnShrink ? "true" : "false",
            values: ["true", "false"],
        });
        // Add borders
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.settingsList = new pi_tui_1.SettingsList(items, 10, (0, theme_js_1.getSettingsListTheme)(), function (id, newValue) {
            switch (id) {
                case "autocompact":
                    callbacks.onAutoCompactChange(newValue === "true");
                    break;
                case "show-images":
                    callbacks.onShowImagesChange(newValue === "true");
                    break;
                case "auto-resize-images":
                    callbacks.onAutoResizeImagesChange(newValue === "true");
                    break;
                case "block-images":
                    callbacks.onBlockImagesChange(newValue === "true");
                    break;
                case "skill-commands":
                    callbacks.onEnableSkillCommandsChange(newValue === "true");
                    break;
                case "steering-mode":
                    callbacks.onSteeringModeChange(newValue);
                    break;
                case "follow-up-mode":
                    callbacks.onFollowUpModeChange(newValue);
                    break;
                case "transport":
                    callbacks.onTransportChange(newValue);
                    break;
                case "hide-thinking":
                    callbacks.onHideThinkingBlockChange(newValue === "true");
                    break;
                case "collapse-changelog":
                    callbacks.onCollapseChangelogChange(newValue === "true");
                    break;
                case "quiet-startup":
                    callbacks.onQuietStartupChange(newValue === "true");
                    break;
                case "double-escape-action":
                    callbacks.onDoubleEscapeActionChange(newValue);
                    break;
                case "tree-filter-mode":
                    callbacks.onTreeFilterModeChange(newValue);
                    break;
                case "show-hardware-cursor":
                    callbacks.onShowHardwareCursorChange(newValue === "true");
                    break;
                case "editor-padding":
                    callbacks.onEditorPaddingXChange(parseInt(newValue, 10));
                    break;
                case "autocomplete-max-visible":
                    callbacks.onAutocompleteMaxVisibleChange(parseInt(newValue, 10));
                    break;
                case "clear-on-shrink":
                    callbacks.onClearOnShrinkChange(newValue === "true");
                    break;
            }
        }, callbacks.onCancel, { enableSearch: true });
        _this.addChild(_this.settingsList);
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    SettingsSelectorComponent.prototype.getSettingsList = function () {
        return this.settingsList;
    };
    return SettingsSelectorComponent;
}(pi_tui_1.Container));
exports.SettingsSelectorComponent = SettingsSelectorComponent;
