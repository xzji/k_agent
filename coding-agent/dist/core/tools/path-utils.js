"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandPath = expandPath;
exports.resolveToCwd = resolveToCwd;
exports.resolveReadPath = resolveReadPath;
var node_fs_1 = require("node:fs");
var os = require("node:os");
var node_path_1 = require("node:path");
var UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
var NARROW_NO_BREAK_SPACE = "\u202F";
function normalizeUnicodeSpaces(str) {
    return str.replace(UNICODE_SPACES, " ");
}
function tryMacOSScreenshotPath(filePath) {
    return filePath.replace(/ (AM|PM)\./g, "".concat(NARROW_NO_BREAK_SPACE, "$1."));
}
function tryNFDVariant(filePath) {
    // macOS stores filenames in NFD (decomposed) form, try converting user input to NFD
    return filePath.normalize("NFD");
}
function tryCurlyQuoteVariant(filePath) {
    // macOS uses U+2019 (right single quotation mark) in screenshot names like "Capture d'écran"
    // Users typically type U+0027 (straight apostrophe)
    return filePath.replace(/'/g, "\u2019");
}
function fileExists(filePath) {
    try {
        (0, node_fs_1.accessSync)(filePath, node_fs_1.constants.F_OK);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function normalizeAtPrefix(filePath) {
    return filePath.startsWith("@") ? filePath.slice(1) : filePath;
}
function expandPath(filePath) {
    var normalized = normalizeUnicodeSpaces(normalizeAtPrefix(filePath));
    if (normalized === "~") {
        return os.homedir();
    }
    if (normalized.startsWith("~/")) {
        return os.homedir() + normalized.slice(1);
    }
    return normalized;
}
/**
 * Resolve a path relative to the given cwd.
 * Handles ~ expansion and absolute paths.
 */
function resolveToCwd(filePath, cwd) {
    var expanded = expandPath(filePath);
    if ((0, node_path_1.isAbsolute)(expanded)) {
        return expanded;
    }
    return (0, node_path_1.resolve)(cwd, expanded);
}
function resolveReadPath(filePath, cwd) {
    var resolved = resolveToCwd(filePath, cwd);
    if (fileExists(resolved)) {
        return resolved;
    }
    // Try macOS AM/PM variant (narrow no-break space before AM/PM)
    var amPmVariant = tryMacOSScreenshotPath(resolved);
    if (amPmVariant !== resolved && fileExists(amPmVariant)) {
        return amPmVariant;
    }
    // Try NFD variant (macOS stores filenames in NFD form)
    var nfdVariant = tryNFDVariant(resolved);
    if (nfdVariant !== resolved && fileExists(nfdVariant)) {
        return nfdVariant;
    }
    // Try curly quote variant (macOS uses U+2019 in screenshot names)
    var curlyVariant = tryCurlyQuoteVariant(resolved);
    if (curlyVariant !== resolved && fileExists(curlyVariant)) {
        return curlyVariant;
    }
    // Try combined NFD + curly quote (for French macOS screenshots like "Capture d'écran")
    var nfdCurlyVariant = tryCurlyQuoteVariant(nfdVariant);
    if (nfdCurlyVariant !== resolved && fileExists(nfdCurlyVariant)) {
        return nfdCurlyVariant;
    }
    return resolved;
}
