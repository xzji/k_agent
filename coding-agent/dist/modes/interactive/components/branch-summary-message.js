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
exports.BranchSummaryMessageComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
/**
 * Component that renders a branch summary message with collapsed/expanded state.
 * Uses same background color as custom messages for visual consistency.
 */
var BranchSummaryMessageComponent = /** @class */ (function (_super) {
    __extends(BranchSummaryMessageComponent, _super);
    function BranchSummaryMessageComponent(message, markdownTheme) {
        if (markdownTheme === void 0) { markdownTheme = (0, theme_js_1.getMarkdownTheme)(); }
        var _this = _super.call(this, 1, 1, function (t) { return theme_js_1.theme.bg("customMessageBg", t); }) || this;
        _this.expanded = false;
        _this.message = message;
        _this.markdownTheme = markdownTheme;
        _this.updateDisplay();
        return _this;
    }
    BranchSummaryMessageComponent.prototype.setExpanded = function (expanded) {
        this.expanded = expanded;
        this.updateDisplay();
    };
    BranchSummaryMessageComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        this.updateDisplay();
    };
    BranchSummaryMessageComponent.prototype.updateDisplay = function () {
        this.clear();
        var label = theme_js_1.theme.fg("customMessageLabel", "\u001B[1m[branch]\u001B[22m");
        this.addChild(new pi_tui_1.Text(label, 0, 0));
        this.addChild(new pi_tui_1.Spacer(1));
        if (this.expanded) {
            var header = "**Branch Summary**\n\n";
            this.addChild(new pi_tui_1.Markdown(header + this.message.summary, 0, 0, this.markdownTheme, {
                color: function (text) { return theme_js_1.theme.fg("customMessageText", text); },
            }));
        }
        else {
            this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("customMessageText", "Branch summary (") +
                theme_js_1.theme.fg("dim", (0, keybinding_hints_js_1.editorKey)("expandTools")) +
                theme_js_1.theme.fg("customMessageText", " to expand)"), 0, 0));
        }
    };
    return BranchSummaryMessageComponent;
}(pi_tui_1.Box));
exports.BranchSummaryMessageComponent = BranchSummaryMessageComponent;
