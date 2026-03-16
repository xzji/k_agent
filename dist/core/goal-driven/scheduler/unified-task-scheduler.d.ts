/**
 * Unified Task Scheduler
 *
 * This is the core scheduling component that merges BackgroundLoop (dimension exploration)
 * with TaskScheduler (structured task management). It provides a unified interface for
 * scheduling all types of tasks: exploration, recurring, one-time, monitoring, event-triggered,
 * and interactive tasks.
 */
import { type Task, type SchedulerConfig, type ExecutionResult, type ITaskStore, type IGoalStore, type INotificationQueue, type IKnowledgeStore } from '../types';
import { TaskDependencyGraph } from '../task/task-dependency';
import { ValueAssessor } from '../output-layer/value-assessor';
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
        quietHours?: {
            start: number;
            end: number;
        };
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
export declare class UnifiedTaskScheduler {
    private config;
    private taskStore;
    private goalStore;
    private knowledgeStore;
    private notificationQueue;
    private dependencyGraph;
    private executionPipeline;
    private idleDetector;
    private userProfile;
    private valueAssessor;
    private running;
    private loopTimer;
    private runningTasks;
    private semaphore;
    private stats;
    constructor(taskStore: ITaskStore, goalStore: IGoalStore, knowledgeStore: IKnowledgeStore, notificationQueue: INotificationQueue, dependencyGraph: TaskDependencyGraph, executionPipeline: ExecutionPipeline, idleDetector: IdleDetector, userProfile: UserProfile, valueAssessor: ValueAssessor, config?: Partial<SchedulerConfig>);
    /**
     * Start the scheduler loop
     */
    start(): Promise<void>;
    /**
     * Stop the scheduler loop
     */
    stop(): Promise<void>;
    /**
     * Check if the scheduler is running
     */
    isRunning(): boolean;
    /**
     * Get scheduler statistics
     */
    getStats(): typeof this.stats;
    /**
     * Schedule the next cycle
     */
    private scheduleNextCycle;
    /**
     * Run a single scheduling cycle
     */
    private runCycle;
    /**
     * Get all ready tasks from both exploration and structured task sources
     */
    private getReadyTasks;
    /**
     * Get exploration tasks from active goals' dimensions
     */
    private getExplorationTasks;
    /**
     * Get ready structured tasks from TaskStore
     */
    private getStructuredReadyTasks;
    /**
     * Get pending dimensions from a goal
     */
    private getPendingDimensions;
    /**
     * Calculate priority for a dimension
     */
    private calculateDimPriority;
    /**
     * Update statuses of blocked tasks
     */
    private updateBlockedTaskStatuses;
    /**
     * Filter tasks that are good to execute now (considering user state)
     */
    private filterExecutableTasks;
    /**
     * Check if it's a good time to execute a task
     */
    private isGoodTimeToExecute;
    /**
     * Check if currently in quiet hours
     */
    private isInQuietHours;
    /**
     * Check if it's digest time
     */
    private isDigestTime;
    /**
     * Sort tasks by priority (highest first)
     */
    private prioritizeTasks;
    /**
     * Execute tasks with concurrency control
     */
    private executeWithConcurrency;
    /**
     * Execute tasks sequentially
     */
    private executeSequential;
    /**
     * Execute a unified task
     */
    private executeUnifiedTask;
    /**
     * Run task with proper state management
     */
    private runTaskWithState;
    /**
     * Execute task based on its type
     */
    private executeByType;
    /**
     * Create an exploration task from unified task
     */
    private createExplorationTask;
    /**
     * Execute exploration task
     */
    private executeExplorationTask;
    /**
     * Execute recurring task
     */
    private executeRecurringTask;
    /**
     * Execute one-time task
     */
    private executeOneTimeTask;
    /**
     * Execute interactive task
     */
    private executeInteractiveTask;
    /**
     * Execute monitoring task
     */
    private executeMonitoringTask;
    /**
     * Execute event-triggered task
     */
    private executeEventTriggeredTask;
    /**
     * Generate variation for recurring tasks
     */
    private generateVariation;
    /**
     * Adjust difficulty based on historical performance
     */
    private adjustDifficulty;
    /**
     * Schedule next execution for recurring tasks
     */
    private scheduleNextExecution;
    /**
     * Handle adaptive adjustments after task execution
     */
    private handleAdaptiveAdjustments;
    /**
     * Assess value and enqueue smart notification
     */
    private assessAndNotify;
    /**
     * Wait for user to become idle
     */
    private waitForUserIdle;
    /**
     * Enqueue value-based notification
     */
    private enqueueValueBasedNotification;
    /**
     * Build notification content with value information
     */
    private buildNotificationContent;
    /**
     * Enqueue notification for task result (legacy, used as fallback)
     */
    private enqueueResultNotification;
    /**
     * Handle user response to interactive task
     */
    handleUserResponse(taskId: string, response: string): Promise<void>;
    /**
     * Manually trigger execution of a specific task
     */
    triggerTask(taskId: string): Promise<void>;
}
export {};
//# sourceMappingURL=unified-task-scheduler.d.ts.map