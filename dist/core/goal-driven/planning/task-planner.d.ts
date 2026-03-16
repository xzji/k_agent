/**
 * Task Planner
 *
 * 负责任务的规划、生成、Review和调整
 * - 为SubGoal生成Task
 * - 任务Review（判断与目标的对齐度）
 * - 任务调整（优先级、周期等）
 */
import { type Task, type TaskHierarchyLevel, type ITaskStore, type ISubGoalStore } from '../types';
/**
 * Task review result
 */
export interface TaskReviewResult {
    taskId: string;
    goalContribution: 'critical' | 'high' | 'medium' | 'low';
    subGoalContribution: 'critical' | 'high' | 'medium' | 'low';
    reasoning: string;
    aligned: boolean;
    suggestions?: string[];
}
/**
 * Task generation options
 */
export interface TaskGenerationOptions {
    confirmFrequency?: boolean;
    maxTasks?: number;
    defaultHierarchyLevel?: TaskHierarchyLevel;
}
/**
 * LLM Channel interface
 */
interface LLMChannel {
    complete(prompt: string, options?: Record<string, unknown>): Promise<{
        content: string;
        usage?: {
            total_tokens: number;
        };
    }>;
}
/**
 * Task Planner
 */
export declare class TaskPlanner {
    private taskStore;
    private subGoalStore;
    private llm;
    constructor(taskStore: ITaskStore, subGoalStore: ISubGoalStore, llm: LLMChannel);
    /**
     * Generate tasks for a sub-goal
     */
    generateTasksForSubGoal(subGoalId: string, goalContext: {
        goalTitle: string;
        goalDescription?: string;
        userContext: Record<string, unknown>;
    }, options?: TaskGenerationOptions): Promise<Task[]>;
    /**
     * Create default tasks as fallback
     */
    private createDefaultTasks;
    /**
     * Create task from definition
     */
    private createTaskFromDefinition;
    /**
     * Review tasks for alignment
     */
    reviewTasks(taskIds: string[], context: {
        goalTitle: string;
        subGoalTitle: string;
        goalDescription?: string;
    }): Promise<TaskReviewResult[]>;
    /**
     * Adjust tasks based on review results
     */
    adjustTasks(reviewResults: TaskReviewResult[], userFeedback?: string): Promise<Task[]>;
    /**
     * Replan tasks for a sub-goal
     */
    replanTasks(subGoalId: string, feedback: string, goalContext?: {
        goalTitle: string;
        userContext: Record<string, unknown>;
    }): Promise<Task[]>;
    /**
     * Get tasks for a sub-goal
     */
    getTasksForSubGoal(subGoalId: string): Promise<Task[]>;
    /**
     * Validate priority string
     */
    private validatePriority;
}
export {};
//# sourceMappingURL=task-planner.d.ts.map