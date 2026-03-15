"use strict";
/**
 * System prompt construction and project context loading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = buildSystemPrompt;
var config_js_1 = require("../config.js");
var skills_js_1 = require("./skills.js");
/** Tool descriptions for system prompt */
var toolDescriptions = {
    read: "Read file contents",
    bash: "Execute bash commands (ls, grep, find, etc.)",
    edit: "Make surgical edits to files (find exact text and replace)",
    write: "Create or overwrite files",
    grep: "Search file contents for patterns (respects .gitignore)",
    find: "Find files by glob pattern (respects .gitignore)",
    ls: "List directory contents",
};
/** Build the system prompt with tools, guidelines, and context */
function buildSystemPrompt(options) {
    if (options === void 0) { options = {}; }
    var customPrompt = options.customPrompt, selectedTools = options.selectedTools, toolSnippets = options.toolSnippets, promptGuidelines = options.promptGuidelines, appendSystemPrompt = options.appendSystemPrompt, cwd = options.cwd, providedContextFiles = options.contextFiles, providedSkills = options.skills;
    var resolvedCwd = cwd !== null && cwd !== void 0 ? cwd : process.cwd();
    var promptCwd = resolvedCwd.replace(/\\/g, "/");
    var date = new Date().toISOString().slice(0, 10);
    var appendSection = appendSystemPrompt ? "\n\n".concat(appendSystemPrompt) : "";
    var contextFiles = providedContextFiles !== null && providedContextFiles !== void 0 ? providedContextFiles : [];
    var skills = providedSkills !== null && providedSkills !== void 0 ? providedSkills : [];
    if (customPrompt) {
        var prompt_1 = customPrompt;
        if (appendSection) {
            prompt_1 += appendSection;
        }
        // Append project context files
        if (contextFiles.length > 0) {
            prompt_1 += "\n\n# Project Context\n\n";
            prompt_1 += "Project-specific instructions and guidelines:\n\n";
            for (var _i = 0, contextFiles_1 = contextFiles; _i < contextFiles_1.length; _i++) {
                var _a = contextFiles_1[_i], filePath = _a.path, content = _a.content;
                prompt_1 += "## ".concat(filePath, "\n\n").concat(content, "\n\n");
            }
        }
        // Append skills section (only if read tool is available)
        var customPromptHasRead = !selectedTools || selectedTools.includes("read");
        if (customPromptHasRead && skills.length > 0) {
            prompt_1 += (0, skills_js_1.formatSkillsForPrompt)(skills);
        }
        // Add date and working directory last
        prompt_1 += "\nCurrent date: ".concat(date);
        prompt_1 += "\nCurrent working directory: ".concat(promptCwd);
        return prompt_1;
    }
    // Get absolute paths to documentation and examples
    var readmePath = (0, config_js_1.getReadmePath)();
    var docsPath = (0, config_js_1.getDocsPath)();
    var examplesPath = (0, config_js_1.getExamplesPath)();
    // Build tools list based on selected tools.
    // Built-ins use toolDescriptions. Custom tools can provide one-line snippets.
    var tools = selectedTools || ["read", "bash", "edit", "write"];
    var toolsList = tools.length > 0
        ? tools
            .map(function (name) {
            var _a, _b;
            var snippet = (_b = (_a = toolSnippets === null || toolSnippets === void 0 ? void 0 : toolSnippets[name]) !== null && _a !== void 0 ? _a : toolDescriptions[name]) !== null && _b !== void 0 ? _b : name;
            return "- ".concat(name, ": ").concat(snippet);
        })
            .join("\n")
        : "(none)";
    // Build guidelines based on which tools are actually available
    var guidelinesList = [];
    var guidelinesSet = new Set();
    var addGuideline = function (guideline) {
        if (guidelinesSet.has(guideline)) {
            return;
        }
        guidelinesSet.add(guideline);
        guidelinesList.push(guideline);
    };
    var hasBash = tools.includes("bash");
    var hasEdit = tools.includes("edit");
    var hasWrite = tools.includes("write");
    var hasGrep = tools.includes("grep");
    var hasFind = tools.includes("find");
    var hasLs = tools.includes("ls");
    var hasRead = tools.includes("read");
    // File exploration guidelines
    if (hasBash && !hasGrep && !hasFind && !hasLs) {
        addGuideline("Use bash for file operations like ls, rg, find");
    }
    else if (hasBash && (hasGrep || hasFind || hasLs)) {
        addGuideline("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
    }
    // Read before edit guideline
    if (hasRead && hasEdit) {
        addGuideline("Use read to examine files before editing. You must use this tool instead of cat or sed.");
    }
    // Edit guideline
    if (hasEdit) {
        addGuideline("Use edit for precise changes (old text must match exactly)");
    }
    // Write guideline
    if (hasWrite) {
        addGuideline("Use write only for new files or complete rewrites");
    }
    // Output guideline (only when actually writing or executing)
    if (hasEdit || hasWrite) {
        addGuideline("When summarizing your actions, output plain text directly - do NOT use cat or bash to display what you did");
    }
    for (var _b = 0, _c = promptGuidelines !== null && promptGuidelines !== void 0 ? promptGuidelines : []; _b < _c.length; _b++) {
        var guideline = _c[_b];
        var normalized = guideline.trim();
        if (normalized.length > 0) {
            addGuideline(normalized);
        }
    }
    // Always include these
    addGuideline("Be concise in your responses");
    addGuideline("Show file paths clearly when working with files");
    var guidelines = guidelinesList.map(function (g) { return "- ".concat(g); }).join("\n");
    var prompt = "You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.\n\nAvailable tools:\n".concat(toolsList, "\n\nIn addition to the tools above, you may have access to other custom tools depending on the project.\n\nGuidelines:\n").concat(guidelines, "\n\nPi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):\n- Main documentation: ").concat(readmePath, "\n- Additional docs: ").concat(docsPath, "\n- Examples: ").concat(examplesPath, " (extensions, custom tools, SDK)\n- When asked about: extensions (docs/extensions.md, examples/extensions/), themes (docs/themes.md), skills (docs/skills.md), prompt templates (docs/prompt-templates.md), TUI components (docs/tui.md), keybindings (docs/keybindings.md), SDK integrations (docs/sdk.md), custom providers (docs/custom-provider.md), adding models (docs/models.md), pi packages (docs/packages.md)\n- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing\n- Always read pi .md files completely and follow links to related docs (e.g., tui.md for TUI API details)");
    if (appendSection) {
        prompt += appendSection;
    }
    // Append project context files
    if (contextFiles.length > 0) {
        prompt += "\n\n# Project Context\n\n";
        prompt += "Project-specific instructions and guidelines:\n\n";
        for (var _d = 0, contextFiles_2 = contextFiles; _d < contextFiles_2.length; _d++) {
            var _e = contextFiles_2[_d], filePath = _e.path, content = _e.content;
            prompt += "## ".concat(filePath, "\n\n").concat(content, "\n\n");
        }
    }
    // Append skills section (only if read tool is available)
    if (hasRead && skills.length > 0) {
        prompt += (0, skills_js_1.formatSkillsForPrompt)(skills);
    }
    // Add date and working directory last
    prompt += "\nCurrent date: ".concat(date);
    prompt += "\nCurrent working directory: ".concat(promptCwd);
    return prompt;
}
