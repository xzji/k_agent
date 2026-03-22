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
import { parseJSONFromLLM } from '../utils';
import type { UILogger } from '../runtime/ui-logger.js';

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
const DECOMPOSE_PROMPT = `# Role
你是一位资深目标规划与战略拆解专家，擅长运用 MECE 原则和逆向推演法，将复杂目标拆解为可执行、可度量的子目标。

# Context
## MECE 原则
MECE (Mutually Exclusive, Collectively Exhaustive) 要求：
- 子目标之间相互独立，无重叠
- 所有子目标完全覆盖目标范围，无遗漏

## 逆向推演法
从终态倒推，识别关键里程碑：
1. 定义成功的最终状态
2. 倒推达成终态的前置条件
3. 识别关键依赖和风险点
4. 形成可执行的阶段序列

# Instructions

## 拆解前思考
在拆解前，请先思考：
1. 这个目标的核心意图是什么？
2. 成功达成后的状态是什么样的？
3. 有哪些隐含的假设和前提条件？
4. 可能遇到哪些风险和阻碍？

## 拆解原则
1. **独立性**: 每个子目标应该可独立交付价值
2. **渐进性**: 子目标应呈现递进关系，逐步逼近最终目标
3. **可度量性**: 每个子目标必须有明确的完成标准
4. **依赖明确**: 清晰标注子目标间的依赖关系
5. **风险可见**: 识别可能的风险点和应对策略

## 边界处理
- 子目标数量建议 3-7 个，根据目标复杂度调整
- 避免过度拆解导致管理成本过高
- 避免拆解不足导致子目标过于庞大
- 对于模糊目标，优先明确成功标准

# Goal Information
目标: {{goalTitle}}
描述: {{goalDescription}}
用户背景信息:
{{userContext}}

# Output Format
请严格按照以下 JSON 格式返回，确保所有必填字段完整：

{
  "goalAnalysis": {
    "coreIntent": "核心意图：一句话概括目标的本质",
    "successState": "成功状态：描述达成后的理想状态",
    "assumptions": ["假设1：隐含的前提条件", "假设2：..."]
  },
  "subGoals": [
    {
      "id": 1,
      "name": "子目标名称（简洁有力）",
      "description": "详细描述：包含具体内容和边界",
      "why": "必要性说明：为什么需要这个子目标",
      "priority": "critical|high|medium|low",
      "weight": 0.25,
      "dependencies": [],
      "estimatedDurationMinutes": 480,
      "successCriteria": [
        {"description": "完成标准1", "type": "milestone"},
        {"description": "完成标准2", "type": "deliverable"},
        {"description": "完成标准3", "type": "condition"}
      ]
    }
  ],
  "executionOrder": "执行顺序建议：说明子目标的推荐执行顺序和理由",
  "risks": ["风险点1：可能的问题和应对策略", "风险点2：..."],
  "reasoning": "拆解理由：整体拆解思路和关键考量"
}

## 字段说明
- **id**: 从 1 开始递增的数字，用于依赖引用
- **dependencies**: 填写前置子目标的 id 数字（如 [1, 2] 表示依赖第 1 和第 2 个子目标）
- **priority**: critical（关键路径）、high、medium、low
- **weight**: 权重（0-1），所有子目标权重之和建议为 1
- **estimatedDurationMinutes**: 预估所需分钟数
- **successCriteria.type**:
  - milestone: 关键节点/里程碑
  - deliverable: 可交付成果
  - condition: 需要满足的条件状态`;

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
    private llm: LLMChannel,
    private uiLogger?: UILogger
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
      // 必填：目标分析
      goalAnalysis: {
        coreIntent: string;
        successState: string;
        assumptions: string[];
      };

      subGoals: Array<{
        id: number;
        name: string;
        description: string;
        why: string;
        priority: string;
        weight?: number;
        dependencies: number[];
        estimatedDurationMinutes?: number;
        successCriteria: Array<{ description: string; type: string }>;
      }>;

      executionOrder: string;
      risks: string[];
      reasoning: string;
    };

    try {
      // Use finishReason to detect truncation
      const isTruncated = response.finishReason === 'length';
      decomposition = parseJSONFromLLM<{
        goalAnalysis: {
          coreIntent: string;
          successState: string;
          assumptions: string[];
        };

        subGoals: Array<{
          id: number;
          name: string;
          description: string;
          why: string;
          priority: string;
          weight?: number;
          dependencies: number[];
          estimatedDurationMinutes?: number;
          successCriteria: Array<{ description: string; type: string }>;
        }>;

        executionOrder: string;
        risks: string[];
        reasoning: string;
      }>(response.content, isTruncated);
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'subgoal_decomposition', goal.id);
      // Fallback: create a simple default sub-goal
      return this.createDefaultSubGoals(goal);
    }

    // Log goal analysis info to background log view
    this.uiLogger?.info('GoalAnalysis', `Intent: ${decomposition.goalAnalysis?.coreIntent || 'N/A'}`);
    this.uiLogger?.info('GoalAnalysis', `Success State: ${decomposition.goalAnalysis?.successState || 'N/A'}`);
    if (decomposition.goalAnalysis?.assumptions?.length > 0) {
      this.uiLogger?.info('GoalAnalysis', `Assumptions: ${decomposition.goalAnalysis.assumptions.join(', ')}`);
    }
    this.uiLogger?.info('ExecutionOrder', decomposition.executionOrder || 'N/A');
    if (decomposition.risks?.length > 0) {
      this.uiLogger?.info('Risks', decomposition.risks.join('; '));
    }
    this.uiLogger?.info('Reasoning', decomposition.reasoning || 'N/A');

    // Create sub-goals
    const createdSubGoals: SubGoal[] = [];

    // First pass: create all sub-goals with empty dependencies
    for (let i = 0; i < decomposition.subGoals.length; i++) {
      const sgData = decomposition.subGoals[i];

      const subGoalData: SubGoalCreateData = {
        goalId: goal.id,
        name: sgData.name,
        description: sgData.description || '',
        priority: this.validatePriority(sgData.priority),
        status: i === 0 ? 'active' : 'pending', // First one is active
        weight: sgData.weight ?? (1 / decomposition.subGoals.length),
        dependencies: [], // Will be updated in second pass
        estimatedDurationMinutes: sgData.estimatedDurationMinutes,
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
    }

    // Second pass: update dependencies using numeric id references
    for (let i = 0; i < decomposition.subGoals.length; i++) {
      const sgData = decomposition.subGoals[i];
      const subGoal = createdSubGoals[i];

      if (sgData.dependencies && sgData.dependencies.length > 0) {
        // depId is a number (1-based) indicating which sub-goal it depends on
        const realDeps = sgData.dependencies
          .map((depId) => {
            // Convert 1-based id to 0-based index
            const index = depId - 1;
            if (index >= 0 && index < createdSubGoals.length) {
              return createdSubGoals[index].id;
            }
            return undefined;
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
      const isTruncated = response.finishReason === 'length';
      reviewData = parseJSONFromLLM<{
        reviewResults: Array<{
          subGoalId: string;
          status: string;
          reasoning: string;
          suggestions?: string[];
        }>;
        requiresUserConfirmation: boolean;
      }>(response.content, isTruncated);
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
