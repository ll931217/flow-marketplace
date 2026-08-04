/**
 * Memory tools for the MCP server - CRUD operations for user/project knowledge
 */
import { Database, Memory, MemorySearchResult } from '../database.js';
export interface AddMemoryParams {
    dataset: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface SearchMemoryParams {
    query: string;
    dataset?: string;
    top_k?: number;
}
export interface ListMemoryParams {
    dataset?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
}
export interface AddMemoryResult {
    success: boolean;
    memory?: Memory;
    message?: string;
}
export interface SearchMemoryResult {
    results: MemorySearchResult[];
    query_embedding_model: string;
    count: number;
}
export interface ListMemoryResult {
    memories: Memory[];
    total: number;
    limit: number;
    offset: number;
}
/**
 * Add a memory entry
 */
export declare function addMemory(db: Database, params: AddMemoryParams): Promise<AddMemoryResult>;
/**
 * Search memories semantically
 */
export declare function searchMemories(db: Database, params: SearchMemoryParams): Promise<SearchMemoryResult>;
/**
 * List memories with filters
 */
export declare function listMemories(db: Database, params: ListMemoryParams): Promise<ListMemoryResult>;
/**
 * Delete a memory
 */
export declare function deleteMemory(db: Database, id: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Clear all memories in a dataset
 */
export declare function clearDataset(db: Database, dataset: string): Promise<{
    success: boolean;
    count: number;
    message: string;
}>;
/**
 * Get combined context for injection
 */
export declare function getContextForInjection(db: Database, query: string, datasets: string[], limitPerDataset?: number): Promise<Map<string, MemorySearchResult[]>>;
declare const _default: {
    addMemory: typeof addMemory;
    searchMemories: typeof searchMemories;
    listMemories: typeof listMemories;
    deleteMemory: typeof deleteMemory;
    clearDataset: typeof clearDataset;
    getContextForInjection: typeof getContextForInjection;
};
export default _default;
//# sourceMappingURL=memory.d.ts.map