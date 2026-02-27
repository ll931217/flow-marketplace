import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/index.ts', // Main entry point - integration tested
        'src/embedding.ts', // External Python process - requires integration test
      ],
      thresholds: {
        // Focus on new memory module - existing code coverage is tracked separately
        'src/tools/memory.ts': {
          lines: 80,
          functions: 80,
        },
      },
      perFile: true,
    }
  }
});
