import { DataSource, DimensionNode, InfoItem } from "../types.js";
import { WebSearchAdapter } from "./source-adapters/web-search-adapter.js";

/**
 * InfoCollector
 *
 * Fetches information from data sources using appropriate adapters.
 */
export class InfoCollector {
	private searchAdapter: WebSearchAdapter;

	constructor(piApi?: any) {
		this.searchAdapter = new WebSearchAdapter(piApi);
	}

	/**
	 * Collect information for a dimension from its data sources
	 */
	async collect(
		goalId: string,
		dimension: DimensionNode,
		sources: DataSource[]
	): Promise<InfoItem[]> {
		const allItems: InfoItem[] = [];

		for (const binding of dimension.dataSources) {
			const source = sources.find(s => s.id === binding.sourceId);
			if (!source) continue;

			// Quick time-based backoff check (e.g. don't fetch if fetched in last 1hr)
			const timeSinceLastFetch = binding.lastFetchedAt ? Date.now() - binding.lastFetchedAt : Infinity;
			if (timeSinceLastFetch < binding.fetchInterval) {
				continue;
			}

			try {
				if (source.type === "web_search") {
					const items = await this.searchAdapter.fetch(source, dimension.id, goalId);
					allItems.push(...items);
				}
				// TODO: Other source adapters (API, GitHub, RSS)

				binding.lastFetchedAt = Date.now();
			} catch (error) {
				console.error(`Error collecting from source ${source.id}:`, error);
				binding.accessible = false;
				binding.accessCheckResult = String(error);
			}
		}

		return allItems;
	}
}
