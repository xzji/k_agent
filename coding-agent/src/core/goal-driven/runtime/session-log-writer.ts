/**
 * Session Log Writer
 *
 * 负责将后台会话的交互日志持久化到文件
 */

import { now } from '../utils/index.js';
import { logError } from '../utils/logger.js';

/**
 * 单条日志条目
 */
export interface RoundLogEntry {
  /** 回合索引 */
  turnIndex: number;
  /** 时间戳 */
  timestamp: number;
  /** 日志类型 */
  type: 'turn_start' | 'message' | 'tool_call' | 'tool_result' | 'turn_end' | 'error';
  /** 消息角色 */
  role?: 'assistant' | 'user' | 'toolResult';
  /** 消息内容 */
  content?: string;
  /** 工具名称 */
  toolName?: string;
  /** 工具参数 */
  params?: unknown;
  /** 工具结果 */
  result?: unknown;
  /** 是否错误 */
  isError?: boolean;
}

/**
 * 完整会话日志
 */
export interface SessionLog {
  /** 会话 ID */
  sessionId: string;
  /** 任务 ID */
  taskId: string;
  /** 目标 ID */
  goalId: string;
  /** 任务类型（组合标签） */
  taskType: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 日志条目 */
  rounds: RoundLogEntry[];
  /** 最终执行结果 */
  finalResult?: {
    success: boolean;
    output: string;
    duration: number;
    completedAt: number;
  };
}

/**
 * 会话日志写入器
 *
 * 将每个后台会话的完整交互记录保存到 JSONL 文件
 */
export class SessionLogWriter {
  private logs = new Map<string, SessionLog>();
  private logDir: string;

  constructor(logDir: string) {
    this.logDir = logDir;
  }

  /**
   * 开始新的会话日志
   */
  startSession(sessionId: string, taskId: string, goalId: string, taskType: string): void {
    this.logs.set(sessionId, {
      sessionId,
      taskId,
      goalId,
      taskType,
      startTime: now(),
      rounds: [],
    });
  }

  /**
   * 添加日志条目
   */
  addEntry(sessionId: string, entry: Omit<RoundLogEntry, 'timestamp'>): void {
    const log = this.logs.get(sessionId);
    if (log) {
      log.rounds.push({ ...entry, timestamp: now() });
    }
  }

  /**
   * 结束会话并写入文件
   */
  async endSession(sessionId: string): Promise<void> {
    const log = this.logs.get(sessionId);
    if (!log) return;

    log.endTime = now();

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 确保目录存在
      await fs.mkdir(this.logDir, { recursive: true });

      // 写入 JSONL 文件
      const filename = path.join(this.logDir, `session-${sessionId}.jsonl`);
      await fs.writeFile(filename, JSON.stringify(log) + '\n', { flag: 'a' });
    } catch (error) {
      await logError(
        error instanceof Error ? error : String(error),
        'session_log_write',
        log.goalId,
        log.taskId
      );
    }

    this.logs.delete(sessionId);
  }

  /**
   * 获取当前会话日志
   */
  getSessionLog(sessionId: string): SessionLog | undefined {
    return this.logs.get(sessionId);
  }

  /**
   * 设置最终执行结果
   */
  setFinalResult(sessionId: string, result: {
    success: boolean;
    output: string;
    duration: number;
    completedAt: number;
  }): void {
    const log = this.logs.get(sessionId);
    if (log) {
      log.finalResult = result;
    }
  }
}
