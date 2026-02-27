/**
 * E2E tests for skills
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Skills E2E', () => {
  const skillsDir = join(process.cwd(), 'skills');

  const requiredSkills = [
    {
      name: 'memory-context',
      path: 'memory-context/SKILL.md',
      description: 'Context injection skill',
    },
    {
      name: 'preferences',
      path: 'preferences/SKILL.md',
      description: 'Preference setup skill',
    },
    {
      name: 'project-setup',
      path: 'project-setup/SKILL.md',
      description: 'Project context capture skill',
    },
    {
      name: 'session-summary',
      path: 'session-summary/SKILL.md',
      description: 'Session summarization skill',
    },
  ];

  describe('Skill files', () => {
    requiredSkills.forEach(({ name, path }) => {
      it(`should have ${name} skill file`, () => {
        const filePath = join(skillsDir, path);
        expect(existsSync(filePath)).toBe(true);
      });

      it(`${name} skill should have YAML frontmatter`, () => {
        const filePath = join(skillsDir, path);
        const content = readFileSync(filePath, 'utf-8');

        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/name:/);
        expect(content).toMatch(/description:/);
      });

      it(`${name} skill should have process or usage section`, () => {
        const filePath = join(skillsDir, path);
        const content = readFileSync(filePath, 'utf-8');

        expect(
          content.includes('## Process') ||
          content.includes('## Usage') ||
          content.includes('## When to Use')
        ).toBe(true);
      });
    });
  });

  describe('Skill content validation', () => {
    it('memory-context skill should document retrieval process', () => {
      const content = readFileSync(join(skillsDir, 'memory-context/SKILL.md'), 'utf-8');

      expect(content).toContain('memory_search');
      expect(content).toContain('system-reminder');
    });

    it('preferences skill should document all preference categories', () => {
      const content = readFileSync(join(skillsDir, 'preferences/SKILL.md'), 'utf-8');

      expect(content).toContain('Programming Languages');
      expect(content).toContain('State Management');
      expect(content).toContain('Testing Framework');
      expect(content).toContain('Component Style');
      expect(content).toContain('Styling Approach');
    });

    it('project-setup skill should detect project context automatically', () => {
      const content = readFileSync(join(skillsDir, 'project-setup/SKILL.md'), 'utf-8');

      expect(content).toContain('Detect Project Context');
      expect(content).toContain('package.json');
    });

    it('session-summary skill should document Stop hook integration', () => {
      const content = readFileSync(join(skillsDir, 'session-summary/SKILL.md'), 'utf-8');

      expect(content).toContain('Stop hook');
      expect(content).toContain('memory_add');
    });
  });

  describe('Plugin manifest', () => {
    it('should have plugin.json file', () => {
      const pluginPath = join(process.cwd(), '.claude-plugin', 'plugin.json');
      expect(existsSync(pluginPath)).toBe(true);
    });

    it('should register all commands in plugin.json', () => {
      const pluginPath = join(process.cwd(), '.claude-plugin', 'plugin.json');
      const content = readFileSync(pluginPath, 'utf-8');
      const plugin = JSON.parse(content);

      const commandNames = plugin.components.commands.map((c: { name: string }) => c.name);

      expect(commandNames).toContain('memory:add');
      expect(commandNames).toContain('memory:search');
      expect(commandNames).toContain('memory:list');
      expect(commandNames).toContain('memory:delete');
      expect(commandNames).toContain('memory:sync');
      expect(commandNames).toContain('memory:learn');
    });

    it('should register all skills in plugin.json', () => {
      const pluginPath = join(process.cwd(), '.claude-plugin', 'plugin.json');
      const content = readFileSync(pluginPath, 'utf-8');
      const plugin = JSON.parse(content);

      const skillNames = plugin.components.skills.map((s: { name: string }) => s.name);

      expect(skillNames).toContain('memory-context');
      expect(skillNames).toContain('preferences');
      expect(skillNames).toContain('project-setup');
      expect(skillNames).toContain('session-summary');
    });

    it('should reference hooks configuration', () => {
      const pluginPath = join(process.cwd(), '.claude-plugin', 'plugin.json');
      const content = readFileSync(pluginPath, 'utf-8');
      const plugin = JSON.parse(content);

      expect(plugin.components.hooks).toHaveProperty('config', 'hooks/hooks.json');
    });
  });
});
