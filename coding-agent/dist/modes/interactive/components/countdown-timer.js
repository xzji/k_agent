"use strict";
/**
 * Reusable countdown timer for dialog components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountdownTimer = void 0;
var CountdownTimer = /** @class */ (function () {
    function CountdownTimer(timeoutMs, tui, onTick, onExpire) {
        var _this = this;
        this.tui = tui;
        this.onTick = onTick;
        this.onExpire = onExpire;
        this.remainingSeconds = Math.ceil(timeoutMs / 1000);
        this.onTick(this.remainingSeconds);
        this.intervalId = setInterval(function () {
            var _a;
            _this.remainingSeconds--;
            _this.onTick(_this.remainingSeconds);
            (_a = _this.tui) === null || _a === void 0 ? void 0 : _a.requestRender();
            if (_this.remainingSeconds <= 0) {
                _this.dispose();
                _this.onExpire();
            }
        }, 1000);
    }
    CountdownTimer.prototype.dispose = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    };
    return CountdownTimer;
}());
exports.CountdownTimer = CountdownTimer;
