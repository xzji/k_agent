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

import {
  type Task,
  type ExecutionResult,
  type KnowledgeEntry,
  type IKnowledgeStore,
  type ITaskStore,
} from '../types';
import { generateId, now } from '../utils';

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
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
  }): Promise<{ content: string; usage?: { total_tokens: number } }>;

  chatJSON<T>(params: {
    systemPrompt?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
  }): Promise<T>;
}

/**
 * Execution context
 */
interface ExecutionContext {
  task: Task;
  goalTitle: string;
  previousResults?: ExecutionResult[];
}

/**
 * Execution Pipeline
 */
export class ExecutionPipeline {
  private tools: Map<string, Tool> = new Map();

  constructor(
    private llm: LLMChannel,
    private knowledgeStore: IKnowledgeStore,
    private taskStore: ITaskStore
  ) {}

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Run task through execution pipeline
   */
  async run(task: Task): Promise<ExecutionResult> {
    const startTime = now();

    try {
      // Inject knowledge into prompt
      const enhancedPrompt = await this.injectKnowledge(task);

      // Execute based on task type
      const result = await this.executeByType(task, enhancedPrompt);

      const duration = now() - startTime;

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
    } catch (error) {
      const duration = now() - startTime;

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
  private async executeByType(task: Task, prompt: string): Promise<ExecutionResult> {
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
  private async executeExploration(
    task: Task,
    prompt: string
  ): Promise<ExecutionResult> {
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
      const knowledgeEntry: KnowledgeEntry = {
        id: `k-${generateId().slice(0, 8)}`,
        goalId: task.goalId,
        taskId: task.id,
        content: structuredResult.summary,
        category: 'exploration',
        tags: ['auto-generated', task.dimensionId || 'general'],
        importance: this.calculateImportance(structuredResult),
        relatedDimensionIds: task.dimensionId ? [task.dimensionId] : [],
        createdAt: now(),
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
    } catch (error) {
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
  private async executeOneTime(task: Task, prompt: string): Promise<ExecutionResult> {
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
    } catch (error) {
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
  private async executeRecurring(task: Task, prompt: string): Promise<ExecutionResult> {
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
    } catch (error) {
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
  private async executeMonitoring(task: Task, prompt: string): Promise<ExecutionResult> {
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
      const result = await this.llm.chatJSON<{
        status: 'normal' | 'changed' | 'alert';
        details: string;
        shouldNotify: boolean;
        reason?: string;
      }>({
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
    } catch (error) {
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
  private async executeEventTriggered(
    task: Task,
    prompt: string
  ): Promise<ExecutionResult> {
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
    } catch (error) {
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
  private async executeInteractive(task: Task, prompt: string): Promise<ExecutionResult> {
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
  private async injectKnowledge(task: Task): Promise<string> {
    const relevantKnowledge = await this.knowledgeStore.getRelevantKnowledgeForTask(
      task,
      task.execution.agentPrompt,
      { maxResults: 5 }
    );

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
  private parseExplorationResult(content: string): {
    summary: string;
    keyPoints: string[];
  } {
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
  private calculateImportance(result: {
    summary: string;
    keyPoints: string[];
  }): number {
    // Simple heuristic based on content length and key points
    const baseScore = 0.5;
    const lengthBonus = Math.min(0.2, result.summary.length / 500);
    const keyPointsBonus = Math.min(0.3, result.keyPoints.length * 0.05);

    return Math.min(1, baseScore + lengthBonus + keyPointsBonus);
  }

  /**
   * Extract summary from content
   */
  private extractSummary(content: string): string {
    const lines = content.split('\n').filter((l) => l.trim());
    return lines[0] || '任务执行完成';
  }
}
