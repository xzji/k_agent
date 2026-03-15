import { DataSource, InfoItem } from "../../types.js";
/**
 * Fallback Web Search Adapter
 *
 * Simulates a web search but in reality uses a lightweight
 * Brave Search API or similar if configured, or just a mock
 * for P1 until real search tools are integrated.
 */
export declare class WebSearchAdapter {
    /**
     * Search the web using the provided query
     */
    fetch(source: DataSource, dimensionId: string, goalId: string): Promise<InfoItem[]>;
}
//# sourceMappingURL=web-search-adapter.d.ts.map