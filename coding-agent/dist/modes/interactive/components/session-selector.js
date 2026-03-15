"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.SessionSelectorComponent = void 0;
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var os = require("node:os");
var pi_tui_1 = require("@mariozechner/pi-tui");
var keybindings_js_1 = require("../../../core/keybindings.js");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var session_selector_search_js_1 = require("./session-selector-search.js");
function shortenPath(path) {
    var home = os.homedir();
    if (!path)
        return path;
    if (path.startsWith(home)) {
        return "~".concat(path.slice(home.length));
    }
    return path;
}
function formatSessionDate(date) {
    var now = new Date();
    var diffMs = now.getTime() - date.getTime();
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMs / 3600000);
    var diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return "now";
    if (diffMins < 60)
        return "".concat(diffMins, "m");
    if (diffHours < 24)
        return "".concat(diffHours, "h");
    if (diffDays < 7)
        return "".concat(diffDays, "d");
    if (diffDays < 30)
        return "".concat(Math.floor(diffDays / 7), "w");
    if (diffDays < 365)
        return "".concat(Math.floor(diffDays / 30), "mo");
    return "".concat(Math.floor(diffDays / 365), "y");
}
var SessionSelectorHeader = /** @class */ (function () {
    function SessionSelectorHeader(scope, sortMode, nameFilter, keybindings, requestRender) {
        this.loading = false;
        this.loadProgress = null;
        this.showPath = false;
        this.confirmingDeletePath = null;
        this.statusMessage = null;
        this.statusTimeout = null;
        this.showRenameHint = false;
        this.scope = scope;
        this.sortMode = sortMode;
        this.nameFilter = nameFilter;
        this.keybindings = keybindings;
        this.requestRender = requestRender;
    }
    SessionSelectorHeader.prototype.setScope = function (scope) {
        this.scope = scope;
    };
    SessionSelectorHeader.prototype.setSortMode = function (sortMode) {
        this.sortMode = sortMode;
    };
    SessionSelectorHeader.prototype.setNameFilter = function (nameFilter) {
        this.nameFilter = nameFilter;
    };
    SessionSelectorHeader.prototype.setLoading = function (loading) {
        this.loading = loading;
        // Progress is scoped to the current load; clear whenever the loading state is set
        this.loadProgress = null;
    };
    SessionSelectorHeader.prototype.setProgress = function (loaded, total) {
        this.loadProgress = { loaded: loaded, total: total };
    };
    SessionSelectorHeader.prototype.setShowPath = function (showPath) {
        this.showPath = showPath;
    };
    SessionSelectorHeader.prototype.setShowRenameHint = function (show) {
        this.showRenameHint = show;
    };
    SessionSelectorHeader.prototype.setConfirmingDeletePath = function (path) {
        this.confirmingDeletePath = path;
    };
    SessionSelectorHeader.prototype.clearStatusTimeout = function () {
        if (!this.statusTimeout)
            return;
        clearTimeout(this.statusTimeout);
        this.statusTimeout = null;
    };
    SessionSelectorHeader.prototype.setStatusMessage = function (msg, autoHideMs) {
        var _this = this;
        this.clearStatusTimeout();
        this.statusMessage = msg;
        if (!msg || !autoHideMs)
            return;
        this.statusTimeout = setTimeout(function () {
            _this.statusMessage = null;
            _this.statusTimeout = null;
            _this.requestRender();
        }, autoHideMs);
    };
    SessionSelectorHeader.prototype.invalidate = function () { };
    SessionSelectorHeader.prototype.render = function (width) {
        var title = this.scope === "current" ? "Resume Session (Current Folder)" : "Resume Session (All)";
        var leftText = theme_js_1.theme.bold(title);
        var sortLabel = this.sortMode === "threaded" ? "Threaded" : this.sortMode === "recent" ? "Recent" : "Fuzzy";
        var sortText = theme_js_1.theme.fg("muted", "Sort: ") + theme_js_1.theme.fg("accent", sortLabel);
        var nameLabel = this.nameFilter === "all" ? "All" : "Named";
        var nameText = theme_js_1.theme.fg("muted", "Name: ") + theme_js_1.theme.fg("accent", nameLabel);
        var scopeText;
        if (this.loading) {
            var progressText = this.loadProgress ? "".concat(this.loadProgress.loaded, "/").concat(this.loadProgress.total) : "...";
            scopeText = "".concat(theme_js_1.theme.fg("muted", "○ Current Folder | ")).concat(theme_js_1.theme.fg("accent", "Loading ".concat(progressText)));
        }
        else if (this.scope === "current") {
            scopeText = "".concat(theme_js_1.theme.fg("accent", "◉ Current Folder")).concat(theme_js_1.theme.fg("muted", " | ○ All"));
        }
        else {
            scopeText = "".concat(theme_js_1.theme.fg("muted", "○ Current Folder | ")).concat(theme_js_1.theme.fg("accent", "◉ All"));
        }
        var rightText = (0, pi_tui_1.truncateToWidth)("".concat(scopeText, "  ").concat(nameText, "  ").concat(sortText), width, "");
        var availableLeft = Math.max(0, width - (0, pi_tui_1.visibleWidth)(rightText) - 1);
        var left = (0, pi_tui_1.truncateToWidth)(leftText, availableLeft, "");
        var spacing = Math.max(0, width - (0, pi_tui_1.visibleWidth)(left) - (0, pi_tui_1.visibleWidth)(rightText));
        // Build hint lines - changes based on state (all branches truncate to width)
        var hintLine1;
        var hintLine2;
        if (this.confirmingDeletePath !== null) {
            var confirmHint = "Delete session? [Enter] confirm · [Esc/Ctrl+C] cancel";
            hintLine1 = theme_js_1.theme.fg("error", (0, pi_tui_1.truncateToWidth)(confirmHint, width, "…"));
            hintLine2 = "";
        }
        else if (this.statusMessage) {
            var color = this.statusMessage.type === "error" ? "error" : "accent";
            hintLine1 = theme_js_1.theme.fg(color, (0, pi_tui_1.truncateToWidth)(this.statusMessage.message, width, "…"));
            hintLine2 = "";
        }
        else {
            var pathState = this.showPath ? "(on)" : "(off)";
            var sep = theme_js_1.theme.fg("muted", " · ");
            var hint1 = (0, keybinding_hints_js_1.keyHint)("tab", "scope") + sep + theme_js_1.theme.fg("muted", 're:<pattern> regex · "phrase" exact');
            var hint2Parts = [
                (0, keybinding_hints_js_1.keyHint)("toggleSessionSort", "sort"),
                (0, keybinding_hints_js_1.appKeyHint)(this.keybindings, "toggleSessionNamedFilter", "named"),
                (0, keybinding_hints_js_1.keyHint)("deleteSession", "delete"),
                (0, keybinding_hints_js_1.keyHint)("toggleSessionPath", "path ".concat(pathState)),
            ];
            if (this.showRenameHint) {
                hint2Parts.push((0, keybinding_hints_js_1.keyHint)("renameSession", "rename"));
            }
            var hint2 = hint2Parts.join(sep);
            hintLine1 = (0, pi_tui_1.truncateToWidth)(hint1, width, "…");
            hintLine2 = (0, pi_tui_1.truncateToWidth)(hint2, width, "…");
        }
        return ["".concat(left).concat(" ".repeat(spacing)).concat(rightText), hintLine1, hintLine2];
    };
    return SessionSelectorHeader;
}());
/**
 * Build a tree structure from sessions based on parentSessionPath.
 * Returns root nodes sorted by modified date (descending).
 */
function buildSessionTree(sessions) {
    var byPath = new Map();
    for (var _i = 0, sessions_1 = sessions; _i < sessions_1.length; _i++) {
        var session = sessions_1[_i];
        byPath.set(session.path, { session: session, children: [] });
    }
    var roots = [];
    for (var _a = 0, sessions_2 = sessions; _a < sessions_2.length; _a++) {
        var session = sessions_2[_a];
        var node = byPath.get(session.path);
        var parentPath = session.parentSessionPath;
        if (parentPath && byPath.has(parentPath)) {
            byPath.get(parentPath).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    // Sort children and roots by modified date (descending)
    var sortNodes = function (nodes) {
        nodes.sort(function (a, b) { return b.session.modified.getTime() - a.session.modified.getTime(); });
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            sortNodes(node.children);
        }
    };
    sortNodes(roots);
    return roots;
}
/**
 * Flatten tree into display list with tree structure metadata.
 */
function flattenSessionTree(roots) {
    var result = [];
    var walk = function (node, depth, ancestorContinues, isLast) {
        result.push({ session: node.session, depth: depth, isLast: isLast, ancestorContinues: ancestorContinues });
        for (var i = 0; i < node.children.length; i++) {
            var childIsLast = i === node.children.length - 1;
            // Only show continuation line for non-root ancestors
            var continues = depth > 0 ? !isLast : false;
            walk(node.children[i], depth + 1, __spreadArray(__spreadArray([], ancestorContinues, true), [continues], false), childIsLast);
        }
    };
    for (var i = 0; i < roots.length; i++) {
        walk(roots[i], 0, [], i === roots.length - 1);
    }
    return result;
}
/**
 * Custom session list component with multi-line items and search
 */
var SessionList = /** @class */ (function () {
    function SessionList(sessions, showCwd, sortMode, nameFilter, keybindings, currentSessionFilePath) {
        var _this = this;
        this.allSessions = [];
        this.filteredSessions = [];
        this.selectedIndex = 0;
        this.showCwd = false;
        this.sortMode = "threaded";
        this.nameFilter = "all";
        this.showPath = false;
        this.confirmingDeletePath = null;
        this.onExit = function () { };
        this.maxVisible = 10; // Max sessions visible (one line each)
        // Focusable implementation - propagate to searchInput for IME cursor positioning
        this._focused = false;
        this.allSessions = sessions;
        this.filteredSessions = [];
        this.searchInput = new pi_tui_1.Input();
        this.showCwd = showCwd;
        this.sortMode = sortMode;
        this.nameFilter = nameFilter;
        this.keybindings = keybindings;
        this.currentSessionFilePath = currentSessionFilePath;
        this.filterSessions("");
        // Handle Enter in search input - select current item
        this.searchInput.onSubmit = function () {
            if (_this.filteredSessions[_this.selectedIndex]) {
                var selected = _this.filteredSessions[_this.selectedIndex];
                if (_this.onSelect) {
                    _this.onSelect(selected.session.path);
                }
            }
        };
    }
    SessionList.prototype.getSelectedSessionPath = function () {
        var selected = this.filteredSessions[this.selectedIndex];
        return selected === null || selected === void 0 ? void 0 : selected.session.path;
    };
    Object.defineProperty(SessionList.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.searchInput.focused = value;
        },
        enumerable: false,
        configurable: true
    });
    SessionList.prototype.setSortMode = function (sortMode) {
        this.sortMode = sortMode;
        this.filterSessions(this.searchInput.getValue());
    };
    SessionList.prototype.setNameFilter = function (nameFilter) {
        this.nameFilter = nameFilter;
        this.filterSessions(this.searchInput.getValue());
    };
    SessionList.prototype.setSessions = function (sessions, showCwd) {
        this.allSessions = sessions;
        this.showCwd = showCwd;
        this.filterSessions(this.searchInput.getValue());
    };
    SessionList.prototype.filterSessions = function (query) {
        var trimmed = query.trim();
        var nameFiltered = this.nameFilter === "all" ? this.allSessions : this.allSessions.filter(function (session) { return (0, session_selector_search_js_1.hasSessionName)(session); });
        if (this.sortMode === "threaded" && !trimmed) {
            // Threaded mode without search: show tree structure
            var roots = buildSessionTree(nameFiltered);
            this.filteredSessions = flattenSessionTree(roots);
        }
        else {
            // Other modes or with search: flat list
            var filtered = (0, session_selector_search_js_1.filterAndSortSessions)(nameFiltered, query, this.sortMode, "all");
            this.filteredSessions = filtered.map(function (session) { return ({
                session: session,
                depth: 0,
                isLast: true,
                ancestorContinues: [],
            }); });
        }
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredSessions.length - 1));
    };
    SessionList.prototype.setConfirmingDeletePath = function (path) {
        var _a;
        this.confirmingDeletePath = path;
        (_a = this.onDeleteConfirmationChange) === null || _a === void 0 ? void 0 : _a.call(this, path);
    };
    SessionList.prototype.startDeleteConfirmationForSelectedSession = function () {
        var _a;
        var selected = this.filteredSessions[this.selectedIndex];
        if (!selected)
            return;
        // Prevent deleting current session
        if (this.currentSessionFilePath && selected.session.path === this.currentSessionFilePath) {
            (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, "Cannot delete the currently active session");
            return;
        }
        this.setConfirmingDeletePath(selected.session.path);
    };
    SessionList.prototype.invalidate = function () { };
    SessionList.prototype.render = function (width) {
        var _a;
        var lines = [];
        // Render search input
        lines.push.apply(lines, this.searchInput.render(width));
        lines.push(""); // Blank line after search
        if (this.filteredSessions.length === 0) {
            var emptyMessage = void 0;
            if (this.nameFilter === "named") {
                var toggleKey = (0, keybinding_hints_js_1.appKey)(this.keybindings, "toggleSessionNamedFilter");
                if (this.showCwd) {
                    emptyMessage = "  No named sessions found. Press ".concat(toggleKey, " to show all.");
                }
                else {
                    emptyMessage = "  No named sessions in current folder. Press ".concat(toggleKey, " to show all, or Tab to view all.");
                }
            }
            else if (this.showCwd) {
                // "All" scope - no sessions anywhere that match filter
                emptyMessage = "  No sessions found";
            }
            else {
                // "Current folder" scope - hint to try "all"
                emptyMessage = "  No sessions in current folder. Press Tab to view all.";
            }
            lines.push(theme_js_1.theme.fg("muted", (0, pi_tui_1.truncateToWidth)(emptyMessage, width, "…")));
            return lines;
        }
        // Calculate visible range with scrolling
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(this.maxVisible / 2), this.filteredSessions.length - this.maxVisible));
        var endIndex = Math.min(startIndex + this.maxVisible, this.filteredSessions.length);
        // Render visible sessions (one line each with tree structure)
        for (var i = startIndex; i < endIndex; i++) {
            var node = this.filteredSessions[i];
            var session = node.session;
            var isSelected = i === this.selectedIndex;
            var isConfirmingDelete = session.path === this.confirmingDeletePath;
            var isCurrent = this.currentSessionFilePath === session.path;
            // Build tree prefix
            var prefix = this.buildTreePrefix(node);
            // Session display text (name or first message)
            var hasName = !!session.name;
            var displayText = (_a = session.name) !== null && _a !== void 0 ? _a : session.firstMessage;
            var normalizedMessage = displayText.replace(/[\x00-\x1f\x7f]/g, " ").trim();
            // Right side: message count and age
            var age = formatSessionDate(session.modified);
            var msgCount = String(session.messageCount);
            var rightPart = "".concat(msgCount, " ").concat(age);
            if (this.showCwd && session.cwd) {
                rightPart = "".concat(shortenPath(session.cwd), " ").concat(rightPart);
            }
            if (this.showPath) {
                rightPart = "".concat(shortenPath(session.path), " ").concat(rightPart);
            }
            // Cursor
            var cursor = isSelected ? theme_js_1.theme.fg("accent", "› ") : "  ";
            // Calculate available width for message
            var prefixWidth = (0, pi_tui_1.visibleWidth)(prefix);
            var rightWidth = (0, pi_tui_1.visibleWidth)(rightPart) + 2; // +2 for spacing
            var availableForMsg = width - 2 - prefixWidth - rightWidth; // -2 for cursor
            var truncatedMsg = (0, pi_tui_1.truncateToWidth)(normalizedMessage, Math.max(10, availableForMsg), "…");
            // Style message
            var messageColor = null;
            if (isConfirmingDelete) {
                messageColor = "error";
            }
            else if (isCurrent) {
                messageColor = "accent";
            }
            else if (hasName) {
                messageColor = "warning";
            }
            var styledMsg = messageColor ? theme_js_1.theme.fg(messageColor, truncatedMsg) : truncatedMsg;
            if (isSelected) {
                styledMsg = theme_js_1.theme.bold(styledMsg);
            }
            // Build line
            var leftPart = cursor + theme_js_1.theme.fg("dim", prefix) + styledMsg;
            var leftWidth = (0, pi_tui_1.visibleWidth)(leftPart);
            var spacing = Math.max(1, width - leftWidth - (0, pi_tui_1.visibleWidth)(rightPart));
            var styledRight = theme_js_1.theme.fg(isConfirmingDelete ? "error" : "dim", rightPart);
            var line = leftPart + " ".repeat(spacing) + styledRight;
            if (isSelected) {
                line = theme_js_1.theme.bg("selectedBg", line);
            }
            lines.push((0, pi_tui_1.truncateToWidth)(line, width));
        }
        // Add scroll indicator if needed
        if (startIndex > 0 || endIndex < this.filteredSessions.length) {
            var scrollText = "  (".concat(this.selectedIndex + 1, "/").concat(this.filteredSessions.length, ")");
            var scrollInfo = theme_js_1.theme.fg("muted", (0, pi_tui_1.truncateToWidth)(scrollText, width, ""));
            lines.push(scrollInfo);
        }
        return lines;
    };
    SessionList.prototype.buildTreePrefix = function (node) {
        if (node.depth === 0) {
            return "";
        }
        var parts = node.ancestorContinues.map(function (continues) { return (continues ? "│  " : "   "); });
        var branch = node.isLast ? "└─ " : "├─ ";
        return parts.join("") + branch;
    };
    SessionList.prototype.handleInput = function (keyData) {
        var _a, _b, _c, _d, _e;
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        // Handle delete confirmation state first - intercept all keys
        if (this.confirmingDeletePath !== null) {
            if (kb.matches(keyData, "selectConfirm")) {
                var pathToDelete = this.confirmingDeletePath;
                this.setConfirmingDeletePath(null);
                void ((_a = this.onDeleteSession) === null || _a === void 0 ? void 0 : _a.call(this, pathToDelete));
                return;
            }
            // Allow both Escape and Ctrl+C to cancel (consistent with pi UX)
            if (kb.matches(keyData, "selectCancel") || (0, pi_tui_1.matchesKey)(keyData, "ctrl+c")) {
                this.setConfirmingDeletePath(null);
                return;
            }
            // Ignore all other keys while confirming
            return;
        }
        if (kb.matches(keyData, "tab")) {
            if (this.onToggleScope) {
                this.onToggleScope();
            }
            return;
        }
        if (kb.matches(keyData, "toggleSessionSort")) {
            (_b = this.onToggleSort) === null || _b === void 0 ? void 0 : _b.call(this);
            return;
        }
        if (this.keybindings.matches(keyData, "toggleSessionNamedFilter")) {
            (_c = this.onToggleNameFilter) === null || _c === void 0 ? void 0 : _c.call(this);
            return;
        }
        // Ctrl+P: toggle path display
        if (kb.matches(keyData, "toggleSessionPath")) {
            this.showPath = !this.showPath;
            (_d = this.onTogglePath) === null || _d === void 0 ? void 0 : _d.call(this, this.showPath);
            return;
        }
        // Ctrl+D: initiate delete confirmation (useful on terminals that don't distinguish Ctrl+Backspace from Backspace)
        if (kb.matches(keyData, "deleteSession")) {
            this.startDeleteConfirmationForSelectedSession();
            return;
        }
        // Ctrl+R: rename selected session
        if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+r")) {
            var selected = this.filteredSessions[this.selectedIndex];
            if (selected) {
                (_e = this.onRenameSession) === null || _e === void 0 ? void 0 : _e.call(this, selected.session.path);
            }
            return;
        }
        // Ctrl+Backspace: non-invasive convenience alias for delete
        // Only triggers deletion when the query is empty; otherwise it is forwarded to the input
        if (kb.matches(keyData, "deleteSessionNoninvasive")) {
            if (this.searchInput.getValue().length > 0) {
                this.searchInput.handleInput(keyData);
                this.filterSessions(this.searchInput.getValue());
                return;
            }
            this.startDeleteConfirmationForSelectedSession();
            return;
        }
        // Up arrow
        if (kb.matches(keyData, "selectUp")) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }
        // Down arrow
        else if (kb.matches(keyData, "selectDown")) {
            this.selectedIndex = Math.min(this.filteredSessions.length - 1, this.selectedIndex + 1);
        }
        // Page up - jump up by maxVisible items
        else if (kb.matches(keyData, "selectPageUp")) {
            this.selectedIndex = Math.max(0, this.selectedIndex - this.maxVisible);
        }
        // Page down - jump down by maxVisible items
        else if (kb.matches(keyData, "selectPageDown")) {
            this.selectedIndex = Math.min(this.filteredSessions.length - 1, this.selectedIndex + this.maxVisible);
        }
        // Enter
        else if (kb.matches(keyData, "selectConfirm")) {
            var selected = this.filteredSessions[this.selectedIndex];
            if (selected && this.onSelect) {
                this.onSelect(selected.session.path);
            }
        }
        // Escape - cancel
        else if (kb.matches(keyData, "selectCancel")) {
            if (this.onCancel) {
                this.onCancel();
            }
        }
        // Pass everything else to search input
        else {
            this.searchInput.handleInput(keyData);
            this.filterSessions(this.searchInput.getValue());
        }
    };
    return SessionList;
}());
/**
 * Delete a session file, trying the `trash` CLI first, then falling back to unlink
 */
function deleteSessionFile(sessionPath) {
    return __awaiter(this, void 0, void 0, function () {
        var trashArgs, trashResult, getTrashErrorHint, err_1, unlinkError, trashErrorHint, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trashArgs = sessionPath.startsWith("-") ? ["--", sessionPath] : [sessionPath];
                    trashResult = (0, node_child_process_1.spawnSync)("trash", trashArgs, { encoding: "utf-8" });
                    getTrashErrorHint = function () {
                        var _a, _b;
                        var parts = [];
                        if (trashResult.error) {
                            parts.push(trashResult.error.message);
                        }
                        var stderr = (_a = trashResult.stderr) === null || _a === void 0 ? void 0 : _a.trim();
                        if (stderr) {
                            parts.push((_b = stderr.split("\n")[0]) !== null && _b !== void 0 ? _b : stderr);
                        }
                        if (parts.length === 0)
                            return null;
                        return "trash: ".concat(parts.join(" · ").slice(0, 200));
                    };
                    // If trash reports success, or the file is gone afterwards, treat it as successful
                    if (trashResult.status === 0 || !(0, node_fs_1.existsSync)(sessionPath)) {
                        return [2 /*return*/, { ok: true, method: "trash" }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.unlink)(sessionPath)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { ok: true, method: "unlink" }];
                case 3:
                    err_1 = _a.sent();
                    unlinkError = err_1 instanceof Error ? err_1.message : String(err_1);
                    trashErrorHint = getTrashErrorHint();
                    error = trashErrorHint ? "".concat(unlinkError, " (").concat(trashErrorHint, ")") : unlinkError;
                    return [2 /*return*/, { ok: false, method: "unlink", error: error }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Component that renders a session selector
 */
var SessionSelectorComponent = /** @class */ (function (_super) {
    __extends(SessionSelectorComponent, _super);
    function SessionSelectorComponent(currentSessionsLoader, allSessionsLoader, onSelect, onCancel, onExit, requestRender, options, currentSessionFilePath) {
        var _a, _b;
        var _this = _super.call(this) || this;
        _this.canRename = true;
        _this.scope = "current";
        _this.sortMode = "threaded";
        _this.nameFilter = "all";
        _this.currentSessions = null;
        _this.allSessions = null;
        _this.currentLoading = false;
        _this.allLoading = false;
        _this.allLoadSeq = 0;
        _this.mode = "list";
        _this.renameInput = new pi_tui_1.Input();
        _this.renameTargetPath = null;
        // Focusable implementation - propagate to sessionList for IME cursor positioning
        _this._focused = false;
        _this.keybindings = (_a = options === null || options === void 0 ? void 0 : options.keybindings) !== null && _a !== void 0 ? _a : keybindings_js_1.KeybindingsManager.create();
        _this.currentSessionsLoader = currentSessionsLoader;
        _this.allSessionsLoader = allSessionsLoader;
        _this.onCancel = onCancel;
        _this.requestRender = requestRender;
        _this.header = new SessionSelectorHeader(_this.scope, _this.sortMode, _this.nameFilter, _this.keybindings, _this.requestRender);
        var renameSession = options === null || options === void 0 ? void 0 : options.renameSession;
        _this.renameSession = renameSession;
        _this.canRename = !!renameSession;
        _this.header.setShowRenameHint((_b = options === null || options === void 0 ? void 0 : options.showRenameHint) !== null && _b !== void 0 ? _b : _this.canRename);
        // Create session list (starts empty, will be populated after load)
        _this.sessionList = new SessionList([], false, _this.sortMode, _this.nameFilter, _this.keybindings, currentSessionFilePath);
        _this.buildBaseLayout(_this.sessionList);
        _this.renameInput.onSubmit = function (value) {
            void _this.confirmRename(value);
        };
        // Ensure header status timeouts are cleared when leaving the selector
        var clearStatusMessage = function () { return _this.header.setStatusMessage(null); };
        _this.sessionList.onSelect = function (sessionPath) {
            clearStatusMessage();
            onSelect(sessionPath);
        };
        _this.sessionList.onCancel = function () {
            clearStatusMessage();
            onCancel();
        };
        _this.sessionList.onExit = function () {
            clearStatusMessage();
            onExit();
        };
        _this.sessionList.onToggleScope = function () { return _this.toggleScope(); };
        _this.sessionList.onToggleSort = function () { return _this.toggleSortMode(); };
        _this.sessionList.onToggleNameFilter = function () { return _this.toggleNameFilter(); };
        _this.sessionList.onRenameSession = function (sessionPath) {
            var _a, _b;
            if (!renameSession)
                return;
            if (_this.scope === "current" && _this.currentLoading)
                return;
            if (_this.scope === "all" && _this.allLoading)
                return;
            var sessions = _this.scope === "all" ? ((_a = _this.allSessions) !== null && _a !== void 0 ? _a : []) : ((_b = _this.currentSessions) !== null && _b !== void 0 ? _b : []);
            var session = sessions.find(function (s) { return s.path === sessionPath; });
            _this.enterRenameMode(sessionPath, session === null || session === void 0 ? void 0 : session.name);
        };
        // Sync list events to header
        _this.sessionList.onTogglePath = function (showPath) {
            _this.header.setShowPath(showPath);
            _this.requestRender();
        };
        _this.sessionList.onDeleteConfirmationChange = function (path) {
            _this.header.setConfirmingDeletePath(path);
            _this.requestRender();
        };
        _this.sessionList.onError = function (msg) {
            _this.header.setStatusMessage({ type: "error", message: msg }, 3000);
            _this.requestRender();
        };
        // Handle session deletion
        _this.sessionList.onDeleteSession = function (sessionPath) { return __awaiter(_this, void 0, void 0, function () {
            var result, sessions, showCwd, msg, errorMessage;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, deleteSessionFile(sessionPath)];
                    case 1:
                        result = _d.sent();
                        if (!result.ok) return [3 /*break*/, 3];
                        if (this.currentSessions) {
                            this.currentSessions = this.currentSessions.filter(function (s) { return s.path !== sessionPath; });
                        }
                        if (this.allSessions) {
                            this.allSessions = this.allSessions.filter(function (s) { return s.path !== sessionPath; });
                        }
                        sessions = this.scope === "all" ? ((_a = this.allSessions) !== null && _a !== void 0 ? _a : []) : ((_b = this.currentSessions) !== null && _b !== void 0 ? _b : []);
                        showCwd = this.scope === "all";
                        this.sessionList.setSessions(sessions, showCwd);
                        msg = result.method === "trash" ? "Session moved to trash" : "Session deleted";
                        this.header.setStatusMessage({ type: "info", message: msg }, 2000);
                        return [4 /*yield*/, this.refreshSessionsAfterMutation()];
                    case 2:
                        _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        errorMessage = (_c = result.error) !== null && _c !== void 0 ? _c : "Unknown error";
                        this.header.setStatusMessage({ type: "error", message: "Failed to delete: ".concat(errorMessage) }, 3000);
                        _d.label = 4;
                    case 4:
                        this.requestRender();
                        return [2 /*return*/];
                }
            });
        }); };
        // Start loading current sessions immediately
        _this.loadCurrentSessions();
        return _this;
    }
    SessionSelectorComponent.prototype.handleInput = function (data) {
        if (this.mode === "rename") {
            var kb = (0, pi_tui_1.getEditorKeybindings)();
            if (kb.matches(data, "selectCancel") || (0, pi_tui_1.matchesKey)(data, "ctrl+c")) {
                this.exitRenameMode();
                return;
            }
            this.renameInput.handleInput(data);
            return;
        }
        this.sessionList.handleInput(data);
    };
    Object.defineProperty(SessionSelectorComponent.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.sessionList.focused = value;
            this.renameInput.focused = value;
            if (value && this.mode === "rename") {
                this.renameInput.focused = true;
            }
        },
        enumerable: false,
        configurable: true
    });
    SessionSelectorComponent.prototype.buildBaseLayout = function (content, options) {
        var _a;
        this.clear();
        this.addChild(new pi_tui_1.Spacer(1));
        this.addChild(new dynamic_border_js_1.DynamicBorder(function (s) { return theme_js_1.theme.fg("accent", s); }));
        this.addChild(new pi_tui_1.Spacer(1));
        if ((_a = options === null || options === void 0 ? void 0 : options.showHeader) !== null && _a !== void 0 ? _a : true) {
            this.addChild(this.header);
            this.addChild(new pi_tui_1.Spacer(1));
        }
        this.addChild(content);
        this.addChild(new pi_tui_1.Spacer(1));
        this.addChild(new dynamic_border_js_1.DynamicBorder(function (s) { return theme_js_1.theme.fg("accent", s); }));
    };
    SessionSelectorComponent.prototype.loadCurrentSessions = function () {
        void this.loadScope("current", "initial");
    };
    SessionSelectorComponent.prototype.enterRenameMode = function (sessionPath, currentName) {
        this.mode = "rename";
        this.renameTargetPath = sessionPath;
        this.renameInput.setValue(currentName !== null && currentName !== void 0 ? currentName : "");
        this.renameInput.focused = true;
        var panel = new pi_tui_1.Container();
        panel.addChild(new pi_tui_1.Text(theme_js_1.theme.bold("Rename Session"), 1, 0));
        panel.addChild(new pi_tui_1.Spacer(1));
        panel.addChild(this.renameInput);
        panel.addChild(new pi_tui_1.Spacer(1));
        panel.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "Enter to save · Esc/Ctrl+C to cancel"), 1, 0));
        this.buildBaseLayout(panel, { showHeader: false });
        this.requestRender();
    };
    SessionSelectorComponent.prototype.exitRenameMode = function () {
        this.mode = "list";
        this.renameTargetPath = null;
        this.buildBaseLayout(this.sessionList);
        this.requestRender();
    };
    SessionSelectorComponent.prototype.confirmRename = function (value) {
        return __awaiter(this, void 0, void 0, function () {
            var next, target, renameSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        next = value.trim();
                        if (!next)
                            return [2 /*return*/];
                        target = this.renameTargetPath;
                        if (!target) {
                            this.exitRenameMode();
                            return [2 /*return*/];
                        }
                        renameSession = this.renameSession;
                        if (!renameSession) {
                            this.exitRenameMode();
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 5]);
                        return [4 /*yield*/, renameSession(target, next)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.refreshSessionsAfterMutation()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        this.exitRenameMode();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SessionSelectorComponent.prototype.loadScope = function (scope, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var showCwd, seq, onProgress, sessions, err_2, message;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        showCwd = scope === "all";
                        // Mark loading
                        if (scope === "current") {
                            this.currentLoading = true;
                        }
                        else {
                            this.allLoading = true;
                        }
                        seq = scope === "all" ? ++this.allLoadSeq : undefined;
                        this.header.setScope(scope);
                        this.header.setLoading(true);
                        this.requestRender();
                        onProgress = function (loaded, total) {
                            if (scope !== _this.scope)
                                return;
                            if (seq !== undefined && seq !== _this.allLoadSeq)
                                return;
                            _this.header.setProgress(loaded, total);
                            _this.requestRender();
                        };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (scope === "current"
                                ? this.currentSessionsLoader(onProgress)
                                : this.allSessionsLoader(onProgress))];
                    case 2:
                        sessions = _c.sent();
                        if (scope === "current") {
                            this.currentSessions = sessions;
                            this.currentLoading = false;
                        }
                        else {
                            this.allSessions = sessions;
                            this.allLoading = false;
                        }
                        if (scope !== this.scope)
                            return [2 /*return*/];
                        if (seq !== undefined && seq !== this.allLoadSeq)
                            return [2 /*return*/];
                        this.header.setLoading(false);
                        this.sessionList.setSessions(sessions, showCwd);
                        this.requestRender();
                        if (scope === "all" && sessions.length === 0 && ((_b = (_a = this.currentSessions) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) === 0) {
                            this.onCancel();
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _c.sent();
                        if (scope === "current") {
                            this.currentLoading = false;
                        }
                        else {
                            this.allLoading = false;
                        }
                        if (scope !== this.scope)
                            return [2 /*return*/];
                        if (seq !== undefined && seq !== this.allLoadSeq)
                            return [2 /*return*/];
                        message = err_2 instanceof Error ? err_2.message : String(err_2);
                        this.header.setLoading(false);
                        this.header.setStatusMessage({ type: "error", message: "Failed to load sessions: ".concat(message) }, 4000);
                        if (reason === "initial") {
                            this.sessionList.setSessions([], showCwd);
                        }
                        this.requestRender();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SessionSelectorComponent.prototype.toggleSortMode = function () {
        // Cycle: threaded -> recent -> relevance -> threaded
        this.sortMode = this.sortMode === "threaded" ? "recent" : this.sortMode === "recent" ? "relevance" : "threaded";
        this.header.setSortMode(this.sortMode);
        this.sessionList.setSortMode(this.sortMode);
        this.requestRender();
    };
    SessionSelectorComponent.prototype.toggleNameFilter = function () {
        this.nameFilter = this.nameFilter === "all" ? "named" : "all";
        this.header.setNameFilter(this.nameFilter);
        this.sessionList.setNameFilter(this.nameFilter);
        this.requestRender();
    };
    SessionSelectorComponent.prototype.refreshSessionsAfterMutation = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadScope(this.scope, "refresh")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionSelectorComponent.prototype.toggleScope = function () {
        var _a;
        if (this.scope === "current") {
            this.scope = "all";
            this.header.setScope(this.scope);
            if (this.allSessions !== null) {
                this.header.setLoading(false);
                this.sessionList.setSessions(this.allSessions, true);
                this.requestRender();
                return;
            }
            if (!this.allLoading) {
                void this.loadScope("all", "toggle");
            }
            return;
        }
        this.scope = "current";
        this.header.setScope(this.scope);
        this.header.setLoading(this.currentLoading);
        this.sessionList.setSessions((_a = this.currentSessions) !== null && _a !== void 0 ? _a : [], false);
        this.requestRender();
    };
    SessionSelectorComponent.prototype.getSessionList = function () {
        return this.sessionList;
    };
    return SessionSelectorComponent;
}(pi_tui_1.Container));
exports.SessionSelectorComponent = SessionSelectorComponent;
