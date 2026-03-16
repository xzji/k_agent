"use strict";
/**
 * Goal Store
 *
 * JSON-based goal persistence with support for goals, dimensions,
 * success criteria, and progress tracking.
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
exports.GoalStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
/**
 * Storage configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';
/**
 * Goal Store implementation
 */
class GoalStore {
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
        const goalsDir = path.dirname(this.getStoragePath());
        await fs.mkdir(goalsDir, { recursive: true });
        await this.loadFromDisk();
    }
    /**
     * Get storage file path
     */
    getStoragePath() {
        return path.join(this.baseDir, 'goals', 'goals.json');
    }
    /**
     * Load goals from disk
     */
    async loadFromDisk() {
        const storagePath = this.getStoragePath();
        try {
            const content = await fs.readFile(storagePath, 'utf-8');
            const storage = JSON.parse(content);
            for (const goal of storage.goals) {
                this.cache.set(goal.id, goal);
            }
            console.log(`[GoalStore] Loaded ${this.cache.size} goals`);
        }
        catch (error) {
            // File doesn't exist yet, start empty
            console.log('[GoalStore] Starting with empty goals');
        }
    }
    /**
     * Save goals to disk
     */
    async saveToDisk() {
        if (!this.dirty)
            return;
        const storage = {
            goals: Array.from(this.cache.values()),
            version: 1,
            lastUpdated: (0, utils_1.now)(),
        };
        const storagePath = this.getStoragePath();
        await fs.mkdir(path.dirname(storagePath), { recursive: true });
        await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');
        this.dirty = false;
        console.log(`[GoalStore] Saved ${storage.goals.length} goals`);
    }
    /**
     * Get a goal by ID
     */
    async getGoal(goalId) {
        const goal = this.cache.get(goalId);
        return goal ? (0, utils_1.deepClone)(goal) : null;
    }
    /**
     * Get all active goals
     */
    async getActiveGoals() {
        const goals = Array.from(this.cache.values())
            .filter((g) => g.status === 'active' || g.status === 'gathering_info' || g.status === 'planning')
            .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
        return (0, utils_1.deepClone)(goals);
    }
    /**
     * Get all goals (including completed)
     */
    async getAllGoals() {
        const goals = Array.from(this.cache.values())
            .sort((a, b) => b.createdAt - a.createdAt);
        return (0, utils_1.deepClone)(goals);
    }
    /**
     * Get goals by status
     */
    async getGoalsByStatus(status) {
        const goals = Array.from(this.cache.values())
            .filter((g) => g.status === status)
            .sort((a, b) => b.createdAt - a.createdAt);
        return (0, utils_1.deepClone)(goals);
    }
    /**
     * Create a new goal
     */
    async createGoal(goalData) {
        const goal = {
            ...goalData,
            id: (0, utils_1.generateId)(),
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(goal.id, goal);
        this.dirty = true;
        await this.saveToDisk();
        return (0, utils_1.deepClone)(goal);
    }
    /**
     * Update a goal
     */
    async updateGoal(goalId, updates) {
        const goal = await this.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const updatedGoal = {
            ...goal,
            ...updates,
            id: goalId,
            createdAt: goal.createdAt,
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(goalId, updatedGoal);
        this.dirty = true;
        await this.saveToDisk();
        return (0, utils_1.deepClone)(updatedGoal);
    }
    /**
     * Update goal progress
     */
    async updateProgress(goalId, progress) {
        return this.updateGoal(goalId, { progress });
    }
    /**
     * Add a dimension to a goal
     */
    async addDimension(goalId, dimension) {
        const goal = await this.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const newDimension = {
            ...dimension,
            id: `dim-${(0, utils_1.generateId)().slice(0, 8)}`,
            goalId,
            createdAt: (0, utils_1.now)(),
        };
        const updatedDimensions = [...goal.dimensions, newDimension];
        return this.updateGoal(goalId, { dimensions: updatedDimensions });
    }
    /**
     * Update a dimension
     */
    async updateDimension(goalId, dimensionId, updates) {
        const goal = await this.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const updatedDimensions = goal.dimensions.map((d) => d.id === dimensionId ? { ...d, ...updates, updatedAt: (0, utils_1.now)() } : d);
        return this.updateGoal(goalId, { dimensions: updatedDimensions });
    }
    /**
     * Add a success criterion to a goal
     */
    async addSuccessCriterion(goalId, criterion) {
        const goal = await this.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const newCriterion = {
            ...criterion,
            id: `sc-${(0, utils_1.generateId)().slice(0, 8)}`,
        };
        const updatedCriteria = [...goal.successCriteria, newCriterion];
        // Recalculate progress
        const completedCount = updatedCriteria.filter((c) => c.completed).length;
        const progress = {
            completedCriteria: completedCount,
            totalCriteria: updatedCriteria.length,
            percentage: Math.round((completedCount / updatedCriteria.length) * 100),
        };
        return this.updateGoal(goalId, {
            successCriteria: updatedCriteria,
            progress,
        });
    }
    /**
     * Mark a success criterion as completed
     */
    async markCriterionCompleted(goalId, criterionId) {
        const goal = await this.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const updatedCriteria = goal.successCriteria.map((c) => c.id === criterionId
            ? { ...c, completed: true, completedAt: (0, utils_1.now)() }
            : c);
        // Recalculate progress
        const completedCount = updatedCriteria.filter((c) => c.completed).length;
        const progress = {
            completedCriteria: completedCount,
            totalCriteria: updatedCriteria.length,
            percentage: Math.round((completedCount / updatedCriteria.length) * 100),
        };
        return this.updateGoal(goalId, {
            successCriteria: updatedCriteria,
            progress,
        });
    }
    /**
     * Delete a goal
     */
    async deleteGoal(goalId) {
        this.cache.delete(goalId);
        this.dirty = true;
        await this.saveToDisk();
    }
    /**
     * Search goals by title or description
     */
    async searchGoals(query) {
        const lowerQuery = query.toLowerCase();
        const goals = Array.from(this.cache.values()).filter((g) => g.title.toLowerCase().includes(lowerQuery) ||
            (g.description && g.description.toLowerCase().includes(lowerQuery)));
        return (0, utils_1.deepClone)(goals);
    }
    /**
     * Get goal statistics
     */
    async getStats() {
        const goals = Array.from(this.cache.values());
        const byStatus = {
            gathering_info: 0,
            planning: 0,
            active: 0,
            paused: 0,
            completed: 0,
        };
        let totalCompletion = 0;
        let withCompletedCriteria = 0;
        for (const goal of goals) {
            byStatus[goal.status]++;
            totalCompletion += goal.progress.percentage;
            if (goal.progress.completedCriteria > 0) {
                withCompletedCriteria++;
            }
        }
        return {
            total: goals.length,
            byStatus: byStatus,
            withCompletedCriteria,
            averageCompletion: goals.length > 0
                ? Math.round(totalCompletion / goals.length)
                : 0,
        };
    }
    /**
     * Clear all goals (for testing)
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
exports.GoalStore = GoalStore;
/**
 * Get priority weight for sorting
 */
function getPriorityWeight(priority) {
    const weights = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25,
        background: 10,
    };
    return weights[priority] || 0;
}
//# sourceMappingURL=goal-store.js.map