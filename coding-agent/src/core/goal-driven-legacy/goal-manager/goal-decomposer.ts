/**
 * GoalDecomposer — Uses LLM to decompose a goal into a dimension tree
 *
 * Given a goal description, generates 4-6 dimensions with:
 * - Goal understanding and completion vision
 * - Core questions (2-4 per dimension)
 * - Timeliness (urgent/normal/can_wait) - when to start
 * - Refresh interval (hours/daily/weekly/monthly) - how often to refresh
 * - Value score (1-10)
 * - Estimated depth (1-5)
 */

import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DimensionNode, GoalNode } from "../types.js";
import { generateId } from "../utils.js";

interface DecompositionResult {
	goal_understanding: string;
	completion_vision: string;
	dimensions: DecomposedDimension[];
}

interface DecomposedDimension {
	title: string;
	description: string;
	core_questions: string[];
	timeliness: "urgent" | "normal" | "can_wait";
	refresh_interval: "hours" | "daily" | "weekly" | "monthly";
	valueScore: number;
	estimated_depth: number;
}

type ProgressCallback = (message: string, type?: "info" | "success" | "warning") => void;

export class GoalDecomposer {
	private llm: BackgroundLLMChannel;
	private onProgress?: ProgressCallback;

	constructor(llm: BackgroundLLMChannel, onProgress?: ProgressCallback) {
		this.llm = llm;
		this.onProgress = onProgress;
	}

	/**
	 * Decompose a goal into a dimension tree
	 */
	async decompose(goal: GoalNode): Promise<DimensionNode[]> {
		// Build progress message that will be updated
		let progressMsg = "🔍 正在分析目标并拆解维度...";

		this.onProgress?.(progressMsg, "info");

		const prompt = this.buildDecomposePrompt(goal);

		try {
			this.onProgress?.("📝 正在调用 LLM 进行目标拆解...", "info");

			const result = await this.llm.chatJSON<DecompositionResult>({
				systemPrompt: `You are a strategic planning assistant. You decompose goals into actionable dimensions for systematic research and execution.

Your output is a structured JSON object. Each dimension represents a distinct aspect or angle to explore for the goal. Be thorough but focused — aim for 4-6 top-level dimensions.

IMPORTANT: Always respond with valid JSON only. Do not include any text, explanation, or markdown formatting outside the JSON object.`,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.5,
				maxTokens: 20000, // Increased to handle large responses
			});

			this.onProgress?.(`🔍 LLM 响应已接收，验证结构...`, "info");

			// Validate result structure
			if (!result) {
				this.onProgress?.(`❌ LLM 返回了 null/undefined`, "warning");
				throw new Error("Invalid LLM response: result is null/undefined");
			}

			// Check if result is an array (LLM might have returned array instead of object)
			if (Array.isArray(result)) {
				this.onProgress?.(`❌ LLM 返回了数组而不是对象`, "warning");
				this.onProgress?.(`   数组长度: ${result.length}`, "warning");
				// If array, maybe it's the dimensions array directly?
				if (result.length > 0 && typeof result[0] === 'object') {
					this.onProgress?.(`   尝试将数组作为 dimensions 使用`, "info");
					const dimensions = this.convertToNodes(goal.id, result);
					// Continue with dimensions...
					goal.goal_understanding = "";
					goal.completion_vision = "";
					goal.updatedAt = Date.now();

					let resultMsg = `✅ 目标拆解完成 (${result.length} 个维度):\n\n`;
					dimensions.forEach((dim, idx) => {
						resultMsg += `${idx + 1}. **${dim.title}**\n`;
						resultMsg += `   时效: ${dim.timeliness} | 频率: ${dim.refresh_interval} | 价值: ${dim.valueScore}/10\n`;
						resultMsg += `   描述: ${dim.description.substring(0, 80)}...\n`;
						resultMsg += `   核心问题:\n`;
						dim.core_questions.forEach(q => {
							resultMsg += `     • ${q}\n`;
						});
						resultMsg += `\n`;
					});

					this.onProgress?.(resultMsg, "success");
					return dimensions;
				}
				throw new Error("Invalid LLM response: result is an array");
			}

			if (!result.dimensions || !Array.isArray(result.dimensions)) {
				this.onProgress?.(`❌ dimensions 字段缺失或不是数组: ${typeof result.dimensions}`, "warning");
				this.onProgress?.(`   实际返回的键: ${Object.keys(result).join(", ")}`, "warning");
				throw new Error("Invalid LLM response: missing or invalid dimensions array");
			}

			if (result.dimensions.length === 0) {
				this.onProgress?.(`⚠️  dimensions 数组为空`, "warning");
				throw new Error("Invalid LLM response: dimensions array is empty");
			}

			this.onProgress?.(`✅ 成功获取 ${result.dimensions.length} 个维度`, "info");

			// Update goal with understanding and vision
			goal.goal_understanding = result.goal_understanding || "";
			goal.completion_vision = result.completion_vision || "";
			goal.updatedAt = Date.now();

			// Build complete result message
			const dimensions = this.convertToNodes(goal.id, result.dimensions);

			let resultMsg = `✅ 目标拆解完成 (${result.dimensions.length} 个维度):\n\n`;
			dimensions.forEach((dim, idx) => {
				resultMsg += `${idx + 1}. **${dim.title}**\n`;
				resultMsg += `   时效: ${dim.timeliness} | 频率: ${dim.refresh_interval} | 价值: ${dim.valueScore}/10\n`;
				resultMsg += `   描述: ${dim.description.substring(0, 80)}...\n`;
				resultMsg += `   核心问题:\n`;
				dim.core_questions.forEach(q => {
					resultMsg += `     • ${q}\n`;
				});
				resultMsg += `\n`;
			});

			this.onProgress?.(resultMsg, "success");

			return dimensions;
		} catch (error) {
			const errorMsg = `⚠️  LLM 拆解失败: ${error}`;
			this.onProgress?.(errorMsg, "warning");
			// Fallback: create a single generic dimension
			return [
				this.createNode(goal.id, {
					title: "General exploration",
					description: `General exploration of: ${goal.title}`,
					core_questions: [`What are the key aspects of ${goal.title}?`],
					timeliness: "normal",
					refresh_interval: "weekly",
					valueScore: 5,
					estimated_depth: 2,
				}),
			];
		}
	}

	private buildDecomposePrompt(goal: GoalNode): string {
		let prompt = `你是一个目标驱动型 AI 助手的「目标拆解引擎」。

你的唯一职责：当用户告诉你一个目标时，将它拆解为 4-6 个「探索维度」。这些维度是为了帮助用户实现目标所必须覆盖的子方向——每个维度都应该与目标强相关、可独立探索、且有明确的信息收集和行动指向。

═══════════════════════════════════════════
你的思考原则
═══════════════════════════════════════════

1. 以终为始：先想象目标完美达成的样子，然后反推"要达成这个结果，必须搞清楚哪几个方面的事情"。

2. 维度是子方向，不是步骤：
   - ✅ 正确的维度："市场竞争格局"（一个需要持续探索的方向）
   - ❌ 错误的维度："第一步收集资料"（这是执行步骤，不是探索方向）

3. 维度之间应互补而非重叠：合在一起应基本覆盖目标的全貌，但每个维度关注不同的角度。不要求严格的 MECE（互斥穷尽），允许维度之间有轻微的交叉，但不应有大面积重复。

4. 每个维度必须可以独立展开信息搜集和分析：如果一个维度过于抽象、无法直接指导"去搜什么、看什么"，那它需要被具象化或拆得更细。

5. 维度要包含对目标最关键的方面，也要包含容易被忽视但实际重要的方面。不要只列显而易见的，也要思考盲区。

═══════════════════════════════════════════
你的输出要求
═══════════════════════════════════════════

对每个维度，你需要输出以下字段：

- title：维度名称（简洁，5-15 字）

- description：这个维度要探索什么、为什么重要、要回答的核心问题是什么（2-4 句话）

- core_questions：该维度需要回答的 2-4 个核心问题（具体的、可搜索的问题）

- timeliness：初始紧迫性——多快需要开始探索这个维度
  - "urgent"：有时间窗口或依赖关系，需要尽快开始
  - "normal"：正常节奏启动即可
  - "can_wait"：可以等其他维度先推进后再开始

- refresh_interval：探索频率——多久需要重新采集一次该维度的信息
  - "hours"：信息以小时级更新（如实时舆情、热点事件、股价波动）
  - "daily"：信息以天级更新（如竞品动态、技术社区讨论、新闻报道）
  - "weekly"：信息以周级更新（如行业报告、项目进展、开源版本发布）
  - "monthly"：信息以月级或更慢更新（如学术综述、市场季报、政策法规）
  判断依据：综合两个因素——
  (1) 信息源更新频率：该维度关注的信息，在真实世界中多久会产生有意义的新内容？
  (2) 维度价值大小：价值越高的维度，即使信息源更新不算快，也应适当提高采集频率，以确保不遗漏关键变化；价值较低的维度，即使信息源更新快，也可以降低频率避免浪费资源。
  简言之：高价值 + 高更新 → hours/daily；高价值 + 低更新 → 比信息源频率略高；低价值 + 高更新 → 比信息源频率略低；低价值 + 低更新 → monthly。

- value_score：对目标推进的价值（1-10，10 = 没有它目标无法完成，1 = 锦上添花）

- estimated_depth：预估需要多深的探索（1-5）
  - 1 = 快速搜索即可了解
  - 3 = 需要多轮搜索和交叉验证
  - 5 = 需要深度研究、阅读多篇文献或持续跟踪

═══════════════════════════════════════════
输出格式
═══════════════════════════════════════════

严格输出以下 JSON，不要输出任何 JSON 以外的内容：

{
  "goal_understanding": "用一句话概括你对用户目标的理解",
  "completion_vision": "用 1-2 句话描述目标完美达成后的样子",
  "dimensions": [
    {
      "title": "维度名称",
      "description": "这个维度要探索什么、为什么重要、核心问题",
      "core_questions": [
        "具体问题 1",
        "具体问题 2",
        "具体问题 3"
      ],
      "timeliness": "urgent | normal | can_wait",
      "refresh_interval": "hours | daily | weekly | monthly",
      "valueScore": 8,
      "estimated_depth": 3
    }
  ]
}

═══════════════════════════════════════════
质量检查清单（输出前自检）
═══════════════════════════════════════════

□ 维度数量在 4-6 个之间
□ 每个维度都与用户目标强相关（如果删掉某个维度，目标会明显缺一块）
□ 维度之间没有大面积重叠
□ 合在一起基本覆盖了目标的全貌
□ 每个维度的 core_questions 是具体的、可以直接拿去搜索或调研的
□ 至少有一个维度关注了容易被忽视但实际重要的方面
□ value_score 的分布合理（不应全是 8-10，也不应全是 3-5）
□ timeliness 是根据"多快需要开始"判断的
□ refresh_interval 是根据"信息源更新频率"和"维度价值大小"综合判断的
□ timeliness 和 refresh_interval 是独立判断的（一个管启动时机，一个管持续频率）

═══════════════════════════════════════════
用户目标
═══════════════════════════════════════════

**标题**: ${goal.title}
**描述**: ${goal.description}`;

		if (goal.constraints.length > 0) {
			prompt += `\n\n**约束条件**:\n${goal.constraints.map((c) => `- [${c.type}] ${c.description}${c.value ? ` (${c.value})` : ""}`).join("\n")}`;
		}

		if (goal.authorizationDepth) {
			prompt += `\n\n**授权深度**: ${goal.authorizationDepth}`;
		}

		if (goal.priority) {
			prompt += `\n**优先级**: ${goal.priority}/10`;
		}

		prompt += `\n\n请根据以上目标，输出拆解结果（仅 JSON，不要其他内容）：`;

		return prompt;
	}

	/**
	 * Convert LLM output into DimensionNode tree
	 */
	private convertToNodes(
		goalId: string,
		dims: DecomposedDimension[],
	): DimensionNode[] {
		return dims.map((dim) => {
			return this.createNode(goalId, dim);
		});
	}

	private createNode(
		goalId: string,
		dim: DecomposedDimension,
	): DimensionNode {
		return {
			id: generateId(),
			goalId,
			parentDimensionId: null,
			title: dim.title,
			description: dim.description,
			core_questions: dim.core_questions,
			status: "pending",
			explorationDepth: 0,
			estimated_depth: dim.estimated_depth,
			timeliness: dim.timeliness,
			refresh_interval: dim.refresh_interval,
			valueScore: dim.valueScore,
			children: [],
			dataSources: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
	}
}
