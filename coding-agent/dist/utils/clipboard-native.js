"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clipboard = void 0;
var module_1 = require("module");
var require = (0, module_1.createRequire)(import.meta.url);
var clipboard = null;
exports.clipboard = clipboard;
var hasDisplay = process.platform !== "linux" || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
if (!process.env.TERMUX_VERSION && hasDisplay) {
    try {
        exports.clipboard = clipboard = require("@mariozechner/clipboard");
    }
    catch (_a) {
        exports.clipboard = clipboard = null;
    }
}
