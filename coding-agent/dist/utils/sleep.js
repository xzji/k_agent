"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
/**
 * Sleep helper that respects abort signal.
 */
function sleep(ms, signal) {
    return new Promise(function (resolve, reject) {
        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
            reject(new Error("Aborted"));
            return;
        }
        var timeout = setTimeout(resolve, ms);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", function () {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
        });
    });
}
