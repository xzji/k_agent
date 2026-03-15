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
exports.getChangelogPath = void 0;
exports.parseChangelog = parseChangelog;
exports.compareVersions = compareVersions;
exports.getNewEntries = getNewEntries;
var fs_1 = require("fs");
/**
 * Parse changelog entries from CHANGELOG.md
 * Scans for ## lines and collects content until next ## or EOF
 */
function parseChangelog(changelogPath) {
    if (!(0, fs_1.existsSync)(changelogPath)) {
        return [];
    }
    try {
        var content = (0, fs_1.readFileSync)(changelogPath, "utf-8");
        var lines = content.split("\n");
        var entries = [];
        var currentLines = [];
        var currentVersion = null;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            // Check if this is a version header (## [x.y.z] ...)
            if (line.startsWith("## ")) {
                // Save previous entry if exists
                if (currentVersion && currentLines.length > 0) {
                    entries.push(__assign(__assign({}, currentVersion), { content: currentLines.join("\n").trim() }));
                }
                // Try to parse version from this line
                var versionMatch = line.match(/##\s+\[?(\d+)\.(\d+)\.(\d+)\]?/);
                if (versionMatch) {
                    currentVersion = {
                        major: Number.parseInt(versionMatch[1], 10),
                        minor: Number.parseInt(versionMatch[2], 10),
                        patch: Number.parseInt(versionMatch[3], 10),
                    };
                    currentLines = [line];
                }
                else {
                    // Reset if we can't parse version
                    currentVersion = null;
                    currentLines = [];
                }
            }
            else if (currentVersion) {
                // Collect lines for current version
                currentLines.push(line);
            }
        }
        // Save last entry
        if (currentVersion && currentLines.length > 0) {
            entries.push(__assign(__assign({}, currentVersion), { content: currentLines.join("\n").trim() }));
        }
        return entries;
    }
    catch (error) {
        console.error("Warning: Could not parse changelog: ".concat(error));
        return [];
    }
}
/**
 * Compare versions. Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
    if (v1.major !== v2.major)
        return v1.major - v2.major;
    if (v1.minor !== v2.minor)
        return v1.minor - v2.minor;
    return v1.patch - v2.patch;
}
/**
 * Get entries newer than lastVersion
 */
function getNewEntries(entries, lastVersion) {
    // Parse lastVersion
    var parts = lastVersion.split(".").map(Number);
    var last = {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
        content: "",
    };
    return entries.filter(function (entry) { return compareVersions(entry, last) > 0; });
}
// Re-export getChangelogPath from paths.ts for convenience
var config_js_1 = require("../config.js");
Object.defineProperty(exports, "getChangelogPath", { enumerable: true, get: function () { return config_js_1.getChangelogPath; } });
