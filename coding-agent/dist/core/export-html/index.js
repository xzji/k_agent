"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSessionToHtml = exportSessionToHtml;
exports.exportFromFile = exportFromFile;
var fs_1 = require("fs");
var path_1 = require("path");
var config_js_1 = require("../../config.js");
var theme_js_1 = require("../../modes/interactive/theme/theme.js");
var session_manager_js_1 = require("../session-manager.js");
/** Parse a color string to RGB values. Supports hex (#RRGGBB) and rgb(r,g,b) formats. */
function parseColor(color) {
    var hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if (hexMatch) {
        return {
            r: Number.parseInt(hexMatch[1], 16),
            g: Number.parseInt(hexMatch[2], 16),
            b: Number.parseInt(hexMatch[3], 16),
        };
    }
    var rgbMatch = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
        return {
            r: Number.parseInt(rgbMatch[1], 10),
            g: Number.parseInt(rgbMatch[2], 10),
            b: Number.parseInt(rgbMatch[3], 10),
        };
    }
    return undefined;
}
/** Calculate relative luminance of a color (0-1, higher = lighter). */
function getLuminance(r, g, b) {
    var toLinear = function (c) {
        var s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow(((s + 0.055) / 1.055), 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
/** Adjust color brightness. Factor > 1 lightens, < 1 darkens. */
function adjustBrightness(color, factor) {
    var parsed = parseColor(color);
    if (!parsed)
        return color;
    var adjust = function (c) { return Math.min(255, Math.max(0, Math.round(c * factor))); };
    return "rgb(".concat(adjust(parsed.r), ", ").concat(adjust(parsed.g), ", ").concat(adjust(parsed.b), ")");
}
/** Derive export background colors from a base color (e.g., userMessageBg). */
function deriveExportColors(baseColor) {
    var parsed = parseColor(baseColor);
    if (!parsed) {
        return {
            pageBg: "rgb(24, 24, 30)",
            cardBg: "rgb(30, 30, 36)",
            infoBg: "rgb(60, 55, 40)",
        };
    }
    var luminance = getLuminance(parsed.r, parsed.g, parsed.b);
    var isLight = luminance > 0.5;
    if (isLight) {
        return {
            pageBg: adjustBrightness(baseColor, 0.96),
            cardBg: baseColor,
            infoBg: "rgb(".concat(Math.min(255, parsed.r + 10), ", ").concat(Math.min(255, parsed.g + 5), ", ").concat(Math.max(0, parsed.b - 20), ")"),
        };
    }
    return {
        pageBg: adjustBrightness(baseColor, 0.7),
        cardBg: adjustBrightness(baseColor, 0.85),
        infoBg: "rgb(".concat(Math.min(255, parsed.r + 20), ", ").concat(Math.min(255, parsed.g + 15), ", ").concat(parsed.b, ")"),
    };
}
/**
 * Generate CSS custom property declarations from theme colors.
 */
function generateThemeVars(themeName) {
    var _a, _b, _c;
    var colors = (0, theme_js_1.getResolvedThemeColors)(themeName);
    var lines = [];
    for (var _i = 0, _d = Object.entries(colors); _i < _d.length; _i++) {
        var _e = _d[_i], key = _e[0], value = _e[1];
        lines.push("--".concat(key, ": ").concat(value, ";"));
    }
    // Use explicit theme export colors if available, otherwise derive from userMessageBg
    var themeExport = (0, theme_js_1.getThemeExportColors)(themeName);
    var userMessageBg = colors.userMessageBg || "#343541";
    var derivedColors = deriveExportColors(userMessageBg);
    lines.push("--exportPageBg: ".concat((_a = themeExport.pageBg) !== null && _a !== void 0 ? _a : derivedColors.pageBg, ";"));
    lines.push("--exportCardBg: ".concat((_b = themeExport.cardBg) !== null && _b !== void 0 ? _b : derivedColors.cardBg, ";"));
    lines.push("--exportInfoBg: ".concat((_c = themeExport.infoBg) !== null && _c !== void 0 ? _c : derivedColors.infoBg, ";"));
    return lines.join("\n      ");
}
/**
 * Core HTML generation logic shared by both export functions.
 */
function generateHtml(sessionData, themeName) {
    var templateDir = (0, config_js_1.getExportTemplateDir)();
    var template = (0, fs_1.readFileSync)((0, path_1.join)(templateDir, "template.html"), "utf-8");
    var templateCss = (0, fs_1.readFileSync)((0, path_1.join)(templateDir, "template.css"), "utf-8");
    var templateJs = (0, fs_1.readFileSync)((0, path_1.join)(templateDir, "template.js"), "utf-8");
    var markedJs = (0, fs_1.readFileSync)((0, path_1.join)(templateDir, "vendor", "marked.min.js"), "utf-8");
    var hljsJs = (0, fs_1.readFileSync)((0, path_1.join)(templateDir, "vendor", "highlight.min.js"), "utf-8");
    var themeVars = generateThemeVars(themeName);
    var colors = (0, theme_js_1.getResolvedThemeColors)(themeName);
    var exportColors = deriveExportColors(colors.userMessageBg || "#343541");
    var bodyBg = exportColors.pageBg;
    var containerBg = exportColors.cardBg;
    var infoBg = exportColors.infoBg;
    // Base64 encode session data to avoid escaping issues
    var sessionDataBase64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    // Build the CSS with theme variables injected
    var css = templateCss
        .replace("{{THEME_VARS}}", themeVars)
        .replace("{{BODY_BG}}", bodyBg)
        .replace("{{CONTAINER_BG}}", containerBg)
        .replace("{{INFO_BG}}", infoBg);
    return template
        .replace("{{CSS}}", css)
        .replace("{{JS}}", templateJs)
        .replace("{{SESSION_DATA}}", sessionDataBase64)
        .replace("{{MARKED_JS}}", markedJs)
        .replace("{{HIGHLIGHT_JS}}", hljsJs);
}
/** Built-in tool names that have custom rendering in template.js */
var BUILTIN_TOOLS = new Set(["bash", "read", "write", "edit", "ls", "find", "grep"]);
/**
 * Pre-render custom tools to HTML using their TUI renderers.
 */
function preRenderCustomTools(entries, toolRenderer) {
    var renderedTools = {};
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (entry.type !== "message")
            continue;
        var msg = entry.message;
        // Find tool calls in assistant messages
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
            for (var _a = 0, _b = msg.content; _a < _b.length; _a++) {
                var block = _b[_a];
                if (block.type === "toolCall" && !BUILTIN_TOOLS.has(block.name)) {
                    var callHtml = toolRenderer.renderCall(block.name, block.arguments);
                    if (callHtml) {
                        renderedTools[block.id] = { callHtml: callHtml };
                    }
                }
            }
        }
        // Find tool results
        if (msg.role === "toolResult" && msg.toolCallId) {
            var toolName = msg.toolName || "";
            // Only render if we have a pre-rendered call OR it's not a built-in tool
            var existing = renderedTools[msg.toolCallId];
            if (existing || !BUILTIN_TOOLS.has(toolName)) {
                var rendered = toolRenderer.renderResult(toolName, msg.content, msg.details, msg.isError || false);
                if (rendered) {
                    renderedTools[msg.toolCallId] = __assign(__assign({}, existing), { resultHtmlCollapsed: rendered.collapsed, resultHtmlExpanded: rendered.expanded });
                }
            }
        }
    }
    return renderedTools;
}
/**
 * Export session to HTML using SessionManager and AgentState.
 * Used by TUI's /export command.
 */
function exportSessionToHtml(sm, state, options) {
    return __awaiter(this, void 0, void 0, function () {
        var opts, sessionFile, entries, renderedTools, sessionData, html, outputPath, sessionBasename;
        var _a;
        return __generator(this, function (_b) {
            opts = typeof options === "string" ? { outputPath: options } : options || {};
            sessionFile = sm.getSessionFile();
            if (!sessionFile) {
                throw new Error("Cannot export in-memory session to HTML");
            }
            if (!(0, fs_1.existsSync)(sessionFile)) {
                throw new Error("Nothing to export yet - start a conversation first");
            }
            entries = sm.getEntries();
            if (opts.toolRenderer) {
                renderedTools = preRenderCustomTools(entries, opts.toolRenderer);
                // Only include if we actually rendered something
                if (Object.keys(renderedTools).length === 0) {
                    renderedTools = undefined;
                }
            }
            sessionData = {
                header: sm.getHeader(),
                entries: entries,
                leafId: sm.getLeafId(),
                systemPrompt: state === null || state === void 0 ? void 0 : state.systemPrompt,
                tools: (_a = state === null || state === void 0 ? void 0 : state.tools) === null || _a === void 0 ? void 0 : _a.map(function (t) { return ({ name: t.name, description: t.description, parameters: t.parameters }); }),
                renderedTools: renderedTools,
            };
            html = generateHtml(sessionData, opts.themeName);
            outputPath = opts.outputPath;
            if (!outputPath) {
                sessionBasename = (0, path_1.basename)(sessionFile, ".jsonl");
                outputPath = "".concat(config_js_1.APP_NAME, "-session-").concat(sessionBasename, ".html");
            }
            (0, fs_1.writeFileSync)(outputPath, html, "utf8");
            return [2 /*return*/, outputPath];
        });
    });
}
/**
 * Export session file to HTML (standalone, without AgentState).
 * Used by CLI for exporting arbitrary session files.
 */
function exportFromFile(inputPath, options) {
    return __awaiter(this, void 0, void 0, function () {
        var opts, sm, sessionData, html, outputPath, inputBasename;
        return __generator(this, function (_a) {
            opts = typeof options === "string" ? { outputPath: options } : options || {};
            if (!(0, fs_1.existsSync)(inputPath)) {
                throw new Error("File not found: ".concat(inputPath));
            }
            sm = session_manager_js_1.SessionManager.open(inputPath);
            sessionData = {
                header: sm.getHeader(),
                entries: sm.getEntries(),
                leafId: sm.getLeafId(),
                systemPrompt: undefined,
                tools: undefined,
            };
            html = generateHtml(sessionData, opts.themeName);
            outputPath = opts.outputPath;
            if (!outputPath) {
                inputBasename = (0, path_1.basename)(inputPath, ".jsonl");
                outputPath = "".concat(config_js_1.APP_NAME, "-session-").concat(inputBasename, ".html");
            }
            (0, fs_1.writeFileSync)(outputPath, html, "utf8");
            return [2 /*return*/, outputPath];
        });
    });
}
