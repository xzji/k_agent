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

export class IdleDetector {
	private lastActivityAt: number = Date.now();
	private agentBusy = false;
	private checkTimer: ReturnType<typeof setInterval> | null = null;
	private onIdleCallback: (() => void) | null = null;

	private idleThreshold: number;
	private urgentThreshold: number;
	private checkInterval: number;

	constructor(config: IdleDetectorConfig = {}) {
		this.idleThreshold = config.idleThreshold ?? 5 * 60 * 1000;
		this.urgentThreshold = config.urgentThreshold ?? 60 * 1000;
		this.checkInterval = config.checkInterval ?? 30 * 1000;
	}

	/**
	 * Update configuration dynamically
	 */
	setConfig(config: Partial<IdleDetectorConfig>): void {
		if (config.idleThreshold !== undefined) this.idleThreshold = config.idleThreshold;
		if (config.urgentThreshold !== undefined) this.urgentThreshold = config.urgentThreshold;
		if (config.checkInterval !== undefined) {
			this.checkInterval = config.checkInterval;
			// Restart timer with new interval if already running
			if (this.checkTimer && this.onIdleCallback) {
				clearInterval(this.checkTimer);
				this.checkTimer = setInterval(() => this.checkIdle(), this.checkInterval);
			}
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): IdleDetectorConfig {
		return {
			idleThreshold: this.idleThreshold,
			urgentThreshold: this.urgentThreshold,
			checkInterval: this.checkInterval,
		};
	}

	/**
	 * Start monitoring for idle state
	 */
	start(onIdle: () => void): void {
		this.onIdleCallback = onIdle;
		this.lastActivityAt = Date.now();

		if (this.checkTimer) {
			clearInterval(this.checkTimer);
		}

		this.checkTimer = setInterval(() => this.checkIdle(), this.checkInterval);
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.checkTimer) {
			clearInterval(this.checkTimer);
			this.checkTimer = null;
		}
		this.onIdleCallback = null;
	}

	/**
	 * Record user activity (called on `input` event from Extension API)
	 */
	recordActivity(): void {
		this.lastActivityAt = Date.now();
	}

	/**
	 * Set agent busy state (called on `agent_start` / `agent_end` events)
	 */
	setAgentBusy(busy: boolean): void {
		this.agentBusy = busy;
		// When agent finishes, mark it as a "last activity" too
		if (!busy) {
			this.lastActivityAt = Date.now();
		}
	}

	/**
	 * Check if user is currently idle
	 * Idle = not active for threshold AND agent is not busy
	 */
	isIdle(hasUrgent = false): boolean {
		if (this.agentBusy) return false;

		const elapsed = Date.now() - this.lastActivityAt;
		const threshold = hasUrgent ? this.urgentThreshold : this.idleThreshold;

		return elapsed >= threshold;
	}

	/**
	 * Get time since last activity in ms
	 */
	getIdleDuration(): number {
		return Date.now() - this.lastActivityAt;
	}

	/**
	 * Check if agent is currently busy
	 */
	isAgentBusy(): boolean {
		return this.agentBusy;
	}

	/**
	 * Internal check — fires the idle callback if conditions are met
	 */
	private checkIdle(): void {
		if (!this.onIdleCallback) return;

		const isIdleResult = this.isIdle();

		// Check with both thresholds — if urgent notifications exist,
		// the caller needs to pass that info through isIdle()
		if (isIdleResult) {
			this.onIdleCallback();
		}
	}
}
