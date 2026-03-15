"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWaylandSession = isWaylandSession;
exports.extensionForImageMimeType = extensionForImageMimeType;
exports.readClipboardImage = readClipboardImage;
var child_process_1 = require("child_process");
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var clipboard_native_js_1 = require("./clipboard-native.js");
var photon_js_1 = require("./photon.js");
var SUPPORTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
var DEFAULT_LIST_TIMEOUT_MS = 1000;
var DEFAULT_READ_TIMEOUT_MS = 3000;
var DEFAULT_POWERSHELL_TIMEOUT_MS = 5000;
var DEFAULT_MAX_BUFFER_BYTES = 50 * 1024 * 1024;
function isWaylandSession(env) {
    if (env === void 0) { env = process.env; }
    return Boolean(env.WAYLAND_DISPLAY) || env.XDG_SESSION_TYPE === "wayland";
}
function baseMimeType(mimeType) {
    var _a, _b;
    return (_b = (_a = mimeType.split(";")[0]) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) !== null && _b !== void 0 ? _b : mimeType.toLowerCase();
}
function extensionForImageMimeType(mimeType) {
    switch (baseMimeType(mimeType)) {
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        default:
            return null;
    }
}
function selectPreferredImageMimeType(mimeTypes) {
    var _a;
    var normalized = mimeTypes
        .map(function (t) { return t.trim(); })
        .filter(Boolean)
        .map(function (t) { return ({ raw: t, base: baseMimeType(t) }); });
    var _loop_1 = function (preferred) {
        var match = normalized.find(function (t) { return t.base === preferred; });
        if (match) {
            return { value: match.raw };
        }
    };
    for (var _i = 0, SUPPORTED_IMAGE_MIME_TYPES_1 = SUPPORTED_IMAGE_MIME_TYPES; _i < SUPPORTED_IMAGE_MIME_TYPES_1.length; _i++) {
        var preferred = SUPPORTED_IMAGE_MIME_TYPES_1[_i];
        var state_1 = _loop_1(preferred);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    var anyImage = normalized.find(function (t) { return t.base.startsWith("image/"); });
    return (_a = anyImage === null || anyImage === void 0 ? void 0 : anyImage.raw) !== null && _a !== void 0 ? _a : null;
}
function isSupportedImageMimeType(mimeType) {
    var base = baseMimeType(mimeType);
    return SUPPORTED_IMAGE_MIME_TYPES.some(function (t) { return t === base; });
}
/**
 * Convert unsupported image formats to PNG using Photon.
 * Returns null if conversion is unavailable or fails.
 */
function convertToPng(bytes) {
    return __awaiter(this, void 0, void 0, function () {
        var photon, image;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, photon_js_1.loadPhoton)()];
                case 1:
                    photon = _a.sent();
                    if (!photon) {
                        return [2 /*return*/, null];
                    }
                    try {
                        image = photon.PhotonImage.new_from_byteslice(bytes);
                        try {
                            return [2 /*return*/, image.get_bytes()];
                        }
                        finally {
                            image.free();
                        }
                    }
                    catch (_b) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function runCommand(command, args, options) {
    var _a, _b, _c;
    var timeoutMs = (_a = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _a !== void 0 ? _a : DEFAULT_READ_TIMEOUT_MS;
    var maxBufferBytes = (_b = options === null || options === void 0 ? void 0 : options.maxBufferBytes) !== null && _b !== void 0 ? _b : DEFAULT_MAX_BUFFER_BYTES;
    var result = (0, child_process_1.spawnSync)(command, args, {
        timeout: timeoutMs,
        maxBuffer: maxBufferBytes,
        env: options === null || options === void 0 ? void 0 : options.env,
    });
    if (result.error) {
        return { ok: false, stdout: Buffer.alloc(0) };
    }
    if (result.status !== 0) {
        return { ok: false, stdout: Buffer.alloc(0) };
    }
    var stdout = Buffer.isBuffer(result.stdout)
        ? result.stdout
        : Buffer.from((_c = result.stdout) !== null && _c !== void 0 ? _c : "", typeof result.stdout === "string" ? "utf-8" : undefined);
    return { ok: true, stdout: stdout };
}
function readClipboardImageViaWlPaste() {
    var list = runCommand("wl-paste", ["--list-types"], { timeoutMs: DEFAULT_LIST_TIMEOUT_MS });
    if (!list.ok) {
        return null;
    }
    var types = list.stdout
        .toString("utf-8")
        .split(/\r?\n/)
        .map(function (t) { return t.trim(); })
        .filter(Boolean);
    var selectedType = selectPreferredImageMimeType(types);
    if (!selectedType) {
        return null;
    }
    var data = runCommand("wl-paste", ["--type", selectedType, "--no-newline"]);
    if (!data.ok || data.stdout.length === 0) {
        return null;
    }
    return { bytes: data.stdout, mimeType: baseMimeType(selectedType) };
}
function isWSL(env) {
    if (env === void 0) { env = process.env; }
    if (env.WSL_DISTRO_NAME || env.WSLENV) {
        return true;
    }
    try {
        var release = (0, fs_1.readFileSync)("/proc/version", "utf-8");
        return /microsoft|wsl/i.test(release);
    }
    catch (_a) {
        return false;
    }
}
/**
 * On WSL, the Linux clipboard (Wayland/X11) does not receive image data from
 * Windows screenshots (Win+Shift+S). PowerShell can access the Windows clipboard
 * directly, so we use it as a fallback.
 */
function readClipboardImageViaPowerShell() {
    var tmpFile = (0, path_1.join)((0, os_1.tmpdir)(), "pi-wsl-clip-".concat((0, crypto_1.randomUUID)(), ".png"));
    try {
        var winPathResult = runCommand("wslpath", ["-w", tmpFile], { timeoutMs: DEFAULT_LIST_TIMEOUT_MS });
        if (!winPathResult.ok) {
            return null;
        }
        var winPath = winPathResult.stdout.toString("utf-8").trim();
        if (!winPath) {
            return null;
        }
        var psScript = [
            "Add-Type -AssemblyName System.Windows.Forms",
            "Add-Type -AssemblyName System.Drawing",
            "$path = $env:PI_WSL_CLIPBOARD_IMAGE_PATH",
            "$img = [System.Windows.Forms.Clipboard]::GetImage()",
            "if ($img) { $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); Write-Output 'ok' } else { Write-Output 'empty' }",
        ].join("; ");
        var result = runCommand("powershell.exe", ["-NoProfile", "-Command", psScript], {
            timeoutMs: DEFAULT_POWERSHELL_TIMEOUT_MS,
            env: __assign(__assign({}, process.env), { PI_WSL_CLIPBOARD_IMAGE_PATH: winPath }),
        });
        if (!result.ok) {
            return null;
        }
        var output = result.stdout.toString("utf-8").trim();
        if (output !== "ok") {
            return null;
        }
        var bytes = (0, fs_1.readFileSync)(tmpFile);
        if (bytes.length === 0) {
            return null;
        }
        return { bytes: new Uint8Array(bytes), mimeType: "image/png" };
    }
    catch (_a) {
        return null;
    }
    finally {
        try {
            (0, fs_1.unlinkSync)(tmpFile);
        }
        catch (_b) {
            // Ignore cleanup errors.
        }
    }
}
function readClipboardImageViaXclip() {
    var targets = runCommand("xclip", ["-selection", "clipboard", "-t", "TARGETS", "-o"], {
        timeoutMs: DEFAULT_LIST_TIMEOUT_MS,
    });
    var candidateTypes = [];
    if (targets.ok) {
        candidateTypes = targets.stdout
            .toString("utf-8")
            .split(/\r?\n/)
            .map(function (t) { return t.trim(); })
            .filter(Boolean);
    }
    var preferred = candidateTypes.length > 0 ? selectPreferredImageMimeType(candidateTypes) : null;
    var tryTypes = preferred ? __spreadArray([preferred], SUPPORTED_IMAGE_MIME_TYPES, true) : __spreadArray([], SUPPORTED_IMAGE_MIME_TYPES, true);
    for (var _i = 0, tryTypes_1 = tryTypes; _i < tryTypes_1.length; _i++) {
        var mimeType = tryTypes_1[_i];
        var data = runCommand("xclip", ["-selection", "clipboard", "-t", mimeType, "-o"]);
        if (data.ok && data.stdout.length > 0) {
            return { bytes: data.stdout, mimeType: baseMimeType(mimeType) };
        }
    }
    return null;
}
function readClipboardImageViaNativeClipboard() {
    return __awaiter(this, void 0, void 0, function () {
        var imageData, bytes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!clipboard_native_js_1.clipboard || !clipboard_native_js_1.clipboard.hasImage()) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, clipboard_native_js_1.clipboard.getImageBinary()];
                case 1:
                    imageData = _a.sent();
                    if (!imageData || imageData.length === 0) {
                        return [2 /*return*/, null];
                    }
                    bytes = imageData instanceof Uint8Array ? imageData : Uint8Array.from(imageData);
                    return [2 /*return*/, { bytes: bytes, mimeType: "image/png" }];
            }
        });
    });
}
function readClipboardImage(options) {
    return __awaiter(this, void 0, void 0, function () {
        var env, platform, image, wsl, wayland, pngBytes;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    env = (_a = options === null || options === void 0 ? void 0 : options.env) !== null && _a !== void 0 ? _a : process.env;
                    platform = (_b = options === null || options === void 0 ? void 0 : options.platform) !== null && _b !== void 0 ? _b : process.platform;
                    if (env.TERMUX_VERSION) {
                        return [2 /*return*/, null];
                    }
                    image = null;
                    if (!(platform === "linux")) return [3 /*break*/, 3];
                    wsl = isWSL(env);
                    wayland = isWaylandSession(env);
                    if (wayland || wsl) {
                        image = (_c = readClipboardImageViaWlPaste()) !== null && _c !== void 0 ? _c : readClipboardImageViaXclip();
                    }
                    if (!image && wsl) {
                        image = readClipboardImageViaPowerShell();
                    }
                    if (!(!image && !wayland)) return [3 /*break*/, 2];
                    return [4 /*yield*/, readClipboardImageViaNativeClipboard()];
                case 1:
                    image = _d.sent();
                    _d.label = 2;
                case 2: return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, readClipboardImageViaNativeClipboard()];
                case 4:
                    image = _d.sent();
                    _d.label = 5;
                case 5:
                    if (!image) {
                        return [2 /*return*/, null];
                    }
                    if (!!isSupportedImageMimeType(image.mimeType)) return [3 /*break*/, 7];
                    return [4 /*yield*/, convertToPng(image.bytes)];
                case 6:
                    pngBytes = _d.sent();
                    if (!pngBytes) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, { bytes: pngBytes, mimeType: "image/png" }];
                case 7: return [2 /*return*/, image];
            }
        });
    });
}
