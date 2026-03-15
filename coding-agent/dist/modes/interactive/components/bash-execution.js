"use strict";
/**
 * Component for displaying bash command execution with streaming output.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BashExecutionComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var strip_ansi_1 = require("strip-ansi");
var truncate_js_1 = require("../../../core/tools/truncate.js");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var visual_truncate_js_1 = require("./visual-truncate.js");
// Preview line limit when not expanded (matches tool execution behavior)
var PREVIEW_LINES = 20;
var BashExecutionComponent = /** @class */ (function (_super) {
    __extends(BashExecutionComponent, _super);
    function BashExecutionComponent(command, ui, excludeFromContext) {
        if (excludeFromContext === void 0) { excludeFromContext = false; }
        var _this = _super.call(this) || this;
        _this.outputLines = [];
        _this.status = "running";
        _this.exitCode = undefined;
        _this.expanded = false;
        _this.command = command;
        _this.ui = ui;
        // Use dim border for excluded-from-context commands (!! prefix)
        var colorKey = excludeFromContext ? "dim" : "bashMode";
        var borderColor = function (str) { return theme_js_1.theme.fg(colorKey, str); };
        // Add spacer
        _this.addChild(new pi_tui_1.Spacer(1));
        // Top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder(borderColor));
        // Content container (holds dynamic content between borders)
        _this.contentContainer = new pi_tui_1.Container();
        _this.addChild(_this.contentContainer);
        // Command header
        var header = new pi_tui_1.Text(theme_js_1.theme.fg(colorKey, theme_js_1.theme.bold("$ ".concat(command))), 1, 0);
        _this.contentContainer.addChild(header);
        // Loader
        _this.loader = new pi_tui_1.Loader(ui, function (spinner) { return theme_js_1.theme.fg(colorKey, spinner); }, function (text) { return theme_js_1.theme.fg("muted", text); }, "Running... (".concat((0, keybinding_hints_js_1.editorKey)("selectCancel"), " to cancel)"));
        _this.contentContainer.addChild(_this.loader);
        // Bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder(borderColor));
        return _this;
    }
    /**
     * Set whether the output is expanded (shows full output) or collapsed (preview only).
     */
    BashExecutionComponent.prototype.setExpanded = function (expanded) {
        this.expanded = expanded;
        this.updateDisplay();
    };
    BashExecutionComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        this.updateDisplay();
    };
    BashExecutionComponent.prototype.appendOutput = function (chunk) {
        var _a, _b;
        // Strip ANSI codes and normalize line endings
        // Note: binary data is already sanitized in tui-renderer.ts executeBashCommand
        var clean = (0, strip_ansi_1.default)(chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        // Append to output lines
        var newLines = clean.split("\n");
        if (this.outputLines.length > 0 && newLines.length > 0) {
            // Append first chunk to last line (incomplete line continuation)
            this.outputLines[this.outputLines.length - 1] += newLines[0];
            (_a = this.outputLines).push.apply(_a, newLines.slice(1));
        }
        else {
            (_b = this.outputLines).push.apply(_b, newLines);
        }
        this.updateDisplay();
    };
    BashExecutionComponent.prototype.setComplete = function (exitCode, cancelled, truncationResult, fullOutputPath) {
        this.exitCode = exitCode;
        this.status = cancelled
            ? "cancelled"
            : exitCode !== 0 && exitCode !== undefined && exitCode !== null
                ? "error"
                : "complete";
        this.truncationResult = truncationResult;
        this.fullOutputPath = fullOutputPath;
        // Stop loader
        this.loader.stop();
        this.updateDisplay();
    };
    BashExecutionComponent.prototype.updateDisplay = function () {
        var _a;
        // Apply truncation for LLM context limits (same limits as bash tool)
        var fullOutput = this.outputLines.join("\n");
        var contextTruncation = (0, truncate_js_1.truncateTail)(fullOutput, {
            maxLines: truncate_js_1.DEFAULT_MAX_LINES,
            maxBytes: truncate_js_1.DEFAULT_MAX_BYTES,
        });
        // Get the lines to potentially display (after context truncation)
        var availableLines = contextTruncation.content ? contextTruncation.content.split("\n") : [];
        // Apply preview truncation based on expanded state
        var previewLogicalLines = availableLines.slice(-PREVIEW_LINES);
        var hiddenLineCount = availableLines.length - previewLogicalLines.length;
        // Rebuild content container
        this.contentContainer.clear();
        // Command header
        var header = new pi_tui_1.Text(theme_js_1.theme.fg("bashMode", theme_js_1.theme.bold("$ ".concat(this.command))), 1, 0);
        this.contentContainer.addChild(header);
        // Output
        if (availableLines.length > 0) {
            if (this.expanded) {
                // Show all lines
                var displayText = availableLines.map(function (line) { return theme_js_1.theme.fg("muted", line); }).join("\n");
                this.contentContainer.addChild(new pi_tui_1.Text("\n".concat(displayText), 1, 0));
            }
            else {
                // Use shared visual truncation utility
                var styledOutput = previewLogicalLines.map(function (line) { return theme_js_1.theme.fg("muted", line); }).join("\n");
                var visualLines_1 = (0, visual_truncate_js_1.truncateToVisualLines)("\n".concat(styledOutput), PREVIEW_LINES, this.ui.terminal.columns, 1).visualLines;
                this.contentContainer.addChild({ render: function () { return visualLines_1; }, invalidate: function () { } });
            }
        }
        // Loader or status
        if (this.status === "running") {
            this.contentContainer.addChild(this.loader);
        }
        else {
            var statusParts = [];
            // Show how many lines are hidden (collapsed preview)
            if (hiddenLineCount > 0) {
                if (this.expanded) {
                    statusParts.push("(".concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to collapse"), ")"));
                }
                else {
                    statusParts.push("".concat(theme_js_1.theme.fg("muted", "... ".concat(hiddenLineCount, " more lines")), " (").concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")"));
                }
            }
            if (this.status === "cancelled") {
                statusParts.push(theme_js_1.theme.fg("warning", "(cancelled)"));
            }
            else if (this.status === "error") {
                statusParts.push(theme_js_1.theme.fg("error", "(exit ".concat(this.exitCode, ")")));
            }
            // Add truncation warning (context truncation, not preview truncation)
            var wasTruncated = ((_a = this.truncationResult) === null || _a === void 0 ? void 0 : _a.truncated) || contextTruncation.truncated;
            if (wasTruncated && this.fullOutputPath) {
                statusParts.push(theme_js_1.theme.fg("warning", "Output truncated. Full output: ".concat(this.fullOutputPath)));
            }
            if (statusParts.length > 0) {
                this.contentContainer.addChild(new pi_tui_1.Text("\n".concat(statusParts.join("\n")), 1, 0));
            }
        }
    };
    /**
     * Get the raw output for creating BashExecutionMessage.
     */
    BashExecutionComponent.prototype.getOutput = function () {
        return this.outputLines.join("\n");
    };
    /**
     * Get the command that was executed.
     */
    BashExecutionComponent.prototype.getCommand = function () {
        return this.command;
    };
    return BashExecutionComponent;
}(pi_tui_1.Container));
exports.BashExecutionComponent = BashExecutionComponent;
