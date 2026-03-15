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
exports.KeybindingsManager = exports.DEFAULT_KEYBINDINGS = exports.DEFAULT_APP_KEYBINDINGS = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var fs_1 = require("fs");
var path_1 = require("path");
var config_js_1 = require("../config.js");
/**
 * Default application keybindings.
 */
exports.DEFAULT_APP_KEYBINDINGS = {
    interrupt: "escape",
    clear: "ctrl+c",
    exit: "ctrl+d",
    suspend: "ctrl+z",
    cycleThinkingLevel: "shift+tab",
    cycleModelForward: "ctrl+p",
    cycleModelBackward: "shift+ctrl+p",
    selectModel: "ctrl+l",
    expandTools: "ctrl+o",
    toggleThinking: "ctrl+t",
    toggleSessionNamedFilter: "ctrl+n",
    externalEditor: "ctrl+g",
    followUp: "alt+enter",
    dequeue: "alt+up",
    pasteImage: process.platform === "win32" ? "alt+v" : "ctrl+v",
    newSession: [],
    tree: [],
    fork: [],
    resume: [],
};
/**
 * All default keybindings (app + editor).
 */
exports.DEFAULT_KEYBINDINGS = __assign(__assign({}, pi_tui_1.DEFAULT_EDITOR_KEYBINDINGS), exports.DEFAULT_APP_KEYBINDINGS);
// App actions list for type checking
var APP_ACTIONS = [
    "interrupt",
    "clear",
    "exit",
    "suspend",
    "cycleThinkingLevel",
    "cycleModelForward",
    "cycleModelBackward",
    "selectModel",
    "expandTools",
    "toggleThinking",
    "toggleSessionNamedFilter",
    "externalEditor",
    "followUp",
    "dequeue",
    "pasteImage",
    "newSession",
    "tree",
    "fork",
    "resume",
];
function isAppAction(action) {
    return APP_ACTIONS.includes(action);
}
/**
 * Manages all keybindings (app + editor).
 */
var KeybindingsManager = /** @class */ (function () {
    function KeybindingsManager(config) {
        this.config = config;
        this.appActionToKeys = new Map();
        this.buildMaps();
    }
    /**
     * Create from config file and set up editor keybindings.
     */
    KeybindingsManager.create = function (agentDir) {
        if (agentDir === void 0) { agentDir = (0, config_js_1.getAgentDir)(); }
        var configPath = (0, path_1.join)(agentDir, "keybindings.json");
        var config = KeybindingsManager.loadFromFile(configPath);
        var manager = new KeybindingsManager(config);
        // Set up editor keybindings globally
        // Include both editor actions and expandTools (shared between app and editor)
        var editorConfig = {};
        for (var _i = 0, _a = Object.entries(config); _i < _a.length; _i++) {
            var _b = _a[_i], action = _b[0], keys = _b[1];
            if (!isAppAction(action) || action === "expandTools") {
                editorConfig[action] = keys;
            }
        }
        (0, pi_tui_1.setEditorKeybindings)(new pi_tui_1.EditorKeybindingsManager(editorConfig));
        return manager;
    };
    /**
     * Create in-memory.
     */
    KeybindingsManager.inMemory = function (config) {
        if (config === void 0) { config = {}; }
        return new KeybindingsManager(config);
    };
    KeybindingsManager.loadFromFile = function (path) {
        if (!(0, fs_1.existsSync)(path))
            return {};
        try {
            return JSON.parse((0, fs_1.readFileSync)(path, "utf-8"));
        }
        catch (_a) {
            return {};
        }
    };
    KeybindingsManager.prototype.buildMaps = function () {
        this.appActionToKeys.clear();
        // Set defaults for app actions
        for (var _i = 0, _a = Object.entries(exports.DEFAULT_APP_KEYBINDINGS); _i < _a.length; _i++) {
            var _b = _a[_i], action = _b[0], keys = _b[1];
            var keyArray = Array.isArray(keys) ? keys : [keys];
            this.appActionToKeys.set(action, __spreadArray([], keyArray, true));
        }
        // Override with user config (app actions only)
        for (var _c = 0, _d = Object.entries(this.config); _c < _d.length; _c++) {
            var _e = _d[_c], action = _e[0], keys = _e[1];
            if (keys === undefined || !isAppAction(action))
                continue;
            var keyArray = Array.isArray(keys) ? keys : [keys];
            this.appActionToKeys.set(action, keyArray);
        }
    };
    /**
     * Check if input matches an app action.
     */
    KeybindingsManager.prototype.matches = function (data, action) {
        var keys = this.appActionToKeys.get(action);
        if (!keys)
            return false;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            if ((0, pi_tui_1.matchesKey)(data, key))
                return true;
        }
        return false;
    };
    /**
     * Get keys bound to an app action.
     */
    KeybindingsManager.prototype.getKeys = function (action) {
        var _a;
        return (_a = this.appActionToKeys.get(action)) !== null && _a !== void 0 ? _a : [];
    };
    /**
     * Get the full effective config.
     */
    KeybindingsManager.prototype.getEffectiveConfig = function () {
        var result = __assign({}, exports.DEFAULT_KEYBINDINGS);
        for (var _i = 0, _a = Object.entries(this.config); _i < _a.length; _i++) {
            var _b = _a[_i], action = _b[0], keys = _b[1];
            if (keys !== undefined) {
                result[action] = keys;
            }
        }
        return result;
    };
    return KeybindingsManager;
}());
exports.KeybindingsManager = KeybindingsManager;
