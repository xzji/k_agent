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
exports.UserMessageSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
/**
 * Custom user message list component with selection
 */
var UserMessageList = /** @class */ (function () {
    function UserMessageList(messages) {
        this.messages = [];
        this.selectedIndex = 0;
        this.maxVisible = 10; // Max messages visible
        // Store messages in chronological order (oldest to newest)
        this.messages = messages;
        // Start with the last (most recent) message selected
        this.selectedIndex = Math.max(0, messages.length - 1);
    }
    UserMessageList.prototype.invalidate = function () {
        // No cached state to invalidate currently
    };
    UserMessageList.prototype.render = function (width) {
        var lines = [];
        if (this.messages.length === 0) {
            lines.push(theme_js_1.theme.fg("muted", "  No user messages found"));
            return lines;
        }
        // Calculate visible range with scrolling
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(this.maxVisible / 2), this.messages.length - this.maxVisible));
        var endIndex = Math.min(startIndex + this.maxVisible, this.messages.length);
        // Render visible messages (2 lines per message + blank line)
        for (var i = startIndex; i < endIndex; i++) {
            var message = this.messages[i];
            var isSelected = i === this.selectedIndex;
            // Normalize message to single line
            var normalizedMessage = message.text.replace(/\n/g, " ").trim();
            // First line: cursor + message
            var cursor = isSelected ? theme_js_1.theme.fg("accent", "› ") : "  ";
            var maxMsgWidth = width - 2; // Account for cursor (2 chars)
            var truncatedMsg = (0, pi_tui_1.truncateToWidth)(normalizedMessage, maxMsgWidth);
            var messageLine = cursor + (isSelected ? theme_js_1.theme.bold(truncatedMsg) : truncatedMsg);
            lines.push(messageLine);
            // Second line: metadata (position in history)
            var position = i + 1;
            var metadata = "  Message ".concat(position, " of ").concat(this.messages.length);
            var metadataLine = theme_js_1.theme.fg("muted", metadata);
            lines.push(metadataLine);
            lines.push(""); // Blank line between messages
        }
        // Add scroll indicator if needed
        if (startIndex > 0 || endIndex < this.messages.length) {
            var scrollInfo = theme_js_1.theme.fg("muted", "  (".concat(this.selectedIndex + 1, "/").concat(this.messages.length, ")"));
            lines.push(scrollInfo);
        }
        return lines;
    };
    UserMessageList.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        // Up arrow - go to previous (older) message, wrap to bottom when at top
        if (kb.matches(keyData, "selectUp")) {
            this.selectedIndex = this.selectedIndex === 0 ? this.messages.length - 1 : this.selectedIndex - 1;
        }
        // Down arrow - go to next (newer) message, wrap to top when at bottom
        else if (kb.matches(keyData, "selectDown")) {
            this.selectedIndex = this.selectedIndex === this.messages.length - 1 ? 0 : this.selectedIndex + 1;
        }
        // Enter - select message and branch
        else if (kb.matches(keyData, "selectConfirm")) {
            var selected = this.messages[this.selectedIndex];
            if (selected && this.onSelect) {
                this.onSelect(selected.id);
            }
        }
        // Escape - cancel
        else if (kb.matches(keyData, "selectCancel")) {
            if (this.onCancel) {
                this.onCancel();
            }
        }
    };
    return UserMessageList;
}());
/**
 * Component that renders a user message selector for branching
 */
var UserMessageSelectorComponent = /** @class */ (function (_super) {
    __extends(UserMessageSelectorComponent, _super);
    function UserMessageSelectorComponent(messages, onSelect, onCancel) {
        var _this = _super.call(this) || this;
        // Add header
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.bold("Branch from Message"), 1, 0));
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "Select a message to create a new branch from that point"), 1, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create message list
        _this.messageList = new UserMessageList(messages);
        _this.messageList.onSelect = onSelect;
        _this.messageList.onCancel = onCancel;
        _this.addChild(_this.messageList);
        // Add bottom border
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Auto-cancel if no messages
        if (messages.length === 0) {
            setTimeout(function () { return onCancel(); }, 100);
        }
        return _this;
    }
    UserMessageSelectorComponent.prototype.getMessageList = function () {
        return this.messageList;
    };
    return UserMessageSelectorComponent;
}(pi_tui_1.Container));
exports.UserMessageSelectorComponent = UserMessageSelectorComponent;
