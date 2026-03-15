"use strict";
/**
 * Branch summarization for tree navigation.
 *
 * When navigating to a different point in the session tree, this generates
 * a summary of the branch being left so context isn't lost.
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
exports.collectEntriesForBranchSummary = collectEntriesForBranchSummary;
exports.prepareBranchEntries = prepareBranchEntries;
exports.generateBranchSummary = generateBranchSummary;
var pi_ai_1 = require("@mariozechner/pi-ai");
var messages_js_1 = require("../messages.js");
var compaction_js_1 = require("./compaction.js");
var utils_js_1 = require("./utils.js");
// ============================================================================
// Entry Collection
// ============================================================================
/**
 * Collect entries that should be summarized when navigating from one position to another.
 *
 * Walks from oldLeafId back to the common ancestor with targetId, collecting entries
 * along the way. Does NOT stop at compaction boundaries - those are included and their
 * summaries become context.
 *
 * @param session - Session manager (read-only access)
 * @param oldLeafId - Current position (where we're navigating from)
 * @param targetId - Target position (where we're navigating to)
 * @returns Entries to summarize and the common ancestor
 */
function collectEntriesForBranchSummary(session, oldLeafId, targetId) {
    // If no old position, nothing to summarize
    if (!oldLeafId) {
        return { entries: [], commonAncestorId: null };
    }
    // Find common ancestor (deepest node that's on both paths)
    var oldPath = new Set(session.getBranch(oldLeafId).map(function (e) { return e.id; }));
    var targetPath = session.getBranch(targetId);
    // targetPath is root-first, so iterate backwards to find deepest common ancestor
    var commonAncestorId = null;
    for (var i = targetPath.length - 1; i >= 0; i--) {
        if (oldPath.has(targetPath[i].id)) {
            commonAncestorId = targetPath[i].id;
            break;
        }
    }
    // Collect entries from old leaf back to common ancestor
    var entries = [];
    var current = oldLeafId;
    while (current && current !== commonAncestorId) {
        var entry = session.getEntry(current);
        if (!entry)
            break;
        entries.push(entry);
        current = entry.parentId;
    }
    // Reverse to get chronological order
    entries.reverse();
    return { entries: entries, commonAncestorId: commonAncestorId };
}
// ============================================================================
// Entry to Message Conversion
// ============================================================================
/**
 * Extract AgentMessage from a session entry.
 * Similar to getMessageFromEntry in compaction.ts but also handles compaction entries.
 */
function getMessageFromEntry(entry) {
    switch (entry.type) {
        case "message":
            // Skip tool results - context is in assistant's tool call
            if (entry.message.role === "toolResult")
                return undefined;
            return entry.message;
        case "custom_message":
            return (0, messages_js_1.createCustomMessage)(entry.customType, entry.content, entry.display, entry.details, entry.timestamp);
        case "branch_summary":
            return (0, messages_js_1.createBranchSummaryMessage)(entry.summary, entry.fromId, entry.timestamp);
        case "compaction":
            return (0, messages_js_1.createCompactionSummaryMessage)(entry.summary, entry.tokensBefore, entry.timestamp);
        // These don't contribute to conversation content
        case "thinking_level_change":
        case "model_change":
        case "custom":
        case "label":
            return undefined;
    }
}
/**
 * Prepare entries for summarization with token budget.
 *
 * Walks entries from NEWEST to OLDEST, adding messages until we hit the token budget.
 * This ensures we keep the most recent context when the branch is too long.
 *
 * Also collects file operations from:
 * - Tool calls in assistant messages
 * - Existing branch_summary entries' details (for cumulative tracking)
 *
 * @param entries - Entries in chronological order
 * @param tokenBudget - Maximum tokens to include (0 = no limit)
 */
function prepareBranchEntries(entries, tokenBudget) {
    if (tokenBudget === void 0) { tokenBudget = 0; }
    var messages = [];
    var fileOps = (0, utils_js_1.createFileOps)();
    var totalTokens = 0;
    // First pass: collect file ops from ALL entries (even if they don't fit in token budget)
    // This ensures we capture cumulative file tracking from nested branch summaries
    // Only extract from pi-generated summaries (fromHook !== true), not extension-generated ones
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (entry.type === "branch_summary" && !entry.fromHook && entry.details) {
            var details = entry.details;
            if (Array.isArray(details.readFiles)) {
                for (var _a = 0, _b = details.readFiles; _a < _b.length; _a++) {
                    var f = _b[_a];
                    fileOps.read.add(f);
                }
            }
            if (Array.isArray(details.modifiedFiles)) {
                // Modified files go into both edited and written for proper deduplication
                for (var _c = 0, _d = details.modifiedFiles; _c < _d.length; _c++) {
                    var f = _d[_c];
                    fileOps.edited.add(f);
                }
            }
        }
    }
    // Second pass: walk from newest to oldest, adding messages until token budget
    for (var i = entries.length - 1; i >= 0; i--) {
        var entry = entries[i];
        var message = getMessageFromEntry(entry);
        if (!message)
            continue;
        // Extract file ops from assistant messages (tool calls)
        (0, utils_js_1.extractFileOpsFromMessage)(message, fileOps);
        var tokens = (0, compaction_js_1.estimateTokens)(message);
        // Check budget before adding
        if (tokenBudget > 0 && totalTokens + tokens > tokenBudget) {
            // If this is a summary entry, try to fit it anyway as it's important context
            if (entry.type === "compaction" || entry.type === "branch_summary") {
                if (totalTokens < tokenBudget * 0.9) {
                    messages.unshift(message);
                    totalTokens += tokens;
                }
            }
            // Stop - we've hit the budget
            break;
        }
        messages.unshift(message);
        totalTokens += tokens;
    }
    return { messages: messages, fileOps: fileOps, totalTokens: totalTokens };
}
// ============================================================================
// Summary Generation
// ============================================================================
var BRANCH_SUMMARY_PREAMBLE = "The user explored a different conversation branch before returning here.\nSummary of that exploration:\n\n";
var BRANCH_SUMMARY_PROMPT = "Create a structured summary of this conversation branch for context when returning later.\n\nUse this EXACT format:\n\n## Goal\n[What was the user trying to accomplish in this branch?]\n\n## Constraints & Preferences\n- [Any constraints, preferences, or requirements mentioned]\n- [Or \"(none)\" if none were mentioned]\n\n## Progress\n### Done\n- [x] [Completed tasks/changes]\n\n### In Progress\n- [ ] [Work that was started but not finished]\n\n### Blocked\n- [Issues preventing progress, if any]\n\n## Key Decisions\n- **[Decision]**: [Brief rationale]\n\n## Next Steps\n1. [What should happen next to continue this work]\n\nKeep each section concise. Preserve exact file paths, function names, and error messages.";
/**
 * Generate a summary of abandoned branch entries.
 *
 * @param entries - Session entries to summarize (chronological order)
 * @param options - Generation options
 */
function generateBranchSummary(entries, options) {
    return __awaiter(this, void 0, void 0, function () {
        var model, apiKey, signal, customInstructions, replaceInstructions, _a, reserveTokens, contextWindow, tokenBudget, _b, messages, fileOps, llmMessages, conversationText, instructions, promptText, summarizationMessages, response, summary, _c, readFiles, modifiedFiles;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    model = options.model, apiKey = options.apiKey, signal = options.signal, customInstructions = options.customInstructions, replaceInstructions = options.replaceInstructions, _a = options.reserveTokens, reserveTokens = _a === void 0 ? 16384 : _a;
                    contextWindow = model.contextWindow || 128000;
                    tokenBudget = contextWindow - reserveTokens;
                    _b = prepareBranchEntries(entries, tokenBudget), messages = _b.messages, fileOps = _b.fileOps;
                    if (messages.length === 0) {
                        return [2 /*return*/, { summary: "No content to summarize" }];
                    }
                    llmMessages = (0, messages_js_1.convertToLlm)(messages);
                    conversationText = (0, utils_js_1.serializeConversation)(llmMessages);
                    if (replaceInstructions && customInstructions) {
                        instructions = customInstructions;
                    }
                    else if (customInstructions) {
                        instructions = "".concat(BRANCH_SUMMARY_PROMPT, "\n\nAdditional focus: ").concat(customInstructions);
                    }
                    else {
                        instructions = BRANCH_SUMMARY_PROMPT;
                    }
                    promptText = "<conversation>\n".concat(conversationText, "\n</conversation>\n\n").concat(instructions);
                    summarizationMessages = [
                        {
                            role: "user",
                            content: [{ type: "text", text: promptText }],
                            timestamp: Date.now(),
                        },
                    ];
                    return [4 /*yield*/, (0, pi_ai_1.completeSimple)(model, { systemPrompt: utils_js_1.SUMMARIZATION_SYSTEM_PROMPT, messages: summarizationMessages }, { apiKey: apiKey, signal: signal, maxTokens: 2048 })];
                case 1:
                    response = _d.sent();
                    // Check if aborted or errored
                    if (response.stopReason === "aborted") {
                        return [2 /*return*/, { aborted: true }];
                    }
                    if (response.stopReason === "error") {
                        return [2 /*return*/, { error: response.errorMessage || "Summarization failed" }];
                    }
                    summary = response.content
                        .filter(function (c) { return c.type === "text"; })
                        .map(function (c) { return c.text; })
                        .join("\n");
                    // Prepend preamble to provide context about the branch summary
                    summary = BRANCH_SUMMARY_PREAMBLE + summary;
                    _c = (0, utils_js_1.computeFileLists)(fileOps), readFiles = _c.readFiles, modifiedFiles = _c.modifiedFiles;
                    summary += (0, utils_js_1.formatFileOperations)(readFiles, modifiedFiles);
                    return [2 /*return*/, {
                            summary: summary || "No summary generated",
                            readFiles: readFiles,
                            modifiedFiles: modifiedFiles,
                        }];
            }
        });
    });
}
