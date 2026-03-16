/**
 * Task Store
 *
 * JSON-based task persistence with file-based storage.
 * Structure: ~/.pi/agent/goal-driven/tasks/{goalId}/tasks.json
 */
import { type Task, type TaskStatus, type ExecutionRecord, type ExtractedInfo, type ITaskStore } from '../types';
/**
 * Task Store implementation
 */
export declare class TaskStore implements ITaskStore {
    private baseDir;
    private cache;
    private dirtyGoals;
    constructor(baseDir?: string);
    /**
     * Initialize storage directories
     */
    init(): Promise<void>;
    /**
     * Get the storage file path for a goal
     */
    private getStoragePath;
    /**
     * Ensure the goal directory exists
     */
    private ensureGoalDir;
    /**
     * Load tasks for a goal from disk
     */
    private loadGoalTasks;
    /**
     * Save tasks for a goal to disk
     */
    private saveGoalTasks;
    /**
     * Persist all dirty goals
     */
    flush(): Promise<void>;
    /**
     * Get a task by ID
     */
    getTask(taskId: string): Promise<Task | null>;
    /**
     * Get all tasks for a goal
     */
    getTasksByGoal(goalId: string): Promise<Task[]>;
    /**
     * Get all tasks across all goals
     */
    getAllTasks(): Promise<Task[]>;
    /**
     * Get tasks that are ready for execution
     */
    getReadyTasks(): Promise<Task[]>;
    /**
     * Get tasks waiting for user input
     */
    getWaitingUserTasks(): Promise<Task[]>;
    /**
     * Get tasks by type
     */
    getTasksByType(type: string): Promise<Task[]>;
    /**
     * Get tasks by status
     */
    getTasksByStatus(status: TaskStatus): Promise<Task[]>;
    /**
     * Create a new task
     */
    createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
    /**
     * Update a task
     */
    updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
    /**
     * Update task status
     */
    updateStatus(taskId: string, status: TaskStatus, metadata?: Record<string, unknown>): Promise<Task>;
    /**
     * Update next execution time for recurring tasks
     */
    updateNextExecution(taskId: string, nextExecutionAt: number): Promise<Task>;
    /**
     * Add an execution record to a task
     */
    addExecutionRecord(taskId: string, record: ExecutionRecord): Promise<Task>;
    /**
     * Add collected information to an interactive task
     */
    addCollectedInfo(taskId: string, info: ExtractedInfo): Promise<Task>;
    /**
     * Delete a task (soft delete by marking as cancelled)
     */
    deleteTask(taskId: string): Promise<void>;
    /**
     * Hard delete a task (use with caution)
     */
    hardDeleteTask(taskId: string): Promise<void>;
    /**
     * Get child tasks of a parent task
     */
    getChildTasks(parentTaskId: string): Promise<Task[]>;
    /**
     * Clear all tasks (for testing)
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=task-store.d.ts.map