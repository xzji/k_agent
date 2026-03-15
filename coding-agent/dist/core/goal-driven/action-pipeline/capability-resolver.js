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
exports.CapabilityResolver = void 0;
/**
 * CapabilityResolver
 *
 * Determines HOW to execute an ActionPlan by analyzing available capabilities
 * and selecting the best approach (Level 1-4 strategy).
 *
 * Level 1: Direct tool match (use existing tool)
 * Level 2: Tool composition (chain multiple tools)
 * Level 3: Code generation (write script to solve)
 * Level 4: User help request (ask user for assistance)
 */
var CapabilityResolver = /** @class */ (function () {
    function CapabilityResolver(llm) {
        this.availableTools = [
            "bash", // Execute bash commands
            "web_search", // Search the web
            "read", // Read file contents
            "write", // Write/create files
            "edit", // Edit existing files
            "grep", // Search in files
            "find", // Find files
            "ls", // List directory
        ];
        this.llm = llm;
    }
    /**
     * Resolve how to execute the given ActionPlan
     */
    CapabilityResolver.prototype.resolve = function (plan) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, response, toolChain, error_1, errorMessage, fallbackChain;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt = "You are a Capability Resolver. Analyze this action plan and determine the best way to execute it.\n\nAction to perform: ".concat(plan.what, "\nExpected outcome: ").concat(plan.expectedOutcome, "\nCost estimate: ").concat(plan.costEstimate, "\nUrgency: ").concat(plan.urgency, "\n\nAvailable tools: ").concat(this.availableTools.join(", "), "\n\nDetermine the execution strategy:\n- Level 1: Can be done with a single existing tool directly\n- Level 2: Needs multiple tools chained together\n- Level 3: Needs custom code/script (write a temp script and run it)\n- Level 4: Cannot be automated, needs user help\n\nProvide your analysis as JSON (respond with ONLY valid JSON, no other text):\n{\n  \"level\": 1,\n  \"toolChain\": [\n    {\n      \"toolName\": \"bash\",\n      \"description\": \"brief description\",\n      \"input\": {},\n      \"dependsOn\": []\n    }\n  ],\n  \"reasoning\": \"brief explanation\",\n  \"needsUserHelp\": false\n}");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: "You are a Capability Resolver. Always respond with valid JSON only. Do not include any text outside the JSON object.",
                                messages: [{ role: "user", content: prompt }],
                                temperature: 0.3 // Lower temperature for more consistent JSON
                            })];
                    case 2:
                        response = _a.sent();
                        toolChain = response.toolChain.map(function (step, index) { return ({
                            toolName: step.toolName,
                            description: step.description,
                            input: step.input,
                            dependsOn: step.dependsOn
                        }); });
                        if (response.level === 4 || response.needsUserHelp) {
                            // Level 4: Need user help
                            return [2 /*return*/, {
                                    level: 4,
                                    toolChain: [],
                                    needsUserHelp: true,
                                    userHelpRequest: {
                                        whatAgentWantsToDo: plan.what,
                                        why: plan.why,
                                        blockedBy: response.reasoning,
                                        whatUserNeedsToDo: this.extractUserTask(response),
                                        agentPreparedParts: this.generateUserHelpPreparation(plan)
                                    }
                                }];
                        }
                        // Level 1-3: Automated execution
                        return [2 /*return*/, {
                                level: response.level,
                                toolChain: toolChain,
                                needsUserHelp: false
                            }];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        console.error("CapabilityResolver LLM error:", errorMessage);
                        // If it's a JSON parsing error, try to get the raw response
                        if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
                            console.error("JSON parsing failed. The LLM may have returned non-JSON response.");
                            console.error("Action being analyzed:", plan.what);
                            console.error("Using fallback resolution...");
                        }
                        fallbackChain = [
                            {
                                toolName: plan.urgency === "urgent" ? "web_search" : "bash",
                                description: plan.what,
                                input: plan.urgency === "urgent"
                                    ? { query: this.extractSearchQuery(plan.what) || plan.what }
                                    : { command: this.extractSearchQuery(plan.what) || "echo \"Analyzing: ".concat(plan.what, "\"") }
                            }
                        ];
                        return [2 /*return*/, {
                                level: 2,
                                toolChain: fallbackChain,
                                needsUserHelp: false
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract a search query from natural language description
     */
    CapabilityResolver.prototype.extractSearchQuery = function (what) {
        // Simple heuristic: look for search-related keywords
        var searchKeywords = ["search", "find", "look up", "google", "query"];
        var lowerWhat = what.toLowerCase();
        for (var _i = 0, searchKeywords_1 = searchKeywords; _i < searchKeywords_1.length; _i++) {
            var keyword = searchKeywords_1[_i];
            if (lowerWhat.includes(keyword)) {
                // Extract what to search for
                var match = what.match(new RegExp("".concat(keyword, "\\s+(?:for\\s+)?(.+)"), "i"));
                return match ? match[1].trim() : null;
            }
        }
        return null;
    };
    /**
     * Extract what the user needs to do for Level 4 cases
     */
    CapabilityResolver.prototype.extractUserTask = function (response) {
        // Generate a clear user task description
        return "The agent needs assistance with: ".concat(response.reasoning, ". Please perform this action manually or provide the necessary resources.");
    };
    /**
     * Generate prepared parts to help the user
     */
    CapabilityResolver.prototype.generateUserHelpPreparation = function (plan) {
        return "Context for the action:\n- Goal: ".concat(plan.goalImpact, "\n- Action: ").concat(plan.what, "\n- Why: ").concat(plan.why, "\n- Expected: ").concat(plan.expectedOutcome);
    };
    return CapabilityResolver;
}());
exports.CapabilityResolver = CapabilityResolver;
