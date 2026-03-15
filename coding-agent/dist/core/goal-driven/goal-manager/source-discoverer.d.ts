/**
 * SourceDiscoverer — Discovers and binds data sources to dimensions
 *
 * Uses LLM to:
 * 1. Identify relevant information sources for each dimension
 * 2. Check accessibility of discovered sources
 * 3. Bind sources to dimensions with fetch intervals
 *
 * Always includes a fallback web search source.
 */
import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DataSource, DimensionNode, GoalNode } from "../types.js";
export declare class SourceDiscoverer {
    private llm;
    constructor(llm: BackgroundLLMChannel);
    /**
     * Discover data sources for all dimensions of a goal
     * Returns created DataSource objects (also binds to dimensions in-place)
     */
    discoverAndBind(goal: GoalNode, dimensions: DimensionNode[]): Promise<DataSource[]>;
    /**
     * Discover sources for a single dynamically-added dimension
     */
    discoverAndBindSingle(goal: GoalNode, dim: DimensionNode): Promise<void>;
    private buildDiscoverPrompt;
    private defaultFetchInterval;
    private flattenDimensions;
}
//# sourceMappingURL=source-discoverer.d.ts.map