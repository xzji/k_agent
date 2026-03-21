/**
 * Unified Task Scheduler
 *
 * This is the core scheduling component that merges BackgroundLoop (dimension exploration)
 * with TaskScheduler (structured task management). It provides a unified interface for
 * scheduling all types of tasks: exploration, recurring, one-time, monitoring, event-triggered,
 * and interactive tasks.
 */

import {
  type Task,
  type TaskType,
  type TaskStatus,
  type UnifiedTask,
  type Goal,
  type Dimension,
  type SchedulerConfig,
  type ExecutionResult,
  type PriorityLevel,
  type Notification,
  type ITaskStore,
  type IGoalStore,
  type INotificationQueue,
  type IKnowledgeStore,
  type ISubGoalStore,
} from '../types';
import { TaskDependencyGraph } from '../task/task-dependency';
import { ValueAssessor, type ValueAssessment } from '../output-layer/value-assessor';
import { Semaphore, getPriorityWeight, now, sleep } from '../utils';
import { logError } from '../utils/logger';
import type { AgentPiBackgroundExecutor, TaskResultEvent } from '../runtime/agent-pi-executor';
import type { EventBus } from '../../event-bus.js';
import type { GoalDrivenConfigStore } from '../config/store.js';
import { getToolProvider } from '../runtime/tool-provider.js';

/**
 * Execution pipeline interface
 */
interface ExecutionPipeline {
  run(task: Task): Promise<ExecutionResult>;
}

/**
 * User profile interface
 */
interface UserProfile {
  preferences: {
    quietHours?: { start: number; end: number };
    notificationFrequency: 'immediate' | 'hourly_digest' | 'daily_digest';
    preferredNotificationTime?: number;
  };
}

/**
 * Idle detector interface
 */
interface IdleDetector {
  isUserIdle(): Promise<boolean>;
  getLastActivityTime(): number;
}

/**
 * Unified Task Scheduler
 *
 * The main scheduling loop that coordinates all task types:
 * - Exploration tasks (dimension-based information gathering)
 * - Recurring tasks (periodic execution)
 * - One-time tasks (single execution)
 * - Monitoring tasks (continuous monitoring)
 * - Event-triggered tasks (conditional execution)
 * - Interactive tasks (requiring user input)
 */
export class UnifiedTaskScheduler {
  // Configuration
  private config: SchedulerConfig;

  // Core components
  private taskStore: ITaskStore;
  private goalStore: IGoalStore;
  private subGoalStore: ISubGoalStore;
  private knowledgeStore: IKnowledgeStore;
  private notificationQueue: INotificationQueue;
  private dependencyGraph: TaskDependencyGraph;
  private executionPipeline: ExecutionPipeline;
  private idleDetector: IdleDetector;
  private userProfile: UserProfile;
  private valueAssessor: ValueAssessor;

  // Background execution (optional)
  private backgroundExecutor?: AgentPiBackgroundExecutor;
  private backgroundExecutorUnavailableReason?: string;
  private eventBus?: EventBus;
  private useBackgroundExecution = false;
  private dispatchedTasks = new Map<string, { goalId: string; startTime: number }>();
  private eventUnsubscribe?: () => void;

  // State
  private running = false;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private runningTasks = new Map<string, Promise<void>>();
  private semaphore: Semaphore;

  // Statistics
  private stats = {
    cyclesCompleted: 0,
    tasksExecuted: 0,
    tasksFailed: 0,
    lastCycleAt: 0,
  };

  private configStore?: GoalDrivenConfigStore;
  private configUnsubscribe?: () => void;

  constructor(
    taskStore: ITaskStore,
    goalStore: IGoalStore,
    subGoalStore: ISubGoalStore,
    knowledgeStore: IKnowledgeStore,
    notificationQueue: INotificationQueue,
    dependencyGraph: TaskDependencyGraph,
    executionPipeline: ExecutionPipeline,
    idleDetector: IdleDetector,
    userProfile: UserProfile,
    valueAssessor: ValueAssessor,
    config?: Partial<SchedulerConfig>,
    backgroundExecutor?: AgentPiBackgroundExecutor,
    eventBus?: EventBus,
    configStore?: GoalDrivenConfigStore,
    backgroundExecutorUnavailableReason?: string
  ) {
    this.taskStore = taskStore;
    this.goalStore = goalStore;
    this.subGoalStore = subGoalStore;
    this.knowledgeStore = knowledgeStore;
    this.notificationQueue = notificationQueue;
    this.dependencyGraph = dependencyGraph;
    this.executionPipeline = executionPipeline;
    this.idleDetector = idleDetector;
    this.userProfile = userProfile;
    this.valueAssessor = valueAssessor;
    this.backgroundExecutor = backgroundExecutor;
    this.backgroundExecutorUnavailableReason = backgroundExecutorUnavailableReason;
    this.eventBus = eventBus;
    this.configStore = configStore;

    // Use config store values if available, otherwise use defaults
    const maxConcurrent = configStore?.get('maxConcurrentTasks') ?? 3;
    const cycleIntervalMs = configStore?.get('schedulerCycleIntervalMs') ?? 60000;

    this.config = {
      maxConcurrent,
      defaultPriority: 'medium',
      cycleIntervalMs,
      enableConcurrency: true,
      ...config,
    };

    this.semaphore = new Semaphore(this.config.maxConcurrent);

    // Enable background execution if executor is provided
    if (backgroundExecutor && eventBus) {
      this.useBackgroundExecution = true;
    }

    // Listen for config changes
    if (configStore) {
      this.configUnsubscribe = configStore.onChange((newConfig) => {
        this.config.maxConcurrent = newConfig.maxConcurrentTasks;
        this.config.cycleIntervalMs = newConfig.schedulerCycleIntervalMs;
        // Recreate semaphore with new capacity
        this.semaphore = new Semaphore(newConfig.maxConcurrentTasks);
      });
    }
  }

  /**
   * Start the scheduler loop
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    // Setup background execution event listener
    if (this.useBackgroundExecution && this.eventBus) {
      this.eventUnsubscribe = this.eventBus.on('goal_driven:task_result', this.handleTaskResult.bind(this));
    }

    // Start the first cycle
    this.scheduleNextCycle(0);
  }

  /**
   * Stop the scheduler loop
   */
  async stop(): Promise<void> {
    this.running = false;

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    // Unsubscribe from events
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe();
      this.eventUnsubscribe = undefined;
    }

    // Unsubscribe from config changes
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = undefined;
    }

    // Wait for running tasks to complete
    if (this.runningTasks.size > 0) {
      await Promise.all(this.runningTasks.values());
    }
  }

  /**
   * Check if the scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Schedule the next cycle
   */
  private scheduleNextCycle(delayMs: number): void {
    if (!this.running) return;

    this.loopTimer = setTimeout(() => {
      this.runCycle().catch(() => {
        // Cycle errors are logged elsewhere
      });
    }, delayMs);
  }

  /**
   * Run a single scheduling cycle
   */
  private async runCycle(): Promise<void> {
    if (!this.running) return;

    const cycleStart = now();

    try {
      // 1. Get all ready tasks (including dimension exploration and structured tasks)
      const readyTasks = await this.getReadyTasks();

      // 2. Update task statuses based on dependencies
      await this.updateBlockedTaskStatuses();

      // 3. Re-fetch ready tasks after status updates
      const updatedReadyTasks = await this.getReadyTasks();

      // 4. Filter tasks that are good to execute now
      const executableTasks = await this.filterExecutableTasks(updatedReadyTasks);

      // 5. Sort by priority
      const prioritized = this.prioritizeTasks(executableTasks);

      // 6. Calculate available slots considering both local running tasks and dispatched background tasks
      const effectiveRunningCount = this.runningTasks.size + this.dispatchedTasks.size;
      const availableSlots = Math.max(0, this.config.maxConcurrent - effectiveRunningCount);

      // 7. Execute tasks (with concurrency control if enabled)
      const tasksToExecute = prioritized.slice(0, availableSlots);

      if (this.config.enableConcurrency) {
        await this.executeWithConcurrency(tasksToExecute);
      } else {
        await this.executeSequential(tasksToExecute);
      }

      // Update stats
      this.stats.cyclesCompleted++;
      this.stats.lastCycleAt = cycleStart;

    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'scheduler_cycle');
    }

    // 7. Schedule next cycle
    const cycleDuration = now() - cycleStart;
    const nextDelay = Math.max(0, this.config.cycleIntervalMs - cycleDuration);
    this.scheduleNextCycle(nextDelay);
  }

  /**
   * Get all ready tasks from both exploration and structured task sources
   */
  private async getReadyTasks(): Promise<UnifiedTask[]> {
    const tasks: UnifiedTask[] = [];

    // A. Dimension exploration tasks (existing logic)
    const explorationTasks = await this.getExplorationTasks();
    tasks.push(...explorationTasks);

    // B. Structured tasks from TaskStore (new)
    const structuredTasks = await this.getStructuredReadyTasks();
    tasks.push(...structuredTasks);

    return tasks;
  }

  /**
   * Get exploration tasks from active goals' dimensions
   */
  private async getExplorationTasks(): Promise<UnifiedTask[]> {
    const tasks: UnifiedTask[] = [];
    const activeGoals = await this.goalStore.getActiveGoals();

    for (const goal of activeGoals) {
      const pendingDims = this.getPendingDimensions(goal);

      for (const dim of pendingDims) {
        // Check if there's already a task for this dimension
        const existingTasks = await this.taskStore.getTasksByGoal(goal.id);
        const hasExplorationTask = existingTasks.some(
          (t) => t.type === 'exploration' && t.dimensionId === dim.id &&
                 ['pending', 'ready', 'in_progress'].includes(t.status)
        );

        if (!hasExplorationTask) {
          tasks.push({
            id: `explore-${dim.id}`,
            type: 'exploration',
            goalId: goal.id,
            dimensionId: dim.id,
            priority: this.calculateDimPriority(dim, goal),
            status: 'ready',
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Get ready structured tasks from TaskStore
   */
  private async getStructuredReadyTasks(): Promise<UnifiedTask[]> {
    const readyTasks = await this.taskStore.getReadyTasks();
    const unifiedTasks: UnifiedTask[] = [];

    for (const task of readyTasks) {
      // Check dependencies
      const depsMet = await this.dependencyGraph.checkDependencies(task.id);

      if (depsMet) {
        unifiedTasks.push({
          id: task.id,
          type: task.type,
          goalId: task.goalId,
          priority: task.priority,
          status: task.status,
          nextExecutionAt: task.nextExecutionAt,
          taskRef: task,
        });
      }
    }

    return unifiedTasks;
  }

  /**
   * Get pending dimensions from a goal
   */
  private getPendingDimensions(goal: Goal): Dimension[] {
    return goal.dimensions.filter(
      (d) => d.status === 'pending' || d.status === 'exploring'
    );
  }

  /**
   * Calculate priority for a dimension
   */
  private calculateDimPriority(dim: Dimension, goal: Goal): PriorityLevel {
    // Critical goals get critical dimensions
    if (goal.priority === 'critical') return 'high';
    if (goal.priority === 'high') return 'medium';

    // Dimension's own priority
    return dim.priority;
  }

  /**
   * Update statuses of blocked tasks
   */
  private async updateBlockedTaskStatuses(): Promise<void> {
    const allTasks = await this.taskStore.getAllTasks
      ? await (this.taskStore as unknown as { getAllTasks(): Promise<Task[]> }).getAllTasks()
      : [];

    for (const task of allTasks) {
      // Only process blocked or pending tasks, not awaiting_confirmation
      // awaiting_confirmation tasks should only be activated after plan confirmation
      if (task.status === 'blocked' || task.status === 'pending') {
        await this.dependencyGraph.updateTaskStatusFromDependencies(task.id);
      }
    }
  }

  /**
   * Filter tasks that are good to execute now (considering user state)
   */
  private async filterExecutableTasks(tasks: UnifiedTask[]): Promise<UnifiedTask[]> {
    const executable: UnifiedTask[] = [];

    for (const task of tasks) {
      if (await this.isGoodTimeToExecute(task)) {
        executable.push(task);
      }
    }

    return executable;
  }

  /**
   * Check if it's a good time to execute a task
   */
  private async isGoodTimeToExecute(task: UnifiedTask): Promise<boolean> {
    // Critical tasks execute immediately
    if (task.priority === 'critical') return true;

    // High priority tasks can execute if not in quiet hours
    if (task.priority === 'high') {
      return !this.isInQuietHours();
    }

    // Check user preferences
    const prefs = this.userProfile.preferences;

    // Check quiet hours
    if (this.isInQuietHours(prefs.quietHours)) {
      return false;
    }

    // Check notification frequency preference
    if (prefs.notificationFrequency === 'daily_digest') {
      // Only execute at preferred time
      return this.isDigestTime(prefs.preferredNotificationTime);
    }

    // Check if user is idle for non-critical tasks
    if (task.priority === 'medium' || task.priority === 'low') {
      const isIdle = await this.idleDetector.isUserIdle();
      if (!isIdle) return false;
    }

    return true;
  }

  /**
   * Check if currently in quiet hours
   */
  private isInQuietHours(quietHours?: { start: number; end: number }): boolean {
    if (!quietHours) return false;

    const hour = new Date().getHours();
    return hour >= quietHours.start && hour < quietHours.end;
  }

  /**
   * Check if it's digest time
   */
  private isDigestTime(preferredHour?: number): boolean {
    const hour = new Date().getHours();
    return hour === (preferredHour ?? 9);
  }

  /**
   * Sort tasks by priority (highest first)
   */
  private prioritizeTasks(tasks: UnifiedTask[]): UnifiedTask[] {
    return tasks.sort((a, b) => {
      const weightA = getPriorityWeight(a.priority);
      const weightB = getPriorityWeight(b.priority);

      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight first
      }

      // If same priority, prefer tasks with earlier next execution time
      const timeA = a.nextExecutionAt ?? Infinity;
      const timeB = b.nextExecutionAt ?? Infinity;
      return timeA - timeB;
    });
  }

  /**
   * Execute tasks with concurrency control
   */
  private async executeWithConcurrency(tasks: UnifiedTask[]): Promise<void> {
    await Promise.all(
      tasks.map(async (task) => {
        await this.semaphore.acquire();
        try {
          await this.executeUnifiedTask(task);
        } finally {
          this.semaphore.release();
        }
      })
    );
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(tasks: UnifiedTask[]): Promise<void> {
    for (const task of tasks) {
      await this.executeUnifiedTask(task);
    }
  }

  /**
   * Execute a unified task
   */
  private async executeUnifiedTask(unifiedTask: UnifiedTask): Promise<void> {
    // Check if already running
    if (this.runningTasks.has(unifiedTask.id)) {
      return;
    }

    // Create execution promise
    const executionPromise = this.runTaskWithState(unifiedTask);
    this.runningTasks.set(unifiedTask.id, executionPromise);

    try {
      await executionPromise;
    } finally {
      this.runningTasks.delete(unifiedTask.id);
    }
  }

  /**
   * Run task with proper state management
   */
  private async runTaskWithState(unifiedTask: UnifiedTask): Promise<void> {
    const startTime = now();

    try {
      // Get or create the actual Task object
      let task: Task;

      if (unifiedTask.taskRef) {
        task = unifiedTask.taskRef;
        await this.taskStore.updateStatus(task.id, 'in_progress');
      } else {
        // Create exploration task on the fly
        task = await this.createExplorationTask(unifiedTask);
      }

      // Check if this task should use background execution
      const useBackgroundExecution = this.shouldUseBackgroundExecution(task);

      // Execute based on task type
      const result = await this.executeByType(task, unifiedTask.type);

      // For background execution, skip immediate status update - it will be handled by handleTaskResult
      if (useBackgroundExecution) {
        // Stats are not updated here - they will be updated when background execution completes
        return;
      }

      // Update task status based on result (for non-background execution)
      const newStatus: TaskStatus = result.success ? 'completed' : 'failed';
      await this.taskStore.updateStatus(task.id, newStatus, {
        result,
        completedAt: now(),
      });

      // Update stats
      this.stats.tasksExecuted++;

      // Calculate next execution for recurring tasks
      if (task.type === 'recurring' && task.schedule) {
        await this.scheduleNextExecution(task);
      }

      // Handle adaptive adjustments
      await this.handleAdaptiveAdjustments(task, result);

      // Assess value and smart notification for completed tasks
      if (result.success && result.output) {
        await this.assessAndNotify(task, result);
      }

    } catch (error) {
      this.stats.tasksFailed++;
      await logError(error instanceof Error ? error : String(error), 'task_execution', unifiedTask.goalId, unifiedTask.taskRef?.id);

      // Update task status to failed
      if (unifiedTask.taskRef) {
        await this.taskStore.updateStatus(unifiedTask.taskRef.id, 'failed', {
          error: 'Execution failed',
        });
      }
    }
  }

  /**
   * Execute task based on its type
   */
  private async executeByType(task: Task, type: TaskType): Promise<ExecutionResult> {
    // Check if we should use background execution for this task
    if (this.shouldUseBackgroundExecution(task)) {
      return this.executeWithBackgroundExecutor(task);
    }

    // Otherwise use direct execution
    switch (type) {
      case 'exploration':
        return this.executeExplorationTask(task);
      case 'recurring':
        return this.executeRecurringTask(task);
      case 'one_time':
        return this.executeOneTimeTask(task);
      case 'interactive':
        return this.executeInteractiveTask(task);
      case 'monitoring':
        return this.executeMonitoringTask(task);
      case 'event_triggered':
        return this.executeEventTriggeredTask(task);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Check if task should use background execution
   *
   * All non-interactive tasks use Agent Pi for execution. The background executor
   * handles queuing internally when at capacity.
   *
   * @throws Error if background executor is not available for non-interactive tasks
   */
  private shouldUseBackgroundExecution(task: Task): boolean {
    // Interactive tasks always use direct execution (need user input)
    if (task.type === 'interactive') return false;

    // Non-interactive tasks require background executor
    if (!this.useBackgroundExecution || !this.backgroundExecutor) {
      const reason = this.backgroundExecutorUnavailableReason ?? 'Unknown reason';
      throw new Error(
        `Background executor not available for task ${task.id}. Reason: ${reason}`
      );
    }

    // All non-interactive tasks use background execution (executor handles queuing internally)
    return true;
  }

  /**
   * Execute task using background executor
   */
  private async executeWithBackgroundExecutor(task: Task): Promise<ExecutionResult> {
    if (!this.eventBus) {
      throw new Error('EventBus not available for background execution');
    }

    // Mark task as dispatched
    this.dispatchedTasks.set(task.id, { goalId: task.goalId, startTime: now() });

    // Get relevant knowledge
    const knowledgeEntries = await this.knowledgeStore.getRelevantKnowledgeForTask(
      task,
      task.execution.agentPrompt,
      { maxResults: 5 }
    );

    // Get actual tools from ToolProvider for display
    const toolProvider = getToolProvider();
    const actualTools = toolProvider ? await toolProvider.getToolNames() : task.execution.requiredTools;

    // Dispatch to background executor via EventBus
    this.eventBus.emit('goal_driven:execute_task', {
      taskId: task.id,
      goalId: task.goalId,
      taskType: task.type,
      agentPrompt: task.execution.agentPrompt,
      requiredTools: actualTools,
      contextKnowledge: knowledgeEntries,
      timeoutMs: task.execution.estimatedDuration ? task.execution.estimatedDuration * 1000 : undefined,
    });

    // Return a pending result - actual result will come via event
    return {
      success: true,
      output: `🚀 任务已派发到后台执行器\n\n` +
        `任务 "${task.title}" 正在后台通过 Agent Pi 执行，使用工具: ${actualTools.join(', ') || '无'}\n\n` +
        `执行完成后将通过通知推送结果。`,
      duration: 0,
    };
  }

  /**
   * Handle task result from background executor
   */
  private async handleTaskResult(payload: TaskResultEvent['payload']): Promise<void> {
    const { taskId, goalId, success, output, error, duration, knowledgeEntries } = payload;

    // Remove from dispatched tasks
    this.dispatchedTasks.delete(taskId);

    try {
      // Get the task
      const task = await this.taskStore.getTask(taskId);
      if (!task) {
        return;
      }

      // Build result
      const result: ExecutionResult = {
        success,
        output,
        error,
        duration,
        knowledgeEntries,
      };

      // Update task status
      const newStatus: TaskStatus = success ? 'completed' : 'failed';
      await this.taskStore.updateStatus(task.id, newStatus, {
        result,
        completedAt: now(),
      });

      // Add execution record
      await this.taskStore.addExecutionRecord(task.id, {
        timestamp: now(),
        status: success ? 'success' : 'failed',
        duration,
        summary: output?.slice(0, 200),
      });

      // Update stats
      this.stats.tasksExecuted++;
      if (!success) {
        this.stats.tasksFailed++;
      }

      // Handle recurring tasks
      if (task.type === 'recurring' && task.schedule && success) {
        await this.scheduleNextExecution(task);
      }

      // Handle adaptive adjustments
      await this.handleAdaptiveAdjustments(task, result);

      // Assess value and notify
      if (success && output) {
        await this.assessAndNotify(task, result);
      }

      // Update dependency graph
      await this.dependencyGraph.updateAllTaskStatuses(goalId);

    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'task_result_handling', goalId, taskId);
    }
  }

  /**
   * Create an exploration task from unified task
   */
  private async createExplorationTask(unifiedTask: UnifiedTask): Promise<Task> {
    const goal = await this.goalStore.getGoal(unifiedTask.goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${unifiedTask.goalId}`);
    }

    const dim = goal.dimensions.find((d) => d.id === unifiedTask.dimensionId);
    if (!dim) {
      throw new Error(`Dimension not found: ${unifiedTask.dimensionId}`);
    }

    return this.taskStore.createTask({
      goalId: unifiedTask.goalId,
      dimensionId: unifiedTask.dimensionId,
      title: `Explore dimension: ${dim.name}`,
      description: `Gather information about ${dim.name} for goal: ${goal.title}`,
      type: 'exploration',
      priority: unifiedTask.priority,
      status: 'in_progress',
      execution: {
        agentPrompt: `Explore the dimension "${dim.name}" for the goal: ${goal.title}. Focus on gathering: ${dim.infoNeeds.map(i => i.description).join(', ')}`,
        requiredTools: ['web_search', 'file_read'],
        requiredContext: ['goal_context', 'dimension_context'],
        capabilityMode: 'composite',
      },
      adaptiveConfig: {
        canAdjustDifficulty: false,
        canAdjustFrequency: false,
        successThreshold: 0.5,
        executionHistory: [],
      },
      relatedKnowledgeIds: [],
      dependencies: [],
      executionHistory: [],
    });
  }

  /**
   * Execute exploration task
   */
  private async executeExplorationTask(task: Task): Promise<ExecutionResult> {
    // Run through the full execution pipeline
    return this.executionPipeline.run(task);
  }

  /**
   * Execute recurring task
   */
  private async executeRecurringTask(task: Task): Promise<ExecutionResult> {
    // Generate variation based on history
    const history = task.executionHistory;
    const variationPrompt = this.generateVariation(task.execution.agentPrompt, history);

    // Adjust difficulty based on past performance
    const adjustedPrompt = this.adjustDifficulty(variationPrompt, history);

    // Create adjusted task
    const adjustedTask: Task = {
      ...task,
      execution: {
        ...task.execution,
        agentPrompt: adjustedPrompt,
      },
    };

    return this.executionPipeline.run(adjustedTask);
  }

  /**
   * Execute one-time task
   */
  private async executeOneTimeTask(task: Task): Promise<ExecutionResult> {
    return this.executionPipeline.run(task);
  }

  /**
   * Execute interactive task
   */
  private async executeInteractiveTask(task: Task): Promise<ExecutionResult> {
    // Interactive tasks are handled specially - they transition to waiting_user state
    // and resume when user responds
    if (!task.pendingQuestions) {
      // Start interactive gathering
      return {
        success: true,
        output: 'Interactive gathering started',
        duration: 0,
      };
    }

    // If we have pending questions, the task should be in waiting_user state
    // This shouldn't happen in normal flow
    return {
      success: false,
      error: 'Interactive task has pending questions but was scheduled',
      duration: 0,
    };
  }

  /**
   * Execute monitoring task
   */
  private async executeMonitoringTask(task: Task): Promise<ExecutionResult> {
    // Monitoring tasks check conditions and report if changes detected
    return this.executionPipeline.run(task);
  }

  /**
   * Execute event-triggered task
   */
  private async executeEventTriggeredTask(task: Task): Promise<ExecutionResult> {
    // Event-triggered tasks execute when their condition is met
    return this.executionPipeline.run(task);
  }

  /**
   * Generate variation for recurring tasks
   */
  private generateVariation(basePrompt: string, history: unknown[]): string {
    const occurrence = history.length + 1;

    return `${basePrompt}

## Execution Context
This is execution #${occurrence}.

Please ensure this execution provides fresh insights and varies from previous runs where appropriate.
`;
  }

  /**
   * Adjust difficulty based on historical performance
   */
  private adjustDifficulty(prompt: string, history: unknown[]): string {
    // Calculate success rate from recent history
    const recent = history.slice(-5);
    const successCount = recent.filter(
      (h: unknown) => (h as { status?: string }).status === 'success'
    ).length;
    const successRate = recent.length > 0 ? successCount / recent.length : 0.5;

    if (successRate < 0.5) {
      return `${prompt}

[Difficulty Adjustment: Provide more detailed guidance and simpler steps]`;
    } else if (successRate > 0.85) {
      return `${prompt}

[Difficulty Adjustment: User is performing well, can increase depth and challenge]`;
    }

    return prompt;
  }

  /**
   * Schedule next execution for recurring tasks
   */
  private async scheduleNextExecution(task: Task): Promise<void> {
    if (!task.schedule) return;

    const schedule = task.schedule;
    const executionCount = task.executionHistory.length;

    // Check if we've reached max executions
    if (schedule.maxExecutions && executionCount >= schedule.maxExecutions) {
      await this.taskStore.updateStatus(task.id, 'completed');
      return;
    }

    // Calculate next execution time
    const nextExecutionAt = now() + schedule.intervalMs;
    await this.taskStore.updateNextExecution(task.id, nextExecutionAt);

    // Reset status to ready for next cycle
    await this.taskStore.updateStatus(task.id, 'ready');
  }

  /**
   * Handle adaptive adjustments after task execution
   */
  private async handleAdaptiveAdjustments(
    task: Task,
    result: ExecutionResult
  ): Promise<void> {
    if (!task.adaptiveConfig.canAdjustDifficulty && !task.adaptiveConfig.canAdjustFrequency) {
      return;
    }

    const history = task.executionHistory;
    if (history.length < 3) return; // Need more data

    // Calculate success rate
    const recent = history.slice(-5);
    const successRate = recent.filter((h) => h.status === 'success').length / recent.length;

    // Check if adjustment is needed
    if (successRate < task.adaptiveConfig.successThreshold) {
      // Performance is below threshold - consider adjustments
      if (task.adaptiveConfig.canAdjustFrequency && task.schedule) {
        // Reduce frequency
        const newInterval = Math.round(task.schedule.intervalMs * 1.5);
        await this.taskStore.updateTask(task.id, {
          schedule: { ...task.schedule, intervalMs: newInterval },
        });

        this.notificationQueue.enqueue({
          type: 'info',
          priority: 'low',
          title: `Task frequency adjusted: ${task.title}`,
          content: `Reduced frequency due to lower success rate. New interval: ${Math.round(newInterval / 60000)} minutes.`,
          goalId: task.goalId,
          taskId: task.id,
        });
      }
    }
  }

  /**
   * Assess value and enqueue smart notification
   */
  private async assessAndNotify(task: Task, result: ExecutionResult): Promise<void> {
    try {
      // Assess value
      const assessment = await this.valueAssessor.assessValue(task.id, result);

      // Only notify if valuable
      if (assessment.shouldNotify) {
        // Wait for user idle before sending notification
        const isIdle = await this.waitForUserIdle(300000); // 5 minute timeout

        if (isIdle || task.priority === 'critical') {
          await this.enqueueValueBasedNotification(task, result, assessment);
        }
        // User not idle - could implement delayed notification queue here
      }
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'assess_and_notify', task.goalId, task.id);
      // Fallback to simple notification
      await this.enqueueResultNotification(task, result);
    }
  }

  /**
   * Wait for user to become idle
   */
  private async waitForUserIdle(timeoutMs: number = 300000): Promise<boolean> {
    const checkInterval = 10000; // 10 seconds
    const startTime = now();

    while (now() - startTime < timeoutMs) {
      if (await this.idleDetector.isUserIdle()) {
        return true;
      }
      await sleep(checkInterval);
    }

    return false; // Timeout
  }

  /**
   * Enqueue value-based notification
   */
  private async enqueueValueBasedNotification(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): Promise<void> {
    const goal = await this.goalStore.getGoal(task.goalId);

    // Build notification content with value context
    const content = await this.buildNotificationContent(task, result, assessment);

    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      type: 'report',
      priority: assessment.priority,
      title: `[${task.title}] 执行结果`,
      content,
      goalId: task.goalId,
      taskId: task.id,
    };

    this.notificationQueue.enqueue(notification);
  }

  /**
   * Build notification content with value information
   */
  private async buildNotificationContent(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): Promise<string> {
    const lines: string[] = [];

    // Get sub-goal info if available
    let subGoalName = '';
    if (task.subGoalId) {
      const subGoal = await this.subGoalStore.getSubGoal(task.subGoalId);
      if (subGoal) {
        // 获取子目标序号
        const subGoals = await this.subGoalStore.getSubGoalsByGoal(task.goalId);
        const index = subGoals.findIndex(sg => sg.id === task.subGoalId);
        const ordinal = index >= 0 ? `第${index + 1}个子目标` : '子目标';
        subGoalName = `${ordinal} - ${subGoal.name}`;
      }
    }

    // Task type label
    const typeLabels: Record<string, string> = {
      exploration: '信息收集',
      one_time: '单次任务',
      recurring: '周期任务',
      monitoring: '监控任务',
      event_triggered: '事件触发',
      interactive: '交互任务',
    };
    const taskTypeLabel = typeLabels[task.type] || task.type;

    // Task context header
    lines.push(`## ✅ ${task.title} - 执行完成`);
    lines.push('');

    // Sub-goal info
    if (subGoalName) {
      lines.push(`**子目标**: ${subGoalName}`);
    }

    // Task type and priority
    lines.push(`**任务类型**: ${taskTypeLabel} | **优先级**: ${task.priority}`);
    lines.push('');

    // Result output - format based on length and type
    lines.push('## 📤 执行结果');
    lines.push('');

    const output = result.output || '';
    const outputLength = output.length;

    if (outputLength === 0) {
      lines.push('任务已完成，无文本输出。');
    } else if (outputLength <= 500) {
      // Short result: display directly
      lines.push(this.formatOutput(output));
    } else {
      // Long result: show summary first, then truncated content
      // Try to extract a summary from the first meaningful content
      const summary = this.extractSummary(output);
      if (summary) {
        lines.push(`**摘要**: ${summary}`);
        lines.push('');
      }

      // Show truncated content
      const truncatedOutput = output.slice(0, 1500);
      lines.push('**详细内容**:');
      lines.push('```');
      lines.push(truncatedOutput);
      if (outputLength > 1500) {
        lines.push('');
        lines.push(`... (已截断，完整内容共 ${outputLength} 字符)`);
      }
      lines.push('```');
    }

    // Extract and display output files
    const outputFiles = this.extractOutputFiles(output);
    if (outputFiles.length > 0) {
      lines.push('');
      lines.push('## 📁 输出文件');
      lines.push('');
      for (const file of outputFiles) {
        lines.push(`- \`${file}\``);
      }
    }

    // Value assessment
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('📈 价值评估');
    lines.push('');
    lines.push(`- 相关度: ${Math.round(assessment.valueDimensions.relevance * 100)}%`);
    lines.push(`- 新颖度: ${Math.round(assessment.valueDimensions.novelty * 100)}%`);
    lines.push(`- 可操作性: ${Math.round(assessment.valueDimensions.actionability * 100)}%`);
    lines.push(`- **总体评分**: ${Math.round(assessment.valueScore * 100)}/100`);
    if (assessment.reasoning) {
      lines.push(`- ${assessment.reasoning}`);
    }

    return lines.join('\n');
  }

  /**
   * Format output for better readability
   */
  private formatOutput(output: string): string {
    // Try to parse as JSON for better formatting
    try {
      const parsed = JSON.parse(output);
      if (typeof parsed === 'object' && parsed !== null) {
        // Check if it's an array with tool call structures
        if (Array.isArray(parsed)) {
          const textParts: string[] = [];
          for (const item of parsed) {
            if (item.type === 'text' && item.text) {
              textParts.push(item.text);
            } else if (item.type === 'toolCall') {
              textParts.push(`[调用工具: ${item.name || 'unknown'}]`);
            }
          }
          if (textParts.length > 0) {
            return textParts.join('\n');
          }
        }
        // Return formatted JSON for other objects
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Not JSON, return as-is
    }
    return output;
  }

  /**
   * Extract a brief summary from output
   */
  private extractSummary(output: string): string {
    // Try to extract text from JSON structure
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        const textParts: string[] = [];
        for (const item of parsed) {
          if (item.type === 'text' && item.text) {
            textParts.push(item.text);
          }
        }
        if (textParts.length > 0) {
          const combined = textParts.join(' ');
          return combined.length > 200 ? combined.slice(0, 200) + '...' : combined;
        }
      }
    } catch {
      // Not JSON
    }

    // Extract first meaningful paragraph
    const firstParagraph = output.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length <= 200) {
      return firstParagraph;
    }

    // Truncate first 200 chars
    return output.slice(0, 200) + '...';
  }

  /**
   * Extract file paths from output text
   * Matches common patterns like:
   * - Saved to: /path/to/file
   * - File saved: /path/to/file
   * - Written to /path/to/file
   * - Created: /path/to/file
   */
  private extractOutputFiles(output: string): string[] {
    const files: string[] = [];

    // Common file path patterns
    const patterns = [
      /(?:saved? to|written to|created|输出到|保存到|写入)[:\s]*([\/\~][^\s\n]+\.[a-zA-Z0-9]+)/gi,
      /([\/\~][^\s\n]+\.(md|txt|json|csv|html|pdf|doc|docx|xlsx|py|js|ts|tsx|jsx))/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const filePath = match[1];
        // Avoid duplicates and very short paths
        if (filePath && filePath.length > 5 && !files.includes(filePath)) {
          files.push(filePath);
        }
      }
    }

    return files.slice(0, 5); // Limit to 5 files
  }

  /**
   * Enqueue notification for task result (legacy, used as fallback)
   */
  private async enqueueResultNotification(task: Task, result: ExecutionResult): Promise<void> {
    // Get sub-goal info
    let subGoalInfo = '';
    if (task.subGoalId) {
      const subGoal = await this.subGoalStore.getSubGoal(task.subGoalId);
      if (subGoal) {
        // 获取子目标序号
        const subGoals = await this.subGoalStore.getSubGoalsByGoal(task.goalId);
        const index = subGoals.findIndex(sg => sg.id === task.subGoalId);
        const ordinal = index >= 0 ? `第${index + 1}个子目标` : '子目标';
        subGoalInfo = `**子目标**: ${ordinal} - ${subGoal.name}\n\n`;
      }
    }

    // Extract output files
    const outputFiles = this.extractOutputFiles(result.output || '');
    const filesInfo = outputFiles.length > 0
      ? `\n\n**输出文件**:\n${outputFiles.map(f => `- \`${f}\``).join('\n')}`
      : '';

    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      type: 'report',
      priority: task.priority === 'critical' ? 'high' : 'medium',
      title: `Task completed: ${task.title}`,
      content: subGoalInfo + (result.output || 'Task completed successfully') + filesInfo,
      goalId: task.goalId,
      taskId: task.id,
    };

    this.notificationQueue.enqueue(notification);
  }

  /**
   * Handle user response to interactive task
   */
  async handleUserResponse(taskId: string, response: string): Promise<void> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'waiting_user') {
      throw new Error(`Task ${taskId} is not waiting for user input`);
    }

    // Store the collected information
    await this.taskStore.addCollectedInfo(taskId, {
      response,
      respondedAt: now(),
    });

    // Mark task as ready to continue
    await this.taskStore.updateStatus(taskId, 'ready');

    // Trigger a cycle to execute the task
    if (!this.running) {
      // If scheduler is stopped, just run this one task
      const unifiedTask: UnifiedTask = {
        id: task.id,
        type: task.type,
        goalId: task.goalId,
        priority: task.priority,
        status: 'ready',
        taskRef: { ...task, status: 'ready' },
      };
      await this.executeUnifiedTask(unifiedTask);
    }
  }

  /**
   * Manually trigger execution of a specific task
   */
  async triggerTask(taskId: string): Promise<void> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const unifiedTask: UnifiedTask = {
      id: task.id,
      type: task.type,
      goalId: task.goalId,
      priority: task.priority,
      status: 'ready',
      taskRef: task,
    };

    await this.executeUnifiedTask(unifiedTask);
  }

  /**
   * Check if task dependencies are met
   * Exposed for GoalOrchestrator to use
   */
  async checkDependencies(taskId: string): Promise<boolean> {
    return this.dependencyGraph.checkDependencies(taskId);
  }
}
