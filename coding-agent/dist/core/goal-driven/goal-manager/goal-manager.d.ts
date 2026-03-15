/**
 * GoalManager — Manages goal tree and dimension tree
 *
 * Persistence:
 * - Stored in {dataDir}/goals/ directory
 * - Each goal as {goalId}.json
 * - Dimensions embedded in goal JSON
 * - Auto-persists on every change
 */
import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DimensionNode, GoalConstraint, GoalNode } from "../types.js";
export declare class GoalManager {
    private goals;
    private dimensions;
    private dataSources;
    private cycleLogs;
    private dataDir;
    private llm;
    constructor(dataDir: string, llm: BackgroundLLMChannel);
    /**
     * Create a new goal + auto decompose dimensions + discover sources
     */
    createGoal(params: {
        title: string;
        description: string;
        authorizationDepth: GoalNode["authorizationDepth"];
        constraints?: GoalConstraint[];
    }): Promise<GoalNode>;
    /**
     * Get all goals
     */
    getAllGoals(): GoalNode[];
    /**
     * Get active goals
     */
    getActiveGoals(): GoalNode[];
    /**
     * Get a specific goal
     */
    getGoal(goalId: string): GoalNode | undefined;
    /**
     * Get dimensions for a goal (flat list, top-level only)
     */
    getDimensions(goalId: string): DimensionNode[];
    /**
     * Get all dimensions grouped by goal
     */
    getAllDimensionsByGoal(): Map<string, DimensionNode[]>;
    /**
     * Dynamically add dimensions (discovered during reasoning/execution)
     */
    addDimensions(goalId: string, newDimensions: Array<Partial<DimensionNode>>): Promise<void>;
    /**
     * Update a goal's status
     */
    updateGoalStatus(goalId: string, status: GoalNode["status"]): Promise<void>;
    /**
     * Update dimension statuses based on exploration progress
     */
    updateDimensionStatuses(goalId: string): Promise<void>;
    /**
     * Update a specific dimension
     */
    updateDimension(goalId: string, dimensionId: string, updates: Partial<DimensionNode>): Promise<void>;
    /**
     * Add a cycle log for a goal
     */
    addCycleLog(log: import("../types.js").CycleLog): Promise<void>;
    /**
     * Get cycle logs for a goal
     */
    getCycleLogs(goalId: string): import("../types.js").CycleLog[];
    private ensureDir;
    private persistGoal;
    private loadFromDisk;
    private findDimension;
    private flattenDimensions;
}
//# sourceMappingURL=goal-manager.d.ts.map