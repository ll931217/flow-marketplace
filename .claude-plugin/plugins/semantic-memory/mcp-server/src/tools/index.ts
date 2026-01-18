/**
 * Index project tool for the MCP server
 */

import { Database } from '../database.js';
import { generateEmbeddings, processFile } from '../embedding.js';
import { readFile } from 'fs/promises';
import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

export interface IndexProjectParams {
  project_path: string;
  force_reindex?: boolean;
}

export interface IndexResult {
  project_path: string;
  project_name: string;
  files_processed: number;
  chunks_indexed: number;
  files_skipped: number;
  indexing_time_ms: number;
  status: 'success' | 'partial' | 'error';
  message?: string;
}

const INDEXED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt',
  '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.swift', '.scala',
  '.clj', '.lua', '.dart', '.elm', '.vue', '.svelte', '.astro',
]);

const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', 'bin', 'obj',
  'out', '.venv', 'venv', 'env', '__pycache__', '.next', '.nuxt',
  'vendor', '.cache', '.idea', '.vscode', 'coverage', '.pytest_cache',
  '.mypy_cache',
]);

function shouldSkipDirectory(dirName: string): boolean {
  return SKIP_DIRECTORIES.has(dirName) || dirName.startsWith('.');
}

function shouldIndexFile(filePath: string): boolean {
  return INDEXED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

async function walkDirectory(
  rootPath: string,
  currentPath: string = rootPath
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) continue;
        const subFiles = await walkDirectory(rootPath, fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && shouldIndexFile(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

async function processAndIndexFile(
  db: Database,
  projectId: string,
  projectPath: string,
  filePath: string
): Promise<{ chunks: number; error?: string }> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const relativePath = relative(projectPath, filePath);

    const chunks = await processFile(filePath, content);
    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    const documents = chunks.map((chunk, i) => ({
      project_id: projectId,
      file_path: relativePath,
      content_hash: chunk.contentHash,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
      embedding: embeddings[i],
      metadata: {
        file_name: filePath.split('/').pop(),
        file_extension: extname(filePath),
      },
    }));

    await db.insertDocuments(documents);

    return { chunks: documents.length };
  } catch (error) {
    return {
      chunks: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function indexProject(
  db: Database,
  params: IndexProjectParams
): Promise<IndexResult> {
  const startTime = Date.now();
  const { project_path, force_reindex = false } = params;

  const absolutePath = (await import('path')).resolve(project_path);

  // Check if directory exists
  try {
    await stat(absolutePath);
  } catch {
    return {
      project_path: absolutePath,
      project_name: project_path.split('/').pop() || project_path,
      files_processed: 0,
      chunks_indexed: 0,
      files_skipped: 0,
      indexing_time_ms: Date.now() - startTime,
      status: 'error',
      message: `Directory not found: ${absolutePath}`,
    };
  }

  const projectName = project_path.split('/').pop() || project_path;
  const project = await db.upsertProject(absolutePath, projectName);

  // Check if already indexed
  if (!force_reindex) {
    const existingStatus = await db.getProjectStatus(absolutePath);
    if (existingStatus && existingStatus.document_count > 0) {
      return {
        project_path: absolutePath,
        project_name: projectName,
        files_processed: 0,
        chunks_indexed: 0,
        files_skipped: 0,
        indexing_time_ms: Date.now() - startTime,
        status: 'success',
        message: `Already indexed (${existingStatus.document_count} chunks). Use force_reindex=true to re-index.`,
      };
    }
  }

  // Clear existing documents if force reindex
  if (force_reindex) {
    await db.deleteFileDocuments(project.id, '%');
  }

  const files = await walkDirectory(absolutePath);

  let filesProcessed = 0;
  let chunksIndexed = 0;
  let filesSkipped = 0;
  const errors: string[] = [];

  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (filePath) => {
        const result = await processAndIndexFile(db, project.id, absolutePath, filePath);
        if (result.error) {
          filesSkipped++;
          errors.push(`${filePath}: ${result.error}`);
        } else {
          filesProcessed++;
          chunksIndexed += result.chunks;
        }
      })
    );
  }

  const indexingTime = Date.now() - startTime;
  const status = errors.length > filesProcessed ? 'partial' : 'success';

  return {
    project_path: absolutePath,
    project_name: projectName,
    files_processed: filesProcessed,
    chunks_indexed: chunksIndexed,
    files_skipped: filesSkipped,
    indexing_time_ms: indexingTime,
    status,
    message: errors.length > 0
      ? `Indexed with ${errors.length} errors. First error: ${errors[0]}`
      : undefined,
  };
}

export default indexProject;
