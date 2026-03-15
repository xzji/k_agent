"use strict";
/**
 * Goal-Driven Agent — Module Exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalDrivenExtension = exports.IdleDetector = exports.NotificationQueue = exports.KnowledgeStore = exports.Executor = exports.CapabilityResolver = exports.PreActionGate = exports.ActionReasoner = exports.RelevanceJudge = exports.InfoCollector = exports.SourceDiscoverer = exports.GoalDecomposer = exports.GoalManager = exports.LoopScheduler = exports.BackgroundLLMChannel = exports.BackgroundAgentLoop = void 0;
// Background Loop (P0)
var background_agent_loop_js_1 = require("./background-loop/background-agent-loop.js");
Object.defineProperty(exports, "BackgroundAgentLoop", { enumerable: true, get: function () { return background_agent_loop_js_1.BackgroundAgentLoop; } });
var llm_channel_js_1 = require("./background-loop/llm-channel.js");
Object.defineProperty(exports, "BackgroundLLMChannel", { enumerable: true, get: function () { return llm_channel_js_1.BackgroundLLMChannel; } });
var loop_scheduler_js_1 = require("./background-loop/loop-scheduler.js");
Object.defineProperty(exports, "LoopScheduler", { enumerable: true, get: function () { return loop_scheduler_js_1.LoopScheduler; } });
// Goal Manager (P0)
var goal_manager_js_1 = require("./goal-manager/goal-manager.js");
Object.defineProperty(exports, "GoalManager", { enumerable: true, get: function () { return goal_manager_js_1.GoalManager; } });
var goal_decomposer_js_1 = require("./goal-manager/goal-decomposer.js");
Object.defineProperty(exports, "GoalDecomposer", { enumerable: true, get: function () { return goal_decomposer_js_1.GoalDecomposer; } });
var source_discoverer_js_1 = require("./goal-manager/source-discoverer.js");
Object.defineProperty(exports, "SourceDiscoverer", { enumerable: true, get: function () { return source_discoverer_js_1.SourceDiscoverer; } });
// Info Engine (P1)
var info_collector_js_1 = require("./info-engine/info-collector.js");
Object.defineProperty(exports, "InfoCollector", { enumerable: true, get: function () { return info_collector_js_1.InfoCollector; } });
var relevance_judge_js_1 = require("./info-engine/relevance-judge.js");
Object.defineProperty(exports, "RelevanceJudge", { enumerable: true, get: function () { return relevance_judge_js_1.RelevanceJudge; } });
// Action Pipeline (P2)
var action_reasoner_js_1 = require("./action-pipeline/action-reasoner.js");
Object.defineProperty(exports, "ActionReasoner", { enumerable: true, get: function () { return action_reasoner_js_1.ActionReasoner; } });
var pre_action_gate_js_1 = require("./action-pipeline/pre-action-gate.js");
Object.defineProperty(exports, "PreActionGate", { enumerable: true, get: function () { return pre_action_gate_js_1.PreActionGate; } });
var capability_resolver_js_1 = require("./action-pipeline/capability-resolver.js");
Object.defineProperty(exports, "CapabilityResolver", { enumerable: true, get: function () { return capability_resolver_js_1.CapabilityResolver; } });
var executor_js_1 = require("./action-pipeline/executor.js");
Object.defineProperty(exports, "Executor", { enumerable: true, get: function () { return executor_js_1.Executor; } });
// Knowledge & Output (P0)
var knowledge_store_js_1 = require("./knowledge/knowledge-store.js");
Object.defineProperty(exports, "KnowledgeStore", { enumerable: true, get: function () { return knowledge_store_js_1.KnowledgeStore; } });
var notification_queue_js_1 = require("./output-layer/notification-queue.js");
Object.defineProperty(exports, "NotificationQueue", { enumerable: true, get: function () { return notification_queue_js_1.NotificationQueue; } });
var idle_detector_js_1 = require("./output-layer/idle-detector.js");
Object.defineProperty(exports, "IdleDetector", { enumerable: true, get: function () { return idle_detector_js_1.IdleDetector; } });
// Extension Entry
var extension_js_1 = require("./extension.js");
Object.defineProperty(exports, "goalDrivenExtension", { enumerable: true, get: function () { return extension_js_1.default; } });
