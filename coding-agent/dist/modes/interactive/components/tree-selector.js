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
exports.TreeSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var TreeList = /** @class */ (function () {
    function TreeList(tree, currentLeafId, maxVisibleLines, initialSelectedId, initialFilterMode) {
        var _a, _b;
        this.flatNodes = [];
        this.filteredNodes = [];
        this.selectedIndex = 0;
        this.filterMode = "default";
        this.searchQuery = "";
        this.toolCallMap = new Map();
        this.multipleRoots = false;
        this.activePathIds = new Set();
        this.visibleParentMap = new Map();
        this.visibleChildrenMap = new Map();
        this.lastSelectedId = null;
        this.foldedNodes = new Set();
        this.currentLeafId = currentLeafId;
        this.maxVisibleLines = maxVisibleLines;
        this.filterMode = initialFilterMode !== null && initialFilterMode !== void 0 ? initialFilterMode : "default";
        this.multipleRoots = tree.length > 1;
        this.flatNodes = this.flattenTree(tree);
        this.buildActivePath();
        this.applyFilter();
        // Start with initialSelectedId if provided, otherwise current leaf
        var targetId = initialSelectedId !== null && initialSelectedId !== void 0 ? initialSelectedId : currentLeafId;
        this.selectedIndex = this.findNearestVisibleIndex(targetId);
        this.lastSelectedId = (_b = (_a = this.filteredNodes[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.node.entry.id) !== null && _b !== void 0 ? _b : null;
    }
    /**
     * Find the index of the nearest visible entry, walking up the parent chain if needed.
     * Returns the index in filteredNodes, or the last index as fallback.
     */
    TreeList.prototype.findNearestVisibleIndex = function (entryId) {
        var _a;
        if (this.filteredNodes.length === 0)
            return 0;
        // Build a map for parent lookup
        var entryMap = new Map();
        for (var _i = 0, _b = this.flatNodes; _i < _b.length; _i++) {
            var flatNode = _b[_i];
            entryMap.set(flatNode.node.entry.id, flatNode);
        }
        // Build a map of visible entry IDs to their indices in filteredNodes
        var visibleIdToIndex = new Map(this.filteredNodes.map(function (node, i) { return [node.node.entry.id, i]; }));
        // Walk from entryId up to root, looking for a visible entry
        var currentId = entryId;
        while (currentId !== null) {
            var index = visibleIdToIndex.get(currentId);
            if (index !== undefined)
                return index;
            var node = entryMap.get(currentId);
            if (!node)
                break;
            currentId = (_a = node.node.entry.parentId) !== null && _a !== void 0 ? _a : null;
        }
        // Fallback: last visible entry
        return this.filteredNodes.length - 1;
    };
    /** Build the set of entry IDs on the path from root to current leaf */
    TreeList.prototype.buildActivePath = function () {
        var _a;
        this.activePathIds.clear();
        if (!this.currentLeafId)
            return;
        // Build a map of id -> entry for parent lookup
        var entryMap = new Map();
        for (var _i = 0, _b = this.flatNodes; _i < _b.length; _i++) {
            var flatNode = _b[_i];
            entryMap.set(flatNode.node.entry.id, flatNode);
        }
        // Walk from leaf to root
        var currentId = this.currentLeafId;
        while (currentId) {
            this.activePathIds.add(currentId);
            var node = entryMap.get(currentId);
            if (!node)
                break;
            currentId = (_a = node.node.entry.parentId) !== null && _a !== void 0 ? _a : null;
        }
    };
    TreeList.prototype.flattenTree = function (roots) {
        var result = [];
        this.toolCallMap.clear();
        var stack = [];
        // Determine which subtrees contain the active leaf (to sort current branch first)
        // Use iterative post-order traversal to avoid stack overflow
        var containsActive = new Map();
        var leafId = this.currentLeafId;
        {
            // Build list in pre-order, then process in reverse for post-order effect
            var allNodes = [];
            var preOrderStack = __spreadArray([], roots, true);
            while (preOrderStack.length > 0) {
                var node = preOrderStack.pop();
                allNodes.push(node);
                // Push children in reverse so they're processed left-to-right
                for (var i = node.children.length - 1; i >= 0; i--) {
                    preOrderStack.push(node.children[i]);
                }
            }
            // Process in reverse (post-order): children before parents
            for (var i = allNodes.length - 1; i >= 0; i--) {
                var node = allNodes[i];
                var has = leafId !== null && node.entry.id === leafId;
                for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    if (containsActive.get(child)) {
                        has = true;
                    }
                }
                containsActive.set(node, has);
            }
        }
        // Add roots in reverse order, prioritizing the one containing the active leaf
        // If multiple roots, treat them as children of a virtual root that branches
        var multipleRoots = roots.length > 1;
        var orderedRoots = __spreadArray([], roots, true).sort(function (a, b) { return Number(containsActive.get(b)) - Number(containsActive.get(a)); });
        for (var i = orderedRoots.length - 1; i >= 0; i--) {
            var isLast = i === orderedRoots.length - 1;
            stack.push([orderedRoots[i], multipleRoots ? 1 : 0, multipleRoots, multipleRoots, isLast, [], multipleRoots]);
        }
        var _loop_1 = function () {
            var _b = stack.pop(), node = _b[0], indent = _b[1], justBranched = _b[2], showConnector = _b[3], isLast = _b[4], gutters = _b[5], isVirtualRootChild = _b[6];
            // Extract tool calls from assistant messages for later lookup
            var entry = node.entry;
            if (entry.type === "message" && entry.message.role === "assistant") {
                var content = entry.message.content;
                if (Array.isArray(content)) {
                    for (var _c = 0, content_1 = content; _c < content_1.length; _c++) {
                        var block = content_1[_c];
                        if (typeof block === "object" && block !== null && "type" in block && block.type === "toolCall") {
                            var tc = block;
                            this_1.toolCallMap.set(tc.id, { name: tc.name, arguments: tc.arguments });
                        }
                    }
                }
            }
            result.push({ node: node, indent: indent, showConnector: showConnector, isLast: isLast, gutters: gutters, isVirtualRootChild: isVirtualRootChild });
            var children = node.children;
            var multipleChildren = children.length > 1;
            // Order children so the branch containing the active leaf comes first
            var orderedChildren = (function () {
                var prioritized = [];
                var rest = [];
                for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                    var child = children_1[_i];
                    if (containsActive.get(child)) {
                        prioritized.push(child);
                    }
                    else {
                        rest.push(child);
                    }
                }
                return __spreadArray(__spreadArray([], prioritized, true), rest, true);
            })();
            // Calculate child indent
            var childIndent = void 0;
            if (multipleChildren) {
                // Parent branches: children get +1
                childIndent = indent + 1;
            }
            else if (justBranched && indent > 0) {
                // First generation after a branch: +1 for visual grouping
                childIndent = indent + 1;
            }
            else {
                // Single-child chain: stay flat
                childIndent = indent;
            }
            // Build gutters for children
            // If this node showed a connector, add a gutter entry for descendants
            // Only add gutter if connector is actually displayed (not suppressed for virtual root children)
            var connectorDisplayed = showConnector && !isVirtualRootChild;
            // When connector is displayed, add a gutter entry at the connector's position
            // Connector is at position (displayIndent - 1), so gutter should be there too
            var currentDisplayIndent = this_1.multipleRoots ? Math.max(0, indent - 1) : indent;
            var connectorPosition = Math.max(0, currentDisplayIndent - 1);
            var childGutters = connectorDisplayed
                ? __spreadArray(__spreadArray([], gutters, true), [{ position: connectorPosition, show: !isLast }], false) : gutters;
            // Add children in reverse order
            for (var i = orderedChildren.length - 1; i >= 0; i--) {
                var childIsLast = i === orderedChildren.length - 1;
                stack.push([
                    orderedChildren[i],
                    childIndent,
                    multipleChildren,
                    multipleChildren,
                    childIsLast,
                    childGutters,
                    false,
                ]);
            }
        };
        var this_1 = this;
        while (stack.length > 0) {
            _loop_1();
        }
        return result;
    };
    TreeList.prototype.applyFilter = function () {
        var _this = this;
        var _a, _b, _c, _d;
        // Update lastSelectedId only when we have a valid selection (non-empty list)
        // This preserves the selection when switching through empty filter results
        if (this.filteredNodes.length > 0) {
            this.lastSelectedId = (_b = (_a = this.filteredNodes[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.node.entry.id) !== null && _b !== void 0 ? _b : this.lastSelectedId;
        }
        var searchTokens = this.searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        this.filteredNodes = this.flatNodes.filter(function (flatNode) {
            var entry = flatNode.node.entry;
            var isCurrentLeaf = entry.id === _this.currentLeafId;
            // Skip assistant messages with only tool calls (no text) unless error/aborted
            // Always show current leaf so active position is visible
            if (entry.type === "message" && entry.message.role === "assistant" && !isCurrentLeaf) {
                var msg = entry.message;
                var hasText = _this.hasTextContent(msg.content);
                var isErrorOrAborted = msg.stopReason && msg.stopReason !== "stop" && msg.stopReason !== "toolUse";
                // Only hide if no text AND not an error/aborted message
                if (!hasText && !isErrorOrAborted) {
                    return false;
                }
            }
            // Apply filter mode
            var passesFilter = true;
            // Entry types hidden in default view (settings/bookkeeping)
            var isSettingsEntry = entry.type === "label" ||
                entry.type === "custom" ||
                entry.type === "model_change" ||
                entry.type === "thinking_level_change";
            switch (_this.filterMode) {
                case "user-only":
                    // Just user messages
                    passesFilter = entry.type === "message" && entry.message.role === "user";
                    break;
                case "no-tools":
                    // Default minus tool results
                    passesFilter = !isSettingsEntry && !(entry.type === "message" && entry.message.role === "toolResult");
                    break;
                case "labeled-only":
                    // Just labeled entries
                    passesFilter = flatNode.node.label !== undefined;
                    break;
                case "all":
                    // Show everything
                    passesFilter = true;
                    break;
                default:
                    // Default mode: hide settings/bookkeeping entries
                    passesFilter = !isSettingsEntry;
                    break;
            }
            if (!passesFilter)
                return false;
            // Apply search filter
            if (searchTokens.length > 0) {
                var nodeText_1 = _this.getSearchableText(flatNode.node).toLowerCase();
                return searchTokens.every(function (token) { return nodeText_1.includes(token); });
            }
            return true;
        });
        // Filter out descendants of folded nodes.
        if (this.foldedNodes.size > 0) {
            var skipSet_1 = new Set();
            for (var _i = 0, _e = this.flatNodes; _i < _e.length; _i++) {
                var flatNode = _e[_i];
                var _f = flatNode.node.entry, id = _f.id, parentId = _f.parentId;
                if (parentId != null && (this.foldedNodes.has(parentId) || skipSet_1.has(parentId))) {
                    skipSet_1.add(id);
                }
            }
            this.filteredNodes = this.filteredNodes.filter(function (flatNode) { return !skipSet_1.has(flatNode.node.entry.id); });
        }
        // Recalculate visual structure (indent, connectors, gutters) based on visible tree
        this.recalculateVisualStructure();
        // Try to preserve cursor on the same node, or find nearest visible ancestor
        if (this.lastSelectedId) {
            this.selectedIndex = this.findNearestVisibleIndex(this.lastSelectedId);
        }
        else if (this.selectedIndex >= this.filteredNodes.length) {
            // Clamp index if out of bounds
            this.selectedIndex = Math.max(0, this.filteredNodes.length - 1);
        }
        // Update lastSelectedId to the actual selection (may have changed due to parent walk)
        if (this.filteredNodes.length > 0) {
            this.lastSelectedId = (_d = (_c = this.filteredNodes[this.selectedIndex]) === null || _c === void 0 ? void 0 : _c.node.entry.id) !== null && _d !== void 0 ? _d : this.lastSelectedId;
        }
    };
    /**
     * Recompute indentation/connectors for the filtered view
     *
     * Filtering can hide intermediate entries; descendants attach to the nearest visible ancestor.
     * Keep indentation semantics aligned with flattenTree() so single-child chains don't drift right.
     */
    TreeList.prototype.recalculateVisualStructure = function () {
        if (this.filteredNodes.length === 0)
            return;
        var visibleIds = new Set(this.filteredNodes.map(function (n) { return n.node.entry.id; }));
        // Build entry map for efficient parent lookup (using full tree)
        var entryMap = new Map();
        for (var _i = 0, _a = this.flatNodes; _i < _a.length; _i++) {
            var flatNode = _a[_i];
            entryMap.set(flatNode.node.entry.id, flatNode);
        }
        // Find nearest visible ancestor for a node
        var findVisibleAncestor = function (nodeId) {
            var _a, _b, _c, _d;
            var currentId = (_b = (_a = entryMap.get(nodeId)) === null || _a === void 0 ? void 0 : _a.node.entry.parentId) !== null && _b !== void 0 ? _b : null;
            while (currentId !== null) {
                if (visibleIds.has(currentId)) {
                    return currentId;
                }
                currentId = (_d = (_c = entryMap.get(currentId)) === null || _c === void 0 ? void 0 : _c.node.entry.parentId) !== null && _d !== void 0 ? _d : null;
            }
            return null;
        };
        // Build visible tree structure:
        // - visibleParent: nodeId → nearest visible ancestor (or null for roots)
        // - visibleChildren: parentId → list of visible children (in filteredNodes order)
        var visibleParent = new Map();
        var visibleChildren = new Map();
        visibleChildren.set(null, []); // root-level nodes
        for (var _b = 0, _c = this.filteredNodes; _b < _c.length; _b++) {
            var flatNode = _c[_b];
            var nodeId = flatNode.node.entry.id;
            var ancestorId = findVisibleAncestor(nodeId);
            visibleParent.set(nodeId, ancestorId);
            if (!visibleChildren.has(ancestorId)) {
                visibleChildren.set(ancestorId, []);
            }
            visibleChildren.get(ancestorId).push(nodeId);
        }
        // Update multipleRoots based on visible roots
        var visibleRootIds = visibleChildren.get(null);
        this.multipleRoots = visibleRootIds.length > 1;
        // Build a map for quick lookup: nodeId → FlatNode
        var filteredNodeMap = new Map();
        for (var _d = 0, _e = this.filteredNodes; _d < _e.length; _d++) {
            var flatNode = _e[_d];
            filteredNodeMap.set(flatNode.node.entry.id, flatNode);
        }
        var stack = [];
        // Add visible roots in reverse order (to process in forward order via stack)
        for (var i = visibleRootIds.length - 1; i >= 0; i--) {
            var isLast = i === visibleRootIds.length - 1;
            stack.push([
                visibleRootIds[i],
                this.multipleRoots ? 1 : 0,
                this.multipleRoots,
                this.multipleRoots,
                isLast,
                [],
                this.multipleRoots,
            ]);
        }
        while (stack.length > 0) {
            var _f = stack.pop(), nodeId = _f[0], indent = _f[1], justBranched = _f[2], showConnector = _f[3], isLast = _f[4], gutters = _f[5], isVirtualRootChild = _f[6];
            var flatNode = filteredNodeMap.get(nodeId);
            if (!flatNode)
                continue;
            // Update this node's visual properties
            flatNode.indent = indent;
            flatNode.showConnector = showConnector;
            flatNode.isLast = isLast;
            flatNode.gutters = gutters;
            flatNode.isVirtualRootChild = isVirtualRootChild;
            // Get visible children of this node
            var children = visibleChildren.get(nodeId) || [];
            var multipleChildren = children.length > 1;
            // Child indent follows flattenTree(): branch points (and first generation after a branch) shift +1
            var childIndent = void 0;
            if (multipleChildren) {
                childIndent = indent + 1;
            }
            else if (justBranched && indent > 0) {
                childIndent = indent + 1;
            }
            else {
                childIndent = indent;
            }
            // Child gutters follow flattenTree() connector/gutter rules
            var connectorDisplayed = showConnector && !isVirtualRootChild;
            var currentDisplayIndent = this.multipleRoots ? Math.max(0, indent - 1) : indent;
            var connectorPosition = Math.max(0, currentDisplayIndent - 1);
            var childGutters = connectorDisplayed
                ? __spreadArray(__spreadArray([], gutters, true), [{ position: connectorPosition, show: !isLast }], false) : gutters;
            // Add children in reverse order (to process in forward order via stack)
            for (var i = children.length - 1; i >= 0; i--) {
                var childIsLast = i === children.length - 1;
                stack.push([
                    children[i],
                    childIndent,
                    multipleChildren,
                    multipleChildren,
                    childIsLast,
                    childGutters,
                    false,
                ]);
            }
        }
        // Store visible tree maps for ancestor/descendant lookups in navigation
        this.visibleParentMap = visibleParent;
        this.visibleChildrenMap = visibleChildren;
    };
    /** Get searchable text content from a node */
    TreeList.prototype.getSearchableText = function (node) {
        var _a;
        var entry = node.entry;
        var parts = [];
        if (node.label) {
            parts.push(node.label);
        }
        switch (entry.type) {
            case "message": {
                var msg = entry.message;
                parts.push(msg.role);
                if ("content" in msg && msg.content) {
                    parts.push(this.extractContent(msg.content));
                }
                if (msg.role === "bashExecution") {
                    var bashMsg = msg;
                    if (bashMsg.command)
                        parts.push(bashMsg.command);
                }
                break;
            }
            case "custom_message": {
                parts.push(entry.customType);
                if (typeof entry.content === "string") {
                    parts.push(entry.content);
                }
                else {
                    parts.push(this.extractContent(entry.content));
                }
                break;
            }
            case "compaction":
                parts.push("compaction");
                break;
            case "branch_summary":
                parts.push("branch summary", entry.summary);
                break;
            case "model_change":
                parts.push("model", entry.modelId);
                break;
            case "thinking_level_change":
                parts.push("thinking", entry.thinkingLevel);
                break;
            case "custom":
                parts.push("custom", entry.customType);
                break;
            case "label":
                parts.push("label", (_a = entry.label) !== null && _a !== void 0 ? _a : "");
                break;
        }
        return parts.join(" ");
    };
    TreeList.prototype.invalidate = function () { };
    TreeList.prototype.getSearchQuery = function () {
        return this.searchQuery;
    };
    TreeList.prototype.getSelectedNode = function () {
        var _a;
        return (_a = this.filteredNodes[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.node;
    };
    TreeList.prototype.updateNodeLabel = function (entryId, label) {
        for (var _i = 0, _a = this.flatNodes; _i < _a.length; _i++) {
            var flatNode = _a[_i];
            if (flatNode.node.entry.id === entryId) {
                flatNode.node.label = label;
                break;
            }
        }
    };
    TreeList.prototype.getFilterLabel = function () {
        switch (this.filterMode) {
            case "no-tools":
                return " [no-tools]";
            case "user-only":
                return " [user]";
            case "labeled-only":
                return " [labeled]";
            case "all":
                return " [all]";
            default:
                return "";
        }
    };
    TreeList.prototype.render = function (width) {
        var lines = [];
        if (this.filteredNodes.length === 0) {
            lines.push((0, pi_tui_1.truncateToWidth)(theme_js_1.theme.fg("muted", "  No entries found"), width));
            lines.push((0, pi_tui_1.truncateToWidth)(theme_js_1.theme.fg("muted", "  (0/0)".concat(this.getFilterLabel())), width));
            return lines;
        }
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(this.maxVisibleLines / 2), this.filteredNodes.length - this.maxVisibleLines));
        var endIndex = Math.min(startIndex + this.maxVisibleLines, this.filteredNodes.length);
        for (var i = startIndex; i < endIndex; i++) {
            var flatNode = this.filteredNodes[i];
            var entry = flatNode.node.entry;
            var isSelected = i === this.selectedIndex;
            // Build line: cursor + prefix + path marker + label + content
            var cursor = isSelected ? theme_js_1.theme.fg("accent", "› ") : "  ";
            // If multiple roots, shift display (roots at 0, not 1)
            var displayIndent = this.multipleRoots ? Math.max(0, flatNode.indent - 1) : flatNode.indent;
            // Build prefix with gutters at their correct positions
            // Each gutter has a position (displayIndent where its connector was shown)
            var connector = flatNode.showConnector && !flatNode.isVirtualRootChild ? (flatNode.isLast ? "└─ " : "├─ ") : "";
            var connectorPosition = connector ? displayIndent - 1 : -1;
            // Build prefix char by char, placing gutters and connector at their positions
            var totalChars = displayIndent * 3;
            var prefixChars = [];
            var isFolded = this.foldedNodes.has(entry.id);
            var _loop_2 = function (i_1) {
                var level = Math.floor(i_1 / 3);
                var posInLevel = i_1 % 3;
                // Check if there's a gutter at this level
                var gutter = flatNode.gutters.find(function (g) { return g.position === level; });
                if (gutter) {
                    if (posInLevel === 0) {
                        prefixChars.push(gutter.show ? "│" : " ");
                    }
                    else {
                        prefixChars.push(" ");
                    }
                }
                else if (connector && level === connectorPosition) {
                    // Connector at this level, with fold indicator
                    if (posInLevel === 0) {
                        prefixChars.push(flatNode.isLast ? "└" : "├");
                    }
                    else if (posInLevel === 1) {
                        var foldable = this_2.isFoldable(entry.id);
                        prefixChars.push(isFolded ? "⊞" : foldable ? "⊟" : "─");
                    }
                    else {
                        prefixChars.push(" ");
                    }
                }
                else {
                    prefixChars.push(" ");
                }
            };
            var this_2 = this;
            for (var i_1 = 0; i_1 < totalChars; i_1++) {
                _loop_2(i_1);
            }
            var prefix = prefixChars.join("");
            // Fold marker for nodes without connectors (roots)
            var showsFoldInConnector = flatNode.showConnector && !flatNode.isVirtualRootChild;
            var foldMarker = isFolded && !showsFoldInConnector ? theme_js_1.theme.fg("accent", "⊞ ") : "";
            // Active path marker - shown right before the entry text
            var isOnActivePath = this.activePathIds.has(entry.id);
            var pathMarker = isOnActivePath ? theme_js_1.theme.fg("accent", "• ") : "";
            var label = flatNode.node.label ? theme_js_1.theme.fg("warning", "[".concat(flatNode.node.label, "] ")) : "";
            var content = this.getEntryDisplayText(flatNode.node, isSelected);
            var line = cursor + theme_js_1.theme.fg("dim", prefix) + foldMarker + pathMarker + label + content;
            if (isSelected) {
                line = theme_js_1.theme.bg("selectedBg", line);
            }
            lines.push((0, pi_tui_1.truncateToWidth)(line, width));
        }
        lines.push((0, pi_tui_1.truncateToWidth)(theme_js_1.theme.fg("muted", "  (".concat(this.selectedIndex + 1, "/").concat(this.filteredNodes.length, ")").concat(this.getFilterLabel())), width));
        return lines;
    };
    TreeList.prototype.getEntryDisplayText = function (node, isSelected) {
        var _a, _b, _c;
        var entry = node.entry;
        var result;
        var normalize = function (s) { return s.replace(/[\n\t]/g, " ").trim(); };
        switch (entry.type) {
            case "message": {
                var msg = entry.message;
                var role = msg.role;
                if (role === "user") {
                    var msgWithContent = msg;
                    var content = normalize(this.extractContent(msgWithContent.content));
                    result = theme_js_1.theme.fg("accent", "user: ") + content;
                }
                else if (role === "assistant") {
                    var msgWithContent = msg;
                    var textContent = normalize(this.extractContent(msgWithContent.content));
                    if (textContent) {
                        result = theme_js_1.theme.fg("success", "assistant: ") + textContent;
                    }
                    else if (msgWithContent.stopReason === "aborted") {
                        result = theme_js_1.theme.fg("success", "assistant: ") + theme_js_1.theme.fg("muted", "(aborted)");
                    }
                    else if (msgWithContent.errorMessage) {
                        var errMsg = normalize(msgWithContent.errorMessage).slice(0, 80);
                        result = theme_js_1.theme.fg("success", "assistant: ") + theme_js_1.theme.fg("error", errMsg);
                    }
                    else {
                        result = theme_js_1.theme.fg("success", "assistant: ") + theme_js_1.theme.fg("muted", "(no content)");
                    }
                }
                else if (role === "toolResult") {
                    var toolMsg = msg;
                    var toolCall = toolMsg.toolCallId ? this.toolCallMap.get(toolMsg.toolCallId) : undefined;
                    if (toolCall) {
                        result = theme_js_1.theme.fg("muted", this.formatToolCall(toolCall.name, toolCall.arguments));
                    }
                    else {
                        result = theme_js_1.theme.fg("muted", "[".concat((_a = toolMsg.toolName) !== null && _a !== void 0 ? _a : "tool", "]"));
                    }
                }
                else if (role === "bashExecution") {
                    var bashMsg = msg;
                    result = theme_js_1.theme.fg("dim", "[bash]: ".concat(normalize((_b = bashMsg.command) !== null && _b !== void 0 ? _b : "")));
                }
                else {
                    result = theme_js_1.theme.fg("dim", "[".concat(role, "]"));
                }
                break;
            }
            case "custom_message": {
                var content = typeof entry.content === "string"
                    ? entry.content
                    : entry.content
                        .filter(function (c) { return c.type === "text"; })
                        .map(function (c) { return c.text; })
                        .join("");
                result = theme_js_1.theme.fg("customMessageLabel", "[".concat(entry.customType, "]: ")) + normalize(content);
                break;
            }
            case "compaction": {
                var tokens = Math.round(entry.tokensBefore / 1000);
                result = theme_js_1.theme.fg("borderAccent", "[compaction: ".concat(tokens, "k tokens]"));
                break;
            }
            case "branch_summary":
                result = theme_js_1.theme.fg("warning", "[branch summary]: ") + normalize(entry.summary);
                break;
            case "model_change":
                result = theme_js_1.theme.fg("dim", "[model: ".concat(entry.modelId, "]"));
                break;
            case "thinking_level_change":
                result = theme_js_1.theme.fg("dim", "[thinking: ".concat(entry.thinkingLevel, "]"));
                break;
            case "custom":
                result = theme_js_1.theme.fg("dim", "[custom: ".concat(entry.customType, "]"));
                break;
            case "label":
                result = theme_js_1.theme.fg("dim", "[label: ".concat((_c = entry.label) !== null && _c !== void 0 ? _c : "(cleared)", "]"));
                break;
            default:
                result = "";
        }
        return isSelected ? theme_js_1.theme.bold(result) : result;
    };
    TreeList.prototype.extractContent = function (content) {
        var maxLen = 200;
        if (typeof content === "string")
            return content.slice(0, maxLen);
        if (Array.isArray(content)) {
            var result = "";
            for (var _i = 0, content_2 = content; _i < content_2.length; _i++) {
                var c = content_2[_i];
                if (typeof c === "object" && c !== null && "type" in c && c.type === "text") {
                    result += c.text;
                    if (result.length >= maxLen)
                        return result.slice(0, maxLen);
                }
            }
            return result;
        }
        return "";
    };
    TreeList.prototype.hasTextContent = function (content) {
        if (typeof content === "string")
            return content.trim().length > 0;
        if (Array.isArray(content)) {
            for (var _i = 0, content_3 = content; _i < content_3.length; _i++) {
                var c = content_3[_i];
                if (typeof c === "object" && c !== null && "type" in c && c.type === "text") {
                    var text = c.text;
                    if (text && text.trim().length > 0)
                        return true;
                }
            }
        }
        return false;
    };
    TreeList.prototype.formatToolCall = function (name, args) {
        var shortenPath = function (p) {
            var home = process.env.HOME || process.env.USERPROFILE || "";
            if (home && p.startsWith(home))
                return "~".concat(p.slice(home.length));
            return p;
        };
        switch (name) {
            case "read": {
                var path = shortenPath(String(args.path || args.file_path || ""));
                var offset = args.offset;
                var limit = args.limit;
                var display = path;
                if (offset !== undefined || limit !== undefined) {
                    var start = offset !== null && offset !== void 0 ? offset : 1;
                    var end = limit !== undefined ? start + limit - 1 : "";
                    display += ":".concat(start).concat(end ? "-".concat(end) : "");
                }
                return "[read: ".concat(display, "]");
            }
            case "write": {
                var path = shortenPath(String(args.path || args.file_path || ""));
                return "[write: ".concat(path, "]");
            }
            case "edit": {
                var path = shortenPath(String(args.path || args.file_path || ""));
                return "[edit: ".concat(path, "]");
            }
            case "bash": {
                var rawCmd = String(args.command || "");
                var cmd = rawCmd
                    .replace(/[\n\t]/g, " ")
                    .trim()
                    .slice(0, 50);
                return "[bash: ".concat(cmd).concat(rawCmd.length > 50 ? "..." : "", "]");
            }
            case "grep": {
                var pattern = String(args.pattern || "");
                var path = shortenPath(String(args.path || "."));
                return "[grep: /".concat(pattern, "/ in ").concat(path, "]");
            }
            case "find": {
                var pattern = String(args.pattern || "");
                var path = shortenPath(String(args.path || "."));
                return "[find: ".concat(pattern, " in ").concat(path, "]");
            }
            case "ls": {
                var path = shortenPath(String(args.path || "."));
                return "[ls: ".concat(path, "]");
            }
            default: {
                // Custom tool - show name and truncated JSON args
                var argsStr = JSON.stringify(args).slice(0, 40);
                return "[".concat(name, ": ").concat(argsStr).concat(JSON.stringify(args).length > 40 ? "..." : "", "]");
            }
        }
    };
    TreeList.prototype.handleInput = function (keyData) {
        var _a, _b, _c;
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(keyData, "selectUp")) {
            this.selectedIndex = this.selectedIndex === 0 ? this.filteredNodes.length - 1 : this.selectedIndex - 1;
        }
        else if (kb.matches(keyData, "selectDown")) {
            this.selectedIndex = this.selectedIndex === this.filteredNodes.length - 1 ? 0 : this.selectedIndex + 1;
        }
        else if (kb.matches(keyData, "treeFoldOrUp")) {
            var currentId = (_a = this.filteredNodes[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.node.entry.id;
            if (currentId && this.isFoldable(currentId) && !this.foldedNodes.has(currentId)) {
                this.foldedNodes.add(currentId);
                this.applyFilter();
            }
            else {
                this.selectedIndex = this.findBranchSegmentStart("up");
            }
        }
        else if (kb.matches(keyData, "treeUnfoldOrDown")) {
            var currentId = (_b = this.filteredNodes[this.selectedIndex]) === null || _b === void 0 ? void 0 : _b.node.entry.id;
            if (currentId && this.foldedNodes.has(currentId)) {
                this.foldedNodes.delete(currentId);
                this.applyFilter();
            }
            else {
                this.selectedIndex = this.findBranchSegmentStart("down");
            }
        }
        else if (kb.matches(keyData, "cursorLeft") || kb.matches(keyData, "selectPageUp")) {
            // Page up
            this.selectedIndex = Math.max(0, this.selectedIndex - this.maxVisibleLines);
        }
        else if (kb.matches(keyData, "cursorRight") || kb.matches(keyData, "selectPageDown")) {
            // Page down
            this.selectedIndex = Math.min(this.filteredNodes.length - 1, this.selectedIndex + this.maxVisibleLines);
        }
        else if (kb.matches(keyData, "selectConfirm")) {
            var selected = this.filteredNodes[this.selectedIndex];
            if (selected && this.onSelect) {
                this.onSelect(selected.node.entry.id);
            }
        }
        else if (kb.matches(keyData, "selectCancel")) {
            if (this.searchQuery) {
                this.searchQuery = "";
                this.foldedNodes.clear();
                this.applyFilter();
            }
            else {
                (_c = this.onCancel) === null || _c === void 0 ? void 0 : _c.call(this);
            }
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+d")) {
            // Direct filter: default
            this.filterMode = "default";
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+t")) {
            // Toggle filter: no-tools ↔ default
            this.filterMode = this.filterMode === "no-tools" ? "default" : "no-tools";
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+u")) {
            // Toggle filter: user-only ↔ default
            this.filterMode = this.filterMode === "user-only" ? "default" : "user-only";
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+l")) {
            // Toggle filter: labeled-only ↔ default
            this.filterMode = this.filterMode === "labeled-only" ? "default" : "labeled-only";
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+a")) {
            // Toggle filter: all ↔ default
            this.filterMode = this.filterMode === "all" ? "default" : "all";
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "shift+ctrl+o")) {
            // Cycle filter backwards
            var modes = ["default", "no-tools", "user-only", "labeled-only", "all"];
            var currentIndex = modes.indexOf(this.filterMode);
            this.filterMode = modes[(currentIndex - 1 + modes.length) % modes.length];
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "ctrl+o")) {
            // Cycle filter forwards: default → no-tools → user-only → labeled-only → all → default
            var modes = ["default", "no-tools", "user-only", "labeled-only", "all"];
            var currentIndex = modes.indexOf(this.filterMode);
            this.filterMode = modes[(currentIndex + 1) % modes.length];
            this.foldedNodes.clear();
            this.applyFilter();
        }
        else if (kb.matches(keyData, "deleteCharBackward")) {
            if (this.searchQuery.length > 0) {
                this.searchQuery = this.searchQuery.slice(0, -1);
                this.foldedNodes.clear();
                this.applyFilter();
            }
        }
        else if ((0, pi_tui_1.matchesKey)(keyData, "shift+l")) {
            var selected = this.filteredNodes[this.selectedIndex];
            if (selected && this.onLabelEdit) {
                this.onLabelEdit(selected.node.entry.id, selected.node.label);
            }
        }
        else {
            var hasControlChars = __spreadArray([], keyData, true).some(function (ch) {
                var code = ch.charCodeAt(0);
                return code < 32 || code === 0x7f || (code >= 0x80 && code <= 0x9f);
            });
            if (!hasControlChars && keyData.length > 0) {
                this.searchQuery += keyData;
                this.foldedNodes.clear();
                this.applyFilter();
            }
        }
    };
    /**
     * Whether a node can be folded. A node is foldable if it has visible children
     * and is either a root (no visible parent) or a segment start (visible parent
     * has multiple visible children).
     */
    TreeList.prototype.isFoldable = function (entryId) {
        var children = this.visibleChildrenMap.get(entryId);
        if (!children || children.length === 0)
            return false;
        var parentId = this.visibleParentMap.get(entryId);
        if (parentId === null || parentId === undefined)
            return true;
        var siblings = this.visibleChildrenMap.get(parentId);
        return siblings !== undefined && siblings.length > 1;
    };
    /**
     * Find the index of the next branch segment start in the given direction.
     * A segment start is the first child of a branch point.
     *
     * "up" walks the visible parent chain; "down" walks visible children
     * (always following the first child).
     */
    TreeList.prototype.findBranchSegmentStart = function (direction) {
        var _a, _b, _c, _d;
        var selectedId = (_a = this.filteredNodes[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.node.entry.id;
        if (!selectedId)
            return this.selectedIndex;
        var indexByEntryId = new Map(this.filteredNodes.map(function (node, i) { return [node.node.entry.id, i]; }));
        var currentId = selectedId;
        if (direction === "down") {
            while (true) {
                var children = (_b = this.visibleChildrenMap.get(currentId)) !== null && _b !== void 0 ? _b : [];
                if (children.length === 0)
                    return indexByEntryId.get(currentId);
                if (children.length > 1)
                    return indexByEntryId.get(children[0]);
                currentId = children[0];
            }
        }
        // direction === "up"
        while (true) {
            var parentId = (_c = this.visibleParentMap.get(currentId)) !== null && _c !== void 0 ? _c : null;
            if (parentId === null)
                return indexByEntryId.get(currentId);
            var children = (_d = this.visibleChildrenMap.get(parentId)) !== null && _d !== void 0 ? _d : [];
            if (children.length > 1) {
                var segmentStart = indexByEntryId.get(currentId);
                if (segmentStart < this.selectedIndex) {
                    return segmentStart;
                }
            }
            currentId = parentId;
        }
    };
    return TreeList;
}());
/** Component that displays the current search query */
var SearchLine = /** @class */ (function () {
    function SearchLine(treeList) {
        this.treeList = treeList;
    }
    SearchLine.prototype.invalidate = function () { };
    SearchLine.prototype.render = function (width) {
        var query = this.treeList.getSearchQuery();
        if (query) {
            return [(0, pi_tui_1.truncateToWidth)("  ".concat(theme_js_1.theme.fg("muted", "Type to search:"), " ").concat(theme_js_1.theme.fg("accent", query)), width)];
        }
        return [(0, pi_tui_1.truncateToWidth)("  ".concat(theme_js_1.theme.fg("muted", "Type to search:")), width)];
    };
    SearchLine.prototype.handleInput = function (_keyData) { };
    return SearchLine;
}());
/** Label input component shown when editing a label */
var LabelInput = /** @class */ (function () {
    function LabelInput(entryId, currentLabel) {
        // Focusable implementation - propagate to input for IME cursor positioning
        this._focused = false;
        this.entryId = entryId;
        this.input = new pi_tui_1.Input();
        if (currentLabel) {
            this.input.setValue(currentLabel);
        }
    }
    Object.defineProperty(LabelInput.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.input.focused = value;
        },
        enumerable: false,
        configurable: true
    });
    LabelInput.prototype.invalidate = function () { };
    LabelInput.prototype.render = function (width) {
        var lines = [];
        var indent = "  ";
        var availableWidth = width - indent.length;
        lines.push((0, pi_tui_1.truncateToWidth)("".concat(indent).concat(theme_js_1.theme.fg("muted", "Label (empty to remove):")), width));
        lines.push.apply(lines, this.input.render(availableWidth).map(function (line) { return (0, pi_tui_1.truncateToWidth)("".concat(indent).concat(line), width); }));
        lines.push((0, pi_tui_1.truncateToWidth)("".concat(indent).concat((0, keybinding_hints_js_1.keyHint)("selectConfirm", "save"), "  ").concat((0, keybinding_hints_js_1.keyHint)("selectCancel", "cancel")), width));
        return lines;
    };
    LabelInput.prototype.handleInput = function (keyData) {
        var _a, _b;
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(keyData, "selectConfirm")) {
            var value = this.input.getValue().trim();
            (_a = this.onSubmit) === null || _a === void 0 ? void 0 : _a.call(this, this.entryId, value || undefined);
        }
        else if (kb.matches(keyData, "selectCancel")) {
            (_b = this.onCancel) === null || _b === void 0 ? void 0 : _b.call(this);
        }
        else {
            this.input.handleInput(keyData);
        }
    };
    return LabelInput;
}());
/**
 * Component that renders a session tree selector for navigation
 */
var TreeSelectorComponent = /** @class */ (function (_super) {
    __extends(TreeSelectorComponent, _super);
    function TreeSelectorComponent(tree, currentLeafId, terminalHeight, onSelect, onCancel, onLabelChange, initialSelectedId, initialFilterMode) {
        var _this = _super.call(this) || this;
        _this.labelInput = null;
        // Focusable implementation - propagate to labelInput when active for IME cursor positioning
        _this._focused = false;
        _this.onLabelChangeCallback = onLabelChange;
        var maxVisibleLines = Math.max(5, Math.floor(terminalHeight / 2));
        _this.treeList = new TreeList(tree, currentLeafId, maxVisibleLines, initialSelectedId, initialFilterMode);
        _this.treeList.onSelect = onSelect;
        _this.treeList.onCancel = onCancel;
        _this.treeList.onLabelEdit = function (entryId, currentLabel) { return _this.showLabelInput(entryId, currentLabel); };
        _this.treeContainer = new pi_tui_1.Container();
        _this.treeContainer.addChild(_this.treeList);
        _this.labelInputContainer = new pi_tui_1.Container();
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.bold("  Session Tree"), 1, 0));
        _this.addChild(new pi_tui_1.TruncatedText(theme_js_1.theme.fg("muted", "  ↑/↓: move. ←/→: page. ^←/^→ or Alt+←/Alt+→: fold/branch. Shift+L: label. ") +
            theme_js_1.theme.fg("muted", "^D/^T/^U/^L/^A: filters (^O/⇧^O cycle)"), 0, 0));
        _this.addChild(new SearchLine(_this.treeList));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(_this.treeContainer);
        _this.addChild(_this.labelInputContainer);
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        if (tree.length === 0) {
            setTimeout(function () { return onCancel(); }, 100);
        }
        return _this;
    }
    Object.defineProperty(TreeSelectorComponent.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            // Propagate to labelInput when it's active
            if (this.labelInput) {
                this.labelInput.focused = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    TreeSelectorComponent.prototype.showLabelInput = function (entryId, currentLabel) {
        var _this = this;
        this.labelInput = new LabelInput(entryId, currentLabel);
        this.labelInput.onSubmit = function (id, label) {
            var _a;
            _this.treeList.updateNodeLabel(id, label);
            (_a = _this.onLabelChangeCallback) === null || _a === void 0 ? void 0 : _a.call(_this, id, label);
            _this.hideLabelInput();
        };
        this.labelInput.onCancel = function () { return _this.hideLabelInput(); };
        // Propagate current focused state to the new labelInput
        this.labelInput.focused = this._focused;
        this.treeContainer.clear();
        this.labelInputContainer.clear();
        this.labelInputContainer.addChild(this.labelInput);
    };
    TreeSelectorComponent.prototype.hideLabelInput = function () {
        this.labelInput = null;
        this.labelInputContainer.clear();
        this.treeContainer.clear();
        this.treeContainer.addChild(this.treeList);
    };
    TreeSelectorComponent.prototype.handleInput = function (keyData) {
        if (this.labelInput) {
            this.labelInput.handleInput(keyData);
        }
        else {
            this.treeList.handleInput(keyData);
        }
    };
    TreeSelectorComponent.prototype.getTreeList = function () {
        return this.treeList;
    };
    return TreeSelectorComponent;
}(pi_tui_1.Container));
exports.TreeSelectorComponent = TreeSelectorComponent;
