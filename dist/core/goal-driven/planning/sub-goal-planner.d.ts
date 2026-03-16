/**
 * SubGoal Planner
 *
 * 负责子目标的规划、拆解、Review和调整
 * - 基于Goal和用户上下文拆解SubGoal
 * - 管理SubGoal之间的依赖关系
 * - 评估SubGoal完成度
 * - 在Review时调整SubGoal划分
 */
import { type SubGoal, type SubGoalReviewResult, type ISubGoalStore, type IGoalStore } from '../types';
/**
 * LLM Channel interface (minimal version)
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
 * SubGoal Planner
 */
export declare class SubGoalPlanner {
    private goalStore;
    private subGoalStore;
    private llm;
    constructor(goalStore: IGoalStore, subGoalStore: ISubGoalStore, llm: LLMChannel);
    /**
     * Decompose goal into sub-goals
     */
    decomposeSubGoals(goalId: string, userContext: Record<string, unknown>): Promise<SubGoal[]>;
    /**
     * Create default sub-goals as fallback
     */
    private createDefaultSubGoals;
    /**
     * Review sub-goals and suggest adjustments
     */
    reviewSubGoals(goalId: string, taskStore?: {
        getTasksByGoal: (goalId: string) => Promise<Array<{
            subGoalId?: string;
            status: string;
        }>>;
    }): Promise<{
        reviews: SubGoalReviewResult[];
        requiresUserConfirmation: boolean;
    }>;
    /**
     * Replan sub-goals based on user feedback
     */
    replanSubGoals(goalId: string, feedback: string, userContext: Record<string, unknown>): Promise<SubGoal[]>;
    /**
     * Check if a sub-goal can be activated
     */
    canActivateSubGoal(subGoalId: string): Promise<{
        canActivate: boolean;
        blockingSubGoals: SubGoal[];
    }>;
    /**
     * Update sub-goal status based on task completion
     */
    updateSubGoalStatusFromTasks(subGoalId: string): Promise<SubGoal>;
    /**
     * Validate priority string
     */
    private validatePriority;
}
export {};
//# sourceMappingURL=sub-goal-planner.d.ts.map