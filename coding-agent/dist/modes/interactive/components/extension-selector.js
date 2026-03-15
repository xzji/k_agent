"use strict";
/**
 * Generic selector component for extensions.
 * Displays a list of string options with keyboard navigation.
 */
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
exports.ExtensionSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var countdown_timer_js_1 = require("./countdown-timer.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var ExtensionSelectorComponent = /** @class */ (function (_super) {
    __extends(ExtensionSelectorComponent, _super);
    function ExtensionSelectorComponent(title, options, onSelect, onCancel, opts) {
        var _this = _super.call(this) || this;
        _this.selectedIndex = 0;
        _this.options = options;
        _this.onSelectCallback = onSelect;
        _this.onCancelCallback = onCancel;
        _this.baseTitle = title;
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.titleText = new pi_tui_1.Text(theme_js_1.theme.fg("accent", title), 1, 0);
        _this.addChild(_this.titleText);
        _this.addChild(new pi_tui_1.Spacer(1));
        if ((opts === null || opts === void 0 ? void 0 : opts.timeout) && opts.timeout > 0 && opts.tui) {
            _this.countdown = new countdown_timer_js_1.CountdownTimer(opts.timeout, opts.tui, function (s) { return _this.titleText.setText(theme_js_1.theme.fg("accent", "".concat(_this.baseTitle, " (").concat(s, "s)"))); }, function () { return _this.onCancelCallback(); });
        }
        _this.listContainer = new pi_tui_1.Container();
        _this.addChild(_this.listContainer);
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Text((0, keybinding_hints_js_1.rawKeyHint)("↑↓", "navigate") +
            "  " +
            (0, keybinding_hints_js_1.keyHint)("selectConfirm", "select") +
            "  " +
            (0, keybinding_hints_js_1.keyHint)("selectCancel", "cancel"), 1, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.updateList();
        return _this;
    }
    ExtensionSelectorComponent.prototype.updateList = function () {
        this.listContainer.clear();
        for (var i = 0; i < this.options.length; i++) {
            var isSelected = i === this.selectedIndex;
            var text = isSelected
                ? theme_js_1.theme.fg("accent", "→ ") + theme_js_1.theme.fg("accent", this.options[i])
                : "  ".concat(theme_js_1.theme.fg("text", this.options[i]));
            this.listContainer.addChild(new pi_tui_1.Text(text, 1, 0));
        }
    };
    ExtensionSelectorComponent.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(keyData, "selectUp") || keyData === "k") {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.updateList();
        }
        else if (kb.matches(keyData, "selectDown") || keyData === "j") {
            this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1);
            this.updateList();
        }
        else if (kb.matches(keyData, "selectConfirm") || keyData === "\n") {
            var selected = this.options[this.selectedIndex];
            if (selected)
                this.onSelectCallback(selected);
        }
        else if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
        }
    };
    ExtensionSelectorComponent.prototype.dispose = function () {
        var _a;
        (_a = this.countdown) === null || _a === void 0 ? void 0 : _a.dispose();
    };
    return ExtensionSelectorComponent;
}(pi_tui_1.Container));
exports.ExtensionSelectorComponent = ExtensionSelectorComponent;
