import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, CapabilityResolution } from "../types.js";
/**
 * CapabilityResolver
 *
 * Determines HOW to execute an ActionPlan by analyzing available capabilities
 * and selecting the best approach (Level 1-4 strategy).
 *
 * Level 1: Direct tool match (use existing tool)
 * Level 2: Tool composition (chain multiple tools)
 * Level 3: Code generation (write script to solve)
 * Level 4: User help request (ask user for assistance)
 */
export declare class CapabilityResolver {
    private llm;
    private availableTools;
    constructor(llm: BackgroundLLMChannel);
    /**
     * Resolve how to execute the given ActionPlan
     */
    resolve(plan: ActionPlan): Promise<CapabilityResolution>;
    /**
     * Extract a search query from natural language description
     */
    private extractSearchQuery;
    /**
     * Extract what the user needs to do for Level 4 cases
     */
    private extractUserTask;
    /**
     * Generate prepared parts to help the user
     */
    private generateUserHelpPreparation;
}
//# sourceMappingURL=capability-resolver.d.ts.map