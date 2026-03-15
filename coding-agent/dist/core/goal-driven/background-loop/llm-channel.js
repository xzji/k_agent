"use strict";
/**
 * BackgroundLLMChannel — Independent LLM call channel for background loop
 *
 * Key design:
 * - Uses direct fetch to OpenAI-compatible API endpoints
 * - Gets model config and API key from ModelRegistry
 * - Completely independent from AgentSession's LLM calls
 * - Supports abort for loop cancellation
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
exports.BackgroundLLMChannel = void 0;
var utils_js_1 = require("../utils.js");
var BackgroundLLMChannel = /** @class */ (function () {
    function BackgroundLLMChannel(modelRegistry) {
        this.currentModel = null;
        this.abortController = null;
        this.modelRegistry = modelRegistry;
    }
    /**
     * Sync the model to use (called on model change)
     */
    BackgroundLLMChannel.prototype.syncModel = function (model) {
        this.currentModel = model;
    };
    /**
     * Get current model
     */
    BackgroundLLMChannel.prototype.getModel = function () {
        return this.currentModel;
    };
    /**
     * Send a chat request to the LLM
     * Uses direct fetch to OpenAI-compatible endpoints
     */
    BackgroundLLMChannel.prototype.chat = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var model, apiKey, messages, baseUrl, url, body, headers, response, errorText, data, content;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.currentModel) {
                            throw new Error("BackgroundLLMChannel: no model configured");
                        }
                        model = this.currentModel;
                        return [4 /*yield*/, this.modelRegistry.getApiKey(model)];
                    case 1:
                        apiKey = _d.sent();
                        if (!apiKey) {
                            throw new Error("BackgroundLLMChannel: no API key for provider ".concat(model.provider));
                        }
                        this.abortController = new AbortController();
                        messages = __spreadArray([
                            { role: "system", content: params.systemPrompt }
                        ], params.messages.map(function (m) { return ({ role: m.role, content: m.content }); }), true);
                        baseUrl = model.baseUrl || this.getDefaultBaseUrl(model.provider);
                        url = "".concat(baseUrl.replace(/\/$/, ""), "/chat/completions");
                        body = {
                            model: model.id,
                            messages: messages,
                            temperature: (_a = params.temperature) !== null && _a !== void 0 ? _a : 0.7,
                            max_tokens: (_b = params.maxTokens) !== null && _b !== void 0 ? _b : 4096,
                            stream: false,
                        };
                        headers = __assign({ "Content-Type": "application/json", Authorization: "Bearer ".concat(apiKey) }, ((_c = model.headers) !== null && _c !== void 0 ? _c : {}));
                        return [4 /*yield*/, fetch(url, {
                                method: "POST",
                                headers: headers,
                                body: JSON.stringify(body),
                                signal: this.abortController.signal,
                            })];
                    case 2:
                        response = _d.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.text().catch(function () { return "unknown error"; })];
                    case 3:
                        errorText = _d.sent();
                        throw new Error("LLM request failed (".concat(response.status, "): ").concat(errorText));
                    case 4: return [4 /*yield*/, response.json()];
                    case 5:
                        data = (_d.sent());
                        if (!data.choices || data.choices.length === 0) {
                            throw new Error("LLM returned no choices");
                        }
                        content = data.choices[0].message.content;
                        // Validate content is not empty
                        if (!content || content.trim().length === 0) {
                            throw new Error("LLM returned empty content");
                        }
                        return [2 /*return*/, {
                                content: content,
                                finishReason: data.choices[0].finish_reason,
                            }];
                }
            });
        });
    };
    /**
     * Chat with structured JSON output
     * Instructs the LLM to return valid JSON
     */
    BackgroundLLMChannel.prototype.chatJSON = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.chat(__assign(__assign({}, params), { systemPrompt: params.systemPrompt +
                                "\n\nYou MUST respond with valid JSON only. Do not include any text, explanation, or markdown formatting outside the JSON object. Return ONLY the JSON.", maxTokens: (_a = params.maxTokens) !== null && _a !== void 0 ? _a : 8192 }))];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, (0, utils_js_1.parseJSONResponse)(response.content)];
                }
            });
        });
    };
    /**
     * Abort the current request
     */
    BackgroundLLMChannel.prototype.abort = function () {
        var _a;
        (_a = this.abortController) === null || _a === void 0 ? void 0 : _a.abort();
        this.abortController = null;
    };
    /**
     * Get default base URL for known providers
     */
    BackgroundLLMChannel.prototype.getDefaultBaseUrl = function (provider) {
        var _a;
        var defaults = {
            anthropic: "https://api.anthropic.com/v1",
            openai: "https://api.openai.com/v1",
            google: "https://generativelanguage.googleapis.com/v1beta/openai",
            groq: "https://api.groq.com/openai/v1",
            deepseek: "https://api.deepseek.com/v1",
            mistral: "https://api.mistral.ai/v1",
            xai: "https://api.x.ai/v1",
        };
        return (_a = defaults[provider]) !== null && _a !== void 0 ? _a : "https://api.openai.com/v1";
    };
    return BackgroundLLMChannel;
}());
exports.BackgroundLLMChannel = BackgroundLLMChannel;
