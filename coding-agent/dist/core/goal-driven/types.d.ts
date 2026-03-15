/**
 * Goal-Driven Agent — Global Type Definitions
 *
 * Shared types for all goal-driven modules.
 */
/** Goal node — the basic unit of the goal tree */
export interface GoalNode {
    id: string;
    parentId: string | null;
    title: string;
    description: string;
    status: "active" | "paused" | "completed" | "abandoned";
    authorizationDepth: "full_auto" | "assisted" | "monitor" | "mixed";
    priority: number;
    constraints: GoalConstraint[];
    createdAt: number;
    updatedAt: number;
}
/** Goal constraint */
export interface GoalConstraint {
    type: "deadline" | "budget" | "quality" | "scope" | "custom";
    description: string;
    value?: string;
}
/** Dimension node — the basic unit of the dimension tree */
export interface DimensionNode {
    id: string;
    goalId: string;
    parentDimensionId: string | null;
    title: string;
    description: string;
    status: "pending" | "exploring" | "explored" | "needs_deeper";
    explorationDepth: number;
    maxDepth: number;
    timeliness: "urgent" | "normal" | "can_wait";
    valueScore: number;
    children: DimensionNode[];
    dataSources: DataSourceBinding[];
    createdAt: number;
    updatedAt: number;
    discoveredDuring?: string;
}
/** Data source binding to a dimension */
export interface DataSourceBinding {
    sourceId: string;
    query: string;
    lastFetchedAt: number | null;
    fetchInterval: number;
    accessible: boolean;
    accessCheckResult?: string;
}
/** Data source definition */
export interface DataSource {
    id: string;
    type: "web_search" | "rss" | "github" | "api" | "url_monitor" | "custom";
    name: string;
    config: Record<string, unknown>;
    reachable: boolean;
    lastCheckedAt: number | null;
}
/** Collected information item */
export interface InfoItem {
    id: string;
    sourceId: string;
    dimensionId: string | null;
    goalId: string;
    content: string;
    url?: string;
    fetchedAt: number;
    relevanceScore: number | null;
    relevanceLevel: "strong" | "weak" | "irrelevant" | null;
    metadata: Record<string, unknown>;
}
/** Action plan — output of ActionReasoner */
export interface ActionPlan {
    id: string;
    goalId: string;
    dimensionId?: string;
    triggerInfoIds: string[];
    what: string;
    why: string;
    expectedOutcome: string;
    goalImpact: string;
    costEstimate: "low" | "medium" | "high";
    urgency: "urgent" | "normal" | "can_wait";
    successProbability: number;
    requiresUserInvolvement: boolean;
    reversible: boolean;
    reasoningTrace: string;
    alternativeActions: ActionPlan[];
    knowledgeToSave: string;
    status: "proposed" | "approved" | "executing" | "completed" | "failed" | "shelved";
    createdAt: number;
}
/** Capability resolution result */
export interface CapabilityResolution {
    level: 1 | 2 | 3 | 4;
    toolChain: ToolStep[];
    fallbackPlan?: string;
    needsUserHelp: boolean;
    userHelpRequest?: UserHelpRequest;
}
export interface ToolStep {
    toolName: string;
    input: Record<string, unknown>;
    description: string;
    dependsOn?: string[];
}
export interface UserHelpRequest {
    whatAgentWantsToDo: string;
    why: string;
    blockedBy: string;
    whatUserNeedsToDo: string;
    agentPreparedParts: string;
}
/** Execution result */
export interface ExecutionResult {
    actionPlanId: string;
    status: "completed" | "partial" | "failed";
    stepResults: StepResult[];
    output?: string;
    newDimensions: Array<Partial<DimensionNode>>;
    executedAt: number;
}
export interface StepResult {
    stepId: string;
    status: "success" | "failed" | "skipped";
    output?: string;
    error?: string;
    reason?: string;
}
/** Notification entry */
export interface Notification {
    id: string;
    type: "delivery" | "report" | "suggestion" | "help_request" | "confirmation" | "progress";
    goalId: string;
    title: string;
    content: string;
    priority: "high" | "normal" | "low";
    actionPlanId?: string;
    createdAt: number;
    deliveredAt: number | null;
    userReaction?: "acknowledged" | "acted" | "dismissed" | "ignored";
}
/** Knowledge entry */
export interface KnowledgeEntry {
    id: string;
    content: string;
    source: "relevance_filter" | "pre_action_shelved" | "post_action_silent" | "execution_byproduct" | "user_feedback" | "dimension_discovery";
    relatedGoalIds: string[];
    relatedDimensionIds: string[];
    status: "raw" | "analyzed" | "pending_supplement" | "stale";
    tags: string[];
    supplementNeeded?: string;
    createdAt: number;
    lastActivatedAt: number | null;
    activationCount: number;
}
/** Loop state */
export interface LoopState {
    status: "idle" | "collecting" | "reasoning" | "executing" | "waiting";
    currentGoalId: string | null;
    currentDimensionId: string | null;
    currentActionPlanId: string | null;
    lastCycleAt: number | null;
    cycleCount: number;
    errors: LoopError[];
}
export interface LoopError {
    module: string;
    message: string;
    timestamp: number;
    recoverable: boolean;
}
/** Per-cycle execution log for a goal */
export interface CycleLog {
    id: string;
    goalId: string;
    dimensionId?: string;
    cycleNumber: number;
    status: "success" | "failed" | "no_action";
    actionType: "info_collection" | "reasoning" | "execution" | "exploration";
    details: string;
    timestamp: number;
}
/** LLM chat message (simplified, for background channel use) */
export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
/** LLM chat response (simplified) */
export interface LLMResponse {
    content: string;
    finishReason?: string;
}
/** What gets saved to disk per goal */
export interface PersistedGoalData {
    goal: GoalNode;
    dimensions: DimensionNode[];
    dataSources: DataSource[];
    cycleLogs?: CycleLog[];
}
//# sourceMappingURL=types.d.ts.map