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
import type { ExecutionResult, KnowledgeEntry, TaskType } from "../types.js";
import type { UILogger } from "./ui-logger.js";
import type { LogCategory } from "./log-message-types.js";
import type { UILogLevel } from "./log-message-types.js";
import { now, generateId } from "../utils/index.js";
import { logError, logSystemAction } from "../utils/logger.js";
import { SessionLogWriter } from "./session-log-writer.js";

/**
 * Console 输出拦截器
 * 在后台会话执行期间，将 console 输出重定向到 UILogger
 *
 * 用于抑制外部扩展（如 websearch）的 console.error 输出，
 * 防止这些输出破坏 TUI 渲染
 */
class ConsoleInterceptor {
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };
  private uiLogger: UILogger | null;
  private sessionId: string;
  private active: boolean = false;

  constructor(uiLogger: UILogger | null, sessionId: string) {
    this.uiLogger = uiLogger;
    this.sessionId = sessionId;
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };
  }

  /**
   * 开始拦截 console 输出
   */
  start(): void {
    if (this.active) return;
    this.active = true;

    console.log = (...args) => this.redirect('info', 'Console', args);
    console.info = (...args) => this.redirect('info', 'Console', args);
    console.warn = (...args) => this.redirect('warn', 'Console', args);
    console.error = (...args) => this.redirect('error', 'Console', args);
    console.debug = (...args) => this.redirect('debug', 'Console', args);
  }

  /**
   * 停止拦截，恢复原始 console
   */
  stop(): void {
    if (!this.active) return;
    this.active = false;

    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }

  /**
   * 重定向 console 输出到 UILogger
   */
  private redirect(level: UILogLevel, source: string, args: unknown[]): void {
    const message = args.map(arg => {
      if (arg instanceof Error) {
        // 错误对象：只记录消息，不记录完整堆栈
        return `${arg.name}: ${arg.message}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    if (this.uiLogger) {
      this.uiLogger.log(level, source, message);
    }
    // 不输出到原始 console，避免前台显示
  }
}

/**
 * 从 Anthropic 格式的 content 中提取文本
 * 支持: string | ContentBlock[] | undefined
 */
function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((block): block is { type: 'text'; text: string } =>
        block?.type === 'text' && typeof block.text === 'string'
      )
      .map(block => block.text)
      .join('\n');
  }
  return '';
}

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
  /** 任务类型 */
  taskType: TaskType;
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
  | { type: "terminated"; sessionId: string; reason: string }
  | { type: "heartbeat"; sessionId: string; timestamp: number };

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
  heartbeatTimer?: ReturnType<typeof setInterval>;
  consoleInterceptor?: ConsoleInterceptor;
}

/**
 * Pending ask_user request
 */
interface PendingAskUserRequest {
  sessionId: string;
  toolCallId: string;
  question: string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
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
  private sessionLogWriter: SessionLogWriter;
  private messageBuffers = new Map<string, string>();
  private sessionTurnIndex = new Map<string, number>();
  private uiLogger?: UILogger;
  // Pending ask_user requests - maps toolCallId to pending request
  private pendingAskUserRequests = new Map<string, PendingAskUserRequest>();

  constructor(
    private modelRegistry: ModelRegistry,
    private settingsManager: SettingsManager,
    private resourceLoader: ResourceLoader,
    private agentDir: string,
    private currentModel?: Model<any>,
    uiLogger?: UILogger
  ) {
    this.sessionLogWriter = new SessionLogWriter(`${agentDir}/session-logs`);
    this.uiLogger = uiLogger;
  }

  /**
   * 设置 UILogger（用于后续注入）
   */
  setUILogger(logger: UILogger): void {
    this.uiLogger = logger;
  }

  /**
   * 内部日志方法
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    source: string,
    message: string,
    options?: {
      taskId?: string;
      goalId?: string;
      category?: LogCategory;
      data?: Record<string, unknown>;
    }
  ): void {
    if (this.uiLogger) {
      this.uiLogger.log(level, source, message, options);
    } else {
      // Fallback to console.log if UILogger not available
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'debug' ? '🔍' : 'ℹ️';
      console.log(`[BackgroundSessionManager] ${prefix} [${source}] ${message}`);
    }
  }

  /**
   * 设置当前模型（用于与主会话保持同步）
   */
  setCurrentModel(model: Model<any>): void {
    this.currentModel = model;
  }

  /**
   * 创建后台会话
   *
   * 创建一个新的独立会话用于后台任务执行
   */
  async createSession(config: BackgroundSessionConfig): Promise<BackgroundSessionHandle> {
    this.log('info', 'SessionLifecycle', `创建后台会话, taskId: ${config.taskId}, taskType: ${config.taskType}`, {
      taskId: config.taskId,
      goalId: config.goalId,
    });

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

      this.log('debug', 'SessionLifecycle', `AgentSession 创建完成, model: ${session.model?.provider}/${session.model?.id}`);

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

      // 启动会话日志
      this.sessionLogWriter.startSession(sessionId, config.taskId, config.goalId, config.taskType);

      // 设置事件监听
      this.setupSessionListeners(sessionId, session);

      await logSystemAction("Background session created", {
        sessionId,
        taskId: config.taskId,
        goalId: config.goalId,
        taskType: config.taskType,
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
    // DEBUG: 确认 execute 被调用
    this.log('info', 'SessionLifecycle', `执行会话, sessionId: ${handle.id}, taskId: ${handle.config.taskId}`, {
      taskId: handle.config.taskId,
      goalId: handle.config.goalId,
    });

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
    this.log('debug', 'SessionLifecycle', `会话启动, sessionId: ${handle.id}, timeout: ${timeoutMs/1000}s`, {
      taskId: handle.config.taskId,
      goalId: handle.config.goalId,
    });

    // 更新状态
    runningSession.startTime = startTime;
    runningSession.timeoutAt = timeoutAt;
    runningSession.handle.isRunning = true;
    runningSession.handle.status = "running";
    runningSession.outputs = [];

    // 启动心跳 - 每30秒发送一次心跳事件
    const heartbeatIntervalMs = 30000;
    const heartbeatTimer = setInterval(() => {
      if (runningSession.handle.isRunning) {
        this.emitEvent({
          type: "heartbeat" as const,
          sessionId: handle.id,
          timestamp: now(),
        });
      }
    }, heartbeatIntervalMs);
    runningSession.heartbeatTimer = heartbeatTimer;

    // 创建并启动 console 拦截器
    // 将外部扩展的 console 输出重定向到后台日志，避免破坏 TUI 渲染
    const consoleInterceptor = new ConsoleInterceptor(this.uiLogger ?? null, handle.id);
    consoleInterceptor.start();
    runningSession.consoleInterceptor = consoleInterceptor;

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
        // 停止 console 拦截器，恢复原始 console
        if (runningSession.consoleInterceptor) {
          runningSession.consoleInterceptor.stop();
          runningSession.consoleInterceptor = undefined;
        }
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

    // 结束会话日志
    await this.sessionLogWriter.endSession(sessionId);

    // 清理心跳定时器
    if (runningSession.heartbeatTimer) {
      clearInterval(runningSession.heartbeatTimer);
      runningSession.heartbeatTimer = undefined;
    }

    // 停止 console 拦截器
    if (runningSession.consoleInterceptor) {
      runningSession.consoleInterceptor.stop();
      runningSession.consoleInterceptor = undefined;
    }

    // 中止执行
    runningSession.abortController.abort();

    // 更新状态
    runningSession.handle.status = "terminated";
    runningSession.handle.isRunning = false;

    // 清理资源
    this.sessions.delete(sessionId);
    this.sessionManagers.delete(sessionId);
    this.sessionTurnIndex.delete(sessionId);
    this.messageBuffers.delete(sessionId);

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

    // 提取 session 目录（sessionPath 是文件路径，需要提取其所在目录）
    const sessionDir = sessionPath.substring(0, sessionPath.lastIndexOf('/'));

    // 使用 SessionManager.create() 创建新会话
    // 这会自动创建目录和会话文件
    const sessionManager = SessionManagerClass.create(
      config.cwd ?? process.cwd(),
      sessionDir
    );

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

    // 使用当前模型（从主会话传入）或回退到默认模型
    let model = this.currentModel;

    this.log('debug', 'SessionLifecycle', `buildAgentSessionConfig, model: ${model?.provider}/${model?.id}`);

    if (!model) {
      // 如果没有传入当前模型，尝试获取默认模型
      this.log('debug', 'SessionLifecycle', 'No currentModel, falling back to default settings');
      const defaultProvider = this.settingsManager.getDefaultProvider();
      const defaultModelId = this.settingsManager.getDefaultModel();
      this.log('debug', 'SessionLifecycle', `Default from settings: ${defaultProvider}/${defaultModelId}`);
      model =
        defaultProvider && defaultModelId
          ? this.modelRegistry.find(defaultProvider, defaultModelId)
          : undefined;
      this.log('debug', 'SessionLifecycle', `Resolved model from settings: ${model?.provider}/${model?.id}`);
    }

    if (!model) {
      throw new Error("No model configured. Please use /model to select a model first.");
    }

    // 检查 API key 是否配置
    const apiKey = await this.modelRegistry.getApiKey(model);
    if (!apiKey) {
      const isOAuth = this.modelRegistry.isUsingOAuth(model);
      if (isOAuth) {
        throw new Error(
          `Authentication required for "${model.provider}". ` +
          `Please run '/login ${model.provider}' to authenticate.`
        );
      }
      throw new Error(
        `No API key found for ${model.provider} (${model.id}).\n\n` +
        `Please use /login ${model.provider} or set the appropriate environment variable.`
      );
    }

    // 创建 Agent 核心 - 必须通过 initialState 传入 model 和 systemPrompt
    // 同时设置 getApiKey 回调，让 Agent 能够获取 API key
    this.log('debug', 'SessionLifecycle', `创建 AgentCore, model: ${model.provider}/${model.id}`);
    const agent = new AgentCore({
      initialState: {
        model,
        systemPrompt: config.systemPrompt ?? this.buildDefaultSystemPrompt(),
      },
      // 关键：设置 getApiKey 回调，让 Agent 能够获取 API key
      getApiKey: async (provider: string) => {
        this.log('debug', 'SessionLifecycle', `Agent.getApiKey, provider: ${provider}`);
        const key = await this.modelRegistry.getApiKeyForProvider(provider);
        this.log('debug', 'SessionLifecycle', `Agent.getApiKey result: ${key ? 'found' : 'NOT FOUND'}`);
        return key;
      },
    });

    this.log('debug', 'SessionLifecycle', `AgentCore 创建完成, model: ${agent.state.model?.provider}/${agent.state.model?.id}`);

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
    // AgentSession 使用 subscribe 方法订阅所有事件
    session.subscribe((event) => {
      // 从 turn_start/turn_end 事件更新 turnIndex
      if (event.type === 'turn_start' || event.type === 'turn_end') {
        const eventTurnIndex = (event as any).turnIndex ?? 0;
        this.sessionTurnIndex.set(sessionId, eventTurnIndex);
      }

      // 使用跟踪的 turnIndex
      const turnIndex = this.sessionTurnIndex.get(sessionId) ?? 0;

      switch (event.type) {
        case "agent_start": {
          // Agent 启动
          this.log('info', 'SessionLifecycle', `Agent 启动, sessionId: ${sessionId}`);
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'agent_start',
          });
          break;
        }

        case "agent_end": {
          // Agent 结束
          const reason = (event as any).reason || "completed";
          const error = (event as any).error;
          this.log('info', 'SessionLifecycle', `Agent 结束, sessionId: ${sessionId}, reason: ${reason}`);
          if (error) {
            this.log('error', 'SessionLifecycle', `Agent 错误: ${JSON.stringify(error)}`, { data: { error } });
          }
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'agent_end',
          });
          break;
        }

        case "turn_start": {
          // 输出回合分隔线
          this.log('info', 'TurnEvent', `───────────────── Turn ${turnIndex} ─────────────────`);
          this.log('debug', 'TurnEvent', `sessionId: ${sessionId}`);
          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'turn_start',
          });
          break;
        }

        // 流式增量消息处理
        case "message_delta": {
          const delta = (event as any).delta;
          if (delta?.text) {
            // 累积到缓冲区（不输出到前台，只在后台记录）
            const existing = this.messageBuffers.get(sessionId) || '';
            this.messageBuffers.set(sessionId, existing + delta.text);
          }
          break;
        }

        case "content_block_delta": {
          const delta = (event as any).delta;
          if (delta?.text) {
            // 累积到缓冲区（不输出到前台，只在后台记录）
            const existing = this.messageBuffers.get(sessionId) || '';
            this.messageBuffers.set(sessionId, existing + delta.text);
          }
          break;
        }

        case "message_stop": {
          // 消息流结束，输出换行和日志记录
          const fullContent = this.messageBuffers.get(sessionId) || '';
          if (fullContent) {
            this.log('debug', 'LLMStream', `消息流结束, 长度: ${fullContent.length}`);

            this.sessionLogWriter.addEntry(sessionId, {
              turnIndex,
              type: 'message',
              role: 'assistant',
              content: fullContent,
            });
          }
          this.messageBuffers.delete(sessionId);
          break;
        }

        case "message_update": {
          // 处理流式消息更新（thinking, text 等）
          const assistantEvent = (event as any).assistantMessageEvent;
          if (!assistantEvent) break;

          switch (assistantEvent.type) {
            case "thinking_start":
              this.log('debug', 'LLMStream', `Thinking 开始, sessionId: ${sessionId}`);
              break;

            case "thinking_delta":
              // 不输出到前台，只在后台记录
              break;

            case "thinking_end":
              this.log('debug', 'LLMStream', `Thinking 结束, sessionId: ${sessionId}`);
              break;

            case "text_start":
              this.log('debug', 'LLMStream', `响应开始, sessionId: ${sessionId}`);
              break;

            case "text_delta":
              // 不输出到前台，只在后台记录
              break;

            case "text_end":
              this.log('debug', 'LLMStream', `响应结束, sessionId: ${sessionId}`);
              break;

            case "toolcall_start":
              this.log('debug', 'LLMStream', `Tool call 开始, sessionId: ${sessionId}`);
              break;

            case "toolcall_delta":
              // 不输出到前台，只在后台记录
              break;

            case "toolcall_end":
              this.log('debug', 'LLMStream', `Tool call 结束: ${assistantEvent.toolName || assistantEvent.toolCall?.tool || 'unknown'}`);
              break;

            case "done":
              this.log('debug', 'LLMStream', `消息完成, reason: ${assistantEvent.reason}`);
              break;

            case "error":
              this.log('error', 'LLMStream', `错误: ${assistantEvent.errorMessage}`);
              break;
          }
          break;
        }

        case "message_end":
        case "message": {
          // 只处理完整的消息（避免重复显示）
          const message = (event as any).message;

          // 处理用户输入（task prompt）
          if (message && message.role === "user") {
            const content = extractTextContent(message.content);

            // 对长内容进行截断
            const truncatedContent = content.length > 500
              ? content.slice(0, 500) + '\n... (truncated)'
              : content;

            // 记录用户输入
            this.log('debug', 'LLMStream', `用户输入: ${truncatedContent}`);

            // 记录日志
            this.sessionLogWriter.addEntry(sessionId, {
              turnIndex,
              type: 'message',
              role: 'user',
              content,
            });
          }
          // 处理 assistant 和 toolResult 消息
          else if (message && (message.role === "assistant" || message.role === "toolResult")) {
            this.log('debug', 'LLMStream', `处理 ${message.role} 消息`);
            const content = extractTextContent(message.content);

            // 记录消息
            if (message.role === "assistant") {
              this.log('debug', 'LLMStream', `Assistant: ${content.slice(0, 200)}...`);
            } else if (message.role === "toolResult") {
              this.log('debug', 'ToolExecution', `Tool Result: ${content.slice(0, 200)}...`);
            }

            const output: BackgroundSessionOutput = {
              content,
              type: "text",
              timestamp: now(),
            };
            this.addSessionOutput(sessionId, output);

            // 记录日志
            this.sessionLogWriter.addEntry(sessionId, {
              turnIndex,
              type: 'message',
              role: message.role as 'assistant' | 'toolResult',
              content,
            });
          }
          break;
        }

        case "tool_execution_update": {
          // 工具执行过程中的更新
          const toolName = (event as any).toolName || "unknown";
          const partialResult = (event as any).partialResult || (event as any).content;
          if (partialResult) {
            this.log('debug', 'ToolExecution', `Tool 更新 (${toolName}): ${partialResult}`);
          }
          break;
        }

        case "tool_execution_start": {
          const toolName = (event as any).toolName || "unknown";
          const params = (event as any).args;
          const toolCallId = (event as any).toolCallId || (event as any).tool?.id || generateId();

          // 记录工具调用
          this.log('info', 'ToolExecution', `Tool Call: ${toolName}`, {
            data: { params },
          });

          // Special handling for ask_user tool
          if (toolName === "ask_user") {
            this.handleAskUserTool(sessionId, toolCallId, params);
            // Don't emit the normal tool_call event for ask_user - we handle it specially
            break;
          }

          this.emitEvent({
            type: "tool_call",
            sessionId,
            toolName,
            params,
          });

          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'tool_call',
            toolName,
            params,
          });
          break;
        }

        case "tool_execution_end": {
          const toolName = (event as any).toolName || "unknown";
          const result = (event as any).result;
          const isError = (event as any).isError;

          // 记录工具结果
          if (isError) {
            this.log('error', 'ToolExecution', `Tool 错误: ${JSON.stringify(result)}`);
          } else {
            const resultStr = JSON.stringify(result);
            const truncatedResult = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
            this.log('info', 'ToolExecution', `Tool 结果: ${truncatedResult}`);
          }

          this.emitEvent({
            type: "tool_result",
            sessionId,
            toolName,
            result,
          });

          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'tool_result',
            toolName,
            result,
            isError,
          });
          break;
        }

        case "turn_end": {
          // 回合结束
          this.log('debug', 'TurnEvent', `Turn ${turnIndex} 结束, sessionId: ${sessionId}`);

          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'turn_end',
          });

          // 处理结果
          this.log('debug', 'SessionLifecycle', `Session ${sessionId} received turn_end event`);
          this.handleTurnEnd(sessionId, event as any);
          break;
        }

        case "error": {
          const errorMessage = (event as any).message || "Unknown error";

          // 记录错误
          this.log('error', 'SessionLifecycle', `错误: ${errorMessage}`, {
            category: 'important',
          });

          this.emitEvent({
            type: "error",
            sessionId,
            error: errorMessage,
          });

          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'error',
            content: errorMessage,
          });
          break;
        }

        default: {
          // 未识别的事件类型，记录调试信息
          // 可以取消注释下面的行来调试未知事件
          // console.log(`[Session ${sessionId}] ❓ Unknown event: ${event.type}`);
          break;
        }
      }
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

    const model = runningSession.session.model;
    this.log('debug', 'SessionLifecycle', `发送消息到 Agent Pi, sessionId: ${sessionId}, model: ${model?.provider}/${model?.id}`);

    await runningSession.session.prompt(message, {
      expandPromptTemplates: true,
      source: "background_task",
    });
  }

  /**
   * 处理回合结束
   */
  private async handleTurnEnd(sessionId: string, event: { type: "turn_end" }): Promise<void> {
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

    // 记录最终结果
    this.log('info', 'SessionLifecycle', `会话完成, sessionId: ${sessionId}, success: ${result.success}, duration: ${result.duration}ms`);

    runningSession.handle.status = "completed";
    runningSession.handle.isRunning = false;

    // 清理心跳定时器
    if (runningSession.heartbeatTimer) {
      clearInterval(runningSession.heartbeatTimer);
      runningSession.heartbeatTimer = undefined;
    }

    // 添加最终结果到日志
    this.sessionLogWriter.setFinalResult(sessionId, {
      success: result.success,
      output: result.output,
      duration: result.duration,
      completedAt: result.completedAt,
    });

    // 结束会话日志
    await this.sessionLogWriter.endSession(sessionId);

    // 清理 turnIndex 和 messageBuffers
    this.sessionTurnIndex.delete(sessionId);
    this.messageBuffers.delete(sessionId);

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
        this.log('error', 'SessionLifecycle', `Error in event listener: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * 处理 ask_user 工具调用
   * 向用户显示问题并等待响应
   */
  private handleAskUserTool(sessionId: string, toolCallId: string, params: unknown): void {
    const askParams = params as { question: string; context?: string; options?: string[] };
    const question = askParams?.question || "请提供您的回复";
    const context = askParams?.context;
    const options = askParams?.options;

    this.log('info', 'ToolExecution', `ask_user: ${question}`);

    // Store pending request
    const pendingRequest: PendingAskUserRequest = {
      sessionId,
      toolCallId,
      question,
      resolve: () => {}, // Will be replaced
      reject: () => {},   // Will be replaced
    };

    // Create a promise that can be resolved externally
    const promise = new Promise<string>((resolve, reject) => {
      pendingRequest.resolve = resolve;
      pendingRequest.reject = reject;
    });

    this.pendingAskUserRequests.set(toolCallId, pendingRequest);

    // Emit event to show question in foreground
    // The extension will listen for this and display the question to the user
    this.emitEvent({
      type: "tool_call",
      sessionId,
      toolName: "ask_user",
      params: { question, context, options, toolCallId },
    });

    // 发送重要日志到前台显示问题
    this.log('info', 'ActionRequired', `❓ ${question}`, {
      taskId: this.sessions.get(sessionId)?.handle.taskId,
      goalId: this.sessions.get(sessionId)?.handle.goalId,
      category: 'important',
      data: { toolCallId, context, options },
    });
  }

  /**
   * 处理 ask_user 工具的用户响应
   * 由 extension.ts 在用户回复后调用
   */
  resolveAskUserResponse(toolCallId: string, response: string): void {
    const pending = this.pendingAskUserRequests.get(toolCallId);
    if (pending) {
      this.log('info', 'ToolExecution', `ask_user resolved: ${response.slice(0, 50)}...`);
      pending.resolve(response);
      this.pendingAskUserRequests.delete(toolCallId);
    } else {
      this.log('warn', 'ToolExecution', `No pending ask_user request found for toolCallId: ${toolCallId}`);
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
- Indicate completion with clear status

## 输出格式要求

完成任务后，请在回复末尾使用以下格式标记关键发现：

\`\`\`key_findings
- [关键发现1：简洁描述最重要的发现]
- [关键发现2：次要发现或数据]
- [关键发现3：其他重要信息]
\`\`\`

注意：
- 每条发现控制在一句话内（不超过100字）
- 只标记对用户有价值的信息，跳过过程性描述
- 如果没有重要发现，可以省略此部分`;
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
  agentDir: string,
  currentModel?: Model<any>,
  uiLogger?: UILogger
): BackgroundSessionManager {
  if (!globalBackgroundSessionManager) {
    globalBackgroundSessionManager = new BackgroundSessionManager(
      modelRegistry,
      settingsManager,
      resourceLoader,
      agentDir,
      currentModel,
      uiLogger
    );
  } else if (currentModel) {
    // 更新当前模型以确保与主会话保持一致
    globalBackgroundSessionManager.setCurrentModel(currentModel);
    if (uiLogger) {
      globalBackgroundSessionManager.setUILogger(uiLogger);
    }
  }
  return globalBackgroundSessionManager;
}

/**
 * 获取全局后台会话管理器
 */
export function getBackgroundSessionManager(): BackgroundSessionManager | null {
  return globalBackgroundSessionManager;
}
