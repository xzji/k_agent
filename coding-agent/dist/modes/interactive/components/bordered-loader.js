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
exports.BorderedLoader = void 0;
var pi_tui_1 = require("@mariozechner/pi-tui");
var dynamic_border_js_1 = require("./dynamic-border.js");
var keybinding_hints_js_1 = require("./keybinding-hints.js");
/** Loader wrapped with borders for extension UI */
var BorderedLoader = /** @class */ (function (_super) {
    __extends(BorderedLoader, _super);
    function BorderedLoader(tui, theme, message, options) {
        var _a;
        var _this = _super.call(this) || this;
        _this.cancellable = (_a = options === null || options === void 0 ? void 0 : options.cancellable) !== null && _a !== void 0 ? _a : true;
        var borderColor = function (s) { return theme.fg("border", s); };
        _this.addChild(new dynamic_border_js_1.DynamicBorder(borderColor));
        if (_this.cancellable) {
            _this.loader = new pi_tui_1.CancellableLoader(tui, function (s) { return theme.fg("accent", s); }, function (s) { return theme.fg("muted", s); }, message);
        }
        else {
            _this.signalController = new AbortController();
            _this.loader = new pi_tui_1.Loader(tui, function (s) { return theme.fg("accent", s); }, function (s) { return theme.fg("muted", s); }, message);
        }
        _this.addChild(_this.loader);
        if (_this.cancellable) {
            _this.addChild(new pi_tui_1.Spacer(1));
            _this.addChild(new pi_tui_1.Text((0, keybinding_hints_js_1.keyHint)("selectCancel", "cancel"), 1, 0));
        }
        _this.addChild(new pi_tui_1.Spacer(1));
        _this.addChild(new dynamic_border_js_1.DynamicBorder(borderColor));
        return _this;
    }
    Object.defineProperty(BorderedLoader.prototype, "signal", {
        get: function () {
            var _a, _b;
            if (this.cancellable) {
                return this.loader.signal;
            }
            return (_b = (_a = this.signalController) === null || _a === void 0 ? void 0 : _a.signal) !== null && _b !== void 0 ? _b : new AbortController().signal;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BorderedLoader.prototype, "onAbort", {
        set: function (fn) {
            if (this.cancellable) {
                this.loader.onAbort = fn;
            }
        },
        enumerable: false,
        configurable: true
    });
    BorderedLoader.prototype.handleInput = function (data) {
        if (this.cancellable) {
            this.loader.handleInput(data);
        }
    };
    BorderedLoader.prototype.dispose = function () {
        if ("dispose" in this.loader && typeof this.loader.dispose === "function") {
            this.loader.dispose();
        }
    };
    return BorderedLoader;
}(pi_tui_1.Container));
exports.BorderedLoader = BorderedLoader;
