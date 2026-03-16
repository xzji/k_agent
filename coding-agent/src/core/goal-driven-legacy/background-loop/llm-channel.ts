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
import { parseJSONResponse } from "../utils.js";

export class BackgroundLLMChannel {
	private modelRegistry: ModelRegistry;
	private currentModel: Model<Api> | null = null;
	private abortController: AbortController | null = null;

	constructor(modelRegistry: ModelRegistry) {
		this.modelRegistry = modelRegistry;
	}

	/**
	 * Sync the model to use (called on model change)
	 */
	syncModel(model: Model<Api>): void {
		this.currentModel = model;
	}

	/**
	 * Get current model
	 */
	getModel(): Model<Api> | null {
		return this.currentModel;
	}

	/**
	 * Send a chat request to the LLM
	 * Uses direct fetch to OpenAI-compatible endpoints
	 */
	async chat(params: {
		systemPrompt: string;
		messages: LLMMessage[];
		temperature?: number;
		maxTokens?: number;
	}): Promise<LLMResponse> {
		if (!this.currentModel) {
			throw new Error("BackgroundLLMChannel: no model configured");
		}

		const model = this.currentModel;
		const apiKey = await this.modelRegistry.getApiKey(model);
		if (!apiKey) {
			throw new Error(`BackgroundLLMChannel: no API key for provider ${model.provider}`);
		}

		this.abortController = new AbortController();

		// Build OpenAI-compatible chat completions request
		const messages = [
			{ role: "system" as const, content: params.systemPrompt },
			...params.messages.map((m) => ({ role: m.role, content: m.content })),
		];

		const baseUrl = model.baseUrl || this.getDefaultBaseUrl(model.provider);
		const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

		const body: Record<string, unknown> = {
			model: model.id,
			messages,
			temperature: params.temperature ?? 0.7,
			max_tokens: params.maxTokens ?? 4096,
			stream: false,
		};

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			...(model.headers ?? {}),
		};

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			signal: this.abortController.signal,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "unknown error");
			throw new Error(`LLM request failed (${response.status}): ${errorText}`);
		}

		const data = (await response.json()) as {
			choices: Array<{
				message: { content: string };
				finish_reason?: string;
			}>;
		};

		if (!data.choices || data.choices.length === 0) {
			throw new Error("LLM returned no choices");
		}

		const content = data.choices[0].message.content;

		// Validate content is not empty
		if (!content || content.trim().length === 0) {
			throw new Error("LLM returned empty content");
		}

		return {
			content,
			finishReason: data.choices[0].finish_reason,
		};
	}

	/**
	 * Chat with structured JSON output
	 * Instructs the LLM to return valid JSON
	 */
	async chatJSON<T>(params: {
		systemPrompt: string;
		messages: LLMMessage[];
		temperature?: number;
		maxTokens?: number;
	}): Promise<T> {
		const response = await this.chat({
			...params,
			systemPrompt:
				params.systemPrompt +
				"\n\nYou MUST respond with valid JSON only. Do not include any text, explanation, or markdown formatting outside the JSON object. Return ONLY the JSON.",
			maxTokens: params.maxTokens ?? 8192, // Increased from 4096 to prevent truncation
		});

		return parseJSONResponse<T>(response.content);
	}

	/**
	 * Abort the current request
	 */
	abort(): void {
		this.abortController?.abort();
		this.abortController = null;
	}

	/**
	 * Get default base URL for known providers
	 */
	private getDefaultBaseUrl(provider: string): string {
		const defaults: Record<string, string> = {
			anthropic: "https://api.anthropic.com/v1",
			openai: "https://api.openai.com/v1",
			google: "https://generativelanguage.googleapis.com/v1beta/openai",
			groq: "https://api.groq.com/openai/v1",
			deepseek: "https://api.deepseek.com/v1",
			mistral: "https://api.mistral.ai/v1",
			xai: "https://api.x.ai/v1",
		};
		return defaults[provider] ?? "https://api.openai.com/v1";
	}
}
