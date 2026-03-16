/**
 * Goal-Driven Agent — Module Exports
 */

export type * from "./types.js";

// Background Loop (P0)
export { BackgroundAgentLoop } from "./background-loop/background-agent-loop.js";
export { BackgroundLLMChannel } from "./background-loop/llm-channel.js";
export { LoopScheduler } from "./background-loop/loop-scheduler.js";

// Goal Manager (P0)
export { GoalManager } from "./goal-manager/goal-manager.js";
export { GoalDecomposer } from "./goal-manager/goal-decomposer.js";
export { SourceDiscoverer } from "./goal-manager/source-discoverer.js";

// Info Engine (P1)
export { InfoCollector } from "./info-engine/info-collector.js";
export { RelevanceJudge } from "./info-engine/relevance-judge.js";

// Insight Engine (NEW)
export * from "./insight-engine/index.js";

// Result Synthesis (NEW)
export * from "./result-synthesis/index.js";

// Action Pipeline (P2)
export { ActionReasoner } from "./action-pipeline/action-reasoner.js";
export { PreActionGate } from "./action-pipeline/pre-action-gate.js";
export { CapabilityResolver } from "./action-pipeline/capability-resolver.js";
export { Executor } from "./action-pipeline/executor.js";

// Knowledge & Output (P0)
export { KnowledgeStore } from "./knowledge/knowledge-store.js";
export { NotificationQueue } from "./output-layer/notification-queue.js";
export { IdleDetector } from "./output-layer/idle-detector.js";

// Extension Entry
export { default as goalDrivenExtension } from "./extension.js";
