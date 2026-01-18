/**
 * Embedding module for Semantic Memory MCP Server
 * Generates embeddings using sentence-transformers via Python subprocess
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimension: number;
}

/**
 * Compute content hash for change detection
 */
export function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate embeddings for a single text using Python subprocess
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const scriptPath = join(__dirname, '..', 'scripts', 'embedding.py');
  const model = process.env.SEMANTIC_MEMORY_EMBEDDING_MODEL || 'all-MiniLM-L6-v2';

  return new Promise<EmbeddingResult>((resolve, reject) => {
    const python = spawn('python3', [scriptPath, model], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    python.stdin.write(JSON.stringify({ texts: [text] }));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Embedding generation failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.embeddings && result.embeddings.length > 0) {
          resolve({
            embedding: result.embeddings[0],
            model: result.model || model,
            dimension: result.dimension || result.embeddings[0].length,
          });
        } else {
          reject(new Error('No embedding returned from Python script'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse embedding result: ${error}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const scriptPath = join(__dirname, '..', 'scripts', 'embedding.py');
  const model = process.env.SEMANTIC_MEMORY_EMBEDDING_MODEL || 'all-MiniLM-L6-v2';

  return new Promise<number[][]>((resolve, reject) => {
    const python = spawn('python3', [scriptPath, model], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    python.stdin.write(JSON.stringify({ texts }));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Batch embedding generation failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result.embeddings || []);
      } catch (error) {
        reject(new Error(`Failed to parse batch embedding result: ${error}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process for batch: ${error.message}`));
    });
  });
}

/**
 * Split file content into chunks
 */
export interface Chunk {
  content: string;
  startLine: number;
  endLine: number;
}

export function chunkContent(
  content: string,
  maxChunkSize: number = 500
): Chunk[] {
  const lines = content.split('\n');
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let startLine = 1;
  let currentTokens = 0;

  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = estimateTokens(line);

    if (currentTokens + lineTokens > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLine: startLine,
        endLine: i,
      });
      currentChunk = [];
      startLine = i + 1;
      currentTokens = 0;
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      startLine: startLine,
      endLine: lines.length,
    });
  }

  return chunks;
}

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

export async function processFile(
  filePath: string,
  content: string
): Promise<FileChunk[]> {
  const chunkSize =
    parseInt(process.env.SEMANTIC_MEMORY_CHUNK_SIZE || '500', 10) || 500;

  const chunks = chunkContent(content, chunkSize);
  const processedChunks: FileChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    processedChunks.push({
      content: chunk.content,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      chunkIndex: i,
      contentHash: computeHash(chunk.content),
    });
  }

  return processedChunks;
}

export default {
  generateEmbedding,
  generateEmbeddings,
  computeHash,
  chunkContent,
  processFile,
};
