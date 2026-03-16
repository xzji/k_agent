/**
 * SubGoal Store
 *
 * JSON-based sub-goal persistence with dependency management
 */
import { type SubGoal, type SubGoalStatus, type SubGoalProgress, type ISubGoalStore } from '../types';
/**
 * SubGoal Store implementation
 */
export declare class SubGoalStore implements ISubGoalStore {
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
     * Load sub-goals from disk
     */
    private loadFromDisk;
    /**
     * Save sub-goals to disk
     */
    private saveToDisk;
    /**
     * Get a sub-goal by ID
     */
    getSubGoal(subGoalId: string): Promise<SubGoal | null>;
    /**
     * Get all sub-goals for a goal
     */
    getSubGoalsByGoal(goalId: string): Promise<SubGoal[]>;
    /**
     * Get sub-goals by status
     */
    getSubGoalsByStatus(status: SubGoalStatus): Promise<SubGoal[]>;
    /**
     * Create a new sub-goal
     */
    createSubGoal(subGoalData: Omit<SubGoal, 'id' | 'createdAt'>): Promise<SubGoal>;
    /**
     * Update a sub-goal
     */
    updateSubGoal(subGoalId: string, updates: Partial<SubGoal>): Promise<SubGoal>;
    /**
     * Delete a sub-goal
     */
    deleteSubGoal(subGoalId: string): Promise<void>;
    /**
     * Add a task to a sub-goal
     */
    addTaskToSubGoal(subGoalId: string, taskId: string): Promise<SubGoal>;
    /**
     * Remove a task from a sub-goal
     */
    removeTaskFromSubGoal(subGoalId: string, taskId: string): Promise<SubGoal>;
    /**
     * Update sub-goal progress
     */
    updateProgress(subGoalId: string, progress: SubGoalProgress): Promise<SubGoal>;
    /**
     * Check if sub-goal dependencies are satisfied
     */
    checkDependencies(subGoalId: string): Promise<{
        satisfied: boolean;
        blockingSubGoalIds: string[];
    }>;
    /**
     * Batch create sub-goals
     */
    batchCreate(subGoalsData: Array<Omit<SubGoal, 'id' | 'createdAt'>>): Promise<SubGoal[]>;
    /**
     * Clear all sub-goals (for testing)
     */
    clearAll(): Promise<void>;
    /**
     * Get sub-goal statistics for a goal
     */
    getStats(goalId: string): Promise<{
        total: number;
        byStatus: Record<SubGoalStatus, number>;
        completedWeight: number;
        totalWeight: number;
    }>;
}
//# sourceMappingURL=sub-goal-store.d.ts.map