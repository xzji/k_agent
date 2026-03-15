"use strict";
/**
 * Multi-line editor component for extensions.
 * Supports Ctrl+G for external editor.
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
exports.ExtensionEditorComponent = void 0;
var node_child_process_1 = require("node:child_process");
var fs = require("node:fs");
var os = require("node:os");
var path = require("node:path");
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var ExtensionEditorComponent = /** @class */ (function (_super) {
    __extends(ExtensionEditorComponent, _super);
    function ExtensionEditorComponent(tui, keybindings, title, prefill, onSubmit, onCancel, options) {
        var _this = _super.call(this) || this;
        _this._focused = false;
        _this.tui = tui;
        _this.keybindings = keybindings;
        _this.onSubmitCallback = onSubmit;
        _this.onCancelCallback = onCancel;
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add title
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("accent", title), 1, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create editor
        _this.editor = new pi_tui_1.Editor(tui, (0, theme_js_1.getEditorTheme)(), options);
        if (prefill) {
            _this.editor.setText(prefill);
        }
        // Wire up Enter to submit (Shift+Enter for newlines, like the main editor)
        _this.editor.onSubmit = function (text) {
            _this.onSubmitCallback(text);
        };
        _this.addChild(_this.editor);
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add hint
        var hasExternalEditor = !!(process.env.VISUAL || process.env.EDITOR);
        var hint = (0, keybinding_hints_js_1.keyHint)("selectConfirm", "submit") +
            "  " +
            (0, keybinding_hints_js_1.keyHint)("newLine", "newline") +
            "  " +
            (0, keybinding_hints_js_1.keyHint)("selectCancel", "cancel") +
            (hasExternalEditor ? "  ".concat((0, keybinding_hints_js_1.appKeyHint)(_this.keybindings, "externalEditor", "external editor")) : "");
        _this.addChild(new pi_tui_1.Text(hint, 1, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    Object.defineProperty(ExtensionEditorComponent.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.editor.focused = value;
        },
        enumerable: false,
        configurable: true
    });
    ExtensionEditorComponent.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        // Escape or Ctrl+C to cancel
        if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
            return;
        }
        // External editor (app keybinding)
        if (this.keybindings.matches(keyData, "externalEditor")) {
            this.openExternalEditor();
            return;
        }
        // Forward to editor
        this.editor.handleInput(keyData);
    };
    ExtensionEditorComponent.prototype.openExternalEditor = function () {
        var editorCmd = process.env.VISUAL || process.env.EDITOR;
        if (!editorCmd) {
            return;
        }
        var currentText = this.editor.getText();
        var tmpFile = path.join(os.tmpdir(), "pi-extension-editor-".concat(Date.now(), ".md"));
        try {
            fs.writeFileSync(tmpFile, currentText, "utf-8");
            this.tui.stop();
            var _a = editorCmd.split(" "), editor = _a[0], editorArgs = _a.slice(1);
            var result = (0, node_child_process_1.spawnSync)(editor, __spreadArray(__spreadArray([], editorArgs, true), [tmpFile], false), {
                stdio: "inherit",
                shell: process.platform === "win32",
            });
            if (result.status === 0) {
                var newContent = fs.readFileSync(tmpFile, "utf-8").replace(/\n$/, "");
                this.editor.setText(newContent);
            }
        }
        finally {
            try {
                fs.unlinkSync(tmpFile);
            }
            catch (_b) {
                // Ignore cleanup errors
            }
            this.tui.start();
            // Force full re-render since external editor uses alternate screen
            this.tui.requestRender(true);
        }
    };
    return ExtensionEditorComponent;
}(pi_tui_1.Container));
exports.ExtensionEditorComponent = ExtensionEditorComponent;
