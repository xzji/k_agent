"use strict";
/**
 * Model registry - manages built-in and custom models, provides API key resolution.
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
exports.ModelRegistry = exports.clearApiKeyCache = void 0;
var pi_ai_1 = require("@mariozechner/pi-ai");
var oauth_1 = require("@mariozechner/pi-ai/oauth");
var typebox_1 = require("@sinclair/typebox");
var ajv_1 = require("ajv");
var fs_1 = require("fs");
var path_1 = require("path");
var config_js_1 = require("../config.js");
var resolve_config_value_js_1 = require("./resolve-config-value.js");
var Ajv = ajv_1.default.default || ajv_1.default;
var ajv = new Ajv();
// Schema for OpenRouter routing preferences
var OpenRouterRoutingSchema = typebox_1.Type.Object({
    only: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
    order: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
});
// Schema for Vercel AI Gateway routing preferences
var VercelGatewayRoutingSchema = typebox_1.Type.Object({
    only: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
    order: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String())),
});
// Schema for OpenAI compatibility settings
var ReasoningEffortMapSchema = typebox_1.Type.Object({
    minimal: typebox_1.Type.Optional(typebox_1.Type.String()),
    low: typebox_1.Type.Optional(typebox_1.Type.String()),
    medium: typebox_1.Type.Optional(typebox_1.Type.String()),
    high: typebox_1.Type.Optional(typebox_1.Type.String()),
    xhigh: typebox_1.Type.Optional(typebox_1.Type.String()),
});
var OpenAICompletionsCompatSchema = typebox_1.Type.Object({
    supportsStore: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    supportsDeveloperRole: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    supportsReasoningEffort: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    reasoningEffortMap: typebox_1.Type.Optional(ReasoningEffortMapSchema),
    supportsUsageInStreaming: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    maxTokensField: typebox_1.Type.Optional(typebox_1.Type.Union([typebox_1.Type.Literal("max_completion_tokens"), typebox_1.Type.Literal("max_tokens")])),
    requiresToolResultName: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    requiresAssistantAfterToolResult: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    requiresThinkingAsText: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    thinkingFormat: typebox_1.Type.Optional(typebox_1.Type.Union([
        typebox_1.Type.Literal("openai"),
        typebox_1.Type.Literal("zai"),
        typebox_1.Type.Literal("qwen"),
        typebox_1.Type.Literal("qwen-chat-template"),
    ])),
    openRouterRouting: typebox_1.Type.Optional(OpenRouterRoutingSchema),
    vercelGatewayRouting: typebox_1.Type.Optional(VercelGatewayRoutingSchema),
    supportsStrictMode: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
});
var OpenAIResponsesCompatSchema = typebox_1.Type.Object({
// Reserved for future use
});
var OpenAICompatSchema = typebox_1.Type.Union([OpenAICompletionsCompatSchema, OpenAIResponsesCompatSchema]);
// Schema for custom model definition
// Most fields are optional with sensible defaults for local models (Ollama, LM Studio, etc.)
var ModelDefinitionSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String({ minLength: 1 }),
    name: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    api: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    baseUrl: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    reasoning: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    input: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.Union([typebox_1.Type.Literal("text"), typebox_1.Type.Literal("image")]))),
    cost: typebox_1.Type.Optional(typebox_1.Type.Object({
        input: typebox_1.Type.Number(),
        output: typebox_1.Type.Number(),
        cacheRead: typebox_1.Type.Number(),
        cacheWrite: typebox_1.Type.Number(),
    })),
    contextWindow: typebox_1.Type.Optional(typebox_1.Type.Number()),
    maxTokens: typebox_1.Type.Optional(typebox_1.Type.Number()),
    headers: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.String())),
    compat: typebox_1.Type.Optional(OpenAICompatSchema),
});
// Schema for per-model overrides (all fields optional, merged with built-in model)
var ModelOverrideSchema = typebox_1.Type.Object({
    name: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    reasoning: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    input: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.Union([typebox_1.Type.Literal("text"), typebox_1.Type.Literal("image")]))),
    cost: typebox_1.Type.Optional(typebox_1.Type.Object({
        input: typebox_1.Type.Optional(typebox_1.Type.Number()),
        output: typebox_1.Type.Optional(typebox_1.Type.Number()),
        cacheRead: typebox_1.Type.Optional(typebox_1.Type.Number()),
        cacheWrite: typebox_1.Type.Optional(typebox_1.Type.Number()),
    })),
    contextWindow: typebox_1.Type.Optional(typebox_1.Type.Number()),
    maxTokens: typebox_1.Type.Optional(typebox_1.Type.Number()),
    headers: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.String())),
    compat: typebox_1.Type.Optional(OpenAICompatSchema),
});
var ProviderConfigSchema = typebox_1.Type.Object({
    baseUrl: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    apiKey: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    api: typebox_1.Type.Optional(typebox_1.Type.String({ minLength: 1 })),
    headers: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.String())),
    compat: typebox_1.Type.Optional(OpenAICompatSchema),
    authHeader: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    models: typebox_1.Type.Optional(typebox_1.Type.Array(ModelDefinitionSchema)),
    modelOverrides: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), ModelOverrideSchema)),
});
var ModelsConfigSchema = typebox_1.Type.Object({
    providers: typebox_1.Type.Record(typebox_1.Type.String(), ProviderConfigSchema),
});
ajv.addSchema(ModelsConfigSchema, "ModelsConfig");
function emptyCustomModelsResult(error) {
    return { models: [], overrides: new Map(), modelOverrides: new Map(), error: error };
}
function mergeCompat(baseCompat, overrideCompat) {
    if (!overrideCompat)
        return baseCompat;
    var base = baseCompat;
    var override = overrideCompat;
    var merged = __assign(__assign({}, base), override);
    var baseCompletions = base;
    var overrideCompletions = override;
    var mergedCompletions = merged;
    if ((baseCompletions === null || baseCompletions === void 0 ? void 0 : baseCompletions.openRouterRouting) || overrideCompletions.openRouterRouting) {
        mergedCompletions.openRouterRouting = __assign(__assign({}, baseCompletions === null || baseCompletions === void 0 ? void 0 : baseCompletions.openRouterRouting), overrideCompletions.openRouterRouting);
    }
    if ((baseCompletions === null || baseCompletions === void 0 ? void 0 : baseCompletions.vercelGatewayRouting) || overrideCompletions.vercelGatewayRouting) {
        mergedCompletions.vercelGatewayRouting = __assign(__assign({}, baseCompletions === null || baseCompletions === void 0 ? void 0 : baseCompletions.vercelGatewayRouting), overrideCompletions.vercelGatewayRouting);
    }
    return merged;
}
/**
 * Deep merge a model override into a model.
 * Handles nested objects (cost, compat) by merging rather than replacing.
 */
function applyModelOverride(model, override) {
    var _a, _b, _c, _d;
    var result = __assign({}, model);
    // Simple field overrides
    if (override.name !== undefined)
        result.name = override.name;
    if (override.reasoning !== undefined)
        result.reasoning = override.reasoning;
    if (override.input !== undefined)
        result.input = override.input;
    if (override.contextWindow !== undefined)
        result.contextWindow = override.contextWindow;
    if (override.maxTokens !== undefined)
        result.maxTokens = override.maxTokens;
    // Merge cost (partial override)
    if (override.cost) {
        result.cost = {
            input: (_a = override.cost.input) !== null && _a !== void 0 ? _a : model.cost.input,
            output: (_b = override.cost.output) !== null && _b !== void 0 ? _b : model.cost.output,
            cacheRead: (_c = override.cost.cacheRead) !== null && _c !== void 0 ? _c : model.cost.cacheRead,
            cacheWrite: (_d = override.cost.cacheWrite) !== null && _d !== void 0 ? _d : model.cost.cacheWrite,
        };
    }
    // Merge headers
    if (override.headers) {
        var resolvedHeaders = (0, resolve_config_value_js_1.resolveHeaders)(override.headers);
        result.headers = resolvedHeaders ? __assign(__assign({}, model.headers), resolvedHeaders) : model.headers;
    }
    // Deep merge compat
    result.compat = mergeCompat(model.compat, override.compat);
    return result;
}
/** Clear the config value command cache. Exported for testing. */
exports.clearApiKeyCache = resolve_config_value_js_1.clearConfigValueCache;
/**
 * Model registry - loads and manages models, resolves API keys via AuthStorage.
 */
var ModelRegistry = /** @class */ (function () {
    function ModelRegistry(authStorage, modelsJsonPath) {
        if (modelsJsonPath === void 0) { modelsJsonPath = (0, path_1.join)((0, config_js_1.getAgentDir)(), "models.json"); }
        var _this = this;
        this.authStorage = authStorage;
        this.modelsJsonPath = modelsJsonPath;
        this.models = [];
        this.customProviderApiKeys = new Map();
        this.registeredProviders = new Map();
        this.loadError = undefined;
        // Set up fallback resolver for custom provider API keys
        this.authStorage.setFallbackResolver(function (provider) {
            var keyConfig = _this.customProviderApiKeys.get(provider);
            if (keyConfig) {
                return (0, resolve_config_value_js_1.resolveConfigValue)(keyConfig);
            }
            return undefined;
        });
        // Load models
        this.loadModels();
    }
    /**
     * Reload models from disk (built-in + custom from models.json).
     */
    ModelRegistry.prototype.refresh = function () {
        this.customProviderApiKeys.clear();
        this.loadError = undefined;
        // Ensure dynamic API/OAuth registrations are rebuilt from current provider state.
        (0, pi_ai_1.resetApiProviders)();
        (0, oauth_1.resetOAuthProviders)();
        this.loadModels();
        for (var _i = 0, _a = this.registeredProviders.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], providerName = _b[0], config = _b[1];
            this.applyProviderConfig(providerName, config);
        }
    };
    /**
     * Get any error from loading models.json (undefined if no error).
     */
    ModelRegistry.prototype.getError = function () {
        return this.loadError;
    };
    ModelRegistry.prototype.loadModels = function () {
        // Load custom models and overrides from models.json
        var _a = this.modelsJsonPath ? this.loadCustomModels(this.modelsJsonPath) : emptyCustomModelsResult(), customModels = _a.models, overrides = _a.overrides, modelOverrides = _a.modelOverrides, error = _a.error;
        if (error) {
            this.loadError = error;
            // Keep built-in models even if custom models failed to load
        }
        var builtInModels = this.loadBuiltInModels(overrides, modelOverrides);
        var combined = this.mergeCustomModels(builtInModels, customModels);
        // Let OAuth providers modify their models (e.g., update baseUrl)
        for (var _i = 0, _b = this.authStorage.getOAuthProviders(); _i < _b.length; _i++) {
            var oauthProvider = _b[_i];
            var cred = this.authStorage.get(oauthProvider.id);
            if ((cred === null || cred === void 0 ? void 0 : cred.type) === "oauth" && oauthProvider.modifyModels) {
                combined = oauthProvider.modifyModels(combined, cred);
            }
        }
        this.models = combined;
    };
    /** Load built-in models and apply provider/model overrides */
    ModelRegistry.prototype.loadBuiltInModels = function (overrides, modelOverrides) {
        return (0, pi_ai_1.getProviders)().flatMap(function (provider) {
            var models = (0, pi_ai_1.getModels)(provider);
            var providerOverride = overrides.get(provider);
            var perModelOverrides = modelOverrides.get(provider);
            return models.map(function (m) {
                var _a;
                var model = m;
                // Apply provider-level baseUrl/headers/compat override
                if (providerOverride) {
                    var resolvedHeaders = (0, resolve_config_value_js_1.resolveHeaders)(providerOverride.headers);
                    model = __assign(__assign({}, model), { baseUrl: (_a = providerOverride.baseUrl) !== null && _a !== void 0 ? _a : model.baseUrl, headers: resolvedHeaders ? __assign(__assign({}, model.headers), resolvedHeaders) : model.headers, compat: mergeCompat(model.compat, providerOverride.compat) });
                }
                // Apply per-model override
                var modelOverride = perModelOverrides === null || perModelOverrides === void 0 ? void 0 : perModelOverrides.get(m.id);
                if (modelOverride) {
                    model = applyModelOverride(model, modelOverride);
                }
                return model;
            });
        });
    };
    /** Merge custom models into built-in list by provider+id (custom wins on conflicts). */
    ModelRegistry.prototype.mergeCustomModels = function (builtInModels, customModels) {
        var merged = __spreadArray([], builtInModels, true);
        var _loop_1 = function (customModel) {
            var existingIndex = merged.findIndex(function (m) { return m.provider === customModel.provider && m.id === customModel.id; });
            if (existingIndex >= 0) {
                merged[existingIndex] = customModel;
            }
            else {
                merged.push(customModel);
            }
        };
        for (var _i = 0, customModels_1 = customModels; _i < customModels_1.length; _i++) {
            var customModel = customModels_1[_i];
            _loop_1(customModel);
        }
        return merged;
    };
    ModelRegistry.prototype.loadCustomModels = function (modelsJsonPath) {
        var _a;
        if (!(0, fs_1.existsSync)(modelsJsonPath)) {
            return emptyCustomModelsResult();
        }
        try {
            var content = (0, fs_1.readFileSync)(modelsJsonPath, "utf-8");
            var config = JSON.parse(content);
            // Validate schema
            var validate = ajv.getSchema("ModelsConfig");
            if (!validate(config)) {
                var errors = ((_a = validate.errors) === null || _a === void 0 ? void 0 : _a.map(function (e) { return "  - ".concat(e.instancePath || "root", ": ").concat(e.message); }).join("\n")) ||
                    "Unknown schema error";
                return emptyCustomModelsResult("Invalid models.json schema:\n".concat(errors, "\n\nFile: ").concat(modelsJsonPath));
            }
            // Additional validation
            this.validateConfig(config);
            var overrides = new Map();
            var modelOverrides = new Map();
            for (var _i = 0, _b = Object.entries(config.providers); _i < _b.length; _i++) {
                var _c = _b[_i], providerName = _c[0], providerConfig = _c[1];
                // Apply provider-level baseUrl/headers/apiKey/compat override to built-in models when configured.
                if (providerConfig.baseUrl || providerConfig.headers || providerConfig.apiKey || providerConfig.compat) {
                    overrides.set(providerName, {
                        baseUrl: providerConfig.baseUrl,
                        headers: providerConfig.headers,
                        apiKey: providerConfig.apiKey,
                        compat: providerConfig.compat,
                    });
                }
                // Store API key for fallback resolver.
                if (providerConfig.apiKey) {
                    this.customProviderApiKeys.set(providerName, providerConfig.apiKey);
                }
                if (providerConfig.modelOverrides) {
                    modelOverrides.set(providerName, new Map(Object.entries(providerConfig.modelOverrides)));
                }
            }
            return { models: this.parseModels(config), overrides: overrides, modelOverrides: modelOverrides, error: undefined };
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                return emptyCustomModelsResult("Failed to parse models.json: ".concat(error.message, "\n\nFile: ").concat(modelsJsonPath));
            }
            return emptyCustomModelsResult("Failed to load models.json: ".concat(error instanceof Error ? error.message : error, "\n\nFile: ").concat(modelsJsonPath));
        }
    };
    ModelRegistry.prototype.validateConfig = function (config) {
        var _a;
        for (var _i = 0, _b = Object.entries(config.providers); _i < _b.length; _i++) {
            var _c = _b[_i], providerName = _c[0], providerConfig = _c[1];
            var hasProviderApi = !!providerConfig.api;
            var models = (_a = providerConfig.models) !== null && _a !== void 0 ? _a : [];
            var hasModelOverrides = providerConfig.modelOverrides && Object.keys(providerConfig.modelOverrides).length > 0;
            if (models.length === 0) {
                // Override-only config: needs baseUrl, compat, modelOverrides, or some combination.
                if (!providerConfig.baseUrl && !providerConfig.compat && !hasModelOverrides) {
                    throw new Error("Provider ".concat(providerName, ": must specify \"baseUrl\", \"compat\", \"modelOverrides\", or \"models\"."));
                }
            }
            else {
                // Custom models are merged into provider models and require endpoint + auth.
                if (!providerConfig.baseUrl) {
                    throw new Error("Provider ".concat(providerName, ": \"baseUrl\" is required when defining custom models."));
                }
                if (!providerConfig.apiKey) {
                    throw new Error("Provider ".concat(providerName, ": \"apiKey\" is required when defining custom models."));
                }
            }
            for (var _d = 0, models_1 = models; _d < models_1.length; _d++) {
                var modelDef = models_1[_d];
                var hasModelApi = !!modelDef.api;
                if (!hasProviderApi && !hasModelApi) {
                    throw new Error("Provider ".concat(providerName, ", model ").concat(modelDef.id, ": no \"api\" specified. Set at provider or model level."));
                }
                if (!modelDef.id)
                    throw new Error("Provider ".concat(providerName, ": model missing \"id\""));
                // Validate contextWindow/maxTokens only if provided (they have defaults)
                if (modelDef.contextWindow !== undefined && modelDef.contextWindow <= 0)
                    throw new Error("Provider ".concat(providerName, ", model ").concat(modelDef.id, ": invalid contextWindow"));
                if (modelDef.maxTokens !== undefined && modelDef.maxTokens <= 0)
                    throw new Error("Provider ".concat(providerName, ", model ").concat(modelDef.id, ": invalid maxTokens"));
            }
        }
    };
    ModelRegistry.prototype.parseModels = function (config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var models = [];
        for (var _i = 0, _j = Object.entries(config.providers); _i < _j.length; _i++) {
            var _k = _j[_i], providerName = _k[0], providerConfig = _k[1];
            var modelDefs = (_a = providerConfig.models) !== null && _a !== void 0 ? _a : [];
            if (modelDefs.length === 0)
                continue; // Override-only, no custom models
            // Store API key config for fallback resolver
            if (providerConfig.apiKey) {
                this.customProviderApiKeys.set(providerName, providerConfig.apiKey);
            }
            for (var _l = 0, modelDefs_1 = modelDefs; _l < modelDefs_1.length; _l++) {
                var modelDef = modelDefs_1[_l];
                var api = modelDef.api || providerConfig.api;
                if (!api)
                    continue;
                // Merge headers: provider headers are base, model headers override
                // Resolve env vars and shell commands in header values
                var providerHeaders = (0, resolve_config_value_js_1.resolveHeaders)(providerConfig.headers);
                var modelHeaders = (0, resolve_config_value_js_1.resolveHeaders)(modelDef.headers);
                var compat = mergeCompat(providerConfig.compat, modelDef.compat);
                var headers = providerHeaders || modelHeaders ? __assign(__assign({}, providerHeaders), modelHeaders) : undefined;
                // If authHeader is true, add Authorization header with resolved API key
                if (providerConfig.authHeader && providerConfig.apiKey) {
                    var resolvedKey = (0, resolve_config_value_js_1.resolveConfigValue)(providerConfig.apiKey);
                    if (resolvedKey) {
                        headers = __assign(__assign({}, headers), { Authorization: "Bearer ".concat(resolvedKey) });
                    }
                }
                // Provider baseUrl is required when custom models are defined.
                // Individual models can override it with modelDef.baseUrl.
                var defaultCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
                models.push({
                    id: modelDef.id,
                    name: (_b = modelDef.name) !== null && _b !== void 0 ? _b : modelDef.id,
                    api: api,
                    provider: providerName,
                    baseUrl: (_c = modelDef.baseUrl) !== null && _c !== void 0 ? _c : providerConfig.baseUrl,
                    reasoning: (_d = modelDef.reasoning) !== null && _d !== void 0 ? _d : false,
                    input: ((_e = modelDef.input) !== null && _e !== void 0 ? _e : ["text"]),
                    cost: (_f = modelDef.cost) !== null && _f !== void 0 ? _f : defaultCost,
                    contextWindow: (_g = modelDef.contextWindow) !== null && _g !== void 0 ? _g : 128000,
                    maxTokens: (_h = modelDef.maxTokens) !== null && _h !== void 0 ? _h : 16384,
                    headers: headers,
                    compat: compat,
                });
            }
        }
        return models;
    };
    /**
     * Get all models (built-in + custom).
     * If models.json had errors, returns only built-in models.
     */
    ModelRegistry.prototype.getAll = function () {
        return this.models;
    };
    /**
     * Get only models that have auth configured.
     * This is a fast check that doesn't refresh OAuth tokens.
     */
    ModelRegistry.prototype.getAvailable = function () {
        var _this = this;
        return this.models.filter(function (m) { return _this.authStorage.hasAuth(m.provider); });
    };
    /**
     * Find a model by provider and ID.
     */
    ModelRegistry.prototype.find = function (provider, modelId) {
        return this.models.find(function (m) { return m.provider === provider && m.id === modelId; });
    };
    /**
     * Get API key for a model.
     */
    ModelRegistry.prototype.getApiKey = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.authStorage.getApiKey(model.provider)];
            });
        });
    };
    /**
     * Get API key for a provider.
     */
    ModelRegistry.prototype.getApiKeyForProvider = function (provider) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.authStorage.getApiKey(provider)];
            });
        });
    };
    /**
     * Check if a model is using OAuth credentials (subscription).
     */
    ModelRegistry.prototype.isUsingOAuth = function (model) {
        var cred = this.authStorage.get(model.provider);
        return (cred === null || cred === void 0 ? void 0 : cred.type) === "oauth";
    };
    /**
     * Register a provider dynamically (from extensions).
     *
     * If provider has models: replaces all existing models for this provider.
     * If provider has only baseUrl/headers: overrides existing models' URLs.
     * If provider has oauth: registers OAuth provider for /login support.
     */
    ModelRegistry.prototype.registerProvider = function (providerName, config) {
        this.registeredProviders.set(providerName, config);
        this.applyProviderConfig(providerName, config);
    };
    /**
     * Unregister a previously registered provider.
     *
     * Removes the provider from the registry and reloads models from disk so that
     * built-in models overridden by this provider are restored to their original state.
     * Also resets dynamic OAuth and API stream registrations before reapplying
     * remaining dynamic providers.
     * Has no effect if the provider was never registered.
     */
    ModelRegistry.prototype.unregisterProvider = function (providerName) {
        if (!this.registeredProviders.has(providerName))
            return;
        this.registeredProviders.delete(providerName);
        this.customProviderApiKeys.delete(providerName);
        this.refresh();
    };
    ModelRegistry.prototype.applyProviderConfig = function (providerName, config) {
        var _a;
        // Register OAuth provider if provided
        if (config.oauth) {
            // Ensure the OAuth provider ID matches the provider name
            var oauthProvider = __assign(__assign({}, config.oauth), { id: providerName });
            (0, oauth_1.registerOAuthProvider)(oauthProvider);
        }
        if (config.streamSimple) {
            if (!config.api) {
                throw new Error("Provider ".concat(providerName, ": \"api\" is required when registering streamSimple."));
            }
            var streamSimple_1 = config.streamSimple;
            (0, pi_ai_1.registerApiProvider)({
                api: config.api,
                stream: function (model, context, options) { return streamSimple_1(model, context, options); },
                streamSimple: streamSimple_1,
            }, "provider:".concat(providerName));
        }
        // Store API key for auth resolution
        if (config.apiKey) {
            this.customProviderApiKeys.set(providerName, config.apiKey);
        }
        if (config.models && config.models.length > 0) {
            // Full replacement: remove existing models for this provider
            this.models = this.models.filter(function (m) { return m.provider !== providerName; });
            // Validate required fields
            if (!config.baseUrl) {
                throw new Error("Provider ".concat(providerName, ": \"baseUrl\" is required when defining models."));
            }
            if (!config.apiKey && !config.oauth) {
                throw new Error("Provider ".concat(providerName, ": \"apiKey\" or \"oauth\" is required when defining models."));
            }
            // Parse and add new models
            for (var _i = 0, _b = config.models; _i < _b.length; _i++) {
                var modelDef = _b[_i];
                var api = modelDef.api || config.api;
                if (!api) {
                    throw new Error("Provider ".concat(providerName, ", model ").concat(modelDef.id, ": no \"api\" specified."));
                }
                // Merge headers
                var providerHeaders = (0, resolve_config_value_js_1.resolveHeaders)(config.headers);
                var modelHeaders = (0, resolve_config_value_js_1.resolveHeaders)(modelDef.headers);
                var headers = providerHeaders || modelHeaders ? __assign(__assign({}, providerHeaders), modelHeaders) : undefined;
                // If authHeader is true, add Authorization header
                if (config.authHeader && config.apiKey) {
                    var resolvedKey = (0, resolve_config_value_js_1.resolveConfigValue)(config.apiKey);
                    if (resolvedKey) {
                        headers = __assign(__assign({}, headers), { Authorization: "Bearer ".concat(resolvedKey) });
                    }
                }
                this.models.push({
                    id: modelDef.id,
                    name: modelDef.name,
                    api: api,
                    provider: providerName,
                    baseUrl: config.baseUrl,
                    reasoning: modelDef.reasoning,
                    input: modelDef.input,
                    cost: modelDef.cost,
                    contextWindow: modelDef.contextWindow,
                    maxTokens: modelDef.maxTokens,
                    headers: headers,
                    compat: modelDef.compat,
                });
            }
            // Apply OAuth modifyModels if credentials exist (e.g., to update baseUrl)
            if ((_a = config.oauth) === null || _a === void 0 ? void 0 : _a.modifyModels) {
                var cred = this.authStorage.get(providerName);
                if ((cred === null || cred === void 0 ? void 0 : cred.type) === "oauth") {
                    this.models = config.oauth.modifyModels(this.models, cred);
                }
            }
        }
        else if (config.baseUrl) {
            // Override-only: update baseUrl/headers for existing models
            var resolvedHeaders_1 = (0, resolve_config_value_js_1.resolveHeaders)(config.headers);
            this.models = this.models.map(function (m) {
                var _a;
                if (m.provider !== providerName)
                    return m;
                return __assign(__assign({}, m), { baseUrl: (_a = config.baseUrl) !== null && _a !== void 0 ? _a : m.baseUrl, headers: resolvedHeaders_1 ? __assign(__assign({}, m.headers), resolvedHeaders_1) : m.headers });
            });
        }
    };
    return ModelRegistry;
}());
exports.ModelRegistry = ModelRegistry;
