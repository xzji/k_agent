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
exports.WebSearchAdapter = void 0;
var utils_js_1 = require("../../utils.js");
// Default SearXNG instance
var DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";
// Get search engine preference from env
var SEARCH_ENGINE = process.env.SEARCH_ENGINE || "auto"; // auto, searxng, tavily
/**
 * Web Search Adapter
 *
 * Performs real web searches using SearXNG (default, no API key) or Tavily (requires API key)
 */
var WebSearchAdapter = /** @class */ (function () {
    function WebSearchAdapter(piApi) {
        this.piApi = piApi;
    }
    /**
     * Search the web using the provided query
     */
    WebSearchAdapter.prototype.fetch = function (source, dimensionId, goalId) {
        return __awaiter(this, void 0, void 0, function () {
            var rawQuery, query, results, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rawQuery = source.config.query;
                        if (!rawQuery)
                            return [2 /*return*/, []];
                        query = this.optimizeQuery(rawQuery);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.searchWeb(query, 5)];
                    case 2:
                        results = _a.sent();
                        if (results.length === 0) {
                            console.warn("[WebSearchAdapter] No results found for query: ".concat(rawQuery, " (optimized: ").concat(query, ")"));
                            return [2 /*return*/, this.getMockData(rawQuery, source.id, dimensionId, goalId)];
                        }
                        // Convert SearchResult to InfoItem
                        return [2 /*return*/, results.map(function (result) {
                                var _a;
                                return ({
                                    id: (0, utils_js_1.generateId)(),
                                    sourceId: source.id,
                                    dimensionId: dimensionId,
                                    goalId: goalId,
                                    content: "".concat(result.title, "\n").concat(result.snippet),
                                    url: result.url,
                                    fetchedAt: Date.now(),
                                    relevanceScore: (_a = result.score) !== null && _a !== void 0 ? _a : null,
                                    relevanceLevel: null,
                                    metadata: {
                                        source: "web_search",
                                        engine: result.score !== undefined ? "tavily" : "searxng",
                                        originalQuery: rawQuery,
                                        optimizedQuery: query
                                    }
                                });
                            })];
                    case 3:
                        error_1 = _a.sent();
                        console.error("[WebSearchAdapter] Search failed for query \"".concat(rawQuery, "\":"), error_1);
                        // Return mock data on error
                        return [2 /*return*/, this.getMockData(rawQuery, source.id, dimensionId, goalId)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Optimize query for better search results
     * Removes problematic patterns and extracts key search terms
     */
    WebSearchAdapter.prototype.optimizeQuery = function (query) {
        var optimized = query.trim();
        // Remove common filler words FIRST (before processing colons)
        var fillers = ['今年发展趋势', '近期', '最新', '当前', '相关', '关于', '分析', '研究', '发展趋势'];
        for (var _i = 0, fillers_1 = fillers; _i < fillers_1.length; _i++) {
            var filler = fillers_1[_i];
            optimized = optimized.replace(new RegExp(filler, 'g'), '');
        }
        // Remove colon-separated structure (e.g., "主题: 子主题" -> "主题 子主题")
        optimized = optimized.replace(/：/g, ' '); // Chinese colon
        optimized = optimized.replace(/:/g, ' '); // English colon
        // Remove common prefixes
        optimized = optimized.replace(/^(搜索|Search for|查找|Find)\s+/i, '');
        // Remove redundant spaces
        optimized = optimized.replace(/\s+/g, ' ').trim();
        // Extract key terms for long queries (> 30 chars for better results)
        if (optimized.length > 30) {
            // Split by common separators and take most relevant parts
            // Prefer keeping the first part (usually the main topic)
            var parts = optimized.split(/[,，、\s]+/).filter(function (p) { return p.length > 1; });
            if (parts.length > 0) {
                // Keep first 2-3 most relevant terms
                optimized = parts.slice(0, Math.min(3, parts.length)).join(' ');
            }
        }
        return optimized;
    };
    /**
     * Search the web using SearXNG or Tavily
     * (Ported from websearch extension)
     */
    WebSearchAdapter.prototype.searchWeb = function (query, maxResults) {
        return __awaiter(this, void 0, void 0, function () {
            var enginesToTry, tavilyKey, lastError, _i, enginesToTry_1, eng, results, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        enginesToTry = [];
                        if (SEARCH_ENGINE === "auto") {
                            tavilyKey = process.env.TAVILY_API_KEY;
                            enginesToTry.push("searxng"); // Default, always try first
                            if (tavilyKey && tavilyKey !== "your_api_key") {
                                enginesToTry.push("tavily");
                            }
                        }
                        else {
                            enginesToTry.push(SEARCH_ENGINE);
                        }
                        lastError = null;
                        _i = 0, enginesToTry_1 = enginesToTry;
                        _a.label = 1;
                    case 1:
                        if (!(_i < enginesToTry_1.length)) return [3 /*break*/, 9];
                        eng = enginesToTry_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        results = [];
                        if (!(eng === "searxng")) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.searchSearXNG(query, maxResults)];
                    case 3:
                        results = _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        if (!(eng === "tavily")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.searchTavily(query, maxResults)];
                    case 5:
                        results = _a.sent();
                        _a.label = 6;
                    case 6:
                        if (results.length > 0) {
                            return [2 /*return*/, results];
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        lastError = error_2;
                        console.error("".concat(eng, " search failed:"), error_2);
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 1];
                    case 9: 
                    // Return empty array instead of throwing - no results is valid
                    return [2 /*return*/, []];
                }
            });
        });
    };
    /**
     * Search using SearXNG (free, no API key required)
     */
    WebSearchAdapter.prototype.searchSearXNG = function (query, maxResults) {
        return __awaiter(this, void 0, void 0, function () {
            var apiUrl, url, response, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;
                        url = new URL(apiUrl);
                        url.searchParams.append("q", query);
                        url.searchParams.append("format", "json");
                        url.searchParams.append("language", "auto");
                        url.searchParams.append("categories", "general");
                        url.searchParams.append("safesearch", "0");
                        return [4 /*yield*/, fetch(url.toString())];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("SearXNG API failed: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        if (!data.results || data.results.length === 0) {
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data.results.slice(0, maxResults).map(function (result) { return ({
                                title: result.title,
                                url: result.url,
                                snippet: result.content.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"),
                            }); })];
                }
            });
        });
    };
    /**
     * Search using Tavily (requires API key)
     */
    WebSearchAdapter.prototype.searchTavily = function (query, maxResults) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, url, payload, response, errorData, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        apiKey = process.env.TAVILY_API_KEY;
                        if (!apiKey || apiKey === "your_api_key") {
                            throw new Error("TAVILY_API_KEY not set. Get it from https://tavily.com/");
                        }
                        url = "https://api.tavily.com/search";
                        payload = {
                            api_key: apiKey,
                            query: query,
                            max_results: maxResults,
                            search_depth: "basic",
                            include_answer: true,
                            include_raw_content: false,
                        };
                        return [4 /*yield*/, fetch(url, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(payload),
                            })];
                    case 1:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                    case 2:
                        errorData = _a.sent();
                        throw new Error("Tavily API failed (".concat(response.status, "): ").concat(errorData.error || response.statusText));
                    case 3: return [4 /*yield*/, response.json()];
                    case 4:
                        data = _a.sent();
                        if (!data.results || data.results.length === 0) {
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data.results.slice(0, maxResults).map(function (result) { return ({
                                title: result.title,
                                url: result.url,
                                snippet: result.content,
                                score: result.score,
                            }); })];
                }
            });
        });
    };
    /**
     * Generate mock data for testing/fallback
     */
    WebSearchAdapter.prototype.getMockData = function (query, sourceId, dimensionId, goalId) {
        return [
            {
                id: (0, utils_js_1.generateId)(),
                sourceId: sourceId,
                dimensionId: dimensionId,
                goalId: goalId,
                content: "[\u6A21\u62DF\u6570\u636E] \u7F51\u9875\u641C\u7D22\u7ED3\u679C: \"".concat(query, "\" - \u8FD9\u662F\u4E00\u4E2A\u5360\u4F4D\u7B26\u3002\u771F\u5B9E\u641C\u7D22\u4F7F\u7528SearXNG\uFF08\u9ED8\u8BA4\uFF0C\u65E0\u9700\u914D\u7F6E\uFF09\u6216Tavily\uFF08\u9700\u8981API\u5BC6\u94A5\uFF09\u3002"),
                url: "https://duckduckgo.com/?q=".concat(encodeURIComponent(query)),
                fetchedAt: Date.now(),
                relevanceScore: null,
                relevanceLevel: null,
                metadata: { source: "web_search", engine: "mock" }
            }
        ];
    };
    return WebSearchAdapter;
}());
exports.WebSearchAdapter = WebSearchAdapter;
