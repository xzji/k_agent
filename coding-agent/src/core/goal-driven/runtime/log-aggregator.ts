/**
 * Log Aggregator
 *
 * Batches log messages to prevent UI flooding.
 * Instead of sending each log immediately, aggregates them
 * and sends in batches every few seconds.
 */

import type { BackgroundLogPayload, UILogLevel } from "./log-message-types.js";

/**
 * Aggregated log message
 */
export interface AggregatedLogMessage {
  count: number;
  logs: BackgroundLogPayload[];
  startTime: number;
  endTime: number;
}

/**
 * Log Aggregator configuration
 */
export interface LogAggregatorConfig {
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  /** Maximum logs per batch before forced flush */
  maxLogsPerBatch: number;
  /** Minimum log level to display */
  minLevel: UILogLevel;
}

const DEFAULT_CONFIG: LogAggregatorConfig = {
  flushIntervalMs: 3000, // 3 seconds
  maxLogsPerBatch: 20,
  minLevel: 'info',
};

/**
 * Log Aggregator
 *
 * Buffers log messages and flushes them periodically to avoid
 * overwhelming the UI with individual log messages.
 */
export class LogAggregator {
  private buffer: BackgroundLogPayload[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private config: LogAggregatorConfig;
  private onFlush: (message: AggregatedLogMessage) => void;

  constructor(
    onFlush: (message: AggregatedLogMessage) => void,
    config?: Partial<LogAggregatorConfig>
  ) {
    this.onFlush = onFlush;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a log to the buffer
   */
  add(log: BackgroundLogPayload): void {
    // Check minimum level
    if (!this.shouldLog(log.level)) return;

    this.buffer.push(log);

    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }

    // Force flush if buffer is full
    if (this.buffer.length >= this.config.maxLogsPerBatch) {
      this.flush();
    }
  }

  /**
   * Flush the buffer and send aggregated message
   */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    const message: AggregatedLogMessage = {
      count: logs.length,
      logs,
      startTime: logs[0]?.timestamp ?? Date.now(),
      endTime: logs[logs.length - 1]?.timestamp ?? Date.now(),
    };

    this.onFlush(message);
  }

  /**
   * Stop the aggregator and flush remaining logs
   */
  stop(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LogAggregatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if log level should be displayed
   */
  private shouldLog(level: UILogLevel): boolean {
    const levels: UILogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }
}

/**
 * Format log message for display
 */
export function formatLogMessage(log: BackgroundLogPayload): string {
  const levelIcons: Record<string, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  };
  const time = new Date(log.timestamp).toLocaleTimeString();
  const icon = levelIcons[log.level] ?? '📝';
  const taskInfo = log.taskId ? ` [${log.taskId.slice(0, 8)}]` : '';

  return `${icon} \`${time}\` **[${log.source}]**${taskInfo} ${log.message}`;
}

/**
 * Format aggregated log message for display
 */
export function formatAggregatedLogMessage(message: AggregatedLogMessage): string {
  const lines = message.logs.map(formatLogMessage);

  // Group by source for cleaner display
  const sourceGroups: Record<string, BackgroundLogPayload[]> = {};
  for (const log of message.logs) {
    if (!sourceGroups[log.source]) {
      sourceGroups[log.source] = [];
    }
    sourceGroups[log.source].push(log);
  }

  // Build summary
  const summary = Object.entries(sourceGroups)
    .map(([source, logs]) => `${source}: ${logs.length}`)
    .join(', ');

  const header = `📋 **后台任务日志** (${message.count} 条: ${summary})`;

  return `${header}\n\n${lines.join('\n')}`;
}
