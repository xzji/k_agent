/**
 * Context Gatherer
 *
 * Handles progressive information collection through interactive questioning.
 * Supports conversation-style information gathering rather than form-like questionnaires.
 */
import { type Goal, type Task, type QuestionBatch, type Question, type ExtractedInfo, type ITaskStore, type INotificationQueue } from '../types';
/**
 * LLM Channel interface for generating questions
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
 * Context Gatherer for progressive information collection
 */
export declare class ContextGatherer {
    private taskStore;
    private notificationQueue;
    private llm;
    constructor(taskStore: ITaskStore, notificationQueue: INotificationQueue, llm: LLMChannel);
    /**
     * Start interactive information gathering for a goal
     * Creates an interactive task and generates the first batch of questions
     */
    startInteractiveGathering(goal: Goal, context?: string): Promise<Task>;
    /**
     * Generate next batch of questions based on collected information
     */
    generateQuestions(goal: Goal, collectedInfo: Record<string, unknown>, context?: string): Promise<QuestionBatch>;
    /**
     * Build the prompt for question generation
     */
    private buildQuestionPrompt;
    /**
     * Notify user of pending questions
     */
    private notifyUserOfQuestions;
    /**
     * Process user response to interactive task
     * Extracts information and determines if more questions are needed
     */
    processUserResponse(taskId: string, userResponse: string): Promise<{
        extractedInfo: ExtractedInfo;
        hasEnoughInfo: boolean;
        nextQuestions?: QuestionBatch;
    }>;
    /**
     * Extract structured information from user response
     */
    private extractInfoFromResponse;
    /**
     * Extract general information without specific questions
     */
    private extractGeneralInfo;
    /**
     * Check if we have enough information to proceed
     */
    private checkInfoSufficiency;
    /**
     * Resume an interactive task that was waiting for user input
     */
    resumeInteractiveTask(taskId: string): Promise<Task>;
    /**
     * Cancel an interactive task
     */
    cancelInteractiveTask(taskId: string, reason?: string): Promise<Task>;
    /**
     * Get summary of collected information for a goal
     */
    getCollectedInfoSummary(goalId: string): Promise<{
        info: Record<string, unknown>;
        sources: string[];
    }>;
    /**
     * Validate user response against question type
     */
    validateResponse(question: Question, response: string): Promise<{
        valid: boolean;
        extractedValue: unknown;
        needsClarification?: boolean;
        clarificationQuestion?: string;
    }>;
}
export {};
//# sourceMappingURL=context-gatherer.d.ts.map