"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = copyToClipboard;
var child_process_1 = require("child_process");
var os_1 = require("os");
var clipboard_image_js_1 = require("./clipboard-image.js");
function copyToX11Clipboard(options) {
    try {
        (0, child_process_1.execSync)("xclip -selection clipboard", options);
    }
    catch (_a) {
        (0, child_process_1.execSync)("xsel --clipboard --input", options);
    }
}
function copyToClipboard(text) {
    // Always emit OSC 52 - works over SSH/mosh, harmless locally
    var encoded = Buffer.from(text).toString("base64");
    process.stdout.write("\u001B]52;c;".concat(encoded, "\u0007"));
    // Also try native tools (best effort for local sessions)
    var p = (0, os_1.platform)();
    var options = { input: text, timeout: 5000, stdio: ["pipe", "ignore", "ignore"] };
    try {
        if (p === "darwin") {
            (0, child_process_1.execSync)("pbcopy", options);
        }
        else if (p === "win32") {
            (0, child_process_1.execSync)("clip", options);
        }
        else {
            // Linux. Try Termux, Wayland, or X11 clipboard tools.
            if (process.env.TERMUX_VERSION) {
                try {
                    (0, child_process_1.execSync)("termux-clipboard-set", options);
                    return;
                }
                catch (_a) {
                    // Fall back to Wayland or X11 tools.
                }
            }
            var hasWaylandDisplay = Boolean(process.env.WAYLAND_DISPLAY);
            var hasX11Display = Boolean(process.env.DISPLAY);
            var isWayland = (0, clipboard_image_js_1.isWaylandSession)();
            if (isWayland && hasWaylandDisplay) {
                try {
                    // Verify wl-copy exists (spawn errors are async and won't be caught)
                    (0, child_process_1.execSync)("which wl-copy", { stdio: "ignore" });
                    // wl-copy with execSync hangs due to fork behavior; use spawn instead
                    var proc = (0, child_process_1.spawn)("wl-copy", [], { stdio: ["pipe", "ignore", "ignore"] });
                    proc.stdin.on("error", function () {
                        // Ignore EPIPE errors if wl-copy exits early
                    });
                    proc.stdin.write(text);
                    proc.stdin.end();
                    proc.unref();
                }
                catch (_b) {
                    if (hasX11Display) {
                        copyToX11Clipboard(options);
                    }
                }
            }
            else if (hasX11Display) {
                copyToX11Clipboard(options);
            }
        }
    }
    catch (_c) {
        // Ignore - OSC 52 already emitted as fallback
    }
}
