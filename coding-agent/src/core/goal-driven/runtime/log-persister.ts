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
  private fd: number | null = null;

  constructor(logPath?: string) {
    // Default path: ~/.pi/agent/goal-driven/logs/background-session.log
    this.logPath = logPath ?? path.join(
      os.homedir(), '.pi', 'agent', 'goal-driven', 'logs', 'background-session.log'
    );
    this.ensureDirectory();
  }

  /**
   * Cleanup file descriptor on garbage collection or explicit destroy
   */
  destroy(): void {
    if (this.fd !== null) {
      try {
        fs.closeSync(this.fd);
      } catch {
        // Ignore close errors
      }
      this.fd = null;
    }
  }

  /**
   * Write log to file with fsync to ensure immediate persistence
   *
   * Using writeSync + fsyncSync instead of appendFileSync to ensure
   * data is flushed to disk immediately, allowing tail -f / less +F
   * to detect file changes in real-time.
   */
  write(log: BackgroundLogPayload): void {
    if (!this.enabled) return;

    try {
      // Open file descriptor on first write (keep it open for performance)
      if (this.fd === null) {
        this.fd = fs.openSync(this.logPath, 'a');
      }

      const logLine = this.formatLogLine(log) + '\n';
      fs.writeSync(this.fd, logLine);
      // Force sync to disk so file watchers can detect changes immediately
      fs.fsyncSync(this.fd);
    } catch {
      // Disable on failure to avoid performance impact
      this.enabled = false;
    }
  }

  /**
   * Format log line for file output
   */
  private formatLogLine(log: BackgroundLogPayload): string {
    const timestamp = new Date(log.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
    const prefix = `[${timestamp}] [${log.level.toUpperCase()}] [${log.source}]`;
    const suffix = log.taskId ? ` [task:${log.taskId.slice(0, 8)}]` : '';
    let line = `${prefix}${suffix} ${log.message}`;

    // For LLM logs, append full data
    if (log.source === 'llm_request' && log.data?.prompt) {
      const content = typeof log.data.prompt === 'string' ? log.data.prompt : '';
      const length = typeof log.data.promptLength === 'number' ? log.data.promptLength : content.length;
      const truncated = log.data.truncated === true;
      line += `\n  PROMPT (${length} chars${truncated ? ', truncated' : ''}):\n${content}`;
    }
    if (log.source === 'llm_response' && log.data?.response) {
      const content = typeof log.data.response === 'string' ? log.data.response : '';
      const length = typeof log.data.responseLength === 'number' ? log.data.responseLength : content.length;
      const truncated = log.data.truncated === true;
      const duration = typeof log.data.duration === 'number' ? log.data.duration : 0;
      line += `\n  RESPONSE (${length} chars${truncated ? ', truncated' : ''}, ${duration}ms):\n${content}`;
    }

    return line;
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
