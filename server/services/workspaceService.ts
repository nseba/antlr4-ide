import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorkspaceState } from '../types.js';

/**
 * Service for managing workspace state.
 */
export class WorkspaceService {
    private dataDir: string;

    constructor(dataDir?: string) {
        this.dataDir = dataDir || process.env.DATA_DIR || './data/projects';
    }

    /**
     * Get the path to the workspace state file.
     */
    private getWorkspacePath(): string {
        return path.join(this.dataDir, 'workspace.json');
    }

    /**
     * Get the current workspace state.
     */
    async getWorkspace(): Promise<WorkspaceState | null> {
        try {
            const content = await fs.readFile(this.getWorkspacePath(), 'utf-8');
            return JSON.parse(content) as WorkspaceState;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Update the workspace state (creates new if doesn't exist).
     */
    async updateWorkspace(updates: Partial<WorkspaceState>): Promise<WorkspaceState> {
        // Ensure data directory exists
        await fs.mkdir(this.dataDir, { recursive: true });

        // Get current workspace or use defaults
        const current = await this.getWorkspace() || {
            openTabs: [],
            activeTabId: null,
            settings: { startRule: 'expr' },
        };

        // Merge updates
        const updated: WorkspaceState = {
            ...current,
            ...updates,
            settings: {
                ...current.settings,
                ...(updates.settings || {}),
            },
        };

        // Save
        await fs.writeFile(
            this.getWorkspacePath(),
            JSON.stringify(updated, null, 2),
            'utf-8'
        );

        return updated;
    }
}

// Default singleton instance
export const workspaceService = new WorkspaceService();
