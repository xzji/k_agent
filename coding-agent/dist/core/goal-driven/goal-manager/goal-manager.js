"use strict";
/**
 * GoalManager — Manages goal tree and dimension tree
 *
 * Persistence:
 * - Stored in {dataDir}/goals/ directory
 * - Each goal as {goalId}.json
 * - Dimensions embedded in goal JSON
 * - Auto-persists on every change
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
exports.GoalManager = void 0;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var utils_js_1 = require("../utils.js");
var goal_decomposer_js_1 = require("./goal-decomposer.js");
var source_discoverer_js_1 = require("./source-discoverer.js");
var GoalManager = /** @class */ (function () {
    function GoalManager(dataDir, llm, piApi, onProgress) {
        this.goals = new Map();
        this.dimensions = new Map(); // goalId → dimensions
        this.dataSources = new Map(); // goalId → sources
        this.cycleLogs = new Map(); // goalId → logs
        this.dataDir = (0, node_path_1.join)(dataDir, "goals");
        this.llm = llm;
        this.piApi = piApi;
        this.onProgress = onProgress;
        this.ensureDir();
        this.loadFromDisk();
    }
    /**
     * Create a new goal + auto decompose dimensions + discover sources
     */
    GoalManager.prototype.createGoal = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var goal, decomposer, initialDimensions, sourceDiscoverer, sources;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        goal = {
                            id: (0, utils_js_1.generateId)(),
                            parentId: null,
                            title: params.title,
                            description: params.description,
                            status: "active",
                            authorizationDepth: params.authorizationDepth,
                            priority: 5,
                            constraints: (_a = params.constraints) !== null && _a !== void 0 ? _a : [],
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };
                        this.goals.set(goal.id, goal);
                        decomposer = new goal_decomposer_js_1.GoalDecomposer(this.llm, this.onProgress);
                        return [4 /*yield*/, decomposer.decompose(goal)];
                    case 1:
                        initialDimensions = _b.sent();
                        this.dimensions.set(goal.id, initialDimensions);
                        sourceDiscoverer = new source_discoverer_js_1.SourceDiscoverer(this.llm, this.piApi, this.onProgress);
                        return [4 /*yield*/, sourceDiscoverer.discoverAndBind(goal, initialDimensions)];
                    case 2:
                        sources = _b.sent();
                        this.dataSources.set(goal.id, sources);
                        return [4 /*yield*/, this.persistGoal(goal.id)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, goal];
                }
            });
        });
    };
    /**
     * Get all goals
     */
    GoalManager.prototype.getAllGoals = function () {
        return Array.from(this.goals.values());
    };
    /**
     * Get active goals
     */
    GoalManager.prototype.getActiveGoals = function () {
        return Array.from(this.goals.values()).filter(function (g) { return g.status === "active"; });
    };
    /**
     * Get a specific goal
     */
    GoalManager.prototype.getGoal = function (goalId) {
        return this.goals.get(goalId);
    };
    /**
     * Get dimensions for a goal (flat list, top-level only)
     */
    GoalManager.prototype.getDimensions = function (goalId) {
        var _a;
        return (_a = this.dimensions.get(goalId)) !== null && _a !== void 0 ? _a : [];
    };
    /**
     * Get data sources for a goal
     */
    GoalManager.prototype.getDataSources = function (goalId) {
        var _a;
        return (_a = this.dataSources.get(goalId)) !== null && _a !== void 0 ? _a : [];
    };
    /**
     * Get all dimensions grouped by goal
     */
    GoalManager.prototype.getAllDimensionsByGoal = function () {
        return new Map(this.dimensions);
    };
    /**
     * Dynamically add dimensions (discovered during reasoning/execution)
     */
    GoalManager.prototype.addDimensions = function (goalId, newDimensions) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, _i, newDimensions_1, dim, node, parent_1, goal, sourceDiscoverer;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        existing = (_a = this.dimensions.get(goalId)) !== null && _a !== void 0 ? _a : [];
                        _i = 0, newDimensions_1 = newDimensions;
                        _k.label = 1;
                    case 1:
                        if (!(_i < newDimensions_1.length)) return [3 /*break*/, 4];
                        dim = newDimensions_1[_i];
                        node = {
                            id: (0, utils_js_1.generateId)(),
                            goalId: goalId,
                            parentDimensionId: (_b = dim.parentDimensionId) !== null && _b !== void 0 ? _b : null,
                            title: (_c = dim.title) !== null && _c !== void 0 ? _c : "Untitled dimension",
                            description: (_d = dim.description) !== null && _d !== void 0 ? _d : "",
                            core_questions: (_e = dim.core_questions) !== null && _e !== void 0 ? _e : [],
                            status: "pending",
                            explorationDepth: 0,
                            estimated_depth: (_f = dim.estimated_depth) !== null && _f !== void 0 ? _f : 2,
                            timeliness: (_g = dim.timeliness) !== null && _g !== void 0 ? _g : "normal",
                            refresh_interval: (_h = dim.refresh_interval) !== null && _h !== void 0 ? _h : "weekly",
                            valueScore: (_j = dim.valueScore) !== null && _j !== void 0 ? _j : 5,
                            children: [],
                            dataSources: [],
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            discoveredDuring: dim.discoveredDuring,
                        };
                        // If has parent, add as child of parent dimension
                        if (node.parentDimensionId) {
                            parent_1 = this.findDimension(existing, node.parentDimensionId);
                            if (parent_1) {
                                parent_1.children.push(node);
                            }
                            else {
                                existing.push(node);
                            }
                        }
                        else {
                            existing.push(node);
                        }
                        goal = this.goals.get(goalId);
                        if (!goal) return [3 /*break*/, 3];
                        sourceDiscoverer = new source_discoverer_js_1.SourceDiscoverer(this.llm, this.piApi, this.onProgress);
                        return [4 /*yield*/, sourceDiscoverer.discoverAndBindSingle(goal, node)];
                    case 2:
                        _k.sent();
                        _k.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.dimensions.set(goalId, existing);
                        return [4 /*yield*/, this.persistGoal(goalId)];
                    case 5:
                        _k.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update a goal's status
     */
    GoalManager.prototype.updateGoalStatus = function (goalId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var goal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        goal = this.goals.get(goalId);
                        if (!goal)
                            return [2 /*return*/];
                        goal.status = status;
                        goal.updatedAt = Date.now();
                        return [4 /*yield*/, this.persistGoal(goalId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update dimension statuses based on exploration progress
     */
    GoalManager.prototype.updateDimensionStatuses = function (goalId) {
        return __awaiter(this, void 0, void 0, function () {
            var dims, _i, _a, dim;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        dims = this.dimensions.get(goalId);
                        if (!dims)
                            return [2 /*return*/];
                        for (_i = 0, _a = this.flattenDimensions(dims); _i < _a.length; _i++) {
                            dim = _a[_i];
                            if (dim.status === "pending" && dim.explorationDepth > 0) {
                                dim.status = "exploring";
                            }
                            if (dim.explorationDepth >= dim.estimated_depth) {
                                dim.status = "explored";
                            }
                            dim.updatedAt = Date.now();
                        }
                        return [4 /*yield*/, this.persistGoal(goalId)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update a specific dimension
     */
    GoalManager.prototype.updateDimension = function (goalId, dimensionId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var dims, dim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dims = this.dimensions.get(goalId);
                        if (!dims)
                            return [2 /*return*/];
                        dim = this.findDimension(dims, dimensionId);
                        if (!dim)
                            return [2 /*return*/];
                        Object.assign(dim, updates);
                        dim.updatedAt = Date.now();
                        return [4 /*yield*/, this.persistGoal(goalId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add a cycle log for a goal
     */
    GoalManager.prototype.addCycleLog = function (log) {
        return __awaiter(this, void 0, void 0, function () {
            var logs;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        logs = (_a = this.cycleLogs.get(log.goalId)) !== null && _a !== void 0 ? _a : [];
                        logs.push(log);
                        this.cycleLogs.set(log.goalId, logs);
                        return [4 /*yield*/, this.persistGoal(log.goalId)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get cycle logs for a goal
     */
    GoalManager.prototype.getCycleLogs = function (goalId) {
        var _a;
        return (_a = this.cycleLogs.get(goalId)) !== null && _a !== void 0 ? _a : [];
    };
    // ── Persistence ──
    GoalManager.prototype.ensureDir = function () {
        if (!(0, node_fs_1.existsSync)(this.dataDir)) {
            (0, node_fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    };
    GoalManager.prototype.persistGoal = function (goalId) {
        return __awaiter(this, void 0, void 0, function () {
            var goal, data, filePath;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                goal = this.goals.get(goalId);
                if (!goal)
                    return [2 /*return*/];
                data = {
                    goal: goal,
                    dimensions: (_a = this.dimensions.get(goalId)) !== null && _a !== void 0 ? _a : [],
                    dataSources: (_b = this.dataSources.get(goalId)) !== null && _b !== void 0 ? _b : [],
                    cycleLogs: (_c = this.cycleLogs.get(goalId)) !== null && _c !== void 0 ? _c : [],
                };
                filePath = (0, node_path_1.join)(this.dataDir, "".concat(goalId, ".json"));
                (0, node_fs_1.writeFileSync)(filePath, JSON.stringify(data, null, 2), "utf-8");
                return [2 /*return*/];
            });
        });
    };
    GoalManager.prototype.loadFromDisk = function () {
        var _a;
        if (!(0, node_fs_1.existsSync)(this.dataDir))
            return;
        var files = (0, node_fs_1.readdirSync)(this.dataDir).filter(function (f) { return f.endsWith(".json"); });
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            try {
                var filePath = (0, node_path_1.join)(this.dataDir, file);
                var content = (0, node_fs_1.readFileSync)(filePath, "utf-8");
                var data = JSON.parse(content);
                this.goals.set(data.goal.id, data.goal);
                this.dimensions.set(data.goal.id, data.dimensions);
                this.dataSources.set(data.goal.id, data.dataSources);
                this.cycleLogs.set(data.goal.id, (_a = data.cycleLogs) !== null && _a !== void 0 ? _a : []);
            }
            catch (_b) {
                // Skip corrupted files
            }
        }
    };
    // ── Helpers ──
    GoalManager.prototype.findDimension = function (dims, id) {
        for (var _i = 0, dims_1 = dims; _i < dims_1.length; _i++) {
            var dim = dims_1[_i];
            if (dim.id === id)
                return dim;
            if (dim.children.length > 0) {
                var found = this.findDimension(dim.children, id);
                if (found)
                    return found;
            }
        }
        return undefined;
    };
    GoalManager.prototype.flattenDimensions = function (dims) {
        var result = [];
        for (var _i = 0, dims_2 = dims; _i < dims_2.length; _i++) {
            var dim = dims_2[_i];
            result.push(dim);
            if (dim.children.length > 0) {
                result.push.apply(result, this.flattenDimensions(dim.children));
            }
        }
        return result;
    };
    return GoalManager;
}());
exports.GoalManager = GoalManager;
