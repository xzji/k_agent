/**
 * KnowledgeStore — Long-term memory for the goal-driven agent
 *
 * Stores:
 * - Weak-relevance information filtered by RelevanceJudge
 * - Shelved action plan context
 * - Execution byproducts not directly pushed to user
 * - Cross-activated discoveries
 *
 * P0: Basic save/search/list. P4 adds cross-activation.
 */
import type { KnowledgeEntry } from "../types.js";
export declare class KnowledgeStore {
    private entries;
    private dataDir;
    constructor(dataDir: string);
    /**
     * Save a new knowledge entry
     */
    save(params: {
        content: string;
        source: KnowledgeEntry["source"];
        relatedGoalIds: string[];
        relatedDimensionIds?: string[];
        tags?: string[];
        supplementNeeded?: string;
    }): KnowledgeEntry;
    /**
     * Simple keyword search
     * P4 will add semantic search and cross-activation
     */
    search(query: string, limit?: number): KnowledgeEntry[];
    /**
     * Get entries related to a specific goal
     */
    getByGoal(goalId: string): KnowledgeEntry[];
    /**
     * Get total entry count
     */
    count(): number;
    private ensureDir;
    private appendToDisk;
    private loadFromDisk;
}
//# sourceMappingURL=knowledge-store.d.ts.map