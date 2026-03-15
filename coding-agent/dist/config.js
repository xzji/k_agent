"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_AGENT_DIR = exports.VERSION = exports.CONFIG_DIR_NAME = exports.APP_NAME = exports.isBunRuntime = exports.isBunBinary = void 0;
exports.detectInstallMethod = detectInstallMethod;
exports.getUpdateInstruction = getUpdateInstruction;
exports.getPackageDir = getPackageDir;
exports.getThemesDir = getThemesDir;
exports.getExportTemplateDir = getExportTemplateDir;
exports.getPackageJsonPath = getPackageJsonPath;
exports.getReadmePath = getReadmePath;
exports.getDocsPath = getDocsPath;
exports.getExamplesPath = getExamplesPath;
exports.getChangelogPath = getChangelogPath;
exports.getShareViewerUrl = getShareViewerUrl;
exports.getAgentDir = getAgentDir;
exports.getCustomThemesDir = getCustomThemesDir;
exports.getModelsPath = getModelsPath;
exports.getAuthPath = getAuthPath;
exports.getSettingsPath = getSettingsPath;
exports.getToolsDir = getToolsDir;
exports.getBinDir = getBinDir;
exports.getPromptsDir = getPromptsDir;
exports.getSessionsDir = getSessionsDir;
exports.getDebugLogPath = getDebugLogPath;
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var url_1 = require("url");
// =============================================================================
// Package Detection
// =============================================================================
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
/**
 * Detect if we're running as a Bun compiled binary.
 * Bun binaries have import.meta.url containing "$bunfs", "~BUN", or "%7EBUN" (Bun's virtual filesystem path)
 */
exports.isBunBinary = import.meta.url.includes("$bunfs") || import.meta.url.includes("~BUN") || import.meta.url.includes("%7EBUN");
/** Detect if Bun is the runtime (compiled binary or bun run) */
exports.isBunRuntime = !!process.versions.bun;
function detectInstallMethod() {
    if (exports.isBunBinary) {
        return "bun-binary";
    }
    var resolvedPath = "".concat(__dirname, "\0").concat(process.execPath || "").toLowerCase();
    if (resolvedPath.includes("/pnpm/") || resolvedPath.includes("/.pnpm/") || resolvedPath.includes("\\pnpm\\")) {
        return "pnpm";
    }
    if (resolvedPath.includes("/yarn/") || resolvedPath.includes("/.yarn/") || resolvedPath.includes("\\yarn\\")) {
        return "yarn";
    }
    if (exports.isBunRuntime) {
        return "bun";
    }
    if (resolvedPath.includes("/npm/") || resolvedPath.includes("/node_modules/") || resolvedPath.includes("\\npm\\")) {
        return "npm";
    }
    return "unknown";
}
function getUpdateInstruction(packageName) {
    var method = detectInstallMethod();
    switch (method) {
        case "bun-binary":
            return "Download from: https://github.com/badlogic/pi-mono/releases/latest";
        case "pnpm":
            return "Run: pnpm install -g ".concat(packageName);
        case "yarn":
            return "Run: yarn global add ".concat(packageName);
        case "bun":
            return "Run: bun install -g ".concat(packageName);
        case "npm":
            return "Run: npm install -g ".concat(packageName);
        default:
            return "Run: npm install -g ".concat(packageName);
    }
}
// =============================================================================
// Package Asset Paths (shipped with executable)
// =============================================================================
/**
 * Get the base directory for resolving package assets (themes, package.json, README.md, CHANGELOG.md).
 * - For Bun binary: returns the directory containing the executable
 * - For Node.js (dist/): returns __dirname (the dist/ directory)
 * - For tsx (src/): returns parent directory (the package root)
 */
function getPackageDir() {
    // Allow override via environment variable (useful for Nix/Guix where store paths tokenize poorly)
    var envDir = process.env.PI_PACKAGE_DIR;
    if (envDir) {
        if (envDir === "~")
            return (0, os_1.homedir)();
        if (envDir.startsWith("~/"))
            return (0, os_1.homedir)() + envDir.slice(1);
        return envDir;
    }
    if (exports.isBunBinary) {
        // Bun binary: process.execPath points to the compiled executable
        return (0, path_1.dirname)(process.execPath);
    }
    // Node.js: walk up from __dirname until we find package.json
    var dir = __dirname;
    while (dir !== (0, path_1.dirname)(dir)) {
        if ((0, fs_1.existsSync)((0, path_1.join)(dir, "package.json"))) {
            return dir;
        }
        dir = (0, path_1.dirname)(dir);
    }
    // Fallback (shouldn't happen)
    return __dirname;
}
/**
 * Get path to built-in themes directory (shipped with package)
 * - For Bun binary: theme/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/theme/
 * - For tsx (src/): src/modes/interactive/theme/
 */
function getThemesDir() {
    if (exports.isBunBinary) {
        return (0, path_1.join)((0, path_1.dirname)(process.execPath), "theme");
    }
    // Theme is in modes/interactive/theme/ relative to src/ or dist/
    var packageDir = getPackageDir();
    var srcOrDist = (0, fs_1.existsSync)((0, path_1.join)(packageDir, "src")) ? "src" : "dist";
    return (0, path_1.join)(packageDir, srcOrDist, "modes", "interactive", "theme");
}
/**
 * Get path to HTML export template directory (shipped with package)
 * - For Bun binary: export-html/ next to executable
 * - For Node.js (dist/): dist/core/export-html/
 * - For tsx (src/): src/core/export-html/
 */
function getExportTemplateDir() {
    if (exports.isBunBinary) {
        return (0, path_1.join)((0, path_1.dirname)(process.execPath), "export-html");
    }
    var packageDir = getPackageDir();
    var srcOrDist = (0, fs_1.existsSync)((0, path_1.join)(packageDir, "src")) ? "src" : "dist";
    return (0, path_1.join)(packageDir, srcOrDist, "core", "export-html");
}
/** Get path to package.json */
function getPackageJsonPath() {
    return (0, path_1.join)(getPackageDir(), "package.json");
}
/** Get path to README.md */
function getReadmePath() {
    return (0, path_1.resolve)((0, path_1.join)(getPackageDir(), "README.md"));
}
/** Get path to docs directory */
function getDocsPath() {
    return (0, path_1.resolve)((0, path_1.join)(getPackageDir(), "docs"));
}
/** Get path to examples directory */
function getExamplesPath() {
    return (0, path_1.resolve)((0, path_1.join)(getPackageDir(), "examples"));
}
/** Get path to CHANGELOG.md */
function getChangelogPath() {
    return (0, path_1.resolve)((0, path_1.join)(getPackageDir(), "CHANGELOG.md"));
}
// =============================================================================
// App Config (from package.json piConfig)
// =============================================================================
var pkg = JSON.parse((0, fs_1.readFileSync)(getPackageJsonPath(), "utf-8"));
exports.APP_NAME = ((_a = pkg.piConfig) === null || _a === void 0 ? void 0 : _a.name) || "pi";
exports.CONFIG_DIR_NAME = ((_b = pkg.piConfig) === null || _b === void 0 ? void 0 : _b.configDir) || ".pi";
exports.VERSION = pkg.version;
// e.g., PI_CODING_AGENT_DIR or TAU_CODING_AGENT_DIR
exports.ENV_AGENT_DIR = "".concat(exports.APP_NAME.toUpperCase(), "_CODING_AGENT_DIR");
var DEFAULT_SHARE_VIEWER_URL = "https://pi.dev/session/";
/** Get the share viewer URL for a gist ID */
function getShareViewerUrl(gistId) {
    var baseUrl = process.env.PI_SHARE_VIEWER_URL || DEFAULT_SHARE_VIEWER_URL;
    return "".concat(baseUrl, "#").concat(gistId);
}
// =============================================================================
// User Config Paths (~/.pi/agent/*)
// =============================================================================
/** Get the agent config directory (e.g., ~/.pi/agent/) */
function getAgentDir() {
    var envDir = process.env[exports.ENV_AGENT_DIR];
    if (envDir) {
        // Expand tilde to home directory
        if (envDir === "~")
            return (0, os_1.homedir)();
        if (envDir.startsWith("~/"))
            return (0, os_1.homedir)() + envDir.slice(1);
        return envDir;
    }
    return (0, path_1.join)((0, os_1.homedir)(), exports.CONFIG_DIR_NAME, "agent");
}
/** Get path to user's custom themes directory */
function getCustomThemesDir() {
    return (0, path_1.join)(getAgentDir(), "themes");
}
/** Get path to models.json */
function getModelsPath() {
    return (0, path_1.join)(getAgentDir(), "models.json");
}
/** Get path to auth.json */
function getAuthPath() {
    return (0, path_1.join)(getAgentDir(), "auth.json");
}
/** Get path to settings.json */
function getSettingsPath() {
    return (0, path_1.join)(getAgentDir(), "settings.json");
}
/** Get path to tools directory */
function getToolsDir() {
    return (0, path_1.join)(getAgentDir(), "tools");
}
/** Get path to managed binaries directory (fd, rg) */
function getBinDir() {
    return (0, path_1.join)(getAgentDir(), "bin");
}
/** Get path to prompt templates directory */
function getPromptsDir() {
    return (0, path_1.join)(getAgentDir(), "prompts");
}
/** Get path to sessions directory */
function getSessionsDir() {
    return (0, path_1.join)(getAgentDir(), "sessions");
}
/** Get path to debug log file */
function getDebugLogPath() {
    return (0, path_1.join)(getAgentDir(), "".concat(exports.APP_NAME, "-debug.log"));
}
