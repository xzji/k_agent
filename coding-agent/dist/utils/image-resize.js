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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resizeImage = resizeImage;
exports.formatDimensionNote = formatDimensionNote;
var exif_orientation_js_1 = require("./exif-orientation.js");
var photon_js_1 = require("./photon.js");
// 4.5MB - provides headroom below Anthropic's 5MB limit
var DEFAULT_MAX_BYTES = 4.5 * 1024 * 1024;
var DEFAULT_OPTIONS = {
    maxWidth: 2000,
    maxHeight: 2000,
    maxBytes: DEFAULT_MAX_BYTES,
    jpegQuality: 80,
};
/** Helper to pick the smaller of two buffers */
function pickSmaller(a, b) {
    return a.buffer.length <= b.buffer.length ? a : b;
}
/**
 * Resize an image to fit within the specified max dimensions and file size.
 * Returns the original image if it already fits within the limits.
 *
 * Uses Photon (Rust/WASM) for image processing. If Photon is not available,
 * returns the original image unchanged.
 *
 * Strategy for staying under maxBytes:
 * 1. First resize to maxWidth/maxHeight
 * 2. Try both PNG and JPEG formats, pick the smaller one
 * 3. If still too large, try JPEG with decreasing quality
 * 4. If still too large, progressively reduce dimensions
 */
function resizeImage(img, options) {
    return __awaiter(this, void 0, void 0, function () {
        // Helper to resize and encode in both formats, returning the smaller one
        function tryBothFormats(width, height, jpegQuality) {
            var resized = photon.resize(image, width, height, photon.SamplingFilter.Lanczos3);
            try {
                var pngBuffer = resized.get_bytes();
                var jpegBuffer = resized.get_bytes_jpeg(jpegQuality);
                return pickSmaller({ buffer: pngBuffer, mimeType: "image/png" }, { buffer: jpegBuffer, mimeType: "image/jpeg" });
            }
            finally {
                resized.free();
            }
        }
        var opts, inputBuffer, photon, image, inputBytes, rawImage, originalWidth, originalHeight, format, originalSize, targetWidth, targetHeight, qualitySteps, scaleSteps, best, finalWidth, finalHeight, _i, qualitySteps_1, quality, _a, scaleSteps_1, scale, _b, qualitySteps_2, quality;
        var _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    opts = __assign(__assign({}, DEFAULT_OPTIONS), options);
                    inputBuffer = Buffer.from(img.data, "base64");
                    return [4 /*yield*/, (0, photon_js_1.loadPhoton)()];
                case 1:
                    photon = _f.sent();
                    if (!photon) {
                        // Photon not available, return original image
                        return [2 /*return*/, {
                                data: img.data,
                                mimeType: img.mimeType,
                                originalWidth: 0,
                                originalHeight: 0,
                                width: 0,
                                height: 0,
                                wasResized: false,
                            }];
                    }
                    try {
                        inputBytes = new Uint8Array(inputBuffer);
                        rawImage = photon.PhotonImage.new_from_byteslice(inputBytes);
                        image = (0, exif_orientation_js_1.applyExifOrientation)(photon, rawImage, inputBytes);
                        if (image !== rawImage)
                            rawImage.free();
                        originalWidth = image.get_width();
                        originalHeight = image.get_height();
                        format = (_d = (_c = img.mimeType) === null || _c === void 0 ? void 0 : _c.split("/")[1]) !== null && _d !== void 0 ? _d : "png";
                        originalSize = inputBuffer.length;
                        if (originalWidth <= opts.maxWidth && originalHeight <= opts.maxHeight && originalSize <= opts.maxBytes) {
                            return [2 /*return*/, {
                                    data: img.data,
                                    mimeType: (_e = img.mimeType) !== null && _e !== void 0 ? _e : "image/".concat(format),
                                    originalWidth: originalWidth,
                                    originalHeight: originalHeight,
                                    width: originalWidth,
                                    height: originalHeight,
                                    wasResized: false,
                                }];
                        }
                        targetWidth = originalWidth;
                        targetHeight = originalHeight;
                        if (targetWidth > opts.maxWidth) {
                            targetHeight = Math.round((targetHeight * opts.maxWidth) / targetWidth);
                            targetWidth = opts.maxWidth;
                        }
                        if (targetHeight > opts.maxHeight) {
                            targetWidth = Math.round((targetWidth * opts.maxHeight) / targetHeight);
                            targetHeight = opts.maxHeight;
                        }
                        qualitySteps = [85, 70, 55, 40];
                        scaleSteps = [1.0, 0.75, 0.5, 0.35, 0.25];
                        best = void 0;
                        finalWidth = targetWidth;
                        finalHeight = targetHeight;
                        // First attempt: resize to target dimensions, try both formats
                        best = tryBothFormats(targetWidth, targetHeight, opts.jpegQuality);
                        if (best.buffer.length <= opts.maxBytes) {
                            return [2 /*return*/, {
                                    data: Buffer.from(best.buffer).toString("base64"),
                                    mimeType: best.mimeType,
                                    originalWidth: originalWidth,
                                    originalHeight: originalHeight,
                                    width: finalWidth,
                                    height: finalHeight,
                                    wasResized: true,
                                }];
                        }
                        // Still too large - try JPEG with decreasing quality
                        for (_i = 0, qualitySteps_1 = qualitySteps; _i < qualitySteps_1.length; _i++) {
                            quality = qualitySteps_1[_i];
                            best = tryBothFormats(targetWidth, targetHeight, quality);
                            if (best.buffer.length <= opts.maxBytes) {
                                return [2 /*return*/, {
                                        data: Buffer.from(best.buffer).toString("base64"),
                                        mimeType: best.mimeType,
                                        originalWidth: originalWidth,
                                        originalHeight: originalHeight,
                                        width: finalWidth,
                                        height: finalHeight,
                                        wasResized: true,
                                    }];
                            }
                        }
                        // Still too large - reduce dimensions progressively
                        for (_a = 0, scaleSteps_1 = scaleSteps; _a < scaleSteps_1.length; _a++) {
                            scale = scaleSteps_1[_a];
                            finalWidth = Math.round(targetWidth * scale);
                            finalHeight = Math.round(targetHeight * scale);
                            if (finalWidth < 100 || finalHeight < 100) {
                                break;
                            }
                            for (_b = 0, qualitySteps_2 = qualitySteps; _b < qualitySteps_2.length; _b++) {
                                quality = qualitySteps_2[_b];
                                best = tryBothFormats(finalWidth, finalHeight, quality);
                                if (best.buffer.length <= opts.maxBytes) {
                                    return [2 /*return*/, {
                                            data: Buffer.from(best.buffer).toString("base64"),
                                            mimeType: best.mimeType,
                                            originalWidth: originalWidth,
                                            originalHeight: originalHeight,
                                            width: finalWidth,
                                            height: finalHeight,
                                            wasResized: true,
                                        }];
                                }
                            }
                        }
                        // Last resort: return smallest version we produced
                        return [2 /*return*/, {
                                data: Buffer.from(best.buffer).toString("base64"),
                                mimeType: best.mimeType,
                                originalWidth: originalWidth,
                                originalHeight: originalHeight,
                                width: finalWidth,
                                height: finalHeight,
                                wasResized: true,
                            }];
                    }
                    catch (_g) {
                        // Failed to load image
                        return [2 /*return*/, {
                                data: img.data,
                                mimeType: img.mimeType,
                                originalWidth: 0,
                                originalHeight: 0,
                                width: 0,
                                height: 0,
                                wasResized: false,
                            }];
                    }
                    finally {
                        if (image) {
                            image.free();
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Format a dimension note for resized images.
 * This helps the model understand the coordinate mapping.
 */
function formatDimensionNote(result) {
    if (!result.wasResized) {
        return undefined;
    }
    var scale = result.originalWidth / result.width;
    return "[Image: original ".concat(result.originalWidth, "x").concat(result.originalHeight, ", displayed at ").concat(result.width, "x").concat(result.height, ". Multiply coordinates by ").concat(scale.toFixed(2), " to map to original image.]");
}
