/**
 * Semantic search tool for the MCP server
 */
import { generateEmbedding } from '../embedding.js';
/**
 * Execute semantic search
 */
export async function semanticSearch(db, params) {
    const { query, project_path, top_k = 5 } = params;
    if (!query || query.trim().length === 0) {
        throw new Error('Query cannot be empty');
    }
    // Get project ID if project_path is specified
    let projectId = null;
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
//# sourceMappingURL=search.js.map