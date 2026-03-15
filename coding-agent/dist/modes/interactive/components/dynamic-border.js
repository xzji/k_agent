"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicBorder = void 0;
var theme_js_1 = require("../theme/theme.js");
/**
 * Dynamic border component that adjusts to viewport width.
 *
 * Note: When used from extensions loaded via jiti, the global `theme` may be undefined
 * because jiti creates a separate module cache. Always pass an explicit color
 * function when using DynamicBorder in components exported for extension use.
 */
var DynamicBorder = /** @class */ (function () {
    function DynamicBorder(color) {
        if (color === void 0) { color = function (str) { return theme_js_1.theme.fg("border", str); }; }
        this.color = color;
    }
    DynamicBorder.prototype.invalidate = function () {
        // No cached state to invalidate currently
    };
    DynamicBorder.prototype.render = function (width) {
        return [this.color("─".repeat(Math.max(1, width)))];
    };
    return DynamicBorder;
}());
exports.DynamicBorder = DynamicBorder;
