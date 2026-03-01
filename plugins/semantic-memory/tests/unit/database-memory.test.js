/**
 * Unit tests for database memory operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Database } from '../../src/database.js';
import { Pool } from 'pg';
// Mock pg Pool
vi.mock('pg', () => ({
    Pool: vi.fn(() => ({
        connect: vi.fn(),
        end: vi.fn(),
    })),
}));
describe('Database Memory Operations', () => {
    let db;
    let mockClient;
    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = {
            query: vi.fn(),
            release: vi.fn(),
        };
        vi.mocked(Pool).mockImplementation(() => ({
            connect: vi.fn().mockResolvedValue(mockClient),
            end: vi.fn().mockResolvedValue(undefined),
        }));
        db = new Database('postgresql://test');
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    describe('addMemory', () => {
        it('should insert a new memory', async () => {
            const mockMemory = {
                id: 'test-uuid',
                dataset: 'user',
                content: 'Test memory',
                content_hash: 'hash123',
                tags: ['test'],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockClient.query.mockResolvedValue({ rows: [mockMemory] });
            const embedding = new Array(384).fill(0.1);
            const result = await db.addMemory('user', 'Test memory', embedding, ['test']);
            expect(result).toEqual(mockMemory);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO memories'), expect.arrayContaining([
                'user',
                'Test memory',
                expect.any(String), // content hash
                expect.any(String), // embedding string
                ['test'],
                '{}',
            ]));
        });
        it('should upsert on conflict', async () => {
            const mockMemory = {
                id: 'existing-uuid',
                dataset: 'user',
                content: 'Updated memory',
                content_hash: 'hash123',
                tags: ['test'],
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockClient.query.mockResolvedValue({ rows: [mockMemory] });
            const embedding = new Array(384).fill(0.1);
            await db.addMemory('user', 'Updated memory', embedding, ['test']);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), expect.any(Array));
        });
    });
    describe('searchMemories', () => {
        it('should search memories with dataset filter', async () => {
            const mockResults = [
                {
                    id: 'result-1',
                    dataset: 'user',
                    content: 'Memory 1',
                    tags: ['test'],
                    similarity: 0.95,
                    metadata: {},
                },
            ];
            mockClient.query.mockResolvedValue({ rows: mockResults });
            const embedding = new Array(384).fill(0.1);
            const results = await db.searchMemories(embedding, 'user', 5);
            expect(results).toEqual(mockResults);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('AND dataset = $2'), expect.arrayContaining([
                expect.any(String),
                'user',
                5,
            ]));
        });
        it('should search all datasets when no filter', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });
            const embedding = new Array(384).fill(0.1);
            await db.searchMemories(embedding, undefined, 5);
            expect(mockClient.query).toHaveBeenCalledWith(expect.not.stringContaining('AND dataset'), expect.any(Array));
        });
    });
    describe('listMemories', () => {
        it('should list memories with pagination', async () => {
            const mockMemories = [
                {
                    id: 'mem-1',
                    dataset: 'user',
                    content: 'Memory 1',
                    content_hash: 'hash1',
                    tags: [],
                    metadata: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
                .mockResolvedValueOnce({ rows: mockMemories }); // list query
            const result = await db.listMemories('user', undefined, 10, 0);
            expect(result.memories).toEqual(mockMemories);
            expect(result.total).toBe(1);
        });
        it('should filter by tags', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ total: '0' }] })
                .mockResolvedValueOnce({ rows: [] });
            await db.listMemories(undefined, ['react', 'typescript'], 50, 0);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('tags && $'), expect.arrayContaining([
                ['react', 'typescript'],
            ]));
        });
    });
    describe('deleteMemory', () => {
        it('should delete a memory by ID', async () => {
            mockClient.query.mockResolvedValue({ rowCount: 1 });
            const result = await db.deleteMemory('mem-id');
            expect(result).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM memories WHERE id = $1', ['mem-id']);
        });
        it('should return false when memory not found', async () => {
            mockClient.query.mockResolvedValue({ rowCount: 0 });
            const result = await db.deleteMemory('nonexistent');
            expect(result).toBe(false);
        });
    });
    describe('clearDataset', () => {
        it('should clear all memories in a dataset', async () => {
            mockClient.query.mockResolvedValue({ rowCount: 10 });
            const result = await db.clearDataset('session');
            expect(result).toBe(10);
            expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM memories WHERE dataset = $1', ['session']);
        });
    });
    describe('getContextForInjection', () => {
        it('should retrieve context from multiple datasets', async () => {
            const userResults = [
                { id: 'u1', dataset: 'user', content: 'User pref', tags: [], similarity: 0.9 },
            ];
            const projectResults = [
                { id: 'p1', dataset: 'project', content: 'Project info', tags: [], similarity: 0.85 },
            ];
            mockClient.query
                .mockResolvedValueOnce({ rows: userResults })
                .mockResolvedValueOnce({ rows: projectResults });
            const embedding = new Array(384).fill(0.1);
            const result = await db.getContextForInjection(embedding, ['user', 'project'], 3);
            expect(result.get('user')).toEqual(userResults);
            expect(result.get('project')).toEqual(projectResults);
        });
        it('should skip datasets with no results', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });
            const embedding = new Array(384).fill(0.1);
            const result = await db.getContextForInjection(embedding, ['user'], 3);
            expect(result.has('user')).toBe(false);
        });
    });
});
//# sourceMappingURL=database-memory.test.js.map