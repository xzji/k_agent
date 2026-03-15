/**
 * SourceDiscoverer — Discovers and binds data sources to dimensions
 *
 * Two-phase discovery process:
 * Phase 1: LLM recommends known professional sources + discovery queries
 * Phase 2: Use discovery queries with web_search to find additional sources
 * Phase 3: Extract sources from search results via LLM
 * Phase 4: Accessibility checks for medium/low confidence sources
 * Phase 5: Bind verified sources to dimensions
 */

import type { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import type { DataSource, DataSourceBinding, DimensionNode, GoalNode } from "../types.js";
import { generateId } from "../utils.js";

// ============================================================
// Type Definitions for Source Discovery
// ============================================================

interface DiscoveredSource {
	name: string;
	type: "url_monitor" | "rss" | "github" | "api";
	why: string;
	config: {
		url?: string;
		feed_url?: string;
		repo?: string;
		watch?: "releases" | "issues" | "commits" | "discussions";
		endpoint?: string;
		params?: Record<string, unknown>;
	};
	suggested_query: string;
	update_frequency: "hours" | "daily" | "weekly" | "monthly";
	confidence: "high" | "medium" | "low";
}

interface DiscoveryQuery {
	query: string;
	intent: string;
}

interface DimensionSourceDiscovery {
	dimension_title: string;
	domain_analysis: string;
	recommended_sources: DiscoveredSource[];
	discovery_queries: DiscoveryQuery[];
}

interface LLMDiscoveryOutput {
	dimension_sources: DimensionSourceDiscovery[];
}

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

type ProgressCallback = (message: string, type?: "info" | "success" | "warning") => void;

export class SourceDiscoverer {
	private llm: BackgroundLLMChannel;
	private onProgress?: ProgressCallback;

	constructor(llm: BackgroundLLMChannel, piApi?: any, onProgress?: ProgressCallback) {
		this.llm = llm;
		this.onProgress = onProgress;
	}

	/**
	 * Phase 1-5: Complete discovery pipeline
	 */
	async discoverAndBind(goal: GoalNode, dimensions: DimensionNode[]): Promise<DataSource[]> {
		this.onProgress?.("🔎 [1/5] 识别专业信息源...", "info");

		// Phase 1: Get initial recommendations from LLM
		const discoveryOutput = await this.phase1_LLMRecommend(goal, dimensions);

		// Phase 2: Use discovery_queries with web_search
		const searchResultsByDimension = await this.phase2_WebSearchDiscovery(discoveryOutput);

		// Phase 3: Extract sources from search results
		const enhancedDiscovery = await this.phase3_ExtractFromSearchResults(
			discoveryOutput,
			searchResultsByDimension,
			goal
		);

		// Phase 4: Accessibility checks
		const verifiedSources = await this.phase4_AccessibilityCheck(enhancedDiscovery);

		// Phase 5: Bind to dimensions (includes fallback creation)
		await this.phase5_BindToDimensions(goal, dimensions, verifiedSources);

		this.onProgress?.(`✅ [5/5] 信息源发现完成，共 ${verifiedSources.length} 个`, "success");

		return verifiedSources;
	}

	/**
	 * Phase 1: LLM recommends known sources + discovery queries
	 */
	private async phase1_LLMRecommend(
		goal: GoalNode,
		dimensions: DimensionNode[]
	): Promise<LLMDiscoveryOutput> {
		const prompt = this.buildDiscoveryPrompt(goal, dimensions);
		const systemPrompt = `You are a professional information source discovery engine. You identify authoritative, domain-specific sources for research dimensions. Always respond with valid JSON only.`;

		try {
			const result = await this.llm.chatJSON<LLMDiscoveryOutput>({
				systemPrompt,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.4,
				maxTokens: 20000, // Increased to handle large responses
			});

			// Validate result structure
			if (!result || !result.dimension_sources || !Array.isArray(result.dimension_sources)) {
				throw new Error("Invalid LLM response: missing or invalid dimension_sources array");
			}

			const knownSourceCount = result.dimension_sources.reduce(
				(sum, dim) => sum + (dim.recommended_sources?.length || 0),
				0
			);
			const queryCount = result.dimension_sources.reduce(
				(sum, dim) => sum + (dim.discovery_queries?.length || 0),
				0
			);

			this.onProgress?.(`   ✓ 已知信息源: ${knownSourceCount} 个，发现查询: ${queryCount} 条`, "info");

			return result;
		} catch (error) {
			this.onProgress?.(`   ⚠️  LLM 推荐失败: ${error}`, "warning");
			// Return empty discovery with discovery_queries as fallback
			return this.createFallbackDiscovery(dimensions);
		}
	}

	/**
	 * Phase 2: Execute discovery_queries via web_search
	 */
	private async phase2_WebSearchDiscovery(
		discoveryOutput: LLMDiscoveryOutput
	): Promise<Map<string, SearchResult[]>> {
		this.onProgress?.("🔎 [2/5] 搜索专业信息源...", "info");

		const resultsByDimension = new Map<string, SearchResult[]>();

		for (const dimDiscovery of discoveryOutput.dimension_sources) {
			const searchResults: SearchResult[] = [];

			for (const queryObj of dimDiscovery.discovery_queries) {
				try {
					this.onProgress?.(`   🔍 搜索: "${queryObj.query.substring(0, 50)}..."`, "info");
					const results = await this.executeWebSearch(queryObj.query);
					searchResults.push(...results);
				} catch (error) {
					this.onProgress?.(`   ⚠️  搜索失败: ${queryObj.query.substring(0, 30)}...`, "warning");
				}
			}

			resultsByDimension.set(dimDiscovery.dimension_title, searchResults);
			if (searchResults.length > 0) {
				this.onProgress?.(`   ✓ 找到 ${searchResults.length} 条结果`, "success");
			}
		}

		return resultsByDimension;
	}

	/**
	 * Phase 3: Extract additional sources from search results
	 */
	private async phase3_ExtractFromSearchResults(
		initialDiscovery: LLMDiscoveryOutput,
		searchResultsByDimension: Map<string, SearchResult[]>,
		goal: GoalNode
	): Promise<LLMDiscoveryOutput> {
		this.onProgress?.("🔎 [3/5] 提取信息源...", "info");

		// If no search results, return initial discovery
		if (searchResultsByDimension.size === 0) {
			this.onProgress?.("   ⚠️  无搜索结果", "warning");
			return initialDiscovery;
		}

		const enhancedDiscovery: LLMDiscoveryOutput = {
			dimension_sources: initialDiscovery.dimension_sources.map(dim => {
				const searchResults = searchResultsByDimension.get(dim.dimension_title) || [];
				if (searchResults.length === 0) return dim;

				// Add sources extracted from search results
				const extractedSources = this.extractSourcesFromSearchResults(searchResults, dim);
				if (extractedSources.length > 0) {
					this.onProgress?.(`   ✓ 从搜索结果提取 ${extractedSources.length} 个信息源`, "success");
				}
				return {
					...dim,
					recommended_sources: [...dim.recommended_sources, ...extractedSources]
				};
			})
		};

		return enhancedDiscovery;
	}

	/**
	 * Phase 4: Check accessibility of sources (especially medium/low confidence)
	 */
	private async phase4_AccessibilityCheck(
		discoveryOutput: LLMDiscoveryOutput
	): Promise<DataSource[]> {
		this.onProgress?.("🔎 [4/5] 验证信息源可达性...", "info");

		const allSources: DataSource[] = [];
		let highCount = 0;
		let verifiedCount = 0;
		let failedCount = 0;

		for (const dimDiscovery of discoveryOutput.dimension_sources) {
			for (const source of dimDiscovery.recommended_sources) {
				// Skip accessibility check for high confidence sources
				if (source.confidence === "high") {
					allSources.push(this.createDataSourceObject(source, dimDiscovery));
					highCount++;
					continue;
				}

				// For medium/low, do accessibility check
				this.onProgress?.(`   🔍 检查: ${source.name}`, "info");
				const isAccessible = await this.checkAccessibility(source);
				if (isAccessible) {
					allSources.push(this.createDataSourceObject(source, dimDiscovery));
					verifiedCount++;
					this.onProgress?.(`   ✓ 可访问`, "success");
				} else {
					failedCount++;
					this.onProgress?.(`   ✗ 不可访问`, "warning");
				}
			}
		}

		this.onProgress?.(`   ✓ 高置信度: ${highCount}，验证通过: ${verifiedCount}，失败: ${failedCount}`, "success");

		return allSources;
	}

	/**
	 * Phase 5: Bind sources to dimensions
	 */
	private async phase5_BindToDimensions(
		goal: GoalNode,
		dimensions: DimensionNode[],
		sources: DataSource[]
	): Promise<void> {
		// For each dimension, create a dedicated web_search source
		// This avoids the problem of binding all sources to all dimensions
		for (const dim of dimensions) {
			// Try to find matching sources by domain
			const matchingSources = sources.filter(source => {
				const domainAnalysis = source.domainAnalysis || "";
				return dim.title.toLowerCase().includes(domainAnalysis.toLowerCase()) ||
					domainAnalysis.toLowerCase().includes(dim.title.toLowerCase());
			});

			// If we found matching sources, bind them
			if (matchingSources.length > 0) {
				for (const source of matchingSources) {
					const binding: DataSourceBinding = {
						sourceId: source.id,
						query: `${goal.title}: ${dim.title}`,
						suggestedQuery: `Search for ${dim.core_questions[0] || dim.title}`,
						lastFetchedAt: null,
						fetchInterval: this.convertRefreshIntervalToMs(dim.refresh_interval),
						accessible: true,
						confidence: source.confidence,
					};
					dim.dataSources.push(binding);
				}
			} else {
				// No matching sources, create a dedicated web_search source for this dimension
				const dedicatedSource = this.createFallbackSourceForDimension(dim, goal);
				const binding: DataSourceBinding = {
					sourceId: dedicatedSource.id,
					query: `${goal.title}: ${dim.title}`,
					suggestedQuery: `Search for ${dim.core_questions[0] || dim.title}`,
					lastFetchedAt: null,
					fetchInterval: this.convertRefreshIntervalToMs(dim.refresh_interval),
					accessible: true,
					confidence: "high",
				};
				dim.dataSources.push(binding);
				sources.push(dedicatedSource); // Add to sources list so it gets persisted
			}
		}
	}

	/**
	 * Create fallback web_search source for dimensions with no sources
	 */
	private async createFallbackSource(dimensions: DimensionNode[]): Promise<DataSource> {
		return {
			id: generateId(),
			type: "web_search",
			name: "Web Search (fallback)",
			config: { engine: "default" },
			reachable: true,
			lastCheckedAt: null,
			confidence: "high",
			updateFrequency: "daily",
			domainAnalysis: "General web search"
		};
	}

	/**
	 * Create a fallback source for a specific dimension
	 */
	private createFallbackSourceForDimension(dim: DimensionNode, goal: GoalNode): DataSource {
		return {
			id: generateId(),
			type: "web_search",
			name: `Web Search (${dim.title})`,
			config: { engine: "default" },
			reachable: true,
			lastCheckedAt: null,
			confidence: "high",
			updateFrequency: dim.refresh_interval,
			domainAnalysis: dim.title
		};
	}

	/**
	 * Build the main discovery prompt
	 */
	private buildDiscoveryPrompt(goal: GoalNode, dims: DimensionNode[]): string {
		const dimList = dims
			.map((d) => {
				const questions = d.core_questions.map(q => `    - ${q}`).join("\n");
				return `**${d.title}**
   描述: ${d.description}
   核心问题:
${questions}
   更新频率: ${d.refresh_interval}
   探索深度: ${d.estimated_depth}/5`;
			})
			.join("\n\n");

		return `你是一个目标驱动型 AI 助手的「信息源发现引擎」。

你的职责：在目标的探索维度确定之后，为每个维度发现最合适的信息源。你需要回答一个核心问题——"要了解这个维度的信息，应该去哪里找？"

═══════════════════════════════════════════
背景认知
═══════════════════════════════════════════

不同领域有不同的权威和及时信息源。通用搜索引擎（Google/Bing）虽然覆盖广，但往往不是最及时、最精准的渠道。例如：
- 学术研究 → arXiv、Google Scholar、Semantic Scholar、特定会议官网
- 开源技术 → GitHub（仓库/Release/Issues/Discussions）、Hacker News、Reddit 技术版块
- 商业竞品 → Crunchbase、产品官网/Changelog、Product Hunt、行业媒体
- 行业动态 → 行业垂直媒体、研报平台（如 CB Insights）、RSS 聚合
- 政策法规 → 政府官网、法规数据库、专业律所博客
- 社区讨论 → Reddit、Twitter/X、Discord、专业论坛

你的工作是为每个维度找到这类专业信息源，而不是只依赖通用搜索。

═══════════════════════════════════════════
你的输入
═══════════════════════════════════════════

你会收到：
1. 用户的目标描述
2. 已拆解的维度列表（每个维度包含 title、description、core_questions）

═══════════════════════════════════════════
你的思考过程
═══════════════════════════════════════════

对每个维度，按以下顺序思考：

Step 1 — 领域识别
  这个维度属于什么领域/行业？涉及哪些专业方向？

Step 2 — 回忆已知信息源
  在你的知识范围内，这个领域有哪些公认的权威信息源？
  包括：专业网站、数据库、RSS 源、GitHub 仓库、API、行业报告平台、社区论坛等。

Step 3 — 构造发现查询
  设计 1-3 条 web_search 查询语句，用于发现你可能不知道的信息源。
  查询策略：
  - 查询 A：搜索该领域的信息聚合/追踪工具（如 "best tools to track AI agent market"）
  - 查询 B：搜索该领域的权威报告或数据源（如 "AI agent industry report 2025 2026"）
  - 查询 C：搜索该领域的社区/论坛/Newsletter（如 "AI agent newsletter subscription"）

Step 4 — 为每个信息源设计具体采集方案
  对每个推荐的信息源：
  - 它的具体访问方式是什么？（URL、RSS 地址、API 端点、GitHub 仓库路径）
  - 针对当前维度，应该用什么查询词/过滤条件去采集？
  - 它的内容更新频率大概是多快？

═══════════════════════════════════════════
信息源类型定义
═══════════════════════════════════════════

你可以推荐以下类型的信息源：

| 类型 | type 值 | 说明 | config 需要的字段 |
|------|---------|------|-------------------|
| 专业网站/页面 | url_monitor | 定期抓取页面内容检测变化 | url |
| RSS 订阅 | rss | 订阅 RSS/Atom feed | feed_url |
| GitHub 仓库 | github | 监控仓库动态 | repo, watch（releases/issues/commits/discussions） |
| 搜索引擎 | web_search | 定期用关键词搜索 | query |
| API 端点 | api | 调用公开 API 获取数据 | endpoint, params |

注意：web_search 类型是每个维度的兜底信息源，你不需要显式推荐它——系统会自动为每个维度添加。你要推荐的是通用搜索之外的专业信息源。

═══════════════════════════════════════════
输出格式
═══════════════════════════════════════════

严格输出以下 JSON，不要输出任何 JSON 以外的内容：

{
  "dimension_sources": [
    {
      "dimension_title": "维度名称（与输入保持一致）",
      "domain_analysis": "该维度属于什么领域，一句话说明",
      "recommended_sources": [
        {
          "name": "信息源名称（如 arXiv、Hacker News、某公司官方博客）",
          "type": "url_monitor | rss | github | api",
          "why": "为什么推荐这个信息源——它对该维度的独特价值是什么",
          "config": {
            "url": "具体 URL 或访问地址",
            "feed_url": "RSS 地址（如果 type=rss）",
            "repo": "owner/repo（如果 type=github）",
            "watch": "releases | issues | commits | discussions（如果 type=github）",
            "endpoint": "API 端点（如果 type=api）",
            "params": {}
          },
          "suggested_query": "针对当前维度，在该信息源上应该搜索/过滤的关键词或条件",
          "update_frequency": "该信息源自身的内容更新频率估计（hours/daily/weekly/monthly）",
          "confidence": "high | medium | low（你对这个信息源确实存在且可访问的把握程度）"
        }
      ],
      "discovery_queries": [
        {
          "query": "用于 web_search 的查询语句，目的是发现更多该维度的专业信息源",
          "intent": "这条查询想找到什么类型的信息源"
        }
      ]
    }
  ]
}

═══════════════════════════════════════════
质量检查清单（输出前自检）
═══════════════════════════════════════════

□ 每个维度至少推荐了 1 个专业信息源（不含通用搜索）
□ 每个维度至少有 1 条 discovery_query 用于发现你不确定的信息源
□ 推荐的信息源是具体的（有明确的 URL/仓库名/RSS 地址），不是泛泛的类别描述
□ suggested_query 是针对当前维度定制的，不是通用关键词
□ confidence 标注诚实——不确定的就标 low，不要全标 high
□ 没有把通用搜索引擎（Google/Bing）作为 recommended_sources 列出（那是系统自动兜底的）
□ config 中的字段与 type 匹配（不要给 rss 类型写 repo 字段）

═══════════════════════════════════════════
用户目标
═══════════════════════════════════════════

**目标**: ${goal.title}

**描述**: ${goal.description}

**理解**: ${goal.goal_understanding || "（待补充）"}

═══════════════════════════════════════════
维度列表（需要为每个维度推荐信息源）
═══════════════════════════════════════════

${dimList}

请根据以上信息，输出推荐的信息源配置（仅 JSON，不要其他内容）：`;
	}

	/**
	 * Execute web search using the websearch extension
	 */
	private async executeWebSearch(query: string): Promise<SearchResult[]> {
		// Use SearXNG directly
		const DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";
		const apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;

		try {
			const url = new URL(apiUrl);
			url.searchParams.append("q", query);
			url.searchParams.append("format", "json");
			url.searchParams.append("language", "auto");
			url.searchParams.append("categories", "general");

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const response = await fetch(url.toString(), {
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return (data.results || []).slice(0, 5).map((r: any) => ({
				title: r.title,
				url: r.url,
				snippet: r.content?.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").substring(0, 200) || ""
			}));
		} catch (fetchError) {
			// Silent failure, return empty results
			return [];
		}
	}

	/**
	 * Extract sources from search results (heuristic-based)
	 */
	private extractSourcesFromSearchResults(
		searchResults: SearchResult[],
		dimDiscovery: DimensionSourceDiscovery
	): DiscoveredSource[] {
		const sources: DiscoveredSource[] = [];

		for (const result of searchResults) {
			const url = result.url;

			// GitHub repository
			if (url.includes("github.com")) {
				const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
				if (match) {
					sources.push({
						name: `${match[1]}/${match[2]}`,
						type: "github",
						why: `Found via search: ${result.snippet}`,
						config: {
							repo: `${match[1]}/${match[2]}`,
							watch: "releases"
						},
						suggested_query: dimDiscovery.recommended_sources[0]?.suggested_query || dimDiscovery.dimension_title,
						update_frequency: "weekly",
						confidence: "medium"
					});
				}
			}

			// RSS feed
			if (url.includes("/rss") || url.includes("/feed") || url.endsWith(".xml")) {
				sources.push({
					name: result.title,
					type: "rss",
					why: `RSS feed found via search: ${result.snippet}`,
					config: {
						feed_url: url
					},
					suggested_query: dimDiscovery.dimension_title,
					update_frequency: "daily",
					confidence: "medium"
				});
			}

			// API documentation or endpoint
			if (url.includes("api.") || url.includes("/docs/api") || result.title.toLowerCase().includes("api")) {
				sources.push({
					name: result.title,
					type: "api",
					why: `API found via search: ${result.snippet}`,
					config: {
						endpoint: url,
						params: {}
					},
					suggested_query: dimDiscovery.dimension_title,
					update_frequency: "monthly",
					confidence: "low"
				});
			}
		}

		return sources;
	}

	/**
	 * Check accessibility of a source (HEAD request or probe)
	 */
	private async checkAccessibility(source: DiscoveredSource): Promise<boolean> {
		try {
			const url =
				source.config.url ||
				source.config.feed_url ||
				(source.config.repo ? `https://github.com/${source.config.repo}` : null) ||
				source.config.endpoint;

			if (!url) {
				this.onProgress?.(`   ⚠️  无 URL，跳过`, "warning");
				return false;
			}

			// Add timeout to avoid hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

			try {
				const response = await fetch(url, {
					method: "HEAD",
					signal: controller.signal
				});
				clearTimeout(timeoutId);
				return response.ok;
			} catch (fetchError) {
				clearTimeout(timeoutId);
				// If HEAD fails, try GET (some servers don't support HEAD)
				try {
					const controller2 = new AbortController();
					const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
					const response = await fetch(url, {
						method: "GET",
						signal: controller2.signal
					});
					clearTimeout(timeoutId2);
					return response.ok;
				} catch {
					return false;
				}
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			// Don't log to console, use progress callback
			if (errorMsg.includes("timeout") || errorMsg.includes("abort")) {
				this.onProgress?.(`   ⏱️  超时 (${source.name})`, "warning");
			} else {
				this.onProgress?.(`   ❌ 错误: ${errorMsg.substring(0, 40)}...`, "warning");
			}
			return false;
		}
	}

	/**
	 * Create DataSource object from DiscoveredSource
	 */
	private createDataSourceObject(source: DiscoveredSource, dimDiscovery: DimensionSourceDiscovery): DataSource {
		return {
			id: generateId(),
			type: source.type,
			name: source.name,
			config: source.config as Record<string, unknown>,
			reachable: true, // Will be verified later
			lastCheckedAt: null,
			confidence: source.confidence,
			updateFrequency: source.update_frequency,
			domainAnalysis: dimDiscovery.domain_analysis
		};
	}

	/**
	 * Create fallback discovery with discovery_queries
	 */
	private createFallbackDiscovery(dimensions: DimensionNode[]): LLMDiscoveryOutput {
		return {
			dimension_sources: dimensions.map(dim => ({
				dimension_title: dim.title,
				domain_analysis: "General domain",
				recommended_sources: [],
				discovery_queries: [
					{
						query: `best sources for ${dim.title} ${new Date().getFullYear()}`,
						intent: "Find current information sources"
					},
					{
						query: `${dim.title} tools resources tracking`,
						intent: "Find tools and resources for tracking"
					}
				]
			}))
		};
	}

	/**
	 * Convert dimension's refresh_interval to milliseconds
	 */
	private convertRefreshIntervalToMs(interval: DimensionNode["refresh_interval"]): number {
		const intervals: Record<DimensionNode["refresh_interval"], number> = {
			hours: 1 * 60 * 60 * 1000,
			daily: 24 * 60 * 60 * 1000,
			weekly: 7 * 24 * 60 * 60 * 1000,
			monthly: 30 * 24 * 60 * 60 * 1000,
		};
		return intervals[interval] ?? intervals.daily;
	}

	/**
	 * Discover sources for a single dynamically-added dimension
	 */
	async discoverAndBindSingle(goal: GoalNode, dim: DimensionNode): Promise<void> {
		// For single dimensions, just add a web search binding
		const fallbackBinding: DataSourceBinding = {
			sourceId: "search-fallback",
			query: `${goal.title}: ${dim.title}`,
			suggestedQuery: `Search for ${dim.core_questions[0] || dim.title}`,
			lastFetchedAt: null,
			fetchInterval: this.convertRefreshIntervalToMs(dim.refresh_interval),
			accessible: true,
			confidence: "high",
		};
		dim.dataSources.push(fallbackBinding);
	}
}
