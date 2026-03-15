"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyExifOrientation = applyExifOrientation;
function readOrientationFromTiff(bytes, tiffStart) {
    if (tiffStart + 8 > bytes.length)
        return 1;
    var byteOrder = (bytes[tiffStart] << 8) | bytes[tiffStart + 1];
    var le = byteOrder === 0x4949;
    var read16 = function (pos) {
        if (le)
            return bytes[pos] | (bytes[pos + 1] << 8);
        return (bytes[pos] << 8) | bytes[pos + 1];
    };
    var read32 = function (pos) {
        if (le)
            return bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
        return ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
    };
    var ifdOffset = read32(tiffStart + 4);
    var ifdStart = tiffStart + ifdOffset;
    if (ifdStart + 2 > bytes.length)
        return 1;
    var entryCount = read16(ifdStart);
    for (var i = 0; i < entryCount; i++) {
        var entryPos = ifdStart + 2 + i * 12;
        if (entryPos + 12 > bytes.length)
            return 1;
        if (read16(entryPos) === 0x0112) {
            var value = read16(entryPos + 8);
            return value >= 1 && value <= 8 ? value : 1;
        }
    }
    return 1;
}
function findJpegTiffOffset(bytes) {
    var offset = 2;
    while (offset < bytes.length - 1) {
        if (bytes[offset] !== 0xff)
            return -1;
        var marker = bytes[offset + 1];
        if (marker === 0xff) {
            offset++;
            continue;
        }
        if (marker === 0xe1) {
            if (offset + 4 >= bytes.length)
                return -1;
            var segmentStart = offset + 4;
            if (segmentStart + 6 > bytes.length)
                return -1;
            if (!hasExifHeader(bytes, segmentStart))
                return -1;
            return segmentStart + 6;
        }
        if (offset + 4 > bytes.length)
            return -1;
        var length_1 = (bytes[offset + 2] << 8) | bytes[offset + 3];
        offset += 2 + length_1;
    }
    return -1;
}
function findWebpTiffOffset(bytes) {
    var offset = 12;
    while (offset + 8 <= bytes.length) {
        var chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
        var chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
        var dataStart = offset + 8;
        if (chunkId === "EXIF") {
            if (dataStart + chunkSize > bytes.length)
                return -1;
            // Some WebP files have "Exif\0\0" prefix before the TIFF header
            var tiffStart = chunkSize >= 6 && hasExifHeader(bytes, dataStart) ? dataStart + 6 : dataStart;
            return tiffStart;
        }
        // RIFF chunks are padded to even size
        offset = dataStart + chunkSize + (chunkSize % 2);
    }
    return -1;
}
function hasExifHeader(bytes, offset) {
    return (bytes[offset] === 0x45 &&
        bytes[offset + 1] === 0x78 &&
        bytes[offset + 2] === 0x69 &&
        bytes[offset + 3] === 0x66 &&
        bytes[offset + 4] === 0x00 &&
        bytes[offset + 5] === 0x00);
}
function getExifOrientation(bytes) {
    var tiffOffset = -1;
    // JPEG: starts with FF D8
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        tiffOffset = findJpegTiffOffset(bytes);
    }
    // WebP: starts with RIFF....WEBP
    else if (bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50) {
        tiffOffset = findWebpTiffOffset(bytes);
    }
    if (tiffOffset === -1)
        return 1;
    return readOrientationFromTiff(bytes, tiffOffset);
}
function rotate90(photon, image, dstIndex) {
    var w = image.get_width();
    var h = image.get_height();
    var src = image.get_raw_pixels();
    var dst = new Uint8Array(src.length);
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var srcIdx = (y * w + x) * 4;
            var dstIdx = dstIndex(x, y, w, h) * 4;
            dst[dstIdx] = src[srcIdx];
            dst[dstIdx + 1] = src[srcIdx + 1];
            dst[dstIdx + 2] = src[srcIdx + 2];
            dst[dstIdx + 3] = src[srcIdx + 3];
        }
    }
    return new photon.PhotonImage(dst, h, w);
}
// Flip orientations mutate in-place. Rotations return a new image (caller must free the old one if different).
function applyExifOrientation(photon, image, originalBytes) {
    var orientation = getExifOrientation(originalBytes);
    if (orientation === 1)
        return image;
    switch (orientation) {
        case 2:
            photon.fliph(image);
            return image;
        case 3:
            photon.fliph(image);
            photon.flipv(image);
            return image;
        case 4:
            photon.flipv(image);
            return image;
        case 5: {
            var rotated = rotate90(photon, image, function (x, y, _w, h) { return x * h + (h - 1 - y); });
            photon.fliph(rotated);
            return rotated;
        }
        case 6:
            return rotate90(photon, image, function (x, y, _w, h) { return x * h + (h - 1 - y); });
        case 7: {
            var rotated = rotate90(photon, image, function (x, y, w, h) { return (w - 1 - x) * h + y; });
            photon.fliph(rotated);
            return rotated;
        }
        case 8:
            return rotate90(photon, image, function (x, y, w, h) { return (w - 1 - x) * h + y; });
        default:
            return image;
    }
}
