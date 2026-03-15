"use strict";
/**
 * Shared truncation utilities for tool outputs.
 *
 * Truncation is based on two independent limits - whichever is hit first wins:
 * - Line limit (default: 2000 lines)
 * - Byte limit (default: 50KB)
 *
 * Never returns partial lines (except bash tail truncation edge case).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GREP_MAX_LINE_LENGTH = exports.DEFAULT_MAX_BYTES = exports.DEFAULT_MAX_LINES = void 0;
exports.formatSize = formatSize;
exports.truncateHead = truncateHead;
exports.truncateTail = truncateTail;
exports.truncateLine = truncateLine;
exports.DEFAULT_MAX_LINES = 2000;
exports.DEFAULT_MAX_BYTES = 50 * 1024; // 50KB
exports.GREP_MAX_LINE_LENGTH = 500; // Max chars per grep match line
/**
 * Format bytes as human-readable size.
 */
function formatSize(bytes) {
    if (bytes < 1024) {
        return "".concat(bytes, "B");
    }
    else if (bytes < 1024 * 1024) {
        return "".concat((bytes / 1024).toFixed(1), "KB");
    }
    else {
        return "".concat((bytes / (1024 * 1024)).toFixed(1), "MB");
    }
}
/**
 * Truncate content from the head (keep first N lines/bytes).
 * Suitable for file reads where you want to see the beginning.
 *
 * Never returns partial lines. If first line exceeds byte limit,
 * returns empty content with firstLineExceedsLimit=true.
 */
function truncateHead(content, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var maxLines = (_a = options.maxLines) !== null && _a !== void 0 ? _a : exports.DEFAULT_MAX_LINES;
    var maxBytes = (_b = options.maxBytes) !== null && _b !== void 0 ? _b : exports.DEFAULT_MAX_BYTES;
    var totalBytes = Buffer.byteLength(content, "utf-8");
    var lines = content.split("\n");
    var totalLines = lines.length;
    // Check if no truncation needed
    if (totalLines <= maxLines && totalBytes <= maxBytes) {
        return {
            content: content,
            truncated: false,
            truncatedBy: null,
            totalLines: totalLines,
            totalBytes: totalBytes,
            outputLines: totalLines,
            outputBytes: totalBytes,
            lastLinePartial: false,
            firstLineExceedsLimit: false,
            maxLines: maxLines,
            maxBytes: maxBytes,
        };
    }
    // Check if first line alone exceeds byte limit
    var firstLineBytes = Buffer.byteLength(lines[0], "utf-8");
    if (firstLineBytes > maxBytes) {
        return {
            content: "",
            truncated: true,
            truncatedBy: "bytes",
            totalLines: totalLines,
            totalBytes: totalBytes,
            outputLines: 0,
            outputBytes: 0,
            lastLinePartial: false,
            firstLineExceedsLimit: true,
            maxLines: maxLines,
            maxBytes: maxBytes,
        };
    }
    // Collect complete lines that fit
    var outputLinesArr = [];
    var outputBytesCount = 0;
    var truncatedBy = "lines";
    for (var i = 0; i < lines.length && i < maxLines; i++) {
        var line = lines[i];
        var lineBytes = Buffer.byteLength(line, "utf-8") + (i > 0 ? 1 : 0); // +1 for newline
        if (outputBytesCount + lineBytes > maxBytes) {
            truncatedBy = "bytes";
            break;
        }
        outputLinesArr.push(line);
        outputBytesCount += lineBytes;
    }
    // If we exited due to line limit
    if (outputLinesArr.length >= maxLines && outputBytesCount <= maxBytes) {
        truncatedBy = "lines";
    }
    var outputContent = outputLinesArr.join("\n");
    var finalOutputBytes = Buffer.byteLength(outputContent, "utf-8");
    return {
        content: outputContent,
        truncated: true,
        truncatedBy: truncatedBy,
        totalLines: totalLines,
        totalBytes: totalBytes,
        outputLines: outputLinesArr.length,
        outputBytes: finalOutputBytes,
        lastLinePartial: false,
        firstLineExceedsLimit: false,
        maxLines: maxLines,
        maxBytes: maxBytes,
    };
}
/**
 * Truncate content from the tail (keep last N lines/bytes).
 * Suitable for bash output where you want to see the end (errors, final results).
 *
 * May return partial first line if the last line of original content exceeds byte limit.
 */
function truncateTail(content, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var maxLines = (_a = options.maxLines) !== null && _a !== void 0 ? _a : exports.DEFAULT_MAX_LINES;
    var maxBytes = (_b = options.maxBytes) !== null && _b !== void 0 ? _b : exports.DEFAULT_MAX_BYTES;
    var totalBytes = Buffer.byteLength(content, "utf-8");
    var lines = content.split("\n");
    var totalLines = lines.length;
    // Check if no truncation needed
    if (totalLines <= maxLines && totalBytes <= maxBytes) {
        return {
            content: content,
            truncated: false,
            truncatedBy: null,
            totalLines: totalLines,
            totalBytes: totalBytes,
            outputLines: totalLines,
            outputBytes: totalBytes,
            lastLinePartial: false,
            firstLineExceedsLimit: false,
            maxLines: maxLines,
            maxBytes: maxBytes,
        };
    }
    // Work backwards from the end
    var outputLinesArr = [];
    var outputBytesCount = 0;
    var truncatedBy = "lines";
    var lastLinePartial = false;
    for (var i = lines.length - 1; i >= 0 && outputLinesArr.length < maxLines; i--) {
        var line = lines[i];
        var lineBytes = Buffer.byteLength(line, "utf-8") + (outputLinesArr.length > 0 ? 1 : 0); // +1 for newline
        if (outputBytesCount + lineBytes > maxBytes) {
            truncatedBy = "bytes";
            // Edge case: if we haven't added ANY lines yet and this line exceeds maxBytes,
            // take the end of the line (partial)
            if (outputLinesArr.length === 0) {
                var truncatedLine = truncateStringToBytesFromEnd(line, maxBytes);
                outputLinesArr.unshift(truncatedLine);
                outputBytesCount = Buffer.byteLength(truncatedLine, "utf-8");
                lastLinePartial = true;
            }
            break;
        }
        outputLinesArr.unshift(line);
        outputBytesCount += lineBytes;
    }
    // If we exited due to line limit
    if (outputLinesArr.length >= maxLines && outputBytesCount <= maxBytes) {
        truncatedBy = "lines";
    }
    var outputContent = outputLinesArr.join("\n");
    var finalOutputBytes = Buffer.byteLength(outputContent, "utf-8");
    return {
        content: outputContent,
        truncated: true,
        truncatedBy: truncatedBy,
        totalLines: totalLines,
        totalBytes: totalBytes,
        outputLines: outputLinesArr.length,
        outputBytes: finalOutputBytes,
        lastLinePartial: lastLinePartial,
        firstLineExceedsLimit: false,
        maxLines: maxLines,
        maxBytes: maxBytes,
    };
}
/**
 * Truncate a string to fit within a byte limit (from the end).
 * Handles multi-byte UTF-8 characters correctly.
 */
function truncateStringToBytesFromEnd(str, maxBytes) {
    var buf = Buffer.from(str, "utf-8");
    if (buf.length <= maxBytes) {
        return str;
    }
    // Start from the end, skip maxBytes back
    var start = buf.length - maxBytes;
    // Find a valid UTF-8 boundary (start of a character)
    while (start < buf.length && (buf[start] & 0xc0) === 0x80) {
        start++;
    }
    return buf.slice(start).toString("utf-8");
}
/**
 * Truncate a single line to max characters, adding [truncated] suffix.
 * Used for grep match lines.
 */
function truncateLine(line, maxChars) {
    if (maxChars === void 0) { maxChars = exports.GREP_MAX_LINE_LENGTH; }
    if (line.length <= maxChars) {
        return { text: line, wasTruncated: false };
    }
    return { text: "".concat(line.slice(0, maxChars), "... [truncated]"), wasTruncated: true };
}
