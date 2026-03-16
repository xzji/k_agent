/**
 * Notification Queue
 *
 * Manages notifications with priority-based queuing and delivery timing.
 * Integrates with IdleDetector to deliver notifications when user is idle.
 */
import { type Notification, type NotificationType, type PriorityLevel, type INotificationQueue } from '../types';
/**
 * Notification Queue implementation
 */
export declare class NotificationQueue implements INotificationQueue {
    private queue;
    private delivered;
    private maxQueueSize;
    /**
     * Add a notification to the queue
     */
    enqueue(notification: Omit<Notification, 'id' | 'createdAt'>): Notification;
    /**
     * Remove and return the highest priority notification
     */
    dequeue(): Notification | undefined;
    /**
     * Peek at the highest priority notification without removing
     */
    peek(): Notification | undefined;
    /**
     * Get all queued notifications
     */
    getAll(): Notification[];
    /**
     * Check if there are any urgent notifications
     */
    hasUrgent(): boolean;
    /**
     * Check if there are notifications of a specific type
     */
    hasType(type: NotificationType): boolean;
    /**
     * Get notifications for a specific goal
     */
    getByGoal(goalId: string): Notification[];
    /**
     * Get notifications for a specific task
     */
    getByTask(taskId: string): Notification[];
    /**
     * Mark a notification as delivered
     */
    markDelivered(id: string): void;
    /**
     * Mark a notification as read
     */
    markRead(id: string): void;
    /**
     * Remove a notification from the queue
     */
    remove(id: string): boolean;
    /**
     * Get the queue size
     */
    size(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Clear all notifications
     */
    clear(): void;
    /**
     * Get pending notifications that should be delivered now
     * Based on priority and timing
     */
    getPendingForDelivery(isUserIdle: boolean, idleDurationMs: number): Notification[];
    /**
     * Get statistics about the queue
     */
    getStats(): {
        totalQueued: number;
        byPriority: Record<PriorityLevel, number>;
        byType: Record<NotificationType, number>;
        oldestNotificationAge: number;
    };
}
//# sourceMappingURL=notification-queue.d.ts.map