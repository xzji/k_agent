/**
 * Task Store
 *
 * JSON-based task persistence with file-based storage.
 * Structure: ~/.pi/agent/goal-driven/tasks/{goalId}/tasks.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { type Task, type TaskStatus, type ExecutionRecord, type ExtractedInfo, type ITaskStore } from '../types';
import { generateId, now, deepClone } from '../utils';

/**
 * Storage paths configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';

/**
 * Task storage structure
 */
interface TaskStorage {
  tasks: Task[];
  version: number;
  lastUpdated: number;
}

/**
 * Task Store implementation
 */
export class TaskStore implements ITaskStore {
  private baseDir: string;
  private cache: Map<string, Task> = new Map();
  private dirtyGoals: Set<string> = new Set();

  constructor(baseDir: string = STORAGE_DIR) {
    this.baseDir = baseDir.replace('~', process.env.HOME || '');
  }

  /**
   * Initialize storage directories
   */
  async init(): Promise<void> {
    const tasksDir = path.join(this.baseDir, 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });
  }

  /**
   * Get the storage file path for a goal
   */
  private getStoragePath(goalId: string): string {
    return path.join(this.baseDir, 'tasks', goalId, 'tasks.json');
  }

  /**
   * Ensure the goal directory exists
   */
  private async ensureGoalDir(goalId: string): Promise<void> {
    const goalDir = path.join(this.baseDir, 'tasks', goalId);
    await fs.mkdir(goalDir, { recursive: true });
  }

  /**
   * Load tasks for a goal from disk
   */
  private async loadGoalTasks(goalId: string): Promise<Task[]> {
    // Check cache first
    const cached = Array.from(this.cache.values()).filter((t) => t.goalId === goalId);
    if (cached.length > 0) {
      return cached;
    }

    const storagePath = this.getStoragePath(goalId);

    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      const storage: TaskStorage = JSON.parse(content);

      // Populate cache
      for (const task of storage.tasks) {
        this.cache.set(task.id, task);
      }

      return storage.tasks;
    } catch (error) {
      // File doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Save tasks for a goal to disk
   */
  private async saveGoalTasks(goalId: string): Promise<void> {
    const tasks = Array.from(this.cache.values())
      .filter((t) => t.goalId === goalId)
      .sort((a, b) => a.createdAt - b.createdAt);

    const storage: TaskStorage = {
      tasks,
      version: 1,
      lastUpdated: now(),
    };

    await this.ensureGoalDir(goalId);
    const storagePath = this.getStoragePath(goalId);
    await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');

    this.dirtyGoals.delete(goalId);
  }

  /**
   * Persist all dirty goals
   */
  async flush(): Promise<void> {
    const promises = Array.from(this.dirtyGoals).map((goalId) =>
      this.saveGoalTasks(goalId)
    );
    await Promise.all(promises);
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    // Check cache first
    if (this.cache.has(taskId)) {
      return deepClone(this.cache.get(taskId)!);
    }

    // Need to search all goals (inefficient but rare)
    const tasksDir = path.join(this.baseDir, 'tasks');

    try {
      const goalDirs = await fs.readdir(tasksDir);

      for (const goalId of goalDirs) {
        const tasks = await this.loadGoalTasks(goalId);
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          return deepClone(task);
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }

    return null;
  }

  /**
   * Get all tasks for a goal
   */
  async getTasksByGoal(goalId: string): Promise<Task[]> {
    const tasks = await this.loadGoalTasks(goalId);
    return deepClone(tasks);
  }

  /**
   * Get all tasks across all goals
   */
  async getAllTasks(): Promise<Task[]> {
    const tasksDir = path.join(this.baseDir, 'tasks');
    const allTasks: Task[] = [];

    try {
      const goalDirs = await fs.readdir(tasksDir);

      for (const goalId of goalDirs) {
        const tasks = await this.loadGoalTasks(goalId);
        allTasks.push(...tasks);
      }
    } catch (error) {
      // Directory doesn't exist
    }

    return deepClone(allTasks);
  }

  /**
   * Get tasks that are ready for execution
   */
  async getReadyTasks(): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    const nowTime = now();

    return allTasks.filter((task) => {
      // Must be pending or ready status
      if (!['pending', 'ready'].includes(task.status)) {
        return false;
      }

      // Check if it's time to execute
      if (task.nextExecutionAt && task.nextExecutionAt > nowTime) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get tasks waiting for user input
   */
  async getWaitingUserTasks(): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    return deepClone(allTasks.filter((t) => t.status === 'waiting_user'));
  }

  /**
   * Get tasks by type
   */
  async getTasksByType(type: string): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    return deepClone(allTasks.filter((t) => t.type === type));
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    return deepClone(allTasks.filter((t) => t.status === status));
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: generateId(),
      createdAt: now(),
      // Set defaults for new required fields
      hierarchyLevel: taskData.hierarchyLevel || 'task',
      expectedResult: taskData.expectedResult || {
        type: 'information',
        description: '任务执行结果',
        format: 'text',
      },
      executionHistory: taskData.executionHistory || [],
      relatedKnowledgeIds: taskData.relatedKnowledgeIds || [],
      dependencies: taskData.dependencies || [],
    };

    // Set initial status based on dependencies
    if (task.dependencies.length > 0) {
      task.status = 'blocked';
    }

    this.cache.set(task.id, task);
    this.dirtyGoals.add(task.goalId);

    // Auto-save
    await this.saveGoalTasks(task.goalId);

    return deepClone(task);
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: taskId, // Ensure ID doesn't change
      goalId: task.goalId, // Ensure goalId doesn't change
      createdAt: task.createdAt, // Ensure createdAt doesn't change
      updatedAt: now(),
    };

    this.cache.set(taskId, updatedTask);
    this.dirtyGoals.add(task.goalId);

    await this.saveGoalTasks(task.goalId);

    return deepClone(updatedTask);
  }

  /**
   * Update task status
   */
  async updateStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, unknown>
  ): Promise<Task> {
    const updates: Partial<Task> = {
      status,
      ...metadata,
    };

    // Update lastExecutedAt when starting execution
    if (status === 'in_progress') {
      updates.lastExecutedAt = now();
    }

    return this.updateTask(taskId, updates);
  }

  /**
   * Update next execution time for recurring tasks
   */
  async updateNextExecution(taskId: string, nextExecutionAt: number): Promise<Task> {
    return this.updateTask(taskId, { nextExecutionAt });
  }

  /**
   * Add an execution record to a task
   */
  async addExecutionRecord(taskId: string, record: ExecutionRecord): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const executionHistory = [...task.executionHistory, record];

    return this.updateTask(taskId, { executionHistory });
  }

  /**
   * Add collected information to an interactive task
   */
  async addCollectedInfo(taskId: string, info: ExtractedInfo): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const collectedInfo = {
      ...(task.collectedInfo || {}),
      ...info,
    };

    return this.updateTask(taskId, { collectedInfo });
  }

  /**
   * Delete a task (soft delete by marking as cancelled)
   */
  async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      return;
    }

    await this.updateStatus(taskId, 'cancelled', {
      cancelledAt: now(),
    });
  }

  /**
   * Hard delete a task (use with caution)
   */
  async hardDeleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      return;
    }

    this.cache.delete(taskId);
    this.dirtyGoals.add(task.goalId);

    await this.saveGoalTasks(task.goalId);
  }

  /**
   * Get child tasks of a parent task
   */
  async getChildTasks(parentTaskId: string): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    return deepClone(allTasks.filter((t) => t.parentTaskId === parentTaskId));
  }

  /**
   * Clear all tasks (for testing)
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.dirtyGoals.clear();

    const tasksDir = path.join(this.baseDir, 'tasks');
    try {
      await fs.rm(tasksDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  }
}
