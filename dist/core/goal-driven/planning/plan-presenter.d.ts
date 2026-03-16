/**
 * Plan Presenter
 *
 * 负责计划的展示、汇报和用户确认
 * - 生成完整的计划汇报
 * - 向用户展示计划并获取确认
 * - 处理用户的计划修改请求
 */
import { type IGoalStore, type ISubGoalStore, type ITaskStore, type INotificationQueue } from '../types';
/**
 * Plan report structure
 */
export interface PlanReport {
    summary: string;
    subGoals: Array<{
        id: string;
        name: string;
        description: string;
        priority: string;
        status: string;
        weight: number;
        estimatedDuration?: number;
        tasks: Array<{
            id: string;
            title: string;
            type: string;
            priority: string;
            hierarchyLevel: string;
            expectedResult: string;
        }>;
    }>;
    timeline: string;
    notificationStrategy: string;
}
/**
 * Plan confirmation result
 */
export interface PlanConfirmationResult {
    confirmed: boolean;
    modifications?: string[];
    feedback?: string;
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
 * Plan Presenter
 */
export declare class PlanPresenter {
    private goalStore;
    private subGoalStore;
    private taskStore;
    private notificationQueue;
    private llm;
    constructor(goalStore: IGoalStore, subGoalStore: ISubGoalStore, taskStore: ITaskStore, notificationQueue: INotificationQueue, llm: LLMChannel);
    /**
     * Generate plan report for a goal
     */
    generatePlanReport(goalId: string): Promise<PlanReport>;
    /**
     * Generate plan summary using LLM
     */
    private generateSummary;
    /**
     * Format duration for display
     */
    private formatDuration;
    /**
     * Format timeline
     */
    private formatTimeline;
    /**
     * Generate notification strategy
     */
    private generateNotificationStrategy;
    /**
     * Present plan to user for confirmation
     */
    presentPlanForConfirmation(goalId: string): Promise<PlanConfirmationResult>;
    /**
     * Format plan for display
     */
    private formatPlanForDisplay;
    /**
     * Handle plan modification request
     */
    handlePlanModification(goalId: string, modificationRequest: string): Promise<void>;
    /**
     * Get plan summary for quick view
     */
    getPlanSummary(goalId: string): Promise<{
        totalSubGoals: number;
        totalTasks: number;
        completedTasks: number;
        overallProgress: number;
    }>;
    /**
     * Check if plan is ready for presentation
     */
    isPlanReady(goalId: string): Promise<{
        ready: boolean;
        reason?: string;
    }>;
}
export {};
//# sourceMappingURL=plan-presenter.d.ts.map