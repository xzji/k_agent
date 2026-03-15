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
exports.OAuthSelectorComponent = void 0;
var oauth_1 = require("@mariozechner/pi-ai/oauth");
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
/**
 * Component that renders an OAuth provider selector
 */
var OAuthSelectorComponent = /** @class */ (function (_super) {
    __extends(OAuthSelectorComponent, _super);
    function OAuthSelectorComponent(mode, authStorage, onSelect, onCancel) {
        var _this = _super.call(this) || this;
        _this.allProviders = [];
        _this.selectedIndex = 0;
        _this.mode = mode;
        _this.authStorage = authStorage;
        _this.onSelectCallback = onSelect;
        _this.onCancelCallback = onCancel;
        // Load all OAuth providers
        _this.loadProviders();
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add title
        var title = mode === "login" ? "Select provider to login:" : "Select provider to logout:";
        _this.addChild(new pi_tui_1.TruncatedText(theme_js_1.theme.bold(title)));
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create list container
        _this.listContainer = new pi_tui_1.Container();
        _this.addChild(_this.listContainer);
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Initial render
        _this.updateList();
        return _this;
    }
    OAuthSelectorComponent.prototype.loadProviders = function () {
        this.allProviders = (0, oauth_1.getOAuthProviders)();
    };
    OAuthSelectorComponent.prototype.updateList = function () {
        this.listContainer.clear();
        for (var i = 0; i < this.allProviders.length; i++) {
            var provider = this.allProviders[i];
            if (!provider)
                continue;
            var isSelected = i === this.selectedIndex;
            // Check if user is logged in for this provider
            var credentials = this.authStorage.get(provider.id);
            var isLoggedIn = (credentials === null || credentials === void 0 ? void 0 : credentials.type) === "oauth";
            var statusIndicator = isLoggedIn ? theme_js_1.theme.fg("success", " ✓ logged in") : "";
            var line = "";
            if (isSelected) {
                var prefix = theme_js_1.theme.fg("accent", "→ ");
                var text = theme_js_1.theme.fg("accent", provider.name);
                line = prefix + text + statusIndicator;
            }
            else {
                var text = "  ".concat(provider.name);
                line = text + statusIndicator;
            }
            this.listContainer.addChild(new pi_tui_1.TruncatedText(line, 0, 0));
        }
        // Show "no providers" if empty
        if (this.allProviders.length === 0) {
            var message = this.mode === "login" ? "No OAuth providers available" : "No OAuth providers logged in. Use /login first.";
            this.listContainer.addChild(new pi_tui_1.TruncatedText(theme_js_1.theme.fg("muted", "  ".concat(message)), 0, 0));
        }
    };
    OAuthSelectorComponent.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        // Up arrow
        if (kb.matches(keyData, "selectUp")) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.updateList();
        }
        // Down arrow
        else if (kb.matches(keyData, "selectDown")) {
            this.selectedIndex = Math.min(this.allProviders.length - 1, this.selectedIndex + 1);
            this.updateList();
        }
        // Enter
        else if (kb.matches(keyData, "selectConfirm")) {
            var selectedProvider = this.allProviders[this.selectedIndex];
            if (selectedProvider) {
                this.onSelectCallback(selectedProvider.id);
            }
        }
        // Escape or Ctrl+C
        else if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
        }
    };
    return OAuthSelectorComponent;
}(pi_tui_1.Container));
exports.OAuthSelectorComponent = OAuthSelectorComponent;
