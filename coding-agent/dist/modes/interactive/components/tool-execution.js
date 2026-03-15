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
exports.ToolExecutionComponent = void 0;
var os = require("node:os");
var pi_tui_1 = require("@mariozechner/pi-tui");
var strip_ansi_1 = require("strip-ansi");
var edit_diff_js_1 = require("../../../core/tools/edit-diff.js");
var index_js_1 = require("../../../core/tools/index.js");
var truncate_js_1 = require("../../../core/tools/truncate.js");
var image_convert_js_1 = require("../../../utils/image-convert.js");
var shell_js_1 = require("../../../utils/shell.js");
var theme_js_1 = require("../theme/theme.js");
var diff_js_1 = require("./diff.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var visual_truncate_js_1 = require("./visual-truncate.js");
// Preview line limit for bash when not expanded
var BASH_PREVIEW_LINES = 5;
// During partial write tool-call streaming, re-highlight the first N lines fully
// to keep multiline tokenization mostly correct without re-highlighting the full file.
var WRITE_PARTIAL_FULL_HIGHLIGHT_LINES = 50;
/**
 * Convert absolute path to tilde notation if it's in home directory
 */
function shortenPath(path) {
    if (typeof path !== "string")
        return "";
    var home = os.homedir();
    if (path.startsWith(home)) {
        return "~".concat(path.slice(home.length));
    }
    return path;
}
/**
 * Replace tabs with spaces for consistent rendering
 */
function replaceTabs(text) {
    return text.replace(/\t/g, "   ");
}
/**
 * Normalize control characters for terminal preview rendering.
 * Keep tool arguments unchanged, sanitize only display text.
 */
function normalizeDisplayText(text) {
    return text.replace(/\r/g, "");
}
/** Safely coerce value to string for display. Returns null if invalid type. */
function str(value) {
    if (typeof value === "string")
        return value;
    if (value == null)
        return "";
    return null; // Invalid type
}
/**
 * Component that renders a tool call with its result (updateable)
 */
var ToolExecutionComponent = /** @class */ (function (_super) {
    __extends(ToolExecutionComponent, _super);
    function ToolExecutionComponent(toolName, args, options, toolDefinition, ui, cwd) {
        if (options === void 0) { options = {}; }
        if (cwd === void 0) { cwd = process.cwd(); }
        var _a;
        var _this = _super.call(this) || this;
        _this.imageComponents = [];
        _this.imageSpacers = [];
        _this.expanded = false;
        _this.isPartial = true;
        // Cached converted images for Kitty protocol (which requires PNG), keyed by index
        _this.convertedImages = new Map();
        // When true, this component intentionally renders no lines
        _this.hideComponent = false;
        _this.toolName = toolName;
        _this.args = args;
        _this.showImages = (_a = options.showImages) !== null && _a !== void 0 ? _a : true;
        _this.toolDefinition = toolDefinition;
        _this.ui = ui;
        _this.cwd = cwd;
        _this.addChild(new pi_tui_1.Spacer(1));
        // Always create both - contentBox for custom tools/bash, contentText for other built-ins
        _this.contentBox = new pi_tui_1.Box(1, 1, function (text) { return theme_js_1.theme.bg("toolPendingBg", text); });
        _this.contentText = new pi_tui_1.Text("", 1, 1, function (text) { return theme_js_1.theme.bg("toolPendingBg", text); });
        // Use contentBox for bash (visual truncation) or custom tools with custom renderers
        // Use contentText for built-in tools (including overrides without custom renderers)
        if (toolName === "bash" || (toolDefinition && !_this.shouldUseBuiltInRenderer())) {
            _this.addChild(_this.contentBox);
        }
        else {
            _this.addChild(_this.contentText);
        }
        _this.updateDisplay();
        return _this;
    }
    /**
     * Check if we should use built-in rendering for this tool.
     * Returns true if the tool name is a built-in AND either there's no toolDefinition
     * or the toolDefinition doesn't provide custom renderers.
     */
    ToolExecutionComponent.prototype.shouldUseBuiltInRenderer = function () {
        var _a, _b;
        var isBuiltInName = this.toolName in index_js_1.allTools;
        var hasCustomRenderers = ((_a = this.toolDefinition) === null || _a === void 0 ? void 0 : _a.renderCall) || ((_b = this.toolDefinition) === null || _b === void 0 ? void 0 : _b.renderResult);
        return isBuiltInName && !hasCustomRenderers;
    };
    ToolExecutionComponent.prototype.updateArgs = function (args) {
        this.args = args;
        if (this.toolName === "write" && this.isPartial) {
            this.updateWriteHighlightCacheIncremental();
        }
        this.updateDisplay();
    };
    ToolExecutionComponent.prototype.highlightSingleLine = function (line, lang) {
        var _a;
        var highlighted = (0, theme_js_1.highlightCode)(line, lang);
        return (_a = highlighted[0]) !== null && _a !== void 0 ? _a : "";
    };
    ToolExecutionComponent.prototype.refreshWriteHighlightPrefix = function (cache) {
        var _a, _b;
        var prefixCount = Math.min(WRITE_PARTIAL_FULL_HIGHLIGHT_LINES, cache.normalizedLines.length);
        if (prefixCount === 0)
            return;
        var prefixSource = cache.normalizedLines.slice(0, prefixCount).join("\n");
        var prefixHighlighted = (0, theme_js_1.highlightCode)(prefixSource, cache.lang);
        for (var i = 0; i < prefixCount; i++) {
            cache.highlightedLines[i] =
                (_a = prefixHighlighted[i]) !== null && _a !== void 0 ? _a : this.highlightSingleLine((_b = cache.normalizedLines[i]) !== null && _b !== void 0 ? _b : "", cache.lang);
        }
    };
    ToolExecutionComponent.prototype.rebuildWriteHighlightCacheFull = function (rawPath, fileContent) {
        var lang = rawPath ? (0, theme_js_1.getLanguageFromPath)(rawPath) : undefined;
        if (!lang) {
            this.writeHighlightCache = undefined;
            return;
        }
        var displayContent = normalizeDisplayText(fileContent);
        var normalized = replaceTabs(displayContent);
        this.writeHighlightCache = {
            rawPath: rawPath,
            lang: lang,
            rawContent: fileContent,
            normalizedLines: normalized.split("\n"),
            highlightedLines: (0, theme_js_1.highlightCode)(normalized, lang),
        };
    };
    ToolExecutionComponent.prototype.updateWriteHighlightCacheIncremental = function () {
        var _a, _b, _c, _d;
        var rawPath = str((_b = (_a = this.args) === null || _a === void 0 ? void 0 : _a.file_path) !== null && _b !== void 0 ? _b : (_c = this.args) === null || _c === void 0 ? void 0 : _c.path);
        var fileContent = str((_d = this.args) === null || _d === void 0 ? void 0 : _d.content);
        if (rawPath === null || fileContent === null) {
            this.writeHighlightCache = undefined;
            return;
        }
        var lang = rawPath ? (0, theme_js_1.getLanguageFromPath)(rawPath) : undefined;
        if (!lang) {
            this.writeHighlightCache = undefined;
            return;
        }
        if (!this.writeHighlightCache) {
            this.rebuildWriteHighlightCacheFull(rawPath, fileContent);
            return;
        }
        var cache = this.writeHighlightCache;
        if (cache.lang !== lang || cache.rawPath !== rawPath) {
            this.rebuildWriteHighlightCacheFull(rawPath, fileContent);
            return;
        }
        if (!fileContent.startsWith(cache.rawContent)) {
            this.rebuildWriteHighlightCacheFull(rawPath, fileContent);
            return;
        }
        if (fileContent.length === cache.rawContent.length) {
            return;
        }
        var deltaRaw = fileContent.slice(cache.rawContent.length);
        var deltaDisplay = normalizeDisplayText(deltaRaw);
        var deltaNormalized = replaceTabs(deltaDisplay);
        cache.rawContent = fileContent;
        if (cache.normalizedLines.length === 0) {
            cache.normalizedLines.push("");
            cache.highlightedLines.push("");
        }
        var segments = deltaNormalized.split("\n");
        var lastIndex = cache.normalizedLines.length - 1;
        cache.normalizedLines[lastIndex] += segments[0];
        cache.highlightedLines[lastIndex] = this.highlightSingleLine(cache.normalizedLines[lastIndex], cache.lang);
        for (var i = 1; i < segments.length; i++) {
            cache.normalizedLines.push(segments[i]);
            cache.highlightedLines.push(this.highlightSingleLine(segments[i], cache.lang));
        }
        this.refreshWriteHighlightPrefix(cache);
    };
    /**
     * Signal that args are complete (tool is about to execute).
     * This triggers diff computation for edit tool.
     */
    ToolExecutionComponent.prototype.setArgsComplete = function () {
        var _a, _b, _c, _d;
        if (this.toolName === "write") {
            var rawPath = str((_b = (_a = this.args) === null || _a === void 0 ? void 0 : _a.file_path) !== null && _b !== void 0 ? _b : (_c = this.args) === null || _c === void 0 ? void 0 : _c.path);
            var fileContent = str((_d = this.args) === null || _d === void 0 ? void 0 : _d.content);
            if (rawPath !== null && fileContent !== null) {
                this.rebuildWriteHighlightCacheFull(rawPath, fileContent);
            }
        }
        this.maybeComputeEditDiff();
    };
    /**
     * Compute edit diff preview when we have complete args.
     * This runs async and updates display when done.
     */
    ToolExecutionComponent.prototype.maybeComputeEditDiff = function () {
        var _this = this;
        var _a, _b, _c;
        if (this.toolName !== "edit")
            return;
        var path = (_a = this.args) === null || _a === void 0 ? void 0 : _a.path;
        var oldText = (_b = this.args) === null || _b === void 0 ? void 0 : _b.oldText;
        var newText = (_c = this.args) === null || _c === void 0 ? void 0 : _c.newText;
        // Need all three params to compute diff
        if (!path || oldText === undefined || newText === undefined)
            return;
        // Create a key to track which args this computation is for
        var argsKey = JSON.stringify({ path: path, oldText: oldText, newText: newText });
        // Skip if we already computed for these exact args
        if (this.editDiffArgsKey === argsKey)
            return;
        this.editDiffArgsKey = argsKey;
        // Compute diff async
        (0, edit_diff_js_1.computeEditDiff)(path, oldText, newText, this.cwd).then(function (result) {
            // Only update if args haven't changed since we started
            if (_this.editDiffArgsKey === argsKey) {
                _this.editDiffPreview = result;
                _this.updateDisplay();
                _this.ui.requestRender();
            }
        });
    };
    ToolExecutionComponent.prototype.updateResult = function (result, isPartial) {
        var _a, _b, _c, _d;
        if (isPartial === void 0) { isPartial = false; }
        this.result = result;
        this.isPartial = isPartial;
        if (this.toolName === "write" && !isPartial) {
            var rawPath = str((_b = (_a = this.args) === null || _a === void 0 ? void 0 : _a.file_path) !== null && _b !== void 0 ? _b : (_c = this.args) === null || _c === void 0 ? void 0 : _c.path);
            var fileContent = str((_d = this.args) === null || _d === void 0 ? void 0 : _d.content);
            if (rawPath !== null && fileContent !== null) {
                this.rebuildWriteHighlightCacheFull(rawPath, fileContent);
            }
        }
        this.updateDisplay();
        // Convert non-PNG images to PNG for Kitty protocol (async)
        this.maybeConvertImagesForKitty();
    };
    /**
     * Convert non-PNG images to PNG for Kitty graphics protocol.
     * Kitty requires PNG format (f=100), so JPEG/GIF/WebP won't display.
     */
    ToolExecutionComponent.prototype.maybeConvertImagesForKitty = function () {
        var _this = this;
        var _a;
        var caps = (0, pi_tui_1.getCapabilities)();
        // Only needed for Kitty protocol
        if (caps.images !== "kitty")
            return;
        if (!this.result)
            return;
        var imageBlocks = ((_a = this.result.content) === null || _a === void 0 ? void 0 : _a.filter(function (c) { return c.type === "image"; })) || [];
        var _loop_1 = function (i) {
            var img = imageBlocks[i];
            if (!img.data || !img.mimeType)
                return "continue";
            // Skip if already PNG or already converted
            if (img.mimeType === "image/png")
                return "continue";
            if (this_1.convertedImages.has(i))
                return "continue";
            // Convert async
            var index = i;
            (0, image_convert_js_1.convertToPng)(img.data, img.mimeType).then(function (converted) {
                if (converted) {
                    _this.convertedImages.set(index, converted);
                    _this.updateDisplay();
                    _this.ui.requestRender();
                }
            });
        };
        var this_1 = this;
        for (var i = 0; i < imageBlocks.length; i++) {
            _loop_1(i);
        }
    };
    ToolExecutionComponent.prototype.setExpanded = function (expanded) {
        this.expanded = expanded;
        this.updateDisplay();
    };
    ToolExecutionComponent.prototype.setShowImages = function (show) {
        this.showImages = show;
        this.updateDisplay();
    };
    ToolExecutionComponent.prototype.invalidate = function () {
        _super.prototype.invalidate.call(this);
        this.updateDisplay();
    };
    ToolExecutionComponent.prototype.render = function (width) {
        if (this.hideComponent) {
            return [];
        }
        return _super.prototype.render.call(this, width);
    };
    ToolExecutionComponent.prototype.updateDisplay = function () {
        var _a, _b, _c, _d;
        // Set background based on state
        var bgFn = this.isPartial
            ? function (text) { return theme_js_1.theme.bg("toolPendingBg", text); }
            : ((_a = this.result) === null || _a === void 0 ? void 0 : _a.isError)
                ? function (text) { return theme_js_1.theme.bg("toolErrorBg", text); }
                : function (text) { return theme_js_1.theme.bg("toolSuccessBg", text); };
        var useBuiltInRenderer = this.shouldUseBuiltInRenderer();
        var customRendererHasContent = false;
        this.hideComponent = false;
        // Use built-in rendering for built-in tools (or overrides without custom renderers)
        if (useBuiltInRenderer) {
            if (this.toolName === "bash") {
                // Bash uses Box with visual line truncation
                this.contentBox.setBgFn(bgFn);
                this.contentBox.clear();
                this.renderBashContent();
            }
            else {
                // Other built-in tools: use Text directly with caching
                this.contentText.setCustomBgFn(bgFn);
                this.contentText.setText(this.formatToolExecution());
            }
        }
        else if (this.toolDefinition) {
            // Custom tools use Box for flexible component rendering
            this.contentBox.setBgFn(bgFn);
            this.contentBox.clear();
            // Render call component
            if (this.toolDefinition.renderCall) {
                try {
                    var callComponent = this.toolDefinition.renderCall(this.args, theme_js_1.theme);
                    if (callComponent !== undefined) {
                        this.contentBox.addChild(callComponent);
                        customRendererHasContent = true;
                    }
                }
                catch (_e) {
                    // Fall back to default on error
                    this.contentBox.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold(this.toolName)), 0, 0));
                    customRendererHasContent = true;
                }
            }
            else {
                // No custom renderCall, show tool name
                this.contentBox.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold(this.toolName)), 0, 0));
                customRendererHasContent = true;
            }
            // Render result component if we have a result
            if (this.result && this.toolDefinition.renderResult) {
                try {
                    var resultComponent = this.toolDefinition.renderResult({ content: this.result.content, details: this.result.details }, { expanded: this.expanded, isPartial: this.isPartial }, theme_js_1.theme);
                    if (resultComponent !== undefined) {
                        this.contentBox.addChild(resultComponent);
                        customRendererHasContent = true;
                    }
                }
                catch (_f) {
                    // Fall back to showing raw output on error
                    var output = this.getTextOutput();
                    if (output) {
                        this.contentBox.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("toolOutput", output), 0, 0));
                        customRendererHasContent = true;
                    }
                }
            }
            else if (this.result) {
                // Has result but no custom renderResult
                var output = this.getTextOutput();
                if (output) {
                    this.contentBox.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("toolOutput", output), 0, 0));
                    customRendererHasContent = true;
                }
            }
        }
        else {
            // Unknown tool with no registered definition - show generic fallback
            this.contentText.setCustomBgFn(bgFn);
            this.contentText.setText(this.formatToolExecution());
        }
        // Handle images (same for both custom and built-in)
        for (var _i = 0, _g = this.imageComponents; _i < _g.length; _i++) {
            var img = _g[_i];
            this.removeChild(img);
        }
        this.imageComponents = [];
        for (var _h = 0, _j = this.imageSpacers; _h < _j.length; _h++) {
            var spacer = _j[_h];
            this.removeChild(spacer);
        }
        this.imageSpacers = [];
        if (this.result) {
            var imageBlocks = ((_b = this.result.content) === null || _b === void 0 ? void 0 : _b.filter(function (c) { return c.type === "image"; })) || [];
            var caps = (0, pi_tui_1.getCapabilities)();
            for (var i = 0; i < imageBlocks.length; i++) {
                var img = imageBlocks[i];
                if (caps.images && this.showImages && img.data && img.mimeType) {
                    // Use converted PNG for Kitty protocol if available
                    var converted = this.convertedImages.get(i);
                    var imageData = (_c = converted === null || converted === void 0 ? void 0 : converted.data) !== null && _c !== void 0 ? _c : img.data;
                    var imageMimeType = (_d = converted === null || converted === void 0 ? void 0 : converted.mimeType) !== null && _d !== void 0 ? _d : img.mimeType;
                    // For Kitty, skip non-PNG images that haven't been converted yet
                    if (caps.images === "kitty" && imageMimeType !== "image/png") {
                        continue;
                    }
                    var spacer = new pi_tui_1.Spacer(1);
                    this.addChild(spacer);
                    this.imageSpacers.push(spacer);
                    var imageComponent = new pi_tui_1.Image(imageData, imageMimeType, { fallbackColor: function (s) { return theme_js_1.theme.fg("toolOutput", s); } }, { maxWidthCells: 60 });
                    this.imageComponents.push(imageComponent);
                    this.addChild(imageComponent);
                }
            }
        }
        if (!useBuiltInRenderer && this.toolDefinition) {
            this.hideComponent = !customRendererHasContent && this.imageComponents.length === 0;
        }
    };
    /**
     * Render bash content using visual line truncation (like bash-execution.ts)
     */
    ToolExecutionComponent.prototype.renderBashContent = function () {
        var _a, _b, _c, _d, _e;
        var command = str((_a = this.args) === null || _a === void 0 ? void 0 : _a.command);
        var timeout = (_b = this.args) === null || _b === void 0 ? void 0 : _b.timeout;
        // Header
        var timeoutSuffix = timeout ? theme_js_1.theme.fg("muted", " (timeout ".concat(timeout, "s)")) : "";
        var commandDisplay = command === null ? theme_js_1.theme.fg("error", "[invalid arg]") : command ? command : theme_js_1.theme.fg("toolOutput", "...");
        this.contentBox.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("$ ".concat(commandDisplay))) + timeoutSuffix, 0, 0));
        if (this.result) {
            var output = this.getTextOutput().trim();
            if (output) {
                // Style each line for the output
                var styledOutput_1 = output
                    .split("\n")
                    .map(function (line) { return theme_js_1.theme.fg("toolOutput", line); })
                    .join("\n");
                if (this.expanded) {
                    // Show all lines when expanded
                    this.contentBox.addChild(new pi_tui_1.Text("\n".concat(styledOutput_1), 0, 0));
                }
                else {
                    // Use visual line truncation when collapsed with width-aware caching
                    var cachedWidth_1;
                    var cachedLines_1;
                    var cachedSkipped_1;
                    this.contentBox.addChild({
                        render: function (width) {
                            if (cachedLines_1 === undefined || cachedWidth_1 !== width) {
                                var result = (0, visual_truncate_js_1.truncateToVisualLines)(styledOutput_1, BASH_PREVIEW_LINES, width);
                                cachedLines_1 = result.visualLines;
                                cachedSkipped_1 = result.skippedCount;
                                cachedWidth_1 = width;
                            }
                            if (cachedSkipped_1 && cachedSkipped_1 > 0) {
                                var hint = theme_js_1.theme.fg("muted", "... (".concat(cachedSkipped_1, " earlier lines,")) +
                                    " ".concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                                return __spreadArray(["", (0, pi_tui_1.truncateToWidth)(hint, width, "...")], cachedLines_1, true);
                            }
                            // Add blank line for spacing (matches expanded case)
                            return __spreadArray([""], cachedLines_1, true);
                        },
                        invalidate: function () {
                            cachedWidth_1 = undefined;
                            cachedLines_1 = undefined;
                            cachedSkipped_1 = undefined;
                        },
                    });
                }
            }
            // Truncation warnings
            var truncation = (_c = this.result.details) === null || _c === void 0 ? void 0 : _c.truncation;
            var fullOutputPath = (_d = this.result.details) === null || _d === void 0 ? void 0 : _d.fullOutputPath;
            if ((truncation === null || truncation === void 0 ? void 0 : truncation.truncated) || fullOutputPath) {
                var warnings = [];
                if (fullOutputPath) {
                    warnings.push("Full output: ".concat(fullOutputPath));
                }
                if (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) {
                    if (truncation.truncatedBy === "lines") {
                        warnings.push("Truncated: showing ".concat(truncation.outputLines, " of ").concat(truncation.totalLines, " lines"));
                    }
                    else {
                        warnings.push("Truncated: ".concat(truncation.outputLines, " lines shown (").concat((0, truncate_js_1.formatSize)((_e = truncation.maxBytes) !== null && _e !== void 0 ? _e : truncate_js_1.DEFAULT_MAX_BYTES), " limit)"));
                    }
                }
                this.contentBox.addChild(new pi_tui_1.Text("\n".concat(theme_js_1.theme.fg("warning", "[".concat(warnings.join(". "), "]"))), 0, 0));
            }
        }
    };
    ToolExecutionComponent.prototype.getTextOutput = function () {
        var _a, _b;
        if (!this.result)
            return "";
        var textBlocks = ((_a = this.result.content) === null || _a === void 0 ? void 0 : _a.filter(function (c) { return c.type === "text"; })) || [];
        var imageBlocks = ((_b = this.result.content) === null || _b === void 0 ? void 0 : _b.filter(function (c) { return c.type === "image"; })) || [];
        var output = textBlocks
            .map(function (c) {
            // Use sanitizeBinaryOutput to handle binary data that crashes string-width
            return (0, shell_js_1.sanitizeBinaryOutput)((0, strip_ansi_1.default)(c.text || "")).replace(/\r/g, "");
        })
            .join("\n");
        var caps = (0, pi_tui_1.getCapabilities)();
        if (imageBlocks.length > 0 && (!caps.images || !this.showImages)) {
            var imageIndicators = imageBlocks
                .map(function (img) {
                var _a;
                var dims = img.data ? ((_a = (0, pi_tui_1.getImageDimensions)(img.data, img.mimeType)) !== null && _a !== void 0 ? _a : undefined) : undefined;
                return (0, pi_tui_1.imageFallback)(img.mimeType, dims);
            })
                .join("\n");
            output = output ? "".concat(output, "\n").concat(imageIndicators) : imageIndicators;
        }
        return output;
    };
    ToolExecutionComponent.prototype.formatToolExecution = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18;
        var text = "";
        var invalidArg = theme_js_1.theme.fg("error", "[invalid arg]");
        if (this.toolName === "read") {
            var rawPath = str((_b = (_a = this.args) === null || _a === void 0 ? void 0 : _a.file_path) !== null && _b !== void 0 ? _b : (_c = this.args) === null || _c === void 0 ? void 0 : _c.path);
            var path = rawPath !== null ? shortenPath(rawPath) : null;
            var offset = (_d = this.args) === null || _d === void 0 ? void 0 : _d.offset;
            var limit = (_e = this.args) === null || _e === void 0 ? void 0 : _e.limit;
            var pathDisplay = path === null ? invalidArg : path ? theme_js_1.theme.fg("accent", path) : theme_js_1.theme.fg("toolOutput", "...");
            if (offset !== undefined || limit !== undefined) {
                var startLine = offset !== null && offset !== void 0 ? offset : 1;
                var endLine = limit !== undefined ? startLine + limit - 1 : "";
                pathDisplay += theme_js_1.theme.fg("warning", ":".concat(startLine).concat(endLine ? "-".concat(endLine) : ""));
            }
            text = "".concat(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("read")), " ").concat(pathDisplay);
            if (this.result) {
                var output = this.getTextOutput();
                var rawPath_1 = str((_g = (_f = this.args) === null || _f === void 0 ? void 0 : _f.file_path) !== null && _g !== void 0 ? _g : (_h = this.args) === null || _h === void 0 ? void 0 : _h.path);
                var lang_1 = rawPath_1 ? (0, theme_js_1.getLanguageFromPath)(rawPath_1) : undefined;
                var lines = lang_1 ? (0, theme_js_1.highlightCode)(replaceTabs(output), lang_1) : output.split("\n");
                var maxLines = this.expanded ? lines.length : 10;
                var displayLines = lines.slice(0, maxLines);
                var remaining = lines.length - maxLines;
                text +=
                    "\n\n" +
                        displayLines
                            .map(function (line) { return (lang_1 ? replaceTabs(line) : theme_js_1.theme.fg("toolOutput", replaceTabs(line))); })
                            .join("\n");
                if (remaining > 0) {
                    text += "".concat(theme_js_1.theme.fg("muted", "\n... (".concat(remaining, " more lines,")), " ").concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                }
                var truncation = (_j = this.result.details) === null || _j === void 0 ? void 0 : _j.truncation;
                if (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) {
                    if (truncation.firstLineExceedsLimit) {
                        text +=
                            "\n" +
                                theme_js_1.theme.fg("warning", "[First line exceeds ".concat((0, truncate_js_1.formatSize)((_k = truncation.maxBytes) !== null && _k !== void 0 ? _k : truncate_js_1.DEFAULT_MAX_BYTES), " limit]"));
                    }
                    else if (truncation.truncatedBy === "lines") {
                        text +=
                            "\n" +
                                theme_js_1.theme.fg("warning", "[Truncated: showing ".concat(truncation.outputLines, " of ").concat(truncation.totalLines, " lines (").concat((_l = truncation.maxLines) !== null && _l !== void 0 ? _l : truncate_js_1.DEFAULT_MAX_LINES, " line limit)]"));
                    }
                    else {
                        text +=
                            "\n" +
                                theme_js_1.theme.fg("warning", "[Truncated: ".concat(truncation.outputLines, " lines shown (").concat((0, truncate_js_1.formatSize)((_m = truncation.maxBytes) !== null && _m !== void 0 ? _m : truncate_js_1.DEFAULT_MAX_BYTES), " limit)]"));
                    }
                }
            }
        }
        else if (this.toolName === "write") {
            var rawPath = str((_p = (_o = this.args) === null || _o === void 0 ? void 0 : _o.file_path) !== null && _p !== void 0 ? _p : (_q = this.args) === null || _q === void 0 ? void 0 : _q.path);
            var fileContent = str((_r = this.args) === null || _r === void 0 ? void 0 : _r.content);
            var path = rawPath !== null ? shortenPath(rawPath) : null;
            text =
                theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("write")) +
                    " " +
                    (path === null ? invalidArg : path ? theme_js_1.theme.fg("accent", path) : theme_js_1.theme.fg("toolOutput", "..."));
            if (fileContent === null) {
                text += "\n\n".concat(theme_js_1.theme.fg("error", "[invalid content arg - expected string]"));
            }
            else if (fileContent) {
                var lang_2 = rawPath ? (0, theme_js_1.getLanguageFromPath)(rawPath) : undefined;
                var lines = void 0;
                if (lang_2) {
                    var cache = this.writeHighlightCache;
                    if (cache && cache.lang === lang_2 && cache.rawPath === rawPath && cache.rawContent === fileContent) {
                        lines = cache.highlightedLines;
                    }
                    else {
                        var displayContent = normalizeDisplayText(fileContent);
                        var normalized = replaceTabs(displayContent);
                        lines = (0, theme_js_1.highlightCode)(normalized, lang_2);
                        this.writeHighlightCache = {
                            rawPath: rawPath,
                            lang: lang_2,
                            rawContent: fileContent,
                            normalizedLines: normalized.split("\n"),
                            highlightedLines: lines,
                        };
                    }
                }
                else {
                    lines = normalizeDisplayText(fileContent).split("\n");
                    this.writeHighlightCache = undefined;
                }
                var totalLines = lines.length;
                var maxLines = this.expanded ? lines.length : 10;
                var displayLines = lines.slice(0, maxLines);
                var remaining = lines.length - maxLines;
                text +=
                    "\n\n" +
                        displayLines.map(function (line) { return (lang_2 ? line : theme_js_1.theme.fg("toolOutput", replaceTabs(line))); }).join("\n");
                if (remaining > 0) {
                    text +=
                        theme_js_1.theme.fg("muted", "\n... (".concat(remaining, " more lines, ").concat(totalLines, " total,")) +
                            " ".concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                }
            }
            // Show error if tool execution failed
            if ((_s = this.result) === null || _s === void 0 ? void 0 : _s.isError) {
                var errorText = this.getTextOutput();
                if (errorText) {
                    text += "\n\n".concat(theme_js_1.theme.fg("error", errorText));
                }
            }
        }
        else if (this.toolName === "edit") {
            var rawPath = str((_u = (_t = this.args) === null || _t === void 0 ? void 0 : _t.file_path) !== null && _u !== void 0 ? _u : (_v = this.args) === null || _v === void 0 ? void 0 : _v.path);
            var path = rawPath !== null ? shortenPath(rawPath) : null;
            // Build path display, appending :line if we have diff info
            var pathDisplay = path === null ? invalidArg : path ? theme_js_1.theme.fg("accent", path) : theme_js_1.theme.fg("toolOutput", "...");
            var firstChangedLine = (this.editDiffPreview && "firstChangedLine" in this.editDiffPreview
                ? this.editDiffPreview.firstChangedLine
                : undefined) ||
                (this.result && !this.result.isError ? (_w = this.result.details) === null || _w === void 0 ? void 0 : _w.firstChangedLine : undefined);
            if (firstChangedLine) {
                pathDisplay += theme_js_1.theme.fg("warning", ":".concat(firstChangedLine));
            }
            text = "".concat(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("edit")), " ").concat(pathDisplay);
            if ((_x = this.result) === null || _x === void 0 ? void 0 : _x.isError) {
                // Show error from result
                var errorText = this.getTextOutput();
                if (errorText) {
                    text += "\n\n".concat(theme_js_1.theme.fg("error", errorText));
                }
            }
            else if ((_z = (_y = this.result) === null || _y === void 0 ? void 0 : _y.details) === null || _z === void 0 ? void 0 : _z.diff) {
                // Tool executed successfully - use the diff from result
                // This takes priority over editDiffPreview which may have a stale error
                // due to race condition (async preview computed after file was modified)
                text += "\n\n".concat((0, diff_js_1.renderDiff)(this.result.details.diff, { filePath: rawPath !== null && rawPath !== void 0 ? rawPath : undefined }));
            }
            else if (this.editDiffPreview) {
                // Use cached diff preview (before tool executes)
                if ("error" in this.editDiffPreview) {
                    text += "\n\n".concat(theme_js_1.theme.fg("error", this.editDiffPreview.error));
                }
                else if (this.editDiffPreview.diff) {
                    text += "\n\n".concat((0, diff_js_1.renderDiff)(this.editDiffPreview.diff, { filePath: rawPath !== null && rawPath !== void 0 ? rawPath : undefined }));
                }
            }
        }
        else if (this.toolName === "ls") {
            var rawPath = str((_0 = this.args) === null || _0 === void 0 ? void 0 : _0.path);
            var path = rawPath !== null ? shortenPath(rawPath || ".") : null;
            var limit = (_1 = this.args) === null || _1 === void 0 ? void 0 : _1.limit;
            text = "".concat(theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("ls")), " ").concat(path === null ? invalidArg : theme_js_1.theme.fg("accent", path));
            if (limit !== undefined) {
                text += theme_js_1.theme.fg("toolOutput", " (limit ".concat(limit, ")"));
            }
            if (this.result) {
                var output = this.getTextOutput().trim();
                if (output) {
                    var lines = output.split("\n");
                    var maxLines = this.expanded ? lines.length : 20;
                    var displayLines = lines.slice(0, maxLines);
                    var remaining = lines.length - maxLines;
                    text += "\n\n".concat(displayLines.map(function (line) { return theme_js_1.theme.fg("toolOutput", line); }).join("\n"));
                    if (remaining > 0) {
                        text += "".concat(theme_js_1.theme.fg("muted", "\n... (".concat(remaining, " more lines,")), " ").concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                    }
                }
                var entryLimit = (_2 = this.result.details) === null || _2 === void 0 ? void 0 : _2.entryLimitReached;
                var truncation = (_3 = this.result.details) === null || _3 === void 0 ? void 0 : _3.truncation;
                if (entryLimit || (truncation === null || truncation === void 0 ? void 0 : truncation.truncated)) {
                    var warnings = [];
                    if (entryLimit) {
                        warnings.push("".concat(entryLimit, " entries limit"));
                    }
                    if (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) {
                        warnings.push("".concat((0, truncate_js_1.formatSize)((_4 = truncation.maxBytes) !== null && _4 !== void 0 ? _4 : truncate_js_1.DEFAULT_MAX_BYTES), " limit"));
                    }
                    text += "\n".concat(theme_js_1.theme.fg("warning", "[Truncated: ".concat(warnings.join(", "), "]")));
                }
            }
        }
        else if (this.toolName === "find") {
            var pattern = str((_5 = this.args) === null || _5 === void 0 ? void 0 : _5.pattern);
            var rawPath = str((_6 = this.args) === null || _6 === void 0 ? void 0 : _6.path);
            var path = rawPath !== null ? shortenPath(rawPath || ".") : null;
            var limit = (_7 = this.args) === null || _7 === void 0 ? void 0 : _7.limit;
            text =
                theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("find")) +
                    " " +
                    (pattern === null ? invalidArg : theme_js_1.theme.fg("accent", pattern || "")) +
                    theme_js_1.theme.fg("toolOutput", " in ".concat(path === null ? invalidArg : path));
            if (limit !== undefined) {
                text += theme_js_1.theme.fg("toolOutput", " (limit ".concat(limit, ")"));
            }
            if (this.result) {
                var output = this.getTextOutput().trim();
                if (output) {
                    var lines = output.split("\n");
                    var maxLines = this.expanded ? lines.length : 20;
                    var displayLines = lines.slice(0, maxLines);
                    var remaining = lines.length - maxLines;
                    text += "\n\n".concat(displayLines.map(function (line) { return theme_js_1.theme.fg("toolOutput", line); }).join("\n"));
                    if (remaining > 0) {
                        text += "".concat(theme_js_1.theme.fg("muted", "\n... (".concat(remaining, " more lines,")), " ").concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                    }
                }
                var resultLimit = (_8 = this.result.details) === null || _8 === void 0 ? void 0 : _8.resultLimitReached;
                var truncation = (_9 = this.result.details) === null || _9 === void 0 ? void 0 : _9.truncation;
                if (resultLimit || (truncation === null || truncation === void 0 ? void 0 : truncation.truncated)) {
                    var warnings = [];
                    if (resultLimit) {
                        warnings.push("".concat(resultLimit, " results limit"));
                    }
                    if (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) {
                        warnings.push("".concat((0, truncate_js_1.formatSize)((_10 = truncation.maxBytes) !== null && _10 !== void 0 ? _10 : truncate_js_1.DEFAULT_MAX_BYTES), " limit"));
                    }
                    text += "\n".concat(theme_js_1.theme.fg("warning", "[Truncated: ".concat(warnings.join(", "), "]")));
                }
            }
        }
        else if (this.toolName === "grep") {
            var pattern = str((_11 = this.args) === null || _11 === void 0 ? void 0 : _11.pattern);
            var rawPath = str((_12 = this.args) === null || _12 === void 0 ? void 0 : _12.path);
            var path = rawPath !== null ? shortenPath(rawPath || ".") : null;
            var glob = str((_13 = this.args) === null || _13 === void 0 ? void 0 : _13.glob);
            var limit = (_14 = this.args) === null || _14 === void 0 ? void 0 : _14.limit;
            text =
                theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold("grep")) +
                    " " +
                    (pattern === null ? invalidArg : theme_js_1.theme.fg("accent", "/".concat(pattern || "", "/"))) +
                    theme_js_1.theme.fg("toolOutput", " in ".concat(path === null ? invalidArg : path));
            if (glob) {
                text += theme_js_1.theme.fg("toolOutput", " (".concat(glob, ")"));
            }
            if (limit !== undefined) {
                text += theme_js_1.theme.fg("toolOutput", " limit ".concat(limit));
            }
            if (this.result) {
                var output = this.getTextOutput().trim();
                if (output) {
                    var lines = output.split("\n");
                    var maxLines = this.expanded ? lines.length : 15;
                    var displayLines = lines.slice(0, maxLines);
                    var remaining = lines.length - maxLines;
                    text += "\n\n".concat(displayLines.map(function (line) { return theme_js_1.theme.fg("toolOutput", line); }).join("\n"));
                    if (remaining > 0) {
                        text += "".concat(theme_js_1.theme.fg("muted", "\n... (".concat(remaining, " more lines,")), " ").concat((0, keybinding_hints_js_1.keyHint)("expandTools", "to expand"), ")");
                    }
                }
                var matchLimit = (_15 = this.result.details) === null || _15 === void 0 ? void 0 : _15.matchLimitReached;
                var truncation = (_16 = this.result.details) === null || _16 === void 0 ? void 0 : _16.truncation;
                var linesTruncated = (_17 = this.result.details) === null || _17 === void 0 ? void 0 : _17.linesTruncated;
                if (matchLimit || (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) || linesTruncated) {
                    var warnings = [];
                    if (matchLimit) {
                        warnings.push("".concat(matchLimit, " matches limit"));
                    }
                    if (truncation === null || truncation === void 0 ? void 0 : truncation.truncated) {
                        warnings.push("".concat((0, truncate_js_1.formatSize)((_18 = truncation.maxBytes) !== null && _18 !== void 0 ? _18 : truncate_js_1.DEFAULT_MAX_BYTES), " limit"));
                    }
                    if (linesTruncated) {
                        warnings.push("some lines truncated");
                    }
                    text += "\n".concat(theme_js_1.theme.fg("warning", "[Truncated: ".concat(warnings.join(", "), "]")));
                }
            }
        }
        else {
            // Generic tool (shouldn't reach here for custom tools)
            text = theme_js_1.theme.fg("toolTitle", theme_js_1.theme.bold(this.toolName));
            var content = JSON.stringify(this.args, null, 2);
            text += "\n\n".concat(content);
            var output = this.getTextOutput();
            if (output) {
                text += "\n".concat(output);
            }
        }
        return text;
    };
    return ToolExecutionComponent;
}(pi_tui_1.Container));
exports.ToolExecutionComponent = ToolExecutionComponent;
