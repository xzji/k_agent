/**
 * Knowledge Store
 *
 * JSON-based knowledge persistence with goal-scoped knowledge reuse.
 * Supports knowledge retrieval for tasks and injection into prompts.
 */
import { type KnowledgeEntry, type KnowledgeQueryOptions, type Task, type IKnowledgeStore } from '../types';
/**
 * Knowledge Store implementation with goal-scoped retrieval
 */
export declare class KnowledgeStore implements IKnowledgeStore {
    private baseDir;
    private cache;
    private dirty;
    constructor(baseDir?: string);
    /**
     * Initialize storage
     */
    init(): Promise<void>;
    /**
     * Get storage file path
     */
    private getStoragePath;
    /**
     * Load knowledge from disk
     */
    private loadFromDisk;
    /**
     * Save knowledge to disk (append-only for JSONL)
     */
    private saveToDisk;
    /**
     * Save a new knowledge entry
     */
    save(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): Promise<KnowledgeEntry>;
    /**
     * Append a single entry to the JSONL file
     */
    private appendEntry;
    /**
     * Get entry by ID
     */
    getById(id: string): Promise<KnowledgeEntry | null>;
    /**
     * Get all knowledge entries for a goal
     */
    getByGoal(goalId: string): Promise<KnowledgeEntry[]>;
    /**
     * Get knowledge entries by task
     */
    getByTask(taskId: string): Promise<KnowledgeEntry[]>;
    /**
     * Search knowledge entries
     */
    search(query: string, options?: KnowledgeQueryOptions): Promise<KnowledgeEntry[]>;
    /**
     * Get relevant knowledge for a specific task
     * Limited to the same goal scope
     */
    getRelevantKnowledgeForTask(task: Task, query: string, options?: KnowledgeQueryOptions): Promise<KnowledgeEntry[]>;
    /**
     * Inject relevant knowledge into a prompt
     */
    injectKnowledgeIntoPrompt(task: Task, basePrompt: string, options?: {
        maxResults?: number;
        contextHeader?: string;
    }): Promise<string>;
    /**
     * Update an existing knowledge entry
     */
    update(id: string, updates: Partial<KnowledgeEntry>): Promise<KnowledgeEntry>;
    /**
     * Update entry importance
     */
    updateImportance(id: string, importance: number): Promise<KnowledgeEntry>;
    /**
     * Add tags to an entry
     */
    addTags(id: string, tags: string[]): Promise<KnowledgeEntry>;
    /**
     * Link knowledge to a dimension
     */
    linkToDimension(id: string, dimensionId: string): Promise<KnowledgeEntry>;
    /**
     * Delete an entry (soft delete)
     */
    delete(id: string): Promise<void>;
    /**
     * Hard delete an entry (use with caution)
     */
    hardDelete(id: string): Promise<void>;
    /**
     * Get knowledge statistics
     */
    getStats(): Promise<{
        totalEntries: number;
        entriesByGoal: Record<string, number>;
        entriesByCategory: Record<string, number>;
        averageImportance: number;
    }>;
    /**
     * Check if two goals have cross-activating knowledge
     */
    checkCrossActivation(goalId1: string, goalId2: string): Promise<{
        hasOverlap: boolean;
        sharedKeywords: string[];
        relevanceScore: number;
    }>;
    /**
     * Compact and optimize the storage file
     */
    compact(): Promise<{
        before: number;
        after: number;
    }>;
    /**
     * Clear all knowledge (for testing)
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=knowledge-store.d.ts.map