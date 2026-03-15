import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, GoalNode } from "../types.js";
/**
 * PreActionGate
 *
 * Verifies if an ActionPlan is safe to execute autonomously, or if it requires user confirmation,
 * based on the goal's authorizationDepth and the action's inherent risk.
 */
export declare class PreActionGate {
    private llm;
    constructor(llm: BackgroundLLMChannel);
    /**
     * Evaluate whether an ActionPlan can proceed.
     * Returns "approve", "reject", or "needs_user".
     */
    evaluate(goal: GoalNode, plan: ActionPlan): Promise<"approve" | "reject" | "needs_user">;
}
//# sourceMappingURL=pre-action-gate.d.ts.map