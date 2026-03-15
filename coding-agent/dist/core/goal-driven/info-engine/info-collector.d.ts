import { DataSource, DimensionNode, InfoItem } from "../types.js";
/**
 * InfoCollector
 *
 * Fetches information from data sources using appropriate adapters.
 */
export declare class InfoCollector {
    private searchAdapter;
    /**
     * Collect information for a dimension from its data sources
     */
    collect(goalId: string, dimension: DimensionNode, sources: DataSource[]): Promise<InfoItem[]>;
}
//# sourceMappingURL=info-collector.d.ts.map