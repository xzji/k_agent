"use strict";
/**
 * Task Store
 *
 * JSON-based task persistence with file-based storage.
 * Structure: ~/.pi/agent/goal-driven/tasks/{goalId}/tasks.json
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
exports.TaskStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
/**
 * Storage paths configuration
 */
const STORAGE_DIR = process.env.GOAL_DRIVEN_STORAGE || '~/.pi/agent/goal-driven';
/**
 * Task Store implementation
 */
class TaskStore {
    baseDir;
    cache = new Map();
    dirtyGoals = new Set();
    constructor(baseDir = STORAGE_DIR) {
        this.baseDir = baseDir.replace('~', process.env.HOME || '');
    }
    /**
     * Initialize storage directories
     */
    async init() {
        const tasksDir = path.join(this.baseDir, 'tasks');
        await fs.mkdir(tasksDir, { recursive: true });
    }
    /**
     * Get the storage file path for a goal
     */
    getStoragePath(goalId) {
        return path.join(this.baseDir, 'tasks', goalId, 'tasks.json');
    }
    /**
     * Ensure the goal directory exists
     */
    async ensureGoalDir(goalId) {
        const goalDir = path.join(this.baseDir, 'tasks', goalId);
        await fs.mkdir(goalDir, { recursive: true });
    }
    /**
     * Load tasks for a goal from disk
     */
    async loadGoalTasks(goalId) {
        // Check cache first
        const cached = Array.from(this.cache.values()).filter((t) => t.goalId === goalId);
        if (cached.length > 0) {
            return cached;
        }
        const storagePath = this.getStoragePath(goalId);
        try {
            const content = await fs.readFile(storagePath, 'utf-8');
            const storage = JSON.parse(content);
            // Populate cache
            for (const task of storage.tasks) {
                this.cache.set(task.id, task);
            }
            return storage.tasks;
        }
        catch (error) {
            // File doesn't exist or is invalid
            return [];
        }
    }
    /**
     * Save tasks for a goal to disk
     */
    async saveGoalTasks(goalId) {
        const tasks = Array.from(this.cache.values())
            .filter((t) => t.goalId === goalId)
            .sort((a, b) => a.createdAt - b.createdAt);
        const storage = {
            tasks,
            version: 1,
            lastUpdated: (0, utils_1.now)(),
        };
        await this.ensureGoalDir(goalId);
        const storagePath = this.getStoragePath(goalId);
        await fs.writeFile(storagePath, JSON.stringify(storage, null, 2), 'utf-8');
        this.dirtyGoals.delete(goalId);
    }
    /**
     * Persist all dirty goals
     */
    async flush() {
        const promises = Array.from(this.dirtyGoals).map((goalId) => this.saveGoalTasks(goalId));
        await Promise.all(promises);
    }
    /**
     * Get a task by ID
     */
    async getTask(taskId) {
        // Check cache first
        if (this.cache.has(taskId)) {
            return (0, utils_1.deepClone)(this.cache.get(taskId));
        }
        // Need to search all goals (inefficient but rare)
        const tasksDir = path.join(this.baseDir, 'tasks');
        try {
            const goalDirs = await fs.readdir(tasksDir);
            for (const goalId of goalDirs) {
                const tasks = await this.loadGoalTasks(goalId);
                const task = tasks.find((t) => t.id === taskId);
                if (task) {
                    return (0, utils_1.deepClone)(task);
                }
            }
        }
        catch (error) {
            // Directory doesn't exist
        }
        return null;
    }
    /**
     * Get all tasks for a goal
     */
    async getTasksByGoal(goalId) {
        const tasks = await this.loadGoalTasks(goalId);
        return (0, utils_1.deepClone)(tasks);
    }
    /**
     * Get all tasks across all goals
     */
    async getAllTasks() {
        const tasksDir = path.join(this.baseDir, 'tasks');
        const allTasks = [];
        try {
            const goalDirs = await fs.readdir(tasksDir);
            for (const goalId of goalDirs) {
                const tasks = await this.loadGoalTasks(goalId);
                allTasks.push(...tasks);
            }
        }
        catch (error) {
            // Directory doesn't exist
        }
        return (0, utils_1.deepClone)(allTasks);
    }
    /**
     * Get tasks that are ready for execution
     */
    async getReadyTasks() {
        const allTasks = await this.getAllTasks();
        const nowTime = (0, utils_1.now)();
        return allTasks.filter((task) => {
            // Must be pending or ready status
            if (!['pending', 'ready'].includes(task.status)) {
                return false;
            }
            // Check if it's time to execute
            if (task.nextExecutionAt && task.nextExecutionAt > nowTime) {
                return false;
            }
            return true;
        });
    }
    /**
     * Get tasks waiting for user input
     */
    async getWaitingUserTasks() {
        const allTasks = await this.getAllTasks();
        return (0, utils_1.deepClone)(allTasks.filter((t) => t.status === 'waiting_user'));
    }
    /**
     * Get tasks by type
     */
    async getTasksByType(type) {
        const allTasks = await this.getAllTasks();
        return (0, utils_1.deepClone)(allTasks.filter((t) => t.type === type));
    }
    /**
     * Get tasks by status
     */
    async getTasksByStatus(status) {
        const allTasks = await this.getAllTasks();
        return (0, utils_1.deepClone)(allTasks.filter((t) => t.status === status));
    }
    /**
     * Create a new task
     */
    async createTask(taskData) {
        const task = {
            ...taskData,
            id: (0, utils_1.generateId)(),
            createdAt: (0, utils_1.now)(),
            // Set defaults for new required fields
            hierarchyLevel: taskData.hierarchyLevel || 'task',
            expectedResult: taskData.expectedResult || {
                type: 'information',
                description: '任务执行结果',
                format: 'text',
            },
            executionHistory: taskData.executionHistory || [],
            relatedKnowledgeIds: taskData.relatedKnowledgeIds || [],
            dependencies: taskData.dependencies || [],
        };
        // Set initial status based on dependencies
        if (task.dependencies.length > 0) {
            task.status = 'blocked';
        }
        this.cache.set(task.id, task);
        this.dirtyGoals.add(task.goalId);
        // Auto-save
        await this.saveGoalTasks(task.goalId);
        return (0, utils_1.deepClone)(task);
    }
    /**
     * Update a task
     */
    async updateTask(taskId, updates) {
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const updatedTask = {
            ...task,
            ...updates,
            id: taskId, // Ensure ID doesn't change
            goalId: task.goalId, // Ensure goalId doesn't change
            createdAt: task.createdAt, // Ensure createdAt doesn't change
            updatedAt: (0, utils_1.now)(),
        };
        this.cache.set(taskId, updatedTask);
        this.dirtyGoals.add(task.goalId);
        await this.saveGoalTasks(task.goalId);
        return (0, utils_1.deepClone)(updatedTask);
    }
    /**
     * Update task status
     */
    async updateStatus(taskId, status, metadata) {
        const updates = {
            status,
            ...metadata,
        };
        // Update lastExecutedAt when starting execution
        if (status === 'in_progress') {
            updates.lastExecutedAt = (0, utils_1.now)();
        }
        return this.updateTask(taskId, updates);
    }
    /**
     * Update next execution time for recurring tasks
     */
    async updateNextExecution(taskId, nextExecutionAt) {
        return this.updateTask(taskId, { nextExecutionAt });
    }
    /**
     * Add an execution record to a task
     */
    async addExecutionRecord(taskId, record) {
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const executionHistory = [...task.executionHistory, record];
        return this.updateTask(taskId, { executionHistory });
    }
    /**
     * Add collected information to an interactive task
     */
    async addCollectedInfo(taskId, info) {
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const collectedInfo = {
            ...(task.collectedInfo || {}),
            ...info,
        };
        return this.updateTask(taskId, { collectedInfo });
    }
    /**
     * Delete a task (soft delete by marking as cancelled)
     */
    async deleteTask(taskId) {
        const task = await this.getTask(taskId);
        if (!task) {
            return;
        }
        await this.updateStatus(taskId, 'cancelled', {
            cancelledAt: (0, utils_1.now)(),
        });
    }
    /**
     * Hard delete a task (use with caution)
     */
    async hardDeleteTask(taskId) {
        const task = await this.getTask(taskId);
        if (!task) {
            return;
        }
        this.cache.delete(taskId);
        this.dirtyGoals.add(task.goalId);
        await this.saveGoalTasks(task.goalId);
    }
    /**
     * Get child tasks of a parent task
     */
    async getChildTasks(parentTaskId) {
        const allTasks = await this.getAllTasks();
        return (0, utils_1.deepClone)(allTasks.filter((t) => t.parentTaskId === parentTaskId));
    }
    /**
     * Clear all tasks (for testing)
     */
    async clearAll() {
        this.cache.clear();
        this.dirtyGoals.clear();
        const tasksDir = path.join(this.baseDir, 'tasks');
        try {
            await fs.rm(tasksDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore
        }
    }
}
exports.TaskStore = TaskStore;
//# sourceMappingURL=task-store.js.map