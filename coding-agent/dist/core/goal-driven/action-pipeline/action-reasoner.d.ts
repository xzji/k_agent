import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, DimensionNode, GoalNode, InfoItem } from "../types.js";
/**
 * ActionReasoner
 *
 * Uses LLM to reason over collected info and generate the next ActionPlan for a dimension.
 */
export declare class ActionReasoner {
    private llm;
    constructor(llm: BackgroundLLMChannel);
    reasonNextAction(goal: GoalNode, dimension: DimensionNode, recentInfo: InfoItem[]): Promise<ActionPlan | null>;
}
//# sourceMappingURL=action-reasoner.d.ts.map