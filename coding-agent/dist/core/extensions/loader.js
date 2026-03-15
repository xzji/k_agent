"use strict";
/**
 * Extension loader - loads TypeScript extension modules using jiti.
 *
 * Uses @mariozechner/jiti fork with virtualModules support for compiled Bun binaries.
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
exports.createExtensionRuntime = createExtensionRuntime;
exports.loadExtensionFromFactory = loadExtensionFromFactory;
exports.loadExtensions = loadExtensions;
exports.discoverAndLoadExtensions = discoverAndLoadExtensions;
var fs = require("node:fs");
var node_module_1 = require("node:module");
var os = require("node:os");
var path = require("node:path");
var node_url_1 = require("node:url");
var jiti_1 = require("@mariozechner/jiti");
var _bundledPiAgentCore = require("@mariozechner/pi-agent-core");
var _bundledPiAi = require("@mariozechner/pi-ai");
var _bundledPiAiOauth = require("@mariozechner/pi-ai/oauth");
var _bundledPiTui = require("@mariozechner/pi-tui");
// Static imports of packages that extensions may use.
// These MUST be static so Bun bundles them into the compiled binary.
// The virtualModules option then makes them available to extensions.
var _bundledTypebox = require("@sinclair/typebox");
var config_js_1 = require("../../config.js");
// NOTE: This import works because loader.ts exports are NOT re-exported from index.ts,
// avoiding a circular dependency. Extensions can import from @mariozechner/pi-coding-agent.
var _bundledPiCodingAgent = require("../../index.js");
var event_bus_js_1 = require("../event-bus.js");
var exec_js_1 = require("../exec.js");
/** Modules available to extensions via virtualModules (for compiled Bun binary) */
var VIRTUAL_MODULES = {
    "@sinclair/typebox": _bundledTypebox,
    "@mariozechner/pi-agent-core": _bundledPiAgentCore,
    "@mariozechner/pi-tui": _bundledPiTui,
    "@mariozechner/pi-ai": _bundledPiAi,
    "@mariozechner/pi-ai/oauth": _bundledPiAiOauth,
    "@mariozechner/pi-coding-agent": _bundledPiCodingAgent,
};
var require = (0, node_module_1.createRequire)(import.meta.url);
/**
 * Get aliases for jiti (used in Node.js/development mode).
 * In Bun binary mode, virtualModules is used instead.
 */
var _aliases = null;
function getAliases() {
    if (_aliases)
        return _aliases;
    var __dirname = path.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
    var packageIndex = path.resolve(__dirname, "../..", "index.js");
    var typeboxEntry = require.resolve("@sinclair/typebox");
    var typeboxRoot = typeboxEntry.replace(/[\\/]build[\\/]cjs[\\/]index\.js$/, "");
    var packagesRoot = path.resolve(__dirname, "../../../../");
    var resolveWorkspaceOrImport = function (workspaceRelativePath, specifier) {
        var workspacePath = path.join(packagesRoot, workspaceRelativePath);
        if (fs.existsSync(workspacePath)) {
            return workspacePath;
        }
        return (0, node_url_1.fileURLToPath)(import.meta.resolve(specifier));
    };
    _aliases = {
        "@mariozechner/pi-coding-agent": packageIndex,
        "@mariozechner/pi-agent-core": resolveWorkspaceOrImport("agent/dist/index.js", "@mariozechner/pi-agent-core"),
        "@mariozechner/pi-tui": resolveWorkspaceOrImport("tui/dist/index.js", "@mariozechner/pi-tui"),
        "@mariozechner/pi-ai": resolveWorkspaceOrImport("ai/dist/index.js", "@mariozechner/pi-ai"),
        "@mariozechner/pi-ai/oauth": resolveWorkspaceOrImport("ai/dist/oauth.js", "@mariozechner/pi-ai/oauth"),
        "@sinclair/typebox": typeboxRoot,
    };
    return _aliases;
}
var UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
function normalizeUnicodeSpaces(str) {
    return str.replace(UNICODE_SPACES, " ");
}
function expandPath(p) {
    var normalized = normalizeUnicodeSpaces(p);
    if (normalized.startsWith("~/")) {
        return path.join(os.homedir(), normalized.slice(2));
    }
    if (normalized.startsWith("~")) {
        return path.join(os.homedir(), normalized.slice(1));
    }
    return normalized;
}
function resolvePath(extPath, cwd) {
    var expanded = expandPath(extPath);
    if (path.isAbsolute(expanded)) {
        return expanded;
    }
    return path.resolve(cwd, expanded);
}
/**
 * Create a runtime with throwing stubs for action methods.
 * Runner.bindCore() replaces these with real implementations.
 */
function createExtensionRuntime() {
    var notInitialized = function () {
        throw new Error("Extension runtime not initialized. Action methods cannot be called during extension loading.");
    };
    var runtime = {
        sendMessage: notInitialized,
        sendUserMessage: notInitialized,
        appendEntry: notInitialized,
        setSessionName: notInitialized,
        getSessionName: notInitialized,
        setLabel: notInitialized,
        getActiveTools: notInitialized,
        getAllTools: notInitialized,
        setActiveTools: notInitialized,
        // registerTool() is valid during extension load; refresh is only needed post-bind.
        refreshTools: function () { },
        getCommands: notInitialized,
        setModel: function () { return Promise.reject(new Error("Extension runtime not initialized")); },
        getThinkingLevel: notInitialized,
        setThinkingLevel: notInitialized,
        flagValues: new Map(),
        pendingProviderRegistrations: [],
        // Pre-bind: queue registrations so bindCore() can flush them once the
        // model registry is available. bindCore() replaces both with direct calls.
        registerProvider: function (name, config) {
            runtime.pendingProviderRegistrations.push({ name: name, config: config });
        },
        unregisterProvider: function (name) {
            runtime.pendingProviderRegistrations = runtime.pendingProviderRegistrations.filter(function (r) { return r.name !== name; });
        },
    };
    return runtime;
}
/**
 * Create the ExtensionAPI for an extension.
 * Registration methods write to the extension object.
 * Action methods delegate to the shared runtime.
 */
function createExtensionAPI(extension, runtime, cwd, eventBus) {
    var api = {
        // Registration methods - write to extension
        on: function (event, handler) {
            var _a;
            var list = (_a = extension.handlers.get(event)) !== null && _a !== void 0 ? _a : [];
            list.push(handler);
            extension.handlers.set(event, list);
        },
        registerTool: function (tool) {
            extension.tools.set(tool.name, {
                definition: tool,
                extensionPath: extension.path,
            });
            runtime.refreshTools();
        },
        registerCommand: function (name, options) {
            extension.commands.set(name, __assign({ name: name }, options));
        },
        registerShortcut: function (shortcut, options) {
            extension.shortcuts.set(shortcut, __assign({ shortcut: shortcut, extensionPath: extension.path }, options));
        },
        registerFlag: function (name, options) {
            extension.flags.set(name, __assign({ name: name, extensionPath: extension.path }, options));
            if (options.default !== undefined && !runtime.flagValues.has(name)) {
                runtime.flagValues.set(name, options.default);
            }
        },
        registerMessageRenderer: function (customType, renderer) {
            extension.messageRenderers.set(customType, renderer);
        },
        // Flag access - checks extension registered it, reads from runtime
        getFlag: function (name) {
            if (!extension.flags.has(name))
                return undefined;
            return runtime.flagValues.get(name);
        },
        // Action methods - delegate to shared runtime
        sendMessage: function (message, options) {
            runtime.sendMessage(message, options);
        },
        sendUserMessage: function (content, options) {
            runtime.sendUserMessage(content, options);
        },
        appendEntry: function (customType, data) {
            runtime.appendEntry(customType, data);
        },
        setSessionName: function (name) {
            runtime.setSessionName(name);
        },
        getSessionName: function () {
            return runtime.getSessionName();
        },
        setLabel: function (entryId, label) {
            runtime.setLabel(entryId, label);
        },
        exec: function (command, args, options) {
            var _a;
            return (0, exec_js_1.execCommand)(command, args, (_a = options === null || options === void 0 ? void 0 : options.cwd) !== null && _a !== void 0 ? _a : cwd, options);
        },
        getActiveTools: function () {
            return runtime.getActiveTools();
        },
        getAllTools: function () {
            return runtime.getAllTools();
        },
        setActiveTools: function (toolNames) {
            runtime.setActiveTools(toolNames);
        },
        getCommands: function () {
            return runtime.getCommands();
        },
        setModel: function (model) {
            return runtime.setModel(model);
        },
        getThinkingLevel: function () {
            return runtime.getThinkingLevel();
        },
        setThinkingLevel: function (level) {
            runtime.setThinkingLevel(level);
        },
        registerProvider: function (name, config) {
            runtime.registerProvider(name, config);
        },
        unregisterProvider: function (name) {
            runtime.unregisterProvider(name);
        },
        events: eventBus,
    };
    return api;
}
function loadExtensionModule(extensionPath) {
    return __awaiter(this, void 0, void 0, function () {
        var jiti, module, factory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jiti = (0, jiti_1.createJiti)(import.meta.url, __assign({ moduleCache: false }, (config_js_1.isBunBinary ? { virtualModules: VIRTUAL_MODULES, tryNative: false } : { alias: getAliases() })));
                    return [4 /*yield*/, jiti.import(extensionPath, { default: true })];
                case 1:
                    module = _a.sent();
                    factory = module;
                    return [2 /*return*/, typeof factory !== "function" ? undefined : factory];
            }
        });
    });
}
/**
 * Create an Extension object with empty collections.
 */
function createExtension(extensionPath, resolvedPath) {
    return {
        path: extensionPath,
        resolvedPath: resolvedPath,
        handlers: new Map(),
        tools: new Map(),
        messageRenderers: new Map(),
        commands: new Map(),
        flags: new Map(),
        shortcuts: new Map(),
    };
}
function loadExtension(extensionPath, cwd, eventBus, runtime) {
    return __awaiter(this, void 0, void 0, function () {
        var resolvedPath, factory, extension, api, err_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    resolvedPath = resolvePath(extensionPath, cwd);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, loadExtensionModule(resolvedPath)];
                case 2:
                    factory = _a.sent();
                    if (!factory) {
                        return [2 /*return*/, { extension: null, error: "Extension does not export a valid factory function: ".concat(extensionPath) }];
                    }
                    extension = createExtension(extensionPath, resolvedPath);
                    api = createExtensionAPI(extension, runtime, cwd, eventBus);
                    return [4 /*yield*/, factory(api)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { extension: extension, error: null }];
                case 4:
                    err_1 = _a.sent();
                    message = err_1 instanceof Error ? err_1.message : String(err_1);
                    return [2 /*return*/, { extension: null, error: "Failed to load extension: ".concat(message) }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create an Extension from an inline factory function.
 */
function loadExtensionFromFactory(factory_1, cwd_1, eventBus_1, runtime_1) {
    return __awaiter(this, arguments, void 0, function (factory, cwd, eventBus, runtime, extensionPath) {
        var extension, api;
        if (extensionPath === void 0) { extensionPath = "<inline>"; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    extension = createExtension(extensionPath, extensionPath);
                    api = createExtensionAPI(extension, runtime, cwd, eventBus);
                    return [4 /*yield*/, factory(api)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, extension];
            }
        });
    });
}
/**
 * Load extensions from paths.
 */
function loadExtensions(paths, cwd, eventBus) {
    return __awaiter(this, void 0, void 0, function () {
        var extensions, errors, resolvedEventBus, runtime, _i, paths_1, extPath, _a, extension, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    extensions = [];
                    errors = [];
                    resolvedEventBus = eventBus !== null && eventBus !== void 0 ? eventBus : (0, event_bus_js_1.createEventBus)();
                    runtime = createExtensionRuntime();
                    _i = 0, paths_1 = paths;
                    _b.label = 1;
                case 1:
                    if (!(_i < paths_1.length)) return [3 /*break*/, 4];
                    extPath = paths_1[_i];
                    return [4 /*yield*/, loadExtension(extPath, cwd, resolvedEventBus, runtime)];
                case 2:
                    _a = _b.sent(), extension = _a.extension, error = _a.error;
                    if (error) {
                        errors.push({ path: extPath, error: error });
                        return [3 /*break*/, 3];
                    }
                    if (extension) {
                        extensions.push(extension);
                    }
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, {
                        extensions: extensions,
                        errors: errors,
                        runtime: runtime,
                    }];
            }
        });
    });
}
function readPiManifest(packageJsonPath) {
    try {
        var content = fs.readFileSync(packageJsonPath, "utf-8");
        var pkg = JSON.parse(content);
        if (pkg.pi && typeof pkg.pi === "object") {
            return pkg.pi;
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
function isExtensionFile(name) {
    return name.endsWith(".ts") || name.endsWith(".js");
}
/**
 * Resolve extension entry points from a directory.
 *
 * Checks for:
 * 1. package.json with "pi.extensions" field -> returns declared paths
 * 2. index.ts or index.js -> returns the index file
 *
 * Returns resolved paths or null if no entry points found.
 */
function resolveExtensionEntries(dir) {
    var _a;
    // Check for package.json with "pi" field first
    var packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
        var manifest = readPiManifest(packageJsonPath);
        if ((_a = manifest === null || manifest === void 0 ? void 0 : manifest.extensions) === null || _a === void 0 ? void 0 : _a.length) {
            var entries = [];
            for (var _i = 0, _b = manifest.extensions; _i < _b.length; _i++) {
                var extPath = _b[_i];
                var resolvedExtPath = path.resolve(dir, extPath);
                if (fs.existsSync(resolvedExtPath)) {
                    entries.push(resolvedExtPath);
                }
            }
            if (entries.length > 0) {
                return entries;
            }
        }
    }
    // Check for index.ts or index.js
    var indexTs = path.join(dir, "index.ts");
    var indexJs = path.join(dir, "index.js");
    if (fs.existsSync(indexTs)) {
        return [indexTs];
    }
    if (fs.existsSync(indexJs)) {
        return [indexJs];
    }
    return null;
}
/**
 * Discover extensions in a directory.
 *
 * Discovery rules:
 * 1. Direct files: `extensions/*.ts` or `*.js` → load
 * 2. Subdirectory with index: `extensions/* /index.ts` or `index.js` → load
 * 3. Subdirectory with package.json: `extensions/* /package.json` with "pi" field → load what it declares
 *
 * No recursion beyond one level. Complex packages must use package.json manifest.
 */
function discoverExtensionsInDir(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    var discovered = [];
    try {
        var entries = fs.readdirSync(dir, { withFileTypes: true });
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var entryPath = path.join(dir, entry.name);
            // 1. Direct files: *.ts or *.js
            if ((entry.isFile() || entry.isSymbolicLink()) && isExtensionFile(entry.name)) {
                discovered.push(entryPath);
                continue;
            }
            // 2 & 3. Subdirectories
            if (entry.isDirectory() || entry.isSymbolicLink()) {
                var entries_2 = resolveExtensionEntries(entryPath);
                if (entries_2) {
                    discovered.push.apply(discovered, entries_2);
                }
            }
        }
    }
    catch (_a) {
        return [];
    }
    return discovered;
}
/**
 * Discover and load extensions from standard locations.
 */
function discoverAndLoadExtensions(configuredPaths_1, cwd_1) {
    return __awaiter(this, arguments, void 0, function (configuredPaths, cwd, agentDir, eventBus) {
        var allPaths, seen, addPaths, localExtDir, globalExtDir, _i, configuredPaths_2, p, resolved, entries;
        if (agentDir === void 0) { agentDir = (0, config_js_1.getAgentDir)(); }
        return __generator(this, function (_a) {
            allPaths = [];
            seen = new Set();
            addPaths = function (paths) {
                for (var _i = 0, paths_2 = paths; _i < paths_2.length; _i++) {
                    var p = paths_2[_i];
                    var resolved = path.resolve(p);
                    if (!seen.has(resolved)) {
                        seen.add(resolved);
                        allPaths.push(p);
                    }
                }
            };
            localExtDir = path.join(cwd, ".pi", "extensions");
            addPaths(discoverExtensionsInDir(localExtDir));
            globalExtDir = path.join(agentDir, "extensions");
            addPaths(discoverExtensionsInDir(globalExtDir));
            // 3. Explicitly configured paths
            for (_i = 0, configuredPaths_2 = configuredPaths; _i < configuredPaths_2.length; _i++) {
                p = configuredPaths_2[_i];
                resolved = resolvePath(p, cwd);
                if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                    entries = resolveExtensionEntries(resolved);
                    if (entries) {
                        addPaths(entries);
                        continue;
                    }
                    // No explicit entries - discover individual files in directory
                    addPaths(discoverExtensionsInDir(resolved));
                    continue;
                }
                addPaths([resolved]);
            }
            return [2 /*return*/, loadExtensions(allPaths, cwd, eventBus)];
        });
    });
}
