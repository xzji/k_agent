/**
 * NotificationQueue — Queues notifications for idle-time delivery
 *
 * Notifications are enqueued by the background loop and delivered
 * to the user only when the IdleDetector signals that the user is idle.
 * This ensures no interruption to the user's current interaction.
 */

import type { Notification } from "../types.js";

export class NotificationQueue {
	private queue: Notification[] = [];

	/**
	 * Add a notification to the queue
	 */
	enqueue(notification: Notification): void {
		this.queue.push(notification);
		// Sort by priority (high first), then by creation time
		this.queue.sort((a, b) => {
			const priorityOrder = { high: 0, normal: 1, low: 2 };
			const pa = priorityOrder[a.priority];
			const pb = priorityOrder[b.priority];
			if (pa !== pb) return pa - pb;
			return a.createdAt - b.createdAt;
		});
	}

	/**
	 * Dequeue the highest-priority notification
	 */
	dequeue(): Notification | undefined {
		return this.queue.shift();
	}

	/**
	 * Peek at the next notification without removing it
	 */
	peek(): Notification | undefined {
		return this.queue[0];
	}

	/**
	 * Get number of pending notifications
	 */
	get pendingCount(): number {
		return this.queue.length;
	}

	/**
	 * Check if there are urgent notifications
	 */
	hasUrgent(): boolean {
		return this.queue.some((n) => n.priority === "high");
	}

	/**
	 * Get all pending notifications without removing them
	 */
	getAll(): Notification[] {
		return [...this.queue];
	}

	/**
	 * Clear all notifications
	 */
	clear(): void {
		this.queue = [];
	}

	/**
	 * Remove a specific notification by ID
	 */
	remove(id: string): boolean {
		const index = this.queue.findIndex((n) => n.id === id);
		if (index >= 0) {
			this.queue.splice(index, 1);
			return true;
		}
		return false;
	}
}
