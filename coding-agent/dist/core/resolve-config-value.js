"use strict";
/**
 * Resolve configuration values that may be shell commands, environment variables, or literals.
 * Used by auth-storage.ts and model-registry.ts.
 */
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
exports.resolveConfigValue = resolveConfigValue;
exports.resolveHeaders = resolveHeaders;
exports.clearConfigValueCache = clearConfigValueCache;
var child_process_1 = require("child_process");
var shell_js_1 = require("../utils/shell.js");
// Cache for shell command results (persists for process lifetime)
var commandResultCache = new Map();
/**
 * Resolve a config value (API key, header value, etc.) to an actual value.
 * - If starts with "!", executes the rest as a shell command and uses stdout (cached)
 * - Otherwise checks environment variable first, then treats as literal (not cached)
 */
function resolveConfigValue(config) {
    if (config.startsWith("!")) {
        return executeCommand(config);
    }
    var envValue = process.env[config];
    return envValue || config;
}
function executeWithConfiguredShell(command) {
    var _a;
    try {
        var _b = (0, shell_js_1.getShellConfig)(), shell = _b.shell, args = _b.args;
        var result = (0, child_process_1.spawnSync)(shell, __spreadArray(__spreadArray([], args, true), [command], false), {
            encoding: "utf-8",
            timeout: 10000,
            stdio: ["ignore", "pipe", "ignore"],
            shell: false,
            windowsHide: true,
        });
        if (result.error) {
            var error = result.error;
            if (error.code === "ENOENT") {
                return { executed: false, value: undefined };
            }
            return { executed: true, value: undefined };
        }
        if (result.status !== 0) {
            return { executed: true, value: undefined };
        }
        var value = ((_a = result.stdout) !== null && _a !== void 0 ? _a : "").trim();
        return { executed: true, value: value || undefined };
    }
    catch (_c) {
        return { executed: false, value: undefined };
    }
}
function executeWithDefaultShell(command) {
    try {
        var output = (0, child_process_1.execSync)(command, {
            encoding: "utf-8",
            timeout: 10000,
            stdio: ["ignore", "pipe", "ignore"],
        });
        return output.trim() || undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function executeCommand(commandConfig) {
    if (commandResultCache.has(commandConfig)) {
        return commandResultCache.get(commandConfig);
    }
    var command = commandConfig.slice(1);
    var result = process.platform === "win32"
        ? (function () {
            var configuredResult = executeWithConfiguredShell(command);
            return configuredResult.executed ? configuredResult.value : executeWithDefaultShell(command);
        })()
        : executeWithDefaultShell(command);
    commandResultCache.set(commandConfig, result);
    return result;
}
/**
 * Resolve all header values using the same resolution logic as API keys.
 */
function resolveHeaders(headers) {
    if (!headers)
        return undefined;
    var resolved = {};
    for (var _i = 0, _a = Object.entries(headers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        var resolvedValue = resolveConfigValue(value);
        if (resolvedValue) {
            resolved[key] = resolvedValue;
        }
    }
    return Object.keys(resolved).length > 0 ? resolved : undefined;
}
/** Clear the config value command cache. Exported for testing. */
function clearConfigValueCache() {
    commandResultCache.clear();
}
