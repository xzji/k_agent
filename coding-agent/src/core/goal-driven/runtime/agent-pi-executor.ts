/**
 * Agent Pi Background Executor
 *
 * 基于实际可用的 ExtensionAPI 和 BackgroundSessionManager 实现任务后台执行
 *
 * 可用 API:
 * - BackgroundSessionManager - 独立后台会话管理
 * - EventBus - 跨组件通信
 * - ExtensionAPI.sendMessage() - 发送消息到前台
 *
 * 架构:
 * 1. 每个任务创建独立的 AgentSession
 * 2. 在独立会话中执行，完全隔离前台
 * 3. 通过 EventBus 返回执行结果
 * 4. 支持心跳监控和超时控制
 */

import type { ExtensionAPI } from "../../extensions/types.js";
import type {
  Task,
  ExecutionResult,
  KnowledgeEntry,
  ITaskStore,
  IKnowledgeStore,
  INotificationQueue,
  IGoalStore,
} from "../types.js";
import { generateId, now } from "../utils/index.js";
import { logError, logSystemAction } from "../utils/logger.js";
import {
  BackgroundSessionManager,
  type BackgroundSessionConfig,
  type BackgroundSessionHandle,
  type BackgroundSessionResult,
  type BackgroundSessionEvent,
  initBackgroundSessionManager,
} from "./background-session.js";
import type { ModelRegistry } from "../../model-registry.js";
import type { SettingsManager } from "../../settings-manager.js";
import type { ResourceLoader } from "../resource-loader.js";
import type { GoalDrivenConfigStore } from "../config/store.js";
import { getToolProvider } from "./tool-provider.js";

/**
 * 执行事件类型定义
 */
export interface ExecuteTaskEvent {
  type: "goal_driven:execute_task";
  payload: {
    taskId: string;
    goalId: string;
    agentPrompt: string;
    requiredTools: string[];
    contextKnowledge?: KnowledgeEntry[];
    timeoutMs?: number;
  };
}

/**
 * 任务结果事件
 */
export interface TaskResultEvent {
  type: "goal_driven:task_result";
  payload: {
    taskId: string;
    goalId: string;
    success: boolean;
    output?: string;
    outputType?: string;
    error?: string;
    duration: number;
    tokenUsage?: number;
    knowledgeEntries?: KnowledgeEntry[];
    completedAt: number;
  };
}

/**
 * 任务进度事件
 */
export interface TaskProgressEvent {
  type: "goal_driven:task_progress";
  payload: {
    taskId: string;
    progress: number;
    message?: string;
    timestamp: number;
  };
}

/**
 * 任务心跳事件
 */
export interface TaskHeartbeatEvent {
  type: "goal_driven:task_heartbeat";
  payload: {
    taskId: string;
    timestamp: number;
    status: "running" | "waiting_tools" | "completed";
  };
}

/**
 * 运行中任务状态
 */
interface RunningTaskState {
  taskId: string;
  goalId: string;
  sessionId: string;
  startTime: number;
  timeoutAt: number;
  lastHeartbeat: number;
  status: "running" | "waiting_tools" | "completed";
  abortController: AbortController;
}

/**
 * 排队任务项（用于按价值和紧迫度排序）
 */
interface QueuedTask {
  taskId: string;
  goalId: string;
  agentPrompt: string;
  requiredTools: string[];
  contextKnowledge?: KnowledgeEntry[];
  timeoutMs?: number;
  priority: number; // 基础优先级权重
  urgency: number; // 紧迫度 (0-1)
  value: number; // 价值评分 (0-1)
  enqueuedAt: number;
}

/**
 * 任务评分结果
 */
interface TaskScore {
  taskId: string;
  score: number;
  urgency: number;
  value: number;
  priority: number;
}

/**
 * 后台执行配置
 */
export interface BackgroundExecutionConfig {
  /** 默认任务超时时间（毫秒） */
  defaultTimeoutMs: number;
  /** 心跳超时时间（毫秒） */
  heartbeatTimeoutMs: number;
  /** 最大并发任务数 */
  maxConcurrent: number;
}

/**
 * Agent Pi 后台执行器
 *
 * 基于 BackgroundSessionManager 实现真正的后台执行：
 * 1. 为每个任务创建独立会话
 * 2. 完全隔离前台用户交互
 * 3. 监控执行进度和心跳
 * 4. 收集并存储执行结果
 * 5. 处理超时和错误
 */
export class AgentPiBackgroundExecutor {
  private config: BackgroundExecutionConfig;
  private runningTasks = new Map<string, RunningTaskState>();
  private heartbeatTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private isInitialized = false;
  private sessionManager: BackgroundSessionManager;
  private eventUnsubscribe?: () => void;
  private configStore?: GoalDrivenConfigStore;
  private configUnsubscribe?: () => void;
  private goalStore: IGoalStore;

  // 任务派发队列
  private dispatchQueue: QueuedTask[] = [];
  private dispatchTimer?: ReturnType<typeof setTimeout>;
  private readonly DISPATCH_INTERVAL_MS = 5000; // 5秒检查一次队列

  constructor(
    private pi: ExtensionAPI,
    taskStore: ITaskStore,
    knowledgeStore: IKnowledgeStore,
    notificationQueue: INotificationQueue,
    goalStore: IGoalStore,
    modelRegistry: ModelRegistry,
    settingsManager: SettingsManager,
    resourceLoader: ResourceLoader,
    agentDir: string,
    config?: Partial<BackgroundExecutionConfig>,
    configStore?: GoalDrivenConfigStore
  ) {
    this.taskStore = taskStore;
    this.knowledgeStore = knowledgeStore;
    this.notificationQueue = notificationQueue;
    this.goalStore = goalStore;
    this.configStore = configStore;

    // Use config store values if available, otherwise use defaults
    const defaultTimeoutMs = configStore?.get('taskDefaultTimeoutMs') ?? 600000;
    const heartbeatTimeoutMs = configStore?.get('taskHeartbeatTimeoutMs') ?? 120000;
    const maxConcurrent = configStore?.get('maxConcurrentTasks') ?? 3;

    this.config = {
      defaultTimeoutMs,
      heartbeatTimeoutMs,
      maxConcurrent,
      ...config,
    };

    // 初始化后台会话管理器
    this.sessionManager = initBackgroundSessionManager(
      modelRegistry,
      settingsManager,
      resourceLoader,
      agentDir
    );

    // Listen for config changes
    if (configStore) {
      this.configUnsubscribe = configStore.onChange((newConfig) => {
        this.config.defaultTimeoutMs = newConfig.taskDefaultTimeoutMs;
        this.config.heartbeatTimeoutMs = newConfig.taskHeartbeatTimeoutMs;
        this.config.maxConcurrent = newConfig.maxConcurrentTasks;
        console.log(`[AgentPiBackgroundExecutor] Config updated: defaultTimeout=${newConfig.taskDefaultTimeoutMs}ms, heartbeatTimeout=${newConfig.taskHeartbeatTimeoutMs}ms, maxConcurrent=${newConfig.maxConcurrentTasks}`);
      });
    }
  }

  /**
   * 初始化执行器，开始监听事件
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log("[AgentPiBackgroundExecutor] Already initialized");
      return;
    }

    // 监听执行任务请求
    this.pi.events.on("goal_driven:execute_task", this.handleExecuteTask.bind(this));

    // 监听后台会话事件
    this.eventUnsubscribe = this.sessionManager.onEvent(this.handleSessionEvent.bind(this));

    // 启动派发队列处理
    this.startDispatchLoop();

    this.isInitialized = true;
    console.log("[AgentPiBackgroundExecutor] Initialized with BackgroundSessionManager, maxConcurrent:", this.config.maxConcurrent);
  }

  /**
   * 启动派发循环
   */
  private startDispatchLoop(): void {
    const processQueue = () => {
      if (!this.isInitialized) return;
      this.processDispatchQueue();
      this.dispatchTimer = setTimeout(processQueue, this.DISPATCH_INTERVAL_MS);
    };
    this.dispatchTimer = setTimeout(processQueue, this.DISPATCH_INTERVAL_MS);
  }

  /**
   * 处理派发队列
   */
  private async processDispatchQueue(): Promise<void> {
    if (this.dispatchQueue.length === 0) return;
    if (this.runningTasks.size >= this.config.maxConcurrent) return;

    // 按评分排序队列
    const scoredTasks = await this.scoreAndSortQueue();
    if (scoredTasks.length === 0) return;

    // 取最高分的任务派发
    const slotsAvailable = this.config.maxConcurrent - this.runningTasks.size;
    const tasksToDispatch = scoredTasks.slice(0, slotsAvailable);

    for (const scored of tasksToDispatch) {
      const index = this.dispatchQueue.findIndex(q => q.taskId === scored.taskId);
      if (index >= 0) {
        const queued = this.dispatchQueue.splice(index, 1)[0];
        console.log(`[AgentPiBackgroundExecutor] Dispatching queued task ${queued.taskId} (score: ${scored.score.toFixed(2)})`);
        await this.executeTask(queued);
      }
    }
  }

  /**
   * 评估队列中任务的价值和紧迫度
   */
  private async scoreAndSortQueue(): Promise<TaskScore[]> {
    const scored: TaskScore[] = [];

    for (const queued of this.dispatchQueue) {
      // 获取任务详细信息
      const task = await this.taskStore.getTask(queued.taskId);
      const goal = await this.goalStore.getGoal(queued.goalId);

      if (!task || !goal) continue;

      // 计算紧迫度
      const urgency = this.calculateUrgency(task, goal, queued);

      // 计算价值
      const value = this.calculateValue(task, goal);

      // 基础优先级权重
      const priorityWeight = this.getPriorityWeight(task.priority);

      // 综合评分 (等待时间衰减 + 紧迫度 + 价值 + 优先级)
      const waitTimeMs = now() - queued.enqueuedAt;
      const waitBonus = Math.min(0.2, waitTimeMs / 300000); // 最多0.2的等待奖励（5分钟达到上限）

      const score = waitBonus + urgency * 0.35 + value * 0.35 + priorityWeight * 0.3;

      scored.push({
        taskId: queued.taskId,
        score,
        urgency,
        value,
        priority: priorityWeight,
      });
    }

    // 按评分降序排序
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * 计算任务紧迫度 (0-1)
   */
  private calculateUrgency(
    task: Task,
    goal: { priority: string; deadline?: number; createdAt: number },
    queued: QueuedTask
  ): number {
    let urgency = 0;

    // 1. 基于目标截止时间的紧迫度
    if (goal.deadline) {
      const timeToDeadline = goal.deadline - now();
      const totalDuration = goal.deadline - goal.createdAt;
      if (timeToDeadline > 0 && totalDuration > 0) {
        // 越接近截止时间越紧迫
        urgency += Math.max(0, 1 - timeToDeadline / totalDuration) * 0.4;
      } else if (timeToDeadline <= 0) {
        // 已过期，最高紧迫度
        urgency += 0.4;
      }
    }

    // 2. 基于任务类型的紧迫度
    switch (task.type) {
      case 'monitoring':
      case 'event_triggered':
        urgency += 0.3; // 监控和事件触发任务较紧迫
        break;
      case 'exploration':
        urgency += 0.2;
        break;
      case 'one_time':
        urgency += 0.25;
        break;
      case 'recurring':
        urgency += 0.15;
        break;
    }

    // 3. 基于任务优先级的紧迫度
    urgency += this.getPriorityWeight(task.priority) * 0.3;

    return Math.min(1, urgency);
  }

  /**
   * 计算任务价值 (0-1)
   */
  private calculateValue(task: Task, goal: { progress?: { percentage: number } }): number {
    let value = 0.5; // 基础价值

    // 1. 基于预期产出的价值
    if (task.expectedResult?.description) {
      // 检查预期产出类型
      const desc = task.expectedResult.description.toLowerCase();
      if (desc.includes('关键') || desc.includes('核心') || desc.includes('important') || desc.includes('critical')) {
        value += 0.2;
      }
      if (desc.includes('报告') || desc.includes('分析') || desc.includes('report') || desc.includes('analysis')) {
        value += 0.1;
      }
    }

    // 2. 基于任务工具需求的价值（需要工具的任务通常更复杂、价值更高）
    if (task.execution.requiredTools.length > 0) {
      value += Math.min(0.15, task.execution.requiredTools.length * 0.05);
    }

    // 3. 基于目标进度的价值（低进度目标的任务价值更高）
    if (goal.progress && goal.progress.percentage < 30) {
      value += 0.1; // 早期阶段任务价值加成
    }

    // 4. 基于任务历史执行成功率的价值调整
    const history = task.executionHistory || [];
    if (history.length > 0) {
      const successRate = history.filter(h => h.status === 'success').length / history.length;
      // 历史成功率高的任务更可靠，价值略高
      value += (successRate - 0.5) * 0.1;
    }

    return Math.max(0, Math.min(1, value));
  }

  /**
   * 获取优先级权重
   */
  private getPriorityWeight(priority: string): number {
    const weights: Record<string, number> = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
      background: 0.1,
    };
    return weights[priority] ?? 0.5;
  }

  /**
   * 销毁执行器，清理资源
   */
  async dispose(): Promise<void> {
    this.isInitialized = false;

    // 取消事件监听
    this.eventUnsubscribe?.();

    // 取消配置监听
    this.configUnsubscribe?.();

    // 清理派发定时器
    if (this.dispatchTimer) {
      clearTimeout(this.dispatchTimer);
      this.dispatchTimer = undefined;
    }

    // 终止所有运行中的任务
    for (const [taskId, state] of this.runningTasks) {
      state.abortController.abort();
      await this.sessionManager.terminateSession(state.sessionId, "executor_disposed");
      this.clearHeartbeatTimer(taskId);
    }

    this.runningTasks.clear();
    this.heartbeatTimers.clear();
    this.dispatchQueue = [];
  }

  /**
   * 获取派发队列状态
   */
  getDispatchQueueStatus(): {
    queueLength: number;
    runningCount: number;
    maxConcurrent: number;
    queue: Array<{ taskId: string; goalId: string; waitTimeMs: number }>;
  } {
    return {
      queueLength: this.dispatchQueue.length,
      runningCount: this.runningTasks.size,
      maxConcurrent: this.config.maxConcurrent,
      queue: this.dispatchQueue.map(q => ({
        taskId: q.taskId,
        goalId: q.goalId,
        waitTimeMs: now() - q.enqueuedAt,
      })),
    };
  }

  /**
   * 从队列中移除任务
   */
  dequeueTask(taskId: string): boolean {
    const index = this.dispatchQueue.findIndex(q => q.taskId === taskId);
    if (index >= 0) {
      this.dispatchQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 处理执行任务请求
   */
  private async handleExecuteTask(payload: ExecuteTaskEvent['payload']): Promise<void> {
    const { taskId, goalId, agentPrompt, requiredTools, contextKnowledge, timeoutMs } = payload;

    // 检查任务是否已在运行
    if (this.runningTasks.has(taskId)) {
      console.warn(`[AgentPiBackgroundExecutor] Task ${taskId} is already running`);
      return;
    }

    // 检查任务是否已在队列中
    if (this.dispatchQueue.some(q => q.taskId === taskId)) {
      console.warn(`[AgentPiBackgroundExecutor] Task ${taskId} is already in dispatch queue`);
      return;
    }

    // 获取任务信息用于评分
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      console.error(`[AgentPiBackgroundExecutor] Task ${taskId} not found`);
      this.emitTaskResult(taskId, goalId, {
        success: false,
        error: "Task not found",
        duration: 0,
      });
      return;
    }

    // 如果有空闲槽位，直接执行
    if (this.runningTasks.size < this.config.maxConcurrent) {
      console.log(`[AgentPiBackgroundExecutor] Starting task ${taskId} immediately (${this.runningTasks.size + 1}/${this.config.maxConcurrent})`);
      await this.executeTask({
        taskId,
        goalId,
        agentPrompt,
        requiredTools,
        contextKnowledge,
        timeoutMs,
        priority: this.getPriorityWeight(task.priority),
        urgency: 0.5, // 默认值，实际执行时会重新计算
        value: 0.5,
        enqueuedAt: now(),
      });
      return;
    }

    // 队列已满，加入队列
    console.log(`[AgentPiBackgroundExecutor] Queue full, adding task ${taskId} to dispatch queue (position: ${this.dispatchQueue.length + 1})`);

    const queued: QueuedTask = {
      taskId,
      goalId,
      agentPrompt,
      requiredTools,
      contextKnowledge,
      timeoutMs,
      priority: this.getPriorityWeight(task.priority),
      urgency: 0.5,
      value: 0.5,
      enqueuedAt: now(),
    };

    this.dispatchQueue.push(queued);

    // 通知用户任务已入队
    this.pi.events.emit("goal_driven:task_queued", {
      taskId,
      goalId,
      queuePosition: this.dispatchQueue.length,
      estimatedWaitMs: this.dispatchQueue.length * 30000, // 粗略估计
    });
  }

  /**
   * 执行具体任务（内部方法）
   */
  private async executeTask(queued: QueuedTask): Promise<void> {
    const { taskId, goalId, agentPrompt, requiredTools, contextKnowledge, timeoutMs } = queued;

    const startTime = now();

    try {
      // 创建中止控制器
      const abortController = new AbortController();

      // 从 ToolProvider 获取所有可用工具
      const toolProvider = getToolProvider();
      const allTools = toolProvider ? await toolProvider.getToolNames() : requiredTools;

      // 创建后台会话配置
      const sessionConfig: BackgroundSessionConfig = {
        name: `task-${taskId.slice(0, 8)}`,
        taskId,
        goalId,
        tools: allTools, // 使用从 ToolProvider 获取的所有工具
        timeoutMs: timeoutMs ?? this.config.defaultTimeoutMs,
      };

      // 创建后台会话
      const sessionHandle = await this.sessionManager.createSession(sessionConfig);

      // 记录任务状态
      const taskState: RunningTaskState = {
        taskId,
        goalId,
        sessionId: sessionHandle.id,
        startTime,
        timeoutAt: startTime + (timeoutMs ?? this.config.defaultTimeoutMs),
        lastHeartbeat: startTime,
        status: "running",
        abortController,
      };

      this.runningTasks.set(taskId, taskState);

      // 启动心跳检测
      this.startHeartbeatMonitoring(taskId);

      // 构建增强 prompt
      const enhancedPrompt = this.buildEnhancedPrompt(agentPrompt, contextKnowledge, taskId);

      // 在后台会话中执行
      const result = await this.sessionManager.execute(
        sessionHandle,
        enhancedPrompt,
        {
          timeoutMs: timeoutMs ?? this.config.defaultTimeoutMs,
          onOutput: (output) => {
            // 发送进度更新
            this.pi.events.emit("goal_driven:task_progress", {
              taskId,
              progress: this.calculateProgress(output.content),
              message: output.content.slice(0, 200),
              timestamp: now(),
            });
          },
        }
      );

      // 处理成功结果
      await this.handleTaskSuccess(taskId, goalId, result, contextKnowledge);

    } catch (error) {
      console.error(`[AgentPiBackgroundExecutor] Task ${taskId} failed:`, error);

      await logError(error instanceof Error ? error : String(error), "executor_execute", goalId, taskId);

      this.emitTaskResult(taskId, goalId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: now() - startTime,
      });

      this.cleanupTask(taskId);
    }
  }

  /**
   * 处理后台会话事件
   */
  private handleSessionEvent(event: BackgroundSessionEvent): void {
    switch (event.type) {
      case "session_started":
        console.log(`[AgentPiBackgroundExecutor] Session ${event.sessionId} started`);
        break;

      case "output":
        // 更新心跳
        for (const [taskId, state] of this.runningTasks) {
          if (state.sessionId === event.sessionId) {
            state.lastHeartbeat = now();
            break;
          }
        }
        break;

      case "tool_call":
        console.log(`[AgentPiBackgroundExecutor] Tool called: ${event.toolName}`);
        break;

      case "error":
        console.error(`[AgentPiBackgroundExecutor] Session error: ${event.error}`);
        break;

      case "terminated":
        console.log(`[AgentPiBackgroundExecutor] Session terminated: ${event.reason}`);
        break;
    }
  }

  /**
   * 处理任务成功完成
   */
  private async handleTaskSuccess(
    taskId: string,
    goalId: string,
    result: BackgroundSessionResult,
    contextKnowledge?: KnowledgeEntry[]
  ): Promise<void> {
    const state = this.runningTasks.get(taskId);
    if (!state) return;

    // 提取知识条目
    const knowledgeEntries = this.extractKnowledgeFromOutput(
      taskId,
      goalId,
      result.output,
      contextKnowledge
    );

    // 保存知识
    for (const entry of knowledgeEntries) {
      await this.knowledgeStore.save(entry);
    }

    // 发送结果
    this.emitTaskResult(taskId, goalId, {
      success: result.success,
      output: result.output,
      error: result.error,
      duration: result.duration,
      tokenUsage: result.tokenUsage,
      knowledgeEntries,
    });

    await logSystemAction("Task completed", {
      taskId,
      goalId,
      success: result.success,
      duration: result.duration,
    });

    this.cleanupTask(taskId);
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitoring(taskId: string): void {
    const checkInterval = 30000;

    const check = () => {
      const state = this.runningTasks.get(taskId);
      if (!state) return;

      const timeSinceLastHeartbeat = now() - state.lastHeartbeat;

      if (timeSinceLastHeartbeat > this.config.heartbeatTimeoutMs) {
        console.warn(`[AgentPiBackgroundExecutor] Task ${taskId} heartbeat timeout`);
        this.handleTaskTimeout(taskId, "Heartbeat timeout");
        return;
      }

      const timer = setTimeout(check, checkInterval);
      this.heartbeatTimers.set(taskId, timer);
    };

    const timer = setTimeout(check, checkInterval);
    this.heartbeatTimers.set(taskId, timer);
  }

  /**
   * 处理任务超时
   */
  private async handleTaskTimeout(taskId: string, reason: string): Promise<void> {
    const state = this.runningTasks.get(taskId);
    if (!state) return;

    console.error(`[AgentPiBackgroundExecutor] Task ${taskId} ${reason}`);

    // 中止任务
    state.abortController.abort();

    // 终止后台会话
    await this.sessionManager.terminateSession(state.sessionId, reason);

    this.emitTaskResult(taskId, state.goalId, {
      success: false,
      error: `Task ${reason}. The task may have taken too long or become unresponsive.`,
      duration: now() - state.startTime,
    });

    this.cleanupTask(taskId);
  }

  /**
   * 构建增强 prompt
   */
  private buildEnhancedPrompt(
    basePrompt: string,
    knowledgeEntries?: KnowledgeEntry[],
    taskId?: string
  ): string {
    const parts: string[] = [];

    // 添加知识上下文
    if (knowledgeEntries && knowledgeEntries.length > 0) {
      parts.push(`## 相关背景知识`);
      for (const entry of knowledgeEntries.slice(0, 5)) {
        parts.push(`- [${entry.category}] ${entry.content.slice(0, 200)}`);
      }
      parts.push("");
    }

    // 添加任务说明
    parts.push(`## 任务`);
    parts.push(basePrompt);
    parts.push("");

    // 添加输出要求
    parts.push(`## 输出要求`);
    parts.push(`请完成以上任务，并提供清晰、结构化的结果。`);
    parts.push(`完成后，简要总结主要发现和关键信息。`);

    if (taskId) {
      parts.push("");
      parts.push(`<!-- TASK_ID: ${taskId} -->`);
    }

    return parts.join("\n");
  }

  /**
   * 计算进度（简化实现）
   */
  private calculateProgress(output: string): number {
    // 基于输出长度估算进度（简化）
    const maxExpectedLength = 5000;
    const progress = Math.min(100, (output.length / maxExpectedLength) * 100);
    return Math.round(progress);
  }

  /**
   * 从输出中提取知识
   */
  private extractKnowledgeFromOutput(
    taskId: string,
    goalId: string,
    output?: string,
    contextKnowledge?: KnowledgeEntry[]
  ): KnowledgeEntry[] {
    const entries: KnowledgeEntry[] = [];

    if (!output) return entries;

    // 提取关键段落作为知识
    const paragraphs = output
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 50 && p.length < 1000);

    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      entries.push({
        id: `k-${generateId().slice(0, 8)}`,
        goalId,
        taskId,
        content: paragraphs[i],
        category: "task_output",
        tags: ["auto-extracted"],
        importance: 0.7,
        relatedDimensionIds: [],
        createdAt: now(),
      });
    }

    return entries;
  }

  /**
   * 发送任务结果事件
   */
  private emitTaskResult(
    taskId: string,
    goalId: string,
    result: Partial<ExecutionResult>
  ): void {
    const fullResult: TaskResultEvent["payload"] = {
      taskId,
      goalId,
      success: result.success ?? false,
      output: result.output,
      error: result.error,
      duration: result.duration ?? 0,
      tokenUsage: result.tokenUsage,
      knowledgeEntries: result.knowledgeEntries,
      completedAt: now(),
    };

    this.pi.events.emit("goal_driven:task_result", fullResult);
  }

  /**
   * 清理任务资源
   */
  private async cleanupTask(taskId: string): Promise<void> {
    this.clearHeartbeatTimer(taskId);

    const state = this.runningTasks.get(taskId);
    if (state) {
      // 终止后台会话
      await this.sessionManager.terminateSession(state.sessionId, "task_completed");
      this.runningTasks.delete(taskId);
    }

    // 触发队列处理（可能有等待的任务可以派发）
    setTimeout(() => this.processDispatchQueue(), 0);
  }

  /**
   * 清除心跳定时器
   */
  private clearHeartbeatTimer(taskId: string): void {
    const timer = this.heartbeatTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(taskId);
    }
  }

  /**
   * 获取正在运行的任务列表
   */
  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys());
  }

  /**
   * 检查任务是否在运行
   */
  isTaskRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }

  /**
   * 取消正在执行的任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const state = this.runningTasks.get(taskId);
    if (!state) {
      return false;
    }

    // 中止
    state.abortController.abort();

    // 终止会话
    await this.sessionManager.terminateSession(state.sessionId, "user_cancelled");

    this.emitTaskResult(taskId, state.goalId, {
      success: false,
      error: "Task cancelled by user",
      duration: now() - state.startTime,
    });

    this.cleanupTask(taskId);

    await logSystemAction("Task cancelled", { taskId, goalId: state.goalId });

    return true;
  }
}
