/**
 * Background Log View - TUI Component
 *
 * Displays background session logs in a full-screen overlay view.
 * - Shows historical logs when opened
 * - Auto-scrolls to bottom for new logs
 * - Supports scrolling up/down with arrow keys
 * - Closes on Escape or q
 */

import type { BackgroundLogPayload } from "./log-message-types.js";

/**
 * TUI interface for requesting re-render
 */
interface TUI {
  requestRender: (force?: boolean) => void;
}

/**
 * Log callback function type
 */
type LogCallback = (log: BackgroundLogPayload) => void;

/**
 * Background log view component interface (returned by the custom UI factory)
 */
export interface BackgroundLogViewHandle {
  render: (width: number, height: number) => string[];
  invalidate: () => void;
  handleInput: (data: string) => boolean;
  dispose: () => void;
}

/**
 * Background log view component
 *
 * Creates a TUI component that displays background session logs.
 * Used with ctx.ui.custom() to create an overlay view.
 */
export class BackgroundLogView {
  private logs: BackgroundLogPayload[] = [];
  private scrollOffset: number = 0;
  private disposed: boolean = false;
  private unsubscribe?: () => void;
  private tui?: TUI;

  constructor(
    private initialLogs: BackgroundLogPayload[],
    private onNewLog: (callback: LogCallback) => () => void
  ) {
    this.logs = [...initialLogs];
    // Scroll to bottom initially
    this.scrollOffset = 0;
  }

  /**
   * Create the component handle for use with ctx.ui.custom()
   */
  createHandle(
    tui: TUI,
    theme: { fg?: (color: string, text: string) => string; bold?: (text: string) => string; style?: (styles: string[], text: string) => string },
    done: () => void
  ): BackgroundLogViewHandle {
    // Store TUI reference for real-time updates
    this.tui = tui;

    // Helper functions for theming (with fallbacks)
    const fg = (color: string, text: string) => theme.fg?.(color, text) ?? text;
    const bold = (text: string) => theme.bold?.(text) ?? text;
    const styleFn = (styles: string[], text: string) => theme.style?.(styles, text) ?? text;

    // Subscribe to new logs
    this.unsubscribe = this.onNewLog((log) => this.addLog(log));

    return {
      render: (width: number, height: number) => this.render(width, height, { fg, bold, style: styleFn }),
      invalidate: () => {
        // Triggered by TUI framework when re-render is needed
      },
      handleInput: (data: string) => this.handleInput(data, done),
      dispose: () => this.dispose(),
    };
  }

  /**
   * Add a new log to the view
   */
  addLog(log: BackgroundLogPayload): void {
    if (this.disposed) return;

    this.logs.push(log);

    // Auto-scroll to bottom if user is at the bottom
    // Always request re-render to show new logs
    if (this.scrollOffset === 0) {
      // Request TUI to re-render
      this.tui?.requestRender();
    }
  }

  /**
   * Render the component
   * @param width - Terminal width
   * @param height - Terminal height (full screen)
   */
  private render(
    width: number,
    height: number,
    theme: { fg: (color: string, text: string) => string; bold: (text: string) => string; style: (styles: string[], text: string) => string }
  ): string[] {
    // Fallback functions if theme methods are not available
    const fg = theme.fg ?? ((_color: string, text: string) => text);
    const bold = theme.bold ?? ((text: string) => text);
    const styleFn = theme.style ?? ((_styles: string[], text: string) => text);
    const lines: string[] = [];
    const usableWidth = width - 4;

    // Title bar
    const title = fg("accent", bold("📋 后台日志视图 (按 cmd+b 或 Escape 返回前台)"));
    lines.push(title);
    lines.push(fg("dim", "─".repeat(Math.max(0, usableWidth))));

    // Calculate visible log range
    const totalLogs = this.logs.length;
    const visibleHeight = height - 4; // Leave room for title, separator, and status

    // Get visible logs (accounting for scroll offset)
    const startIndex = Math.max(0, totalLogs - this.scrollOffset - visibleHeight);
    const endIndex = Math.max(0, totalLogs - this.scrollOffset);
    const visibleLogs = this.logs.slice(startIndex, endIndex);

    // Render logs
    for (const log of visibleLogs) {
      // 为 system_action 添加上分隔线
      if (log.source === 'system_action') {
        lines.push(fg("dim", "─".repeat(Math.max(0, usableWidth))));
      }

      const time = new Date(log.timestamp).toLocaleTimeString();
      const levelIcon = this.getLevelIcon(log.level);
      const source = log.source.length > 15 ? log.source.slice(0, 15) + "..." : log.source;
      const message = log.message.length > usableWidth - 25 ? log.message.slice(0, usableWidth - 25) + "..." : log.message;

      const line = `${levelIcon} ${time} [${source}] ${message}`;
      const coloredLine = this.colorizeLine(line, log.level, theme);
      lines.push(coloredLine.slice(0, Math.max(0, usableWidth)));

      // For LLM logs, expand to show full data
      if (log.source === 'llm_request' && log.data?.prompt) {
        const promptLines = this.formatLLMData(log.data, 'request', usableWidth, theme);
        lines.push(...promptLines);
      }
      if (log.source === 'llm_response' && log.data?.response) {
        const responseLines = this.formatLLMData(log.data, 'response', usableWidth, theme);
        lines.push(...responseLines);
      }

      // 为 system_action 添加下分隔线
      if (log.source === 'system_action') {
        lines.push(fg("dim", "─".repeat(Math.max(0, usableWidth))));
      }
    }

    // Fill remaining space if needed
    while (lines.length < height - 2) {
      lines.push("");
    }

    // Status bar
    lines.push(fg("dim", "─".repeat(Math.max(0, usableWidth))));
    const statusText = `日志数: ${totalLogs} | ↑↓滚动 | q/Escape关闭`;
    lines.push(fg("muted", statusText.slice(0, Math.max(0, usableWidth))));

    return lines;
  }

  /**
   * Format LLM data for display
   */
  private formatLLMData(
    data: Record<string, unknown>,
    type: 'request' | 'response',
    width: number,
    theme: { fg: (color: string, text: string) => string; style: (styles: string[], text: string) => string }
  ): string[] {
    const lines: string[] = [];
    const indent = "  ";
    const contentWidth = width - indent.length - 2;

    const content = type === 'request' ? data.prompt : data.response;
    const length = typeof data.promptLength === 'number' ? data.promptLength : (typeof data.responseLength === 'number' ? data.responseLength : 0);
    const truncated = data.truncated === true;
    const duration = type === 'response' ? data.duration : undefined;

    // Header
    const header = type === 'request'
      ? `📤 PROMPT (${length} chars${truncated ? ', truncated' : ''})`
      : `📥 RESPONSE (${length} chars${truncated ? ', truncated' : ''}${duration ? `, ${duration}ms` : ''})`;
    lines.push(theme.fg("dim", indent + "┌─ " + header));

    // Content
    if (typeof content === 'string') {
      const contentLines = content.split('\n');
      for (const contentLine of contentLines.slice(0, 20)) { // Limit to 20 lines
        const truncatedLine = contentLine.length > contentWidth ? contentLine.slice(0, contentWidth) + "…" : contentLine;
        lines.push(theme.fg("muted", indent + "│ " + truncatedLine));
      }
      if (contentLines.length > 20) {
        lines.push(theme.fg("muted", indent + `│ ... (${contentLines.length - 20} more lines)`));
      }
    }

    // Footer
    lines.push(theme.fg("dim", indent + "└─" + "─".repeat(Math.min(30, contentWidth))));

    return lines;
  }

  /**
   * Colorize log line based on level
   */
  private colorizeLine(
    line: string,
    level: string,
    theme: { fg: (color: string, text: string) => string; style: (styles: string[], text: string) => string }
  ): string {
    switch (level) {
      case 'error':
        return theme.fg("error", line);
      case 'warn':
        return theme.fg("warning", line);
      case 'info':
        return theme.fg("info", line);
      case 'debug':
        return theme.fg("muted", line);
      default:
        return line;
    }
  }

  /**
   * Get icon for log level
   */
  private getLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return icons[level] ?? '📝';
  }

  /**
   * Handle keyboard input
   */
  private handleInput(data: string, done: () => void): boolean {
    // Escape or q to close
    if (data === '\x1b' || data === 'q') {
      this.dispose();
      done();
      return true;
    }

    // Up arrow to scroll up (show older logs)
    if (data === '\x1b[A') {
      this.scrollOffset = Math.min(this.logs.length - 1, this.scrollOffset + 1);
      this.invalidateCallback?.();
      return true;
    }

    // Down arrow to scroll down (show newer logs)
    if (data === '\x1b[B') {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      this.invalidateCallback?.();
      return true;
    }

    // Page up
    if (data === '\x1b[5~') {
      this.scrollOffset = Math.min(this.logs.length - 1, this.scrollOffset + 10);
      this.invalidateCallback?.();
      return true;
    }

    // Page down
    if (data === '\x1b[6~') {
      this.scrollOffset = Math.max(0, this.scrollOffset - 10);
      this.invalidateCallback?.();
      return true;
    }

    // Home to go to latest
    if (data === '\x1b[H' || data === '\x1b[1~') {
      this.scrollOffset = 0;
      this.invalidateCallback?.();
      return true;
    }

    return false;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disposed = true;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}
