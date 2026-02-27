/**
 * Unit tests for memory tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addMemory,
  searchMemories,
  listMemories,
  deleteMemory,
  clearDataset,
} from '../../src/tools/memory.js';
import { Database } from '../../src/database.js';
import { generateEmbedding } from '../../src/embedding.js';

// Mock the database and embedding functions
vi.mock('../../src/database.js');
vi.mock('../../src/embedding.js');

describe('Memory Tools', () => {
  let mockDb: ReturnType<typeof vi.mocked<Database>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database instance
    mockDb = {
      addMemory: vi.fn(),
      searchMemories: vi.fn(),
      listMemories: vi.fn(),
      deleteMemory: vi.fn(),
      clearDataset: vi.fn(),
      getContextForInjection: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<Database>>;

    // Mock generateEmbedding
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: new Array(384).fill(0.1),
      model: 'all-MiniLM-L6-v2',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('addMemory', () => {
    it('should add a memory successfully', async () => {
      const mockMemory = {
        id: 'test-id',
        dataset: 'user',
        content: 'Test content',
        content_hash: 'hash123',
        tags: ['test'],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.addMemory.mockResolvedValue(mockMemory);

      const result = await addMemory(mockDb as unknown as Database, {
        dataset: 'user',
        content: 'Test content',
        tags: ['test'],
      });

      expect(result.success).toBe(true);
      expect(result.memory).toEqual(mockMemory);
      expect(mockDb.addMemory).toHaveBeenCalledWith(
        'user',
        'Test content',
        expect.any(Array),
        ['test'],
        undefined
      );
    });

    it('should fail with empty content', async () => {
      const result = await addMemory(mockDb as unknown as Database, {
        dataset: 'user',
        content: '',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Content cannot be empty');
      expect(mockDb.addMemory).not.toHaveBeenCalled();
    });

    it('should fail with empty dataset', async () => {
      const result = await addMemory(mockDb as unknown as Database, {
        dataset: '',
        content: 'Test content',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Dataset cannot be empty');
      expect(mockDb.addMemory).not.toHaveBeenCalled();
    });

    it('should trim whitespace from content and dataset', async () => {
      const mockMemory = {
        id: 'test-id',
        dataset: 'user',
        content: 'Test content',
        content_hash: 'hash123',
        tags: [],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.addMemory.mockResolvedValue(mockMemory);

      await addMemory(mockDb as unknown as Database, {
        dataset: '  user  ',
        content: '  Test content  ',
      });

      expect(mockDb.addMemory).toHaveBeenCalledWith(
        'user',
        'Test content',
        expect.any(Array),
        [],
        undefined
      );
    });

    it('should handle database errors', async () => {
      mockDb.addMemory.mockRejectedValue(new Error('Database connection failed'));

      const result = await addMemory(mockDb as unknown as Database, {
        dataset: 'user',
        content: 'Test content',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database connection failed');
    });
  });

  describe('searchMemories', () => {
    it('should search memories successfully', async () => {
      const mockResults = [
        {
          id: 'result-1',
          dataset: 'user',
          content: 'Memory 1',
          tags: ['test'],
          similarity: 0.95,
        },
        {
          id: 'result-2',
          dataset: 'user',
          content: 'Memory 2',
          tags: ['test'],
          similarity: 0.85,
        },
      ];

      mockDb.searchMemories.mockResolvedValue(mockResults);

      const result = await searchMemories(mockDb as unknown as Database, {
        query: 'test query',
        dataset: 'user',
        top_k: 5,
      });

      expect(result.results).toEqual(mockResults);
      expect(result.count).toBe(2);
      expect(result.query_embedding_model).toBe('all-MiniLM-L6-v2');
    });

    it('should throw error with empty query', async () => {
      await expect(
        searchMemories(mockDb as unknown as Database, {
          query: '',
        })
      ).rejects.toThrow('Query cannot be empty');
    });

    it('should use default top_k value', async () => {
      mockDb.searchMemories.mockResolvedValue([]);

      await searchMemories(mockDb as unknown as Database, {
        query: 'test',
      });

      expect(mockDb.searchMemories).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
        5
      );
    });
  });

  describe('listMemories', () => {
    it('should list memories with filters', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          dataset: 'user',
          content: 'Memory 1',
          content_hash: 'hash1',
          tags: ['react'],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.listMemories.mockResolvedValue({
        memories: mockMemories,
        total: 1,
      });

      const result = await listMemories(mockDb as unknown as Database, {
        dataset: 'user',
        tags: ['react'],
        limit: 10,
        offset: 0,
      });

      expect(result.memories).toEqual(mockMemories);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should use default pagination values', async () => {
      mockDb.listMemories.mockResolvedValue({
        memories: [],
        total: 0,
      });

      await listMemories(mockDb as unknown as Database, {});

      expect(mockDb.listMemories).toHaveBeenCalledWith(
        undefined,
        undefined,
        50,
        0
      );
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory successfully', async () => {
      mockDb.deleteMemory.mockResolvedValue(true);

      const result = await deleteMemory(mockDb as unknown as Database, 'mem-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should return failure when memory not found', async () => {
      mockDb.deleteMemory.mockResolvedValue(false);

      const result = await deleteMemory(mockDb as unknown as Database, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('clearDataset', () => {
    it('should clear all memories in a dataset', async () => {
      mockDb.clearDataset.mockResolvedValue(5);

      const result = await clearDataset(mockDb as unknown as Database, 'session');

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
      expect(result.message).toContain('5 memories');
    });
  });
});
