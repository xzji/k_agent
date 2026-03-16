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
} from '../types';
import { TaskDependencyGraph } from '../task/task-dependency';
import { ValueAssessor, type ValueAssessment } from '../output-layer/value-assessor';
import { Semaphore, getPriorityWeight, now, sleep } from '../utils';

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
  private knowledgeStore: IKnowledgeStore;
  private notificationQueue: INotificationQueue;
  private dependencyGraph: TaskDependencyGraph;
  private executionPipeline: ExecutionPipeline;
  private idleDetector: IdleDetector;
  private userProfile: UserProfile;
  private valueAssessor: ValueAssessor;

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

  constructor(
    taskStore: ITaskStore,
    goalStore: IGoalStore,
    knowledgeStore: IKnowledgeStore,
    notificationQueue: INotificationQueue,
    dependencyGraph: TaskDependencyGraph,
    executionPipeline: ExecutionPipeline,
    idleDetector: IdleDetector,
    userProfile: UserProfile,
    valueAssessor: ValueAssessor,
    config?: Partial<SchedulerConfig>
  ) {
    this.taskStore = taskStore;
    this.goalStore = goalStore;
    this.knowledgeStore = knowledgeStore;
    this.notificationQueue = notificationQueue;
    this.dependencyGraph = dependencyGraph;
    this.executionPipeline = executionPipeline;
    this.idleDetector = idleDetector;
    this.userProfile = userProfile;
    this.valueAssessor = valueAssessor;

    this.config = {
      maxConcurrent: 3,
      defaultPriority: 'medium',
      cycleIntervalMs: 60000,
      enableConcurrency: true,
      ...config,
    };

    this.semaphore = new Semaphore(this.config.maxConcurrent);
  }

  /**
   * Start the scheduler loop
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[Scheduler] Already running');
      return;
    }

    this.running = true;
    console.log('[Scheduler] Started');

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

    // Wait for running tasks to complete
    if (this.runningTasks.size > 0) {
      console.log(`[Scheduler] Waiting for ${this.runningTasks.size} tasks to complete...`);
      await Promise.all(this.runningTasks.values());
    }

    console.log('[Scheduler] Stopped');
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
      this.runCycle().catch((error) => {
        console.error('[Scheduler] Cycle error:', error);
      });
    }, delayMs);
  }

  /**
   * Run a single scheduling cycle
   */
  private async runCycle(): Promise<void> {
    if (!this.running) return;

    console.log('[Scheduler] Running cycle...');
    const cycleStart = now();

    try {
      // 1. Get all ready tasks (including dimension exploration and structured tasks)
      const readyTasks = await this.getReadyTasks();
      console.log(`[Scheduler] Found ${readyTasks.length} ready tasks`);

      // 2. Update task statuses based on dependencies
      await this.updateBlockedTaskStatuses();

      // 3. Re-fetch ready tasks after status updates
      const updatedReadyTasks = await this.getReadyTasks();

      // 4. Filter tasks that are good to execute now
      const executableTasks = await this.filterExecutableTasks(updatedReadyTasks);

      // 5. Sort by priority
      const prioritized = this.prioritizeTasks(executableTasks);

      // 6. Execute tasks (with concurrency control if enabled)
      const tasksToExecute = prioritized.slice(0, this.config.maxConcurrent * 2);

      if (this.config.enableConcurrency) {
        await this.executeWithConcurrency(tasksToExecute);
      } else {
        await this.executeSequential(tasksToExecute);
      }

      // Update stats
      this.stats.cyclesCompleted++;
      this.stats.lastCycleAt = cycleStart;

    } catch (error) {
      console.error('[Scheduler] Error in cycle:', error);
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
      console.log(`[Scheduler] Task ${unifiedTask.id} already running`);
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
    console.log(`[Scheduler] Executing task: ${unifiedTask.id} (${unifiedTask.type})`);
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

      // Execute based on task type
      const result = await this.executeByType(task, unifiedTask.type);

      // Update task status based on result
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
      console.error(`[Scheduler] Task ${unifiedTask.id} failed:`, error);
      this.stats.tasksFailed++;

      // Update task status to failed
      if (unifiedTask.taskRef) {
        await this.taskStore.updateStatus(unifiedTask.taskRef.id, 'failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duration = now() - startTime;
    console.log(`[Scheduler] Task ${unifiedTask.id} completed in ${duration}ms`);
  }

  /**
   * Execute task based on its type
   */
  private async executeByType(task: Task, type: TaskType): Promise<ExecutionResult> {
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

      // Log assessment
      console.log(
        `[Scheduler] Task ${task.id} value score: ${assessment.valueScore}, notify: ${assessment.shouldNotify}`
      );

      // Only notify if valuable
      if (assessment.shouldNotify) {
        // Wait for user idle before sending notification
        const isIdle = await this.waitForUserIdle(300000); // 5 minute timeout

        if (isIdle || task.priority === 'critical') {
          this.enqueueValueBasedNotification(task, result, assessment);
        } else {
          // User not idle, delay notification
          console.log(`[Scheduler] Delaying notification for task ${task.id} - user not idle`);
          // Could implement delayed notification queue here
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Error assessing value for task ${task.id}:`, error);
      // Fallback to simple notification
      this.enqueueResultNotification(task, result);
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
  private enqueueValueBasedNotification(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): void {
    const goal = this.goalStore.getGoal(task.goalId);

    // Build notification content with value context
    const content = this.buildNotificationContent(task, result, assessment);

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
  private buildNotificationContent(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): string {
    const lines: string[] = [];

    // Result output
    lines.push('## 执行结果');
    lines.push(result.output?.slice(0, 1500) || '无输出');
    if ((result.output?.length || 0) > 1500) {
      lines.push('... (内容已截断)');
    }

    // Value context
    lines.push('\n## 价值评估');
    lines.push(`- 相关度: ${Math.round(assessment.valueDimensions.relevance * 100)}%`);
    lines.push(`- 新颖度: ${Math.round(assessment.valueDimensions.novelty * 100)}%`);
    lines.push(`- 可操作性: ${Math.round(assessment.valueDimensions.actionability * 100)}%`);
    lines.push(`\n**总体评分: ${Math.round(assessment.valueScore * 100)}/100**`);

    // Reasoning
    if (assessment.reasoning) {
      lines.push(`\n*${assessment.reasoning}*`);
    }

    return lines.join('\n');
  }

  /**
   * Enqueue notification for task result (legacy, used as fallback)
   */
  private enqueueResultNotification(task: Task, result: ExecutionResult): void {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      type: 'report',
      priority: task.priority === 'critical' ? 'high' : 'medium',
      title: `Task completed: ${task.title}`,
      content: result.output || 'Task completed successfully',
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
}
