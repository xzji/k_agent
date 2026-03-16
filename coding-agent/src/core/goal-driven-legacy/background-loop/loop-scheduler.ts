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

export class LoopScheduler {
	/**
	 * Select the next work item from all active goals
	 * Returns a goal + up to 3 dimensions to process
	 */
	selectNextWorkItem(
		goals: GoalNode[],
		dimensionsByGoal: Map<string, DimensionNode[]>,
		lastProcessedGoalId: string | null,
	): { goal: GoalNode; dimensions: DimensionNode[] } {
		// 1. Score all pending dimensions
		const scoredItems: Array<{
			goal: GoalNode;
			dimension: DimensionNode;
			score: number;
		}> = [];

		for (const goal of goals) {
			const dims = dimensionsByGoal.get(goal.id) ?? [];
			const allDims = this.flattenDimensions(dims);

			for (const dim of allDims) {
				if (dim.status === "explored") continue;

				let score = 0;
				// Urgent dimensions get +100
				if (dim.timeliness === "urgent") score += 100;
				// Value score * (1 - explored ratio)
				const exploredRatio = dim.explorationDepth / Math.max(dim.estimated_depth, 1);
				score += dim.valueScore * (1 - exploredRatio);
				// Goal priority bonus
				score += goal.priority;
				// Round-robin: penalize if this goal was just processed
				if (goal.id === lastProcessedGoalId) score -= 5;

				scoredItems.push({ goal, dimension: dim, score });
			}
		}

		// 2. Sort by score descending
		scoredItems.sort((a, b) => b.score - a.score);

		if (scoredItems.length === 0) {
			// All dimensions explored, return first goal for knowledge pool scan
			return { goal: goals[0], dimensions: [] };
		}

		// 3. Take the top goal, and up to 3 dimensions from it
		const topGoal = scoredItems[0].goal;
		const topDimensions = scoredItems
			.filter((item) => item.goal.id === topGoal.id)
			.slice(0, 3)
			.map((item) => item.dimension);

		return { goal: topGoal, dimensions: topDimensions };
	}

	/**
	 * Flatten nested dimension tree into a flat list
	 */
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
}
