"use strict";
/**
 * TUI component for managing package resources (enable/disable)
 */
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
exports.ConfigSelectorComponent = void 0;
var node_path_1 = require("node:path");
var pi_tui_1 = require("@mariozechner/pi-tui");
var config_js_1 = require("../../../config.js");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
var RESOURCE_TYPE_LABELS = {
    extensions: "Extensions",
    skills: "Skills",
    prompts: "Prompts",
    themes: "Themes",
};
function getGroupLabel(metadata) {
    if (metadata.origin === "package") {
        return "".concat(metadata.source, " (").concat(metadata.scope, ")");
    }
    // Top-level resources
    if (metadata.source === "auto") {
        return metadata.scope === "user" ? "User (~/.pi/agent/)" : "Project (.pi/)";
    }
    return metadata.scope === "user" ? "User settings" : "Project settings";
}
function buildGroups(resolved) {
    var groupMap = new Map();
    var addToGroup = function (resources, resourceType) {
        for (var _i = 0, resources_1 = resources; _i < resources_1.length; _i++) {
            var res = resources_1[_i];
            var path = res.path, enabled = res.enabled, metadata = res.metadata;
            var groupKey = "".concat(metadata.origin, ":").concat(metadata.scope, ":").concat(metadata.source);
            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    key: groupKey,
                    label: getGroupLabel(metadata),
                    scope: metadata.scope,
                    origin: metadata.origin,
                    source: metadata.source,
                    subgroups: [],
                });
            }
            var group = groupMap.get(groupKey);
            var subgroupKey = "".concat(groupKey, ":").concat(resourceType);
            var subgroup = group.subgroups.find(function (sg) { return sg.type === resourceType; });
            if (!subgroup) {
                subgroup = {
                    type: resourceType,
                    label: RESOURCE_TYPE_LABELS[resourceType],
                    items: [],
                };
                group.subgroups.push(subgroup);
            }
            var fileName = (0, node_path_1.basename)(path);
            var parentFolder = (0, node_path_1.basename)((0, node_path_1.dirname)(path));
            var displayName = void 0;
            if (resourceType === "extensions" && parentFolder !== "extensions") {
                displayName = "".concat(parentFolder, "/").concat(fileName);
            }
            else if (resourceType === "skills" && fileName === "SKILL.md") {
                displayName = parentFolder;
            }
            else {
                displayName = fileName;
            }
            subgroup.items.push({
                path: path,
                enabled: enabled,
                metadata: metadata,
                resourceType: resourceType,
                displayName: displayName,
                groupKey: groupKey,
                subgroupKey: subgroupKey,
            });
        }
    };
    addToGroup(resolved.extensions, "extensions");
    addToGroup(resolved.skills, "skills");
    addToGroup(resolved.prompts, "prompts");
    addToGroup(resolved.themes, "themes");
    // Sort groups: packages first, then top-level; user before project
    var groups = Array.from(groupMap.values());
    groups.sort(function (a, b) {
        if (a.origin !== b.origin) {
            return a.origin === "package" ? -1 : 1;
        }
        if (a.scope !== b.scope) {
            return a.scope === "user" ? -1 : 1;
        }
        return a.source.localeCompare(b.source);
    });
    // Sort subgroups within each group by type order, and items by name
    var typeOrder = { extensions: 0, skills: 1, prompts: 2, themes: 3 };
    for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
        var group = groups_1[_i];
        group.subgroups.sort(function (a, b) { return typeOrder[a.type] - typeOrder[b.type]; });
        for (var _a = 0, _b = group.subgroups; _a < _b.length; _a++) {
            var subgroup = _b[_a];
            subgroup.items.sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
        }
    }
    return groups;
}
var ConfigSelectorHeader = /** @class */ (function () {
    function ConfigSelectorHeader() {
    }
    ConfigSelectorHeader.prototype.invalidate = function () { };
    ConfigSelectorHeader.prototype.render = function (width) {
        var title = theme_js_1.theme.bold("Resource Configuration");
        var sep = theme_js_1.theme.fg("muted", " · ");
        var hint = (0, keybinding_hints_js_1.rawKeyHint)("space", "toggle") + sep + (0, keybinding_hints_js_1.rawKeyHint)("esc", "close");
        var hintWidth = (0, pi_tui_1.visibleWidth)(hint);
        var titleWidth = (0, pi_tui_1.visibleWidth)(title);
        var spacing = Math.max(1, width - titleWidth - hintWidth);
        return [
            (0, pi_tui_1.truncateToWidth)("".concat(title).concat(" ".repeat(spacing)).concat(hint), width, ""),
            theme_js_1.theme.fg("muted", "Type to filter resources"),
        ];
    };
    return ConfigSelectorHeader;
}());
var ResourceList = /** @class */ (function () {
    function ResourceList(groups, settingsManager, cwd, agentDir) {
        this.flatItems = [];
        this.filteredItems = [];
        this.selectedIndex = 0;
        this.maxVisible = 15;
        this._focused = false;
        this.groups = groups;
        this.settingsManager = settingsManager;
        this.cwd = cwd;
        this.agentDir = agentDir;
        this.searchInput = new pi_tui_1.Input();
        this.buildFlatList();
        this.filteredItems = __spreadArray([], this.flatItems, true);
    }
    Object.defineProperty(ResourceList.prototype, "focused", {
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
    ResourceList.prototype.buildFlatList = function () {
        this.flatItems = [];
        for (var _i = 0, _a = this.groups; _i < _a.length; _i++) {
            var group = _a[_i];
            this.flatItems.push({ type: "group", group: group });
            for (var _b = 0, _c = group.subgroups; _b < _c.length; _b++) {
                var subgroup = _c[_b];
                this.flatItems.push({ type: "subgroup", subgroup: subgroup, group: group });
                for (var _d = 0, _e = subgroup.items; _d < _e.length; _d++) {
                    var item = _e[_d];
                    this.flatItems.push({ type: "item", item: item });
                }
            }
        }
        // Start selection on first item (not header)
        this.selectedIndex = this.flatItems.findIndex(function (e) { return e.type === "item"; });
        if (this.selectedIndex < 0)
            this.selectedIndex = 0;
    };
    ResourceList.prototype.findNextItem = function (fromIndex, direction) {
        var idx = fromIndex + direction;
        while (idx >= 0 && idx < this.filteredItems.length) {
            if (this.filteredItems[idx].type === "item") {
                return idx;
            }
            idx += direction;
        }
        return fromIndex; // Stay at current if no item found
    };
    ResourceList.prototype.filterItems = function (query) {
        if (!query.trim()) {
            this.filteredItems = __spreadArray([], this.flatItems, true);
            this.selectFirstItem();
            return;
        }
        var lowerQuery = query.toLowerCase();
        var matchingItems = new Set();
        var matchingSubgroups = new Set();
        var matchingGroups = new Set();
        for (var _i = 0, _a = this.flatItems; _i < _a.length; _i++) {
            var entry = _a[_i];
            if (entry.type === "item") {
                var item = entry.item;
                if (item.displayName.toLowerCase().includes(lowerQuery) ||
                    item.resourceType.toLowerCase().includes(lowerQuery) ||
                    item.path.toLowerCase().includes(lowerQuery)) {
                    matchingItems.add(item);
                }
            }
        }
        // Find which subgroups and groups contain matching items
        for (var _b = 0, _c = this.groups; _b < _c.length; _b++) {
            var group = _c[_b];
            for (var _d = 0, _e = group.subgroups; _d < _e.length; _d++) {
                var subgroup = _e[_d];
                for (var _f = 0, _g = subgroup.items; _f < _g.length; _f++) {
                    var item = _g[_f];
                    if (matchingItems.has(item)) {
                        matchingSubgroups.add(subgroup);
                        matchingGroups.add(group);
                    }
                }
            }
        }
        this.filteredItems = [];
        for (var _h = 0, _j = this.flatItems; _h < _j.length; _h++) {
            var entry = _j[_h];
            if (entry.type === "group" && matchingGroups.has(entry.group)) {
                this.filteredItems.push(entry);
            }
            else if (entry.type === "subgroup" && matchingSubgroups.has(entry.subgroup)) {
                this.filteredItems.push(entry);
            }
            else if (entry.type === "item" && matchingItems.has(entry.item)) {
                this.filteredItems.push(entry);
            }
        }
        this.selectFirstItem();
    };
    ResourceList.prototype.selectFirstItem = function () {
        var firstItemIndex = this.filteredItems.findIndex(function (e) { return e.type === "item"; });
        this.selectedIndex = firstItemIndex >= 0 ? firstItemIndex : 0;
    };
    ResourceList.prototype.updateItem = function (item, enabled) {
        item.enabled = enabled;
        // Update in groups too
        for (var _i = 0, _a = this.groups; _i < _a.length; _i++) {
            var group = _a[_i];
            for (var _b = 0, _c = group.subgroups; _b < _c.length; _b++) {
                var subgroup = _c[_b];
                var found = subgroup.items.find(function (i) { return i.path === item.path && i.resourceType === item.resourceType; });
                if (found) {
                    found.enabled = enabled;
                    return;
                }
            }
        }
    };
    ResourceList.prototype.invalidate = function () { };
    ResourceList.prototype.render = function (width) {
        var lines = [];
        // Search input
        lines.push.apply(lines, this.searchInput.render(width));
        lines.push("");
        if (this.filteredItems.length === 0) {
            lines.push(theme_js_1.theme.fg("muted", "  No resources found"));
            return lines;
        }
        // Calculate visible range
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(this.maxVisible / 2), this.filteredItems.length - this.maxVisible));
        var endIndex = Math.min(startIndex + this.maxVisible, this.filteredItems.length);
        for (var i = startIndex; i < endIndex; i++) {
            var entry = this.filteredItems[i];
            var isSelected = i === this.selectedIndex;
            if (entry.type === "group") {
                // Main group header (no cursor)
                var groupLine = theme_js_1.theme.fg("accent", theme_js_1.theme.bold(entry.group.label));
                lines.push((0, pi_tui_1.truncateToWidth)("  ".concat(groupLine), width, ""));
            }
            else if (entry.type === "subgroup") {
                // Subgroup header (indented, no cursor)
                var subgroupLine = theme_js_1.theme.fg("muted", entry.subgroup.label);
                lines.push((0, pi_tui_1.truncateToWidth)("    ".concat(subgroupLine), width, ""));
            }
            else {
                // Resource item (cursor only on items)
                var item = entry.item;
                var cursor = isSelected ? "> " : "  ";
                var checkbox = item.enabled ? theme_js_1.theme.fg("success", "[x]") : theme_js_1.theme.fg("dim", "[ ]");
                var name_1 = isSelected ? theme_js_1.theme.bold(item.displayName) : item.displayName;
                lines.push((0, pi_tui_1.truncateToWidth)("".concat(cursor, "    ").concat(checkbox, " ").concat(name_1), width, "..."));
            }
        }
        // Scroll indicator
        if (startIndex > 0 || endIndex < this.filteredItems.length) {
            lines.push(theme_js_1.theme.fg("dim", "  (".concat(this.selectedIndex + 1, "/").concat(this.filteredItems.length, ")")));
        }
        return lines;
    };
    ResourceList.prototype.handleInput = function (data) {
        var _a, _b, _c;
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(data, "selectUp")) {
            this.selectedIndex = this.findNextItem(this.selectedIndex, -1);
            return;
        }
        if (kb.matches(data, "selectDown")) {
            this.selectedIndex = this.findNextItem(this.selectedIndex, 1);
            return;
        }
        if (kb.matches(data, "selectPageUp")) {
            // Jump up by maxVisible, then find nearest item
            var target = Math.max(0, this.selectedIndex - this.maxVisible);
            while (target < this.filteredItems.length && this.filteredItems[target].type !== "item") {
                target++;
            }
            if (target < this.filteredItems.length) {
                this.selectedIndex = target;
            }
            return;
        }
        if (kb.matches(data, "selectPageDown")) {
            // Jump down by maxVisible, then find nearest item
            var target = Math.min(this.filteredItems.length - 1, this.selectedIndex + this.maxVisible);
            while (target >= 0 && this.filteredItems[target].type !== "item") {
                target--;
            }
            if (target >= 0) {
                this.selectedIndex = target;
            }
            return;
        }
        if (kb.matches(data, "selectCancel")) {
            (_a = this.onCancel) === null || _a === void 0 ? void 0 : _a.call(this);
            return;
        }
        if ((0, pi_tui_1.matchesKey)(data, "ctrl+c")) {
            (_b = this.onExit) === null || _b === void 0 ? void 0 : _b.call(this);
            return;
        }
        if (data === " " || kb.matches(data, "selectConfirm")) {
            var entry = this.filteredItems[this.selectedIndex];
            if ((entry === null || entry === void 0 ? void 0 : entry.type) === "item") {
                var newEnabled = !entry.item.enabled;
                this.toggleResource(entry.item, newEnabled);
                this.updateItem(entry.item, newEnabled);
                (_c = this.onToggle) === null || _c === void 0 ? void 0 : _c.call(this, entry.item, newEnabled);
            }
            return;
        }
        // Pass to search input
        this.searchInput.handleInput(data);
        this.filterItems(this.searchInput.getValue());
    };
    ResourceList.prototype.toggleResource = function (item, enabled) {
        if (item.metadata.origin === "top-level") {
            this.toggleTopLevelResource(item, enabled);
        }
        else {
            this.togglePackageResource(item, enabled);
        }
    };
    ResourceList.prototype.toggleTopLevelResource = function (item, enabled) {
        var _a;
        var scope = item.metadata.scope;
        var settings = scope === "project" ? this.settingsManager.getProjectSettings() : this.settingsManager.getGlobalSettings();
        var arrayKey = item.resourceType;
        var current = ((_a = settings[arrayKey]) !== null && _a !== void 0 ? _a : []);
        // Generate pattern for this resource
        var pattern = this.getResourcePattern(item);
        var disablePattern = "-".concat(pattern);
        var enablePattern = "+".concat(pattern);
        // Filter out existing patterns for this resource
        var updated = current.filter(function (p) {
            var stripped = p.startsWith("!") || p.startsWith("+") || p.startsWith("-") ? p.slice(1) : p;
            return stripped !== pattern;
        });
        if (enabled) {
            updated.push(enablePattern);
        }
        else {
            updated.push(disablePattern);
        }
        if (scope === "project") {
            if (arrayKey === "extensions") {
                this.settingsManager.setProjectExtensionPaths(updated);
            }
            else if (arrayKey === "skills") {
                this.settingsManager.setProjectSkillPaths(updated);
            }
            else if (arrayKey === "prompts") {
                this.settingsManager.setProjectPromptTemplatePaths(updated);
            }
            else if (arrayKey === "themes") {
                this.settingsManager.setProjectThemePaths(updated);
            }
        }
        else {
            if (arrayKey === "extensions") {
                this.settingsManager.setExtensionPaths(updated);
            }
            else if (arrayKey === "skills") {
                this.settingsManager.setSkillPaths(updated);
            }
            else if (arrayKey === "prompts") {
                this.settingsManager.setPromptTemplatePaths(updated);
            }
            else if (arrayKey === "themes") {
                this.settingsManager.setThemePaths(updated);
            }
        }
    };
    ResourceList.prototype.togglePackageResource = function (item, enabled) {
        var _a, _b;
        var scope = item.metadata.scope;
        var settings = scope === "project" ? this.settingsManager.getProjectSettings() : this.settingsManager.getGlobalSettings();
        var packages = __spreadArray([], ((_a = settings.packages) !== null && _a !== void 0 ? _a : []), true);
        var pkgIndex = packages.findIndex(function (pkg) {
            var source = typeof pkg === "string" ? pkg : pkg.source;
            return source === item.metadata.source;
        });
        if (pkgIndex === -1)
            return;
        var pkg = packages[pkgIndex];
        // Convert string to object form if needed
        if (typeof pkg === "string") {
            pkg = { source: pkg };
            packages[pkgIndex] = pkg;
        }
        // Get the resource array for this type
        var arrayKey = item.resourceType;
        var current = ((_b = pkg[arrayKey]) !== null && _b !== void 0 ? _b : []);
        // Generate pattern relative to package root
        var pattern = this.getPackageResourcePattern(item);
        var disablePattern = "-".concat(pattern);
        var enablePattern = "+".concat(pattern);
        // Filter out existing patterns for this resource
        var updated = current.filter(function (p) {
            var stripped = p.startsWith("!") || p.startsWith("+") || p.startsWith("-") ? p.slice(1) : p;
            return stripped !== pattern;
        });
        if (enabled) {
            updated.push(enablePattern);
        }
        else {
            updated.push(disablePattern);
        }
        pkg[arrayKey] = updated.length > 0 ? updated : undefined;
        // Clean up empty filter object
        var hasFilters = ["extensions", "skills", "prompts", "themes"].some(function (k) { return pkg[k] !== undefined; });
        if (!hasFilters) {
            packages[pkgIndex] = pkg.source;
        }
        if (scope === "project") {
            this.settingsManager.setProjectPackages(packages);
        }
        else {
            this.settingsManager.setPackages(packages);
        }
    };
    ResourceList.prototype.getTopLevelBaseDir = function (scope) {
        return scope === "project" ? (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME) : this.agentDir;
    };
    ResourceList.prototype.getResourcePattern = function (item) {
        var scope = item.metadata.scope;
        var baseDir = this.getTopLevelBaseDir(scope);
        return (0, node_path_1.relative)(baseDir, item.path);
    };
    ResourceList.prototype.getPackageResourcePattern = function (item) {
        var _a;
        var baseDir = (_a = item.metadata.baseDir) !== null && _a !== void 0 ? _a : (0, node_path_1.dirname)(item.path);
        return (0, node_path_1.relative)(baseDir, item.path);
    };
    return ResourceList;
}());
var ConfigSelectorComponent = /** @class */ (function (_super) {
    __extends(ConfigSelectorComponent, _super);
    function ConfigSelectorComponent(resolvedPaths, settingsManager, cwd, agentDir, onClose, onExit, requestRender) {
        var _this = _super.call(this) || this;
        _this._focused = false;
        var groups = buildGroups(resolvedPaths);
        // Add header
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new ConfigSelectorHeader());
        _this.addChild(new pi_tui_1.Spacer(1));
        // Resource list
        _this.resourceList = new ResourceList(groups, settingsManager, cwd, agentDir);
        _this.resourceList.onCancel = onClose;
        _this.resourceList.onExit = onExit;
        _this.resourceList.onToggle = function () { return requestRender(); };
        _this.addChild(_this.resourceList);
        // Bottom border
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    Object.defineProperty(ConfigSelectorComponent.prototype, "focused", {
        get: function () {
            return this._focused;
        },
        set: function (value) {
            this._focused = value;
            this.resourceList.focused = value;
        },
        enumerable: false,
        configurable: true
    });
    ConfigSelectorComponent.prototype.getResourceList = function () {
        return this.resourceList;
    };
    return ConfigSelectorComponent;
}(pi_tui_1.Container));
exports.ConfigSelectorComponent = ConfigSelectorComponent;
