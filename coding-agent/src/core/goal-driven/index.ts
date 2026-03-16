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

// Types
export * from './types/index.js';

// Core components
export { TaskStore } from './task/task-store.js';
export { TaskDependencyGraph } from './task/task-dependency.js';
export { UnifiedTaskScheduler } from './scheduler/unified-task-scheduler.js';

// Planning components
export { ContextGatherer } from './planning/context-gatherer.js';
export { SuccessCriteriaChecker } from './planning/success-criteria-checker.js';
export { SubGoalPlanner } from './planning/sub-goal-planner.js';
export { TaskPlanner, type TaskReviewResult } from './planning/task-planner.js';
export { PlanPresenter, type PlanReport, type PlanConfirmationResult } from './planning/plan-presenter.js';

// Knowledge components
export { KnowledgeStore } from './knowledge/knowledge-store.js';

// Goal management
export { GoalStore } from './goal-manager/goal-store.js';

// Sub-goal management
export { SubGoalStore } from './sub-goal/sub-goal-store.js';

// Output layer
export { NotificationQueue } from './output-layer/notification-queue.js';
export { ValueAssessor, type ValueAssessment } from './output-layer/value-assessor.js';

// Orchestrator
export {
  GoalOrchestrator,
  type OrchestrationPhase,
  type OrchestrationState,
} from './orchestrator/goal-orchestrator.js';

// Utilities
export {
  generateId,
  now,
  getPriorityWeight,
  sleep,
  deepClone,
  extractKeywords,
  calculateSimilarity,
  formatDuration,
  formatDate,
  validateDependencies,
  retry,
  Semaphore,
  EventEmitter,
} from './utils/index.js';

/**
 * Version information
 */
export const VERSION = '0.3.0';

/**
 * Architecture description
 */
export const ARCHITECTURE = {
  name: 'Goal-Driven Agent with Hierarchical Planning',
  version: VERSION,
  components: [
    'GoalOrchestrator - 10-phase workflow orchestration',
    'SubGoalPlanner - Sub-goal decomposition and management',
    'TaskPlanner - Task generation, review, and adjustment',
    'PlanPresenter - Plan presentation and user confirmation',
    'ValueAssessor - Task result value assessment and smart notification',
    'UnifiedTaskScheduler - Core scheduling engine with value-based notification',
    'TaskStore - JSON-based task persistence',
    'SubGoalStore - Sub-goal persistence',
    'TaskDependencyGraph - DAG management with cycle detection',
    'ContextGatherer - Progressive information collection with validation',
    'SuccessCriteriaChecker - Automatic progress evaluation',
    'KnowledgeStore - Goal-scoped knowledge reuse',
    'GoalStore - Goal and dimension management',
    'NotificationQueue - Priority-based notification system',
  ],
  hierarchy: [
    'Goal - User objective',
    'SubGoal - Planning milestone between Goal and Task',
    'Task (hierarchyLevel: task) - Main execution unit',
    'SubTask (hierarchyLevel: sub_task) - Nested execution unit',
    'Action (hierarchyLevel: action) - Minimum execution unit',
  ],
  taskTypes: [
    'exploration - Dimension-based information gathering',
    'one_time - Single execution tasks',
    'recurring - Periodic scheduled tasks',
    'interactive - Tasks requiring user input',
    'monitoring - Continuous monitoring tasks',
    'event_triggered - Conditional execution tasks',
  ],
  workflow: [
    'Phase 1: 目标理解与信息收集 (ContextGatherer)',
    'Phase 2-3: 子目标拆解与关系梳理 (SubGoalPlanner)',
    'Phase 4-5: 任务生成与Review (TaskPlanner)',
    'Phase 6: 计划汇报与确认 (PlanPresenter)',
    'Phase 7: 启动执行 (UnifiedTaskScheduler)',
    'Phase 8-9: 监控执行与智能推送 (ValueAssessor)',
    'Phase 10: 定期Review (GoalOrchestrator)',
  ],
  features: [
    'Hierarchical planning: Goal → SubGoal → Task → SubTask → Action',
    'Value-based notification with idle detection',
    'Task expected vs actual result tracking',
    'Choice options with custom input support',
    'Sub-goal dependency management',
    'Plan presentation and user confirmation flow',
    'Dependency graph with automatic status propagation',
    'Interactive task state machine with validation',
    'Success criteria with automatic evaluation',
    'Knowledge injection into prompts',
    'Adaptive task adjustment',
    'Priority-based scheduling',
  ],
};
