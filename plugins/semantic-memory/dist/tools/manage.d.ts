/**
 * Management tools for the MCP server
 */
import { Database, ProjectStatus } from '../database.js';
/**
 * Get project status
 */
export declare function getProjectStatus(db: Database, projectPath: string): Promise<ProjectStatus | null>;
/**
 * Delete project
 */
export declare function deleteProject(db: Database, projectPath: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * List all projects
 */
export declare function listProjects(db: Database): Promise<{
    projects: ProjectStatus[];
    count: number;
}>;
declare const _default: {
    getProjectStatus: typeof getProjectStatus;
    deleteProject: typeof deleteProject;
    listProjects: typeof listProjects;
};
export default _default;
//# sourceMappingURL=manage.d.ts.map