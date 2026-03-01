/**
 * MCP Tool Mock Integration Tests
 * Tests the MCP tool implementations without requiring a real database
 */
import { describe, it, expect, vi } from 'vitest';
// Mock the database module
vi.mock('../../src/database.js', () => ({
    Database: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        addMemory: vi.fn().mockResolvedValue({
            id: 'test-id',
            dataset: 'user',
            content: 'Test content',
            content_hash: 'hash123',
            tags: ['test'],
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
        }),
        searchMemories: vi.fn().mockResolvedValue([
            {
                id: 'result-1',
                dataset: 'user',
                content: 'Test memory',
                tags: ['test'],
                similarity: 0.95,
                metadata: {},
            },
        ]),
        listMemories: vi.fn().mockResolvedValue({
            memories: [],
            total: 0,
        }),
        deleteMemory: vi.fn().mockResolvedValue(true),
        clearDataset: vi.fn().mockResolvedValue(5),
        getClient: vi.fn().mockReturnValue({
            query: vi.fn().mockResolvedValue({ rows: [] }),
            release: vi.fn(),
        }),
    })),
    createDatabase: vi.fn().mockReturnValue({
        initialize: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        addMemory: vi.fn().mockResolvedValue({
            id: 'test-id',
            dataset: 'user',
            content: 'Test content',
            content_hash: 'hash123',
            tags: ['test'],
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
        }),
        searchMemories: vi.fn().mockResolvedValue([]),
        listMemories: vi.fn().mockResolvedValue({ memories: [], total: 0 }),
        deleteMemory: vi.fn().mockResolvedValue(true),
        clearDataset: vi.fn().mockResolvedValue(5),
    }),
}));
// Mock the embedding module
vi.mock('../../src/embedding.js', () => ({
    generateEmbedding: vi.fn().mockResolvedValue({
        embedding: new Array(384).fill(0.1),
        model: 'all-MiniLM-L6-v2',
    }),
    generateEmbeddings: vi.fn().mockResolvedValue([new Array(384).fill(0.1)]),
    processFile: vi.fn().mockResolvedValue([
        {
            content: 'test chunk',
            contentHash: 'hash123',
            chunkIndex: 0,
            startLine: 1,
            endLine: 10,
        },
    ]),
}));
describe('MCP Tool Mock Integration', () => {
    describe('memory_add tool', () => {
        it('should add a memory successfully', async () => {
            const { addMemory } = await import('../../src/tools/memory.js');
            const mockDb = {
                addMemory: vi.fn().mockResolvedValue({
                    id: 'test-id',
                    dataset: 'user',
                    content: 'Test preference',
                    content_hash: 'hash',
                    tags: ['preference'],
                    metadata: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                }),
            };
            const result = await addMemory(mockDb, {
                dataset: 'user',
                content: 'Test preference',
                tags: ['preference'],
            });
            expect(result.success).toBe(true);
            expect(result.memory?.content).toBe('Test preference');
        });
        it('should reject empty content', async () => {
            const { addMemory } = await import('../../src/tools/memory.js');
            const mockDb = { addMemory: vi.fn() };
            const result = await addMemory(mockDb, {
                dataset: 'user',
                content: '',
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain('empty');
        });
    });
    describe('memory_search tool', () => {
        it('should search memories by query', async () => {
            const { searchMemories } = await import('../../src/tools/memory.js');
            const mockDb = {
                searchMemories: vi.fn().mockResolvedValue([
                    {
                        id: 'result-1',
                        dataset: 'user',
                        content: 'Use Zustand for state management',
                        tags: ['react', 'state'],
                        similarity: 0.92,
                    },
                ]),
            };
            const result = await searchMemories(mockDb, {
                query: 'state management',
                dataset: 'user',
                top_k: 5,
            });
            expect(result.results).toHaveLength(1);
            expect(result.results[0].content).toContain('Zustand');
        });
    });
    describe('memory_list tool', () => {
        it('should list memories with pagination', async () => {
            const { listMemories } = await import('../../src/tools/memory.js');
            const mockDb = {
                listMemories: vi.fn().mockResolvedValue({
                    memories: [
                        {
                            id: 'mem-1',
                            dataset: 'user',
                            content: 'Memory 1',
                            content_hash: 'hash1',
                            tags: [],
                            created_at: new Date(),
                            updated_at: new Date(),
                        },
                    ],
                    total: 1,
                }),
            };
            const result = await listMemories(mockDb, {
                dataset: 'user',
                limit: 10,
                offset: 0,
            });
            expect(result.memories).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });
    describe('memory_delete tool', () => {
        it('should delete a memory by ID', async () => {
            const { deleteMemory } = await import('../../src/tools/memory.js');
            const mockDb = {
                deleteMemory: vi.fn().mockResolvedValue(true),
            };
            const result = await deleteMemory(mockDb, 'mem-id');
            expect(result.success).toBe(true);
        });
        it('should return failure for non-existent memory', async () => {
            const { deleteMemory } = await import('../../src/tools/memory.js');
            const mockDb = {
                deleteMemory: vi.fn().mockResolvedValue(false),
            };
            const result = await deleteMemory(mockDb, 'nonexistent');
            expect(result.success).toBe(false);
        });
    });
    describe('memory_clear_dataset tool', () => {
        it('should clear all memories in a dataset', async () => {
            const { clearDataset } = await import('../../src/tools/memory.js');
            const mockDb = {
                clearDataset: vi.fn().mockResolvedValue(10),
            };
            const result = await clearDataset(mockDb, 'session');
            expect(result.success).toBe(true);
            expect(result.count).toBe(10);
        });
    });
});
describe('MCP Server Tool Definitions', () => {
    it('should have all required tool definitions', async () => {
        const fs = await import('fs');
        const indexContent = fs.readFileSync('./src/index.ts', 'utf-8');
        const requiredTools = [
            'memory_add',
            'memory_search',
            'memory_list',
            'memory_delete',
            'memory_clear_dataset',
        ];
        requiredTools.forEach(tool => {
            expect(indexContent).toContain(`name: '${tool}'`);
        });
    });
    it('should have inputSchema for each tool', async () => {
        const fs = await import('fs');
        const indexContent = fs.readFileSync('./src/index.ts', 'utf-8');
        // Each tool should have inputSchema
        const toolCount = (indexContent.match(/name: 'memory_/g) || []).length;
        const schemaCount = (indexContent.match(/inputSchema:/g) || []).length;
        // There are more tools than just memory tools, so schema count should be >= memory tools
        expect(schemaCount).toBeGreaterThanOrEqual(toolCount);
    });
});
//# sourceMappingURL=mcp-mock.test.js.map