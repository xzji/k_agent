/**
 * Info Collection Handler
 *
 * Handles Phase 1: Context gathering through interactive questioning.
 * Manages the loop of asking questions and processing user responses.
 */

import type { Goal, GoalOrchestrator, ContextGatherer } from "../index.js";
import type { InputContext, HandlerResult } from "./types.js";
import { logUserInput, logSystemAction, logError } from "../utils/logger.js";

export class InfoCollectionHandler {
  constructor(
    private orchestrator: GoalOrchestrator,
    private contextGatherer: ContextGatherer
  ) {}

  async handle(
    goal: Goal,
    userResponse: string,
    ctx: InputContext
  ): Promise<HandlerResult> {
    await logUserInput(userResponse, {
      goalId: goal.id,
      phase: "collecting_info",
    });

    const state = this.orchestrator.getState(goal.id);
    if (!state || !state.interactiveTaskId) {
      return {
        action: "error",
        error: "No interactive task found for info collection",
      };
    }

    try {
      const result = await this.orchestrator.handleInfoCollectionResponse(
        goal.id,
        userResponse
      );

      if (result.hasEnoughInfo && result.canProceed) {
        // Information collection complete, proceed to planning phases
        return await this.proceedToPlanning(goal, ctx);
      }

      if (result.nextQuestions && result.nextQuestions.length > 0) {
        // More questions needed, stay in collecting_info phase
        const questionsText = result.nextQuestions
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join("\n");

        return {
          action: "handled",
          notification: {
            message: `🆘 Need more information: ${goal.title}\n\n${questionsText}`,
            type: "info" as const,
          },
        };
      }

      // No more questions but not enough info yet
      return {
        action: "handled",
        notification: {
          message: "✅ 收到！请等待下一个问题...",
          type: "info" as const,
        },
      };
    } catch (error) {
      await logError(
        error instanceof Error ? error : String(error),
        "error",
        goal.id,
        state.interactiveTaskId
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

  private async proceedToPlanning(
    goal: Goal,
    ctx: InputContext
  ): Promise<HandlerResult> {
    // Phase 2&3: Decompose sub-goals
    const subGoals = await this.orchestrator.decomposeSubGoals(goal.id);
    await logSystemAction("Sub-goals decomposed", {
      goalId: goal.id,
      subGoalCount: subGoals.length,
    });

    // Phase 4&5: Generate and review tasks (tasks are created as 'blocked')
    const { tasks, adjusted } = await this.orchestrator.generateAndReviewTasks(
      goal.id
    );
    await logSystemAction("Tasks generated and reviewed", {
      goalId: goal.id,
      taskCount: tasks.length,
      adjusted,
    });

    // Phase 6: Present plan and wait for confirmation
    // Tasks remain in 'blocked' state until user confirms the plan
    await this.orchestrator.presentPlanForConfirmation(goal.id);

    return {
      action: "handled",
      notification: {
        message:
          `✅ 信息收集完成，计划已生成！\n` +
          `📋 请查看上方的计划详情。\n` +
          `回复 "确认" 开始执行，或提出修改意见。`,
        type: "success" as const,
      },
    };
  }
}
