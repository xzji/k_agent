"use strict";
/**
 * Goal-Driven Agent — Utility Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.extractJSON = extractJSON;
exports.parseJSONResponse = parseJSONResponse;
exports.chunk = chunk;
exports.formatTime = formatTime;
exports.sleep = sleep;
var node_crypto_1 = require("node:crypto");
/**
 * Generate a unique ID (12 character hex string)
 */
function generateId() {
    return (0, node_crypto_1.randomBytes)(6).toString("hex");
}
/**
 * Extract text content from an LLM response string.
 * Strips markdown code fences if present to get raw JSON.
 */
function extractJSON(text) {
    // Remove any leading/trailing whitespace
    var cleaned = text.trim();
    // Try to extract from markdown code fence (with or without language specifier)
    // This pattern handles: ```json\n{...}\n``` or ```\n{...}\n```
    // Also handles text before/after the code block
    var fenceMatch = cleaned.match(/```(?:json)?\s*?\n([\s\S]*?)\n```/);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }
    // Try alternative pattern - allow any text before the opening fence
    var fenceMatchWithPrefix = cleaned.match(/[\s\S]*?```(?:json)?\s*?\n([\s\S]*?)\n```/);
    if (fenceMatchWithPrefix) {
        return fenceMatchWithPrefix[1].trim();
    }
    // Try pattern without strict newline requirements
    var fenceMatchRelaxed = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatchRelaxed) {
        return fenceMatchRelaxed[1].trim();
    }
    // Handle comma-separated objects (LLM sometimes returns objects without array wrapper)
    // Pattern: { ... },\n{ ... },\n{ ... }
    // We check if the text starts with { and contains commas between balanced objects
    if (cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        // Check if there's a comma at the top level (outside nested braces)
        var braceCount = 0;
        var hasComma = false;
        for (var _i = 0, cleaned_1 = cleaned; _i < cleaned_1.length; _i++) {
            var char = cleaned_1[_i];
            if (char === '{')
                braceCount++;
            if (char === '}')
                braceCount--;
            if (braceCount === 0 && char === ',') {
                hasComma = true;
                break;
            }
        }
        if (hasComma) {
            // Try to wrap in brackets and parse to see if it's valid
            try {
                var wrapped = "[".concat(cleaned, "]");
                var test = JSON.parse(wrapped); // Test if it's valid
                return wrapped;
            }
            catch (e) {
                // Comma-separated wrap failed, continue to other patterns
            }
        }
    }
    // Fallback: find everything between first { and matching last }
    // This handles cases where there's text after the JSON
    var firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
        var braceCount = 0;
        var lastBrace = firstBrace;
        for (var i = firstBrace; i < cleaned.length; i++) {
            if (cleaned[i] === '{')
                braceCount++;
            if (cleaned[i] === '}')
                braceCount--;
            if (braceCount === 0) {
                lastBrace = i;
                break; // Found the matching closing brace
            }
        }
        if (lastBrace > firstBrace) {
            var candidate = cleaned.substring(firstBrace, lastBrace + 1);
            // Verify it's valid JSON
            try {
                var parsed = JSON.parse(candidate);
                // Only return if it's an object, not an array (we don't want to wrap objects in arrays)
                if (Array.isArray(parsed)) {
                    return candidate.trim();
                }
                return candidate.trim();
            }
            catch (err) {
                // Brace matching produced invalid JSON, continue to other patterns
            }
        }
    }
    // Fallback: find everything between first [ and matching last ]
    var firstBracket = cleaned.indexOf('[');
    if (firstBracket !== -1) {
        var bracketCount = 0;
        var lastBracket = firstBracket;
        for (var i = firstBracket; i < cleaned.length; i++) {
            if (cleaned[i] === '[')
                bracketCount++;
            if (cleaned[i] === ']')
                bracketCount--;
            if (bracketCount === 0) {
                lastBracket = i;
                break; // Found the matching closing bracket
            }
        }
        if (lastBracket > firstBracket) {
            var candidate = cleaned.substring(firstBracket, lastBracket + 1);
            // Verify it's valid JSON
            try {
                JSON.parse(candidate);
                return candidate.trim();
            }
            catch (_a) {
                // Bracket matching produced invalid JSON
            }
        }
    }
    // If all else fails, return the cleaned text
    return cleaned;
}
/**
 * Parse JSON from LLM response, with fallback
 */
function parseJSONResponse(text) {
    // Check for empty/undefined input
    if (!text || text.trim().length === 0) {
        throw new Error("Empty or undefined LLM response");
    }
    var cleaned = extractJSON(text);
    // Check if extraction produced empty result
    if (!cleaned || cleaned.trim().length === 0) {
        throw new Error("Could not extract valid JSON from LLM response");
    }
    try {
        var parsed = JSON.parse(cleaned);
        // Validate that we got a proper object/array, not null
        if (parsed === null || parsed === undefined) {
            throw new Error("JSON parsed as null/undefined");
        }
        return parsed;
    }
    catch (error) {
        // Provide better error message with sample of the problematic text
        var errorMessage = error instanceof Error ? error.message : String(error);
        var preview = cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
        throw new Error("".concat(errorMessage, "\nRaw preview: ").concat(preview));
    }
}
/**
 * Chunk an array into smaller arrays of specified size
 */
function chunk(arr, size) {
    var result = [];
    for (var i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
/**
 * Format a timestamp to human-readable string
 */
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}
/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
