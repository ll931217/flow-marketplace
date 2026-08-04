/**
 * Embedding module for Semantic Memory MCP Server
 * Generates embeddings using sentence-transformers via Python subprocess
 */
export interface EmbeddingResult {
    embedding: number[];
    model: string;
    dimension: number;
}
/**
 * Compute content hash for change detection
 */
export declare function computeHash(content: string): string;
/**
 * Generate embeddings for a single text using Python subprocess
 */
export declare function generateEmbedding(text: string): Promise<EmbeddingResult>;
/**
 * Generate embeddings for multiple texts in batch
 */
export declare function generateEmbeddings(texts: string[]): Promise<number[][]>;
/**
 * Split file content into chunks
 */
export interface Chunk {
    content: string;
    startLine: number;
    endLine: number;
}
export declare function chunkContent(content: string, maxChunkSize?: number): Chunk[];
/**
 * Process a file for indexing
 */
export interface FileChunk {
    content: string;
    startLine: number;
    endLine: number;
    chunkIndex: number;
    contentHash: string;
}
export declare function processFile(filePath: string, content: string): Promise<FileChunk[]>;
declare const _default: {
    generateEmbedding: typeof generateEmbedding;
    generateEmbeddings: typeof generateEmbeddings;
    computeHash: typeof computeHash;
    chunkContent: typeof chunkContent;
    processFile: typeof processFile;
};
export default _default;
//# sourceMappingURL=embedding.d.ts.map