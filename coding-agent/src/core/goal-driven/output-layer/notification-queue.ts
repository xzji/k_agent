/**
 * Notification Queue
 *
 * Manages notifications with priority-based queuing and delivery timing.
 * Integrates with IdleDetector to deliver notifications when user is idle.
 */

import {
  type Notification,
  type NotificationType,
  type PriorityLevel,
  type INotificationQueue,
} from '../types';
import { generateId, now, getPriorityWeight } from '../utils';

/**
 * Notification Queue implementation
 */
export class NotificationQueue implements INotificationQueue {
  private queue: Notification[] = [];
  private delivered: Notification[] = [];
  private maxQueueSize = 100;

  /**
   * Add a notification to the queue
   */
  enqueue(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const fullNotification: Notification = {
      ...notification,
      id: generateId(),
      createdAt: now(),
    };

    // Insert in priority order
    const insertIndex = this.queue.findIndex(
      (n) => getPriorityWeight(n.priority) < getPriorityWeight(fullNotification.priority)
    );

    if (insertIndex === -1) {
      this.queue.push(fullNotification);
    } else {
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
  dequeue(): Notification | undefined {
    const notification = this.queue.shift();
    if (notification) {
      this.delivered.push(notification);
    }
    return notification;
  }

  /**
   * Peek at the highest priority notification without removing
   */
  peek(): Notification | undefined {
    return this.queue[0];
  }

  /**
   * Get all queued notifications
   */
  getAll(): Notification[] {
    return [...this.queue];
  }

  /**
   * Check if there are any urgent notifications
   */
  hasUrgent(): boolean {
    return this.queue.some((n) => n.priority === 'critical' || n.priority === 'high');
  }

  /**
   * Check if there are notifications of a specific type
   */
  hasType(type: NotificationType): boolean {
    return this.queue.some((n) => n.type === type);
  }

  /**
   * Get notifications for a specific goal
   */
  getByGoal(goalId: string): Notification[] {
    return this.queue.filter((n) => n.goalId === goalId);
  }

  /**
   * Get notifications for a specific task
   */
  getByTask(taskId: string): Notification[] {
    return this.queue.filter((n) => n.taskId === taskId);
  }

  /**
   * Mark a notification as delivered
   */
  markDelivered(id: string): void {
    const notification = this.queue.find((n) => n.id === id);
    if (notification) {
      notification.deliveredAt = now();
    }
  }

  /**
   * Mark a notification as read
   */
  markRead(id: string): void {
    const notification = this.queue.find((n) => n.id === id);
    if (notification) {
      notification.readAt = now();
    }
  }

  /**
   * Remove a notification from the queue
   */
  remove(id: string): boolean {
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
  size(): number {
    return this.queue.length;
  }

  /**
   * Get pending notification count (alias for size)
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get pending notifications that should be delivered now
   * Based on priority and timing
   */
  getPendingForDelivery(isUserIdle: boolean, idleDurationMs: number): Notification[] {
    const pending: Notification[] = [];

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
  getStats(): {
    totalQueued: number;
    byPriority: Record<PriorityLevel, number>;
    byType: Record<NotificationType, number>;
    oldestNotificationAge: number;
  } {
    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      background: 0,
    };

    const byType: Record<string, number> = {
      report: 0,
      help_request: 0,
      confirmation: 0,
      info: 0,
      urgent: 0,
    };

    let oldestAge = 0;
    const currentTime = now();

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
      byPriority: byPriority as Record<PriorityLevel, number>,
      byType: byType as Record<NotificationType, number>,
      oldestNotificationAge: oldestAge,
    };
  }
}
