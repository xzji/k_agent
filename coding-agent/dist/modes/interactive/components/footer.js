"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FooterComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
/**
 * Sanitize text for display in a single-line status.
 * Removes newlines, tabs, carriage returns, and other control characters.
 */
function sanitizeStatusText(text) {
    // Replace newlines, tabs, carriage returns with space, then collapse multiple spaces
    return text
        .replace(/[\r\n\t]/g, " ")
        .replace(/ +/g, " ")
        .trim();
}
/**
 * Format token counts (similar to web-ui)
 */
function formatTokens(count) {
    if (count < 1000)
        return count.toString();
    if (count < 10000)
        return "".concat((count / 1000).toFixed(1), "k");
    if (count < 1000000)
        return "".concat(Math.round(count / 1000), "k");
    if (count < 10000000)
        return "".concat((count / 1000000).toFixed(1), "M");
    return "".concat(Math.round(count / 1000000), "M");
}
/**
 * Footer component that shows pwd, token stats, and context usage.
 * Computes token/context stats from session, gets git branch and extension statuses from provider.
 */
var FooterComponent = /** @class */ (function () {
    function FooterComponent(session, footerData) {
        this.session = session;
        this.footerData = footerData;
        this.autoCompactEnabled = true;
    }
    FooterComponent.prototype.setAutoCompactEnabled = function (enabled) {
        this.autoCompactEnabled = enabled;
    };
    /**
     * No-op: git branch caching now handled by provider.
     * Kept for compatibility with existing call sites in interactive-mode.
     */
    FooterComponent.prototype.invalidate = function () {
        // No-op: git branch is cached/invalidated by provider
    };
    /**
     * Clean up resources.
     * Git watcher cleanup now handled by provider.
     */
    FooterComponent.prototype.dispose = function () {
        // Git watcher cleanup handled by provider
    };
    FooterComponent.prototype.render = function (width) {
        var _a, _b, _c, _d, _e, _f;
        var state = this.session.state;
        // Calculate cumulative usage from ALL session entries (not just post-compaction messages)
        var totalInput = 0;
        var totalOutput = 0;
        var totalCacheRead = 0;
        var totalCacheWrite = 0;
        var totalCost = 0;
        for (var _i = 0, _g = this.session.sessionManager.getEntries(); _i < _g.length; _i++) {
            var entry = _g[_i];
            if (entry.type === "message" && entry.message.role === "assistant") {
                totalInput += entry.message.usage.input;
                totalOutput += entry.message.usage.output;
                totalCacheRead += entry.message.usage.cacheRead;
                totalCacheWrite += entry.message.usage.cacheWrite;
                totalCost += entry.message.usage.cost.total;
            }
        }
        // Calculate context usage from session (handles compaction correctly).
        // After compaction, tokens are unknown until the next LLM response.
        var contextUsage = this.session.getContextUsage();
        var contextWindow = (_c = (_a = contextUsage === null || contextUsage === void 0 ? void 0 : contextUsage.contextWindow) !== null && _a !== void 0 ? _a : (_b = state.model) === null || _b === void 0 ? void 0 : _b.contextWindow) !== null && _c !== void 0 ? _c : 0;
        var contextPercentValue = (_d = contextUsage === null || contextUsage === void 0 ? void 0 : contextUsage.percent) !== null && _d !== void 0 ? _d : 0;
        var contextPercent = (contextUsage === null || contextUsage === void 0 ? void 0 : contextUsage.percent) !== null ? contextPercentValue.toFixed(1) : "?";
        // Replace home directory with ~
        var pwd = process.cwd();
        var home = process.env.HOME || process.env.USERPROFILE;
        if (home && pwd.startsWith(home)) {
            pwd = "~".concat(pwd.slice(home.length));
        }
        // Add git branch if available
        var branch = this.footerData.getGitBranch();
        if (branch) {
            pwd = "".concat(pwd, " (").concat(branch, ")");
        }
        // Add session name if set
        var sessionName = this.session.sessionManager.getSessionName();
        if (sessionName) {
            pwd = "".concat(pwd, " \u2022 ").concat(sessionName);
        }
        // Build stats line
        var statsParts = [];
        if (totalInput)
            statsParts.push("\u2191".concat(formatTokens(totalInput)));
        if (totalOutput)
            statsParts.push("\u2193".concat(formatTokens(totalOutput)));
        if (totalCacheRead)
            statsParts.push("R".concat(formatTokens(totalCacheRead)));
        if (totalCacheWrite)
            statsParts.push("W".concat(formatTokens(totalCacheWrite)));
        // Show cost with "(sub)" indicator if using OAuth subscription
        var usingSubscription = state.model ? this.session.modelRegistry.isUsingOAuth(state.model) : false;
        if (totalCost || usingSubscription) {
            var costStr = "$".concat(totalCost.toFixed(3)).concat(usingSubscription ? " (sub)" : "");
            statsParts.push(costStr);
        }
        // Colorize context percentage based on usage
        var contextPercentStr;
        var autoIndicator = this.autoCompactEnabled ? " (auto)" : "";
        var contextPercentDisplay = contextPercent === "?"
            ? "?/".concat(formatTokens(contextWindow)).concat(autoIndicator)
            : "".concat(contextPercent, "%/").concat(formatTokens(contextWindow)).concat(autoIndicator);
        if (contextPercentValue > 90) {
            contextPercentStr = theme_js_1.theme.fg("error", contextPercentDisplay);
        }
        else if (contextPercentValue > 70) {
            contextPercentStr = theme_js_1.theme.fg("warning", contextPercentDisplay);
        }
        else {
            contextPercentStr = contextPercentDisplay;
        }
        statsParts.push(contextPercentStr);
        var statsLeft = statsParts.join(" ");
        // Add model name on the right side, plus thinking level if model supports it
        var modelName = ((_e = state.model) === null || _e === void 0 ? void 0 : _e.id) || "no-model";
        var statsLeftWidth = (0, pi_tui_1.visibleWidth)(statsLeft);
        // If statsLeft is too wide, truncate it
        if (statsLeftWidth > width) {
            statsLeft = (0, pi_tui_1.truncateToWidth)(statsLeft, width, "...");
            statsLeftWidth = (0, pi_tui_1.visibleWidth)(statsLeft);
        }
        // Calculate available space for padding (minimum 2 spaces between stats and model)
        var minPadding = 2;
        // Add thinking level indicator if model supports reasoning
        var rightSideWithoutProvider = modelName;
        if ((_f = state.model) === null || _f === void 0 ? void 0 : _f.reasoning) {
            var thinkingLevel = state.thinkingLevel || "off";
            rightSideWithoutProvider =
                thinkingLevel === "off" ? "".concat(modelName, " \u2022 thinking off") : "".concat(modelName, " \u2022 ").concat(thinkingLevel);
        }
        // Prepend the provider in parentheses if there are multiple providers and there's enough room
        var rightSide = rightSideWithoutProvider;
        if (this.footerData.getAvailableProviderCount() > 1 && state.model) {
            rightSide = "(".concat(state.model.provider, ") ").concat(rightSideWithoutProvider);
            if (statsLeftWidth + minPadding + (0, pi_tui_1.visibleWidth)(rightSide) > width) {
                // Too wide, fall back
                rightSide = rightSideWithoutProvider;
            }
        }
        var rightSideWidth = (0, pi_tui_1.visibleWidth)(rightSide);
        var totalNeeded = statsLeftWidth + minPadding + rightSideWidth;
        var statsLine;
        if (totalNeeded <= width) {
            // Both fit - add padding to right-align model
            var padding = " ".repeat(width - statsLeftWidth - rightSideWidth);
            statsLine = statsLeft + padding + rightSide;
        }
        else {
            // Need to truncate right side
            var availableForRight = width - statsLeftWidth - minPadding;
            if (availableForRight > 0) {
                var truncatedRight = (0, pi_tui_1.truncateToWidth)(rightSide, availableForRight, "");
                var truncatedRightWidth = (0, pi_tui_1.visibleWidth)(truncatedRight);
                var padding = " ".repeat(Math.max(0, width - statsLeftWidth - truncatedRightWidth));
                statsLine = statsLeft + padding + truncatedRight;
            }
            else {
                // Not enough space for right side at all
                statsLine = statsLeft;
            }
        }
        // Apply dim to each part separately. statsLeft may contain color codes (for context %)
        // that end with a reset, which would clear an outer dim wrapper. So we dim the parts
        // before and after the colored section independently.
        var dimStatsLeft = theme_js_1.theme.fg("dim", statsLeft);
        var remainder = statsLine.slice(statsLeft.length); // padding + rightSide
        var dimRemainder = theme_js_1.theme.fg("dim", remainder);
        var pwdLine = (0, pi_tui_1.truncateToWidth)(theme_js_1.theme.fg("dim", pwd), width, theme_js_1.theme.fg("dim", "..."));
        var lines = [pwdLine, dimStatsLeft + dimRemainder];
        // Add extension statuses on a single line, sorted by key alphabetically
        var extensionStatuses = this.footerData.getExtensionStatuses();
        if (extensionStatuses.size > 0) {
            var sortedStatuses = Array.from(extensionStatuses.entries())
                .sort(function (_a, _b) {
                var a = _a[0];
                var b = _b[0];
                return a.localeCompare(b);
            })
                .map(function (_a) {
                var text = _a[1];
                return sanitizeStatusText(text);
            });
            var statusLine = sortedStatuses.join(" ");
            // Truncate to terminal width with dim ellipsis for consistency with footer style
            lines.push((0, pi_tui_1.truncateToWidth)(statusLine, width, theme_js_1.theme.fg("dim", "...")));
        }
        return lines;
    };
    return FooterComponent;
}());
exports.FooterComponent = FooterComponent;
