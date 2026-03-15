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
exports.ScopedModelsSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
function isEnabled(enabledIds, id) {
    return enabledIds === null || enabledIds.includes(id);
}
function toggle(enabledIds, id) {
    if (enabledIds === null)
        return [id]; // First toggle: start with only this one
    var index = enabledIds.indexOf(id);
    if (index >= 0)
        return __spreadArray(__spreadArray([], enabledIds.slice(0, index), true), enabledIds.slice(index + 1), true);
    return __spreadArray(__spreadArray([], enabledIds, true), [id], false);
}
function enableAll(enabledIds, allIds, targetIds) {
    if (enabledIds === null)
        return null; // Already all enabled
    var targets = targetIds !== null && targetIds !== void 0 ? targetIds : allIds;
    var result = __spreadArray([], enabledIds, true);
    for (var _i = 0, targets_1 = targets; _i < targets_1.length; _i++) {
        var id = targets_1[_i];
        if (!result.includes(id))
            result.push(id);
    }
    return result.length === allIds.length ? null : result;
}
function clearAll(enabledIds, allIds, targetIds) {
    if (enabledIds === null) {
        return targetIds ? allIds.filter(function (id) { return !targetIds.includes(id); }) : [];
    }
    var targets = new Set(targetIds !== null && targetIds !== void 0 ? targetIds : enabledIds);
    return enabledIds.filter(function (id) { return !targets.has(id); });
}
function move(enabledIds, allIds, id, delta) {
    var _a;
    var list = enabledIds !== null && enabledIds !== void 0 ? enabledIds : __spreadArray([], allIds, true);
    var index = list.indexOf(id);
    if (index < 0)
        return list;
    var newIndex = index + delta;
    if (newIndex < 0 || newIndex >= list.length)
        return list;
    var result = __spreadArray([], list, true);
    _a = [result[newIndex], result[index]], result[index] = _a[0], result[newIndex] = _a[1];
    return result;
}
function getSortedIds(enabledIds, allIds) {
    if (enabledIds === null)
        return allIds;
    var enabledSet = new Set(enabledIds);
    return __spreadArray(__spreadArray([], enabledIds, true), allIds.filter(function (id) { return !enabledSet.has(id); }), true);
}
/**
 * Component for enabling/disabling models for Ctrl+P cycling.
 * Changes are session-only until explicitly persisted with Ctrl+S.
 */
var ScopedModelsSelectorComponent = /** @class */ (function (_super) {
    __extends(ScopedModelsSelectorComponent, _super);
    function ScopedModelsSelectorComponent(config, callbacks) {
        var _this = _super.call(this) || this;
        _this.modelsById = new Map();
        _this.allIds = [];
        _this.enabledIds = null;
        _this.filteredItems = [];
        _this.selectedIndex = 0;
        // Focusable implementation - propagate to searchInput for IME cursor positioning
        _this._focused = false;
        _this.maxVisible = 15;
        _this.isDirty = false;
        _this.callbacks = callbacks;
        for (var _i = 0, _a = config.allModels; _i < _a.length; _i++) {
            var model = _a[_i];
            var fullId = "".concat(model.provider, "/").concat(model.id);
            _this.modelsById.set(fullId, model);
            _this.allIds.push(fullId);
        }
        _this.enabledIds = config.hasEnabledModelsFilter ? __spreadArray([], config.enabledModelIds, true) : null;
        _this.filteredItems = _this.buildItems();
        // Header
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("accent", theme_js_1.theme.bold("Model Configuration")), 0, 0));
        _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "Session-only. Ctrl+S to save to settings."), 0, 0));
        _this.addChild(new pi_tui_1.Spacer(1));
        // Search input
        _this.searchInput = new pi_tui_1.Input();
        _this.addChild(_this.searchInput);
        _this.addChild(new pi_tui_1.Spacer(1));
        // List container
        _this.listContainer = new pi_tui_1.Container();
        _this.addChild(_this.listContainer);
        // Footer hint
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.footerText = new pi_tui_1.Text(_this.getFooterText(), 0, 0);
        _this.addChild(_this.footerText);
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.updateList();
        return _this;
    }
    Object.defineProperty(ScopedModelsSelectorComponent.prototype, "focused", {
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
    ScopedModelsSelectorComponent.prototype.buildItems = function () {
        var _this = this;
        // Filter out IDs that no longer have a corresponding model (e.g., after logout)
        return getSortedIds(this.enabledIds, this.allIds)
            .filter(function (id) { return _this.modelsById.has(id); })
            .map(function (id) { return ({
            fullId: id,
            model: _this.modelsById.get(id),
            enabled: isEnabled(_this.enabledIds, id),
        }); });
    };
    ScopedModelsSelectorComponent.prototype.getFooterText = function () {
        var _a, _b;
        var enabledCount = (_b = (_a = this.enabledIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : this.allIds.length;
        var allEnabled = this.enabledIds === null;
        var countText = allEnabled ? "all enabled" : "".concat(enabledCount, "/").concat(this.allIds.length, " enabled");
        var parts = ["Enter toggle", "^A all", "^X clear", "^P provider", "Alt+↑↓ reorder", "^S save", countText];
        return this.isDirty
            ? theme_js_1.theme.fg("dim", "  ".concat(parts.join(" · "), " ")) + theme_js_1.theme.fg("warning", "(unsaved)")
            : theme_js_1.theme.fg("dim", "  ".concat(parts.join(" · ")));
    };
    ScopedModelsSelectorComponent.prototype.refresh = function () {
        var query = this.searchInput.getValue();
        var items = this.buildItems();
        this.filteredItems = query ? (0, pi_tui_1.fuzzyFilter)(items, query, function (i) { return "".concat(i.model.id, " ").concat(i.model.provider); }) : items;
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredItems.length - 1));
        this.updateList();
        this.footerText.setText(this.getFooterText());
    };
    ScopedModelsSelectorComponent.prototype.updateList = function () {
        this.listContainer.clear();
        if (this.filteredItems.length === 0) {
            this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "  No matching models"), 0, 0));
            return;
        }
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(this.maxVisible / 2), this.filteredItems.length - this.maxVisible));
        var endIndex = Math.min(startIndex + this.maxVisible, this.filteredItems.length);
        var allEnabled = this.enabledIds === null;
        for (var i = startIndex; i < endIndex; i++) {
            var item = this.filteredItems[i];
            var isSelected = i === this.selectedIndex;
            var prefix = isSelected ? theme_js_1.theme.fg("accent", "→ ") : "  ";
            var modelText = isSelected ? theme_js_1.theme.fg("accent", item.model.id) : item.model.id;
            var providerBadge = theme_js_1.theme.fg("muted", " [".concat(item.model.provider, "]"));
            var status_1 = allEnabled ? "" : item.enabled ? theme_js_1.theme.fg("success", " ✓") : theme_js_1.theme.fg("dim", " ✗");
            this.listContainer.addChild(new pi_tui_1.Text("".concat(prefix).concat(modelText).concat(providerBadge).concat(status_1), 0, 0));
        }
        // Add scroll indicator if needed
        if (startIndex > 0 || endIndex < this.filteredItems.length) {
            this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "  (".concat(this.selectedIndex + 1, "/").concat(this.filteredItems.length, ")")), 0, 0));
        }
        if (this.filteredItems.length > 0) {
            var selected = this.filteredItems[this.selectedIndex];
            this.listContainer.addChild(new pi_tui_1.Spacer(1));
            this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "  Model Name: ".concat(selected.model.name)), 0, 0));
        }
    };
    ScopedModelsSelectorComponent.prototype.handleInput = function (data) {
        var _this = this;
        var _a, _b;
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        // Navigation
        if (kb.matches(data, "selectUp")) {
            if (this.filteredItems.length === 0)
                return;
            this.selectedIndex = this.selectedIndex === 0 ? this.filteredItems.length - 1 : this.selectedIndex - 1;
            this.updateList();
            return;
        }
        if (kb.matches(data, "selectDown")) {
            if (this.filteredItems.length === 0)
                return;
            this.selectedIndex = this.selectedIndex === this.filteredItems.length - 1 ? 0 : this.selectedIndex + 1;
            this.updateList();
            return;
        }
        // Alt+Up/Down - Reorder enabled models
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.alt("up")) || (0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.alt("down"))) {
            var item = this.filteredItems[this.selectedIndex];
            if (item && isEnabled(this.enabledIds, item.fullId)) {
                var delta = (0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.alt("up")) ? -1 : 1;
                var enabledList = (_a = this.enabledIds) !== null && _a !== void 0 ? _a : this.allIds;
                var currentIndex = enabledList.indexOf(item.fullId);
                var newIndex = currentIndex + delta;
                // Only move if within bounds
                if (newIndex >= 0 && newIndex < enabledList.length) {
                    this.enabledIds = move(this.enabledIds, this.allIds, item.fullId, delta);
                    this.isDirty = true;
                    this.selectedIndex += delta;
                    this.refresh();
                }
            }
            return;
        }
        // Toggle on Enter
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.enter)) {
            var item = this.filteredItems[this.selectedIndex];
            if (item) {
                var wasAllEnabled = this.enabledIds === null;
                this.enabledIds = toggle(this.enabledIds, item.fullId);
                this.isDirty = true;
                if (wasAllEnabled)
                    this.callbacks.onClearAll();
                this.callbacks.onModelToggle(item.fullId, isEnabled(this.enabledIds, item.fullId));
                this.refresh();
            }
            return;
        }
        // Ctrl+A - Enable all (filtered if search active, otherwise all)
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.ctrl("a"))) {
            var targetIds = this.searchInput.getValue() ? this.filteredItems.map(function (i) { return i.fullId; }) : undefined;
            this.enabledIds = enableAll(this.enabledIds, this.allIds, targetIds);
            this.isDirty = true;
            this.callbacks.onEnableAll(targetIds !== null && targetIds !== void 0 ? targetIds : this.allIds);
            this.refresh();
            return;
        }
        // Ctrl+X - Clear all (filtered if search active, otherwise all)
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.ctrl("x"))) {
            var targetIds = this.searchInput.getValue() ? this.filteredItems.map(function (i) { return i.fullId; }) : undefined;
            this.enabledIds = clearAll(this.enabledIds, this.allIds, targetIds);
            this.isDirty = true;
            this.callbacks.onClearAll();
            this.refresh();
            return;
        }
        // Ctrl+P - Toggle provider of current item
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.ctrl("p"))) {
            var item = this.filteredItems[this.selectedIndex];
            if (item) {
                var provider_1 = item.model.provider;
                var providerIds = this.allIds.filter(function (id) { return _this.modelsById.get(id).provider === provider_1; });
                var allEnabled = providerIds.every(function (id) { return isEnabled(_this.enabledIds, id); });
                this.enabledIds = allEnabled
                    ? clearAll(this.enabledIds, this.allIds, providerIds)
                    : enableAll(this.enabledIds, this.allIds, providerIds);
                this.isDirty = true;
                this.callbacks.onToggleProvider(provider_1, providerIds, !allEnabled);
                this.refresh();
            }
            return;
        }
        // Ctrl+S - Save/persist to settings
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.ctrl("s"))) {
            this.callbacks.onPersist((_b = this.enabledIds) !== null && _b !== void 0 ? _b : __spreadArray([], this.allIds, true));
            this.isDirty = false;
            this.footerText.setText(this.getFooterText());
            return;
        }
        // Ctrl+C - clear search or cancel if empty
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.ctrl("c"))) {
            if (this.searchInput.getValue()) {
                this.searchInput.setValue("");
                this.refresh();
            }
            else {
                this.callbacks.onCancel();
            }
            return;
        }
        // Escape - cancel
        if ((0, pi_tui_1.matchesKey)(data, pi_tui_1.Key.escape)) {
            this.callbacks.onCancel();
            return;
        }
        // Pass everything else to search input
        this.searchInput.handleInput(data);
        this.refresh();
    };
    ScopedModelsSelectorComponent.prototype.getSearchInput = function () {
        return this.searchInput;
    };
    return ScopedModelsSelectorComponent;
}(pi_tui_1.Container));
exports.ScopedModelsSelectorComponent = ScopedModelsSelectorComponent;
