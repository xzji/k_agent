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
exports.DefaultPackageManager = void 0;
var node_child_process_1 = require("node:child_process");
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var ignore_1 = require("ignore");
var minimatch_1 = require("minimatch");
var config_js_1 = require("../config.js");
var git_js_1 = require("../utils/git.js");
var NETWORK_TIMEOUT_MS = 10000;
function isOfflineModeEnabled() {
    var value = process.env.PI_OFFLINE;
    if (!value)
        return false;
    return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}
var RESOURCE_TYPES = ["extensions", "skills", "prompts", "themes"];
var FILE_PATTERNS = {
    extensions: /\.(ts|js)$/,
    skills: /\.md$/,
    prompts: /\.md$/,
    themes: /\.json$/,
};
var IGNORE_FILE_NAMES = [".gitignore", ".ignore", ".fdignore"];
function toPosixPath(p) {
    return p.split(node_path_1.sep).join("/");
}
function getHomeDir() {
    return process.env.HOME || (0, node_os_1.homedir)();
}
function prefixIgnorePattern(line, prefix) {
    var trimmed = line.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith("#") && !trimmed.startsWith("\\#"))
        return null;
    var pattern = line;
    var negated = false;
    if (pattern.startsWith("!")) {
        negated = true;
        pattern = pattern.slice(1);
    }
    else if (pattern.startsWith("\\!")) {
        pattern = pattern.slice(1);
    }
    if (pattern.startsWith("/")) {
        pattern = pattern.slice(1);
    }
    var prefixed = prefix ? "".concat(prefix).concat(pattern) : pattern;
    return negated ? "!".concat(prefixed) : prefixed;
}
function addIgnoreRules(ig, dir, rootDir) {
    var relativeDir = (0, node_path_1.relative)(rootDir, dir);
    var prefix = relativeDir ? "".concat(toPosixPath(relativeDir), "/") : "";
    for (var _i = 0, IGNORE_FILE_NAMES_1 = IGNORE_FILE_NAMES; _i < IGNORE_FILE_NAMES_1.length; _i++) {
        var filename = IGNORE_FILE_NAMES_1[_i];
        var ignorePath = (0, node_path_1.join)(dir, filename);
        if (!(0, node_fs_1.existsSync)(ignorePath))
            continue;
        try {
            var content = (0, node_fs_1.readFileSync)(ignorePath, "utf-8");
            var patterns = content
                .split(/\r?\n/)
                .map(function (line) { return prefixIgnorePattern(line, prefix); })
                .filter(function (line) { return Boolean(line); });
            if (patterns.length > 0) {
                ig.add(patterns);
            }
        }
        catch (_a) { }
    }
}
function isPattern(s) {
    return s.startsWith("!") || s.startsWith("+") || s.startsWith("-") || s.includes("*") || s.includes("?");
}
function splitPatterns(entries) {
    var plain = [];
    var patterns = [];
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (isPattern(entry)) {
            patterns.push(entry);
        }
        else {
            plain.push(entry);
        }
    }
    return { plain: plain, patterns: patterns };
}
function collectFiles(dir, filePattern, skipNodeModules, ignoreMatcher, rootDir) {
    if (skipNodeModules === void 0) { skipNodeModules = true; }
    var files = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return files;
    var root = rootDir !== null && rootDir !== void 0 ? rootDir : dir;
    var ig = ignoreMatcher !== null && ignoreMatcher !== void 0 ? ignoreMatcher : (0, ignore_1.default)();
    addIgnoreRules(ig, dir, root);
    try {
        var entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
            var entry = entries_2[_i];
            if (entry.name.startsWith("."))
                continue;
            if (skipNodeModules && entry.name === "node_modules")
                continue;
            var fullPath = (0, node_path_1.join)(dir, entry.name);
            var isDir = entry.isDirectory();
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    var stats = (0, node_fs_1.statSync)(fullPath);
                    isDir = stats.isDirectory();
                    isFile = stats.isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, node_path_1.relative)(root, fullPath));
            var ignorePath = isDir ? "".concat(relPath, "/") : relPath;
            if (ig.ignores(ignorePath))
                continue;
            if (isDir) {
                files.push.apply(files, collectFiles(fullPath, filePattern, skipNodeModules, ig, root));
            }
            else if (isFile && filePattern.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return files;
}
function collectSkillEntries(dir, includeRootFiles, ignoreMatcher, rootDir) {
    if (includeRootFiles === void 0) { includeRootFiles = true; }
    var entries = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return entries;
    var root = rootDir !== null && rootDir !== void 0 ? rootDir : dir;
    var ig = ignoreMatcher !== null && ignoreMatcher !== void 0 ? ignoreMatcher : (0, ignore_1.default)();
    addIgnoreRules(ig, dir, root);
    try {
        var dirEntries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, dirEntries_1 = dirEntries; _i < dirEntries_1.length; _i++) {
            var entry = dirEntries_1[_i];
            if (entry.name.startsWith("."))
                continue;
            if (entry.name === "node_modules")
                continue;
            var fullPath = (0, node_path_1.join)(dir, entry.name);
            var isDir = entry.isDirectory();
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    var stats = (0, node_fs_1.statSync)(fullPath);
                    isDir = stats.isDirectory();
                    isFile = stats.isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, node_path_1.relative)(root, fullPath));
            var ignorePath = isDir ? "".concat(relPath, "/") : relPath;
            if (ig.ignores(ignorePath))
                continue;
            if (isDir) {
                entries.push.apply(entries, collectSkillEntries(fullPath, false, ig, root));
            }
            else if (isFile) {
                var isRootMd = includeRootFiles && entry.name.endsWith(".md");
                var isSkillMd = !includeRootFiles && entry.name === "SKILL.md";
                if (isRootMd || isSkillMd) {
                    entries.push(fullPath);
                }
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return entries;
}
function collectAutoSkillEntries(dir, includeRootFiles) {
    if (includeRootFiles === void 0) { includeRootFiles = true; }
    return collectSkillEntries(dir, includeRootFiles);
}
function findGitRepoRoot(startDir) {
    var dir = (0, node_path_1.resolve)(startDir);
    while (true) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, ".git"))) {
            return dir;
        }
        var parent_1 = (0, node_path_1.dirname)(dir);
        if (parent_1 === dir) {
            return null;
        }
        dir = parent_1;
    }
}
function collectAncestorAgentsSkillDirs(startDir) {
    var skillDirs = [];
    var resolvedStartDir = (0, node_path_1.resolve)(startDir);
    var gitRepoRoot = findGitRepoRoot(resolvedStartDir);
    var dir = resolvedStartDir;
    while (true) {
        skillDirs.push((0, node_path_1.join)(dir, ".agents", "skills"));
        if (gitRepoRoot && dir === gitRepoRoot) {
            break;
        }
        var parent_2 = (0, node_path_1.dirname)(dir);
        if (parent_2 === dir) {
            break;
        }
        dir = parent_2;
    }
    return skillDirs;
}
function collectAutoPromptEntries(dir) {
    var entries = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return entries;
    var ig = (0, ignore_1.default)();
    addIgnoreRules(ig, dir, dir);
    try {
        var dirEntries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, dirEntries_2 = dirEntries; _i < dirEntries_2.length; _i++) {
            var entry = dirEntries_2[_i];
            if (entry.name.startsWith("."))
                continue;
            if (entry.name === "node_modules")
                continue;
            var fullPath = (0, node_path_1.join)(dir, entry.name);
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    isFile = (0, node_fs_1.statSync)(fullPath).isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, node_path_1.relative)(dir, fullPath));
            if (ig.ignores(relPath))
                continue;
            if (isFile && entry.name.endsWith(".md")) {
                entries.push(fullPath);
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return entries;
}
function collectAutoThemeEntries(dir) {
    var entries = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return entries;
    var ig = (0, ignore_1.default)();
    addIgnoreRules(ig, dir, dir);
    try {
        var dirEntries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, dirEntries_3 = dirEntries; _i < dirEntries_3.length; _i++) {
            var entry = dirEntries_3[_i];
            if (entry.name.startsWith("."))
                continue;
            if (entry.name === "node_modules")
                continue;
            var fullPath = (0, node_path_1.join)(dir, entry.name);
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    isFile = (0, node_fs_1.statSync)(fullPath).isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, node_path_1.relative)(dir, fullPath));
            if (ig.ignores(relPath))
                continue;
            if (isFile && entry.name.endsWith(".json")) {
                entries.push(fullPath);
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return entries;
}
function readPiManifestFile(packageJsonPath) {
    var _a;
    try {
        var content = (0, node_fs_1.readFileSync)(packageJsonPath, "utf-8");
        var pkg = JSON.parse(content);
        return (_a = pkg.pi) !== null && _a !== void 0 ? _a : null;
    }
    catch (_b) {
        return null;
    }
}
function resolveExtensionEntries(dir) {
    var _a;
    var packageJsonPath = (0, node_path_1.join)(dir, "package.json");
    if ((0, node_fs_1.existsSync)(packageJsonPath)) {
        var manifest = readPiManifestFile(packageJsonPath);
        if ((_a = manifest === null || manifest === void 0 ? void 0 : manifest.extensions) === null || _a === void 0 ? void 0 : _a.length) {
            var entries = [];
            for (var _i = 0, _b = manifest.extensions; _i < _b.length; _i++) {
                var extPath = _b[_i];
                var resolvedExtPath = (0, node_path_1.resolve)(dir, extPath);
                if ((0, node_fs_1.existsSync)(resolvedExtPath)) {
                    entries.push(resolvedExtPath);
                }
            }
            if (entries.length > 0) {
                return entries;
            }
        }
    }
    var indexTs = (0, node_path_1.join)(dir, "index.ts");
    var indexJs = (0, node_path_1.join)(dir, "index.js");
    if ((0, node_fs_1.existsSync)(indexTs)) {
        return [indexTs];
    }
    if ((0, node_fs_1.existsSync)(indexJs)) {
        return [indexJs];
    }
    return null;
}
function collectAutoExtensionEntries(dir) {
    var entries = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return entries;
    // First check if this directory itself has explicit extension entries (package.json or index)
    var rootEntries = resolveExtensionEntries(dir);
    if (rootEntries) {
        return rootEntries;
    }
    // Otherwise, discover extensions from directory contents
    var ig = (0, ignore_1.default)();
    addIgnoreRules(ig, dir, dir);
    try {
        var dirEntries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, dirEntries_4 = dirEntries; _i < dirEntries_4.length; _i++) {
            var entry = dirEntries_4[_i];
            if (entry.name.startsWith("."))
                continue;
            if (entry.name === "node_modules")
                continue;
            var fullPath = (0, node_path_1.join)(dir, entry.name);
            var isDir = entry.isDirectory();
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    var stats = (0, node_fs_1.statSync)(fullPath);
                    isDir = stats.isDirectory();
                    isFile = stats.isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, node_path_1.relative)(dir, fullPath));
            var ignorePath = isDir ? "".concat(relPath, "/") : relPath;
            if (ig.ignores(ignorePath))
                continue;
            if (isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
                entries.push(fullPath);
            }
            else if (isDir) {
                var resolvedEntries = resolveExtensionEntries(fullPath);
                if (resolvedEntries) {
                    entries.push.apply(entries, resolvedEntries);
                }
            }
        }
    }
    catch (_b) {
        // Ignore errors
    }
    return entries;
}
/**
 * Collect resource files from a directory based on resource type.
 * Extensions use smart discovery (index.ts in subdirs), others use recursive collection.
 */
function collectResourceFiles(dir, resourceType) {
    if (resourceType === "skills") {
        return collectSkillEntries(dir);
    }
    if (resourceType === "extensions") {
        return collectAutoExtensionEntries(dir);
    }
    return collectFiles(dir, FILE_PATTERNS[resourceType]);
}
function matchesAnyPattern(filePath, patterns, baseDir) {
    var rel = toPosixPath((0, node_path_1.relative)(baseDir, filePath));
    var name = (0, node_path_1.basename)(filePath);
    var filePathPosix = toPosixPath(filePath);
    var isSkillFile = name === "SKILL.md";
    var parentDir = isSkillFile ? (0, node_path_1.dirname)(filePath) : undefined;
    var parentRel = isSkillFile ? toPosixPath((0, node_path_1.relative)(baseDir, parentDir)) : undefined;
    var parentName = isSkillFile ? (0, node_path_1.basename)(parentDir) : undefined;
    var parentDirPosix = isSkillFile ? toPosixPath(parentDir) : undefined;
    return patterns.some(function (pattern) {
        var normalizedPattern = toPosixPath(pattern);
        if ((0, minimatch_1.minimatch)(rel, normalizedPattern) ||
            (0, minimatch_1.minimatch)(name, normalizedPattern) ||
            (0, minimatch_1.minimatch)(filePathPosix, normalizedPattern)) {
            return true;
        }
        if (!isSkillFile)
            return false;
        return ((0, minimatch_1.minimatch)(parentRel, normalizedPattern) ||
            (0, minimatch_1.minimatch)(parentName, normalizedPattern) ||
            (0, minimatch_1.minimatch)(parentDirPosix, normalizedPattern));
    });
}
function normalizeExactPattern(pattern) {
    var normalized = pattern.startsWith("./") || pattern.startsWith(".\\") ? pattern.slice(2) : pattern;
    return toPosixPath(normalized);
}
function matchesAnyExactPattern(filePath, patterns, baseDir) {
    if (patterns.length === 0)
        return false;
    var rel = toPosixPath((0, node_path_1.relative)(baseDir, filePath));
    var name = (0, node_path_1.basename)(filePath);
    var filePathPosix = toPosixPath(filePath);
    var isSkillFile = name === "SKILL.md";
    var parentDir = isSkillFile ? (0, node_path_1.dirname)(filePath) : undefined;
    var parentRel = isSkillFile ? toPosixPath((0, node_path_1.relative)(baseDir, parentDir)) : undefined;
    var parentDirPosix = isSkillFile ? toPosixPath(parentDir) : undefined;
    return patterns.some(function (pattern) {
        var normalized = normalizeExactPattern(pattern);
        if (normalized === rel || normalized === filePathPosix) {
            return true;
        }
        if (!isSkillFile)
            return false;
        return normalized === parentRel || normalized === parentDirPosix;
    });
}
function getOverridePatterns(entries) {
    return entries.filter(function (pattern) { return pattern.startsWith("!") || pattern.startsWith("+") || pattern.startsWith("-"); });
}
function isEnabledByOverrides(filePath, patterns, baseDir) {
    var overrides = getOverridePatterns(patterns);
    var excludes = overrides.filter(function (pattern) { return pattern.startsWith("!"); }).map(function (pattern) { return pattern.slice(1); });
    var forceIncludes = overrides.filter(function (pattern) { return pattern.startsWith("+"); }).map(function (pattern) { return pattern.slice(1); });
    var forceExcludes = overrides.filter(function (pattern) { return pattern.startsWith("-"); }).map(function (pattern) { return pattern.slice(1); });
    var enabled = true;
    if (excludes.length > 0 && matchesAnyPattern(filePath, excludes, baseDir)) {
        enabled = false;
    }
    if (forceIncludes.length > 0 && matchesAnyExactPattern(filePath, forceIncludes, baseDir)) {
        enabled = true;
    }
    if (forceExcludes.length > 0 && matchesAnyExactPattern(filePath, forceExcludes, baseDir)) {
        enabled = false;
    }
    return enabled;
}
/**
 * Apply patterns to paths and return a Set of enabled paths.
 * Pattern types:
 * - Plain patterns: include matching paths
 * - `!pattern`: exclude matching paths
 * - `+path`: force-include exact path (overrides exclusions)
 * - `-path`: force-exclude exact path (overrides force-includes)
 */
function applyPatterns(allPaths, patterns, baseDir) {
    var includes = [];
    var excludes = [];
    var forceIncludes = [];
    var forceExcludes = [];
    for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
        var p = patterns_1[_i];
        if (p.startsWith("+")) {
            forceIncludes.push(p.slice(1));
        }
        else if (p.startsWith("-")) {
            forceExcludes.push(p.slice(1));
        }
        else if (p.startsWith("!")) {
            excludes.push(p.slice(1));
        }
        else {
            includes.push(p);
        }
    }
    // Step 1: Apply includes (or all if no includes)
    var result;
    if (includes.length === 0) {
        result = __spreadArray([], allPaths, true);
    }
    else {
        result = allPaths.filter(function (filePath) { return matchesAnyPattern(filePath, includes, baseDir); });
    }
    // Step 2: Apply excludes
    if (excludes.length > 0) {
        result = result.filter(function (filePath) { return !matchesAnyPattern(filePath, excludes, baseDir); });
    }
    // Step 3: Force-include (add back from allPaths, overriding exclusions)
    if (forceIncludes.length > 0) {
        for (var _a = 0, allPaths_1 = allPaths; _a < allPaths_1.length; _a++) {
            var filePath = allPaths_1[_a];
            if (!result.includes(filePath) && matchesAnyExactPattern(filePath, forceIncludes, baseDir)) {
                result.push(filePath);
            }
        }
    }
    // Step 4: Force-exclude (remove even if included or force-included)
    if (forceExcludes.length > 0) {
        result = result.filter(function (filePath) { return !matchesAnyExactPattern(filePath, forceExcludes, baseDir); });
    }
    return new Set(result);
}
var DefaultPackageManager = /** @class */ (function () {
    function DefaultPackageManager(options) {
        this.cwd = options.cwd;
        this.agentDir = options.agentDir;
        this.settingsManager = options.settingsManager;
    }
    DefaultPackageManager.prototype.setProgressCallback = function (callback) {
        this.progressCallback = callback;
    };
    DefaultPackageManager.prototype.addSourceToSettings = function (source, options) {
        var _this = this;
        var _a;
        var scope = (options === null || options === void 0 ? void 0 : options.local) ? "project" : "user";
        var currentSettings = scope === "project" ? this.settingsManager.getProjectSettings() : this.settingsManager.getGlobalSettings();
        var currentPackages = (_a = currentSettings.packages) !== null && _a !== void 0 ? _a : [];
        var normalizedSource = this.normalizePackageSourceForSettings(source, scope);
        var exists = currentPackages.some(function (existing) { return _this.packageSourcesMatch(existing, source, scope); });
        if (exists) {
            return false;
        }
        var nextPackages = __spreadArray(__spreadArray([], currentPackages, true), [normalizedSource], false);
        if (scope === "project") {
            this.settingsManager.setProjectPackages(nextPackages);
        }
        else {
            this.settingsManager.setPackages(nextPackages);
        }
        return true;
    };
    DefaultPackageManager.prototype.removeSourceFromSettings = function (source, options) {
        var _this = this;
        var _a;
        var scope = (options === null || options === void 0 ? void 0 : options.local) ? "project" : "user";
        var currentSettings = scope === "project" ? this.settingsManager.getProjectSettings() : this.settingsManager.getGlobalSettings();
        var currentPackages = (_a = currentSettings.packages) !== null && _a !== void 0 ? _a : [];
        var nextPackages = currentPackages.filter(function (existing) { return !_this.packageSourcesMatch(existing, source, scope); });
        var changed = nextPackages.length !== currentPackages.length;
        if (!changed) {
            return false;
        }
        if (scope === "project") {
            this.settingsManager.setProjectPackages(nextPackages);
        }
        else {
            this.settingsManager.setPackages(nextPackages);
        }
        return true;
    };
    DefaultPackageManager.prototype.getInstalledPath = function (source, scope) {
        var parsed = this.parseSource(source);
        if (parsed.type === "npm") {
            var path = this.getNpmInstallPath(parsed, scope);
            return (0, node_fs_1.existsSync)(path) ? path : undefined;
        }
        if (parsed.type === "git") {
            var path = this.getGitInstallPath(parsed, scope);
            return (0, node_fs_1.existsSync)(path) ? path : undefined;
        }
        if (parsed.type === "local") {
            var baseDir = this.getBaseDirForScope(scope);
            var path = this.resolvePathFromBase(parsed.path, baseDir);
            return (0, node_fs_1.existsSync)(path) ? path : undefined;
        }
        return undefined;
    };
    DefaultPackageManager.prototype.emitProgress = function (event) {
        var _a;
        (_a = this.progressCallback) === null || _a === void 0 ? void 0 : _a.call(this, event);
    };
    DefaultPackageManager.prototype.withProgress = function (action, source, message, operation) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.emitProgress({ type: "start", action: action, source: source, message: message });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, operation()];
                    case 2:
                        _a.sent();
                        this.emitProgress({ type: "complete", action: action, source: source });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        this.emitProgress({ type: "error", action: action, source: source, message: errorMessage });
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.resolve = function (onMissing) {
        return __awaiter(this, void 0, void 0, function () {
            var accumulator, globalSettings, projectSettings, allPackages, _i, _a, pkg, _b, _c, pkg, packageSources, globalBaseDir, projectBaseDir, _d, RESOURCE_TYPES_1, resourceType, target, globalEntries, projectEntries;
            var _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        accumulator = this.createAccumulator();
                        globalSettings = this.settingsManager.getGlobalSettings();
                        projectSettings = this.settingsManager.getProjectSettings();
                        allPackages = [];
                        for (_i = 0, _a = (_e = projectSettings.packages) !== null && _e !== void 0 ? _e : []; _i < _a.length; _i++) {
                            pkg = _a[_i];
                            allPackages.push({ pkg: pkg, scope: "project" });
                        }
                        for (_b = 0, _c = (_f = globalSettings.packages) !== null && _f !== void 0 ? _f : []; _b < _c.length; _b++) {
                            pkg = _c[_b];
                            allPackages.push({ pkg: pkg, scope: "user" });
                        }
                        packageSources = this.dedupePackages(allPackages);
                        return [4 /*yield*/, this.resolvePackageSources(packageSources, accumulator, onMissing)];
                    case 1:
                        _j.sent();
                        globalBaseDir = this.agentDir;
                        projectBaseDir = (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME);
                        for (_d = 0, RESOURCE_TYPES_1 = RESOURCE_TYPES; _d < RESOURCE_TYPES_1.length; _d++) {
                            resourceType = RESOURCE_TYPES_1[_d];
                            target = this.getTargetMap(accumulator, resourceType);
                            globalEntries = ((_g = globalSettings[resourceType]) !== null && _g !== void 0 ? _g : []);
                            projectEntries = ((_h = projectSettings[resourceType]) !== null && _h !== void 0 ? _h : []);
                            this.resolveLocalEntries(projectEntries, resourceType, target, {
                                source: "local",
                                scope: "project",
                                origin: "top-level",
                            }, projectBaseDir);
                            this.resolveLocalEntries(globalEntries, resourceType, target, {
                                source: "local",
                                scope: "user",
                                origin: "top-level",
                            }, globalBaseDir);
                        }
                        this.addAutoDiscoveredResources(accumulator, globalSettings, projectSettings, globalBaseDir, projectBaseDir);
                        return [2 /*return*/, this.toResolvedPaths(accumulator)];
                }
            });
        });
    };
    DefaultPackageManager.prototype.resolveExtensionSources = function (sources, options) {
        return __awaiter(this, void 0, void 0, function () {
            var accumulator, scope, packageSources;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accumulator = this.createAccumulator();
                        scope = (options === null || options === void 0 ? void 0 : options.temporary) ? "temporary" : (options === null || options === void 0 ? void 0 : options.local) ? "project" : "user";
                        packageSources = sources.map(function (source) { return ({ pkg: source, scope: scope }); });
                        return [4 /*yield*/, this.resolvePackageSources(packageSources, accumulator)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.toResolvedPaths(accumulator)];
                }
            });
        });
    };
    DefaultPackageManager.prototype.install = function (source, options) {
        return __awaiter(this, void 0, void 0, function () {
            var parsed, scope;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parsed = this.parseSource(source);
                        scope = (options === null || options === void 0 ? void 0 : options.local) ? "project" : "user";
                        return [4 /*yield*/, this.withProgress("install", source, "Installing ".concat(source, "..."), function () { return __awaiter(_this, void 0, void 0, function () {
                                var resolved;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!(parsed.type === "npm")) return [3 /*break*/, 2];
                                            return [4 /*yield*/, this.installNpm(parsed, scope, false)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 2:
                                            if (!(parsed.type === "git")) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this.installGit(parsed, scope)];
                                        case 3:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 4:
                                            if (parsed.type === "local") {
                                                resolved = this.resolvePath(parsed.path);
                                                if (!(0, node_fs_1.existsSync)(resolved)) {
                                                    throw new Error("Path does not exist: ".concat(resolved));
                                                }
                                                return [2 /*return*/];
                                            }
                                            throw new Error("Unsupported install source: ".concat(source));
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.remove = function (source, options) {
        return __awaiter(this, void 0, void 0, function () {
            var parsed, scope;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parsed = this.parseSource(source);
                        scope = (options === null || options === void 0 ? void 0 : options.local) ? "project" : "user";
                        return [4 /*yield*/, this.withProgress("remove", source, "Removing ".concat(source, "..."), function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!(parsed.type === "npm")) return [3 /*break*/, 2];
                                            return [4 /*yield*/, this.uninstallNpm(parsed, scope)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 2:
                                            if (!(parsed.type === "git")) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this.removeGit(parsed, scope)];
                                        case 3:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 4:
                                            if (parsed.type === "local") {
                                                return [2 /*return*/];
                                            }
                                            throw new Error("Unsupported remove source: ".concat(source));
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.update = function (source) {
        return __awaiter(this, void 0, void 0, function () {
            var globalSettings, projectSettings, identity, _i, _a, pkg, sourceStr, _b, _c, pkg, sourceStr;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        globalSettings = this.settingsManager.getGlobalSettings();
                        projectSettings = this.settingsManager.getProjectSettings();
                        identity = source ? this.getPackageIdentity(source) : undefined;
                        _i = 0, _a = (_d = globalSettings.packages) !== null && _d !== void 0 ? _d : [];
                        _f.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        pkg = _a[_i];
                        sourceStr = typeof pkg === "string" ? pkg : pkg.source;
                        if (identity && this.getPackageIdentity(sourceStr, "user") !== identity)
                            return [3 /*break*/, 3];
                        return [4 /*yield*/, this.updateSourceForScope(sourceStr, "user")];
                    case 2:
                        _f.sent();
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _b = 0, _c = (_e = projectSettings.packages) !== null && _e !== void 0 ? _e : [];
                        _f.label = 5;
                    case 5:
                        if (!(_b < _c.length)) return [3 /*break*/, 8];
                        pkg = _c[_b];
                        sourceStr = typeof pkg === "string" ? pkg : pkg.source;
                        if (identity && this.getPackageIdentity(sourceStr, "project") !== identity)
                            return [3 /*break*/, 7];
                        return [4 /*yield*/, this.updateSourceForScope(sourceStr, "project")];
                    case 6:
                        _f.sent();
                        _f.label = 7;
                    case 7:
                        _b++;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.updateSourceForScope = function (source, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var parsed;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (isOfflineModeEnabled()) {
                            return [2 /*return*/];
                        }
                        parsed = this.parseSource(source);
                        if (!(parsed.type === "npm")) return [3 /*break*/, 2];
                        if (parsed.pinned)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.withProgress("update", source, "Updating ".concat(source, "..."), function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.installNpm(parsed, scope, false)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(parsed.type === "git")) return [3 /*break*/, 4];
                        if (parsed.pinned)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.withProgress("update", source, "Updating ".concat(source, "..."), function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.updateGit(parsed, scope)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.resolvePackageSources = function (sources, accumulator, onMissing) {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, sources_1, _a, pkg, scope;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _loop_1 = function (pkg, scope) {
                            var sourceStr, filter, parsed, metadata, baseDir, installMissing, installedPath, needsInstall, _c, installed, installedPath, installed;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        sourceStr = typeof pkg === "string" ? pkg : pkg.source;
                                        filter = typeof pkg === "object" ? pkg : undefined;
                                        parsed = this_1.parseSource(sourceStr);
                                        metadata = { source: sourceStr, scope: scope, origin: "package" };
                                        if (parsed.type === "local") {
                                            baseDir = this_1.getBaseDirForScope(scope);
                                            this_1.resolveLocalExtensionSource(parsed, accumulator, filter, metadata, baseDir);
                                            return [2 /*return*/, "continue"];
                                        }
                                        installMissing = function () { return __awaiter(_this, void 0, void 0, function () {
                                            var action;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        if (isOfflineModeEnabled()) {
                                                            return [2 /*return*/, false];
                                                        }
                                                        if (!!onMissing) return [3 /*break*/, 2];
                                                        return [4 /*yield*/, this.installParsedSource(parsed, scope)];
                                                    case 1:
                                                        _a.sent();
                                                        return [2 /*return*/, true];
                                                    case 2: return [4 /*yield*/, onMissing(sourceStr)];
                                                    case 3:
                                                        action = _a.sent();
                                                        if (action === "skip")
                                                            return [2 /*return*/, false];
                                                        if (action === "error")
                                                            throw new Error("Missing source: ".concat(sourceStr));
                                                        return [4 /*yield*/, this.installParsedSource(parsed, scope)];
                                                    case 4:
                                                        _a.sent();
                                                        return [2 /*return*/, true];
                                                }
                                            });
                                        }); };
                                        if (!(parsed.type === "npm")) return [3 /*break*/, 5];
                                        installedPath = this_1.getNpmInstallPath(parsed, scope);
                                        _c = !(0, node_fs_1.existsSync)(installedPath);
                                        if (_c) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this_1.npmNeedsUpdate(parsed, installedPath)];
                                    case 1:
                                        _c = (_d.sent());
                                        _d.label = 2;
                                    case 2:
                                        needsInstall = _c;
                                        if (!needsInstall) return [3 /*break*/, 4];
                                        return [4 /*yield*/, installMissing()];
                                    case 3:
                                        installed = _d.sent();
                                        if (!installed)
                                            return [2 /*return*/, "continue"];
                                        _d.label = 4;
                                    case 4:
                                        metadata.baseDir = installedPath;
                                        this_1.collectPackageResources(installedPath, accumulator, filter, metadata);
                                        return [2 /*return*/, "continue"];
                                    case 5:
                                        if (!(parsed.type === "git")) return [3 /*break*/, 10];
                                        installedPath = this_1.getGitInstallPath(parsed, scope);
                                        if (!!(0, node_fs_1.existsSync)(installedPath)) return [3 /*break*/, 7];
                                        return [4 /*yield*/, installMissing()];
                                    case 6:
                                        installed = _d.sent();
                                        if (!installed)
                                            return [2 /*return*/, "continue"];
                                        return [3 /*break*/, 9];
                                    case 7:
                                        if (!(scope === "temporary" && !parsed.pinned && !isOfflineModeEnabled())) return [3 /*break*/, 9];
                                        return [4 /*yield*/, this_1.refreshTemporaryGitSource(parsed, sourceStr)];
                                    case 8:
                                        _d.sent();
                                        _d.label = 9;
                                    case 9:
                                        metadata.baseDir = installedPath;
                                        this_1.collectPackageResources(installedPath, accumulator, filter, metadata);
                                        _d.label = 10;
                                    case 10: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, sources_1 = sources;
                        _b.label = 1;
                    case 1:
                        if (!(_i < sources_1.length)) return [3 /*break*/, 4];
                        _a = sources_1[_i], pkg = _a.pkg, scope = _a.scope;
                        return [5 /*yield**/, _loop_1(pkg, scope)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.resolveLocalExtensionSource = function (source, accumulator, filter, metadata, baseDir) {
        var resolved = this.resolvePathFromBase(source.path, baseDir);
        if (!(0, node_fs_1.existsSync)(resolved)) {
            return;
        }
        try {
            var stats = (0, node_fs_1.statSync)(resolved);
            if (stats.isFile()) {
                metadata.baseDir = (0, node_path_1.dirname)(resolved);
                this.addResource(accumulator.extensions, resolved, metadata, true);
                return;
            }
            if (stats.isDirectory()) {
                metadata.baseDir = resolved;
                var resources = this.collectPackageResources(resolved, accumulator, filter, metadata);
                if (!resources) {
                    this.addResource(accumulator.extensions, resolved, metadata, true);
                }
            }
        }
        catch (_a) {
            return;
        }
    };
    DefaultPackageManager.prototype.installParsedSource = function (parsed, scope) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(parsed.type === "npm")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.installNpm(parsed, scope, scope === "temporary")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(parsed.type === "git")) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.installGit(parsed, scope)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.getPackageSourceString = function (pkg) {
        return typeof pkg === "string" ? pkg : pkg.source;
    };
    DefaultPackageManager.prototype.getSourceMatchKeyForInput = function (source) {
        var parsed = this.parseSource(source);
        if (parsed.type === "npm") {
            return "npm:".concat(parsed.name);
        }
        if (parsed.type === "git") {
            return "git:".concat(parsed.host, "/").concat(parsed.path);
        }
        return "local:".concat(this.resolvePath(parsed.path));
    };
    DefaultPackageManager.prototype.getSourceMatchKeyForSettings = function (source, scope) {
        var parsed = this.parseSource(source);
        if (parsed.type === "npm") {
            return "npm:".concat(parsed.name);
        }
        if (parsed.type === "git") {
            return "git:".concat(parsed.host, "/").concat(parsed.path);
        }
        var baseDir = this.getBaseDirForScope(scope);
        return "local:".concat(this.resolvePathFromBase(parsed.path, baseDir));
    };
    DefaultPackageManager.prototype.packageSourcesMatch = function (existing, inputSource, scope) {
        var left = this.getSourceMatchKeyForSettings(this.getPackageSourceString(existing), scope);
        var right = this.getSourceMatchKeyForInput(inputSource);
        return left === right;
    };
    DefaultPackageManager.prototype.normalizePackageSourceForSettings = function (source, scope) {
        var parsed = this.parseSource(source);
        if (parsed.type !== "local") {
            return source;
        }
        var baseDir = this.getBaseDirForScope(scope);
        var resolved = this.resolvePath(parsed.path);
        var rel = (0, node_path_1.relative)(baseDir, resolved);
        return rel || ".";
    };
    DefaultPackageManager.prototype.parseSource = function (source) {
        if (source.startsWith("npm:")) {
            var spec = source.slice("npm:".length).trim();
            var _a = this.parseNpmSpec(spec), name_1 = _a.name, version = _a.version;
            return {
                type: "npm",
                spec: spec,
                name: name_1,
                pinned: Boolean(version),
            };
        }
        var trimmed = source.trim();
        var isWindowsAbsolutePath = /^[A-Za-z]:[\\/]|^\\\\/.test(trimmed);
        var isLocalPathLike = trimmed.startsWith(".") ||
            trimmed.startsWith("/") ||
            trimmed === "~" ||
            trimmed.startsWith("~/") ||
            isWindowsAbsolutePath;
        if (isLocalPathLike) {
            return { type: "local", path: source };
        }
        // Try parsing as git URL
        var gitParsed = (0, git_js_1.parseGitUrl)(source);
        if (gitParsed) {
            return gitParsed;
        }
        return { type: "local", path: source };
    };
    /**
     * Check if an npm package needs to be updated.
     * - For unpinned packages: check if registry has a newer version
     * - For pinned packages: check if installed version matches the pinned version
     */
    DefaultPackageManager.prototype.npmNeedsUpdate = function (source, installedPath) {
        return __awaiter(this, void 0, void 0, function () {
            var installedVersion, pinnedVersion, latestVersion, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (isOfflineModeEnabled()) {
                            return [2 /*return*/, false];
                        }
                        installedVersion = this.getInstalledNpmVersion(installedPath);
                        if (!installedVersion)
                            return [2 /*return*/, true];
                        pinnedVersion = this.parseNpmSpec(source.spec).version;
                        if (pinnedVersion) {
                            // Pinned: check if installed matches pinned (exact match for now)
                            return [2 /*return*/, installedVersion !== pinnedVersion];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.getLatestNpmVersion(source.name)];
                    case 2:
                        latestVersion = _b.sent();
                        return [2 /*return*/, latestVersion !== installedVersion];
                    case 3:
                        _a = _b.sent();
                        // If we can't check registry, assume it's fine
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.getInstalledNpmVersion = function (installedPath) {
        var packageJsonPath = (0, node_path_1.join)(installedPath, "package.json");
        if (!(0, node_fs_1.existsSync)(packageJsonPath))
            return undefined;
        try {
            var content = (0, node_fs_1.readFileSync)(packageJsonPath, "utf-8");
            var pkg = JSON.parse(content);
            return pkg.version;
        }
        catch (_a) {
            return undefined;
        }
    };
    DefaultPackageManager.prototype.getLatestNpmVersion = function (packageName) {
        return __awaiter(this, void 0, void 0, function () {
            var response, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch("https://registry.npmjs.org/".concat(packageName, "/latest"), {
                            signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
                        })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok)
                            throw new Error("Failed to fetch npm registry: ".concat(response.status));
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = (_a.sent());
                        return [2 /*return*/, data.version];
                }
            });
        });
    };
    /**
     * Get a unique identity for a package, ignoring version/ref.
     * Used to detect when the same package is in both global and project settings.
     * For git packages, uses normalized host/path to ensure SSH and HTTPS URLs
     * for the same repository are treated as identical.
     */
    DefaultPackageManager.prototype.getPackageIdentity = function (source, scope) {
        var parsed = this.parseSource(source);
        if (parsed.type === "npm") {
            return "npm:".concat(parsed.name);
        }
        if (parsed.type === "git") {
            // Use host/path for identity to normalize SSH and HTTPS
            return "git:".concat(parsed.host, "/").concat(parsed.path);
        }
        if (scope) {
            var baseDir = this.getBaseDirForScope(scope);
            return "local:".concat(this.resolvePathFromBase(parsed.path, baseDir));
        }
        return "local:".concat(this.resolvePath(parsed.path));
    };
    /**
     * Dedupe packages: if same package identity appears in both global and project,
     * keep only the project one (project wins).
     */
    DefaultPackageManager.prototype.dedupePackages = function (packages) {
        var seen = new Map();
        for (var _i = 0, packages_1 = packages; _i < packages_1.length; _i++) {
            var entry = packages_1[_i];
            var sourceStr = typeof entry.pkg === "string" ? entry.pkg : entry.pkg.source;
            var identity = this.getPackageIdentity(sourceStr, entry.scope);
            var existing = seen.get(identity);
            if (!existing) {
                seen.set(identity, entry);
            }
            else if (entry.scope === "project" && existing.scope === "user") {
                // Project wins over user
                seen.set(identity, entry);
            }
            // If existing is project and new is global, keep existing (project)
            // If both are same scope, keep first one
        }
        return Array.from(seen.values());
    };
    DefaultPackageManager.prototype.parseNpmSpec = function (spec) {
        var _a;
        var match = spec.match(/^(@?[^@]+(?:\/[^@]+)?)(?:@(.+))?$/);
        if (!match) {
            return { name: spec };
        }
        var name = (_a = match[1]) !== null && _a !== void 0 ? _a : spec;
        var version = match[2];
        return { name: name, version: version };
    };
    DefaultPackageManager.prototype.getNpmCommand = function () {
        var configuredCommand = this.settingsManager.getNpmCommand();
        if (!configuredCommand || configuredCommand.length === 0) {
            return { command: "npm", args: [] };
        }
        var command = configuredCommand[0], args = configuredCommand.slice(1);
        if (!command) {
            throw new Error("Invalid npmCommand: first array entry must be a non-empty command");
        }
        return { command: command, args: args };
    };
    DefaultPackageManager.prototype.runNpmCommand = function (args, options) {
        return __awaiter(this, void 0, void 0, function () {
            var npmCommand;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        npmCommand = this.getNpmCommand();
                        return [4 /*yield*/, this.runCommand(npmCommand.command, __spreadArray(__spreadArray([], npmCommand.args, true), args, true), options)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.runNpmCommandSync = function (args) {
        var npmCommand = this.getNpmCommand();
        return this.runCommandSync(npmCommand.command, __spreadArray(__spreadArray([], npmCommand.args, true), args, true));
    };
    DefaultPackageManager.prototype.installNpm = function (source, scope, temporary) {
        return __awaiter(this, void 0, void 0, function () {
            var installRoot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(scope === "user" && !temporary)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.runNpmCommand(["install", "-g", source.spec])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        installRoot = this.getNpmInstallRoot(scope, temporary);
                        this.ensureNpmProject(installRoot);
                        return [4 /*yield*/, this.runNpmCommand(["install", source.spec, "--prefix", installRoot])];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.uninstallNpm = function (source, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var installRoot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(scope === "user")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.runNpmCommand(["uninstall", "-g", source.name])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        installRoot = this.getNpmInstallRoot(scope, false);
                        if (!(0, node_fs_1.existsSync)(installRoot)) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.runNpmCommand(["uninstall", source.name, "--prefix", installRoot])];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.installGit = function (source, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDir, gitRoot, packageJsonPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        targetDir = this.getGitInstallPath(source, scope);
                        if ((0, node_fs_1.existsSync)(targetDir)) {
                            return [2 /*return*/];
                        }
                        gitRoot = this.getGitInstallRoot(scope);
                        if (gitRoot) {
                            this.ensureGitIgnore(gitRoot);
                        }
                        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(targetDir), { recursive: true });
                        return [4 /*yield*/, this.runCommand("git", ["clone", source.repo, targetDir])];
                    case 1:
                        _a.sent();
                        if (!source.ref) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.runCommand("git", ["checkout", source.ref], { cwd: targetDir })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        packageJsonPath = (0, node_path_1.join)(targetDir, "package.json");
                        if (!(0, node_fs_1.existsSync)(packageJsonPath)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.runNpmCommand(["install"], { cwd: targetDir })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.updateGit = function (source, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDir, _a, packageJsonPath;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        targetDir = this.getGitInstallPath(source, scope);
                        if (!!(0, node_fs_1.existsSync)(targetDir)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.installGit(source, scope)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                    case 2: 
                    // Fetch latest from remote (handles force-push by getting new history)
                    return [4 /*yield*/, this.runCommand("git", ["fetch", "--prune", "origin"], { cwd: targetDir })];
                    case 3:
                        // Fetch latest from remote (handles force-push by getting new history)
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 9]);
                        return [4 /*yield*/, this.runCommand("git", ["reset", "--hard", "@{upstream}"], { cwd: targetDir })];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 6:
                        _a = _b.sent();
                        return [4 /*yield*/, this.runCommand("git", ["remote", "set-head", "origin", "-a"], { cwd: targetDir }).catch(function () { })];
                    case 7:
                        _b.sent();
                        return [4 /*yield*/, this.runCommand("git", ["reset", "--hard", "origin/HEAD"], { cwd: targetDir })];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 9: 
                    // Clean untracked files (extensions should be pristine)
                    return [4 /*yield*/, this.runCommand("git", ["clean", "-fdx"], { cwd: targetDir })];
                    case 10:
                        // Clean untracked files (extensions should be pristine)
                        _b.sent();
                        packageJsonPath = (0, node_path_1.join)(targetDir, "package.json");
                        if (!(0, node_fs_1.existsSync)(packageJsonPath)) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.runNpmCommand(["install"], { cwd: targetDir })];
                    case 11:
                        _b.sent();
                        _b.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.refreshTemporaryGitSource = function (source, sourceStr) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (isOfflineModeEnabled()) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.withProgress("pull", sourceStr, "Refreshing ".concat(sourceStr, "..."), function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.updateGit(source, "temporary")];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultPackageManager.prototype.removeGit = function (source, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDir;
            return __generator(this, function (_a) {
                targetDir = this.getGitInstallPath(source, scope);
                if (!(0, node_fs_1.existsSync)(targetDir))
                    return [2 /*return*/];
                (0, node_fs_1.rmSync)(targetDir, { recursive: true, force: true });
                this.pruneEmptyGitParents(targetDir, this.getGitInstallRoot(scope));
                return [2 /*return*/];
            });
        });
    };
    DefaultPackageManager.prototype.pruneEmptyGitParents = function (targetDir, installRoot) {
        if (!installRoot)
            return;
        var resolvedRoot = (0, node_path_1.resolve)(installRoot);
        var current = (0, node_path_1.dirname)(targetDir);
        while (current.startsWith(resolvedRoot) && current !== resolvedRoot) {
            if (!(0, node_fs_1.existsSync)(current)) {
                current = (0, node_path_1.dirname)(current);
                continue;
            }
            var entries = (0, node_fs_1.readdirSync)(current);
            if (entries.length > 0) {
                break;
            }
            try {
                (0, node_fs_1.rmSync)(current, { recursive: true, force: true });
            }
            catch (_a) {
                break;
            }
            current = (0, node_path_1.dirname)(current);
        }
    };
    DefaultPackageManager.prototype.ensureNpmProject = function (installRoot) {
        if (!(0, node_fs_1.existsSync)(installRoot)) {
            (0, node_fs_1.mkdirSync)(installRoot, { recursive: true });
        }
        this.ensureGitIgnore(installRoot);
        var packageJsonPath = (0, node_path_1.join)(installRoot, "package.json");
        if (!(0, node_fs_1.existsSync)(packageJsonPath)) {
            var pkgJson = { name: "pi-extensions", private: true };
            (0, node_fs_1.writeFileSync)(packageJsonPath, JSON.stringify(pkgJson, null, 2), "utf-8");
        }
    };
    DefaultPackageManager.prototype.ensureGitIgnore = function (dir) {
        if (!(0, node_fs_1.existsSync)(dir)) {
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        }
        var ignorePath = (0, node_path_1.join)(dir, ".gitignore");
        if (!(0, node_fs_1.existsSync)(ignorePath)) {
            (0, node_fs_1.writeFileSync)(ignorePath, "*\n!.gitignore\n", "utf-8");
        }
    };
    DefaultPackageManager.prototype.getNpmInstallRoot = function (scope, temporary) {
        if (temporary) {
            return this.getTemporaryDir("npm");
        }
        if (scope === "project") {
            return (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "npm");
        }
        return (0, node_path_1.join)(this.getGlobalNpmRoot(), "..");
    };
    DefaultPackageManager.prototype.getGlobalNpmRoot = function () {
        var npmCommand = this.getNpmCommand();
        var commandKey = __spreadArray([npmCommand.command], npmCommand.args, true).join("\0");
        if (this.globalNpmRoot && this.globalNpmRootCommandKey === commandKey) {
            return this.globalNpmRoot;
        }
        var result = this.runNpmCommandSync(["root", "-g"]);
        this.globalNpmRoot = result.trim();
        this.globalNpmRootCommandKey = commandKey;
        return this.globalNpmRoot;
    };
    DefaultPackageManager.prototype.getNpmInstallPath = function (source, scope) {
        if (scope === "temporary") {
            return (0, node_path_1.join)(this.getTemporaryDir("npm"), "node_modules", source.name);
        }
        if (scope === "project") {
            return (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "npm", "node_modules", source.name);
        }
        return (0, node_path_1.join)(this.getGlobalNpmRoot(), source.name);
    };
    DefaultPackageManager.prototype.getGitInstallPath = function (source, scope) {
        if (scope === "temporary") {
            return this.getTemporaryDir("git-".concat(source.host), source.path);
        }
        if (scope === "project") {
            return (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "git", source.host, source.path);
        }
        return (0, node_path_1.join)(this.agentDir, "git", source.host, source.path);
    };
    DefaultPackageManager.prototype.getGitInstallRoot = function (scope) {
        if (scope === "temporary") {
            return undefined;
        }
        if (scope === "project") {
            return (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME, "git");
        }
        return (0, node_path_1.join)(this.agentDir, "git");
    };
    DefaultPackageManager.prototype.getTemporaryDir = function (prefix, suffix) {
        var hash = (0, node_crypto_1.createHash)("sha256")
            .update("".concat(prefix, "-").concat(suffix !== null && suffix !== void 0 ? suffix : ""))
            .digest("hex")
            .slice(0, 8);
        return (0, node_path_1.join)((0, node_os_1.tmpdir)(), "pi-extensions", prefix, hash, suffix !== null && suffix !== void 0 ? suffix : "");
    };
    DefaultPackageManager.prototype.getBaseDirForScope = function (scope) {
        if (scope === "project") {
            return (0, node_path_1.join)(this.cwd, config_js_1.CONFIG_DIR_NAME);
        }
        if (scope === "user") {
            return this.agentDir;
        }
        return this.cwd;
    };
    DefaultPackageManager.prototype.resolvePath = function (input) {
        var trimmed = input.trim();
        if (trimmed === "~")
            return getHomeDir();
        if (trimmed.startsWith("~/"))
            return (0, node_path_1.join)(getHomeDir(), trimmed.slice(2));
        if (trimmed.startsWith("~"))
            return (0, node_path_1.join)(getHomeDir(), trimmed.slice(1));
        return (0, node_path_1.resolve)(this.cwd, trimmed);
    };
    DefaultPackageManager.prototype.resolvePathFromBase = function (input, baseDir) {
        var trimmed = input.trim();
        if (trimmed === "~")
            return getHomeDir();
        if (trimmed.startsWith("~/"))
            return (0, node_path_1.join)(getHomeDir(), trimmed.slice(2));
        if (trimmed.startsWith("~"))
            return (0, node_path_1.join)(getHomeDir(), trimmed.slice(1));
        return (0, node_path_1.resolve)(baseDir, trimmed);
    };
    DefaultPackageManager.prototype.collectPackageResources = function (packageRoot, accumulator, filter, metadata) {
        if (filter) {
            for (var _i = 0, RESOURCE_TYPES_2 = RESOURCE_TYPES; _i < RESOURCE_TYPES_2.length; _i++) {
                var resourceType = RESOURCE_TYPES_2[_i];
                var patterns = filter[resourceType];
                var target = this.getTargetMap(accumulator, resourceType);
                if (patterns !== undefined) {
                    this.applyPackageFilter(packageRoot, patterns, resourceType, target, metadata);
                }
                else {
                    this.collectDefaultResources(packageRoot, resourceType, target, metadata);
                }
            }
            return true;
        }
        var manifest = this.readPiManifest(packageRoot);
        if (manifest) {
            for (var _a = 0, RESOURCE_TYPES_3 = RESOURCE_TYPES; _a < RESOURCE_TYPES_3.length; _a++) {
                var resourceType = RESOURCE_TYPES_3[_a];
                var entries = manifest[resourceType];
                this.addManifestEntries(entries, packageRoot, resourceType, this.getTargetMap(accumulator, resourceType), metadata);
            }
            return true;
        }
        var hasAnyDir = false;
        for (var _b = 0, RESOURCE_TYPES_4 = RESOURCE_TYPES; _b < RESOURCE_TYPES_4.length; _b++) {
            var resourceType = RESOURCE_TYPES_4[_b];
            var dir = (0, node_path_1.join)(packageRoot, resourceType);
            if ((0, node_fs_1.existsSync)(dir)) {
                // Collect all files from the directory (all enabled by default)
                var files = collectResourceFiles(dir, resourceType);
                for (var _c = 0, files_1 = files; _c < files_1.length; _c++) {
                    var f = files_1[_c];
                    this.addResource(this.getTargetMap(accumulator, resourceType), f, metadata, true);
                }
                hasAnyDir = true;
            }
        }
        return hasAnyDir;
    };
    DefaultPackageManager.prototype.collectDefaultResources = function (packageRoot, resourceType, target, metadata) {
        var manifest = this.readPiManifest(packageRoot);
        var entries = manifest === null || manifest === void 0 ? void 0 : manifest[resourceType];
        if (entries) {
            this.addManifestEntries(entries, packageRoot, resourceType, target, metadata);
            return;
        }
        var dir = (0, node_path_1.join)(packageRoot, resourceType);
        if ((0, node_fs_1.existsSync)(dir)) {
            // Collect all files from the directory (all enabled by default)
            var files = collectResourceFiles(dir, resourceType);
            for (var _i = 0, files_2 = files; _i < files_2.length; _i++) {
                var f = files_2[_i];
                this.addResource(target, f, metadata, true);
            }
        }
    };
    DefaultPackageManager.prototype.applyPackageFilter = function (packageRoot, userPatterns, resourceType, target, metadata) {
        var allFiles = this.collectManifestFiles(packageRoot, resourceType).allFiles;
        if (userPatterns.length === 0) {
            // Empty array explicitly disables all resources of this type
            for (var _i = 0, allFiles_1 = allFiles; _i < allFiles_1.length; _i++) {
                var f = allFiles_1[_i];
                this.addResource(target, f, metadata, false);
            }
            return;
        }
        // Apply user patterns
        var enabledByUser = applyPatterns(allFiles, userPatterns, packageRoot);
        for (var _a = 0, allFiles_2 = allFiles; _a < allFiles_2.length; _a++) {
            var f = allFiles_2[_a];
            var enabled = enabledByUser.has(f);
            this.addResource(target, f, metadata, enabled);
        }
    };
    /**
     * Collect all files from a package for a resource type, applying manifest patterns.
     * Returns { allFiles, enabledByManifest } where enabledByManifest is the set of files
     * that pass the manifest's own patterns.
     */
    DefaultPackageManager.prototype.collectManifestFiles = function (packageRoot, resourceType) {
        var manifest = this.readPiManifest(packageRoot);
        var entries = manifest === null || manifest === void 0 ? void 0 : manifest[resourceType];
        if (entries && entries.length > 0) {
            var allFiles_3 = this.collectFilesFromManifestEntries(entries, packageRoot, resourceType);
            var manifestPatterns = entries.filter(isPattern);
            var enabledByManifest = manifestPatterns.length > 0 ? applyPatterns(allFiles_3, manifestPatterns, packageRoot) : new Set(allFiles_3);
            return { allFiles: Array.from(enabledByManifest), enabledByManifest: enabledByManifest };
        }
        var conventionDir = (0, node_path_1.join)(packageRoot, resourceType);
        if (!(0, node_fs_1.existsSync)(conventionDir)) {
            return { allFiles: [], enabledByManifest: new Set() };
        }
        var allFiles = collectResourceFiles(conventionDir, resourceType);
        return { allFiles: allFiles, enabledByManifest: new Set(allFiles) };
    };
    DefaultPackageManager.prototype.readPiManifest = function (packageRoot) {
        var _a;
        var packageJsonPath = (0, node_path_1.join)(packageRoot, "package.json");
        if (!(0, node_fs_1.existsSync)(packageJsonPath)) {
            return null;
        }
        try {
            var content = (0, node_fs_1.readFileSync)(packageJsonPath, "utf-8");
            var pkg = JSON.parse(content);
            return (_a = pkg.pi) !== null && _a !== void 0 ? _a : null;
        }
        catch (_b) {
            return null;
        }
    };
    DefaultPackageManager.prototype.addManifestEntries = function (entries, root, resourceType, target, metadata) {
        if (!entries)
            return;
        var allFiles = this.collectFilesFromManifestEntries(entries, root, resourceType);
        var patterns = entries.filter(isPattern);
        var enabledPaths = applyPatterns(allFiles, patterns, root);
        for (var _i = 0, allFiles_4 = allFiles; _i < allFiles_4.length; _i++) {
            var f = allFiles_4[_i];
            if (enabledPaths.has(f)) {
                this.addResource(target, f, metadata, true);
            }
        }
    };
    DefaultPackageManager.prototype.collectFilesFromManifestEntries = function (entries, root, resourceType) {
        var plain = entries.filter(function (entry) { return !isPattern(entry); });
        var resolved = plain.map(function (entry) { return (0, node_path_1.resolve)(root, entry); });
        return this.collectFilesFromPaths(resolved, resourceType);
    };
    DefaultPackageManager.prototype.resolveLocalEntries = function (entries, resourceType, target, metadata, baseDir) {
        var _this = this;
        if (entries.length === 0)
            return;
        // Collect all files from plain entries (non-pattern entries)
        var _a = splitPatterns(entries), plain = _a.plain, patterns = _a.patterns;
        var resolvedPlain = plain.map(function (p) { return _this.resolvePathFromBase(p, baseDir); });
        var allFiles = this.collectFilesFromPaths(resolvedPlain, resourceType);
        // Determine which files are enabled based on patterns
        var enabledPaths = applyPatterns(allFiles, patterns, baseDir);
        // Add all files with their enabled state
        for (var _i = 0, allFiles_5 = allFiles; _i < allFiles_5.length; _i++) {
            var f = allFiles_5[_i];
            this.addResource(target, f, metadata, enabledPaths.has(f));
        }
    };
    DefaultPackageManager.prototype.addAutoDiscoveredResources = function (accumulator, globalSettings, projectSettings, globalBaseDir, projectBaseDir) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var userMetadata = {
            source: "auto",
            scope: "user",
            origin: "top-level",
            baseDir: globalBaseDir,
        };
        var projectMetadata = {
            source: "auto",
            scope: "project",
            origin: "top-level",
            baseDir: projectBaseDir,
        };
        var userOverrides = {
            extensions: ((_a = globalSettings.extensions) !== null && _a !== void 0 ? _a : []),
            skills: ((_b = globalSettings.skills) !== null && _b !== void 0 ? _b : []),
            prompts: ((_c = globalSettings.prompts) !== null && _c !== void 0 ? _c : []),
            themes: ((_d = globalSettings.themes) !== null && _d !== void 0 ? _d : []),
        };
        var projectOverrides = {
            extensions: ((_e = projectSettings.extensions) !== null && _e !== void 0 ? _e : []),
            skills: ((_f = projectSettings.skills) !== null && _f !== void 0 ? _f : []),
            prompts: ((_g = projectSettings.prompts) !== null && _g !== void 0 ? _g : []),
            themes: ((_h = projectSettings.themes) !== null && _h !== void 0 ? _h : []),
        };
        var userDirs = {
            extensions: (0, node_path_1.join)(globalBaseDir, "extensions"),
            skills: (0, node_path_1.join)(globalBaseDir, "skills"),
            prompts: (0, node_path_1.join)(globalBaseDir, "prompts"),
            themes: (0, node_path_1.join)(globalBaseDir, "themes"),
        };
        var projectDirs = {
            extensions: (0, node_path_1.join)(projectBaseDir, "extensions"),
            skills: (0, node_path_1.join)(projectBaseDir, "skills"),
            prompts: (0, node_path_1.join)(projectBaseDir, "prompts"),
            themes: (0, node_path_1.join)(projectBaseDir, "themes"),
        };
        var userAgentsSkillsDir = (0, node_path_1.join)(getHomeDir(), ".agents", "skills");
        var projectAgentsSkillDirs = collectAncestorAgentsSkillDirs(this.cwd).filter(function (dir) { return (0, node_path_1.resolve)(dir) !== (0, node_path_1.resolve)(userAgentsSkillsDir); });
        var addResources = function (resourceType, paths, metadata, overrides, baseDir) {
            var target = _this.getTargetMap(accumulator, resourceType);
            for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
                var path = paths_1[_i];
                var enabled = isEnabledByOverrides(path, overrides, baseDir);
                _this.addResource(target, path, metadata, enabled);
            }
        };
        addResources("extensions", collectAutoExtensionEntries(projectDirs.extensions), projectMetadata, projectOverrides.extensions, projectBaseDir);
        addResources("skills", __spreadArray(__spreadArray([], collectAutoSkillEntries(projectDirs.skills), true), projectAgentsSkillDirs.flatMap(function (dir) { return collectAutoSkillEntries(dir); }), true), projectMetadata, projectOverrides.skills, projectBaseDir);
        addResources("prompts", collectAutoPromptEntries(projectDirs.prompts), projectMetadata, projectOverrides.prompts, projectBaseDir);
        addResources("themes", collectAutoThemeEntries(projectDirs.themes), projectMetadata, projectOverrides.themes, projectBaseDir);
        addResources("extensions", collectAutoExtensionEntries(userDirs.extensions), userMetadata, userOverrides.extensions, globalBaseDir);
        addResources("skills", __spreadArray(__spreadArray([], collectAutoSkillEntries(userDirs.skills), true), collectAutoSkillEntries(userAgentsSkillsDir), true), userMetadata, userOverrides.skills, globalBaseDir);
        addResources("prompts", collectAutoPromptEntries(userDirs.prompts), userMetadata, userOverrides.prompts, globalBaseDir);
        addResources("themes", collectAutoThemeEntries(userDirs.themes), userMetadata, userOverrides.themes, globalBaseDir);
    };
    DefaultPackageManager.prototype.collectFilesFromPaths = function (paths, resourceType) {
        var files = [];
        for (var _i = 0, paths_2 = paths; _i < paths_2.length; _i++) {
            var p = paths_2[_i];
            if (!(0, node_fs_1.existsSync)(p))
                continue;
            try {
                var stats = (0, node_fs_1.statSync)(p);
                if (stats.isFile()) {
                    files.push(p);
                }
                else if (stats.isDirectory()) {
                    files.push.apply(files, collectResourceFiles(p, resourceType));
                }
            }
            catch (_a) {
                // Ignore errors
            }
        }
        return files;
    };
    DefaultPackageManager.prototype.getTargetMap = function (accumulator, resourceType) {
        switch (resourceType) {
            case "extensions":
                return accumulator.extensions;
            case "skills":
                return accumulator.skills;
            case "prompts":
                return accumulator.prompts;
            case "themes":
                return accumulator.themes;
            default:
                throw new Error("Unknown resource type: ".concat(resourceType));
        }
    };
    DefaultPackageManager.prototype.addResource = function (map, path, metadata, enabled) {
        if (!path)
            return;
        if (!map.has(path)) {
            map.set(path, { metadata: metadata, enabled: enabled });
        }
    };
    DefaultPackageManager.prototype.createAccumulator = function () {
        return {
            extensions: new Map(),
            skills: new Map(),
            prompts: new Map(),
            themes: new Map(),
        };
    };
    DefaultPackageManager.prototype.toResolvedPaths = function (accumulator) {
        var toResolved = function (entries) {
            return Array.from(entries.entries()).map(function (_a) {
                var path = _a[0], _b = _a[1], metadata = _b.metadata, enabled = _b.enabled;
                return ({
                    path: path,
                    enabled: enabled,
                    metadata: metadata,
                });
            });
        };
        return {
            extensions: toResolved(accumulator.extensions),
            skills: toResolved(accumulator.skills),
            prompts: toResolved(accumulator.prompts),
            themes: toResolved(accumulator.themes),
        };
    };
    DefaultPackageManager.prototype.runCommand = function (command, args, options) {
        return new Promise(function (resolvePromise, reject) {
            var child = (0, node_child_process_1.spawn)(command, args, {
                cwd: options === null || options === void 0 ? void 0 : options.cwd,
                stdio: "inherit",
                shell: process.platform === "win32",
            });
            child.on("error", reject);
            child.on("exit", function (code) {
                if (code === 0) {
                    resolvePromise();
                }
                else {
                    reject(new Error("".concat(command, " ").concat(args.join(" "), " failed with code ").concat(code)));
                }
            });
        });
    };
    DefaultPackageManager.prototype.runCommandSync = function (command, args) {
        var result = (0, node_child_process_1.spawnSync)(command, args, {
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf-8",
            shell: process.platform === "win32",
        });
        if (result.status !== 0) {
            throw new Error("Failed to run ".concat(command, " ").concat(args.join(" "), ": ").concat(result.stderr || result.stdout));
        }
        return (result.stdout || result.stderr || "").trim();
    };
    return DefaultPackageManager;
}());
exports.DefaultPackageManager = DefaultPackageManager;
