import { DataSource, InfoItem } from "../../types.js";
import { generateId } from "../../utils.js";

/**
 * Search result types from websearch extension
 */
interface SearchResult {
	title: string;
	url: string;
	snippet: string;
	score?: number;
}

interface SearXNGResponse {
	query: string;
	number_of_results: number;
	results: Array<{
		url: string;
		title: string;
		content: string;
		engine?: string;
	}>;
	answers: any[];
	corrections: any[];
	infoboxes: any[];
	suggestions: string[];
}

interface TavilyResponse {
	query: string;
	answer?: string;
	results: Array<{
		title: string;
		url: string;
		content: string;
		score: number;
	}>;
}

// Default SearXNG instance
const DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";

// Get search engine preference from env
const SEARCH_ENGINE = process.env.SEARCH_ENGINE || "auto"; // auto, searxng, tavily

/**
 * Web Search Adapter
 *
 * Performs real web searches using SearXNG (default, no API key) or Tavily (requires API key)
 */
export class WebSearchAdapter {
	private piApi?: any; // ExtensionAPI for exec calls

	constructor(piApi?: any) {
		this.piApi = piApi;
	}

	/**
	 * Search the web using the provided query
	 */
	async fetch(source: DataSource, dimensionId: string, goalId: string): Promise<InfoItem[]> {
		const rawQuery = source.config.query as string | undefined;
		if (!rawQuery) return [];

		// Optimize query for better search results
		const query = this.optimizeQuery(rawQuery);

		try {
			// Use the same search logic as websearch extension
			const results = await this.searchWeb(query, 5);

			if (results.length === 0) {
				console.warn(`[WebSearchAdapter] No results found for query: ${rawQuery} (optimized: ${query})`);
				return this.getMockData(rawQuery, source.id, dimensionId, goalId);
			}

			// Convert SearchResult to InfoItem
			return results.map((result) => ({
				id: generateId(),
				sourceId: source.id,
				dimensionId,
				goalId,
				content: `${result.title}\n${result.snippet}`,
				url: result.url,
				fetchedAt: Date.now(),
				relevanceScore: result.score ?? null,
				relevanceLevel: null,
				metadata: {
					source: "web_search",
					engine: result.score !== undefined ? "tavily" : "searxng",
					originalQuery: rawQuery,
					optimizedQuery: query
				}
			}));
		} catch (error) {
			console.error(`[WebSearchAdapter] Search failed for query "${rawQuery}":`, error);
			// Return mock data on error
			return this.getMockData(rawQuery, source.id, dimensionId, goalId);
		}
	}

	/**
	 * Optimize query for better search results
	 * Removes problematic patterns and extracts key search terms
	 */
	private optimizeQuery(query: string): string {
		let optimized = query.trim();

		// Remove common filler words FIRST (before processing colons)
		const fillers = ['今年发展趋势', '近期', '最新', '当前', '相关', '关于', '分析', '研究', '发展趋势'];
		for (const filler of fillers) {
			optimized = optimized.replace(new RegExp(filler, 'g'), '');
		}

		// Remove colon-separated structure (e.g., "主题: 子主题" -> "主题 子主题")
		optimized = optimized.replace(/：/g, ' '); // Chinese colon
		optimized = optimized.replace(/:/g, ' ');  // English colon

		// Remove common prefixes
		optimized = optimized.replace(/^(搜索|Search for|查找|Find)\s+/i, '');

		// Remove redundant spaces
		optimized = optimized.replace(/\s+/g, ' ').trim();

		// Extract key terms for long queries (> 30 chars for better results)
		if (optimized.length > 30) {
			// Split by common separators and take most relevant parts
			// Prefer keeping the first part (usually the main topic)
			const parts = optimized.split(/[,，、\s]+/).filter(p => p.length > 1);

			if (parts.length > 0) {
				// Keep first 2-3 most relevant terms
				optimized = parts.slice(0, Math.min(3, parts.length)).join(' ');
			}
		}

		return optimized;
	}

	/**
	 * Search the web using SearXNG or Tavily
	 * (Ported from websearch extension)
	 */
	private async searchWeb(query: string, maxResults: number): Promise<SearchResult[]> {
		const enginesToTry: string[] = [];

		if (SEARCH_ENGINE === "auto") {
			// Priority: SearXNG → Tavily
			const tavilyKey = process.env.TAVILY_API_KEY;

			enginesToTry.push("searxng"); // Default, always try first
			if (tavilyKey && tavilyKey !== "your_api_key") {
				enginesToTry.push("tavily");
			}
		} else {
			enginesToTry.push(SEARCH_ENGINE);
		}

		let lastError: Error | null = null;

		for (const eng of enginesToTry) {
			try {
				let results: SearchResult[] = [];

				if (eng === "searxng") {
					results = await this.searchSearXNG(query, maxResults);
				} else if (eng === "tavily") {
					results = await this.searchTavily(query, maxResults);
				}

				if (results.length > 0) {
					return results;
				}
			} catch (error) {
				lastError = error as Error;
				console.error(`${eng} search failed:`, error);
			}
		}

		// Return empty array instead of throwing - no results is valid
		return [];
	}

	/**
	 * Search using SearXNG (free, no API key required)
	 */
	private async searchSearXNG(query: string, maxResults: number): Promise<SearchResult[]> {
		const apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;
		const url = new URL(apiUrl);
		url.searchParams.append("q", query);
		url.searchParams.append("format", "json");
		url.searchParams.append("language", "auto");
		url.searchParams.append("categories", "general");
		url.searchParams.append("safesearch", "0");

		const response = await fetch(url.toString());

		if (!response.ok) {
			throw new Error(`SearXNG API failed: ${response.statusText}`);
		}

		const data: SearXNGResponse = await response.json();

		if (!data.results || data.results.length === 0) {
			return [];
		}

		return data.results.slice(0, maxResults).map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.content.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"),
		}));
	}

	/**
	 * Search using Tavily (requires API key)
	 */
	private async searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
		const apiKey = process.env.TAVILY_API_KEY;

		if (!apiKey || apiKey === "your_api_key") {
			throw new Error("TAVILY_API_KEY not set. Get it from https://tavily.com/");
		}

		const url = "https://api.tavily.com/search";
		const payload = {
			api_key: apiKey,
			query: query,
			max_results: maxResults,
			search_depth: "basic",
			include_answer: true,
			include_raw_content: false,
		};

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				`Tavily API failed (${response.status}): ${errorData.error || response.statusText}`,
			);
		}

		const data: TavilyResponse = await response.json();

		if (!data.results || data.results.length === 0) {
			return [];
		}

		return data.results.slice(0, maxResults).map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.content,
			score: result.score,
		}));
	}

	/**
	 * Generate mock data for testing/fallback
	 */
	private getMockData(query: string, sourceId: string, dimensionId: string, goalId: string): InfoItem[] {
		return [
			{
				id: generateId(),
				sourceId,
				dimensionId,
				goalId,
				content: `[模拟数据] 网页搜索结果: "${query}" - 这是一个占位符。真实搜索使用SearXNG（默认，无需配置）或Tavily（需要API密钥）。`,
				url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
				fetchedAt: Date.now(),
				relevanceScore: null,
				relevanceLevel: null,
				metadata: { source: "web_search", engine: "mock" }
			}
		];
	}
}
