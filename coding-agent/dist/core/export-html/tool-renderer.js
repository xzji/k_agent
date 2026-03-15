"use strict";
/**
 * Tool HTML renderer for custom tools in HTML export.
 *
 * Renders custom tool calls and results to HTML by invoking their TUI renderers
 * and converting the ANSI output to HTML.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolHtmlRenderer = createToolHtmlRenderer;
var ansi_to_html_js_1 = require("./ansi-to-html.js");
/**
 * Create a tool HTML renderer.
 *
 * The renderer looks up tool definitions and invokes their renderCall/renderResult
 * methods, converting the resulting TUI Component output (ANSI) to HTML.
 */
function createToolHtmlRenderer(deps) {
    var getToolDefinition = deps.getToolDefinition, theme = deps.theme, _a = deps.width, width = _a === void 0 ? 100 : _a;
    return {
        renderCall: function (toolName, args) {
            try {
                var toolDef = getToolDefinition(toolName);
                if (!(toolDef === null || toolDef === void 0 ? void 0 : toolDef.renderCall)) {
                    return undefined;
                }
                var component = toolDef.renderCall(args, theme);
                if (!component) {
                    return undefined;
                }
                var lines = component.render(width);
                return (0, ansi_to_html_js_1.ansiLinesToHtml)(lines);
            }
            catch (_a) {
                // On error, return undefined to trigger JSON fallback
                return undefined;
            }
        },
        renderResult: function (toolName, result, details, isError) {
            try {
                var toolDef = getToolDefinition(toolName);
                if (!(toolDef === null || toolDef === void 0 ? void 0 : toolDef.renderResult)) {
                    return undefined;
                }
                // Build AgentToolResult from content array
                // Cast content since session storage uses generic object types
                var agentToolResult = {
                    content: result,
                    details: details,
                    isError: isError,
                };
                // Render collapsed
                var collapsedComponent = toolDef.renderResult(agentToolResult, { expanded: false, isPartial: false }, theme);
                var collapsed = collapsedComponent ? (0, ansi_to_html_js_1.ansiLinesToHtml)(collapsedComponent.render(width)) : undefined;
                // Render expanded
                var expandedComponent = toolDef.renderResult(agentToolResult, { expanded: true, isPartial: false }, theme);
                var expanded = expandedComponent ? (0, ansi_to_html_js_1.ansiLinesToHtml)(expandedComponent.render(width)) : undefined;
                // Return collapsed only if it exists and differs from expanded
                if (!expanded) {
                    return undefined;
                }
                return __assign(__assign({}, (collapsed && collapsed !== expanded ? { collapsed: collapsed } : {})), { expanded: expanded });
            }
            catch (_a) {
                // On error, return undefined to trigger JSON fallback
                return undefined;
            }
        },
    };
}
