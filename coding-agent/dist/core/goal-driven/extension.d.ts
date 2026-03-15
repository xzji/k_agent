/**
 * Goal-Driven Agent Extension — Entry Point
 *
 * Integrates the goal-driven agent into the pi coding-agent via the Extension API.
 *
 * Registers:
 * - /goal command (add, list, status, tree, knowledge, stop)
 * - Event listeners for idle detection (input, agent_start, agent_end)
 * - Model sync on model_select event
 * - Notification delivery on idle
 * - Custom message renderer for goal notifications
 *
 * Key design choices (from implementation review):
 * - Uses pi.on("input") instead of non-existent "user_input" event
 * - Uses pi.on("model_select") instead of "model_change"
 * - Uses pi.sendMessage() for notification output (not direct TUI access)
 * - Uses pi.registerMessageRenderer() for custom notification rendering
 */
import type { ExtensionFactory } from "../extensions/types.js";
declare const goalDrivenExtension: ExtensionFactory;
export default goalDrivenExtension;
//# sourceMappingURL=extension.d.ts.map