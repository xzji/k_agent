/**
 * Handler Types
 *
 * Common types for input handlers.
 */

import type { Task, TaskStatus } from "../types.js";

export interface InputContext {
  goalId: string;
  taskId?: string;
  phase: string;
  purpose?: string;
}

export interface HandlerResult {
  action: "handled" | "continue" | "error";
  error?: string;
  notification?: {
    message: string;
    type: "info" | "warning" | "error" | "success";
  };
}

export interface InteractionHandler {
  handle(
    goal: import("../types.js").Goal,
    userResponse: string,
    ctx: InputContext
  ): Promise<HandlerResult>;
}

/**
 * Find the active goal based on orchestration state priority
 */
export function findActiveGoal(
  goals: import("../types.js").Goal[],
  getState: (goalId: string) => import("../orchestrator/goal-orchestrator.js").OrchestrationState | undefined
): import("../types.js").Goal | undefined {
  // Priority: presenting_plan > executing > collecting_info > others
  const phasePriority = [
    "presenting_plan",
    "executing",
    "collecting_info",
    "decomposing",
    "generating_tasks",
    "reviewing_tasks",
    "monitoring",
    "reviewing",
    "idle",
  ];

  for (const phase of phasePriority) {
    const goal = goals.find((g) => {
      const state = getState(g.id);
      return state && state.phase === phase;
    });
    if (goal) return goal;
  }

  return undefined;
}
