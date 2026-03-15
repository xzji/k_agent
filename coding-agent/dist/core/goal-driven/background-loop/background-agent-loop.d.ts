/**
 * BackgroundAgentLoop — The core background event loop
 *
 * Lifecycle:
 * 1. User creates a goal via /goal add → starts the loop
 * 2. Loop runs cycles: collect info → judge relevance → reason → execute
 * 3. All goals completed/abandoned → enters idle (long interval checks)
 * 4. User /goal stop → stops the loop
 *
 * Key constraints:
 * - Completely independent from foreground AgentSession
 * - Outputs via NotificationQueue (async, non-blocking)
 * - Self-recovers from errors (exponential backoff)
 */
import type { ExtensionAPI } from "../../extensions/types.js";
import type { ModelRegistry } from "../../model-registry.js";
import type { GoalManager } from "../goal-manager/goal-manager.js";
import type { KnowledgeStore } from "../knowledge/knowledge-store.js";
import type { NotificationQueue } from "../output-layer/notification-queue.js";
import type { LoopState } from "../types.js";
import { BackgroundLLMChannel } from "./llm-channel.js";
export interface BackgroundLoopDeps {
    modelRegistry: ModelRegistry;
    currentModel: import("@mariozechner/pi-ai").Model<import("@mariozechner/pi-ai").Api>;
    dataDir: string;
}
export declare class BackgroundAgentLoop {
    readonly llmChannel: BackgroundLLMChannel;
    readonly goalManager: GoalManager;
    readonly knowledgeStore: KnowledgeStore;
    readonly notificationQueue: NotificationQueue;
    private loopState;
    private running;
    private loopTimer;
    private scheduler;
    private lastProcessedGoalId;
    private piApi?;
    private infoCollector;
    private relevanceJudge;
    private actionReasoner;
    private capabilityResolver;
    private preActionGate;
    constructor(deps: BackgroundLoopDeps, goalManager: GoalManager, knowledgeStore: KnowledgeStore, notificationQueue: NotificationQueue, piApi?: ExtensionAPI);
    /**
     * Start the background loop
     */
    start(): Promise<void>;
    /**
     * Stop the background loop
     */
    stop(): Promise<void>;
    /**
     * Check if the loop is running
     */
    isRunning(): boolean;
    /**
     * Get current loop state
     */
    getLoopState(): LoopState;
    /**
     * Sync model when user changes it
     */
    onModelChange(model: import("@mariozechner/pi-ai").Model<import("@mariozechner/pi-ai").Api>): void;
    /**
     * Schedule the next cycle
     */
    private scheduleNextCycle;
    /**
     * Run a single cycle of the background loop
     * P0: only does basic goal checking and scheduling
     * P1+: will add info collection, reasoning, execution
     */
    private runCycle;
    /**
     * Calculate delay before next cycle based on goal state
     */
    private calculateNextDelay;
}
//# sourceMappingURL=background-agent-loop.d.ts.map