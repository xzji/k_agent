/**
 * SubGoal Planner
 *
 * 负责子目标的规划、拆解、Review和调整
 * - 基于Goal和用户上下文拆解SubGoal
 * - 管理SubGoal之间的依赖关系
 * - 评估SubGoal完成度
 * - 在Review时调整SubGoal划分
 */

import {
  type SubGoal,
  type SubGoalCreateData,
  type SubGoalReviewResult,
  type Goal,
  type ISubGoalStore,
  type IGoalStore,
} from '../types';
import { logError } from '../utils/logger';

/**
 * LLM Channel interface (minimal version)
 */
interface LLMChannel {
  complete(prompt: string, options?: Record<string, unknown>): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }>;
}

/**
 * Decomposition prompt template
 */
const DECOMPOSE_PROMPT = `你是一位专业的目标规划专家。请将以下目标拆解为合理的子目标阶段。

目标: {{goalTitle}}
描述: {{goalDescription}}
用户背景信息:
{{userContext}}

要求:
1. 每个子目标应该是可独立完成的阶段
2. 子目标之间可能存在依赖关系（如必须先完成A才能做B）
3. 每个子目标应该有明确的完成标准
4. 子目标数量建议3-7个，根据目标复杂度调整

请按JSON格式返回：
{
  "subGoals": [
    {
      "name": "子目标名称",
      "description": "详细描述",
      "priority": "high|medium|low",
      "weight": 0.3,
      "dependencies": [],
      "estimatedDuration": 8,
      "successCriteria": [
        {"description": "完成标准1", "type": "deliverable"},
        {"description": "完成标准2", "type": "condition"}
      ]
    }
  ],
  "reasoning": "拆解理由说明"
}`;

/**
 * Review prompt template
 */
const REVIEW_PROMPT = `请Review以下子目标规划是否合理：

目标: {{goalTitle}}

当前子目标:
{{subGoalsJson}}

任务执行情况:
{{taskSummary}}

请评估：
1. 子目标划分是否合理？是否需要拆分、合并或重新排序？
2. 依赖关系是否正确？
3. 是否有遗漏的关键阶段？

请按JSON格式返回评估结果：
{
  "reviewResults": [
    {
      "subGoalId": "sg-xxx",
      "status": "valid|needs_split|needs_merge|needs_reorder",
      "reasoning": "评估理由",
      "suggestions": ["建议1", "建议2"]
    }
  ],
  "requiresUserConfirmation": true|false
}`;

/**
 * SubGoal Planner
 */
export class SubGoalPlanner {
  constructor(
    private goalStore: IGoalStore,
    private subGoalStore: ISubGoalStore,
    private llm: LLMChannel
  ) {}

  /**
   * Decompose goal into sub-goals
   */
  async decomposeSubGoals(
    goalId: string,
    userContext: Record<string, unknown>
  ): Promise<SubGoal[]> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Build decomposition prompt
    const prompt = DECOMPOSE_PROMPT
      .replace('{{goalTitle}}', goal.title)
      .replace('{{goalDescription}}', goal.description || '')
      .replace('{{userContext}}', JSON.stringify(userContext, null, 2));

    // Call LLM for decomposition
    const response = await this.llm.complete(prompt, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let decomposition: {
      subGoals: Array<{
        name: string;
        description: string;
        priority: string;
        weight: number;
        dependencies: string[];
        estimatedDuration?: number;
        successCriteria: Array<{ description: string; type: string }>;
      }>;
      reasoning: string;
    };

    try {
      decomposition = JSON.parse(response.content);
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'subgoal_decomposition', goal.id);
      // Fallback: create a simple default sub-goal
      return this.createDefaultSubGoals(goal);
    }

    // Create sub-goals
    const createdSubGoals: SubGoal[] = [];
    const tempIdMap = new Map<string, string>(); // Map temp IDs to real IDs

    // First pass: create all sub-goals with empty dependencies
    for (let i = 0; i < decomposition.subGoals.length; i++) {
      const sgData = decomposition.subGoals[i];
      const tempId = `temp-${i}`;

      const subGoalData: SubGoalCreateData = {
        goalId: goal.id,
        name: sgData.name,
        description: sgData.description || '',
        priority: this.validatePriority(sgData.priority),
        status: i === 0 ? 'active' : 'pending', // First one is active
        weight: sgData.weight || 1 / decomposition.subGoals.length,
        dependencies: [], // Will be updated in second pass
        estimatedDuration: sgData.estimatedDuration,
        taskIds: [],
        successCriteria: sgData.successCriteria.map((sc) => ({
          id: `sc-${generateId().slice(0, 8)}`,
          description: sc.description,
          type: sc.type as 'milestone' | 'deliverable' | 'condition',
          completed: false,
        })),
      };

      const subGoal = await this.subGoalStore.createSubGoal(subGoalData);
      createdSubGoals.push(subGoal);
      tempIdMap.set(tempId, subGoal.id);
    }

    // Second pass: update dependencies using real IDs
    for (let i = 0; i < decomposition.subGoals.length; i++) {
      const sgData = decomposition.subGoals[i];
      const subGoal = createdSubGoals[i];

      if (sgData.dependencies && sgData.dependencies.length > 0) {
        // Map temp dependency IDs to real IDs
        const realDeps = sgData.dependencies
          .map((depId) => {
            // Handle both temp IDs and name-based references
            const index = parseInt(depId.replace('temp-', ''));
            if (!isNaN(index) && index < createdSubGoals.length) {
              return createdSubGoals[index].id;
            }
            return tempIdMap.get(depId);
          })
          .filter((id): id is string => !!id);

        if (realDeps.length > 0) {
          await this.subGoalStore.updateSubGoal(subGoal.id, {
            dependencies: realDeps,
          });
          subGoal.dependencies = realDeps;
        }
      }
    }

    // Update goal with sub-goal IDs
    await this.goalStore.updateGoal(goalId, {
      subGoals: createdSubGoals.map((sg) => sg.id),
    });

    return createdSubGoals;
  }

  /**
   * Create default sub-goals as fallback
   */
  private async createDefaultSubGoals(goal: Goal): Promise<SubGoal[]> {
    const defaults: SubGoalCreateData[] = [
      {
        goalId: goal.id,
        name: '信息收集与调研',
        description: '收集必要信息，了解目标背景',
        priority: 'high',
        status: 'active',
        weight: 0.3,
        dependencies: [],
        taskIds: [],
        successCriteria: [
          {
            id: `sc-${generateId().slice(0, 8)}`,
            description: '完成信息收集',
            type: 'deliverable',
            completed: false,
          },
        ],
      },
      {
        goalId: goal.id,
        name: '方案制定',
        description: '基于收集的信息制定行动方案',
        priority: 'high',
        status: 'pending',
        weight: 0.4,
        dependencies: [], // Will be updated
        taskIds: [],
        successCriteria: [
          {
            id: `sc-${generateId().slice(0, 8)}`,
            description: '完成方案制定',
            type: 'deliverable',
            completed: false,
          },
        ],
      },
      {
        goalId: goal.id,
        name: '执行与完成',
        description: '执行方案并完成目标',
        priority: 'high',
        status: 'pending',
        weight: 0.3,
        dependencies: [], // Will be updated
        taskIds: [],
        successCriteria: [
          {
            id: `sc-${generateId().slice(0, 8)}`,
            description: '完成目标',
            type: 'condition',
            completed: false,
          },
        ],
      },
    ];

    const created: SubGoal[] = [];
    for (const data of defaults) {
      const sg = await this.subGoalStore.createSubGoal(data);
      created.push(sg);
    }

    // Update dependencies (second depends on first, third on second)
    await this.subGoalStore.updateSubGoal(created[1].id, {
      dependencies: [created[0].id],
    });
    await this.subGoalStore.updateSubGoal(created[2].id, {
      dependencies: [created[1].id],
    });
    created[1].dependencies = [created[0].id];
    created[2].dependencies = [created[1].id];

    await this.goalStore.updateGoal(goal.id, {
      subGoals: created.map((sg) => sg.id),
    });

    return created;
  }

  /**
   * Review sub-goals and suggest adjustments
   */
  async reviewSubGoals(
    goalId: string,
    taskStore?: { getTasksByGoal: (goalId: string) => Promise<Array<{ subGoalId?: string; status: string }>> }
  ): Promise<{
    reviews: SubGoalReviewResult[];
    requiresUserConfirmation: boolean;
  }> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
    if (subGoals.length === 0) {
      return { reviews: [], requiresUserConfirmation: false };
    }

    // Get task summary if task store provided
    let taskSummary = '暂无任务执行数据';
    if (taskStore) {
      const tasks = await taskStore.getTasksByGoal(goalId);
      const completedCount = tasks.filter((t) => t.status === 'completed').length;
      taskSummary = `总任务数: ${tasks.length}, 已完成: ${completedCount}`;
    }

    // Build review prompt
    const prompt = REVIEW_PROMPT
      .replace('{{goalTitle}}', goal.title)
      .replace('{{subGoalsJson}}', JSON.stringify(subGoals, null, 2))
      .replace('{{taskSummary}}', taskSummary);

    // Call LLM for review
    const response = await this.llm.complete(prompt, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let reviewData: {
      reviewResults: Array<{
        subGoalId: string;
        status: string;
        reasoning: string;
        suggestions?: string[];
      }>;
      requiresUserConfirmation: boolean;
    };

    try {
      reviewData = JSON.parse(response.content);
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'subgoal_review', goalId);
      return { reviews: [], requiresUserConfirmation: false };
    }

    const reviews: SubGoalReviewResult[] = reviewData.reviewResults.map((r) => ({
      subGoalId: r.subGoalId,
      status: r.status as SubGoalReviewResult['status'],
      reasoning: r.reasoning,
      suggestions: r.suggestions,
    }));

    return {
      reviews,
      requiresUserConfirmation: reviewData.requiresUserConfirmation,
    };
  }

  /**
   * Replan sub-goals based on user feedback
   */
  async replanSubGoals(
    goalId: string,
    feedback: string,
    userContext: Record<string, unknown>
  ): Promise<SubGoal[]> {
    // Delete existing sub-goals
    const existingSubGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
    for (const sg of existingSubGoals) {
      await this.subGoalStore.deleteSubGoal(sg.id);
    }

    // Clear sub-goal IDs from goal
    await this.goalStore.updateGoal(goalId, { subGoals: [] });

    // Re-decompose with feedback context
    const enrichedContext = {
      ...userContext,
      replanFeedback: feedback,
      previousSubGoalCount: existingSubGoals.length,
    };

    return this.decomposeSubGoals(goalId, enrichedContext);
  }

  /**
   * Check if a sub-goal can be activated
   */
  async canActivateSubGoal(subGoalId: string): Promise<{
    canActivate: boolean;
    blockingSubGoals: SubGoal[];
  }> {
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const check = await this.subGoalStore.checkDependencies(subGoalId);

    if (check.satisfied) {
      return { canActivate: true, blockingSubGoals: [] };
    }

    const blockingSubGoals: SubGoal[] = [];
    for (const blockingId of check.blockingSubGoalIds) {
      const sg = await this.subGoalStore.getSubGoal(blockingId);
      if (sg) blockingSubGoals.push(sg);
    }

    return { canActivate: false, blockingSubGoals };
  }

  /**
   * Update sub-goal status based on task completion
   */
  async updateSubGoalStatusFromTasks(subGoalId: string): Promise<SubGoal> {
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    // Check if all success criteria are met
    const allCriteriaMet = subGoal.successCriteria.every((sc) => sc.completed);

    if (allCriteriaMet && subGoal.status !== 'completed') {
      return this.subGoalStore.updateSubGoal(subGoalId, {
        status: 'completed',
        completedAt: now(),
      });
    }

    return subGoal;
  }

  /**
   * Validate priority string
   */
  private validatePriority(priority: string): 'critical' | 'high' | 'medium' | 'low' | 'background' {
    const valid = ['critical', 'high', 'medium', 'low', 'background'];
    if (valid.includes(priority)) {
      return priority as 'critical' | 'high' | 'medium' | 'low' | 'background';
    }
    return 'medium';
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current timestamp
 */
function now(): number {
  return Date.now();
}
