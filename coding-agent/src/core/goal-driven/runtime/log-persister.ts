/**
 * Log Persister - File-based Log Persistence
 *
 * Writes background logs to file for later troubleshooting.
 * Logs are appended in real-time.
 * CLI restart does NOT load history into memory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BackgroundLogPayload } from "./log-message-types.js";

/**
 * File-based log persistence
 *
 * Writes logs to ~/.pi/agent/goal-driven/logs/background-session.log
 */
export class LogPersister {
  private logPath: string;
  private enabled: boolean = true;

  constructor(logPath?: string) {
    // Default path: ~/.pi/agent/goal-driven/logs/background-session.log
    this.logPath = logPath ?? path.join(
      os.homedir(), '.pi', 'agent', 'goal-driven', 'logs', 'background-session.log'
    );
    this.ensureDirectory();
  }

  /**
   * Write log to file
   */
  write(log: BackgroundLogPayload): void {
    if (!this.enabled) return;

    try {
      const logLine = this.formatLogLine(log);
      fs.appendFileSync(this.logPath, logLine + '\n');
    } catch {
      // Disable on failure to avoid performance impact
      this.enabled = false;
    }
  }

  /**
   * Format log line for file output
   */
  private formatLogLine(log: BackgroundLogPayload): string {
    const timestamp = new Date(log.timestamp).toISOString();
    const prefix = `[${timestamp}] [${log.level.toUpperCase()}] [${log.source}]`;
    const suffix = log.taskId ? ` [task:${log.taskId.slice(0, 8)}]` : '';
    return `${prefix}${suffix} ${log.message}`;
  }

  /**
   * Ensure log directory exists
   */
  private ensureDirectory(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Check if persistence is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable persistence
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable persistence
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Clear the log file
   *
   * Removes all historical logs from the log file.
   * Returns the number of bytes freed, or -1 on error.
   */
  clear(): number {
    try {
      if (!fs.existsSync(this.logPath)) {
        return 0;
      }

      const stats = fs.statSync(this.logPath);
      const freedBytes = stats.size;

      // Truncate the file to zero length
      fs.truncateSync(this.logPath, 0);

      return freedBytes;
    } catch {
      return -1;
    }
  }
}
