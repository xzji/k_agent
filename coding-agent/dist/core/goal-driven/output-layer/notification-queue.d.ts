/**
 * NotificationQueue — Queues notifications for idle-time delivery
 *
 * Notifications are enqueued by the background loop and delivered
 * to the user only when the IdleDetector signals that the user is idle.
 * This ensures no interruption to the user's current interaction.
 */
import type { Notification } from "../types.js";
export declare class NotificationQueue {
    private queue;
    /**
     * Add a notification to the queue
     */
    enqueue(notification: Notification): void;
    /**
     * Dequeue the highest-priority notification
     */
    dequeue(): Notification | undefined;
    /**
     * Peek at the next notification without removing it
     */
    peek(): Notification | undefined;
    /**
     * Get number of pending notifications
     */
    get pendingCount(): number;
    /**
     * Check if there are urgent notifications
     */
    hasUrgent(): boolean;
    /**
     * Get all pending notifications without removing them
     */
    getAll(): Notification[];
    /**
     * Clear all notifications
     */
    clear(): void;
    /**
     * Remove a specific notification by ID
     */
    remove(id: string): boolean;
}
//# sourceMappingURL=notification-queue.d.ts.map