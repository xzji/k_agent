/**
 * ResultSynthesizer — Synthesize insights into notification-ready results
 *
 * Takes valued insights and formats them into structured results
 * that can be delivered to users as notifications.
 */

import type { Insight, ValueJudgment, SynthesizedResult, GoalNode, DimensionNode } from "../types.js";

export class ResultSynthesizer {
	private llm: any; // BackgroundLLMChannel
	private narrativeBuilder: any; // NarrativeBuilder

	constructor(llm: any, narrativeBuilder: any) {
		this.llm = llm;
		this.narrativeBuilder = narrativeBuilder;
	}

	/**
	 * Synthesize a single insight into a result
	 */
	async synthesizeInsight(
		insight: Insight,
		judgment: ValueJudgment,
		goal: GoalNode
	): Promise<SynthesizedResult> {
		const resultType = this.determineResultType(insight, goal);

		// Build narrative for this insight
		const narrative = await this.narrativeBuilder.build({
			insight,
			judgment,
			goal,
			resultType,
		});

		return {
			id: `result-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
			type: resultType,
			title: narrative.title,
			summary: narrative.summary,
			coreFinding: narrative.coreFinding,
			valueToGoal: narrative.valueToGoal,
			reasoningProcess: narrative.reasoningProcess,
			sources: this.formatSources(insight.sources),
			relatedGoalId: goal.id,
			relatedDimensionIds: insight.relatedDimensionIds,
			createdAt: Date.now(),
		};
	}

	/**
	 * Synthesize multiple insights into a consolidated result
	 */
	async synthesizeMultiple(
		insights: Insight[],
		judgments: ValueJudgment[],
		goal: GoalNode
	): Promise<SynthesizedResult> {
		// Group insights by dimension
		const byDimension = this.groupByDimension(insights, judgments);

		// If insights span multiple dimensions, create an analysis complete result
		if (byDimension.size > 1) {
			return this.createAnalysisCompleteResult(insights, judgments, goal);
		}

		// Otherwise, synthesize the best insight
		const bestJudgment = judgments.sort((a, b) => b.valueScore - a.valueScore)[0];
		const bestInsight = insights.find(i => i.id === bestJudgment.insightId)!;

		return this.synthesizeInsight(bestInsight, bestJudgment, goal);
	}

	/**
	 * Create a "dimension analysis complete" result
	 */
	private async createAnalysisCompleteResult(
		insights: Insight[],
		judgments: ValueJudgment[],
		goal: GoalNode
	): Promise<SynthesizedResult> {
		const dimensionId = insights[0].relatedDimensionIds[0];

		// Get high-value insights only
		const highValueInsights = insights.filter((insight, idx) => {
			const judgment = judgments.find(j => j.insightId === insight.id);
			return judgment && judgment.valueScore >= 70;
		});

		const prompt = `You are synthesizing analysis results for a goal-driven agent.

Goal: ${goal.title}
Dimension ID: ${dimensionId}

High-Value Insights Found: ${highValueInsights.length}

${highValueInsights.map((insight, i) => `
${i + 1}. ${insight.title}
   Type: ${insight.type}
   Significance: ${insight.significance}
   Content: ${insight.content}
`).join("\n")}

Task: Create a comprehensive "dimension analysis complete" notification that:
1. Summarizes key findings (3-5 bullet points)
2. Explains why these findings matter to the goal
3. Shows the reasoning process
4. Has a clear title

Return JSON:
{
  "title": "catchy title for the analysis",
  "summary": "one-line summary",
  "coreFinding": "structured key findings (3-5 bullet points)",
  "valueToGoal": "why this matters for the goal",
  "reasoningProcess": "how we arrived at these findings"
}`;

		try {
			const result = await this.llm.chatJSON<{
				title: string;
				summary: string;
				coreFinding: string;
				valueToGoal: string;
				reasoningProcess: string;
			}>({
				systemPrompt: `You are synthesizing analysis results for a goal-driven agent.`,
				messages: [
					{
						role: "user",
						content: `${prompt}

Return JSON:
{
  "title": "catchy title for the analysis",
  "summary": "one-line summary",
  "coreFinding": "structured key findings (3-5 bullet points)",
  "valueToGoal": "why this matters for the goal",
  "reasoningProcess": "how we arrived at these findings"
}`,
					},
				],
				temperature: 0.5,
			});

			return {
				id: `result-complete-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
				type: "analysis_complete",
				title: result.title || "维度分析完成",
				summary: result.summary || "",
				coreFinding: result.coreFinding || "",
				valueToGoal: result.valueToGoal || "",
				reasoningProcess: result.reasoningProcess || "",
				sources: insights.flatMap(i => this.formatSources(i.sources)),
				relatedGoalId: goal.id,
				relatedDimensionIds: [dimensionId],
				createdAt: Date.now(),
			};
		} catch (error) {
			console.warn("[ResultSynthesizer] Failed to create complete result:", error);

			// Fallback: return the first insight
			const bestInsight = insights[0];
			const bestJudgment = judgments.find(j => j.insightId === bestInsight.id)!;
			return this.synthesizeInsight(bestInsight, bestJudgment, goal);
		}
	}

	/**
	 * Determine result type based on insight and goal state
	 */
	private determineResultType(insight: Insight, goal: GoalNode): "discovery" | "analysis_complete" | "deliverable" {
		// TODO: Add more sophisticated logic
		// For now, most insights are discoveries
		if (insight.type === "synthesis") {
			return "analysis_complete";
		}
		return "discovery";
	}

	/**
	 * Group insights and judgments by dimension
	 */
	private groupByDimension(
		insights: Insight[],
		judgments: ValueJudgment[]
	): Map<string, { insights: Insight[]; judgments: ValueJudgment[] }> {
		const groups = new Map();

		for (const insight of insights) {
			const dimId = insight.relatedDimensionIds[0];
			if (!dimId) continue;

			if (!groups.has(dimId)) {
				groups.set(dimId, { insights: [], judgments: [] });
			}

			groups.get(dimId)!.insights.push(insight);

			const judgment = judgments.find(j => j.insightId === insight.id);
			if (judgment) {
				groups.get(dimId)!.judgments.push(judgment);
			}
		}

		return groups;
	}

	/**
	 * Format sources for output
	 */
	private formatSources(
		sources: Array<{ sourceId: string; snippet: string }>
	): Array<{ source: string; credibility: "high" | "medium" | "low" }> {
		// Determine credibility based on source type
		return sources.map(s => {
			let credibility: "high" | "medium" | "low" = "medium";

			if (s.sourceId.includes("github") || s.sourceId.includes("official")) {
				credibility = "high";
			} else if (s.sourceId.includes("reddit") || s.sourceId.includes("twitter")) {
				credibility = "medium";
			}

			return {
				source: s.sourceId,
				credibility,
			};
		});
	}
}
