"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionPipeline = void 0;
const utils_1 = require("../utils");
/**
 * Execution Pipeline
 */
class ExecutionPipeline {
    llm;
    knowledgeStore;
    taskStore;
    tools = new Map();
    constructor(llm, knowledgeStore, taskStore) {
        this.llm = llm;
        this.knowledgeStore = knowledgeStore;
        this.taskStore = taskStore;
    }
    /**
     * Register a tool
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Run task through execution pipeline
     */
    async run(task) {
        const startTime = (0, utils_1.now)();
        try {
            // Inject knowledge into prompt
            const enhancedPrompt = await this.injectKnowledge(task);
            // Execute based on task type
            const result = await this.executeByType(task, enhancedPrompt);
            const duration = (0, utils_1.now)() - startTime;
            // Save knowledge from result
            if (result.knowledgeEntries && result.knowledgeEntries.length > 0) {
                for (const entry of result.knowledgeEntries) {
                    await this.knowledgeStore.save(entry);
                }
            }
            return {
                ...result,
                duration,
            };
        }
        catch (error) {
            const duration = (0, utils_1.now)() - startTime;
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration,
            };
        }
    }
    /**
     * Execute task based on type
     */
    async executeByType(task, prompt) {
        switch (task.type) {
            case 'exploration':
                return this.executeExploration(task, prompt);
            case 'one_time':
                return this.executeOneTime(task, prompt);
            case 'recurring':
                return this.executeRecurring(task, prompt);
            case 'monitoring':
                return this.executeMonitoring(task, prompt);
            case 'event_triggered':
                return this.executeEventTriggered(task, prompt);
            case 'interactive':
                return this.executeInteractive(task, prompt);
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }
    /**
     * Execute exploration task
     */
    async executeExploration(task, prompt) {
        const systemPrompt = `你是一个信息收集专家。你的任务是收集和整理相关信息。

执行指南：
1. 搜索相关信息
2. 整理和结构化信息
3. 提取关键要点
4. 返回结构化的结果

请确保信息准确、完整，并以JSON格式返回结果。`;
        try {
            const result = await this.llm.chat({
                systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            // Parse and structure the result
            const structuredResult = this.parseExplorationResult(result.content);
            // Create knowledge entry
            const knowledgeEntry = {
                id: `k-${(0, utils_1.generateId)().slice(0, 8)}`,
                goalId: task.goalId,
                taskId: task.id,
                content: structuredResult.summary,
                category: 'exploration',
                tags: ['auto-generated', task.dimensionId || 'general'],
                importance: this.calculateImportance(structuredResult),
                relatedDimensionIds: task.dimensionId ? [task.dimensionId] : [],
                createdAt: (0, utils_1.now)(),
            };
            return {
                success: true,
                output: result.content,
                outputType: 'information',
                outputFormat: 'markdown',
                tokenUsage: result.usage?.total_tokens,
                knowledgeEntries: [knowledgeEntry],
                duration: 0,
                metadata: {
                    summary: structuredResult.summary,
                    keyPoints: structuredResult.keyPoints,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Exploration failed: ${error instanceof Error ? error.message : String(error)}`,
                duration: 0,
            };
        }
    }
    /**
     * Execute one-time task
     */
    async executeOneTime(task, prompt) {
        const systemPrompt = `你是一个任务执行专家。请高效完成一次性任务。

执行指南：
1. 理解任务目标
2. 执行必要步骤
3. 提供清晰的结果
4. 如果涉及决策，给出明确建议`;
        try {
            const result = await this.llm.chat({
                systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return {
                success: true,
                output: result.content,
                outputType: 'deliverable',
                outputFormat: 'markdown',
                tokenUsage: result.usage?.total_tokens,
                duration: 0,
                metadata: {
                    summary: this.extractSummary(result.content),
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `One-time task failed: ${error instanceof Error ? error.message : String(error)}`,
                duration: 0,
            };
        }
    }
    /**
     * Execute recurring task
     */
    async executeRecurring(task, prompt) {
        const executionCount = task.executionHistory.length;
        const systemPrompt = `这是一个周期性任务的第${executionCount + 1}次执行。

执行指南：
1. 回顾之前执行的内容（如果有）
2. 提供新的信息或进展
3. 关注变化和更新
4. 保持简洁但信息完整`;
        try {
            const result = await this.llm.chat({
                systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4,
            });
            return {
                success: true,
                output: result.content,
                outputType: 'information',
                outputFormat: 'markdown',
                tokenUsage: result.usage?.total_tokens,
                duration: 0,
                metadata: {
                    summary: `第${executionCount + 1}次执行完成`,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Recurring task failed: ${error instanceof Error ? error.message : String(error)}`,
                duration: 0,
            };
        }
    }
    /**
     * Execute monitoring task
     */
    async executeMonitoring(task, prompt) {
        const systemPrompt = `你是一个监控任务执行器。你的任务是检查特定条件或状态。

执行指南：
1. 检查监控目标
2. 记录当前状态
3. 检测变化或异常
4. 如有重要发现，标记为需要通知

请以JSON格式返回：
{
  "status": "normal|changed|alert",
  "details": "详细状态描述",
  "shouldNotify": true|false,
  "reason": "如果需要通知，说明原因"
}`;
        try {
            const result = await this.llm.chatJSON({
                systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            });
            return {
                success: true,
                output: JSON.stringify(result, null, 2),
                outputType: 'information',
                outputFormat: 'json',
                duration: 0,
                metadata: {
                    summary: result.details,
                    keyPoints: [result.status, result.shouldNotify ? '需要通知' : '无需通知'],
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Monitoring task failed: ${error instanceof Error ? error.message : String(error)}`,
                duration: 0,
            };
        }
    }
    /**
     * Execute event-triggered task
     */
    async executeEventTriggered(task, prompt) {
        const systemPrompt = `这是一个事件触发任务。请检查触发条件是否满足，并执行相应操作。

执行指南：
1. 评估触发条件
2. 如果条件满足，执行任务
3. 如果条件不满足，说明原因
4. 返回执行结果`;
        try {
            const result = await this.llm.chat({
                systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return {
                success: true,
                output: result.content,
                outputType: 'action',
                outputFormat: 'markdown',
                duration: 0,
                metadata: {
                    summary: '事件触发任务执行完成',
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Event-triggered task failed: ${error instanceof Error ? error.message : String(error)}`,
                duration: 0,
            };
        }
    }
    /**
     * Execute interactive task
     */
    async executeInteractive(task, prompt) {
        // Interactive tasks transition to waiting_user state
        // The actual interaction happens through handleUserResponse
        return {
            success: true,
            output: 'Interactive task initiated. Waiting for user input.',
            outputType: 'confirmation',
            outputFormat: 'text',
            duration: 0,
            metadata: {
                summary: '等待用户输入',
                actionItems: ['等待用户响应'],
            },
        };
    }
    /**
     * Inject knowledge into prompt
     */
    async injectKnowledge(task) {
        const relevantKnowledge = await this.knowledgeStore.getRelevantKnowledgeForTask(task, task.execution.agentPrompt, { maxResults: 5 });
        if (relevantKnowledge.length === 0) {
            return task.execution.agentPrompt;
        }
        const knowledgeContext = relevantKnowledge
            .map((k) => `- [${k.category}] ${k.content.slice(0, 200)}`)
            .join('\n');
        return `## 相关背景知识
${knowledgeContext}

## 任务
${task.execution.agentPrompt}`;
    }
    /**
     * Parse exploration result
     */
    parseExplorationResult(content) {
        // Simple parsing - in real implementation, this would be more sophisticated
        const lines = content.split('\n').filter((l) => l.trim());
        // First non-empty line as summary
        const summary = lines[0] || '信息收集完成';
        // Lines starting with bullet points or numbers as key points
        const keyPoints = lines
            .filter((l) => l.match(/^[-*•\d]/))
            .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
            .slice(0, 5);
        return { summary, keyPoints };
    }
    /**
     * Calculate importance score for knowledge entry
     */
    calculateImportance(result) {
        // Simple heuristic based on content length and key points
        const baseScore = 0.5;
        const lengthBonus = Math.min(0.2, result.summary.length / 500);
        const keyPointsBonus = Math.min(0.3, result.keyPoints.length * 0.05);
        return Math.min(1, baseScore + lengthBonus + keyPointsBonus);
    }
    /**
     * Extract summary from content
     */
    extractSummary(content) {
        const lines = content.split('\n').filter((l) => l.trim());
        return lines[0] || '任务执行完成';
    }
}
exports.ExecutionPipeline = ExecutionPipeline;
//# sourceMappingURL=execution-pipeline.js.map