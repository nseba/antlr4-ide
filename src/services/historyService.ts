import type {
    VersionEntry,
    GetHistoryResponse,
    CreateCheckpointResponse,
    RestoreVersionResponse,
} from '../types/api';

const API_BASE = '/api';

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
 * Fetch the version history for a file
 */
export async function fetchHistory(fileId: string): Promise<VersionEntry[]> {
    const response = await fetch(`${API_BASE}/files/${fileId}/history`);
    const data = await handleResponse<GetHistoryResponse>(response);
    return data.history;
}

/**
 * Create a manual checkpoint for a file
 */
export async function createCheckpoint(
    fileId: string,
    label?: string
): Promise<VersionEntry> {
    const response = await fetch(`${API_BASE}/files/${fileId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
    });
    const data = await handleResponse<CreateCheckpointResponse>(response);
    return data.version;
}

/**
 * Get a specific version of a file
 */
export async function fetchVersion(
    fileId: string,
    versionNumber: number
): Promise<VersionEntry> {
    const response = await fetch(`${API_BASE}/files/${fileId}/history/${versionNumber}`);
    const data = await handleResponse<{ version: VersionEntry }>(response);
    return data.version;
}

/**
 * Restore a file to a specific version
 */
export async function restoreVersion(
    fileId: string,
    versionNumber: number
): Promise<RestoreVersionResponse> {
    const response = await fetch(
        `${API_BASE}/files/${fileId}/history/${versionNumber}/restore`,
        { method: 'POST' }
    );
    return handleResponse<RestoreVersionResponse>(response);
}
