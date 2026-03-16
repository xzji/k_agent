/**
 * NotificationFormatter — Format SynthesizedResult into user-facing notifications
 *
 * Transforms structured results into beautifully formatted notification text
 * following the "Why - What - How" structure.
 */

import type { SynthesizedResult } from "../types.js";

export class NotificationFormatter {
	/**
	 * Format a synthesized result into notification text
	 */
	format(result: SynthesizedResult): string {
		const emoji = this.getTypeEmoji(result.type);
		const typeLabel = this.getTypeLabel(result.type);

		let notification = `${emoji} ${typeLabel} - ${result.title}\n\n`;

		// Core Finding
		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
		notification += `📌 核心发现\n${result.coreFinding}\n\n`;

		// Value to Goal
		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
		notification += `🔗 为什么重要\n${result.valueToGoal}\n\n`;

		// Reasoning Process
		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
		notification += `💡 推理过程\n${result.reasoningProcess}\n\n`;

		// Sources
		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
		notification += `📚 来源\n`;
		for (const source of result.sources) {
			const credibilityEmoji = this.getCredibilityEmoji(source.credibility);
			notification += `• ${source.source} ${credibilityEmoji}\n`;
		}

		// Deliverable info if present
		if (result.deliverablePath) {
			notification += `\n📦 完整报告：${result.deliverablePath}\n`;
		}

		return notification.trim();
	}

	/**
	 * Format multiple results into a single notification
	 */
	formatMultiple(results: SynthesizedResult[]): string {
		if (results.length === 0) {
			return "无新发现";
		}

		if (results.length === 1) {
			return this.format(results[0]);
		}

		// Multiple results: create a summary notification
		let notification = `📊 发现 ${results.length} 个有价值的结果\n\n`;
		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

		results.forEach((result, index) => {
			const emoji = this.getTypeEmoji(result.type);
			notification += `${index + 1}. ${emoji} ${result.title}\n`;
			notification += `   ${result.summary}\n\n`;
		});

		notification += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
		notification += `💡 提示：使用 /goal logs 查看详细信息\n`;

		return notification.trim();
	}

	/**
	 * Get emoji for result type
	 */
	private getTypeEmoji(type: SynthesizedResult["type"]): string {
		switch (type) {
			case "discovery":
				return "🎯";
			case "analysis_complete":
				return "📊";
			case "deliverable":
				return "📦";
			default:
				return "📌";
		}
	}

	/**
	 * Get label for result type
	 */
	private getTypeLabel(type: SynthesizedResult["type"]): string {
		switch (type) {
			case "discovery":
				return "重要发现";
			case "analysis_complete":
				return "分析完成";
			case "deliverable":
				return "里程碑成果";
			default:
				return "通知";
		}
	}

	/**
	 * Get emoji for credibility level
	 */
	private getCredibilityEmoji(credibility: "high" | "medium" | "low"): string {
		switch (credibility) {
			case "high":
				return "✅";
			case "medium":
				return "⚠️";
			case "low":
				return "❓";
			default:
				return "";
		}
	}

	/**
	 * Format result into markdown (for deliverables)
	 */
	formatMarkdown(result: SynthesizedResult): string {
		const emoji = this.getTypeEmoji(result.type);
		const typeLabel = this.getTypeLabel(result.type);

		let md = `# ${emoji} ${typeLabel}: ${result.title}\n\n`;

		md += `## 核心发现\n\n${result.coreFinding}\n\n`;
		md += `## 为什么重要\n\n${result.valueToGoal}\n\n`;
		md += `## 推理过程\n\n${result.reasoningProcess}\n\n`;
		md += `## 来源\n\n`;

		for (const source of result.sources) {
			md += `- ${source.source} (${source.credibility})\n`;
		}

		return md;
	}
}
