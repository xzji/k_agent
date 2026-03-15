"use strict";
/**
 * Central timing instrumentation for startup profiling.
 * Enable with PI_TIMING=1 environment variable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = time;
exports.printTimings = printTimings;
var ENABLED = process.env.PI_TIMING === "1";
var timings = [];
var lastTime = Date.now();
function time(label) {
    if (!ENABLED)
        return;
    var now = Date.now();
    timings.push({ label: label, ms: now - lastTime });
    lastTime = now;
}
function printTimings() {
    if (!ENABLED || timings.length === 0)
        return;
    console.error("\n--- Startup Timings ---");
    for (var _i = 0, timings_1 = timings; _i < timings_1.length; _i++) {
        var t = timings_1[_i];
        console.error("  ".concat(t.label, ": ").concat(t.ms, "ms"));
    }
    console.error("  TOTAL: ".concat(timings.reduce(function (a, b) { return a + b.ms; }, 0), "ms"));
    console.error("------------------------\n");
}
