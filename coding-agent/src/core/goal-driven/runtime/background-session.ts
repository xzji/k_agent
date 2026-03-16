/**
 * Background Session Manager for Goal-Driven Agent
 *
 * 提供独立后台会话能力，允许任务在隔离环境中执行
 *
 * 基于 Agent Pi 的现有架构：
 * - AgentSession: 核心会话抽象
 * - SessionManager: 会话文件管理
 * - RPC Mode: headless 操作协议
 *
 * 新增 API:
 * - createBackgroundSession: 创建后台会话
 * - sendToBackgroundSession: 发送消息到后台会话
 * - terminateBackgroundSession: 终止后台会话
 * - getBackgroundSessionOutput: 获取会话输出
 */

import type { AgentSession, AgentSessionConfig } from "../../agent-session.js";
import type { SessionManager } from "../../session-manager.js";
import type { ModelRegistry } from "../../model-registry.js";
import type { SettingsManager } from "../../settings-manager.js";
import type { ResourceLoader } from "../resource-loader.js";
import type { ExecutionResult, KnowledgeEntry } from "../types.js";
import { now, generateId } from "../utils/index.js";
import { logError, logSystemAction } from "../utils/logger.js";

/**
 * 后台会话配置
 */
export interface BackgroundSessionConfig {
  /** 会话名称 */
  name: string;
  /** 关联的任务 ID */
  taskId: string;
  /** 关联的目标 ID */
  goalId: string;
  /** 可用工具列表 */
  tools: string[];
  /** 系统提示词 */
  systemPrompt?: string;
  /** 工作目录 */
  cwd?: string;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
}

/**
 * 后台会话句柄
 */
export interface BackgroundSessionHandle {
  /** 会话 ID */
  id: string;
  /** 会话文件路径 */
  sessionPath: string;
  /** 创建时间 */
  createdAt: number;
  /** 配置 */
  config: BackgroundSessionConfig;
  /** 当前状态 */
  status: "idle" | "running" | "completed" | "failed" | "terminated";
  /** 是否正在运行 */
  isRunning: boolean;
}

/**
 * 后台会话输出
 */
export interface BackgroundSessionOutput {
  /** 输出内容 */
  content: string;
  /** 输出类型 */
  type: "text" | "tool_call" | "tool_result" | "error";
  /** 时间戳 */
  timestamp: number;
  /** 关联的工具调用 ID（如果有） */
  toolCallId?: string;
}

/**
 * 后台会话结果
 */
export interface BackgroundSessionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  output?: string;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** Token 使用量 */
  tokenUsage?: number;
  /** 提取的知识条目 */
  knowledgeEntries?: KnowledgeEntry[];
  /** 完成时间 */
  completedAt: number;
}

/**
 * 后台会话事件
 */
export type BackgroundSessionEvent =
  | { type: "session_started"; sessionId: string; timestamp: number }
  | { type: "output"; sessionId: string; output: BackgroundSessionOutput }
  | { type: "tool_call"; sessionId: string; toolName: string; params: unknown }
  | { type: "tool_result"; sessionId: string; toolName: string; result: unknown }
  | { type: "completed"; sessionId: string; result: BackgroundSessionResult }
  | { type: "error"; sessionId: string; error: string }
  | { type: "terminated"; sessionId: string; reason: string };

/**
 * 运行中会话状态
 */
interface RunningSession {
  handle: BackgroundSessionHandle;
  session: AgentSession;
  startTime: number;
  timeoutAt: number;
  outputs: BackgroundSessionOutput[];
  abortController: AbortController;
  eventListeners: Array<(event: BackgroundSessionEvent) => void>;
}

/**
 * 后台会话管理器
 *
 * 管理独立后台会话的生命周期和执行
 */
export class BackgroundSessionManager {
  private sessions = new Map<string, RunningSession>();
  private sessionManagers = new Map<string, SessionManager>();
  private eventListeners: Array<(event: BackgroundSessionEvent) => void> = [];

  constructor(
    private modelRegistry: ModelRegistry,
    private settingsManager: SettingsManager,
    private resourceLoader: ResourceLoader,
    private agentDir: string
  ) {}

  /**
   * 创建后台会话
   *
   * 创建一个新的独立会话用于后台任务执行
   */
  async createSession(config: BackgroundSessionConfig): Promise<BackgroundSessionHandle> {
    const sessionId = `bg-${config.taskId.slice(0, 8)}-${generateId().slice(0, 8)}`;
    const sessionPath = `${this.agentDir}/sessions/${sessionId}.jsonl`;

    try {
      // 创建独立的 SessionManager
      const sessionManager = await this.createSessionManager(sessionPath, config);
      this.sessionManagers.set(sessionId, sessionManager);

      // 创建 AgentSession 配置
      const agentConfig = await this.buildAgentSessionConfig(sessionManager, config);

      // 动态导入 AgentSession 避免循环依赖
      const { AgentSession: AgentSessionClass } = await import("../../agent-session.js");
      const session = new AgentSessionClass(agentConfig);

      // 创建句柄
      const handle: BackgroundSessionHandle = {
        id: sessionId,
        sessionPath,
        createdAt: now(),
        config,
        status: "idle",
        isRunning: false,
      };

      // 存储运行中状态
      const runningSession: RunningSession = {
        handle,
        session,
        startTime: 0,
        timeoutAt: 0,
        outputs: [],
        abortController: new AbortController(),
        eventListeners: [],
      };

      this.sessions.set(sessionId, runningSession);

      // 设置事件监听
      this.setupSessionListeners(sessionId, session);

      await logSystemAction("Background session created", {
        sessionId,
        taskId: config.taskId,
        goalId: config.goalId,
      });

      this.emitEvent({ type: "session_started", sessionId, timestamp: now() });

      return handle;
    } catch (error) {
      await logError(
        error instanceof Error ? error : String(error),
        "background_session_create",
        config.goalId,
        config.taskId
      );
      throw new Error(
        `Failed to create background session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 在后台会话中执行消息
   *
   * 发送消息到后台会话并触发执行
   */
  async execute(
    handle: BackgroundSessionHandle,
    message: string,
    options?: {
      timeoutMs?: number;
      onOutput?: (output: BackgroundSessionOutput) => void;
      onComplete?: (result: BackgroundSessionResult) => void;
    }
  ): Promise<BackgroundSessionResult> {
    const runningSession = this.sessions.get(handle.id);
    if (!runningSession) {
      throw new Error(`Session not found: ${handle.id}`);
    }

    if (runningSession.handle.isRunning) {
      throw new Error(`Session ${handle.id} is already running`);
    }

    const startTime = now();
    const timeoutMs = options?.timeoutMs ?? handle.config.timeoutMs ?? 600000;
    const timeoutAt = startTime + timeoutMs;

    // 更新状态
    runningSession.startTime = startTime;
    runningSession.timeoutAt = timeoutAt;
    runningSession.handle.isRunning = true;
    runningSession.handle.status = "running";
    runningSession.outputs = [];

    // 设置输出监听
    if (options?.onOutput) {
      const outputHandler = (event: BackgroundSessionEvent) => {
        if (event.type === "output") {
          options.onOutput!(event.output);
        }
      };
      runningSession.eventListeners.push(outputHandler);
      this.eventListeners.push(outputHandler);
    }

    return new Promise((resolve, reject) => {
      const { abortController } = runningSession;

      // 设置超时
      const timeoutTimer = setTimeout(() => {
        this.terminateSession(handle.id, "timeout");
        reject(new Error(`Session ${handle.id} timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // 监听完成
      const completionHandler = (event: BackgroundSessionEvent) => {
        if (event.type === "completed" && event.sessionId === handle.id) {
          cleanup();
          options?.onComplete?.(event.result);
          resolve(event.result);
        } else if (event.type === "error" && event.sessionId === handle.id) {
          cleanup();
          reject(new Error(event.error));
        } else if (event.type === "terminated" && event.sessionId === handle.id) {
          cleanup();
          reject(new Error(`Session terminated: ${event.reason}`));
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutTimer);
        this.eventListeners = this.eventListeners.filter((l) => l !== completionHandler);
        runningSession.handle.isRunning = false;
      };

      this.eventListeners.push(completionHandler);

      // 监听中止信号
      abortController.signal.addEventListener("abort", () => {
        cleanup();
        reject(new Error("Session aborted"));
      });

      // 发送消息执行
      this.sendMessageToSession(handle.id, message).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  /**
   * 终止后台会话
   */
  async terminateSession(sessionId: string, reason: string = "user_request"): Promise<void> {
    const runningSession = this.sessions.get(sessionId);
    if (!runningSession) {
      return;
    }

    // 中止执行
    runningSession.abortController.abort();

    // 更新状态
    runningSession.handle.status = "terminated";
    runningSession.handle.isRunning = false;

    // 清理资源
    this.sessions.delete(sessionId);
    this.sessionManagers.delete(sessionId);

    this.emitEvent({
      type: "terminated",
      sessionId,
      reason,
    });

    await logSystemAction("Background session terminated", { sessionId, reason });
  }

  /**
   * 获取会话输出
   */
  getSessionOutputs(sessionId: string): BackgroundSessionOutput[] {
    const runningSession = this.sessions.get(sessionId);
    return runningSession ? [...runningSession.outputs] : [];
  }

  /**
   * 获取所有运行中会话
   */
  getRunningSessions(): BackgroundSessionHandle[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.handle.isRunning)
      .map((s) => ({ ...s.handle }));
  }

  /**
   * 订阅会话事件
   */
  onEvent(listener: (event: BackgroundSessionEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /**
   * 创建 SessionManager
   */
  private async createSessionManager(
    sessionPath: string,
    config: BackgroundSessionConfig
  ): Promise<SessionManager> {
    // 动态导入 SessionManager
    const { SessionManager: SessionManagerClass } = await import("../../session-manager.js");

    const sessionManager = new SessionManagerClass(
      config.cwd ?? process.cwd(),
      sessionPath,
      this.agentDir
    );

    // 初始化会话文件
    await sessionManager.initialize(config.name);

    return sessionManager;
  }

  /**
   * 构建 AgentSession 配置
   */
  private async buildAgentSessionConfig(
    sessionManager: SessionManager,
    config: BackgroundSessionConfig
  ): Promise<AgentSessionConfig> {
    const { Agent: AgentCore } = await import("@mariozechner/pi-agent-core");

    // 获取默认模型
    const defaultProvider = this.settingsManager.getDefaultProvider();
    const defaultModelId = this.settingsManager.getDefaultModel();
    const model =
      defaultProvider && defaultModelId
        ? this.modelRegistry.find(defaultProvider, defaultModelId)
        : undefined;

    if (!model) {
      throw new Error("No default model configured");
    }

    // 创建 Agent 核心
    const agent = new AgentCore({
      model,
      systemPrompt: config.systemPrompt ?? this.buildDefaultSystemPrompt(),
    });

    return {
      agent,
      sessionManager,
      settingsManager: this.settingsManager,
      cwd: config.cwd ?? process.cwd(),
      resourceLoader: this.resourceLoader,
      modelRegistry: this.modelRegistry,
      initialActiveToolNames: config.tools,
    };
  }

  /**
   * 设置会话事件监听
   */
  private setupSessionListeners(sessionId: string, session: AgentSession): void {
    // 监听 Agent 事件
    session.on("message", (event) => {
      if (event.type === "message") {
        const output: BackgroundSessionOutput = {
          content: typeof event.message.content === "string" ? event.message.content : "",
          type: "text",
          timestamp: now(),
        };
        this.addSessionOutput(sessionId, output);
      }
    });

    session.on("tool_execution_start", (event) => {
      this.emitEvent({
        type: "tool_call",
        sessionId,
        toolName: event.toolCall.tool,
        params: event.toolCall.params,
      });
    });

    session.on("tool_execution_end", (event) => {
      this.emitEvent({
        type: "tool_result",
        sessionId,
        toolName: event.toolCall.tool,
        result: event.result,
      });
    });

    session.on("turn_end", (event) => {
      // 回合结束，处理结果
      this.handleTurnEnd(sessionId, event);
    });

    session.on("error", (event) => {
      this.emitEvent({
        type: "error",
        sessionId,
        error: event.message,
      });
    });
  }

  /**
   * 发送消息到会话
   */
  private async sendMessageToSession(sessionId: string, message: string): Promise<void> {
    const runningSession = this.sessions.get(sessionId);
    if (!runningSession) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await runningSession.session.prompt(message, {
      expandPromptTemplates: true,
      source: "background_task",
    });
  }

  /**
   * 处理回合结束
   */
  private handleTurnEnd(sessionId: string, event: { type: "turn_end" }): void {
    const runningSession = this.sessions.get(sessionId);
    if (!runningSession) return;

    const duration = now() - runningSession.startTime;
    const outputs = runningSession.outputs;

    // 提取最终结果
    const finalOutput = outputs
      .filter((o) => o.type === "text")
      .map((o) => o.content)
      .join("\n");

    const result: BackgroundSessionResult = {
      success: true,
      output: finalOutput,
      duration,
      completedAt: now(),
    };

    runningSession.handle.status = "completed";
    runningSession.handle.isRunning = false;

    this.emitEvent({
      type: "completed",
      sessionId,
      result,
    });
  }

  /**
   * 添加会话输出
   */
  private addSessionOutput(sessionId: string, output: BackgroundSessionOutput): void {
    const runningSession = this.sessions.get(sessionId);
    if (runningSession) {
      runningSession.outputs.push(output);
      this.emitEvent({
        type: "output",
        sessionId,
        output,
      });
    }
  }

  /**
   * 发射事件
   */
  private emitEvent(event: BackgroundSessionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    }
  }

  /**
   * 构建默认系统提示词
   */
  private buildDefaultSystemPrompt(): string {
    return `You are an autonomous task execution agent running in background mode.

Your responsibilities:
1. Execute tasks efficiently without user interaction
2. Use available tools to gather information and perform actions
3. Provide clear, structured results
4. Report progress and completion status

Guidelines:
- Be concise but thorough
- Use tools when needed, don't rely solely on training data
- Structure output for easy parsing
- Indicate completion with clear status`;
  }
}

/**
 * 全局后台会话管理器实例
 */
let globalBackgroundSessionManager: BackgroundSessionManager | null = null;

/**
 * 初始化全局后台会话管理器
 */
export function initBackgroundSessionManager(
  modelRegistry: ModelRegistry,
  settingsManager: SettingsManager,
  resourceLoader: ResourceLoader,
  agentDir: string
): BackgroundSessionManager {
  if (!globalBackgroundSessionManager) {
    globalBackgroundSessionManager = new BackgroundSessionManager(
      modelRegistry,
      settingsManager,
      resourceLoader,
      agentDir
    );
  }
  return globalBackgroundSessionManager;
}

/**
 * 获取全局后台会话管理器
 */
export function getBackgroundSessionManager(): BackgroundSessionManager | null {
  return globalBackgroundSessionManager;
}
