/**
 * Value Assessor
 *
 * 负责任务结果的价值评估
 * - 评估任务结果的价值
 * - 决定是否推送
 * - 确定推送优先级
 * - 检查信息新颖性
 */
import { type ExecutionResult, type PriorityLevel, type ITaskStore, type IGoalStore, type IKnowledgeStore } from '../types';
/**
 * Value assessment result
 */
export interface ValueAssessment {
    taskId: string;
    valueScore: number;
    valueDimensions: {
        relevance: number;
        timeliness: number;
        novelty: number;
        actionability: number;
    };
    reasoning: string;
    shouldNotify: boolean;
    priority: PriorityLevel;
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
 * Value Assessor
 */
export declare class ValueAssessor {
    private taskStore;
    private goalStore;
    private knowledgeStore;
    private llm;
    constructor(taskStore: ITaskStore, goalStore: IGoalStore, knowledgeStore: IKnowledgeStore, llm: LLMChannel);
    /**
     * Assess value of task execution result
     */
    assessValue(taskId: string, executionResult: ExecutionResult): Promise<ValueAssessment>;
    /**
     * Batch assess multiple results
     */
    batchAssess(results: Array<{
        taskId: string;
        result: ExecutionResult;
    }>): Promise<ValueAssessment[]>;
    /**
     * Check if content is novel compared to existing knowledge
     */
    checkNovelty(content: string, goalId: string): Promise<number>;
    /**
     * Determine if notification should be sent
     */
    private shouldNotify;
    /**
     * Extract keywords from text
     */
    private extractKeywords;
    /**
     * Calculate Jaccard similarity between two sets
     */
    private calculateJaccardSimilarity;
    /**
     * Create fallback assessment when LLM fails
     */
    private createFallbackAssessment;
    /**
     * Validate priority string
     */
    private validatePriority;
    /**
     * Get novelty threshold for notification
     */
    getNoveltyThreshold(): number;
    /**
     * Get value threshold for notification
     */
    getValueThreshold(): number;
}
export {};
//# sourceMappingURL=value-assessor.d.ts.map