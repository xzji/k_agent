"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.theme = exports.Theme = void 0;
exports.getAvailableThemes = getAvailableThemes;
exports.getAvailableThemesWithPaths = getAvailableThemesWithPaths;
exports.loadThemeFromPath = loadThemeFromPath;
exports.getThemeByName = getThemeByName;
exports.setRegisteredThemes = setRegisteredThemes;
exports.initTheme = initTheme;
exports.setTheme = setTheme;
exports.setThemeInstance = setThemeInstance;
exports.onThemeChange = onThemeChange;
exports.stopThemeWatcher = stopThemeWatcher;
exports.getResolvedThemeColors = getResolvedThemeColors;
exports.isLightTheme = isLightTheme;
exports.getThemeExportColors = getThemeExportColors;
exports.highlightCode = highlightCode;
exports.getLanguageFromPath = getLanguageFromPath;
exports.getMarkdownTheme = getMarkdownTheme;
exports.getSelectListTheme = getSelectListTheme;
exports.getEditorTheme = getEditorTheme;
exports.getSettingsListTheme = getSettingsListTheme;
var fs = require("node:fs");
var path = require("node:path");
var typebox_1 = require("@sinclair/typebox");
var compiler_1 = require("@sinclair/typebox/compiler");
var chalk_1 = require("chalk");
var cli_highlight_1 = require("cli-highlight");
var config_js_1 = require("../../../config.js");
// ============================================================================
// Types & Schema
// ============================================================================
var ColorValueSchema = typebox_1.Type.Union([
    typebox_1.Type.String(), // hex "#ff0000", var ref "primary", or empty ""
    typebox_1.Type.Integer({ minimum: 0, maximum: 255 }), // 256-color index
]);
var ThemeJsonSchema = typebox_1.Type.Object({
    $schema: typebox_1.Type.Optional(typebox_1.Type.String()),
    name: typebox_1.Type.String(),
    vars: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), ColorValueSchema)),
    colors: typebox_1.Type.Object({
        // Core UI (10 colors)
        accent: ColorValueSchema,
        border: ColorValueSchema,
        borderAccent: ColorValueSchema,
        borderMuted: ColorValueSchema,
        success: ColorValueSchema,
        error: ColorValueSchema,
        warning: ColorValueSchema,
        muted: ColorValueSchema,
        dim: ColorValueSchema,
        text: ColorValueSchema,
        thinkingText: ColorValueSchema,
        // Backgrounds & Content Text (11 colors)
        selectedBg: ColorValueSchema,
        userMessageBg: ColorValueSchema,
        userMessageText: ColorValueSchema,
        customMessageBg: ColorValueSchema,
        customMessageText: ColorValueSchema,
        customMessageLabel: ColorValueSchema,
        toolPendingBg: ColorValueSchema,
        toolSuccessBg: ColorValueSchema,
        toolErrorBg: ColorValueSchema,
        toolTitle: ColorValueSchema,
        toolOutput: ColorValueSchema,
        // Markdown (10 colors)
        mdHeading: ColorValueSchema,
        mdLink: ColorValueSchema,
        mdLinkUrl: ColorValueSchema,
        mdCode: ColorValueSchema,
        mdCodeBlock: ColorValueSchema,
        mdCodeBlockBorder: ColorValueSchema,
        mdQuote: ColorValueSchema,
        mdQuoteBorder: ColorValueSchema,
        mdHr: ColorValueSchema,
        mdListBullet: ColorValueSchema,
        // Tool Diffs (3 colors)
        toolDiffAdded: ColorValueSchema,
        toolDiffRemoved: ColorValueSchema,
        toolDiffContext: ColorValueSchema,
        // Syntax Highlighting (9 colors)
        syntaxComment: ColorValueSchema,
        syntaxKeyword: ColorValueSchema,
        syntaxFunction: ColorValueSchema,
        syntaxVariable: ColorValueSchema,
        syntaxString: ColorValueSchema,
        syntaxNumber: ColorValueSchema,
        syntaxType: ColorValueSchema,
        syntaxOperator: ColorValueSchema,
        syntaxPunctuation: ColorValueSchema,
        // Thinking Level Borders (6 colors)
        thinkingOff: ColorValueSchema,
        thinkingMinimal: ColorValueSchema,
        thinkingLow: ColorValueSchema,
        thinkingMedium: ColorValueSchema,
        thinkingHigh: ColorValueSchema,
        thinkingXhigh: ColorValueSchema,
        // Bash Mode (1 color)
        bashMode: ColorValueSchema,
    }),
    export: typebox_1.Type.Optional(typebox_1.Type.Object({
        pageBg: typebox_1.Type.Optional(ColorValueSchema),
        cardBg: typebox_1.Type.Optional(ColorValueSchema),
        infoBg: typebox_1.Type.Optional(ColorValueSchema),
    })),
});
var validateThemeJson = compiler_1.TypeCompiler.Compile(ThemeJsonSchema);
// ============================================================================
// Color Utilities
// ============================================================================
function detectColorMode() {
    var colorterm = process.env.COLORTERM;
    if (colorterm === "truecolor" || colorterm === "24bit") {
        return "truecolor";
    }
    // Windows Terminal supports truecolor
    if (process.env.WT_SESSION) {
        return "truecolor";
    }
    var term = process.env.TERM || "";
    // Fall back to 256color for truly limited terminals
    if (term === "dumb" || term === "" || term === "linux") {
        return "256color";
    }
    // Terminal.app also doesn't support truecolor
    if (process.env.TERM_PROGRAM === "Apple_Terminal") {
        return "256color";
    }
    // GNU screen doesn't support truecolor unless explicitly opted in via COLORTERM=truecolor.
    // TERM under screen is typically "screen", "screen-256color", or "screen.xterm-256color".
    if (term === "screen" || term.startsWith("screen-") || term.startsWith("screen.")) {
        return "256color";
    }
    // Assume truecolor for everything else - virtually all modern terminals support it
    return "truecolor";
}
function hexToRgb(hex) {
    var cleaned = hex.replace("#", "");
    if (cleaned.length !== 6) {
        throw new Error("Invalid hex color: ".concat(hex));
    }
    var r = parseInt(cleaned.substring(0, 2), 16);
    var g = parseInt(cleaned.substring(2, 4), 16);
    var b = parseInt(cleaned.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        throw new Error("Invalid hex color: ".concat(hex));
    }
    return { r: r, g: g, b: b };
}
// The 6x6x6 color cube channel values (indices 0-5)
var CUBE_VALUES = [0, 95, 135, 175, 215, 255];
// Grayscale ramp values (indices 232-255, 24 grays from 8 to 238)
var GRAY_VALUES = Array.from({ length: 24 }, function (_, i) { return 8 + i * 10; });
function findClosestCubeIndex(value) {
    var minDist = Infinity;
    var minIdx = 0;
    for (var i = 0; i < CUBE_VALUES.length; i++) {
        var dist = Math.abs(value - CUBE_VALUES[i]);
        if (dist < minDist) {
            minDist = dist;
            minIdx = i;
        }
    }
    return minIdx;
}
function findClosestGrayIndex(gray) {
    var minDist = Infinity;
    var minIdx = 0;
    for (var i = 0; i < GRAY_VALUES.length; i++) {
        var dist = Math.abs(gray - GRAY_VALUES[i]);
        if (dist < minDist) {
            minDist = dist;
            minIdx = i;
        }
    }
    return minIdx;
}
function colorDistance(r1, g1, b1, r2, g2, b2) {
    // Weighted Euclidean distance (human eye is more sensitive to green)
    var dr = r1 - r2;
    var dg = g1 - g2;
    var db = b1 - b2;
    return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}
function rgbTo256(r, g, b) {
    // Find closest color in the 6x6x6 cube
    var rIdx = findClosestCubeIndex(r);
    var gIdx = findClosestCubeIndex(g);
    var bIdx = findClosestCubeIndex(b);
    var cubeR = CUBE_VALUES[rIdx];
    var cubeG = CUBE_VALUES[gIdx];
    var cubeB = CUBE_VALUES[bIdx];
    var cubeIndex = 16 + 36 * rIdx + 6 * gIdx + bIdx;
    var cubeDist = colorDistance(r, g, b, cubeR, cubeG, cubeB);
    // Find closest grayscale
    var gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    var grayIdx = findClosestGrayIndex(gray);
    var grayValue = GRAY_VALUES[grayIdx];
    var grayIndex = 232 + grayIdx;
    var grayDist = colorDistance(r, g, b, grayValue, grayValue, grayValue);
    // Check if color has noticeable saturation (hue matters)
    // If max-min spread is significant, prefer cube to preserve tint
    var maxC = Math.max(r, g, b);
    var minC = Math.min(r, g, b);
    var spread = maxC - minC;
    // Only consider grayscale if color is nearly neutral (spread < 10)
    // AND grayscale is actually closer
    if (spread < 10 && grayDist < cubeDist) {
        return grayIndex;
    }
    return cubeIndex;
}
function hexTo256(hex) {
    var _a = hexToRgb(hex), r = _a.r, g = _a.g, b = _a.b;
    return rgbTo256(r, g, b);
}
function fgAnsi(color, mode) {
    if (color === "")
        return "\x1b[39m";
    if (typeof color === "number")
        return "\u001B[38;5;".concat(color, "m");
    if (color.startsWith("#")) {
        if (mode === "truecolor") {
            var _a = hexToRgb(color), r = _a.r, g = _a.g, b = _a.b;
            return "\u001B[38;2;".concat(r, ";").concat(g, ";").concat(b, "m");
        }
        else {
            var index = hexTo256(color);
            return "\u001B[38;5;".concat(index, "m");
        }
    }
    throw new Error("Invalid color value: ".concat(color));
}
function bgAnsi(color, mode) {
    if (color === "")
        return "\x1b[49m";
    if (typeof color === "number")
        return "\u001B[48;5;".concat(color, "m");
    if (color.startsWith("#")) {
        if (mode === "truecolor") {
            var _a = hexToRgb(color), r = _a.r, g = _a.g, b = _a.b;
            return "\u001B[48;2;".concat(r, ";").concat(g, ";").concat(b, "m");
        }
        else {
            var index = hexTo256(color);
            return "\u001B[48;5;".concat(index, "m");
        }
    }
    throw new Error("Invalid color value: ".concat(color));
}
function resolveVarRefs(value, vars, visited) {
    if (visited === void 0) { visited = new Set(); }
    if (typeof value === "number" || value === "" || value.startsWith("#")) {
        return value;
    }
    if (visited.has(value)) {
        throw new Error("Circular variable reference detected: ".concat(value));
    }
    if (!(value in vars)) {
        throw new Error("Variable reference not found: ".concat(value));
    }
    visited.add(value);
    return resolveVarRefs(vars[value], vars, visited);
}
function resolveThemeColors(colors, vars) {
    if (vars === void 0) { vars = {}; }
    var resolved = {};
    for (var _i = 0, _a = Object.entries(colors); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        resolved[key] = resolveVarRefs(value, vars);
    }
    return resolved;
}
// ============================================================================
// Theme Class
// ============================================================================
var Theme = /** @class */ (function () {
    function Theme(fgColors, bgColors, mode, options) {
        if (options === void 0) { options = {}; }
        this.name = options.name;
        this.sourcePath = options.sourcePath;
        this.mode = mode;
        this.fgColors = new Map();
        for (var _i = 0, _a = Object.entries(fgColors); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            this.fgColors.set(key, fgAnsi(value, mode));
        }
        this.bgColors = new Map();
        for (var _c = 0, _d = Object.entries(bgColors); _c < _d.length; _c++) {
            var _e = _d[_c], key = _e[0], value = _e[1];
            this.bgColors.set(key, bgAnsi(value, mode));
        }
    }
    Theme.prototype.fg = function (color, text) {
        var ansi = this.fgColors.get(color);
        if (!ansi)
            throw new Error("Unknown theme color: ".concat(color));
        return "".concat(ansi).concat(text, "\u001B[39m"); // Reset only foreground color
    };
    Theme.prototype.bg = function (color, text) {
        var ansi = this.bgColors.get(color);
        if (!ansi)
            throw new Error("Unknown theme background color: ".concat(color));
        return "".concat(ansi).concat(text, "\u001B[49m"); // Reset only background color
    };
    Theme.prototype.bold = function (text) {
        return chalk_1.default.bold(text);
    };
    Theme.prototype.italic = function (text) {
        return chalk_1.default.italic(text);
    };
    Theme.prototype.underline = function (text) {
        return chalk_1.default.underline(text);
    };
    Theme.prototype.inverse = function (text) {
        return chalk_1.default.inverse(text);
    };
    Theme.prototype.strikethrough = function (text) {
        return chalk_1.default.strikethrough(text);
    };
    Theme.prototype.getFgAnsi = function (color) {
        var ansi = this.fgColors.get(color);
        if (!ansi)
            throw new Error("Unknown theme color: ".concat(color));
        return ansi;
    };
    Theme.prototype.getBgAnsi = function (color) {
        var ansi = this.bgColors.get(color);
        if (!ansi)
            throw new Error("Unknown theme background color: ".concat(color));
        return ansi;
    };
    Theme.prototype.getColorMode = function () {
        return this.mode;
    };
    Theme.prototype.getThinkingBorderColor = function (level) {
        var _this = this;
        // Map thinking levels to dedicated theme colors
        switch (level) {
            case "off":
                return function (str) { return _this.fg("thinkingOff", str); };
            case "minimal":
                return function (str) { return _this.fg("thinkingMinimal", str); };
            case "low":
                return function (str) { return _this.fg("thinkingLow", str); };
            case "medium":
                return function (str) { return _this.fg("thinkingMedium", str); };
            case "high":
                return function (str) { return _this.fg("thinkingHigh", str); };
            case "xhigh":
                return function (str) { return _this.fg("thinkingXhigh", str); };
            default:
                return function (str) { return _this.fg("thinkingOff", str); };
        }
    };
    Theme.prototype.getBashModeBorderColor = function () {
        var _this = this;
        return function (str) { return _this.fg("bashMode", str); };
    };
    return Theme;
}());
exports.Theme = Theme;
// ============================================================================
// Theme Loading
// ============================================================================
var BUILTIN_THEMES;
function getBuiltinThemes() {
    if (!BUILTIN_THEMES) {
        var themesDir = (0, config_js_1.getThemesDir)();
        var darkPath = path.join(themesDir, "dark.json");
        var lightPath = path.join(themesDir, "light.json");
        BUILTIN_THEMES = {
            dark: JSON.parse(fs.readFileSync(darkPath, "utf-8")),
            light: JSON.parse(fs.readFileSync(lightPath, "utf-8")),
        };
    }
    return BUILTIN_THEMES;
}
function getAvailableThemes() {
    var themes = new Set(Object.keys(getBuiltinThemes()));
    var customThemesDir = (0, config_js_1.getCustomThemesDir)();
    if (fs.existsSync(customThemesDir)) {
        var files = fs.readdirSync(customThemesDir);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            if (file.endsWith(".json")) {
                themes.add(file.slice(0, -5));
            }
        }
    }
    for (var _a = 0, _b = registeredThemes.keys(); _a < _b.length; _a++) {
        var name_1 = _b[_a];
        themes.add(name_1);
    }
    return Array.from(themes).sort();
}
function getAvailableThemesWithPaths() {
    var themesDir = (0, config_js_1.getThemesDir)();
    var customThemesDir = (0, config_js_1.getCustomThemesDir)();
    var result = [];
    // Built-in themes
    for (var _i = 0, _a = Object.keys(getBuiltinThemes()); _i < _a.length; _i++) {
        var name_2 = _a[_i];
        result.push({ name: name_2, path: path.join(themesDir, "".concat(name_2, ".json")) });
    }
    // Custom themes
    if (fs.existsSync(customThemesDir)) {
        var _loop_1 = function (file) {
            if (file.endsWith(".json")) {
                var name_3 = file.slice(0, -5);
                if (!result.some(function (t) { return t.name === name_3; })) {
                    result.push({ name: name_3, path: path.join(customThemesDir, file) });
                }
            }
        };
        for (var _b = 0, _c = fs.readdirSync(customThemesDir); _b < _c.length; _b++) {
            var file = _c[_b];
            _loop_1(file);
        }
    }
    var _loop_2 = function (name_4, theme_1) {
        if (!result.some(function (t) { return t.name === name_4; })) {
            result.push({ name: name_4, path: theme_1.sourcePath });
        }
    };
    for (var _d = 0, _e = registeredThemes.entries(); _d < _e.length; _d++) {
        var _f = _e[_d], name_4 = _f[0], theme_1 = _f[1];
        _loop_2(name_4, theme_1);
    }
    return result.sort(function (a, b) { return a.name.localeCompare(b.name); });
}
function parseThemeJson(label, json) {
    if (!validateThemeJson.Check(json)) {
        var errors = Array.from(validateThemeJson.Errors(json));
        var missingColors = [];
        var otherErrors = [];
        for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
            var e = errors_1[_i];
            // Check for missing required color properties
            var match = e.path.match(/^\/colors\/(\w+)$/);
            if (match && e.message.includes("Required")) {
                missingColors.push(match[1]);
            }
            else {
                otherErrors.push("  - ".concat(e.path, ": ").concat(e.message));
            }
        }
        var errorMessage = "Invalid theme \"".concat(label, "\":\n");
        if (missingColors.length > 0) {
            errorMessage += "\nMissing required color tokens:\n";
            errorMessage += missingColors.map(function (c) { return "  - ".concat(c); }).join("\n");
            errorMessage += '\n\nPlease add these colors to your theme\'s "colors" object.';
            errorMessage += "\nSee the built-in themes (dark.json, light.json) for reference values.";
        }
        if (otherErrors.length > 0) {
            errorMessage += "\n\nOther errors:\n".concat(otherErrors.join("\n"));
        }
        throw new Error(errorMessage);
    }
    return json;
}
function parseThemeJsonContent(label, content) {
    var json;
    try {
        json = JSON.parse(content);
    }
    catch (error) {
        throw new Error("Failed to parse theme ".concat(label, ": ").concat(error));
    }
    return parseThemeJson(label, json);
}
function loadThemeJson(name) {
    var builtinThemes = getBuiltinThemes();
    if (name in builtinThemes) {
        return builtinThemes[name];
    }
    var registeredTheme = registeredThemes.get(name);
    if (registeredTheme === null || registeredTheme === void 0 ? void 0 : registeredTheme.sourcePath) {
        var content_1 = fs.readFileSync(registeredTheme.sourcePath, "utf-8");
        return parseThemeJsonContent(registeredTheme.sourcePath, content_1);
    }
    if (registeredTheme) {
        throw new Error("Theme \"".concat(name, "\" does not have a source path for export"));
    }
    var customThemesDir = (0, config_js_1.getCustomThemesDir)();
    var themePath = path.join(customThemesDir, "".concat(name, ".json"));
    if (!fs.existsSync(themePath)) {
        throw new Error("Theme not found: ".concat(name));
    }
    var content = fs.readFileSync(themePath, "utf-8");
    return parseThemeJsonContent(name, content);
}
function createTheme(themeJson, mode, sourcePath) {
    var colorMode = mode !== null && mode !== void 0 ? mode : detectColorMode();
    var resolvedColors = resolveThemeColors(themeJson.colors, themeJson.vars);
    var fgColors = {};
    var bgColors = {};
    var bgColorKeys = new Set([
        "selectedBg",
        "userMessageBg",
        "customMessageBg",
        "toolPendingBg",
        "toolSuccessBg",
        "toolErrorBg",
    ]);
    for (var _i = 0, _a = Object.entries(resolvedColors); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (bgColorKeys.has(key)) {
            bgColors[key] = value;
        }
        else {
            fgColors[key] = value;
        }
    }
    return new Theme(fgColors, bgColors, colorMode, {
        name: themeJson.name,
        sourcePath: sourcePath,
    });
}
function loadThemeFromPath(themePath, mode) {
    var content = fs.readFileSync(themePath, "utf-8");
    var themeJson = parseThemeJsonContent(themePath, content);
    return createTheme(themeJson, mode, themePath);
}
function loadTheme(name, mode) {
    var registeredTheme = registeredThemes.get(name);
    if (registeredTheme) {
        return registeredTheme;
    }
    var themeJson = loadThemeJson(name);
    return createTheme(themeJson, mode);
}
function getThemeByName(name) {
    try {
        return loadTheme(name);
    }
    catch (_a) {
        return undefined;
    }
}
function detectTerminalBackground() {
    var colorfgbg = process.env.COLORFGBG || "";
    if (colorfgbg) {
        var parts = colorfgbg.split(";");
        if (parts.length >= 2) {
            var bg = parseInt(parts[1], 10);
            if (!Number.isNaN(bg)) {
                var result = bg < 8 ? "dark" : "light";
                return result;
            }
        }
    }
    return "dark";
}
function getDefaultTheme() {
    return detectTerminalBackground();
}
// ============================================================================
// Global Theme Instance
// ============================================================================
// Use globalThis to share theme across module loaders (tsx + jiti in dev mode)
var THEME_KEY = Symbol.for("@mariozechner/pi-coding-agent:theme");
// Export theme as a getter that reads from globalThis
// This ensures all module instances (tsx, jiti) see the same theme
exports.theme = new Proxy({}, {
    get: function (_target, prop) {
        var t = globalThis[THEME_KEY];
        if (!t)
            throw new Error("Theme not initialized. Call initTheme() first.");
        return t[prop];
    },
});
function setGlobalTheme(t) {
    globalThis[THEME_KEY] = t;
}
var currentThemeName;
var themeWatcher;
var onThemeChangeCallback;
var registeredThemes = new Map();
function setRegisteredThemes(themes) {
    registeredThemes.clear();
    for (var _i = 0, themes_1 = themes; _i < themes_1.length; _i++) {
        var theme_2 = themes_1[_i];
        if (theme_2.name) {
            registeredThemes.set(theme_2.name, theme_2);
        }
    }
}
function initTheme(themeName, enableWatcher) {
    if (enableWatcher === void 0) { enableWatcher = false; }
    var name = themeName !== null && themeName !== void 0 ? themeName : getDefaultTheme();
    currentThemeName = name;
    try {
        setGlobalTheme(loadTheme(name));
        if (enableWatcher) {
            startThemeWatcher();
        }
    }
    catch (_error) {
        // Theme is invalid - fall back to dark theme silently
        currentThemeName = "dark";
        setGlobalTheme(loadTheme("dark"));
        // Don't start watcher for fallback theme
    }
}
function setTheme(name, enableWatcher) {
    if (enableWatcher === void 0) { enableWatcher = false; }
    currentThemeName = name;
    try {
        setGlobalTheme(loadTheme(name));
        if (enableWatcher) {
            startThemeWatcher();
        }
        if (onThemeChangeCallback) {
            onThemeChangeCallback();
        }
        return { success: true };
    }
    catch (error) {
        // Theme is invalid - fall back to dark theme
        currentThemeName = "dark";
        setGlobalTheme(loadTheme("dark"));
        // Don't start watcher for fallback theme
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
function setThemeInstance(themeInstance) {
    setGlobalTheme(themeInstance);
    currentThemeName = "<in-memory>";
    stopThemeWatcher(); // Can't watch a direct instance
    if (onThemeChangeCallback) {
        onThemeChangeCallback();
    }
}
function onThemeChange(callback) {
    onThemeChangeCallback = callback;
}
function startThemeWatcher() {
    // Stop existing watcher if any
    if (themeWatcher) {
        themeWatcher.close();
        themeWatcher = undefined;
    }
    // Only watch if it's a custom theme (not built-in)
    if (!currentThemeName || currentThemeName === "dark" || currentThemeName === "light") {
        return;
    }
    var customThemesDir = (0, config_js_1.getCustomThemesDir)();
    var themeFile = path.join(customThemesDir, "".concat(currentThemeName, ".json"));
    // Only watch if the file exists
    if (!fs.existsSync(themeFile)) {
        return;
    }
    try {
        themeWatcher = fs.watch(themeFile, function (eventType) {
            if (eventType === "change") {
                // Debounce rapid changes
                setTimeout(function () {
                    try {
                        // Reload the theme
                        setGlobalTheme(loadTheme(currentThemeName));
                        // Notify callback (to invalidate UI)
                        if (onThemeChangeCallback) {
                            onThemeChangeCallback();
                        }
                    }
                    catch (_error) {
                        // Ignore errors (file might be in invalid state while being edited)
                    }
                }, 100);
            }
            else if (eventType === "rename") {
                // File was deleted or renamed - fall back to default theme
                setTimeout(function () {
                    if (!fs.existsSync(themeFile)) {
                        currentThemeName = "dark";
                        setGlobalTheme(loadTheme("dark"));
                        if (themeWatcher) {
                            themeWatcher.close();
                            themeWatcher = undefined;
                        }
                        if (onThemeChangeCallback) {
                            onThemeChangeCallback();
                        }
                    }
                }, 100);
            }
        });
    }
    catch (_error) {
        // Ignore errors starting watcher
    }
}
function stopThemeWatcher() {
    if (themeWatcher) {
        themeWatcher.close();
        themeWatcher = undefined;
    }
}
// ============================================================================
// HTML Export Helpers
// ============================================================================
/**
 * Convert a 256-color index to hex string.
 * Indices 0-15: basic colors (approximate)
 * Indices 16-231: 6x6x6 color cube
 * Indices 232-255: grayscale ramp
 */
function ansi256ToHex(index) {
    // Basic colors (0-15) - approximate common terminal values
    var basicColors = [
        "#000000",
        "#800000",
        "#008000",
        "#808000",
        "#000080",
        "#800080",
        "#008080",
        "#c0c0c0",
        "#808080",
        "#ff0000",
        "#00ff00",
        "#ffff00",
        "#0000ff",
        "#ff00ff",
        "#00ffff",
        "#ffffff",
    ];
    if (index < 16) {
        return basicColors[index];
    }
    // Color cube (16-231): 6x6x6 = 216 colors
    if (index < 232) {
        var cubeIndex = index - 16;
        var r = Math.floor(cubeIndex / 36);
        var g = Math.floor((cubeIndex % 36) / 6);
        var b = cubeIndex % 6;
        var toHex = function (n) { return (n === 0 ? 0 : 55 + n * 40).toString(16).padStart(2, "0"); };
        return "#".concat(toHex(r)).concat(toHex(g)).concat(toHex(b));
    }
    // Grayscale (232-255): 24 shades
    var gray = 8 + (index - 232) * 10;
    var grayHex = gray.toString(16).padStart(2, "0");
    return "#".concat(grayHex).concat(grayHex).concat(grayHex);
}
/**
 * Get resolved theme colors as CSS-compatible hex strings.
 * Used by HTML export to generate CSS custom properties.
 */
function getResolvedThemeColors(themeName) {
    var _a;
    var name = (_a = themeName !== null && themeName !== void 0 ? themeName : currentThemeName) !== null && _a !== void 0 ? _a : getDefaultTheme();
    var isLight = name === "light";
    var themeJson = loadThemeJson(name);
    var resolved = resolveThemeColors(themeJson.colors, themeJson.vars);
    // Default text color for empty values (terminal uses default fg color)
    var defaultText = isLight ? "#000000" : "#e5e5e7";
    var cssColors = {};
    for (var _i = 0, _b = Object.entries(resolved); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], value = _c[1];
        if (typeof value === "number") {
            cssColors[key] = ansi256ToHex(value);
        }
        else if (value === "") {
            // Empty means default terminal color - use sensible fallback for HTML
            cssColors[key] = defaultText;
        }
        else {
            cssColors[key] = value;
        }
    }
    return cssColors;
}
/**
 * Check if a theme is a "light" theme (for CSS that needs light/dark variants).
 */
function isLightTheme(themeName) {
    // Currently just check the name - could be extended to analyze colors
    return themeName === "light";
}
/**
 * Get explicit export colors from theme JSON, if specified.
 * Returns undefined for each color that isn't explicitly set.
 */
function getThemeExportColors(themeName) {
    var _a, _b;
    var name = (_a = themeName !== null && themeName !== void 0 ? themeName : currentThemeName) !== null && _a !== void 0 ? _a : getDefaultTheme();
    try {
        var themeJson = loadThemeJson(name);
        var exportSection = themeJson.export;
        if (!exportSection)
            return {};
        var vars_1 = (_b = themeJson.vars) !== null && _b !== void 0 ? _b : {};
        var resolve = function (value) {
            if (value === undefined)
                return undefined;
            if (typeof value === "number")
                return ansi256ToHex(value);
            if (value.startsWith("$")) {
                var resolved = vars_1[value];
                if (resolved === undefined)
                    return undefined;
                if (typeof resolved === "number")
                    return ansi256ToHex(resolved);
                return resolved;
            }
            return value;
        };
        return {
            pageBg: resolve(exportSection.pageBg),
            cardBg: resolve(exportSection.cardBg),
            infoBg: resolve(exportSection.infoBg),
        };
    }
    catch (_c) {
        return {};
    }
}
var cachedHighlightThemeFor;
var cachedCliHighlightTheme;
function buildCliHighlightTheme(t) {
    return {
        keyword: function (s) { return t.fg("syntaxKeyword", s); },
        built_in: function (s) { return t.fg("syntaxType", s); },
        literal: function (s) { return t.fg("syntaxNumber", s); },
        number: function (s) { return t.fg("syntaxNumber", s); },
        string: function (s) { return t.fg("syntaxString", s); },
        comment: function (s) { return t.fg("syntaxComment", s); },
        function: function (s) { return t.fg("syntaxFunction", s); },
        title: function (s) { return t.fg("syntaxFunction", s); },
        class: function (s) { return t.fg("syntaxType", s); },
        type: function (s) { return t.fg("syntaxType", s); },
        attr: function (s) { return t.fg("syntaxVariable", s); },
        variable: function (s) { return t.fg("syntaxVariable", s); },
        params: function (s) { return t.fg("syntaxVariable", s); },
        operator: function (s) { return t.fg("syntaxOperator", s); },
        punctuation: function (s) { return t.fg("syntaxPunctuation", s); },
    };
}
function getCliHighlightTheme(t) {
    if (cachedHighlightThemeFor !== t || !cachedCliHighlightTheme) {
        cachedHighlightThemeFor = t;
        cachedCliHighlightTheme = buildCliHighlightTheme(t);
    }
    return cachedCliHighlightTheme;
}
/**
 * Highlight code with syntax coloring based on file extension or language.
 * Returns array of highlighted lines.
 */
function highlightCode(code, lang) {
    // Validate language before highlighting to avoid stderr spam from cli-highlight
    var validLang = lang && (0, cli_highlight_1.supportsLanguage)(lang) ? lang : undefined;
    var opts = {
        language: validLang,
        ignoreIllegals: true,
        theme: getCliHighlightTheme(exports.theme),
    };
    try {
        return (0, cli_highlight_1.highlight)(code, opts).split("\n");
    }
    catch (_a) {
        return code.split("\n");
    }
}
/**
 * Get language identifier from file path extension.
 */
function getLanguageFromPath(filePath) {
    var _a;
    var ext = (_a = filePath.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!ext)
        return undefined;
    var extToLang = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        py: "python",
        rb: "ruby",
        rs: "rust",
        go: "go",
        java: "java",
        kt: "kotlin",
        swift: "swift",
        c: "c",
        h: "c",
        cpp: "cpp",
        cc: "cpp",
        cxx: "cpp",
        hpp: "cpp",
        cs: "csharp",
        php: "php",
        sh: "bash",
        bash: "bash",
        zsh: "bash",
        fish: "fish",
        ps1: "powershell",
        sql: "sql",
        html: "html",
        htm: "html",
        css: "css",
        scss: "scss",
        sass: "sass",
        less: "less",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        xml: "xml",
        md: "markdown",
        markdown: "markdown",
        dockerfile: "dockerfile",
        makefile: "makefile",
        cmake: "cmake",
        lua: "lua",
        perl: "perl",
        r: "r",
        scala: "scala",
        clj: "clojure",
        ex: "elixir",
        exs: "elixir",
        erl: "erlang",
        hs: "haskell",
        ml: "ocaml",
        vim: "vim",
        graphql: "graphql",
        proto: "protobuf",
        tf: "hcl",
        hcl: "hcl",
    };
    return extToLang[ext];
}
function getMarkdownTheme() {
    return {
        heading: function (text) { return exports.theme.fg("mdHeading", text); },
        link: function (text) { return exports.theme.fg("mdLink", text); },
        linkUrl: function (text) { return exports.theme.fg("mdLinkUrl", text); },
        code: function (text) { return exports.theme.fg("mdCode", text); },
        codeBlock: function (text) { return exports.theme.fg("mdCodeBlock", text); },
        codeBlockBorder: function (text) { return exports.theme.fg("mdCodeBlockBorder", text); },
        quote: function (text) { return exports.theme.fg("mdQuote", text); },
        quoteBorder: function (text) { return exports.theme.fg("mdQuoteBorder", text); },
        hr: function (text) { return exports.theme.fg("mdHr", text); },
        listBullet: function (text) { return exports.theme.fg("mdListBullet", text); },
        bold: function (text) { return exports.theme.bold(text); },
        italic: function (text) { return exports.theme.italic(text); },
        underline: function (text) { return exports.theme.underline(text); },
        strikethrough: function (text) { return chalk_1.default.strikethrough(text); },
        highlightCode: function (code, lang) {
            // Validate language before highlighting to avoid stderr spam from cli-highlight
            var validLang = lang && (0, cli_highlight_1.supportsLanguage)(lang) ? lang : undefined;
            var opts = {
                language: validLang,
                ignoreIllegals: true,
                theme: getCliHighlightTheme(exports.theme),
            };
            try {
                return (0, cli_highlight_1.highlight)(code, opts).split("\n");
            }
            catch (_a) {
                return code.split("\n").map(function (line) { return exports.theme.fg("mdCodeBlock", line); });
            }
        },
    };
}
function getSelectListTheme() {
    return {
        selectedPrefix: function (text) { return exports.theme.fg("accent", text); },
        selectedText: function (text) { return exports.theme.fg("accent", text); },
        description: function (text) { return exports.theme.fg("muted", text); },
        scrollInfo: function (text) { return exports.theme.fg("muted", text); },
        noMatch: function (text) { return exports.theme.fg("muted", text); },
    };
}
function getEditorTheme() {
    return {
        borderColor: function (text) { return exports.theme.fg("borderMuted", text); },
        selectList: getSelectListTheme(),
    };
}
function getSettingsListTheme() {
    return {
        label: function (text, selected) { return (selected ? exports.theme.fg("accent", text) : text); },
        value: function (text, selected) { return (selected ? exports.theme.fg("accent", text) : exports.theme.fg("muted", text)); },
        description: function (text) { return exports.theme.fg("dim", text); },
        cursor: exports.theme.fg("accent", "→ "),
        hint: function (text) { return exports.theme.fg("dim", text); },
    };
}
