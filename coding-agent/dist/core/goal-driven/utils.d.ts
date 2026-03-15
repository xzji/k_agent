/**
 * Goal-Driven Agent — Utility Functions
 */
/**
 * Generate a unique ID (12 character hex string)
 */
export declare function generateId(): string;
/**
 * Extract text content from an LLM response string.
 * Strips markdown code fences if present to get raw JSON.
 */
export declare function extractJSON(text: string): string;
/**
 * Parse JSON from LLM response, with fallback
 */
export declare function parseJSONResponse<T>(text: string): T;
/**
 * Chunk an array into smaller arrays of specified size
 */
export declare function chunk<T>(arr: T[], size: number): T[][];
/**
 * Format a timestamp to human-readable string
 */
export declare function formatTime(timestamp: number): string;
/**
 * Sleep for a specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=utils.d.ts.map