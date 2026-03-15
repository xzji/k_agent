"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdleDetector = void 0;
var IdleDetector = /** @class */ (function () {
    function IdleDetector(config) {
        if (config === void 0) { config = {}; }
        var _a, _b, _c;
        this.lastActivityAt = Date.now();
        this.agentBusy = false;
        this.checkTimer = null;
        this.onIdleCallback = null;
        this.idleThreshold = (_a = config.idleThreshold) !== null && _a !== void 0 ? _a : 5 * 60 * 1000;
        this.urgentThreshold = (_b = config.urgentThreshold) !== null && _b !== void 0 ? _b : 60 * 1000;
        this.checkInterval = (_c = config.checkInterval) !== null && _c !== void 0 ? _c : 30 * 1000;
    }
    /**
     * Update configuration dynamically
     */
    IdleDetector.prototype.setConfig = function (config) {
        var _this = this;
        if (config.idleThreshold !== undefined)
            this.idleThreshold = config.idleThreshold;
        if (config.urgentThreshold !== undefined)
            this.urgentThreshold = config.urgentThreshold;
        if (config.checkInterval !== undefined) {
            this.checkInterval = config.checkInterval;
            // Restart timer with new interval if already running
            if (this.checkTimer && this.onIdleCallback) {
                clearInterval(this.checkTimer);
                this.checkTimer = setInterval(function () { return _this.checkIdle(); }, this.checkInterval);
            }
        }
    };
    /**
     * Start monitoring for idle state
     */
    IdleDetector.prototype.start = function (onIdle) {
        var _this = this;
        this.onIdleCallback = onIdle;
        this.lastActivityAt = Date.now();
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }
        this.checkTimer = setInterval(function () { return _this.checkIdle(); }, this.checkInterval);
    };
    /**
     * Stop monitoring
     */
    IdleDetector.prototype.stop = function () {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.onIdleCallback = null;
    };
    /**
     * Record user activity (called on `input` event from Extension API)
     */
    IdleDetector.prototype.recordActivity = function () {
        this.lastActivityAt = Date.now();
    };
    /**
     * Set agent busy state (called on `agent_start` / `agent_end` events)
     */
    IdleDetector.prototype.setAgentBusy = function (busy) {
        this.agentBusy = busy;
        // When agent finishes, mark it as a "last activity" too
        if (!busy) {
            this.lastActivityAt = Date.now();
        }
    };
    /**
     * Check if user is currently idle
     * Idle = not active for threshold AND agent is not busy
     */
    IdleDetector.prototype.isIdle = function (hasUrgent) {
        if (hasUrgent === void 0) { hasUrgent = false; }
        if (this.agentBusy)
            return false;
        var elapsed = Date.now() - this.lastActivityAt;
        var threshold = hasUrgent ? this.urgentThreshold : this.idleThreshold;
        return elapsed >= threshold;
    };
    /**
     * Get time since last activity in ms
     */
    IdleDetector.prototype.getIdleDuration = function () {
        return Date.now() - this.lastActivityAt;
    };
    /**
     * Internal check — fires the idle callback if conditions are met
     */
    IdleDetector.prototype.checkIdle = function () {
        if (!this.onIdleCallback)
            return;
        // Check with both thresholds — if urgent notifications exist,
        // the caller needs to pass that info through isIdle()
        if (this.isIdle()) {
            this.onIdleCallback();
        }
    };
    return IdleDetector;
}());
exports.IdleDetector = IdleDetector;
