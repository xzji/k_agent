/**
 * BackgroundLLMChannel — Independent LLM call channel for background loop
 *
 * Key design:
 * - Uses direct fetch to OpenAI-compatible API endpoints
 * - Gets model config and API key from ModelRegistry
 * - Completely independent from AgentSession's LLM calls
 * - Supports abort for loop cancellation
 */
import type { Api, Model } from "@mariozechner/pi-ai";
import type { ModelRegistry } from "../../model-registry.js";
import type { LLMMessage, LLMResponse } from "../types.js";
export declare class BackgroundLLMChannel {
    private modelRegistry;
    private currentModel;
    private abortController;
    constructor(modelRegistry: ModelRegistry);
    /**
     * Sync the model to use (called on model change)
     */
    syncModel(model: Model<Api>): void;
    /**
     * Get current model
     */
    getModel(): Model<Api> | null;
    /**
     * Send a chat request to the LLM
     * Uses direct fetch to OpenAI-compatible endpoints
     */
    chat(params: {
        systemPrompt: string;
        messages: LLMMessage[];
        temperature?: number;
        maxTokens?: number;
    }): Promise<LLMResponse>;
    /**
     * Chat with structured JSON output
     * Instructs the LLM to return valid JSON
     */
    chatJSON<T>(params: {
        systemPrompt: string;
        messages: LLMMessage[];
        temperature?: number;
    }): Promise<T>;
    /**
     * Abort the current request
     */
    abort(): void;
    /**
     * Get default base URL for known providers
     */
    private getDefaultBaseUrl;
}
//# sourceMappingURL=llm-channel.d.ts.map