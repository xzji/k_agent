"use strict";
/**
 * Goal-Driven Agent - Utilities
 *
 * Common utility functions used across the goal-driven agent system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.Semaphore = void 0;
exports.generateId = generateId;
exports.now = now;
exports.getPriorityWeight = getPriorityWeight;
exports.sleep = sleep;
exports.deepClone = deepClone;
exports.extractKeywords = extractKeywords;
exports.calculateSimilarity = calculateSimilarity;
exports.formatDuration = formatDuration;
exports.formatDate = formatDate;
exports.validateDependencies = validateDependencies;
exports.retry = retry;
const crypto_1 = require("crypto");
/**
 * Generate a unique ID
 */
function generateId() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Generate a timestamp
 */
function now() {
    return Date.now();
}
/**
 * Calculate priority weight for sorting
 * Higher weight = higher priority
 */
function getPriorityWeight(priority) {
    const weights = {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Extract keywords from text for knowledge retrieval
 */
function extractKeywords(text) {
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
        .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 保留中文字符
        .split(/\s+/)
        .filter((word) => {
        if (!word)
            return false;
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
function calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}
/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000)
        return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
}
/**
 * Format timestamp to human readable date
 */
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}
/**
 * Validate that all dependencies exist
 */
function validateDependencies(taskIds, dependencies) {
    const taskIdSet = new Set(taskIds);
    return dependencies.filter((depId) => !taskIdSet.has(depId));
}
/**
 * Retry a function with exponential backoff
 */
async function retry(fn, options = {}) {
    const { maxAttempts = 3, delayMs = 1000 } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
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
 * Semaphore for concurrency control
 */
class Semaphore {
    permits;
    queue = [];
    constructor(permits) {
        this.permits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise((resolve) => {
            this.queue.push(resolve);
        });
    }
    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        }
        else {
            this.permits++;
        }
    }
    get availablePermits() {
        return this.permits;
    }
    get waitingCount() {
        return this.queue.length;
    }
}
exports.Semaphore = Semaphore;
/**
 * Simple event emitter for internal communication
 */
class EventEmitter {
    listeners = new Map();
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
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
    emit(event, ...args) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((cb) => {
                try {
                    cb(...args);
                }
                catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        }
        else {
            this.listeners.clear();
        }
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=index.js.map