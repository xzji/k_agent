/**
 * GoalManager — Manages goal tree and dimension tree
 *
 * Persistence:
 * - Stored in {dataDir}/goals/ directory
 * - Each goal as {goalId}.json
 * - Dimensions embedded in goal JSON
 * - Auto-persists on every change
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DimensionNode, GoalConstraint, GoalNode, DataSource, PersistedGoalData } from "../types.js";
import { generateId } from "../utils.js";
import { GoalDecomposer } from "./goal-decomposer.js";
import { SourceDiscoverer } from "./source-discoverer.js";

export class GoalManager {
	private goals: Map<string, GoalNode> = new Map();
	private dimensions: Map<string, DimensionNode[]> = new Map(); // goalId → dimensions
	private dataSources: Map<string, DataSource[]> = new Map(); // goalId → sources
	private cycleLogs: Map<string, import("../types.js").CycleLog[]> = new Map(); // goalId → logs
	private dataDir: string;
	private llm: BackgroundLLMChannel;
	private piApi?: any; // ExtensionAPI for web_search calls
	private onProgress?: (message: string, type?: "info" | "success" | "warning") => void;

	constructor(dataDir: string, llm: BackgroundLLMChannel, piApi?: any, onProgress?: (message: string, type?: "info" | "success" | "warning") => void) {
		this.dataDir = join(dataDir, "goals");
		this.llm = llm;
		this.piApi = piApi;
		this.onProgress = onProgress;
		this.ensureDir();
		this.loadFromDisk();
	}

	/**
	 * Create a new goal + auto decompose dimensions + discover sources
	 */
	async createGoal(params: {
		title: string;
		description: string;
		authorizationDepth: GoalNode["authorizationDepth"];
		constraints?: GoalConstraint[];
	}): Promise<GoalNode> {
		const goal: GoalNode = {
			id: generateId(),
			parentId: null,
			title: params.title,
			description: params.description,
			status: "active",
			authorizationDepth: params.authorizationDepth,
			priority: 5,
			constraints: params.constraints ?? [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.goals.set(goal.id, goal);

		// Auto decompose into dimensions
		const decomposer = new GoalDecomposer(this.llm, this.onProgress);
		const initialDimensions = await decomposer.decompose(goal);
		this.dimensions.set(goal.id, initialDimensions);

		// Auto discover data sources for each dimension
		const sourceDiscoverer = new SourceDiscoverer(this.llm, this.piApi, this.onProgress);
		const sources = await sourceDiscoverer.discoverAndBind(goal, initialDimensions);
		this.dataSources.set(goal.id, sources);

		await this.persistGoal(goal.id);
		return goal;
	}

	/**
	 * Get all goals
	 */
	getAllGoals(): GoalNode[] {
		return Array.from(this.goals.values());
	}

	/**
	 * Get active goals
	 */
	getActiveGoals(): GoalNode[] {
		return Array.from(this.goals.values()).filter((g) => g.status === "active");
	}

	/**
	 * Get a specific goal
	 */
	getGoal(goalId: string): GoalNode | undefined {
		return this.goals.get(goalId);
	}

	/**
	 * Get dimensions for a goal (flat list, top-level only)
	 */
	getDimensions(goalId: string): DimensionNode[] {
		return this.dimensions.get(goalId) ?? [];
	}

	/**
	 * Get data sources for a goal
	 */
	getDataSources(goalId: string): DataSource[] {
		return this.dataSources.get(goalId) ?? [];
	}

	/**
	 * Get all dimensions grouped by goal
	 */
	getAllDimensionsByGoal(): Map<string, DimensionNode[]> {
		return new Map(this.dimensions);
	}

	/**
	 * Dynamically add dimensions (discovered during reasoning/execution)
	 */
	async addDimensions(goalId: string, newDimensions: Array<Partial<DimensionNode>>): Promise<void> {
		const existing = this.dimensions.get(goalId) ?? [];

		for (const dim of newDimensions) {
			const node: DimensionNode = {
				id: generateId(),
				goalId,
				parentDimensionId: dim.parentDimensionId ?? null,
				title: dim.title ?? "Untitled dimension",
				description: dim.description ?? "",
				core_questions: dim.core_questions ?? [],
				status: "pending",
				explorationDepth: 0,
				estimated_depth: dim.estimated_depth ?? 2,
				timeliness: dim.timeliness ?? "normal",
				refresh_interval: dim.refresh_interval ?? "weekly",
				valueScore: dim.valueScore ?? 5,
				children: [],
				dataSources: [],
				createdAt: Date.now(),
				updatedAt: Date.now(),
				discoveredDuring: dim.discoveredDuring,
			};

			// If has parent, add as child of parent dimension
			if (node.parentDimensionId) {
				const parent = this.findDimension(existing, node.parentDimensionId);
				if (parent) {
					parent.children.push(node);
				} else {
					existing.push(node);
				}
			} else {
				existing.push(node);
			}

			// Discover sources for new dimension
			const goal = this.goals.get(goalId);
			if (goal) {
				const sourceDiscoverer = new SourceDiscoverer(this.llm, this.piApi, this.onProgress);
				await sourceDiscoverer.discoverAndBindSingle(goal, node);
			}
		}

		this.dimensions.set(goalId, existing);
		await this.persistGoal(goalId);
	}

	/**
	 * Update a goal's status
	 */
	async updateGoalStatus(goalId: string, status: GoalNode["status"]): Promise<void> {
		const goal = this.goals.get(goalId);
		if (!goal) return;
		goal.status = status;
		goal.updatedAt = Date.now();
		await this.persistGoal(goalId);
	}

	/**
	 * Update dimension statuses based on exploration progress
	 */
	async updateDimensionStatuses(goalId: string): Promise<void> {
		const dims = this.dimensions.get(goalId);
		if (!dims) return;

		for (const dim of this.flattenDimensions(dims)) {
			if (dim.status === "pending" && dim.explorationDepth > 0) {
				dim.status = "exploring";
			}
			if (dim.explorationDepth >= dim.estimated_depth) {
				dim.status = "explored";
			}
			dim.updatedAt = Date.now();
		}

		await this.persistGoal(goalId);
	}

	/**
	 * Update a specific dimension
	 */
	async updateDimension(goalId: string, dimensionId: string, updates: Partial<DimensionNode>): Promise<void> {
		const dims = this.dimensions.get(goalId);
		if (!dims) return;
		
		const dim = this.findDimension(dims, dimensionId);
		if (!dim) return;

		Object.assign(dim, updates);
		dim.updatedAt = Date.now();
		
		await this.persistGoal(goalId);
	}

	/**
	 * Add a cycle log for a goal
	 */
	async addCycleLog(log: import("../types.js").CycleLog): Promise<void> {
		const logs = this.cycleLogs.get(log.goalId) ?? [];
		logs.push(log);
		this.cycleLogs.set(log.goalId, logs);
		await this.persistGoal(log.goalId);
	}

	/**
	 * Get cycle logs for a goal
	 */
	getCycleLogs(goalId: string): import("../types.js").CycleLog[] {
		return this.cycleLogs.get(goalId) ?? [];
	}

	// ── Persistence ──

	private ensureDir(): void {
		if (!existsSync(this.dataDir)) {
			mkdirSync(this.dataDir, { recursive: true });
		}
	}

	private async persistGoal(goalId: string): Promise<void> {
		const goal = this.goals.get(goalId);
		if (!goal) return;

		const data: PersistedGoalData = {
			goal,
			dimensions: this.dimensions.get(goalId) ?? [],
			dataSources: this.dataSources.get(goalId) ?? [],
			cycleLogs: this.cycleLogs.get(goalId) ?? [],
		};

		const filePath = join(this.dataDir, `${goalId}.json`);
		writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
	}

	private loadFromDisk(): void {
		if (!existsSync(this.dataDir)) return;

		const files = readdirSync(this.dataDir).filter((f) => f.endsWith(".json"));
		for (const file of files) {
			try {
				const filePath = join(this.dataDir, file);
				const content = readFileSync(filePath, "utf-8");
				const data = JSON.parse(content) as PersistedGoalData;
				this.goals.set(data.goal.id, data.goal);
				this.dimensions.set(data.goal.id, data.dimensions);
				this.dataSources.set(data.goal.id, data.dataSources);
				this.cycleLogs.set(data.goal.id, data.cycleLogs ?? []);
			} catch {
				// Skip corrupted files
			}
		}
	}

	// ── Helpers ──

	private findDimension(dims: DimensionNode[], id: string): DimensionNode | undefined {
		for (const dim of dims) {
			if (dim.id === id) return dim;
			if (dim.children.length > 0) {
				const found = this.findDimension(dim.children, id);
				if (found) return found;
			}
		}
		return undefined;
	}

	private flattenDimensions(dims: DimensionNode[]): DimensionNode[] {
		const result: DimensionNode[] = [];
		for (const dim of dims) {
			result.push(dim);
			if (dim.children.length > 0) {
				result.push(...this.flattenDimensions(dim.children));
			}
		}
		return result;
	}

	/**
	 * Clear all goals and their associated data
	 */
	async clearAllGoals(): Promise<number> {
		const goalIds = Array.from(this.goals.keys());
		const count = goalIds.length;

		// Clear all in-memory data
		this.goals.clear();
		this.dimensions.clear();
		this.dataSources.clear();
		this.cycleLogs.clear();

		// Delete all goal files from disk
		if (existsSync(this.dataDir)) {
			const files = readdirSync(this.dataDir).filter((f) => f.endsWith(".json"));
			for (const file of files) {
				const filePath = join(this.dataDir, file);
				unlinkSync(filePath);
			}
		}

		return count;
	}
}
