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
exports.UserMessageComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var OSC133_ZONE_START = "\x1b]133;A\x07";
var OSC133_ZONE_END = "\x1b]133;B\x07";
/**
 * Component that renders a user message
 */
var UserMessageComponent = /** @class */ (function (_super) {
    __extends(UserMessageComponent, _super);
    function UserMessageComponent(text, markdownTheme) {
        if (markdownTheme === void 0) { markdownTheme = (0, theme_js_1.getMarkdownTheme)(); }
        var _this = _super.call(this) || this;
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Markdown(text, 1, 1, markdownTheme, {
            bgColor: function (text) { return theme_js_1.theme.bg("userMessageBg", text); },
            color: function (text) { return theme_js_1.theme.fg("userMessageText", text); },
        }));
        return _this;
    }
    UserMessageComponent.prototype.render = function (width) {
        var lines = _super.prototype.render.call(this, width);
        if (lines.length === 0) {
            return lines;
        }
        lines[0] = OSC133_ZONE_START + lines[0];
        lines[lines.length - 1] = lines[lines.length - 1] + OSC133_ZONE_END;
        return lines;
    };
    return UserMessageComponent;
}(pi_tui_1.Container));
exports.UserMessageComponent = UserMessageComponent;
