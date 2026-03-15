"use strict";
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
exports.getToolPath = getToolPath;
exports.ensureTool = ensureTool;
var chalk_1 = require("chalk");
var child_process_1 = require("child_process");
var extract_zip_1 = require("extract-zip");
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var stream_1 = require("stream");
var promises_1 = require("stream/promises");
var config_js_1 = require("../config.js");
var TOOLS_DIR = (0, config_js_1.getBinDir)();
var NETWORK_TIMEOUT_MS = 10000;
var DOWNLOAD_TIMEOUT_MS = 120000;
function isOfflineModeEnabled() {
    var value = process.env.PI_OFFLINE;
    if (!value)
        return false;
    return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}
var TOOLS = {
    fd: {
        name: "fd",
        repo: "sharkdp/fd",
        binaryName: "fd",
        tagPrefix: "v",
        getAssetName: function (version, plat, architecture) {
            if (plat === "darwin") {
                var archStr = architecture === "arm64" ? "aarch64" : "x86_64";
                return "fd-v".concat(version, "-").concat(archStr, "-apple-darwin.tar.gz");
            }
            else if (plat === "linux") {
                var archStr = architecture === "arm64" ? "aarch64" : "x86_64";
                return "fd-v".concat(version, "-").concat(archStr, "-unknown-linux-gnu.tar.gz");
            }
            else if (plat === "win32") {
                var archStr = architecture === "arm64" ? "aarch64" : "x86_64";
                return "fd-v".concat(version, "-").concat(archStr, "-pc-windows-msvc.zip");
            }
            return null;
        },
    },
    rg: {
        name: "ripgrep",
        repo: "BurntSushi/ripgrep",
        binaryName: "rg",
        tagPrefix: "",
        getAssetName: function (version, plat, architecture) {
            if (plat === "darwin") {
                var archStr = architecture === "arm64" ? "aarch64" : "x86_64";
                return "ripgrep-".concat(version, "-").concat(archStr, "-apple-darwin.tar.gz");
            }
            else if (plat === "linux") {
                if (architecture === "arm64") {
                    return "ripgrep-".concat(version, "-aarch64-unknown-linux-gnu.tar.gz");
                }
                return "ripgrep-".concat(version, "-x86_64-unknown-linux-musl.tar.gz");
            }
            else if (plat === "win32") {
                var archStr = architecture === "arm64" ? "aarch64" : "x86_64";
                return "ripgrep-".concat(version, "-").concat(archStr, "-pc-windows-msvc.zip");
            }
            return null;
        },
    },
};
// Check if a command exists in PATH by trying to run it
function commandExists(cmd) {
    try {
        var result = (0, child_process_1.spawnSync)(cmd, ["--version"], { stdio: "pipe" });
        // Check for ENOENT error (command not found)
        return result.error === undefined || result.error === null;
    }
    catch (_a) {
        return false;
    }
}
// Get the path to a tool (system-wide or in our tools dir)
function getToolPath(tool) {
    var config = TOOLS[tool];
    if (!config)
        return null;
    // Check our tools directory first
    var localPath = (0, path_1.join)(TOOLS_DIR, config.binaryName + ((0, os_1.platform)() === "win32" ? ".exe" : ""));
    if ((0, fs_1.existsSync)(localPath)) {
        return localPath;
    }
    // Check system PATH - if found, just return the command name (it's in PATH)
    if (commandExists(config.binaryName)) {
        return config.binaryName;
    }
    return null;
}
// Fetch latest release version from GitHub
function getLatestVersion(repo) {
    return __awaiter(this, void 0, void 0, function () {
        var response, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(repo, "/releases/latest"), {
                        headers: { "User-Agent": "".concat(config_js_1.APP_NAME, "-coding-agent") },
                        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
                    })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("GitHub API error: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = (_a.sent());
                    return [2 /*return*/, data.tag_name.replace(/^v/, "")];
            }
        });
    });
}
// Download a file from URL
function downloadFile(url, dest) {
    return __awaiter(this, void 0, void 0, function () {
        var response, fileStream;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url, {
                        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
                    })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to download: ".concat(response.status));
                    }
                    if (!response.body) {
                        throw new Error("No response body");
                    }
                    fileStream = (0, fs_1.createWriteStream)(dest);
                    return [4 /*yield*/, (0, promises_1.pipeline)(stream_1.Readable.fromWeb(response.body), fileStream)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function findBinaryRecursively(rootDir, binaryFileName) {
    var stack = [rootDir];
    while (stack.length > 0) {
        var currentDir = stack.pop();
        if (!currentDir)
            continue;
        var entries = (0, fs_1.readdirSync)(currentDir, { withFileTypes: true });
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var fullPath = (0, path_1.join)(currentDir, entry.name);
            if (entry.isFile() && entry.name === binaryFileName) {
                return fullPath;
            }
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
        }
    }
    return null;
}
// Download and install a tool
function downloadTool(tool) {
    return __awaiter(this, void 0, void 0, function () {
        var config, plat, architecture, version, assetName, downloadUrl, archivePath, binaryExt, binaryPath, extractDir, extractResult, errMsg, binaryFileName, extractedDir, extractedBinaryCandidates, extractedBinary;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    config = TOOLS[tool];
                    if (!config)
                        throw new Error("Unknown tool: ".concat(tool));
                    plat = (0, os_1.platform)();
                    architecture = (0, os_1.arch)();
                    return [4 /*yield*/, getLatestVersion(config.repo)];
                case 1:
                    version = _f.sent();
                    assetName = config.getAssetName(version, plat, architecture);
                    if (!assetName) {
                        throw new Error("Unsupported platform: ".concat(plat, "/").concat(architecture));
                    }
                    // Create tools directory
                    (0, fs_1.mkdirSync)(TOOLS_DIR, { recursive: true });
                    downloadUrl = "https://github.com/".concat(config.repo, "/releases/download/").concat(config.tagPrefix).concat(version, "/").concat(assetName);
                    archivePath = (0, path_1.join)(TOOLS_DIR, assetName);
                    binaryExt = plat === "win32" ? ".exe" : "";
                    binaryPath = (0, path_1.join)(TOOLS_DIR, config.binaryName + binaryExt);
                    // Download
                    return [4 /*yield*/, downloadFile(downloadUrl, archivePath)];
                case 2:
                    // Download
                    _f.sent();
                    extractDir = (0, path_1.join)(TOOLS_DIR, "extract_tmp_".concat(config.binaryName, "_").concat(process.pid, "_").concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 10)));
                    (0, fs_1.mkdirSync)(extractDir, { recursive: true });
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, , 8, 9]);
                    if (!assetName.endsWith(".tar.gz")) return [3 /*break*/, 4];
                    extractResult = (0, child_process_1.spawnSync)("tar", ["xzf", archivePath, "-C", extractDir], { stdio: "pipe" });
                    if (extractResult.error || extractResult.status !== 0) {
                        errMsg = (_d = (_b = (_a = extractResult.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : (_c = extractResult.stderr) === null || _c === void 0 ? void 0 : _c.toString().trim()) !== null && _d !== void 0 ? _d : "unknown error";
                        throw new Error("Failed to extract ".concat(assetName, ": ").concat(errMsg));
                    }
                    return [3 /*break*/, 7];
                case 4:
                    if (!assetName.endsWith(".zip")) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, extract_zip_1.default)(archivePath, { dir: extractDir })];
                case 5:
                    _f.sent();
                    return [3 /*break*/, 7];
                case 6: throw new Error("Unsupported archive format: ".concat(assetName));
                case 7:
                    binaryFileName = config.binaryName + binaryExt;
                    extractedDir = (0, path_1.join)(extractDir, assetName.replace(/\.(tar\.gz|zip)$/, ""));
                    extractedBinaryCandidates = [(0, path_1.join)(extractedDir, binaryFileName), (0, path_1.join)(extractDir, binaryFileName)];
                    extractedBinary = extractedBinaryCandidates.find(function (candidate) { return (0, fs_1.existsSync)(candidate); });
                    if (!extractedBinary) {
                        extractedBinary = (_e = findBinaryRecursively(extractDir, binaryFileName)) !== null && _e !== void 0 ? _e : undefined;
                    }
                    if (extractedBinary) {
                        (0, fs_1.renameSync)(extractedBinary, binaryPath);
                    }
                    else {
                        throw new Error("Binary not found in archive: expected ".concat(binaryFileName, " under ").concat(extractDir));
                    }
                    // Make executable (Unix only)
                    if (plat !== "win32") {
                        (0, fs_1.chmodSync)(binaryPath, 493);
                    }
                    return [3 /*break*/, 9];
                case 8:
                    // Cleanup
                    (0, fs_1.rmSync)(archivePath, { force: true });
                    (0, fs_1.rmSync)(extractDir, { recursive: true, force: true });
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/, binaryPath];
            }
        });
    });
}
// Termux package names for tools
var TERMUX_PACKAGES = {
    fd: "fd",
    rg: "ripgrep",
};
// Ensure a tool is available, downloading if necessary
// Returns the path to the tool, or null if unavailable
function ensureTool(tool_1) {
    return __awaiter(this, arguments, void 0, function (tool, silent) {
        var existingPath, config, pkgName, path, e_1;
        var _a;
        if (silent === void 0) { silent = false; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    existingPath = getToolPath(tool);
                    if (existingPath) {
                        return [2 /*return*/, existingPath];
                    }
                    config = TOOLS[tool];
                    if (!config)
                        return [2 /*return*/, undefined];
                    if (isOfflineModeEnabled()) {
                        if (!silent) {
                            console.log(chalk_1.default.yellow("".concat(config.name, " not found. Offline mode enabled, skipping download.")));
                        }
                        return [2 /*return*/, undefined];
                    }
                    // On Android/Termux, Linux binaries don't work due to Bionic libc incompatibility.
                    // Users must install via pkg.
                    if ((0, os_1.platform)() === "android") {
                        pkgName = (_a = TERMUX_PACKAGES[tool]) !== null && _a !== void 0 ? _a : tool;
                        if (!silent) {
                            console.log(chalk_1.default.yellow("".concat(config.name, " not found. Install with: pkg install ").concat(pkgName)));
                        }
                        return [2 /*return*/, undefined];
                    }
                    // Tool not found - download it
                    if (!silent) {
                        console.log(chalk_1.default.dim("".concat(config.name, " not found. Downloading...")));
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, downloadTool(tool)];
                case 2:
                    path = _b.sent();
                    if (!silent) {
                        console.log(chalk_1.default.dim("".concat(config.name, " installed to ").concat(path)));
                    }
                    return [2 /*return*/, path];
                case 3:
                    e_1 = _b.sent();
                    if (!silent) {
                        console.log(chalk_1.default.yellow("Failed to download ".concat(config.name, ": ").concat(e_1 instanceof Error ? e_1.message : e_1)));
                    }
                    return [2 /*return*/, undefined];
                case 4: return [2 /*return*/];
            }
        });
    });
}
