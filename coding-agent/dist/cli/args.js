"use strict";
/**
 * CLI argument parsing and help display
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidThinkingLevel = isValidThinkingLevel;
exports.parseArgs = parseArgs;
exports.printHelp = printHelp;
var chalk_1 = require("chalk");
var config_js_1 = require("../config.js");
var index_js_1 = require("../core/tools/index.js");
var VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];
function isValidThinkingLevel(level) {
    return VALID_THINKING_LEVELS.includes(level);
}
function parseArgs(args, extensionFlags) {
    var _a, _b, _c, _d;
    var result = {
        messages: [],
        fileArgs: [],
        unknownFlags: new Map(),
    };
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg === "--help" || arg === "-h") {
            result.help = true;
        }
        else if (arg === "--version" || arg === "-v") {
            result.version = true;
        }
        else if (arg === "--mode" && i + 1 < args.length) {
            var mode = args[++i];
            if (mode === "text" || mode === "json" || mode === "rpc") {
                result.mode = mode;
            }
        }
        else if (arg === "--continue" || arg === "-c") {
            result.continue = true;
        }
        else if (arg === "--resume" || arg === "-r") {
            result.resume = true;
        }
        else if (arg === "--provider" && i + 1 < args.length) {
            result.provider = args[++i];
        }
        else if (arg === "--model" && i + 1 < args.length) {
            result.model = args[++i];
        }
        else if (arg === "--api-key" && i + 1 < args.length) {
            result.apiKey = args[++i];
        }
        else if (arg === "--system-prompt" && i + 1 < args.length) {
            result.systemPrompt = args[++i];
        }
        else if (arg === "--append-system-prompt" && i + 1 < args.length) {
            result.appendSystemPrompt = args[++i];
        }
        else if (arg === "--no-session") {
            result.noSession = true;
        }
        else if (arg === "--session" && i + 1 < args.length) {
            result.session = args[++i];
        }
        else if (arg === "--session-dir" && i + 1 < args.length) {
            result.sessionDir = args[++i];
        }
        else if (arg === "--models" && i + 1 < args.length) {
            result.models = args[++i].split(",").map(function (s) { return s.trim(); });
        }
        else if (arg === "--no-tools") {
            result.noTools = true;
        }
        else if (arg === "--tools" && i + 1 < args.length) {
            var toolNames = args[++i].split(",").map(function (s) { return s.trim(); });
            var validTools = [];
            for (var _i = 0, toolNames_1 = toolNames; _i < toolNames_1.length; _i++) {
                var name_1 = toolNames_1[_i];
                if (name_1 in index_js_1.allTools) {
                    validTools.push(name_1);
                }
                else {
                    console.error(chalk_1.default.yellow("Warning: Unknown tool \"".concat(name_1, "\". Valid tools: ").concat(Object.keys(index_js_1.allTools).join(", "))));
                }
            }
            result.tools = validTools;
        }
        else if (arg === "--thinking" && i + 1 < args.length) {
            var level = args[++i];
            if (isValidThinkingLevel(level)) {
                result.thinking = level;
            }
            else {
                console.error(chalk_1.default.yellow("Warning: Invalid thinking level \"".concat(level, "\". Valid values: ").concat(VALID_THINKING_LEVELS.join(", "))));
            }
        }
        else if (arg === "--print" || arg === "-p") {
            result.print = true;
        }
        else if (arg === "--export" && i + 1 < args.length) {
            result.export = args[++i];
        }
        else if ((arg === "--extension" || arg === "-e") && i + 1 < args.length) {
            result.extensions = (_a = result.extensions) !== null && _a !== void 0 ? _a : [];
            result.extensions.push(args[++i]);
        }
        else if (arg === "--no-extensions" || arg === "-ne") {
            result.noExtensions = true;
        }
        else if (arg === "--skill" && i + 1 < args.length) {
            result.skills = (_b = result.skills) !== null && _b !== void 0 ? _b : [];
            result.skills.push(args[++i]);
        }
        else if (arg === "--prompt-template" && i + 1 < args.length) {
            result.promptTemplates = (_c = result.promptTemplates) !== null && _c !== void 0 ? _c : [];
            result.promptTemplates.push(args[++i]);
        }
        else if (arg === "--theme" && i + 1 < args.length) {
            result.themes = (_d = result.themes) !== null && _d !== void 0 ? _d : [];
            result.themes.push(args[++i]);
        }
        else if (arg === "--no-skills" || arg === "-ns") {
            result.noSkills = true;
        }
        else if (arg === "--no-prompt-templates" || arg === "-np") {
            result.noPromptTemplates = true;
        }
        else if (arg === "--no-themes") {
            result.noThemes = true;
        }
        else if (arg === "--list-models") {
            // Check if next arg is a search pattern (not a flag or file arg)
            if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
                result.listModels = args[++i];
            }
            else {
                result.listModels = true;
            }
        }
        else if (arg === "--verbose") {
            result.verbose = true;
        }
        else if (arg === "--offline") {
            result.offline = true;
        }
        else if (arg.startsWith("@")) {
            result.fileArgs.push(arg.slice(1)); // Remove @ prefix
        }
        else if (arg.startsWith("--") && extensionFlags) {
            // Check if it's an extension-registered flag
            var flagName = arg.slice(2);
            var extFlag = extensionFlags.get(flagName);
            if (extFlag) {
                if (extFlag.type === "boolean") {
                    result.unknownFlags.set(flagName, true);
                }
                else if (extFlag.type === "string" && i + 1 < args.length) {
                    result.unknownFlags.set(flagName, args[++i]);
                }
            }
            // Unknown flags without extensionFlags are silently ignored (first pass)
        }
        else if (!arg.startsWith("-")) {
            result.messages.push(arg);
        }
    }
    return result;
}
function printHelp() {
    console.log("".concat(chalk_1.default.bold(config_js_1.APP_NAME), " - AI coding assistant with read, bash, edit, write tools\n\n").concat(chalk_1.default.bold("Usage:"), "\n  ").concat(config_js_1.APP_NAME, " [options] [@files...] [messages...]\n\n").concat(chalk_1.default.bold("Commands:"), "\n  ").concat(config_js_1.APP_NAME, " install <source> [-l]     Install extension source and add to settings\n  ").concat(config_js_1.APP_NAME, " remove <source> [-l]      Remove extension source from settings\n  ").concat(config_js_1.APP_NAME, " uninstall <source> [-l]   Alias for remove\n  ").concat(config_js_1.APP_NAME, " update [source]           Update installed extensions (skips pinned sources)\n  ").concat(config_js_1.APP_NAME, " list                      List installed extensions from settings\n  ").concat(config_js_1.APP_NAME, " config                    Open TUI to enable/disable package resources\n  ").concat(config_js_1.APP_NAME, " <command> --help          Show help for install/remove/uninstall/update/list\n\n").concat(chalk_1.default.bold("Options:"), "\n  --provider <name>              Provider name (default: google)\n  --model <pattern>              Model pattern or ID (supports \"provider/id\" and optional \":<thinking>\")\n  --api-key <key>                API key (defaults to env vars)\n  --system-prompt <text>         System prompt (default: coding assistant prompt)\n  --append-system-prompt <text>  Append text or file contents to the system prompt\n  --mode <mode>                  Output mode: text (default), json, or rpc\n  --print, -p                    Non-interactive mode: process prompt and exit\n  --continue, -c                 Continue previous session\n  --resume, -r                   Select a session to resume\n  --session <path>               Use specific session file\n  --session-dir <dir>            Directory for session storage and lookup\n  --no-session                   Don't save session (ephemeral)\n  --models <patterns>            Comma-separated model patterns for Ctrl+P cycling\n                                 Supports globs (anthropic/*, *sonnet*) and fuzzy matching\n  --no-tools                     Disable all built-in tools\n  --tools <tools>                Comma-separated list of tools to enable (default: read,bash,edit,write)\n                                 Available: read, bash, edit, write, grep, find, ls\n  --thinking <level>             Set thinking level: off, minimal, low, medium, high, xhigh\n  --extension, -e <path>         Load an extension file (can be used multiple times)\n  --no-extensions, -ne           Disable extension discovery (explicit -e paths still work)\n  --skill <path>                 Load a skill file or directory (can be used multiple times)\n  --no-skills, -ns               Disable skills discovery and loading\n  --prompt-template <path>       Load a prompt template file or directory (can be used multiple times)\n  --no-prompt-templates, -np     Disable prompt template discovery and loading\n  --theme <path>                 Load a theme file or directory (can be used multiple times)\n  --no-themes                    Disable theme discovery and loading\n  --export <file>                Export session file to HTML and exit\n  --list-models [search]         List available models (with optional fuzzy search)\n  --verbose                      Force verbose startup (overrides quietStartup setting)\n  --offline                      Disable startup network operations (same as PI_OFFLINE=1)\n  --help, -h                     Show this help\n  --version, -v                  Show version number\n\nExtensions can register additional flags (e.g., --plan from plan-mode extension).\n\n").concat(chalk_1.default.bold("Examples:"), "\n  # Interactive mode\n  ").concat(config_js_1.APP_NAME, "\n\n  # Interactive mode with initial prompt\n  ").concat(config_js_1.APP_NAME, " \"List all .ts files in src/\"\n\n  # Include files in initial message\n  ").concat(config_js_1.APP_NAME, " @prompt.md @image.png \"What color is the sky?\"\n\n  # Non-interactive mode (process and exit)\n  ").concat(config_js_1.APP_NAME, " -p \"List all .ts files in src/\"\n\n  # Multiple messages (interactive)\n  ").concat(config_js_1.APP_NAME, " \"Read package.json\" \"What dependencies do we have?\"\n\n  # Continue previous session\n  ").concat(config_js_1.APP_NAME, " --continue \"What did we discuss?\"\n\n  # Use different model\n  ").concat(config_js_1.APP_NAME, " --provider openai --model gpt-4o-mini \"Help me refactor this code\"\n\n  # Use model with provider prefix (no --provider needed)\n  ").concat(config_js_1.APP_NAME, " --model openai/gpt-4o \"Help me refactor this code\"\n\n  # Use model with thinking level shorthand\n  ").concat(config_js_1.APP_NAME, " --model sonnet:high \"Solve this complex problem\"\n\n  # Limit model cycling to specific models\n  ").concat(config_js_1.APP_NAME, " --models claude-sonnet,claude-haiku,gpt-4o\n\n  # Limit to a specific provider with glob pattern\n  ").concat(config_js_1.APP_NAME, " --models \"github-copilot/*\"\n\n  # Cycle models with fixed thinking levels\n  ").concat(config_js_1.APP_NAME, " --models sonnet:high,haiku:low\n\n  # Start with a specific thinking level\n  ").concat(config_js_1.APP_NAME, " --thinking high \"Solve this complex problem\"\n\n  # Read-only mode (no file modifications possible)\n  ").concat(config_js_1.APP_NAME, " --tools read,grep,find,ls -p \"Review the code in src/\"\n\n  # Export a session file to HTML\n  ").concat(config_js_1.APP_NAME, " --export ~/").concat(config_js_1.CONFIG_DIR_NAME, "/agent/sessions/--path--/session.jsonl\n  ").concat(config_js_1.APP_NAME, " --export session.jsonl output.html\n\n").concat(chalk_1.default.bold("Environment Variables:"), "\n  ANTHROPIC_API_KEY                - Anthropic Claude API key\n  ANTHROPIC_OAUTH_TOKEN            - Anthropic OAuth token (alternative to API key)\n  OPENAI_API_KEY                   - OpenAI GPT API key\n  AZURE_OPENAI_API_KEY             - Azure OpenAI API key\n  AZURE_OPENAI_BASE_URL            - Azure OpenAI base URL (https://{resource}.openai.azure.com/openai/v1)\n  AZURE_OPENAI_RESOURCE_NAME       - Azure OpenAI resource name (alternative to base URL)\n  AZURE_OPENAI_API_VERSION         - Azure OpenAI API version (default: v1)\n  AZURE_OPENAI_DEPLOYMENT_NAME_MAP - Azure OpenAI model=deployment map (comma-separated)\n  GEMINI_API_KEY                   - Google Gemini API key\n  GROQ_API_KEY                     - Groq API key\n  CEREBRAS_API_KEY                 - Cerebras API key\n  XAI_API_KEY                      - xAI Grok API key\n  OPENROUTER_API_KEY               - OpenRouter API key\n  AI_GATEWAY_API_KEY               - Vercel AI Gateway API key\n  ZAI_API_KEY                      - ZAI API key\n  MISTRAL_API_KEY                  - Mistral API key\n  MINIMAX_API_KEY                  - MiniMax API key\n  OPENCODE_API_KEY                 - OpenCode Zen/OpenCode Go API key\n  KIMI_API_KEY                     - Kimi For Coding API key\n  AWS_PROFILE                      - AWS profile for Amazon Bedrock\n  AWS_ACCESS_KEY_ID                - AWS access key for Amazon Bedrock\n  AWS_SECRET_ACCESS_KEY            - AWS secret key for Amazon Bedrock\n  AWS_BEARER_TOKEN_BEDROCK         - Bedrock API key (bearer token)\n  AWS_REGION                       - AWS region for Amazon Bedrock (e.g., us-east-1)\n  ").concat(config_js_1.ENV_AGENT_DIR.padEnd(32), " - Session storage directory (default: ~/").concat(config_js_1.CONFIG_DIR_NAME, "/agent)\n  PI_PACKAGE_DIR                   - Override package directory (for Nix/Guix store paths)\n  PI_OFFLINE                       - Disable startup network operations when set to 1/true/yes\n  PI_SHARE_VIEWER_URL              - Base URL for /share command (default: https://pi.dev/session/)\n  PI_AI_ANTIGRAVITY_VERSION        - Override Antigravity User-Agent version (e.g., 1.23.0)\n\n").concat(chalk_1.default.bold("Available Tools (default: read, bash, edit, write):"), "\n  read   - Read file contents\n  bash   - Execute bash commands\n  edit   - Edit files with find/replace\n  write  - Write files (creates/overwrites)\n  grep   - Search file contents (read-only, off by default)\n  find   - Find files by glob pattern (read-only, off by default)\n  ls     - List directory contents (read-only, off by default)\n"));
}
