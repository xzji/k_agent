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
exports.Executor = void 0;
/**
 * Executor
 *
 * Executes an approved ActionPlan using the resolved capability (tool chain).
 * For P2, supports bash commands, web search, and basic file operations.
 */
var Executor = /** @class */ (function () {
    function Executor(pi, llm) {
        this.pi = pi;
        this.llm = llm;
    }
    /**
     * Executes the approved ActionPlan with the given capability resolution
     */
    Executor.prototype.execute = function (plan, resolution) {
        return __awaiter(this, void 0, void 0, function () {
            var stepResults, outputs, _i, _a, step, allDepsMet, result, attempt, allSuccess, finalOutput;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (resolution.needsUserHelp) {
                            // Level 4: Request user help
                            return [2 /*return*/, {
                                    actionPlanId: plan.id,
                                    status: "failed",
                                    stepResults: [],
                                    output: "This action requires user assistance",
                                    newDimensions: [],
                                    executedAt: Date.now()
                                }];
                        }
                        stepResults = [];
                        outputs = new Map();
                        _i = 0, _a = resolution.toolChain;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        step = _a[_i];
                        // Check dependencies
                        if (step.dependsOn && step.dependsOn.length > 0) {
                            allDepsMet = step.dependsOn.every(function (depId) {
                                var depResult = stepResults.find(function (r) { return r.stepId === depId; });
                                return (depResult === null || depResult === void 0 ? void 0 : depResult.status) === "success";
                            });
                            if (!allDepsMet) {
                                stepResults.push({
                                    stepId: step.toolName,
                                    status: "skipped",
                                    reason: "Dependencies not met"
                                });
                                return [3 /*break*/, 7];
                            }
                        }
                        result = {
                            stepId: step.toolName,
                            status: "failed",
                            error: "Execution failed after retries"
                        };
                        attempt = 0;
                        _b.label = 2;
                    case 2:
                        if (!(attempt < 3)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.executeStep(step, outputs)];
                    case 3:
                        result = _b.sent();
                        if (result.status === "success") {
                            return [3 /*break*/, 6];
                        }
                        if (!(attempt < 2)) return [3 /*break*/, 5];
                        // For now, just retry as-is. In full version, would use LLM to adjust.
                        return [4 /*yield*/, this.sleep(1000 * (attempt + 1))];
                    case 4:
                        // For now, just retry as-is. In full version, would use LLM to adjust.
                        _b.sent(); // Backoff
                        _b.label = 5;
                    case 5:
                        attempt++;
                        return [3 /*break*/, 2];
                    case 6:
                        stepResults.push(result);
                        if (result.status === "success" && result.output) {
                            outputs.set(step.toolName, result.output);
                        }
                        _b.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8:
                        allSuccess = stepResults.every(function (r) { return r.status === "success" || r.status === "skipped"; });
                        finalOutput = Array.from(outputs.values()).join("\n\n");
                        return [2 /*return*/, {
                                actionPlanId: plan.id,
                                status: allSuccess ? "completed" : "partial",
                                stepResults: stepResults,
                                output: finalOutput,
                                newDimensions: [], // Could be populated by analyzing output
                                executedAt: Date.now()
                            }];
                }
            });
        });
    };
    /**
     * Execute a single tool step
     */
    Executor.prototype.executeStep = function (step, priorOutputs) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 19, , 20]);
                        _a = step.toolName;
                        switch (_a) {
                            case "bash": return [3 /*break*/, 1];
                            case "web_search": return [3 /*break*/, 3];
                            case "read": return [3 /*break*/, 5];
                            case "write": return [3 /*break*/, 7];
                            case "grep": return [3 /*break*/, 9];
                            case "find": return [3 /*break*/, 11];
                            case "ls": return [3 /*break*/, 13];
                            case "llm_analysis": return [3 /*break*/, 15];
                        }
                        return [3 /*break*/, 17];
                    case 1: return [4 /*yield*/, this.executeBash(step.input)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, this.executeWebSearch(step.input)];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: return [4 /*yield*/, this.executeRead(step.input)];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7: return [4 /*yield*/, this.executeWrite(step.input, priorOutputs)];
                    case 8: return [2 /*return*/, _b.sent()];
                    case 9: return [4 /*yield*/, this.executeGrep(step.input)];
                    case 10: return [2 /*return*/, _b.sent()];
                    case 11: return [4 /*yield*/, this.executeFind(step.input)];
                    case 12: return [2 /*return*/, _b.sent()];
                    case 13: return [4 /*yield*/, this.executeLs(step.input)];
                    case 14: return [2 /*return*/, _b.sent()];
                    case 15: return [4 /*yield*/, this.executeLLMAnalysis(step.input, priorOutputs)];
                    case 16: return [2 /*return*/, _b.sent()];
                    case 17: return [2 /*return*/, {
                            stepId: step.toolName,
                            status: "failed",
                            error: "Unknown tool: ".concat(step.toolName)
                        }];
                    case 18: return [3 /*break*/, 20];
                    case 19:
                        error_1 = _b.sent();
                        return [2 /*return*/, {
                                stepId: step.toolName,
                                status: "failed",
                                error: String(error_1)
                            }];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute bash command via pi.exec
     */
    Executor.prototype.executeBash = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var command, parts, cmd, args, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        command = String(input.command || "");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        parts = command.trim().split(/\s+/);
                        cmd = parts[0] || "echo";
                        args = parts.slice(1);
                        return [4 /*yield*/, this.pi.exec(cmd, args, {
                                timeout: 30000 // 30 second timeout
                            })];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "bash",
                                status: result.code === 0 ? "success" : "failed",
                                output: result.stdout || result.stderr,
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "bash",
                                status: "failed",
                                error: String(error_2)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute web search using SearXNG (no API key required)
     */
    Executor.prototype.executeWebSearch = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var query, DEFAULT_SEARXNG_URL, apiUrl, url, response, data, output, _i, _a, _b, index, result, snippet, error_3;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        query = String(input.query || "");
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";
                        apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;
                        url = new URL(apiUrl);
                        url.searchParams.append("q", query);
                        url.searchParams.append("format", "json");
                        url.searchParams.append("language", "auto");
                        url.searchParams.append("categories", "general");
                        return [4 /*yield*/, fetch(url.toString())];
                    case 2:
                        response = _d.sent();
                        if (!response.ok) {
                            return [2 /*return*/, {
                                    stepId: "web_search",
                                    status: "failed",
                                    error: "SearXNG API failed: ".concat(response.statusText)
                                }];
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _d.sent();
                        if (!data.results || data.results.length === 0) {
                            return [2 /*return*/, {
                                    stepId: "web_search",
                                    status: "success",
                                    output: "No results found for query: ".concat(query)
                                }];
                        }
                        output = "Found ".concat(data.results.length, " results for \"").concat(query, "\":\n\n");
                        for (_i = 0, _a = data.results.slice(0, 5).entries(); _i < _a.length; _i++) {
                            _b = _a[_i], index = _b[0], result = _b[1];
                            snippet = ((_c = result.content) === null || _c === void 0 ? void 0 : _c.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").substring(0, 100)) || "";
                            output += "".concat(index + 1, ". ").concat(result.title, "\n   ").concat(snippet, "\n   ").concat(result.url, "\n\n");
                        }
                        return [2 /*return*/, {
                                stepId: "web_search",
                                status: "success",
                                output: output.trim()
                            }];
                    case 4:
                        error_3 = _d.sent();
                        return [2 /*return*/, {
                                stepId: "web_search",
                                status: "failed",
                                error: String(error_3)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Read file contents
     */
    Executor.prototype.executeRead = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = String(input.path || "");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pi.exec("cat", [filePath])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "read",
                                status: result.code === 0 ? "success" : "failed",
                                output: result.stdout,
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_4 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "read",
                                status: "failed",
                                error: String(error_4)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Write content to file
     */
    Executor.prototype.executeWrite = function (input, priorOutputs) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, content, escapedContent, script, parts, cmd, args, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = String(input.path || "");
                        content = String(input.content || priorOutputs.get("llm_analysis") || "");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        escapedContent = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                        script = "printf '%s\\n' \"".concat(escapedContent, "\" > \"").concat(filePath, "\"");
                        parts = script.trim().split(/\s+/);
                        cmd = parts[0] || "printf";
                        args = parts.slice(1);
                        return [4 /*yield*/, this.pi.exec(cmd, args)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "write",
                                status: result.code === 0 ? "success" : "failed",
                                output: "Written to ".concat(filePath),
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_5 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "write",
                                status: "failed",
                                error: String(error_5)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Grep for patterns in files
     */
    Executor.prototype.executeGrep = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var pattern, path, result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pattern = String(input.pattern || "");
                        path = String(input.path || ".");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pi.exec("grep", ["-r", pattern, path, "|", "head", "-20"])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "grep",
                                status: result.code === 0 ? "success" : "failed",
                                output: result.stdout || "No matches found",
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_6 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "grep",
                                status: "failed",
                                error: String(error_6)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find files
     */
    Executor.prototype.executeFind = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var path, name, type, args, result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        path = String(input.path || ".");
                        name = String(input.name || "");
                        type = String(input.type || "");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        args = [path];
                        if (name)
                            args.push("-name", name);
                        if (type)
                            args.push("-type", type);
                        args.push("|", "head", "-20");
                        return [4 /*yield*/, this.pi.exec("find", args)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "find",
                                status: result.code === 0 ? "success" : "failed",
                                output: result.stdout || "No files found",
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "find",
                                status: "failed",
                                error: String(error_7)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List directory contents
     */
    Executor.prototype.executeLs = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var path, result, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        path = String(input.path || ".");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pi.exec("ls", ["-la", path])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                stepId: "ls",
                                status: result.code === 0 ? "success" : "failed",
                                output: result.stdout,
                                error: result.code !== 0 ? result.stderr : undefined
                            }];
                    case 3:
                        error_8 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "ls",
                                status: "failed",
                                error: String(error_8)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute LLM analysis step
     */
    Executor.prototype.executeLLMAnalysis = function (input, priorOutputs) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, context, response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.llm) {
                            return [2 /*return*/, {
                                    stepId: "llm_analysis",
                                    status: "failed",
                                    error: "LLM not available"
                                }];
                        }
                        prompt = String(input.prompt || "");
                        context = String(input.context || "");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chat({
                                systemPrompt: "You are analyzing information for a goal-driven autonomous agent.",
                                messages: [
                                    { role: "user", content: "".concat(context, "\n\nTask: ").concat(prompt) }
                                ]
                            })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, {
                                stepId: "llm_analysis",
                                status: "success",
                                output: response.content
                            }];
                    case 3:
                        error_9 = _a.sent();
                        return [2 /*return*/, {
                                stepId: "llm_analysis",
                                status: "failed",
                                error: String(error_9)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return Executor;
}());
exports.Executor = Executor;
