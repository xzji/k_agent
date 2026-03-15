"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelevanceJudge = void 0;
/**
 * RelevanceJudge
 *
 * Uses LLM to evaluate the relevance of collected information against the goal and dimension.
 */
var RelevanceJudge = /** @class */ (function () {
    function RelevanceJudge(llm) {
        this.llm = llm;
    }
    /**
     * Judge the relevance of multiple info items.
     * Returns items that meet the relevance criteria.
     */
    RelevanceJudge.prototype.judgeBatch = function (goal, dimension, items) {
        return __awaiter(this, void 0, void 0, function () {
            var itemsJson, prompt, judgments, singleJudgment, wrapped, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (items.length === 0)
                            return [2 /*return*/, []];
                        itemsJson = items.map(function (item, index) { return ({
                            index: index,
                            content: item.content.substring(0, 500) // Truncate to save tokens
                        }); });
                        prompt = "You are evaluating information relevance for a Goal-Driven Agent.\n\nGoal: ".concat(goal.title, "\nDimension: ").concat(dimension.title, "\n\nEvaluate ").concat(items.length, " information items and rate their relevance.\nFor EACH item, provide:\n- index: the item number (0 to ").concat(items.length - 1, ")\n- score: 1-10 (higher = more relevant)\n- level: \"strong\" (8-10), \"weak\" (4-7), or \"irrelevant\" (1-3)\n\nItems to evaluate:\n").concat(JSON.stringify(itemsJson, null, 2), "\n\nCRITICAL: You MUST respond with a JSON ARRAY containing exactly ").concat(items.length, " objects.\nFormat: [{\"index\": 0, \"score\": 8, \"level\": \"strong\"}, {\"index\": 1, \"score\": 5, \"level\": \"weak\"}, ...]\n\nDO NOT respond with a single object. DO NOT add explanatory text. ONLY the JSON array.");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: "You are a relevance evaluator. ALWAYS respond with a JSON ARRAY, never a single object. Even for one item, use array format: [{...}].",
                                messages: [{ role: "user", content: prompt }],
                                temperature: 0.3 // Lower temperature for more consistent JSON
                            })];
                    case 2:
                        judgments = _a.sent();
                        // Enhanced type checking with better error messages
                        if (!judgments) {
                            console.error("RelevanceJudge: LLM returned null/undefined");
                            return [2 /*return*/, this.fallbackAcceptAll(items)];
                        }
                        // Handle single object fallback (common issue with GLM-4)
                        if (!Array.isArray(judgments)) {
                            console.warn("RelevanceJudge: LLM returned single object instead of array, attempting to wrap it");
                            singleJudgment = judgments;
                            if (typeof singleJudgment === 'object' && singleJudgment !== null &&
                                'index' in singleJudgment && 'score' in singleJudgment && 'level' in singleJudgment) {
                                wrapped = [singleJudgment];
                                return [2 /*return*/, this.processJudgments(wrapped, items)];
                            }
                            console.error("RelevanceJudge: Response is not an array or valid judgment object");
                            return [2 /*return*/, this.fallbackAcceptAll(items)];
                        }
                        return [2 /*return*/, this.processJudgments(judgments, items)];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        console.error("RelevanceJudge error:", errorMessage);
                        // Log more context for debugging
                        if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
                            console.error("Failed to parse LLM response as JSON array");
                        }
                        return [2 /*return*/, this.fallbackAcceptAll(items)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process validated judgment array
     */
    RelevanceJudge.prototype.processJudgments = function (judgments, items) {
        var validItems = [];
        for (var _i = 0, judgments_1 = judgments; _i < judgments_1.length; _i++) {
            var judge = judgments_1[_i];
            var item = items[judge.index];
            if (item) {
                item.relevanceScore = judge.score;
                item.relevanceLevel = judge.level;
                // Keep strong and weak items
                if (judge.level === "strong" || judge.level === "weak") {
                    validItems.push(item);
                }
            }
        }
        return validItems;
    };
    /**
     * Fallback: accept all items with moderate score when LLM fails
     */
    RelevanceJudge.prototype.fallbackAcceptAll = function (items) {
        console.warn("RelevanceJudge: Using fallback - accepting all items as 'weak' relevance");
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            item.relevanceScore = 5;
            item.relevanceLevel = "weak";
        }
        return items;
    };
    return RelevanceJudge;
}());
exports.RelevanceJudge = RelevanceJudge;
