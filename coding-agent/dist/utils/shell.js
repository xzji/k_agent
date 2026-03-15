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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShellConfig = getShellConfig;
exports.getShellEnv = getShellEnv;
exports.sanitizeBinaryOutput = sanitizeBinaryOutput;
exports.killProcessTree = killProcessTree;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var child_process_1 = require("child_process");
var config_js_1 = require("../config.js");
var settings_manager_js_1 = require("../core/settings-manager.js");
var cachedShellConfig = null;
/**
 * Find bash executable on PATH (cross-platform)
 */
function findBashOnPath() {
    if (process.platform === "win32") {
        // Windows: Use 'where' and verify file exists (where can return non-existent paths)
        try {
            var result = (0, child_process_1.spawnSync)("where", ["bash.exe"], { encoding: "utf-8", timeout: 5000 });
            if (result.status === 0 && result.stdout) {
                var firstMatch = result.stdout.trim().split(/\r?\n/)[0];
                if (firstMatch && (0, node_fs_1.existsSync)(firstMatch)) {
                    return firstMatch;
                }
            }
        }
        catch (_a) {
            // Ignore errors
        }
        return null;
    }
    // Unix: Use 'which' and trust its output (handles Termux and special filesystems)
    try {
        var result = (0, child_process_1.spawnSync)("which", ["bash"], { encoding: "utf-8", timeout: 5000 });
        if (result.status === 0 && result.stdout) {
            var firstMatch = result.stdout.trim().split(/\r?\n/)[0];
            if (firstMatch) {
                return firstMatch;
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return null;
}
/**
 * Get shell configuration based on platform.
 * Resolution order:
 * 1. User-specified shellPath in settings.json
 * 2. On Windows: Git Bash in known locations, then bash on PATH
 * 3. On Unix: /bin/bash, then bash on PATH, then fallback to sh
 */
function getShellConfig() {
    if (cachedShellConfig) {
        return cachedShellConfig;
    }
    var settings = settings_manager_js_1.SettingsManager.create();
    var customShellPath = settings.getShellPath();
    // 1. Check user-specified shell path
    if (customShellPath) {
        if ((0, node_fs_1.existsSync)(customShellPath)) {
            cachedShellConfig = { shell: customShellPath, args: ["-c"] };
            return cachedShellConfig;
        }
        throw new Error("Custom shell path not found: ".concat(customShellPath, "\nPlease update shellPath in ").concat((0, config_js_1.getSettingsPath)()));
    }
    if (process.platform === "win32") {
        // 2. Try Git Bash in known locations
        var paths = [];
        var programFiles = process.env.ProgramFiles;
        if (programFiles) {
            paths.push("".concat(programFiles, "\\Git\\bin\\bash.exe"));
        }
        var programFilesX86 = process.env["ProgramFiles(x86)"];
        if (programFilesX86) {
            paths.push("".concat(programFilesX86, "\\Git\\bin\\bash.exe"));
        }
        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
            var path = paths_1[_i];
            if ((0, node_fs_1.existsSync)(path)) {
                cachedShellConfig = { shell: path, args: ["-c"] };
                return cachedShellConfig;
            }
        }
        // 3. Fallback: search bash.exe on PATH (Cygwin, MSYS2, WSL, etc.)
        var bashOnPath_1 = findBashOnPath();
        if (bashOnPath_1) {
            cachedShellConfig = { shell: bashOnPath_1, args: ["-c"] };
            return cachedShellConfig;
        }
        throw new Error("No bash shell found. Options:\n" +
            "  1. Install Git for Windows: https://git-scm.com/download/win\n" +
            "  2. Add your bash to PATH (Cygwin, MSYS2, etc.)\n" +
            "  3. Set shellPath in ".concat((0, config_js_1.getSettingsPath)(), "\n\n") +
            "Searched Git Bash in:\n".concat(paths.map(function (p) { return "  ".concat(p); }).join("\n")));
    }
    // Unix: try /bin/bash, then bash on PATH, then fallback to sh
    if ((0, node_fs_1.existsSync)("/bin/bash")) {
        cachedShellConfig = { shell: "/bin/bash", args: ["-c"] };
        return cachedShellConfig;
    }
    var bashOnPath = findBashOnPath();
    if (bashOnPath) {
        cachedShellConfig = { shell: bashOnPath, args: ["-c"] };
        return cachedShellConfig;
    }
    cachedShellConfig = { shell: "sh", args: ["-c"] };
    return cachedShellConfig;
}
function getShellEnv() {
    var _a;
    var _b, _c;
    var binDir = (0, config_js_1.getBinDir)();
    var pathKey = (_b = Object.keys(process.env).find(function (key) { return key.toLowerCase() === "path"; })) !== null && _b !== void 0 ? _b : "PATH";
    var currentPath = (_c = process.env[pathKey]) !== null && _c !== void 0 ? _c : "";
    var pathEntries = currentPath.split(node_path_1.delimiter).filter(Boolean);
    var hasBinDir = pathEntries.includes(binDir);
    var updatedPath = hasBinDir ? currentPath : [binDir, currentPath].filter(Boolean).join(node_path_1.delimiter);
    return __assign(__assign({}, process.env), (_a = {}, _a[pathKey] = updatedPath, _a));
}
/**
 * Sanitize binary output for display/storage.
 * Removes characters that crash string-width or cause display issues:
 * - Control characters (except tab, newline, carriage return)
 * - Lone surrogates
 * - Unicode Format characters (crash string-width due to a bug)
 * - Characters with undefined code points
 */
function sanitizeBinaryOutput(str) {
    // Use Array.from to properly iterate over code points (not code units)
    // This handles surrogate pairs correctly and catches edge cases where
    // codePointAt() might return undefined
    return Array.from(str)
        .filter(function (char) {
        // Filter out characters that cause string-width to crash
        // This includes:
        // - Unicode format characters
        // - Lone surrogates (already filtered by Array.from)
        // - Control chars except \t \n \r
        // - Characters with undefined code points
        var code = char.codePointAt(0);
        // Skip if code point is undefined (edge case with invalid strings)
        if (code === undefined)
            return false;
        // Allow tab, newline, carriage return
        if (code === 0x09 || code === 0x0a || code === 0x0d)
            return true;
        // Filter out control characters (0x00-0x1F, except 0x09, 0x0a, 0x0x0d)
        if (code <= 0x1f)
            return false;
        // Filter out Unicode format characters
        if (code >= 0xfff9 && code <= 0xfffb)
            return false;
        return true;
    })
        .join("");
}
/**
 * Kill a process and all its children (cross-platform)
 */
function killProcessTree(pid) {
    if (process.platform === "win32") {
        // Use taskkill on Windows to kill process tree
        try {
            (0, child_process_1.spawn)("taskkill", ["/F", "/T", "/PID", String(pid)], {
                stdio: "ignore",
                detached: true,
            });
        }
        catch (_a) {
            // Ignore errors if taskkill fails
        }
    }
    else {
        // Use SIGKILL on Unix/Linux/Mac
        try {
            process.kill(-pid, "SIGKILL");
        }
        catch (_b) {
            // Fallback to killing just the child if process group kill fails
            try {
                process.kill(pid, "SIGKILL");
            }
            catch (_c) {
                // Process already dead
            }
        }
    }
}
