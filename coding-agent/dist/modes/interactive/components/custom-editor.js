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
exports.CustomEditor = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
/**
 * Custom editor that handles app-level keybindings for coding-agent.
 */
var CustomEditor = /** @class */ (function (_super) {
    __extends(CustomEditor, _super);
    function CustomEditor(tui, theme, keybindings, options) {
        var _this = _super.call(this, tui, theme, options) || this;
        _this.actionHandlers = new Map();
        _this.keybindings = keybindings;
        return _this;
    }
    /**
     * Register a handler for an app action.
     */
    CustomEditor.prototype.onAction = function (action, handler) {
        this.actionHandlers.set(action, handler);
    };
    CustomEditor.prototype.handleInput = function (data) {
        var _a, _b, _c, _d;
        // Check extension-registered shortcuts first
        if ((_a = this.onExtensionShortcut) === null || _a === void 0 ? void 0 : _a.call(this, data)) {
            return;
        }
        // Check for paste image keybinding
        if (this.keybindings.matches(data, "pasteImage")) {
            (_b = this.onPasteImage) === null || _b === void 0 ? void 0 : _b.call(this);
            return;
        }
        // Check app keybindings first
        // Escape/interrupt - only if autocomplete is NOT active
        if (this.keybindings.matches(data, "interrupt")) {
            if (!this.isShowingAutocomplete()) {
                // Use dynamic onEscape if set, otherwise registered handler
                var handler = (_c = this.onEscape) !== null && _c !== void 0 ? _c : this.actionHandlers.get("interrupt");
                if (handler) {
                    handler();
                    return;
                }
            }
            // Let parent handle escape for autocomplete cancellation
            _super.prototype.handleInput.call(this, data);
            return;
        }
        // Exit (Ctrl+D) - only when editor is empty
        if (this.keybindings.matches(data, "exit")) {
            if (this.getText().length === 0) {
                var handler = (_d = this.onCtrlD) !== null && _d !== void 0 ? _d : this.actionHandlers.get("exit");
                if (handler)
                    handler();
                return;
            }
            // Fall through to editor handling for delete-char-forward when not empty
        }
        // Check all other app actions
        for (var _i = 0, _e = this.actionHandlers; _i < _e.length; _i++) {
            var _f = _e[_i], action = _f[0], handler = _f[1];
            if (action !== "interrupt" && action !== "exit" && this.keybindings.matches(data, action)) {
                handler();
                return;
            }
        }
        // Pass to parent for editor handling
        _super.prototype.handleInput.call(this, data);
    };
    return CustomEditor;
}(pi_tui_1.Editor));
exports.CustomEditor = CustomEditor;
