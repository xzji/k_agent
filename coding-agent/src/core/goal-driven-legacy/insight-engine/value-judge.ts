/**
 * ValueJudge — Judge whether an insight is valuable enough to notify the user
 *
 * Evaluates insights on multiple dimensions:
 * - Novelty: Is this new information or already known?
 * - Importance: How much does this impact goal achievement?
 * - Actionability: Can the user do something with this?
 * - Credibility: How reliable are the sources?
 */

import type { Insight, ValueJudgment, GoalNode } from "../types.js";

export class ValueJudge {
	private llm: any; // BackgroundLLMChannel
	private knowledgeStore: any; // KnowledgeStore
	private minNotifyScore: number;

	constructor(llm: any, knowledgeStore: any, minNotifyScore: number = 60) {
		this.llm = llm;
		this.knowledgeStore = knowledgeStore;
		this.minNotifyScore = minNotifyScore;
	}

	/**
	 * Judge whether an insight is valuable
	 */
	async judge(insight: Insight, goal: GoalNode): Promise<ValueJudgment> {
		// Check for duplicates/novelty
		const isNovel = await this.checkNovelty(insight);

		// Use LLM to evaluate value
		const evaluation = await this.evaluateValue(insight, goal, isNovel);

		const valueScore = evaluation.score;
		const isValuable = valueScore >= this.minNotifyScore;
		const shouldNotify = isValuable && evaluation.shouldNotify;

		return {
			insightId: insight.id,
			isValuable,
			valueScore,
			reasoning: evaluation.reasoning,
			shouldNotify,
			notifyPriority: this.calculatePriority(valueScore, insight.significance),
			judgedAt: Date.now(),
		};
	}

	/**
	 * Judge multiple insights in batch
	 */
	async judgeBatch(insights: Insight[], goal: GoalNode): Promise<ValueJudgment[]> {
		const judgments: ValueJudgment[] = [];

		for (const insight of insights) {
			const judgment = await this.judge(insight, goal);
			judgments.push(judgment);
		}

		return judgments;
	}

	/**
	 * Check if this insight is novel (not already known)
	 */
	private async checkNovelty(insight: Insight): Promise<boolean> {
		// Search for similar existing knowledge
		const searchResults = this.knowledgeStore.search(insight.title);

		// If no similar knowledge found, it's novel
		if (searchResults.length === 0) {
			return true;
		}

		// Use LLM to compare with existing knowledge
		const existingContent = searchResults.map(k => k.content).join("\n\n");

		const prompt = `You are checking for information novelty.

New Insight:
Title: ${insight.title}
Content: ${insight.content}

Existing Knowledge:
${existingContent.slice(0, 1000)}

Task: Determine if the new insight provides SUBSTANTIALLY NEW information.
If it's just a rephrasing or minor update, it's NOT novel.
If it adds new facts, perspectives, or conclusions, it IS novel.

Return JSON: { "isNovel": true/false, "reasoning": "brief explanation" }`;

		try {
			const result = await this.llm.chatJSON<{
				isNovel: boolean;
				reasoning: string;
			}>({
				systemPrompt: `You are checking for information novelty.`,
				messages: [
					{
						role: "user",
						content: `${prompt}

Return JSON: { "isNovel": true/false, "reasoning": "brief explanation" }`,
					},
				],
				temperature: 0.2,
			});

			return result.isNovel === true;
		} catch (error) {
			// Fallback: consider it novel if we can't determine
			console.warn("[ValueJudge] Failed to check novelty, assuming novel:", error);
			return true;
		}
	}

	/**
	 * Use LLM to evaluate the value of an insight
	 */
	private async evaluateValue(
		insight: Insight,
		goal: GoalNode,
		isNovel: boolean
	): Promise<{ score: number; shouldNotify: boolean; reasoning: string }> {
		const prompt = `You are evaluating the value of an insight for a goal-driven agent.

Goal: ${goal.title}

Insight:
Type: ${insight.type}
Title: ${insight.title}
Content: ${insight.content}
Significance: ${insight.significance}
Novel: ${isNovel ? "Yes" : "No"}

Evaluation Criteria (score 0-100 for each):
1. Novelty (0-100): Is this new information or already known?
2. Importance (0-100): How much does this impact goal achievement?
3. Actionability (0-100): Can the user take action based on this?
4. Credibility (0-100): How reliable are the sources? (high=90, medium=70, low=50)

Calculate overall score as weighted average:
- Novelty: 20%
- Importance: 40%
- Actionability: 30%
- Credibility: 10%

Also determine if this should trigger a notification to the user:
- YES if: score >= 60 AND (novel OR high importance)
- NO if: score < 60 OR (not novel AND low importance)

Return JSON:
{
  "scores": {
    "novelty": 0-100,
    "importance": 0-100,
    "actionability": 0-100,
    "credibility": 0-100
  },
  "overallScore": 0-100,
  "shouldNotify": true/false,
  "reasoning": "brief explanation of the evaluation"
}`;

		try {
			const result = await this.llm.chatJSON<{
				scores: {
					novelty: number;
					importance: number;
					actionability: number;
					credibility: number;
				};
				overallScore: number;
				shouldNotify: boolean;
				reasoning: string;
			}>({
				systemPrompt: `You are evaluating the value of an insight for a goal-driven agent.`,
				messages: [
					{
						role: "user",
						content: `${prompt}

Return JSON:
{
  "scores": {
    "novelty": 0-100,
    "importance": 0-100,
    "actionability": 0-100,
    "credibility": 0-100
  },
  "overallScore": 0-100,
  "shouldNotify": true/false,
  "reasoning": "brief explanation of the evaluation"
}`,
					},
				],
				temperature: 0.3,
			});

			return {
				score: result.overallScore || 0,
				shouldNotify: result.shouldNotify || false,
				reasoning: result.reasoning || "",
			};
		} catch (error) {
			console.warn("[ValueJudge] Failed to evaluate value, using fallback:", error);

			// Fallback: simple heuristic
			const significanceScore = { high: 80, medium: 60, low: 40 }[insight.significance];
			const noveltyBonus = isNovel ? 10 : -10;
			const score = Math.max(0, Math.min(100, significanceScore + noveltyBonus));

			return {
				score,
				shouldNotify: score >= this.minNotifyScore,
				reasoning: `Fallback evaluation based on significance (${insight.significance}) and novelty (${isNovel})`,
			};
		}
	}

	/**
	 * Calculate notification priority based on score and significance
	 */
	private calculatePriority(
		valueScore: number,
		insightSignificance: "high" | "medium" | "low"
	): "high" | "medium" | "low" {
		if (valueScore >= 80 || insightSignificance === "high") {
			return "high";
		}
		if (valueScore >= 60 || insightSignificance === "medium") {
			return "medium";
		}
		return "low";
	}

	/**
	 * Update minimum notification score
	 */
	setMinNotifyScore(score: number): void {
		this.minNotifyScore = Math.max(0, Math.min(100, score));
	}
}
