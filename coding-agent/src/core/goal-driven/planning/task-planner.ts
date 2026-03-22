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
  type ExecutionCycle,
  type ExecutionMode,
  type TaskHierarchyLevel,
  type TaskExpectedResult,
  type PriorityLevel,
  type ITaskStore,
  type SubGoal,
  type ISubGoalStore,
  type PlanningMetadata,
} from '../types';
import { logError } from '../utils/logger';
import { parseJSONFromLLM } from '../utils';

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
完成标准: {{subGoalCriteria}}
所属目标: {{goalTitle}}
用户背景: {{userContext}}

要求:
1. 每个任务应该是具体可执行的
2. 明确每个任务的预期产出
3. 任务优先级要合理
4. 执行周期(execution_cycle): once(执行一次) | recurring(周期执行)
5. 执行模式(execution_mode): standard(标准) | interactive(需用户交互) | monitoring(持续监控) | event_triggered(事件触发)
6. 任务层级：task(任务) | sub_task(子任务) | action(最小执行单元)

请按JSON格式返回：
{
  "sub_goal_analysis": {
    "core_deliverable": "核心交付物描述",
    "work_categories": ["分类1", "分类2"],
    "completion_checklist": ["检查项1", "检查项2"]
  },
  "tasks": [
    {
      "id": "task-1",
      "title": "任务标题",
      "description": "详细描述",
      "execution_cycle": "once|recurring",
      "execution_mode": "standard|interactive|monitoring|event_triggered",
      "recurrence": "周期频率描述(仅recurring需要)",
      "trigger_condition": "触发条件描述(仅event_triggered需要)",
      "hierarchy_level": "task|sub_task|action",
      "parent_id": "父任务ID(可选)",
      "priority": "critical|high|medium|low",
      "dependencies": ["依赖任务ID"],
      "expected_output": {
        "type": "information|deliverable|decision|action|confirmation",
        "description": "预期产出描述",
        "format": "json|markdown|table|text|code|other",
        "completion_criteria": "完成判定标准"
      },
      "estimated_duration_minutes": 60
    }
  ],
  "execution_plan": {
    "suggested_order": ["task-1", "task-2"],
    "critical_path": ["关键路径任务ID"],
    "total_estimated_hours": 8
  },
  "coverage_validation": {
    "is_sufficient": true,
    "explanation": "覆盖度说明",
    "uncovered_risks": ["未覆盖风险1"]
  }
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
      subGoalCriteria?: { id: string; description: string; type: string; completed: boolean }[];
    },
    options: TaskGenerationOptions = {}
  ): Promise<Task[]> {
    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const criteriaText = goalContext.subGoalCriteria
      ? goalContext.subGoalCriteria.map(c => `- ${c.description}`).join('\n')
      : '无明确标准';

    const prompt = GENERATE_TASKS_PROMPT
      .replace('{{subGoalName}}', subGoal.name)
      .replace('{{subGoalDescription}}', subGoal.description)
      .replace('{{subGoalCriteria}}', criteriaText)
      .replace('{{goalTitle}}', goalContext.goalTitle)
      .replace('{{userContext}}', JSON.stringify(goalContext.userContext, null, 2));

    const response = await this.llm.complete(prompt, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let taskData: {
      sub_goal_analysis?: {
        core_deliverable: string;
        work_categories: string[];
        completion_checklist: string[];
      };
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        execution_cycle: string;
        execution_mode: string;
        recurrence?: string;
        trigger_condition?: string;
        hierarchy_level?: string;
        parent_id?: string;
        priority: string;
        dependencies: string[];
        expected_output: {
          type: string;
          description: string;
          format: string;
          completion_criteria?: string;
        };
        estimated_duration_minutes?: number;
      }>;
      execution_plan?: {
        suggested_order: string[];
        critical_path: string[];
        total_estimated_hours: number;
      };
      coverage_validation?: {
        is_sufficient: boolean;
        explanation: string;
        uncovered_risks: string[];
      };
    };

    try {
      // Try to parse JSON, handling markdown code blocks
      taskData = this.parseJSONWithMarkdown(response.content);
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'task_generation', subGoal.goalId, undefined, { subGoalId: subGoal.id });
      // Fallback: create default tasks
      return this.createDefaultTasks(subGoal, goalContext);
    }

    // Store planning metadata to SubGoal
    if (taskData.sub_goal_analysis || taskData.execution_plan || taskData.coverage_validation) {
      const planningMetadata: PlanningMetadata = {
        analysis: taskData.sub_goal_analysis ? {
          coreDeliverable: taskData.sub_goal_analysis.core_deliverable,
          workCategories: taskData.sub_goal_analysis.work_categories,
          completionChecklist: taskData.sub_goal_analysis.completion_checklist,
        } : undefined,
        executionPlan: taskData.execution_plan ? {
          suggestedOrder: taskData.execution_plan.suggested_order,
          criticalPath: taskData.execution_plan.critical_path,
          totalEstimatedHours: taskData.execution_plan.total_estimated_hours,
        } : undefined,
        coverageValidation: taskData.coverage_validation ? {
          isSufficient: taskData.coverage_validation.is_sufficient,
          explanation: taskData.coverage_validation.explanation,
          uncoveredRisks: taskData.coverage_validation.uncovered_risks,
        } : undefined,
        generatedAt: Date.now(),
      };
      await this.subGoalStore.updatePlanningMetadata(subGoalId, planningMetadata);
    }

    const maxTasks = options.maxTasks || 10;
    const tasksToCreate = taskData.tasks.slice(0, maxTasks);

    // Build task ID mapping for parent_id resolution
    const taskIdMapping = new Map<string, string>();

    const createdTasks: Task[] = [];

    for (const taskDef of tasksToCreate) {
      const task = await this.createTaskFromDefinition(
        subGoal,
        taskDef,
        options.defaultHierarchyLevel || 'task',
        taskIdMapping
      );
      createdTasks.push(task);

      // Store the mapping from temp ID to real ID
      if (taskDef.id) {
        taskIdMapping.set(taskDef.id, task.id);
      }

      // Add task to sub-goal
      await this.subGoalStore.addTaskToSubGoal(subGoalId, task.id);
    }

    // Update parent_id references if needed
    for (const task of createdTasks) {
      if (task.parentId && taskIdMapping.has(task.parentId)) {
        await this.taskStore.updateTask(task.id, {
          parentId: taskIdMapping.get(task.parentId)
        });
      }
    }

    // Update dependencies references if needed
    for (const task of createdTasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        const updatedDeps = task.dependencies.map(depId =>
          taskIdMapping.get(depId) || depId
        );
        // Only update if there are changes
        if (updatedDeps.some((dep, i) => dep !== task.dependencies![i])) {
          await this.taskStore.updateTask(task.id, {
            dependencies: updatedDeps
          });
        }
      }
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
        executionCycle: 'once' as ExecutionCycle,
        executionMode: 'standard' as ExecutionMode,
        hierarchyLevel: 'task' as TaskHierarchyLevel,
        priority: 'high' as PriorityLevel,
        expectedOutput: {
          type: 'deliverable' as const,
          description: `完成${subGoal.name}`,
          format: 'text' as const,
        },
      },
    ];

    const created: Task[] = [];
    for (const def of defaults) {
      const task = await this.createTaskFromDefinition(subGoal, {
        id: 'default-1',
        title: def.title,
        description: def.description,
        execution_cycle: def.executionCycle,
        execution_mode: def.executionMode,
        hierarchy_level: def.hierarchyLevel,
        priority: def.priority,
        dependencies: [],
        expected_output: {
          type: def.expectedOutput.type,
          description: def.expectedOutput.description,
          format: def.expectedOutput.format,
        },
      }, 'task', new Map());
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
      id: string;
      title: string;
      description: string;
      execution_cycle: string;
      execution_mode: string;
      recurrence?: string;
      trigger_condition?: string;
      hierarchy_level?: string;
      parent_id?: string;
      priority: string;
      dependencies: string[];
      expected_output: {
        type: string;
        description: string;
        format: string;
        completion_criteria?: string;
      };
      estimated_duration_minutes?: number;
    },
    defaultHierarchyLevel: TaskHierarchyLevel,
    taskIdMapping: Map<string, string>
  ): Promise<Task> {
    const validCycles: ExecutionCycle[] = ['once', 'recurring'];
    const validModes: ExecutionMode[] = ['standard', 'interactive', 'monitoring', 'event_triggered'];

    const executionCycle: ExecutionCycle = validCycles.includes(def.execution_cycle as ExecutionCycle)
      ? (def.execution_cycle as ExecutionCycle)
      : 'once';

    const executionMode: ExecutionMode = validModes.includes(def.execution_mode as ExecutionMode)
      ? (def.execution_mode as ExecutionMode)
      : 'standard';

    const hierarchyLevel: TaskHierarchyLevel =
      def.hierarchy_level === 'sub_task' || def.hierarchy_level === 'action'
        ? def.hierarchy_level
        : defaultHierarchyLevel;

    // Resolve parent_id from temp ID to real ID if available
    let parentId = def.parent_id;
    if (parentId && taskIdMapping.has(parentId)) {
      parentId = taskIdMapping.get(parentId);
    }

    const expectedResult: TaskExpectedResult = {
      type: def.expected_output.type as TaskExpectedResult['type'],
      description: def.expected_output.description,
      format: def.expected_output.format as TaskExpectedResult['format'],
      validationCriteria: def.expected_output.completion_criteria
        ? [def.expected_output.completion_criteria]
        : undefined,
    };

    const taskData: Omit<Task, 'id' | 'createdAt'> = {
      goalId: subGoal.goalId,
      subGoalId: subGoal.id,
      parentId,
      title: def.title,
      description: def.description,
      executionCycle,
      executionMode,
      recurrence: def.recurrence,
      triggerCondition: def.trigger_condition,
      priority: this.validatePriority(def.priority),
      status: 'awaiting_confirmation',
      hierarchyLevel,
      execution: {
        agentPrompt: `${def.title}: ${def.description}`,
        requiredTools: [],
        requiredContext: [],
        estimatedDurationMinutes: def.estimated_duration_minutes,
        capabilityMode: 'composite',
      },
      expectedResult,
      adaptiveConfig: {
        canAdjustDifficulty: false,
        canAdjustFrequency: executionCycle === 'recurring',
        successThreshold: 0.5,
        executionHistory: [],
      },
      relatedKnowledgeIds: [],
      dependencies: def.dependencies || [],
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
      const isTruncated = response.finishReason === 'length';
      reviewData = parseJSONFromLLM<{
        reviewResults: Array<{
          taskId: string;
          goalContribution: string;
          subGoalContribution: string;
          aligned: boolean;
          reasoning: string;
          suggestions?: string[];
        }>;
      }>(response.content, isTruncated);
    } catch (error) {
      const goalId = tasks[0]?.goalId;
      await logError(error instanceof Error ? error : String(error), 'task_review', goalId);
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
