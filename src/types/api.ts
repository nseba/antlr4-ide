/**
 * Frontend API types matching backend types for file persistence
 */

/** File type discriminator */
export type FileType = 'grammar' | 'text';

/** Metadata stored alongside each file */
export interface FileMetadata {
    id: string;
    name: string;
    type: FileType;
    createdAt: string;
    modifiedAt: string;
}

/** A single version entry in the file history */
export interface VersionEntry {
    version: number;
    timestamp: string;
    content: string;
    description: string;
    label?: string;
}

/** Complete history for a single file */
export interface FileHistory {
    fileId: string;
    versions: VersionEntry[];
}

/** Workspace state persisted between sessions */
export interface WorkspaceState {
    openTabs: string[];
    activeTabId: string | null;
    settings: {
        startRule: string;
    };
}

/** File content with metadata */
export interface FileWithContent {
    metadata: FileMetadata;
    content: string;
}

/** API response for list files */
export interface ListFilesResponse {
    files: FileMetadata[];
}

/** API response for get file */
export interface GetFileResponse {
    metadata: FileMetadata;
    content: string;
}

/** API response for create file */
export interface CreateFileResponse {
    metadata: FileMetadata;
}

/** API response for update file */
export interface UpdateFileResponse {
    metadata: FileMetadata;
}

/** API response for file history */
export interface GetHistoryResponse {
    history: VersionEntry[];
}

/** API response for create checkpoint */
export interface CreateCheckpointResponse {
    version: VersionEntry;
}

/** API response for restore operation */
export interface RestoreVersionResponse {
    metadata: FileMetadata;
    content: string;
    newVersion: VersionEntry;
}

/** Generic API error response */
export interface ApiErrorResponse {
    error: string;
    message?: string;
    details?: unknown;
}

/** Custom error class for API errors */
export class ApiError extends Error {
    public status: number;
    public details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}
