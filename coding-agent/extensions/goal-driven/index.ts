/**
 * Goal-Driven Agent Extension for Coding Agent
 *
 * This extension integrates the Goal-Driven Agent architecture into the coding agent,
 * allowing users to create goals, manage tasks, and execute plans directly in CLI.
 *
 * Features:
 * - Create and manage goals with multi-dimensional exploration
 * - Task scheduling with dependency management
 * - Interactive context gathering
 * - Success criteria tracking
 * - Knowledge storage and reuse
 *
 * Commands:
 * - /goal create <title> - Create a new goal
 * - /goal list - List all goals
 * - /goal show <id> - Show goal details
 * - /tasks - List active tasks
 * - /plan <goalId> - Generate and review plan for a goal
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { Text, truncateToWidth, matchesKey } from "@mariozechner/pi-tui";
import { homedir } from "os";
import { join } from "path";

// Import Goal-Driven Agent modules
import {
  GoalStore,
  TaskStore,
  TaskDependencyGraph,
  KnowledgeStore,
  NotificationQueue,
  UnifiedTaskScheduler,
  SuccessCriteriaChecker,
  PlanPresenter,
  ContextGatherer,
  GoalOrchestrator,
  ExecutionPipeline,
  ClaudeLLMChannel,
  SimpleIdleDetector,
  type Goal,
  type Task,
  type TaskType,
  type TaskStatus,
} from "../../src/core/goal-driven/index.js";

// Storage paths
const STORAGE_DIR = join(homedir(), ".pi", "agent", "goal-driven");

// State management
interface GoalDrivenState {
  activeGoalId?: string;
  schedulerRunning: boolean;
}

// Global instances
let goalStore: GoalStore;
let taskStore: TaskStore;
let knowledgeStore: KnowledgeStore;
let notificationQueue: NotificationQueue;
let dependencyGraph: TaskDependencyGraph;
let scheduler: UnifiedTaskScheduler | null = null;
let state: GoalDrivenState = { schedulerRunning: false };

/**
 * Initialize stores and scheduler
 */
async function initialize(): Promise<void> {
  if (goalStore) return;

  goalStore = new GoalStore();
  taskStore = new TaskStore();
  knowledgeStore = new KnowledgeStore();
  notificationQueue = new NotificationQueue();

  await goalStore.init();
  await taskStore.init();
  await knowledgeStore.init();

  dependencyGraph = new TaskDependencyGraph(taskStore);
}

/**
 * Get or create scheduler
 */
async function getScheduler(ctx: ExtensionContext): Promise<UnifiedTaskScheduler> {
  if (!scheduler) {
    const llmChannel = new ClaudeLLMChannel({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "claude-opus-4-6",
    });

    const executionPipeline = new ExecutionPipeline(
      llmChannel,
      knowledgeStore,
      {
        webSearch: async (query: string) => {
          // Use the agent's tool to search
          const result = await ctx.tools.webSearch({ query });
          return result;
        },
        webFetch: async (url: string) => {
          const result = await ctx.tools.webFetch({ url });
          return result;
        },
      }
    );

    const idleDetector = new SimpleIdleDetector({
      initialIdleTimeMs: 5000,
    });

    const orchestrator = new GoalOrchestrator(
      goalStore,
      taskStore,
      new PlanPresenter(),
      new ContextGatherer(llmChannel),
      executionPipeline,
      dependencyGraph
    );

    scheduler = new UnifiedTaskScheduler(
      taskStore,
      goalStore,
      knowledgeStore,
      notificationQueue,
      dependencyGraph,
      executionPipeline,
      idleDetector,
      { userId: "cli-user" },
      {
        maxConcurrent: 2,
        cycleIntervalMs: 30000,
      }
    );

    // Handle notifications
    scheduler.on("notification", async (notification) => {
      if (notification.requiresImmediate) {
        ctx.ui.notify(`[Goal] ${notification.message}`, "info");
      }
    });

    // Handle user input requests
    scheduler.on("userInputRequested", async (request) => {
      ctx.ui.notify(`[Goal] Input needed: ${request.question}`, "info");
    });
  }

  return scheduler;
}

// Tool parameter schemas
const GoalCreateParams = Type.Object({
  title: Type.String({ description: "Goal title" }),
  description: Type.String({ description: "Detailed goal description" }),
  priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
});

const GoalListParams = Type.Object({
  status: Type.Optional(StringEnum(["active", "completed", "archived", "all"] as const)),
});

const TaskListParams = Type.Object({
  goalId: Type.Optional(Type.String({ description: "Filter by goal ID" })),
  status: Type.Optional(StringEnum(["pending", "ready", "in_progress", "completed", "all"] as const)),
});

const TaskExecuteParams = Type.Object({
  taskId: Type.String({ description: "Task ID to execute" }),
});

const PlanGenerateParams = Type.Object({
  goalId: Type.String({ description: "Goal ID to plan for" }),
});

const ContextProvideParams = Type.Object({
  goalId: Type.String({ description: "Goal ID" }),
  key: Type.String({ description: "Context key" }),
  value: Type.String({ description: "Context value" }),
});

/**
 * UI Component for goal list
 */
class GoalListComponent {
  private goals: Goal[];
  private theme: any;
  private onClose: () => void;
  private onSelect: (goalId: string) => void;

  constructor(goals: Goal[], theme: any, onClose: () => void, onSelect: (goalId: string) => void) {
    this.goals = goals;
    this.theme = theme;
    this.onClose = onClose;
    this.onSelect = onSelect;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
    }
    // Number selection
    const num = parseInt(data);
    if (!isNaN(num) && num > 0 && num <= this.goals.length) {
      this.onSelect(this.goals[num - 1].id);
    }
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const th = this.theme;

    lines.push("");
    const title = th.fg("accent", " Goals ");
    const headerLine = th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 9)));
    lines.push(truncateToWidth(headerLine, width));
    lines.push("");

    if (this.goals.length === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No goals yet. Use /goal create or the goal_create tool.")}`, width));
    } else {
      this.goals.forEach((goal, index) => {
        const num = th.fg("accent", `${index + 1}.`);
        const title = goal.status === "completed" ? th.fg("dim", goal.title) : th.fg("text", goal.title);
        const status = this.renderStatus(goal.status, th);
        const progress = th.fg("muted", `${goal.progress.percentage}%`);
        lines.push(truncateToWidth(`  ${num} ${title} ${status} ${progress}`, width));
        if (goal.description) {
          lines.push(truncateToWidth(`     ${th.fg("dim", goal.description.substring(0, 50))}${goal.description.length > 50 ? "..." : ""}`, width));
        }
      });
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Press number to select, Escape to close")}`, width));
    lines.push("");

    return lines;
  }

  private renderStatus(status: string, theme: any): string {
    switch (status) {
      case "active": return theme.fg("success", "[active]");
      case "completed": return theme.fg("dim", "[done]");
      case "archived": return theme.fg("muted", "[archived]");
      default: return theme.fg("dim", `[${status}]`);
    }
  }
}

/**
 * UI Component for task list
 */
class TaskListComponent {
  private tasks: Task[];
  private theme: any;
  private onClose: () => void;

  constructor(tasks: Task[], theme: any, onClose: () => void) {
    this.tasks = tasks;
    this.theme = theme;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
    }
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const th = this.theme;

    lines.push("");
    const title = th.fg("accent", " Tasks ");
    const headerLine = th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 9)));
    lines.push(truncateToWidth(headerLine, width));
    lines.push("");

    if (this.tasks.length === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No tasks found.")}`, width));
    } else {
      this.tasks.forEach((task, index) => {
        const num = th.fg("accent", `${index + 1}.`);
        const title = task.status === "completed" ? th.fg("dim", task.title) : th.fg("text", task.title);
        const status = this.renderStatus(task.status, th);
        const type = th.fg("muted", `(${task.type})`);
        lines.push(truncateToWidth(`  ${num} ${title} ${status} ${type}`, width));
      });
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
    lines.push("");

    return lines;
  }

  private renderStatus(status: string, theme: any): string {
    switch (status) {
      case "completed": return theme.fg("success", "[done]");
      case "in_progress": return theme.fg("accent", "[doing]");
      case "ready": return theme.fg("info", "[ready]");
      case "waiting_user": return theme.fg("warning", "[wait]");
      default: return theme.fg("dim", `[${status}]`);
    }
  }
}

/**
 * Extension factory
 */
export default function (pi: ExtensionAPI) {
  // Initialize on session start
  pi.on("session_start", async (_event, ctx) => {
    await initialize();

    // Restore state from session entries
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (msg.role !== "toolResult") continue;

      // Restore active goal from tool results
      if (msg.toolName === "goal_create" && msg.details) {
        const details = msg.details as { goalId?: string };
        if (details.goalId) {
          state.activeGoalId = details.goalId;
        }
      }
    }
  });

  // Register goal_create tool
  pi.registerTool({
    name: "goal_create",
    label: "Goal Create",
    description: "Create a new goal with automatic context gathering and planning",
    parameters: GoalCreateParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      await initialize();

      const goalId = `goal-${Date.now()}`;
      const goal = await goalStore.createGoal({
        id: goalId,
        title: params.title,
        description: params.description,
        status: "active",
        priority: params.priority || "medium",
        dimensions: [],
        successCriteria: [],
        progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
        userContext: { collectedInfo: {} },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      state.activeGoalId = goalId;

      // Start scheduler for this goal
      const sched = await getScheduler(ctx);
      if (!state.schedulerRunning) {
        await sched.start();
        state.schedulerRunning = true;
      }

      return {
        content: [
          {
            type: "text",
            text: `Created goal "${params.title}" (${goalId})\n\nThe system will now gather context and create a plan. Use /plan ${goalId} to review the plan.`,
          },
        ],
        details: { goalId, title: params.title },
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("goal_create ")) + theme.fg("muted", args.title);
      if (args.priority) {
        text += theme.fg("dim", ` (${args.priority})`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as { goalId?: string; title?: string } | undefined;
      if (details?.goalId) {
        return new Text(
          theme.fg("success", "✓ Created goal ") + theme.fg("accent", details.title || "") + theme.fg("dim", ` (${details.goalId})`),
          0,
          0
        );
      }
      return new Text(result.content[0]?.type === "text" ? result.content[0].text : "", 0, 0);
    },
  });

  // Register goal_list tool
  pi.registerTool({
    name: "goal_list",
    label: "Goal List",
    description: "List all goals with their status and progress",
    parameters: GoalListParams,

    async execute() {
      await initialize();

      const goals = await goalStore.listGoals();
      const filtered = goals.filter(g => {
        if (!goals.length) return true;
        return true;
      });

      const list = filtered.map(g => ({
        id: g.id,
        title: g.title,
        status: g.status,
        progress: `${g.progress.percentage}%`,
      }));

      return {
        content: [
          {
            type: "text",
            text: list.length
              ? list.map(g => `- ${g.title} (${g.id}): ${g.status} ${g.progress}`).join("\n")
              : "No goals found.",
          },
        ],
        details: { goals: list, count: list.length },
      };
    },

    renderCall(_args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("goal_list")), 0, 0);
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as { goals?: Array<{ id: string; title: string; status: string; progress: string }>; count?: number } | undefined;
      if (!details?.goals?.length) {
        return new Text(theme.fg("dim", "No goals"), 0, 0);
      }

      let text = theme.fg("muted", `${details.count} goal(s):`);
      const display = expanded ? details.goals : details.goals.slice(0, 5);
      for (const g of display) {
        const status = g.status === "active" ? theme.fg("success", "●") : theme.fg("dim", "○");
        text += `\n${status} ${theme.fg("accent", g.id)} ${theme.fg("text", g.title)} ${theme.fg("dim", g.progress)}`;
      }
      if (!expanded && details.goals.length > 5) {
        text += `\n${theme.fg("dim", `... ${details.goals.length - 5} more`)}`;
      }
      return new Text(text, 0, 0);
    },
  });

  // Register task_list tool
  pi.registerTool({
    name: "task_list",
    label: "Task List",
    description: "List tasks for a goal",
    parameters: TaskListParams,

    async execute(_toolCallId, params) {
      await initialize();

      let tasks: Task[];
      if (params.goalId) {
        tasks = await taskStore.getTasksByGoal(params.goalId);
      } else {
        tasks = await taskStore.listTasks();
      }

      if (params.status && params.status !== "all") {
        tasks = tasks.filter(t => t.status === params.status);
      }

      const list = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        type: t.type,
      }));

      return {
        content: [
          {
            type: "text",
            text: list.length
              ? list.map(t => `- [${t.status}] ${t.title} (${t.type})`).join("\n")
              : "No tasks found.",
          },
        ],
        details: { tasks: list, count: list.length },
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("task_list"));
      if (args.goalId) {
        text += theme.fg("dim", ` goal:${args.goalId}`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as { tasks?: Array<{ id: string; title: string; status: string; type: string }>; count?: number } | undefined;
      if (!details?.tasks?.length) {
        return new Text(theme.fg("dim", "No tasks"), 0, 0);
      }

      const counts = details.tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const done = counts["completed"] || 0;
      const total = details.tasks.length;

      let text = theme.fg("muted", `${done}/${total} tasks completed:`);
      for (const t of details.tasks.slice(0, 5)) {
        const icon = t.status === "completed" ? theme.fg("success", "✓") : theme.fg("dim", "○");
        text += `\n${icon} ${theme.fg("accent", t.id)} ${theme.fg("text", t.title)}`;
      }
      if (details.tasks.length > 5) {
        text += `\n${theme.fg("dim", `... ${details.tasks.length - 5} more`)}`;
      }
      return new Text(text, 0, 0);
    },
  });

  // Register plan_generate tool
  pi.registerTool({
    name: "plan_generate",
    label: "Plan Generate",
    description: "Generate and review a plan for a goal",
    parameters: PlanGenerateParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      await initialize();

      const goal = await goalStore.getGoal(params.goalId);
      if (!goal) {
        return {
          content: [{ type: "text", text: `Goal ${params.goalId} not found.` }],
          details: { error: "goal not found" },
        };
      }

      const presenter = new PlanPresenter();
      const llm = new ClaudeLLMChannel({
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        model: "claude-opus-4-6",
      });

      // Generate plan
      const subGoalPlanner = {
        plan: async (g: Goal) => {
          // Simple mock planning - in real implementation, use LLM
          return {
            subGoals: [
              {
                id: `sg-${Date.now()}`,
                goalId: g.id,
                title: "Research phase",
                description: "Gather information and resources",
                priority: "high",
                status: "pending" as const,
                tasks: [],
                dependencies: [],
                createdAt: Date.now(),
              },
            ],
          };
        },
      };

      const taskPlanner = {
        planTasks: async (subGoal: any) => {
          return {
            tasks: [
              {
                id: `task-${Date.now()}`,
                goalId: goal.id,
                title: "Initial research",
                description: "Search for relevant information",
                type: "exploration" as TaskType,
                priority: "high",
                status: "ready" as TaskStatus,
                execution: {
                  agentPrompt: "Search for information about: " + goal.description,
                  requiredTools: ["web_search"],
                  requiredContext: [],
                  capabilityMode: "composite",
                },
                adaptiveConfig: {
                  canAdjustDifficulty: false,
                  canAdjustFrequency: false,
                  successThreshold: 0.5,
                  executionHistory: [],
                },
                relatedKnowledgeIds: [],
                dependencies: [],
                executionHistory: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
          };
        },
      };

      const orchestrator = new GoalOrchestrator(
        goalStore,
        taskStore,
        presenter,
        new ContextGatherer(llm),
        await getScheduler(ctx),
        dependencyGraph
      );

      const report = await presenter.generatePlanReport(goal.id, subGoalPlanner as any, taskPlanner as any);

      return {
        content: [
          {
            type: "text",
            text: `Plan for "${report.goalTitle}":\n\n${report.subGoals.map(sg => `- ${sg.title}: ${sg.tasks.length} tasks`).join("\n")}\n\nTotal: ${report.summary.taskCount} tasks`,
          },
        ],
        details: { goalId: params.goalId, report },
      };
    },

    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("plan_generate ")) + theme.fg("accent", args.goalId),
        0,
        0
      );
    },

    renderResult(result, _options, theme) {
      const details = result.details as { report?: { summary?: { taskCount?: number } } } | undefined;
      const taskCount = details?.report?.summary?.taskCount || 0;
      return new Text(
        theme.fg("success", "✓ Generated plan with ") + theme.fg("accent", `${taskCount} tasks`),
        0,
        0
      );
    },
  });

  // Register context_provide tool
  pi.registerTool({
    name: "context_provide",
    label: "Context Provide",
    description: "Provide context information for a goal",
    parameters: ContextProvideParams,

    async execute(_toolCallId, params) {
      await initialize();

      const goal = await goalStore.getGoal(params.goalId);
      if (!goal) {
        return {
          content: [{ type: "text", text: `Goal ${params.goalId} not found.` }],
          details: { error: "goal not found" },
        };
      }

      goal.userContext.collectedInfo[params.key] = params.value;
      await goalStore.updateGoal(goal);

      return {
        content: [
          { type: "text", text: `Provided context: ${params.key} = ${params.value}` },
        ],
        details: { goalId: params.goalId, key: params.key },
      };
    },

    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("context_provide ")) +
          theme.fg("accent", args.goalId) +
          theme.fg("dim", ` ${args.key}`),
        0,
        0
      );
    },

    renderResult(_result, _options, theme) {
      return new Text(theme.fg("success", "✓ Context provided"), 0, 0);
    },
  });

  // Register /goal command
  pi.registerCommand("goal", {
    description: "Goal management commands: create, list, show",
    handler: async (args, ctx) => {
      const subcommand = args[0];

      if (subcommand === "create") {
        const title = args.slice(1).join(" ");
        if (!title) {
          ctx.ui.notify("Usage: /goal create <title>", "error");
          return;
        }

        // Use the tool to create
        const result = await ctx.agent.runTool("goal_create", { title, description: title });
        ctx.ui.notify(`Created goal: ${title}`, "success");
        return;
      }

      if (subcommand === "list" || !subcommand) {
        await initialize();
        const goals = await goalStore.listGoals();

        if (!ctx.hasUI) {
          const text = goals.length
            ? goals.map(g => `- ${g.title} (${g.status})`).join("\n")
            : "No goals. Use /goal create <title>";
          ctx.ui.notify(text, "info");
          return;
        }

        await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
          return new GoalListComponent(
            goals,
            theme,
            () => done(),
            (goalId) => {
              state.activeGoalId = goalId;
              done();
              ctx.ui.notify(`Selected goal: ${goalId}`, "info");
            }
          );
        });
        return;
      }

      ctx.ui.notify("Unknown subcommand. Use: /goal create <title> or /goal list", "error");
    },
  });

  // Register /tasks command
  pi.registerCommand("tasks", {
    description: "List tasks for the active goal or all tasks",
    handler: async (_args, ctx) => {
      await initialize();

      const goalId = state.activeGoalId;
      let tasks: Task[];

      if (goalId) {
        tasks = await taskStore.getTasksByGoal(goalId);
      } else {
        tasks = await taskStore.listTasks();
      }

      if (!ctx.hasUI) {
        const text = tasks.length
          ? tasks.map(t => `- [${t.status}] ${t.title}`).join("\n")
          : "No tasks.";
        ctx.ui.notify(text, "info");
        return;
      }

      await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
        return new TaskListComponent(tasks, theme, () => done());
      });
    },
  });

  // Register /plan command
  pi.registerCommand("plan", {
    description: "Generate and show plan for a goal: /plan <goalId>",
    handler: async (args, ctx) => {
      const goalId = args[0] || state.activeGoalId;

      if (!goalId) {
        ctx.ui.notify("Usage: /plan <goalId> or select an active goal first with /goal list", "error");
        return;
      }

      // Use the tool
      const result = await ctx.agent.runTool("plan_generate", { goalId });
      const text = result.content[0]?.type === "text" ? result.content[0].text : "Plan generated";
      ctx.ui.notify(text, "info");
    },
  });

  // Register keyboard shortcut Ctrl+G for quick goal access
  pi.registerShortcut({
    key: "ctrl+g",
    description: "Show goals",
    handler: async (ctx) => {
      await initialize();
      const goals = await goalStore.listGoals();

      if (!ctx.hasUI) {
        ctx.ui.notify("Goals shortcut requires interactive mode", "error");
        return;
      }

      await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
        return new GoalListComponent(
          goals,
          theme,
          () => done(),
          (goalId) => {
            state.activeGoalId = goalId;
            done();
          }
        );
      });
    },
  });
}
