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
exports.PreActionGate = void 0;
/**
 * PreActionGate
 *
 * Verifies if an ActionPlan is safe to execute autonomously, or if it requires user confirmation,
 * based on the goal's authorizationDepth and the action's inherent risk.
 */
var PreActionGate = /** @class */ (function () {
    function PreActionGate(llm) {
        this.llm = llm;
    }
    /**
     * Evaluate whether an ActionPlan can proceed.
     * Returns "approve", "reject", or "needs_user".
     */
    PreActionGate.prototype.evaluate = function (goal, plan) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt_1, parsed, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 1. Hard constraints based on AuthorizationDepth
                        if (goal.authorizationDepth === "monitor") {
                            // Monitor-only goals can NEVER execute autonomously
                            return [2 /*return*/, "needs_user"];
                        }
                        if (plan.requiresUserInvolvement) {
                            return [2 /*return*/, "needs_user"];
                        }
                        // 2. Risk assessment for 'assisted' or 'mixed'
                        if (goal.authorizationDepth === "assisted" || goal.authorizationDepth === "mixed") {
                            if (!plan.reversible || plan.costEstimate === "high") {
                                return [2 /*return*/, "needs_user"];
                            }
                        }
                        if (!(goal.constraints && goal.constraints.length > 0)) return [3 /*break*/, 4];
                        prompt_1 = "Goal: ".concat(goal.title, "\nConstraints:\n").concat(goal.constraints.map(function (c) { return "- [".concat(c.type, "]: ").concat(c.description); }).join('\n'), "\n\nProposed Action: ").concat(plan.what, "\nReasoning: ").concat(plan.why, "\nExpected Outcome: ").concat(plan.expectedOutcome, "\n\nDoes this action violate any of the constraints? \nAnswer with a JSON object: {\"violates\": boolean, \"reason\": \"string\"}");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: "You are the Pre-Action Gate. Determine if the proposed action violates any given constraints.",
                                messages: [{ role: "user", content: prompt_1 }]
                            })];
                    case 2:
                        parsed = _a.sent();
                        if (parsed.violates) {
                            // Plan violates a constraint
                            return [2 /*return*/, "reject"];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.error("PreActionGate LLM check failed:", err_1);
                        // Err on the side of caution
                        return [2 /*return*/, "needs_user"];
                    case 4: return [2 /*return*/, "approve"];
                }
            });
        });
    };
    return PreActionGate;
}());
exports.PreActionGate = PreActionGate;
