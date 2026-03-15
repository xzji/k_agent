"use strict";
/**
 * Armin says hi! A fun easter egg with animated XBM art.
 */
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
exports.ArminComponent = void 0;
var theme_js_1 = require("../theme/theme.js");
// XBM image: 31x36 pixels, LSB first, 1=background, 0=foreground
var WIDTH = 31;
var HEIGHT = 36;
var BITS = [
    0xff, 0xff, 0xff, 0x7f, 0xff, 0xf0, 0xff, 0x7f, 0xff, 0xed, 0xff, 0x7f, 0xff, 0xdb, 0xff, 0x7f, 0xff, 0xb7, 0xff,
    0x7f, 0xff, 0x77, 0xfe, 0x7f, 0x3f, 0xf8, 0xfe, 0x7f, 0xdf, 0xff, 0xfe, 0x7f, 0xdf, 0x3f, 0xfc, 0x7f, 0x9f, 0xc3,
    0xfb, 0x7f, 0x6f, 0xfc, 0xf4, 0x7f, 0xf7, 0x0f, 0xf7, 0x7f, 0xf7, 0xff, 0xf7, 0x7f, 0xf7, 0xff, 0xe3, 0x7f, 0xf7,
    0x07, 0xe8, 0x7f, 0xef, 0xf8, 0x67, 0x70, 0x0f, 0xff, 0xbb, 0x6f, 0xf1, 0x00, 0xd0, 0x5b, 0xfd, 0x3f, 0xec, 0x53,
    0xc1, 0xff, 0xef, 0x57, 0x9f, 0xfd, 0xee, 0x5f, 0x9f, 0xfc, 0xae, 0x5f, 0x1f, 0x78, 0xac, 0x5f, 0x3f, 0x00, 0x50,
    0x6c, 0x7f, 0x00, 0xdc, 0x77, 0xff, 0xc0, 0x3f, 0x78, 0xff, 0x01, 0xf8, 0x7f, 0xff, 0x03, 0x9c, 0x78, 0xff, 0x07,
    0x8c, 0x7c, 0xff, 0x0f, 0xce, 0x78, 0xff, 0xff, 0xcf, 0x7f, 0xff, 0xff, 0xcf, 0x78, 0xff, 0xff, 0xdf, 0x78, 0xff,
    0xff, 0xdf, 0x7d, 0xff, 0xff, 0x3f, 0x7e, 0xff, 0xff, 0xff, 0x7f,
];
var BYTES_PER_ROW = Math.ceil(WIDTH / 8);
var DISPLAY_HEIGHT = Math.ceil(HEIGHT / 2); // Half-block rendering
var EFFECTS = ["typewriter", "scanline", "rain", "fade", "crt", "glitch", "dissolve"];
// Get pixel at (x, y): true = foreground, false = background
function getPixel(x, y) {
    if (y >= HEIGHT)
        return false;
    var byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
    var bitIndex = x % 8;
    return ((BITS[byteIndex] >> bitIndex) & 1) === 0;
}
// Get the character for a cell (2 vertical pixels packed)
function getChar(x, row) {
    var upper = getPixel(x, row * 2);
    var lower = getPixel(x, row * 2 + 1);
    if (upper && lower)
        return "█";
    if (upper)
        return "▀";
    if (lower)
        return "▄";
    return " ";
}
// Build the final image grid
function buildFinalGrid() {
    var grid = [];
    for (var row = 0; row < DISPLAY_HEIGHT; row++) {
        var line = [];
        for (var x = 0; x < WIDTH; x++) {
            line.push(getChar(x, row));
        }
        grid.push(line);
    }
    return grid;
}
var ArminComponent = /** @class */ (function () {
    function ArminComponent(ui) {
        this.interval = null;
        this.effectState = {};
        this.cachedLines = [];
        this.cachedWidth = 0;
        this.gridVersion = 0;
        this.cachedVersion = -1;
        this.ui = ui;
        this.effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
        this.finalGrid = buildFinalGrid();
        this.currentGrid = this.createEmptyGrid();
        this.initEffect();
        this.startAnimation();
    }
    ArminComponent.prototype.invalidate = function () {
        this.cachedWidth = 0;
    };
    ArminComponent.prototype.render = function (width) {
        if (width === this.cachedWidth && this.cachedVersion === this.gridVersion) {
            return this.cachedLines;
        }
        var padding = 1;
        var availableWidth = width - padding;
        this.cachedLines = this.currentGrid.map(function (row) {
            // Clip row to available width before applying color
            var clipped = row.slice(0, availableWidth).join("");
            var padRight = Math.max(0, width - padding - clipped.length);
            return " ".concat(theme_js_1.theme.fg("accent", clipped)).concat(" ".repeat(padRight));
        });
        // Add "ARMIN SAYS HI" at the end
        var message = "ARMIN SAYS HI";
        var msgPadRight = Math.max(0, width - padding - message.length);
        this.cachedLines.push(" ".concat(theme_js_1.theme.fg("accent", message)).concat(" ".repeat(msgPadRight)));
        this.cachedWidth = width;
        this.cachedVersion = this.gridVersion;
        return this.cachedLines;
    };
    ArminComponent.prototype.createEmptyGrid = function () {
        return Array.from({ length: DISPLAY_HEIGHT }, function () { return Array(WIDTH).fill(" "); });
    };
    ArminComponent.prototype.initEffect = function () {
        var _a, _b;
        switch (this.effect) {
            case "typewriter":
                this.effectState = { pos: 0 };
                break;
            case "scanline":
                this.effectState = { row: 0 };
                break;
            case "rain":
                // Track falling position for each column
                this.effectState = {
                    drops: Array.from({ length: WIDTH }, function () { return ({
                        y: -Math.floor(Math.random() * DISPLAY_HEIGHT * 2),
                        settled: 0,
                    }); }),
                };
                break;
            case "fade": {
                // Shuffle all pixel positions
                var positions = [];
                for (var row = 0; row < DISPLAY_HEIGHT; row++) {
                    for (var x = 0; x < WIDTH; x++) {
                        positions.push([row, x]);
                    }
                }
                // Fisher-Yates shuffle
                for (var i = positions.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    _a = [positions[j], positions[i]], positions[i] = _a[0], positions[j] = _a[1];
                }
                this.effectState = { positions: positions, idx: 0 };
                break;
            }
            case "crt":
                this.effectState = { expansion: 0 };
                break;
            case "glitch":
                this.effectState = { phase: 0, glitchFrames: 8 };
                break;
            case "dissolve": {
                // Start with random noise
                this.currentGrid = Array.from({ length: DISPLAY_HEIGHT }, function () {
                    return Array.from({ length: WIDTH }, function () {
                        var chars = [" ", "░", "▒", "▓", "█", "▀", "▄"];
                        return chars[Math.floor(Math.random() * chars.length)];
                    });
                });
                // Shuffle positions for gradual resolve
                var dissolvePositions = [];
                for (var row = 0; row < DISPLAY_HEIGHT; row++) {
                    for (var x = 0; x < WIDTH; x++) {
                        dissolvePositions.push([row, x]);
                    }
                }
                for (var i = dissolvePositions.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    _b = [dissolvePositions[j], dissolvePositions[i]], dissolvePositions[i] = _b[0], dissolvePositions[j] = _b[1];
                }
                this.effectState = { positions: dissolvePositions, idx: 0 };
                break;
            }
        }
    };
    ArminComponent.prototype.startAnimation = function () {
        var _this = this;
        var fps = this.effect === "glitch" ? 60 : 30;
        this.interval = setInterval(function () {
            var done = _this.tickEffect();
            _this.updateDisplay();
            _this.ui.requestRender();
            if (done) {
                _this.stopAnimation();
            }
        }, 1000 / fps);
    };
    ArminComponent.prototype.stopAnimation = function () {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    };
    ArminComponent.prototype.tickEffect = function () {
        switch (this.effect) {
            case "typewriter":
                return this.tickTypewriter();
            case "scanline":
                return this.tickScanline();
            case "rain":
                return this.tickRain();
            case "fade":
                return this.tickFade();
            case "crt":
                return this.tickCrt();
            case "glitch":
                return this.tickGlitch();
            case "dissolve":
                return this.tickDissolve();
            default:
                return true;
        }
    };
    ArminComponent.prototype.tickTypewriter = function () {
        var state = this.effectState;
        var pixelsPerFrame = 3;
        for (var i = 0; i < pixelsPerFrame; i++) {
            var row = Math.floor(state.pos / WIDTH);
            var x = state.pos % WIDTH;
            if (row >= DISPLAY_HEIGHT)
                return true;
            this.currentGrid[row][x] = this.finalGrid[row][x];
            state.pos++;
        }
        return false;
    };
    ArminComponent.prototype.tickScanline = function () {
        var state = this.effectState;
        if (state.row >= DISPLAY_HEIGHT)
            return true;
        // Copy row
        for (var x = 0; x < WIDTH; x++) {
            this.currentGrid[state.row][x] = this.finalGrid[state.row][x];
        }
        state.row++;
        return false;
    };
    ArminComponent.prototype.tickRain = function () {
        var state = this.effectState;
        var allSettled = true;
        this.currentGrid = this.createEmptyGrid();
        for (var x = 0; x < WIDTH; x++) {
            var drop = state.drops[x];
            // Draw settled pixels
            for (var row = DISPLAY_HEIGHT - 1; row >= DISPLAY_HEIGHT - drop.settled; row--) {
                if (row >= 0) {
                    this.currentGrid[row][x] = this.finalGrid[row][x];
                }
            }
            // Check if this column is done
            if (drop.settled >= DISPLAY_HEIGHT)
                continue;
            allSettled = false;
            // Find the target row for this column (lowest non-space pixel)
            var targetRow = -1;
            for (var row = DISPLAY_HEIGHT - 1 - drop.settled; row >= 0; row--) {
                if (this.finalGrid[row][x] !== " ") {
                    targetRow = row;
                    break;
                }
            }
            // Move drop down
            drop.y++;
            // Draw falling drop
            if (drop.y >= 0 && drop.y < DISPLAY_HEIGHT) {
                if (targetRow >= 0 && drop.y >= targetRow) {
                    // Settle
                    drop.settled = DISPLAY_HEIGHT - targetRow;
                    drop.y = -Math.floor(Math.random() * 5) - 1;
                }
                else {
                    // Still falling
                    this.currentGrid[drop.y][x] = "▓";
                }
            }
        }
        return allSettled;
    };
    ArminComponent.prototype.tickFade = function () {
        var state = this.effectState;
        var pixelsPerFrame = 15;
        for (var i = 0; i < pixelsPerFrame; i++) {
            if (state.idx >= state.positions.length)
                return true;
            var _a = state.positions[state.idx], row = _a[0], x = _a[1];
            this.currentGrid[row][x] = this.finalGrid[row][x];
            state.idx++;
        }
        return false;
    };
    ArminComponent.prototype.tickCrt = function () {
        var state = this.effectState;
        var midRow = Math.floor(DISPLAY_HEIGHT / 2);
        this.currentGrid = this.createEmptyGrid();
        // Draw from middle expanding outward
        var top = midRow - state.expansion;
        var bottom = midRow + state.expansion;
        for (var row = Math.max(0, top); row <= Math.min(DISPLAY_HEIGHT - 1, bottom); row++) {
            for (var x = 0; x < WIDTH; x++) {
                this.currentGrid[row][x] = this.finalGrid[row][x];
            }
        }
        state.expansion++;
        return state.expansion > DISPLAY_HEIGHT;
    };
    ArminComponent.prototype.tickGlitch = function () {
        var _this = this;
        var state = this.effectState;
        if (state.phase < state.glitchFrames) {
            // Glitch phase: show corrupted version
            this.currentGrid = this.finalGrid.map(function (row) {
                var offset = Math.floor(Math.random() * 7) - 3;
                var glitchRow = __spreadArray([], row, true);
                // Random horizontal offset
                if (Math.random() < 0.3) {
                    var shifted = glitchRow.slice(offset).concat(glitchRow.slice(0, offset));
                    return shifted.slice(0, WIDTH);
                }
                // Random vertical swap
                if (Math.random() < 0.2) {
                    var swapRow = Math.floor(Math.random() * DISPLAY_HEIGHT);
                    return __spreadArray([], _this.finalGrid[swapRow], true);
                }
                return glitchRow;
            });
            state.phase++;
            return false;
        }
        // Final frame: show clean image
        this.currentGrid = this.finalGrid.map(function (row) { return __spreadArray([], row, true); });
        return true;
    };
    ArminComponent.prototype.tickDissolve = function () {
        var state = this.effectState;
        var pixelsPerFrame = 20;
        for (var i = 0; i < pixelsPerFrame; i++) {
            if (state.idx >= state.positions.length)
                return true;
            var _a = state.positions[state.idx], row = _a[0], x = _a[1];
            this.currentGrid[row][x] = this.finalGrid[row][x];
            state.idx++;
        }
        return false;
    };
    ArminComponent.prototype.updateDisplay = function () {
        this.gridVersion++;
    };
    ArminComponent.prototype.dispose = function () {
        this.stopAnimation();
    };
    return ArminComponent;
}());
exports.ArminComponent = ArminComponent;
