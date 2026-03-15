"use strict";
/**
 * BackgroundAgentLoop — The core background event loop
 *
 * Lifecycle:
 * 1. User creates a goal via /goal add → starts the loop
 * 2. Loop runs cycles: collect info → judge relevance → reason → execute
 * 3. All goals completed/abandoned → enters idle (long interval checks)
 * 4. User /goal stop → stops the loop
 *
 * Key constraints:
 * - Completely independent from foreground AgentSession
 * - Outputs via NotificationQueue (async, non-blocking)
 * - Self-recovers from errors (exponential backoff)
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.BackgroundAgentLoop = void 0;
var action_reasoner_js_1 = require("../action-pipeline/action-reasoner.js");
var capability_resolver_js_1 = require("../action-pipeline/capability-resolver.js");
var executor_js_1 = require("../action-pipeline/executor.js");
var pre_action_gate_js_1 = require("../action-pipeline/pre-action-gate.js");
var info_collector_js_1 = require("../info-engine/info-collector.js");
var relevance_judge_js_1 = require("../info-engine/relevance-judge.js");
var llm_channel_js_1 = require("./llm-channel.js");
var loop_scheduler_js_1 = require("./loop-scheduler.js");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var BackgroundAgentLoop = /** @class */ (function () {
    function BackgroundAgentLoop(deps, goalManager, knowledgeStore, notificationQueue, piApi) {
        this.running = false;
        this.loopTimer = null;
        this.lastProcessedGoalId = null;
        this.llmChannel = new llm_channel_js_1.BackgroundLLMChannel(deps.modelRegistry);
        this.llmChannel.syncModel(deps.currentModel);
        this.goalManager = goalManager;
        this.knowledgeStore = knowledgeStore;
        this.notificationQueue = notificationQueue;
        this.scheduler = new loop_scheduler_js_1.LoopScheduler();
        this.piApi = piApi;
        // Setup data directory for persistence
        this.dataDir = (0, node_path_1.join)(deps.dataDir, "loop-state");
        this.stateFilePath = (0, node_path_1.join)(this.dataDir, "state.json");
        this.ensureDir();
        this.infoCollector = new info_collector_js_1.InfoCollector(piApi);
        this.relevanceJudge = new relevance_judge_js_1.RelevanceJudge(this.llmChannel);
        this.actionReasoner = new action_reasoner_js_1.ActionReasoner(this.llmChannel);
        this.capabilityResolver = new capability_resolver_js_1.CapabilityResolver(this.llmChannel);
        this.preActionGate = new pre_action_gate_js_1.PreActionGate(this.llmChannel);
        // Load or initialize loop state
        this.loopState = this.loadLoopState();
    }
    /**
     * Start the background loop
     */
    BackgroundAgentLoop.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.running)
                    return [2 /*return*/];
                this.running = true;
                this.loopState.status = "waiting";
                this.saveLoopState();
                this.scheduleNextCycle(0); // Start immediately
                return [2 /*return*/];
            });
        });
    };
    /**
     * Stop the background loop
     */
    BackgroundAgentLoop.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.running = false;
                this.loopState.status = "stopped";
                this.saveLoopState();
                this.llmChannel.abort();
                if (this.loopTimer) {
                    clearTimeout(this.loopTimer);
                    this.loopTimer = null;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Check if the loop is running
     */
    BackgroundAgentLoop.prototype.isRunning = function () {
        return this.running;
    };
    /**
     * Get current loop state
     */
    BackgroundAgentLoop.prototype.getLoopState = function () {
        return __assign({}, this.loopState);
    };
    /**
     * Sync model when user changes it
     */
    BackgroundAgentLoop.prototype.onModelChange = function (model) {
        this.llmChannel.syncModel(model);
    };
    /**
     * Update notification configuration
     */
    BackgroundAgentLoop.prototype.updateNotificationConfig = function (updates) {
        this.loopState.notificationConfig = __assign(__assign({}, this.loopState.notificationConfig), updates);
        this.saveLoopState();
    };
    /**
     * Schedule the next cycle
     */
    BackgroundAgentLoop.prototype.scheduleNextCycle = function (delayMs) {
        var _this = this;
        if (!this.running)
            return;
        this.loopState.nextCycleDelay = delayMs;
        this.loopState.status = "waiting";
        this.saveLoopState();
        this.loopTimer = setTimeout(function () { return _this.runCycle(); }, delayMs);
    };
    /**
     * Run a single cycle of the background loop
     * P0: only does basic goal checking and scheduling
     * P1+: will add info collection, reasoning, execution
     */
    BackgroundAgentLoop.prototype.runCycle = function () {
        return __awaiter(this, void 0, void 0, function () {
            var activeGoals, _a, goal, dimensions, cycleLogData, cycleLogDetails, currentDim, allGoalSources, mockSourceObjects, rawItems, relevantItems, _i, rawItems_1, item, level, config, strongCount, topItems, summary, _b, relevantItems_1, item, maxItemsToShow, i, item, summary, relevance, url, actionPlan, gateDecision, resolution, executor, execResult, config, hasSubstantialOutput, hasNewDimensions, outputPreview, failedStep, errorFirstLine, nextDelay, error_1, errorCount, backoff;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.running)
                            return [2 /*return*/];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 24, , 25]);
                        this.loopState.status = "collecting";
                        this.loopState.cycleCount++;
                        this.saveLoopState();
                        activeGoals = this.goalManager.getActiveGoals();
                        if (activeGoals.length === 0) {
                            this.loopState.status = "idle";
                            this.saveLoopState();
                            this.scheduleNextCycle(60000); // No goals, check again in 1 min
                            return [2 /*return*/];
                        }
                        _a = this.scheduler.selectNextWorkItem(activeGoals, this.goalManager.getAllDimensionsByGoal(), this.lastProcessedGoalId), goal = _a.goal, dimensions = _a.dimensions;
                        this.loopState.currentGoalId = goal.id;
                        this.lastProcessedGoalId = goal.id;
                        if (dimensions.length > 0) {
                            this.loopState.currentDimensionId = dimensions[0].id;
                        }
                        cycleLogData = {
                            rawInfoCount: 0,
                            relevantInfoCount: 0,
                            relevantInfoSample: [],
                            relevanceJudgments: { total: 0, relevant: 0, weak: 0, irrelevant: 0 }
                        };
                        cycleLogDetails = "";
                        if (!(dimensions.length > 0)) return [3 /*break*/, 21];
                        currentDim = dimensions[0];
                        if (!(currentDim.status === "pending")) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.goalManager.updateDimension(goal.id, currentDim.id, { status: "exploring" })];
                    case 2:
                        _c.sent();
                        currentDim.status = "exploring";
                        _c.label = 3;
                    case 3:
                        allGoalSources = this.goalManager.getDimensions(goal.id).flatMap(function (d) { return d.dataSources; });
                        mockSourceObjects = currentDim.dataSources.map(function (b) { return ({
                            id: b.sourceId,
                            type: "web_search",
                            name: "Web Search",
                            config: { query: b.query },
                            reachable: true,
                            lastCheckedAt: Date.now()
                        }); });
                        // Phase 1: Information Collection & Relevance Judgment
                        this.loopState.status = "collecting";
                        return [4 /*yield*/, this.infoCollector.collect(goal.id, currentDim, mockSourceObjects)];
                    case 4:
                        rawItems = _c.sent();
                        // Update cycle log data with collection results
                        cycleLogData.rawInfoCount = rawItems.length;
                        relevantItems = [];
                        if (!(rawItems.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.relevanceJudge.judgeBatch(goal, currentDim, rawItems)];
                    case 5:
                        relevantItems = _c.sent();
                        // Collect relevance statistics
                        cycleLogData.relevanceJudgments.total = rawItems.length;
                        cycleLogData.relevantInfoCount = relevantItems.length;
                        // Count by relevance level
                        for (_i = 0, rawItems_1 = rawItems; _i < rawItems_1.length; _i++) {
                            item = rawItems_1[_i];
                            level = item.relevanceLevel || "unknown";
                            if (level === "strong") {
                                cycleLogData.relevanceJudgments.relevant++;
                            }
                            else if (level === "weak") {
                                cycleLogData.relevanceJudgments.weak++;
                            }
                            else {
                                cycleLogData.relevanceJudgments.irrelevant++;
                            }
                        }
                        config = this.loopState.notificationConfig;
                        if (config.enableDiscoveryNotification) {
                            strongCount = relevantItems.filter(function (item) {
                                return item.relevanceLevel === "strong";
                            }).length;
                            if (strongCount >= config.strongRelevanceThreshold || relevantItems.length >= config.totalRelevantThreshold) {
                                topItems = relevantItems.slice(0, 3);
                                summary = topItems.map(function (item) {
                                    var preview = item.content.split('\n')[0].substring(0, 80);
                                    var relevance = item.relevanceLevel ? "[".concat(item.relevanceLevel, "]") : '';
                                    return "".concat(relevance, " ").concat(preview).concat(item.content.length > 80 ? '...' : '');
                                }).join('\n');
                                this.notificationQueue.enqueue({
                                    id: Date.now().toString(),
                                    type: "suggestion",
                                    priority: "normal",
                                    title: "\uD83D\uDCA1 \u53D1\u73B0 ".concat(strongCount >= config.strongRelevanceThreshold ? '重要' : '相关', "\u4FE1\u606F (").concat(relevantItems.length, " \u6761)"),
                                    content: "**\u76EE\u6807**: ".concat(goal.title, "\n**\u7EF4\u5EA6**: ").concat(currentDim.title, "\n\n**\u5173\u952E\u53D1\u73B0**:\n").concat(summary, "\n\n").concat(relevantItems.length > 3 ? "... \u8FD8\u6709 ".concat(relevantItems.length - 3, " \u6761\u76F8\u5173\u4FE1\u606F") : ''),
                                    goalId: goal.id,
                                    createdAt: Date.now(),
                                    deliveredAt: null
                                });
                            }
                        }
                        // Save relevant info to knowledge store
                        for (_b = 0, relevantItems_1 = relevantItems; _b < relevantItems_1.length; _b++) {
                            item = relevantItems_1[_b];
                            this.knowledgeStore.save({
                                content: item.content,
                                source: "dimension_discovery",
                                relatedGoalIds: [goal.id],
                                relatedDimensionIds: [currentDim.id],
                                tags: [item.relevanceLevel || "unknown"]
                            });
                        }
                        // Collect samples of relevant info
                        cycleLogData.relevantInfoSample = relevantItems.slice(0, 3).map(function (item) {
                            var summary = item.content.split('\n')[0].substring(0, 80);
                            return item.relevanceLevel ? "[".concat(item.relevanceLevel, "] ").concat(summary) : summary;
                        });
                        // Build detailed info summary
                        cycleLogDetails = "\uD83D\uDCCA \u91C7\u96C6 ".concat(rawItems.length, " \u6761\uFF0C\u76F8\u5173 ").concat(relevantItems.length, " \u6761");
                        cycleLogDetails += " (\u5F3A\u76F8\u5173: ".concat(cycleLogData.relevanceJudgments.relevant, ", \u5F31\u76F8\u5173: ").concat(cycleLogData.relevanceJudgments.weak, ", \u4E0D\u76F8\u5173: ").concat(cycleLogData.relevanceJudgments.irrelevant, ")");
                        if (relevantItems.length > 0) {
                            cycleLogDetails += "\n   \uD83D\uDCCC \u91C7\u96C6\u5230\u7684\u76F8\u5173\u4FE1\u606F:";
                            maxItemsToShow = Math.min(3, relevantItems.length);
                            for (i = 0; i < maxItemsToShow; i++) {
                                item = relevantItems[i];
                                summary = item.content.split('\n')[0].substring(0, 80);
                                relevance = item.relevanceLevel ? "[".concat(item.relevanceLevel, "] ") : '';
                                url = item.url ? " \uD83D\uDD17 ".concat(item.url) : '';
                                cycleLogDetails += "\n   ".concat(i + 1, ". ").concat(relevance).concat(summary).concat(url);
                            }
                            if (relevantItems.length > 3) {
                                cycleLogDetails += "\n   ... \u8FD8\u6709 ".concat(relevantItems.length - 3, " \u6761");
                            }
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        cycleLogDetails = "\uD83D\uDCCA \u672A\u91C7\u96C6\u5230\u65B0\u4FE1\u606F";
                        _c.label = 7;
                    case 7:
                        // Phase 2: Action Reasoning & Execution
                        this.loopState.status = "reasoning";
                        return [4 /*yield*/, this.actionReasoner.reasonNextAction(goal, currentDim, relevantItems)];
                    case 8:
                        actionPlan = _c.sent();
                        if (!actionPlan) return [3 /*break*/, 17];
                        // Record action plan details
                        cycleLogData.actionPlan = "".concat(actionPlan.what, "\n\u539F\u56E0: ").concat(actionPlan.why, "\n\u9884\u671F: ").concat(actionPlan.expectedOutcome);
                        this.loopState.currentActionPlanId = actionPlan.id;
                        return [4 /*yield*/, this.preActionGate.evaluate(goal, actionPlan)];
                    case 9:
                        gateDecision = _c.sent();
                        if (!(gateDecision === "approve")) return [3 /*break*/, 15];
                        this.loopState.status = "executing";
                        if (!this.piApi) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.capabilityResolver.resolve(actionPlan)];
                    case 10:
                        resolution = _c.sent();
                        executor = new executor_js_1.Executor(this.piApi, this.llmChannel);
                        return [4 /*yield*/, executor.execute(actionPlan, resolution)];
                    case 11:
                        execResult = _c.sent();
                        if (execResult.status === "completed") {
                            cycleLogData.actionResult = "\u2705 \u6210\u529F: ".concat(actionPlan.what);
                            cycleLogDetails += "\n   \u2705 \u6267\u884C: ".concat(actionPlan.what);
                            config = this.loopState.notificationConfig;
                            if (config.enableDeliveryNotification) {
                                hasSubstantialOutput = execResult.output && execResult.output.length > config.deliveryMinOutputLength;
                                hasNewDimensions = execResult.newDimensions && execResult.newDimensions.length > 0;
                                if (hasSubstantialOutput || hasNewDimensions) {
                                    outputPreview = "";
                                    if (hasSubstantialOutput) {
                                        outputPreview = execResult.output.split('\n')[0].substring(0, 100);
                                        if (execResult.output.length > 100)
                                            outputPreview += "...";
                                    }
                                    this.notificationQueue.enqueue({
                                        id: Date.now().toString(),
                                        type: "delivery",
                                        priority: "normal",
                                        title: "\uD83D\uDCE6 \u4EA4\u4ED8\u7269: ".concat(actionPlan.what),
                                        content: "**\u76EE\u6807**: ".concat(goal.title, "\n**\u884C\u52A8**: ").concat(actionPlan.what, "\n**\u9884\u671F**: ").concat(actionPlan.expectedOutcome, "\n\n").concat(hasSubstantialOutput ? "**\u8F93\u51FA\u9884\u89C8**:\n".concat(outputPreview, "\n\n") : '').concat(hasNewDimensions ? "\u2728 \u53D1\u73B0\u4E86 ".concat(execResult.newDimensions.length, " \u4E2A\u65B0\u63A2\u7D22\u7EF4\u5EA6") : ''),
                                        goalId: goal.id,
                                        actionPlanId: actionPlan.id,
                                        createdAt: Date.now(),
                                        deliveredAt: null
                                    });
                                }
                            }
                        }
                        else {
                            failedStep = execResult.stepResults.find(function (r) { return r.status === "failed"; });
                            if (failedStep === null || failedStep === void 0 ? void 0 : failedStep.error) {
                                errorFirstLine = failedStep.error.split('\n')[0].substring(0, 60);
                                cycleLogData.actionResult = "\u274C \u5931\u8D25: ".concat(errorFirstLine);
                                cycleLogDetails += "\n   \u274C \u6267\u884C\u5931\u8D25: ".concat(errorFirstLine, "...");
                            }
                            else {
                                cycleLogData.actionResult = "\u274C \u5931\u8D25: \u672A\u77E5\u9519\u8BEF";
                                cycleLogDetails += "\n   \u274C \u6267\u884C\u5931\u8D25";
                            }
                        }
                        // Simulate progressing depth after execution
                        currentDim.explorationDepth += 1;
                        return [4 /*yield*/, this.goalManager.updateDimension(goal.id, currentDim.id, {
                                explorationDepth: currentDim.explorationDepth
                            })];
                    case 12:
                        _c.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        cycleLogData.actionResult = "\u23F8\uFE0F API\u672A\u5C31\u7EEA";
                        cycleLogDetails += "\n   \u23F8\uFE0F API\u672A\u5C31\u7EEA\uFF0C\u5DF2\u6302\u8D77";
                        _c.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        if (gateDecision === "needs_user") {
                            cycleLogData.actionResult = "\u26A0\uFE0F \u9700\u6388\u6743: ".concat(actionPlan.what);
                            cycleLogDetails += "\n   \u26A0\uFE0F \u9700\u6388\u6743: ".concat(actionPlan.what);
                            this.notificationQueue.enqueue({
                                id: Date.now().toString(),
                                type: "help_request",
                                priority: "high",
                                title: "\u26A0\uFE0F \u9700\u8981\u6388\u6743: ".concat(actionPlan.what),
                                content: "**\u539F\u56E0**: ".concat(actionPlan.why, "\n**\u9884\u671F\u7ED3\u679C**: ").concat(actionPlan.expectedOutcome, "\n\n\u8BE5\u64CD\u4F5C\u88AB\u62E6\u622A\u5E76\u7B49\u5F85\u60A8\u7684\u6279\u51C6\u3002"),
                                goalId: goal.id,
                                actionPlanId: actionPlan.id,
                                createdAt: Date.now(),
                                deliveredAt: null
                            });
                        }
                        else {
                            cycleLogData.actionResult = "\uD83D\uDEAB \u88AB\u62E6\u622A: ".concat(actionPlan.what);
                            cycleLogDetails += "\n   \uD83D\uDEAB \u88AB\u62E6\u622A: ".concat(actionPlan.what, " (\u8FDD\u53CD\u7EA6\u675F)");
                        }
                        _c.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        cycleLogData.actionResult = relevantItems.length === 0 ? "💭 信息不足，暂无行动" : "💭 已收集足够信息，无需行动";
                        if (relevantItems.length === 0) {
                            cycleLogDetails += "\n   \uD83D\uDCAD \u4FE1\u606F\u4E0D\u8DB3\uFF0C\u6682\u65E0\u884C\u52A8";
                        }
                        else {
                            cycleLogDetails += "\n   \uD83D\uDCAD \u5DF2\u6536\u96C6\u8DB3\u591F\u4FE1\u606F\uFF0C\u65E0\u9700\u884C\u52A8";
                        }
                        _c.label = 18;
                    case 18:
                        if (!(currentDim.explorationDepth >= currentDim.estimated_depth)) return [3 /*break*/, 20];
                        return [4 /*yield*/, this.goalManager.updateDimension(goal.id, currentDim.id, { status: "explored" })];
                    case 19:
                        _c.sent();
                        cycleLogDetails += "\n   \uD83C\uDFC1 \u8FBE\u5230\u6700\u5927\u6DF1\u5EA6";
                        _c.label = 20;
                    case 20: return [3 /*break*/, 22];
                    case 21:
                        cycleLogDetails = "所有维度已探索完毕";
                        _c.label = 22;
                    case 22: 
                    // Add authentic log with detailed breakdown
                    return [4 /*yield*/, this.goalManager.addCycleLog({
                            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                            goalId: goal.id,
                            dimensionId: dimensions.length > 0 ? dimensions[0].id : undefined,
                            dimensionTitle: dimensions.length > 0 ? dimensions[0].title : undefined,
                            cycleNumber: this.loopState.cycleCount,
                            status: "success",
                            actionType: "exploration",
                            details: cycleLogDetails,
                            timestamp: Date.now(),
                            // Detailed breakdown
                            rawInfoCount: cycleLogData.rawInfoCount,
                            relevantInfoCount: cycleLogData.relevantInfoCount,
                            relevantInfoSample: cycleLogData.relevantInfoSample,
                            actionPlan: cycleLogData.actionPlan,
                            actionResult: cycleLogData.actionResult,
                            relevanceJudgments: cycleLogData.relevanceJudgments
                        })];
                    case 23:
                        // Add authentic log with detailed breakdown
                        _c.sent();
                        // Step 8: Calculate next delay and schedule
                        this.loopState.status = "waiting";
                        this.loopState.lastCycleAt = Date.now();
                        this.saveLoopState();
                        nextDelay = this.calculateNextDelay(goal);
                        this.scheduleNextCycle(nextDelay);
                        return [3 /*break*/, 25];
                    case 24:
                        error_1 = _c.sent();
                        this.loopState.errors.push({
                            module: "background-loop",
                            message: String(error_1),
                            timestamp: Date.now(),
                            recoverable: true,
                        });
                        this.saveLoopState();
                        errorCount = this.loopState.errors.filter(function (e) { return Date.now() - e.timestamp < 60000; }).length;
                        backoff = Math.min(10 * 60000, 30000 * Math.pow(2, errorCount));
                        this.scheduleNextCycle(backoff);
                        return [3 /*break*/, 25];
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculate delay before next cycle based on goal state
     */
    BackgroundAgentLoop.prototype.calculateNextDelay = function (goal) {
        var dimensions = this.goalManager.getDimensions(goal.id);
        var hasUrgent = dimensions.some(function (d) { return d.timeliness === "urgent" && d.status !== "explored"; });
        var allExplored = dimensions.every(function (d) { return d.status === "explored"; });
        if (hasUrgent)
            return 10000; // 10 seconds
        if (allExplored)
            return 5 * 60000; // 5 minutes
        return 30000; // 30 seconds
    };
    // ── Persistence Methods ──
    /**
     * Ensure the state directory exists
     */
    BackgroundAgentLoop.prototype.ensureDir = function () {
        if (!(0, node_fs_1.existsSync)(this.dataDir)) {
            (0, node_fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    };
    /**
     * Load loop state from disk
     */
    BackgroundAgentLoop.prototype.loadLoopState = function () {
        // Try to load existing state
        if ((0, node_fs_1.existsSync)(this.stateFilePath)) {
            try {
                var content = (0, node_fs_1.readFileSync)(this.stateFilePath, "utf-8");
                var savedState = JSON.parse(content);
                // Check if there are active goals
                var activeGoals = this.goalManager.getActiveGoals();
                var hasActiveGoals = activeGoals.length > 0;
                // Restore state with intelligent defaults
                return __assign(__assign({}, savedState), { 
                    // If there are active goals, status should be "waiting" (not idle)
                    // "idle" should only be set when explicitly stopped or no goals
                    status: hasActiveGoals && savedState.status !== "stopped" ? "waiting" : "idle", 
                    // Clear current execution state (we don't want to resume mid-cycle)
                    currentGoalId: null, currentDimensionId: null, currentActionPlanId: null, 
                    // Preserve cycle count and last cycle time
                    cycleCount: savedState.cycleCount || 0, lastCycleAt: savedState.lastCycleAt || null, nextCycleDelay: savedState.nextCycleDelay || null, 
                    // Clean old errors (keep only recent ones from last hour)
                    errors: (savedState.errors || []).filter(function (e) { return Date.now() - e.timestamp < 60 * 60 * 1000; }), 
                    // Ensure notification config has defaults (for backward compatibility)
                    notificationConfig: savedState.notificationConfig || {
                        enableDiscoveryNotification: true,
                        strongRelevanceThreshold: 2,
                        totalRelevantThreshold: 5,
                        enableDeliveryNotification: true,
                        deliveryMinOutputLength: 100,
                    } });
            }
            catch (error) {
                // If load fails, start with fresh state
                return this.getInitialState();
            }
        }
        // No saved state, start fresh
        return this.getInitialState();
    };
    /**
     * Get initial state when no saved state exists
     */
    BackgroundAgentLoop.prototype.getInitialState = function () {
        var activeGoals = this.goalManager.getActiveGoals();
        return {
            status: activeGoals.length > 0 ? "waiting" : "idle",
            currentGoalId: null,
            currentDimensionId: null,
            currentActionPlanId: null,
            lastCycleAt: null,
            nextCycleDelay: null,
            cycleCount: 0,
            errors: [],
            notificationConfig: {
                enableDiscoveryNotification: true,
                strongRelevanceThreshold: 2,
                totalRelevantThreshold: 5,
                enableDeliveryNotification: true,
                deliveryMinOutputLength: 100,
            },
        };
    };
    /**
     * Save loop state to disk
     */
    BackgroundAgentLoop.prototype.saveLoopState = function () {
        try {
            (0, node_fs_1.writeFileSync)(this.stateFilePath, JSON.stringify(this.loopState, null, 2), "utf-8");
        }
        catch (error) {
            // Silently fail - state persistence is not critical
        }
    };
    return BackgroundAgentLoop;
}());
exports.BackgroundAgentLoop = BackgroundAgentLoop;
