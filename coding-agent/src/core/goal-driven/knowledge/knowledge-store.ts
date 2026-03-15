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

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { KnowledgeEntry } from "../types.js";
import { generateId } from "../utils.js";

export class KnowledgeStore {
	private entries: KnowledgeEntry[] = [];
	private dataDir: string;
	private contentHashes: Set<string> = new Set(); // Track content hashes for deduplication

	constructor(dataDir: string) {
		this.dataDir = join(dataDir, "knowledge");
		this.ensureDir();
		this.loadFromDisk();
	}

	/**
	 * Save a new knowledge entry (with deduplication)
	 */
	save(params: {
		content: string;
		source: KnowledgeEntry["source"];
		relatedGoalIds: string[];
		relatedDimensionIds?: string[];
		tags?: string[];
		supplementNeeded?: string;
	}): KnowledgeEntry | null {
		// Generate content hash for deduplication
		const contentHash = this.generateContentHash(params.content);

		// Check for duplicate content
		if (this.contentHashes.has(contentHash)) {
			// Find and update existing entry instead of creating duplicate
			const existingEntry = this.entries.find(e => this.generateContentHash(e.content) === contentHash);
			if (existingEntry) {
				// Merge related goal IDs and dimension IDs
				const mergedGoalIds = [...new Set([...existingEntry.relatedGoalIds, ...params.relatedGoalIds])];
				const mergedDimensionIds = [...new Set([...existingEntry.relatedDimensionIds, ...(params.relatedDimensionIds ?? [])])];

				// Update entry if there are new associations
				if (mergedGoalIds.length !== existingEntry.relatedGoalIds.length ||
					mergedDimensionIds.length !== existingEntry.relatedDimensionIds.length) {
					existingEntry.relatedGoalIds = mergedGoalIds;
					existingEntry.relatedDimensionIds = mergedDimensionIds;
					this.persistAllToDisk();
				}

				return existingEntry; // Return existing entry, null indicates no new entry created
			}
		}

		// Create new entry
		const entry: KnowledgeEntry = {
			id: generateId(),
			content: params.content,
			source: params.source,
			relatedGoalIds: params.relatedGoalIds,
			relatedDimensionIds: params.relatedDimensionIds ?? [],
			status: "raw",
			tags: params.tags ?? [],
			supplementNeeded: params.supplementNeeded,
			createdAt: Date.now(),
			lastActivatedAt: null,
			activationCount: 0,
		};

		this.entries.push(entry);
		this.contentHashes.add(contentHash);
		this.appendToDisk(entry);
		return entry;
	}

	/**
	 * Generate SHA-256 hash of content for deduplication
	 */
	private generateContentHash(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Simple keyword search
	 * P4 will add semantic search and cross-activation
	 */
	search(query: string, limit = 20): KnowledgeEntry[] {
		if (!query.trim()) {
			return this.entries.slice(-limit);
		}

		const keywords = query.toLowerCase().split(/\s+/);
		const scored = this.entries.map((entry) => {
			const text = entry.content.toLowerCase();
			const tagText = entry.tags.join(" ").toLowerCase();
			let score = 0;
			for (const kw of keywords) {
				if (text.includes(kw)) score += 2;
				if (tagText.includes(kw)) score += 1;
			}
			return { entry, score };
		});

		return scored
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((s) => s.entry);
	}

	/**
	 * Get entries related to a specific goal
	 */
	getByGoal(goalId: string): KnowledgeEntry[] {
		return this.entries.filter((e) => e.relatedGoalIds.includes(goalId));
	}

	/**
	 * Get all entries
	 */
	getAll(): KnowledgeEntry[] {
		return [...this.entries];
	}

	/**
	 * Get total entry count
	 */
	count(): number {
		return this.entries.length;
	}

	/**
	 * Clear all knowledge entries
	 */
	clear(): void {
		this.entries = [];
		this.contentHashes.clear();
		const globalPath = join(this.dataDir, "global.jsonl");
		if (existsSync(globalPath)) {
			unlinkSync(globalPath);
		}
	}

	// ── Persistence ──

	private ensureDir(): void {
		if (!existsSync(this.dataDir)) {
			mkdirSync(this.dataDir, { recursive: true });
		}
	}

	private appendToDisk(entry: KnowledgeEntry): void {
		const globalPath = join(this.dataDir, "global.jsonl");
		appendFileSync(globalPath, JSON.stringify(entry) + "\n", "utf-8");
	}

	/**
	 * Persist all entries to disk (used when updating existing entries)
	 */
	private persistAllToDisk(): void {
		const globalPath = join(this.dataDir, "global.jsonl");
		const content = this.entries.map(e => JSON.stringify(e)).join("\n") + "\n";
		writeFileSync(globalPath, content, "utf-8");
	}

	private loadFromDisk(): void {
		const globalPath = join(this.dataDir, "global.jsonl");
		if (!existsSync(globalPath)) return;

		try {
			const content = readFileSync(globalPath, "utf-8");
			const lines = content.trim().split("\n").filter(Boolean);
			for (const line of lines) {
				try {
					const entry = JSON.parse(line) as KnowledgeEntry;
					this.entries.push(entry);
					// Build content hash set for deduplication
					const contentHash = this.generateContentHash(entry.content);
					this.contentHashes.add(contentHash);
				} catch {
					// Skip malformed lines
				}
			}
		} catch {
			// File read error, start fresh
		}
	}
}
