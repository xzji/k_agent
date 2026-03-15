"use strict";
/**
 * Model resolution, scoping, and initial selection
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultModelPerProvider = void 0;
exports.parseModelPattern = parseModelPattern;
exports.resolveModelScope = resolveModelScope;
exports.resolveCliModel = resolveCliModel;
exports.findInitialModel = findInitialModel;
exports.restoreModelFromSession = restoreModelFromSession;
var pi_ai_1 = require("@mariozechner/pi-ai");
var chalk_1 = require("chalk");
var minimatch_1 = require("minimatch");
var args_js_1 = require("../cli/args.js");
var defaults_js_1 = require("./defaults.js");
/** Default model IDs for each known provider */
exports.defaultModelPerProvider = {
    "amazon-bedrock": "us.anthropic.claude-opus-4-6-v1",
    anthropic: "claude-opus-4-6",
    openai: "gpt-5.4",
    "azure-openai-responses": "gpt-5.2",
    "openai-codex": "gpt-5.4",
    google: "gemini-2.5-pro",
    "google-gemini-cli": "gemini-2.5-pro",
    "google-antigravity": "gemini-3.1-pro-high",
    "google-vertex": "gemini-3-pro-preview",
    "github-copilot": "gpt-4o",
    openrouter: "openai/gpt-5.1-codex",
    "vercel-ai-gateway": "anthropic/claude-opus-4-6",
    xai: "grok-4-fast-non-reasoning",
    groq: "openai/gpt-oss-120b",
    cerebras: "zai-glm-4.6",
    zai: "glm-4.6",
    mistral: "devstral-medium-latest",
    minimax: "MiniMax-M2.1",
    "minimax-cn": "MiniMax-M2.1",
    huggingface: "moonshotai/Kimi-K2.5",
    opencode: "claude-opus-4-6",
    "opencode-go": "kimi-k2.5",
    "kimi-coding": "kimi-k2-thinking",
};
/**
 * Helper to check if a model ID looks like an alias (no date suffix)
 * Dates are typically in format: -20241022 or -20250929
 */
function isAlias(id) {
    // Check if ID ends with -latest
    if (id.endsWith("-latest"))
        return true;
    // Check if ID ends with a date pattern (-YYYYMMDD)
    var datePattern = /-\d{8}$/;
    return !datePattern.test(id);
}
/**
 * Try to match a pattern to a model from the available models list.
 * Returns the matched model or undefined if no match found.
 */
function tryMatchModel(modelPattern, availableModels) {
    // Check for provider/modelId format (provider is everything before the first /)
    var slashIndex = modelPattern.indexOf("/");
    if (slashIndex !== -1) {
        var provider_1 = modelPattern.substring(0, slashIndex);
        var modelId_1 = modelPattern.substring(slashIndex + 1);
        var providerMatch = availableModels.find(function (m) { return m.provider.toLowerCase() === provider_1.toLowerCase() && m.id.toLowerCase() === modelId_1.toLowerCase(); });
        if (providerMatch) {
            return providerMatch;
        }
        // No exact provider/model match - fall through to other matching
    }
    // Check for exact ID match (case-insensitive)
    var exactMatch = availableModels.find(function (m) { return m.id.toLowerCase() === modelPattern.toLowerCase(); });
    if (exactMatch) {
        return exactMatch;
    }
    // No exact match - fall back to partial matching
    var matches = availableModels.filter(function (m) {
        var _a;
        return m.id.toLowerCase().includes(modelPattern.toLowerCase()) ||
            ((_a = m.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(modelPattern.toLowerCase()));
    });
    if (matches.length === 0) {
        return undefined;
    }
    // Separate into aliases and dated versions
    var aliases = matches.filter(function (m) { return isAlias(m.id); });
    var datedVersions = matches.filter(function (m) { return !isAlias(m.id); });
    if (aliases.length > 0) {
        // Prefer alias - if multiple aliases, pick the one that sorts highest
        aliases.sort(function (a, b) { return b.id.localeCompare(a.id); });
        return aliases[0];
    }
    else {
        // No alias found, pick latest dated version
        datedVersions.sort(function (a, b) { return b.id.localeCompare(a.id); });
        return datedVersions[0];
    }
}
function buildFallbackModel(provider, modelId, availableModels) {
    var _a;
    var providerModels = availableModels.filter(function (m) { return m.provider === provider; });
    if (providerModels.length === 0)
        return undefined;
    var defaultId = exports.defaultModelPerProvider[provider];
    var baseModel = defaultId
        ? ((_a = providerModels.find(function (m) { return m.id === defaultId; })) !== null && _a !== void 0 ? _a : providerModels[0])
        : providerModels[0];
    return __assign(__assign({}, baseModel), { id: modelId, name: modelId });
}
/**
 * Parse a pattern to extract model and thinking level.
 * Handles models with colons in their IDs (e.g., OpenRouter's :exacto suffix).
 *
 * Algorithm:
 * 1. Try to match full pattern as a model
 * 2. If found, return it with "off" thinking level
 * 3. If not found and has colons, split on last colon:
 *    - If suffix is valid thinking level, use it and recurse on prefix
 *    - If suffix is invalid, warn and recurse on prefix with "off"
 *
 * @internal Exported for testing
 */
function parseModelPattern(pattern, availableModels, options) {
    var _a;
    // Try exact match first
    var exactMatch = tryMatchModel(pattern, availableModels);
    if (exactMatch) {
        return { model: exactMatch, thinkingLevel: undefined, warning: undefined };
    }
    // No match - try splitting on last colon if present
    var lastColonIndex = pattern.lastIndexOf(":");
    if (lastColonIndex === -1) {
        // No colons, pattern simply doesn't match any model
        return { model: undefined, thinkingLevel: undefined, warning: undefined };
    }
    var prefix = pattern.substring(0, lastColonIndex);
    var suffix = pattern.substring(lastColonIndex + 1);
    if ((0, args_js_1.isValidThinkingLevel)(suffix)) {
        // Valid thinking level - recurse on prefix and use this level
        var result = parseModelPattern(prefix, availableModels, options);
        if (result.model) {
            // Only use this thinking level if no warning from inner recursion
            return {
                model: result.model,
                thinkingLevel: result.warning ? undefined : suffix,
                warning: result.warning,
            };
        }
        return result;
    }
    else {
        // Invalid suffix
        var allowFallback = (_a = options === null || options === void 0 ? void 0 : options.allowInvalidThinkingLevelFallback) !== null && _a !== void 0 ? _a : true;
        if (!allowFallback) {
            // In strict mode (CLI --model parsing), treat it as part of the model id and fail.
            // This avoids accidentally resolving to a different model.
            return { model: undefined, thinkingLevel: undefined, warning: undefined };
        }
        // Scope mode: recurse on prefix and warn
        var result = parseModelPattern(prefix, availableModels, options);
        if (result.model) {
            return {
                model: result.model,
                thinkingLevel: undefined,
                warning: "Invalid thinking level \"".concat(suffix, "\" in pattern \"").concat(pattern, "\". Using default instead."),
            };
        }
        return result;
    }
}
/**
 * Resolve model patterns to actual Model objects with optional thinking levels
 * Format: "pattern:level" where :level is optional
 * For each pattern, finds all matching models and picks the best version:
 * 1. Prefer alias (e.g., claude-sonnet-4-5) over dated versions (claude-sonnet-4-5-20250929)
 * 2. If no alias, pick the latest dated version
 *
 * Supports models with colons in their IDs (e.g., OpenRouter's model:exacto).
 * The algorithm tries to match the full pattern first, then progressively
 * strips colon-suffixes to find a match.
 */
function resolveModelScope(patterns, modelRegistry) {
    return __awaiter(this, void 0, void 0, function () {
        var availableModels, scopedModels, _loop_1, _i, patterns_1, pattern;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, modelRegistry.getAvailable()];
                case 1:
                    availableModels = _a.sent();
                    scopedModels = [];
                    _loop_1 = function (pattern) {
                        // Check if pattern contains glob characters
                        if (pattern.includes("*") || pattern.includes("?") || pattern.includes("[")) {
                            // Extract optional thinking level suffix (e.g., "provider/*:high")
                            var colonIdx = pattern.lastIndexOf(":");
                            var globPattern_1 = pattern;
                            var thinkingLevel_1 = void 0;
                            if (colonIdx !== -1) {
                                var suffix = pattern.substring(colonIdx + 1);
                                if ((0, args_js_1.isValidThinkingLevel)(suffix)) {
                                    thinkingLevel_1 = suffix;
                                    globPattern_1 = pattern.substring(0, colonIdx);
                                }
                            }
                            // Match against "provider/modelId" format OR just model ID
                            // This allows "*sonnet*" to match without requiring "anthropic/*sonnet*"
                            var matchingModels = availableModels.filter(function (m) {
                                var fullId = "".concat(m.provider, "/").concat(m.id);
                                return (0, minimatch_1.minimatch)(fullId, globPattern_1, { nocase: true }) || (0, minimatch_1.minimatch)(m.id, globPattern_1, { nocase: true });
                            });
                            if (matchingModels.length === 0) {
                                console.warn(chalk_1.default.yellow("Warning: No models match pattern \"".concat(pattern, "\"")));
                                return "continue";
                            }
                            var _loop_2 = function (model_1) {
                                if (!scopedModels.find(function (sm) { return (0, pi_ai_1.modelsAreEqual)(sm.model, model_1); })) {
                                    scopedModels.push({ model: model_1, thinkingLevel: thinkingLevel_1 });
                                }
                            };
                            for (var _b = 0, matchingModels_1 = matchingModels; _b < matchingModels_1.length; _b++) {
                                var model_1 = matchingModels_1[_b];
                                _loop_2(model_1);
                            }
                            return "continue";
                        }
                        var _c = parseModelPattern(pattern, availableModels), model = _c.model, thinkingLevel = _c.thinkingLevel, warning = _c.warning;
                        if (warning) {
                            console.warn(chalk_1.default.yellow("Warning: ".concat(warning)));
                        }
                        if (!model) {
                            console.warn(chalk_1.default.yellow("Warning: No models match pattern \"".concat(pattern, "\"")));
                            return "continue";
                        }
                        // Avoid duplicates
                        if (!scopedModels.find(function (sm) { return (0, pi_ai_1.modelsAreEqual)(sm.model, model); })) {
                            scopedModels.push({ model: model, thinkingLevel: thinkingLevel });
                        }
                    };
                    for (_i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
                        pattern = patterns_1[_i];
                        _loop_1(pattern);
                    }
                    return [2 /*return*/, scopedModels];
            }
        });
    });
}
/**
 * Resolve a single model from CLI flags.
 *
 * Supports:
 * - --provider <provider> --model <pattern>
 * - --model <provider>/<pattern>
 * - Fuzzy matching (same rules as model scoping: exact id, then partial id/name)
 *
 * Note: This does not apply the thinking level by itself, but it may *parse* and
 * return a thinking level from "<pattern>:<thinking>" so the caller can apply it.
 */
function resolveCliModel(options) {
    var cliProvider = options.cliProvider, cliModel = options.cliModel, modelRegistry = options.modelRegistry;
    if (!cliModel) {
        return { model: undefined, warning: undefined, error: undefined };
    }
    // Important: use *all* models here, not just models with pre-configured auth.
    // This allows "--api-key" to be used for first-time setup.
    var availableModels = modelRegistry.getAll();
    if (availableModels.length === 0) {
        return {
            model: undefined,
            warning: undefined,
            error: "No models available. Check your installation or add models to models.json.",
        };
    }
    // Build canonical provider lookup (case-insensitive)
    var providerMap = new Map();
    for (var _i = 0, availableModels_1 = availableModels; _i < availableModels_1.length; _i++) {
        var m = availableModels_1[_i];
        providerMap.set(m.provider.toLowerCase(), m.provider);
    }
    var provider = cliProvider ? providerMap.get(cliProvider.toLowerCase()) : undefined;
    if (cliProvider && !provider) {
        return {
            model: undefined,
            warning: undefined,
            error: "Unknown provider \"".concat(cliProvider, "\". Use --list-models to see available providers/models."),
        };
    }
    // If no explicit --provider, try to interpret "provider/model" format first.
    // When the prefix before the first slash matches a known provider, prefer that
    // interpretation over matching models whose IDs literally contain slashes
    // (e.g. "zai/glm-5" should resolve to provider=zai, model=glm-5, not to a
    // vercel-ai-gateway model with id "zai/glm-5").
    var pattern = cliModel;
    var inferredProvider = false;
    if (!provider) {
        var slashIndex = cliModel.indexOf("/");
        if (slashIndex !== -1) {
            var maybeProvider = cliModel.substring(0, slashIndex);
            var canonical = providerMap.get(maybeProvider.toLowerCase());
            if (canonical) {
                provider = canonical;
                pattern = cliModel.substring(slashIndex + 1);
                inferredProvider = true;
            }
        }
    }
    // If no provider was inferred from the slash, try exact matches without provider inference.
    // This handles models whose IDs naturally contain slashes (e.g. OpenRouter-style IDs).
    if (!provider) {
        var lower_1 = cliModel.toLowerCase();
        var exact = availableModels.find(function (m) { return m.id.toLowerCase() === lower_1 || "".concat(m.provider, "/").concat(m.id).toLowerCase() === lower_1; });
        if (exact) {
            return { model: exact, warning: undefined, thinkingLevel: undefined, error: undefined };
        }
    }
    if (cliProvider && provider) {
        // If both were provided, tolerate --model <provider>/<pattern> by stripping the provider prefix
        var prefix = "".concat(provider, "/");
        if (cliModel.toLowerCase().startsWith(prefix.toLowerCase())) {
            pattern = cliModel.substring(prefix.length);
        }
    }
    var candidates = provider ? availableModels.filter(function (m) { return m.provider === provider; }) : availableModels;
    var _a = parseModelPattern(pattern, candidates, {
        allowInvalidThinkingLevelFallback: false,
    }), model = _a.model, thinkingLevel = _a.thinkingLevel, warning = _a.warning;
    if (model) {
        return { model: model, thinkingLevel: thinkingLevel, warning: warning, error: undefined };
    }
    // If we inferred a provider from the slash but found no match within that provider,
    // fall back to matching the full input as a raw model id across all models.
    // This handles OpenRouter-style IDs like "openai/gpt-4o:extended" where "openai"
    // looks like a provider but the full string is actually a model id on openrouter.
    if (inferredProvider) {
        var lower_2 = cliModel.toLowerCase();
        var exact = availableModels.find(function (m) { return m.id.toLowerCase() === lower_2 || "".concat(m.provider, "/").concat(m.id).toLowerCase() === lower_2; });
        if (exact) {
            return { model: exact, warning: undefined, thinkingLevel: undefined, error: undefined };
        }
        // Also try parseModelPattern on the full input against all models
        var fallback = parseModelPattern(cliModel, availableModels, {
            allowInvalidThinkingLevelFallback: false,
        });
        if (fallback.model) {
            return {
                model: fallback.model,
                thinkingLevel: fallback.thinkingLevel,
                warning: fallback.warning,
                error: undefined,
            };
        }
    }
    if (provider) {
        var fallbackModel = buildFallbackModel(provider, pattern, availableModels);
        if (fallbackModel) {
            var fallbackWarning = warning
                ? "".concat(warning, " Model \"").concat(pattern, "\" not found for provider \"").concat(provider, "\". Using custom model id.")
                : "Model \"".concat(pattern, "\" not found for provider \"").concat(provider, "\". Using custom model id.");
            return { model: fallbackModel, thinkingLevel: undefined, warning: fallbackWarning, error: undefined };
        }
    }
    var display = provider ? "".concat(provider, "/").concat(pattern) : cliModel;
    return {
        model: undefined,
        thinkingLevel: undefined,
        warning: warning,
        error: "Model \"".concat(display, "\" not found. Use --list-models to see available models."),
    };
}
/**
 * Find the initial model to use based on priority:
 * 1. CLI args (provider + model)
 * 2. First model from scoped models (if not continuing/resuming)
 * 3. Restored from session (if continuing/resuming)
 * 4. Saved default from settings
 * 5. First available model with valid API key
 */
function findInitialModel(options) {
    return __awaiter(this, void 0, void 0, function () {
        var cliProvider, cliModel, scopedModels, isContinuing, defaultProvider, defaultModelId, defaultThinkingLevel, modelRegistry, model, thinkingLevel, resolved, found, availableModels, _loop_3, _i, _a, provider, state_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    cliProvider = options.cliProvider, cliModel = options.cliModel, scopedModels = options.scopedModels, isContinuing = options.isContinuing, defaultProvider = options.defaultProvider, defaultModelId = options.defaultModelId, defaultThinkingLevel = options.defaultThinkingLevel, modelRegistry = options.modelRegistry;
                    thinkingLevel = defaults_js_1.DEFAULT_THINKING_LEVEL;
                    // 1. CLI args take priority
                    if (cliProvider && cliModel) {
                        resolved = resolveCliModel({
                            cliProvider: cliProvider,
                            cliModel: cliModel,
                            modelRegistry: modelRegistry,
                        });
                        if (resolved.error) {
                            console.error(chalk_1.default.red(resolved.error));
                            process.exit(1);
                        }
                        if (resolved.model) {
                            return [2 /*return*/, { model: resolved.model, thinkingLevel: defaults_js_1.DEFAULT_THINKING_LEVEL, fallbackMessage: undefined }];
                        }
                    }
                    // 2. Use first model from scoped models (skip if continuing/resuming)
                    if (scopedModels.length > 0 && !isContinuing) {
                        return [2 /*return*/, {
                                model: scopedModels[0].model,
                                thinkingLevel: (_c = (_b = scopedModels[0].thinkingLevel) !== null && _b !== void 0 ? _b : defaultThinkingLevel) !== null && _c !== void 0 ? _c : defaults_js_1.DEFAULT_THINKING_LEVEL,
                                fallbackMessage: undefined,
                            }];
                    }
                    // 3. Try saved default from settings
                    if (defaultProvider && defaultModelId) {
                        found = modelRegistry.find(defaultProvider, defaultModelId);
                        if (found) {
                            model = found;
                            if (defaultThinkingLevel) {
                                thinkingLevel = defaultThinkingLevel;
                            }
                            return [2 /*return*/, { model: model, thinkingLevel: thinkingLevel, fallbackMessage: undefined }];
                        }
                    }
                    return [4 /*yield*/, modelRegistry.getAvailable()];
                case 1:
                    availableModels = _d.sent();
                    if (availableModels.length > 0) {
                        _loop_3 = function (provider) {
                            var defaultId = exports.defaultModelPerProvider[provider];
                            var match = availableModels.find(function (m) { return m.provider === provider && m.id === defaultId; });
                            if (match) {
                                return { value: { model: match, thinkingLevel: defaults_js_1.DEFAULT_THINKING_LEVEL, fallbackMessage: undefined } };
                            }
                        };
                        // Try to find a default model from known providers
                        for (_i = 0, _a = Object.keys(exports.defaultModelPerProvider); _i < _a.length; _i++) {
                            provider = _a[_i];
                            state_1 = _loop_3(provider);
                            if (typeof state_1 === "object")
                                return [2 /*return*/, state_1.value];
                        }
                        // If no default found, use first available
                        return [2 /*return*/, { model: availableModels[0], thinkingLevel: defaults_js_1.DEFAULT_THINKING_LEVEL, fallbackMessage: undefined }];
                    }
                    // 5. No model found
                    return [2 /*return*/, { model: undefined, thinkingLevel: defaults_js_1.DEFAULT_THINKING_LEVEL, fallbackMessage: undefined }];
            }
        });
    });
}
/**
 * Restore model from session, with fallback to available models
 */
function restoreModelFromSession(savedProvider, savedModelId, currentModel, shouldPrintMessages, modelRegistry) {
    return __awaiter(this, void 0, void 0, function () {
        var restoredModel, hasApiKey, _a, reason, availableModels, fallbackModel, _loop_4, _i, _b, provider, state_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    restoredModel = modelRegistry.find(savedProvider, savedModelId);
                    if (!restoredModel) return [3 /*break*/, 2];
                    return [4 /*yield*/, modelRegistry.getApiKey(restoredModel)];
                case 1:
                    _a = !!(_c.sent());
                    return [3 /*break*/, 3];
                case 2:
                    _a = false;
                    _c.label = 3;
                case 3:
                    hasApiKey = _a;
                    if (restoredModel && hasApiKey) {
                        if (shouldPrintMessages) {
                            console.log(chalk_1.default.dim("Restored model: ".concat(savedProvider, "/").concat(savedModelId)));
                        }
                        return [2 /*return*/, { model: restoredModel, fallbackMessage: undefined }];
                    }
                    reason = !restoredModel ? "model no longer exists" : "no API key available";
                    if (shouldPrintMessages) {
                        console.error(chalk_1.default.yellow("Warning: Could not restore model ".concat(savedProvider, "/").concat(savedModelId, " (").concat(reason, ").")));
                    }
                    // If we already have a model, use it as fallback
                    if (currentModel) {
                        if (shouldPrintMessages) {
                            console.log(chalk_1.default.dim("Falling back to: ".concat(currentModel.provider, "/").concat(currentModel.id)));
                        }
                        return [2 /*return*/, {
                                model: currentModel,
                                fallbackMessage: "Could not restore model ".concat(savedProvider, "/").concat(savedModelId, " (").concat(reason, "). Using ").concat(currentModel.provider, "/").concat(currentModel.id, "."),
                            }];
                    }
                    return [4 /*yield*/, modelRegistry.getAvailable()];
                case 4:
                    availableModels = _c.sent();
                    if (availableModels.length > 0) {
                        fallbackModel = void 0;
                        _loop_4 = function (provider) {
                            var defaultId = exports.defaultModelPerProvider[provider];
                            var match = availableModels.find(function (m) { return m.provider === provider && m.id === defaultId; });
                            if (match) {
                                fallbackModel = match;
                                return "break";
                            }
                        };
                        for (_i = 0, _b = Object.keys(exports.defaultModelPerProvider); _i < _b.length; _i++) {
                            provider = _b[_i];
                            state_2 = _loop_4(provider);
                            if (state_2 === "break")
                                break;
                        }
                        // If no default found, use first available
                        if (!fallbackModel) {
                            fallbackModel = availableModels[0];
                        }
                        if (shouldPrintMessages) {
                            console.log(chalk_1.default.dim("Falling back to: ".concat(fallbackModel.provider, "/").concat(fallbackModel.id)));
                        }
                        return [2 /*return*/, {
                                model: fallbackModel,
                                fallbackMessage: "Could not restore model ".concat(savedProvider, "/").concat(savedModelId, " (").concat(reason, "). Using ").concat(fallbackModel.provider, "/").concat(fallbackModel.id, "."),
                            }];
                    }
                    // No models available
                    return [2 /*return*/, { model: undefined, fallbackMessage: undefined }];
            }
        });
    });
}
