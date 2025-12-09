import type { WorkspaceState } from '../types/api';

const API_BASE = '/api';

/** Default workspace state for first-time users */
const DEFAULT_WORKSPACE: WorkspaceState = {
    openTabs: [],
    activeTabId: null,
    settings: {
        startRule: 'expr',
    },
};

/**
 * Helper to handle API errors consistently
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Fetch the workspace state from the backend
 * Returns default workspace if no state exists yet
 */
export async function fetchWorkspace(): Promise<WorkspaceState> {
    try {
        const response = await fetch(`${API_BASE}/workspace`);
        return handleResponse<WorkspaceState>(response);
    } catch {
        // Return default workspace on error (e.g., first-time user)
        return DEFAULT_WORKSPACE;
    }
}

/**
 * Update the workspace state (supports partial updates)
 */
export async function updateWorkspace(
    updates: Partial<WorkspaceState>
): Promise<WorkspaceState> {
    const response = await fetch(`${API_BASE}/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse<WorkspaceState>(response);
}

/**
 * Update only the open tabs
 */
export async function updateOpenTabs(openTabs: string[]): Promise<WorkspaceState> {
    return updateWorkspace({ openTabs });
}

/**
 * Update only the active tab
 */
export async function updateActiveTab(activeTabId: string | null): Promise<WorkspaceState> {
    return updateWorkspace({ activeTabId });
}

/**
 * Update only the settings
 */
export async function updateSettings(
    settings: Partial<WorkspaceState['settings']>
): Promise<WorkspaceState> {
    const current = await fetchWorkspace();
    return updateWorkspace({
        settings: { ...current.settings, ...settings },
    });
}
