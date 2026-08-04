/**
 * Memory tools for the MCP server - CRUD operations for user/project knowledge
 */
import { generateEmbedding } from '../embedding.js';
/**
 * Add a memory entry
 */
export async function addMemory(db, params) {
    const { dataset, content, tags = [], metadata } = params;
    if (!content || content.trim().length === 0) {
        return {
            success: false,
            message: 'Content cannot be empty',
        };
    }
    if (!dataset || dataset.trim().length === 0) {
        return {
            success: false,
            message: 'Dataset cannot be empty',
        };
    }
    try {
        // Generate embedding for the content
        const { embedding } = await generateEmbedding(content.trim());
        // Add to database
        const memory = await db.addMemory(dataset.trim(), content.trim(), embedding, tags, metadata);
        return {
            success: true,
            memory,
            message: `Memory added to dataset '${dataset}'`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Search memories semantically
 */
export async function searchMemories(db, params) {
    const { query, dataset, top_k = 5 } = params;
    if (!query || query.trim().length === 0) {
        throw new Error('Query cannot be empty');
    }
    // Generate embedding for query
    const { embedding, model } = await generateEmbedding(query.trim());
    // Search memories
    const results = await db.searchMemories(embedding, dataset, top_k);
    return {
        results,
        query_embedding_model: model,
        count: results.length,
    };
}
/**
 * List memories with filters
 */
export async function listMemories(db, params) {
    const { dataset, tags, limit = 50, offset = 0 } = params;
    const result = await db.listMemories(dataset, tags, limit, offset);
    return {
        ...result,
        limit,
        offset,
    };
}
/**
 * Delete a memory
 */
export async function deleteMemory(db, id) {
    const deleted = await db.deleteMemory(id);
    if (deleted) {
        return {
            success: true,
            message: `Memory ${id} deleted successfully`,
        };
    }
    return {
        success: false,
        message: `Memory ${id} not found`,
    };
}
/**
 * Clear all memories in a dataset
 */
export async function clearDataset(db, dataset) {
    const count = await db.clearDataset(dataset);
    return {
        success: true,
        count,
        message: `Cleared ${count} memories from dataset '${dataset}'`,
    };
}
/**
 * Get combined context for injection
 */
export async function getContextForInjection(db, query, datasets, limitPerDataset = 3) {
    // Generate embedding for query
    const { embedding } = await generateEmbedding(query.trim());
    // Get context from database
    return db.getContextForInjection(embedding, datasets, limitPerDataset);
}
export default {
    addMemory,
    searchMemories,
    listMemories,
    deleteMemory,
    clearDataset,
    getContextForInjection,
};
//# sourceMappingURL=memory.js.map