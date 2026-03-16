/**
 * Task Planner
 *
 * 负责任务的规划、生成、Review和调整
 * - 为SubGoal生成Task
 * - 任务Review（判断与目标的对齐度）
 * - 任务调整（优先级、周期等）
 */

import {
  type Task,
  type TaskType,
  type TaskHierarchyLevel,
  type TaskExpectedResult,
  type PriorityLevel,
  type ITaskStore,
  type SubGoal,
  type ISubGoalStore,
} from '../types';

/**
 * Task review result
 */
export interface TaskReviewResult {
  taskId: string;
  goalContribution: 'critical' | 'high' | 'medium' | 'low';
  subGoalContribution: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  aligned: boolean;
  suggestions?: string[];
}

/**
 * Task generation options
 */
export interface TaskGenerationOptions {
  confirmFrequency?: boolean;
  maxTasks?: number;
  defaultHierarchyLevel?: TaskHierarchyLevel;
}

/**
 * LLM Channel interface
 */
interface LLMChannel {
  complete(prompt: string, options?: Record<string, unknown>): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }>;
}

/**
 * Task generation prompt template
 */
const GENERATE_TASKS_PROMPT = `请为以下子目标生成具体的执行任务。

子目标: {{subGoalName}}
描述: {{subGoalDescription}}
所属目标: {{goalTitle}}
用户背景: {{userContext}}

要求:
1. 每个任务应该是具体可执行的
2. 明确每个任务的预期产出
3. 任务优先级要合理
4. 任务类型：exploration(探索), one_time(一次性), recurring(周期性), interactive(交互式), monitoring(监控), event_triggered(事件触发)
5. 任务层级：task(任务) | sub_task(子任务) | action(最小执行单元)

请按JSON格式返回：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "详细描述",
      "type": "exploration|one_time|recurring|interactive|monitoring|event_triggered",
      "hierarchyLevel": "task|sub_task|action",
      "priority": "critical|high|medium|low",
      "expectedResult": {
        "type": "information|deliverable|decision|action|confirmation",
        "description": "预期产出描述",
        "format": "json|markdown|table|text|code"
      },
      "estimatedDuration": 60
    }
  ],
  "reasoning": "任务规划理由"
}`;

/**
 * Task review prompt template
 */
const REVIEW_TASKS_PROMPT = `请Review以下任务是否与目标对齐：

目标: {{goalTitle}}
子目标: {{subGoalTitle}}
目标描述: {{goalDescription}}

待Review任务:
{{tasksJson}}

请评估每个任务：
1. 与最终目标的对齐程度（critical/high/medium/low）
2. 与子目标的对齐程度（critical/high/medium/low）
3. 是否需要调整或删除

请按JSON格式返回：
{
  "reviewResults": [
    {
      "taskId": "task-id",
      "goalContribution": "critical|high|medium|low",
      "subGoalContribution": "critical|high|medium|low",
      "aligned": true|false,
      "reasoning": "评估理由",
      "suggestions": ["建议1", "建议2"]
    }
  ]
}`;

/**
 * Task Planner
 */
export class TaskPlanner {
  constructor(
    private taskStore: ITaskStore,
    private subGoalStore: ISubGoalStore,
    private llm: LLMChannel
  ) {}

  /**
   * Generate tasks for a sub-goal
   */
  async generateTasksForSubGoal(
    subGoalId: string,
    goalContext: {
      goalTitle: string;
      goalDescription?: string;
      userContext: Record<string, unknown>;
    },
    options: TaskGenerationOptions = {}
  ): Promise<Task[]> {
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const prompt = GENERATE_TASKS_PROMPT
      .replace('{{subGoalName}}', subGoal.name)
      .replace('{{subGoalDescription}}', subGoal.description)
      .replace('{{goalTitle}}', goalContext.goalTitle)
      .replace('{{userContext}}', JSON.stringify(goalContext.userContext, null, 2));

    const response = await this.llm.complete(prompt, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let taskData: {
      tasks: Array<{
        title: string;
        description: string;
        type: string;
        hierarchyLevel: string;
        priority: string;
        expectedResult: {
          type: string;
          description: string;
          format: string;
        };
        estimatedDuration?: number;
      }>;
      reasoning: string;
    };

    try {
      // Try to parse JSON, handling markdown code blocks
      taskData = this.parseJSONWithMarkdown(response.content);
    } catch (error) {
      console.error('[TaskPlanner] Failed to parse task generation response:', error);
      console.error('[TaskPlanner] Raw response:', response.content.slice(0, 500));
      // Fallback: create default tasks
      return this.createDefaultTasks(subGoal, goalContext);
    }

    const maxTasks = options.maxTasks || 10;
    const tasksToCreate = taskData.tasks.slice(0, maxTasks);

    const createdTasks: Task[] = [];

    for (const taskDef of tasksToCreate) {
      const task = await this.createTaskFromDefinition(
        subGoal,
        taskDef,
        options.defaultHierarchyLevel || 'task'
      );
      createdTasks.push(task);

      // Add task to sub-goal
      await this.subGoalStore.addTaskToSubGoal(subGoalId, task.id);
    }

    return createdTasks;
  }

  /**
   * Create default tasks as fallback
   */
  private async createDefaultTasks(
    subGoal: SubGoal,
    goalContext: { goalTitle: string }
  ): Promise<Task[]> {
    const defaults = [
      {
        title: `完成${subGoal.name}相关任务`,
        description: subGoal.description,
        type: 'one_time',
        hierarchyLevel: 'task' as TaskHierarchyLevel,
        priority: 'high' as PriorityLevel,
        expectedResult: {
          type: 'deliverable' as const,
          description: `完成${subGoal.name}`,
          format: 'text' as const,
        },
      },
    ];

    const created: Task[] = [];
    for (const def of defaults) {
      const task = await this.createTaskFromDefinition(subGoal, def, 'task');
      created.push(task);
      await this.subGoalStore.addTaskToSubGoal(subGoal.id, task.id);
    }

    return created;
  }

  /**
   * Create task from definition
   */
  private async createTaskFromDefinition(
    subGoal: SubGoal,
    def: {
      title: string;
      description: string;
      type: string;
      hierarchyLevel?: string;
      priority: string;
      expectedResult: {
        type: string;
        description: string;
        format: string;
      };
      estimatedDuration?: number;
    },
    defaultHierarchyLevel: TaskHierarchyLevel
  ): Promise<Task> {
    const validTypes: TaskType[] = [
      'exploration',
      'one_time',
      'recurring',
      'interactive',
      'monitoring',
      'event_triggered',
    ];

    const taskType = validTypes.includes(def.type as TaskType)
      ? (def.type as TaskType)
      : 'one_time';

    const hierarchyLevel: TaskHierarchyLevel =
      def.hierarchyLevel === 'sub_task' || def.hierarchyLevel === 'action'
        ? def.hierarchyLevel
        : defaultHierarchyLevel;

    const expectedResult: TaskExpectedResult = {
      type: def.expectedResult.type as TaskExpectedResult['type'],
      description: def.expectedResult.description,
      format: def.expectedResult.format as TaskExpectedResult['format'],
    };

    const taskData: Omit<Task, 'id' | 'createdAt'> = {
      goalId: subGoal.goalId,
      subGoalId: subGoal.id,
      title: def.title,
      description: def.description,
      type: taskType,
      priority: this.validatePriority(def.priority),
      status: 'awaiting_confirmation',
      hierarchyLevel,
      execution: {
        agentPrompt: `${def.title}: ${def.description}`,
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'composite',
      },
      expectedResult,
      adaptiveConfig: {
        canAdjustDifficulty: false,
        canAdjustFrequency: taskType === 'recurring',
        successThreshold: 0.5,
        executionHistory: [],
      },
      relatedKnowledgeIds: [],
      dependencies: [],
      executionHistory: [],
    };

    return this.taskStore.createTask(taskData);
  }

  /**
   * Review tasks for alignment
   */
  async reviewTasks(
    taskIds: string[],
    context: {
      goalTitle: string;
      subGoalTitle: string;
      goalDescription?: string;
    }
  ): Promise<TaskReviewResult[]> {
    const tasks: Task[] = [];
    for (const id of taskIds) {
      const task = await this.taskStore.getTask(id);
      if (task) tasks.push(task);
    }

    if (tasks.length === 0) {
      return [];
    }

    const prompt = REVIEW_TASKS_PROMPT
      .replace('{{goalTitle}}', context.goalTitle)
      .replace('{{subGoalTitle}}', context.subGoalTitle)
      .replace('{{goalDescription}}', context.goalDescription || '')
      .replace('{{tasksJson}}', JSON.stringify(tasks, null, 2));

    const response = await this.llm.complete(prompt, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let reviewData: {
      reviewResults: Array<{
        taskId: string;
        goalContribution: string;
        subGoalContribution: string;
        aligned: boolean;
        reasoning: string;
        suggestions?: string[];
      }>;
    };

    try {
      reviewData = JSON.parse(response.content);
    } catch (error) {
      console.error('[TaskPlanner] Failed to parse review response:', error);
      // Return all tasks as aligned
      return tasks.map((t) => ({
        taskId: t.id,
        goalContribution: 'medium' as const,
        subGoalContribution: 'high' as const,
        aligned: true,
        reasoning: '默认通过',
      }));
    }

    return reviewData.reviewResults.map((r) => ({
      taskId: r.taskId,
      goalContribution: r.goalContribution as TaskReviewResult['goalContribution'],
      subGoalContribution: r.subGoalContribution as TaskReviewResult['subGoalContribution'],
      aligned: r.aligned,
      reasoning: r.reasoning,
      suggestions: r.suggestions,
    }));
  }

  /**
   * Adjust tasks based on review results
   */
  async adjustTasks(
    reviewResults: TaskReviewResult[],
    userFeedback?: string
  ): Promise<Task[]> {
    const adjusted: Task[] = [];

    for (const review of reviewResults) {
      if (review.aligned) continue;

      const task = await this.taskStore.getTask(review.taskId);
      if (!task) continue;

      // Handle misaligned tasks
      if (review.goalContribution === 'low') {
        // Low contribution: consider deleting or deprioritizing
        await this.taskStore.updateTask(task.id, {
          priority: 'low',
          status: 'cancelled',
        });
      } else {
        // Adjust priority based on contribution
        const newPriority: PriorityLevel =
          review.subGoalContribution === 'critical'
            ? 'critical'
            : review.subGoalContribution === 'high'
              ? 'high'
              : 'medium';

        const updated = await this.taskStore.updateTask(task.id, {
          priority: newPriority,
        });
        adjusted.push(updated);
      }
    }

    // If user feedback provided, replan
    if (userFeedback) {
      // Find first task to get context
      const firstTask = reviewResults[0];
      if (firstTask) {
        const task = await this.taskStore.getTask(firstTask.taskId);
        if (task?.subGoalId) {
          await this.replanTasks(task.subGoalId, userFeedback);
        }
      }
    }

    return adjusted;
  }

  /**
   * Replan tasks for a sub-goal
   */
  async replanTasks(
    subGoalId: string,
    feedback: string,
    goalContext?: { goalTitle: string; userContext: Record<string, unknown> }
  ): Promise<Task[]> {
    // Delete existing tasks for this sub-goal
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    for (const taskId of subGoal.taskIds) {
      await this.taskStore.deleteTask(taskId);
    }

    // Clear task IDs from sub-goal
    await this.subGoalStore.updateSubGoal(subGoalId, { taskIds: [] });

    // Regenerate with feedback
    if (goalContext) {
      const enrichedContext = {
        ...goalContext.userContext,
        replanFeedback: feedback,
      };

      return this.generateTasksForSubGoal(subGoalId, {
        ...goalContext,
        userContext: enrichedContext,
      });
    }

    return [];
  }

  /**
   * Get tasks for a sub-goal
   */
  async getTasksForSubGoal(subGoalId: string): Promise<Task[]> {
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const tasks: Task[] = [];
    for (const taskId of subGoal.taskIds) {
      const task = await this.taskStore.getTask(taskId);
      if (task) tasks.push(task);
    }

    return tasks.sort((a, b) => {
      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Validate priority string
   */
  private validatePriority(priority: string): PriorityLevel {
    const valid = ['critical', 'high', 'medium', 'low', 'background'];
    if (valid.includes(priority)) {
      return priority as PriorityLevel;
    }
    return 'medium';
  }

  /**
   * Parse JSON response, handling markdown code blocks
   */
  private parseJSONWithMarkdown<T>(content: string): T {
    let jsonStr = content.trim();

    // Try to extract JSON from markdown code block
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1].trim();
    } else {
      // Try generic code block
      const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to find JSON object/array in plain text
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }
    }

    return JSON.parse(jsonStr) as T;
  }
}

/**
 * Get priority weight for sorting
 */
function getPriorityWeight(priority: string): number {
  const weights: Record<string, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
    background: 10,
  };
  return weights[priority] || 0;
}
