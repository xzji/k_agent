/**
 * LoopScheduler — Decides which goal/dimension to process each cycle
 *
 * Scoring factors:
 * 1. urgent dimensions get +100
 * 2. High value + low exploration depth = high ROI
 * 3. Goal priority as tiebreaker
 * 4. Round-robin to avoid starvation
 */
import type { DimensionNode, GoalNode } from "../types.js";
export declare class LoopScheduler {
    /**
     * Select the next work item from all active goals
     * Returns a goal + up to 3 dimensions to process
     */
    selectNextWorkItem(goals: GoalNode[], dimensionsByGoal: Map<string, DimensionNode[]>, lastProcessedGoalId: string | null): {
        goal: GoalNode;
        dimensions: DimensionNode[];
    };
    /**
     * Flatten nested dimension tree into a flat list
     */
    private flattenDimensions;
}
//# sourceMappingURL=loop-scheduler.d.ts.map