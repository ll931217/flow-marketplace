/**
 * Index project tool for the MCP server
 */
import { Database } from '../database.js';
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
export declare function indexProject(db: Database, params: IndexProjectParams): Promise<IndexResult>;
export default indexProject;
//# sourceMappingURL=index.d.ts.map