/**
 * Input Handlers
 *
 * Unified input handling architecture for Goal-Driven Agent.
 * Each handler is responsible for a specific phase of the workflow.
 */

export { InfoCollectionHandler } from "./info-collection-handler.js";
export { PlanConfirmationHandler } from "./plan-confirmation-handler.js";
export { ExecutionHandler } from "./execution-handler.js";
export {
  findActiveGoal,
  type InputContext,
  type HandlerResult,
  type InteractionHandler,
} from "./types.js";
