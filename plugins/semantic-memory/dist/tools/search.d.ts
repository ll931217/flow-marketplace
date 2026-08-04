/**
 * Semantic search tool for the MCP server
 */
import { Database, SearchResult } from '../database.js';
export interface SemanticSearchParams {
    query: string;
    project_path?: string;
    top_k?: number;
}
export interface SemanticSearchResult {
    results: SearchResult[];
    query_embedding_model: string;
    count: number;
}
/**
 * Execute semantic search
 */
export declare function semanticSearch(db: Database, params: SemanticSearchParams): Promise<SemanticSearchResult>;
export default semanticSearch;
//# sourceMappingURL=search.d.ts.map