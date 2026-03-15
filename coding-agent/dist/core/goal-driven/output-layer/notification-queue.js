"use strict";
/**
 * NotificationQueue — Queues notifications for idle-time delivery
 *
 * Notifications are enqueued by the background loop and delivered
 * to the user only when the IdleDetector signals that the user is idle.
 * This ensures no interruption to the user's current interaction.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationQueue = void 0;
var NotificationQueue = /** @class */ (function () {
    function NotificationQueue() {
        this.queue = [];
    }
    /**
     * Add a notification to the queue
     */
    NotificationQueue.prototype.enqueue = function (notification) {
        this.queue.push(notification);
        // Sort by priority (high first), then by creation time
        this.queue.sort(function (a, b) {
            var priorityOrder = { high: 0, normal: 1, low: 2 };
            var pa = priorityOrder[a.priority];
            var pb = priorityOrder[b.priority];
            if (pa !== pb)
                return pa - pb;
            return a.createdAt - b.createdAt;
        });
    };
    /**
     * Dequeue the highest-priority notification
     */
    NotificationQueue.prototype.dequeue = function () {
        return this.queue.shift();
    };
    /**
     * Peek at the next notification without removing it
     */
    NotificationQueue.prototype.peek = function () {
        return this.queue[0];
    };
    Object.defineProperty(NotificationQueue.prototype, "pendingCount", {
        /**
         * Get number of pending notifications
         */
        get: function () {
            return this.queue.length;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Check if there are urgent notifications
     */
    NotificationQueue.prototype.hasUrgent = function () {
        return this.queue.some(function (n) { return n.priority === "high"; });
    };
    /**
     * Get all pending notifications without removing them
     */
    NotificationQueue.prototype.getAll = function () {
        return __spreadArray([], this.queue, true);
    };
    /**
     * Clear all notifications
     */
    NotificationQueue.prototype.clear = function () {
        this.queue = [];
    };
    /**
     * Remove a specific notification by ID
     */
    NotificationQueue.prototype.remove = function (id) {
        var index = this.queue.findIndex(function (n) { return n.id === id; });
        if (index >= 0) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    };
    return NotificationQueue;
}());
exports.NotificationQueue = NotificationQueue;
