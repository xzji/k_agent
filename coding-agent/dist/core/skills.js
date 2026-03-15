"use strict";
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
exports.loadSkillsFromDir = loadSkillsFromDir;
exports.formatSkillsForPrompt = formatSkillsForPrompt;
exports.loadSkills = loadSkills;
var fs_1 = require("fs");
var ignore_1 = require("ignore");
var os_1 = require("os");
var path_1 = require("path");
var config_js_1 = require("../config.js");
var frontmatter_js_1 = require("../utils/frontmatter.js");
/** Max name length per spec */
var MAX_NAME_LENGTH = 64;
/** Max description length per spec */
var MAX_DESCRIPTION_LENGTH = 1024;
var IGNORE_FILE_NAMES = [".gitignore", ".ignore", ".fdignore"];
function toPosixPath(p) {
    return p.split(path_1.sep).join("/");
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
    var relativeDir = (0, path_1.relative)(rootDir, dir);
    var prefix = relativeDir ? "".concat(toPosixPath(relativeDir), "/") : "";
    for (var _i = 0, IGNORE_FILE_NAMES_1 = IGNORE_FILE_NAMES; _i < IGNORE_FILE_NAMES_1.length; _i++) {
        var filename = IGNORE_FILE_NAMES_1[_i];
        var ignorePath = (0, path_1.join)(dir, filename);
        if (!(0, fs_1.existsSync)(ignorePath))
            continue;
        try {
            var content = (0, fs_1.readFileSync)(ignorePath, "utf-8");
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
/**
 * Validate skill name per Agent Skills spec.
 * Returns array of validation error messages (empty if valid).
 */
function validateName(name, parentDirName) {
    var errors = [];
    if (name !== parentDirName) {
        errors.push("name \"".concat(name, "\" does not match parent directory \"").concat(parentDirName, "\""));
    }
    if (name.length > MAX_NAME_LENGTH) {
        errors.push("name exceeds ".concat(MAX_NAME_LENGTH, " characters (").concat(name.length, ")"));
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push("name contains invalid characters (must be lowercase a-z, 0-9, hyphens only)");
    }
    if (name.startsWith("-") || name.endsWith("-")) {
        errors.push("name must not start or end with a hyphen");
    }
    if (name.includes("--")) {
        errors.push("name must not contain consecutive hyphens");
    }
    return errors;
}
/**
 * Validate description per Agent Skills spec.
 */
function validateDescription(description) {
    var errors = [];
    if (!description || description.trim() === "") {
        errors.push("description is required");
    }
    else if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push("description exceeds ".concat(MAX_DESCRIPTION_LENGTH, " characters (").concat(description.length, ")"));
    }
    return errors;
}
/**
 * Load skills from a directory.
 *
 * Discovery rules:
 * - if a directory contains SKILL.md, treat it as a skill root and do not recurse further
 * - otherwise, load direct .md children in the root
 * - recurse into subdirectories to find SKILL.md
 */
function loadSkillsFromDir(options) {
    var dir = options.dir, source = options.source;
    return loadSkillsFromDirInternal(dir, source, true);
}
function loadSkillsFromDirInternal(dir, source, includeRootFiles, ignoreMatcher, rootDir) {
    var skills = [];
    var diagnostics = [];
    if (!(0, fs_1.existsSync)(dir)) {
        return { skills: skills, diagnostics: diagnostics };
    }
    var root = rootDir !== null && rootDir !== void 0 ? rootDir : dir;
    var ig = ignoreMatcher !== null && ignoreMatcher !== void 0 ? ignoreMatcher : (0, ignore_1.default)();
    addIgnoreRules(ig, dir, root);
    try {
        var entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            if (entry.name !== "SKILL.md") {
                continue;
            }
            var fullPath = (0, path_1.join)(dir, entry.name);
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    isFile = (0, fs_1.statSync)(fullPath).isFile();
                }
                catch (_a) {
                    continue;
                }
            }
            var relPath = toPosixPath((0, path_1.relative)(root, fullPath));
            if (!isFile || ig.ignores(relPath)) {
                continue;
            }
            var result = loadSkillFromFile(fullPath, source);
            if (result.skill) {
                skills.push(result.skill);
            }
            diagnostics.push.apply(diagnostics, result.diagnostics);
            return { skills: skills, diagnostics: diagnostics };
        }
        for (var _b = 0, entries_2 = entries; _b < entries_2.length; _b++) {
            var entry = entries_2[_b];
            if (entry.name.startsWith(".")) {
                continue;
            }
            // Skip node_modules to avoid scanning dependencies
            if (entry.name === "node_modules") {
                continue;
            }
            var fullPath = (0, path_1.join)(dir, entry.name);
            // For symlinks, check if they point to a directory and follow them
            var isDirectory = entry.isDirectory();
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    var stats = (0, fs_1.statSync)(fullPath);
                    isDirectory = stats.isDirectory();
                    isFile = stats.isFile();
                }
                catch (_c) {
                    // Broken symlink, skip it
                    continue;
                }
            }
            var relPath = toPosixPath((0, path_1.relative)(root, fullPath));
            var ignorePath = isDirectory ? "".concat(relPath, "/") : relPath;
            if (ig.ignores(ignorePath)) {
                continue;
            }
            if (isDirectory) {
                var subResult = loadSkillsFromDirInternal(fullPath, source, false, ig, root);
                skills.push.apply(skills, subResult.skills);
                diagnostics.push.apply(diagnostics, subResult.diagnostics);
                continue;
            }
            if (!isFile || !includeRootFiles || !entry.name.endsWith(".md")) {
                continue;
            }
            var result = loadSkillFromFile(fullPath, source);
            if (result.skill) {
                skills.push(result.skill);
            }
            diagnostics.push.apply(diagnostics, result.diagnostics);
        }
    }
    catch (_d) { }
    return { skills: skills, diagnostics: diagnostics };
}
function loadSkillFromFile(filePath, source) {
    var diagnostics = [];
    try {
        var rawContent = (0, fs_1.readFileSync)(filePath, "utf-8");
        var frontmatter = (0, frontmatter_js_1.parseFrontmatter)(rawContent).frontmatter;
        var skillDir = (0, path_1.dirname)(filePath);
        var parentDirName = (0, path_1.basename)(skillDir);
        // Validate description
        var descErrors = validateDescription(frontmatter.description);
        for (var _i = 0, descErrors_1 = descErrors; _i < descErrors_1.length; _i++) {
            var error = descErrors_1[_i];
            diagnostics.push({ type: "warning", message: error, path: filePath });
        }
        // Use name from frontmatter, or fall back to parent directory name
        var name_1 = frontmatter.name || parentDirName;
        // Validate name
        var nameErrors = validateName(name_1, parentDirName);
        for (var _a = 0, nameErrors_1 = nameErrors; _a < nameErrors_1.length; _a++) {
            var error = nameErrors_1[_a];
            diagnostics.push({ type: "warning", message: error, path: filePath });
        }
        // Still load the skill even with warnings (unless description is completely missing)
        if (!frontmatter.description || frontmatter.description.trim() === "") {
            return { skill: null, diagnostics: diagnostics };
        }
        return {
            skill: {
                name: name_1,
                description: frontmatter.description,
                filePath: filePath,
                baseDir: skillDir,
                source: source,
                disableModelInvocation: frontmatter["disable-model-invocation"] === true,
            },
            diagnostics: diagnostics,
        };
    }
    catch (error) {
        var message = error instanceof Error ? error.message : "failed to parse skill file";
        diagnostics.push({ type: "warning", message: message, path: filePath });
        return { skill: null, diagnostics: diagnostics };
    }
}
/**
 * Format skills for inclusion in a system prompt.
 * Uses XML format per Agent Skills standard.
 * See: https://agentskills.io/integrate-skills
 *
 * Skills with disableModelInvocation=true are excluded from the prompt
 * (they can only be invoked explicitly via /skill:name commands).
 */
function formatSkillsForPrompt(skills) {
    var visibleSkills = skills.filter(function (s) { return !s.disableModelInvocation; });
    if (visibleSkills.length === 0) {
        return "";
    }
    var lines = [
        "\n\nThe following skills provide specialized instructions for specific tasks.",
        "Use the read tool to load a skill's file when the task matches its description.",
        "When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.",
        "",
        "<available_skills>",
    ];
    for (var _i = 0, visibleSkills_1 = visibleSkills; _i < visibleSkills_1.length; _i++) {
        var skill = visibleSkills_1[_i];
        lines.push("  <skill>");
        lines.push("    <name>".concat(escapeXml(skill.name), "</name>"));
        lines.push("    <description>".concat(escapeXml(skill.description), "</description>"));
        lines.push("    <location>".concat(escapeXml(skill.filePath), "</location>"));
        lines.push("  </skill>");
    }
    lines.push("</available_skills>");
    return lines.join("\n");
}
function escapeXml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
function normalizePath(input) {
    var trimmed = input.trim();
    if (trimmed === "~")
        return (0, os_1.homedir)();
    if (trimmed.startsWith("~/"))
        return (0, path_1.join)((0, os_1.homedir)(), trimmed.slice(2));
    if (trimmed.startsWith("~"))
        return (0, path_1.join)((0, os_1.homedir)(), trimmed.slice(1));
    return trimmed;
}
function resolveSkillPath(p, cwd) {
    var normalized = normalizePath(p);
    return (0, path_1.isAbsolute)(normalized) ? normalized : (0, path_1.resolve)(cwd, normalized);
}
/**
 * Load skills from all configured locations.
 * Returns skills and any validation diagnostics.
 */
function loadSkills(options) {
    if (options === void 0) { options = {}; }
    var _a = options.cwd, cwd = _a === void 0 ? process.cwd() : _a, agentDir = options.agentDir, _b = options.skillPaths, skillPaths = _b === void 0 ? [] : _b, _c = options.includeDefaults, includeDefaults = _c === void 0 ? true : _c;
    // Resolve agentDir - if not provided, use default from config
    var resolvedAgentDir = agentDir !== null && agentDir !== void 0 ? agentDir : (0, config_js_1.getAgentDir)();
    var skillMap = new Map();
    var realPathSet = new Set();
    var allDiagnostics = [];
    var collisionDiagnostics = [];
    function addSkills(result) {
        allDiagnostics.push.apply(allDiagnostics, result.diagnostics);
        for (var _i = 0, _a = result.skills; _i < _a.length; _i++) {
            var skill = _a[_i];
            // Resolve symlinks to detect duplicate files
            var realPath = void 0;
            try {
                realPath = (0, fs_1.realpathSync)(skill.filePath);
            }
            catch (_b) {
                realPath = skill.filePath;
            }
            // Skip silently if we've already loaded this exact file (via symlink)
            if (realPathSet.has(realPath)) {
                continue;
            }
            var existing = skillMap.get(skill.name);
            if (existing) {
                collisionDiagnostics.push({
                    type: "collision",
                    message: "name \"".concat(skill.name, "\" collision"),
                    path: skill.filePath,
                    collision: {
                        resourceType: "skill",
                        name: skill.name,
                        winnerPath: existing.filePath,
                        loserPath: skill.filePath,
                    },
                });
            }
            else {
                skillMap.set(skill.name, skill);
                realPathSet.add(realPath);
            }
        }
    }
    if (includeDefaults) {
        addSkills(loadSkillsFromDirInternal((0, path_1.join)(resolvedAgentDir, "skills"), "user", true));
        addSkills(loadSkillsFromDirInternal((0, path_1.resolve)(cwd, config_js_1.CONFIG_DIR_NAME, "skills"), "project", true));
    }
    var userSkillsDir = (0, path_1.join)(resolvedAgentDir, "skills");
    var projectSkillsDir = (0, path_1.resolve)(cwd, config_js_1.CONFIG_DIR_NAME, "skills");
    var isUnderPath = function (target, root) {
        var normalizedRoot = (0, path_1.resolve)(root);
        if (target === normalizedRoot) {
            return true;
        }
        var prefix = normalizedRoot.endsWith(path_1.sep) ? normalizedRoot : "".concat(normalizedRoot).concat(path_1.sep);
        return target.startsWith(prefix);
    };
    var getSource = function (resolvedPath) {
        if (!includeDefaults) {
            if (isUnderPath(resolvedPath, userSkillsDir))
                return "user";
            if (isUnderPath(resolvedPath, projectSkillsDir))
                return "project";
        }
        return "path";
    };
    for (var _i = 0, skillPaths_1 = skillPaths; _i < skillPaths_1.length; _i++) {
        var rawPath = skillPaths_1[_i];
        var resolvedPath = resolveSkillPath(rawPath, cwd);
        if (!(0, fs_1.existsSync)(resolvedPath)) {
            allDiagnostics.push({ type: "warning", message: "skill path does not exist", path: resolvedPath });
            continue;
        }
        try {
            var stats = (0, fs_1.statSync)(resolvedPath);
            var source = getSource(resolvedPath);
            if (stats.isDirectory()) {
                addSkills(loadSkillsFromDirInternal(resolvedPath, source, true));
            }
            else if (stats.isFile() && resolvedPath.endsWith(".md")) {
                var result = loadSkillFromFile(resolvedPath, source);
                if (result.skill) {
                    addSkills({ skills: [result.skill], diagnostics: result.diagnostics });
                }
                else {
                    allDiagnostics.push.apply(allDiagnostics, result.diagnostics);
                }
            }
            else {
                allDiagnostics.push({ type: "warning", message: "skill path is not a markdown file", path: resolvedPath });
            }
        }
        catch (error) {
            var message = error instanceof Error ? error.message : "failed to read skill path";
            allDiagnostics.push({ type: "warning", message: message, path: resolvedPath });
        }
    }
    return {
        skills: Array.from(skillMap.values()),
        diagnostics: __spreadArray(__spreadArray([], allDiagnostics, true), collisionDiagnostics, true),
    };
}
