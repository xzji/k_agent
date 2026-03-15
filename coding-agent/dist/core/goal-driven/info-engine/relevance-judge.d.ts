import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { DimensionNode, GoalNode, InfoItem } from "../types.js";
/**
 * RelevanceJudge
 *
 * Uses LLM to evaluate the relevance of collected information against the goal and dimension.
 */
export declare class RelevanceJudge {
    private llm;
    constructor(llm: BackgroundLLMChannel);
    /**
     * Judge the relevance of multiple info items.
     * Returns items that meet the relevance criteria.
     */
    judgeBatch(goal: GoalNode, dimension: DimensionNode, items: InfoItem[]): Promise<InfoItem[]>;
}
//# sourceMappingURL=relevance-judge.d.ts.map