/**
 * Log Buffer - Memory Log Buffer for View Switching
 *
 * Stores recent background logs in memory for display when switching views.
 * Used to show historical logs when opening the background log view.
 */

import type { BackgroundLogPayload } from "./log-message-types.js";

export interface LogBufferConfig {
  /** Maximum number of logs to keep */
  maxSize: number;
}

/**
 * Memory log buffer
 *
 * Stores recent background logs for view switching.
 * When capacity is exceeded, oldest logs are removed.
 */
export class LogBuffer {
  private buffer: BackgroundLogPayload[] = [];
  private config: LogBufferConfig;

  constructor(config?: Partial<LogBufferConfig>) {
    this.config = {
      maxSize: 200,
      ...config,
    };
  }

  /**
   * Add a log to the buffer
   */
  add(log: BackgroundLogPayload): void {
    this.buffer.push(log);

    // Remove oldest when exceeding max capacity
    if (this.buffer.length > this.config.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get all logs in buffer
   */
  getAll(): BackgroundLogPayload[] {
    return [...this.buffer];
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Get configuration
   */
  getConfig(): LogBufferConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LogBufferConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
