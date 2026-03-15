"use strict";
/**
 * GoalDecomposer — Uses LLM to decompose a goal into a dimension tree
 *
 * Given a goal description, generates 4-6 dimensions with:
 * - Goal understanding and completion vision
 * - Core questions (2-4 per dimension)
 * - Timeliness (urgent/normal/can_wait) - when to start
 * - Refresh interval (hours/daily/weekly/monthly) - how often to refresh
 * - Value score (1-10)
 * - Estimated depth (1-5)
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
exports.GoalDecomposer = void 0;
var utils_js_1 = require("../utils.js");
var GoalDecomposer = /** @class */ (function () {
    function GoalDecomposer(llm, onProgress) {
        this.llm = llm;
        this.onProgress = onProgress;
    }
    /**
     * Decompose a goal into a dimension tree
     */
    GoalDecomposer.prototype.decompose = function (goal) {
        return __awaiter(this, void 0, void 0, function () {
            var progressMsg, prompt, result, dimensions_1, resultMsg_1, dimensions, resultMsg_2, error_1, errorMsg;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            return __generator(this, function (_q) {
                switch (_q.label) {
                    case 0:
                        progressMsg = "🔍 正在分析目标并拆解维度...";
                        (_a = this.onProgress) === null || _a === void 0 ? void 0 : _a.call(this, progressMsg, "info");
                        prompt = this.buildDecomposePrompt(goal);
                        _q.label = 1;
                    case 1:
                        _q.trys.push([1, 3, , 4]);
                        (_b = this.onProgress) === null || _b === void 0 ? void 0 : _b.call(this, "📝 正在调用 LLM 进行目标拆解...", "info");
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: "You are a strategic planning assistant. You decompose goals into actionable dimensions for systematic research and execution.\n\nYour output is a structured JSON object. Each dimension represents a distinct aspect or angle to explore for the goal. Be thorough but focused \u2014 aim for 4-6 top-level dimensions.\n\nIMPORTANT: Always respond with valid JSON only. Do not include any text, explanation, or markdown formatting outside the JSON object.",
                                messages: [{ role: "user", content: prompt }],
                                temperature: 0.5,
                                maxTokens: 20000, // Increased to handle large responses
                            })];
                    case 2:
                        result = _q.sent();
                        (_c = this.onProgress) === null || _c === void 0 ? void 0 : _c.call(this, "\uD83D\uDD0D LLM \u54CD\u5E94\u5DF2\u63A5\u6536\uFF0C\u9A8C\u8BC1\u7ED3\u6784...", "info");
                        // Validate result structure
                        if (!result) {
                            (_d = this.onProgress) === null || _d === void 0 ? void 0 : _d.call(this, "\u274C LLM \u8FD4\u56DE\u4E86 null/undefined", "warning");
                            throw new Error("Invalid LLM response: result is null/undefined");
                        }
                        // Check if result is an array (LLM might have returned array instead of object)
                        if (Array.isArray(result)) {
                            (_e = this.onProgress) === null || _e === void 0 ? void 0 : _e.call(this, "\u274C LLM \u8FD4\u56DE\u4E86\u6570\u7EC4\u800C\u4E0D\u662F\u5BF9\u8C61", "warning");
                            (_f = this.onProgress) === null || _f === void 0 ? void 0 : _f.call(this, "   \u6570\u7EC4\u957F\u5EA6: ".concat(result.length), "warning");
                            // If array, maybe it's the dimensions array directly?
                            if (result.length > 0 && typeof result[0] === 'object') {
                                (_g = this.onProgress) === null || _g === void 0 ? void 0 : _g.call(this, "   \u5C1D\u8BD5\u5C06\u6570\u7EC4\u4F5C\u4E3A dimensions \u4F7F\u7528", "info");
                                dimensions_1 = this.convertToNodes(goal.id, result);
                                // Continue with dimensions...
                                goal.goal_understanding = "";
                                goal.completion_vision = "";
                                goal.updatedAt = Date.now();
                                resultMsg_1 = "\u2705 \u76EE\u6807\u62C6\u89E3\u5B8C\u6210 (".concat(result.length, " \u4E2A\u7EF4\u5EA6):\n\n");
                                dimensions_1.forEach(function (dim, idx) {
                                    resultMsg_1 += "".concat(idx + 1, ". **").concat(dim.title, "**\n");
                                    resultMsg_1 += "   \u65F6\u6548: ".concat(dim.timeliness, " | \u9891\u7387: ").concat(dim.refresh_interval, " | \u4EF7\u503C: ").concat(dim.valueScore, "/10\n");
                                    resultMsg_1 += "   \u63CF\u8FF0: ".concat(dim.description.substring(0, 80), "...\n");
                                    resultMsg_1 += "   \u6838\u5FC3\u95EE\u9898:\n";
                                    dim.core_questions.forEach(function (q) {
                                        resultMsg_1 += "     \u2022 ".concat(q, "\n");
                                    });
                                    resultMsg_1 += "\n";
                                });
                                (_h = this.onProgress) === null || _h === void 0 ? void 0 : _h.call(this, resultMsg_1, "success");
                                return [2 /*return*/, dimensions_1];
                            }
                            throw new Error("Invalid LLM response: result is an array");
                        }
                        if (!result.dimensions || !Array.isArray(result.dimensions)) {
                            (_j = this.onProgress) === null || _j === void 0 ? void 0 : _j.call(this, "\u274C dimensions \u5B57\u6BB5\u7F3A\u5931\u6216\u4E0D\u662F\u6570\u7EC4: ".concat(typeof result.dimensions), "warning");
                            (_k = this.onProgress) === null || _k === void 0 ? void 0 : _k.call(this, "   \u5B9E\u9645\u8FD4\u56DE\u7684\u952E: ".concat(Object.keys(result).join(", ")), "warning");
                            throw new Error("Invalid LLM response: missing or invalid dimensions array");
                        }
                        if (result.dimensions.length === 0) {
                            (_l = this.onProgress) === null || _l === void 0 ? void 0 : _l.call(this, "\u26A0\uFE0F  dimensions \u6570\u7EC4\u4E3A\u7A7A", "warning");
                            throw new Error("Invalid LLM response: dimensions array is empty");
                        }
                        (_m = this.onProgress) === null || _m === void 0 ? void 0 : _m.call(this, "\u2705 \u6210\u529F\u83B7\u53D6 ".concat(result.dimensions.length, " \u4E2A\u7EF4\u5EA6"), "info");
                        // Update goal with understanding and vision
                        goal.goal_understanding = result.goal_understanding || "";
                        goal.completion_vision = result.completion_vision || "";
                        goal.updatedAt = Date.now();
                        dimensions = this.convertToNodes(goal.id, result.dimensions);
                        resultMsg_2 = "\u2705 \u76EE\u6807\u62C6\u89E3\u5B8C\u6210 (".concat(result.dimensions.length, " \u4E2A\u7EF4\u5EA6):\n\n");
                        dimensions.forEach(function (dim, idx) {
                            resultMsg_2 += "".concat(idx + 1, ". **").concat(dim.title, "**\n");
                            resultMsg_2 += "   \u65F6\u6548: ".concat(dim.timeliness, " | \u9891\u7387: ").concat(dim.refresh_interval, " | \u4EF7\u503C: ").concat(dim.valueScore, "/10\n");
                            resultMsg_2 += "   \u63CF\u8FF0: ".concat(dim.description.substring(0, 80), "...\n");
                            resultMsg_2 += "   \u6838\u5FC3\u95EE\u9898:\n";
                            dim.core_questions.forEach(function (q) {
                                resultMsg_2 += "     \u2022 ".concat(q, "\n");
                            });
                            resultMsg_2 += "\n";
                        });
                        (_o = this.onProgress) === null || _o === void 0 ? void 0 : _o.call(this, resultMsg_2, "success");
                        return [2 /*return*/, dimensions];
                    case 3:
                        error_1 = _q.sent();
                        errorMsg = "\u26A0\uFE0F  LLM \u62C6\u89E3\u5931\u8D25: ".concat(error_1);
                        (_p = this.onProgress) === null || _p === void 0 ? void 0 : _p.call(this, errorMsg, "warning");
                        // Fallback: create a single generic dimension
                        return [2 /*return*/, [
                                this.createNode(goal.id, {
                                    title: "General exploration",
                                    description: "General exploration of: ".concat(goal.title),
                                    core_questions: ["What are the key aspects of ".concat(goal.title, "?")],
                                    timeliness: "normal",
                                    refresh_interval: "weekly",
                                    valueScore: 5,
                                    estimated_depth: 2,
                                }),
                            ]];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoalDecomposer.prototype.buildDecomposePrompt = function (goal) {
        var prompt = "\u4F60\u662F\u4E00\u4E2A\u76EE\u6807\u9A71\u52A8\u578B AI \u52A9\u624B\u7684\u300C\u76EE\u6807\u62C6\u89E3\u5F15\u64CE\u300D\u3002\n\n\u4F60\u7684\u552F\u4E00\u804C\u8D23\uFF1A\u5F53\u7528\u6237\u544A\u8BC9\u4F60\u4E00\u4E2A\u76EE\u6807\u65F6\uFF0C\u5C06\u5B83\u62C6\u89E3\u4E3A 4-6 \u4E2A\u300C\u63A2\u7D22\u7EF4\u5EA6\u300D\u3002\u8FD9\u4E9B\u7EF4\u5EA6\u662F\u4E3A\u4E86\u5E2E\u52A9\u7528\u6237\u5B9E\u73B0\u76EE\u6807\u6240\u5FC5\u987B\u8986\u76D6\u7684\u5B50\u65B9\u5411\u2014\u2014\u6BCF\u4E2A\u7EF4\u5EA6\u90FD\u5E94\u8BE5\u4E0E\u76EE\u6807\u5F3A\u76F8\u5173\u3001\u53EF\u72EC\u7ACB\u63A2\u7D22\u3001\u4E14\u6709\u660E\u786E\u7684\u4FE1\u606F\u6536\u96C6\u548C\u884C\u52A8\u6307\u5411\u3002\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u4F60\u7684\u601D\u8003\u539F\u5219\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n1. \u4EE5\u7EC8\u4E3A\u59CB\uFF1A\u5148\u60F3\u8C61\u76EE\u6807\u5B8C\u7F8E\u8FBE\u6210\u7684\u6837\u5B50\uFF0C\u7136\u540E\u53CD\u63A8\"\u8981\u8FBE\u6210\u8FD9\u4E2A\u7ED3\u679C\uFF0C\u5FC5\u987B\u641E\u6E05\u695A\u54EA\u51E0\u4E2A\u65B9\u9762\u7684\u4E8B\u60C5\"\u3002\n\n2. \u7EF4\u5EA6\u662F\u5B50\u65B9\u5411\uFF0C\u4E0D\u662F\u6B65\u9AA4\uFF1A\n   - \u2705 \u6B63\u786E\u7684\u7EF4\u5EA6\uFF1A\"\u5E02\u573A\u7ADE\u4E89\u683C\u5C40\"\uFF08\u4E00\u4E2A\u9700\u8981\u6301\u7EED\u63A2\u7D22\u7684\u65B9\u5411\uFF09\n   - \u274C \u9519\u8BEF\u7684\u7EF4\u5EA6\uFF1A\"\u7B2C\u4E00\u6B65\u6536\u96C6\u8D44\u6599\"\uFF08\u8FD9\u662F\u6267\u884C\u6B65\u9AA4\uFF0C\u4E0D\u662F\u63A2\u7D22\u65B9\u5411\uFF09\n\n3. \u7EF4\u5EA6\u4E4B\u95F4\u5E94\u4E92\u8865\u800C\u975E\u91CD\u53E0\uFF1A\u5408\u5728\u4E00\u8D77\u5E94\u57FA\u672C\u8986\u76D6\u76EE\u6807\u7684\u5168\u8C8C\uFF0C\u4F46\u6BCF\u4E2A\u7EF4\u5EA6\u5173\u6CE8\u4E0D\u540C\u7684\u89D2\u5EA6\u3002\u4E0D\u8981\u6C42\u4E25\u683C\u7684 MECE\uFF08\u4E92\u65A5\u7A77\u5C3D\uFF09\uFF0C\u5141\u8BB8\u7EF4\u5EA6\u4E4B\u95F4\u6709\u8F7B\u5FAE\u7684\u4EA4\u53C9\uFF0C\u4F46\u4E0D\u5E94\u6709\u5927\u9762\u79EF\u91CD\u590D\u3002\n\n4. \u6BCF\u4E2A\u7EF4\u5EA6\u5FC5\u987B\u53EF\u4EE5\u72EC\u7ACB\u5C55\u5F00\u4FE1\u606F\u641C\u96C6\u548C\u5206\u6790\uFF1A\u5982\u679C\u4E00\u4E2A\u7EF4\u5EA6\u8FC7\u4E8E\u62BD\u8C61\u3001\u65E0\u6CD5\u76F4\u63A5\u6307\u5BFC\"\u53BB\u641C\u4EC0\u4E48\u3001\u770B\u4EC0\u4E48\"\uFF0C\u90A3\u5B83\u9700\u8981\u88AB\u5177\u8C61\u5316\u6216\u62C6\u5F97\u66F4\u7EC6\u3002\n\n5. \u7EF4\u5EA6\u8981\u5305\u542B\u5BF9\u76EE\u6807\u6700\u5173\u952E\u7684\u65B9\u9762\uFF0C\u4E5F\u8981\u5305\u542B\u5BB9\u6613\u88AB\u5FFD\u89C6\u4F46\u5B9E\u9645\u91CD\u8981\u7684\u65B9\u9762\u3002\u4E0D\u8981\u53EA\u5217\u663E\u800C\u6613\u89C1\u7684\uFF0C\u4E5F\u8981\u601D\u8003\u76F2\u533A\u3002\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u4F60\u7684\u8F93\u51FA\u8981\u6C42\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u5BF9\u6BCF\u4E2A\u7EF4\u5EA6\uFF0C\u4F60\u9700\u8981\u8F93\u51FA\u4EE5\u4E0B\u5B57\u6BB5\uFF1A\n\n- title\uFF1A\u7EF4\u5EA6\u540D\u79F0\uFF08\u7B80\u6D01\uFF0C5-15 \u5B57\uFF09\n\n- description\uFF1A\u8FD9\u4E2A\u7EF4\u5EA6\u8981\u63A2\u7D22\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u91CD\u8981\u3001\u8981\u56DE\u7B54\u7684\u6838\u5FC3\u95EE\u9898\u662F\u4EC0\u4E48\uFF082-4 \u53E5\u8BDD\uFF09\n\n- core_questions\uFF1A\u8BE5\u7EF4\u5EA6\u9700\u8981\u56DE\u7B54\u7684 2-4 \u4E2A\u6838\u5FC3\u95EE\u9898\uFF08\u5177\u4F53\u7684\u3001\u53EF\u641C\u7D22\u7684\u95EE\u9898\uFF09\n\n- timeliness\uFF1A\u521D\u59CB\u7D27\u8FEB\u6027\u2014\u2014\u591A\u5FEB\u9700\u8981\u5F00\u59CB\u63A2\u7D22\u8FD9\u4E2A\u7EF4\u5EA6\n  - \"urgent\"\uFF1A\u6709\u65F6\u95F4\u7A97\u53E3\u6216\u4F9D\u8D56\u5173\u7CFB\uFF0C\u9700\u8981\u5C3D\u5FEB\u5F00\u59CB\n  - \"normal\"\uFF1A\u6B63\u5E38\u8282\u594F\u542F\u52A8\u5373\u53EF\n  - \"can_wait\"\uFF1A\u53EF\u4EE5\u7B49\u5176\u4ED6\u7EF4\u5EA6\u5148\u63A8\u8FDB\u540E\u518D\u5F00\u59CB\n\n- refresh_interval\uFF1A\u63A2\u7D22\u9891\u7387\u2014\u2014\u591A\u4E45\u9700\u8981\u91CD\u65B0\u91C7\u96C6\u4E00\u6B21\u8BE5\u7EF4\u5EA6\u7684\u4FE1\u606F\n  - \"hours\"\uFF1A\u4FE1\u606F\u4EE5\u5C0F\u65F6\u7EA7\u66F4\u65B0\uFF08\u5982\u5B9E\u65F6\u8206\u60C5\u3001\u70ED\u70B9\u4E8B\u4EF6\u3001\u80A1\u4EF7\u6CE2\u52A8\uFF09\n  - \"daily\"\uFF1A\u4FE1\u606F\u4EE5\u5929\u7EA7\u66F4\u65B0\uFF08\u5982\u7ADE\u54C1\u52A8\u6001\u3001\u6280\u672F\u793E\u533A\u8BA8\u8BBA\u3001\u65B0\u95FB\u62A5\u9053\uFF09\n  - \"weekly\"\uFF1A\u4FE1\u606F\u4EE5\u5468\u7EA7\u66F4\u65B0\uFF08\u5982\u884C\u4E1A\u62A5\u544A\u3001\u9879\u76EE\u8FDB\u5C55\u3001\u5F00\u6E90\u7248\u672C\u53D1\u5E03\uFF09\n  - \"monthly\"\uFF1A\u4FE1\u606F\u4EE5\u6708\u7EA7\u6216\u66F4\u6162\u66F4\u65B0\uFF08\u5982\u5B66\u672F\u7EFC\u8FF0\u3001\u5E02\u573A\u5B63\u62A5\u3001\u653F\u7B56\u6CD5\u89C4\uFF09\n  \u5224\u65AD\u4F9D\u636E\uFF1A\u7EFC\u5408\u4E24\u4E2A\u56E0\u7D20\u2014\u2014\n  (1) \u4FE1\u606F\u6E90\u66F4\u65B0\u9891\u7387\uFF1A\u8BE5\u7EF4\u5EA6\u5173\u6CE8\u7684\u4FE1\u606F\uFF0C\u5728\u771F\u5B9E\u4E16\u754C\u4E2D\u591A\u4E45\u4F1A\u4EA7\u751F\u6709\u610F\u4E49\u7684\u65B0\u5185\u5BB9\uFF1F\n  (2) \u7EF4\u5EA6\u4EF7\u503C\u5927\u5C0F\uFF1A\u4EF7\u503C\u8D8A\u9AD8\u7684\u7EF4\u5EA6\uFF0C\u5373\u4F7F\u4FE1\u606F\u6E90\u66F4\u65B0\u4E0D\u7B97\u5FEB\uFF0C\u4E5F\u5E94\u9002\u5F53\u63D0\u9AD8\u91C7\u96C6\u9891\u7387\uFF0C\u4EE5\u786E\u4FDD\u4E0D\u9057\u6F0F\u5173\u952E\u53D8\u5316\uFF1B\u4EF7\u503C\u8F83\u4F4E\u7684\u7EF4\u5EA6\uFF0C\u5373\u4F7F\u4FE1\u606F\u6E90\u66F4\u65B0\u5FEB\uFF0C\u4E5F\u53EF\u4EE5\u964D\u4F4E\u9891\u7387\u907F\u514D\u6D6A\u8D39\u8D44\u6E90\u3002\n  \u7B80\u8A00\u4E4B\uFF1A\u9AD8\u4EF7\u503C + \u9AD8\u66F4\u65B0 \u2192 hours/daily\uFF1B\u9AD8\u4EF7\u503C + \u4F4E\u66F4\u65B0 \u2192 \u6BD4\u4FE1\u606F\u6E90\u9891\u7387\u7565\u9AD8\uFF1B\u4F4E\u4EF7\u503C + \u9AD8\u66F4\u65B0 \u2192 \u6BD4\u4FE1\u606F\u6E90\u9891\u7387\u7565\u4F4E\uFF1B\u4F4E\u4EF7\u503C + \u4F4E\u66F4\u65B0 \u2192 monthly\u3002\n\n- value_score\uFF1A\u5BF9\u76EE\u6807\u63A8\u8FDB\u7684\u4EF7\u503C\uFF081-10\uFF0C10 = \u6CA1\u6709\u5B83\u76EE\u6807\u65E0\u6CD5\u5B8C\u6210\uFF0C1 = \u9526\u4E0A\u6DFB\u82B1\uFF09\n\n- estimated_depth\uFF1A\u9884\u4F30\u9700\u8981\u591A\u6DF1\u7684\u63A2\u7D22\uFF081-5\uFF09\n  - 1 = \u5FEB\u901F\u641C\u7D22\u5373\u53EF\u4E86\u89E3\n  - 3 = \u9700\u8981\u591A\u8F6E\u641C\u7D22\u548C\u4EA4\u53C9\u9A8C\u8BC1\n  - 5 = \u9700\u8981\u6DF1\u5EA6\u7814\u7A76\u3001\u9605\u8BFB\u591A\u7BC7\u6587\u732E\u6216\u6301\u7EED\u8DDF\u8E2A\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u8F93\u51FA\u683C\u5F0F\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u4E25\u683C\u8F93\u51FA\u4EE5\u4E0B JSON\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55 JSON \u4EE5\u5916\u7684\u5185\u5BB9\uFF1A\n\n{\n  \"goal_understanding\": \"\u7528\u4E00\u53E5\u8BDD\u6982\u62EC\u4F60\u5BF9\u7528\u6237\u76EE\u6807\u7684\u7406\u89E3\",\n  \"completion_vision\": \"\u7528 1-2 \u53E5\u8BDD\u63CF\u8FF0\u76EE\u6807\u5B8C\u7F8E\u8FBE\u6210\u540E\u7684\u6837\u5B50\",\n  \"dimensions\": [\n    {\n      \"title\": \"\u7EF4\u5EA6\u540D\u79F0\",\n      \"description\": \"\u8FD9\u4E2A\u7EF4\u5EA6\u8981\u63A2\u7D22\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u91CD\u8981\u3001\u6838\u5FC3\u95EE\u9898\",\n      \"core_questions\": [\n        \"\u5177\u4F53\u95EE\u9898 1\",\n        \"\u5177\u4F53\u95EE\u9898 2\",\n        \"\u5177\u4F53\u95EE\u9898 3\"\n      ],\n      \"timeliness\": \"urgent | normal | can_wait\",\n      \"refresh_interval\": \"hours | daily | weekly | monthly\",\n      \"valueScore\": 8,\n      \"estimated_depth\": 3\n    }\n  ]\n}\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u8D28\u91CF\u68C0\u67E5\u6E05\u5355\uFF08\u8F93\u51FA\u524D\u81EA\u68C0\uFF09\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u25A1 \u7EF4\u5EA6\u6570\u91CF\u5728 4-6 \u4E2A\u4E4B\u95F4\n\u25A1 \u6BCF\u4E2A\u7EF4\u5EA6\u90FD\u4E0E\u7528\u6237\u76EE\u6807\u5F3A\u76F8\u5173\uFF08\u5982\u679C\u5220\u6389\u67D0\u4E2A\u7EF4\u5EA6\uFF0C\u76EE\u6807\u4F1A\u660E\u663E\u7F3A\u4E00\u5757\uFF09\n\u25A1 \u7EF4\u5EA6\u4E4B\u95F4\u6CA1\u6709\u5927\u9762\u79EF\u91CD\u53E0\n\u25A1 \u5408\u5728\u4E00\u8D77\u57FA\u672C\u8986\u76D6\u4E86\u76EE\u6807\u7684\u5168\u8C8C\n\u25A1 \u6BCF\u4E2A\u7EF4\u5EA6\u7684 core_questions \u662F\u5177\u4F53\u7684\u3001\u53EF\u4EE5\u76F4\u63A5\u62FF\u53BB\u641C\u7D22\u6216\u8C03\u7814\u7684\n\u25A1 \u81F3\u5C11\u6709\u4E00\u4E2A\u7EF4\u5EA6\u5173\u6CE8\u4E86\u5BB9\u6613\u88AB\u5FFD\u89C6\u4F46\u5B9E\u9645\u91CD\u8981\u7684\u65B9\u9762\n\u25A1 value_score \u7684\u5206\u5E03\u5408\u7406\uFF08\u4E0D\u5E94\u5168\u662F 8-10\uFF0C\u4E5F\u4E0D\u5E94\u5168\u662F 3-5\uFF09\n\u25A1 timeliness \u662F\u6839\u636E\"\u591A\u5FEB\u9700\u8981\u5F00\u59CB\"\u5224\u65AD\u7684\n\u25A1 refresh_interval \u662F\u6839\u636E\"\u4FE1\u606F\u6E90\u66F4\u65B0\u9891\u7387\"\u548C\"\u7EF4\u5EA6\u4EF7\u503C\u5927\u5C0F\"\u7EFC\u5408\u5224\u65AD\u7684\n\u25A1 timeliness \u548C refresh_interval \u662F\u72EC\u7ACB\u5224\u65AD\u7684\uFF08\u4E00\u4E2A\u7BA1\u542F\u52A8\u65F6\u673A\uFF0C\u4E00\u4E2A\u7BA1\u6301\u7EED\u9891\u7387\uFF09\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u7528\u6237\u76EE\u6807\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n**\u6807\u9898**: ".concat(goal.title, "\n**\u63CF\u8FF0**: ").concat(goal.description);
        if (goal.constraints.length > 0) {
            prompt += "\n\n**\u7EA6\u675F\u6761\u4EF6**:\n".concat(goal.constraints.map(function (c) { return "- [".concat(c.type, "] ").concat(c.description).concat(c.value ? " (".concat(c.value, ")") : ""); }).join("\n"));
        }
        if (goal.authorizationDepth) {
            prompt += "\n\n**\u6388\u6743\u6DF1\u5EA6**: ".concat(goal.authorizationDepth);
        }
        if (goal.priority) {
            prompt += "\n**\u4F18\u5148\u7EA7**: ".concat(goal.priority, "/10");
        }
        prompt += "\n\n\u8BF7\u6839\u636E\u4EE5\u4E0A\u76EE\u6807\uFF0C\u8F93\u51FA\u62C6\u89E3\u7ED3\u679C\uFF08\u4EC5 JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A";
        return prompt;
    };
    /**
     * Convert LLM output into DimensionNode tree
     */
    GoalDecomposer.prototype.convertToNodes = function (goalId, dims) {
        var _this = this;
        return dims.map(function (dim) {
            return _this.createNode(goalId, dim);
        });
    };
    GoalDecomposer.prototype.createNode = function (goalId, dim) {
        return {
            id: (0, utils_js_1.generateId)(),
            goalId: goalId,
            parentDimensionId: null,
            title: dim.title,
            description: dim.description,
            core_questions: dim.core_questions,
            status: "pending",
            explorationDepth: 0,
            estimated_depth: dim.estimated_depth,
            timeliness: dim.timeliness,
            refresh_interval: dim.refresh_interval,
            valueScore: dim.valueScore,
            children: [],
            dataSources: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    };
    return GoalDecomposer;
}());
exports.GoalDecomposer = GoalDecomposer;
