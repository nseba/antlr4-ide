import type {
    FileMetadata,
    FileType,
    FileWithContent,
    ListFilesResponse,
    CreateFileResponse,
    UpdateFileResponse,
    ApiError,
} from '../types/api';

const API_BASE = '/api';

/**
 * Helper to handle API errors consistently
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `API error: ${response.status}`) as ApiError;
        error.status = response.status;
        error.details = errorData.details;
        throw error;
    }
    return response.json();
}

/**
 * Fetch all files from the backend
 */
export async function fetchFiles(): Promise<FileMetadata[]> {
    const response = await fetch(`${API_BASE}/files`);
    const data = await handleResponse<ListFilesResponse>(response);
    return data.files;
}

/**
 * Fetch a single file by ID
 */
export async function fetchFile(id: string): Promise<FileWithContent> {
    const response = await fetch(`${API_BASE}/files/${id}`);
    return handleResponse<FileWithContent>(response);
}

/**
 * Create a new file
 */
export async function createFile(
    name: string,
    type: FileType,
    content?: string
): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, content }),
    });
    const data = await handleResponse<CreateFileResponse>(response);
    return data.metadata;
}

/**
 * Update a file's content
 * @param id - File ID
 * @param content - New file content
 * @param createCheckpoint - If true, creates a version history checkpoint before saving
 * @param checkpointLabel - Optional label for the checkpoint
 */
export async function updateFile(
    id: string,
    content: string,
    createCheckpoint?: boolean,
    checkpointLabel?: string
): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE}/files/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, createCheckpoint, checkpointLabel }),
    });
    const data = await handleResponse<UpdateFileResponse>(response);
    return data.metadata;
}

/**
 * Rename a file
 */
export async function renameFile(id: string, newName: string): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE}/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
    });
    const data = await handleResponse<UpdateFileResponse>(response);
    return data.metadata;
}

/**
 * Delete a file
 */
export async function deleteFile(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/files/${id}`, {
        method: 'DELETE',
    });
    const data = await handleResponse<{ success: boolean }>(response);
    return data.success;
}
