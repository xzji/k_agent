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
exports.SkillInvocationMessageComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
/**
 * Component that renders a skill invocation message with collapsed/expanded state.
 * Uses same background color as custom messages for visual consistency.
 * Only renders the skill block itself - user message is rendered separately.
 */
var SkillInvocationMessageComponent = /** @class */ (function (_super) {
    __extends(SkillInvocationMessageComponent, _super);
    function SkillInvocationMessageComponent(skillBlock, markdownTheme) {
        if (markdownTheme === void 0) { markdownTheme = (0, theme_js_1.getMarkdownTheme)(); }
        var _this = _super.call(this, 1, 1, function (t) { return theme_js_1.theme.bg("customMessageBg", t); }) || this;
        _this.expanded = false;
        _this.skillBlock = skillBlock;
        _this.markdownTheme = markdownTheme;
        _this.updateDisplay();
        return _this;
    }
    SkillInvocationMessageComponent.prototype.setExpanded = function (expanded) {
        this.expanded = expanded;
        this.updateDisplay();
    };
    SkillInvocationMessageComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        this.updateDisplay();
    };
    SkillInvocationMessageComponent.prototype.updateDisplay = function () {
        this.clear();
        if (this.expanded) {
            // Expanded: label + skill name header + full content
            var label = theme_js_1.theme.fg("customMessageLabel", "\u001B[1m[skill]\u001B[22m");
            this.addChild(new pi_tui_1.Text(label, 0, 0));
            var header = "**".concat(this.skillBlock.name, "**\n\n");
            this.addChild(new pi_tui_1.Markdown(header + this.skillBlock.content, 0, 0, this.markdownTheme, {
                color: function (text) { return theme_js_1.theme.fg("customMessageText", text); },
            }));
        }
        else {
            // Collapsed: single line - [skill] name (hint to expand)
            var line = theme_js_1.theme.fg("customMessageLabel", "\u001B[1m[skill]\u001B[22m ") +
                theme_js_1.theme.fg("customMessageText", this.skillBlock.name) +
                theme_js_1.theme.fg("dim", " (".concat((0, keybinding_hints_js_1.editorKey)("expandTools"), " to expand)"));
            this.addChild(new pi_tui_1.Text(line, 0, 0));
        }
    };
    return SkillInvocationMessageComponent;
}(pi_tui_1.Box));
exports.SkillInvocationMessageComponent = SkillInvocationMessageComponent;
