/**
 * Management tools for the MCP server
 */
/**
 * Get project status
 */
export async function getProjectStatus(db, projectPath) {
    return db.getProjectStatus(projectPath);
}
/**
 * Delete project
 */
export async function deleteProject(db, projectPath) {
    const status = await db.getProjectStatus(projectPath);
    if (!status) {
        return {
            success: false,
            message: `Project not found: ${projectPath}`,
        };
    }
    const deleted = await db.deleteProject(projectPath);
    if (deleted) {
        return {
            success: true,
            message: `Deleted project: ${projectPath} (${status.document_count} chunks removed)`,
        };
    }
    return {
        success: false,
        message: `Failed to delete project: ${projectPath}`,
    };
}
/**
 * List all projects
 */
export async function listProjects(db) {
    const projects = await db.listProjects();
    const statuses = [];
    for (const project of projects) {
        const status = await db.getProjectStatus(project.project_path);
        if (status) {
            statuses.push(status);
        }
    }
    return {
        projects: statuses,
        count: statuses.length,
    };
}
export default {
    getProjectStatus,
    deleteProject,
    listProjects,
};
//# sourceMappingURL=manage.js.map