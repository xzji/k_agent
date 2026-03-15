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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinkingSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var THINKING_SELECT_LIST_LAYOUT = {
    minPrimaryColumnWidth: 12,
    maxPrimaryColumnWidth: 32,
};
var LEVEL_DESCRIPTIONS = {
    off: "No reasoning",
    minimal: "Very brief reasoning (~1k tokens)",
    low: "Light reasoning (~2k tokens)",
    medium: "Moderate reasoning (~8k tokens)",
    high: "Deep reasoning (~16k tokens)",
    xhigh: "Maximum reasoning (~32k tokens)",
};
/**
 * Component that renders a thinking level selector with borders
 */
var ThinkingSelectorComponent = /** @class */ (function (_super) {
    __extends(ThinkingSelectorComponent, _super);
    function ThinkingSelectorComponent(currentLevel, availableLevels, onSelect, onCancel) {
        var _this = _super.call(this) || this;
        var thinkingLevels = availableLevels.map(function (level) { return ({
            value: level,
            label: level,
            description: LEVEL_DESCRIPTIONS[level],
        }); });
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Create selector
        _this.selectList = new pi_tui_1.SelectList(thinkingLevels, thinkingLevels.length, (0, theme_js_1.getSelectListTheme)(), THINKING_SELECT_LIST_LAYOUT);
        // Preselect current level
        var currentIndex = thinkingLevels.findIndex(function (item) { return item.value === currentLevel; });
        if (currentIndex !== -1) {
            _this.selectList.setSelectedIndex(currentIndex);
        }
        _this.selectList.onSelect = function (item) {
            onSelect(item.value);
        };
        _this.selectList.onCancel = function () {
            onCancel();
        };
        _this.addChild(_this.selectList);
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    ThinkingSelectorComponent.prototype.getSelectList = function () {
        return this.selectList;
    };
    return ThinkingSelectorComponent;
}(pi_tui_1.Container));
exports.ThinkingSelectorComponent = ThinkingSelectorComponent;
