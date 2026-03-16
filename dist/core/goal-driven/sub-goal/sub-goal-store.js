"use strict";
/**
 * SubGoal Store
 *
 * JSON-based sub-goal persistence with dependency management
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
exports.SubGoalStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
/**
 * Storage configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';
/**
 * SubGoal Store implementation
 */
class SubGoalStore {
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
        const subGoalsDir = path.dirname(this.getStoragePath());
        await fs.mkdir(subGoalsDir, { recursive: true });
        await this.loadFromDisk();
    }
    /**
     * Get storage file path
     */
    getStoragePath() {
        return path.join(this.baseDir, 'sub-goals', 'sub-goals.json');
    }
    /**
     * Load sub-goals from disk
     */
    async loadFromDisk() {
        const storagePath = this.getStoragePath();
        try {
            const content = await fs.readFile(storagePath, 'utf-8');
            const storage = JSON.parse(content);
            for (const subGoal of storage.subGoals) {
                this.cache.set(subGoal.id, subGoal);
            }
            console.log(`[SubGoalStore] Loaded ${this.cache.size} sub-goals`);
        }
        catch (error) {
            // File doesn't exist yet, start empty
            console.log('[SubGoalStore] Starting with empty sub-goals');
        }
    }
    /**
     * Save sub-goals to disk
     */
    async saveToDisk() {
        if (!this.dirty)
            return;
        const storage = {
            subGoals: Array.from(this.cache.values()),
            version: 1,
            lastUpdated: (0, utils_1.now)(),
        };
        const storagePath = this.getStoragePath();
        await fs.mkdir(path.dirname(storagePath), { recursive: true });
        await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');
        this.dirty = false;
        console.log(`[SubGoalStore] Saved ${storage.subGoals.length} sub-goals`);
    }
    /**
     * Get a sub-goal by ID
     */
    async getSubGoal(subGoalId) {
        const subGoal = this.cache.get(subGoalId);
        return subGoal ? (0, utils_1.deepClone)(subGoal) : null;
    }
    /**
     * Get all sub-goals for a goal
     */
    async getSubGoalsByGoal(goalId) {
        const subGoals = Array.from(this.cache.values())
            .filter((sg) => sg.goalId === goalId)
            .sort((a, b) => {
            // Sort by priority weight, then by creation time
            const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
            if (weightDiff !== 0)
                return weightDiff;
            return a.createdAt - b.createdAt;
        });
        return (0, utils_1.deepClone)(subGoals);
    }
    /**
     * Get sub-goals by status
     */
    async getSubGoalsByStatus(status) {
        const subGoals = Array.from(this.cache.values())
            .filter((sg) => sg.status === status)
            .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
        return (0, utils_1.deepClone)(subGoals);
    }
    /**
     * Create a new sub-goal
     */
    async createSubGoal(subGoalData) {
        const subGoal = {
            ...subGoalData,
            id: `sg-${(0, utils_1.generateId)().slice(0, 8)}`,
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(subGoal.id, subGoal);
        this.dirty = true;
        await this.saveToDisk();
        return (0, utils_1.deepClone)(subGoal);
    }
    /**
     * Update a sub-goal
     */
    async updateSubGoal(subGoalId, updates) {
        const subGoal = await this.getSubGoal(subGoalId);
        if (!subGoal) {
            throw new Error(`SubGoal not found: ${subGoalId}`);
        }
        const updatedSubGoal = {
            ...subGoal,
            ...updates,
            id: subGoalId,
            goalId: subGoal.goalId,
            createdAt: subGoal.createdAt,
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(subGoalId, updatedSubGoal);
        this.dirty = true;
        await this.saveToDisk();
        return (0, utils_1.deepClone)(updatedSubGoal);
    }
    /**
     * Delete a sub-goal
     */
    async deleteSubGoal(subGoalId) {
        this.cache.delete(subGoalId);
        this.dirty = true;
        await this.saveToDisk();
    }
    /**
     * Add a task to a sub-goal
     */
    async addTaskToSubGoal(subGoalId, taskId) {
        const subGoal = await this.getSubGoal(subGoalId);
        if (!subGoal) {
            throw new Error(`SubGoal not found: ${subGoalId}`);
        }
        if (subGoal.taskIds.includes(taskId)) {
            return (0, utils_1.deepClone)(subGoal); // Already exists
        }
        const updatedTaskIds = [...subGoal.taskIds, taskId];
        return this.updateSubGoal(subGoalId, { taskIds: updatedTaskIds });
    }
    /**
     * Remove a task from a sub-goal
     */
    async removeTaskFromSubGoal(subGoalId, taskId) {
        const subGoal = await this.getSubGoal(subGoalId);
        if (!subGoal) {
            throw new Error(`SubGoal not found: ${subGoalId}`);
        }
        const updatedTaskIds = subGoal.taskIds.filter((id) => id !== taskId);
        return this.updateSubGoal(subGoalId, { taskIds: updatedTaskIds });
    }
    /**
     * Update sub-goal progress
     */
    async updateProgress(subGoalId, progress) {
        const subGoal = await this.getSubGoal(subGoalId);
        if (!subGoal) {
            throw new Error(`SubGoal not found: ${subGoalId}`);
        }
        // Auto-update status based on progress
        let status = subGoal.status;
        if (progress.percentage >= 100) {
            status = 'completed';
        }
        else if (progress.percentage > 0 && status === 'pending') {
            status = 'active';
        }
        return this.updateSubGoal(subGoalId, {
            status: status,
        });
    }
    /**
     * Check if sub-goal dependencies are satisfied
     */
    async checkDependencies(subGoalId) {
        const subGoal = await this.getSubGoal(subGoalId);
        if (!subGoal) {
            throw new Error(`SubGoal not found: ${subGoalId}`);
        }
        const blockingSubGoalIds = [];
        for (const depId of subGoal.dependencies) {
            const dep = await this.getSubGoal(depId);
            if (!dep || dep.status !== 'completed') {
                blockingSubGoalIds.push(depId);
            }
        }
        return {
            satisfied: blockingSubGoalIds.length === 0,
            blockingSubGoalIds,
        };
    }
    /**
     * Batch create sub-goals
     */
    async batchCreate(subGoalsData) {
        const created = [];
        for (const data of subGoalsData) {
            const subGoal = await this.createSubGoal(data);
            created.push(subGoal);
        }
        return created;
    }
    /**
     * Clear all sub-goals (for testing)
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
    /**
     * Get sub-goal statistics for a goal
     */
    async getStats(goalId) {
        const subGoals = await this.getSubGoalsByGoal(goalId);
        const byStatus = {
            pending: 0,
            active: 0,
            completed: 0,
            failed: 0,
        };
        let completedWeight = 0;
        let totalWeight = 0;
        for (const sg of subGoals) {
            byStatus[sg.status]++;
            totalWeight += sg.weight;
            if (sg.status === 'completed') {
                completedWeight += sg.weight;
            }
        }
        return {
            total: subGoals.length,
            byStatus,
            completedWeight,
            totalWeight,
        };
    }
}
exports.SubGoalStore = SubGoalStore;
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
//# sourceMappingURL=sub-goal-store.js.map