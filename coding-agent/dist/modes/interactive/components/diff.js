"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDiff = renderDiff;
var Diff = require("diff");
var theme_js_1 = require("../theme/theme.js");
/**
 * Parse diff line to extract prefix, line number, and content.
 * Format: "+123 content" or "-123 content" or " 123 content" or "     ..."
 */
function parseDiffLine(line) {
    var match = line.match(/^([+-\s])(\s*\d*)\s(.*)$/);
    if (!match)
        return null;
    return { prefix: match[1], lineNum: match[2], content: match[3] };
}
/**
 * Replace tabs with spaces for consistent rendering.
 */
function replaceTabs(text) {
    return text.replace(/\t/g, "   ");
}
/**
 * Compute word-level diff and render with inverse on changed parts.
 * Uses diffWords which groups whitespace with adjacent words for cleaner highlighting.
 * Strips leading whitespace from inverse to avoid highlighting indentation.
 */
function renderIntraLineDiff(oldContent, newContent) {
    var _a, _b;
    var wordDiff = Diff.diffWords(oldContent, newContent);
    var removedLine = "";
    var addedLine = "";
    var isFirstRemoved = true;
    var isFirstAdded = true;
    for (var _i = 0, wordDiff_1 = wordDiff; _i < wordDiff_1.length; _i++) {
        var part = wordDiff_1[_i];
        if (part.removed) {
            var value = part.value;
            // Strip leading whitespace from the first removed part
            if (isFirstRemoved) {
                var leadingWs = ((_a = value.match(/^(\s*)/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
                value = value.slice(leadingWs.length);
                removedLine += leadingWs;
                isFirstRemoved = false;
            }
            if (value) {
                removedLine += theme_js_1.theme.inverse(value);
            }
        }
        else if (part.added) {
            var value = part.value;
            // Strip leading whitespace from the first added part
            if (isFirstAdded) {
                var leadingWs = ((_b = value.match(/^(\s*)/)) === null || _b === void 0 ? void 0 : _b[1]) || "";
                value = value.slice(leadingWs.length);
                addedLine += leadingWs;
                isFirstAdded = false;
            }
            if (value) {
                addedLine += theme_js_1.theme.inverse(value);
            }
        }
        else {
            removedLine += part.value;
            addedLine += part.value;
        }
    }
    return { removedLine: removedLine, addedLine: addedLine };
}
/**
 * Render a diff string with colored lines and intra-line change highlighting.
 * - Context lines: dim/gray
 * - Removed lines: red, with inverse on changed tokens
 * - Added lines: green, with inverse on changed tokens
 */
function renderDiff(diffText, _options) {
    if (_options === void 0) { _options = {}; }
    var lines = diffText.split("\n");
    var result = [];
    var i = 0;
    while (i < lines.length) {
        var line = lines[i];
        var parsed = parseDiffLine(line);
        if (!parsed) {
            result.push(theme_js_1.theme.fg("toolDiffContext", line));
            i++;
            continue;
        }
        if (parsed.prefix === "-") {
            // Collect consecutive removed lines
            var removedLines = [];
            while (i < lines.length) {
                var p = parseDiffLine(lines[i]);
                if (!p || p.prefix !== "-")
                    break;
                removedLines.push({ lineNum: p.lineNum, content: p.content });
                i++;
            }
            // Collect consecutive added lines
            var addedLines = [];
            while (i < lines.length) {
                var p = parseDiffLine(lines[i]);
                if (!p || p.prefix !== "+")
                    break;
                addedLines.push({ lineNum: p.lineNum, content: p.content });
                i++;
            }
            // Only do intra-line diffing when there's exactly one removed and one added line
            // (indicating a single line modification). Otherwise, show lines as-is.
            if (removedLines.length === 1 && addedLines.length === 1) {
                var removed = removedLines[0];
                var added = addedLines[0];
                var _a = renderIntraLineDiff(replaceTabs(removed.content), replaceTabs(added.content)), removedLine = _a.removedLine, addedLine = _a.addedLine;
                result.push(theme_js_1.theme.fg("toolDiffRemoved", "-".concat(removed.lineNum, " ").concat(removedLine)));
                result.push(theme_js_1.theme.fg("toolDiffAdded", "+".concat(added.lineNum, " ").concat(addedLine)));
            }
            else {
                // Show all removed lines first, then all added lines
                for (var _i = 0, removedLines_1 = removedLines; _i < removedLines_1.length; _i++) {
                    var removed = removedLines_1[_i];
                    result.push(theme_js_1.theme.fg("toolDiffRemoved", "-".concat(removed.lineNum, " ").concat(replaceTabs(removed.content))));
                }
                for (var _b = 0, addedLines_1 = addedLines; _b < addedLines_1.length; _b++) {
                    var added = addedLines_1[_b];
                    result.push(theme_js_1.theme.fg("toolDiffAdded", "+".concat(added.lineNum, " ").concat(replaceTabs(added.content))));
                }
            }
        }
        else if (parsed.prefix === "+") {
            // Standalone added line
            result.push(theme_js_1.theme.fg("toolDiffAdded", "+".concat(parsed.lineNum, " ").concat(replaceTabs(parsed.content))));
            i++;
        }
        else {
            // Context line
            result.push(theme_js_1.theme.fg("toolDiffContext", " ".concat(parsed.lineNum, " ").concat(replaceTabs(parsed.content))));
            i++;
        }
    }
    return result.join("\n");
}
