/**
 * Database module for Semantic Memory MCP Server
 * Handles PostgreSQL connection and operations with pgvector
 */
import { PoolClient } from 'pg';
export interface Project {
    id: string;
    project_path: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}
export interface Document {
    id: string;
    project_id: string;
    file_path: string;
    content_hash: string;
    chunk_index: number;
    content: string;
    start_line: number;
    end_line: number;
    embedding: number[];
    metadata?: Record<string, unknown>;
    created_at: Date;
}
export interface ProjectStatus {
    project: Project;
    document_count: number;
    last_indexed: Date | null;
    storage_size_bytes: number;
}
export interface SearchResult {
    id: string;
    project_id: string;
    project_path: string;
    file_path: string;
    chunk_index: number;
    content: string;
    start_line: number;
    end_line: number;
    similarity: number;
    metadata?: Record<string, unknown>;
}
export interface Memory {
    id: string;
    dataset: string;
    content: string;
    content_hash: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}
export interface MemorySearchResult {
    id: string;
    dataset: string;
    content: string;
    tags: string[];
    similarity: number;
    metadata?: Record<string, unknown>;
}
/**
 * Database class for managing PostgreSQL connections and operations
 */
export declare class Database {
    private pool;
    private initialized;
    constructor(connectionString: string);
    /**
     * Initialize database connection and create tables if they don't exist
     */
    initialize(): Promise<void>;
    /**
     * Close the database connection pool
     */
    close(): Promise<void>;
    /**
     * Get a client from the pool
     */
    getClient(): Promise<PoolClient>;
    /**
     * Create or update a project
     */
    upsertProject(projectPath: string, name: string): Promise<Project>;
    /**
     * Get a project by path
     */
    getProject(projectPath: string): Promise<Project | null>;
    /**
     * List all projects
     */
    listProjects(): Promise<Project[]>;
    /**
     * Delete a project
     */
    deleteProject(projectPath: string): Promise<boolean>;
    /**
     * Get project status
     */
    getProjectStatus(projectPath: string): Promise<ProjectStatus | null>;
    /**
     * Insert documents in batch
     */
    insertDocuments(documents: Omit<Document, 'id' | 'created_at'>[]): Promise<void>;
    /**
     * Delete documents for a specific file pattern
     */
    deleteFileDocuments(projectId: string, filePathPattern: string): Promise<number>;
    /**
     * Perform semantic search
     */
    semanticSearch(projectId: string | null, queryEmbedding: number[], limit?: number): Promise<SearchResult[]>;
    /**
     * Add a memory entry
     */
    addMemory(dataset: string, content: string, embedding: number[], tags?: string[], metadata?: Record<string, unknown>): Promise<Memory>;
    /**
     * Search memories semantically
     */
    searchMemories(queryEmbedding: number[], dataset?: string, limit?: number): Promise<MemorySearchResult[]>;
    /**
     * List memories with filters
     */
    listMemories(dataset?: string, tags?: string[], limit?: number, offset?: number): Promise<{
        memories: Memory[];
        total: number;
    }>;
    /**
     * Delete a memory by ID
     */
    deleteMemory(id: string): Promise<boolean>;
    /**
     * Delete all memories in a dataset
     */
    clearDataset(dataset: string): Promise<number>;
    /**
     * Get combined context for injection
     */
    getContextForInjection(queryEmbedding: number[], datasets: string[], limitPerDataset?: number): Promise<Map<string, MemorySearchResult[]>>;
    /**
     * Generate a simple content hash
     */
    private generateContentHash;
}
/**
 * Create a database instance from environment variables
 */
export declare function createDatabase(): Database;
export default Database;
//# sourceMappingURL=database.d.ts.map