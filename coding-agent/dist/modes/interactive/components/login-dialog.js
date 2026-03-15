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
exports.LoginDialogComponent = void 0;
var oauth_1 = require("@mariozechner/pi-ai/oauth");
var pi_tui_1 = require("@mariozechner/pi-tui");
var child_process_1 = require("child_process");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
/**
 * Login dialog component - replaces editor during OAuth login flow
 */
var LoginDialogComponent = /** @class */ (function (_super) {
    __extends(LoginDialogComponent, _super);
    function LoginDialogComponent(tui, providerId, onComplete) {
        var _this = _super.call(this) || this;
        _this.onComplete = onComplete;
        _this.abortController = new AbortController();
        // Focusable implementation - propagate to input for IME cursor positioning
        _this._focused = false;
        _this.tui = tui;
        var providerInfo = (0, oauth_1.getOAuthProviders)().find(function (p) { return p.id === providerId; });
        var providerName = (providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.name) || providerId;
        // Top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Title
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("warning", "Login to ".concat(providerName)), 1, 0));
        // Dynamic content area
        _this.contentContainer = new pi_tui_1.Container();
        _this.addChild(_this.contentContainer);
        // Input (always present, used when needed)
        _this.input = new pi_tui_1.Input();
        _this.input.onSubmit = function () {
            if (_this.inputResolver) {
                _this.inputResolver(_this.input.getValue());
                _this.inputResolver = undefined;
                _this.inputRejecter = undefined;
            }
        };
        _this.input.onEscape = function () {
            _this.cancel();
        };
        // Bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    Object.defineProperty(LoginDialogComponent.prototype, "focused", {
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
    Object.defineProperty(LoginDialogComponent.prototype, "signal", {
        get: function () {
            return this.abortController.signal;
        },
        enumerable: false,
        configurable: true
    });
    LoginDialogComponent.prototype.cancel = function () {
        this.abortController.abort();
        if (this.inputRejecter) {
            this.inputRejecter(new Error("Login cancelled"));
            this.inputResolver = undefined;
            this.inputRejecter = undefined;
        }
        this.onComplete(false, "Login cancelled");
    };
    /**
     * Called by onAuth callback - show URL and optional instructions
     */
    LoginDialogComponent.prototype.showAuth = function (url, instructions) {
        this.contentContainer.clear();
        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("accent", url), 1, 0));
        var clickHint = process.platform === "darwin" ? "Cmd+click to open" : "Ctrl+click to open";
        var hyperlink = "\u001B]8;;".concat(url, "\u0007").concat(clickHint, "\u001B]8;;\u0007");
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", hyperlink), 1, 0));
        if (instructions) {
            this.contentContainer.addChild(new pi_tui_1.Spacer(1));
            this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("warning", instructions), 1, 0));
        }
        // Try to open browser
        var openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
        (0, child_process_1.exec)("".concat(openCmd, " \"").concat(url, "\""));
        this.tui.requestRender();
    };
    /**
     * Show input for manual code/URL entry (for callback server providers)
     */
    LoginDialogComponent.prototype.showManualInput = function (prompt) {
        var _this = this;
        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", prompt), 1, 0));
        this.contentContainer.addChild(this.input);
        this.contentContainer.addChild(new pi_tui_1.Text("(".concat((0, keybinding_hints_js_1.keyHint)("selectCancel", "to cancel"), ")"), 1, 0));
        this.tui.requestRender();
        return new Promise(function (resolve, reject) {
            _this.inputResolver = resolve;
            _this.inputRejecter = reject;
        });
    };
    /**
     * Called by onPrompt callback - show prompt and wait for input
     * Note: Does NOT clear content, appends to existing (preserves URL from showAuth)
     */
    LoginDialogComponent.prototype.showPrompt = function (message, placeholder) {
        var _this = this;
        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("text", message), 1, 0));
        if (placeholder) {
            this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", "e.g., ".concat(placeholder)), 1, 0));
        }
        this.contentContainer.addChild(this.input);
        this.contentContainer.addChild(new pi_tui_1.Text("(".concat((0, keybinding_hints_js_1.keyHint)("selectCancel", "to cancel,"), " ").concat((0, keybinding_hints_js_1.keyHint)("selectConfirm", "to submit"), ")"), 1, 0));
        this.input.setValue("");
        this.tui.requestRender();
        return new Promise(function (resolve, reject) {
            _this.inputResolver = resolve;
            _this.inputRejecter = reject;
        });
    };
    /**
     * Show waiting message (for polling flows like GitHub Copilot)
     */
    LoginDialogComponent.prototype.showWaiting = function (message) {
        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", message), 1, 0));
        this.contentContainer.addChild(new pi_tui_1.Text("(".concat((0, keybinding_hints_js_1.keyHint)("selectCancel", "to cancel"), ")"), 1, 0));
        this.tui.requestRender();
    };
    /**
     * Called by onProgress callback
     */
    LoginDialogComponent.prototype.showProgress = function (message) {
        this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("dim", message), 1, 0));
        this.tui.requestRender();
    };
    LoginDialogComponent.prototype.handleInput = function (data) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(data, "selectCancel")) {
            this.cancel();
            return;
        }
        // Pass to input
        this.input.handleInput(data);
    };
    return LoginDialogComponent;
}(pi_tui_1.Container));
exports.LoginDialogComponent = LoginDialogComponent;
