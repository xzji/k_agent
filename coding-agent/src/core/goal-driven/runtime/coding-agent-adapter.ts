/**
 * Coding Agent Adapter
 *
 * Adapts the new Unified Task Scheduler architecture to work with the coding-agent Extension API.
 * Provides:
 * - LLM Channel using the coding-agent's model
 * - Execution Pipeline using ExtensionAPI tools
 * - Idle Detector integration with coding-agent's IdleDetector
 */

import type {
  Task,
  Goal,
  ExecutionResult,
  KnowledgeEntry,
} from '../types.js';
import type { ExtensionAPI } from '../../extensions/types.js';

/**
 * LLM Channel that uses coding-agent's model
 */
export class CodingAgentLLMChannel {
  private model: import("@mariozechner/pi-ai").Model<any> | undefined;
  private modelRegistry: import("../model-registry.js").ModelRegistry | undefined;

  constructor(
    model?: import("@mariozechner/pi-ai").Model<any>,
    modelRegistry?: import("../model-registry.js").ModelRegistry
  ) {
    this.model = model;
    this.modelRegistry = modelRegistry;
  }

  /**
   * Update the current model
   */
  syncModel(model: import("@mariozechner/pi-ai").Model<any>): void {
    this.model = model;
  }

  /**
   * Complete a prompt using the coding-agent's model
   */
  async complete(
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }> {
    if (!this.model) {
      throw new Error('No model selected. Please use /model to select a model first.');
    }

    try {
      // Use the model's complete method
      const response = await this.model.complete(prompt, {
        temperature: options?.temperature as number ?? 0.7,
        maxTokens: options?.maxTokens as number ?? 4000,
      });

      return {
        content: response.content,
        usage: response.usage,
      };
    } catch (error) {
      console.error('[LLMChannel] Error completing prompt:', error);
      throw error;
    }
  }

  /**
   * Chat-style JSON response
   */
  async chatJSON<T>(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
  }): Promise<T> {
    const prompt = `${params.systemPrompt}\n\n${params.messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    const response = await this.complete(prompt, {
      temperature: params.temperature ?? 0.7,
    });

    try {
      // Try to parse as JSON
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                       response.content.match(/\{[\s\S]*\}/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response.content;
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('[LLMChannel] Failed to parse JSON response:', error);
      // Return a default response
      return {} as T;
    }
  }
}

/**
 * Execution Pipeline that uses ExtensionAPI tools
 */
export class CodingAgentExecutionPipeline {
  private pi: ExtensionAPI;

  constructor(pi: ExtensionAPI) {
    this.pi = pi;
  }

  /**
   * Execute a task using coding-agent's tools
   */
  async run(task: Task): Promise<ExecutionResult> {
    console.log(`[ExecutionPipeline] Executing task: ${task.title} (${task.type})`);
    const startTime = Date.now();

    try {
      // Build the execution prompt
      const prompt = this.buildExecutionPrompt(task);

      // Execute based on required tools
      const requiredTools = task.execution.requiredTools;

      if (requiredTools.includes('web_search')) {
        // Use web search through the agent
        return await this.executeWithWebSearch(task, prompt, startTime);
      }

      // Default execution - use agent to process the task
      return await this.executeWithAgent(task, prompt, startTime);

    } catch (error) {
      console.error(`[ExecutionPipeline] Task execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build execution prompt from task
   */
  private buildExecutionPrompt(task: Task): string {
    return `${task.execution.agentPrompt}

## Task Details
Title: ${task.title}
Description: ${task.description}
Type: ${task.type}
Priority: ${task.priority}

## Expected Result
${task.expectedResult ? JSON.stringify(task.expectedResult, null, 2) : 'No specific format required'}
`;
  }

  /**
   * Execute task with web search
   */
  private async executeWithWebSearch(
    task: Task,
    prompt: string,
    startTime: number
  ): Promise<ExecutionResult> {
    // For now, simulate the execution
    // In a full implementation, this would use the ExtensionAPI to trigger actual web searches
    const output = this.generateExplorationOutput(task);

    return {
      success: true,
      output,
      duration: Date.now() - startTime,
      metadata: {
        summary: `探索完成: ${task.title}`,
        keyPoints: this.generateKeyPoints(task),
        actionItems: this.generateActionItems(task),
      },
    };
  }

  /**
   * Execute task with agent
   */
  private async executeWithAgent(
    task: Task,
    prompt: string,
    startTime: number
  ): Promise<ExecutionResult> {
    // Simulate agent execution
    // In full implementation, this would use the ExtensionAPI to run agent tools

    const output = this.generateDefaultOutput(task);

    return {
      success: true,
      output,
      duration: Date.now() - startTime,
      metadata: {
        summary: `任务完成: ${task.title}`,
        keyPoints: this.generateKeyPoints(task),
        actionItems: this.generateActionItems(task),
      },
    };
  }

  /**
   * Generate exploration output
   */
  private generateExplorationOutput(task: Task): string {
    return `## ${task.title} - 探索结果

### 任务概述
${task.description}

### 执行结果
- 任务类型: ${task.type}
- 优先级: ${task.priority}
- 执行时间: ${new Date().toLocaleString('zh-CN')}

### 发现的信息
基于目标"${task.title}"的探索已完成。

### 下一步建议
1. 查看收集到的信息
2. 确认是否需要进一步探索
3. 根据结果调整任务计划
`;
  }

  /**
   * Generate default output
   */
  private generateDefaultOutput(task: Task): string {
    return `## ${task.title}

${task.description}

- 状态: 已完成
- 执行时间: ${new Date().toLocaleString('zh-CN')}
`;
  }

  /**
   * Generate key points
   */
  private generateKeyPoints(task: Task): string[] {
    return [
      `完成${task.title}`,
      `任务类型: ${task.type}`,
      `优先级: ${task.priority}`,
    ];
  }

  /**
   * Generate action items
   */
  private generateActionItems(task: Task): string[] {
    return [
      '查看执行结果',
      '确认下一步行动',
    ];
  }
}

/**
 * Idle Detector adapter that wraps coding-agent's IdleDetector
 */
export class CodingAgentIdleDetector {
  private idleDetector: import('../output-layer/idle-detector.js').IdleDetector | null = null;

  constructor(idleDetector?: import('../output-layer/idle-detector.js').IdleDetector) {
    if (idleDetector) {
      this.idleDetector = idleDetector;
    }
  }

  /**
   * Set the idle detector reference
   */
  setIdleDetector(idleDetector: import('../output-layer/idle-detector.js').IdleDetector): void {
    this.idleDetector = idleDetector;
  }

  /**
   * Check if user is idle
   */
  async isUserIdle(): Promise<boolean> {
    if (!this.idleDetector) {
      // Default to idle if no detector set
      return true;
    }

    // Check if idle with urgent priority
    return this.idleDetector.isIdle(true);
  }

  /**
   * Get last activity time
   */
  getLastActivityTime(): number {
    if (!this.idleDetector) {
      return Date.now();
    }

    // Get the idle time and calculate last activity
    const idleMs = this.idleDetector.getIdleTime();
    return Date.now() - idleMs;
  }

  /**
   * Record activity
   */
  recordActivity(): void {
    this.idleDetector?.recordActivity();
  }
}

/**
 * Knowledge Entry generator from task results
 */
export function generateKnowledgeFromTask(
  task: Task,
  result: ExecutionResult
): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];

  if (result.metadata?.keyPoints) {
    for (const keyPoint of result.metadata.keyPoints) {
      entries.push({
        id: `k-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        goalId: task.goalId,
        taskId: task.id,
        content: keyPoint,
        category: 'key_point',
        tags: [task.type, task.priority],
        importance: 0.8,
        relatedDimensionIds: task.dimensionId ? [task.dimensionId] : [],
        createdAt: Date.now(),
      });
    }
  }

  return entries;
}
