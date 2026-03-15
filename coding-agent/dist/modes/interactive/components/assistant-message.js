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
exports.AssistantMessageComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
/**
 * Component that renders a complete assistant message
 */
var AssistantMessageComponent = /** @class */ (function (_super) {
    __extends(AssistantMessageComponent, _super);
    function AssistantMessageComponent(message, hideThinkingBlock, markdownTheme) {
        if (hideThinkingBlock === void 0) { hideThinkingBlock = false; }
        if (markdownTheme === void 0) { markdownTheme = (0, theme_js_1.getMarkdownTheme)(); }
        var _this = _super.call(this) || this;
        _this.hideThinkingBlock = hideThinkingBlock;
        _this.markdownTheme = markdownTheme;
        // Container for text/thinking content
        _this.contentContainer = new pi_tui_1.Container();
        _this.addChild(_this.contentContainer);
        if (message) {
            _this.updateContent(message);
        }
        return _this;
    }
    AssistantMessageComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        if (this.lastMessage) {
            this.updateContent(this.lastMessage);
        }
    };
    AssistantMessageComponent.prototype.setHideThinkingBlock = function (hide) {
        this.hideThinkingBlock = hide;
    };
    AssistantMessageComponent.prototype.updateContent = function (message) {
        this.lastMessage = message;
        // Clear content container
        this.contentContainer.clear();
        var hasVisibleContent = message.content.some(function (c) { return (c.type === "text" && c.text.trim()) || (c.type === "thinking" && c.thinking.trim()); });
        if (hasVisibleContent) {
            this.contentContainer.addChild(new pi_tui_1.Spacer(1));
        }
        // Render content in order
        for (var i = 0; i < message.content.length; i++) {
            var content = message.content[i];
            if (content.type === "text" && content.text.trim()) {
                // Assistant text messages with no background - trim the text
                // Set paddingY=0 to avoid extra spacing before tool executions
                this.contentContainer.addChild(new pi_tui_1.Markdown(content.text.trim(), 1, 0, this.markdownTheme));
            }
            else if (content.type === "thinking" && content.thinking.trim()) {
                // Add spacing only when another visible assistant content block follows.
                // This avoids a superfluous blank line before separately-rendered tool execution blocks.
                var hasVisibleContentAfter = message.content
                    .slice(i + 1)
                    .some(function (c) { return (c.type === "text" && c.text.trim()) || (c.type === "thinking" && c.thinking.trim()); });
                if (this.hideThinkingBlock) {
                    // Show static "Thinking..." label when hidden
                    this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.italic(theme_js_1.theme.fg("thinkingText", "Thinking...")), 1, 0));
                    if (hasVisibleContentAfter) {
                        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
                    }
                }
                else {
                    // Thinking traces in thinkingText color, italic
                    this.contentContainer.addChild(new pi_tui_1.Markdown(content.thinking.trim(), 1, 0, this.markdownTheme, {
                        color: function (text) { return theme_js_1.theme.fg("thinkingText", text); },
                        italic: true,
                    }));
                    if (hasVisibleContentAfter) {
                        this.contentContainer.addChild(new pi_tui_1.Spacer(1));
                    }
                }
            }
        }
        // Check if aborted - show after partial content
        // But only if there are no tool calls (tool execution components will show the error)
        var hasToolCalls = message.content.some(function (c) { return c.type === "toolCall"; });
        if (!hasToolCalls) {
            if (message.stopReason === "aborted") {
                var abortMessage = message.errorMessage && message.errorMessage !== "Request was aborted"
                    ? message.errorMessage
                    : "Operation aborted";
                if (hasVisibleContent) {
                    this.contentContainer.addChild(new pi_tui_1.Spacer(1));
                }
                else {
                    this.contentContainer.addChild(new pi_tui_1.Spacer(1));
                }
                this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("error", abortMessage), 1, 0));
            }
            else if (message.stopReason === "error") {
                var errorMsg = message.errorMessage || "Unknown error";
                this.contentContainer.addChild(new pi_tui_1.Spacer(1));
                this.contentContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("error", "Error: ".concat(errorMsg)), 1, 0));
            }
        }
    };
    return AssistantMessageComponent;
}(pi_tui_1.Container));
exports.AssistantMessageComponent = AssistantMessageComponent;
