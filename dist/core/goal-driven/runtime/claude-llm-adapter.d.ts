/**
 * Claude LLM Adapter
 *
 * 复用 Claude Code 本身的能力来实现 LLM 接口
 * 通过直接调用本地函数来模拟 LLM 响应（无需外部 API）
 */
import type { Task } from '../types';
/**
 * Claude LLM Channel - 直接实现，无需外部 API
 */
export declare class ClaudeLLMChannel {
    private context;
    /**
     * Complete - 基于任务类型直接生成结构化响应
     */
    complete(prompt: string, options?: Record<string, unknown>): Promise<{
        content: string;
        usage?: {
            total_tokens: number;
        };
    }>;
    /**
     * Chat - 对话式响应
     */
    chat(params: {
        systemPrompt?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
        }>;
        temperature?: number;
    }): Promise<{
        content: string;
        usage?: {
            total_tokens: number;
        };
    }>;
    /**
     * Chat JSON - 对话式 JSON 响应
     */
    chatJSON<T>(params: {
        systemPrompt?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
        }>;
        temperature?: number;
    }): Promise<T>;
    /**
     * 智能生成响应
     */
    private generateResponse;
    /**
     * 生成子目标拆解
     */
    private generateSubGoalDecomposition;
    /**
     * 创建默认子目标
     */
    private createDefaultSubGoals;
    /**
     * 生成任务
     */
    private generateTasks;
    /**
     * 创建默认任务
     */
    private createDefaultTasks;
    /**
     * 生成任务 Review
     */
    private generateTaskReview;
    /**
     * 生成价值评估
     */
    private generateValueAssessment;
    /**
     * 生成计划摘要
     */
    private generatePlanSummary;
    /**
     * 从文本中提取数字
     */
    private extractNumber;
    /**
     * 生成对话响应
     */
    private generateChatResponse;
    /**
     * 生成问题
     */
    private generateQuestions;
    /**
     * 提取已收集的信息
     */
    private extractCollectedInfo;
    /**
     * 提取信息
     */
    private extractInfo;
    /**
     * 检查信息充分性
     */
    private checkSufficiency;
}
/**
 * 本地执行管道 - 直接执行，无需外部服务
 */
export declare class LocalExecutionPipeline {
    run(task: Task): Promise<any>;
    private delay;
    private generateOutput;
    private generateExplorationOutput;
    private generateKeyPoints;
    private generateActionItems;
}
/**
 * 简单空闲检测器
 */
export declare class SimpleIdleDetector {
    private lastActivity;
    isUserIdle(): Promise<boolean>;
    getLastActivityTime(): number;
    updateActivity(): void;
}
//# sourceMappingURL=claude-llm-adapter.d.ts.map