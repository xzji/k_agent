/**
 * Goal-Driven Agent — Global Type Definitions
 *
 * Shared types for all goal-driven modules.
 */

// ============================================================
// Goal Related
// ============================================================

/** Goal node — the background unit of the goal tree */
export interface GoalNode {
	id: string;
	parentId: string | null;
	title: string;
	description: string;
	goal_understanding?: string; // AI's understanding of the goal
	completion_vision?: string; // Vision of goal completion
	status: "active" | "paused" | "completed" | "abandoned";
	authorizationDepth: "full_auto" | "assisted" | "monitor" | "mixed";
	priority: number; // 1-10
	constraints: GoalConstraint[];
	createdAt: number;
	updatedAt: number;
	cycleCount?: number; // Number of background cycles completed for this goal
	lastCycleAt?: number; // Timestamp of last cycle for this goal
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
	core_questions: string[]; // 2-4 core questions for this dimension
	status: "pending" | "exploring" | "explored" | "needs_deeper";
	explorationDepth: number; // Current exploration depth (0-based)
	estimated_depth: number; // 1-5: estimated exploration depth (reference value)
	timeliness: "urgent" | "normal" | "can_wait"; // When to start exploring
	refresh_interval: "hours" | "daily" | "weekly" | "monthly"; // How often to refresh
	valueScore: number; // 1-10: value to goal completion
	children: DimensionNode[];
	dataSources: DataSourceBinding[];
	createdAt: number;
	updatedAt: number;
	discoveredDuring?: string;
}

/** Data source binding to a dimension */
export interface DataSourceBinding {
	sourceId: string;
	query: string; // Suggested query/filter for this source
	suggestedQuery?: string; // More detailed query description
	lastFetchedAt: number | null;
	fetchInterval: number; // ms
	accessible: boolean;
	accessCheckResult?: string;
	confidence?: "high" | "medium" | "low"; // Confidence level in this source
}

// ============================================================
// Data Source Related
// ============================================================

/** Data source definition */
export interface DataSource {
	id: string;
	type: "web_search" | "rss" | "github" | "api" | "url_monitor" | "custom";
	name: string;
	config: Record<string, unknown>;
	reachable: boolean;
	lastCheckedAt: number | null;
	confidence?: "high" | "medium" | "low"; // Source confidence level
	updateFrequency?: "hours" | "daily" | "weekly" | "monthly"; // Source's own update frequency
	domainAnalysis?: string; // Which domain this source covers
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

// ============================================================
// Action Related
// ============================================================

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
	successProbability: number; // 1-10
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

// ============================================================
// Insight & Result Related
// ============================================================

/** Insight extracted from information */
export interface Insight {
	id: string;
	type: "discovery" | "trend" | "anomaly" | "validation" | "synthesis";
	title: string; // One-line title
	content: string; // Detailed content
	significance: "high" | "medium" | "low";
	sources: Array<{ sourceId: string; snippet: string }>;
	reasoning: string; // How this insight was derived
	valueToGoal: string; // Why this matters to the goal
	relatedDimensionIds: string[];
	extractedAt: number;
}

/** Value judgment result */
export interface ValueJudgment {
	insightId: string;
	isValuable: boolean;
	valueScore: number; // 0-100
	reasoning: string;
	shouldNotify: boolean;
	notifyPriority: "high" | "medium" | "low";
	judgedAt: number;
}

/** Synthesized result for notification */
export interface SynthesizedResult {
	id: string;
	type: "discovery" | "analysis_complete" | "deliverable";
	title: string;
	summary: string; // One-line summary

	// Core finding
	coreFinding: string;

	// Why this matters
	valueToGoal: string;

	// Reasoning process
	reasoningProcess: string;

	// Sources
	sources: Array<{ source: string; credibility: "high" | "medium" | "low" }>;

	// Optional: Deliverable content (report, map, etc.)
	deliverableContent?: string;
	deliverableType?: "markdown" | "json" | "list";
	deliverablePath?: string;

	relatedGoalId: string;
	relatedDimensionIds: string[];
	createdAt: number;
}

// ============================================================
// Notification Related
// ============================================================

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

// ============================================================
// Knowledge Store Related
// ============================================================

/** Knowledge entry */
export interface KnowledgeEntry {
	id: string;
	content: string;
	source:
		| "relevance_filter"
		| "pre_action_shelved"
		| "post_action_silent"
		| "execution_byproduct"
		| "user_feedback"
		| "dimension_discovery";
	relatedGoalIds: string[];
	relatedDimensionIds: string[];
	status: "raw" | "analyzed" | "pending_supplement" | "stale";
	tags: string[];
	supplementNeeded?: string;
	createdAt: number;
	lastActivatedAt: number | null;
	activationCount: number;
}

// ============================================================
// Background Loop Related
// ============================================================

/** Notification configuration */
export interface NotificationConfig {
	/** Enable important discovery notifications */
	enableDiscoveryNotification: boolean;
	/** Minimum strong-relevance items to trigger discovery notification */
	strongRelevanceThreshold: number;
	/** Minimum total relevant items to trigger discovery notification */
	totalRelevantThreshold: number;
	/** Enable delivery notifications for successful execution */
	enableDeliveryNotification: boolean;
	/** Minimum output length (chars) to trigger delivery notification */
	deliveryMinOutputLength: number;
}

/** Loop state */
export interface LoopState {
	status: "idle" | "collecting" | "reasoning" | "executing" | "waiting" | "stopped";
	currentGoalId: string | null;
	currentDimensionId: string | null;
	currentActionPlanId: string | null;
	lastCycleAt: number | null;
	nextCycleDelay: number | null; // Delay in milliseconds for next cycle
	cycleCount: number;
	errors: LoopError[];
	notificationConfig: NotificationConfig;
	idleDetectorConfig?: {
		idleThreshold: number;
		urgentThreshold: number;
		checkInterval: number;
	};
	customInterval?: number | null; // Custom loop interval in milliseconds (null = use automatic)
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
	dimensionTitle?: string; // Human-readable dimension title
	cycleNumber: number;
	status: "success" | "failed" | "no_action";
	actionType: "info_collection" | "reasoning" | "execution" | "exploration";
	details: string;
	timestamp: number;

	// Detailed breakdown (new fields)
	rawInfoCount?: number; // Number of items collected
	relevantInfoCount?: number; // Number of items judged as relevant
	relevantInfoSample?: string[]; // Sample of relevant info (first 3)
	actionPlan?: string; // What action was planned
	actionResult?: string; // Action execution result
	relevanceJudgments?: { // Relevance judgments details
		total: number;
		relevant: number;
		weak: number;
		irrelevant: number;
	};
}

// ============================================================
// LLM Channel Related
// ============================================================

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

// ============================================================
// Persisted Goal Data
// ============================================================

/** What gets saved to disk per goal */
export interface PersistedGoalData {
	goal: GoalNode;
	dimensions: DimensionNode[];
	dataSources: DataSource[];
	cycleLogs?: CycleLog[];
}
