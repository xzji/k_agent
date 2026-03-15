"use strict";
/**
 * Shared utilities for compaction and branch summarization.
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
exports.SUMMARIZATION_SYSTEM_PROMPT = void 0;
exports.createFileOps = createFileOps;
exports.extractFileOpsFromMessage = extractFileOpsFromMessage;
exports.computeFileLists = computeFileLists;
exports.formatFileOperations = formatFileOperations;
exports.serializeConversation = serializeConversation;
function createFileOps() {
    return {
        read: new Set(),
        written: new Set(),
        edited: new Set(),
    };
}
/**
 * Extract file operations from tool calls in an assistant message.
 */
function extractFileOpsFromMessage(message, fileOps) {
    if (message.role !== "assistant")
        return;
    if (!("content" in message) || !Array.isArray(message.content))
        return;
    for (var _i = 0, _a = message.content; _i < _a.length; _i++) {
        var block = _a[_i];
        if (typeof block !== "object" || block === null)
            continue;
        if (!("type" in block) || block.type !== "toolCall")
            continue;
        if (!("arguments" in block) || !("name" in block))
            continue;
        var args = block.arguments;
        if (!args)
            continue;
        var path = typeof args.path === "string" ? args.path : undefined;
        if (!path)
            continue;
        switch (block.name) {
            case "read":
                fileOps.read.add(path);
                break;
            case "write":
                fileOps.written.add(path);
                break;
            case "edit":
                fileOps.edited.add(path);
                break;
        }
    }
}
/**
 * Compute final file lists from file operations.
 * Returns readFiles (files only read, not modified) and modifiedFiles.
 */
function computeFileLists(fileOps) {
    var modified = new Set(__spreadArray(__spreadArray([], fileOps.edited, true), fileOps.written, true));
    var readOnly = __spreadArray([], fileOps.read, true).filter(function (f) { return !modified.has(f); }).sort();
    var modifiedFiles = __spreadArray([], modified, true).sort();
    return { readFiles: readOnly, modifiedFiles: modifiedFiles };
}
/**
 * Format file operations as XML tags for summary.
 */
function formatFileOperations(readFiles, modifiedFiles) {
    var sections = [];
    if (readFiles.length > 0) {
        sections.push("<read-files>\n".concat(readFiles.join("\n"), "\n</read-files>"));
    }
    if (modifiedFiles.length > 0) {
        sections.push("<modified-files>\n".concat(modifiedFiles.join("\n"), "\n</modified-files>"));
    }
    if (sections.length === 0)
        return "";
    return "\n\n".concat(sections.join("\n\n"));
}
// ============================================================================
// Message Serialization
// ============================================================================
/** Maximum characters for a tool result in serialized summaries. */
var TOOL_RESULT_MAX_CHARS = 2000;
/**
 * Truncate text to a maximum character length for summarization.
 * Keeps the beginning and appends a truncation marker.
 */
function truncateForSummary(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    var truncatedChars = text.length - maxChars;
    return "".concat(text.slice(0, maxChars), "\n\n[... ").concat(truncatedChars, " more characters truncated]");
}
/**
 * Serialize LLM messages to text for summarization.
 * This prevents the model from treating it as a conversation to continue.
 * Call convertToLlm() first to handle custom message types.
 *
 * Tool results are truncated to keep the summarization request within
 * reasonable token budgets. Full content is not needed for summarization.
 */
function serializeConversation(messages) {
    var parts = [];
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var msg = messages_1[_i];
        if (msg.role === "user") {
            var content = typeof msg.content === "string"
                ? msg.content
                : msg.content
                    .filter(function (c) { return c.type === "text"; })
                    .map(function (c) { return c.text; })
                    .join("");
            if (content)
                parts.push("[User]: ".concat(content));
        }
        else if (msg.role === "assistant") {
            var textParts = [];
            var thinkingParts = [];
            var toolCalls = [];
            for (var _a = 0, _b = msg.content; _a < _b.length; _a++) {
                var block = _b[_a];
                if (block.type === "text") {
                    textParts.push(block.text);
                }
                else if (block.type === "thinking") {
                    thinkingParts.push(block.thinking);
                }
                else if (block.type === "toolCall") {
                    var args = block.arguments;
                    var argsStr = Object.entries(args)
                        .map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return "".concat(k, "=").concat(JSON.stringify(v));
                    })
                        .join(", ");
                    toolCalls.push("".concat(block.name, "(").concat(argsStr, ")"));
                }
            }
            if (thinkingParts.length > 0) {
                parts.push("[Assistant thinking]: ".concat(thinkingParts.join("\n")));
            }
            if (textParts.length > 0) {
                parts.push("[Assistant]: ".concat(textParts.join("\n")));
            }
            if (toolCalls.length > 0) {
                parts.push("[Assistant tool calls]: ".concat(toolCalls.join("; ")));
            }
        }
        else if (msg.role === "toolResult") {
            var content = msg.content
                .filter(function (c) { return c.type === "text"; })
                .map(function (c) { return c.text; })
                .join("");
            if (content) {
                parts.push("[Tool result]: ".concat(truncateForSummary(content, TOOL_RESULT_MAX_CHARS)));
            }
        }
    }
    return parts.join("\n\n");
}
// ============================================================================
// Summarization System Prompt
// ============================================================================
exports.SUMMARIZATION_SYSTEM_PROMPT = "You are a context summarization assistant. Your task is to read a conversation between a user and an AI coding assistant, then produce a structured summary following the exact format specified.\n\nDo NOT continue the conversation. Do NOT respond to any questions in the conversation. ONLY output the structured summary.";
