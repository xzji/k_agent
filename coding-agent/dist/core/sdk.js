"use strict";
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
exports.createLsTool = exports.createFindTool = exports.createGrepTool = exports.createWriteTool = exports.createEditTool = exports.createBashTool = exports.createReadTool = exports.createReadOnlyTools = exports.createCodingTools = exports.allBuiltInTools = exports.readOnlyTools = exports.codingTools = exports.lsTool = exports.findTool = exports.grepTool = exports.writeTool = exports.editTool = exports.bashTool = exports.readTool = void 0;
exports.createAgentSession = createAgentSession;
var node_path_1 = require("node:path");
var pi_agent_core_1 = require("@mariozechner/pi-agent-core");
var config_js_1 = require("../config.js");
var agent_session_js_1 = require("./agent-session.js");
var auth_storage_js_1 = require("./auth-storage.js");
var defaults_js_1 = require("./defaults.js");
var messages_js_1 = require("./messages.js");
var model_registry_js_1 = require("./model-registry.js");
var model_resolver_js_1 = require("./model-resolver.js");
var resource_loader_js_1 = require("./resource-loader.js");
var session_manager_js_1 = require("./session-manager.js");
var settings_manager_js_1 = require("./settings-manager.js");
var timings_js_1 = require("./timings.js");
var index_js_1 = require("./tools/index.js");
Object.defineProperty(exports, "allBuiltInTools", { enumerable: true, get: function () { return index_js_1.allTools; } });
Object.defineProperty(exports, "bashTool", { enumerable: true, get: function () { return index_js_1.bashTool; } });
Object.defineProperty(exports, "codingTools", { enumerable: true, get: function () { return index_js_1.codingTools; } });
Object.defineProperty(exports, "createBashTool", { enumerable: true, get: function () { return index_js_1.createBashTool; } });
Object.defineProperty(exports, "createCodingTools", { enumerable: true, get: function () { return index_js_1.createCodingTools; } });
Object.defineProperty(exports, "createEditTool", { enumerable: true, get: function () { return index_js_1.createEditTool; } });
Object.defineProperty(exports, "createFindTool", { enumerable: true, get: function () { return index_js_1.createFindTool; } });
Object.defineProperty(exports, "createGrepTool", { enumerable: true, get: function () { return index_js_1.createGrepTool; } });
Object.defineProperty(exports, "createLsTool", { enumerable: true, get: function () { return index_js_1.createLsTool; } });
Object.defineProperty(exports, "createReadOnlyTools", { enumerable: true, get: function () { return index_js_1.createReadOnlyTools; } });
Object.defineProperty(exports, "createReadTool", { enumerable: true, get: function () { return index_js_1.createReadTool; } });
Object.defineProperty(exports, "createWriteTool", { enumerable: true, get: function () { return index_js_1.createWriteTool; } });
Object.defineProperty(exports, "editTool", { enumerable: true, get: function () { return index_js_1.editTool; } });
Object.defineProperty(exports, "findTool", { enumerable: true, get: function () { return index_js_1.findTool; } });
Object.defineProperty(exports, "grepTool", { enumerable: true, get: function () { return index_js_1.grepTool; } });
Object.defineProperty(exports, "lsTool", { enumerable: true, get: function () { return index_js_1.lsTool; } });
Object.defineProperty(exports, "readOnlyTools", { enumerable: true, get: function () { return index_js_1.readOnlyTools; } });
Object.defineProperty(exports, "readTool", { enumerable: true, get: function () { return index_js_1.readTool; } });
Object.defineProperty(exports, "writeTool", { enumerable: true, get: function () { return index_js_1.writeTool; } });
// Helper Functions
function getDefaultAgentDir() {
    return (0, config_js_1.getAgentDir)();
}
/**
 * Create an AgentSession with the specified options.
 *
 * @example
 * ```typescript
 * // Minimal - uses defaults
 * const { session } = await createAgentSession();
 *
 * // With explicit model
 * import { getModel } from '@mariozechner/pi-ai';
 * const { session } = await createAgentSession({
 *   model: getModel('anthropic', 'claude-opus-4-5'),
 *   thinkingLevel: 'high',
 * });
 *
 * // Continue previous session
 * const { session, modelFallbackMessage } = await createAgentSession({
 *   continueSession: true,
 * });
 *
 * // Full control
 * const loader = new DefaultResourceLoader({
 *   cwd: process.cwd(),
 *   agentDir: getAgentDir(),
 *   settingsManager: SettingsManager.create(),
 * });
 * await loader.reload();
 * const { session } = await createAgentSession({
 *   model: myModel,
 *   tools: [readTool, bashTool],
 *   resourceLoader: loader,
 *   sessionManager: SessionManager.inMemory(),
 * });
 * ```
 */
function createAgentSession() {
    return __awaiter(this, arguments, void 0, function (options) {
        var cwd, agentDir, resourceLoader, authPath, modelsPath, authStorage, modelRegistry, settingsManager, sessionManager, existingSession, hasExistingSession, hasThinkingEntry, model, modelFallbackMessage, restoredModel, _a, result, thinkingLevel, defaultActiveToolNames, initialActiveToolNames, agent, convertToLlmWithBlockImages, extensionRunnerRef, session, extensionsResult;
        var _this = this;
        var _b, _c, _d, _e, _f, _g, _h, _j;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    cwd = (_b = options.cwd) !== null && _b !== void 0 ? _b : process.cwd();
                    agentDir = (_c = options.agentDir) !== null && _c !== void 0 ? _c : getDefaultAgentDir();
                    resourceLoader = options.resourceLoader;
                    authPath = options.agentDir ? (0, node_path_1.join)(agentDir, "auth.json") : undefined;
                    modelsPath = options.agentDir ? (0, node_path_1.join)(agentDir, "models.json") : undefined;
                    authStorage = (_d = options.authStorage) !== null && _d !== void 0 ? _d : auth_storage_js_1.AuthStorage.create(authPath);
                    modelRegistry = (_e = options.modelRegistry) !== null && _e !== void 0 ? _e : new model_registry_js_1.ModelRegistry(authStorage, modelsPath);
                    settingsManager = (_f = options.settingsManager) !== null && _f !== void 0 ? _f : settings_manager_js_1.SettingsManager.create(cwd, agentDir);
                    sessionManager = (_g = options.sessionManager) !== null && _g !== void 0 ? _g : session_manager_js_1.SessionManager.create(cwd);
                    if (!!resourceLoader) return [3 /*break*/, 2];
                    resourceLoader = new resource_loader_js_1.DefaultResourceLoader({ cwd: cwd, agentDir: agentDir, settingsManager: settingsManager });
                    return [4 /*yield*/, resourceLoader.reload()];
                case 1:
                    _k.sent();
                    (0, timings_js_1.time)("resourceLoader.reload");
                    _k.label = 2;
                case 2:
                    existingSession = sessionManager.buildSessionContext();
                    hasExistingSession = existingSession.messages.length > 0;
                    hasThinkingEntry = sessionManager.getBranch().some(function (entry) { return entry.type === "thinking_level_change"; });
                    model = options.model;
                    if (!(!model && hasExistingSession && existingSession.model)) return [3 /*break*/, 5];
                    restoredModel = modelRegistry.find(existingSession.model.provider, existingSession.model.modelId);
                    _a = restoredModel;
                    if (!_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, modelRegistry.getApiKey(restoredModel)];
                case 3:
                    _a = (_k.sent());
                    _k.label = 4;
                case 4:
                    if (_a) {
                        model = restoredModel;
                    }
                    if (!model) {
                        modelFallbackMessage = "Could not restore model ".concat(existingSession.model.provider, "/").concat(existingSession.model.modelId);
                    }
                    _k.label = 5;
                case 5:
                    if (!!model) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, model_resolver_js_1.findInitialModel)({
                            scopedModels: [],
                            isContinuing: hasExistingSession,
                            defaultProvider: settingsManager.getDefaultProvider(),
                            defaultModelId: settingsManager.getDefaultModel(),
                            defaultThinkingLevel: settingsManager.getDefaultThinkingLevel(),
                            modelRegistry: modelRegistry,
                        })];
                case 6:
                    result = _k.sent();
                    model = result.model;
                    if (!model) {
                        modelFallbackMessage = "No models available. Use /login or set an API key environment variable. See ".concat((0, node_path_1.join)((0, config_js_1.getDocsPath)(), "providers.md"), ". Then use /model to select a model.");
                    }
                    else if (modelFallbackMessage) {
                        modelFallbackMessage += ". Using ".concat(model.provider, "/").concat(model.id);
                    }
                    _k.label = 7;
                case 7:
                    thinkingLevel = options.thinkingLevel;
                    // If session has data, restore thinking level from it
                    if (thinkingLevel === undefined && hasExistingSession) {
                        thinkingLevel = hasThinkingEntry
                            ? existingSession.thinkingLevel
                            : ((_h = settingsManager.getDefaultThinkingLevel()) !== null && _h !== void 0 ? _h : defaults_js_1.DEFAULT_THINKING_LEVEL);
                    }
                    // Fall back to settings default
                    if (thinkingLevel === undefined) {
                        thinkingLevel = (_j = settingsManager.getDefaultThinkingLevel()) !== null && _j !== void 0 ? _j : defaults_js_1.DEFAULT_THINKING_LEVEL;
                    }
                    // Clamp to model capabilities
                    if (!model || !model.reasoning) {
                        thinkingLevel = "off";
                    }
                    defaultActiveToolNames = ["read", "bash", "edit", "write"];
                    initialActiveToolNames = options.tools
                        ? options.tools.map(function (t) { return t.name; }).filter(function (n) { return n in index_js_1.allTools; })
                        : defaultActiveToolNames;
                    convertToLlmWithBlockImages = function (messages) {
                        var converted = (0, messages_js_1.convertToLlm)(messages);
                        // Check setting dynamically so mid-session changes take effect
                        if (!settingsManager.getBlockImages()) {
                            return converted;
                        }
                        // Filter out ImageContent from all messages, replacing with text placeholder
                        return converted.map(function (msg) {
                            if (msg.role === "user" || msg.role === "toolResult") {
                                var content = msg.content;
                                if (Array.isArray(content)) {
                                    var hasImages = content.some(function (c) { return c.type === "image"; });
                                    if (hasImages) {
                                        var filteredContent = content
                                            .map(function (c) {
                                            return c.type === "image" ? { type: "text", text: "Image reading is disabled." } : c;
                                        })
                                            .filter(function (c, i, arr) {
                                            // Dedupe consecutive "Image reading is disabled." texts
                                            return !(c.type === "text" &&
                                                c.text === "Image reading is disabled." &&
                                                i > 0 &&
                                                arr[i - 1].type === "text" &&
                                                arr[i - 1].text === "Image reading is disabled.");
                                        });
                                        return __assign(__assign({}, msg), { content: filteredContent });
                                    }
                                }
                            }
                            return msg;
                        });
                    };
                    extensionRunnerRef = {};
                    agent = new pi_agent_core_1.Agent({
                        initialState: {
                            systemPrompt: "",
                            model: model,
                            thinkingLevel: thinkingLevel,
                            tools: [],
                        },
                        convertToLlm: convertToLlmWithBlockImages,
                        onPayload: function (payload, _model) { return __awaiter(_this, void 0, void 0, function () {
                            var runner;
                            return __generator(this, function (_a) {
                                runner = extensionRunnerRef.current;
                                if (!(runner === null || runner === void 0 ? void 0 : runner.hasHandlers("before_provider_request"))) {
                                    return [2 /*return*/, payload];
                                }
                                return [2 /*return*/, runner.emitBeforeProviderRequest(payload)];
                            });
                        }); },
                        sessionId: sessionManager.getSessionId(),
                        transformContext: function (messages) { return __awaiter(_this, void 0, void 0, function () {
                            var runner;
                            return __generator(this, function (_a) {
                                runner = extensionRunnerRef.current;
                                if (!runner)
                                    return [2 /*return*/, messages];
                                return [2 /*return*/, runner.emitContext(messages)];
                            });
                        }); },
                        steeringMode: settingsManager.getSteeringMode(),
                        followUpMode: settingsManager.getFollowUpMode(),
                        transport: settingsManager.getTransport(),
                        thinkingBudgets: settingsManager.getThinkingBudgets(),
                        maxRetryDelayMs: settingsManager.getRetrySettings().maxDelayMs,
                        getApiKey: function (provider) { return __awaiter(_this, void 0, void 0, function () {
                            var resolvedProvider, key, model_1, isOAuth;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        resolvedProvider = provider || ((_a = agent.state.model) === null || _a === void 0 ? void 0 : _a.provider);
                                        if (!resolvedProvider) {
                                            throw new Error("No model selected");
                                        }
                                        return [4 /*yield*/, modelRegistry.getApiKeyForProvider(resolvedProvider)];
                                    case 1:
                                        key = _b.sent();
                                        if (!key) {
                                            model_1 = agent.state.model;
                                            isOAuth = model_1 && modelRegistry.isUsingOAuth(model_1);
                                            if (isOAuth) {
                                                throw new Error("Authentication failed for \"".concat(resolvedProvider, "\". ") +
                                                    "Credentials may have expired or network is unavailable. " +
                                                    "Run '/login ".concat(resolvedProvider, "' to re-authenticate."));
                                            }
                                            throw new Error("No API key found for \"".concat(resolvedProvider, "\". ") +
                                                "Set an API key environment variable or run '/login ".concat(resolvedProvider, "'."));
                                        }
                                        return [2 /*return*/, key];
                                }
                            });
                        }); },
                    });
                    // Restore messages if session has existing data
                    if (hasExistingSession) {
                        agent.replaceMessages(existingSession.messages);
                        if (!hasThinkingEntry) {
                            sessionManager.appendThinkingLevelChange(thinkingLevel);
                        }
                    }
                    else {
                        // Save initial model and thinking level for new sessions so they can be restored on resume
                        if (model) {
                            sessionManager.appendModelChange(model.provider, model.id);
                        }
                        sessionManager.appendThinkingLevelChange(thinkingLevel);
                    }
                    session = new agent_session_js_1.AgentSession({
                        agent: agent,
                        sessionManager: sessionManager,
                        settingsManager: settingsManager,
                        cwd: cwd,
                        scopedModels: options.scopedModels,
                        resourceLoader: resourceLoader,
                        customTools: options.customTools,
                        modelRegistry: modelRegistry,
                        initialActiveToolNames: initialActiveToolNames,
                        extensionRunnerRef: extensionRunnerRef,
                    });
                    extensionsResult = resourceLoader.getExtensions();
                    return [2 /*return*/, {
                            session: session,
                            extensionsResult: extensionsResult,
                            modelFallbackMessage: modelFallbackMessage,
                        }];
            }
        });
    });
}
