/**
 * Goal Store
 *
 * JSON-based goal persistence with support for goals, dimensions,
 * success criteria, and progress tracking.
 */
import { type Goal, type GoalStatus, type GoalProgress, type Dimension, type SuccessCriterion, type IGoalStore } from '../types';
/**
 * Goal Store implementation
 */
export declare class GoalStore implements IGoalStore {
    private baseDir;
    private cache;
    private dirty;
    constructor(baseDir?: string);
    /**
     * Initialize storage
     */
    init(): Promise<void>;
    /**
     * Get storage file path
     */
    private getStoragePath;
    /**
     * Load goals from disk
     */
    private loadFromDisk;
    /**
     * Save goals to disk
     */
    private saveToDisk;
    /**
     * Get a goal by ID
     */
    getGoal(goalId: string): Promise<Goal | null>;
    /**
     * Get all active goals
     */
    getActiveGoals(): Promise<Goal[]>;
    /**
     * Get all goals (including completed)
     */
    getAllGoals(): Promise<Goal[]>;
    /**
     * Get goals by status
     */
    getGoalsByStatus(status: GoalStatus): Promise<Goal[]>;
    /**
     * Create a new goal
     */
    createGoal(goalData: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal>;
    /**
     * Update a goal
     */
    updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal>;
    /**
     * Update goal progress
     */
    updateProgress(goalId: string, progress: GoalProgress): Promise<Goal>;
    /**
     * Add a dimension to a goal
     */
    addDimension(goalId: string, dimension: Omit<Dimension, 'id' | 'goalId' | 'createdAt'>): Promise<Goal>;
    /**
     * Update a dimension
     */
    updateDimension(goalId: string, dimensionId: string, updates: Partial<Dimension>): Promise<Goal>;
    /**
     * Add a success criterion to a goal
     */
    addSuccessCriterion(goalId: string, criterion: Omit<SuccessCriterion, 'id'>): Promise<Goal>;
    /**
     * Mark a success criterion as completed
     */
    markCriterionCompleted(goalId: string, criterionId: string): Promise<Goal>;
    /**
     * Delete a goal
     */
    deleteGoal(goalId: string): Promise<void>;
    /**
     * Search goals by title or description
     */
    searchGoals(query: string): Promise<Goal[]>;
    /**
     * Get goal statistics
     */
    getStats(): Promise<{
        total: number;
        byStatus: Record<GoalStatus, number>;
        withCompletedCriteria: number;
        averageCompletion: number;
    }>;
    /**
     * Clear all goals (for testing)
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=goal-store.d.ts.map