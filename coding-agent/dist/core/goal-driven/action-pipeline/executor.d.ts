import type { ExtensionAPI } from "../../extensions/types.js";
import { ActionPlan, CapabilityResolution, ExecutionResult } from "../types.js";
/**
 * Executor
 *
 * Executes an approved ActionPlan using the resolved capability (tool chain).
 * For P2, supports bash commands, web search, and basic file operations.
 */
export declare class Executor {
    private pi;
    private llm;
    constructor(pi: ExtensionAPI, llm?: any);
    /**
     * Executes the approved ActionPlan with the given capability resolution
     */
    execute(plan: ActionPlan, resolution: CapabilityResolution): Promise<ExecutionResult>;
    /**
     * Execute a single tool step
     */
    private executeStep;
    /**
     * Execute bash command via pi.exec
     */
    private executeBash;
    /**
     * Execute web search (uses a search API or falls back to curl)
     */
    private executeWebSearch;
    /**
     * Read file contents
     */
    private executeRead;
    /**
     * Write content to file
     */
    private executeWrite;
    /**
     * Grep for patterns in files
     */
    private executeGrep;
    /**
     * Find files
     */
    private executeFind;
    /**
     * List directory contents
     */
    private executeLs;
    /**
     * Execute LLM analysis step
     */
    private executeLLMAnalysis;
    private sleep;
}
//# sourceMappingURL=executor.d.ts.map