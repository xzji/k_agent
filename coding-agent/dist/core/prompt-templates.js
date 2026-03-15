"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommandArgs = parseCommandArgs;
exports.substituteArgs = substituteArgs;
exports.loadPromptTemplates = loadPromptTemplates;
exports.expandPromptTemplate = expandPromptTemplate;
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var config_js_1 = require("../config.js");
var frontmatter_js_1 = require("../utils/frontmatter.js");
/**
 * Parse command arguments respecting quoted strings (bash-style)
 * Returns array of arguments
 */
function parseCommandArgs(argsString) {
    var args = [];
    var current = "";
    var inQuote = null;
    for (var i = 0; i < argsString.length; i++) {
        var char = argsString[i];
        if (inQuote) {
            if (char === inQuote) {
                inQuote = null;
            }
            else {
                current += char;
            }
        }
        else if (char === '"' || char === "'") {
            inQuote = char;
        }
        else if (char === " " || char === "\t") {
            if (current) {
                args.push(current);
                current = "";
            }
        }
        else {
            current += char;
        }
    }
    if (current) {
        args.push(current);
    }
    return args;
}
/**
 * Substitute argument placeholders in template content
 * Supports:
 * - $1, $2, ... for positional args
 * - $@ and $ARGUMENTS for all args
 * - ${@:N} for args from Nth onwards (bash-style slicing)
 * - ${@:N:L} for L args starting from Nth
 *
 * Note: Replacement happens on the template string only. Argument values
 * containing patterns like $1, $@, or $ARGUMENTS are NOT recursively substituted.
 */
function substituteArgs(content, args) {
    var result = content;
    // Replace $1, $2, etc. with positional args FIRST (before wildcards)
    // This prevents wildcard replacement values containing $<digit> patterns from being re-substituted
    result = result.replace(/\$(\d+)/g, function (_, num) {
        var _a;
        var index = parseInt(num, 10) - 1;
        return (_a = args[index]) !== null && _a !== void 0 ? _a : "";
    });
    // Replace ${@:start} or ${@:start:length} with sliced args (bash-style)
    // Process BEFORE simple $@ to avoid conflicts
    result = result.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, function (_, startStr, lengthStr) {
        var start = parseInt(startStr, 10) - 1; // Convert to 0-indexed (user provides 1-indexed)
        // Treat 0 as 1 (bash convention: args start at 1)
        if (start < 0)
            start = 0;
        if (lengthStr) {
            var length_1 = parseInt(lengthStr, 10);
            return args.slice(start, start + length_1).join(" ");
        }
        return args.slice(start).join(" ");
    });
    // Pre-compute all args joined (optimization)
    var allArgs = args.join(" ");
    // Replace $ARGUMENTS with all args joined (new syntax, aligns with Claude, Codex, OpenCode)
    result = result.replace(/\$ARGUMENTS/g, allArgs);
    // Replace $@ with all args joined (existing syntax)
    result = result.replace(/\$@/g, allArgs);
    return result;
}
function loadTemplateFromFile(filePath, source, sourceLabel) {
    try {
        var rawContent = (0, fs_1.readFileSync)(filePath, "utf-8");
        var _a = (0, frontmatter_js_1.parseFrontmatter)(rawContent), frontmatter = _a.frontmatter, body = _a.body;
        var name_1 = (0, path_1.basename)(filePath).replace(/\.md$/, "");
        // Get description from frontmatter or first non-empty line
        var description = frontmatter.description || "";
        if (!description) {
            var firstLine = body.split("\n").find(function (line) { return line.trim(); });
            if (firstLine) {
                // Truncate if too long
                description = firstLine.slice(0, 60);
                if (firstLine.length > 60)
                    description += "...";
            }
        }
        // Append source to description
        description = description ? "".concat(description, " ").concat(sourceLabel) : sourceLabel;
        return {
            name: name_1,
            description: description,
            content: body,
            source: source,
            filePath: filePath,
        };
    }
    catch (_b) {
        return null;
    }
}
/**
 * Scan a directory for .md files (non-recursive) and load them as prompt templates.
 */
function loadTemplatesFromDir(dir, source, sourceLabel) {
    var templates = [];
    if (!(0, fs_1.existsSync)(dir)) {
        return templates;
    }
    try {
        var entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var fullPath = (0, path_1.join)(dir, entry.name);
            // For symlinks, check if they point to a file
            var isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    var stats = (0, fs_1.statSync)(fullPath);
                    isFile = stats.isFile();
                }
                catch (_a) {
                    // Broken symlink, skip it
                    continue;
                }
            }
            if (isFile && entry.name.endsWith(".md")) {
                var template = loadTemplateFromFile(fullPath, source, sourceLabel);
                if (template) {
                    templates.push(template);
                }
            }
        }
    }
    catch (_b) {
        return templates;
    }
    return templates;
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
function resolvePromptPath(p, cwd) {
    var normalized = normalizePath(p);
    return (0, path_1.isAbsolute)(normalized) ? normalized : (0, path_1.resolve)(cwd, normalized);
}
function buildPathSourceLabel(p) {
    var base = (0, path_1.basename)(p).replace(/\.md$/, "") || "path";
    return "(path:".concat(base, ")");
}
/**
 * Load all prompt templates from:
 * 1. Global: agentDir/prompts/
 * 2. Project: cwd/{CONFIG_DIR_NAME}/prompts/
 * 3. Explicit prompt paths
 */
function loadPromptTemplates(options) {
    var _a, _b, _c, _d;
    if (options === void 0) { options = {}; }
    var resolvedCwd = (_a = options.cwd) !== null && _a !== void 0 ? _a : process.cwd();
    var resolvedAgentDir = (_b = options.agentDir) !== null && _b !== void 0 ? _b : (0, config_js_1.getPromptsDir)();
    var promptPaths = (_c = options.promptPaths) !== null && _c !== void 0 ? _c : [];
    var includeDefaults = (_d = options.includeDefaults) !== null && _d !== void 0 ? _d : true;
    var templates = [];
    if (includeDefaults) {
        // 1. Load global templates from agentDir/prompts/
        // Note: if agentDir is provided, it should be the agent dir, not the prompts dir
        var globalPromptsDir = options.agentDir ? (0, path_1.join)(options.agentDir, "prompts") : resolvedAgentDir;
        templates.push.apply(templates, loadTemplatesFromDir(globalPromptsDir, "user", "(user)"));
        // 2. Load project templates from cwd/{CONFIG_DIR_NAME}/prompts/
        var projectPromptsDir_1 = (0, path_1.resolve)(resolvedCwd, config_js_1.CONFIG_DIR_NAME, "prompts");
        templates.push.apply(templates, loadTemplatesFromDir(projectPromptsDir_1, "project", "(project)"));
    }
    var userPromptsDir = options.agentDir ? (0, path_1.join)(options.agentDir, "prompts") : resolvedAgentDir;
    var projectPromptsDir = (0, path_1.resolve)(resolvedCwd, config_js_1.CONFIG_DIR_NAME, "prompts");
    var isUnderPath = function (target, root) {
        var normalizedRoot = (0, path_1.resolve)(root);
        if (target === normalizedRoot) {
            return true;
        }
        var prefix = normalizedRoot.endsWith(path_1.sep) ? normalizedRoot : "".concat(normalizedRoot).concat(path_1.sep);
        return target.startsWith(prefix);
    };
    var getSourceInfo = function (resolvedPath) {
        if (!includeDefaults) {
            if (isUnderPath(resolvedPath, userPromptsDir)) {
                return { source: "user", label: "(user)" };
            }
            if (isUnderPath(resolvedPath, projectPromptsDir)) {
                return { source: "project", label: "(project)" };
            }
        }
        return { source: "path", label: buildPathSourceLabel(resolvedPath) };
    };
    // 3. Load explicit prompt paths
    for (var _i = 0, promptPaths_1 = promptPaths; _i < promptPaths_1.length; _i++) {
        var rawPath = promptPaths_1[_i];
        var resolvedPath = resolvePromptPath(rawPath, resolvedCwd);
        if (!(0, fs_1.existsSync)(resolvedPath)) {
            continue;
        }
        try {
            var stats = (0, fs_1.statSync)(resolvedPath);
            var _e = getSourceInfo(resolvedPath), source = _e.source, label = _e.label;
            if (stats.isDirectory()) {
                templates.push.apply(templates, loadTemplatesFromDir(resolvedPath, source, label));
            }
            else if (stats.isFile() && resolvedPath.endsWith(".md")) {
                var template = loadTemplateFromFile(resolvedPath, source, label);
                if (template) {
                    templates.push(template);
                }
            }
        }
        catch (_f) {
            // Ignore read failures
        }
    }
    return templates;
}
/**
 * Expand a prompt template if it matches a template name.
 * Returns the expanded content or the original text if not a template.
 */
function expandPromptTemplate(text, templates) {
    if (!text.startsWith("/"))
        return text;
    var spaceIndex = text.indexOf(" ");
    var templateName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
    var argsString = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1);
    var template = templates.find(function (t) { return t.name === templateName; });
    if (template) {
        var args = parseCommandArgs(argsString);
        return substituteArgs(template.content, args);
    }
    return text;
}
