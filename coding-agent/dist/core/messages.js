"use strict";
/**
 * Custom message types and transformers for the coding agent.
 *
 * Extends the base AgentMessage type with coding-agent specific message types,
 * and provides a transformer to convert them to LLM-compatible messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRANCH_SUMMARY_SUFFIX = exports.BRANCH_SUMMARY_PREFIX = exports.COMPACTION_SUMMARY_SUFFIX = exports.COMPACTION_SUMMARY_PREFIX = void 0;
exports.bashExecutionToText = bashExecutionToText;
exports.createBranchSummaryMessage = createBranchSummaryMessage;
exports.createCompactionSummaryMessage = createCompactionSummaryMessage;
exports.createCustomMessage = createCustomMessage;
exports.convertToLlm = convertToLlm;
exports.COMPACTION_SUMMARY_PREFIX = "The conversation history before this point was compacted into the following summary:\n\n<summary>\n";
exports.COMPACTION_SUMMARY_SUFFIX = "\n</summary>";
exports.BRANCH_SUMMARY_PREFIX = "The following is a summary of a branch that this conversation came back from:\n\n<summary>\n";
exports.BRANCH_SUMMARY_SUFFIX = "</summary>";
/**
 * Convert a BashExecutionMessage to user message text for LLM context.
 */
function bashExecutionToText(msg) {
    var text = "Ran `".concat(msg.command, "`\n");
    if (msg.output) {
        text += "```\n".concat(msg.output, "\n```");
    }
    else {
        text += "(no output)";
    }
    if (msg.cancelled) {
        text += "\n\n(command cancelled)";
    }
    else if (msg.exitCode !== null && msg.exitCode !== undefined && msg.exitCode !== 0) {
        text += "\n\nCommand exited with code ".concat(msg.exitCode);
    }
    if (msg.truncated && msg.fullOutputPath) {
        text += "\n\n[Output truncated. Full output: ".concat(msg.fullOutputPath, "]");
    }
    return text;
}
function createBranchSummaryMessage(summary, fromId, timestamp) {
    return {
        role: "branchSummary",
        summary: summary,
        fromId: fromId,
        timestamp: new Date(timestamp).getTime(),
    };
}
function createCompactionSummaryMessage(summary, tokensBefore, timestamp) {
    return {
        role: "compactionSummary",
        summary: summary,
        tokensBefore: tokensBefore,
        timestamp: new Date(timestamp).getTime(),
    };
}
/** Convert CustomMessageEntry to AgentMessage format */
function createCustomMessage(customType, content, display, details, timestamp) {
    return {
        role: "custom",
        customType: customType,
        content: content,
        display: display,
        details: details,
        timestamp: new Date(timestamp).getTime(),
    };
}
/**
 * Transform AgentMessages (including custom types) to LLM-compatible Messages.
 *
 * This is used by:
 * - Agent's transormToLlm option (for prompt calls and queued messages)
 * - Compaction's generateSummary (for summarization)
 * - Custom extensions and tools
 */
function convertToLlm(messages) {
    return messages
        .map(function (m) {
        switch (m.role) {
            case "bashExecution":
                // Skip messages excluded from context (!! prefix)
                if (m.excludeFromContext) {
                    return undefined;
                }
                return {
                    role: "user",
                    content: [{ type: "text", text: bashExecutionToText(m) }],
                    timestamp: m.timestamp,
                };
            case "custom": {
                var content = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
                return {
                    role: "user",
                    content: content,
                    timestamp: m.timestamp,
                };
            }
            case "branchSummary":
                return {
                    role: "user",
                    content: [{ type: "text", text: exports.BRANCH_SUMMARY_PREFIX + m.summary + exports.BRANCH_SUMMARY_SUFFIX }],
                    timestamp: m.timestamp,
                };
            case "compactionSummary":
                return {
                    role: "user",
                    content: [
                        { type: "text", text: exports.COMPACTION_SUMMARY_PREFIX + m.summary + exports.COMPACTION_SUMMARY_SUFFIX },
                    ],
                    timestamp: m.timestamp,
                };
            case "user":
            case "assistant":
            case "toolResult":
                return m;
            default:
                // biome-ignore lint/correctness/noSwitchDeclarations: fine
                var _exhaustiveCheck = m;
                return undefined;
        }
    })
        .filter(function (m) { return m !== undefined; });
}
