/**
 * Goal Store
 *
 * JSON-based goal persistence with support for goals, dimensions,
 * success criteria, and progress tracking.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type Goal,
  type GoalStatus,
  type GoalProgress,
  type Dimension,
  type SuccessCriterion,
  type IGoalStore,
} from '../types';
import { generateId, now, deepClone } from '../utils';

/**
 * Storage configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';

/**
 * Goal storage structure
 */
interface GoalStorage {
  goals: Goal[];
  version: number;
  lastUpdated: number;
}

/**
 * Goal Store implementation
 */
export class GoalStore implements IGoalStore {
  private baseDir: string;
  private cache: Map<string, Goal> = new Map();
  private dirty = false;

  constructor(baseDir: string = STORAGE_DIR) {
    this.baseDir = baseDir.replace('~', process.env.HOME || '');
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    const goalsDir = path.dirname(this.getStoragePath());
    await fs.mkdir(goalsDir, { recursive: true });
    await this.loadFromDisk();
  }

  /**
   * Get storage file path
   */
  private getStoragePath(): string {
    return path.join(this.baseDir, 'goals', 'goals.json');
  }

  /**
   * Load goals from disk
   */
  private async loadFromDisk(): Promise<void> {
    const storagePath = this.getStoragePath();

    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      const storage: GoalStorage = JSON.parse(content);

      for (const goal of storage.goals) {
        this.cache.set(goal.id, goal);
      }

      console.log(`[GoalStore] Loaded ${this.cache.size} goals`);
    } catch (error) {
      // File doesn't exist yet, start empty
      console.log('[GoalStore] Starting with empty goals');
    }
  }

  /**
   * Save goals to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.dirty) return;

    const storage: GoalStorage = {
      goals: Array.from(this.cache.values()),
      version: 1,
      lastUpdated: now(),
    };

    const storagePath = this.getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');

    this.dirty = false;
    console.log(`[GoalStore] Saved ${storage.goals.length} goals`);
  }

  /**
   * Get a goal by ID
   */
  async getGoal(goalId: string): Promise<Goal | null> {
    const goal = this.cache.get(goalId);
    return goal ? deepClone(goal) : null;
  }

  /**
   * Find a goal by ID prefix (supports 8-char truncated ID)
   * @throws Error if multiple goals match the prefix
   */
  async findGoalByPrefix(prefix: string): Promise<Goal | null> {
    const goals = await this.getAllGoals();

    // Exact match first
    const exact = goals.find((g) => g.id === prefix);
    if (exact) return exact;

    // Prefix match
    const matches = goals.filter((g) => g.id.startsWith(prefix));

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      throw new Error(
        `Multiple goals match "${prefix}". Please use full ID:\n` +
          matches.map((g) => `  ${g.id} - ${g.title}`).join('\n')
      );
    }

    return matches[0];
  }

  /**
   * Get all active goals
   */
  async getActiveGoals(): Promise<Goal[]> {
    const goals = Array.from(this.cache.values())
      .filter((g) => g.status === 'active' || g.status === 'gathering_info' || g.status === 'planning')
      .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

    return deepClone(goals);
  }

  /**
   * Get all goals (including completed)
   */
  async getAllGoals(): Promise<Goal[]> {
    const goals = Array.from(this.cache.values())
      .sort((a, b) => b.createdAt - a.createdAt);

    return deepClone(goals);
  }

  /**
   * Get goals by status
   */
  async getGoalsByStatus(status: GoalStatus): Promise<Goal[]> {
    const goals = Array.from(this.cache.values())
      .filter((g) => g.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);

    return deepClone(goals);
  }

  /**
   * Create a new goal
   */
  async createGoal(
    goalData: Omit<Goal, 'id' | 'createdAt'>
  ): Promise<Goal> {
    const goal: Goal = {
      ...goalData,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };

    this.cache.set(goal.id, goal);
    this.dirty = true;

    await this.saveToDisk();

    return deepClone(goal);
  }

  /**
   * Update a goal
   */
  async updateGoal(
    goalId: string,
    updates: Partial<Goal>
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const updatedGoal: Goal = {
      ...goal,
      ...updates,
      id: goalId,
      createdAt: goal.createdAt,
      updatedAt: now(),
    };

    this.cache.set(goalId, updatedGoal);
    this.dirty = true;

    await this.saveToDisk();

    return deepClone(updatedGoal);
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    goalId: string,
    progress: GoalProgress
  ): Promise<Goal> {
    return this.updateGoal(goalId, { progress });
  }

  /**
   * Add a dimension to a goal
   */
  async addDimension(
    goalId: string,
    dimension: Omit<Dimension, 'id' | 'goalId' | 'createdAt'>
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const newDimension: Dimension = {
      ...dimension,
      id: `dim-${generateId().slice(0, 8)}`,
      goalId,
      createdAt: now(),
    };

    const updatedDimensions = [...goal.dimensions, newDimension];

    return this.updateGoal(goalId, { dimensions: updatedDimensions });
  }

  /**
   * Update a dimension
   */
  async updateDimension(
    goalId: string,
    dimensionId: string,
    updates: Partial<Dimension>
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const updatedDimensions = goal.dimensions.map((d) =>
      d.id === dimensionId ? { ...d, ...updates, updatedAt: now() } : d
    );

    return this.updateGoal(goalId, { dimensions: updatedDimensions });
  }

  /**
   * Add a success criterion to a goal
   */
  async addSuccessCriterion(
    goalId: string,
    criterion: Omit<SuccessCriterion, 'id'>
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const newCriterion: SuccessCriterion = {
      ...criterion,
      id: `sc-${generateId().slice(0, 8)}`,
    };

    const updatedCriteria = [...goal.successCriteria, newCriterion];

    // Recalculate progress
    const completedCount = updatedCriteria.filter((c) => c.completed).length;
    const progress: GoalProgress = {
      completedCriteria: completedCount,
      totalCriteria: updatedCriteria.length,
      percentage: Math.round((completedCount / updatedCriteria.length) * 100),
    };

    return this.updateGoal(goalId, {
      successCriteria: updatedCriteria,
      progress,
    });
  }

  /**
   * Mark a success criterion as completed
   */
  async markCriterionCompleted(
    goalId: string,
    criterionId: string
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const updatedCriteria = goal.successCriteria.map((c) =>
      c.id === criterionId
        ? { ...c, completed: true, completedAt: now() }
        : c
    );

    // Recalculate progress
    const completedCount = updatedCriteria.filter((c) => c.completed).length;
    const progress: GoalProgress = {
      completedCriteria: completedCount,
      totalCriteria: updatedCriteria.length,
      percentage: Math.round((completedCount / updatedCriteria.length) * 100),
    };

    return this.updateGoal(goalId, {
      successCriteria: updatedCriteria,
      progress,
    });
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    this.cache.delete(goalId);
    this.dirty = true;
    await this.saveToDisk();
  }

  /**
   * Search goals by title or description
   */
  async searchGoals(query: string): Promise<Goal[]> {
    const lowerQuery = query.toLowerCase();
    const goals = Array.from(this.cache.values()).filter(
      (g) =>
        g.title.toLowerCase().includes(lowerQuery) ||
        (g.description && g.description.toLowerCase().includes(lowerQuery))
    );

    return deepClone(goals);
  }

  /**
   * Get goal statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<GoalStatus, number>;
    withCompletedCriteria: number;
    averageCompletion: number;
  }> {
    const goals = Array.from(this.cache.values());

    const byStatus: Record<string, number> = {
      gathering_info: 0,
      planning: 0,
      active: 0,
      paused: 0,
      completed: 0,
    };

    let totalCompletion = 0;
    let withCompletedCriteria = 0;

    for (const goal of goals) {
      byStatus[goal.status]++;
      totalCompletion += goal.progress.percentage;

      if (goal.progress.completedCriteria > 0) {
        withCompletedCriteria++;
      }
    }

    return {
      total: goals.length,
      byStatus: byStatus as Record<GoalStatus, number>,
      withCompletedCriteria,
      averageCompletion: goals.length > 0
        ? Math.round(totalCompletion / goals.length)
        : 0,
    };
  }

  /**
   * Clear all goals (for testing)
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
