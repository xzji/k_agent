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
exports.ActionReasoner = void 0;
var utils_js_1 = require("../utils.js");
/**
 * ActionReasoner
 *
 * Uses LLM to reason over collected info and generate the next ActionPlan for a dimension.
 *
 * Enhanced with:
 * - Five-step reasoning chain for deeper analysis
 * - Multiple alternative actions (2-3 options)
 * - Dynamic goalImpact calculation based on action characteristics
 */
var ActionReasoner = /** @class */ (function () {
    function ActionReasoner(llm) {
        this.llm = llm;
    }
    ActionReasoner.prototype.reasonNextAction = function (goal, dimension, recentInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var infoContext, prompt, parsed, primaryAction, alternatives, goalImpact, reasoningTrace, knowledgeToSave, error_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        infoContext = recentInfo.map(function (i) { return "- ".concat(i.content); }).join("\n");
                        prompt = "You are an autonomous Action Reasoner. Your task is to determine the best immediate next step for an AI agent.\n\n**GOAL**: ".concat(goal.title, "\n**Dimension**: ").concat(dimension.title, "\n**Dimension Description**: ").concat(dimension.description, "\n**Current Exploration Depth**: ").concat(dimension.explorationDepth, "/").concat(dimension.estimated_depth, "\n**Core Questions**: ").concat(dimension.core_questions.join(", "), "\n\n**RECENT FINDINGS**:\n").concat(infoContext || "(No new specific findings yet)", "\n\n**YOUR TASK - FIVE-STEP REASONING CHAIN**:\n\nStep 1: Analyze Current State\n- What do we know so far about this dimension?\n- What specific gaps remain in our understanding?\n- How close are we to completing this dimension's exploration?\n\nStep 2: Identify Key Problems\n- What are the 1-2 most critical questions we still need to answer?\n- What information would have the highest impact on goal completion?\n- What blockers or dependencies exist?\n\nStep 3: Generate Candidate Actions\n- Brainstorm 3 different actions the agent could take next\n- Ensure variety: one information gathering, one analytical, one synthetic\n- For each action, briefly describe what it does and why\n\nStep 4: Evaluate and Select\n- For each candidate, assess: success probability (1-10), cost (low/medium/high), urgency\n- Rank candidates by overall value (impact \u00D7 probability \u00F7 cost)\n- Select the top choice as the primary action\n\nStep 5: Formulate Execution Plan\n- For the selected action, specify: exact command/query/search terms\n- What tools or capabilities are needed?\n- What would constitute success?\n- What are the fallback options if it fails?\n\n**RESPONSE FORMAT** (JSON only):\n{\n  \"step1_stateAnalysis\": \"Your analysis of current state\",\n  \"step2_keyProblems\": [\"problem 1\", \"problem 2\"],\n  \"step3_candidates\": [\n    {\n      \"what\": \"Action description 1\",\n      \"why\": \"Reason this action makes sense\",\n      \"expectedOutcome\": \"What we hope to achieve\",\n      \"costEstimate\": \"low|medium|high\",\n      \"urgency\": \"urgent|normal|can_wait\",\n      \"successProbability\": 1-10,\n      \"requiresUserInvolvement\": false,\n      \"reversible\": true,\n      \"impactCategory\": \"high|medium|low\"  // How much this moves the goal forward\n    },\n    {\n      \"what\": \"Action description 2\",\n      ... (same structure)\n    },\n    {\n      \"what\": \"Action description 3\",\n      ... (same structure)\n    }\n  ],\n  \"step4_evaluation\": {\n    \"selectedIndex\": 0,  // Which candidate was selected (0-2)\n    \"selectionReason\": \"Why this one was chosen over the others\",\n    \"rankings\": \"Brief ranking explanation\"\n  },\n  \"step5_executionPlan\": {\n    \"primaryAction\": {\n      \"what\": \"Detailed action description (can be same as candidate)\",\n      \"why\": \"Detailed reasoning\",\n      \"expectedOutcome\": \"Specific expected result\",\n      \"costEstimate\": \"low|medium|high\",\n      \"urgency\": \"urgent|normal|can_wait\",\n      \"successProbability\": 1-10,\n      \"requiresUserInvolvement\": false,\n      \"reversible\": true\n    },\n    \"toolsNeeded\": [\"tool1\", \"tool2\"],  // e.g., [\"web_search\", \"bash\"]\n    \"successCriteria\": \"Specific indicators of success\",\n    \"fallbackOptions\": \"What to do if this fails\"\n  }\n}\n\n**IMPORTANT**:\n- Be specific and actionable. Instead of \"search the web\", say \"search for 'X vs Y comparison 2024'\"\n- Consider the exploration depth. Early stages: gather broad info. Later stages: deepen/synthesize.\n- Ensure at least 2-3 candidates in step3_candidates array.\n- All probabilities should be realistic (5-8 for normal actions, 8-10 for low-risk, 3-5 for complex/uncertain)");
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: "You are an expert autonomous agent planner. Provide your reasoning as valid JSON following the exact schema requested. Think step by step, be specific and actionable.",
                                messages: [{ role: "user", content: prompt }],
                                temperature: 0.7, // Slightly higher for creativity in generating alternatives
                                maxTokens: 3000 // Allow longer response for detailed reasoning
                            })];
                    case 2:
                        parsed = _e.sent();
                        primaryAction = ((_a = parsed.step5_executionPlan) === null || _a === void 0 ? void 0 : _a.primaryAction) || ((_b = parsed.step3_candidates) === null || _b === void 0 ? void 0 : _b[0]) || {};
                        alternatives = this.generateAlternativeActions(goal.id, dimension.id, recentInfo.map(function (i) { return i.id; }), parsed.step3_candidates || [], ((_c = parsed.step4_evaluation) === null || _c === void 0 ? void 0 : _c.selectedIndex) || 0);
                        goalImpact = this.calculateGoalImpact(primaryAction, ((_d = parsed.step4_evaluation) === null || _d === void 0 ? void 0 : _d.selectionReason) || "", parsed.step1_stateAnalysis || "", dimension);
                        reasoningTrace = this.buildReasoningTrace(parsed);
                        knowledgeToSave = this.buildKnowledgeToSave(parsed);
                        return [2 /*return*/, {
                                id: (0, utils_js_1.generateId)(),
                                goalId: goal.id,
                                dimensionId: dimension.id,
                                triggerInfoIds: recentInfo.map(function (i) { return i.id; }),
                                what: primaryAction.what || "Explore dimension",
                                why: primaryAction.why || "To progress the goal",
                                expectedOutcome: primaryAction.expectedOutcome || "Information",
                                goalImpact: goalImpact,
                                costEstimate: primaryAction.costEstimate || "low",
                                urgency: primaryAction.urgency || "normal",
                                successProbability: typeof primaryAction.successProbability === 'number'
                                    ? primaryAction.successProbability
                                    : parseInt(primaryAction.successProbability) || 5,
                                requiresUserInvolvement: !!primaryAction.requiresUserInvolvement,
                                reversible: primaryAction.reversible !== false,
                                reasoningTrace: reasoningTrace,
                                alternativeActions: alternatives,
                                knowledgeToSave: knowledgeToSave,
                                status: "proposed",
                                createdAt: Date.now()
                            }];
                    case 3:
                        error_1 = _e.sent();
                        console.error("ActionReasoner error:", error_1);
                        // Fallback placeholder plan
                        return [2 /*return*/, {
                                id: (0, utils_js_1.generateId)(),
                                goalId: goal.id,
                                dimensionId: dimension.id,
                                triggerInfoIds: [],
                                what: "Explore dimension ".concat(dimension.title, " further"),
                                why: "Parsing failed, using generic fallback",
                                expectedOutcome: "Continue information gathering",
                                goalImpact: this.calculateGoalImpact({}, "", "", dimension),
                                costEstimate: "low",
                                urgency: "normal",
                                successProbability: 5,
                                requiresUserInvolvement: false,
                                reversible: true,
                                reasoningTrace: JSON.stringify({ error: String(error_1), fallback: true }, null, 2),
                                alternativeActions: [],
                                knowledgeToSave: "",
                                status: "proposed",
                                createdAt: Date.now()
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate alternative actions from candidates (excluding the selected one)
     */
    ActionReasoner.prototype.generateAlternativeActions = function (goalId, dimensionId, triggerInfoIds, candidates, selectedIndex) {
        var alternatives = [];
        // Add non-selected candidates as alternatives
        for (var i = 0; i < candidates.length; i++) {
            if (i === selectedIndex)
                continue; // Skip the selected one
            if (alternatives.length >= 2)
                break; // Max 2 alternatives
            var candidate = candidates[i];
            if (!candidate || !candidate.what)
                continue;
            alternatives.push({
                id: (0, utils_js_1.generateId)(),
                goalId: goalId,
                dimensionId: dimensionId,
                triggerInfoIds: __spreadArray([], triggerInfoIds, true),
                what: candidate.what || "Alternative action ".concat(i + 1),
                why: candidate.why || "Alternative approach",
                expectedOutcome: candidate.expectedOutcome || "Additional information",
                goalImpact: this.calculateGoalImpact(candidate, "", "", { valueScore: 5 }),
                costEstimate: candidate.costEstimate || "low",
                urgency: candidate.urgency || "normal",
                successProbability: typeof candidate.successProbability === 'number'
                    ? candidate.successProbability
                    : parseInt(candidate.successProbability) || 5,
                requiresUserInvolvement: !!candidate.requiresUserInvolvement,
                reversible: candidate.reversible !== false,
                reasoningTrace: "Alternative option ".concat(i + 1),
                alternativeActions: [], // No nested alternatives
                knowledgeToSave: "",
                status: "proposed",
                createdAt: Date.now()
            });
        }
        return alternatives;
    };
    /**
     * Calculate dynamic goalImpact based on action characteristics and context
     */
    ActionReasoner.prototype.calculateGoalImpact = function (action, selectionReason, stateAnalysis, dimension) {
        // Extract key factors
        var successProb = action.successProbability || 5;
        var urgency = action.urgency || "normal";
        var cost = action.costEstimate || "low";
        var what = (action.what || "").toLowerCase();
        var why = (action.why || "").toLowerCase();
        // Calculate impact score (0-10)
        var impactScore = 0;
        // Factor 1: Success probability (0-3 points)
        impactScore += (successProb / 10) * 3;
        // Factor 2: Urgency (0-2 points)
        if (urgency === "urgent")
            impactScore += 2;
        else if (urgency === "normal")
            impactScore += 1;
        // Factor 3: Cost-effectiveness (0-2 points)
        if (cost === "low")
            impactScore += 2;
        else if (cost === "medium")
            impactScore += 1;
        // Factor 4: Action type keywords (0-3 points)
        var highImpactKeywords = [
            "complete", "finalize", "deliver", "synthesize", "analyze", "compare",
            "evaluate", "assess", "deep", "comprehensive", "detailed"
        ];
        var mediumImpactKeywords = [
            "search", "gather", "collect", "explore", "investigate"
        ];
        var lowImpactKeywords = [
            "check", "verify", "review", "monitor"
        ];
        var hasHighImpact = highImpactKeywords.some(function (kw) { return what.includes(kw) || why.includes(kw); });
        var hasMediumImpact = mediumImpactKeywords.some(function (kw) { return what.includes(kw) || why.includes(kw); });
        var hasLowImpact = lowImpactKeywords.some(function (kw) { return what.includes(kw) || why.includes(kw); });
        if (hasHighImpact && !hasLowImpact)
            impactScore += 3;
        else if (hasMediumImpact)
            impactScore += 2;
        else if (hasLowImpact)
            impactScore += 1;
        // Factor 5: Dimension value score (0-2 points)
        // Actions on high-value dimensions have higher impact
        if (dimension.valueScore >= 8)
            impactScore += 2;
        else if (dimension.valueScore >= 5)
            impactScore += 1;
        // Normalize to 0-10 range
        impactScore = Math.min(10, Math.max(0, impactScore));
        // Map score to descriptive string
        if (impactScore >= 8) {
            return "High impact - Directly advances goal completion (score: ".concat(impactScore.toFixed(1), "/10)");
        }
        else if (impactScore >= 6) {
            return "Medium-high impact - Significant progress toward milestone (score: ".concat(impactScore.toFixed(1), "/10)");
        }
        else if (impactScore >= 4) {
            return "Medium impact - Steady progress on dimension (score: ".concat(impactScore.toFixed(1), "/10)");
        }
        else if (impactScore >= 2) {
            return "Low-medium impact - Supporting information gathering (score: ".concat(impactScore.toFixed(1), "/10)");
        }
        else {
            return "Low impact - Maintenance or verification activity (score: ".concat(impactScore.toFixed(1), "/10)");
        }
    };
    /**
     * Build comprehensive reasoning trace from all five steps
     */
    ActionReasoner.prototype.buildReasoningTrace = function (parsed) {
        var steps = [];
        if (parsed.step1_stateAnalysis) {
            steps.push("**Step 1: Current State Analysis**\n".concat(parsed.step1_stateAnalysis));
        }
        if (parsed.step2_keyProblems && Array.isArray(parsed.step2_keyProblems)) {
            steps.push("**Step 2: Key Problems**\n".concat(parsed.step2_keyProblems.map(function (p, i) { return "".concat(i + 1, ". ").concat(p); }).join("\n")));
        }
        if (parsed.step3_candidates && Array.isArray(parsed.step3_candidates)) {
            steps.push("**Step 3: Candidate Actions**\n".concat(parsed.step3_candidates.map(function (c, i) {
                return "Option ".concat(i + 1, ": ").concat(c.what, "\n  Reason: ").concat(c.why, "\n  Impact: ").concat(c.impactCategory || "medium", "\n  Success: ").concat(c.successProbability, "/10");
            }).join("\n\n")));
        }
        if (parsed.step4_evaluation) {
            steps.push("**Step 4: Evaluation**\nSelected: Option ".concat(parsed.step4_evaluation.selectedIndex + 1, "\nReason: ").concat(parsed.step4_evaluation.selectionReason, "\nRankings: ").concat(parsed.step4_evaluation.rankings));
        }
        if (parsed.step5_executionPlan) {
            steps.push("**Step 5: Execution Plan**\nTools: ".concat((parsed.step5_executionPlan.toolsNeeded || []).join(", "), "\nSuccess Criteria: ").concat(parsed.step5_executionPlan.successCriteria, "\nFallback: ").concat(parsed.step5_executionPlan.fallbackOptions));
        }
        return steps.length > 0 ? steps.join("\n\n") : "No detailed reasoning trace available";
    };
    /**
     * Build knowledge to save from reasoning process
     */
    ActionReasoner.prototype.buildKnowledgeToSave = function (parsed) {
        var knowledge = [];
        // Save key problems identified
        if (parsed.step2_keyProblems && Array.isArray(parsed.step2_keyProblems)) {
            knowledge.push("Key Problems: ".concat(parsed.step2_keyProblems.join("; ")));
        }
        // Save state analysis for future reference
        if (parsed.step1_stateAnalysis) {
            // Just save the key insight, not the full analysis
            var firstLine = parsed.step1_stateAnalysis.split("\n")[0];
            knowledge.push("State: ".concat(firstLine.substring(0, 100), "..."));
        }
        // Save alternative actions considered
        if (parsed.step3_candidates && Array.isArray(parsed.step3_candidates)) {
            var alternatives = parsed.step3_candidates.map(function (c) { return c.what; }).filter(Boolean).join("; ");
            if (alternatives) {
                knowledge.push("Alternatives Considered: ".concat(alternatives));
            }
        }
        return knowledge.join("\n\n");
    };
    return ActionReasoner;
}());
exports.ActionReasoner = ActionReasoner;
