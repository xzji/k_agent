"use strict";
/**
 * Goal-Driven Agent Extension — Entry Point
 *
 * Integrates the goal-driven agent into the pi coding-agent via the Extension API.
 *
 * Registers:
 * - /goal command (add, list, status, tree, knowledge, stop)
 * - Event listeners for idle detection (input, agent_start, agent_end)
 * - Model sync on model_select event
 * - Notification delivery on idle
 * - Custom message renderer for goal notifications
 *
 * Key design choices (from implementation review):
 * - Uses pi.on("input") instead of non-existent "user_input" event
 * - Uses pi.on("model_select") instead of "model_change"
 * - Uses pi.sendMessage() for notification output (not direct TUI access)
 * - Uses pi.registerMessageRenderer() for custom notification rendering
 */
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
var node_path_1 = require("node:path");
var config_js_1 = require("../../config.js");
var background_agent_loop_js_1 = require("./background-loop/background-agent-loop.js");
var goal_manager_js_1 = require("./goal-manager/goal-manager.js");
var knowledge_store_js_1 = require("./knowledge/knowledge-store.js");
var notification_queue_js_1 = require("./output-layer/notification-queue.js");
var idle_detector_js_1 = require("./output-layer/idle-detector.js");
var utils_js_1 = require("./utils.js");
var goalDrivenExtension = function (pi) {
    // ── Data directory ──
    var dataDir = (0, node_path_1.join)((0, config_js_1.getAgentDir)(), "goal-driven");
    // ── Deferred init, started on first /goal add ──
    var backgroundLoop = null;
    var idleDetector = null;
    // ── Helper function to initialize background loop ──
    function initializeBackgroundLoop(ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var currentModel, modelRegistry, SettingsManager, getAgentDir_1, ModelRegistry, AuthStorage, agentDir, settingsManager, defaultProvider, defaultModelId, deps, knowledgeStore, notificationQueue, llmChannel, onProgress, goalManager;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (backgroundLoop)
                            return [2 /*return*/]; // Already initialized
                        if (!(ctx && ctx.model)) return [3 /*break*/, 1];
                        // Use model from command context
                        currentModel = ctx.model;
                        modelRegistry = ctx.modelRegistry;
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, Promise.resolve().then(function () { return require("../settings-manager.js"); })];
                    case 2:
                        SettingsManager = (_a.sent()).SettingsManager;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("../../config.js"); })];
                    case 3:
                        getAgentDir_1 = (_a.sent()).getAgentDir;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("../model-registry.js"); })];
                    case 4:
                        ModelRegistry = (_a.sent()).ModelRegistry;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("../auth-storage.js"); })];
                    case 5:
                        AuthStorage = (_a.sent()).AuthStorage;
                        agentDir = getAgentDir_1();
                        settingsManager = SettingsManager.create(process.cwd(), agentDir);
                        modelRegistry = new ModelRegistry(AuthStorage.create(), agentDir + "/models.json");
                        defaultProvider = settingsManager.getDefaultProvider();
                        defaultModelId = settingsManager.getDefaultModel();
                        if (defaultProvider && defaultModelId) {
                            currentModel = modelRegistry.find(defaultProvider, defaultModelId);
                        }
                        _a.label = 6;
                    case 6:
                        if (!currentModel) {
                            throw new Error("No model selected. Please use /model to select a model first.");
                        }
                        deps = {
                            modelRegistry: modelRegistry,
                            currentModel: currentModel,
                            dataDir: dataDir,
                        };
                        knowledgeStore = new knowledge_store_js_1.KnowledgeStore(dataDir);
                        notificationQueue = new notification_queue_js_1.NotificationQueue();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("./background-loop/llm-channel.js"); })];
                    case 7:
                        llmChannel = new (_a.sent()).BackgroundLLMChannel(modelRegistry);
                        llmChannel.syncModel(currentModel);
                        onProgress = function (message, type) {
                            if (ctx) {
                                ctx.ui.notify(message, type || "info");
                            }
                            else {
                                console.log("[GoalManager] ".concat(message));
                            }
                        };
                        goalManager = new goal_manager_js_1.GoalManager(dataDir, llmChannel, pi, onProgress);
                        backgroundLoop = new background_agent_loop_js_1.BackgroundAgentLoop(deps, goalManager, knowledgeStore, notificationQueue, pi);
                        // Start idle detector
                        if (!idleDetector) {
                            idleDetector = new idle_detector_js_1.IdleDetector();
                            idleDetector.start(function () {
                                deliverPendingNotifications(pi);
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    // ── Notification renderer registration ──
    pi.registerMessageRenderer("goal_notification", function (message, _options, theme) {
        // Rendering is handled by pi-tui's default markdown renderer
        // via the CustomMessage display field. We return undefined
        // to use the default renderer.
        return undefined;
    });
    // ── /goal command ──
    pi.registerCommand("goal", {
        description: "Manage goal-driven agent (add/list/status/tree/logs/knowledge/stop/notify-config)",
        handler: function (args, ctx) {
            return __awaiter(this, void 0, void 0, function () {
                var parts, subcommand, rest, error_1, errorMsg, _a, error_2, goal, dims, sources, dimCount, sourceCount, treeText, summaryText, error_3, hasDetail, cleanArgs, goalId, error_4, goal, dims, sources, treeText, output, logs, recentLogs, goals, statusIcons_1, lines, error_5, state, goals, knowledgeCount, pendingNotifs, lastCycleTime, now, diffMs, diffMins, timeStr, hours, cycleInterval, seconds, mins, goalId, error_6, dims, sources, treeText, parts_1, goalId, error_7, goal, logs, cycleIndex, showAll, selectedLogs, cycleNum_1, log, output, parts_2, showAll, clearAll, goalIndex, error_8, entries, goalId, query, lines, error_9, activeGoals, seconds, parts_3, action, config, output, key, value, configMap, configKey, parsedValue, goalId, error_10, goal, goalId, error_11, goal;
                var _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            parts = args.trim().split(/\s+/);
                            subcommand = (_c = parts[0]) !== null && _c !== void 0 ? _c : "";
                            rest = parts.slice(1).join(" ");
                            if (!(subcommand !== "add" && subcommand !== "")) return [3 /*break*/, 4];
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 2:
                            _d.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _d.sent();
                            errorMsg = String(error_1);
                            if (errorMsg.includes("No model selected")) {
                                ctx.ui.notify("请先使用 /model 选择一个模型", "warning");
                            }
                            else {
                                ctx.ui.notify("\u8BF7\u5148\u4F7F\u7528 /goal add \u521B\u5EFA\u4E00\u4E2A\u76EE\u6807 (".concat(errorMsg, ")"), "warning");
                            }
                            return [2 /*return*/];
                        case 4:
                            _a = subcommand;
                            switch (_a) {
                                case "add": return [3 /*break*/, 5];
                                case "list": return [3 /*break*/, 14];
                                case "status": return [3 /*break*/, 19];
                                case "tree": return [3 /*break*/, 24];
                                case "logs": return [3 /*break*/, 29];
                                case "knowledge": return [3 /*break*/, 34];
                                case "stop": return [3 /*break*/, 39];
                                case "resume": return [3 /*break*/, 41];
                                case "config": return [3 /*break*/, 47];
                                case "notify-config": return [3 /*break*/, 48];
                                case "complete": return [3 /*break*/, 50];
                                case "abandon": return [3 /*break*/, 56];
                            }
                            return [3 /*break*/, 62];
                        case 5:
                            if (!rest) {
                                ctx.ui.notify("用法: /goal add <目标描述>", "warning");
                                return [2 /*return*/];
                            }
                            ctx.ui.notify("⏳ 正在创建目标...", "info");
                            _d.label = 6;
                        case 6:
                            _d.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 7:
                            _d.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            error_2 = _d.sent();
                            ctx.ui.notify("\u274C \u521D\u59CB\u5316\u5931\u8D25: ".concat(String(error_2)), "error");
                            return [2 /*return*/];
                        case 9:
                            _d.trys.push([9, 12, , 13]);
                            return [4 /*yield*/, backgroundLoop.goalManager.createGoal({
                                    title: rest,
                                    description: rest,
                                    authorizationDepth: "full_auto",
                                })];
                        case 10:
                            goal = _d.sent();
                            dims = backgroundLoop.goalManager.getDimensions(goal.id);
                            sources = backgroundLoop.goalManager.getDataSources(goal.id) || [];
                            dimCount = countDimensions(dims);
                            sourceCount = dims.reduce(function (sum, d) { return sum + d.dataSources.length + countChildSources(d); }, 0);
                            treeText = formatDimensionTree(dims, sources, 0, { value: 0 });
                            summaryText = "\u2705 \u76EE\u6807\u5DF2\u521B\u5EFA\u5E76\u5F00\u59CB\u540E\u53F0\u8FFD\u8E2A:\n\n";
                            summaryText += "\uD83D\uDCCC **".concat(goal.title, "**\n\n");
                            // Add goal understanding if available
                            if (goal.goal_understanding) {
                                summaryText += "\uD83C\uDFAF \u76EE\u6807\u7406\u89E3:\n   ".concat(goal.goal_understanding, "\n\n");
                            }
                            // Add completion vision if available
                            if (goal.completion_vision) {
                                summaryText += "\uD83C\uDFC6 \u5B8C\u6210\u613F\u666F:\n   ".concat(goal.completion_vision, "\n\n");
                            }
                            summaryText += "\uD83D\uDCCA \u5DF2\u62C6\u89E3 ".concat(dimCount, " \u4E2A\u7EF4\u5EA6\uFF0C\u53D1\u73B0 ").concat(sourceCount, " \u4E2A\u4FE1\u606F\u6E90\n\n");
                            summaryText += "\u76EE\u6807\u62C6\u89E3:\n".concat(treeText, "\n\n");
                            summaryText += "\uD83D\uDD04 \u540E\u53F0\u5FAA\u73AF\u5DF2\u542F\u52A8";
                            ctx.ui.notify(summaryText, "info");
                            // Start the background loop
                            return [4 /*yield*/, backgroundLoop.start()];
                        case 11:
                            // Start the background loop
                            _d.sent();
                            return [3 /*break*/, 13];
                        case 12:
                            error_3 = _d.sent();
                            ctx.ui.notify("\u274C \u521B\u5EFA\u76EE\u6807\u5931\u8D25: ".concat(String(error_3)), "error");
                            return [3 /*break*/, 13];
                        case 13: return [2 /*return*/];
                        case 14:
                            hasDetail = parts.includes("--detail");
                            cleanArgs = parts.filter(function (p) { return p !== "--detail"; }).slice(1);
                            goalId = cleanArgs.join(" ").trim();
                            if (!!backgroundLoop) return [3 /*break*/, 18];
                            _d.label = 15;
                        case 15:
                            _d.trys.push([15, 17, , 18]);
                            return [4 /*yield*/, initializeBackgroundLoop()];
                        case 16:
                            _d.sent();
                            return [3 /*break*/, 18];
                        case 17:
                            error_4 = _d.sent();
                            ctx.ui.notify("暂无目标。使用 /goal add <描述> 创建目标。", "info");
                            return [2 /*return*/];
                        case 18:
                            if (goalId) {
                                goal = backgroundLoop.goalManager.getGoal(goalId);
                                if (!goal) {
                                    ctx.ui.notify("\u672A\u627E\u5230\u76EE\u6807 ID: ".concat(goalId), "warning");
                                    return [2 /*return*/];
                                }
                                dims = backgroundLoop.goalManager.getDimensions(goalId);
                                sources = backgroundLoop.goalManager.getDataSources(goalId) || [];
                                treeText = formatDimensionTree(dims, sources, 0, { value: 0 });
                                output = "\uD83C\uDFAF \u76EE\u6807: **".concat(goal.title, "** (").concat(goal.status, ")\n\n\u7EF4\u5EA6\u6811\u53CA\u4FE1\u606F\u6E90:\n").concat(treeText);
                                if (hasDetail) {
                                    logs = backgroundLoop.goalManager.getCycleLogs(goalId);
                                    output += "\n\n\uD83D\uDD04 \u5468\u671F\u6267\u884C\u8BB0\u5F55 (".concat(logs.length, "):\n");
                                    if (logs.length === 0) {
                                        output += "  暂无记录";
                                    }
                                    else {
                                        recentLogs = logs.slice(-10);
                                        output += recentLogs.map(function (l) {
                                            var timeStr = new Date(l.timestamp).toLocaleTimeString();
                                            var dimInfo = l.dimensionTitle ? " [".concat(l.dimensionTitle, "]") : "";
                                            var logEntry = "  [C".concat(l.cycleNumber, "] ").concat(timeStr).concat(dimInfo, "\n");
                                            // Show detailed breakdown if available
                                            if (l.relevanceJudgments) {
                                                var j = l.relevanceJudgments;
                                                logEntry += "     \uD83D\uDCCA \u4FE1\u606F: ".concat(l.rawInfoCount || 0, " \u91C7\u96C6 \u2192 ").concat(l.relevantInfoCount || 0, " \u76F8\u5173");
                                                logEntry += " (\u5F3A:".concat(j.relevant, " \u5F31:").concat(j.weak, " \u65E0:").concat(j.irrelevant, ")\n");
                                            }
                                            if (l.actionPlan) {
                                                logEntry += "     \uD83E\uDD14 \u8BA1\u5212: ".concat(l.actionPlan.split('\n')[0], "\n");
                                            }
                                            if (l.actionResult) {
                                                logEntry += "     \u26A1 \u7ED3\u679C: ".concat(l.actionResult, "\n");
                                            }
                                            // Show summary details
                                            logEntry += "     \uD83D\uDCDD ".concat(l.details.split('\n')[0]);
                                            return logEntry;
                                        }).join("\n");
                                    }
                                }
                                ctx.ui.notify(output, "info");
                                return [2 /*return*/];
                            }
                            goals = backgroundLoop.goalManager.getAllGoals();
                            if (goals.length === 0) {
                                ctx.ui.notify("暂无目标。使用 /goal add <描述> 创建目标。", "info");
                                return [2 /*return*/];
                            }
                            statusIcons_1 = {
                                active: "🟢",
                                paused: "⏸️",
                                completed: "✅",
                                abandoned: "❌",
                            };
                            lines = goals.map(function (g) { var _a; return "".concat((_a = statusIcons_1[g.status]) !== null && _a !== void 0 ? _a : "❓", " [").concat(g.id, "] ").concat(g.title, " (").concat(g.status, ")"); });
                            ctx.ui.notify("📋 目标列表 (使用 /goal list <ID> 查看详细维度):\n" + lines.join("\n"), "info");
                            return [2 /*return*/];
                        case 19:
                            if (!!backgroundLoop) return [3 /*break*/, 23];
                            _d.label = 20;
                        case 20:
                            _d.trys.push([20, 22, , 23]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 21:
                            _d.sent();
                            return [3 /*break*/, 23];
                        case 22:
                            error_5 = _d.sent();
                            ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
                            return [2 /*return*/];
                        case 23:
                            state = backgroundLoop.getLoopState();
                            goals = backgroundLoop.goalManager.getActiveGoals();
                            knowledgeCount = backgroundLoop.knowledgeStore.count();
                            pendingNotifs = backgroundLoop.notificationQueue.pendingCount;
                            lastCycleTime = "从未运行";
                            if (state.lastCycleAt) {
                                now = Date.now();
                                diffMs = now - state.lastCycleAt;
                                diffMins = Math.floor(diffMs / 60000);
                                timeStr = new Date(state.lastCycleAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                                if (diffMins < 1) {
                                    lastCycleTime = "".concat(timeStr, " (\u521A\u521A)");
                                }
                                else if (diffMins < 60) {
                                    lastCycleTime = "".concat(timeStr, " (").concat(diffMins, " \u5206\u949F\u524D)");
                                }
                                else {
                                    hours = Math.floor(diffMins / 60);
                                    lastCycleTime = "".concat(timeStr, " (").concat(hours, " \u5C0F\u65F6\u524D)");
                                }
                            }
                            cycleInterval = "未设置";
                            if (state.nextCycleDelay !== null) {
                                seconds = Math.round(state.nextCycleDelay / 1000);
                                if (seconds < 60) {
                                    cycleInterval = "".concat(seconds, " \u79D2");
                                }
                                else {
                                    mins = Math.floor(seconds / 60);
                                    cycleInterval = "".concat(mins, " \u5206\u949F");
                                }
                            }
                            ctx.ui.notify("\uD83D\uDCCA \u540E\u53F0\u72B6\u6001:\n" +
                                "  \u5FAA\u73AF\u72B6\u6001: ".concat(state.status, "\n") +
                                "  \u5DF2\u8FD0\u884C ".concat(state.cycleCount, " \u4E2A\u5468\u671F\n") +
                                "  \u4E0A\u6B21\u8FD0\u884C: ".concat(lastCycleTime, "\n") +
                                "  \u5FAA\u73AF\u95F4\u9694: ".concat(cycleInterval, "\n") +
                                "  \u6D3B\u8DC3\u76EE\u6807: ".concat(goals.length, " \u4E2A\n") +
                                "  \u77E5\u8BC6\u79EF\u7D2F: ".concat(knowledgeCount, " \u6761\n") +
                                "  \u5F85\u63A8\u9001\u901A\u77E5: ".concat(pendingNotifs, " \u6761\n") +
                                "  \u6700\u8FD1\u9519\u8BEF: ".concat(state.errors.length, " \u4E2A"), "info");
                            return [2 /*return*/];
                        case 24:
                            goalId = rest.trim();
                            if (!goalId) {
                                ctx.ui.notify("用法: /goal tree <目标ID>", "warning");
                                return [2 /*return*/];
                            }
                            if (!!backgroundLoop) return [3 /*break*/, 28];
                            _d.label = 25;
                        case 25:
                            _d.trys.push([25, 27, , 28]);
                            return [4 /*yield*/, initializeBackgroundLoop()];
                        case 26:
                            _d.sent();
                            return [3 /*break*/, 28];
                        case 27:
                            error_6 = _d.sent();
                            ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
                            return [2 /*return*/];
                        case 28:
                            dims = backgroundLoop.goalManager.getDimensions(goalId);
                            if (dims.length === 0) {
                                ctx.ui.notify("未找到目标或无维度。", "warning");
                                return [2 /*return*/];
                            }
                            sources = backgroundLoop.goalManager.getDataSources(goalId) || [];
                            treeText = formatDimensionTree(dims, sources, 0, { value: 0 });
                            ctx.ui.notify("\u7EF4\u5EA6\u6811:\n".concat(treeText), "info");
                            return [2 /*return*/];
                        case 29:
                            parts_1 = rest.trim().split(/\s+/);
                            goalId = parts_1[0];
                            if (!goalId) {
                                ctx.ui.notify("用法: /goal logs <目标ID> [--cycle N] [--all]", "warning");
                                return [2 /*return*/];
                            }
                            if (!!backgroundLoop) return [3 /*break*/, 33];
                            _d.label = 30;
                        case 30:
                            _d.trys.push([30, 32, , 33]);
                            return [4 /*yield*/, initializeBackgroundLoop()];
                        case 31:
                            _d.sent();
                            return [3 /*break*/, 33];
                        case 32:
                            error_7 = _d.sent();
                            ctx.ui.notify("后台循环未启动。请先创建一个目标。", "info");
                            return [2 /*return*/];
                        case 33:
                            goal = backgroundLoop.goalManager.getGoal(goalId);
                            if (!goal) {
                                ctx.ui.notify("\u672A\u627E\u5230\u76EE\u6807: ".concat(goalId), "warning");
                                return [2 /*return*/];
                            }
                            logs = backgroundLoop.goalManager.getCycleLogs(goalId);
                            if (logs.length === 0) {
                                ctx.ui.notify("该目标暂无周期执行记录。", "info");
                                return [2 /*return*/];
                            }
                            cycleIndex = parts_1.indexOf("--cycle");
                            showAll = parts_1.includes("--all");
                            selectedLogs = logs;
                            if (cycleIndex !== -1 && parts_1[cycleIndex + 1]) {
                                cycleNum_1 = parseInt(parts_1[cycleIndex + 1], 10);
                                log = logs.find(function (l) { return l.cycleNumber === cycleNum_1; });
                                if (!log) {
                                    ctx.ui.notify("\u672A\u627E\u5230\u5468\u671F ".concat(cycleNum_1, " \u7684\u8BB0\u5F55"), "warning");
                                    return [2 /*return*/];
                                }
                                selectedLogs = [log];
                            }
                            else if (!showAll) {
                                // Show last 10 by default
                                selectedLogs = logs.slice(-10);
                            }
                            output = "\uD83C\uDFAF \u76EE\u6807: **".concat(goal.title, "**\n");
                            output += "\uD83D\uDD04 \u5468\u671F\u6267\u884C\u8BB0\u5F55 (".concat(selectedLogs.length).concat(showAll ? '' : " / \u5171 ".concat(logs.length), ")\n\n");
                            output += selectedLogs.map(function (l) {
                                var timeStr = new Date(l.timestamp).toLocaleString();
                                var logEntry = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
                                logEntry += "\uD83D\uDCC5 \u5468\u671F #".concat(l.cycleNumber, " - ").concat(timeStr, "\n");
                                if (l.dimensionTitle) {
                                    logEntry += "\uD83C\uDFAF \u7EF4\u5EA6: ".concat(l.dimensionTitle, "\n");
                                }
                                logEntry += "\n";
                                // Information collection breakdown
                                if (l.relevanceJudgments) {
                                    var j = l.relevanceJudgments;
                                    logEntry += "\uD83D\uDCCA \u4FE1\u606F\u91C7\u96C6:\n";
                                    logEntry += "   \u91C7\u96C6\u603B\u6570: ".concat(l.rawInfoCount || 0, " \u6761\n");
                                    logEntry += "   \u76F8\u5173\u4FE1\u606F: ".concat(l.relevantInfoCount || 0, " \u6761\n");
                                    logEntry += "   \u2514\u2500 \u5F3A\u76F8\u5173: ".concat(j.relevant, " | \u5F31\u76F8\u5173: ").concat(j.weak, " | \u4E0D\u76F8\u5173: ").concat(j.irrelevant, "\n");
                                    logEntry += "\n";
                                    // Show sample of relevant info
                                    if (l.relevantInfoSample && l.relevantInfoSample.length > 0) {
                                        logEntry += "\uD83D\uDCCC \u76F8\u5173\u4FE1\u606F\u6837\u672C:\n";
                                        l.relevantInfoSample.forEach(function (sample, idx) {
                                            logEntry += "   ".concat(idx + 1, ". ").concat(sample, "\n");
                                        });
                                        logEntry += "\n";
                                    }
                                }
                                // Action plan
                                if (l.actionPlan) {
                                    logEntry += "\uD83E\uDD14 \u884C\u52A8\u8BA1\u5212:\n";
                                    l.actionPlan.split('\n').forEach(function (line) {
                                        logEntry += "   ".concat(line, "\n");
                                    });
                                    logEntry += "\n";
                                }
                                // Action result
                                if (l.actionResult) {
                                    logEntry += "\u26A1 \u6267\u884C\u7ED3\u679C:\n";
                                    logEntry += "   ".concat(l.actionResult, "\n");
                                    logEntry += "\n";
                                }
                                // Full details
                                logEntry += "\uD83D\uDCDD \u8BE6\u7EC6\u8BB0\u5F55:\n";
                                l.details.split('\n').forEach(function (line) {
                                    logEntry += "   ".concat(line, "\n");
                                });
                                return logEntry;
                            }).join("\n");
                            ctx.ui.notify(output, "info");
                            return [2 /*return*/];
                        case 34:
                            parts_2 = rest.trim().split(/\s+/);
                            showAll = parts_2.includes("--all");
                            clearAll = parts_2.includes("--clear");
                            goalIndex = parts_2.indexOf("--goal");
                            if (!!backgroundLoop) return [3 /*break*/, 38];
                            _d.label = 35;
                        case 35:
                            _d.trys.push([35, 37, , 38]);
                            return [4 /*yield*/, initializeBackgroundLoop()];
                        case 36:
                            _d.sent();
                            return [3 /*break*/, 38];
                        case 37:
                            error_8 = _d.sent();
                            ctx.ui.notify("暂无知识积累。", "info");
                            return [2 /*return*/];
                        case 38:
                            // Handle --clear flag
                            if (clearAll) {
                                // Confirm before clearing
                                // Note: In a real implementation, you might want to add a confirmation step
                                backgroundLoop.knowledgeStore.clear();
                                ctx.ui.notify("🗑️ 知识库已清空", "info");
                                return [2 /*return*/];
                            }
                            entries = [];
                            // Handle --goal flag
                            if (goalIndex !== -1 && parts_2[goalIndex + 1]) {
                                goalId = parts_2[goalIndex + 1];
                                entries = backgroundLoop.knowledgeStore.getByGoal(goalId);
                                if (entries.length === 0) {
                                    ctx.ui.notify("\u672A\u627E\u5230\u4E0E\u76EE\u6807 \"".concat(goalId, "\" \u76F8\u5173\u7684\u77E5\u8BC6\u3002"), "info");
                                    return [2 /*return*/];
                                }
                            }
                            // Handle --all flag
                            else if (showAll) {
                                entries = backgroundLoop.knowledgeStore.getAll();
                                if (entries.length === 0) {
                                    ctx.ui.notify("知识库为空。", "info");
                                    return [2 /*return*/];
                                }
                            }
                            // Handle search query (default behavior)
                            else {
                                query = rest.trim()
                                    .replace("--all", "")
                                    .replace("--clear", "")
                                    .replace(/--goal\s+\S+/, "")
                                    .trim();
                                entries = backgroundLoop.knowledgeStore.search(query);
                                if (entries.length === 0) {
                                    ctx.ui.notify(query ? "未找到相关知识。" : "知识库为空。", "info");
                                    return [2 /*return*/];
                                }
                            }
                            lines = entries.map(function (e, idx) {
                                var preview = e.content.slice(0, 120);
                                var ellipsis = e.content.length > 120 ? "..." : "";
                                var goalInfo = e.relatedGoalIds.length > 0 ? " [\u76EE\u6807: ".concat(e.relatedGoalIds[0].slice(0, 8), "]") : "";
                                return "".concat(idx + 1, ". [").concat(e.status, "]").concat(goalInfo, " ").concat(preview).concat(ellipsis);
                            });
                            ctx.ui.notify("\uD83D\uDCDA \u77E5\u8BC6\u6761\u76EE (".concat(entries.length, "):\n").concat(lines.join("\n")), "info");
                            return [2 /*return*/];
                        case 39:
                            if (!backgroundLoop) {
                                ctx.ui.notify("后台循环未运行。", "info");
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, backgroundLoop.stop()];
                        case 40:
                            _d.sent();
                            idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.stop();
                            ctx.ui.notify("⏹️ 后台循环已停止。使用 /goal resume 可恢复。", "info");
                            return [2 /*return*/];
                        case 41:
                            if (!!backgroundLoop) return [3 /*break*/, 45];
                            _d.label = 42;
                        case 42:
                            _d.trys.push([42, 44, , 45]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 43:
                            _d.sent();
                            return [3 /*break*/, 45];
                        case 44:
                            error_9 = _d.sent();
                            ctx.ui.notify("\u274C \u521D\u59CB\u5316\u5931\u8D25: ".concat(String(error_9)), "error");
                            return [2 /*return*/];
                        case 45:
                            // Check if already running
                            if (backgroundLoop.isRunning()) {
                                ctx.ui.notify("后台循环已在运行中。", "info");
                                return [2 /*return*/];
                            }
                            activeGoals = backgroundLoop.goalManager.getActiveGoals();
                            if (activeGoals.length === 0) {
                                ctx.ui.notify("没有活跃的目标。请先使用 /goal add 创建目标。", "warning");
                                return [2 /*return*/];
                            }
                            // Restart idle detector if needed
                            if (!idleDetector) {
                                idleDetector = new idle_detector_js_1.IdleDetector();
                                idleDetector.start(function () {
                                    deliverPendingNotifications(pi);
                                });
                            }
                            else {
                                idleDetector.start(function () {
                                    deliverPendingNotifications(pi);
                                });
                            }
                            // Start background loop
                            return [4 /*yield*/, backgroundLoop.start()];
                        case 46:
                            // Start background loop
                            _d.sent();
                            ctx.ui.notify("\u25B6\uFE0F \u540E\u53F0\u5FAA\u73AF\u5DF2\u6062\u590D\uFF0C\u6B63\u5728\u8FFD\u8E2A ".concat(activeGoals.length, " \u4E2A\u76EE\u6807"), "info");
                            return [2 /*return*/];
                        case 47:
                            {
                                if (!idleDetector) {
                                    ctx.ui.notify("后台循环未启动，请先使用 /goal add 创建目标。", "warning");
                                    return [2 /*return*/];
                                }
                                seconds = parseInt(rest.trim(), 10);
                                if (isNaN(seconds) || seconds <= 0) {
                                    ctx.ui.notify("用法: /goal config <空闲秒数>\n例如: /goal config 10 （表示空闲 10 秒后就推送通知）", "warning");
                                    return [2 /*return*/];
                                }
                                idleDetector.setConfig({
                                    idleThreshold: seconds * 1000,
                                    checkInterval: Math.min(5000, seconds * 1000) // Adjust check interval to be responsive
                                });
                                ctx.ui.notify("\u2705 \u901A\u77E5\u7A7A\u95F2\u9608\u503C\u5DF2\u4FEE\u6539\u4E3A ".concat(seconds, " \u79D2\u3002"), "info");
                                return [2 /*return*/];
                            }
                            _d.label = 48;
                        case 48: 
                        // Usage: /goal notify-config [--show|--set <key> <value>]
                        return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 49:
                            // Usage: /goal notify-config [--show|--set <key> <value>]
                            _d.sent();
                            parts_3 = rest.trim().split(/\s+/);
                            action = parts_3[0];
                            if (action === "--show" || parts_3.length === 0) {
                                config = backgroundLoop.getLoopState().notificationConfig;
                                output = "🔔 当前通知配置:\n\n";
                                output += "1. \u91CD\u8981\u53D1\u73B0\u901A\u77E5: ".concat(config.enableDiscoveryNotification ? "✅ 启用" : "❌ 禁用", "\n");
                                output += "   - \u5F3A\u76F8\u5173\u9608\u503C: ".concat(config.strongRelevanceThreshold, " \u6761\n");
                                output += "   - \u603B\u76F8\u5173\u9608\u503C: ".concat(config.totalRelevantThreshold, " \u6761\n\n");
                                output += "2. \u4EA4\u4ED8\u7269\u901A\u77E5: ".concat(config.enableDeliveryNotification ? "✅ 启用" : "❌ 禁用", "\n");
                                output += "   - \u6700\u5C0F\u8F93\u51FA\u957F\u5EA6: ".concat(config.deliveryMinOutputLength, " \u5B57\u7B26\n\n");
                                output += "\uD83D\uDCA1 \u63D0\u793A: \u4F7F\u7528 /goal notify-config --set <key> <value> \u4FEE\u6539\u914D\u7F6E";
                                ctx.ui.notify(output, "info");
                                return [2 /*return*/];
                            }
                            if (action === "--set") {
                                if (parts_3.length < 3) {
                                    ctx.ui.notify("用法: /goal notify-config --set <key> <value>\n\n可用配置项:\n- discovery_enabled <true|false>\n- strong_threshold <数字>\n- total_threshold <数字>\n- delivery_enabled <true|false>\n- min_output_length <数字>", "warning");
                                    return [2 /*return*/];
                                }
                                key = parts_3[1];
                                value = parts_3[2];
                                configMap = {
                                    "discovery_enabled": "enableDiscoveryNotification",
                                    "strong_threshold": "strongRelevanceThreshold",
                                    "total_threshold": "totalRelevantThreshold",
                                    "delivery_enabled": "enableDeliveryNotification",
                                    "min_output_length": "deliveryMinOutputLength"
                                };
                                configKey = configMap[key];
                                if (!configKey) {
                                    ctx.ui.notify("\u274C \u672A\u77E5\u914D\u7F6E\u9879: ".concat(key, "\n\n\u53EF\u7528\u914D\u7F6E\u9879:\n- discovery_enabled <true|false>\n- strong_threshold <\u6570\u5B57>\n- total_threshold <\u6570\u5B57>\n- delivery_enabled <true|false>\n- min_output_length <\u6570\u5B57>"), "warning");
                                    return [2 /*return*/];
                                }
                                parsedValue = void 0;
                                if (key.includes("enabled")) {
                                    parsedValue = value === "true";
                                }
                                else {
                                    parsedValue = parseInt(value, 10);
                                    if (isNaN(parsedValue)) {
                                        ctx.ui.notify("\u274C \u65E0\u6548\u7684\u6570\u503C: ".concat(value), "warning");
                                        return [2 /*return*/];
                                    }
                                }
                                // Update config
                                backgroundLoop.updateNotificationConfig((_b = {},
                                    _b[configKey] = parsedValue,
                                    _b));
                                ctx.ui.notify("\u2705 \u5DF2\u66F4\u65B0\u901A\u77E5\u914D\u7F6E: ".concat(key, " = ").concat(value), "info");
                                return [2 /*return*/];
                            }
                            ctx.ui.notify("用法: /goal notify-config [--show|--set <key> <value>]", "warning");
                            return [2 /*return*/];
                        case 50:
                            goalId = rest.trim();
                            if (!goalId) {
                                ctx.ui.notify("用法: /goal complete <目标ID>\n例如: /goal complete goal-abc123", "warning");
                                return [2 /*return*/];
                            }
                            if (!!backgroundLoop) return [3 /*break*/, 54];
                            _d.label = 51;
                        case 51:
                            _d.trys.push([51, 53, , 54]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 52:
                            _d.sent();
                            return [3 /*break*/, 54];
                        case 53:
                            error_10 = _d.sent();
                            ctx.ui.notify("后台循环未启动。", "warning");
                            return [2 /*return*/];
                        case 54:
                            goal = backgroundLoop.goalManager.getGoal(goalId);
                            if (!goal) {
                                ctx.ui.notify("\u672A\u627E\u5230\u76EE\u6807 ID: ".concat(goalId), "warning");
                                return [2 /*return*/];
                            }
                            // Update goal status to completed
                            return [4 /*yield*/, backgroundLoop.goalManager.updateGoalStatus(goalId, "completed")];
                        case 55:
                            // Update goal status to completed
                            _d.sent();
                            ctx.ui.notify("\u2705 \u76EE\u6807\u5DF2\u5B8C\u6210: ".concat(goal.title), "info");
                            return [2 /*return*/];
                        case 56:
                            goalId = rest.trim();
                            if (!goalId) {
                                ctx.ui.notify("用法: /goal abandon <目标ID>\n例如: /goal abandon goal-abc123", "warning");
                                return [2 /*return*/];
                            }
                            if (!!backgroundLoop) return [3 /*break*/, 60];
                            _d.label = 57;
                        case 57:
                            _d.trys.push([57, 59, , 60]);
                            return [4 /*yield*/, initializeBackgroundLoop(ctx)];
                        case 58:
                            _d.sent();
                            return [3 /*break*/, 60];
                        case 59:
                            error_11 = _d.sent();
                            ctx.ui.notify("后台循环未启动。", "warning");
                            return [2 /*return*/];
                        case 60:
                            goal = backgroundLoop.goalManager.getGoal(goalId);
                            if (!goal) {
                                ctx.ui.notify("\u672A\u627E\u5230\u76EE\u6807 ID: ".concat(goalId), "warning");
                                return [2 /*return*/];
                            }
                            // Update goal status to abandoned
                            return [4 /*yield*/, backgroundLoop.goalManager.updateGoalStatus(goalId, "abandoned")];
                        case 61:
                            // Update goal status to abandoned
                            _d.sent();
                            ctx.ui.notify("\u274C \u76EE\u6807\u5DF2\u653E\u5F03: ".concat(goal.title), "info");
                            return [2 /*return*/];
                        case 62:
                            {
                                ctx.ui.notify("Goal-Driven Agent 命令:\n" +
                                    "  /goal add <描述>      — 创建新目标\n" +
                                    "  /goal list            — 列出所有目标\n" +
                                    "  /goal list <ID>       — 查看目标详细\n" +
                                    "  /goal status          — 后台状态\n" +
                                    "  /goal tree <ID>       — 查看维度树\n" +
                                    "  /goal logs <ID>       — 查看周期执行记录\n" +
                                    "  /goal logs <ID> --cycle N — 查看特定周期\n" +
                                    "  /goal logs <ID> --all — 查看全部周期\n" +
                                    "  /goal knowledge [查询] — 搜索知识库\n" +
                                    "  /goal knowledge --all   — 查看全部知识\n" +
                                    "  /goal knowledge --goal <ID> — 查看特定目标的知识\n" +
                                    "  /goal knowledge --clear — 清空知识库\n" +
                                    "  /goal complete <ID>   — 完成目标\n" +
                                    "  /goal abandon <ID>    — 放弃目标\n" +
                                    "  /goal stop            — 停止后台循环\n" +
                                    "  /goal resume          — 恢复后台循环 ✨\n" +
                                    "  /goal config <秒数>   — 设置空闲通知阈值\n" +
                                    "  /goal notify-config --show — 查看通知配置\n" +
                                    "  /goal notify-config --set <key> <value> — 修改通知配置", "info");
                                return [2 /*return*/];
                            }
                            _d.label = 63;
                        case 63: return [2 /*return*/];
                    }
                });
            });
        },
    });
    // ── Event listeners for idle detection ──
    pi.on("input", function (_event, _ctx) {
        idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.recordActivity();
    });
    pi.on("agent_start", function (_event, _ctx) {
        idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.setAgentBusy(true);
    });
    pi.on("agent_end", function (_event, _ctx) {
        idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.setAgentBusy(false);
    });
    // ── Model sync ──
    pi.on("model_select", function (event, _ctx) {
        backgroundLoop === null || backgroundLoop === void 0 ? void 0 : backgroundLoop.onModelChange(event.model);
    });
    // ── Cleanup on shutdown ──
    pi.on("session_shutdown", function (_event, _ctx) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (backgroundLoop === null || backgroundLoop === void 0 ? void 0 : backgroundLoop.stop())];
                case 1:
                    _a.sent();
                    idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.stop();
                    return [2 /*return*/];
            }
        });
    }); });
    // ── Notification delivery ──
    function deliverPendingNotifications(pi) {
        return __awaiter(this, void 0, void 0, function () {
            var hasUrgent, notification, icon;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!backgroundLoop)
                            return [2 /*return*/];
                        hasUrgent = backgroundLoop.notificationQueue.hasUrgent();
                        if (!(idleDetector === null || idleDetector === void 0 ? void 0 : idleDetector.isIdle(hasUrgent)))
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        if (!(backgroundLoop.notificationQueue.pendingCount > 0)) return [3 /*break*/, 3];
                        notification = backgroundLoop.notificationQueue.dequeue();
                        if (!notification)
                            return [3 /*break*/, 3];
                        icon = getNotificationIcon(notification.type);
                        pi.sendMessage({
                            customType: "goal_notification",
                            content: "".concat(icon, " **").concat(notification.title, "**\n\n").concat(notification.content),
                            display: true,
                            details: { notification: notification },
                        });
                        // Wait between notifications to avoid flooding
                        return [4 /*yield*/, (0, utils_js_1.sleep)(2000)];
                    case 2:
                        // Wait between notifications to avoid flooding
                        _a.sent();
                        // Stop if user becomes active
                        if (idleDetector && !idleDetector.isIdle())
                            return [3 /*break*/, 3];
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
};
// ── Helper functions ──
function getNotificationIcon(type) {
    var _a;
    var icons = {
        delivery: "📦",
        report: "📊",
        suggestion: "💡",
        help_request: "🆘",
        confirmation: "✅",
        progress: "⏳",
    };
    return (_a = icons[type]) !== null && _a !== void 0 ? _a : "🔔";
}
function formatDimensionTree(dims, sources, indent, parentCounter) {
    if (parentCounter === void 0) { parentCounter = { value: 0 }; }
    var pad = "  ".repeat(indent);
    var sourceMap = new Map(sources.map(function (s) { return [s.id, s]; }));
    return dims
        .map(function (dim) {
        parentCounter.value++;
        var urgency = dim.timeliness === "urgent" ? " [紧急]" : "";
        var line = "".concat(pad).concat(parentCounter.value, ". **").concat(dim.title, "** (v=").concat(dim.valueScore, ", d=").concat(dim.explorationDepth, "/").concat(dim.estimated_depth).concat(urgency, ")");
        // Show core questions if available
        if (dim.core_questions && dim.core_questions.length > 0) {
            line += "\n".concat(pad, "   \u95EE\u9898: ").concat(dim.core_questions[0]);
            if (dim.core_questions.length > 1) {
                line += "\n".concat(pad, "        ").concat(dim.core_questions[1]);
            }
        }
        // Show data sources with detailed info
        if (dim.dataSources.length > 0) {
            var sourceInfos = dim.dataSources.map(function (s) {
                var source = sourceMap.get(s.sourceId);
                if (!source)
                    return s.suggestedQuery || s.query;
                // Show source name and type
                var info = "".concat(source.name);
                if (source.type !== 'web_search') {
                    info += " (".concat(source.type, ")");
                }
                return info;
            });
            line += "\n".concat(pad, "   [\u6E90] ").concat(sourceInfos.join(", "));
        }
        if (dim.children.length > 0) {
            line += "\n" + formatDimensionTree(dim.children, sources, indent + 1, parentCounter);
        }
        return line;
    })
        .join("\n");
}
function countDimensions(dims) {
    var count = dims.length;
    for (var _i = 0, dims_1 = dims; _i < dims_1.length; _i++) {
        var dim = dims_1[_i];
        count += countDimensions(dim.children);
    }
    return count;
}
function countChildSources(dim) {
    var count = 0;
    for (var _i = 0, _a = dim.children; _i < _a.length; _i++) {
        var child = _a[_i];
        count += child.dataSources.length + countChildSources(child);
    }
    return count;
}
exports.default = goalDrivenExtension;
