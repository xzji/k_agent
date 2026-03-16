/**
 * SubGoal Store
 *
 * JSON-based sub-goal persistence with dependency management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type SubGoal,
  type SubGoalStatus,
  type SubGoalProgress,
  type ISubGoalStore,
} from '../types';
import { generateId, now, deepClone } from '../utils';

/**
 * Storage configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';

/**
 * SubGoal storage structure
 */
interface SubGoalStorage {
  subGoals: SubGoal[];
  version: number;
  lastUpdated: number;
}

/**
 * SubGoal Store implementation
 */
export class SubGoalStore implements ISubGoalStore {
  private baseDir: string;
  private cache: Map<string, SubGoal> = new Map();
  private dirty = false;

  constructor(baseDir: string = STORAGE_DIR) {
    this.baseDir = baseDir.replace('~', process.env.HOME || '');
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    const subGoalsDir = path.dirname(this.getStoragePath());
    await fs.mkdir(subGoalsDir, { recursive: true });
    await this.loadFromDisk();
  }

  /**
   * Get storage file path
   */
  private getStoragePath(): string {
    return path.join(this.baseDir, 'sub-goals', 'sub-goals.json');
  }

  /**
   * Load sub-goals from disk
   */
  private async loadFromDisk(): Promise<void> {
    const storagePath = this.getStoragePath();

    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      const storage: SubGoalStorage = JSON.parse(content);

      for (const subGoal of storage.subGoals) {
        this.cache.set(subGoal.id, subGoal);
      }

      console.log(`[SubGoalStore] Loaded ${this.cache.size} sub-goals`);
    } catch (error) {
      // File doesn't exist yet, start empty
      console.log('[SubGoalStore] Starting with empty sub-goals');
    }
  }

  /**
   * Save sub-goals to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.dirty) return;

    const storage: SubGoalStorage = {
      subGoals: Array.from(this.cache.values()),
      version: 1,
      lastUpdated: now(),
    };

    const storagePath = this.getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');

    this.dirty = false;
    console.log(`[SubGoalStore] Saved ${storage.subGoals.length} sub-goals`);
  }

  /**
   * Get a sub-goal by ID
   */
  async getSubGoal(subGoalId: string): Promise<SubGoal | null> {
    const subGoal = this.cache.get(subGoalId);
    return subGoal ? deepClone(subGoal) : null;
  }

  /**
   * Get all sub-goals for a goal
   */
  async getSubGoalsByGoal(goalId: string): Promise<SubGoal[]> {
    const subGoals = Array.from(this.cache.values())
      .filter((sg) => sg.goalId === goalId)
      .sort((a, b) => {
        // Sort by priority weight, then by creation time
        const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (weightDiff !== 0) return weightDiff;
        return a.createdAt - b.createdAt;
      });

    return deepClone(subGoals);
  }

  /**
   * Get sub-goals by status
   */
  async getSubGoalsByStatus(status: SubGoalStatus): Promise<SubGoal[]> {
    const subGoals = Array.from(this.cache.values())
      .filter((sg) => sg.status === status)
      .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

    return deepClone(subGoals);
  }

  /**
   * Create a new sub-goal
   */
  async createSubGoal(
    subGoalData: Omit<SubGoal, 'id' | 'createdAt'>
  ): Promise<SubGoal> {
    const subGoal: SubGoal = {
      ...subGoalData,
      id: `sg-${generateId().slice(0, 8)}`,
      createdAt: now(),
      updatedAt: now(),
    };

    this.cache.set(subGoal.id, subGoal);
    this.dirty = true;

    await this.saveToDisk();

    return deepClone(subGoal);
  }

  /**
   * Update a sub-goal
   */
  async updateSubGoal(
    subGoalId: string,
    updates: Partial<SubGoal>
  ): Promise<SubGoal> {
    const subGoal = await this.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const updatedSubGoal: SubGoal = {
      ...subGoal,
      ...updates,
      id: subGoalId,
      goalId: subGoal.goalId,
      createdAt: subGoal.createdAt,
      updatedAt: now(),
    };

    this.cache.set(subGoalId, updatedSubGoal);
    this.dirty = true;

    await this.saveToDisk();

    return deepClone(updatedSubGoal);
  }

  /**
   * Delete a sub-goal
   */
  async deleteSubGoal(subGoalId: string): Promise<void> {
    this.cache.delete(subGoalId);
    this.dirty = true;
    await this.saveToDisk();
  }

  /**
   * Add a task to a sub-goal
   */
  async addTaskToSubGoal(subGoalId: string, taskId: string): Promise<SubGoal> {
    const subGoal = await this.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    if (subGoal.taskIds.includes(taskId)) {
      return deepClone(subGoal); // Already exists
    }

    const updatedTaskIds = [...subGoal.taskIds, taskId];
    return this.updateSubGoal(subGoalId, { taskIds: updatedTaskIds });
  }

  /**
   * Remove a task from a sub-goal
   */
  async removeTaskFromSubGoal(subGoalId: string, taskId: string): Promise<SubGoal> {
    const subGoal = await this.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const updatedTaskIds = subGoal.taskIds.filter((id) => id !== taskId);
    return this.updateSubGoal(subGoalId, { taskIds: updatedTaskIds });
  }

  /**
   * Update sub-goal progress
   */
  async updateProgress(
    subGoalId: string,
    progress: SubGoalProgress
  ): Promise<SubGoal> {
    const subGoal = await this.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    // Auto-update status based on progress
    let status = subGoal.status;
    if (progress.percentage >= 100) {
      status = 'completed';
    } else if (progress.percentage > 0 && status === 'pending') {
      status = 'active';
    }

    return this.updateSubGoal(subGoalId, {
      status: status as SubGoalStatus,
    });
  }

  /**
   * Check if sub-goal dependencies are satisfied
   */
  async checkDependencies(subGoalId: string): Promise<{
    satisfied: boolean;
    blockingSubGoalIds: string[];
  }> {
    const subGoal = await this.getSubGoal(subGoalId);
    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    const blockingSubGoalIds: string[] = [];

    for (const depId of subGoal.dependencies) {
      const dep = await this.getSubGoal(depId);
      if (!dep || dep.status !== 'completed') {
        blockingSubGoalIds.push(depId);
      }
    }

    return {
      satisfied: blockingSubGoalIds.length === 0,
      blockingSubGoalIds,
    };
  }

  /**
   * Batch create sub-goals
   */
  async batchCreate(
    subGoalsData: Array<Omit<SubGoal, 'id' | 'createdAt'>>
  ): Promise<SubGoal[]> {
    const created: SubGoal[] = [];

    for (const data of subGoalsData) {
      const subGoal = await this.createSubGoal(data);
      created.push(subGoal);
    }

    return created;
  }

  /**
   * Clear all sub-goals (for testing)
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.dirty = false;

    const storagePath = this.getStoragePath();
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      // File doesn't exist
    }
  }

  /**
   * Get sub-goal statistics for a goal
   */
  async getStats(goalId: string): Promise<{
    total: number;
    byStatus: Record<SubGoalStatus, number>;
    completedWeight: number;
    totalWeight: number;
  }> {
    const subGoals = await this.getSubGoalsByGoal(goalId);

    const byStatus: Record<SubGoalStatus, number> = {
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    let completedWeight = 0;
    let totalWeight = 0;

    for (const sg of subGoals) {
      byStatus[sg.status]++;
      totalWeight += sg.weight;
      if (sg.status === 'completed') {
        completedWeight += sg.weight;
      }
    }

    return {
      total: subGoals.length,
      byStatus,
      completedWeight,
      totalWeight,
    };
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
