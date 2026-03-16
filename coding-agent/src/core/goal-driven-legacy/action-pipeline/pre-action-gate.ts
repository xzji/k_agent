import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, GoalNode } from "../types.js";

/**
 * PreActionGate
 * 
 * Verifies if an ActionPlan is safe to execute autonomously, or if it requires user confirmation,
 * based on the goal's authorizationDepth and the action's inherent risk.
 */
export class PreActionGate {
	private llm: BackgroundLLMChannel;

	constructor(llm: BackgroundLLMChannel) {
		this.llm = llm;
	}

	/**
	 * Evaluate whether an ActionPlan can proceed.
	 * Returns "approve", "reject", or "needs_user".
	 */
	async evaluate(goal: GoalNode, plan: ActionPlan): Promise<"approve" | "reject" | "needs_user"> {
		// 1. Hard constraints based on AuthorizationDepth
		if (goal.authorizationDepth === "monitor") {
			// Monitor-only goals can NEVER execute autonomously
			return "needs_user";
		}

		if (plan.requiresUserInvolvement) {
			return "needs_user";
		}

		// 2. Risk assessment for 'assisted' or 'mixed'
		if (goal.authorizationDepth === "assisted" || goal.authorizationDepth === "mixed") {
			if (!plan.reversible || plan.costEstimate === "high") {
				return "needs_user";
			}
		}

		// 3. LLM semantic check for "full_auto" or safe "mixed" actions
		// Ask LLM to do a sanity check on whether this action aligns with constraints
		if (goal.constraints && goal.constraints.length > 0) {
			const prompt = `Goal: ${goal.title}
Constraints:
${goal.constraints.map(c => `- [${c.type}]: ${c.description}`).join('\n')}

Proposed Action: ${plan.what}
Reasoning: ${plan.why}
Expected Outcome: ${plan.expectedOutcome}

Does this action violate any of the constraints? 
Answer with a JSON object: {"violates": boolean, "reason": "string"}`;

			try {
				const parsed = await this.llm.chatJSON<{ violates: boolean; reason: string }>({
					systemPrompt: "You are the Pre-Action Gate. Determine if the proposed action violates any given constraints.",
					messages: [{ role: "user", content: prompt }]
				});
				
				if (parsed.violates) {
					// Plan violates a constraint
					return "reject";
				}
			} catch (err) {
				console.error("PreActionGate LLM check failed:", err);
				// Err on the side of caution
				return "needs_user";
			}
		}

		return "approve";
	}
}
