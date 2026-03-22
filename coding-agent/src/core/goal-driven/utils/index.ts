/**
 * Goal-Driven Agent - Utilities
 *
 * Common utility functions used across the goal-driven agent system.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a timestamp
 */
export function now(): number {
  return Date.now();
}

/**
 * Calculate priority weight for sorting
 * Higher weight = higher priority
 */
export function getPriorityWeight(priority: string): number {
  const weights: Record<string, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
    background: 10,
  };
  return weights[priority] || 0;
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract keywords from text for knowledge retrieval
 */
export function extractKeywords(text: string): string {
  // Simple keyword extraction - remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'and', 'but', 'or', 'yet', 'so',
    'if', 'because', 'although', 'though', 'while', 'where',
    'when', 'that', 'which', 'who', 'whom', 'whose', 'what',
    'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'me', 'him', 'her', 'us', 'them',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')  // 保留中文字符
    .split(/\s+/)
    .filter((word) => {
      if (!word) return false;
      // 对英文词，长度>2且不在停用词表中
      // 对中文词，只要不在停用词表中（中文通常2个字就是有效词）
      const isChinese = /[\u4e00-\u9fa5]/.test(word);
      return !stopWords.has(word) && (isChinese || word.length > 2);
    })
    .slice(0, 10);

  return words.join(' ');
}

/**
 * Calculate string similarity using simple word overlap
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Format timestamp to human readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Validate that all dependencies exist
 */
export function validateDependencies(taskIds: string[], dependencies: string[]): string[] {
  const taskIdSet = new Set(taskIds);
  return dependencies.filter((depId) => !taskIdSet.has(depId));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Fix single-quoted strings in JSON
 *
 * Converts 'string' to "string", handling:
 * - Internal double quotes (escaped)
 * - Escaped single quotes (unescaped)
 */
function fixSingleQuoteStrings(json: string): string {
  return json.replace(
    /'([^'\\]*(\\.[^'\\]*)*)'/g,
    (match, content) => {
      // Escape internal double quotes
      const escaped = content.replace(/"/g, '\\"');
      // Unescape single quotes
      const unescaped = escaped.replace(/\\'/g, "'");
      return `"${unescaped}"`;
    }
  );
}

/**
 * Check if JSON string is likely truncated
 */
export function isLikelyTruncated(jsonStr: string): boolean {
  // Check for common truncation indicators
  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;

  // If braces/brackets don't match, it's likely truncated
  return openBraces !== closeBraces || openBrackets !== closeBrackets;
}

/**
 * Attempt to fix truncated JSON by closing open structures
 */
export function attemptToFixTruncatedJSON(jsonStr: string): string | null {
  let fixed = jsonStr.trim();

  // Remove trailing commas
  fixed = fixed.replace(/,\s*$/, '');
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // Track open structures using a stack for correct closing order
  const openStack: ('{' | '[')[] = [];
  let inString = false;
  let escapeNext = false;

  for (const char of fixed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        openStack.push('{');
      } else if (char === '[') {
        openStack.push('[');
      } else if (char === '}') {
        // Pop matching '{' if available
        const lastOpen = openStack[openStack.length - 1];
        if (lastOpen === '{') {
          openStack.pop();
        }
      } else if (char === ']') {
        // Pop matching '[' if available
        const lastOpen = openStack[openStack.length - 1];
        if (lastOpen === '[') {
          openStack.pop();
        }
      }
    }
  }

  // Close any open strings
  if (inString) {
    fixed += '"';
  }

  // Check for incomplete key-value pairs
  const lastColon = fixed.lastIndexOf(':');
  const lastComma = fixed.lastIndexOf(',');
  const lastOpenBrace = fixed.lastIndexOf('{');
  const lastOpenBracket = fixed.lastIndexOf('[');

  // If we have an open brace without a value after the last colon, add null
  if (lastColon > lastOpenBrace && lastColon > lastComma && lastColon > lastOpenBracket) {
    const afterColon = fixed.slice(lastColon + 1).trim();
    if (!afterColon || afterColon === '') {
      fixed += ' null';
    }
  }

  // Close structures in reverse order (LIFO - last opened, first closed)
  while (openStack.length > 0) {
    const lastOpen = openStack.pop()!;
    if (lastOpen === '{') {
      fixed += '}';
    } else {
      fixed += ']';
    }
  }

  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    return null;
  }
}

/**
 * Parse JSON from LLM output, handling common formatting issues
 *
 * Handles:
 * - Markdown code block markers (```json ... ```)
 * - Single-quoted strings (LLM sometimes uses ' instead of ")
 * - Truncated JSON (when isTruncated is true or JSON is incomplete)
 *
 * @param content - The LLM output content
 * @param isTruncated - Whether the LLM response was truncated (finishReason === 'length')
 * @throws SyntaxError if parsing fails after repair attempts
 */
export function parseJSONFromLLM<T>(content: string, isTruncated: boolean = false): T {
  let cleaned = content.trim();

  // Step 1: Remove markdown code block markers
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Step 2: Try parsing directly
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to repair attempt
  }

  // Step 3: Try fixing single-quoted strings
  const fixedSingleQuotes = fixSingleQuoteStrings(cleaned);
  try {
    return JSON.parse(fixedSingleQuotes) as T;
  } catch {
    // Continue to truncation repair
  }

  // Step 4: If truncated or appears truncated, try to fix incomplete JSON
  if (isTruncated || isLikelyTruncated(fixedSingleQuotes)) {
    const fixed = attemptToFixTruncatedJSON(fixedSingleQuotes);
    if (fixed) {
      try {
        return JSON.parse(fixed) as T;
      } catch {
        // Fall through to final error
      }
    }
  }

  // Final failure with descriptive error
  throw new SyntaxError(
    `Failed to parse JSON from LLM output after repair attempts. ` +
    `Content preview: ${cleaned.slice(0, 200)}${cleaned.length > 200 ? '...' : ''}`
  );
}

/**
 * Semaphore for concurrency control
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.permits++;
    }
  }

  get availablePermits(): number {
    return this.permits;
  }

  get waitingCount(): number {
    return this.queue.length;
  }
}

/**
 * Simple event emitter for internal communication
 */
export class EventEmitter {
  private listeners: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch {
          // Silently ignore errors in event listeners
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
