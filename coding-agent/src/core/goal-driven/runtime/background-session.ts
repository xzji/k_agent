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
import { now, generateId } from "../utils/index.js";
import { logError, logSystemAction } from "../utils/logger.js";
import { SessionLogWriter } from "./session-log-writer.js";

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

  constructor(
    private modelRegistry: ModelRegistry,
    private settingsManager: SettingsManager,
    private resourceLoader: ResourceLoader,
    private agentDir: string,
    private currentModel?: Model<any>
  ) {
    this.sessionLogWriter = new SessionLogWriter(`${agentDir}/session-logs`);
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
    console.log(`[BackgroundSessionManager] 📝 createSession called, taskId: ${config.taskId}, goalId: ${config.goalId}, taskType: ${config.taskType}`);

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

      console.log(`[BackgroundSessionManager] AgentSession created, session.model: ${session.model?.provider}/${session.model?.id}`);

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
    console.log(`[BackgroundSessionManager] 🔥 execute called, sessionId: ${handle.id}, taskId: ${handle.config.taskId}, taskType: ${handle.config.taskType}`);

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
    console.log(`[BackgroundSessionManager] Session ${handle.id} starting with timeout: ${timeoutMs}ms (${timeoutMs/1000}s)`);

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

    // 结束会话日志
    await this.sessionLogWriter.endSession(sessionId);

    // 清理心跳定时器
    if (runningSession.heartbeatTimer) {
      clearInterval(runningSession.heartbeatTimer);
      runningSession.heartbeatTimer = undefined;
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

    console.log(`[BackgroundSessionManager] buildAgentSessionConfig called, currentModel: ${model?.provider}/${model?.id}`);

    if (!model) {
      // 如果没有传入当前模型，尝试获取默认模型
      console.log(`[BackgroundSessionManager] No currentModel, falling back to default settings`);
      const defaultProvider = this.settingsManager.getDefaultProvider();
      const defaultModelId = this.settingsManager.getDefaultModel();
      console.log(`[BackgroundSessionManager] Default from settings: ${defaultProvider}/${defaultModelId}`);
      model =
        defaultProvider && defaultModelId
          ? this.modelRegistry.find(defaultProvider, defaultModelId)
          : undefined;
      console.log(`[BackgroundSessionManager] Resolved model from settings: ${model?.provider}/${model?.id}`);
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
    console.log(`[BackgroundSessionManager] About to create AgentCore with model: ${model.provider}/${model.id}`);
    const agent = new AgentCore({
      initialState: {
        model,
        systemPrompt: config.systemPrompt ?? this.buildDefaultSystemPrompt(),
      },
      // 关键：设置 getApiKey 回调，让 Agent 能够获取 API key
      getApiKey: async (provider: string) => {
        console.log(`[BackgroundSessionManager.Agent.getApiKey] Provider: ${provider}`);
        const key = await this.modelRegistry.getApiKeyForProvider(provider);
        console.log(`[BackgroundSessionManager.Agent.getApiKey] Key: ${key ? `${key.slice(0, 8)}...` : 'NOT FOUND'}`);
        return key;
      },
    });

    console.log(`[BackgroundSessionManager] AgentCore created, agent.state.model: ${agent.state.model?.provider}/${agent.state.model?.id}`);

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
          console.log(`[Session ${sessionId}] 🚀 Agent Started\n`);
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
          console.log(`[Session ${sessionId}] 🏁 Agent Ended, reason: ${reason}`);
          if (error) {
            console.log(`[Session ${sessionId}] ❌ Error: ${JSON.stringify(error)}`);
          }
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'agent_end',
          });
          break;
        }

        case "turn_start": {
          // 实时输出回合开始
          console.log(`\n[Session ${sessionId}] ─── Turn ${turnIndex} ───\n`);
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
            // 增量输出（不换行，保持流式效果）
            process.stdout.write(delta.text);

            // 累积到缓冲区
            const existing = this.messageBuffers.get(sessionId) || '';
            this.messageBuffers.set(sessionId, existing + delta.text);
          }
          break;
        }

        case "content_block_delta": {
          const delta = (event as any).delta;
          if (delta?.text) {
            process.stdout.write(delta.text);

            const existing = this.messageBuffers.get(sessionId) || '';
            this.messageBuffers.set(sessionId, existing + delta.text);
          }
          break;
        }

        case "message_stop": {
          // 消息流结束，输出换行和日志记录
          const fullContent = this.messageBuffers.get(sessionId) || '';
          if (fullContent) {
            console.log('\n');

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
              console.log(`[Session ${sessionId}] 💭 Thinking started...`);
              break;

            case "thinking_delta":
              // 流式输出 thinking 内容
              process.stdout.write(assistantEvent.delta);
              break;

            case "thinking_end":
              console.log(`\n[Session ${sessionId}] 💭 Thinking ended`);
              break;

            case "text_start":
              console.log(`[Session ${sessionId}] 📝 Response started...`);
              break;

            case "text_delta":
              // 流式输出文本内容
              process.stdout.write(assistantEvent.delta);
              break;

            case "text_end":
              console.log(`\n[Session ${sessionId}] 📝 Response ended`);
              break;

            case "toolcall_start":
              console.log(`[Session ${sessionId}] 🔧 Tool call started...`);
              break;

            case "toolcall_delta":
              process.stdout.write(assistantEvent.delta);
              break;

            case "toolcall_end":
              console.log(`\n[Session ${sessionId}] 🔧 Tool call ended: ${assistantEvent.toolName || assistantEvent.toolCall?.tool || 'unknown'}`);
              break;

            case "done":
              console.log(`[Session ${sessionId}] ✅ Message done, reason: ${assistantEvent.reason}`);
              break;

            case "error":
              console.log(`[Session ${sessionId}] ❌ Error: ${assistantEvent.errorMessage}`);
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
            const content = typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content);

            // 对长内容进行截断
            const truncatedContent = content.length > 500
              ? content.slice(0, 500) + '\n... (truncated)'
              : content;

            // 实时输出用户输入
            console.log(`[Session ${sessionId}] 👤 User:\n${truncatedContent}\n`);

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
            console.log(`[Session ${sessionId}] 📝 Processing ${message.role} message`);
            const content = typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content);

            // 实时输出消息
            if (message.role === "assistant") {
              console.log(`[Session ${sessionId}] 🤖 Assistant:\n${content}\n`);
            } else if (message.role === "toolResult") {
              console.log(`[Session ${sessionId}] 📝 Tool Result:\n${content}\n`);
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
            console.log(`[Session ${sessionId}] 🔄 Tool Update (${toolName}): ${partialResult}\n`);
          }
          break;
        }

        case "tool_execution_start": {
          const toolName = (event as any).toolName || "unknown";
          const params = (event as any).args;

          // 实时输出工具调用
          console.log(`[Session ${sessionId}] 🔧 Tool Call: ${toolName}`);
          console.log(`   Params: ${JSON.stringify(params)}\n`);

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

          // 实时输出工具结果
          if (isError) {
            console.log(`[Session ${sessionId}] ❌ Tool Error: ${JSON.stringify(result)}\n`);
          } else {
            const resultStr = JSON.stringify(result);
            const truncatedResult = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
            console.log(`[Session ${sessionId}] ✅ Tool Result: ${truncatedResult}\n`);
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
          // 实时输出回合结束
          console.log(`[Session ${sessionId}] ─── Turn ${turnIndex} Complete ───\n`);

          // 记录日志
          this.sessionLogWriter.addEntry(sessionId, {
            turnIndex,
            type: 'turn_end',
          });

          // 处理结果
          console.log(`[BackgroundSessionManager] Session ${sessionId} received turn_end event`);
          this.handleTurnEnd(sessionId, event as any);
          break;
        }

        case "error": {
          const errorMessage = (event as any).message || "Unknown error";

          // 实时输出错误
          console.log(`[Session ${sessionId}] ❌ Error: ${errorMessage}\n`);

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
    console.log(`[BackgroundSessionManager] 📤 Sending message to Agent Pi`);
    console.log(`[BackgroundSessionManager]    Session: ${sessionId}`);
    console.log(`[BackgroundSessionManager]    Model: ${model?.provider}/${model?.id}`);
    console.log(`[BackgroundSessionManager]    Message:\n${message.slice(0, 1000)}${message.length > 1000 ? '\n... (truncated)' : ''}`);

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

    // 实时输出最终结果
    console.log(`\n[Session ${sessionId}] 📊 Session Complete`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Output: ${finalOutput.slice(0, 200)}${finalOutput.length > 200 ? '...' : ''}\n`);

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
  agentDir: string,
  currentModel?: Model<any>
): BackgroundSessionManager {
  if (!globalBackgroundSessionManager) {
    console.log(`[initBackgroundSessionManager] Creating new singleton with model: ${currentModel?.provider}/${currentModel?.id}`);
    globalBackgroundSessionManager = new BackgroundSessionManager(
      modelRegistry,
      settingsManager,
      resourceLoader,
      agentDir,
      currentModel
    );
  } else if (currentModel) {
    // 更新当前模型以确保与主会话保持一致
    console.log(`[initBackgroundSessionManager] Updating existing singleton model to: ${currentModel.provider}/${currentModel.id}`);
    globalBackgroundSessionManager.setCurrentModel(currentModel);
  } else {
    console.log(`[initBackgroundSessionManager] Returning existing singleton, no model update`);
  }
  return globalBackgroundSessionManager;
}

/**
 * 获取全局后台会话管理器
 */
export function getBackgroundSessionManager(): BackgroundSessionManager | null {
  return globalBackgroundSessionManager;
}
