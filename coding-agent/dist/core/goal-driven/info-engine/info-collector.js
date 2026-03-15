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
exports.InfoCollector = void 0;
var web_search_adapter_js_1 = require("./source-adapters/web-search-adapter.js");
/**
 * InfoCollector
 *
 * Fetches information from data sources using appropriate adapters.
 */
var InfoCollector = /** @class */ (function () {
    function InfoCollector(piApi) {
        this.searchAdapter = new web_search_adapter_js_1.WebSearchAdapter(piApi);
    }
    /**
     * Collect information for a dimension from its data sources
     */
    InfoCollector.prototype.collect = function (goalId, dimension, sources) {
        return __awaiter(this, void 0, void 0, function () {
            var allItems, _loop_1, this_1, _i, _a, binding;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        allItems = [];
                        _loop_1 = function (binding) {
                            var source, timeSinceLastFetch, items, error_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        source = sources.find(function (s) { return s.id === binding.sourceId; });
                                        if (!source)
                                            return [2 /*return*/, "continue"];
                                        timeSinceLastFetch = binding.lastFetchedAt ? Date.now() - binding.lastFetchedAt : Infinity;
                                        if (timeSinceLastFetch < binding.fetchInterval) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 4, , 5]);
                                        if (!(source.type === "web_search")) return [3 /*break*/, 3];
                                        return [4 /*yield*/, this_1.searchAdapter.fetch(source, dimension.id, goalId)];
                                    case 2:
                                        items = _c.sent();
                                        allItems.push.apply(allItems, items);
                                        _c.label = 3;
                                    case 3:
                                        // TODO: Other source adapters (API, GitHub, RSS)
                                        binding.lastFetchedAt = Date.now();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_1 = _c.sent();
                                        console.error("Error collecting from source ".concat(source.id, ":"), error_1);
                                        binding.accessible = false;
                                        binding.accessCheckResult = String(error_1);
                                        return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, _a = dimension.dataSources;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        binding = _a[_i];
                        return [5 /*yield**/, _loop_1(binding)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, allItems];
                }
            });
        });
    };
    return InfoCollector;
}());
exports.InfoCollector = InfoCollector;
