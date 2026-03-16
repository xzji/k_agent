"use strict";
/**
 * Notification Queue
 *
 * Manages notifications with priority-based queuing and delivery timing.
 * Integrates with IdleDetector to deliver notifications when user is idle.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationQueue = void 0;
const utils_1 = require("../utils");
/**
 * Notification Queue implementation
 */
class NotificationQueue {
    queue = [];
    delivered = [];
    maxQueueSize = 100;
    /**
     * Add a notification to the queue
     */
    enqueue(notification) {
        const fullNotification = {
            ...notification,
            id: (0, utils_1.generateId)(),
            createdAt: (0, utils_1.now)(),
        };
        // Insert in priority order
        const insertIndex = this.queue.findIndex((n) => (0, utils_1.getPriorityWeight)(n.priority) < (0, utils_1.getPriorityWeight)(fullNotification.priority));
        if (insertIndex === -1) {
            this.queue.push(fullNotification);
        }
        else {
            this.queue.splice(insertIndex, 0, fullNotification);
        }
        // Trim if exceeds max size (remove lowest priority/oldest)
        if (this.queue.length > this.maxQueueSize) {
            this.queue.pop();
        }
        console.log(`[NotificationQueue] Enqueued: ${fullNotification.title} (${fullNotification.priority})`);
        return fullNotification;
    }
    /**
     * Remove and return the highest priority notification
     */
    dequeue() {
        const notification = this.queue.shift();
        if (notification) {
            this.delivered.push(notification);
        }
        return notification;
    }
    /**
     * Peek at the highest priority notification without removing
     */
    peek() {
        return this.queue[0];
    }
    /**
     * Get all queued notifications
     */
    getAll() {
        return [...this.queue];
    }
    /**
     * Check if there are any urgent notifications
     */
    hasUrgent() {
        return this.queue.some((n) => n.priority === 'critical' || n.priority === 'high');
    }
    /**
     * Check if there are notifications of a specific type
     */
    hasType(type) {
        return this.queue.some((n) => n.type === type);
    }
    /**
     * Get notifications for a specific goal
     */
    getByGoal(goalId) {
        return this.queue.filter((n) => n.goalId === goalId);
    }
    /**
     * Get notifications for a specific task
     */
    getByTask(taskId) {
        return this.queue.filter((n) => n.taskId === taskId);
    }
    /**
     * Mark a notification as delivered
     */
    markDelivered(id) {
        const notification = this.queue.find((n) => n.id === id);
        if (notification) {
            notification.deliveredAt = (0, utils_1.now)();
        }
    }
    /**
     * Mark a notification as read
     */
    markRead(id) {
        const notification = this.queue.find((n) => n.id === id);
        if (notification) {
            notification.readAt = (0, utils_1.now)();
        }
    }
    /**
     * Remove a notification from the queue
     */
    remove(id) {
        const index = this.queue.findIndex((n) => n.id === id);
        if (index !== -1) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Get the queue size
     */
    size() {
        return this.queue.length;
    }
    /**
     * Check if queue is empty
     */
    isEmpty() {
        return this.queue.length === 0;
    }
    /**
     * Clear all notifications
     */
    clear() {
        this.queue = [];
    }
    /**
     * Get pending notifications that should be delivered now
     * Based on priority and timing
     */
    getPendingForDelivery(isUserIdle, idleDurationMs) {
        const pending = [];
        for (const notification of this.queue) {
            // Critical notifications always delivered
            if (notification.priority === 'critical') {
                pending.push(notification);
                continue;
            }
            // High priority delivered if user has been idle for 1+ minute
            if (notification.priority === 'high' && idleDurationMs >= 60000) {
                pending.push(notification);
                continue;
            }
            // Medium/Low priority only delivered if user is idle for 5+ minutes
            if (isUserIdle && idleDurationMs >= 300000) {
                pending.push(notification);
            }
        }
        return pending;
    }
    /**
     * Get statistics about the queue
     */
    getStats() {
        const byPriority = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            background: 0,
        };
        const byType = {
            report: 0,
            help_request: 0,
            confirmation: 0,
            info: 0,
            urgent: 0,
        };
        let oldestAge = 0;
        const currentTime = (0, utils_1.now)();
        for (const notification of this.queue) {
            byPriority[notification.priority]++;
            byType[notification.type]++;
            const age = currentTime - notification.createdAt;
            if (age > oldestAge) {
                oldestAge = age;
            }
        }
        return {
            totalQueued: this.queue.length,
            byPriority: byPriority,
            byType: byType,
            oldestNotificationAge: oldestAge,
        };
    }
}
exports.NotificationQueue = NotificationQueue;
//# sourceMappingURL=notification-queue.js.map