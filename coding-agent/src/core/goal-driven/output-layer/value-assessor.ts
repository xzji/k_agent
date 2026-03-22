/**
 * Value Assessor
 *
 * 负责任务结果的价值评估
 * - 评估任务结果的价值
 * - 决定是否推送
 * - 确定推送优先级
 * - 检查信息新颖性
 */

import {
  type Task,
  type ExecutionResult,
  type KnowledgeEntry,
  type PriorityLevel,
  type ITaskStore,
  type IGoalStore,
  type IKnowledgeStore,
} from '../types';
import { logError } from '../utils/logger';

/**
 * Value assessment result
 */
export interface ValueAssessment {
  taskId: string;
  valueScore: number; // 0-1 价值分数
  valueDimensions: {
    relevance: number; // 与目标的相关性
    timeliness: number; // 时效性
    novelty: number; // 新颖性（是否重复信息）
    actionability: number; // 可操作性
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
    usage?: { total_tokens: number };
  }>;
}

/**
 * Value assessment prompt template
 */
const ASSESS_VALUE_PROMPT = `请评估以下任务结果的价值：

任务: {{taskTitle}}
类型: {{taskType}}
预期产出: {{expectedResult}}

执行结果:
{{resultOutput}}

目标背景: {{goalTitle}}

请从以下维度评估（0-1分）：
1. relevance: 与目标的相关性
2. timeliness: 信息的时效性
3. novelty: 信息的新颖性（是否重复已知信息）
4. actionability: 可操作性（用户能否基于此采取行动）

请按JSON格式返回：
{
  "valueScore": 0.85,
  "valueDimensions": {
    "relevance": 0.9,
    "timeliness": 0.8,
    "novelty": 0.85,
    "actionability": 0.7
  },
  "reasoning": "评估理由说明",
  "shouldNotify": true|false,
  "priority": "critical|high|medium|low"
}`;

/**
 * Value Assessor
 */
export class ValueAssessor {
  constructor(
    private taskStore: ITaskStore,
    private goalStore: IGoalStore,
    private knowledgeStore: IKnowledgeStore,
    private llm: LLMChannel
  ) {}

  /**
   * Assess value of task execution result
   */
  async assessValue(
    taskId: string,
    executionResult: ExecutionResult
  ): Promise<ValueAssessment> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const goal = await this.goalStore.getGoal(task.goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${task.goalId}`);
    }

    // Check novelty first (can be done without LLM)
    const noveltyScore = await this.checkNovelty(
      executionResult.output || '',
      task.goalId
    );

    // Build assessment prompt
    const prompt = ASSESS_VALUE_PROMPT
      .replace('{{taskTitle}}', task.title)
      .replace('{{taskType}}', `${task.executionCycle}/${task.executionMode}`)
      .replace('{{expectedResult}}', task.expectedResult?.description || '未定义')
      .replace('{{resultOutput}}', executionResult.output?.slice(0, 2000) || '')
      .replace('{{goalTitle}}', goal.title);

    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      // Parse JSON, handling markdown code blocks
      const assessment: {
        valueScore: number;
        valueDimensions: {
          relevance: number;
          timeliness: number;
          novelty: number;
          actionability: number;
        };
        reasoning: string;
        shouldNotify: boolean;
        priority: string;
      } = this.parseJSONResponse(response.content);

      // Override novelty with calculated score
      assessment.valueDimensions.novelty = noveltyScore;

      // Recalculate overall score with actual novelty
      const dims = assessment.valueDimensions;
      const calculatedScore =
        dims.relevance * 0.35 +
        dims.timeliness * 0.15 +
        dims.novelty * 0.25 +
        dims.actionability * 0.25;

      assessment.valueScore = Math.round(calculatedScore * 100) / 100;

      // Determine if should notify based on score and novelty
      const shouldNotify = this.shouldNotify(assessment.valueScore, noveltyScore);

      return {
        taskId,
        valueScore: assessment.valueScore,
        valueDimensions: assessment.valueDimensions,
        reasoning: assessment.reasoning,
        shouldNotify,
        priority: this.validatePriority(assessment.priority),
      };
    } catch (error) {
      // Log error to background, fallback assessment
      await logError(error instanceof Error ? error : String(error), 'value_assessment', goal.id, taskId);
      return this.createFallbackAssessment(taskId, noveltyScore);
    }
  }

  /**
   * Batch assess multiple results
   */
  async batchAssess(
    results: Array<{ taskId: string; result: ExecutionResult }>
  ): Promise<ValueAssessment[]> {
    const assessments: ValueAssessment[] = [];

    for (const { taskId, result } of results) {
      try {
        const assessment = await this.assessValue(taskId, result);
        assessments.push(assessment);
      } catch (error) {
        // Log to background and skip failed assessments
        await logError(error instanceof Error ? error : String(error), 'value_assessment_batch', undefined, taskId);
      }
    }

    // Sort by value score descending
    return assessments.sort((a, b) => b.valueScore - a.valueScore);
  }

  /**
   * Check if content is novel compared to existing knowledge
   */
  async checkNovelty(content: string, goalId: string): Promise<number> {
    if (!content || content.length < 10) {
      return 0.5; // Too short to assess
    }

    try {
      // Get existing knowledge for this goal
      const existingKnowledge = await this.knowledgeStore.getByGoal(goalId);

      if (existingKnowledge.length === 0) {
        return 1.0; // No existing knowledge, everything is novel
      }

      // Extract key phrases from content
      const contentKeywords = this.extractKeywords(content);

      // Calculate similarity with existing knowledge
      let maxSimilarity = 0;

      for (const entry of existingKnowledge.slice(0, 20)) {
        const entryKeywords = this.extractKeywords(entry.content);
        const similarity = this.calculateJaccardSimilarity(
          contentKeywords,
          entryKeywords
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // Novelty is inverse of max similarity
      const novelty = Math.max(0, 1 - maxSimilarity);

      // Round to 2 decimal places
      return Math.round(novelty * 100) / 100;
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'novelty_check', goalId);
      return 0.5; // Unknown novelty
    }
  }

  /**
   * Determine if notification should be sent
   */
  private shouldNotify(valueScore: number, noveltyScore: number): boolean {
    // Always notify if value is high
    if (valueScore >= 0.8) return true;

    // Always notify if novel and moderately valuable
    if (noveltyScore >= 0.8 && valueScore >= 0.5) return true;

    // Notify if both are decent
    if (valueScore >= 0.6 && noveltyScore >= 0.6) return true;

    // Don't notify if both are low
    if (valueScore < 0.4 && noveltyScore < 0.4) return false;

    // Default: notify for anything above threshold
    return valueScore >= 0.5;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): Set<string> {
    // Simple keyword extraction
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    // Remove common stop words
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
      'a',
      'an',
      'to',
      'of',
      'in',
      'on',
      'at',
      'by',
      'for',
      'with',
      'as',
      '的',
      '是',
      '在',
      '和',
      '了',
      '有',
      '我',
      '他',
      '她',
      '它',
      '们',
      '这',
      '那',
    ]);

    return new Set(words.filter((w) => !stopWords.has(w)));
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Create fallback assessment when LLM fails
   */
  private createFallbackAssessment(
    taskId: string,
    noveltyScore: number
  ): ValueAssessment {
    return {
      taskId,
      valueScore: 0.5,
      valueDimensions: {
        relevance: 0.5,
        timeliness: 0.5,
        novelty: noveltyScore,
        actionability: 0.5,
      },
      reasoning: '使用默认评估（LLM评估失败）',
      shouldNotify: noveltyScore >= 0.6,
      priority: 'medium',
    };
  }

  /**
   * Validate priority string
   */
  private validatePriority(priority: string): PriorityLevel {
    const valid: PriorityLevel[] = ['critical', 'high', 'medium', 'low', 'background'];
    if (valid.includes(priority as PriorityLevel)) {
      return priority as PriorityLevel;
    }
    return 'medium';
  }

  /**
   * Parse JSON response, handling markdown code blocks
   */
  private parseJSONResponse<T>(content: string): T {
    let jsonStr = content.trim();

    // Try to extract from markdown code blocks
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      const codeBlockMatch = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Try to find JSON object in plain text
        const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }
    }

    return JSON.parse(jsonStr) as T;
  }

  /**
   * Get novelty threshold for notification
   */
  getNoveltyThreshold(): number {
    return 0.6;
  }

  /**
   * Get value threshold for notification
   */
  getValueThreshold(): number {
    return 0.5;
  }
}
