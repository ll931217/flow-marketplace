/**
 * Database module for Semantic Memory MCP Server
 * Handles PostgreSQL connection and operations with pgvector
 */
import { Pool } from 'pg';
/**
 * Database class for managing PostgreSQL connections and operations
 */
export class Database {
    pool;
    initialized = false;
    constructor(connectionString) {
        this.pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    /**
     * Initialize database connection and create tables if they don't exist
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        const client = await this.pool.connect();
        try {
            // Enable pgvector extension
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');
            // Create projects table
            await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(project_path)
      `);
            // Create documents table
            await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          start_line INTEGER NOT NULL,
          end_line INTEGER NOT NULL,
          embedding vector(384) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(project_id, file_path, content_hash, chunk_index)
        )
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path)
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
        ON documents USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);
            // Create memories table for user/project knowledge
            await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          dataset TEXT NOT NULL,
          content TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          embedding vector(384) NOT NULL,
          tags TEXT[],
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(dataset, content_hash)
        )
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_dataset ON memories(dataset)
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw
        ON memories USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);
            this.initialized = true;
        }
        finally {
            client.release();
        }
    }
    /**
     * Close the database connection pool
     */
    async close() {
        await this.pool.end();
    }
    /**
     * Get a client from the pool
     */
    async getClient() {
        return this.pool.connect();
    }
    /**
     * Create or update a project
     */
    async upsertProject(projectPath, name) {
        const client = await this.getClient();
        try {
            const result = await client.query(`INSERT INTO projects (project_path, name)
         VALUES ($1, $2)
         ON CONFLICT (project_path) DO UPDATE
         SET name = $2, updated_at = NOW()
         RETURNING *`, [projectPath, name]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Get a project by path
     */
    async getProject(projectPath) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM projects WHERE project_path = $1', [projectPath]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    /**
     * List all projects
     */
    async listProjects() {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM projects ORDER BY created_at DESC');
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete a project
     */
    async deleteProject(projectPath) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM projects WHERE project_path = $1', [projectPath]);
            return (result.rowCount ?? 0) > 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get project status
     */
    async getProjectStatus(projectPath) {
        const client = await this.getClient();
        try {
            const projectResult = await client.query('SELECT * FROM projects WHERE project_path = $1', [projectPath]);
            if (!projectResult.rows[0]) {
                return null;
            }
            const project = projectResult.rows[0];
            const projectId = project.id;
            const statsResult = await client.query(`SELECT
          COUNT(*) as document_count,
          MAX(created_at) as last_indexed,
          AVG(pg_column_size(content) + pg_column_size(embedding)) as avg_size
        FROM documents
        WHERE project_id = $1`, [projectId]);
            const stats = statsResult.rows[0];
            const avgSize = Number(stats.avg_size) || 0;
            const docCount = Number(stats.document_count) || 0;
            return {
                project,
                document_count: docCount,
                last_indexed: stats.last_indexed ? new Date(stats.last_indexed) : null,
                storage_size_bytes: avgSize * docCount,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Insert documents in batch
     */
    async insertDocuments(documents) {
        if (documents.length === 0) {
            return;
        }
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            for (const doc of documents) {
                await client.query(`INSERT INTO documents (
            project_id, file_path, content_hash, chunk_index,
            content, start_line, end_line, embedding, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (project_id, file_path, content_hash, chunk_index)
          DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            start_line = EXCLUDED.start_line,
            end_line = EXCLUDED.end_line,
            metadata = EXCLUDED.metadata`, [
                    doc.project_id,
                    doc.file_path,
                    doc.content_hash,
                    doc.chunk_index,
                    doc.content,
                    doc.start_line,
                    doc.end_line,
                    `[${doc.embedding.join(',')}]`,
                    JSON.stringify(doc.metadata || {}),
                ]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete documents for a specific file pattern
     */
    async deleteFileDocuments(projectId, filePathPattern) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM documents WHERE project_id = $1 AND file_path LIKE $2', [projectId, filePathPattern]);
            return result.rowCount ?? 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Perform semantic search
     */
    async semanticSearch(projectId, queryEmbedding, limit = 5) {
        const client = await this.getClient();
        try {
            const embeddingStr = `[${queryEmbedding.join(',')}]`;
            let query = `
        SELECT
          d.id,
          d.project_id,
          p.project_path,
          d.file_path,
          d.chunk_index,
          d.content,
          d.start_line,
          d.end_line,
          1 - (d.embedding <=> $1::vector) as similarity,
          d.metadata
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.embedding <=> $1::vector < 0.3
      `;
            const params = [embeddingStr];
            let paramIndex = 2;
            if (projectId) {
                query += ` AND d.project_id = $${paramIndex}`;
                params.push(projectId);
                paramIndex++;
            }
            query += ` ORDER BY d.embedding <=> $1::vector LIMIT $${paramIndex}`;
            params.push(limit);
            const result = await client.query(query, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    // ============ Memory CRUD Operations ============
    /**
     * Add a memory entry
     */
    async addMemory(dataset, content, embedding, tags = [], metadata) {
        const client = await this.getClient();
        try {
            // Generate content hash for deduplication
            const contentHash = await this.generateContentHash(content);
            const result = await client.query(`INSERT INTO memories (dataset, content, content_hash, embedding, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (dataset, content_hash) DO UPDATE
         SET content = $2, embedding = $4, tags = $5, metadata = $6, updated_at = NOW()
         RETURNING *`, [
                dataset,
                content,
                contentHash,
                `[${embedding.join(',')}]`,
                tags,
                JSON.stringify(metadata || {}),
            ]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Search memories semantically
     */
    async searchMemories(queryEmbedding, dataset, limit = 5) {
        const client = await this.getClient();
        try {
            const embeddingStr = `[${queryEmbedding.join(',')}]`;
            let query = `
        SELECT
          id,
          dataset,
          content,
          tags,
          1 - (embedding <=> $1::vector) as similarity,
          metadata
        FROM memories
        WHERE embedding <=> $1::vector < 0.5
      `;
            const params = [embeddingStr];
            let paramIndex = 2;
            if (dataset) {
                query += ` AND dataset = $${paramIndex}`;
                params.push(dataset);
                paramIndex++;
            }
            query += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
            params.push(limit);
            const result = await client.query(query, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * List memories with filters
     */
    async listMemories(dataset, tags, limit = 50, offset = 0) {
        const client = await this.getClient();
        try {
            let countQuery = 'SELECT COUNT(*) as total FROM memories';
            let listQuery = 'SELECT * FROM memories';
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (dataset) {
                conditions.push(`dataset = $${paramIndex}`);
                params.push(dataset);
                paramIndex++;
            }
            if (tags && tags.length > 0) {
                conditions.push(`tags && $${paramIndex}`);
                params.push(tags);
                paramIndex++;
            }
            if (conditions.length > 0) {
                const whereClause = ' WHERE ' + conditions.join(' AND ');
                countQuery += whereClause;
                listQuery += whereClause;
            }
            // Get total count
            const countResult = await client.query(countQuery, params.slice(0, paramIndex - 1));
            const total = Number(countResult.rows[0].total);
            // Get paginated results
            listQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            const listResult = await client.query(listQuery, params);
            return {
                memories: listResult.rows,
                total,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete a memory by ID
     */
    async deleteMemory(id) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM memories WHERE id = $1', [id]);
            return (result.rowCount ?? 0) > 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete all memories in a dataset
     */
    async clearDataset(dataset) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM memories WHERE dataset = $1', [dataset]);
            return result.rowCount ?? 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get combined context for injection
     */
    async getContextForInjection(queryEmbedding, datasets, limitPerDataset = 3) {
        const results = new Map();
        for (const dataset of datasets) {
            const memories = await this.searchMemories(queryEmbedding, dataset, limitPerDataset);
            if (memories.length > 0) {
                results.set(dataset, memories);
            }
        }
        return results;
    }
    /**
     * Generate a simple content hash
     */
    async generateContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
/**
 * Create a database instance from environment variables
 */
export function createDatabase() {
    const pgUrl = process.env.SEMANTIC_MEMORY_PG_URL ||
        process.env.DATABASE_URL ||
        'postgresql://localhost/semantic_memory';
    return new Database(pgUrl);
}
export default Database;
//# sourceMappingURL=database.js.map