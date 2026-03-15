"use strict";
/**
 * Shared diff computation utilities for the edit tool.
 * Used by both edit.ts (for execution) and tool-execution.ts (for preview rendering).
 */
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
exports.detectLineEnding = detectLineEnding;
exports.normalizeToLF = normalizeToLF;
exports.restoreLineEndings = restoreLineEndings;
exports.normalizeForFuzzyMatch = normalizeForFuzzyMatch;
exports.fuzzyFindText = fuzzyFindText;
exports.stripBom = stripBom;
exports.generateDiffString = generateDiffString;
exports.computeEditDiff = computeEditDiff;
var Diff = require("diff");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var path_utils_js_1 = require("./path-utils.js");
function detectLineEnding(content) {
    var crlfIdx = content.indexOf("\r\n");
    var lfIdx = content.indexOf("\n");
    if (lfIdx === -1)
        return "\n";
    if (crlfIdx === -1)
        return "\n";
    return crlfIdx < lfIdx ? "\r\n" : "\n";
}
function normalizeToLF(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function restoreLineEndings(text, ending) {
    return ending === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}
/**
 * Normalize text for fuzzy matching. Applies progressive transformations:
 * - Strip trailing whitespace from each line
 * - Normalize smart quotes to ASCII equivalents
 * - Normalize Unicode dashes/hyphens to ASCII hyphen
 * - Normalize special Unicode spaces to regular space
 */
function normalizeForFuzzyMatch(text) {
    return (text
        // Strip trailing whitespace per line
        .split("\n")
        .map(function (line) { return line.trimEnd(); })
        .join("\n")
        // Smart single quotes → '
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        // Smart double quotes → "
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        // Various dashes/hyphens → -
        // U+2010 hyphen, U+2011 non-breaking hyphen, U+2012 figure dash,
        // U+2013 en-dash, U+2014 em-dash, U+2015 horizontal bar, U+2212 minus
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
        // Special spaces → regular space
        // U+00A0 NBSP, U+2002-U+200A various spaces, U+202F narrow NBSP,
        // U+205F medium math space, U+3000 ideographic space
        .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " "));
}
/**
 * Find oldText in content, trying exact match first, then fuzzy match.
 * When fuzzy matching is used, the returned contentForReplacement is the
 * fuzzy-normalized version of the content (trailing whitespace stripped,
 * Unicode quotes/dashes normalized to ASCII).
 */
function fuzzyFindText(content, oldText) {
    // Try exact match first
    var exactIndex = content.indexOf(oldText);
    if (exactIndex !== -1) {
        return {
            found: true,
            index: exactIndex,
            matchLength: oldText.length,
            usedFuzzyMatch: false,
            contentForReplacement: content,
        };
    }
    // Try fuzzy match - work entirely in normalized space
    var fuzzyContent = normalizeForFuzzyMatch(content);
    var fuzzyOldText = normalizeForFuzzyMatch(oldText);
    var fuzzyIndex = fuzzyContent.indexOf(fuzzyOldText);
    if (fuzzyIndex === -1) {
        return {
            found: false,
            index: -1,
            matchLength: 0,
            usedFuzzyMatch: false,
            contentForReplacement: content,
        };
    }
    // When fuzzy matching, we work in the normalized space for replacement.
    // This means the output will have normalized whitespace/quotes/dashes,
    // which is acceptable since we're fixing minor formatting differences anyway.
    return {
        found: true,
        index: fuzzyIndex,
        matchLength: fuzzyOldText.length,
        usedFuzzyMatch: true,
        contentForReplacement: fuzzyContent,
    };
}
/** Strip UTF-8 BOM if present, return both the BOM (if any) and the text without it */
function stripBom(content) {
    return content.startsWith("\uFEFF") ? { bom: "\uFEFF", text: content.slice(1) } : { bom: "", text: content };
}
/**
 * Generate a unified diff string with line numbers and context.
 * Returns both the diff string and the first changed line number (in the new file).
 */
function generateDiffString(oldContent, newContent, contextLines) {
    if (contextLines === void 0) { contextLines = 4; }
    var parts = Diff.diffLines(oldContent, newContent);
    var output = [];
    var oldLines = oldContent.split("\n");
    var newLines = newContent.split("\n");
    var maxLineNum = Math.max(oldLines.length, newLines.length);
    var lineNumWidth = String(maxLineNum).length;
    var oldLineNum = 1;
    var newLineNum = 1;
    var lastWasChange = false;
    var firstChangedLine;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var raw = part.value.split("\n");
        if (raw[raw.length - 1] === "") {
            raw.pop();
        }
        if (part.added || part.removed) {
            // Capture the first changed line (in the new file)
            if (firstChangedLine === undefined) {
                firstChangedLine = newLineNum;
            }
            // Show the change
            for (var _i = 0, raw_1 = raw; _i < raw_1.length; _i++) {
                var line = raw_1[_i];
                if (part.added) {
                    var lineNum = String(newLineNum).padStart(lineNumWidth, " ");
                    output.push("+".concat(lineNum, " ").concat(line));
                    newLineNum++;
                }
                else {
                    // removed
                    var lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                    output.push("-".concat(lineNum, " ").concat(line));
                    oldLineNum++;
                }
            }
            lastWasChange = true;
        }
        else {
            // Context lines - only show a few before/after changes
            var nextPartIsChange = i < parts.length - 1 && (parts[i + 1].added || parts[i + 1].removed);
            if (lastWasChange || nextPartIsChange) {
                // Show context
                var linesToShow = raw;
                var skipStart = 0;
                var skipEnd = 0;
                if (!lastWasChange) {
                    // Show only last N lines as leading context
                    skipStart = Math.max(0, raw.length - contextLines);
                    linesToShow = raw.slice(skipStart);
                }
                if (!nextPartIsChange && linesToShow.length > contextLines) {
                    // Show only first N lines as trailing context
                    skipEnd = linesToShow.length - contextLines;
                    linesToShow = linesToShow.slice(0, contextLines);
                }
                // Add ellipsis if we skipped lines at start
                if (skipStart > 0) {
                    output.push(" ".concat("".padStart(lineNumWidth, " "), " ..."));
                    // Update line numbers for the skipped leading context
                    oldLineNum += skipStart;
                    newLineNum += skipStart;
                }
                for (var _a = 0, linesToShow_1 = linesToShow; _a < linesToShow_1.length; _a++) {
                    var line = linesToShow_1[_a];
                    var lineNum = String(oldLineNum).padStart(lineNumWidth, " ");
                    output.push(" ".concat(lineNum, " ").concat(line));
                    oldLineNum++;
                    newLineNum++;
                }
                // Add ellipsis if we skipped lines at end
                if (skipEnd > 0) {
                    output.push(" ".concat("".padStart(lineNumWidth, " "), " ..."));
                    // Update line numbers for the skipped trailing context
                    oldLineNum += skipEnd;
                    newLineNum += skipEnd;
                }
            }
            else {
                // Skip these context lines entirely
                oldLineNum += raw.length;
                newLineNum += raw.length;
            }
            lastWasChange = false;
        }
    }
    return { diff: output.join("\n"), firstChangedLine: firstChangedLine };
}
/**
 * Compute the diff for an edit operation without applying it.
 * Used for preview rendering in the TUI before the tool executes.
 */
function computeEditDiff(path, oldText, newText, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        var absolutePath, _a, rawContent, content, normalizedContent, normalizedOldText, normalizedNewText, matchResult, fuzzyContent, fuzzyOldText, occurrences, baseContent, newContent, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    absolutePath = (0, path_utils_js_1.resolveToCwd)(path, cwd);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, , 8]);
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, promises_1.access)(absolutePath, fs_1.constants.R_OK)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, { error: "File not found: ".concat(path) }];
                case 5: return [4 /*yield*/, (0, promises_1.readFile)(absolutePath, "utf-8")];
                case 6:
                    rawContent = _b.sent();
                    content = stripBom(rawContent).text;
                    normalizedContent = normalizeToLF(content);
                    normalizedOldText = normalizeToLF(oldText);
                    normalizedNewText = normalizeToLF(newText);
                    matchResult = fuzzyFindText(normalizedContent, normalizedOldText);
                    if (!matchResult.found) {
                        return [2 /*return*/, {
                                error: "Could not find the exact text in ".concat(path, ". The old text must match exactly including all whitespace and newlines."),
                            }];
                    }
                    fuzzyContent = normalizeForFuzzyMatch(normalizedContent);
                    fuzzyOldText = normalizeForFuzzyMatch(normalizedOldText);
                    occurrences = fuzzyContent.split(fuzzyOldText).length - 1;
                    if (occurrences > 1) {
                        return [2 /*return*/, {
                                error: "Found ".concat(occurrences, " occurrences of the text in ").concat(path, ". The text must be unique. Please provide more context to make it unique."),
                            }];
                    }
                    baseContent = matchResult.contentForReplacement;
                    newContent = baseContent.substring(0, matchResult.index) +
                        normalizedNewText +
                        baseContent.substring(matchResult.index + matchResult.matchLength);
                    // Check if it would actually change anything
                    if (baseContent === newContent) {
                        return [2 /*return*/, {
                                error: "No changes would be made to ".concat(path, ". The replacement produces identical content."),
                            }];
                    }
                    // Generate the diff
                    return [2 /*return*/, generateDiffString(baseContent, newContent)];
                case 7:
                    err_1 = _b.sent();
                    return [2 /*return*/, { error: err_1 instanceof Error ? err_1.message : String(err_1) }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
