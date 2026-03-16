/**
 * Goal-Driven Agent - Unified Task Scheduler Architecture
 *
 * This module implements the upgraded architecture that fuses:
 * - 9-module pipeline (exploration, relevance judgment, action reasoning)
 * - Unified Task Scheduler (exploration, recurring, interactive, monitoring, one-time, event-triggered)
 * - Success Criteria Checking with user confirmation
 * - Knowledge Reuse within goal scope
 *
 * @example
 * ```typescript
 * // Initialize stores
 * const goalStore = new GoalStore();
 * const taskStore = new TaskStore();
 * const knowledgeStore = new KnowledgeStore();
 *
 * // Create scheduler
 * const scheduler = new UnifiedTaskScheduler(
 *   taskStore,
 *   goalStore,
 *   knowledgeStore,
 *   notificationQueue,
 *   dependencyGraph,
 *   executionPipeline,
 *   idleDetector,
 *   userProfile
 * );
 *
 * // Start scheduling
 * await scheduler.start();
 * ```
 */
export * from './types';
export { TaskStore } from './task/task-store';
export { TaskDependencyGraph } from './task/task-dependency';
export { UnifiedTaskScheduler } from './scheduler/unified-task-scheduler';
export { ContextGatherer } from './planning/context-gatherer';
export { SuccessCriteriaChecker } from './planning/success-criteria-checker';
export { SubGoalPlanner } from './planning/sub-goal-planner';
export { TaskPlanner, type TaskReviewResult } from './planning/task-planner';
export { PlanPresenter, type PlanReport, type PlanConfirmationResult } from './planning/plan-presenter';
export { KnowledgeStore } from './knowledge/knowledge-store';
export { GoalStore } from './goal-manager/goal-store';
export { SubGoalStore } from './sub-goal/sub-goal-store';
export { NotificationQueue } from './output-layer/notification-queue';
export { ValueAssessor, type ValueAssessment } from './output-layer/value-assessor';
export { ExecutionPipeline } from './execution/execution-pipeline';
export { ClaudeLLMChannel, SimpleIdleDetector, LocalExecutionPipeline, } from './runtime/claude-llm-adapter';
export { GoalOrchestrator, type OrchestrationPhase, type OrchestrationState, } from './orchestrator/goal-orchestrator';
export { generateId, now, getPriorityWeight, sleep, deepClone, extractKeywords, calculateSimilarity, formatDuration, formatDate, validateDependencies, retry, Semaphore, EventEmitter, } from './utils';
/**
 * Version information
 */
export declare const VERSION = "0.3.0";
/**
 * Architecture description
 */
export declare const ARCHITECTURE: {
    name: string;
    version: string;
    components: string[];
    hierarchy: string[];
    taskTypes: string[];
    workflow: string[];
    features: string[];
};
//# sourceMappingURL=index.d.ts.map