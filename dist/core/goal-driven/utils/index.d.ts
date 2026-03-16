/**
 * Goal-Driven Agent - Utilities
 *
 * Common utility functions used across the goal-driven agent system.
 */
/**
 * Generate a unique ID
 */
export declare function generateId(): string;
/**
 * Generate a timestamp
 */
export declare function now(): number;
/**
 * Calculate priority weight for sorting
 * Higher weight = higher priority
 */
export declare function getPriorityWeight(priority: string): number;
/**
 * Sleep for a given duration
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Extract keywords from text for knowledge retrieval
 */
export declare function extractKeywords(text: string): string;
/**
 * Calculate string similarity using simple word overlap
 */
export declare function calculateSimilarity(text1: string, text2: string): number;
/**
 * Format duration in milliseconds to human readable string
 */
export declare function formatDuration(ms: number): string;
/**
 * Format timestamp to human readable date
 */
export declare function formatDate(timestamp: number): string;
/**
 * Validate that all dependencies exist
 */
export declare function validateDependencies(taskIds: string[], dependencies: string[]): string[];
/**
 * Retry a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delayMs?: number;
}): Promise<T>;
/**
 * Semaphore for concurrency control
 */
export declare class Semaphore {
    private permits;
    private queue;
    constructor(permits: number);
    acquire(): Promise<void>;
    release(): void;
    get availablePermits(): number;
    get waitingCount(): number;
}
/**
 * Simple event emitter for internal communication
 */
export declare class EventEmitter {
    private listeners;
    on(event: string, callback: (...args: unknown[]) => void): () => void;
    emit(event: string, ...args: unknown[]): void;
    removeAllListeners(event?: string): void;
}
//# sourceMappingURL=index.d.ts.map