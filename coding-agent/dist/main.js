"use strict";
/**
 * Main entry point for the coding agent CLI.
 *
 * This file handles CLI argument parsing and translates them into
 * createAgentSession() options. The SDK does the heavy lifting.
 */
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
exports.main = main;
var pi_ai_1 = require("@mariozechner/pi-ai");
var chalk_1 = require("chalk");
var readline_1 = require("readline");
var args_js_1 = require("./cli/args.js");
var config_selector_js_1 = require("./cli/config-selector.js");
var file_processor_js_1 = require("./cli/file-processor.js");
var list_models_js_1 = require("./cli/list-models.js");
var session_picker_js_1 = require("./cli/session-picker.js");
var config_js_1 = require("./config.js");
var auth_storage_js_1 = require("./core/auth-storage.js");
var index_js_1 = require("./core/export-html/index.js");
var extension_js_1 = require("./core/goal-driven/extension.js");
var keybindings_js_1 = require("./core/keybindings.js");
var model_registry_js_1 = require("./core/model-registry.js");
var model_resolver_js_1 = require("./core/model-resolver.js");
var package_manager_js_1 = require("./core/package-manager.js");
var resource_loader_js_1 = require("./core/resource-loader.js");
var sdk_js_1 = require("./core/sdk.js");
var session_manager_js_1 = require("./core/session-manager.js");
var settings_manager_js_1 = require("./core/settings-manager.js");
var timings_js_1 = require("./core/timings.js");
var index_js_2 = require("./core/tools/index.js");
var migrations_js_1 = require("./migrations.js");
var index_js_3 = require("./modes/index.js");
var theme_js_1 = require("./modes/interactive/theme/theme.js");
/**
 * Read all content from piped stdin.
 * Returns undefined if stdin is a TTY (interactive terminal).
 */
function readPipedStdin() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // If stdin is a TTY, we're running interactively - don't read stdin
            if (process.stdin.isTTY) {
                return [2 /*return*/, undefined];
            }
            return [2 /*return*/, new Promise(function (resolve) {
                    var data = "";
                    process.stdin.setEncoding("utf8");
                    process.stdin.on("data", function (chunk) {
                        data += chunk;
                    });
                    process.stdin.on("end", function () {
                        resolve(data.trim() || undefined);
                    });
                    process.stdin.resume();
                })];
        });
    });
}
function reportSettingsErrors(settingsManager, context) {
    var errors = settingsManager.drainErrors();
    for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
        var _a = errors_1[_i], scope = _a.scope, error = _a.error;
        console.error(chalk_1.default.yellow("Warning (".concat(context, ", ").concat(scope, " settings): ").concat(error.message)));
        if (error.stack) {
            console.error(chalk_1.default.dim(error.stack));
        }
    }
}
function isTruthyEnvFlag(value) {
    if (!value)
        return false;
    return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}
function getPackageCommandUsage(command) {
    switch (command) {
        case "install":
            return "".concat(config_js_1.APP_NAME, " install <source> [-l]");
        case "remove":
            return "".concat(config_js_1.APP_NAME, " remove <source> [-l]");
        case "update":
            return "".concat(config_js_1.APP_NAME, " update [source]");
        case "list":
            return "".concat(config_js_1.APP_NAME, " list");
    }
}
function printPackageCommandHelp(command) {
    switch (command) {
        case "install":
            console.log("".concat(chalk_1.default.bold("Usage:"), "\n  ").concat(getPackageCommandUsage("install"), "\n\nInstall a package and add it to settings.\n\nOptions:\n  -l, --local    Install project-locally (.pi/settings.json)\n\nExamples:\n  ").concat(config_js_1.APP_NAME, " install npm:@foo/bar\n  ").concat(config_js_1.APP_NAME, " install git:github.com/user/repo\n  ").concat(config_js_1.APP_NAME, " install git:git@github.com:user/repo\n  ").concat(config_js_1.APP_NAME, " install https://github.com/user/repo\n  ").concat(config_js_1.APP_NAME, " install ssh://git@github.com/user/repo\n  ").concat(config_js_1.APP_NAME, " install ./local/path\n"));
            return;
        case "remove":
            console.log("".concat(chalk_1.default.bold("Usage:"), "\n  ").concat(getPackageCommandUsage("remove"), "\n\nRemove a package and its source from settings.\nAlias: ").concat(config_js_1.APP_NAME, " uninstall <source> [-l]\n\nOptions:\n  -l, --local    Remove from project settings (.pi/settings.json)\n\nExamples:\n  ").concat(config_js_1.APP_NAME, " remove npm:@foo/bar\n  ").concat(config_js_1.APP_NAME, " uninstall npm:@foo/bar\n"));
            return;
        case "update":
            console.log("".concat(chalk_1.default.bold("Usage:"), "\n  ").concat(getPackageCommandUsage("update"), "\n\nUpdate installed packages.\nIf <source> is provided, only that package is updated.\n"));
            return;
        case "list":
            console.log("".concat(chalk_1.default.bold("Usage:"), "\n  ").concat(getPackageCommandUsage("list"), "\n\nList installed packages from user and project settings.\n"));
            return;
    }
}
function parsePackageCommand(args) {
    var rawCommand = args[0], rest = args.slice(1);
    var command;
    if (rawCommand === "uninstall") {
        command = "remove";
    }
    else if (rawCommand === "install" || rawCommand === "remove" || rawCommand === "update" || rawCommand === "list") {
        command = rawCommand;
    }
    if (!command) {
        return undefined;
    }
    var local = false;
    var help = false;
    var invalidOption;
    var source;
    for (var _i = 0, rest_1 = rest; _i < rest_1.length; _i++) {
        var arg = rest_1[_i];
        if (arg === "-h" || arg === "--help") {
            help = true;
            continue;
        }
        if (arg === "-l" || arg === "--local") {
            if (command === "install" || command === "remove") {
                local = true;
            }
            else {
                invalidOption = invalidOption !== null && invalidOption !== void 0 ? invalidOption : arg;
            }
            continue;
        }
        if (arg.startsWith("-")) {
            invalidOption = invalidOption !== null && invalidOption !== void 0 ? invalidOption : arg;
            continue;
        }
        if (!source) {
            source = arg;
        }
    }
    return { command: command, source: source, local: local, help: help, invalidOption: invalidOption };
}
function handlePackageCommand(args) {
    return __awaiter(this, void 0, void 0, function () {
        var options, source, cwd, agentDir, settingsManager, packageManager, _a, removed, globalSettings, projectSettings, globalPackages_2, projectPackages, formatPackage, _i, globalPackages_1, pkg, _b, projectPackages_1, pkg, error_1, message;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    options = parsePackageCommand(args);
                    if (!options) {
                        return [2 /*return*/, false];
                    }
                    if (options.help) {
                        printPackageCommandHelp(options.command);
                        return [2 /*return*/, true];
                    }
                    if (options.invalidOption) {
                        console.error(chalk_1.default.red("Unknown option ".concat(options.invalidOption, " for \"").concat(options.command, "\".")));
                        console.error(chalk_1.default.dim("Use \"".concat(config_js_1.APP_NAME, " --help\" or \"").concat(getPackageCommandUsage(options.command), "\".")));
                        process.exitCode = 1;
                        return [2 /*return*/, true];
                    }
                    source = options.source;
                    if ((options.command === "install" || options.command === "remove") && !source) {
                        console.error(chalk_1.default.red("Missing ".concat(options.command, " source.")));
                        console.error(chalk_1.default.dim("Usage: ".concat(getPackageCommandUsage(options.command))));
                        process.exitCode = 1;
                        return [2 /*return*/, true];
                    }
                    cwd = process.cwd();
                    agentDir = (0, config_js_1.getAgentDir)();
                    settingsManager = settings_manager_js_1.SettingsManager.create(cwd, agentDir);
                    reportSettingsErrors(settingsManager, "package command");
                    packageManager = new package_manager_js_1.DefaultPackageManager({ cwd: cwd, agentDir: agentDir, settingsManager: settingsManager });
                    packageManager.setProgressCallback(function (event) {
                        if (event.type === "start") {
                            process.stdout.write(chalk_1.default.dim("".concat(event.message, "\n")));
                        }
                    });
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 10, , 11]);
                    _a = options.command;
                    switch (_a) {
                        case "install": return [3 /*break*/, 2];
                        case "remove": return [3 /*break*/, 4];
                        case "list": return [3 /*break*/, 6];
                        case "update": return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 9];
                case 2: return [4 /*yield*/, packageManager.install(source, { local: options.local })];
                case 3:
                    _e.sent();
                    packageManager.addSourceToSettings(source, { local: options.local });
                    console.log(chalk_1.default.green("Installed ".concat(source)));
                    return [2 /*return*/, true];
                case 4: return [4 /*yield*/, packageManager.remove(source, { local: options.local })];
                case 5:
                    _e.sent();
                    removed = packageManager.removeSourceFromSettings(source, { local: options.local });
                    if (!removed) {
                        console.error(chalk_1.default.red("No matching package found for ".concat(source)));
                        process.exitCode = 1;
                        return [2 /*return*/, true];
                    }
                    console.log(chalk_1.default.green("Removed ".concat(source)));
                    return [2 /*return*/, true];
                case 6:
                    {
                        globalSettings = settingsManager.getGlobalSettings();
                        projectSettings = settingsManager.getProjectSettings();
                        globalPackages_2 = (_c = globalSettings.packages) !== null && _c !== void 0 ? _c : [];
                        projectPackages = (_d = projectSettings.packages) !== null && _d !== void 0 ? _d : [];
                        if (globalPackages_2.length === 0 && projectPackages.length === 0) {
                            console.log(chalk_1.default.dim("No packages installed."));
                            return [2 /*return*/, true];
                        }
                        formatPackage = function (pkg, scope) {
                            var source = typeof pkg === "string" ? pkg : pkg.source;
                            var filtered = typeof pkg === "object";
                            var display = filtered ? "".concat(source, " (filtered)") : source;
                            console.log("  ".concat(display));
                            var path = packageManager.getInstalledPath(source, scope);
                            if (path) {
                                console.log(chalk_1.default.dim("    ".concat(path)));
                            }
                        };
                        if (globalPackages_2.length > 0) {
                            console.log(chalk_1.default.bold("User packages:"));
                            for (_i = 0, globalPackages_1 = globalPackages_2; _i < globalPackages_1.length; _i++) {
                                pkg = globalPackages_1[_i];
                                formatPackage(pkg, "user");
                            }
                        }
                        if (projectPackages.length > 0) {
                            if (globalPackages_2.length > 0)
                                console.log();
                            console.log(chalk_1.default.bold("Project packages:"));
                            for (_b = 0, projectPackages_1 = projectPackages; _b < projectPackages_1.length; _b++) {
                                pkg = projectPackages_1[_b];
                                formatPackage(pkg, "project");
                            }
                        }
                        return [2 /*return*/, true];
                    }
                    _e.label = 7;
                case 7: return [4 /*yield*/, packageManager.update(source)];
                case 8:
                    _e.sent();
                    if (source) {
                        console.log(chalk_1.default.green("Updated ".concat(source)));
                    }
                    else {
                        console.log(chalk_1.default.green("Updated packages"));
                    }
                    return [2 /*return*/, true];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_1 = _e.sent();
                    message = error_1 instanceof Error ? error_1.message : "Unknown package command error";
                    console.error(chalk_1.default.red("Error: ".concat(message)));
                    process.exitCode = 1;
                    return [2 /*return*/, true];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function prepareInitialMessage(parsed, autoResizeImages) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, text, images, initialMessage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (parsed.fileArgs.length === 0) {
                        return [2 /*return*/, {}];
                    }
                    return [4 /*yield*/, (0, file_processor_js_1.processFileArguments)(parsed.fileArgs, { autoResizeImages: autoResizeImages })];
                case 1:
                    _a = _b.sent(), text = _a.text, images = _a.images;
                    if (parsed.messages.length > 0) {
                        initialMessage = text + parsed.messages[0];
                        parsed.messages.shift();
                    }
                    else {
                        initialMessage = text;
                    }
                    return [2 /*return*/, {
                            initialMessage: initialMessage,
                            initialImages: images.length > 0 ? images : undefined,
                        }];
            }
        });
    });
}
/**
 * Resolve a session argument to a file path.
 * If it looks like a path, use as-is. Otherwise try to match as session ID prefix.
 */
function resolveSessionPath(sessionArg, cwd, sessionDir) {
    return __awaiter(this, void 0, void 0, function () {
        var localSessions, localMatches, allSessions, globalMatches, match;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // If it looks like a file path, use as-is
                    if (sessionArg.includes("/") || sessionArg.includes("\\") || sessionArg.endsWith(".jsonl")) {
                        return [2 /*return*/, { type: "path", path: sessionArg }];
                    }
                    return [4 /*yield*/, session_manager_js_1.SessionManager.list(cwd, sessionDir)];
                case 1:
                    localSessions = _a.sent();
                    localMatches = localSessions.filter(function (s) { return s.id.startsWith(sessionArg); });
                    if (localMatches.length >= 1) {
                        return [2 /*return*/, { type: "local", path: localMatches[0].path }];
                    }
                    return [4 /*yield*/, session_manager_js_1.SessionManager.listAll()];
                case 2:
                    allSessions = _a.sent();
                    globalMatches = allSessions.filter(function (s) { return s.id.startsWith(sessionArg); });
                    if (globalMatches.length >= 1) {
                        match = globalMatches[0];
                        return [2 /*return*/, { type: "global", path: match.path, cwd: match.cwd }];
                    }
                    // Not found anywhere
                    return [2 /*return*/, { type: "not_found", arg: sessionArg }];
            }
        });
    });
}
/** Prompt user for yes/no confirmation */
function promptConfirm(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var rl = (0, readline_1.createInterface)({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question("".concat(message, " [y/N] "), function (answer) {
                        rl.close();
                        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
                    });
                })];
        });
    });
}
/** Helper to call CLI-only session_directory handlers before the initial session manager is created */
function callSessionDirectoryHook(extensions, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        var customSessionDir, _i, _a, ext, handlers, _b, handlers_1, handler, event_1, result, err_1, message;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _i = 0, _a = extensions.extensions;
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    ext = _a[_i];
                    handlers = ext.handlers.get("session_directory");
                    if (!handlers || handlers.length === 0)
                        return [3 /*break*/, 7];
                    _b = 0, handlers_1 = handlers;
                    _c.label = 2;
                case 2:
                    if (!(_b < handlers_1.length)) return [3 /*break*/, 7];
                    handler = handlers_1[_b];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    event_1 = { type: "session_directory", cwd: cwd };
                    return [4 /*yield*/, handler(event_1)];
                case 4:
                    result = (_c.sent());
                    if (result === null || result === void 0 ? void 0 : result.sessionDir) {
                        customSessionDir = result.sessionDir;
                    }
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _c.sent();
                    message = err_1 instanceof Error ? err_1.message : String(err_1);
                    console.error(chalk_1.default.red("Extension \"".concat(ext.path, "\" session_directory handler failed: ").concat(message)));
                    return [3 /*break*/, 6];
                case 6:
                    _b++;
                    return [3 /*break*/, 2];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/, customSessionDir];
            }
        });
    });
}
function createSessionManager(parsed, cwd, extensions) {
    return __awaiter(this, void 0, void 0, function () {
        var effectiveSessionDir, resolved, _a, shouldFork;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (parsed.noSession) {
                        return [2 /*return*/, session_manager_js_1.SessionManager.inMemory()];
                    }
                    effectiveSessionDir = parsed.sessionDir;
                    if (!!effectiveSessionDir) return [3 /*break*/, 2];
                    return [4 /*yield*/, callSessionDirectoryHook(extensions, cwd)];
                case 1:
                    effectiveSessionDir = _b.sent();
                    _b.label = 2;
                case 2:
                    if (!parsed.session) return [3 /*break*/, 8];
                    return [4 /*yield*/, resolveSessionPath(parsed.session, cwd, effectiveSessionDir)];
                case 3:
                    resolved = _b.sent();
                    _a = resolved.type;
                    switch (_a) {
                        case "path": return [3 /*break*/, 4];
                        case "local": return [3 /*break*/, 4];
                        case "global": return [3 /*break*/, 5];
                        case "not_found": return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 8];
                case 4: return [2 /*return*/, session_manager_js_1.SessionManager.open(resolved.path, effectiveSessionDir)];
                case 5:
                    // Session found in different project - ask user if they want to fork
                    console.log(chalk_1.default.yellow("Session found in different project: ".concat(resolved.cwd)));
                    return [4 /*yield*/, promptConfirm("Fork this session into current directory?")];
                case 6:
                    shouldFork = _b.sent();
                    if (!shouldFork) {
                        console.log(chalk_1.default.dim("Aborted."));
                        process.exit(0);
                    }
                    return [2 /*return*/, session_manager_js_1.SessionManager.forkFrom(resolved.path, cwd, effectiveSessionDir)];
                case 7:
                    console.error(chalk_1.default.red("No session found matching '".concat(resolved.arg, "'")));
                    process.exit(1);
                    _b.label = 8;
                case 8:
                    if (parsed.continue) {
                        return [2 /*return*/, session_manager_js_1.SessionManager.continueRecent(cwd, effectiveSessionDir)];
                    }
                    // --resume is handled separately (needs picker UI)
                    // If effective session dir is set, create new session there
                    if (effectiveSessionDir) {
                        return [2 /*return*/, session_manager_js_1.SessionManager.create(cwd, effectiveSessionDir)];
                    }
                    // Default case (new session) returns undefined, SDK will create one
                    return [2 /*return*/, undefined];
            }
        });
    });
}
function buildSessionOptions(parsed, scopedModels, sessionManager, modelRegistry, settingsManager) {
    var options = {};
    var cliThinkingFromModel = false;
    if (sessionManager) {
        options.sessionManager = sessionManager;
    }
    // Model from CLI
    // - supports --provider <name> --model <pattern>
    // - supports --model <provider>/<pattern>
    if (parsed.model) {
        var resolved = (0, model_resolver_js_1.resolveCliModel)({
            cliProvider: parsed.provider,
            cliModel: parsed.model,
            modelRegistry: modelRegistry,
        });
        if (resolved.warning) {
            console.warn(chalk_1.default.yellow("Warning: ".concat(resolved.warning)));
        }
        if (resolved.error) {
            console.error(chalk_1.default.red(resolved.error));
            process.exit(1);
        }
        if (resolved.model) {
            options.model = resolved.model;
            // Allow "--model <pattern>:<thinking>" as a shorthand.
            // Explicit --thinking still takes precedence (applied later).
            if (!parsed.thinking && resolved.thinkingLevel) {
                options.thinkingLevel = resolved.thinkingLevel;
                cliThinkingFromModel = true;
            }
        }
    }
    if (!options.model && scopedModels.length > 0 && !parsed.continue && !parsed.resume) {
        // Check if saved default is in scoped models - use it if so, otherwise first scoped model
        var savedProvider = settingsManager.getDefaultProvider();
        var savedModelId = settingsManager.getDefaultModel();
        var savedModel_1 = savedProvider && savedModelId ? modelRegistry.find(savedProvider, savedModelId) : undefined;
        var savedInScope = savedModel_1 ? scopedModels.find(function (sm) { return (0, pi_ai_1.modelsAreEqual)(sm.model, savedModel_1); }) : undefined;
        if (savedInScope) {
            options.model = savedInScope.model;
            // Use thinking level from scoped model config if explicitly set
            if (!parsed.thinking && savedInScope.thinkingLevel) {
                options.thinkingLevel = savedInScope.thinkingLevel;
            }
        }
        else {
            options.model = scopedModels[0].model;
            // Use thinking level from first scoped model if explicitly set
            if (!parsed.thinking && scopedModels[0].thinkingLevel) {
                options.thinkingLevel = scopedModels[0].thinkingLevel;
            }
        }
    }
    // Thinking level from CLI (takes precedence over scoped model thinking levels set above)
    if (parsed.thinking) {
        options.thinkingLevel = parsed.thinking;
    }
    // Scoped models for Ctrl+P cycling
    // Keep thinking level undefined when not explicitly set in the model pattern.
    // Undefined means "inherit current session thinking level" during cycling.
    if (scopedModels.length > 0) {
        options.scopedModels = scopedModels.map(function (sm) { return ({
            model: sm.model,
            thinkingLevel: sm.thinkingLevel,
        }); });
    }
    // API key from CLI - set in authStorage
    // (handled by caller before createAgentSession)
    // Tools
    if (parsed.noTools) {
        // --no-tools: start with no built-in tools
        // --tools can still add specific ones back
        if (parsed.tools && parsed.tools.length > 0) {
            options.tools = parsed.tools.map(function (name) { return index_js_2.allTools[name]; });
        }
        else {
            options.tools = [];
        }
    }
    else if (parsed.tools) {
        options.tools = parsed.tools.map(function (name) { return index_js_2.allTools[name]; });
    }
    return { options: options, cliThinkingFromModel: cliThinkingFromModel };
}
function handleConfigCommand(args) {
    return __awaiter(this, void 0, void 0, function () {
        var cwd, agentDir, settingsManager, packageManager, resolvedPaths;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (args[0] !== "config") {
                        return [2 /*return*/, false];
                    }
                    cwd = process.cwd();
                    agentDir = (0, config_js_1.getAgentDir)();
                    settingsManager = settings_manager_js_1.SettingsManager.create(cwd, agentDir);
                    reportSettingsErrors(settingsManager, "config command");
                    packageManager = new package_manager_js_1.DefaultPackageManager({ cwd: cwd, agentDir: agentDir, settingsManager: settingsManager });
                    return [4 /*yield*/, packageManager.resolve()];
                case 1:
                    resolvedPaths = _a.sent();
                    return [4 /*yield*/, (0, config_selector_js_1.selectConfig)({
                            resolvedPaths: resolvedPaths,
                            settingsManager: settingsManager,
                            cwd: cwd,
                            agentDir: agentDir,
                        })];
                case 2:
                    _a.sent();
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
function main(args) {
    return __awaiter(this, void 0, void 0, function () {
        var offlineMode, _a, migratedProviders, deprecationWarnings, firstPass, cwd, agentDir, settingsManager, authStorage, modelRegistry, resourceLoader, extensionsResult, _i, _b, _c, path, error, _d, _e, _f, name_1, config, extensionFlags, _g, _h, ext, _j, _k, _l, name_2, flag, parsed, _m, _o, _p, name_3, value, searchPattern, stdinContent, result, outputPath, error_2, message, _q, initialMessage, initialImages, isInteractive, mode, scopedModels, modelPatterns, sessionManager, effectiveSessionDir_1, _r, selectedPath, _s, sessionOptions, cliThinkingFromModel, _t, session, modelFallbackMessage, cliThinkingOverride, effectiveThinking, modelList, mode_1;
        var _u;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    offlineMode = args.includes("--offline") || isTruthyEnvFlag(process.env.PI_OFFLINE);
                    if (offlineMode) {
                        process.env.PI_OFFLINE = "1";
                        process.env.PI_SKIP_VERSION_CHECK = "1";
                    }
                    return [4 /*yield*/, handlePackageCommand(args)];
                case 1:
                    if (_v.sent()) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, handleConfigCommand(args)];
                case 2:
                    if (_v.sent()) {
                        return [2 /*return*/];
                    }
                    _a = (0, migrations_js_1.runMigrations)(process.cwd()), migratedProviders = _a.migratedAuthProviders, deprecationWarnings = _a.deprecationWarnings;
                    firstPass = (0, args_js_1.parseArgs)(args);
                    cwd = process.cwd();
                    agentDir = (0, config_js_1.getAgentDir)();
                    settingsManager = settings_manager_js_1.SettingsManager.create(cwd, agentDir);
                    reportSettingsErrors(settingsManager, "startup");
                    authStorage = auth_storage_js_1.AuthStorage.create();
                    modelRegistry = new model_registry_js_1.ModelRegistry(authStorage, (0, config_js_1.getModelsPath)());
                    resourceLoader = new resource_loader_js_1.DefaultResourceLoader({
                        cwd: cwd,
                        agentDir: agentDir,
                        settingsManager: settingsManager,
                        extensionFactories: [extension_js_1.default],
                        additionalExtensionPaths: firstPass.extensions,
                        additionalSkillPaths: firstPass.skills,
                        additionalPromptTemplatePaths: firstPass.promptTemplates,
                        additionalThemePaths: firstPass.themes,
                        noExtensions: firstPass.noExtensions,
                        noSkills: firstPass.noSkills,
                        noPromptTemplates: firstPass.noPromptTemplates,
                        noThemes: firstPass.noThemes,
                        systemPrompt: firstPass.systemPrompt,
                        appendSystemPrompt: firstPass.appendSystemPrompt,
                    });
                    return [4 /*yield*/, resourceLoader.reload()];
                case 3:
                    _v.sent();
                    (0, timings_js_1.time)("resourceLoader.reload");
                    extensionsResult = resourceLoader.getExtensions();
                    for (_i = 0, _b = extensionsResult.errors; _i < _b.length; _i++) {
                        _c = _b[_i], path = _c.path, error = _c.error;
                        console.error(chalk_1.default.red("Failed to load extension \"".concat(path, "\": ").concat(error)));
                    }
                    // Apply pending provider registrations from extensions immediately
                    // so they're available for model resolution before AgentSession is created
                    for (_d = 0, _e = extensionsResult.runtime.pendingProviderRegistrations; _d < _e.length; _d++) {
                        _f = _e[_d], name_1 = _f.name, config = _f.config;
                        modelRegistry.registerProvider(name_1, config);
                    }
                    extensionsResult.runtime.pendingProviderRegistrations = [];
                    extensionFlags = new Map();
                    for (_g = 0, _h = extensionsResult.extensions; _g < _h.length; _g++) {
                        ext = _h[_g];
                        for (_j = 0, _k = ext.flags; _j < _k.length; _j++) {
                            _l = _k[_j], name_2 = _l[0], flag = _l[1];
                            extensionFlags.set(name_2, { type: flag.type });
                        }
                    }
                    parsed = (0, args_js_1.parseArgs)(args, extensionFlags);
                    // Pass flag values to extensions via runtime
                    for (_m = 0, _o = parsed.unknownFlags; _m < _o.length; _m++) {
                        _p = _o[_m], name_3 = _p[0], value = _p[1];
                        extensionsResult.runtime.flagValues.set(name_3, value);
                    }
                    if (parsed.version) {
                        console.log(config_js_1.VERSION);
                        process.exit(0);
                    }
                    if (parsed.help) {
                        (0, args_js_1.printHelp)();
                        process.exit(0);
                    }
                    if (!(parsed.listModels !== undefined)) return [3 /*break*/, 5];
                    searchPattern = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
                    return [4 /*yield*/, (0, list_models_js_1.listModels)(modelRegistry, searchPattern)];
                case 4:
                    _v.sent();
                    process.exit(0);
                    _v.label = 5;
                case 5:
                    if (!(parsed.mode !== "rpc")) return [3 /*break*/, 7];
                    return [4 /*yield*/, readPipedStdin()];
                case 6:
                    stdinContent = _v.sent();
                    if (stdinContent !== undefined) {
                        // Force print mode since interactive mode requires a TTY for keyboard input
                        parsed.print = true;
                        // Prepend stdin content to messages
                        parsed.messages.unshift(stdinContent);
                    }
                    _v.label = 7;
                case 7:
                    if (!parsed.export) return [3 /*break*/, 12];
                    result = void 0;
                    _v.label = 8;
                case 8:
                    _v.trys.push([8, 10, , 11]);
                    outputPath = parsed.messages.length > 0 ? parsed.messages[0] : undefined;
                    return [4 /*yield*/, (0, index_js_1.exportFromFile)(parsed.export, outputPath)];
                case 9:
                    result = _v.sent();
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _v.sent();
                    message = error_2 instanceof Error ? error_2.message : "Failed to export session";
                    console.error(chalk_1.default.red("Error: ".concat(message)));
                    process.exit(1);
                    return [3 /*break*/, 11];
                case 11:
                    console.log("Exported to: ".concat(result));
                    process.exit(0);
                    _v.label = 12;
                case 12:
                    if (parsed.mode === "rpc" && parsed.fileArgs.length > 0) {
                        console.error(chalk_1.default.red("Error: @file arguments are not supported in RPC mode"));
                        process.exit(1);
                    }
                    return [4 /*yield*/, prepareInitialMessage(parsed, settingsManager.getImageAutoResize())];
                case 13:
                    _q = _v.sent(), initialMessage = _q.initialMessage, initialImages = _q.initialImages;
                    isInteractive = !parsed.print && parsed.mode === undefined;
                    mode = parsed.mode || "text";
                    (0, theme_js_1.initTheme)(settingsManager.getTheme(), isInteractive);
                    if (!(isInteractive && deprecationWarnings.length > 0)) return [3 /*break*/, 15];
                    return [4 /*yield*/, (0, migrations_js_1.showDeprecationWarnings)(deprecationWarnings)];
                case 14:
                    _v.sent();
                    _v.label = 15;
                case 15:
                    scopedModels = [];
                    modelPatterns = (_u = parsed.models) !== null && _u !== void 0 ? _u : settingsManager.getEnabledModels();
                    if (!(modelPatterns && modelPatterns.length > 0)) return [3 /*break*/, 17];
                    return [4 /*yield*/, (0, model_resolver_js_1.resolveModelScope)(modelPatterns, modelRegistry)];
                case 16:
                    scopedModels = _v.sent();
                    _v.label = 17;
                case 17: return [4 /*yield*/, createSessionManager(parsed, cwd, extensionsResult)];
                case 18:
                    sessionManager = _v.sent();
                    if (!parsed.resume) return [3 /*break*/, 22];
                    // Initialize keybindings so session picker respects user config
                    keybindings_js_1.KeybindingsManager.create();
                    _r = parsed.sessionDir;
                    if (_r) return [3 /*break*/, 20];
                    return [4 /*yield*/, callSessionDirectoryHook(extensionsResult, cwd)];
                case 19:
                    _r = (_v.sent());
                    _v.label = 20;
                case 20:
                    effectiveSessionDir_1 = _r;
                    return [4 /*yield*/, (0, session_picker_js_1.selectSession)(function (onProgress) { return session_manager_js_1.SessionManager.list(cwd, effectiveSessionDir_1, onProgress); }, session_manager_js_1.SessionManager.listAll)];
                case 21:
                    selectedPath = _v.sent();
                    if (!selectedPath) {
                        console.log(chalk_1.default.dim("No session selected"));
                        (0, theme_js_1.stopThemeWatcher)();
                        process.exit(0);
                    }
                    sessionManager = session_manager_js_1.SessionManager.open(selectedPath, effectiveSessionDir_1);
                    _v.label = 22;
                case 22:
                    _s = buildSessionOptions(parsed, scopedModels, sessionManager, modelRegistry, settingsManager), sessionOptions = _s.options, cliThinkingFromModel = _s.cliThinkingFromModel;
                    sessionOptions.authStorage = authStorage;
                    sessionOptions.modelRegistry = modelRegistry;
                    sessionOptions.resourceLoader = resourceLoader;
                    // Handle CLI --api-key as runtime override (not persisted)
                    if (parsed.apiKey) {
                        if (!sessionOptions.model) {
                            console.error(chalk_1.default.red("--api-key requires a model to be specified via --model, --provider/--model, or --models"));
                            process.exit(1);
                        }
                        authStorage.setRuntimeApiKey(sessionOptions.model.provider, parsed.apiKey);
                    }
                    return [4 /*yield*/, (0, sdk_js_1.createAgentSession)(sessionOptions)];
                case 23:
                    _t = _v.sent(), session = _t.session, modelFallbackMessage = _t.modelFallbackMessage;
                    if (!isInteractive && !session.model) {
                        console.error(chalk_1.default.red("No models available."));
                        console.error(chalk_1.default.yellow("\nSet an API key environment variable:"));
                        console.error("  ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, etc.");
                        console.error(chalk_1.default.yellow("\nOr create ".concat((0, config_js_1.getModelsPath)())));
                        process.exit(1);
                    }
                    cliThinkingOverride = parsed.thinking !== undefined || cliThinkingFromModel;
                    if (session.model && cliThinkingOverride) {
                        effectiveThinking = session.thinkingLevel;
                        if (!session.model.reasoning) {
                            effectiveThinking = "off";
                        }
                        else if (effectiveThinking === "xhigh" && !(0, pi_ai_1.supportsXhigh)(session.model)) {
                            effectiveThinking = "high";
                        }
                        if (effectiveThinking !== session.thinkingLevel) {
                            session.setThinkingLevel(effectiveThinking);
                        }
                    }
                    if (!(mode === "rpc")) return [3 /*break*/, 25];
                    return [4 /*yield*/, (0, index_js_3.runRpcMode)(session)];
                case 24:
                    _v.sent();
                    return [3 /*break*/, 31];
                case 25:
                    if (!isInteractive) return [3 /*break*/, 27];
                    if (scopedModels.length > 0 && (parsed.verbose || !settingsManager.getQuietStartup())) {
                        modelList = scopedModels
                            .map(function (sm) {
                            var thinkingStr = sm.thinkingLevel ? ":".concat(sm.thinkingLevel) : "";
                            return "".concat(sm.model.id).concat(thinkingStr);
                        })
                            .join(", ");
                        console.log(chalk_1.default.dim("Model scope: ".concat(modelList, " ").concat(chalk_1.default.gray("(Ctrl+P to cycle)"))));
                    }
                    (0, timings_js_1.printTimings)();
                    mode_1 = new index_js_3.InteractiveMode(session, {
                        migratedProviders: migratedProviders,
                        modelFallbackMessage: modelFallbackMessage,
                        initialMessage: initialMessage,
                        initialImages: initialImages,
                        initialMessages: parsed.messages,
                        verbose: parsed.verbose,
                    });
                    return [4 /*yield*/, mode_1.run()];
                case 26:
                    _v.sent();
                    return [3 /*break*/, 31];
                case 27: return [4 /*yield*/, (0, index_js_3.runPrintMode)(session, {
                        mode: mode,
                        messages: parsed.messages,
                        initialMessage: initialMessage,
                        initialImages: initialImages,
                    })];
                case 28:
                    _v.sent();
                    (0, theme_js_1.stopThemeWatcher)();
                    if (!(process.stdout.writableLength > 0)) return [3 /*break*/, 30];
                    return [4 /*yield*/, new Promise(function (resolve) { return process.stdout.once("drain", resolve); })];
                case 29:
                    _v.sent();
                    _v.label = 30;
                case 30:
                    process.exit(0);
                    _v.label = 31;
                case 31: return [2 /*return*/];
            }
        });
    });
}
