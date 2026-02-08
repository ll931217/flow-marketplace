/**
 * Semantic search tool for the MCP server
 */

import { Database, SearchResult } from '../database.js';
import { generateEmbedding } from '../embedding.js';

export interface SemanticSearchParams {
  query: string;
  project_path?: string;
  top_k?: number;
}

export interface SemanticSearchResult {
  results: SearchResult[];
  query_embedding_model: string;
  count: number;
}

/**
 * Execute semantic search
 */
export async function semanticSearch(
  db: Database,
  params: SemanticSearchParams
): Promise<SemanticSearchResult> {
  const { query, project_path, top_k = 5 } = params;

  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  // Get project ID if project_path is specified
  let projectId: string | null = null;
  if (project_path) {
    const project = await db.getProject(project_path);
    if (!project) {
      throw new Error(`Project not found: ${project_path}`);
    }
    projectId = project.id;
  }

  // Generate embedding for query
  const { embedding, model } = await generateEmbedding(query.trim());

  // Perform semantic search
  const results = await db.semanticSearch(projectId, embedding, top_k);

  return {
    results,
    query_embedding_model: model,
    count: results.length,
  };
}

export default semanticSearch;
