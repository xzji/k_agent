/**
 * Goal-Driven Agent Logger
 *
 * Provides structured logging for debugging and monitoring:
 * - Daily log file rotation
 * - Log levels: debug, info, warn, error
 * - Categories: user_input, system_action, llm_request, llm_response, task_event, error
 * - Structured JSON format for easy parsing
 */

import { join } from 'node:path';
import { mkdir, appendFile, readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory =
  | 'user_input'      // 用户输入
  | 'system_action'   // 系统操作
  | 'llm_request'     // LLM 请求
  | 'llm_response'    // LLM 响应
  | 'task_event'      // 任务事件
  | 'goal_event'      // 目标事件
  | 'scheduler_event' // 调度器事件
  | 'notification'    // 通知
  | 'error';          // 错误

interface LogEntry {
  timestamp: string;      // ISO 8601 格式
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;  // 结构化数据
  goalId?: string;        // 关联的目标ID
  taskId?: string;        // 关联的任务ID
  duration?: number;      // 操作耗时(ms)
}

export type LLMLogMode = 'minimal' | 'standard' | 'verbose';

interface LoggerOptions {
  logDir: string;         // 日志目录
  maxDays?: number;       // 保留天数，默认7天
  consoleOutput?: boolean; // 是否同时输出到控制台，默认true
  minLevel?: LogLevel;    // 最低日志级别，默认debug
  llmLogMode?: LLMLogMode; // LLM日志详细程度，默认minimal
  eventBus?: { emit: (type: string, payload: unknown) => void }; // 事件总线，用于发送日志到后台视图
}

export class GoalDrivenLogger {
  private logDir: string;
  private maxDays: number;
  private consoleOutput: boolean;
  private minLevel: LogLevel;
  private llmLogMode: LLMLogMode;
  private currentDate: string;
  private logFilePath: string;
  private writeQueue: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private eventBus?: { emit: (type: string, payload: unknown) => void };

  constructor(options: LoggerOptions) {
    this.logDir = options.logDir;
    this.maxDays = options.maxDays ?? 7;
    this.consoleOutput = options.consoleOutput ?? true;
    this.minLevel = options.minLevel ?? 'debug';
    this.llmLogMode = options.llmLogMode ?? 'minimal';
    this.currentDate = this.getCurrentDate();
    this.logFilePath = join(this.logDir, `goal-driven-${this.currentDate}.log`);
    this.eventBus = options.eventBus;
  }

  /**
   * 初始化日志系统
   */
  async init(): Promise<void> {
    // 创建日志目录
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
    }

    // 清理旧日志
    await this.cleanupOldLogs();

    // 写入启动标记
    await this.writeEntry({
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      level: 'info',
      category: 'system_action',
      message: 'Goal-Driven Logger initialized',
      data: { logDir: this.logDir, maxDays: this.maxDays },
    });
  }

  /**
   * 记录用户输入
   */
  async logUserInput(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.info('user_input', `User: ${message}`, data);
  }

  /**
   * 记录系统操作
   */
  async logSystemAction(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.info('system_action', message, data);
  }

  /**
   * 更新 LLM 日志模式（用于运行时配置更新）
   */
  setLLMLogMode(mode: LLMLogMode): void {
    this.llmLogMode = mode;
  }

  /**
   * 记录 LLM 请求 - 支持详细模式
   */
  async logLLMRequest(
    prompt: string,
    options?: Record<string, unknown>,
    goalId?: string,
    taskId?: string
  ): Promise<void> {
    const mode = this.llmLogMode;

    // 根据模式决定记录内容
    let promptData: Record<string, unknown>;
    if (mode === 'minimal') {
      promptData = {
        prompt: prompt.slice(0, 200),
        promptLength: prompt.length,
        truncated: prompt.length > 200,
      };
    } else if (mode === 'standard') {
      promptData = {
        prompt: prompt.slice(0, 1000),
        promptLength: prompt.length,
        truncated: prompt.length > 1000,
      };
    } else {
      // verbose - 完整记录
      promptData = {
        prompt,
        promptLength: prompt.length,
      };
    }

    await this.info('llm_request', 'LLM Request', {
      ...promptData,
      ...options,
    }, goalId, taskId);

    // verbose 模式下在控制台输出完整 prompt
    if (mode === 'verbose' && this.consoleOutput) {
      const model = options?.model ?? 'unknown';
      const provider = options?.provider ?? 'unknown';
      const promptLength = prompt.length;

      console.log('\n' + '='.repeat(80));
      console.log('📤 LLM REQUEST');
      console.log(`🤖 Model: ${model} | Provider: ${provider} | Length: ${promptLength} chars`);
      if (goalId) console.log(`🎯 Goal: ${goalId.slice(0, 8)}`);
      if (taskId) console.log(`📋 Task: ${taskId.slice(0, 8)}`);
      console.log('='.repeat(80));
      console.log(prompt);
      console.log('='.repeat(80) + '\n');
    }
  }

  /**
   * 记录 LLM 响应 - 支持详细模式
   */
  async logLLMResponse(
    response: string,
    duration: number,
    goalId?: string,
    taskId?: string
  ): Promise<void> {
    const mode = this.llmLogMode;

    // 根据模式决定记录内容
    let responseData: Record<string, unknown>;
    if (mode === 'minimal') {
      responseData = {
        response: response.slice(0, 200),
        responseLength: response.length,
        truncated: response.length > 200,
        duration,
      };
    } else if (mode === 'standard') {
      responseData = {
        response: response.slice(0, 1000),
        responseLength: response.length,
        truncated: response.length > 1000,
        duration,
      };
    } else {
      // verbose - 完整记录
      responseData = {
        response,
        responseLength: response.length,
        duration,
      };
    }

    await this.info('llm_response', 'LLM Response', responseData, goalId, taskId);

    // verbose 模式下在控制台输出完整 response
    if (mode === 'verbose' && this.consoleOutput) {
      const responseLength = response.length;

      console.log('\n' + '='.repeat(80));
      console.log('📥 LLM RESPONSE');
      console.log(`⏱️  Duration: ${duration}ms | Length: ${responseLength} chars`);
      if (goalId) console.log(`🎯 Goal: ${goalId.slice(0, 8)}`);
      if (taskId) console.log(`📋 Task: ${taskId.slice(0, 8)}`);
      console.log('='.repeat(80));
      console.log(response);
      console.log('='.repeat(80) + '\n');
    }
  }

  /**
   * 记录任务事件
   */
  async logTaskEvent(message: string, taskId: string, goalId: string, data?: Record<string, unknown>): Promise<void> {
    await this.info('task_event', message, { taskId, goalId, ...data }, goalId, taskId);
  }

  /**
   * 记录目标事件
   */
  async logGoalEvent(message: string, goalId: string, data?: Record<string, unknown>): Promise<void> {
    await this.info('goal_event', message, { goalId, ...data }, goalId);
  }

  /**
   * 记录调度器事件
   */
  async logSchedulerEvent(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.info('scheduler_event', message, data);
  }

  /**
   * 记录通知
   */
  async logNotification(title: string, content: string, goalId?: string, taskId?: string): Promise<void> {
    await this.info('notification', `Notification: ${title}`, { title, content: content.slice(0, 500) }, goalId, taskId);
  }

  /**
   * 记录错误
   */
  async logError(error: Error | string, category: LogCategory = 'error', goalId?: string, taskId?: string, context?: Record<string, unknown>): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    await this.error(category, `Error: ${errorMessage}`, {
      error: errorMessage,
      stack: errorStack,
      ...context,
    }, goalId, taskId);
  }

  /**
   * 通用日志方法
   */
  async debug(category: LogCategory, message: string, data?: Record<string, unknown>, goalId?: string, taskId?: string): Promise<void> {
    await this.log('debug', category, message, data, goalId, taskId);
  }

  async info(category: LogCategory, message: string, data?: Record<string, unknown>, goalId?: string, taskId?: string): Promise<void> {
    await this.log('info', category, message, data, goalId, taskId);
  }

  async warn(category: LogCategory, message: string, data?: Record<string, unknown>, goalId?: string, taskId?: string): Promise<void> {
    await this.log('warn', category, message, data, goalId, taskId);
  }

  async error(category: LogCategory, message: string, data?: Record<string, unknown>, goalId?: string, taskId?: string): Promise<void> {
    await this.log('error', category, message, data, goalId, taskId);
  }

  /**
   * 核心日志记录方法
   */
  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    goalId?: string,
    taskId?: string
  ): Promise<void> {
    // 检查日志级别
    if (!this.shouldLog(level)) return;

    // 检查是否需要切换日志文件（日期变更）
    const today = this.getCurrentDate();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFilePath = join(this.logDir, `goal-driven-${this.currentDate}.log`);
      await this.cleanupOldLogs();
    }

    const entry: LogEntry = {
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      level,
      category,
      message,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
      ...(goalId ? { goalId } : {}),
      ...(taskId ? { taskId } : {}),
    };

    await this.writeEntry(entry);

    // 发送事件到后台日志视图
    if (this.eventBus) {
      this.eventBus.emit("goal_driven:background_log", {
        level,
        source: category,
        message,
        timestamp: Date.now(),
        goalId,
        taskId,
        data,
        category: level === 'error' || level === 'warn' ? 'important' : 'normal',
      });
    }

    // 控制台输出
    if (this.consoleOutput) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`;
      const suffix = goalId ? ` (goal: ${goalId.slice(0, 8)})` : '';
      const formatted = `${prefix}${suffix} ${message}`;

      // 系统操作日志添加分隔线
      if (category === 'system_action') {
        console.log('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');
      }

      switch (level) {
        case 'debug':
          console.log(`\x1b[36m${formatted}\x1b[0m`); // 青色
          break;
        case 'info':
          console.log(`\x1b[32m${formatted}\x1b[0m`); // 绿色
          break;
        case 'warn':
          console.warn(`\x1b[33m${formatted}\x1b[0m`); // 黄色
          break;
        case 'error':
          console.error(`\x1b[31m${formatted}\x1b[0m`); // 红色
          break;
      }

      // 系统操作日志添加分隔线
      if (category === 'system_action') {
        console.log('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');
      }
    }
  }

  /**
   * 写入日志条目
   */
  private async writeEntry(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    this.writeQueue.push(line);

    // 批量写入，减少 IO
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 100);
    }

    // 队列过大时立即写入
    if (this.writeQueue.length >= 50) {
      await this.flush();
    }
  }

  /**
   * 刷新日志队列到文件
   */
  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.writeQueue.length === 0) return;

    const lines = this.writeQueue.splice(0, this.writeQueue.length);
    try {
      await appendFile(this.logFilePath, lines.join(''), 'utf-8');
    } catch {
      // Silently fail - can't log if logger fails
    }
  }

  /**
   * 获取当前日期字符串 (YYYY-MM-DD)
   */
  private getCurrentDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * 清理旧日志文件
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await readdir(this.logDir);
      const now = Date.now();
      const maxAge = this.maxDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.startsWith('goal-driven-') || !file.endsWith('.log')) continue;

        const filePath = join(this.logDir, file);
        const stats = await stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          await unlink(filePath);
        }
      }
    } catch {
      // Silently fail - can't log if logger fails
    }
  }

  /**
   * 关闭日志系统，确保所有数据写入
   */
  async close(): Promise<void> {
    await this.flush();
  }

  /**
   * 获取当前日志文件路径
   */
  getCurrentLogFile(): string {
    return this.logFilePath;
  }

  /**
   * 读取今天的日志内容
   */
  async readTodayLogs(): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(this.logFilePath, 'utf-8');
    } catch {
      return '';
    }
  }
}

// 全局日志实例
let globalLogger: GoalDrivenLogger | null = null;

/**
 * 获取全局日志实例
 */
export function getGlobalLogger(): GoalDrivenLogger | null {
  return globalLogger;
}

/**
 * 设置全局日志实例
 */
export function setGlobalLogger(logger: GoalDrivenLogger): void {
  globalLogger = logger;
}

/**
 * 便捷函数：记录用户输入
 */
export async function logUserInput(message: string, data?: Record<string, unknown>): Promise<void> {
  await globalLogger?.logUserInput(message, data);
}

/**
 * 便捷函数：记录系统操作
 */
export async function logSystemAction(message: string, data?: Record<string, unknown>): Promise<void> {
  await globalLogger?.logSystemAction(message, data);
}

/**
 * 便捷函数：记录 LLM 请求
 */
export async function logLLMRequest(prompt: string, options?: Record<string, unknown>, goalId?: string, taskId?: string): Promise<void> {
  await globalLogger?.logLLMRequest(prompt, options, goalId, taskId);
}

/**
 * 便捷函数：记录 LLM 响应
 */
export async function logLLMResponse(response: string, duration: number, goalId?: string, taskId?: string): Promise<void> {
  await globalLogger?.logLLMResponse(response, duration, goalId, taskId);
}

/**
 * 便捷函数：记录任务事件
 */
export async function logTaskEvent(message: string, taskId: string, goalId: string, data?: Record<string, unknown>): Promise<void> {
  await globalLogger?.logTaskEvent(message, taskId, goalId, data);
}

/**
 * 便捷函数：记录目标事件
 */
export async function logGoalEvent(message: string, goalId: string, data?: Record<string, unknown>): Promise<void> {
  await globalLogger?.logGoalEvent(message, goalId, data);
}

/**
 * 便捷函数：记录错误
 */
export async function logError(error: Error | string, category?: LogCategory, goalId?: string, taskId?: string, context?: Record<string, unknown>): Promise<void> {
  await globalLogger?.logError(error, category ?? 'error', goalId, taskId, context);
}
