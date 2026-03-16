/**
 * Execution Handler
 *
 * Handles user input during task execution.
 * Routes responses to waiting tasks and manages execution flow.
 */

import type { Goal, UnifiedTaskScheduler, TaskStore } from "../index.js";
import type { InputContext, HandlerResult } from "./types.js";
import { logUserInput, logSystemAction, logError } from "../utils/logger.js";

export class ExecutionHandler {
  constructor(
    private scheduler: UnifiedTaskScheduler,
    private taskStore: TaskStore
  ) {}

  async handle(
    goal: Goal,
    userResponse: string,
    ctx: InputContext
  ): Promise<HandlerResult> {
    // Find the task waiting for user input in this goal
    const tasks = await this.taskStore.getTasksByGoal(goal.id);
    const waitingTask = tasks.find((t) => t.status === "waiting_user");

    if (!waitingTask) {
      // No task is waiting for input, let pi-agent handle it
      return { action: "continue" };
    }

    await logUserInput(userResponse, {
      goalId: goal.id,
      taskId: waitingTask.id,
      phase: "executing",
    });

    try {
      await this.scheduler.handleUserResponse(waitingTask.id, userResponse);

      await logSystemAction("User response handled for waiting task", {
        goalId: goal.id,
        taskId: waitingTask.id,
      });

      return {
        action: "handled",
        notification: {
          message: "✅ 收到！继续执行任务...",
          type: "info" as const,
        },
      };
    } catch (error) {
      await logError(
        error instanceof Error ? error : String(error),
        "error",
        goal.id,
        waitingTask.id
      );

      return {
        action: "error",
        error: error instanceof Error ? error.message : String(error),
        notification: {
          message: `❌ 处理回复时出错: ${error instanceof Error ? error.message : String(error)}`,
          type: "error" as const,
        },
      };
    }
  }
}
