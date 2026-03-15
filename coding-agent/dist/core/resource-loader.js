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
exports.DefaultResourceLoader = void 0;
var node_fs_1 = require("node:fs");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var chalk_1 = require("chalk");
var config_js_1 = require("../config.js");
var theme_js_1 = require("../modes/interactive/theme/theme.js");
var event_bus_js_1 = require("./event-bus.js");
var loader_js_1 = require("./extensions/loader.js");
var package_manager_js_1 = require("./package-manager.js");
var prompt_templates_js_1 = require("./prompt-templates.js");
var settings_manager_js_1 = require("./settings-manager.js");
var skills_js_1 = require("./skills.js");
function resolvePromptInput(input, description) {
    if (!input) {
        return undefined;
    }
    if ((0, node_fs_1.existsSync)(input)) {
        try {
            return (0, node_fs_1.readFileSync)(input, "utf-8");
        }
        catch (error) {
            console.error(chalk_1.default.yellow("Warning: Could not read ".concat(description, " file ").concat(input, ": ").concat(error)));
            return input;
        }
    }
    return input;
}
function loadContextFileFromDir(dir) {
    var candidates = ["AGENTS.md", "CLAUDE.md"];
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var filename = candidates_1[_i];
        var filePath = (0, node_path_1.join)(dir, filename);
        if ((0, node_fs_1.existsSync)(filePath)) {
            try {
                return {
                    path: filePath,
                    content: (0, node_fs_1.readFileSync)(filePath, "utf-8"),
                };
            }
            catch (error) {
                console.error(chalk_1.default.yellow("Warning: Could not read ".concat(filePath, ": ").concat(error)));
            }
        }
    }
    return null;
}
function loadProjectContextFiles(options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var resolvedCwd = (_a = options.cwd) !== null && _a !== void 0 ? _a : process.cwd();
    var resolvedAgentDir = (_b = options.agentDir) !== null && _b !== void 0 ? _b : (0, config_js_1.getAgentDir)();
    var contextFiles = [];
    var seenPaths = new Set();
    var globalContext = loadContextFileFromDir(resolvedAgentDir);
    if (globalContext) {
        contextFiles.push(globalContext);
        seenPaths.add(globalContext.path);
    }
    var ancestorContextFiles = [];
    var currentDir = resolvedCwd;
    var root = (0, node_path_1.resolve)("/");
    while (true) {
        var contextFile = loadContextFileFromDir(currentDir);
        if (contextFile && !seenPaths.has(contextFile.path)) {
            ancestorContextFiles.unshift(contextFile);
            seenPaths.add(contextFile.path);
        }
        if (currentDir === root)
            break;
        var parentDir = (0, node_path_1.resolve)(currentDir, "..");
        if (parentDir === currentDir)
            break;
        currentDir = parentDir;
    }
    contextFiles.push.apply(contextFiles, ancestorContextFiles);
    return contextFiles;
}
var DefaultResourceLoader = /** @class */ (function () {
    function DefaultResourceLoader(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        this.cwd = (_a = options.cwd) !== null && _a !== void 0 ? _a : process.cwd();
        this.agentDir = (_b = options.agentDir) !== null && _b !== void 0 ? _b : (0, config_js_1.getAgentDir)();
        this.settingsManager = (_c = options.settingsManager) !== null && _c !== void 0 ? _c : settings_manager_js_1.SettingsManager.create(this.cwd, this.agentDir);
        this.eventBus = (_d = options.eventBus) !== null && _d !== void 0 ? _d : (0, event_bus_js_1.createEventBus)();
        this.packageManager = new package_manager_js_1.DefaultPackageManager({
            cwd: this.cwd,
            agentDir: this.agentDir,
            settingsManager: this.settingsManager,
        });
        this.additionalExtensionPaths = (_e = options.additionalExtensionPaths) !== null && _e !== void 0 ? _e : [];
        this.additionalSkillPaths = (_f = options.additionalSkillPaths) !== null && _f !== void 0 ? _f : [];
        this.additionalPromptTemplatePaths = (_g = options.additionalPromptTemplatePaths) !== null && _g !== void 0 ? _g : [];
        this.additionalThemePaths = (_h = options.additionalThemePaths) !== null && _h !== void 0 ? _h : [];
        this.extensionFactories = (_j = options.extensionFactories) !== null && _j !== void 0 ? _j : [];
        this.noExtensions = (_k = options.noExtensions) !== null && _k !== void 0 ? _k : false;
        this.noSkills = (_l = options.noSkills) !== null && _l !== void 0 ? _l : false;
        this.noPromptTemplates = (_m = options.noPromptTemplates) !== null && _m !== void 0 ? _m : false;
        this.noThemes = (_o = options.noThemes) !== null && _o !== void 0 ? _o : false;
        this.systemPromptSource = options.systemPrompt;
        this.appendSystemPromptSource = options.appendSystemPrompt;
        this.extensionsOverride = options.extensionsOverride;
        this.skillsOverride = options.skillsOverride;
        this.promptsOverride = options.promptsOverride;
        this.themesOverride = options.themesOverride;
        this.agentsFilesOverride = options.agentsFilesOverride;
        this.systemPromptOverride = options.systemPromptOverride;
        this.appendSystemPromptOverride = options.appendSystemPromptOverride;
        this.extensionsResult = { extensions: [], errors: [], runtime: (0, loader_js_1.createExtensionRuntime)() };
        this.skills = [];
        this.skillDiagnostics = [];
        this.prompts = [];
        this.promptDiagnostics = [];
        this.themes = [];
        this.themeDiagnostics = [];
        this.agentsFiles = [];
        this.appendSystemPrompt = [];
        this.pathMetadata = new Map();
        this.lastSkillPaths = [];
        this.lastPromptPaths = [];
        this.lastThemePaths = [];
    }
    DefaultResourceLoader.prototype.getExtensions = function () {
        return this.extensionsResult;
    };
    DefaultResourceLoader.prototype.getSkills = function () {
        return { skills: this.skills, diagnostics: this.skillDiagnostics };
    };
    DefaultResourceLoader.prototype.getPrompts = function () {
        return { prompts: this.prompts, diagnostics: this.promptDiagnostics };
    };
    DefaultResourceLoader.prototype.getThemes = function () {
        return { themes: this.themes, diagnostics: this.themeDiagnostics };
    };
    DefaultResourceLoader.prototype.getAgentsFiles = function () {
        return { agentsFiles: this.agentsFiles };
    };
    DefaultResourceLoader.prototype.getSystemPrompt = function () {
        return this.systemPrompt;
    };
    DefaultResourceLoader.prototype.getAppendSystemPrompt = function () {
        return this.appendSystemPrompt;
    };
    DefaultResourceLoader.prototype.getPathMetadata = function () {
        return this.pathMetadata;
    };
    DefaultResourceLoader.prototype.extendResources = function (paths) {
        var _a, _b, _c;
        var skillPaths = this.normalizeExtensionPaths((_a = paths.skillPaths) !== null && _a !== void 0 ? _a : []);
        var promptPaths = this.normalizeExtensionPaths((_b = paths.promptPaths) !== null && _b !== void 0 ? _b : []);
        var themePaths = this.normalizeExtensionPaths((_c = paths.themePaths) !== null && _c !== void 0 ? _c : []);
        if (skillPaths.length > 0) {
            this.lastSkillPaths = this.mergePaths(this.lastSkillPaths, skillPaths.map(function (entry) { return entry.path; }));
            this.updateSkillsFromPaths(this.lastSkillPaths, skillPaths);
        }
        if (promptPaths.length > 0) {
            this.lastPromptPaths = this.mergePaths(this.lastPromptPaths, promptPaths.map(function (entry) { return entry.path; }));
            this.updatePromptsFromPaths(this.lastPromptPaths, promptPaths);
        }
        if (themePaths.length > 0) {
            this.lastThemePaths = this.mergePaths(this.lastThemePaths, themePaths.map(function (entry) { return entry.path; }));
            this.updateThemesFromPaths(this.lastThemePaths, themePaths);
        }
    };
    DefaultResourceLoader.prototype.reload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resolvedPaths, cliExtensionPaths, getEnabledResources, getEnabledPaths, enabledExtensions, enabledSkillResources, enabledPrompts, enabledThemes, mapSkillPath, enabledSkills, _i, _a, r, _b, _c, r, cliEnabledExtensions, cliEnabledSkills, cliEnabledPrompts, cliEnabledThemes, extensionPaths, extensionsResult, inlineExtensions, conflicts, _d, conflicts_1, conflict, skillPaths, promptPaths, themePaths, _e, _f, extension, agentsFiles, resolvedAgentsFiles, baseSystemPrompt, appendSource, resolvedAppend, baseAppend;
            var _g, _h;
            var _this = this;
            var _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0: return [4 /*yield*/, this.packageManager.resolve()];
                    case 1:
                        resolvedPaths = _l.sent();
                        return [4 /*yield*/, this.packageManager.resolveExtensionSources(this.additionalExtensionPaths, {
                                temporary: true,
                            })];
                    case 2:
                        cliExtensionPaths = _l.sent();
                        getEnabledResources = function (resources) {
                            for (var _i = 0, resources_1 = resources; _i < resources_1.length; _i++) {
                                var r = resources_1[_i];
                                if (!_this.pathMetadata.has(r.path)) {
                                    _this.pathMetadata.set(r.path, r.metadata);
                                }
                            }
                            return resources.filter(function (r) { return r.enabled; });
                        };
                        getEnabledPaths = function (resources) { return getEnabledResources(resources).map(function (r) { return r.path; }); };
                        // Store metadata and get enabled paths
                        this.pathMetadata = new Map();
                        enabledExtensions = getEnabledPaths(resolvedPaths.extensions);
                        enabledSkillResources = getEnabledResources(resolvedPaths.skills);
                        enabledPrompts = getEnabledPaths(resolvedPaths.prompts);
                        enabledThemes = getEnabledPaths(resolvedPaths.themes);
                        mapSkillPath = function (resource) {
                            if (resource.metadata.source !== "auto" && resource.metadata.origin !== "package") {
                                return resource.path;
                            }
                            try {
                                var stats = (0, node_fs_1.statSync)(resource.path);
                                if (!stats.isDirectory()) {
                                    return resource.path;
                                }
                            }
                            catch (_a) {
                                return resource.path;
                            }
                            var skillFile = (0, node_path_1.join)(resource.path, "SKILL.md");
                            if ((0, node_fs_1.existsSync)(skillFile)) {
                                if (!_this.pathMetadata.has(skillFile)) {
                                    _this.pathMetadata.set(skillFile, resource.metadata);
                                }
                                return skillFile;
                            }
                            return resource.path;
                        };
                        enabledSkills = enabledSkillResources.map(mapSkillPath);
                        // Add CLI paths metadata
                        for (_i = 0, _a = cliExtensionPaths.extensions; _i < _a.length; _i++) {
                            r = _a[_i];
                            if (!this.pathMetadata.has(r.path)) {
                                this.pathMetadata.set(r.path, { source: "cli", scope: "temporary", origin: "top-level" });
                            }
                        }
                        for (_b = 0, _c = cliExtensionPaths.skills; _b < _c.length; _b++) {
                            r = _c[_b];
                            if (!this.pathMetadata.has(r.path)) {
                                this.pathMetadata.set(r.path, { source: "cli", scope: "temporary", origin: "top-level" });
                            }
                        }
                        cliEnabledExtensions = getEnabledPaths(cliExtensionPaths.extensions);
                        cliEnabledSkills = getEnabledPaths(cliExtensionPaths.skills);
                        cliEnabledPrompts = getEnabledPaths(cliExtensionPaths.prompts);
                        cliEnabledThemes = getEnabledPaths(cliExtensionPaths.themes);
                        extensionPaths = this.noExtensions
                            ? cliEnabledExtensions
                            : this.mergePaths(cliEnabledExtensions, enabledExtensions);
                        return [4 /*yield*/, (0, loader_js_1.loadExtensions)(extensionPaths, this.cwd, this.eventBus)];
                    case 3:
                        extensionsResult = _l.sent();
                        return [4 /*yield*/, this.loadExtensionFactories(extensionsResult.runtime)];
                    case 4:
                        inlineExtensions = _l.sent();
                        (_g = extensionsResult.extensions).push.apply(_g, inlineExtensions.extensions);
                        (_h = extensionsResult.errors).push.apply(_h, inlineExtensions.errors);
                        conflicts = this.detectExtensionConflicts(extensionsResult.extensions);
                        for (_d = 0, conflicts_1 = conflicts; _d < conflicts_1.length; _d++) {
                            conflict = conflicts_1[_d];
                            extensionsResult.errors.push({ path: conflict.path, error: conflict.message });
                        }
                        this.extensionsResult = this.extensionsOverride ? this.extensionsOverride(extensionsResult) : extensionsResult;
                        skillPaths = this.noSkills
                            ? this.mergePaths(cliEnabledSkills, this.additionalSkillPaths)
                            : this.mergePaths(__spreadArray(__spreadArray([], enabledSkills, true), cliEnabledSkills, true), this.additionalSkillPaths);
                        this.lastSkillPaths = skillPaths;
                        this.updateSkillsFromPaths(skillPaths);
                        promptPaths = this.noPromptTemplates
                            ? this.mergePaths(cliEnabledPrompts, this.additionalPromptTemplatePaths)
                            : this.mergePaths(__spreadArray(__spreadArray([], enabledPrompts, true), cliEnabledPrompts, true), this.additionalPromptTemplatePaths);
                        this.lastPromptPaths = promptPaths;
                        this.updatePromptsFromPaths(promptPaths);
                        themePaths = this.noThemes
                            ? this.mergePaths(cliEnabledThemes, this.additionalThemePaths)
                            : this.mergePaths(__spreadArray(__spreadArray([], enabledThemes, true), cliEnabledThemes, true), this.additionalThemePaths);
                        this.lastThemePaths = themePaths;
                        this.updateThemesFromPaths(themePaths);
                        for (_e = 0, _f = this.extensionsResult.extensions; _e < _f.length; _e++) {
                            extension = _f[_e];
                            this.addDefaultMetadataForPath(extension.path);
                        }
                        agentsFiles = { agentsFiles: loadProjectContextFiles({ cwd: this.cwd, agentDir: this.agentDir }) };
                        resolvedAgentsFiles = this.agentsFilesOverride ? this.agentsFilesOverride(agentsFiles) : agentsFiles;
                        this.agentsFiles = resolvedAgentsFiles.agentsFiles;
                        baseSystemPrompt = resolvePromptInput((_j = this.systemPromptSource) !== null && _j !== void 0 ? _j : this.discoverSystemPromptFile(), "system prompt");
                        this.systemPrompt = this.systemPromptOverride ? this.systemPromptOverride(baseSystemPrompt) : baseSystemPrompt;
                        appendSource = (_k = this.appendSystemPromptSource) !== null && _k !== void 0 ? _k : this.discoverAppendSystemPromptFile();
                        resolvedAppend = resolvePromptInput(appendSource, "append system prompt");
                        baseAppend = resolvedAppend ? [resolvedAppend] : [];
                        this.appendSystemPrompt = this.appendSystemPromptOverride
                            ? this.appendSystemPromptOverride(baseAppend)
                            : baseAppend;
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultResourceLoader.prototype.normalizeExtensionPaths = function (entries) {
        var _this = this;
        return entries.map(function (entry) { return ({
            path: _this.resolveResourcePath(entry.path),
            metadata: entry.metadata,
        }); });
    };
    DefaultResourceLoader.prototype.updateSkillsFromPaths = function (skillPaths, extensionPaths) {
        if (extensionPaths === void 0) { extensionPaths = []; }
        var skillsResult;
        if (this.noSkills && skillPaths.length === 0) {
            skillsResult = { skills: [], diagnostics: [] };
        }
        else {
            skillsResult = (0, skills_js_1.loadSkills)({
                cwd: this.cwd,
                agentDir: this.agentDir,
                skillPaths: skillPaths,
                includeDefaults: false,
            });
        }
        var resolvedSkills = this.skillsOverride ? this.skillsOverride(skillsResult) : skillsResult;
        this.skills = resolvedSkills.skills;
        this.skillDiagnostics = resolvedSkills.diagnostics;
        this.applyExtensionMetadata(extensionPaths, this.skills.map(function (skill) { return skill.filePath; }));
        for (var _i = 0, _a = this.skills; _i < _a.length; _i++) {
            var skill = _a[_i];
            this.addDefaultMetadataForPath(skill.filePath);
        }
    };
    DefaultResourceLoader.prototype.updatePromptsFromPaths = function (promptPaths, extensionPaths) {
        if (extensionPaths === void 0) { extensionPaths = []; }
        var promptsResult;
        if (this.noPromptTemplates && promptPaths.length === 0) {
            promptsResult = { prompts: [], diagnostics: [] };
        }
        else {
            var allPrompts = (0, prompt_templates_js_1.loadPromptTemplates)({
                cwd: this.cwd,
                agentDir: this.agentDir,
                promptPaths: promptPaths,
                includeDefaults: false,
            });
            promptsResult = this.dedupePrompts(allPrompts);
        }
        var resolvedPrompts = this.promptsOverride ? this.promptsOverride(promptsResult) : promptsResult;
        this.prompts = resolvedPrompts.prompts;
        this.promptDiagnostics = resolvedPrompts.diagnostics;
        this.applyExtensionMetadata(extensionPaths, this.prompts.map(function (prompt) { return prompt.filePath; }));
        for (var _i = 0, _a = this.prompts; _i < _a.length; _i++) {
            var prompt_1 = _a[_i];
            this.addDefaultMetadataForPath(prompt_1.filePath);
        }
    };
    DefaultResourceLoader.prototype.updateThemesFromPaths = function (themePaths, extensionPaths) {
        if (extensionPaths === void 0) { extensionPaths = []; }
        var themesResult;
        if (this.noThemes && themePaths.length === 0) {
            themesResult = { themes: [], diagnostics: [] };
        }
        else {
            var loaded = this.loadThemes(themePaths, false);
            var deduped = this.dedupeThemes(loaded.themes);
            themesResult = { themes: deduped.themes, diagnostics: __spreadArray(__spreadArray([], loaded.diagnostics, true), deduped.diagnostics, true) };
        }
        var resolvedThemes = this.themesOverride ? this.themesOverride(themesResult) : themesResult;
        this.themes = resolvedThemes.themes;
        this.themeDiagnostics = resolvedThemes.diagnostics;
        var themePathsWithSource = this.themes.flatMap(function (theme) { return (theme.sourcePath ? [theme.sourcePath] : []); });
        this.applyExtensionMetadata(extensionPaths, themePathsWithSource);
        for (var _i = 0, _a = this.themes; _i < _a.length; _i++) {
            var theme = _a[_i];
            if (theme.sourcePath) {
                this.addDefaultMetadataForPath(theme.sourcePath);
            }
        }
    };
    DefaultResourceLoader.prototype.applyExtensionMetadata = function (extensionPaths, resourcePaths) {
        if (extensionPaths.length === 0) {
            return;
        }
        var normalized = extensionPaths.map(function (entry) { return ({
            path: (0, node_path_1.resolve)(entry.path),
            metadata: entry.metadata,
        }); });
        for (var _i = 0, normalized_1 = normalized; _i < normalized_1.length; _i++) {
            var entry = normalized_1[_i];
            if (!this.pathMetadata.has(entry.path)) {
                this.pathMetadata.set(entry.path, entry.metadata);
            }
        }
        var _loop_1 = function (resourcePath) {
            var normalizedResourcePath = (0, node_path_1.resolve)(resourcePath);
            if (this_1.pathMetadata.has(normalizedResourcePath) || this_1.pathMetadata.has(resourcePath)) {
                return "continue";
            }
            var match = normalized.find(function (entry) {
                return normalizedResourcePath === entry.path || normalizedResourcePath.startsWith("".concat(entry.path).concat(node_path_1.sep));
            });
            if (match) {
                this_1.pathMetadata.set(normalizedResourcePath, match.metadata);
            }
        };
        var this_1 = this;
        for (var _a = 0, resourcePaths_1 = resourcePaths; _a < resourcePaths_1.length; _a++) {
            var resourcePath = resourcePaths_1[_a];
            _loop_1(resourcePath);
        }
    };
    DefaultResourceLoader.prototype.mergePaths = function (primary, additional) {
        var merged = [];
        var seen = new Set();
        for (var _i = 0, _a = __spreadArray(__spreadArray([], primary, true), additional, true); _i < _a.length; _i++) {
            var p = _a[_i];
            var resolved = this.resolveResourcePath(p);
            if (seen.has(resolved))
                continue;
            seen.add(resolved);
            merged.push(resolved);
        }
        return merged;
    };
    DefaultResourceLoader.prototype.resolveResourcePath = function (p) {
        var trimmed = p.trim();
        var expanded = trimmed;
        if (trimmed === "~") {
            expanded = (0, node_os_1.homedir)();
        }
        else if (trimmed.startsWith("~/")) {
            expanded = (0, node_path_1.join)((0, node_os_1.homedir)(), trimmed.slice(2));
        }
        else if (trimmed.startsWith("~")) {
            expanded = (0, node_path_1.join)((0, node_os_1.homedir)(), trimmed.slice(1));
        }
        return (0, node_path_1.resolve)(this.cwd, expanded);
    };
    DefaultResourceLoader.prototype.loadThemes = function (paths, includeDefaults) {
        if (includeDefaults === void 0) { includeDefaults = true; }
        var themes = [];
        var diagnostics = [];
        if (includeDefaults) {
            var defaultDirs = [(0, node_path_1.join)(this.agentDir, "themes"), (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "themes")];
            for (var _i = 0, defaultDirs_1 = defaultDirs; _i < defaultDirs_1.length; _i++) {
                var dir = defaultDirs_1[_i];
                this.loadThemesFromDir(dir, themes, diagnostics);
            }
        }
        for (var _a = 0, paths_1 = paths; _a < paths_1.length; _a++) {
            var p = paths_1[_a];
            var resolved = (0, node_path_1.resolve)(this.cwd, p);
            if (!(0, node_fs_1.existsSync)(resolved)) {
                diagnostics.push({ type: "warning", message: "theme path does not exist", path: resolved });
                continue;
            }
            try {
                var stats = (0, node_fs_1.statSync)(resolved);
                if (stats.isDirectory()) {
                    this.loadThemesFromDir(resolved, themes, diagnostics);
                }
                else if (stats.isFile() && resolved.endsWith(".json")) {
                    this.loadThemeFromFile(resolved, themes, diagnostics);
                }
                else {
                    diagnostics.push({ type: "warning", message: "theme path is not a json file", path: resolved });
                }
            }
            catch (error) {
                var message = error instanceof Error ? error.message : "failed to read theme path";
                diagnostics.push({ type: "warning", message: message, path: resolved });
            }
        }
        return { themes: themes, diagnostics: diagnostics };
    };
    DefaultResourceLoader.prototype.loadThemesFromDir = function (dir, themes, diagnostics) {
        if (!(0, node_fs_1.existsSync)(dir)) {
            return;
        }
        try {
            var entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                var isFile = entry.isFile();
                if (entry.isSymbolicLink()) {
                    try {
                        isFile = (0, node_fs_1.statSync)((0, node_path_1.join)(dir, entry.name)).isFile();
                    }
                    catch (_a) {
                        continue;
                    }
                }
                if (!isFile) {
                    continue;
                }
                if (!entry.name.endsWith(".json")) {
                    continue;
                }
                this.loadThemeFromFile((0, node_path_1.join)(dir, entry.name), themes, diagnostics);
            }
        }
        catch (error) {
            var message = error instanceof Error ? error.message : "failed to read theme directory";
            diagnostics.push({ type: "warning", message: message, path: dir });
        }
    };
    DefaultResourceLoader.prototype.loadThemeFromFile = function (filePath, themes, diagnostics) {
        try {
            themes.push((0, theme_js_1.loadThemeFromPath)(filePath));
        }
        catch (error) {
            var message = error instanceof Error ? error.message : "failed to load theme";
            diagnostics.push({ type: "warning", message: message, path: filePath });
        }
    };
    DefaultResourceLoader.prototype.loadExtensionFactories = function (runtime) {
        return __awaiter(this, void 0, void 0, function () {
            var extensions, errors, _i, _a, _b, index, factory, extensionPath, extension, error_1, message;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        extensions = [];
                        errors = [];
                        _i = 0, _a = this.extensionFactories.entries();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], index = _b[0], factory = _b[1];
                        extensionPath = "<inline:".concat(index + 1, ">");
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, loader_js_1.loadExtensionFromFactory)(factory, this.cwd, this.eventBus, runtime, extensionPath)];
                    case 3:
                        extension = _c.sent();
                        extensions.push(extension);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _c.sent();
                        message = error_1 instanceof Error ? error_1.message : "failed to load extension";
                        errors.push({ path: extensionPath, error: message });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, { extensions: extensions, errors: errors }];
                }
            });
        });
    };
    DefaultResourceLoader.prototype.dedupePrompts = function (prompts) {
        var seen = new Map();
        var diagnostics = [];
        for (var _i = 0, prompts_1 = prompts; _i < prompts_1.length; _i++) {
            var prompt_2 = prompts_1[_i];
            var existing = seen.get(prompt_2.name);
            if (existing) {
                diagnostics.push({
                    type: "collision",
                    message: "name \"/".concat(prompt_2.name, "\" collision"),
                    path: prompt_2.filePath,
                    collision: {
                        resourceType: "prompt",
                        name: prompt_2.name,
                        winnerPath: existing.filePath,
                        loserPath: prompt_2.filePath,
                    },
                });
            }
            else {
                seen.set(prompt_2.name, prompt_2);
            }
        }
        return { prompts: Array.from(seen.values()), diagnostics: diagnostics };
    };
    DefaultResourceLoader.prototype.dedupeThemes = function (themes) {
        var _a, _b, _c;
        var seen = new Map();
        var diagnostics = [];
        for (var _i = 0, themes_1 = themes; _i < themes_1.length; _i++) {
            var t = themes_1[_i];
            var name_1 = (_a = t.name) !== null && _a !== void 0 ? _a : "unnamed";
            var existing = seen.get(name_1);
            if (existing) {
                diagnostics.push({
                    type: "collision",
                    message: "name \"".concat(name_1, "\" collision"),
                    path: t.sourcePath,
                    collision: {
                        resourceType: "theme",
                        name: name_1,
                        winnerPath: (_b = existing.sourcePath) !== null && _b !== void 0 ? _b : "<builtin>",
                        loserPath: (_c = t.sourcePath) !== null && _c !== void 0 ? _c : "<builtin>",
                    },
                });
            }
            else {
                seen.set(name_1, t);
            }
        }
        return { themes: Array.from(seen.values()), diagnostics: diagnostics };
    };
    DefaultResourceLoader.prototype.discoverSystemPromptFile = function () {
        var projectPath = (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "SYSTEM.md");
        if ((0, node_fs_1.existsSync)(projectPath)) {
            return projectPath;
        }
        var globalPath = (0, node_path_1.join)(this.agentDir, "SYSTEM.md");
        if ((0, node_fs_1.existsSync)(globalPath)) {
            return globalPath;
        }
        return undefined;
    };
    DefaultResourceLoader.prototype.discoverAppendSystemPromptFile = function () {
        var projectPath = (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "APPEND_SYSTEM.md");
        if ((0, node_fs_1.existsSync)(projectPath)) {
            return projectPath;
        }
        var globalPath = (0, node_path_1.join)(this.agentDir, "APPEND_SYSTEM.md");
        if ((0, node_fs_1.existsSync)(globalPath)) {
            return globalPath;
        }
        return undefined;
    };
    DefaultResourceLoader.prototype.addDefaultMetadataForPath = function (filePath) {
        if (!filePath || filePath.startsWith("<")) {
            return;
        }
        var normalizedPath = (0, node_path_1.resolve)(filePath);
        if (this.pathMetadata.has(normalizedPath) || this.pathMetadata.has(filePath)) {
            return;
        }
        var agentRoots = [
            (0, node_path_1.join)(this.agentDir, "skills"),
            (0, node_path_1.join)(this.agentDir, "prompts"),
            (0, node_path_1.join)(this.agentDir, "themes"),
            (0, node_path_1.join)(this.agentDir, "extensions"),
        ];
        var projectRoots = [
            (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "skills"),
            (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "prompts"),
            (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "themes"),
            (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "extensions"),
        ];
        for (var _i = 0, agentRoots_1 = agentRoots; _i < agentRoots_1.length; _i++) {
            var root = agentRoots_1[_i];
            if (this.isUnderPath(normalizedPath, root)) {
                this.pathMetadata.set(normalizedPath, { source: "local", scope: "user", origin: "top-level" });
                return;
            }
        }
        for (var _a = 0, projectRoots_1 = projectRoots; _a < projectRoots_1.length; _a++) {
            var root = projectRoots_1[_a];
            if (this.isUnderPath(normalizedPath, root)) {
                this.pathMetadata.set(normalizedPath, { source: "local", scope: "project", origin: "top-level" });
                return;
            }
        }
    };
    DefaultResourceLoader.prototype.isUnderPath = function (target, root) {
        var normalizedRoot = (0, node_path_1.resolve)(root);
        if (target === normalizedRoot) {
            return true;
        }
        var prefix = normalizedRoot.endsWith(node_path_1.sep) ? normalizedRoot : "".concat(normalizedRoot).concat(node_path_1.sep);
        return target.startsWith(prefix);
    };
    DefaultResourceLoader.prototype.detectExtensionConflicts = function (extensions) {
        var conflicts = [];
        // Track which extension registered each tool, command, and flag
        var toolOwners = new Map();
        var commandOwners = new Map();
        var flagOwners = new Map();
        for (var _i = 0, extensions_1 = extensions; _i < extensions_1.length; _i++) {
            var ext = extensions_1[_i];
            // Check tools
            for (var _a = 0, _b = ext.tools.keys(); _a < _b.length; _a++) {
                var toolName = _b[_a];
                var existingOwner = toolOwners.get(toolName);
                if (existingOwner && existingOwner !== ext.path) {
                    conflicts.push({
                        path: ext.path,
                        message: "Tool \"".concat(toolName, "\" conflicts with ").concat(existingOwner),
                    });
                }
                else {
                    toolOwners.set(toolName, ext.path);
                }
            }
            // Check commands
            for (var _c = 0, _d = ext.commands.keys(); _c < _d.length; _c++) {
                var commandName = _d[_c];
                var existingOwner = commandOwners.get(commandName);
                if (existingOwner && existingOwner !== ext.path) {
                    conflicts.push({
                        path: ext.path,
                        message: "Command \"/".concat(commandName, "\" conflicts with ").concat(existingOwner),
                    });
                }
                else {
                    commandOwners.set(commandName, ext.path);
                }
            }
            // Check flags
            for (var _e = 0, _f = ext.flags.keys(); _e < _f.length; _e++) {
                var flagName = _f[_e];
                var existingOwner = flagOwners.get(flagName);
                if (existingOwner && existingOwner !== ext.path) {
                    conflicts.push({
                        path: ext.path,
                        message: "Flag \"--".concat(flagName, "\" conflicts with ").concat(existingOwner),
                    });
                }
                else {
                    flagOwners.set(flagName, ext.path);
                }
            }
        }
        return conflicts;
    };
    return DefaultResourceLoader;
}());
exports.DefaultResourceLoader = DefaultResourceLoader;
