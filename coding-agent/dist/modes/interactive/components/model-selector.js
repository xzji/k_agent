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
exports.ModelSelectorComponent = void 0;
var pi_ai_1 = require("@mariozechner/pi-ai");
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
/**
 * Component that renders a model selector with search
 */
var ModelSelectorComponent = /** @class */ (function (_super) {
    __extends(ModelSelectorComponent, _super);
    function ModelSelectorComponent(tui, currentModel, settingsManager, modelRegistry, scopedModels, onSelect, onCancel, initialSearchInput) {
        var _this = _super.call(this) || this;
        // Focusable implementation - propagate to searchInput for IME cursor positioning
        _this._focused = false;
        _this.allModels = [];
        _this.scopedModelItems = [];
        _this.activeModels = [];
        _this.filteredModels = [];
        _this.selectedIndex = 0;
        _this.scope = "all";
        _this.tui = tui;
        _this.currentModel = currentModel;
        _this.settingsManager = settingsManager;
        _this.modelRegistry = modelRegistry;
        _this.scopedModels = scopedModels;
        _this.scope = scopedModels.length > 0 ? "scoped" : "all";
        _this.onSelectCallback = onSelect;
        _this.onCancelCallback = onCancel;
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add hint about model filtering
        if (scopedModels.length > 0) {
            _this.scopeText = new pi_tui_1.Text(_this.getScopeText(), 0, 0);
            _this.addChild(_this.scopeText);
            _this.scopeHintText = new pi_tui_1.Text(_this.getScopeHintText(), 0, 0);
            _this.addChild(_this.scopeHintText);
        }
        else {
            var hintText = "Only showing models with configured API keys (see README for details)";
            _this.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("warning", hintText), 0, 0));
        }
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create search input
        _this.searchInput = new pi_tui_1.Input();
        if (initialSearchInput) {
            _this.searchInput.setValue(initialSearchInput);
        }
        _this.searchInput.onSubmit = function () {
            // Enter on search input selects the first filtered item
            if (_this.filteredModels[_this.selectedIndex]) {
                _this.handleSelect(_this.filteredModels[_this.selectedIndex].model);
            }
        };
        _this.addChild(_this.searchInput);
        _this.addChild(new pi_tui_1.Spacer(1));
        // Create list container
        _this.listContainer = new pi_tui_1.Container();
        _this.addChild(_this.listContainer);
        _this.addChild(new pi_tui_1.Spacer(1));
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Load models and do initial render
        _this.loadModels().then(function () {
            if (initialSearchInput) {
                _this.filterModels(initialSearchInput);
            }
            else {
                _this.updateList();
            }
            // Request re-render after models are loaded
            _this.tui.requestRender();
        });
        return _this;
    }
    Object.defineProperty(ModelSelectorComponent.prototype, "focused", {
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
    ModelSelectorComponent.prototype.loadModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models, loadError, availableModels, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Refresh to pick up any changes to models.json
                        this.modelRegistry.refresh();
                        loadError = this.modelRegistry.getError();
                        if (loadError) {
                            this.errorMessage = loadError;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.modelRegistry.getAvailable()];
                    case 2:
                        availableModels = _a.sent();
                        models = availableModels.map(function (model) { return ({
                            provider: model.provider,
                            id: model.id,
                            model: model,
                        }); });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.allModels = [];
                        this.scopedModelItems = [];
                        this.activeModels = [];
                        this.filteredModels = [];
                        this.errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        return [2 /*return*/];
                    case 4:
                        this.allModels = this.sortModels(models);
                        this.scopedModelItems = this.sortModels(this.scopedModels.map(function (scoped) { return ({
                            provider: scoped.model.provider,
                            id: scoped.model.id,
                            model: scoped.model,
                        }); }));
                        this.activeModels = this.scope === "scoped" ? this.scopedModelItems : this.allModels;
                        this.filteredModels = this.activeModels;
                        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredModels.length - 1));
                        return [2 /*return*/];
                }
            });
        });
    };
    ModelSelectorComponent.prototype.sortModels = function (models) {
        var _this = this;
        var sorted = __spreadArray([], models, true);
        // Sort: current model first, then by provider
        sorted.sort(function (a, b) {
            var aIsCurrent = (0, pi_ai_1.modelsAreEqual)(_this.currentModel, a.model);
            var bIsCurrent = (0, pi_ai_1.modelsAreEqual)(_this.currentModel, b.model);
            if (aIsCurrent && !bIsCurrent)
                return -1;
            if (!aIsCurrent && bIsCurrent)
                return 1;
            return a.provider.localeCompare(b.provider);
        });
        return sorted;
    };
    ModelSelectorComponent.prototype.getScopeText = function () {
        var allText = this.scope === "all" ? theme_js_1.theme.fg("accent", "all") : theme_js_1.theme.fg("muted", "all");
        var scopedText = this.scope === "scoped" ? theme_js_1.theme.fg("accent", "scoped") : theme_js_1.theme.fg("muted", "scoped");
        return "".concat(theme_js_1.theme.fg("muted", "Scope: ")).concat(allText).concat(theme_js_1.theme.fg("muted", " | ")).concat(scopedText);
    };
    ModelSelectorComponent.prototype.getScopeHintText = function () {
        return (0, keybinding_hints_js_1.keyHint)("tab", "scope") + theme_js_1.theme.fg("muted", " (all/scoped)");
    };
    ModelSelectorComponent.prototype.setScope = function (scope) {
        if (this.scope === scope)
            return;
        this.scope = scope;
        this.activeModels = this.scope === "scoped" ? this.scopedModelItems : this.allModels;
        this.selectedIndex = 0;
        this.filterModels(this.searchInput.getValue());
        if (this.scopeText) {
            this.scopeText.setText(this.getScopeText());
        }
    };
    ModelSelectorComponent.prototype.filterModels = function (query) {
        this.filteredModels = query
            ? (0, pi_tui_1.fuzzyFilter)(this.activeModels, query, function (_a) {
                var id = _a.id, provider = _a.provider;
                return "".concat(id, " ").concat(provider);
            })
            : this.activeModels;
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredModels.length - 1));
        this.updateList();
    };
    ModelSelectorComponent.prototype.updateList = function () {
        this.listContainer.clear();
        var maxVisible = 10;
        var startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(maxVisible / 2), this.filteredModels.length - maxVisible));
        var endIndex = Math.min(startIndex + maxVisible, this.filteredModels.length);
        // Show visible slice of filtered models
        for (var i = startIndex; i < endIndex; i++) {
            var item = this.filteredModels[i];
            if (!item)
                continue;
            var isSelected = i === this.selectedIndex;
            var isCurrent = (0, pi_ai_1.modelsAreEqual)(this.currentModel, item.model);
            var line = "";
            if (isSelected) {
                var prefix = theme_js_1.theme.fg("accent", "→ ");
                var modelText = "".concat(item.id);
                var providerBadge = theme_js_1.theme.fg("muted", "[".concat(item.provider, "]"));
                var checkmark = isCurrent ? theme_js_1.theme.fg("success", " ✓") : "";
                line = "".concat(prefix + theme_js_1.theme.fg("accent", modelText), " ").concat(providerBadge).concat(checkmark);
            }
            else {
                var modelText = "  ".concat(item.id);
                var providerBadge = theme_js_1.theme.fg("muted", "[".concat(item.provider, "]"));
                var checkmark = isCurrent ? theme_js_1.theme.fg("success", " ✓") : "";
                line = "".concat(modelText, " ").concat(providerBadge).concat(checkmark);
            }
            this.listContainer.addChild(new pi_tui_1.Text(line, 0, 0));
        }
        // Add scroll indicator if needed
        if (startIndex > 0 || endIndex < this.filteredModels.length) {
            var scrollInfo = theme_js_1.theme.fg("muted", "  (".concat(this.selectedIndex + 1, "/").concat(this.filteredModels.length, ")"));
            this.listContainer.addChild(new pi_tui_1.Text(scrollInfo, 0, 0));
        }
        // Show error message or "no results" if empty
        if (this.errorMessage) {
            // Show error in red
            var errorLines = this.errorMessage.split("\n");
            for (var _i = 0, errorLines_1 = errorLines; _i < errorLines_1.length; _i++) {
                var line = errorLines_1[_i];
                this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("error", line), 0, 0));
            }
        }
        else if (this.filteredModels.length === 0) {
            this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "  No matching models"), 0, 0));
        }
        else {
            var selected = this.filteredModels[this.selectedIndex];
            this.listContainer.addChild(new pi_tui_1.Spacer(1));
            this.listContainer.addChild(new pi_tui_1.Text(theme_js_1.theme.fg("muted", "  Model Name: ".concat(selected.model.name)), 0, 0));
        }
    };
    ModelSelectorComponent.prototype.handleInput = function (keyData) {
        var kb = (0, pi_tui_1.getEditorKeybindings)();
        if (kb.matches(keyData, "tab")) {
            if (this.scopedModelItems.length > 0) {
                var nextScope = this.scope === "all" ? "scoped" : "all";
                this.setScope(nextScope);
                if (this.scopeHintText) {
                    this.scopeHintText.setText(this.getScopeHintText());
                }
            }
            return;
        }
        // Up arrow - wrap to bottom when at top
        if (kb.matches(keyData, "selectUp")) {
            if (this.filteredModels.length === 0)
                return;
            this.selectedIndex = this.selectedIndex === 0 ? this.filteredModels.length - 1 : this.selectedIndex - 1;
            this.updateList();
        }
        // Down arrow - wrap to top when at bottom
        else if (kb.matches(keyData, "selectDown")) {
            if (this.filteredModels.length === 0)
                return;
            this.selectedIndex = this.selectedIndex === this.filteredModels.length - 1 ? 0 : this.selectedIndex + 1;
            this.updateList();
        }
        // Enter
        else if (kb.matches(keyData, "selectConfirm")) {
            var selectedModel = this.filteredModels[this.selectedIndex];
            if (selectedModel) {
                this.handleSelect(selectedModel.model);
            }
        }
        // Escape or Ctrl+C
        else if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
        }
        // Pass everything else to search input
        else {
            this.searchInput.handleInput(keyData);
            this.filterModels(this.searchInput.getValue());
        }
    };
    ModelSelectorComponent.prototype.handleSelect = function (model) {
        // Save as new default
        this.settingsManager.setDefaultModelAndProvider(model.provider, model.id);
        this.onSelectCallback(model);
    };
    ModelSelectorComponent.prototype.getSearchInput = function () {
        return this.searchInput;
    };
    return ModelSelectorComponent;
}(pi_tui_1.Container));
exports.ModelSelectorComponent = ModelSelectorComponent;
