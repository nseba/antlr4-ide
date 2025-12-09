import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorkspaceState, ApiErrorResponse } from '../types.js';

const router = Router();

// Default workspace state for new users
const DEFAULT_WORKSPACE: WorkspaceState = {
    openTabs: [],
    activeTabId: null,
    settings: {
        startRule: 'expr',
    },
};

/**
 * Get the path to the workspace state file.
 */
function getWorkspacePath(): string {
    const dataDir = process.env.DATA_DIR || './data/projects';
    return path.join(dataDir, 'workspace.json');
}

/**
 * Ensure the data directory exists.
 */
async function ensureDataDir(): Promise<void> {
    const dataDir = process.env.DATA_DIR || './data/projects';
    await fs.mkdir(dataDir, { recursive: true });
}

/**
 * GET /api/workspace
 * Get the current workspace state
 */
router.get('/', async (_req: Request, res: Response<WorkspaceState | ApiErrorResponse>) => {
    try {
        const workspacePath = getWorkspacePath();

        try {
            const content = await fs.readFile(workspacePath, 'utf-8');
            const workspace = JSON.parse(content) as WorkspaceState;
            res.json(workspace);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // Return default workspace for first-time users
                res.json(DEFAULT_WORKSPACE);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('[Workspace API] Get workspace error:', error);
        res.status(500).json({
            error: 'Failed to get workspace',
            message: (error as Error).message,
        });
    }
});

/**
 * PUT /api/workspace
 * Update the workspace state (partial updates supported)
 */
router.put('/', async (req: Request<object, object, Partial<WorkspaceState>>, res: Response<WorkspaceState | ApiErrorResponse>) => {
    try {
        await ensureDataDir();
        const workspacePath = getWorkspacePath();

        // Get existing workspace or use default
        let currentWorkspace = DEFAULT_WORKSPACE;
        try {
            const content = await fs.readFile(workspacePath, 'utf-8');
            currentWorkspace = JSON.parse(content) as WorkspaceState;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }

        // Merge updates
        const updatedWorkspace: WorkspaceState = {
            ...currentWorkspace,
            ...req.body,
            settings: {
                ...currentWorkspace.settings,
                ...(req.body.settings || {}),
            },
        };

        // Save updated workspace
        await fs.writeFile(workspacePath, JSON.stringify(updatedWorkspace, null, 2), 'utf-8');

        console.log('[Workspace API] Updated workspace state');

        res.json(updatedWorkspace);
    } catch (error) {
        console.error('[Workspace API] Update workspace error:', error);
        res.status(500).json({
            error: 'Failed to update workspace',
            message: (error as Error).message,
        });
    }
});

export default router;
