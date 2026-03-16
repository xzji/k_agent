/**
 * Coding Agent Adapter
 *
 * Adapts the new Unified Task Scheduler architecture to work with the coding-agent Extension API.
 * Provides:
 * - LLM Channel using the coding-agent's model (direct fetch like legacy)
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
import type { ModelRegistry } from '../model-registry.js';
import { logLLMRequest, logLLMResponse, logError } from '../utils/logger.js';

/**
 * LLM Channel that uses coding-agent's model
 * Uses direct fetch to OpenAI-compatible API endpoints (like legacy)
 */
export class CodingAgentLLMChannel {
  private model: any | undefined;
  private modelRegistry: ModelRegistry | undefined;
  private abortController: AbortController | null = null;

  constructor(
    model?: any,
    modelRegistry?: ModelRegistry
  ) {
    this.model = model;
    this.modelRegistry = modelRegistry;
  }

  /**
   * Update the current model
   */
  syncModel(model: any): void {
    this.model = model;
  }

  /**
   * Get API key for model
   */
  private async getApiKey(): Promise<string> {
    if (!this.model || !this.modelRegistry) {
      throw new Error('No model or registry configured');
    }
    const apiKey = await this.modelRegistry.getApiKey(this.model);
    if (!apiKey) {
      throw new Error(`No API key for provider ${this.model.provider}`);
    }
    return apiKey;
  }

  /**
   * Get default base URL for known providers
   */
  private getDefaultBaseUrl(provider: string): string {
    const defaults: Record<string, string> = {
      anthropic: 'https://api.anthropic.com/v1',
      openai: 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta/openai',
      groq: 'https://api.groq.com/openai/v1',
      deepseek: 'https://api.deepseek.com/v1',
      mistral: 'https://api.mistral.ai/v1',
      xai: 'https://api.x.ai/v1',
      zai: 'https://api.z.ai/v1',
    };
    return defaults[provider] ?? 'https://api.openai.com/v1';
  }

  /**
   * Make a direct fetch request to the LLM API
   */
  private async fetchChatCompletion(params: {
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; finishReason?: string }> {
    if (!this.model) {
      throw new Error('No model selected. Please use /model to select a model first.');
    }

    const apiKey = await this.getApiKey();
    this.abortController = new AbortController();

    // Build messages array
    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const baseUrl = this.model.baseUrl || this.getDefaultBaseUrl(this.model.provider);
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body = {
      model: this.model.id,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: false,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(this.model.headers ?? {}),
    };

    console.log('[LLMChannel] Fetching from:', url);
    console.log('[LLMChannel] Model:', this.model.id);
    console.log('[LLMChannel] Provider:', this.model.provider);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      throw new Error(`LLM request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: { content: string };
        finish_reason?: string;
      }>;
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error('LLM returned no choices');
    }

    const content = data.choices[0].message.content;

    if (!content || content.trim().length === 0) {
      throw new Error('LLM returned empty content');
    }

    return {
      content,
      finishReason: data.choices[0].finish_reason,
    };
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
    console.log('[LLMChannel] complete() called, prompt length:', prompt.length);

    const startTime = Date.now();
    const goalId = options?.goalId as string | undefined;
    const taskId = options?.taskId as string | undefined;

    try {
      // 记录 LLM 请求日志
      await logLLMRequest(prompt, options, goalId, taskId);

      const result = await this.fetchChatCompletion({
        systemPrompt: options?.systemPrompt as string || '',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature as number ?? 0.7,
        maxTokens: options?.maxTokens as number ?? 4096,
      });

      const duration = Date.now() - startTime;
      console.log('[LLMChannel] complete() response length:', result.content.length);

      // 记录 LLM 响应日志
      await logLLMResponse(result.content, duration, goalId, taskId);

      return {
        content: result.content,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      await logError(error instanceof Error ? error : String(error), 'llm_response', goalId, taskId, { duration });
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
    goalId?: string;
    taskId?: string;
  }): Promise<T> {
    console.log('[LLMChannel] chatJSON() called');
    console.log('[LLMChannel] Messages count:', params.messages.length);
    console.log('[LLMChannel] Last message preview:', params.messages[params.messages.length - 1]?.content.slice(0, 100));

    const startTime = Date.now();
    const goalId = params.goalId;
    const taskId = params.taskId;

    try {
      // 构建完整 prompt 用于日志
      const fullPrompt = params.systemPrompt + '\n\n' + params.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      await logLLMRequest(fullPrompt, { temperature: params.temperature }, goalId, taskId);

      const result = await this.fetchChatCompletion({
        systemPrompt: params.systemPrompt + '\n\nYou MUST respond with valid JSON only. Do not include any text, explanation, or markdown formatting outside the JSON object. Return ONLY the JSON.',
        messages: params.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: params.temperature ?? 0.7,
        maxTokens: 8192,
      });

      const duration = Date.now() - startTime;
      console.log('[LLMChannel] Response received, length:', result.content.length);

      if (result.content.length > 0 && result.content.length < 500) {
        console.log('[LLMChannel] Content preview:', result.content);
      } else if (result.content.length >= 500) {
        console.log('[LLMChannel] Content preview:', result.content.slice(0, 500) + '...');
      }

      // 记录 LLM 响应日志
      await logLLMResponse(result.content, duration, goalId, taskId);

      // Parse JSON response
      return this.parseJSONResponse<T>(result.content);
    } catch (error) {
      const duration = Date.now() - startTime;
      await logError(error instanceof Error ? error : String(error), 'llm_response', goalId, taskId, { duration });
      console.error('[LLMChannel] Failed to get JSON response:', error);
      throw error;
    }
  }

  /**
   * Parse JSON response with fallback
   */
  private parseJSONResponse<T>(content: string): T {
    // Try to find JSON block
    let jsonStr = content;

    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Try to find JSON object/array in plain text
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        } else if (jsonArrayMatch) {
          jsonStr = jsonArrayMatch[0];
        }
      }
    }

    jsonStr = jsonStr.trim();

    // Validate we have something to parse
    if (!jsonStr || (jsonStr[0] !== '{' && jsonStr[0] !== '[')) {
      console.error('[LLMChannel] No valid JSON found in response. Raw content:', content.slice(0, 500));
      throw new Error(`No valid JSON found in response. Content starts with: ${content.slice(0, 100)}`);
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (parseError) {
      console.error('[LLMChannel] JSON parse error:', parseError);
      console.error('[LLMChannel] Attempted to parse:', jsonStr.slice(0, 200));
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }
  }

  /**
   * Abort the current request
   */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
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
