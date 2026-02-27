/**
 * E2E tests for commands
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Commands E2E', () => {
  const commandsDir = join(process.cwd(), 'commands');

  const requiredCommands = [
    { name: 'add', file: 'add.md' },
    { name: 'search', file: 'search.md' },
    { name: 'list', file: 'list.md' },
    { name: 'delete', file: 'delete.md' },
    { name: 'sync', file: 'sync.md' },
    { name: 'learn', file: 'learn.md' },
  ];

  describe('Command files', () => {
    requiredCommands.forEach(({ name, file }) => {
      it(`should have ${name} command file`, () => {
        const filePath = join(commandsDir, file);
        expect(existsSync(filePath)).toBe(true);
      });

      it(`${name} command should have usage section`, () => {
        const filePath = join(commandsDir, file);
        const content = readFileSync(filePath, 'utf-8');

        expect(content).toMatch(/## Usage/i);
      });

      it(`${name} command should have examples section`, () => {
        const filePath = join(commandsDir, file);
        const content = readFileSync(filePath, 'utf-8');

        expect(content).toMatch(/## Examples/i);
      });

      it(`${name} command should document MCP tool calls`, () => {
        const filePath = join(commandsDir, file);
        const content = readFileSync(filePath, 'utf-8');

        expect(content).toMatch(/MCP Tool/i);
      });
    });
  });

  describe('Command content validation', () => {
    it('add command should document all parameters', () => {
      const content = readFileSync(join(commandsDir, 'add.md'), 'utf-8');

      expect(content).toContain('dataset');
      expect(content).toContain('content');
      expect(content).toContain('tags');
    });

    it('search command should document query and options', () => {
      const content = readFileSync(join(commandsDir, 'search.md'), 'utf-8');

      expect(content).toContain('query');
      expect(content).toContain('dataset');
      expect(content).toContain('top-k');
    });

    it('list command should document filters', () => {
      const content = readFileSync(join(commandsDir, 'list.md'), 'utf-8');

      expect(content).toContain('dataset');
      expect(content).toContain('tags');
      expect(content).toContain('limit');
      expect(content).toContain('offset');
    });

    it('delete command should document ID and clear options', () => {
      const content = readFileSync(join(commandsDir, 'delete.md'), 'utf-8');

      expect(content).toContain('memory-id');
      expect(content).toContain('--all');
      expect(content).toContain('--dataset');
    });

    it('sync command should document force option', () => {
      const content = readFileSync(join(commandsDir, 'sync.md'), 'utf-8');

      expect(content).toContain('--force');
    });

    it('learn command should explain difference from add', () => {
      const content = readFileSync(join(commandsDir, 'learn.md'), 'utf-8');

      expect(content).toMatch(/Difference.*add/i);
    });
  });
});
