/**
 * Plan Confirmation Handler
 *
 * Handles Phase 6: Plan presentation and user confirmation.
 * Processes user feedback on generated plans.
 */

import type { Goal, GoalOrchestrator } from "../index.js";
import type { InputContext, HandlerResult } from "./types.js";
import { logUserInput, logError } from "../utils/logger.js";

export class PlanConfirmationHandler {
  constructor(private orchestrator: GoalOrchestrator) {}

  async handle(
    goal: Goal,
    userResponse: string,
    ctx: InputContext
  ): Promise<HandlerResult> {
    await logUserInput(userResponse, {
      goalId: goal.id,
      phase: "presenting_plan",
    });

    try {
      const response = userResponse.toLowerCase().trim();

      // Check for confirmation keywords
      if (
        [
          "yes",
          "确认",
          "确定",
          "ok",
          "好的",
          "可以",
          "没问题",
          "同意",
          "执行",
          "开始",
        ].some((k) => response.includes(k))
      ) {
        // Confirm the plan first
        await this.orchestrator.confirmPlan(goal.id);

        // Activate tasks before starting execution
        await this.orchestrator.activateTasksAfterConfirmation(goal.id);

        await this.orchestrator.startExecution(goal.id);

        return {
          action: "handled",
          notification: {
            message: "✅ 计划已确认，开始执行...",
            type: "success" as const,
          },
        };
      }

      // Check for modification keywords
      if (
        ["no", "不", "修改", "调整", "改", "重", "再", "需要", "换个"].some(
          (k) => response.includes(k)
        )
      ) {
        await this.orchestrator.handlePlanModification(goal.id, userResponse);

        return {
          action: "handled",
          notification: {
            message: "📝 收到修改意见，正在调整计划...",
            type: "info" as const,
          },
        };
      }

      // Default: assume it's feedback
      return {
        action: "handled",
        notification: {
          message: "⏳ 正在处理您的反馈...",
          type: "info" as const,
        },
      };
    } catch (error) {
      await logError(
        error instanceof Error ? error : String(error),
        "error",
        goal.id
      );

      return {
        action: "error",
        error: error instanceof Error ? error.message : String(error),
        notification: {
          message: `❌ 处理确认时出错: ${error instanceof Error ? error.message : String(error)}`,
          type: "error" as const,
        },
      };
    }
  }
}
