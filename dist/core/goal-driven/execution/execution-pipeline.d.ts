/**
 * Execution Pipeline
 *
 * 负责任务的实际执行
 * - exploration: 探索任务执行
 * - one_time: 一次性任务执行
 * - recurring: 周期性任务执行
 * - monitoring: 监控任务执行
 * - event_triggered: 事件触发任务执行
 * - interactive: 交互式任务执行
 */
import { type Task, type ExecutionResult, type IKnowledgeStore, type ITaskStore } from '../types';
/**
 * Tool interface
 */
interface Tool {
    name: string;
    execute(params: Record<string, unknown>): Promise<unknown>;
}
/**
 * LLM Channel for task execution
 */
interface LLMChannel {
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
    chatJSON<T>(params: {
        systemPrompt?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
        }>;
        temperature?: number;
    }): Promise<T>;
}
/**
 * Execution Pipeline
 */
export declare class ExecutionPipeline {
    private llm;
    private knowledgeStore;
    private taskStore;
    private tools;
    constructor(llm: LLMChannel, knowledgeStore: IKnowledgeStore, taskStore: ITaskStore);
    /**
     * Register a tool
     */
    registerTool(tool: Tool): void;
    /**
     * Run task through execution pipeline
     */
    run(task: Task): Promise<ExecutionResult>;
    /**
     * Execute task based on type
     */
    private executeByType;
    /**
     * Execute exploration task
     */
    private executeExploration;
    /**
     * Execute one-time task
     */
    private executeOneTime;
    /**
     * Execute recurring task
     */
    private executeRecurring;
    /**
     * Execute monitoring task
     */
    private executeMonitoring;
    /**
     * Execute event-triggered task
     */
    private executeEventTriggered;
    /**
     * Execute interactive task
     */
    private executeInteractive;
    /**
     * Inject knowledge into prompt
     */
    private injectKnowledge;
    /**
     * Parse exploration result
     */
    private parseExplorationResult;
    /**
     * Calculate importance score for knowledge entry
     */
    private calculateImportance;
    /**
     * Extract summary from content
     */
    private extractSummary;
}
export {};
//# sourceMappingURL=execution-pipeline.d.ts.map