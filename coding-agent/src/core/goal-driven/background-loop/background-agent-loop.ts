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
import type { GoalNode, LoopState, DimensionNode } from "../types.js";
import { ActionReasoner } from "../action-pipeline/action-reasoner.js";
import { CapabilityResolver } from "../action-pipeline/capability-resolver.js";
import { Executor } from "../action-pipeline/executor.js";
import { PreActionGate } from "../action-pipeline/pre-action-gate.js";
import { InfoCollector } from "../info-engine/info-collector.js";
import { RelevanceJudge } from "../info-engine/relevance-judge.js";
import { InsightExtractor, ValueJudge } from "../insight-engine/index.js";
import { ResultSynthesizer, NarrativeBuilder, NotificationFormatter } from "../result-synthesis/index.js";
import { BackgroundLLMChannel } from "./llm-channel.js";
import { LoopScheduler } from "./loop-scheduler.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface BackgroundLoopDeps {
	modelRegistry: ModelRegistry;
	currentModel: import("@mariozechner/pi-ai").Model<import("@mariozechner/pi-ai").Api>;
	dataDir: string;
}

export class BackgroundAgentLoop {
	readonly llmChannel: BackgroundLLMChannel;
	readonly goalManager: GoalManager;
	readonly knowledgeStore: KnowledgeStore;
	readonly notificationQueue: NotificationQueue;
	private readonly dataDir: string;
	private readonly stateFilePath: string;

	private loopState: LoopState;
	private running = false;
	private loopTimer: ReturnType<typeof setTimeout> | null = null;
	private scheduler: LoopScheduler;
	private lastProcessedGoalId: string | null = null;
	private piApi?: ExtensionAPI; // Needed for executor

	// P1 & P2 Sub-engines
	private infoCollector: InfoCollector;
	private relevanceJudge: RelevanceJudge;
	private insightExtractor: InsightExtractor;
	private valueJudge: ValueJudge;
	private resultSynthesizer: ResultSynthesizer;
	private narrativeBuilder: NarrativeBuilder;
	private notificationFormatter: NotificationFormatter;
	private actionReasoner: ActionReasoner;
	private capabilityResolver: CapabilityResolver;
	private preActionGate: PreActionGate;

	constructor(deps: BackgroundLoopDeps, goalManager: GoalManager, knowledgeStore: KnowledgeStore, notificationQueue: NotificationQueue, piApi?: ExtensionAPI) {
		this.llmChannel = new BackgroundLLMChannel(deps.modelRegistry);
		this.llmChannel.syncModel(deps.currentModel);

		this.goalManager = goalManager;
		this.knowledgeStore = knowledgeStore;
		this.notificationQueue = notificationQueue;
		this.scheduler = new LoopScheduler();
		this.piApi = piApi;

		// Setup data directory for persistence
		this.dataDir = join(deps.dataDir, "loop-state");
		this.stateFilePath = join(this.dataDir, "state.json");
		this.ensureDir();

		// Initialize P1 engines
		this.infoCollector = new InfoCollector(piApi);
		this.relevanceJudge = new RelevanceJudge(this.llmChannel);

		// Initialize new insight & result engines
		this.insightExtractor = new InsightExtractor(this.llmChannel);
		this.valueJudge = new ValueJudge(this.llmChannel, knowledgeStore);
		this.narrativeBuilder = new NarrativeBuilder();
		this.resultSynthesizer = new ResultSynthesizer(this.llmChannel, this.narrativeBuilder);
		this.notificationFormatter = new NotificationFormatter();

		// Initialize P2 engines
		this.actionReasoner = new ActionReasoner(this.llmChannel);
		this.capabilityResolver = new CapabilityResolver(this.llmChannel);
		this.preActionGate = new PreActionGate(this.llmChannel);

		// Load or initialize loop state
		this.loopState = this.loadLoopState();
	}

	/**
	 * Start the background loop
	 */
	async start(): Promise<void> {
		if (this.running) return;
		this.running = true;
		this.loopState.status = "waiting";
		this.saveLoopState();
		this.scheduleNextCycle(0); // Start immediately
	}

	/**
	 * Stop the background loop
	 */
	async stop(): Promise<void> {
		this.running = false;
		this.loopState.status = "stopped";
		this.saveLoopState();
		this.llmChannel.abort();
		if (this.loopTimer) {
			clearTimeout(this.loopTimer);
			this.loopTimer = null;
		}
	}

	/**
	 * Check if the loop is running
	 */
	isRunning(): boolean {
		return this.running;
	}

	/**
	 * Get current loop state
	 */
	getLoopState(): LoopState {
		return { ...this.loopState };
	}

	/**
	 * Sync model when user changes it
	 */
	onModelChange(model: import("@mariozechner/pi-ai").Model<import("@mariozechner/pi-ai").Api>): void {
		this.llmChannel.syncModel(model);
	}

	/**
	 * Update notification configuration
	 */
	updateNotificationConfig(updates: Partial<import("../types.js").NotificationConfig>): void {
		this.loopState.notificationConfig = {
			...this.loopState.notificationConfig,
			...updates
		};
		this.saveLoopState();
	}

	/**
	 * Update idle detector configuration
	 */
	updateIdleDetectorConfig(updates: Partial<{ idleThreshold: number; urgentThreshold: number; checkInterval: number }>): void {
		this.loopState.idleDetectorConfig = {
			...(this.loopState.idleDetectorConfig || {
				idleThreshold: 5 * 60 * 1000,
				urgentThreshold: 60 * 1000,
				checkInterval: 30 * 1000,
			}),
			...updates,
		};
		this.saveLoopState();
	}

	/**
	 * Set custom loop interval (null = use automatic calculation)
	 */
	setCustomInterval(intervalMs: number | null): void {
		this.loopState.customInterval = intervalMs;
		this.saveLoopState();
	}

	/**
	 * Get current custom interval (null if using automatic)
	 */
	getCustomInterval(): number | null {
		return this.loopState.customInterval ?? null;
	}

	/**
	 * Extract insights from execution result
	 * Combines execution output with previously stored insights
	 */
	private async extractInsightsFromExecution(
		goal: GoalNode,
		dimension: DimensionNode,
		execResult: import("../types.js").ExecutionResult,
		storedInsights: import("../types.js").KnowledgeEntry[]
	): Promise<import("../types.js").Insight[]> {
		const insights: import("../types.js").Insight[] = [];

		// 1. Analyze execution output if substantial
		if (execResult.output && execResult.output.length > 100) {
			try {
				// Use LLM to extract insights from execution output
				const result = await this.llmChannel.chatJSON<{
					type: "discovery" | "trend" | "synthesis";
					title: string;
					content: string;
					significance: "high" | "medium" | "low";
					reasoning: string;
					valueToGoal: string;
				}>({
					systemPrompt: `You are analyzing the execution result of an AI agent to extract meaningful insights.

Goal: ${goal.title}
Dimension: ${dimension.title}

Execution Output:
${execResult.output.slice(0, 2000)}...

Task: Extract ONE key insight from this execution result.
The insight should be:
- A discovery, trend, or synthesis
- Something valuable for achieving the goal
- Not just a restatement of what was done

Return JSON:
{
  "type": "discovery" | "trend" | "synthesis",
  "title": "one-line title",
  "content": "2-3 sentences describing the insight",
  "significance": "high" | "medium" | "low",
  "reasoning": "brief explanation",
  "valueToGoal": "why this matters"
}`,
					messages: [
						{ role: "user", content: execResult.output.slice(0, 1000) }
					],
					temperature: 0.4,
				});

				if (result.title && result.content) {
					insights.push({
						id: `exec-insight-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
						type: result.type,
						title: result.title,
						content: result.content,
						significance: result.significance,
						sources: [{
							sourceId: "execution",
							snippet: execResult.output.slice(0, 100)
						}],
						reasoning: result.reasoning + "\\n(来源：执行输出)",
						valueToGoal: result.valueToGoal,
						relatedDimensionIds: [dimension.id],
						extractedAt: Date.now(),
					});
				}
			} catch (error) {
				console.warn("[BackgroundLoop] Failed to extract insights from execution:", error);
			}
		}

		// 2. Synthesize with stored insights if available
		if (storedInsights.length > 0) {
			// Mark stored insights as processed and add them to insights list
			// (For now, we keep it simple and just use execution insights)
			// In the future, we could synthesize execution output with stored insights
		}

		return insights;
	}

	/**
	 * Schedule the next cycle
	 */
	private scheduleNextCycle(delayMs: number): void {
		if (!this.running) return;
		this.loopState.nextCycleDelay = delayMs;
		this.loopState.status = "waiting";
		this.saveLoopState();
		this.loopTimer = setTimeout(() => this.runCycle(), delayMs);
	}

	/**
	 * Run a single cycle of the background loop
	 * P0: only does basic goal checking and scheduling
	 * P1+: will add info collection, reasoning, execution
	 */
	private async runCycle(): Promise<void> {
		if (!this.running) return;

		try {
			this.loopState.status = "collecting";
			this.loopState.cycleCount++;
			this.saveLoopState();

			// Step 1: Get active goals
			const activeGoals = this.goalManager.getActiveGoals();
			if (activeGoals.length === 0) {
				this.loopState.status = "idle";
				this.saveLoopState();
				this.scheduleNextCycle(60_000); // No goals, check again in 1 min
				return;
			}

			// Step 2: Select work item
			const { goal, dimensions } = this.scheduler.selectNextWorkItem(
				activeGoals,
				this.goalManager.getAllDimensionsByGoal(),
				this.lastProcessedGoalId,
			);

			this.loopState.currentGoalId = goal.id;
			this.lastProcessedGoalId = goal.id;

			if (dimensions.length > 0) {
				this.loopState.currentDimensionId = dimensions[0].id;
			}

			// Step 3-7: P1+ will add info collection, relevance judging,
			// action reasoning, execution, and post-action gate here.

			// Prepare detailed cycle log data (defined outside if block for use in addCycleLog)
			const cycleLogData: {
				rawInfoCount: number;
				relevantInfoCount: number;
				relevantInfoSample: string[];
				relevanceJudgments: { total: number; relevant: number; weak: number; irrelevant: number };
				actionPlan?: string;
				actionResult?: string;
			} = {
				rawInfoCount: 0,
				relevantInfoCount: 0,
				relevantInfoSample: [],
				relevanceJudgments: { total: 0, relevant: 0, weak: 0, irrelevant: 0 }
			};

			let cycleLogDetails = "";
			if (dimensions.length > 0) {
				const currentDim = dimensions[0];

				// Ensure dimension is marked as exploring
				if (currentDim.status === "pending") {
					await this.goalManager.updateDimension(goal.id, currentDim.id, { status: "exploring" });
					currentDim.status = "exploring";
				}

				// Fetch sources
				const allGoalSources = this.goalManager.getDimensions(goal.id).flatMap(d => d.dataSources);
				// We need the data source objects
				// (in a real DB we'd fetch them by ID, here we mock by creating dummy wrappers for now)
				const mockSourceObjects = currentDim.dataSources.map(b => ({
					id: b.sourceId,
					type: "web_search" as const,
					name: "Web Search",
					config: { query: b.query },
					reachable: true,
					lastCheckedAt: Date.now()
				}));

				// Phase 1: Information Collection & Relevance Judgment
				this.loopState.status = "collecting";
				const rawItems = await this.infoCollector.collect(goal.id, currentDim, mockSourceObjects);

				// Update cycle log data with collection results
				cycleLogData.rawInfoCount = rawItems.length;

				let relevantItems: import("../types.js").InfoItem[] = [];
				if (rawItems.length > 0) {
					relevantItems = await this.relevanceJudge.judgeBatch(goal, currentDim, rawItems);

					// Collect relevance statistics
					cycleLogData.relevanceJudgments.total = rawItems.length;
					cycleLogData.relevantInfoCount = relevantItems.length;

					// Count by relevance level
					for (const item of rawItems) {
						const level = item.relevanceLevel || "unknown";
						if (level === "strong") {
							cycleLogData.relevanceJudgments.relevant++;
						} else if (level === "weak") {
							cycleLogData.relevanceJudgments.weak++;
						} else {
							cycleLogData.relevanceJudgments.irrelevant++;
						}
					}
				}

				// ═══════════════════════════════════════════════════════════════
				// PHASE 1.5: Extract & Store Insights (No notification yet)
				// ═══════════════════════════════════════════════════════════════
				if (relevantItems.length > 0) {
						this.loopState.status = "analyzing";

						// Extract insights from relevant information
						const insights = await this.insightExtractor.extractInsights(goal, currentDim, relevantItems);

						// Save ALL insights to knowledge store for later use in P2
						// No notification here - notifications will be triggered after P2 execution
						for (const insight of insights) {
							this.knowledgeStore.save({
								id: `insight-${insight.id}`,
								content: `**${insight.title}**\n\n${insight.content}`,
								source: "relevance_filter",
								relatedGoalIds: [goal.id],
								relatedDimensionIds: insight.relatedDimensionIds,
								status: "raw",
								tags: [insight.type, insight.significance, "awaiting_execution"],
								createdAt: Date.now(),
								lastActivatedAt: Date.now(),
								activationCount: 0
							});
						}

						// ═══════════════════════════════════════════════════════════════
					// END: PHASE 1.5 - Insights stored, will be used after P2
					// ═══════════════════════════════════════════════════════════════

					// Save relevant info to knowledge store
					for (const item of relevantItems) {
						this.knowledgeStore.save({
							content: item.content,
							source: "dimension_discovery",
							relatedGoalIds: [goal.id],
							relatedDimensionIds: [currentDim.id],
							tags: [item.relevanceLevel || "unknown"]
						});
					}

					// Collect samples of relevant info
					cycleLogData.relevantInfoSample = relevantItems.slice(0, 3).map(item => {
						const summary = item.content.split('\n')[0].substring(0, 80);
						return item.relevanceLevel ? `[${item.relevanceLevel}] ${summary}` : summary;
					});

					// Build detailed info summary
					cycleLogDetails = `📊 采集 ${rawItems.length} 条，相关 ${relevantItems.length} 条`;
					cycleLogDetails += ` (强相关: ${cycleLogData.relevanceJudgments.relevant}, 弱相关: ${cycleLogData.relevanceJudgments.weak}, 不相关: ${cycleLogData.relevanceJudgments.irrelevant})`;
					if (relevantItems.length > 0) {
						cycleLogDetails += `\n   📌 采集到的相关信息:`;
						const maxItemsToShow = Math.min(3, relevantItems.length);
						for (let i = 0; i < maxItemsToShow; i++) {
							const item = relevantItems[i];
							// Extract first line or first 80 chars as summary
							const summary = item.content.split('\n')[0].substring(0, 80);
							const relevance = item.relevanceLevel ? `[${item.relevanceLevel}] ` : '';
							const url = item.url ? ` 🔗 ${item.url}` : '';
							cycleLogDetails += `\n   ${i + 1}. ${relevance}${summary}${url}`;
						}
						if (relevantItems.length > 3) {
							cycleLogDetails += `\n   ... 还有 ${relevantItems.length - 3} 条`;
						}
					}
				} else {
					cycleLogDetails = `📊 未采集到新信息`;
				}

				// Phase 2: Action Reasoning & Execution
				this.loopState.status = "reasoning";
				const actionPlan = await this.actionReasoner.reasonNextAction(goal, currentDim, relevantItems);

				if (actionPlan) {
					// Record action plan details
					cycleLogData.actionPlan = `${actionPlan.what}\n原因: ${actionPlan.why}\n预期: ${actionPlan.expectedOutcome}`;

					this.loopState.currentActionPlanId = actionPlan.id;
					const gateDecision = await this.preActionGate.evaluate(goal, actionPlan);

					if (gateDecision === "approve") {
						this.loopState.status = "executing";
						if (this.piApi) {
							// Resolve capability first, then execute
							const resolution = await this.capabilityResolver.resolve(actionPlan);
							const executor = new Executor(this.piApi, this.llmChannel);
							const execResult = await executor.execute(actionPlan, resolution);

							if (execResult.status === "completed") {
								cycleLogData.actionResult = `✅ 成功: ${actionPlan.what}`;
								cycleLogDetails += `\n   ✅ 执行: ${actionPlan.what}`;

								// 🔔 NEW: Result-based notifications after P2 execution
								// Trigger notifications based on execution results + stored insights

								// Check if we should generate notifications
								const shouldNotify = execResult.status === "completed" &&
									(execResult.output && execResult.output.length > 0);

								if (shouldNotify) {
									// Retrieve insights from knowledge store for this dimension
									const storedInsights = this.knowledgeStore.getByGoal(goal.id)
										.filter(k => k.relatedDimensionIds && k.relatedDimensionIds.includes(currentDim.id))
										.filter(k => k.tags && k.tags.includes("awaiting_execution"));

									// Extract insights from execution result + stored insights
									const executionInsights = await this.extractInsightsFromExecution(goal, currentDim, execResult, storedInsights);

									if (executionInsights.length > 0) {
										// Judge value
										const judgments = await this.valueJudge.judgeBatch(executionInsights, goal);

										// Filter for notifiable insights
										const notifiableInsights = executionInsights.filter((insight) => {
											const judgment = judgments.find(j => j.insightId === insight.id);
											return judgment && judgment.shouldNotify;
										});

										if (notifiableInsights.length > 0) {
											// Check if dimension is complete
											const isComplete = currentDim.explorationDepth >= currentDim.estimated_depth;

											// Synthesize into appropriate notification type
											for (const insight of notifiableInsights) {
												const judgment = judgments.find(j => j.insightId === insight.id)!;

												// Choose notification type based on context
												let resultType: "discovery" | "analysis_complete" | "deliverable" = "discovery";
												if (isComplete) {
													resultType = "analysis_complete";
												} else if (execResult.output && execResult.output.length > 500) {
													resultType = "deliverable";
												}

												const result = await this.resultSynthesizer.synthesizeInsight(insight, judgment, goal);
												result.type = resultType; // Override type

												// Format and enqueue
												const notificationText = this.notificationFormatter.format(result);
												this.notificationQueue.enqueue({
													id: result.id,
													type: resultType === "deliverable" ? "delivery" : "suggestion",
													priority: resultType === "discovery" ? "high" : "normal",
													title: result.title,
													content: notificationText,
													goalId: goal.id,
													createdAt: Date.now(),
													deliveredAt: null
												});

												// Update insight status to "notified"
												this.knowledgeStore.updateStatus(insight.id, "analyzed");
											}
										}
									}
								}

								// ═══════════════════════════════════════════════════════════════
								// END: Result-based notifications
								// ═══════════════════════════════════════════════════════════════
							} else {
								// Extract first line of error only
								const failedStep = execResult.stepResults.find(r => r.status === "failed");
								if (failedStep?.error) {
									const errorFirstLine = failedStep.error.split('\n')[0].substring(0, 60);
									cycleLogData.actionResult = `❌ 失败: ${errorFirstLine}`;
									cycleLogDetails += `\n   ❌ 执行失败: ${errorFirstLine}...`;
								} else {
									cycleLogData.actionResult = `❌ 失败: 未知错误`;
									cycleLogDetails += `\n   ❌ 执行失败`;
								}
							}

							// Simulate progressing depth after execution
							currentDim.explorationDepth += 1;
							await this.goalManager.updateDimension(goal.id, currentDim.id, {
								explorationDepth: currentDim.explorationDepth
							});
						} else {
							cycleLogData.actionResult = `⏸️ API未就绪`;
							cycleLogDetails += `\n   ⏸️ API未就绪，已挂起`;
						}
					} else if (gateDecision === "needs_user") {
						cycleLogData.actionResult = `⚠️ 需授权: ${actionPlan.what}`;
						cycleLogDetails += `\n   ⚠️ 需授权: ${actionPlan.what}`;
						this.notificationQueue.enqueue({
							id: Date.now().toString(),
							type: "help_request",
							priority: "high",
							title: `⚠️ 需要授权: ${actionPlan.what}`,
							content: `**原因**: ${actionPlan.why}\n**预期结果**: ${actionPlan.expectedOutcome}\n\n该操作被拦截并等待您的批准。`,
							goalId: goal.id,
							actionPlanId: actionPlan.id,
							createdAt: Date.now(),
							deliveredAt: null
						});
					} else {
						cycleLogData.actionResult = `🚫 被拦截: ${actionPlan.what}`;
						cycleLogDetails += `\n   🚫 被拦截: ${actionPlan.what} (违反约束)`;
					}
				} else {
					cycleLogData.actionResult = relevantItems.length === 0 ? "💭 信息不足，暂无行动" : "💭 已收集足够信息，无需行动";
					if (relevantItems.length === 0) {
						cycleLogDetails += `\n   💭 信息不足，暂无行动`;
					} else {
						cycleLogDetails += `\n   💭 已收集足够信息，无需行动`;
					}
				}

				// Mark as explored if max depth reached
				if (currentDim.explorationDepth >= currentDim.estimated_depth) {
					await this.goalManager.updateDimension(goal.id, currentDim.id, { status: "explored" });
					cycleLogDetails += `\n   🏁 达到最大深度`;
				}
			} else {
				cycleLogDetails = "所有维度已探索完毕";
			}

			// Add authentic log with detailed breakdown
			await this.goalManager.addCycleLog({
				id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
				goalId: goal.id,
				dimensionId: dimensions.length > 0 ? dimensions[0].id : undefined,
				dimensionTitle: dimensions.length > 0 ? dimensions[0].title : undefined,
				cycleNumber: this.loopState.cycleCount,
				status: "success",
				actionType: "exploration",
				details: cycleLogDetails,
				timestamp: Date.now(),
				// Detailed breakdown
				rawInfoCount: cycleLogData.rawInfoCount,
				relevantInfoCount: cycleLogData.relevantInfoCount,
				relevantInfoSample: cycleLogData.relevantInfoSample,
				actionPlan: cycleLogData.actionPlan,
				actionResult: cycleLogData.actionResult,
				relevanceJudgments: cycleLogData.relevanceJudgments
			});

			// Step 8: Calculate next delay and schedule
			this.loopState.status = "waiting";
			this.loopState.lastCycleAt = Date.now();

			// Update goal's cycle count and last cycle time
			const currentCycleCount = goal.cycleCount || 0;
			await this.goalManager.updateGoal(goal.id, {
				cycleCount: currentCycleCount + 1,
				lastCycleAt: Date.now()
			});

			this.saveLoopState();
			const nextDelay = this.calculateNextDelay(goal);
			this.scheduleNextCycle(nextDelay);
		} catch (error) {
			this.loopState.errors.push({
				module: "background-loop",
				message: String(error),
				timestamp: Date.now(),
				recoverable: true,
			});
			this.saveLoopState();

			// Exponential backoff on error, max 10 min
			const errorCount = this.loopState.errors.filter(
				(e) => Date.now() - e.timestamp < 60_000,
			).length;
			const backoff = Math.min(10 * 60_000, 30_000 * Math.pow(2, errorCount));
			this.scheduleNextCycle(backoff);
		}
	}

	/**
	 * Calculate delay before next cycle based on goal state
	 */
	private calculateNextDelay(goal: GoalNode): number {
		// Use custom interval if set
		if (this.loopState.customInterval !== null && this.loopState.customInterval !== undefined) {
			return this.loopState.customInterval;
		}

		// Automatic interval calculation
		const dimensions = this.goalManager.getDimensions(goal.id);
		const hasUrgent = dimensions.some(
			(d) => d.timeliness === "urgent" && d.status !== "explored",
		);
		const allExplored = dimensions.every((d) => d.status === "explored");

		if (hasUrgent) return 10_000; // 10 seconds
		if (allExplored) return 5 * 60_000; // 5 minutes
		return 30_000; // 30 seconds
	}

	// ── Persistence Methods ──

	/**
	 * Ensure the state directory exists
	 */
	private ensureDir(): void {
		if (!existsSync(this.dataDir)) {
			mkdirSync(this.dataDir, { recursive: true });
		}
	}

	/**
	 * Load loop state from disk
	 */
	private loadLoopState(): LoopState {
		// Try to load existing state
		if (existsSync(this.stateFilePath)) {
			try {
				const content = readFileSync(this.stateFilePath, "utf-8");
				const savedState = JSON.parse(content) as LoopState;

				// Check if there are active goals
				const activeGoals = this.goalManager.getActiveGoals();
				const hasActiveGoals = activeGoals.length > 0;

				// Restore state with intelligent defaults
				return {
					...savedState,
					// If there are active goals, status should be "waiting" (not idle)
					// "idle" should only be set when explicitly stopped or no goals
					status: hasActiveGoals && savedState.status !== "stopped" ? "waiting" : "idle",
					// Clear current execution state (we don't want to resume mid-cycle)
					currentGoalId: null,
					currentDimensionId: null,
					currentActionPlanId: null,
					// Preserve cycle count and last cycle time
					cycleCount: savedState.cycleCount || 0,
					lastCycleAt: savedState.lastCycleAt || null,
					nextCycleDelay: savedState.nextCycleDelay || null,
					// Clean old errors (keep only recent ones from last hour)
					errors: (savedState.errors || []).filter(
						(e) => Date.now() - e.timestamp < 60 * 60 * 1000
					),
					// Ensure notification config has defaults (for backward compatibility)
					notificationConfig: savedState.notificationConfig || {
						enableDiscoveryNotification: true,
						strongRelevanceThreshold: 2,
						totalRelevantThreshold: 5,
						enableDeliveryNotification: true,
						deliveryMinOutputLength: 100,
					},
					// Ensure idleDetector config has defaults (for backward compatibility)
					idleDetectorConfig: savedState.idleDetectorConfig || {
						idleThreshold: 5 * 60 * 1000, // 5 minutes default
						urgentThreshold: 60 * 1000, // 1 minute default
						checkInterval: 30 * 1000, // 30 seconds default
					},
				};
			} catch (error) {
				// If load fails, start with fresh state
				return this.getInitialState();
			}
		}

		// No saved state, start fresh
		return this.getInitialState();
	}

	/**
	 * Get initial state when no saved state exists
	 */
	private getInitialState(): LoopState {
		const activeGoals = this.goalManager.getActiveGoals();

		return {
			status: activeGoals.length > 0 ? "waiting" : "idle",
			currentGoalId: null,
			currentDimensionId: null,
			currentActionPlanId: null,
			lastCycleAt: null,
			nextCycleDelay: null,
			cycleCount: 0,
			errors: [],
			notificationConfig: {
				enableDiscoveryNotification: true,
				strongRelevanceThreshold: 2,
				totalRelevantThreshold: 5,
				enableDeliveryNotification: true,
				deliveryMinOutputLength: 100,
			},
			idleDetectorConfig: {
				idleThreshold: 5 * 60 * 1000, // 5 minutes default
				urgentThreshold: 60 * 1000, // 1 minute default
				checkInterval: 30 * 1000, // 30 seconds default
			},
		};
	}

	/**
	 * Save loop state to disk
	 */
	private saveLoopState(): void {
		try {
			writeFileSync(this.stateFilePath, JSON.stringify(this.loopState, null, 2), "utf-8");
		} catch (error) {
			// Silently fail - state persistence is not critical
		}
	}
}
