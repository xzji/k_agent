/**
 * InsightExtractor — Extract meaningful insights from collected information
 *
 * Takes relevant information items and synthesizes them into structured insights.
 * This is the "analysis" phase that transforms raw data into understanding.
 */

import type { InfoItem, Insight, GoalNode, DimensionNode } from "../types.js";

export class InsightExtractor {
	private llm: any; // BackgroundLLMChannel

	constructor(llm: any) {
		this.llm = llm;
	}

	/**
	 * Extract insights from a batch of relevant information items
	 */
	async extractInsights(
		goal: GoalNode,
		dimension: DimensionNode,
		relevantItems: InfoItem[]
	): Promise<Insight[]> {
		if (relevantItems.length === 0) {
			return [];
		}

		// Group items by content similarity
		const groups = await this.groupBySimilarity(relevantItems);

		// Extract insights from each group
		const insights: Insight[] = [];
		for (const group of groups) {
			const insight = await this.extractInsightFromGroup(goal, dimension, group);
			if (insight) {
				insights.push(insight);
			}
		}

		// Also try to extract a synthesis insight from all items
		if (groups.length > 1) {
			const synthesis = await this.extractSynthesisInsight(goal, dimension, relevantItems);
			if (synthesis) {
				insights.push(synthesis);
			}
		}

		return insights;
	}

	/**
	 * Group items by content similarity using LLM
	 */
	private async groupBySimilarity(items: InfoItem[]): Promise<InfoItem[][]> {
		if (items.length <= 3) {
			// Too few items to group meaningfully
			return [items];
		}

		const prompt = `You are organizing information by similarity. Given these ${items.length} information items, group them into 2-4 clusters based on thematic similarity.

Items:
${items.map((item, i) => `${i + 1}. [${item.sourceId}] ${item.content.slice(0, 200)}...`).join("\n")}

Return a JSON object with this format:
{
  "groups": [
    {
      "indices": [0, 2, 5],
      "theme": "brief theme description"
    }
  ]
}

Only include item indices, ensure all items are assigned to exactly one group.`;

		try {
			const result = await this.llm.chatJSON<{
				groups: Array<{
					indices: number[];
					theme: string;
				}>;
			}>({
				systemPrompt: `You are organizing information by similarity.`,
				messages: [
					{
						role: "user",
						content: `Given these ${items.length} information items, group them into 2-4 clusters based on thematic similarity.

Items:
${items.map((item, i) => `${i + 1}. [${item.sourceId}] ${item.content.slice(0, 200)}...`).join("\n")}

Return a JSON object with this format:
{
  "groups": [
    {
      "indices": [0, 2, 5],
      "theme": "brief theme description"
    }
  ]
}

Only include item indices, ensure all items are assigned to exactly one group.`,
					},
				],
				temperature: 0.3,
			});

			if (result.groups && Array.isArray(result.groups)) {
				const groups: InfoItem[][] = [];
				for (const group of result.groups) {
					if (group.indices && Array.isArray(group.indices)) {
						const groupItems = group.indices.map((idx: number) => items[idx]).filter(Boolean);
						if (groupItems.length > 0) {
							groups.push(groupItems);
						}
					}
				}
				return groups.length > 0 ? groups : [items];
			}
		} catch (error) {
			// Fallback: return all items as one group
			console.warn("[InsightExtractor] Failed to group items, using single group:", error);
		}

		return [items];
	}

	/**
	 * Extract insight from a group of similar items
	 */
	private async extractInsightFromGroup(
		goal: GoalNode,
		dimension: DimensionNode,
		items: InfoItem[]
	): Promise<Insight | null> {
		if (items.length === 0) return null;

		const prompt = `You are analyzing information for a goal-driven agent.

Goal: ${goal.title}
Dimension: ${dimension.title}
Dimension Questions: ${dimension.core_questions.join(", ")}

Relevant Information Items:
${items.map((item, i) => `${i + 1}. ${item.content}`).join("\n\n")}

Task: Extract a meaningful insight from these items. An insight should be:
- A discovery, trend, anomaly, or validation
- Something that wasn't explicitly stated but can be inferred
- Valuable for achieving the goal

Return a JSON object with this format:
{
  "type": "discovery" | "trend" | "anomaly" | "validation",
  "title": "one-line catchy title",
  "content": "detailed explanation of the insight (3-5 sentences)",
  "significance": "high" | "medium" | "low",
  "reasoning": "step-by-step reasoning of how you derived this insight",
  "valueToGoal": "why this matters for the goal"
}`;

		try {
			const result = await this.llm.chatJSON<{
				type: "discovery" | "trend" | "anomaly" | "validation";
				title: string;
				content: string;
				significance: "high" | "medium" | "low";
				reasoning: string;
				valueToGoal: string;
			}>({
				systemPrompt: `You are analyzing information for a goal-driven agent.

Goal: ${goal.title}
Dimension: ${dimension.title}
Dimension Questions: ${dimension.core_questions.join(", ")}

Task: Extract a meaningful insight from these items. An insight should be:
- A discovery, trend, anomaly, or validation
- Something that wasn't explicitly stated but can be inferred
- Valuable for achieving the goal`,
				messages: [
					{
						role: "user",
						content: `Relevant Information Items:
${items.map((item, i) => `${i + 1}. ${item.content}`).join("\n\n")}

Return a JSON object with this format:
{
  "type": "discovery" | "trend" | "anomaly" | "validation",
  "title": "one-line catchy title",
  "content": "detailed explanation of the insight (3-5 sentences)",
  "significance": "high" | "medium" | "low",
  "reasoning": "step-by-step reasoning of how you derived this insight",
  "valueToGoal": "why this matters for the goal"
}`,
					},
				],
				temperature: 0.4,
			});

			return {
				id: `insight-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
				type: result.type || "discovery",
				title: result.title || "Untitled Insight",
				content: result.content || "",
				significance: result.significance || "medium",
				sources: items.map(item => ({
					sourceId: item.sourceId,
					snippet: item.content.slice(0, 100) + "..."
				})),
				reasoning: result.reasoning || "",
				valueToGoal: result.valueToGoal || "",
				relatedDimensionIds: [dimension.id],
				extractedAt: Date.now(),
			};
		} catch (error) {
			console.warn("[InsightExtractor] Failed to extract insight:", error);
			return null;
		}
	}

	/**
	 * Extract a synthesis insight that combines information from all items
	 */
	private async extractSynthesisInsight(
		goal: GoalNode,
		dimension: DimensionNode,
		items: InfoItem[]
	): Promise<Insight | null> {
		const prompt = `You are synthesizing information from multiple sources.

Goal: ${goal.title}
Dimension: ${dimension.title}

All Relevant Information Items:
${items.map((item, i) => `${i + 1}. ${item.content}`).join("\n\n")}

Task: Synthesize these items into a high-level insight that:
- Combines information from multiple sources
- Identifies patterns or connections
- Provides a bigger picture view

Return a JSON object with this format:
{
  "type": "synthesis",
  "title": "one-line synthesis title",
  "content": "detailed synthesis (3-5 sentences)",
  "significance": "high" | "medium" | "low",
  "reasoning": "how you connected different pieces of information",
  "valueToGoal": "why this synthesis matters for the goal"
}`;

		try {
			const result = await this.llm.chatJSON<{
				type: "synthesis";
				title: string;
				content: string;
				significance: "high" | "medium" | "low";
				reasoning: string;
				valueToGoal: string;
			}>({
				systemPrompt: `You are synthesizing information from multiple sources.

Goal: ${goal.title}
Dimension: ${dimension.title}

Task: Synthesize these items into a high-level insight that:
- Combines information from multiple sources
- Identifies patterns or connections
- Provides a bigger picture view`,
				messages: [
					{
						role: "user",
						content: `All Relevant Information Items:
${items.map((item, i) => `${i + 1}. ${item.content}`).join("\n\n")}

Return a JSON object with this format:
{
  "type": "synthesis",
  "title": "one-line synthesis title",
  "content": "detailed synthesis (3-5 sentences)",
  "significance": "high" | "medium" | "low",
  "reasoning": "how you connected different pieces of information",
  "valueToGoal": "why this synthesis matters for the goal"
}`,
					},
				],
				temperature: 0.5,
			});

			return {
				id: `synthesis-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
				type: "synthesis",
				title: result.title || "Synthesis",
				content: result.content || "",
				significance: result.significance || "medium",
				sources: items.map(item => ({
					sourceId: item.sourceId,
					snippet: item.content.slice(0, 100) + "..."
				})),
				reasoning: result.reasoning || "",
				valueToGoal: result.valueToGoal || "",
				relatedDimensionIds: [dimension.id],
				extractedAt: Date.now(),
			};
		} catch (error) {
			console.warn("[InsightExtractor] Failed to extract synthesis:", error);
			return null;
		}
	}
}
