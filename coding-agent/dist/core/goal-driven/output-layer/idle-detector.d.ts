/**
 * IdleDetector — Monitors user activity to determine when to deliver notifications
 *
 * Design constraints (from implementation review):
 * - Extension API has no raw terminal input events
 * - Uses `input` event (user submits a message) to mark activity
 * - Uses `agent_start`/`agent_end` events to mark agent busy state
 * - User is considered idle when:
 *   1. No input event for >= idleThreshold (default 5 minutes)
 *   2. Agent is not busy (not streaming a response)
 * - Urgent notifications reduce the threshold to urgentThreshold (default 1 minute)
 */
export interface IdleDetectorConfig {
    /** Idle threshold in ms. Default: 5 minutes */
    idleThreshold?: number;
    /** Urgent idle threshold in ms. Default: 1 minute */
    urgentThreshold?: number;
    /** Check interval in ms. Default: 30 seconds */
    checkInterval?: number;
}
export declare class IdleDetector {
    private lastActivityAt;
    private agentBusy;
    private checkTimer;
    private onIdleCallback;
    private idleThreshold;
    private urgentThreshold;
    private checkInterval;
    constructor(config?: IdleDetectorConfig);
    /**
     * Update configuration dynamically
     */
    setConfig(config: Partial<IdleDetectorConfig>): void;
    /**
     * Start monitoring for idle state
     */
    start(onIdle: () => void): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Record user activity (called on `input` event from Extension API)
     */
    recordActivity(): void;
    /**
     * Set agent busy state (called on `agent_start` / `agent_end` events)
     */
    setAgentBusy(busy: boolean): void;
    /**
     * Check if user is currently idle
     * Idle = not active for threshold AND agent is not busy
     */
    isIdle(hasUrgent?: boolean): boolean;
    /**
     * Get time since last activity in ms
     */
    getIdleDuration(): number;
    /**
     * Internal check — fires the idle callback if conditions are met
     */
    private checkIdle;
}
//# sourceMappingURL=idle-detector.d.ts.map