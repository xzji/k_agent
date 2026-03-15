"use strict";
/**
 * LoopScheduler — Decides which goal/dimension to process each cycle
 *
 * Scoring factors:
 * 1. urgent dimensions get +100
 * 2. High value + low exploration depth = high ROI
 * 3. Goal priority as tiebreaker
 * 4. Round-robin to avoid starvation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopScheduler = void 0;
var LoopScheduler = /** @class */ (function () {
    function LoopScheduler() {
    }
    /**
     * Select the next work item from all active goals
     * Returns a goal + up to 3 dimensions to process
     */
    LoopScheduler.prototype.selectNextWorkItem = function (goals, dimensionsByGoal, lastProcessedGoalId) {
        var _a;
        // 1. Score all pending dimensions
        var scoredItems = [];
        for (var _i = 0, goals_1 = goals; _i < goals_1.length; _i++) {
            var goal = goals_1[_i];
            var dims = (_a = dimensionsByGoal.get(goal.id)) !== null && _a !== void 0 ? _a : [];
            var allDims = this.flattenDimensions(dims);
            for (var _b = 0, allDims_1 = allDims; _b < allDims_1.length; _b++) {
                var dim = allDims_1[_b];
                if (dim.status === "explored")
                    continue;
                var score = 0;
                // Urgent dimensions get +100
                if (dim.timeliness === "urgent")
                    score += 100;
                // Value score * (1 - explored ratio)
                var exploredRatio = dim.explorationDepth / Math.max(dim.estimated_depth, 1);
                score += dim.valueScore * (1 - exploredRatio);
                // Goal priority bonus
                score += goal.priority;
                // Round-robin: penalize if this goal was just processed
                if (goal.id === lastProcessedGoalId)
                    score -= 5;
                scoredItems.push({ goal: goal, dimension: dim, score: score });
            }
        }
        // 2. Sort by score descending
        scoredItems.sort(function (a, b) { return b.score - a.score; });
        if (scoredItems.length === 0) {
            // All dimensions explored, return first goal for knowledge pool scan
            return { goal: goals[0], dimensions: [] };
        }
        // 3. Take the top goal, and up to 3 dimensions from it
        var topGoal = scoredItems[0].goal;
        var topDimensions = scoredItems
            .filter(function (item) { return item.goal.id === topGoal.id; })
            .slice(0, 3)
            .map(function (item) { return item.dimension; });
        return { goal: topGoal, dimensions: topDimensions };
    };
    /**
     * Flatten nested dimension tree into a flat list
     */
    LoopScheduler.prototype.flattenDimensions = function (dims) {
        var result = [];
        for (var _i = 0, dims_1 = dims; _i < dims_1.length; _i++) {
            var dim = dims_1[_i];
            result.push(dim);
            if (dim.children.length > 0) {
                result.push.apply(result, this.flattenDimensions(dim.children));
            }
        }
        return result;
    };
    return LoopScheduler;
}());
exports.LoopScheduler = LoopScheduler;
