"use strict";
/**
 * Simple text input component for extensions.
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
exports.ExtensionInputComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var countdown_timer_js_1 = require("./countdown-timer.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var ExtensionInputComponent = /** @class */ (function (_super) {
    __extends(ExtensionInputComponent, _super);
    function ExtensionInputComponent(title, _placeholder, onSubmit, onCancel, opts) {
        var _this = _super.call(this) || this;
        // Focusable implementation - propagate to input for IME cursor positioning
        _this._focused = false;
        _this.onSubmitCallback = onSubmit;
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
        _this.input = new pi_tui_1.Input();
        _this.addChild(_this.input);
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Text("".concat((0, keybinding_hints_js_1.keyHint)("selectConfirm", "submit"), "  ").concat((0, keybinding_hints_js_1.keyHint)("selectCancel", "cancel")), 1, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    Object.defineProperty(ExtensionInputComponent.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.input.focused = value;
        },
        enumerable: false,
        configurable: true
    });
    ExtensionInputComponent.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(keyData, "selectConfirm") || keyData === "\n") {
            this.onSubmitCallback(this.input.getValue());
        }
        else if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
        }
        else {
            this.input.handleInput(keyData);
        }
    };
    ExtensionInputComponent.prototype.dispose = function () {
        var _a;
        (_a = this.countdown) === null || _a === void 0 ? void 0 : _a.dispose();
    };
    return ExtensionInputComponent;
}(pi_tui_1.Container));
exports.ExtensionInputComponent = ExtensionInputComponent;
