#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * CLI entry point for the refactored coding agent.
 * Uses main.ts with AgentSession and new mode modules.
 *
 * Test with: npx tsx src/cli-new.ts [args...]
 */
process.title = "pi";
var pi_ai_1 = require("@mariozechner/pi-ai");
var bedrock_provider_1 = require("@mariozechner/pi-ai/bedrock-provider");
var undici_1 = require("undici");
var main_js_1 = require("./main.js");
(0, undici_1.setGlobalDispatcher)(new undici_1.EnvHttpProxyAgent());
(0, pi_ai_1.setBedrockProviderModule)(bedrock_provider_1.bedrockProviderModule);
(0, main_js_1.main)(process.argv.slice(2));
