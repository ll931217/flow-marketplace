/**
 * E2E test for semantic-memory MCP server
 * This test requires a running PostgreSQL database with pgvector
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
// Skip tests if no database URL is provided
const DB_URL = process.env.SEMANTIC_MEMORY_PG_URL || process.env.TEST_PG_URL;
const skipTests = !DB_URL;
describe.skipIf(skipTests)('MCP Server E2E Tests', () => {
    let mcpProcess;
    let dbClient;
    beforeAll(async () => {
        // Connect to database
        dbClient = new Client({ connectionString: DB_URL });
        await dbClient.connect();
        // Clean up test data
        await dbClient.query("DELETE FROM memories WHERE dataset = 'test'");
    });
    afterAll(async () => {
        // Clean up
        if (dbClient) {
            await dbClient.query("DELETE FROM memories WHERE dataset = 'test'");
            await dbClient.end();
        }
        if (mcpProcess) {
            mcpProcess.kill();
        }
    });
    describe('Database Operations', () => {
        it('should have memories table', async () => {
            const result = await dbClient.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'memories'
      `);
            expect(result.rows.length).toBeGreaterThan(0);
        });
        it('should have pgvector extension', async () => {
            const result = await dbClient.query(`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `);
            expect(result.rows.length).toBeGreaterThan(0);
        });
        it('should have memories table with correct columns', async () => {
            const result = await dbClient.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'memories'
      `);
            const columns = result.rows.map(r => r.column_name);
            expect(columns).toContain('id');
            expect(columns).toContain('dataset');
            expect(columns).toContain('content');
            expect(columns).toContain('embedding');
            expect(columns).toContain('tags');
        });
    });
    describe('Memory CRUD via Database', () => {
        it('should insert a memory', async () => {
            // Create a dummy 384-dimensional embedding
            const embedding = Array(384).fill(0.1);
            const result = await dbClient.query(`
        INSERT INTO memories (dataset, content, content_hash, embedding, tags)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test', 'Test memory content', 'test-hash-001', `[${embedding.join(',')}]`, ['test']]);
            expect(result.rows[0].id).toBeDefined();
        });
        it('should search memories', async () => {
            const embedding = Array(384).fill(0.1);
            const result = await dbClient.query(`
        SELECT id, content, 1 - (embedding <=> $1::vector) as similarity
        FROM memories
        WHERE dataset = 'test'
        ORDER BY embedding <=> $1::vector
        LIMIT 5
      `, [`[${embedding.join(',')}]`]);
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows[0].content).toBe('Test memory content');
        });
        it('should list memories', async () => {
            const result = await dbClient.query(`
        SELECT id, content, tags FROM memories WHERE dataset = 'test'
      `);
            expect(result.rows.length).toBeGreaterThan(0);
        });
        it('should delete a memory', async () => {
            // First get an ID
            const listResult = await dbClient.query(`
        SELECT id FROM memories WHERE dataset = 'test' LIMIT 1
      `);
            const id = listResult.rows[0].id;
            // Delete it
            const deleteResult = await dbClient.query(`
        DELETE FROM memories WHERE id = $1
      `, [id]);
            expect(deleteResult.rowCount).toBe(1);
        });
    });
});
//# sourceMappingURL=mcp-e2e.test.js.map