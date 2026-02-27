/**
 * Semantic Memory MCP Server
 * Provides semantic search and codebase indexing using PostgreSQL + pgvector
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createDatabase, Database } from './database.js';
import { semanticSearch } from './tools/search.js';
import { indexProject } from './tools/index.js';
import {
  getProjectStatus,
  deleteProject,
  listProjects,
} from './tools/manage.js';
import {
  addMemory,
  searchMemories,
  listMemories,
  deleteMemory,
  clearDataset,
} from './tools/memory.js';

const TOOLS: Tool[] = [
  {
    name: 'semantic_search',
    description:
      'Search codebase using semantic similarity. Returns relevant code chunks with file paths, line ranges, and similarity scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        project_path: {
          type: 'string',
          description: 'Absolute path to project (searches all projects if not specified)',
        },
        top_k: {
          type: 'number',
          description: 'Number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'index_project',
    description:
      'Index a project codebase for semantic search. Processes all source files and generates embeddings.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project to index',
        },
        force_reindex: {
          type: 'boolean',
          description: 'Force re-indexing even if already indexed',
          default: false,
        },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'get_project_status',
    description:
      'Get indexing status for a project including document count, last indexed date, and storage size.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project',
        },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'delete_project',
    description:
      'Delete a project and all its indexed documents from the database.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project',
        },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'list_projects',
    description:
      'List all indexed projects with metadata including document count and last indexed date.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Memory tools
  {
    name: 'memory_add',
    description:
      'Add a memory entry to semantic memory. Use this to store user preferences, project knowledge, or coding patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          description: 'Dataset name (e.g., "user" for preferences, "{project_name}" for project context)',
        },
        content: {
          type: 'string',
          description: 'The memory content to store',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata',
        },
      },
      required: ['dataset', 'content'],
    },
  },
  {
    name: 'memory_search',
    description:
      'Search memories semantically. Returns relevant memories with similarity scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        dataset: {
          type: 'string',
          description: 'Optional dataset to search within',
        },
        top_k: {
          type: 'number',
          description: 'Number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_list',
    description:
      'List memories with optional filters by dataset and tags.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          description: 'Filter by dataset',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (matches any)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 50,
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
          default: 0,
        },
      },
    },
  },
  {
    name: 'memory_delete',
    description:
      'Delete a specific memory by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Memory ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'memory_clear_dataset',
    description:
      'Clear all memories in a dataset.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          description: 'Dataset to clear',
        },
      },
      required: ['dataset'],
    },
  },
];

async function main() {
  const db = createDatabase();

  try {
    await db.initialize();
    console.error('Semantic Memory MCP Server: Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  const server = new Server(
    {
      name: 'semantic-memory-mcp',
      version: '2.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'semantic_search': {
          const result = await semanticSearch(db, {
            query: String(args?.query ?? ''),
            project_path: args?.project_path
              ? String(args.project_path)
              : undefined,
            top_k: args?.top_k ? Number(args.top_k) : 5,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'index_project': {
          const result = await indexProject(db, {
            project_path: String(args?.project_path ?? ''),
            force_reindex: Boolean(args?.force_reindex ?? false),
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_project_status': {
          const result = await getProjectStatus(
            db,
            String(args?.project_path ?? '')
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'delete_project': {
          const result = await deleteProject(db, String(args?.project_path ?? ''));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'list_projects': {
          const result = await listProjects(db);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Memory tools
        case 'memory_add': {
          const result = await addMemory(db, {
            dataset: String(args?.dataset ?? ''),
            content: String(args?.content ?? ''),
            tags: Array.isArray(args?.tags) ? args.tags as string[] : [],
            metadata: args?.metadata as Record<string, unknown> | undefined,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'memory_search': {
          const result = await searchMemories(db, {
            query: String(args?.query ?? ''),
            dataset: args?.dataset ? String(args.dataset) : undefined,
            top_k: args?.top_k ? Number(args.top_k) : 5,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'memory_list': {
          const result = await listMemories(db, {
            dataset: args?.dataset ? String(args.dataset) : undefined,
            tags: Array.isArray(args?.tags) ? args.tags as string[] : undefined,
            limit: args?.limit ? Number(args.limit) : 50,
            offset: args?.offset ? Number(args.offset) : 0,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'memory_delete': {
          const result = await deleteMemory(db, String(args?.id ?? ''));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'memory_clear_dataset': {
          const result = await clearDataset(db, String(args?.dataset ?? ''));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  process.on('SIGINT', async () => {
    console.error('\nShutting down Semantic Memory MCP Server...');
    await db.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down Semantic Memory MCP Server...');
    await db.close();
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Semantic Memory MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
