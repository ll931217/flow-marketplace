/**
 * E2E tests for preference capture workflow
 */
import { describe, it, expect } from 'vitest';
describe('Preference Capture Workflow E2E', () => {
    describe('Preferences skill workflow', () => {
        it('should define all required preference categories', async () => {
            const fs = await import('fs');
            const skillPath = './skills/preferences/SKILL.md';
            const content = fs.readFileSync(skillPath, 'utf-8');
            // Check all preference categories are documented
            const categories = [
                'Programming Languages',
                'State Management',
                'Testing Framework',
                'Component Style',
                'Styling Approach',
                'Error Handling',
                'Code Organization',
                'Documentation',
                'Git Workflow',
            ];
            categories.forEach(category => {
                expect(content).toContain(category);
            });
        });
        it('should provide options for state management', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/preferences/SKILL.md', 'utf-8');
            expect(content).toContain('Redux');
            expect(content).toContain('Zustand');
            expect(content).toContain('React Context');
            expect(content).toContain('MobX');
        });
        it('should provide options for testing frameworks', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/preferences/SKILL.md', 'utf-8');
            expect(content).toContain('Jest');
            expect(content).toContain('Vitest');
            expect(content).toContain('Pytest');
        });
        it('should include confirmation step', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/preferences/SKILL.md', 'utf-8');
            expect(content).toContain('Summary');
            expect(content).toContain('Confirmation');
        });
        it('should use memory_add MCP tool for saving', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/preferences/SKILL.md', 'utf-8');
            expect(content).toContain('memory_add');
            expect(content).toContain('dataset');
            expect(content).toContain('user');
        });
    });
    describe('Project setup workflow', () => {
        it('should define all required project context categories', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/project-setup/SKILL.md', 'utf-8');
            const categories = [
                'Architecture',
                'Technologies',
                'Database',
                'API Pattern',
                'Build Tools',
                'Deployment',
                'Dependencies',
                'Conventions',
            ];
            categories.forEach(category => {
                expect(content).toContain(category);
            });
        });
        it('should detect project automatically', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/project-setup/SKILL.md', 'utf-8');
            expect(content).toContain('Detect Project Context');
            expect(content).toContain('package.json');
            expect(content).toContain('pyproject.toml');
        });
        it('should save to project-specific dataset', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/project-setup/SKILL.md', 'utf-8');
            expect(content).toContain('dataset');
            expect(content).toContain('project_name');
        });
    });
    describe('Session summary workflow', () => {
        it('should extract learnings from session', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/session-summary/SKILL.md', 'utf-8');
            expect(content).toContain('Extract Learnings');
            expect(content).toContain('Architecture decisions');
            expect(content).toContain('Pattern choices');
        });
        it('should categorize learnings by dataset', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/session-summary/SKILL.md', 'utf-8');
            expect(content).toContain('User-Level');
            expect(content).toContain('Project-Level');
            expect(content).toContain('Session-Level');
        });
        it('should prompt user before saving', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/session-summary/SKILL.md', 'utf-8');
            expect(content).toContain('Prompt for Capture');
            expect(content).toContain('Select which to save');
        });
    });
    describe('Memory context injection workflow', () => {
        it('should determine datasets to query', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/memory-context/SKILL.md', 'utf-8');
            expect(content).toContain('Determine Datasets');
            expect(content).toContain('user');
            expect(content).toContain('project_name');
        });
        it('should extract query terms from prompt', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/memory-context/SKILL.md', 'utf-8');
            expect(content).toContain('Extract Query Terms');
        });
        it('should format context as system-reminder', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/memory-context/SKILL.md', 'utf-8');
            expect(content).toContain('system-reminder');
            expect(content).toContain('User Preferences');
            expect(content).toContain('Project Context');
        });
        it('should handle no memories gracefully', async () => {
            const fs = await import('fs');
            const content = fs.readFileSync('./skills/memory-context/SKILL.md', 'utf-8');
            expect(content).toContain('Fallback');
            expect(content).toContain('no relevant memories');
        });
    });
});
//# sourceMappingURL=preferences-workflow.test.js.map