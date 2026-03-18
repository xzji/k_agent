/**
 * Knowledge Store
 *
 * JSON-based knowledge persistence with goal-scoped knowledge reuse.
 * Supports knowledge retrieval for tasks and injection into prompts.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type KnowledgeEntry,
  type KnowledgeQueryOptions,
  type Task,
  type IKnowledgeStore,
} from '../types';
import { generateId, now, calculateSimilarity, extractKeywords, deepClone } from '../utils';

/**
 * Storage directory configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';

/**
 * Knowledge storage structure
 */
interface KnowledgeStorage {
  entries: KnowledgeEntry[];
  version: number;
  lastUpdated: number;
}

/**
 * Knowledge Store implementation with goal-scoped retrieval
 */
export class KnowledgeStore implements IKnowledgeStore {
  private baseDir: string;
  private cache: Map<string, KnowledgeEntry> = new Map();
  private dirty = false;

  constructor(baseDir: string = STORAGE_DIR) {
    this.baseDir = baseDir.replace('~', process.env.HOME || '');
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    const knowledgeDir = path.dirname(this.getStoragePath());
    await fs.mkdir(knowledgeDir, { recursive: true });
    await this.loadFromDisk();
  }

  /**
   * Get storage file path
   */
  private getStoragePath(): string {
    return path.join(this.baseDir, 'knowledge', 'global.jsonl');
  }

  /**
   * Load knowledge from disk
   */
  private async loadFromDisk(): Promise<void> {
    const storagePath = this.getStoragePath();

    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry: KnowledgeEntry = JSON.parse(line);
          if (!entry.deletedAt) {
            this.cache.set(entry.id, entry);
          }
        } catch (e) {
          console.warn('[KnowledgeStore] Failed to parse entry:', line.slice(0, 100));
        }
      }

      // Knowledge entries loaded successfully
    } catch (error) {
      // File doesn't exist yet, start empty
    }
  }

  /**
   * Save knowledge to disk (append-only for JSONL)
   */
  private async saveToDisk(): Promise<void> {
    if (!this.dirty) return;

    const storagePath = this.getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    // Write all entries as JSONL
    const lines = Array.from(this.cache.values())
      .filter((e) => !e.deletedAt)
      .map((entry) => JSON.stringify(entry));

    await fs.writeFile(storagePath, lines.join('\n') + '\n', 'utf-8');
    this.dirty = false;
  }

  /**
   * Save a new knowledge entry
   */
  async save(
    entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>
  ): Promise<KnowledgeEntry> {
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };

    this.cache.set(newEntry.id, newEntry);
    this.dirty = true;

    // Auto-save
    await this.appendEntry(newEntry);

    return deepClone(newEntry);
  }

  /**
   * Append a single entry to the JSONL file
   */
  private async appendEntry(entry: KnowledgeEntry): Promise<void> {
    const storagePath = this.getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(storagePath, line, 'utf-8');
  }

  /**
   * Get entry by ID
   */
  async getById(id: string): Promise<KnowledgeEntry | null> {
    const entry = this.cache.get(id);
    if (!entry || entry.deletedAt) {
      return null;
    }
    return deepClone(entry);
  }

  /**
   * Get all knowledge entries for a goal
   */
  async getByGoal(goalId: string): Promise<KnowledgeEntry[]> {
    const entries = Array.from(this.cache.values())
      .filter((e) => e.goalId === goalId && !e.deletedAt)
      .sort((a, b) => b.importance - a.importance);

    return deepClone(entries);
  }

  /**
   * Get knowledge entries by task
   */
  async getByTask(taskId: string): Promise<KnowledgeEntry[]> {
    const entries = Array.from(this.cache.values())
      .filter((e) => e.taskId === taskId && !e.deletedAt)
      .sort((a, b) => b.importance - a.importance);

    return deepClone(entries);
  }

  /**
   * Search knowledge entries
   */
  async search(
    query: string,
    options: KnowledgeQueryOptions = {}
  ): Promise<KnowledgeEntry[]> {
    const {
      maxResults = 10,
      minRelevance = 0.1,
      category,
      tags,
    } = options;

    const queryKeywords = extractKeywords(query);
    const candidates = Array.from(this.cache.values()).filter(
      (e) => !e.deletedAt
    );

    // Score each entry
    const scored = candidates.map((entry) => {
      let score = 0;

      // Text similarity
      score += calculateSimilarity(queryKeywords, entry.content) * 0.5;
      score += calculateSimilarity(queryKeywords, entry.tags.join(' ')) * 0.3;

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
      .map((s) => deepClone(s.entry));
  }

  /**
   * Get relevant knowledge for a specific task
   * Limited to the same goal scope
   */
  async getRelevantKnowledgeForTask(
    task: Task,
    query: string,
    options: KnowledgeQueryOptions = {}
  ): Promise<KnowledgeEntry[]> {
    const { maxResults = 5, minRelevance = 0.3 } = options;

    // 1. Get knowledge from the same goal
    let candidates = await this.getByGoal(task.goalId);

    // 2. If task has a dimension, prioritize same-dimension knowledge
    if (task.dimensionId && candidates.length > 0) {
      const dimKnowledge = candidates.filter((k) =>
        k.relatedDimensionIds.includes(task.dimensionId!)
      );

      // If we have enough dimension-specific knowledge, use it primarily
      if (dimKnowledge.length >= Math.min(maxResults, 3)) {
        candidates = [...dimKnowledge, ...candidates];
      }
    }

    // 3. Score by relevance to query
    const queryKeywords = extractKeywords(query);
    const scored = candidates.map((entry) => {
      const contentScore = calculateSimilarity(queryKeywords, entry.content);
      const tagScore = calculateSimilarity(queryKeywords, entry.tags.join(' '));
      const importanceBoost = entry.importance * 0.1;

      // Boost for task-associated knowledge
      const taskBoost = entry.taskId === task.id ? 0.3 : 0;

      // Boost for dimension match
      const dimBoost =
        task.dimensionId && entry.relatedDimensionIds.includes(task.dimensionId)
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
      .map((s) => deepClone(s.entry));
  }

  /**
   * Inject relevant knowledge into a prompt
   */
  async injectKnowledgeIntoPrompt(
    task: Task,
    basePrompt: string,
    options: { maxResults?: number; contextHeader?: string } = {}
  ): Promise<string> {
    const { maxResults = 3, contextHeader = 'Relevant Background Knowledge' } = options;

    // Extract query from the prompt
    const query = extractKeywords(basePrompt);

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
  async update(
    id: string,
    updates: Partial<KnowledgeEntry>
  ): Promise<KnowledgeEntry> {
    const entry = await this.getById(id);
    if (!entry) {
      throw new Error(`Knowledge entry not found: ${id}`);
    }

    const updatedEntry: KnowledgeEntry = {
      ...entry,
      ...updates,
      id, // Ensure ID doesn't change
      goalId: entry.goalId, // Ensure goalId doesn't change
      createdAt: entry.createdAt, // Ensure createdAt doesn't change
      updatedAt: now(),
    };

    this.cache.set(id, updatedEntry);
    this.dirty = true;

    // Full save to update
    await this.saveToDisk();

    return deepClone(updatedEntry);
  }

  /**
   * Update entry importance
   */
  async updateImportance(id: string, importance: number): Promise<KnowledgeEntry> {
    return this.update(id, { importance: Math.max(0, Math.min(1, importance)) });
  }

  /**
   * Add tags to an entry
   */
  async addTags(id: string, tags: string[]): Promise<KnowledgeEntry> {
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
  async linkToDimension(
    id: string,
    dimensionId: string
  ): Promise<KnowledgeEntry> {
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
  async delete(id: string): Promise<void> {
    const entry = await this.getById(id);
    if (!entry) {
      return;
    }

    const updatedEntry: KnowledgeEntry = {
      ...entry,
      deletedAt: now(),
    };

    this.cache.set(id, updatedEntry);
    this.dirty = true;

    await this.saveToDisk();
  }

  /**
   * Hard delete an entry (use with caution)
   */
  async hardDelete(id: string): Promise<void> {
    this.cache.delete(id);
    this.dirty = true;
    await this.saveToDisk();
  }

  /**
   * Get knowledge statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    entriesByGoal: Record<string, number>;
    entriesByCategory: Record<string, number>;
    averageImportance: number;
  }> {
    const entries = Array.from(this.cache.values()).filter((e) => !e.deletedAt);

    const byGoal: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
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
  async checkCrossActivation(
    goalId1: string,
    goalId2: string
  ): Promise<{
    hasOverlap: boolean;
    sharedKeywords: string[];
    relevanceScore: number;
  }> {
    const knowledge1 = await this.getByGoal(goalId1);
    const knowledge2 = await this.getByGoal(goalId2);

    // Extract keywords from both
    const text1 = knowledge1.map((k) => k.content).join(' ');
    const text2 = knowledge2.map((k) => k.content).join(' ');

    const keywords1 = new Set(extractKeywords(text1).split(' '));
    const keywords2 = new Set(extractKeywords(text2).split(' '));

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
  async compact(): Promise<{ before: number; after: number }> {
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

    return { before, after };
  }

  /**
   * Clear all knowledge (for testing)
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.dirty = false;

    const storagePath = this.getStoragePath();
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      // File doesn't exist
    }
  }
}
