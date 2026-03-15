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
exports.ShowImagesSelectorComponent = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var theme_js_1 = require("../theme/theme.js");
var dynamic_border_js_1 = require("./dynamic-border.js");
var SHOW_IMAGES_SELECT_LIST_LAYOUT = {
    minPrimaryColumnWidth: 12,
    maxPrimaryColumnWidth: 32,
};
/**
 * Component that renders a show images selector with borders
 */
var ShowImagesSelectorComponent = /** @class */ (function (_super) {
    __extends(ShowImagesSelectorComponent, _super);
    function ShowImagesSelectorComponent(currentValue, onSelect, onCancel) {
        var _this = _super.call(this) || this;
        var items = [
            { value: "yes", label: "Yes", description: "Show images inline in terminal" },
            { value: "no", label: "No", description: "Show text placeholder instead" },
        ];
        // Add top border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        // Create selector
        _this.selectList = new pi_tui_1.SelectList(items, 5, (0, theme_js_1.getSelectListTheme)(), SHOW_IMAGES_SELECT_LIST_LAYOUT);
        // Preselect current value
        _this.selectList.setSelectedIndex(currentValue ? 0 : 1);
        _this.selectList.onSelect = function (item) {
            onSelect(item.value === "yes");
        };
        _this.selectList.onCancel = function () {
            onCancel();
        };
        _this.addChild(_this.selectList);
        // Add bottom border
        _this.addChild(new dynamic_border_js_1.DynamicBorder());
        return _this;
    }
    ShowImagesSelectorComponent.prototype.getSelectList = function () {
        return this.selectList;
    };
    return ShowImagesSelectorComponent;
}(pi_tui_1.Container));
exports.ShowImagesSelectorComponent = ShowImagesSelectorComponent;
