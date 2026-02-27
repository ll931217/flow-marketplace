/**
 * Integration tests for MCP tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MCP Tools Integration', () => {
  describe('Tool definitions', () => {
    it('should export all required memory tools', async () => {
      const memoryModule = await import('../../src/tools/memory.js');

      expect(memoryModule.addMemory).toBeDefined();
      expect(memoryModule.searchMemories).toBeDefined();
      expect(memoryModule.listMemories).toBeDefined();
      expect(memoryModule.deleteMemory).toBeDefined();
      expect(memoryModule.clearDataset).toBeDefined();
      expect(memoryModule.getContextForInjection).toBeDefined();
    });

    it('should have correct function signatures', async () => {
      const memoryModule = await import('../../src/tools/memory.js');

      // Check that functions are async
      expect(memoryModule.addMemory.constructor.name).toBe('AsyncFunction');
      expect(memoryModule.searchMemories.constructor.name).toBe('AsyncFunction');
      expect(memoryModule.listMemories.constructor.name).toBe('AsyncFunction');
      expect(memoryModule.deleteMemory.constructor.name).toBe('AsyncFunction');
      expect(memoryModule.clearDataset.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('Index.ts tool registration', () => {
    it('should register memory_add tool', async () => {
      const indexContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/index.ts', 'utf-8')
      );

      expect(indexContent).toContain("name: 'memory_add'");
      expect(indexContent).toContain("case 'memory_add'");
    });

    it('should register memory_search tool', async () => {
      const indexContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/index.ts', 'utf-8')
      );

      expect(indexContent).toContain("name: 'memory_search'");
      expect(indexContent).toContain("case 'memory_search'");
    });

    it('should register memory_list tool', async () => {
      const indexContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/index.ts', 'utf-8')
      );

      expect(indexContent).toContain("name: 'memory_list'");
      expect(indexContent).toContain("case 'memory_list'");
    });

    it('should register memory_delete tool', async () => {
      const indexContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/index.ts', 'utf-8')
      );

      expect(indexContent).toContain("name: 'memory_delete'");
      expect(indexContent).toContain("case 'memory_delete'");
    });

    it('should register memory_clear_dataset tool', async () => {
      const indexContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/index.ts', 'utf-8')
      );

      expect(indexContent).toContain("name: 'memory_clear_dataset'");
      expect(indexContent).toContain("case 'memory_clear_dataset'");
    });
  });

  describe('Database schema', () => {
    it('should include memories table creation', async () => {
      const dbContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/database.ts', 'utf-8')
      );

      expect(dbContent).toContain('CREATE TABLE IF NOT EXISTS memories');
      expect(dbContent).toContain('dataset TEXT NOT NULL');
      expect(dbContent).toContain('content TEXT NOT NULL');
      expect(dbContent).toContain('embedding vector(384)');
      expect(dbContent).toContain('tags TEXT[]');
    });

    it('should have memories table indexes', async () => {
      const dbContent = await import('fs').then(fs =>
        fs.promises.readFile('./src/database.ts', 'utf-8')
      );

      expect(dbContent).toContain('idx_memories_dataset');
      expect(dbContent).toContain('idx_memories_embedding_hnsw');
    });
  });
});
