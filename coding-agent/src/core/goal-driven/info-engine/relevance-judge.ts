import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { DimensionNode, GoalNode, InfoItem } from "../types.js";

/**
 * RelevanceJudge
 * 
 * Uses LLM to evaluate the relevance of collected information against the goal and dimension.
 */
export class RelevanceJudge {
	private llm: BackgroundLLMChannel;

	constructor(llm: BackgroundLLMChannel) {
		this.llm = llm;
	}

	/**
	 * Judge the relevance of multiple info items.
	 * Returns items that meet the relevance criteria.
	 */
	async judgeBatch(
		goal: GoalNode,
		dimension: DimensionNode,
		items: InfoItem[]
	): Promise<InfoItem[]> {
		if (items.length === 0) return [];

		// For P1, we ask the LLM to score them, or use a mock if LLM is too slow.
		// Let's implement an authentic LLM call here, asking it to output JSON.

		const itemsJson = items.map((item, index) => ({
			index,
			content: item.content.substring(0, 500) // Truncate to save tokens
		}));

		// Enhanced prompt with explicit array enforcement
		const prompt = `You are evaluating information relevance for a Goal-Driven Agent.

Goal: ${goal.title}
Dimension: ${dimension.title}

Evaluate ${items.length} information items and rate their relevance.
For EACH item, provide:
- index: the item number (0 to ${items.length - 1})
- score: 1-10 (higher = more relevant)
- level: "strong" (8-10), "weak" (4-7), or "irrelevant" (1-3)

Items to evaluate:
${JSON.stringify(itemsJson, null, 2)}

CRITICAL: You MUST respond with a JSON ARRAY containing exactly ${items.length} objects.
Format: [{"index": 0, "score": 8, "level": "strong"}, {"index": 1, "score": 5, "level": "weak"}, ...]

DO NOT respond with a single object. DO NOT add explanatory text. ONLY the JSON array.`;

		try {
			const judgments = await this.llm.chatJSON<Array<{ index: number; score: number; level: "strong" | "weak" | "irrelevant" }>>({
				systemPrompt: "You are a relevance evaluator. ALWAYS respond with a JSON ARRAY, never a single object. Even for one item, use array format: [{...}].",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3 // Lower temperature for more consistent JSON
			});

			// Enhanced type checking with better error messages
			if (!judgments) {
				console.error("RelevanceJudge: LLM returned null/undefined");
				return this.fallbackAcceptAll(items);
			}

			// Handle single object fallback (common issue with GLM-4)
			if (!Array.isArray(judgments)) {
				console.warn("RelevanceJudge: LLM returned single object instead of array, attempting to wrap it");
				// Check if it's a single judgment object
				const singleJudgment = judgments as unknown;
				if (typeof singleJudgment === 'object' && singleJudgment !== null &&
					'index' in singleJudgment && 'score' in singleJudgment && 'level' in singleJudgment) {
					// Wrap single object in array
					const wrapped = [singleJudgment as { index: number; score: number; level: "strong" | "weak" | "irrelevant" }];
					return this.processJudgments(wrapped, items);
				}
				console.error("RelevanceJudge: Response is not an array or valid judgment object");
				return this.fallbackAcceptAll(items);
			}

			return this.processJudgments(judgments, items);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("RelevanceJudge error:", errorMessage);

			// Log more context for debugging
			if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
				console.error("Failed to parse LLM response as JSON array");
			}

			return this.fallbackAcceptAll(items);
		}
	}

	/**
	 * Process validated judgment array
	 */
	private processJudgments(
		judgments: Array<{ index: number; score: number; level: "strong" | "weak" | "irrelevant" }>,
		items: InfoItem[]
	): InfoItem[] {
		const validItems: InfoItem[] = [];

		for (const judge of judgments) {
			const item = items[judge.index];
			if (item) {
				item.relevanceScore = judge.score;
				item.relevanceLevel = judge.level;

				// Keep strong and weak items
				if (judge.level === "strong" || judge.level === "weak") {
					validItems.push(item);
				}
			}
		}

		return validItems;
	}

	/**
	 * Fallback: accept all items with moderate score when LLM fails
	 */
	private fallbackAcceptAll(items: InfoItem[]): InfoItem[] {
		console.warn("RelevanceJudge: Using fallback - accepting all items as 'weak' relevance");
		for (const item of items) {
			item.relevanceScore = 5;
			item.relevanceLevel = "weak";
		}
		return items;
	}
}
