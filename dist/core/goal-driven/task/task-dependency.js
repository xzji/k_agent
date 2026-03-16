"use strict";
/**
 * Task Dependency Graph
 *
 * Manages task dependencies with DAG validation and cycle detection.
 * Uses Kahn's algorithm for topological sorting and cycle detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDependencyGraph = void 0;
/**
 * Task Dependency Graph Manager
 */
class TaskDependencyGraph {
    taskStore;
    constructor(taskStore) {
        this.taskStore = taskStore;
    }
    /**
     * Build the dependency graph for a set of tasks
     */
    buildGraph(tasks) {
        const graph = new Map();
        // Initialize all tasks in the graph
        for (const task of tasks) {
            if (!graph.has(task.id)) {
                graph.set(task.id, new Set());
            }
            // Add dependencies
            for (const depId of task.dependencies) {
                graph.get(task.id).add(depId);
            }
        }
        return graph;
    }
    /**
     * Calculate in-degrees for all tasks
     * In-degree = number of dependencies this task has
     */
    calculateInDegrees(tasks, graph) {
        const inDegrees = new Map();
        // Initialize all tasks with their dependency count
        for (const task of tasks) {
            // In-degree = number of dependencies within our task set
            const depsInSet = Array.from(graph.get(task.id) || []).filter(depId => tasks.some(t => t.id === depId));
            inDegrees.set(task.id, depsInSet.length);
        }
        return inDegrees;
    }
    /**
     * Detect circular dependencies using Kahn's algorithm
     * Returns array of task IDs involved in cycles, empty if no cycles
     */
    detectCircularDependencies(tasks) {
        const graph = this.buildGraph(tasks);
        const inDegrees = this.calculateInDegrees(tasks, graph);
        // Kahn's algorithm
        const queue = [];
        const visited = new Set();
        // Find all nodes with in-degree 0
        for (const [taskId, degree] of inDegrees.entries()) {
            if (degree === 0) {
                queue.push(taskId);
            }
        }
        while (queue.length > 0) {
            const current = queue.shift();
            visited.add(current);
            // Find all tasks that depend on current
            for (const [taskId, dependencies] of graph.entries()) {
                if (dependencies.has(current)) {
                    const newDegree = (inDegrees.get(taskId) || 0) - 1;
                    inDegrees.set(taskId, newDegree);
                    if (newDegree === 0) {
                        queue.push(taskId);
                    }
                }
            }
        }
        // Tasks not visited are part of cycles
        const unvisited = tasks.filter((t) => !visited.has(t.id));
        return unvisited.map((t) => t.id);
    }
    /**
     * Get the execution order for tasks (topological sort)
     * Returns null if there are circular dependencies
     */
    getExecutionOrder(tasks) {
        const cycles = this.detectCircularDependencies(tasks);
        if (cycles.length > 0) {
            return null;
        }
        const graph = this.buildGraph(tasks);
        const inDegrees = this.calculateInDegrees(tasks, graph);
        const queue = [];
        const order = [];
        // Find all nodes with in-degree 0
        for (const [taskId, degree] of inDegrees.entries()) {
            if (degree === 0) {
                queue.push(taskId);
            }
        }
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);
            // Find all tasks that depend on current
            for (const [taskId, dependencies] of graph.entries()) {
                if (dependencies.has(current)) {
                    const newDegree = (inDegrees.get(taskId) || 0) - 1;
                    inDegrees.set(taskId, newDegree);
                    if (newDegree === 0) {
                        queue.push(taskId);
                    }
                }
            }
        }
        return order;
    }
    /**
     * Check if all dependencies for a task are completed
     */
    async checkDependencies(taskId) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }
        // Check all dependencies
        const depStatuses = await Promise.all(task.dependencies.map(async (depId) => {
            const dep = await this.taskStore.getTask(depId);
            return dep?.status === 'completed';
        }));
        return depStatuses.every((s) => s);
    }
    /**
     * Update task status based on dependencies
     * If all dependencies are completed, mark as ready
     */
    async updateTaskStatusFromDependencies(taskId) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // If already completed, failed, or cancelled, don't change
        if (['completed', 'failed', 'cancelled', 'in_progress', 'waiting_user'].includes(task.status)) {
            return task.status;
        }
        const depsMet = await this.checkDependencies(taskId);
        if (depsMet && task.status === 'blocked') {
            await this.taskStore.updateStatus(taskId, 'ready');
            return 'ready';
        }
        if (!depsMet && task.status === 'ready') {
            await this.taskStore.updateStatus(taskId, 'blocked');
            return 'blocked';
        }
        return task.status;
    }
    /**
     * Update all tasks' statuses based on dependencies
     * Call this after task completion or when tasks are created
     */
    async updateAllTaskStatuses(goalId) {
        const tasks = await this.taskStore.getTasksByGoal(goalId);
        // Process in topological order to propagate changes
        const order = this.getExecutionOrder(tasks);
        if (!order) {
            throw new Error('Circular dependencies detected');
        }
        for (const taskId of order) {
            await this.updateTaskStatusFromDependencies(taskId);
        }
    }
    /**
     * Validate that adding a dependency won't create a cycle
     */
    async validateNewDependency(taskId, dependsOnTaskId) {
        if (taskId === dependsOnTaskId) {
            return { valid: false, reason: '不能依赖自身' };
        }
        // Get the task's goal
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            return { valid: false, reason: `Task not found: ${taskId}` };
        }
        // Check if adding this would create a cycle by traversing from dependsOnTaskId
        const visited = new Set();
        const queue = [dependsOnTaskId];
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === taskId) {
                return { valid: false, reason: 'Adding this dependency would create a cycle' };
            }
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const currentTask = await this.taskStore.getTask(current);
            if (currentTask) {
                queue.push(...currentTask.dependencies);
            }
        }
        return { valid: true };
    }
    /**
     * Add a dependency after validation
     */
    async addDependency(taskId, dependsOnTaskId) {
        const validation = await this.validateNewDependency(taskId, dependsOnTaskId);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // Check if already depends on this task
        if (task.dependencies.includes(dependsOnTaskId)) {
            return; // Already exists
        }
        const newDependencies = [...task.dependencies, dependsOnTaskId];
        await this.taskStore.updateTask(taskId, { dependencies: newDependencies });
        // Update status based on new dependencies
        await this.updateTaskStatusFromDependencies(taskId);
    }
    /**
     * Remove a dependency
     */
    async removeDependency(taskId, dependsOnTaskId) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const newDependencies = task.dependencies.filter((id) => id !== dependsOnTaskId);
        await this.taskStore.updateTask(taskId, { dependencies: newDependencies });
        // Update status based on removed dependencies
        await this.updateTaskStatusFromDependencies(taskId);
    }
    /**
     * Get all tasks that depend on a given task (dependents)
     */
    async getDependents(taskId) {
        const allTasks = await this.taskStore.getAllTasks();
        return allTasks.filter((t) => t.dependencies.includes(taskId));
    }
    /**
     * Get the dependency chain for a task (all transitive dependencies)
     */
    async getDependencyChain(taskId) {
        const chain = [];
        const visited = new Set();
        const queue = [taskId];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            if (current !== taskId) {
                chain.push(current);
            }
            const task = await this.taskStore.getTask(current);
            if (task) {
                queue.push(...task.dependencies);
            }
        }
        return chain;
    }
    /**
     * Get the dependent chain for a task (all tasks that transitively depend on it)
     */
    async getDependentChain(taskId) {
        const chain = [];
        const visited = new Set();
        const queue = [taskId];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const dependents = await this.getDependents(current);
            for (const dependent of dependents) {
                if (current !== taskId) {
                    chain.push(dependent.id);
                }
                queue.push(dependent.id);
            }
        }
        return chain;
    }
}
exports.TaskDependencyGraph = TaskDependencyGraph;
//# sourceMappingURL=task-dependency.js.map