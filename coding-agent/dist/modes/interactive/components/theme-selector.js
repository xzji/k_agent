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
exports.ThemeSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var THEME_SELECT_LIST_LAYOUT = {
    minPrimaryColumnWidth: 12,
    maxPrimaryColumnWidth: 32,
};
/**
 * Component that renders a theme selector
 */
var ThemeSelectorComponent = /** @class */ (function (_super) {
    __extends(ThemeSelectorComponent, _super);
    function ThemeSelectorComponent(currentTheme, onSelect, onCancel, onPreview) {
        var _this = _super.call(this) || this;
        _this.onPreview = onPreview;
        // Get available themes and create select items
        var themes = (0, theme_js_1.getAvailableThemes)();
        var themeItems = themes.map(function (name) { return ({
            value: name,
            label: name,
            description: name === currentTheme ? "(current)" : undefined,
        }); });
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Create selector
        _this.selectList = new pi_tui_1.SelectList(themeItems, 10, (0, theme_js_1.getSelectListTheme)(), THEME_SELECT_LIST_LAYOUT);
        // Preselect current theme
        var currentIndex = themes.indexOf(currentTheme);
        if (currentIndex !== -1) {
            _this.selectList.setSelectedIndex(currentIndex);
        }
        _this.selectList.onSelect = function (item) {
            onSelect(item.value);
        };
        _this.selectList.onCancel = function () {
            onCancel();
        };
        _this.selectList.onSelectionChange = function (item) {
            _this.onPreview(item.value);
        };
        _this.addChild(_this.selectList);
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    ThemeSelectorComponent.prototype.getSelectList = function () {
        return this.selectList;
    };
    return ThemeSelectorComponent;
}(pi_tui_1.Container));
exports.ThemeSelectorComponent = ThemeSelectorComponent;
