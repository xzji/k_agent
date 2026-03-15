/**
 * GoalDecomposer — Uses LLM to decompose a goal into a dimension tree
 *
 * Given a goal description, generates 5-8 dimensions with:
 * - Timeliness (urgent/normal/can_wait)
 * - Value score (1-10)
 * - Max depth for exploration
 * - Hierarchical relationships
 */
import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DimensionNode, GoalNode } from "../types.js";
export declare class GoalDecomposer {
    private llm;
    constructor(llm: BackgroundLLMChannel);
    /**
     * Decompose a goal into a dimension tree
     */
    decompose(goal: GoalNode): Promise<DimensionNode[]>;
    private buildDecomposePrompt;
    /**
     * Convert LLM output into DimensionNode tree
     */
    private convertToNodes;
    private createNode;
}
//# sourceMappingURL=goal-decomposer.d.ts.map