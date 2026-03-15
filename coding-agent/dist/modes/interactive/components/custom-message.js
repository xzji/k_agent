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
exports.CustomMessageComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
/**
 * Component that renders a custom message entry from extensions.
 * Uses distinct styling to differentiate from user messages.
 */
var CustomMessageComponent = /** @class */ (function (_super) {
    __extends(CustomMessageComponent, _super);
    function CustomMessageComponent(message, customRenderer, markdownTheme) {
        if (markdownTheme === void 0) { markdownTheme = (0, theme_js_1.getMarkdownTheme)(); }
        var _this = _super.call(this) || this;
        _this._expanded = false;
        _this.message = message;
        _this.customRenderer = customRenderer;
        _this.markdownTheme = markdownTheme;
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create box with purple background (used for default rendering)
        _this.box = new pi_tui_1.Box(1, 1, function (t) { return theme_js_1.theme.bg("customMessageBg", t); });
        _this.rebuild();
        return _this;
    }
    CustomMessageComponent.prototype.setExpanded = function (expanded) {
        if (this._expanded !== expanded) {
            this._expanded = expanded;
            this.rebuild();
        }
    };
    CustomMessageComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        this.rebuild();
    };
    CustomMessageComponent.prototype.rebuild = function () {
        // Remove previous content component
        if (this.customComponent) {
            this.removeChild(this.customComponent);
            this.customComponent = undefined;
        }
        this.removeChild(this.box);
        // Try custom renderer first - it handles its own styling
        if (this.customRenderer) {
            try {
                var component = this.customRenderer(this.message, { expanded: this._expanded }, theme_js_1.theme);
                if (component) {
                    // Custom renderer provides its own styled component
                    this.customComponent = component;
                    this.addChild(component);
                    return;
                }
            }
            catch (_a) {
                // Fall through to default rendering
            }
        }
        // Default rendering uses our box
        this.addChild(this.box);
        this.box.clear();
        // Default rendering: label + content
        var label = theme_js_1.theme.fg("customMessageLabel", "\u001B[1m[".concat(this.message.customType, "]\u001B[22m"));
        this.box.addChild(new pi_tui_1.Text(label, 0, 0));
        this.box.addChild(new pi_tui_1.Spacer(1));
        // Extract text content
        var text;
        if (typeof this.message.content === "string") {
            text = this.message.content;
        }
        else {
            text = this.message.content
                .filter(function (c) { return c.type === "text"; })
                .map(function (c) { return c.text; })
                .join("\n");
        }
        this.box.addChild(new pi_tui_1.Markdown(text, 0, 0, this.markdownTheme, {
            color: function (text) { return theme_js_1.theme.fg("customMessageText", text); },
        }));
    };
    return CustomMessageComponent;
}(pi_tui_1.Container));
exports.CustomMessageComponent = CustomMessageComponent;
