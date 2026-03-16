"use strict";
/**
 * Value Assessor
 *
 * 负责任务结果的价值评估
 * - 评估任务结果的价值
 * - 决定是否推送
 * - 确定推送优先级
 * - 检查信息新颖性
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueAssessor = void 0;
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
class ValueAssessor {
    taskStore;
    goalStore;
    knowledgeStore;
    llm;
    constructor(taskStore, goalStore, knowledgeStore, llm) {
        this.taskStore = taskStore;
        this.goalStore = goalStore;
        this.knowledgeStore = knowledgeStore;
        this.llm = llm;
    }
    /**
     * Assess value of task execution result
     */
    async assessValue(taskId, executionResult) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const goal = await this.goalStore.getGoal(task.goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${task.goalId}`);
        }
        // Check novelty first (can be done without LLM)
        const noveltyScore = await this.checkNovelty(executionResult.output || '', task.goalId);
        // Build assessment prompt
        const prompt = ASSESS_VALUE_PROMPT
            .replace('{{taskTitle}}', task.title)
            .replace('{{taskType}}', task.type)
            .replace('{{expectedResult}}', task.expectedResult?.description || '未定义')
            .replace('{{resultOutput}}', executionResult.output?.slice(0, 2000) || '')
            .replace('{{goalTitle}}', goal.title);
        try {
            const response = await this.llm.complete(prompt, {
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });
            const assessment = JSON.parse(response.content);
            // Override novelty with calculated score
            assessment.valueDimensions.novelty = noveltyScore;
            // Recalculate overall score with actual novelty
            const dims = assessment.valueDimensions;
            const calculatedScore = dims.relevance * 0.35 +
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
        }
        catch (error) {
            console.error('[ValueAssessor] Failed to assess value:', error);
            // Fallback assessment
            return this.createFallbackAssessment(taskId, noveltyScore);
        }
    }
    /**
     * Batch assess multiple results
     */
    async batchAssess(results) {
        const assessments = [];
        for (const { taskId, result } of results) {
            try {
                const assessment = await this.assessValue(taskId, result);
                assessments.push(assessment);
            }
            catch (error) {
                console.error(`[ValueAssessor] Failed to assess task ${taskId}:`, error);
            }
        }
        // Sort by value score descending
        return assessments.sort((a, b) => b.valueScore - a.valueScore);
    }
    /**
     * Check if content is novel compared to existing knowledge
     */
    async checkNovelty(content, goalId) {
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
                const similarity = this.calculateJaccardSimilarity(contentKeywords, entryKeywords);
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
            // Novelty is inverse of max similarity
            const novelty = Math.max(0, 1 - maxSimilarity);
            // Round to 2 decimal places
            return Math.round(novelty * 100) / 100;
        }
        catch (error) {
            console.error('[ValueAssessor] Error checking novelty:', error);
            return 0.5; // Unknown novelty
        }
    }
    /**
     * Determine if notification should be sent
     */
    shouldNotify(valueScore, noveltyScore) {
        // Always notify if value is high
        if (valueScore >= 0.8)
            return true;
        // Always notify if novel and moderately valuable
        if (noveltyScore >= 0.8 && valueScore >= 0.5)
            return true;
        // Notify if both are decent
        if (valueScore >= 0.6 && noveltyScore >= 0.6)
            return true;
        // Don't notify if both are low
        if (valueScore < 0.4 && noveltyScore < 0.4)
            return false;
        // Default: notify for anything above threshold
        return valueScore >= 0.5;
    }
    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
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
    calculateJaccardSimilarity(setA, setB) {
        const intersection = new Set([...setA].filter((x) => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        if (union.size === 0)
            return 0;
        return intersection.size / union.size;
    }
    /**
     * Create fallback assessment when LLM fails
     */
    createFallbackAssessment(taskId, noveltyScore) {
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
    validatePriority(priority) {
        const valid = ['critical', 'high', 'medium', 'low', 'background'];
        if (valid.includes(priority)) {
            return priority;
        }
        return 'medium';
    }
    /**
     * Get novelty threshold for notification
     */
    getNoveltyThreshold() {
        return 0.6;
    }
    /**
     * Get value threshold for notification
     */
    getValueThreshold() {
        return 0.5;
    }
}
exports.ValueAssessor = ValueAssessor;
//# sourceMappingURL=value-assessor.js.map