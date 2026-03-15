/**
 * Goal-Driven Agent Extension — Entry Point
 *
 * Integrates the goal-driven agent into the pi coding-agent via the Extension API.
 *
 * Registers:
 * - /goal command (add, list, status, tree, knowledge, stop)
 * - Event listeners for idle detection (input, agent_start, agent_end)
 * - Model sync on model_select event
 * - Notification delivery on idle
 * - Custom message renderer for goal notifications
 *
 * Key design choices (from implementation review):
 * - Uses pi.on("input") instead of non-existent "user_input" event
 * - Uses pi.on("model_select") instead of "model_change"
 * - Uses pi.sendMessage() for notification output (not direct TUI access)
 * - Uses pi.registerMessageRenderer() for custom notification rendering
 */

import { join } from "node:path";
import type { ExtensionAPI, ExtensionFactory } from "../extensions/types.js";
import { getAgentDir } from "../../config.js";
import { BackgroundAgentLoop, type BackgroundLoopDeps } from "./background-loop/background-agent-loop.js";
import { GoalManager } from "./goal-manager/goal-manager.js";
import { KnowledgeStore } from "./knowledge/knowledge-store.js";
import { NotificationQueue } from "./output-layer/notification-queue.js";
import { IdleDetector } from "./output-layer/idle-detector.js";
import { sleep } from "./utils.js";

const goalDrivenExtension: ExtensionFactory = (pi: ExtensionAPI) => {
	// ── Data directory ──
	const dataDir = join(getAgentDir(), "goal-driven");

	// ── Deferred init, started on first /goal add ──
	let backgroundLoop: BackgroundAgentLoop | null = null;
	let idleDetector: IdleDetector | null = null;

	// ── Helper function to initialize background loop ──
	async function initializeBackgroundLoop(ctx?: import("../../extensions/types.js").ExtensionCommandContext): Promise<void> {
		if (backgroundLoop) return; // Already initialized

		// Try to get model from context if available
		let currentModel: import("@mariozechner/pi-ai").Model<any> | undefined;
		let modelRegistry: import("../model-registry.js").ModelRegistry;

		if (ctx && ctx.model) {
			// Use model from command context
			currentModel = ctx.model;
			modelRegistry = ctx.modelRegistry;
		} else {
			// Try to get from settings (for auto-load on startup)
			const { SettingsManager } = await import("../settings-manager.js");
			const { getAgentDir } = await import("../../config.js");
			const { ModelRegistry } = await import("../model-registry.js");
			const { AuthStorage } = await import("../auth-storage.js");

			const agentDir = getAgentDir();
			const settingsManager = SettingsManager.create(process.cwd(), agentDir);
			modelRegistry = new ModelRegistry(AuthStorage.create(), agentDir + "/models.json");

			// Try to get default model from settings
			const defaultProvider = settingsManager.getDefaultProvider();
			const defaultModelId = settingsManager.getDefaultModel();

			if (defaultProvider && defaultModelId) {
				currentModel = modelRegistry.find(defaultProvider, defaultModelId);
			}
		}

		if (!currentModel) {
			throw new Error("No model selected. Please use /model to select a model first.");
		}

		const deps: BackgroundLoopDeps = {
			modelRegistry: modelRegistry,
			currentModel: currentModel,
			dataDir,
		};

		const knowledgeStore = new KnowledgeStore(dataDir);
		const notificationQueue = new NotificationQueue();
		const llmChannel = new (await import("./background-loop/llm-channel.js")).BackgroundLLMChannel(modelRegistry);
		llmChannel.syncModel(currentModel);

		// Progress callback for goal creation
		const onProgress = (message: string, type?: "info" | "success" | "warning") => {
			if (ctx) {
				ctx.ui.notify(message, type || "info");
			} else {
				console.log(`[GoalManager] ${message}`);
			}
		};

		const goalManager = new GoalManager(dataDir, llmChannel, pi, onProgress);

		backgroundLoop = new BackgroundAgentLoop(deps, goalManager, knowledgeStore, notificationQueue, pi);

		// Start idle detector with saved config
		if (!idleDetector) {
			// Load saved idle detector config from loop state
			const loopState = backgroundLoop.getLoopState();
			const savedConfig = loopState.idleDetectorConfig;

			idleDetector = new IdleDetector(savedConfig || {});
			idleDetector.start(() => {
				deliverPendingNotifications(pi);
			});
		}
	}

	// ── Notification renderer registration ──
	pi.registerMessageRenderer<{ notification: import("./types.js").Notification }>(
		"goal_notification",
		(message, _options, theme) => {
			// Rendering is handled by pi-tui's default markdown renderer
			// via the CustomMessage display field. We return undefined
			// to use the default renderer.
			return undefined;
		},
	);

	// ── /goal command ──
	pi.registerCommand("goal", {
		description: "Manage goal-driven agent (add/list/status/tree/logs/knowledge/stop/notify-config)",
		async handler(args, ctx) {
			const parts = args.trim().split(/\s+/);
			const subcommand = parts[0] ?? "";
			const rest = parts.slice(1).join(" ");

			// Ensure background loop is initialized before any command (except add which handles it separately)
			if (subcommand !== "add" && subcommand !== "") {
				try {
					await initializeBackgroundLoop(ctx);
				} catch (error) {
					const errorMsg = String(error);
					if (errorMsg.includes("No model selected")) {
						ctx.ui.notify("请先使用 /model 选择一个模型", "warning");
					} else {
						ctx.ui.notify(`请先使用 /goal add 创建一个目标 (${errorMsg})`, "warning");
					}
					return;
				}
			}

			switch (subcommand) {
				case "add": {
					if (!rest) {
						ctx.ui.notify("用法: /goal add <目标描述>", "warning");
						return;
					}

					ctx.ui.notify("⏳ 正在创建目标...", "info");

					// Ensure background loop is initialized, passing ctx for model access
					try {
						await initializeBackgroundLoop(ctx);
					} catch (error) {
						ctx.ui.notify(`❌ 初始化失败: ${String(error)}`, "error");
						return;
					}

					try {
						// Step 1: Create goal node (progress will be shown automatically)
						const goal = await backgroundLoop!.goalManager.createGoal({
							title: rest,
							description: rest,
							authorizationDepth: "full_auto",
						});

						// Step 2: Get results and show summary
						const dims = backgroundLoop!.goalManager.getDimensions(goal.id);
						const sources = backgroundLoop!.goalManager.getDataSources(goal.id) || [];
						const dimCount = countDimensions(dims);
						const sourceCount = dims.reduce(
							(sum, d) => sum + d.dataSources.length + countChildSources(d),
							0,
						);

						const treeText = formatDimensionTree(dims, sources, 0, { value: 0 });

						// Build complete goal summary with LLM output
						let summaryText = `✅ 目标已创建并开始后台追踪:\n\n`;
						summaryText += `📌 **${goal.title}**\n\n`;

						// Add goal understanding if available
						if (goal.goal_understanding) {
							summaryText += `🎯 目标理解:\n   ${goal.goal_understanding}\n\n`;
						}

						// Add completion vision if available
						if (goal.completion_vision) {
							summaryText += `🏆 完成愿景:\n   ${goal.completion_vision}\n\n`;
						}

						summaryText += `📊 已拆解 ${dimCount} 个维度，发现 ${sourceCount} 个信息源\n\n`;
						summaryText += `目标拆解:\n${treeText}\n\n`;
						summaryText += `🔄 后台循环已启动`;

						ctx.ui.notify(summaryText, "info");

						// Start the background loop
						await backgroundLoop!.start();
					} catch (error) {
						ctx.ui.notify(`❌ 创建目标失败: ${String(error)}`, "error");
					}
					return;
				}

				case "list": {
					// Parse out flags like --detail
					const hasDetail = parts.includes("--detail");
					const cleanArgs = parts.filter(p => p !== "--detail").slice(1);
					const goalId = cleanArgs.join(" ").trim();

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop();
						} catch (error) {
							ctx.ui.notify("暂无目标。使用 /goal add <描述> 创建目标。", "info");
							return;
						}
					}

					if (goalId) {
						// Show specific goal
						const goal = backgroundLoop!.goalManager.getGoal(goalId);
						if (!goal) {
							ctx.ui.notify(`未找到目标 ID: ${goalId}`, "warning");
							return;
						}
						const dims = backgroundLoop!.goalManager.getDimensions(goalId);
						const sources = backgroundLoop!.goalManager.getDataSources(goalId) || [];
						const treeText = formatDimensionTree(dims, sources, 0, { value: 0 });
						
						let output = `🎯 目标: **${goal.title}** (${goal.status})\n\n`;
						if (goal.cycleCount !== undefined) {
							output += `🔄 已完成 ${goal.cycleCount} 个周期\n`;
						}
						output += `维度树及信息源:\n${treeText}`;

						if (hasDetail) {
							const logs = backgroundLoop!.goalManager.getCycleLogs(goalId);
							output += `\n\n🔄 周期执行记录 (${logs.length}):\n`;
							if (logs.length === 0) {
								output += "  暂无记录";
							} else {
								// Show last 10 logs with detailed formatting
								const recentLogs = logs.slice(-10);
								output += recentLogs.map(l => {
									const timeStr = new Date(l.timestamp).toLocaleTimeString();
									const dimInfo = l.dimensionTitle ? ` [${l.dimensionTitle}]` : "";
									let logEntry = `  [C${l.cycleNumber}] ${timeStr}${dimInfo}\n`;

									// Show detailed breakdown if available
									if (l.relevanceJudgments) {
										const j = l.relevanceJudgments;
										logEntry += `     📊 信息: ${l.rawInfoCount || 0} 采集 → ${l.relevantInfoCount || 0} 相关`;
										logEntry += ` (强:${j.relevant} 弱:${j.weak} 无:${j.irrelevant})\n`;
									}

									if (l.actionPlan) {
										logEntry += `     🤔 计划: ${l.actionPlan.split('\n')[0]}\n`;
									}

									if (l.actionResult) {
										logEntry += `     ⚡ 结果: ${l.actionResult}\n`;
									}

									// Show summary details
									logEntry += `     📝 ${l.details.split('\n')[0]}`;

									return logEntry;
								}).join("\n");
							}
						}

						ctx.ui.notify(output, "info");
						return;
					}

					// Show all goals
					const goals = backgroundLoop!.goalManager.getAllGoals();
					if (goals.length === 0) {
						ctx.ui.notify("暂无目标。使用 /goal add <描述> 创建目标。", "info");
						return;
					}

					const statusIcons: Record<string, string> = {
						active: "🟢",
						paused: "⏸️",
						completed: "✅",
						abandoned: "❌",
					};

					const lines = goals.map(
						(g) => {
							const cycleInfo = g.cycleCount !== undefined ? ` — ${g.cycleCount} 周期` : "";
							return `${statusIcons[g.status] ?? "❓"} [${g.id}] ${g.title} (${g.status})${cycleInfo}`;
						},
					);
					ctx.ui.notify("📋 目标列表 (使用 /goal list <ID> 查看详细维度):\n" + lines.join("\n"), "info");
					return;
				}

				case "status": {
					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop(ctx);
						} catch (error) {
							ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
							return;
						}
					}
					const state = backgroundLoop!.getLoopState();
					const goals = backgroundLoop!.goalManager.getActiveGoals();
					const knowledgeCount = backgroundLoop!.knowledgeStore.count();
					const pendingNotifs = backgroundLoop!.notificationQueue.pendingCount;

					// Format last cycle time
					let lastCycleTime = "从未运行";
					if (state.lastCycleAt) {
						const now = Date.now();
						const diffMs = now - state.lastCycleAt;
						const diffMins = Math.floor(diffMs / 60000);
						const timeStr = new Date(state.lastCycleAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
						if (diffMins < 1) {
							lastCycleTime = `${timeStr} (刚刚)`;
						} else if (diffMins < 60) {
							lastCycleTime = `${timeStr} (${diffMins} 分钟前)`;
						} else {
							const hours = Math.floor(diffMins / 60);
							lastCycleTime = `${timeStr} (${hours} 小时前)`;
						}
					}

					// Format cycle interval
					let cycleInterval = "自动 (10-30秒-5分钟)";
					const customInterval = backgroundLoop!.getCustomInterval();
					if (customInterval !== null) {
						const seconds = Math.round(customInterval / 1000);
						if (seconds < 60) {
							cycleInterval = `${seconds} 秒 (自定义)`;
						} else {
							const mins = Math.floor(seconds / 60);
							cycleInterval = `${mins} 分钟 (自定义)`;
						}
					}

					// Format idle threshold config
					let idleThresholdConfig = "未设置";
					if (idleDetector) {
						const config = idleDetector.getConfig();
						const idleSeconds = Math.round(config.idleThreshold / 1000);
						const urgentSeconds = Math.round(config.urgentThreshold / 1000);
						idleThresholdConfig = `${idleSeconds}秒 (紧急: ${urgentSeconds}秒)`;
					}

					ctx.ui.notify(
						`📊 后台状态:\n` +
							`  循环状态: ${state.status}\n` +
							`  已运行 ${state.cycleCount} 个周期\n` +
							`  上次运行: ${lastCycleTime}\n` +
							`  循环间隔: ${cycleInterval}\n` +
							`  空闲通知阈值: ${idleThresholdConfig}\n` +
							`  活跃目标: ${goals.length} 个\n` +
							`  知识积累: ${knowledgeCount} 条\n` +
							`  待推送通知: ${pendingNotifs} 条\n` +
							`  最近错误: ${state.errors.length} 个`,
						"info",
					);
					return;
				}

				case "tree": {
					const goalId = rest.trim();
					if (!goalId) {
						ctx.ui.notify("用法: /goal tree <目标ID>", "warning");
						return;
					}

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop();
						} catch (error) {
							ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
							return;
						}
					}

					const dims = backgroundLoop!.goalManager.getDimensions(goalId);
					if (dims.length === 0) {
						ctx.ui.notify("未找到目标或无维度。", "warning");
						return;
					}
					const sources = backgroundLoop!.goalManager.getDataSources(goalId) || [];
					const treeText = formatDimensionTree(dims, sources, 0, { value: 0 });
					ctx.ui.notify(`维度树:\n${treeText}`, "info");
					return;
				}

				case "logs": {
					// Usage: /goal logs <goalID> [--cycle N] [--all]
					const parts = rest.trim().split(/\s+/);
					const goalId = parts[0];

					if (!goalId) {
						ctx.ui.notify("用法: /goal logs <目标ID> [--cycle N] [--all]", "warning");
						return;
					}

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop();
						} catch (error) {
							ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
							return;
						}
					}

					const goal = backgroundLoop!.goalManager.getGoal(goalId);
					if (!goal) {
						ctx.ui.notify(`未找到目标: ${goalId}`, "warning");
						return;
					}

					const logs = backgroundLoop!.goalManager.getCycleLogs(goalId);
					if (logs.length === 0) {
						ctx.ui.notify("该目标暂无周期执行记录。", "info");
						return;
					}

					// Parse flags
					const cycleIndex = parts.indexOf("--cycle");
					const showAll = parts.includes("--all");

					// Filter logs
					let selectedLogs = logs;
					if (cycleIndex !== -1 && parts[cycleIndex + 1]) {
						const cycleNum = parseInt(parts[cycleIndex + 1], 10);
						const log = logs.find(l => l.cycleNumber === cycleNum);
						if (!log) {
							ctx.ui.notify(`未找到周期 ${cycleNum} 的记录`, "warning");
							return;
						}
						selectedLogs = [log];
					} else if (!showAll) {
						// Show last 10 by default
						selectedLogs = logs.slice(-10);
					}

					// Format output
					let output = `🎯 目标: **${goal.title}**\n`;
					output += `🔄 周期执行记录 (${selectedLogs.length}${showAll ? '' : ` / 共 ${logs.length}`})\n\n`;

					output += selectedLogs.map(l => {
						const timeStr = new Date(l.timestamp).toLocaleString();
						let logEntry = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
						logEntry += `📅 周期 #${l.cycleNumber} - ${timeStr}\n`;
						if (l.dimensionTitle) {
							logEntry += `🎯 维度: ${l.dimensionTitle}\n`;
						}
						logEntry += `\n`;

						// Information collection breakdown
						if (l.relevanceJudgments) {
							const j = l.relevanceJudgments;
							logEntry += `📊 信息采集:\n`;
							logEntry += `   采集总数: ${l.rawInfoCount || 0} 条\n`;
							logEntry += `   相关信息: ${l.relevantInfoCount || 0} 条\n`;
							logEntry += `   └─ 强相关: ${j.relevant} | 弱相关: ${j.weak} | 不相关: ${j.irrelevant}\n`;
							logEntry += `\n`;

							// Show sample of relevant info
							if (l.relevantInfoSample && l.relevantInfoSample.length > 0) {
								logEntry += `📌 相关信息样本:\n`;
								l.relevantInfoSample.forEach((sample, idx) => {
									logEntry += `   ${idx + 1}. ${sample}\n`;
								});
								logEntry += `\n`;
							}
						}

						// Action plan
						if (l.actionPlan) {
							logEntry += `🤔 行动计划:\n`;
							l.actionPlan.split('\n').forEach(line => {
								logEntry += `   ${line}\n`;
							});
							logEntry += `\n`;
						}

						// Action result
						if (l.actionResult) {
							logEntry += `⚡ 执行结果:\n`;
							logEntry += `   ${l.actionResult}\n`;
							logEntry += `\n`;
						}

						// Full details
						logEntry += `📝 详细记录:\n`;
						l.details.split('\n').forEach(line => {
							logEntry += `   ${line}\n`;
						});

						return logEntry;
					}).join("\n");

					ctx.ui.notify(output, "info");
					return;
				}

				case "knowledge": {
					// Parse flags and arguments
					const parts = rest.trim().split(/\s+/);
					const showAll = parts.includes("--all");
					const clearAll = parts.includes("--clear");
					const goalIndex = parts.indexOf("--goal");

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop();
						} catch (error) {
							ctx.ui.notify("暂无知识积累。", "info");
							return;
						}
					}

					// Handle --clear flag
					if (clearAll) {
						// Confirm before clearing
						// Note: In a real implementation, you might want to add a confirmation step
						backgroundLoop!.knowledgeStore.clear();
						ctx.ui.notify("🗑️ 知识库已清空", "info");
						return;
					}

					let entries: import("./types.js").KnowledgeEntry[] = [];

					// Handle --goal flag
					if (goalIndex !== -1 && parts[goalIndex + 1]) {
						const goalId = parts[goalIndex + 1];
						entries = backgroundLoop!.knowledgeStore.getByGoal(goalId);
						if (entries.length === 0) {
							ctx.ui.notify(`未找到与目标 "${goalId}" 相关的知识。`, "info");
							return;
						}
					}
					// Handle --all flag
					else if (showAll) {
						entries = backgroundLoop!.knowledgeStore.getAll();
						if (entries.length === 0) {
							ctx.ui.notify("知识库为空。", "info");
							return;
						}
					}
					// Handle search query (default behavior)
					else {
						const query = rest.trim()
							.replace("--all", "")
							.replace("--clear", "")
							.replace(/--goal\s+\S+/, "")
							.trim();

						entries = backgroundLoop!.knowledgeStore.search(query);
						if (entries.length === 0) {
							ctx.ui.notify(query ? "未找到相关知识。" : "知识库为空。", "info");
							return;
						}
					}

					// Format and display entries
					const lines = entries.map((e, idx) => {
						const preview = e.content.slice(0, 120);
						const ellipsis = e.content.length > 120 ? "..." : "";
						const goalInfo = e.relatedGoalIds.length > 0 ? ` [目标: ${e.relatedGoalIds[0].slice(0, 8)}]` : "";
						return `${idx + 1}. [${e.status}]${goalInfo} ${preview}${ellipsis}`;
					});
					ctx.ui.notify(`📚 知识条目 (${entries.length}):\n${lines.join("\n")}`, "info");
					return;
				}

				case "stop": {
					if (!backgroundLoop) {
						ctx.ui.notify("后台循环未运行。", "info");
						return;
					}
					await backgroundLoop.stop();
					idleDetector?.stop();
					ctx.ui.notify("⏹️ 后台循环已停止。使用 /goal resume 可恢复。", "info");
					return;
				}

				case "resume": {
					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop(ctx);
						} catch (error) {
							ctx.ui.notify(`❌ 初始化失败: ${String(error)}`, "error");
							return;
						}
					}

					// Check if already running
					if (backgroundLoop!.isRunning()) {
						ctx.ui.notify("后台循环已在运行中。", "info");
						return;
					}

					// Check if there are active goals
					const activeGoals = backgroundLoop!.goalManager.getActiveGoals();
					if (activeGoals.length === 0) {
						ctx.ui.notify("没有活跃的目标。请先使用 /goal add 创建目标。", "warning");
						return;
					}

					// Restart idle detector if needed
					if (!idleDetector) {
						// Load saved idle detector config from loop state
						const loopState = backgroundLoop!.getLoopState();
						const savedConfig = loopState.idleDetectorConfig;

						idleDetector = new IdleDetector(savedConfig || {});
						idleDetector.start(() => {
							deliverPendingNotifications(pi);
						});
					} else {
						idleDetector.start(() => {
							deliverPendingNotifications(pi);
						});
					}

					// Start background loop
					await backgroundLoop!.start();
					ctx.ui.notify(`▶️ 后台循环已恢复，正在追踪 ${activeGoals.length} 个目标`, "info");
					return;
				}

				case "config": {
					if (!idleDetector) {
						ctx.ui.notify("后台循环未启动，请先使用 /goal add 创建目标。", "warning");
						return;
					}

					const seconds = parseInt(rest.trim(), 10);
					if (isNaN(seconds) || seconds <= 0) {
						ctx.ui.notify("用法: /goal config <空闲秒数>\n例如: /goal config 10 （表示空闲 10 秒后就推送通知）", "warning");
						return;
					}

					const idleThreshold = seconds * 1000;
					const checkInterval = Math.min(5000, idleThreshold);

					// Update idle detector in memory
					idleDetector.setConfig({
						idleThreshold,
						checkInterval
					});

					// Persist to loop state
					backgroundLoop!.updateIdleDetectorConfig({
						idleThreshold,
						checkInterval
					});

					ctx.ui.notify(`✅ 通知空闲阈值已修改为 ${seconds} 秒，并已保存。`, "info");
					return;
				}

				case "interval": {
					// Usage: /goal interval [seconds | auto]
					if (!backgroundLoop) {
						ctx.ui.notify("后台循环未启动，请先创建一个目标。", "warning");
						return;
					}

					const value = rest.trim().toLowerCase();

					if (value === "" || value === "auto") {
						// Reset to automatic mode
						backgroundLoop.setCustomInterval(null);
						ctx.ui.notify("✅ 循环间隔已设置为自动模式（根据目标状态动态调整）", "info");
						return;
					}

					const seconds = parseInt(value, 10);
					if (isNaN(seconds) || seconds <= 0) {
						ctx.ui.notify("用法: /goal interval <秒数> | auto\n例如: /goal interval 60 （每60秒循环一次）\n      /goal interval auto  （自动调整间隔）", "warning");
						return;
					}

					const intervalMs = seconds * 1000;
					backgroundLoop.setCustomInterval(intervalMs);

					const timeStr = seconds < 60 ? `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
					ctx.ui.notify(`✅ 循环间隔已设置为 ${timeStr}，并已保存。`, "info");
					return;
				}

				case "clear": {
					// Usage: /goal clear [--confirm]
					const forceConfirm = parts.includes("--confirm");

					if (!forceConfirm) {
						ctx.ui.notify("⚠️ 警告：此操作将删除所有目标及相关数据！\n请确认: /goal clear --confirm", "warning");
						return;
					}

					try {
						await initializeBackgroundLoop(ctx);
					} catch {
						ctx.ui.notify("暂无目标可清空。", "info");
						return;
					}

					// Stop background loop
					if (backgroundLoop) {
						await backgroundLoop.stop();
					}

					// Clear all goals
					const count = await backgroundLoop!.goalManager.clearAllGoals();

					// Clear knowledge store
					backgroundLoop!.knowledgeStore.clear();

					// Reset idle detector (optional, keeps config)
					// idleDetector is not cleared to preserve user settings

					ctx.ui.notify(`🗑️ 已清空 ${count} 个目标及所有相关数据。`, "info");
					return;
				}

				case "notify-config": {
					// Usage: /goal notify-config [--show|--set <key> <value>]
					await initializeBackgroundLoop(ctx);

					const parts = rest.trim().split(/\s+/);
					const action = parts[0];

					if (action === "--show" || parts.length === 0) {
						// Show current notification config
						const config = backgroundLoop!.getLoopState().notificationConfig;
						let output = "🔔 当前通知配置:\n\n";
						output += `1. 重要发现通知: ${config.enableDiscoveryNotification ? "✅ 启用" : "❌ 禁用"}\n`;
						output += `   - 强相关阈值: ${config.strongRelevanceThreshold} 条\n`;
						output += `   - 总相关阈值: ${config.totalRelevantThreshold} 条\n\n`;
						output += `2. 交付物通知: ${config.enableDeliveryNotification ? "✅ 启用" : "❌ 禁用"}\n`;
						output += `   - 最小输出长度: ${config.deliveryMinOutputLength} 字符\n\n`;
						output += `💡 提示: 使用 /goal notify-config --set <key> <value> 修改配置`;
						ctx.ui.notify(output, "info");
						return;
					}

					if (action === "--set") {
						if (parts.length < 3) {
							ctx.ui.notify("用法: /goal notify-config --set <key> <value>\n\n可用配置项:\n- discovery_enabled <true|false>\n- strong_threshold <数字>\n- total_threshold <数字>\n- delivery_enabled <true|false>\n- min_output_length <数字>", "warning");
							return;
						}

						const key = parts[1];
						const value = parts[2];

						// Map key to config property
						const configMap: Record<string, keyof import("./types.js").NotificationConfig> = {
							"discovery_enabled": "enableDiscoveryNotification",
							"strong_threshold": "strongRelevanceThreshold",
							"total_threshold": "totalRelevantThreshold",
							"delivery_enabled": "enableDeliveryNotification",
							"min_output_length": "deliveryMinOutputLength"
						};

						const configKey = configMap[key];
						if (!configKey) {
							ctx.ui.notify(`❌ 未知配置项: ${key}\n\n可用配置项:\n- discovery_enabled <true|false>\n- strong_threshold <数字>\n- total_threshold <数字>\n- delivery_enabled <true|false>\n- min_output_length <数字>`, "warning");
							return;
						}

						// Parse value based on key
						let parsedValue: boolean | number;
						if (key.includes("enabled")) {
							parsedValue = value === "true";
						} else {
							parsedValue = parseInt(value, 10);
							if (isNaN(parsedValue)) {
								ctx.ui.notify(`❌ 无效的数值: ${value}`, "warning");
								return;
							}
						}

						// Update config
						backgroundLoop!.updateNotificationConfig({
							[configKey]: parsedValue
						});

						ctx.ui.notify(`✅ 已更新通知配置: ${key} = ${value}`, "info");
						return;
					}

					ctx.ui.notify("用法: /goal notify-config [--show|--set <key> <value>]", "warning");
					return;
				}

				case "complete": {
					const goalId = rest.trim();
					if (!goalId) {
						ctx.ui.notify("用法: /goal complete <目标ID>\n例如: /goal complete goal-abc123", "warning");
						return;
					}

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop(ctx);
						} catch (error) {
							ctx.ui.notify("后台循环未启动。", "warning");
							return;
						}
					}

					const goal = backgroundLoop!.goalManager.getGoal(goalId);
					if (!goal) {
						ctx.ui.notify(`未找到目标 ID: ${goalId}`, "warning");
						return;
					}

					// Update goal status to completed
					await backgroundLoop!.goalManager.updateGoalStatus(goalId, "completed");
					ctx.ui.notify(`✅ 目标已完成: ${goal.title}`, "info");
					return;
				}

				case "abandon": {
					const goalId = rest.trim();
					if (!goalId) {
						ctx.ui.notify("用法: /goal abandon <目标ID>\n例如: /goal abandon goal-abc123", "warning");
						return;
					}

					// Try to load existing goals if backgroundLoop not initialized
					if (!backgroundLoop) {
						try {
							await initializeBackgroundLoop(ctx);
						} catch (error) {
							ctx.ui.notify("后台循环未启动。", "warning");
							return;
						}
					}

					const goal = backgroundLoop!.goalManager.getGoal(goalId);
					if (!goal) {
						ctx.ui.notify(`未找到目标 ID: ${goalId}`, "warning");
						return;
					}

					// Update goal status to abandoned
					await backgroundLoop!.goalManager.updateGoalStatus(goalId, "abandoned");
					ctx.ui.notify(`❌ 目标已放弃: ${goal.title}`, "info");
					return;
				}

				default: {
					ctx.ui.notify(
						"Goal-Driven Agent 命令:\n" +
							"  /goal add <描述>      — 创建新目标\n" +
							"  /goal list            — 列出所有目标\n" +
							"  /goal list <ID>       — 查看目标详细\n" +
							"  /goal status          — 后台状态\n" +
							"  /goal tree <ID>       — 查看维度树\n" +
							"  /goal logs <ID>       — 查看周期执行记录\n" +
							"  /goal logs <ID> --cycle N — 查看特定周期\n" +
							"  /goal logs <ID> --all — 查看全部周期\n" +
							"  /goal knowledge [查询] — 搜索知识库\n" +
							"  /goal knowledge --all   — 查看全部知识\n" +
							"  /goal knowledge --goal <ID> — 查看特定目标的知识\n" +
							"  /goal knowledge --clear — 清空知识库\n" +
							"  /goal complete <ID>   — 完成目标\n" +
							"  /goal abandon <ID>    — 放弃目标\n" +
							"  /goal stop            — 停止后台循环\n" +
							"  /goal resume          — 恢复后台循环 ✨\n" +
							"  /goal config <秒数>   — 设置空闲通知阈值\n" +
							"  /goal interval <秒数>|auto — 设置循环间隔\n" +
							"  /goal clear --confirm — 清空所有目标\n" +
							"  /goal notify-config --show — 查看通知配置\n" +
							"  /goal notify-config --set <key> <value> — 修改通知配置",
						"info",
					);
					return;
				}
			}
		},
	});

	// ── Event listeners for idle detection ──
	pi.on("input", (_event, _ctx) => {
		idleDetector?.recordActivity();
	});

	pi.on("agent_start", (_event, _ctx) => {
		idleDetector?.setAgentBusy(true);
	});

	pi.on("agent_end", (_event, _ctx) => {
		idleDetector?.setAgentBusy(false);
	});

	// ── Model sync ──
	pi.on("model_select", (event, _ctx) => {
		backgroundLoop?.onModelChange(event.model);
	});

	// ── Cleanup on shutdown ──
	pi.on("session_shutdown", async (_event, _ctx) => {
		await backgroundLoop?.stop();
		idleDetector?.stop();
	});

	// ── Notification delivery ──
	async function deliverPendingNotifications(pi: ExtensionAPI) {
		if (!backgroundLoop) return;

		const hasUrgent = backgroundLoop.notificationQueue.hasUrgent();
		if (!idleDetector?.isIdle(hasUrgent)) return;

		while (backgroundLoop.notificationQueue.pendingCount > 0) {
			const notification = backgroundLoop.notificationQueue.dequeue();
			if (!notification) break;

			// Send as custom message to the chat
			const icon = getNotificationIcon(notification.type);
			pi.sendMessage({
				customType: "goal_notification",
				content: `${icon} **${notification.title}**\n\n${notification.content}`,
				display: true,
				details: { notification },
			});

			// Wait between notifications to avoid flooding
			await sleep(2000);

			// Stop if user becomes active
			if (idleDetector && !idleDetector.isIdle()) break;
		}
	}
};

// ── Helper functions ──

function getNotificationIcon(type: string): string {
	const icons: Record<string, string> = {
		delivery: "📦",
		report: "📊",
		suggestion: "💡",
		help_request: "🆘",
		confirmation: "✅",
		progress: "⏳",
	};
	return icons[type] ?? "🔔";
}

function formatDimensionTree(
	dims: import("./types.js").DimensionNode[],
	sources: import("./types.js").DataSource[],
	indent: number,
	parentCounter = { value: 0 }
): string {
	const pad = "  ".repeat(indent);
	const sourceMap = new Map(sources.map(s => [s.id, s]));

	return dims
		.map((dim) => {
			parentCounter.value++;
			const urgency = dim.timeliness === "urgent" ? " [紧急]" : "";
			let line = `${pad}${parentCounter.value}. **${dim.title}** (v=${dim.valueScore}, d=${dim.explorationDepth}/${dim.estimated_depth}${urgency})`;

			// Show core questions if available
			if (dim.core_questions && dim.core_questions.length > 0) {
				line += `\n${pad}   问题: ${dim.core_questions[0]}`;
				if (dim.core_questions.length > 1) {
					line += `\n${pad}        ${dim.core_questions[1]}`;
				}
			}

			// Show data sources with detailed info
			if (dim.dataSources.length > 0) {
				const sourceInfos = dim.dataSources.map(s => {
					const source = sourceMap.get(s.sourceId);
					if (!source) return s.suggestedQuery || s.query;

					// Show source name and type
					let info = `${source.name}`;
					if (source.type !== 'web_search') {
						info += ` (${source.type})`;
					}
					return info;
				});
				line += `\n${pad}   [源] ${sourceInfos.join(", ")}`;
			}

			if (dim.children.length > 0) {
				line += "\n" + formatDimensionTree(dim.children, sources, indent + 1, parentCounter);
			}
			return line;
		})
		.join("\n");
}

function countDimensions(dims: import("./types.js").DimensionNode[]): number {
	let count = dims.length;
	for (const dim of dims) {
		count += countDimensions(dim.children);
	}
	return count;
}

function countChildSources(dim: import("./types.js").DimensionNode): number {
	let count = 0;
	for (const child of dim.children) {
		count += child.dataSources.length + countChildSources(child);
	}
	return count;
}

export default goalDrivenExtension;
