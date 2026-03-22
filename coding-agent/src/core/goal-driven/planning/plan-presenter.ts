/**
 * Plan Presenter
 *
 * 负责计划的展示、汇报和用户确认
 * - 生成完整的计划汇报
 * - 向用户展示计划并获取确认
 * - 处理用户的计划修改请求
 */

import {
  type Goal,
  type SubGoal,
  type Task,
  type IGoalStore,
  type ISubGoalStore,
  type ITaskStore,
  type INotificationQueue,
  type Notification,
} from '../types';
import { logError } from '../utils/logger';
import { parseJSONFromLLM } from '../utils';

/**
 * Plan report structure
 */
export interface PlanReport {
  goalId: string;
  goalTitle: string;
  summary: {
    subGoalCount: number;
    taskCount: number;
    notifyTaskCount: number;
    interactiveTaskCount: number;
    estimatedDuration: string;
  };
  subGoals: Array<{
    id: string;
    name: string;
    description: string;
    priority: string;
    status: string;
    weight: number;
    estimatedDurationMinutes?: number;
    tasks: Array<{
      id: string;
      title: string;
      executionCycle: string;
      executionMode: string;
      priority: string;
      hierarchyLevel: string;
      expectedResult: string;
      schedule?: { type: string; intervalMs: number };
      nextExecutionAt?: number;
      dependencies: string[];
      dependencyTitles: string[]; // 依赖任务的标题
      shouldNotify?: boolean;
      notifyReason?: string;
      notifyTiming?: string;
      requiresUserInput?: boolean;
    }>;
  }>;
  timeline: string;
  notificationStrategy: string;
}

/**
 * Plan confirmation result
 */
export interface PlanConfirmationResult {
  confirmed: boolean;
  modifications?: string[];
  feedback?: string;
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
 * Plan Presenter
 */
export class PlanPresenter {
  constructor(
    private goalStore: IGoalStore,
    private subGoalStore: ISubGoalStore,
    private taskStore: ITaskStore,
    private notificationQueue: INotificationQueue,
    private llm: LLMChannel
  ) {}

  /**
   * Generate plan report for a goal
   */
  async generatePlanReport(goalId: string): Promise<PlanReport> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);

    // Build sub-goal and task structure
    const subGoalReports: PlanReport['subGoals'] = [];
    let totalTasks = 0;
    let notifyTasks = 0;
    let interactiveTasks = 0;

    // 先收集所有任务的标题映射（用于显示依赖关系）
    const taskTitleMap = new Map<string, string>();
    for (const sg of subGoals) {
      for (const taskId of sg.taskIds) {
        const task = await this.taskStore.getTask(taskId);
        if (task) {
          taskTitleMap.set(task.id, task.title);
        }
      }
    }

    for (const sg of subGoals) {
      const tasks: Task[] = [];
      for (const taskId of sg.taskIds) {
        const task = await this.taskStore.getTask(taskId);
        if (task) {
          tasks.push(task);
          totalTasks++;
          if (task.shouldNotify) notifyTasks++;
          if (task.requiresUserInput) interactiveTasks++;
        }
      }

      subGoalReports.push({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        priority: sg.priority,
        status: sg.status,
        weight: sg.weight,
        estimatedDurationMinutes: sg.estimatedDurationMinutes,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          executionCycle: t.executionCycle,
          executionMode: t.executionMode,
          priority: t.priority,
          hierarchyLevel: t.hierarchyLevel ?? 'task',
          expectedResult: t.expectedResult?.description ?? '',
          schedule: t.schedule,
          nextExecutionAt: t.nextExecutionAt,
          dependencies: t.dependencies,
          dependencyTitles: t.dependencies.map((depId) => taskTitleMap.get(depId) || depId.slice(0, 8)),
          shouldNotify: t.shouldNotify,
          notifyReason: t.notifyReason,
          notifyTiming: t.notifyTiming,
          requiresUserInput: t.requiresUserInput,
        })),
      });
    }

    // Calculate timeline (convert minutes to hours for display)
    const totalDurationMinutes = subGoals.reduce(
      (sum, sg) => sum + (sg.estimatedDurationMinutes || 0),
      0
    );
    const totalDurationHours = totalDurationMinutes / 60;

    // Generate notification strategy based on goal priority
    const notificationStrategy = this.generateNotificationStrategy(goal);

    // Build summary object
    const summary = {
      subGoalCount: subGoals.length,
      taskCount: totalTasks,
      notifyTaskCount: notifyTasks,
      interactiveTaskCount: interactiveTasks,
      estimatedDuration: this.formatTimeline(totalDurationHours),
    };

    return {
      goalId,
      goalTitle: goal.title,
      summary,
      subGoals: subGoalReports,
      timeline: this.formatTimeline(totalDurationHours),
      notificationStrategy,
    };
  }

  /**
   * Generate plan summary using LLM
   */
  private async generateSummary(goal: Goal, subGoals: SubGoal[]): Promise<string> {
    const prompt = `请为目标生成一个简洁的计划摘要：

目标: ${goal.title}
描述: ${goal.description || '无'}
优先级: ${goal.priority}

子目标 (${subGoals.length}个):
${subGoals.map((sg) => `- ${sg.name} (${sg.priority}, 权重${Math.round(sg.weight * 100)}%)`).join('\n')}

请用2-3句话概括这个计划的核心要点。`;

    try {
      const response = await this.llm.complete(prompt, { temperature: 0.5 });
      return response.content.trim();
    } catch (error) {
      // Fallback summary
      return `计划包含${subGoals.length}个子目标，将按优先级${goal.priority}执行。`;
    }
  }

  /**
   * Format duration for display
   */
  private formatDuration(hours: number): string {
    if (hours < 1) return '小于1小时';
    if (hours < 24) return `${Math.round(hours)}小时`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}天`;
    const months = Math.round(days / 30);
    return `${months}个月`;
  }

  /**
   * Format task type for display
   */
  private formatTaskInfo(executionCycle: string, executionMode: string): string {
    const cycleLabels: Record<string, string> = {
      once: '单次',
      recurring: '周期',
    };
    const modeLabels: Record<string, string> = {
      standard: '标准',
      interactive: '交互',
      monitoring: '监控',
      event_triggered: '触发',
    };
    return `${cycleLabels[executionCycle] || executionCycle}/${modeLabels[executionMode] || executionMode}`;
  }

  /**
   * Format task schedule/trigger time for display
   */
  private formatTaskSchedule(task: PlanReport['subGoals'][0]['tasks'][0]): string {
    // 根据执行模式显示触发时机
    switch (task.executionMode) {
      case 'interactive':
        return '立即执行，需用户输入';

      case 'monitoring':
        if (task.schedule) {
          const interval = this.formatInterval(task.schedule.intervalMs);
          return `每${interval}检查`;
        }
        return '持续监控';

      case 'event_triggered':
        return '事件触发';

      case 'standard':
      default:
        // 周期任务
        if (task.executionCycle === 'recurring') {
          if (task.schedule) {
            const interval = this.formatInterval(task.schedule.intervalMs);
            return `每${interval}`;
          }
          return '周期执行';
        }
        // 有依赖的一次性任务
        if (task.dependencies.length > 0) {
          return this.formatDependencies(task.dependencyTitles);
        }
        return task.nextExecutionAt
          ? `计划 ${new Date(task.nextExecutionAt).toLocaleDateString('zh-CN')}`
          : (task.notifyTiming || '立即执行');
    }
  }

  /**
   * Format dependency titles for display
   */
  private formatDependencies(titles: string[]): string {
    if (titles.length === 0) return '';
    if (titles.length === 1) {
      return `「${titles[0].slice(0, 20)}」完成后`;
    }
    // 多个依赖，显示前两个
    const firstTwo = titles.slice(0, 2).map((t) => `「${t.slice(0, 15)}」`);
    const more = titles.length > 2 ? `等${titles.length}个任务` : '';
    return `${firstTwo.join('、')}${more}完成后`;
  }

  /**
   * Format interval milliseconds to human readable string
   */
  private formatInterval(ms: number): string {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes}分钟`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}小时`;

    const days = Math.round(hours / 24);
    if (days < 30) return `${days}天`;

    const months = Math.round(days / 30);
    return `${months}月`;
  }

  /**
   * Format timeline
   */
  private formatTimeline(totalHours: number): string {
    if (totalHours === 0) return '时间待定';

    const duration = this.formatDuration(totalHours);
    return `预计总耗时: ${duration}`;
  }

  /**
   * Generate notification strategy
   */
  private generateNotificationStrategy(goal: Goal): string {
    const strategies: Record<string, string> = {
      critical: '关键进展和紧急情况立即通知，执行汇报在用户空闲时推送',
      high: '重要进展实时通知，一般汇报空闲时推送',
      medium: '每日汇总，重要节点即时通知',
      low: '按需汇报，批量推送',
      background: '静默执行，完成后统一汇报',
    };

    return strategies[goal.priority] || strategies.medium;
  }

  /**
   * Present plan to user for confirmation
   */
  async presentPlanForConfirmation(goalId: string): Promise<PlanConfirmationResult> {
    const report = await this.generatePlanReport(goalId);

    // Format plan for display
    const planContent = this.formatPlanForDisplay(report);

    // Create confirmation notification
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      type: 'confirmation',
      priority: 'high',
      title: `【计划确认】${report.goalTitle.slice(0, 30)}...`,
      content: planContent,
      goalId,
    };

    // Enqueue notification
    this.notificationQueue.enqueue(notification);

    // Return false - waiting for user confirmation via input handler
    // The extension.ts input handler will handle the confirmation response
    return {
      confirmed: false,
    };
  }

  /**
   * Format plan for display
   */
  private formatPlanForDisplay(report: PlanReport): string {
    const lines: string[] = [];

    lines.push('## 计划概要');
    lines.push(`目标: ${report.goalTitle}`);
    lines.push(`子目标数: ${report.summary.subGoalCount}`);
    lines.push(`任务总数: ${report.summary.taskCount}`);
    lines.push(`需要推送: ${report.summary.notifyTaskCount} 个任务`);
    lines.push(`需要您参与: ${report.summary.interactiveTaskCount} 个任务`);
    lines.push(`预计耗时: ${report.summary.estimatedDuration}`);
    lines.push('');

    lines.push('## 执行阶段');
    for (let i = 0; i < report.subGoals.length; i++) {
      const sg = report.subGoals[i];
      lines.push(`\n### ${i + 1}. ${sg.name}`);
      lines.push(`描述: ${sg.description}`);
      lines.push(`优先级: ${sg.priority} | 权重: ${Math.round(sg.weight * 100)}%`);
      if (sg.estimatedDurationMinutes) {
        lines.push(`预计耗时: ${this.formatDuration(sg.estimatedDurationMinutes / 60)}`);
      }

      if (sg.tasks.length > 0) {
        lines.push('\n任务列表:');
        for (const task of sg.tasks) {
          const typeLabel = this.formatTaskInfo(task.executionCycle, task.executionMode);
          const scheduleLabel = this.formatTaskSchedule(task);
          const scheduleStr = scheduleLabel ? ` | ${scheduleLabel}` : '';
          lines.push(`  - [${typeLabel}] ${task.title} (${task.priority})${scheduleStr}`);
          lines.push(`    预期产出: ${task.expectedResult}`);
        }
      }
    }

    lines.push('\n---');
    lines.push(`\n${report.timeline}`);
    lines.push(`通知策略: ${report.notificationStrategy}`);
    lines.push('\n请确认此计划或提出修改意见。');

    return lines.join('\n');
  }

  /**
   * Handle plan modification request
   */
  async handlePlanModification(
    goalId: string,
    modificationRequest: string
  ): Promise<void> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Parse modification request using LLM
    const prompt = `请解析用户的计划修改请求，提取具体的修改意图：

用户请求: "${modificationRequest}"

当前计划涉及目标: ${goal.title}

请按JSON格式返回：
{
  "modificationType": "add_subgoal|remove_subgoal|reorder|adjust_priority|adjust_timeline|other",
  "target": "描述修改目标",
  "details": "详细说明",
  "requiresConfirmation": true|false
}`;

    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const isTruncated = response.finishReason === 'length';
      const modification = parseJSONFromLLM<{
        modificationType: string;
        target: string;
        details: string;
        requiresConfirmation: boolean;
      }>(response.content, isTruncated);

      // Create notification about the modification
      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        type: 'info',
        priority: 'medium',
        title: '计划修改请求已收到',
        content: `已收到您的修改请求：${modification.details}\n\n系统将据此调整计划。`,
        goalId,
      };

      this.notificationQueue.enqueue(notification);
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'plan_modification', goalId);
      // Fallback: just acknowledge
      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        type: 'info',
        priority: 'medium',
        title: '计划修改请求',
        content: `已记录您的修改请求：${modificationRequest}\n\n系统将在后续规划中考虑。`,
        goalId,
      };

      this.notificationQueue.enqueue(notification);
    }
  }

  /**
   * Get plan summary for quick view
   */
  async getPlanSummary(goalId: string): Promise<{
    totalSubGoals: number;
    totalTasks: number;
    completedTasks: number;
    overallProgress: number;
  }> {
    const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);

    let totalTasks = 0;
    let completedTasks = 0;
    let totalWeight = 0;
    let completedWeight = 0;

    for (const sg of subGoals) {
      totalWeight += sg.weight;

      if (sg.status === 'completed') {
        completedWeight += sg.weight;
      }

      for (const taskId of sg.taskIds) {
        totalTasks++;
        const task = await this.taskStore.getTask(taskId);
        if (task?.status === 'completed') {
          completedTasks++;
        }
      }
    }

    const overallProgress = totalWeight > 0 ? completedWeight / totalWeight : 0;

    return {
      totalSubGoals: subGoals.length,
      totalTasks,
      completedTasks,
      overallProgress: Math.round(overallProgress * 100),
    };
  }

  /**
   * Check if plan is ready for presentation
   */
  async isPlanReady(goalId: string): Promise<{
    ready: boolean;
    reason?: string;
  }> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      return { ready: false, reason: '目标不存在' };
    }

    const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
    if (subGoals.length === 0) {
      return { ready: false, reason: '尚未拆解子目标' };
    }

    // Check if any sub-goal has tasks
    let hasTasks = false;
    for (const sg of subGoals) {
      if (sg.taskIds.length > 0) {
        hasTasks = true;
        break;
      }
    }

    if (!hasTasks) {
      return { ready: false, reason: '尚未生成任务' };
    }

    return { ready: true };
  }
}
