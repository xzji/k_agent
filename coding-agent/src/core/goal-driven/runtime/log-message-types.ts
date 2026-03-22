/**
 * Background Log Message Types
 *
 * Defines types for log messages sent from background tasks to the UI.
 * This avoids console.log interfering with TUI rendering.
 */

/**
 * UI log levels
 */
export type UILogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log category for filtering
 * - 'important': Important logs shown in foreground view
 * - 'normal': Normal logs only shown in background view
 */
export type LogCategory = 'important' | 'normal';

/**
 * Background log payload
 */
export interface BackgroundLogPayload {
  /** Log level */
  level: UILogLevel;
  /** Log source (e.g., "AgentPiExecutor", "BackgroundSession") */
  source: string;
  /** Log message */
  message: string;
  /** Associated task ID */
  taskId?: string;
  /** Associated goal ID */
  goalId?: string;
  /** Timestamp */
  timestamp: number;
  /** Structured data */
  data?: Record<string, unknown>;
  /** Log category for filtering */
  category?: LogCategory;
  /** Only show in background log view, never in foreground */
  backgroundOnly?: boolean;
}

/**
 * Log message event
 */
export interface BackgroundLogEvent {
  type: "goal_driven:background_log";
  payload: BackgroundLogPayload;
}

/**
 * Type guard for BackgroundLogPayload
 */
export function isBackgroundLogPayload(payload: unknown): payload is BackgroundLogPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.level === 'string' &&
    typeof p.source === 'string' &&
    typeof p.message === 'string' &&
    typeof p.timestamp === 'number'
  );
}
