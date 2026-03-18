/**
 * UI Logger for Background Tasks
 *
 * Sends log messages to the UI via EventBus instead of console.log,
 * avoiding TUI rendering interference.
 *
 * Log Categories:
 * - 'important': Shown in foreground view (user-facing key information)
 * - 'normal': Only shown in background log view (technical details)
 */

import type { UILogLevel, LogCategory, BackgroundLogPayload } from "./log-message-types.js";
import type { GoalDrivenLogger } from "../utils/logger.js";

/**
 * UI Logger configuration
 */
export interface UILoggerConfig {
  /** Minimum log level to display */
  minLevel: UILogLevel;
  /** Log source filter (only show logs from these sources) */
  sourceFilter?: string[];
  /** Whether to also write to file logger */
  writeFileLog: boolean;
}

const DEFAULT_CONFIG: UILoggerConfig = {
  minLevel: 'info',
  writeFileLog: true,
};

/**
 * UI Logger
 *
 * Sends background task logs to the foreground chat area for display,
 * avoiding console.log interfering with TUI.
 */
export class UILogger {
  private config: UILoggerConfig;
  private eventBus: { emit: (type: string, payload: unknown) => void };
  private fileLogger?: GoalDrivenLogger;

  constructor(
    eventBus: { emit: (type: string, payload: unknown) => void },
    fileLogger?: GoalDrivenLogger,
    config?: Partial<UILoggerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = eventBus;
    this.fileLogger = fileLogger;
  }

  /**
   * Log a message
   */
  log(
    level: UILogLevel,
    source: string,
    message: string,
    options?: {
      taskId?: string;
      goalId?: string;
      data?: Record<string, unknown>;
      /** Log category - 'important' shows in foreground, 'normal' only in background */
      category?: LogCategory;
    }
  ): void {
    // Check log level
    if (!this.shouldLog(level)) return;

    // Check source filter
    if (this.config.sourceFilter && !this.config.sourceFilter.includes(source)) {
      return;
    }

    const payload: BackgroundLogPayload = {
      level,
      source,
      message,
      timestamp: Date.now(),
      taskId: options?.taskId,
      goalId: options?.goalId,
      data: options?.data,
      category: options?.category,
    };

    // Send to UI via EventBus
    this.eventBus.emit("goal_driven:background_log", payload);

    // Optionally write to file logger (skip - file logging is handled separately by GoalDrivenLogger)
    // Note: We don't call fileLogger.log() here because:
    // 1. The event handler in extension.ts already persists logs via logPersister
    // 2. GoalDrivenLogger has different signature (level, category, message) vs UILogger (level, source, message)
    // 3. Avoid duplicate log entries
  }

  /**
   * Log debug message
   */
  debug(source: string, message: string, options?: {
    taskId?: string;
    goalId?: string;
    data?: Record<string, unknown>;
    category?: LogCategory;
  }): void {
    this.log('debug', source, message, options);
  }

  /**
   * Log info message
   */
  info(source: string, message: string, options?: {
    taskId?: string;
    goalId?: string;
    data?: Record<string, unknown>;
    category?: LogCategory;
  }): void {
    this.log('info', source, message, options);
  }

  /**
   * Log warning message
   */
  warn(source: string, message: string, options?: {
    taskId?: string;
    goalId?: string;
    data?: Record<string, unknown>;
    category?: LogCategory;
  }): void {
    this.log('warn', source, message, options);
  }

  /**
   * Log error message
   */
  error(source: string, message: string, options?: {
    taskId?: string;
    goalId?: string;
    data?: Record<string, unknown>;
    category?: LogCategory;
  }): void {
    this.log('error', source, message, options);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UILoggerConfig>): void {
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
