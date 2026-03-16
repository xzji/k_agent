"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARCHITECTURE = exports.VERSION = exports.EventEmitter = exports.Semaphore = exports.retry = exports.validateDependencies = exports.formatDate = exports.formatDuration = exports.calculateSimilarity = exports.extractKeywords = exports.deepClone = exports.sleep = exports.getPriorityWeight = exports.now = exports.generateId = exports.GoalOrchestrator = exports.LocalExecutionPipeline = exports.SimpleIdleDetector = exports.ClaudeLLMChannel = exports.ExecutionPipeline = exports.ValueAssessor = exports.NotificationQueue = exports.SubGoalStore = exports.GoalStore = exports.KnowledgeStore = exports.PlanPresenter = exports.TaskPlanner = exports.SubGoalPlanner = exports.SuccessCriteriaChecker = exports.ContextGatherer = exports.UnifiedTaskScheduler = exports.TaskDependencyGraph = exports.TaskStore = void 0;
// Types
__exportStar(require("./types"), exports);
// Core components
var task_store_1 = require("./task/task-store");
Object.defineProperty(exports, "TaskStore", { enumerable: true, get: function () { return task_store_1.TaskStore; } });
var task_dependency_1 = require("./task/task-dependency");
Object.defineProperty(exports, "TaskDependencyGraph", { enumerable: true, get: function () { return task_dependency_1.TaskDependencyGraph; } });
var unified_task_scheduler_1 = require("./scheduler/unified-task-scheduler");
Object.defineProperty(exports, "UnifiedTaskScheduler", { enumerable: true, get: function () { return unified_task_scheduler_1.UnifiedTaskScheduler; } });
// Planning components
var context_gatherer_1 = require("./planning/context-gatherer");
Object.defineProperty(exports, "ContextGatherer", { enumerable: true, get: function () { return context_gatherer_1.ContextGatherer; } });
var success_criteria_checker_1 = require("./planning/success-criteria-checker");
Object.defineProperty(exports, "SuccessCriteriaChecker", { enumerable: true, get: function () { return success_criteria_checker_1.SuccessCriteriaChecker; } });
var sub_goal_planner_1 = require("./planning/sub-goal-planner");
Object.defineProperty(exports, "SubGoalPlanner", { enumerable: true, get: function () { return sub_goal_planner_1.SubGoalPlanner; } });
var task_planner_1 = require("./planning/task-planner");
Object.defineProperty(exports, "TaskPlanner", { enumerable: true, get: function () { return task_planner_1.TaskPlanner; } });
var plan_presenter_1 = require("./planning/plan-presenter");
Object.defineProperty(exports, "PlanPresenter", { enumerable: true, get: function () { return plan_presenter_1.PlanPresenter; } });
// Knowledge components
var knowledge_store_1 = require("./knowledge/knowledge-store");
Object.defineProperty(exports, "KnowledgeStore", { enumerable: true, get: function () { return knowledge_store_1.KnowledgeStore; } });
// Goal management
var goal_store_1 = require("./goal-manager/goal-store");
Object.defineProperty(exports, "GoalStore", { enumerable: true, get: function () { return goal_store_1.GoalStore; } });
// Sub-goal management
var sub_goal_store_1 = require("./sub-goal/sub-goal-store");
Object.defineProperty(exports, "SubGoalStore", { enumerable: true, get: function () { return sub_goal_store_1.SubGoalStore; } });
// Output layer
var notification_queue_1 = require("./output-layer/notification-queue");
Object.defineProperty(exports, "NotificationQueue", { enumerable: true, get: function () { return notification_queue_1.NotificationQueue; } });
var value_assessor_1 = require("./output-layer/value-assessor");
Object.defineProperty(exports, "ValueAssessor", { enumerable: true, get: function () { return value_assessor_1.ValueAssessor; } });
// Execution layer
var execution_pipeline_1 = require("./execution/execution-pipeline");
Object.defineProperty(exports, "ExecutionPipeline", { enumerable: true, get: function () { return execution_pipeline_1.ExecutionPipeline; } });
// Runtime adapters
var claude_llm_adapter_1 = require("./runtime/claude-llm-adapter");
Object.defineProperty(exports, "ClaudeLLMChannel", { enumerable: true, get: function () { return claude_llm_adapter_1.ClaudeLLMChannel; } });
Object.defineProperty(exports, "SimpleIdleDetector", { enumerable: true, get: function () { return claude_llm_adapter_1.SimpleIdleDetector; } });
Object.defineProperty(exports, "LocalExecutionPipeline", { enumerable: true, get: function () { return claude_llm_adapter_1.LocalExecutionPipeline; } });
// Orchestrator
var goal_orchestrator_1 = require("./orchestrator/goal-orchestrator");
Object.defineProperty(exports, "GoalOrchestrator", { enumerable: true, get: function () { return goal_orchestrator_1.GoalOrchestrator; } });
// Utilities
var utils_1 = require("./utils");
Object.defineProperty(exports, "generateId", { enumerable: true, get: function () { return utils_1.generateId; } });
Object.defineProperty(exports, "now", { enumerable: true, get: function () { return utils_1.now; } });
Object.defineProperty(exports, "getPriorityWeight", { enumerable: true, get: function () { return utils_1.getPriorityWeight; } });
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return utils_1.sleep; } });
Object.defineProperty(exports, "deepClone", { enumerable: true, get: function () { return utils_1.deepClone; } });
Object.defineProperty(exports, "extractKeywords", { enumerable: true, get: function () { return utils_1.extractKeywords; } });
Object.defineProperty(exports, "calculateSimilarity", { enumerable: true, get: function () { return utils_1.calculateSimilarity; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return utils_1.formatDuration; } });
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return utils_1.formatDate; } });
Object.defineProperty(exports, "validateDependencies", { enumerable: true, get: function () { return utils_1.validateDependencies; } });
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return utils_1.retry; } });
Object.defineProperty(exports, "Semaphore", { enumerable: true, get: function () { return utils_1.Semaphore; } });
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return utils_1.EventEmitter; } });
/**
 * Version information
 */
exports.VERSION = '0.3.0';
/**
 * Architecture description
 */
exports.ARCHITECTURE = {
    name: 'Goal-Driven Agent with Hierarchical Planning',
    version: exports.VERSION,
    components: [
        'GoalOrchestrator - 10-phase workflow orchestration',
        'SubGoalPlanner - Sub-goal decomposition and management',
        'TaskPlanner - Task generation, review, and adjustment',
        'PlanPresenter - Plan presentation and user confirmation',
        'ValueAssessor - Task result value assessment and smart notification',
        'UnifiedTaskScheduler - Core scheduling engine with value-based notification',
        'ExecutionPipeline - Task execution with type-specific handling',
        'TaskStore - JSON-based task persistence',
        'SubGoalStore - Sub-goal persistence',
        'TaskDependencyGraph - DAG management with cycle detection',
        'ContextGatherer - Progressive information collection with validation',
        'SuccessCriteriaChecker - Automatic progress evaluation',
        'KnowledgeStore - Goal-scoped knowledge reuse',
        'GoalStore - Goal and dimension management',
        'NotificationQueue - Priority-based notification system',
        'ClaudeLLMChannel - LLM adapter for Claude API integration',
        'SimpleIdleDetector - User idle state detection',
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
//# sourceMappingURL=index.js.map