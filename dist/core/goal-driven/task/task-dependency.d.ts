/**
 * Task Dependency Graph
 *
 * Manages task dependencies with DAG validation and cycle detection.
 * Uses Kahn's algorithm for topological sorting and cycle detection.
 */
import { type Task, type TaskStatus } from '../types';
import { TaskStore } from './task-store';
/**
 * Task Dependency Graph Manager
 */
export declare class TaskDependencyGraph {
    private taskStore;
    constructor(taskStore: TaskStore);
    /**
     * Build the dependency graph for a set of tasks
     */
    private buildGraph;
    /**
     * Calculate in-degrees for all tasks
     * In-degree = number of dependencies this task has
     */
    private calculateInDegrees;
    /**
     * Detect circular dependencies using Kahn's algorithm
     * Returns array of task IDs involved in cycles, empty if no cycles
     */
    detectCircularDependencies(tasks: Task[]): string[];
    /**
     * Get the execution order for tasks (topological sort)
     * Returns null if there are circular dependencies
     */
    getExecutionOrder(tasks: Task[]): string[] | null;
    /**
     * Check if all dependencies for a task are completed
     */
    checkDependencies(taskId: string): Promise<boolean>;
    /**
     * Update task status based on dependencies
     * If all dependencies are completed, mark as ready
     */
    updateTaskStatusFromDependencies(taskId: string): Promise<TaskStatus>;
    /**
     * Update all tasks' statuses based on dependencies
     * Call this after task completion or when tasks are created
     */
    updateAllTaskStatuses(goalId: string): Promise<void>;
    /**
     * Validate that adding a dependency won't create a cycle
     */
    validateNewDependency(taskId: string, dependsOnTaskId: string): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    /**
     * Add a dependency after validation
     */
    addDependency(taskId: string, dependsOnTaskId: string): Promise<void>;
    /**
     * Remove a dependency
     */
    removeDependency(taskId: string, dependsOnTaskId: string): Promise<void>;
    /**
     * Get all tasks that depend on a given task (dependents)
     */
    getDependents(taskId: string): Promise<Task[]>;
    /**
     * Get the dependency chain for a task (all transitive dependencies)
     */
    getDependencyChain(taskId: string): Promise<string[]>;
    /**
     * Get the dependent chain for a task (all tasks that transitively depend on it)
     */
    getDependentChain(taskId: string): Promise<string[]>;
}
//# sourceMappingURL=task-dependency.d.ts.map