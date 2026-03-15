"use strict";
/**
 * KnowledgeStore — Long-term memory for the goal-driven agent
 *
 * Stores:
 * - Weak-relevance information filtered by RelevanceJudge
 * - Shelved action plan context
 * - Execution byproducts not directly pushed to user
 * - Cross-activated discoveries
 *
 * P0: Basic save/search/list. P4 adds cross-activation.
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
exports.KnowledgeStore = void 0;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_crypto_1 = require("node:crypto");
var utils_js_1 = require("../utils.js");
var KnowledgeStore = /** @class */ (function () {
    function KnowledgeStore(dataDir) {
        this.entries = [];
        this.contentHashes = new Set(); // Track content hashes for deduplication
        this.dataDir = (0, node_path_1.join)(dataDir, "knowledge");
        this.ensureDir();
        this.loadFromDisk();
    }
    /**
     * Save a new knowledge entry (with deduplication)
     */
    KnowledgeStore.prototype.save = function (params) {
        var _this = this;
        var _a, _b, _c;
        // Generate content hash for deduplication
        var contentHash = this.generateContentHash(params.content);
        // Check for duplicate content
        if (this.contentHashes.has(contentHash)) {
            // Find and update existing entry instead of creating duplicate
            var existingEntry = this.entries.find(function (e) { return _this.generateContentHash(e.content) === contentHash; });
            if (existingEntry) {
                // Merge related goal IDs and dimension IDs
                var mergedGoalIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], existingEntry.relatedGoalIds, true), params.relatedGoalIds, true)), true);
                var mergedDimensionIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], existingEntry.relatedDimensionIds, true), ((_a = params.relatedDimensionIds) !== null && _a !== void 0 ? _a : []), true)), true);
                // Update entry if there are new associations
                if (mergedGoalIds.length !== existingEntry.relatedGoalIds.length ||
                    mergedDimensionIds.length !== existingEntry.relatedDimensionIds.length) {
                    existingEntry.relatedGoalIds = mergedGoalIds;
                    existingEntry.relatedDimensionIds = mergedDimensionIds;
                    this.persistAllToDisk();
                }
                return existingEntry; // Return existing entry, null indicates no new entry created
            }
        }
        // Create new entry
        var entry = {
            id: (0, utils_js_1.generateId)(),
            content: params.content,
            source: params.source,
            relatedGoalIds: params.relatedGoalIds,
            relatedDimensionIds: (_b = params.relatedDimensionIds) !== null && _b !== void 0 ? _b : [],
            status: "raw",
            tags: (_c = params.tags) !== null && _c !== void 0 ? _c : [],
            supplementNeeded: params.supplementNeeded,
            createdAt: Date.now(),
            lastActivatedAt: null,
            activationCount: 0,
        };
        this.entries.push(entry);
        this.contentHashes.add(contentHash);
        this.appendToDisk(entry);
        return entry;
    };
    /**
     * Generate SHA-256 hash of content for deduplication
     */
    KnowledgeStore.prototype.generateContentHash = function (content) {
        return (0, node_crypto_1.createHash)("sha256").update(content).digest("hex");
    };
    /**
     * Simple keyword search
     * P4 will add semantic search and cross-activation
     */
    KnowledgeStore.prototype.search = function (query, limit) {
        if (limit === void 0) { limit = 20; }
        if (!query.trim()) {
            return this.entries.slice(-limit);
        }
        var keywords = query.toLowerCase().split(/\s+/);
        var scored = this.entries.map(function (entry) {
            var text = entry.content.toLowerCase();
            var tagText = entry.tags.join(" ").toLowerCase();
            var score = 0;
            for (var _i = 0, keywords_1 = keywords; _i < keywords_1.length; _i++) {
                var kw = keywords_1[_i];
                if (text.includes(kw))
                    score += 2;
                if (tagText.includes(kw))
                    score += 1;
            }
            return { entry: entry, score: score };
        });
        return scored
            .filter(function (s) { return s.score > 0; })
            .sort(function (a, b) { return b.score - a.score; })
            .slice(0, limit)
            .map(function (s) { return s.entry; });
    };
    /**
     * Get entries related to a specific goal
     */
    KnowledgeStore.prototype.getByGoal = function (goalId) {
        return this.entries.filter(function (e) { return e.relatedGoalIds.includes(goalId); });
    };
    /**
     * Get all entries
     */
    KnowledgeStore.prototype.getAll = function () {
        return __spreadArray([], this.entries, true);
    };
    /**
     * Get total entry count
     */
    KnowledgeStore.prototype.count = function () {
        return this.entries.length;
    };
    /**
     * Clear all knowledge entries
     */
    KnowledgeStore.prototype.clear = function () {
        this.entries = [];
        this.contentHashes.clear();
        var globalPath = (0, node_path_1.join)(this.dataDir, "global.jsonl");
        if ((0, node_fs_1.existsSync)(globalPath)) {
            (0, node_fs_1.unlinkSync)(globalPath);
        }
    };
    // ── Persistence ──
    KnowledgeStore.prototype.ensureDir = function () {
        if (!(0, node_fs_1.existsSync)(this.dataDir)) {
            (0, node_fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    };
    KnowledgeStore.prototype.appendToDisk = function (entry) {
        var globalPath = (0, node_path_1.join)(this.dataDir, "global.jsonl");
        (0, node_fs_1.appendFileSync)(globalPath, JSON.stringify(entry) + "\n", "utf-8");
    };
    /**
     * Persist all entries to disk (used when updating existing entries)
     */
    KnowledgeStore.prototype.persistAllToDisk = function () {
        var globalPath = (0, node_path_1.join)(this.dataDir, "global.jsonl");
        var content = this.entries.map(function (e) { return JSON.stringify(e); }).join("\n") + "\n";
        (0, node_fs_1.writeFileSync)(globalPath, content, "utf-8");
    };
    KnowledgeStore.prototype.loadFromDisk = function () {
        var globalPath = (0, node_path_1.join)(this.dataDir, "global.jsonl");
        if (!(0, node_fs_1.existsSync)(globalPath))
            return;
        try {
            var content = (0, node_fs_1.readFileSync)(globalPath, "utf-8");
            var lines = content.trim().split("\n").filter(Boolean);
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                try {
                    var entry = JSON.parse(line);
                    this.entries.push(entry);
                    // Build content hash set for deduplication
                    var contentHash = this.generateContentHash(entry.content);
                    this.contentHashes.add(contentHash);
                }
                catch (_a) {
                    // Skip malformed lines
                }
            }
        }
        catch (_b) {
            // File read error, start fresh
        }
    };
    return KnowledgeStore;
}());
exports.KnowledgeStore = KnowledgeStore;
