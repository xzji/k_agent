/**
 * Goal Orchestrator
 *
 * 负责整个Goal-Driven Agent流程的编排
 * - 串联10步用户交互流程
 * - 协调各组件配合
 * - 管理流程状态
 */

import {
  type Goal,
  type SubGoal,
  type Task,
  type Question,
  type ChoiceOption,
  type IGoalStore,
  type ITaskStore,
  type IKnowledgeStore,
  type INotificationQueue,
  type ISubGoalStore,
} from '../types';
import { ContextGatherer } from '../planning/context-gatherer';
import { SubGoalPlanner } from '../planning/sub-goal-planner';
import { TaskPlanner, type TaskReviewResult } from '../planning/task-planner';
import { PlanPresenter, type PlanReport } from '../planning/plan-presenter';
import { UnifiedTaskScheduler } from '../scheduler/unified-task-scheduler';
import { SuccessCriteriaChecker } from '../planning/success-criteria-checker';
import { SubGoalStore } from '../sub-goal/sub-goal-store';

/**
 * Orchestration phase
 */
export type OrchestrationPhase =
  | 'idle'
  | 'collecting_info'      // Phase 1: 目标理解与信息收集
  | 'decomposing'          // Phase 2&3: 子目标拆解
  | 'generating_tasks'     // Phase 4: 任务生成
  | 'reviewing_tasks'      // Phase 5: 任务Review
  | 'presenting_plan'      // Phase 6: 计划汇报与确认
  | 'executing'            // Phase 7: 启动执行
  | 'monitoring'           // Phase 8&9: 监控执行
  | 'reviewing';           // Phase 10: 定期Review

/**
 * Orchestration state
 */
export interface OrchestrationState {
  goalId: string;
  phase: OrchestrationPhase;
  context: Record<string, unknown>;
  subGoalIds: string[];
  taskIds: string[];
  interactiveTaskId?: string;
  planConfirmed: boolean;
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
 * Idle Detector interface
 */
interface IdleDetector {
  isUserIdle(): Promise<boolean>;
}

/**
 * User Profile interface
 */
interface UserProfile {
  userId: string;
  preferences: {
    notificationFrequency: string;
  };
}

/**
 * Goal Orchestrator
 */
export class GoalOrchestrator {
  private subGoalPlanner: SubGoalPlanner;
  private taskPlanner: TaskPlanner;
  private planPresenter: PlanPresenter;
  private subGoalStore: SubGoalStore;
  private state: Map<string, OrchestrationState> = new Map();

  constructor(
    private goalStore: IGoalStore,
    private taskStore: ITaskStore,
    private knowledgeStore: IKnowledgeStore,
    private notificationQueue: INotificationQueue,
    private contextGatherer: ContextGatherer,
    private scheduler: UnifiedTaskScheduler,
    private successCriteriaChecker: SuccessCriteriaChecker,
    private llm: LLMChannel,
    private idleDetector: IdleDetector,
    private userProfile: UserProfile,
    subGoalStore?: SubGoalStore
  ) {
    // Initialize SubGoalStore (create new if not provided)
    this.subGoalStore = subGoalStore || new SubGoalStore();

    // Initialize planners
    this.subGoalPlanner = new SubGoalPlanner(goalStore, this.subGoalStore, llm);
    this.taskPlanner = new TaskPlanner(taskStore, this.subGoalStore, llm);
    this.planPresenter = new PlanPresenter(
      goalStore,
      this.subGoalStore,
      taskStore,
      notificationQueue,
      llm
    );
  }

  /**
   * Initialize SubGoalStore
   */
  async init(): Promise<void> {
    await this.subGoalStore.init();
  }

  // ============================================================================
  // Phase 1: 目标理解与信息收集
  // ============================================================================

  /**
   * Start goal with information collection
   */
  async startGoal(userGoal: string): Promise<{
    goalId: string;
    interactiveTaskId: string;
  }> {
    // Create goal with gathering_info status
    const goal = await this.goalStore.createGoal({
      title: userGoal,
      description: '',
      status: 'gathering_info',
      priority: 'medium',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    // Initialize state
    this.state.set(goal.id, {
      goalId: goal.id,
      phase: 'collecting_info',
      context: {},
      subGoalIds: [],
      taskIds: [],
      planConfirmed: false,
    });

    // Start interactive gathering
    const goalObj: Goal = {
      ...goal,
      dimensions: [],
      successCriteria: [],
      userContext: { collectedInfo: {} },
      createdAt: Date.now(),
    };

    const interactiveTask = await this.contextGatherer.startInteractiveGathering(goalObj);

    // Update state
    const state = this.state.get(goal.id)!;
    state.interactiveTaskId = interactiveTask.id;

    return {
      goalId: goal.id,
      interactiveTaskId: interactiveTask.id,
    };
  }

  /**
   * Handle user response during info collection
   */
  async handleInfoCollectionResponse(
    goalId: string,
    response: string
  ): Promise<{
    hasEnoughInfo: boolean;
    nextQuestions?: Question[];
    context?: string;
    canProceed?: boolean;
  }> {
    const state = this.state.get(goalId);
    if (!state || state.phase !== 'collecting_info') {
      throw new Error('Invalid state for info collection');
    }

    if (!state.interactiveTaskId) {
      throw new Error('No interactive task found');
    }

    const result = await this.contextGatherer.processUserResponse(
      state.interactiveTaskId,
      response
    );

    // Update collected info in state
    Object.assign(state.context, result.extractedInfo);

    return {
      hasEnoughInfo: result.hasEnoughInfo,
      nextQuestions: result.nextQuestions?.questions,
      context: result.nextQuestions?.context,
      canProceed: result.hasEnoughInfo,
    };
  }

  // ============================================================================
  // Phase 2&3: 子目标拆解与关系梳理
  // ============================================================================

  /**
   * Decompose goal into sub-goals
   */
  async decomposeSubGoals(goalId: string): Promise<SubGoal[]> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    // Update phase
    state.phase = 'decomposing';

    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Decompose sub-goals
    const subGoals = await this.subGoalPlanner.decomposeSubGoals(
      goalId,
      goal.userContext?.collectedInfo || state.context
    );

    // Update state
    state.subGoalIds = subGoals.map((sg) => sg.id);

    // Update goal status
    await this.goalStore.updateGoal(goalId, {
      status: 'planning',
      subGoals: state.subGoalIds,
    });

    return subGoals;
  }

  // ============================================================================
  // Phase 4&5: 任务生成与Review
  // ============================================================================

  /**
   * Generate and review tasks for all sub-goals
   */
  async generateAndReviewTasks(
    goalId: string,
    options?: { confirmFrequency?: boolean }
  ): Promise<{
    tasks: Task[];
    reviewResults: TaskReviewResult[];
    adjusted: boolean;
  }> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    state.phase = 'generating_tasks';

    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const allTasks: Task[] = [];
    const allReviews: TaskReviewResult[] = [];

    for (const subGoalId of state.subGoalIds) {
      const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
      if (!subGoal) continue;

      // Generate tasks
      const tasks = await this.taskPlanner.generateTasksForSubGoal(
        subGoalId,
        {
          goalTitle: goal.title,
          goalDescription: goal.description,
          userContext: goal.userContext?.collectedInfo || state.context,
        },
        { confirmFrequency: options?.confirmFrequency }
      );

      allTasks.push(...tasks);

      // Review tasks
      if (tasks.length > 0) {
        state.phase = 'reviewing_tasks';

        const reviews = await this.taskPlanner.reviewTasks(
          tasks.map((t) => t.id),
          {
            goalTitle: goal.title,
            subGoalTitle: subGoal.name,
            goalDescription: goal.description,
          }
        );

        allReviews.push(...reviews);

        // Adjust misaligned tasks
        const misaligned = reviews.filter((r) => !r.aligned);
        if (misaligned.length > 0) {
          await this.taskPlanner.adjustTasks(misaligned);
        }
      }
    }

    // Update state
    state.taskIds = allTasks.map((t) => t.id);

    return {
      tasks: allTasks,
      reviewResults: allReviews,
      adjusted: allReviews.some((r) => !r.aligned),
    };
  }

  // ============================================================================
  // Phase 6: 计划汇报与确认
  // ============================================================================

  /**
   * Present plan for user confirmation
   */
  async presentPlanForConfirmation(goalId: string): Promise<{
    report: PlanReport;
    confirmed: boolean;
  }> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    state.phase = 'presenting_plan';

    // Generate report
    const report = await this.planPresenter.generatePlanReport(goalId);

    // Present and get confirmation (in real impl, this would wait for user)
    const result = await this.planPresenter.presentPlanForConfirmation(goalId);

    if (result.confirmed) {
      state.planConfirmed = true;
    }

    return {
      report,
      confirmed: result.confirmed,
    };
  }

  /**
   * Handle plan modification request
   */
  async handlePlanModification(
    goalId: string,
    modificationRequest: string
  ): Promise<void> {
    await this.planPresenter.handlePlanModification(goalId, modificationRequest);
  }

  /**
   * Confirm the plan after user approval
   * This should be called when user confirms the plan (e.g., replies "ok", "确认", etc.)
   */
  async confirmPlan(goalId: string): Promise<void> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    if (state.phase !== 'presenting_plan') {
      throw new Error(`Cannot confirm plan in phase: ${state.phase}`);
    }

    state.planConfirmed = true;
  }

  /**
   * Activate tasks after plan confirmation
   * Changes task status from 'awaiting_confirmation' to 'blocked' or 'ready' based on dependencies
   */
  async activateTasksAfterConfirmation(goalId: string): Promise<void> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    // Update all tasks from awaiting_confirmation to blocked/ready based on dependencies
    for (const taskId of state.taskIds) {
      const task = await this.taskStore.getTask(taskId);
      if (task && task.status === 'awaiting_confirmation') {
        // Check if dependencies are met
        const depsMet = await this.scheduler.checkDependencies(taskId);
        const newStatus = depsMet ? 'ready' : 'blocked';
        await this.taskStore.updateStatus(taskId, newStatus);
      }
    }
  }

  // ============================================================================
  // Phase 7: 启动执行
  // ============================================================================

  /**
   * Start execution
   */
  async startExecution(goalId: string): Promise<void> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    if (!state.planConfirmed) {
      throw new Error('Plan not confirmed yet');
    }

    state.phase = 'executing';

    // Update goal status
    await this.goalStore.updateGoal(goalId, { status: 'active' });

    // Start scheduler if not running
    if (!this.scheduler.isRunning()) {
      await this.scheduler.start();
    }

    state.phase = 'monitoring';
  }

  // ============================================================================
  // Phase 10: 定期Review
  // ============================================================================

  /**
   * Perform periodic review
   */
  async performReview(goalId: string): Promise<{
    canComplete: boolean;
    percentage: number;
    recommendations?: string[];
  }> {
    const state = this.state.get(goalId);
    if (!state) {
      throw new Error('Goal not found in orchestrator state');
    }

    state.phase = 'reviewing';

    // Evaluate goal progress
    const report = await this.successCriteriaChecker.evaluateGoalProgress(goalId);

    // Get sub-goal stats
    const subGoalStats = await this.subGoalStore.getStats(goalId);

    // Generate recommendations
    const recommendations: string[] = [];

    if (report.percentage < 100) {
      // Check for stalled sub-goals
      if (subGoalStats.byStatus.active === 0 && subGoalStats.byStatus.pending > 0) {
        recommendations.push('有未启动的子目标，建议检查依赖关系');
      }

      // Check progress
      if (report.percentage < 50 && subGoalStats.total > 3) {
        recommendations.push('整体进度较慢，建议重新评估子目标优先级');
      }
    }

    // Auto-complete if criteria met
    if (report.canAutoComplete) {
      await this.successCriteriaChecker.handleCompletionConfirmation(goalId, 'complete');
    }

    // Return to monitoring
    state.phase = 'monitoring';

    return {
      canComplete: report.canAutoComplete,
      percentage: report.percentage,
      recommendations,
    };
  }

  /**
   * Handle incomplete feedback
   */
  async handleIncompleteFeedback(goalId: string, feedback: string): Promise<void> {
    await this.successCriteriaChecker.handleIncompleteFeedback(goalId, feedback);

    // Replan based on feedback
    const state = this.state.get(goalId);
    if (state) {
      // Could trigger replanning here
      const goal = await this.goalStore.getGoal(goalId);
      if (goal?.subGoals && goal.subGoals.length > 0) {
        // Replan first incomplete sub-goal
        for (const subGoalId of goal.subGoals) {
          const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
          if (subGoal && subGoal.status !== 'completed') {
            await this.taskPlanner.replanTasks(subGoalId, feedback, {
              goalTitle: goal.title,
              userContext: goal.userContext?.collectedInfo || {},
            });
            break;
          }
        }
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get current orchestration state
   */
  getState(goalId: string): OrchestrationState | undefined {
    return this.state.get(goalId);
  }

  /**
   * Get all active goals' states
   */
  getAllStates(): OrchestrationState[] {
    return Array.from(this.state.values());
  }

  /**
   * Check if goal is ready for next phase
   */
  canProceedToNextPhase(goalId: string): {
    canProceed: boolean;
    reason?: string;
  } {
    const state = this.state.get(goalId);
    if (!state) {
      return { canProceed: false, reason: 'Goal not found' };
    }

    switch (state.phase) {
      case 'collecting_info':
        return { canProceed: true }; // Assuming enough info collected

      case 'decomposing':
        return state.subGoalIds.length > 0
          ? { canProceed: true }
          : { canProceed: false, reason: 'Sub-goals not created' };

      case 'generating_tasks':
      case 'reviewing_tasks':
        return state.taskIds.length > 0
          ? { canProceed: true }
          : { canProceed: false, reason: 'Tasks not generated' };

      case 'presenting_plan':
        return state.planConfirmed
          ? { canProceed: true }
          : { canProceed: false, reason: 'Plan not confirmed' };

      case 'executing':
      case 'monitoring':
        return { canProceed: true };

      default:
        return { canProceed: false, reason: 'Unknown phase' };
    }
  }

  /**
   * Clean up goal state
   */
  async cleanup(goalId: string): Promise<void> {
    this.state.delete(goalId);
  }
}
