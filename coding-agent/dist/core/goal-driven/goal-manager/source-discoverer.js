"use strict";
/**
 * SourceDiscoverer — Discovers and binds data sources to dimensions
 *
 * Two-phase discovery process:
 * Phase 1: LLM recommends known professional sources + discovery queries
 * Phase 2: Use discovery queries with web_search to find additional sources
 * Phase 3: Extract sources from search results via LLM
 * Phase 4: Accessibility checks for medium/low confidence sources
 * Phase 5: Bind verified sources to dimensions
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
exports.SourceDiscoverer = void 0;
var utils_js_1 = require("../utils.js");
var SourceDiscoverer = /** @class */ (function () {
    function SourceDiscoverer(llm, piApi, onProgress) {
        this.llm = llm;
        this.onProgress = onProgress;
    }
    /**
     * Phase 1-5: Complete discovery pipeline
     */
    SourceDiscoverer.prototype.discoverAndBind = function (goal, dimensions) {
        return __awaiter(this, void 0, void 0, function () {
            var discoveryOutput, searchResultsByDimension, enhancedDiscovery, verifiedSources;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        (_a = this.onProgress) === null || _a === void 0 ? void 0 : _a.call(this, "🔎 [1/5] 识别专业信息源...", "info");
                        return [4 /*yield*/, this.phase1_LLMRecommend(goal, dimensions)];
                    case 1:
                        discoveryOutput = _c.sent();
                        return [4 /*yield*/, this.phase2_WebSearchDiscovery(discoveryOutput)];
                    case 2:
                        searchResultsByDimension = _c.sent();
                        return [4 /*yield*/, this.phase3_ExtractFromSearchResults(discoveryOutput, searchResultsByDimension, goal)];
                    case 3:
                        enhancedDiscovery = _c.sent();
                        return [4 /*yield*/, this.phase4_AccessibilityCheck(enhancedDiscovery)];
                    case 4:
                        verifiedSources = _c.sent();
                        // Phase 5: Bind to dimensions (includes fallback creation)
                        return [4 /*yield*/, this.phase5_BindToDimensions(goal, dimensions, verifiedSources)];
                    case 5:
                        // Phase 5: Bind to dimensions (includes fallback creation)
                        _c.sent();
                        (_b = this.onProgress) === null || _b === void 0 ? void 0 : _b.call(this, "\u2705 [5/5] \u4FE1\u606F\u6E90\u53D1\u73B0\u5B8C\u6210\uFF0C\u5171 ".concat(verifiedSources.length, " \u4E2A"), "success");
                        return [2 /*return*/, verifiedSources];
                }
            });
        });
    };
    /**
     * Phase 1: LLM recommends known sources + discovery queries
     */
    SourceDiscoverer.prototype.phase1_LLMRecommend = function (goal, dimensions) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, systemPrompt, result, knownSourceCount, queryCount, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        prompt = this.buildDiscoveryPrompt(goal, dimensions);
                        systemPrompt = "You are a professional information source discovery engine. You identify authoritative, domain-specific sources for research dimensions. Always respond with valid JSON only.";
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llm.chatJSON({
                                systemPrompt: systemPrompt,
                                messages: [{ role: "user", content: prompt }],
                                temperature: 0.4,
                                maxTokens: 20000, // Increased to handle large responses
                            })];
                    case 2:
                        result = _c.sent();
                        // Validate result structure
                        if (!result || !result.dimension_sources || !Array.isArray(result.dimension_sources)) {
                            throw new Error("Invalid LLM response: missing or invalid dimension_sources array");
                        }
                        knownSourceCount = result.dimension_sources.reduce(function (sum, dim) { var _a; return sum + (((_a = dim.recommended_sources) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
                        queryCount = result.dimension_sources.reduce(function (sum, dim) { var _a; return sum + (((_a = dim.discovery_queries) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
                        (_a = this.onProgress) === null || _a === void 0 ? void 0 : _a.call(this, "   \u2713 \u5DF2\u77E5\u4FE1\u606F\u6E90: ".concat(knownSourceCount, " \u4E2A\uFF0C\u53D1\u73B0\u67E5\u8BE2: ").concat(queryCount, " \u6761"), "info");
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _c.sent();
                        (_b = this.onProgress) === null || _b === void 0 ? void 0 : _b.call(this, "   \u26A0\uFE0F  LLM \u63A8\u8350\u5931\u8D25: ".concat(error_1), "warning");
                        // Return empty discovery with discovery_queries as fallback
                        return [2 /*return*/, this.createFallbackDiscovery(dimensions)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Phase 2: Execute discovery_queries via web_search
     */
    SourceDiscoverer.prototype.phase2_WebSearchDiscovery = function (discoveryOutput) {
        return __awaiter(this, void 0, void 0, function () {
            var resultsByDimension, _i, _a, dimDiscovery, searchResults, _b, _c, queryObj, results, error_2;
            var _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        (_d = this.onProgress) === null || _d === void 0 ? void 0 : _d.call(this, "🔎 [2/5] 搜索专业信息源...", "info");
                        resultsByDimension = new Map();
                        _i = 0, _a = discoveryOutput.dimension_sources;
                        _h.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        dimDiscovery = _a[_i];
                        searchResults = [];
                        _b = 0, _c = dimDiscovery.discovery_queries;
                        _h.label = 2;
                    case 2:
                        if (!(_b < _c.length)) return [3 /*break*/, 7];
                        queryObj = _c[_b];
                        _h.label = 3;
                    case 3:
                        _h.trys.push([3, 5, , 6]);
                        (_e = this.onProgress) === null || _e === void 0 ? void 0 : _e.call(this, "   \uD83D\uDD0D \u641C\u7D22: \"".concat(queryObj.query.substring(0, 50), "...\""), "info");
                        return [4 /*yield*/, this.executeWebSearch(queryObj.query)];
                    case 4:
                        results = _h.sent();
                        searchResults.push.apply(searchResults, results);
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _h.sent();
                        (_f = this.onProgress) === null || _f === void 0 ? void 0 : _f.call(this, "   \u26A0\uFE0F  \u641C\u7D22\u5931\u8D25: ".concat(queryObj.query.substring(0, 30), "..."), "warning");
                        return [3 /*break*/, 6];
                    case 6:
                        _b++;
                        return [3 /*break*/, 2];
                    case 7:
                        resultsByDimension.set(dimDiscovery.dimension_title, searchResults);
                        if (searchResults.length > 0) {
                            (_g = this.onProgress) === null || _g === void 0 ? void 0 : _g.call(this, "   \u2713 \u627E\u5230 ".concat(searchResults.length, " \u6761\u7ED3\u679C"), "success");
                        }
                        _h.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/, resultsByDimension];
                }
            });
        });
    };
    /**
     * Phase 3: Extract additional sources from search results
     */
    SourceDiscoverer.prototype.phase3_ExtractFromSearchResults = function (initialDiscovery, searchResultsByDimension, goal) {
        return __awaiter(this, void 0, void 0, function () {
            var enhancedDiscovery;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                (_a = this.onProgress) === null || _a === void 0 ? void 0 : _a.call(this, "🔎 [3/5] 提取信息源...", "info");
                // If no search results, return initial discovery
                if (searchResultsByDimension.size === 0) {
                    (_b = this.onProgress) === null || _b === void 0 ? void 0 : _b.call(this, "   ⚠️  无搜索结果", "warning");
                    return [2 /*return*/, initialDiscovery];
                }
                enhancedDiscovery = {
                    dimension_sources: initialDiscovery.dimension_sources.map(function (dim) {
                        var _a;
                        var searchResults = searchResultsByDimension.get(dim.dimension_title) || [];
                        if (searchResults.length === 0)
                            return dim;
                        // Add sources extracted from search results
                        var extractedSources = _this.extractSourcesFromSearchResults(searchResults, dim);
                        if (extractedSources.length > 0) {
                            (_a = _this.onProgress) === null || _a === void 0 ? void 0 : _a.call(_this, "   \u2713 \u4ECE\u641C\u7D22\u7ED3\u679C\u63D0\u53D6 ".concat(extractedSources.length, " \u4E2A\u4FE1\u606F\u6E90"), "success");
                        }
                        return __assign(__assign({}, dim), { recommended_sources: __spreadArray(__spreadArray([], dim.recommended_sources, true), extractedSources, true) });
                    })
                };
                return [2 /*return*/, enhancedDiscovery];
            });
        });
    };
    /**
     * Phase 4: Check accessibility of sources (especially medium/low confidence)
     */
    SourceDiscoverer.prototype.phase4_AccessibilityCheck = function (discoveryOutput) {
        return __awaiter(this, void 0, void 0, function () {
            var allSources, highCount, verifiedCount, failedCount, _i, _a, dimDiscovery, _b, _c, source, isAccessible;
            var _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        (_d = this.onProgress) === null || _d === void 0 ? void 0 : _d.call(this, "🔎 [4/5] 验证信息源可达性...", "info");
                        allSources = [];
                        highCount = 0;
                        verifiedCount = 0;
                        failedCount = 0;
                        _i = 0, _a = discoveryOutput.dimension_sources;
                        _j.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        dimDiscovery = _a[_i];
                        _b = 0, _c = dimDiscovery.recommended_sources;
                        _j.label = 2;
                    case 2:
                        if (!(_b < _c.length)) return [3 /*break*/, 5];
                        source = _c[_b];
                        // Skip accessibility check for high confidence sources
                        if (source.confidence === "high") {
                            allSources.push(this.createDataSourceObject(source, dimDiscovery));
                            highCount++;
                            return [3 /*break*/, 4];
                        }
                        // For medium/low, do accessibility check
                        (_e = this.onProgress) === null || _e === void 0 ? void 0 : _e.call(this, "   \uD83D\uDD0D \u68C0\u67E5: ".concat(source.name), "info");
                        return [4 /*yield*/, this.checkAccessibility(source)];
                    case 3:
                        isAccessible = _j.sent();
                        if (isAccessible) {
                            allSources.push(this.createDataSourceObject(source, dimDiscovery));
                            verifiedCount++;
                            (_f = this.onProgress) === null || _f === void 0 ? void 0 : _f.call(this, "   \u2713 \u53EF\u8BBF\u95EE", "success");
                        }
                        else {
                            failedCount++;
                            (_g = this.onProgress) === null || _g === void 0 ? void 0 : _g.call(this, "   \u2717 \u4E0D\u53EF\u8BBF\u95EE", "warning");
                        }
                        _j.label = 4;
                    case 4:
                        _b++;
                        return [3 /*break*/, 2];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        (_h = this.onProgress) === null || _h === void 0 ? void 0 : _h.call(this, "   \u2713 \u9AD8\u7F6E\u4FE1\u5EA6: ".concat(highCount, "\uFF0C\u9A8C\u8BC1\u901A\u8FC7: ").concat(verifiedCount, "\uFF0C\u5931\u8D25: ").concat(failedCount), "success");
                        return [2 /*return*/, allSources];
                }
            });
        });
    };
    /**
     * Phase 5: Bind sources to dimensions
     */
    SourceDiscoverer.prototype.phase5_BindToDimensions = function (goal, dimensions, sources) {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, dimensions_1, dim;
            return __generator(this, function (_a) {
                _loop_1 = function (dim) {
                    // Try to find matching sources by domain
                    var matchingSources = sources.filter(function (source) {
                        var domainAnalysis = source.domainAnalysis || "";
                        return dim.title.toLowerCase().includes(domainAnalysis.toLowerCase()) ||
                            domainAnalysis.toLowerCase().includes(dim.title.toLowerCase());
                    });
                    // If we found matching sources, bind them
                    if (matchingSources.length > 0) {
                        for (var _b = 0, matchingSources_1 = matchingSources; _b < matchingSources_1.length; _b++) {
                            var source = matchingSources_1[_b];
                            var binding = {
                                sourceId: source.id,
                                query: "".concat(goal.title, ": ").concat(dim.title),
                                suggestedQuery: "Search for ".concat(dim.core_questions[0] || dim.title),
                                lastFetchedAt: null,
                                fetchInterval: this_1.convertRefreshIntervalToMs(dim.refresh_interval),
                                accessible: true,
                                confidence: source.confidence,
                            };
                            dim.dataSources.push(binding);
                        }
                    }
                    else {
                        // No matching sources, create a dedicated web_search source for this dimension
                        var dedicatedSource = this_1.createFallbackSourceForDimension(dim, goal);
                        var binding = {
                            sourceId: dedicatedSource.id,
                            query: "".concat(goal.title, ": ").concat(dim.title),
                            suggestedQuery: "Search for ".concat(dim.core_questions[0] || dim.title),
                            lastFetchedAt: null,
                            fetchInterval: this_1.convertRefreshIntervalToMs(dim.refresh_interval),
                            accessible: true,
                            confidence: "high",
                        };
                        dim.dataSources.push(binding);
                        sources.push(dedicatedSource); // Add to sources list so it gets persisted
                    }
                };
                this_1 = this;
                // For each dimension, create a dedicated web_search source
                // This avoids the problem of binding all sources to all dimensions
                for (_i = 0, dimensions_1 = dimensions; _i < dimensions_1.length; _i++) {
                    dim = dimensions_1[_i];
                    _loop_1(dim);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Create fallback web_search source for dimensions with no sources
     */
    SourceDiscoverer.prototype.createFallbackSource = function (dimensions) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        id: (0, utils_js_1.generateId)(),
                        type: "web_search",
                        name: "Web Search (fallback)",
                        config: { engine: "default" },
                        reachable: true,
                        lastCheckedAt: null,
                        confidence: "high",
                        updateFrequency: "daily",
                        domainAnalysis: "General web search"
                    }];
            });
        });
    };
    /**
     * Create a fallback source for a specific dimension
     */
    SourceDiscoverer.prototype.createFallbackSourceForDimension = function (dim, goal) {
        return {
            id: (0, utils_js_1.generateId)(),
            type: "web_search",
            name: "Web Search (".concat(dim.title, ")"),
            config: { engine: "default" },
            reachable: true,
            lastCheckedAt: null,
            confidence: "high",
            updateFrequency: dim.refresh_interval,
            domainAnalysis: dim.title
        };
    };
    /**
     * Build the main discovery prompt
     */
    SourceDiscoverer.prototype.buildDiscoveryPrompt = function (goal, dims) {
        var dimList = dims
            .map(function (d) {
            var questions = d.core_questions.map(function (q) { return "    - ".concat(q); }).join("\n");
            return "**".concat(d.title, "**\n   \u63CF\u8FF0: ").concat(d.description, "\n   \u6838\u5FC3\u95EE\u9898:\n").concat(questions, "\n   \u66F4\u65B0\u9891\u7387: ").concat(d.refresh_interval, "\n   \u63A2\u7D22\u6DF1\u5EA6: ").concat(d.estimated_depth, "/5");
        })
            .join("\n\n");
        return "\u4F60\u662F\u4E00\u4E2A\u76EE\u6807\u9A71\u52A8\u578B AI \u52A9\u624B\u7684\u300C\u4FE1\u606F\u6E90\u53D1\u73B0\u5F15\u64CE\u300D\u3002\n\n\u4F60\u7684\u804C\u8D23\uFF1A\u5728\u76EE\u6807\u7684\u63A2\u7D22\u7EF4\u5EA6\u786E\u5B9A\u4E4B\u540E\uFF0C\u4E3A\u6BCF\u4E2A\u7EF4\u5EA6\u53D1\u73B0\u6700\u5408\u9002\u7684\u4FE1\u606F\u6E90\u3002\u4F60\u9700\u8981\u56DE\u7B54\u4E00\u4E2A\u6838\u5FC3\u95EE\u9898\u2014\u2014\"\u8981\u4E86\u89E3\u8FD9\u4E2A\u7EF4\u5EA6\u7684\u4FE1\u606F\uFF0C\u5E94\u8BE5\u53BB\u54EA\u91CC\u627E\uFF1F\"\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u80CC\u666F\u8BA4\u77E5\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u4E0D\u540C\u9886\u57DF\u6709\u4E0D\u540C\u7684\u6743\u5A01\u548C\u53CA\u65F6\u4FE1\u606F\u6E90\u3002\u901A\u7528\u641C\u7D22\u5F15\u64CE\uFF08Google/Bing\uFF09\u867D\u7136\u8986\u76D6\u5E7F\uFF0C\u4F46\u5F80\u5F80\u4E0D\u662F\u6700\u53CA\u65F6\u3001\u6700\u7CBE\u51C6\u7684\u6E20\u9053\u3002\u4F8B\u5982\uFF1A\n- \u5B66\u672F\u7814\u7A76 \u2192 arXiv\u3001Google Scholar\u3001Semantic Scholar\u3001\u7279\u5B9A\u4F1A\u8BAE\u5B98\u7F51\n- \u5F00\u6E90\u6280\u672F \u2192 GitHub\uFF08\u4ED3\u5E93/Release/Issues/Discussions\uFF09\u3001Hacker News\u3001Reddit \u6280\u672F\u7248\u5757\n- \u5546\u4E1A\u7ADE\u54C1 \u2192 Crunchbase\u3001\u4EA7\u54C1\u5B98\u7F51/Changelog\u3001Product Hunt\u3001\u884C\u4E1A\u5A92\u4F53\n- \u884C\u4E1A\u52A8\u6001 \u2192 \u884C\u4E1A\u5782\u76F4\u5A92\u4F53\u3001\u7814\u62A5\u5E73\u53F0\uFF08\u5982 CB Insights\uFF09\u3001RSS \u805A\u5408\n- \u653F\u7B56\u6CD5\u89C4 \u2192 \u653F\u5E9C\u5B98\u7F51\u3001\u6CD5\u89C4\u6570\u636E\u5E93\u3001\u4E13\u4E1A\u5F8B\u6240\u535A\u5BA2\n- \u793E\u533A\u8BA8\u8BBA \u2192 Reddit\u3001Twitter/X\u3001Discord\u3001\u4E13\u4E1A\u8BBA\u575B\n\n\u4F60\u7684\u5DE5\u4F5C\u662F\u4E3A\u6BCF\u4E2A\u7EF4\u5EA6\u627E\u5230\u8FD9\u7C7B\u4E13\u4E1A\u4FE1\u606F\u6E90\uFF0C\u800C\u4E0D\u662F\u53EA\u4F9D\u8D56\u901A\u7528\u641C\u7D22\u3002\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u4F60\u7684\u8F93\u5165\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u4F60\u4F1A\u6536\u5230\uFF1A\n1. \u7528\u6237\u7684\u76EE\u6807\u63CF\u8FF0\n2. \u5DF2\u62C6\u89E3\u7684\u7EF4\u5EA6\u5217\u8868\uFF08\u6BCF\u4E2A\u7EF4\u5EA6\u5305\u542B title\u3001description\u3001core_questions\uFF09\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u4F60\u7684\u601D\u8003\u8FC7\u7A0B\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u5BF9\u6BCF\u4E2A\u7EF4\u5EA6\uFF0C\u6309\u4EE5\u4E0B\u987A\u5E8F\u601D\u8003\uFF1A\n\nStep 1 \u2014 \u9886\u57DF\u8BC6\u522B\n  \u8FD9\u4E2A\u7EF4\u5EA6\u5C5E\u4E8E\u4EC0\u4E48\u9886\u57DF/\u884C\u4E1A\uFF1F\u6D89\u53CA\u54EA\u4E9B\u4E13\u4E1A\u65B9\u5411\uFF1F\n\nStep 2 \u2014 \u56DE\u5FC6\u5DF2\u77E5\u4FE1\u606F\u6E90\n  \u5728\u4F60\u7684\u77E5\u8BC6\u8303\u56F4\u5185\uFF0C\u8FD9\u4E2A\u9886\u57DF\u6709\u54EA\u4E9B\u516C\u8BA4\u7684\u6743\u5A01\u4FE1\u606F\u6E90\uFF1F\n  \u5305\u62EC\uFF1A\u4E13\u4E1A\u7F51\u7AD9\u3001\u6570\u636E\u5E93\u3001RSS \u6E90\u3001GitHub \u4ED3\u5E93\u3001API\u3001\u884C\u4E1A\u62A5\u544A\u5E73\u53F0\u3001\u793E\u533A\u8BBA\u575B\u7B49\u3002\n\nStep 3 \u2014 \u6784\u9020\u53D1\u73B0\u67E5\u8BE2\n  \u8BBE\u8BA1 1-3 \u6761 web_search \u67E5\u8BE2\u8BED\u53E5\uFF0C\u7528\u4E8E\u53D1\u73B0\u4F60\u53EF\u80FD\u4E0D\u77E5\u9053\u7684\u4FE1\u606F\u6E90\u3002\n  \u67E5\u8BE2\u7B56\u7565\uFF1A\n  - \u67E5\u8BE2 A\uFF1A\u641C\u7D22\u8BE5\u9886\u57DF\u7684\u4FE1\u606F\u805A\u5408/\u8FFD\u8E2A\u5DE5\u5177\uFF08\u5982 \"best tools to track AI agent market\"\uFF09\n  - \u67E5\u8BE2 B\uFF1A\u641C\u7D22\u8BE5\u9886\u57DF\u7684\u6743\u5A01\u62A5\u544A\u6216\u6570\u636E\u6E90\uFF08\u5982 \"AI agent industry report 2025 2026\"\uFF09\n  - \u67E5\u8BE2 C\uFF1A\u641C\u7D22\u8BE5\u9886\u57DF\u7684\u793E\u533A/\u8BBA\u575B/Newsletter\uFF08\u5982 \"AI agent newsletter subscription\"\uFF09\n\nStep 4 \u2014 \u4E3A\u6BCF\u4E2A\u4FE1\u606F\u6E90\u8BBE\u8BA1\u5177\u4F53\u91C7\u96C6\u65B9\u6848\n  \u5BF9\u6BCF\u4E2A\u63A8\u8350\u7684\u4FE1\u606F\u6E90\uFF1A\n  - \u5B83\u7684\u5177\u4F53\u8BBF\u95EE\u65B9\u5F0F\u662F\u4EC0\u4E48\uFF1F\uFF08URL\u3001RSS \u5730\u5740\u3001API \u7AEF\u70B9\u3001GitHub \u4ED3\u5E93\u8DEF\u5F84\uFF09\n  - \u9488\u5BF9\u5F53\u524D\u7EF4\u5EA6\uFF0C\u5E94\u8BE5\u7528\u4EC0\u4E48\u67E5\u8BE2\u8BCD/\u8FC7\u6EE4\u6761\u4EF6\u53BB\u91C7\u96C6\uFF1F\n  - \u5B83\u7684\u5185\u5BB9\u66F4\u65B0\u9891\u7387\u5927\u6982\u662F\u591A\u5FEB\uFF1F\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u4FE1\u606F\u6E90\u7C7B\u578B\u5B9A\u4E49\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u4F60\u53EF\u4EE5\u63A8\u8350\u4EE5\u4E0B\u7C7B\u578B\u7684\u4FE1\u606F\u6E90\uFF1A\n\n| \u7C7B\u578B | type \u503C | \u8BF4\u660E | config \u9700\u8981\u7684\u5B57\u6BB5 |\n|------|---------|------|-------------------|\n| \u4E13\u4E1A\u7F51\u7AD9/\u9875\u9762 | url_monitor | \u5B9A\u671F\u6293\u53D6\u9875\u9762\u5185\u5BB9\u68C0\u6D4B\u53D8\u5316 | url |\n| RSS \u8BA2\u9605 | rss | \u8BA2\u9605 RSS/Atom feed | feed_url |\n| GitHub \u4ED3\u5E93 | github | \u76D1\u63A7\u4ED3\u5E93\u52A8\u6001 | repo, watch\uFF08releases/issues/commits/discussions\uFF09 |\n| \u641C\u7D22\u5F15\u64CE | web_search | \u5B9A\u671F\u7528\u5173\u952E\u8BCD\u641C\u7D22 | query |\n| API \u7AEF\u70B9 | api | \u8C03\u7528\u516C\u5F00 API \u83B7\u53D6\u6570\u636E | endpoint, params |\n\n\u6CE8\u610F\uFF1Aweb_search \u7C7B\u578B\u662F\u6BCF\u4E2A\u7EF4\u5EA6\u7684\u515C\u5E95\u4FE1\u606F\u6E90\uFF0C\u4F60\u4E0D\u9700\u8981\u663E\u5F0F\u63A8\u8350\u5B83\u2014\u2014\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u4E3A\u6BCF\u4E2A\u7EF4\u5EA6\u6DFB\u52A0\u3002\u4F60\u8981\u63A8\u8350\u7684\u662F\u901A\u7528\u641C\u7D22\u4E4B\u5916\u7684\u4E13\u4E1A\u4FE1\u606F\u6E90\u3002\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u8F93\u51FA\u683C\u5F0F\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u4E25\u683C\u8F93\u51FA\u4EE5\u4E0B JSON\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55 JSON \u4EE5\u5916\u7684\u5185\u5BB9\uFF1A\n\n{\n  \"dimension_sources\": [\n    {\n      \"dimension_title\": \"\u7EF4\u5EA6\u540D\u79F0\uFF08\u4E0E\u8F93\u5165\u4FDD\u6301\u4E00\u81F4\uFF09\",\n      \"domain_analysis\": \"\u8BE5\u7EF4\u5EA6\u5C5E\u4E8E\u4EC0\u4E48\u9886\u57DF\uFF0C\u4E00\u53E5\u8BDD\u8BF4\u660E\",\n      \"recommended_sources\": [\n        {\n          \"name\": \"\u4FE1\u606F\u6E90\u540D\u79F0\uFF08\u5982 arXiv\u3001Hacker News\u3001\u67D0\u516C\u53F8\u5B98\u65B9\u535A\u5BA2\uFF09\",\n          \"type\": \"url_monitor | rss | github | api\",\n          \"why\": \"\u4E3A\u4EC0\u4E48\u63A8\u8350\u8FD9\u4E2A\u4FE1\u606F\u6E90\u2014\u2014\u5B83\u5BF9\u8BE5\u7EF4\u5EA6\u7684\u72EC\u7279\u4EF7\u503C\u662F\u4EC0\u4E48\",\n          \"config\": {\n            \"url\": \"\u5177\u4F53 URL \u6216\u8BBF\u95EE\u5730\u5740\",\n            \"feed_url\": \"RSS \u5730\u5740\uFF08\u5982\u679C type=rss\uFF09\",\n            \"repo\": \"owner/repo\uFF08\u5982\u679C type=github\uFF09\",\n            \"watch\": \"releases | issues | commits | discussions\uFF08\u5982\u679C type=github\uFF09\",\n            \"endpoint\": \"API \u7AEF\u70B9\uFF08\u5982\u679C type=api\uFF09\",\n            \"params\": {}\n          },\n          \"suggested_query\": \"\u9488\u5BF9\u5F53\u524D\u7EF4\u5EA6\uFF0C\u5728\u8BE5\u4FE1\u606F\u6E90\u4E0A\u5E94\u8BE5\u641C\u7D22/\u8FC7\u6EE4\u7684\u5173\u952E\u8BCD\u6216\u6761\u4EF6\",\n          \"update_frequency\": \"\u8BE5\u4FE1\u606F\u6E90\u81EA\u8EAB\u7684\u5185\u5BB9\u66F4\u65B0\u9891\u7387\u4F30\u8BA1\uFF08hours/daily/weekly/monthly\uFF09\",\n          \"confidence\": \"high | medium | low\uFF08\u4F60\u5BF9\u8FD9\u4E2A\u4FE1\u606F\u6E90\u786E\u5B9E\u5B58\u5728\u4E14\u53EF\u8BBF\u95EE\u7684\u628A\u63E1\u7A0B\u5EA6\uFF09\"\n        }\n      ],\n      \"discovery_queries\": [\n        {\n          \"query\": \"\u7528\u4E8E web_search \u7684\u67E5\u8BE2\u8BED\u53E5\uFF0C\u76EE\u7684\u662F\u53D1\u73B0\u66F4\u591A\u8BE5\u7EF4\u5EA6\u7684\u4E13\u4E1A\u4FE1\u606F\u6E90\",\n          \"intent\": \"\u8FD9\u6761\u67E5\u8BE2\u60F3\u627E\u5230\u4EC0\u4E48\u7C7B\u578B\u7684\u4FE1\u606F\u6E90\"\n        }\n      ]\n    }\n  ]\n}\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u8D28\u91CF\u68C0\u67E5\u6E05\u5355\uFF08\u8F93\u51FA\u524D\u81EA\u68C0\uFF09\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n\u25A1 \u6BCF\u4E2A\u7EF4\u5EA6\u81F3\u5C11\u63A8\u8350\u4E86 1 \u4E2A\u4E13\u4E1A\u4FE1\u606F\u6E90\uFF08\u4E0D\u542B\u901A\u7528\u641C\u7D22\uFF09\n\u25A1 \u6BCF\u4E2A\u7EF4\u5EA6\u81F3\u5C11\u6709 1 \u6761 discovery_query \u7528\u4E8E\u53D1\u73B0\u4F60\u4E0D\u786E\u5B9A\u7684\u4FE1\u606F\u6E90\n\u25A1 \u63A8\u8350\u7684\u4FE1\u606F\u6E90\u662F\u5177\u4F53\u7684\uFF08\u6709\u660E\u786E\u7684 URL/\u4ED3\u5E93\u540D/RSS \u5730\u5740\uFF09\uFF0C\u4E0D\u662F\u6CDB\u6CDB\u7684\u7C7B\u522B\u63CF\u8FF0\n\u25A1 suggested_query \u662F\u9488\u5BF9\u5F53\u524D\u7EF4\u5EA6\u5B9A\u5236\u7684\uFF0C\u4E0D\u662F\u901A\u7528\u5173\u952E\u8BCD\n\u25A1 confidence \u6807\u6CE8\u8BDA\u5B9E\u2014\u2014\u4E0D\u786E\u5B9A\u7684\u5C31\u6807 low\uFF0C\u4E0D\u8981\u5168\u6807 high\n\u25A1 \u6CA1\u6709\u628A\u901A\u7528\u641C\u7D22\u5F15\u64CE\uFF08Google/Bing\uFF09\u4F5C\u4E3A recommended_sources \u5217\u51FA\uFF08\u90A3\u662F\u7CFB\u7EDF\u81EA\u52A8\u515C\u5E95\u7684\uFF09\n\u25A1 config \u4E2D\u7684\u5B57\u6BB5\u4E0E type \u5339\u914D\uFF08\u4E0D\u8981\u7ED9 rss \u7C7B\u578B\u5199 repo \u5B57\u6BB5\uFF09\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u7528\u6237\u76EE\u6807\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n**\u76EE\u6807**: ".concat(goal.title, "\n\n**\u63CF\u8FF0**: ").concat(goal.description, "\n\n**\u7406\u89E3**: ").concat(goal.goal_understanding || "（待补充）", "\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\u7EF4\u5EA6\u5217\u8868\uFF08\u9700\u8981\u4E3A\u6BCF\u4E2A\u7EF4\u5EA6\u63A8\u8350\u4FE1\u606F\u6E90\uFF09\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n").concat(dimList, "\n\n\u8BF7\u6839\u636E\u4EE5\u4E0A\u4FE1\u606F\uFF0C\u8F93\u51FA\u63A8\u8350\u7684\u4FE1\u606F\u6E90\u914D\u7F6E\uFF08\u4EC5 JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A");
    };
    /**
     * Execute web search using the websearch extension
     */
    SourceDiscoverer.prototype.executeWebSearch = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var DEFAULT_SEARXNG_URL, apiUrl, url, controller_1, timeoutId, response, data, fetchError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";
                        apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        url = new URL(apiUrl);
                        url.searchParams.append("q", query);
                        url.searchParams.append("format", "json");
                        url.searchParams.append("language", "auto");
                        url.searchParams.append("categories", "general");
                        controller_1 = new AbortController();
                        timeoutId = setTimeout(function () { return controller_1.abort(); }, 10000);
                        return [4 /*yield*/, fetch(url.toString(), {
                                signal: controller_1.signal
                            })];
                    case 2:
                        response = _a.sent();
                        clearTimeout(timeoutId);
                        if (!response.ok) {
                            throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _a.sent();
                        return [2 /*return*/, (data.results || []).slice(0, 5).map(function (r) {
                                var _a;
                                return ({
                                    title: r.title,
                                    url: r.url,
                                    snippet: ((_a = r.content) === null || _a === void 0 ? void 0 : _a.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").substring(0, 200)) || ""
                                });
                            })];
                    case 4:
                        fetchError_1 = _a.sent();
                        // Silent failure, return empty results
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract sources from search results (heuristic-based)
     */
    SourceDiscoverer.prototype.extractSourcesFromSearchResults = function (searchResults, dimDiscovery) {
        var _a;
        var sources = [];
        for (var _i = 0, searchResults_1 = searchResults; _i < searchResults_1.length; _i++) {
            var result = searchResults_1[_i];
            var url = result.url;
            // GitHub repository
            if (url.includes("github.com")) {
                var match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                if (match) {
                    sources.push({
                        name: "".concat(match[1], "/").concat(match[2]),
                        type: "github",
                        why: "Found via search: ".concat(result.snippet),
                        config: {
                            repo: "".concat(match[1], "/").concat(match[2]),
                            watch: "releases"
                        },
                        suggested_query: ((_a = dimDiscovery.recommended_sources[0]) === null || _a === void 0 ? void 0 : _a.suggested_query) || dimDiscovery.dimension_title,
                        update_frequency: "weekly",
                        confidence: "medium"
                    });
                }
            }
            // RSS feed
            if (url.includes("/rss") || url.includes("/feed") || url.endsWith(".xml")) {
                sources.push({
                    name: result.title,
                    type: "rss",
                    why: "RSS feed found via search: ".concat(result.snippet),
                    config: {
                        feed_url: url
                    },
                    suggested_query: dimDiscovery.dimension_title,
                    update_frequency: "daily",
                    confidence: "medium"
                });
            }
            // API documentation or endpoint
            if (url.includes("api.") || url.includes("/docs/api") || result.title.toLowerCase().includes("api")) {
                sources.push({
                    name: result.title,
                    type: "api",
                    why: "API found via search: ".concat(result.snippet),
                    config: {
                        endpoint: url,
                        params: {}
                    },
                    suggested_query: dimDiscovery.dimension_title,
                    update_frequency: "monthly",
                    confidence: "low"
                });
            }
        }
        return sources;
    };
    /**
     * Check accessibility of a source (HEAD request or probe)
     */
    SourceDiscoverer.prototype.checkAccessibility = function (source) {
        return __awaiter(this, void 0, void 0, function () {
            var url, controller_2, timeoutId, response, fetchError_2, controller2_1, timeoutId2, response, _a, error_3, errorMsg;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 9, , 10]);
                        url = source.config.url ||
                            source.config.feed_url ||
                            (source.config.repo ? "https://github.com/".concat(source.config.repo) : null) ||
                            source.config.endpoint;
                        if (!url) {
                            (_b = this.onProgress) === null || _b === void 0 ? void 0 : _b.call(this, "   \u26A0\uFE0F  \u65E0 URL\uFF0C\u8DF3\u8FC7", "warning");
                            return [2 /*return*/, false];
                        }
                        controller_2 = new AbortController();
                        timeoutId = setTimeout(function () { return controller_2.abort(); }, 5000);
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 8]);
                        return [4 /*yield*/, fetch(url, {
                                method: "HEAD",
                                signal: controller_2.signal
                            })];
                    case 2:
                        response = _e.sent();
                        clearTimeout(timeoutId);
                        return [2 /*return*/, response.ok];
                    case 3:
                        fetchError_2 = _e.sent();
                        clearTimeout(timeoutId);
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 6, , 7]);
                        controller2_1 = new AbortController();
                        timeoutId2 = setTimeout(function () { return controller2_1.abort(); }, 5000);
                        return [4 /*yield*/, fetch(url, {
                                method: "GET",
                                signal: controller2_1.signal
                            })];
                    case 5:
                        response = _e.sent();
                        clearTimeout(timeoutId2);
                        return [2 /*return*/, response.ok];
                    case 6:
                        _a = _e.sent();
                        return [2 /*return*/, false];
                    case 7: return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_3 = _e.sent();
                        errorMsg = error_3 instanceof Error ? error_3.message : String(error_3);
                        // Don't log to console, use progress callback
                        if (errorMsg.includes("timeout") || errorMsg.includes("abort")) {
                            (_c = this.onProgress) === null || _c === void 0 ? void 0 : _c.call(this, "   \u23F1\uFE0F  \u8D85\u65F6 (".concat(source.name, ")"), "warning");
                        }
                        else {
                            (_d = this.onProgress) === null || _d === void 0 ? void 0 : _d.call(this, "   \u274C \u9519\u8BEF: ".concat(errorMsg.substring(0, 40), "..."), "warning");
                        }
                        return [2 /*return*/, false];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create DataSource object from DiscoveredSource
     */
    SourceDiscoverer.prototype.createDataSourceObject = function (source, dimDiscovery) {
        return {
            id: (0, utils_js_1.generateId)(),
            type: source.type,
            name: source.name,
            config: source.config,
            reachable: true, // Will be verified later
            lastCheckedAt: null,
            confidence: source.confidence,
            updateFrequency: source.update_frequency,
            domainAnalysis: dimDiscovery.domain_analysis
        };
    };
    /**
     * Create fallback discovery with discovery_queries
     */
    SourceDiscoverer.prototype.createFallbackDiscovery = function (dimensions) {
        return {
            dimension_sources: dimensions.map(function (dim) { return ({
                dimension_title: dim.title,
                domain_analysis: "General domain",
                recommended_sources: [],
                discovery_queries: [
                    {
                        query: "best sources for ".concat(dim.title, " ").concat(new Date().getFullYear()),
                        intent: "Find current information sources"
                    },
                    {
                        query: "".concat(dim.title, " tools resources tracking"),
                        intent: "Find tools and resources for tracking"
                    }
                ]
            }); })
        };
    };
    /**
     * Convert dimension's refresh_interval to milliseconds
     */
    SourceDiscoverer.prototype.convertRefreshIntervalToMs = function (interval) {
        var _a;
        var intervals = {
            hours: 1 * 60 * 60 * 1000,
            daily: 24 * 60 * 60 * 1000,
            weekly: 7 * 24 * 60 * 60 * 1000,
            monthly: 30 * 24 * 60 * 60 * 1000,
        };
        return (_a = intervals[interval]) !== null && _a !== void 0 ? _a : intervals.daily;
    };
    /**
     * Discover sources for a single dynamically-added dimension
     */
    SourceDiscoverer.prototype.discoverAndBindSingle = function (goal, dim) {
        return __awaiter(this, void 0, void 0, function () {
            var fallbackBinding;
            return __generator(this, function (_a) {
                fallbackBinding = {
                    sourceId: "search-fallback",
                    query: "".concat(goal.title, ": ").concat(dim.title),
                    suggestedQuery: "Search for ".concat(dim.core_questions[0] || dim.title),
                    lastFetchedAt: null,
                    fetchInterval: this.convertRefreshIntervalToMs(dim.refresh_interval),
                    accessible: true,
                    confidence: "high",
                };
                dim.dataSources.push(fallbackBinding);
                return [2 /*return*/];
            });
        });
    };
    return SourceDiscoverer;
}());
exports.SourceDiscoverer = SourceDiscoverer;
