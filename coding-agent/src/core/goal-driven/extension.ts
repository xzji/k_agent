/**
 * Goal-Driven Agent Extension — Unified Task Scheduler Architecture
 *
 * Integrates the new unified task scheduler architecture into the coding-agent.
 *
 * Key differences from legacy architecture:
 * - Uses GoalOrchestrator for 10-phase workflow management
 * - Uses UnifiedTaskScheduler for task scheduling
 * - Supports sub-goals and hierarchical planning
 * - Value-based notification with smart assessment
 *
 * Commands:
 * - /goal add <desc>        — Create new goal with interactive info gathering
 * - /goal list              — List all goals
 * - /goal status            — Show scheduler and orchestrator status
 * - /goal stop              — Stop scheduler
 * - /goal resume            — Resume scheduler
 * - /goal complete <id>     — Mark goal as completed
 * - /goal abandon <id>      — Abandon a goal
 * - /goal clear --confirm   — Clear all data
 */

import { join } from "node:path";
import type { ExtensionAPI, ExtensionFactory } from "../extensions/types.js";
import { getAgentDir } from "../../config.js";

// New architecture imports
import {
  GoalOrchestrator,
  UnifiedTaskScheduler,
  GoalStore,
  TaskStore,
  KnowledgeStore,
  SubGoalStore,
  NotificationQueue,
  ContextGatherer,
  SuccessCriteriaChecker,
  TaskDependencyGraph,
  ValueAssessor,
  PlanPresenter,
  TaskPlanner,
  SubGoalPlanner,
  GoalDrivenLogger,
  setGlobalLogger,
  logUserInput,
  logSystemAction,
  logGoalEvent,
  logError,
  type Task,
  type Goal,
  type TaskStatus,
  type OrchestrationState,
  InfoCollectionHandler,
  PlanConfirmationHandler,
  ExecutionHandler,
  findActiveGoal,
  type HandlerResult,
} from "./index.js";

// Config imports
import {
  GoalDrivenConfigStore,
  ConfigPanel,
} from "./config/index.js";

// Coding-agent specific adapters
import {
  CodingAgentLLMChannel,
  CodingAgentExecutionPipeline,
  CodingAgentIdleDetector,
} from "./runtime/coding-agent-adapter.js";

// Background execution
import { AgentPiBackgroundExecutor } from "./runtime/agent-pi-executor.js";
import { initToolProvider } from "./runtime/tool-provider.js";

// Reuse legacy IdleDetector and NotificationQueue
import { IdleDetector } from "./output-layer/idle-detector.js";
import { sleep } from "./utils/index.js";

// Logger instance
let logger: GoalDrivenLogger | null = null;

const goalDrivenExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  // ── Data directory ──
  const dataDir = join(getAgentDir(), "goal-driven");

  // ── Core components ──
  let goalStore: GoalStore | null = null;
  let taskStore: TaskStore | null = null;
  let knowledgeStore: KnowledgeStore | null = null;
  let subGoalStore: SubGoalStore | null = null;
  let notificationQueue: NotificationQueue | null = null;
  let dependencyGraph: TaskDependencyGraph | null = null;
  let configStore: GoalDrivenConfigStore | null = null;

  // ── Orchestrator and Scheduler ──
  let orchestrator: GoalOrchestrator | null = null;
  let scheduler: UnifiedTaskScheduler | null = null;

  // ── LLM Channel ──
  let llmChannel: CodingAgentLLMChannel | null = null;

  // ── Idle Detector ──
  let idleDetector: IdleDetector | null = null;
  let codingAgentIdleDetector: CodingAgentIdleDetector | null = null;

  // ── Input handler unsubscribe ──
  let unsubscribeInputHandler: (() => void) | null = null;

  // ── Initialization state ──
  let initialized = false;

  // ── Helper function to initialize all components ──
  async function initialize(ctx?: import("../../extensions/types.js").ExtensionCommandContext): Promise<void> {
    if (initialized) return;

    // Initialize logger
    if (!logger) {
      const logDir = join(getAgentDir(), "logs");
      logger = new GoalDrivenLogger({
        logDir,
        maxDays: 7,
        consoleOutput: true,
        minLevel: 'debug',
      });
      await logger.init();
      setGlobalLogger(logger);
      await logSystemAction('Goal-Driven Agent initialization started', { dataDir });
    }

    // Try to get model from context
    let currentModel: import("@mariozechner/pi-ai").Model<any> | undefined;
    let modelRegistry: import("../model-registry.js").ModelRegistry | undefined;

    if (ctx && ctx.model) {
      currentModel = ctx.model;
      modelRegistry = ctx.modelRegistry;
    } else {
      // Try to get from settings
      const { SettingsManager } = await import("../settings-manager.js");
      const { ModelRegistry } = await import("../model-registry.js");
      const { AuthStorage } = await import("../auth-storage.js");

      const agentDir = getAgentDir();
      const settingsManager = SettingsManager.create(process.cwd(), agentDir);
      modelRegistry = new ModelRegistry(AuthStorage.create(), agentDir + "/models.json");

      const defaultProvider = settingsManager.getDefaultProvider();
      const defaultModelId = settingsManager.getDefaultModel();

      if (defaultProvider && defaultModelId) {
        currentModel = modelRegistry.find(defaultProvider, defaultModelId);
      }
    }

    if (!currentModel) {
      throw new Error("No model selected. Please use /model to select a model first.");
    }

    // Initialize stores
    goalStore = new GoalStore(dataDir);
    await goalStore.init();

    taskStore = new TaskStore(dataDir);
    await taskStore.init();

    knowledgeStore = new KnowledgeStore(dataDir);
    await knowledgeStore.init();

    subGoalStore = new SubGoalStore(dataDir);
    await subGoalStore.init();

    // Initialize config store
    configStore = new GoalDrivenConfigStore(dataDir);
    await configStore.init();

    notificationQueue = new NotificationQueue();

    // Initialize LLM Channel
    llmChannel = new CodingAgentLLMChannel(currentModel, modelRegistry);

    // Initialize Idle Detector (legacy version for compatibility)
    idleDetector = new IdleDetector({
      idleThreshold: 30000, // 30 seconds default
      checkInterval: 5000,
    });

    codingAgentIdleDetector = new CodingAgentIdleDetector(idleDetector);

    // Initialize Dependency Graph
    if (taskStore) {
      dependencyGraph = new TaskDependencyGraph(taskStore);
    }

    // Initialize planners
    const contextGatherer = new ContextGatherer(taskStore!, notificationQueue, llmChannel, configStore!);
    const successCriteriaChecker = new SuccessCriteriaChecker(
      goalStore,
      taskStore!,
      knowledgeStore,
      notificationQueue,
      llmChannel
    );

    // Initialize Execution Pipeline
    const executionPipeline = new CodingAgentExecutionPipeline(pi);

    // Initialize Value Assessor
    const valueAssessor = new ValueAssessor(
      taskStore!,
      goalStore,
      knowledgeStore,
      llmChannel
    );

    // Initialize Background Executor (optional - requires model registry)
    let backgroundExecutor: AgentPiBackgroundExecutor | undefined;
    if (modelRegistry && currentModel) {
      const { AgentPiBackgroundExecutor } = await import('./runtime/agent-pi-executor.js');
      const { DefaultResourceLoader } = await import('../resource-loader.js');
      const resourceLoader = new DefaultResourceLoader({
        cwd: process.cwd(),
        agentDir: getAgentDir(),
      });
      await resourceLoader.reload();

      // Initialize ToolProvider for getting available tools from Agent Pi
      initToolProvider(resourceLoader);
      console.log('[GoalDriven] ToolProvider initialized');

      // Get or create settings manager
      const { SettingsManager } = await import("../settings-manager.js");
      const settingsManager = SettingsManager.create(process.cwd(), getAgentDir());

      backgroundExecutor = new AgentPiBackgroundExecutor(
        pi,
        taskStore!,
        knowledgeStore,
        notificationQueue,
        goalStore!,
        modelRegistry,
        settingsManager,
        resourceLoader,
        getAgentDir(),
        {}, // Use defaults from config store
        configStore!
      );
      backgroundExecutor.initialize();
      console.log('[GoalDriven] Background executor initialized');
    }

    // Initialize Scheduler
    const userProfile = {
      userId: 'default-user',
      preferences: {
        notificationFrequency: 'immediate' as const,
      },
    };

    scheduler = new UnifiedTaskScheduler(
      taskStore!,
      goalStore,
      subGoalStore,
      knowledgeStore,
      notificationQueue,
      dependencyGraph!,
      executionPipeline,
      codingAgentIdleDetector,
      userProfile,
      valueAssessor,
      {
        enableConcurrency: true,
      },
      backgroundExecutor,  // Pass background executor
      pi.events,          // Pass EventBus
      configStore!        // Pass config store
    );

    // Initialize Orchestrator
    orchestrator = new GoalOrchestrator(
      goalStore,
      taskStore!,
      knowledgeStore,
      notificationQueue,
      contextGatherer,
      scheduler,
      successCriteriaChecker,
      llmChannel,
      codingAgentIdleDetector,
      userProfile,
      subGoalStore
    );

    await orchestrator.init();

    // Start idle detector
    idleDetector.start(() => {
      deliverPendingNotifications(pi);
    });

    // Subscribe to user input events using new handler architecture
    if (!unsubscribeInputHandler) {
      // Initialize handlers
      const infoCollectionHandler = new InfoCollectionHandler(
        orchestrator!,
        contextGatherer
      );
      const planConfirmationHandler = new PlanConfirmationHandler(orchestrator!);
      const executionHandler = new ExecutionHandler(scheduler!, taskStore!);

      unsubscribeInputHandler = pi.on("input", async (event, inputCtx) => {
        const userResponse = event.text;
        const goals = await goalStore!.getAllGoals();

        // Helper function to notify user
        const notify = (
          message: string,
          type: "info" | "warning" | "error" | "success" = "info"
        ) => {
          inputCtx.ui.notify(message, type);
        };

        // Find the active goal based on orchestration phase priority
        const activeGoal = findActiveGoal(goals, (goalId) =>
          orchestrator?.getState(goalId)
        );

        if (!activeGoal) {
          // No active goal-driven input to handle, let pi-agent process it
          return { action: "continue" as const };
        }

        const state = orchestrator!.getState(activeGoal.id);
        if (!state) {
          return { action: "continue" as const };
        }

        // Route to appropriate handler based on phase
        let result: HandlerResult;

        switch (state.phase) {
          case "collecting_info":
            notify("⏳ 正在处理您的回复...", "info");
            result = await infoCollectionHandler.handle(
              activeGoal,
              userResponse,
              {
                goalId: activeGoal.id,
                phase: "collecting_info",
                purpose: "Information gathering for goal initialization",
              }
            );
            break;

          case "presenting_plan":
            result = await planConfirmationHandler.handle(
              activeGoal,
              userResponse,
              {
                goalId: activeGoal.id,
                phase: "presenting_plan",
                purpose: "Plan confirmation or modification",
              }
            );
            break;

          case "executing":
          default:
            result = await executionHandler.handle(activeGoal, userResponse, {
              goalId: activeGoal.id,
              phase: state.phase,
              purpose: "Task execution interaction",
            });
            break;
        }

        // Handle notification if provided
        if (result.notification) {
          notify(result.notification.message, result.notification.type);
        }

        return { action: result.action };
      });
    }

    initialized = true;
    await logSystemAction('Goal-Driven Agent initialized successfully', {
      modelId: currentModel?.id,
      provider: currentModel?.provider,
    });
    console.log('[GoalDriven] Initialized successfully');
  }

  // ── Notification renderer registration ──
  pi.registerMessageRenderer<{ notification: import("./types.js").Notification }>(
    "goal_notification",
    (_message, _options, _theme) => {
      // Rendering is handled by pi-tui's default markdown renderer
      return undefined;
    },
  );

  // ── /goal command ──
  pi.registerCommand("goal", {
    description: "Manage goal-driven agent (add/config/list/status/stop/resume/complete/abandon/clear)",
    async handler(args, ctx) {
      const parts = args.trim().split(/\s+/);
      const subcommand = parts[0] ?? "";
      const rest = parts.slice(1).join(" ");

      // Initialize for all commands
      if (subcommand !== "") {
        try {
          await initialize(ctx);
        } catch (error) {
          const errorMsg = String(error);
          if (errorMsg.includes("No model selected")) {
            ctx.ui.notify("请先使用 /model 选择一个模型", "warning");
          } else {
            ctx.ui.notify(`初始化失败: ${errorMsg}`, "error");
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

          ctx.ui.notify("⏳ 正在创建目标并收集信息...", "info");
          await logUserInput(`/goal add ${rest}`, { command: 'add' });
          await logSystemAction('Starting goal creation', { description: rest });

          try {
            // Start goal with info collection
            await logSystemAction('Calling orchestrator.startGoal()');
            const result = await orchestrator!.startGoal(rest);
            await logGoalEvent('Goal created', result.goalId, { interactiveTaskId: result.interactiveTaskId });

            ctx.ui.notify(
              `✅ 目标已创建: ${result.goalId}\n` +
              `📝 请回答交互式问题以完善目标信息\n` +
              `使用 /goal status 查看状态`,
              "success"
            );

            // Start scheduler
            if (!scheduler!.isRunning()) {
              await logSystemAction('Starting scheduler', { goalId: result.goalId });
              await scheduler!.start();
              await logSystemAction('Scheduler started', { goalId: result.goalId });
            }

          } catch (error) {
            await logError(error, 'error', undefined, undefined, { command: 'add', description: rest });
            ctx.ui.notify(`❌ 创建目标失败: ${String(error)}`, "error");
          }
          return;
        }

        case "list": {
          const goals = await goalStore!.getAllGoals();

          if (goals.length === 0) {
            ctx.ui.notify("暂无目标。使用 /goal add <描述> 创建目标。", "info");
            return;
          }

          const statusIcons: Record<string, string> = {
            gathering_info: "📝",
            planning: "📋",
            active: "🟢",
            paused: "⏸️",
            completed: "✅",
          };

          const lines = goals.map((g) => {
            const progress = g.progress ? `${g.progress.percentage}%` : "N/A";
            return `${statusIcons[g.status] ?? "❓"} [${g.id.slice(0, 8)}] ${g.title} (${g.status}) - ${progress}`;
          });

          ctx.ui.notify("📋 目标列表:\n" + lines.join("\n"), "info");
          return;
        }

        case "status": {
          const goals = await goalStore!.getAllGoals();
          const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'gathering_info' || g.status === 'planning');

          let output = "📊 Goal-Driven Agent 状态\n\n";

          // Scheduler status
          const schedulerRunning = scheduler?.isRunning() ?? false;
          output += `调度器: ${schedulerRunning ? "🟢 运行中" : "⏹️ 已停止"}\n`;

          if (schedulerRunning) {
            const stats = scheduler!.getStats();
            output += `  - 完成周期: ${stats.cyclesCompleted}\n`;
            output += `  - 执行任务: ${stats.tasksExecuted}\n`;
            output += `  - 失败任务: ${stats.tasksFailed}\n`;
          }

          // Goals status
          output += `\n目标统计:\n`;
          output += `  - 总计: ${goals.length}\n`;
          output += `  - 活跃: ${activeGoals.length}\n`;

          // Show active goals with phases
          if (activeGoals.length > 0) {
            output += `\n活跃目标:\n`;
            for (const goal of activeGoals) {
              const state = orchestrator?.getState(goal.id);
              const phase = state ? formatPhase(state.phase) : 'unknown';
              output += `  - [${goal.id.slice(0, 8)}] ${goal.title}\n`;
              output += `    状态: ${goal.status} | 阶段: ${phase}\n`;
            }
          }

          // Knowledge count
          const knowledgeCount = await getKnowledgeCount();
          output += `\n知识积累: ${knowledgeCount} 条\n`;

          // Notifications
          const pendingNotifs = notificationQueue?.pendingCount ?? 0;
          output += `待推送通知: ${pendingNotifs} 条\n`;

          ctx.ui.notify(output, "info");
          return;
        }

        case "stop": {
          if (!scheduler?.isRunning()) {
            ctx.ui.notify("调度器未在运行", "info");
            return;
          }

          await scheduler!.stop();
          idleDetector?.stop();
          ctx.ui.notify("⏹️ 调度器已停止。使用 /goal resume 可恢复。", "info");
          return;
        }

        case "resume": {
          if (scheduler?.isRunning()) {
            ctx.ui.notify("调度器已在运行中", "info");
            return;
          }

          // Check for active goals
          const goals = await goalStore!.getActiveGoals();
          if (goals.length === 0) {
            ctx.ui.notify("没有活跃的目标。使用 /goal add 创建目标。", "warning");
            return;
          }

          // Restart idle detector
          idleDetector?.start(() => {
            deliverPendingNotifications(pi);
          });

          // Restart scheduler
          await scheduler!.start();

          ctx.ui.notify(`▶️ 调度器已恢复，正在追踪 ${goals.length} 个目标`, "info");
          return;
        }

        case "complete": {
          const goalId = rest.trim();
          if (!goalId) {
            ctx.ui.notify("用法: /goal complete <目标ID>", "warning");
            return;
          }

          const goal = await goalStore!.getGoal(goalId);
          if (!goal) {
            ctx.ui.notify(`未找到目标: ${goalId}`, "warning");
            return;
          }

          await goalStore!.updateGoal(goalId, {
            status: 'completed',
            completedAt: Date.now(),
          });

          ctx.ui.notify(`✅ 目标已完成: ${goal.title}`, "success");
          return;
        }

        case "abandon": {
          const goalId = rest.trim();
          if (!goalId) {
            ctx.ui.notify("用法: /goal abandon <目标ID>", "warning");
            return;
          }

          const goal = await goalStore!.getGoal(goalId);
          if (!goal) {
            ctx.ui.notify(`未找到目标: ${goalId}`, "warning");
            return;
          }

          await goalStore!.updateGoal(goalId, { status: 'paused' });

          ctx.ui.notify(`⏸️ 目标已暂停: ${goal.title}`, "info");
          return;
        }

        case "clear": {
          const forceConfirm = parts.includes("--confirm");

          if (!forceConfirm) {
            ctx.ui.notify("⚠️ 警告：此操作将删除所有目标及相关数据！\n请确认: /goal clear --confirm", "warning");
            return;
          }

          // Stop scheduler
          if (scheduler?.isRunning()) {
            await scheduler!.stop();
          }

          // Clear all data
          const goals = await goalStore!.getAllGoals();

          for (const goal of goals) {
            await goalStore!.deleteGoal(goal.id);
          }

          await taskStore!.clearAll?.() || await clearTasksManual();
          await knowledgeStore!.clearAll?.() || await clearKnowledgeManual();

          ctx.ui.notify(`🗑️ 已清空 ${goals.length} 个目标及所有相关数据。`, "info");
          return;
        }

        case "info": {
          const goalId = rest.trim();
          if (!goalId) {
            ctx.ui.notify("用法: /goal info <目标ID>", "warning");
            return;
          }

          const goal = await goalStore!.getGoal(goalId);
          if (!goal) {
            ctx.ui.notify(`未找到目标: ${goalId}`, "warning");
            return;
          }

          const state = orchestrator?.getState(goalId);
          const tasks = await taskStore!.getTasksByGoal(goalId);

          let output = `🎯 目标详情: ${goal.title}\n\n`;
          output += `ID: ${goal.id}\n`;
          output += `状态: ${goal.status}\n`;
          output += `优先级: ${goal.priority}\n`;
          output += `进度: ${goal.progress?.percentage ?? 0}%\n`;

          if (state) {
            output += `\n当前阶段: ${formatPhase(state.phase)}\n`;
            output += `子目标数: ${state.subGoalIds.length}\n`;
            output += `任务数: ${state.taskIds.length}\n`;
          }

          output += `\n任务列表 (${tasks.length}):\n`;
          for (const task of tasks.slice(0, 10)) {
            const statusIcon = getTaskStatusIcon(task.status);
            output += `  ${statusIcon} ${task.title} (${task.type})\n`;
          }
          if (tasks.length > 10) {
            output += `  ... 还有 ${tasks.length - 10} 个任务\n`;
          }

          ctx.ui.notify(output, "info");
          return;
        }

        case "config": {
          const configPanel = new ConfigPanel(configStore!);
          await configPanel.open(ctx);
          return;
        }

        case "logs": {
          const { readFile, readdir } = await import("node:fs/promises");
          const logDir = join(getAgentDir(), "logs");

          try {
            const files = await readdir(logDir);
            const logFiles = files.filter(f => f.startsWith('goal-driven-') && f.endsWith('.log'));

            if (logFiles.length === 0) {
              ctx.ui.notify("暂无日志文件", "info");
              return;
            }

            // Sort by date (newest first)
            logFiles.sort().reverse();

            // Show list if no specific date provided
            const dateArg = rest.trim();
            if (!dateArg) {
              const lines = [
                "📋 日志文件列表 (使用 /goal logs <日期> 查看):",
                ...logFiles.slice(0, 7).map(f => {
                  const date = f.replace('goal-driven-', '').replace('.log', '');
                  return `  - ${date} (/goal logs ${date})`;
                }),
              ];
              ctx.ui.notify(lines.join('\n'), "info");
              return;
            }

            // Show specific log file
            const logFile = join(logDir, `goal-driven-${dateArg}.log`);
            try {
              const content = await readFile(logFile, 'utf-8');
              const lines = content.trim().split('\n');

              // Parse and format recent entries (last 50)
              const recentEntries = lines.slice(-50).map(line => {
                try {
                  const entry = JSON.parse(line);
                  const time = entry.timestamp?.split('T')[1]?.split('.')[0] ?? '??';
                  const emoji = {
                    user_input: '👤',
                    system_action: '⚙️',
                    llm_request: '📤',
                    llm_response: '📥',
                    task_event: '📋',
                    goal_event: '🎯',
                    scheduler_event: '⏰',
                    notification: '🔔',
                    error: '❌',
                  }[entry.category] ?? '📝';
                  return `${time} ${emoji} [${entry.level.toUpperCase()}] ${entry.message}`;
                } catch {
                  return line.slice(0, 100);
                }
              });

              const output = [
                `📄 日志: ${dateArg} (共 ${lines.length} 条, 显示最近 50 条)`,
                ...recentEntries,
                '',
                '图例: 👤用户 ⚙️系统 📤LLM请求 📥LLM响应 📋任务 🎯目标 ⏰调度器 🔔通知 ❌错误',
              ].join('\n');

              ctx.ui.notify(output, "info");
            } catch (err) {
              ctx.ui.notify(`无法读取日志文件: ${String(err)}`, "error");
            }
            return;
          } catch (err) {
            ctx.ui.notify(`无法读取日志目录: ${String(err)}`, "error");
            return;
          }
        }

        default: {
          ctx.ui.notify(
            "Goal-Driven Agent 命令 (新架构):\n" +
            "  /goal add <描述>      — 创建新目标\n" +
            "  /goal config          — 打开配置面板 ⚙️\n" +
            "  /goal list            — 列出所有目标\n" +
            "  /goal status          — 查看调度器状态\n" +
            "  /goal info <ID>       — 查看目标详情\n" +
            "  /goal complete <ID>   — 完成目标\n" +
            "  /goal abandon <ID>    — 暂停目标\n" +
            "  /goal stop            — 停止调度器\n" +
            "  /goal resume          — 恢复调度器\n" +
            "  /goal logs [日期]     — 查看日志\n" +
            "  /goal clear --confirm — 清空所有数据\n\n" +
            "新架构特性:\n" +
            "  - 统一任务调度器\n" +
            "  - 子目标层级规划\n" +
            "  - 价值评估与智能通知",
            "info"
          );
          return;
        }
      }
    },
  });

  // ── Event listeners for idle detection ──
  pi.on("input", (_event, _ctx) => {
    idleDetector?.recordActivity();
    codingAgentIdleDetector?.recordActivity();
  });

  pi.on("agent_start", (_event, _ctx) => {
    idleDetector?.setAgentBusy(true);
  });

  pi.on("agent_end", (_event, _ctx) => {
    idleDetector?.setAgentBusy(false);
  });

  // ── Model sync ──
  pi.on("model_select", (event, _ctx) => {
    llmChannel?.syncModel(event.model);
  });

  // ── Cleanup on shutdown ──
  pi.on("session_shutdown", async (_event, _ctx) => {
    await scheduler?.stop();
    idleDetector?.stop();
  });

  // ── Helper functions ──

  async function deliverPendingNotifications(pi: ExtensionAPI) {
    if (!notificationQueue || notificationQueue.pendingCount === 0) return;

    const hasUrgent = notificationQueue.hasUrgent();
    if (!idleDetector?.isIdle(hasUrgent)) return;

    while (notificationQueue.pendingCount > 0) {
      const notification = notificationQueue.dequeue();
      if (!notification) break;

      const icon = getNotificationIcon(notification.type);
      pi.sendMessage({
        customType: "goal_notification",
        content: `${icon} **${notification.title}**\n\n${notification.content}`,
        display: true,
        details: { notification },
      });

      await sleep(2000);

      if (idleDetector && !idleDetector.isIdle()) break;
    }
  }

  async function getKnowledgeCount(): Promise<number> {
    try {
      // Try to get count from knowledge store
      const all = await knowledgeStore?.search?.("", { maxResults: 10000 });
      return all?.length ?? 0;
    } catch {
      return 0;
    }
  }

  async function clearTasksManual(): Promise<void> {
    // Manual task clearing if store doesn't have clearAll
    const allTasks = await taskStore?.getAllTasks?.() ?? [];
    for (const task of allTasks) {
      await taskStore?.deleteTask?.(task.id);
    }
  }

  async function clearKnowledgeManual(): Promise<void> {
    // Manual knowledge clearing
    const allKnowledge = await knowledgeStore?.search?.("", { maxResults: 10000 }) ?? [];
    for (const entry of allKnowledge) {
      await knowledgeStore?.delete?.(entry.id);
    }
  }

  function formatPhase(phase: string): string {
    const phaseMap: Record<string, string> = {
      idle: "空闲",
      collecting_info: "收集信息",
      decomposing: "拆解子目标",
      generating_tasks: "生成任务",
      reviewing_tasks: "审核任务",
      presenting_plan: "计划确认",
      executing: "执行中",
      monitoring: "监控中",
      reviewing: "定期回顾",
    };
    return phaseMap[phase] ?? phase;
  }

  function getTaskStatusIcon(status: TaskStatus): string {
    const icons: Record<TaskStatus, string> = {
      pending: "⏳",
      blocked: "🚫",
      ready: "✅",
      in_progress: "🔄",
      waiting_user: "👤",
      completed: "✓",
      failed: "❌",
      cancelled: "🗑️",
    };
    return icons[status] ?? "❓";
  }

  function getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      report: "📊",
      help_request: "🆘",
      confirmation: "✅",
      info: "ℹ️",
      urgent: "🔥",
      delivery: "📦",
      suggestion: "💡",
      progress: "⏳",
    };
    return icons[type] ?? "🔔";
  }
};

export default goalDrivenExtension;
