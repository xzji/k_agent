/**
 * Goal-Driven Agent — Utility Functions
 */

import { randomBytes } from "node:crypto";

/**
 * Generate a unique ID (12 character hex string)
 */
export function generateId(): string {
	return randomBytes(6).toString("hex");
}

/**
 * Extract text content from an LLM response string.
 * Strips markdown code fences if present to get raw JSON.
 */
export function extractJSON(text: string): string {
	// Remove any leading/trailing whitespace
	let cleaned = text.trim();

	// Try to extract from markdown code fence (with or without language specifier)
	// This pattern handles: ```json\n{...}\n``` or ```\n{...}\n```
	// Also handles text before/after the code block
	const fenceMatch = cleaned.match(/```(?:json)?\s*?\n([\s\S]*?)\n```/);
	if (fenceMatch) {
		return fenceMatch[1].trim();
	}

	// Try alternative pattern - allow any text before the opening fence
	const fenceMatchWithPrefix = cleaned.match(/[\s\S]*?```(?:json)?\s*?\n([\s\S]*?)\n```/);
	if (fenceMatchWithPrefix) {
		return fenceMatchWithPrefix[1].trim();
	}

	// Try pattern without strict newline requirements
	const fenceMatchRelaxed = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenceMatchRelaxed) {
		return fenceMatchRelaxed[1].trim();
	}

	// Handle comma-separated objects (LLM sometimes returns objects without array wrapper)
	// Pattern: { ... },\n{ ... },\n{ ... }
	// We check if the text starts with { and contains commas between balanced objects
	if (cleaned.startsWith('{') && !cleaned.startsWith('[')) {
		// Check if there's a comma at the top level (outside nested braces)
		let braceCount = 0;
		let hasComma = false;
		for (const char of cleaned) {
			if (char === '{') braceCount++;
			if (char === '}') braceCount--;
			if (braceCount === 0 && char === ',') {
				hasComma = true;
				break;
			}
		}

		if (hasComma) {
			// Try to wrap in brackets and parse to see if it's valid
			try {
				const wrapped = `[${cleaned}]`;
				const test = JSON.parse(wrapped); // Test if it's valid
				return wrapped;
			} catch (e) {
				// Comma-separated wrap failed, continue to other patterns
			}
		}
	}

	// Fallback: find everything between first { and matching last }
	// This handles cases where there's text after the JSON
	const firstBrace = cleaned.indexOf('{');
	if (firstBrace !== -1) {
		let braceCount = 0;
		let lastBrace = firstBrace;

		for (let i = firstBrace; i < cleaned.length; i++) {
			if (cleaned[i] === '{') braceCount++;
			if (cleaned[i] === '}') braceCount--;

			if (braceCount === 0) {
				lastBrace = i;
				break; // Found the matching closing brace
			}
		}

		if (lastBrace > firstBrace) {
			const candidate = cleaned.substring(firstBrace, lastBrace + 1);
			// Verify it's valid JSON
			try {
				const parsed = JSON.parse(candidate);
				// Only return if it's an object, not an array (we don't want to wrap objects in arrays)
				if (Array.isArray(parsed)) {
					return candidate.trim();
				}
				return candidate.trim();
			} catch (err) {
				// Brace matching produced invalid JSON, continue to other patterns
			}
		}
	}

	// Fallback: find everything between first [ and matching last ]
	const firstBracket = cleaned.indexOf('[');
	if (firstBracket !== -1) {
		let bracketCount = 0;
		let lastBracket = firstBracket;

		for (let i = firstBracket; i < cleaned.length; i++) {
			if (cleaned[i] === '[') bracketCount++;
			if (cleaned[i] === ']') bracketCount--;

			if (bracketCount === 0) {
				lastBracket = i;
				break; // Found the matching closing bracket
			}
		}

		if (lastBracket > firstBracket) {
			const candidate = cleaned.substring(firstBracket, lastBracket + 1);
			// Verify it's valid JSON
			try {
				JSON.parse(candidate);
				return candidate.trim();
			} catch {
				// Bracket matching produced invalid JSON
			}
		}
	}
	// If all else fails, return the cleaned text
	return cleaned;
}

/**
 * Parse JSON from LLM response, with fallback
 */
export function parseJSONResponse<T>(text: string): T {
	// Check for empty/undefined input
	if (!text || text.trim().length === 0) {
		throw new Error("Empty or undefined LLM response");
	}

	const cleaned = extractJSON(text);

	// Check if extraction produced empty result
	if (!cleaned || cleaned.trim().length === 0) {
		throw new Error("Could not extract valid JSON from LLM response");
	}

	try {
		const parsed = JSON.parse(cleaned) as T;

		// Validate that we got a proper object/array, not null
		if (parsed === null || parsed === undefined) {
			throw new Error("JSON parsed as null/undefined");
		}

		return parsed;
	} catch (error) {
		// Provide better error message with sample of the problematic text
		const errorMessage = error instanceof Error ? error.message : String(error);
		const preview = cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;

		throw new Error(`${errorMessage}\nRaw preview: ${preview}`);
	}
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

/**
 * Format a timestamp to human-readable string
 */
export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
