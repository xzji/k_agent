/**
 * Success Criteria Checker
 *
 * Automatically evaluates goal progress against success criteria.
 * Provides user confirmation flow when goals appear to be complete.
 * Handles user feedback for incomplete goals by generating follow-up tasks.
 */
import { type Goal, type Task, type SuccessCriterionType, type ProgressReport, type IGoalStore, type ITaskStore, type INotificationQueue } from '../types';
/**
 * LLM Channel interface for evaluations
 */
interface LLMChannel {
    chatJSON<T>(params: {
        systemPrompt: string;
        messages: Array<{
            role: 'user' | 'assistant';
            content: string;
        }>;
        temperature?: number;
    }): Promise<T>;
}
/**
 * Knowledge Store interface
 */
interface IKnowledgeStore {
    getByGoal(goalId: string): Promise<Array<{
        content: string;
        category: string;
    }>>;
}
/**
 * Configuration for SuccessCriteriaChecker
 */
interface CheckerConfig {
    autoCompleteThreshold: number;
    minConfidenceForAutoComplete: number;
    allCriticalMustBeMet: boolean;
}
/**
 * Success Criteria Checker
 */
export declare class SuccessCriteriaChecker {
    private goalStore;
    private taskStore;
    private knowledgeStore;
    private notificationQueue;
    private llm;
    private config;
    constructor(goalStore: IGoalStore, taskStore: ITaskStore, knowledgeStore: IKnowledgeStore, notificationQueue: INotificationQueue, llm: LLMChannel, config?: Partial<CheckerConfig>);
    /**
     * Evaluate goal progress against all success criteria
     */
    evaluateGoalProgress(goalId: string): Promise<ProgressReport>;
    /**
     * Evaluate a single success criterion
     */
    private evaluateCriterion;
    /**
     * Build the evaluation prompt for a criterion
     */
    private buildEvaluationPrompt;
    /**
     * Get summary of tasks for the goal
     */
    private getTaskSummary;
    /**
     * Determine if we should suggest auto-completion
     */
    private shouldSuggestAutoComplete;
    /**
     * Send completion confirmation request to user
     */
    private sendCompletionConfirmationRequest;
    /**
     * Handle user response to completion confirmation
     */
    handleCompletionConfirmation(goalId: string, userChoice: 'complete' | 'continue' | 'review', userFeedback?: string): Promise<void>;
    /**
     * Mark a goal as complete
     */
    private completeGoal;
    /**
     * Handle user feedback that goal is incomplete
     */
    handleIncompleteFeedback(goalId: string, userFeedback?: string): Promise<Task[]>;
    /**
     * Analyze user feedback to identify missing aspects and needed tasks
     */
    private analyzeIncompleteFeedback;
    /**
     * Send detailed evaluation report to user
     */
    private sendDetailedEvaluation;
    /**
     * Add a new success criterion to a goal
     */
    addSuccessCriterion(goalId: string, description: string, type?: SuccessCriterionType): Promise<Goal>;
    /**
     * Manually mark a criterion as completed
     */
    markCriterionCompleted(goalId: string, criterionId: string): Promise<Goal>;
    /**
     * Get completion statistics for all active goals
     */
    getCompletionStats(): Promise<{
        totalGoals: number;
        averageCompletion: number;
        goalsNearCompletion: string[];
        goalsNeedingAttention: string[];
    }>;
}
export {};
//# sourceMappingURL=success-criteria-checker.d.ts.map