"use strict";
/**
 * Tool wrappers for extension-registered tools.
 *
 * These wrappers only adapt tool execution so extension tools receive the runner context.
 * Tool call and tool result interception is handled by AgentSession via agent-core hooks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapRegisteredTool = wrapRegisteredTool;
exports.wrapRegisteredTools = wrapRegisteredTools;
/**
 * Wrap a RegisteredTool into an AgentTool.
 * Uses the runner's createContext() for consistent context across tools and event handlers.
 */
function wrapRegisteredTool(registeredTool, runner) {
    var definition = registeredTool.definition;
    return {
        name: definition.name,
        label: definition.label,
        description: definition.description,
        parameters: definition.parameters,
        execute: function (toolCallId, params, signal, onUpdate) {
            return definition.execute(toolCallId, params, signal, onUpdate, runner.createContext());
        },
    };
}
/**
 * Wrap all registered tools into AgentTools.
 * Uses the runner's createContext() for consistent context across tools and event handlers.
 */
function wrapRegisteredTools(registeredTools, runner) {
    return registeredTools.map(function (rt) { return wrapRegisteredTool(rt, runner); });
}
