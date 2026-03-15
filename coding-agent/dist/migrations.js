"use strict";
/**
 * One-time migrations that run on startup.
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
exports.migrateAuthToAuthJson = migrateAuthToAuthJson;
exports.migrateSessionsFromAgentRoot = migrateSessionsFromAgentRoot;
exports.showDeprecationWarnings = showDeprecationWarnings;
exports.runMigrations = runMigrations;
var chalk_1 = require("chalk");
var fs_1 = require("fs");
var path_1 = require("path");
var config_js_1 = require("./config.js");
var MIGRATION_GUIDE_URL = "https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/CHANGELOG.md#extensions-migration";
var EXTENSIONS_DOC_URL = "https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md";
/**
 * Migrate legacy oauth.json and settings.json apiKeys to auth.json.
 *
 * @returns Array of provider names that were migrated
 */
function migrateAuthToAuthJson() {
    var agentDir = (0, config_js_1.getAgentDir)();
    var authPath = (0, path_1.join)(agentDir, "auth.json");
    var oauthPath = (0, path_1.join)(agentDir, "oauth.json");
    var settingsPath = (0, path_1.join)(agentDir, "settings.json");
    // Skip if auth.json already exists
    if ((0, fs_1.existsSync)(authPath))
        return [];
    var migrated = {};
    var providers = [];
    // Migrate oauth.json
    if ((0, fs_1.existsSync)(oauthPath)) {
        try {
            var oauth = JSON.parse((0, fs_1.readFileSync)(oauthPath, "utf-8"));
            for (var _i = 0, _a = Object.entries(oauth); _i < _a.length; _i++) {
                var _b = _a[_i], provider = _b[0], cred = _b[1];
                migrated[provider] = __assign({ type: "oauth" }, cred);
                providers.push(provider);
            }
            (0, fs_1.renameSync)(oauthPath, "".concat(oauthPath, ".migrated"));
        }
        catch (_c) {
            // Skip on error
        }
    }
    // Migrate settings.json apiKeys
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            var content = (0, fs_1.readFileSync)(settingsPath, "utf-8");
            var settings = JSON.parse(content);
            if (settings.apiKeys && typeof settings.apiKeys === "object") {
                for (var _d = 0, _e = Object.entries(settings.apiKeys); _d < _e.length; _d++) {
                    var _f = _e[_d], provider = _f[0], key = _f[1];
                    if (!migrated[provider] && typeof key === "string") {
                        migrated[provider] = { type: "api_key", key: key };
                        providers.push(provider);
                    }
                }
                delete settings.apiKeys;
                (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(settings, null, 2));
            }
        }
        catch (_g) {
            // Skip on error
        }
    }
    if (Object.keys(migrated).length > 0) {
        (0, fs_1.mkdirSync)((0, path_1.dirname)(authPath), { recursive: true });
        (0, fs_1.writeFileSync)(authPath, JSON.stringify(migrated, null, 2), { mode: 384 });
    }
    return providers;
}
/**
 * Migrate sessions from ~/.pi/agent/*.jsonl to proper session directories.
 *
 * Bug in v0.30.0: Sessions were saved to ~/.pi/agent/ instead of
 * ~/.pi/agent/sessions/<encoded-cwd>/. This migration moves them
 * to the correct location based on the cwd in their session header.
 *
 * See: https://github.com/badlogic/pi-mono/issues/320
 */
function migrateSessionsFromAgentRoot() {
    var agentDir = (0, config_js_1.getAgentDir)();
    // Find all .jsonl files directly in agentDir (not in subdirectories)
    var files;
    try {
        files = (0, fs_1.readdirSync)(agentDir)
            .filter(function (f) { return f.endsWith(".jsonl"); })
            .map(function (f) { return (0, path_1.join)(agentDir, f); });
    }
    catch (_a) {
        return;
    }
    if (files.length === 0)
        return;
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        try {
            // Read first line to get session header
            var content = (0, fs_1.readFileSync)(file, "utf8");
            var firstLine = content.split("\n")[0];
            if (!(firstLine === null || firstLine === void 0 ? void 0 : firstLine.trim()))
                continue;
            var header = JSON.parse(firstLine);
            if (header.type !== "session" || !header.cwd)
                continue;
            var cwd = header.cwd;
            // Compute the correct session directory (same encoding as session-manager.ts)
            var safePath = "--".concat(cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-"), "--");
            var correctDir = (0, path_1.join)(agentDir, "sessions", safePath);
            // Create directory if needed
            if (!(0, fs_1.existsSync)(correctDir)) {
                (0, fs_1.mkdirSync)(correctDir, { recursive: true });
            }
            // Move the file
            var fileName = file.split("/").pop() || file.split("\\").pop();
            var newPath = (0, path_1.join)(correctDir, fileName);
            if ((0, fs_1.existsSync)(newPath))
                continue; // Skip if target exists
            (0, fs_1.renameSync)(file, newPath);
        }
        catch (_b) {
            // Skip files that can't be migrated
        }
    }
}
/**
 * Migrate commands/ to prompts/ if needed.
 * Works for both regular directories and symlinks.
 */
function migrateCommandsToPrompts(baseDir, label) {
    var commandsDir = (0, path_1.join)(baseDir, "commands");
    var promptsDir = (0, path_1.join)(baseDir, "prompts");
    if ((0, fs_1.existsSync)(commandsDir) && !(0, fs_1.existsSync)(promptsDir)) {
        try {
            (0, fs_1.renameSync)(commandsDir, promptsDir);
            console.log(chalk_1.default.green("Migrated ".concat(label, " commands/ \u2192 prompts/")));
            return true;
        }
        catch (err) {
            console.log(chalk_1.default.yellow("Warning: Could not migrate ".concat(label, " commands/ to prompts/: ").concat(err instanceof Error ? err.message : err)));
        }
    }
    return false;
}
/**
 * Move fd/rg binaries from tools/ to bin/ if they exist.
 */
function migrateToolsToBin() {
    var agentDir = (0, config_js_1.getAgentDir)();
    var toolsDir = (0, path_1.join)(agentDir, "tools");
    var binDir = (0, config_js_1.getBinDir)();
    if (!(0, fs_1.existsSync)(toolsDir))
        return;
    var binaries = ["fd", "rg", "fd.exe", "rg.exe"];
    var movedAny = false;
    for (var _i = 0, binaries_1 = binaries; _i < binaries_1.length; _i++) {
        var bin = binaries_1[_i];
        var oldPath = (0, path_1.join)(toolsDir, bin);
        var newPath = (0, path_1.join)(binDir, bin);
        if ((0, fs_1.existsSync)(oldPath)) {
            if (!(0, fs_1.existsSync)(binDir)) {
                (0, fs_1.mkdirSync)(binDir, { recursive: true });
            }
            if (!(0, fs_1.existsSync)(newPath)) {
                try {
                    (0, fs_1.renameSync)(oldPath, newPath);
                    movedAny = true;
                }
                catch (_a) {
                    // Ignore errors
                }
            }
            else {
                // Target exists, just delete the old one
                try {
                    fs_1.rmSync === null || fs_1.rmSync === void 0 ? void 0 : (0, fs_1.rmSync)(oldPath, { force: true });
                }
                catch (_b) {
                    // Ignore
                }
            }
        }
    }
    if (movedAny) {
        console.log(chalk_1.default.green("Migrated managed binaries tools/ \u2192 bin/"));
    }
}
/**
 * Check for deprecated hooks/ and tools/ directories.
 * Note: tools/ may contain fd/rg binaries extracted by pi, so only warn if it has other files.
 */
function checkDeprecatedExtensionDirs(baseDir, label) {
    var hooksDir = (0, path_1.join)(baseDir, "hooks");
    var toolsDir = (0, path_1.join)(baseDir, "tools");
    var warnings = [];
    if ((0, fs_1.existsSync)(hooksDir)) {
        warnings.push("".concat(label, " hooks/ directory found. Hooks have been renamed to extensions."));
    }
    if ((0, fs_1.existsSync)(toolsDir)) {
        // Check if tools/ contains anything other than fd/rg (which are auto-extracted binaries)
        try {
            var entries = (0, fs_1.readdirSync)(toolsDir);
            var customTools = entries.filter(function (e) {
                var lower = e.toLowerCase();
                return (lower !== "fd" && lower !== "rg" && lower !== "fd.exe" && lower !== "rg.exe" && !e.startsWith(".") // Ignore .DS_Store and other hidden files
                );
            });
            if (customTools.length > 0) {
                warnings.push("".concat(label, " tools/ directory contains custom tools. Custom tools have been merged into extensions."));
            }
        }
        catch (_a) {
            // Ignore read errors
        }
    }
    return warnings;
}
/**
 * Run extension system migrations (commands→prompts) and collect warnings about deprecated directories.
 */
function migrateExtensionSystem(cwd) {
    var agentDir = (0, config_js_1.getAgentDir)();
    var projectDir = (0, path_1.join)(cwd, config_js_1.CONFIG_DIR_NAME);
    // Migrate commands/ to prompts/
    migrateCommandsToPrompts(agentDir, "Global");
    migrateCommandsToPrompts(projectDir, "Project");
    // Check for deprecated directories
    var warnings = __spreadArray(__spreadArray([], checkDeprecatedExtensionDirs(agentDir, "Global"), true), checkDeprecatedExtensionDirs(projectDir, "Project"), true);
    return warnings;
}
/**
 * Print deprecation warnings and wait for keypress.
 */
function showDeprecationWarnings(warnings) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, warnings_1, warning;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (warnings.length === 0)
                        return [2 /*return*/];
                    for (_i = 0, warnings_1 = warnings; _i < warnings_1.length; _i++) {
                        warning = warnings_1[_i];
                        console.log(chalk_1.default.yellow("Warning: ".concat(warning)));
                    }
                    console.log(chalk_1.default.yellow("\nMove your extensions to the extensions/ directory."));
                    console.log(chalk_1.default.yellow("Migration guide: ".concat(MIGRATION_GUIDE_URL)));
                    console.log(chalk_1.default.yellow("Documentation: ".concat(EXTENSIONS_DOC_URL)));
                    console.log(chalk_1.default.dim("\nPress any key to continue..."));
                    return [4 /*yield*/, new Promise(function (resolve) {
                            var _a, _b;
                            (_b = (_a = process.stdin).setRawMode) === null || _b === void 0 ? void 0 : _b.call(_a, true);
                            process.stdin.resume();
                            process.stdin.once("data", function () {
                                var _a, _b;
                                (_b = (_a = process.stdin).setRawMode) === null || _b === void 0 ? void 0 : _b.call(_a, false);
                                process.stdin.pause();
                                resolve();
                            });
                        })];
                case 1:
                    _a.sent();
                    console.log();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Run all migrations. Called once on startup.
 *
 * @returns Object with migration results and deprecation warnings
 */
function runMigrations(cwd) {
    if (cwd === void 0) { cwd = process.cwd(); }
    var migratedAuthProviders = migrateAuthToAuthJson();
    migrateSessionsFromAgentRoot();
    migrateToolsToBin();
    var deprecationWarnings = migrateExtensionSystem(cwd);
    return { migratedAuthProviders: migratedAuthProviders, deprecationWarnings: deprecationWarnings };
}
