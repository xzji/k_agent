/**
 * NarrativeBuilder — Build narrative structures for notifications
 *
 * Constructs the "why - what - how" narrative structure that makes
 * notifications clear, valuable, and trustworthy.
 */

import type { Insight, ValueJudgment, GoalNode } from "../types.js";

export interface NarrativeBuildInput {
	insight: Insight;
	judgment: ValueJudgment;
	goal: GoalNode;
	resultType: "discovery" | "analysis_complete" | "deliverable";
}

export interface NarrativeOutput {
	title: string;
	summary: string;
	coreFinding: string;
	valueToGoal: string;
	reasoningProcess: string;
}

export class NarrativeBuilder {
	/**
	 * Build narrative from insight and judgment
	 */
	async build(input: NarrativeBuildInput): Promise<NarrativeOutput> {
		const { insight, judgment, goal, resultType } = input;

		// Build based on result type
		switch (resultType) {
			case "discovery":
				return this.buildDiscoveryNarrative(insight, judgment, goal);
			case "analysis_complete":
				return this.buildAnalysisCompleteNarrative(insight, judgment, goal);
			case "deliverable":
				return this.buildDeliverableNarrative(insight, judgment, goal);
			default:
				return this.buildDefaultNarrative(insight, judgment, goal);
		}
	}

	/**
	 * Build narrative for discovery notifications
	 */
	private buildDiscoveryNarrative(
		insight: Insight,
		judgment: ValueJudgment,
		goal: GoalNode
	): NarrativeOutput {
		// Use LLM to enhance narrative
		const enhanced = this.enhanceNarrative(insight, goal, "discovery");

		return {
			title: enhanced.title || insight.title,
			summary: enhanced.summary || `${insight.type}: ${insight.title}`,
			coreFinding: this.formatCoreFinding(insight.content),
			valueToGoal: this.formatValueToGoal(insight.valueToGoal, goal),
			reasoningProcess: this.formatReasoningProcess(insight),
		};
	}

	/**
	 * Build narrative for analysis complete notifications
	 */
	private buildAnalysisCompleteNarrative(
		insight: Insight,
		judgment: ValueJudgment,
		goal: GoalNode
	): NarrativeOutput {
		const enhanced = this.enhanceNarrative(insight, goal, "analysis");

		return {
			title: enhanced.title || `维度分析完成: ${insight.relatedDimensionIds[0]?.slice(0, 8)}`,
			summary: enhanced.summary || `完成对目标"${goal.title}"的维度分析`,
			coreFinding: this.formatCoreFinding(insight.content),
			valueToGoal: this.formatValueToGoal(insight.valueToGoal, goal),
			reasoningProcess: this.formatReasoningProcess(insight),
		};
	}

	/**
	 * Build narrative for deliverable notifications
	 */
	private buildDeliverableNarrative(
		insight: Insight,
		judgment: ValueJudgment,
		goal: GoalNode
	): NarrativeOutput {
		return {
			title: `📦 里程碑成果: ${insight.title}`,
			summary: `为目标"${goal.title}"生成了可交付成果`,
			coreFinding: this.formatCoreFinding(insight.content),
			valueToGoal: `这是你目标"${goal.title}"的可交付成果，可直接用于决策或分享`,
			reasoningProcess: this.formatReasoningProcess(insight),
		};
	}

	/**
	 * Build default narrative (fallback)
	 */
	private buildDefaultNarrative(
		insight: Insight,
		judgment: ValueJudgment,
		goal: GoalNode
	): NarrativeOutput {
		return {
			title: insight.title,
			summary: `${insight.type} - 价值评分: ${judgment.valueScore}/100`,
			coreFinding: insight.content,
			valueToGoal: insight.valueToGoal,
			reasoningProcess: insight.reasoning,
		};
	}

	/**
	 * Use LLM to enhance narrative quality
	 */
	private enhanceNarrative(
		insight: Insight,
		goal: GoalNode,
		type: string
	): Partial<NarrativeOutput> {
		// For now, return empty object (can be enhanced later with LLM)
		// The narrative construction is primarily template-based for reliability
		return {};
	}

	/**
	 * Format core finding section
	 */
	private formatCoreFinding(content: string): string {
		// Ensure content is well-structured
		// Add bullet points if not present
		if (!content.includes("•") && !content.includes("-")) {
			// Try to split into sentences
			const sentences = content.split(/(?<=[.!?])\s+/);
			if (sentences.length > 1) {
				return sentences.map(s => s.trim()).filter(s => s.length > 0).join("\n");
			}
		}

		return content;
	}

	/**
	 * Format value-to-goal section
	 */
	private formatValueToGoal(valueText: string, goal: GoalNode): string {
		if (!valueText) {
			return `此发现支持目标"${goal.title}"的进展。`;
		}

		// Ensure it connects to the goal
		if (!valueText.toLowerCase().includes(goal.title.toLowerCase())) {
			return `对于目标"${goal.title}"：${valueText}`;
		}

		return valueText;
	}

	/**
	 * Format reasoning process section
	 */
	private formatReasoningProcess(insight: Insight): string {
		const parts: string[] = [];

		// Add discovery phase
		if (insight.sources.length > 0) {
			const sourceList = insight.sources.map(s => s.sourceId).join(", ");
			parts.push(`• 发现：从 ${sourceList} 等来源获取信息`);
		}

		// Add analysis phase
		if (insight.reasoning) {
			parts.push(`• 分析：${insight.reasoning}`);
		}

		// Add conclusion phase
		parts.push(`• 结论：基于以上分析，得出${insight.type === "trend" ? "趋势" : "发现"}`);

		return parts.join("\n");
	}
}
