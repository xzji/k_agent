"use strict";
/**
 * Knowledge Store
 *
 * JSON-based knowledge persistence with goal-scoped knowledge reuse.
 * Supports knowledge retrieval for tasks and injection into prompts.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
/**
 * Storage directory configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';
/**
 * Knowledge Store implementation with goal-scoped retrieval
 */
class KnowledgeStore {
    baseDir;
    cache = new Map();
    dirty = false;
    constructor(baseDir = STORAGE_DIR) {
        this.baseDir = baseDir.replace('~', process.env.HOME || '');
    }
    /**
     * Initialize storage
     */
    async init() {
        const knowledgeDir = path.dirname(this.getStoragePath());
        await fs.mkdir(knowledgeDir, { recursive: true });
        await this.loadFromDisk();
    }
    /**
     * Get storage file path
     */
    getStoragePath() {
        return path.join(this.baseDir, 'knowledge', 'global.jsonl');
    }
    /**
     * Load knowledge from disk
     */
    async loadFromDisk() {
        const storagePath = this.getStoragePath();
        try {
            const content = await fs.readFile(storagePath, 'utf-8');
            const lines = content.split('\n').filter((line) => line.trim());
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (!entry.deletedAt) {
                        this.cache.set(entry.id, entry);
                    }
                }
                catch (e) {
                    console.warn('[KnowledgeStore] Failed to parse entry:', line.slice(0, 100));
                }
            }
            console.log(`[KnowledgeStore] Loaded ${this.cache.size} entries`);
        }
        catch (error) {
            // File doesn't exist yet, start empty
            console.log('[KnowledgeStore] Starting with empty knowledge base');
        }
    }
    /**
     * Save knowledge to disk (append-only for JSONL)
     */
    async saveToDisk() {
        if (!this.dirty)
            return;
        const storagePath = this.getStoragePath();
        await fs.mkdir(path.dirname(storagePath), { recursive: true });
        // Write all entries as JSONL
        const lines = Array.from(this.cache.values())
            .filter((e) => !e.deletedAt)
            .map((entry) => JSON.stringify(entry));
        await fs.writeFile(storagePath, lines.join('\n') + '\n', 'utf-8');
        this.dirty = false;
        console.log(`[KnowledgeStore] Saved ${lines.length} entries`);
    }
    /**
     * Save a new knowledge entry
     */
    async save(entry) {
        const newEntry = {
            ...entry,
            id: (0, utils_1.generateId)(),
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(newEntry.id, newEntry);
        this.dirty = true;
        // Auto-save
        await this.appendEntry(newEntry);
        return (0, utils_1.deepClone)(newEntry);
    }
    /**
     * Append a single entry to the JSONL file
     */
    async appendEntry(entry) {
        const storagePath = this.getStoragePath();
        await fs.mkdir(path.dirname(storagePath), { recursive: true });
        const line = JSON.stringify(entry) + '\n';
        await fs.appendFile(storagePath, line, 'utf-8');
    }
    /**
     * Get entry by ID
     */
    async getById(id) {
        const entry = this.cache.get(id);
        if (!entry || entry.deletedAt) {
            return null;
        }
        return (0, utils_1.deepClone)(entry);
    }
    /**
     * Get all knowledge entries for a goal
     */
    async getByGoal(goalId) {
        const entries = Array.from(this.cache.values())
            .filter((e) => e.goalId === goalId && !e.deletedAt)
            .sort((a, b) => b.importance - a.importance);
        return (0, utils_1.deepClone)(entries);
    }
    /**
     * Get knowledge entries by task
     */
    async getByTask(taskId) {
        const entries = Array.from(this.cache.values())
            .filter((e) => e.taskId === taskId && !e.deletedAt)
            .sort((a, b) => b.importance - a.importance);
        return (0, utils_1.deepClone)(entries);
    }
    /**
     * Search knowledge entries
     */
    async search(query, options = {}) {
        const { maxResults = 10, minRelevance = 0.1, category, tags, } = options;
        const queryKeywords = (0, utils_1.extractKeywords)(query);
        const candidates = Array.from(this.cache.values()).filter((e) => !e.deletedAt);
        // Score each entry
        const scored = candidates.map((entry) => {
            let score = 0;
            // Text similarity
            score += (0, utils_1.calculateSimilarity)(queryKeywords, entry.content) * 0.5;
            score += (0, utils_1.calculateSimilarity)(queryKeywords, entry.tags.join(' ')) * 0.3;
            // Category match
            if (category && entry.category === category) {
                score += 0.2;
            }
            // Tag match
            if (tags) {
                const matchingTags = entry.tags.filter((t) => tags.includes(t));
                score += (matchingTags.length / tags.length) * 0.2;
            }
            // Importance boost
            score += entry.importance * 0.1;
            return { entry, score };
        });
        // Filter and sort
        return scored
            .filter((s) => s.score >= minRelevance)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map((s) => (0, utils_1.deepClone)(s.entry));
    }
    /**
     * Get relevant knowledge for a specific task
     * Limited to the same goal scope
     */
    async getRelevantKnowledgeForTask(task, query, options = {}) {
        const { maxResults = 5, minRelevance = 0.3 } = options;
        // 1. Get knowledge from the same goal
        let candidates = await this.getByGoal(task.goalId);
        // 2. If task has a dimension, prioritize same-dimension knowledge
        if (task.dimensionId && candidates.length > 0) {
            const dimKnowledge = candidates.filter((k) => k.relatedDimensionIds.includes(task.dimensionId));
            // If we have enough dimension-specific knowledge, use it primarily
            if (dimKnowledge.length >= Math.min(maxResults, 3)) {
                candidates = [...dimKnowledge, ...candidates];
            }
        }
        // 3. Score by relevance to query
        const queryKeywords = (0, utils_1.extractKeywords)(query);
        const scored = candidates.map((entry) => {
            const contentScore = (0, utils_1.calculateSimilarity)(queryKeywords, entry.content);
            const tagScore = (0, utils_1.calculateSimilarity)(queryKeywords, entry.tags.join(' '));
            const importanceBoost = entry.importance * 0.1;
            // Boost for task-associated knowledge
            const taskBoost = entry.taskId === task.id ? 0.3 : 0;
            // Boost for dimension match
            const dimBoost = task.dimensionId && entry.relatedDimensionIds.includes(task.dimensionId)
                ? 0.2
                : 0;
            const score = contentScore * 0.5 + tagScore * 0.2 + importanceBoost + taskBoost + dimBoost;
            return { entry, score };
        });
        // 4. Return high-relevance results
        return scored
            .filter((s) => s.score >= minRelevance)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map((s) => (0, utils_1.deepClone)(s.entry));
    }
    /**
     * Inject relevant knowledge into a prompt
     */
    async injectKnowledgeIntoPrompt(task, basePrompt, options = {}) {
        const { maxResults = 3, contextHeader = 'Relevant Background Knowledge' } = options;
        // Extract query from the prompt
        const query = (0, utils_1.extractKeywords)(basePrompt);
        // Get relevant knowledge
        const relevantKnowledge = await this.getRelevantKnowledgeForTask(task, query, {
            maxResults,
            minRelevance: 0.3,
        });
        if (relevantKnowledge.length === 0) {
            return basePrompt;
        }
        // Build knowledge context
        const knowledgeContext = relevantKnowledge
            .map((k, i) => {
            const preview = k.content.length > 300
                ? k.content.slice(0, 300) + '...'
                : k.content;
            return `[${i + 1}] ${preview}`;
        })
            .join('\n\n');
        // Inject into prompt
        return `## ${contextHeader}
${knowledgeContext}

---

## Task
${basePrompt}`;
    }
    /**
     * Update an existing knowledge entry
     */
    async update(id, updates) {
        const entry = await this.getById(id);
        if (!entry) {
            throw new Error(`Knowledge entry not found: ${id}`);
        }
        const updatedEntry = {
            ...entry,
            ...updates,
            id, // Ensure ID doesn't change
            goalId: entry.goalId, // Ensure goalId doesn't change
            createdAt: entry.createdAt, // Ensure createdAt doesn't change
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(id, updatedEntry);
        this.dirty = true;
        // Full save to update
        await this.saveToDisk();
        return (0, utils_1.deepClone)(updatedEntry);
    }
    /**
     * Update entry importance
     */
    async updateImportance(id, importance) {
        return this.update(id, { importance: Math.max(0, Math.min(1, importance)) });
    }
    /**
     * Add tags to an entry
     */
    async addTags(id, tags) {
        const entry = await this.getById(id);
        if (!entry) {
            throw new Error(`Knowledge entry not found: ${id}`);
        }
        const newTags = [...new Set([...entry.tags, ...tags])];
        return this.update(id, { tags: newTags });
    }
    /**
     * Link knowledge to a dimension
     */
    async linkToDimension(id, dimensionId) {
        const entry = await this.getById(id);
        if (!entry) {
            throw new Error(`Knowledge entry not found: ${id}`);
        }
        if (entry.relatedDimensionIds.includes(dimensionId)) {
            return entry; // Already linked
        }
        const newDimensionIds = [...entry.relatedDimensionIds, dimensionId];
        return this.update(id, { relatedDimensionIds: newDimensionIds });
    }
    /**
     * Delete an entry (soft delete)
     */
    async delete(id) {
        const entry = await this.getById(id);
        if (!entry) {
            return;
        }
        const updatedEntry = {
            ...entry,
            deletedAt: (0, utils_1.now)(),
        };
        this.cache.set(id, updatedEntry);
        this.dirty = true;
        await this.saveToDisk();
    }
    /**
     * Hard delete an entry (use with caution)
     */
    async hardDelete(id) {
        this.cache.delete(id);
        this.dirty = true;
        await this.saveToDisk();
    }
    /**
     * Get knowledge statistics
     */
    async getStats() {
        const entries = Array.from(this.cache.values()).filter((e) => !e.deletedAt);
        const byGoal = {};
        const byCategory = {};
        let totalImportance = 0;
        for (const entry of entries) {
            byGoal[entry.goalId] = (byGoal[entry.goalId] || 0) + 1;
            byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
            totalImportance += entry.importance;
        }
        return {
            totalEntries: entries.length,
            entriesByGoal: byGoal,
            entriesByCategory: byCategory,
            averageImportance: entries.length > 0 ? totalImportance / entries.length : 0,
        };
    }
    /**
     * Check if two goals have cross-activating knowledge
     */
    async checkCrossActivation(goalId1, goalId2) {
        const knowledge1 = await this.getByGoal(goalId1);
        const knowledge2 = await this.getByGoal(goalId2);
        // Extract keywords from both
        const text1 = knowledge1.map((k) => k.content).join(' ');
        const text2 = knowledge2.map((k) => k.content).join(' ');
        const keywords1 = new Set((0, utils_1.extractKeywords)(text1).split(' '));
        const keywords2 = new Set((0, utils_1.extractKeywords)(text2).split(' '));
        // Find shared keywords
        const shared = [...keywords1].filter((k) => keywords2.has(k));
        // Calculate relevance score
        const totalUnique = new Set([...keywords1, ...keywords2]).size;
        const relevanceScore = totalUnique > 0 ? shared.length / totalUnique : 0;
        return {
            hasOverlap: shared.length > 3,
            sharedKeywords: shared,
            relevanceScore,
        };
    }
    /**
     * Compact and optimize the storage file
     */
    async compact() {
        const before = this.cache.size;
        // Remove deleted entries from cache
        for (const [id, entry] of this.cache.entries()) {
            if (entry.deletedAt) {
                this.cache.delete(id);
            }
        }
        const after = this.cache.size;
        this.dirty = true;
        // Rewrite the file
        await this.saveToDisk();
        console.log(`[KnowledgeStore] Compacted: ${before} -> ${after} entries`);
        return { before, after };
    }
    /**
     * Clear all knowledge (for testing)
     */
    async clearAll() {
        this.cache.clear();
        this.dirty = false;
        const storagePath = this.getStoragePath();
        try {
            await fs.unlink(storagePath);
        }
        catch (error) {
            // File doesn't exist
        }
    }
}
exports.KnowledgeStore = KnowledgeStore;
//# sourceMappingURL=knowledge-store.js.map