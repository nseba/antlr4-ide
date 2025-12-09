/**
 * Shared TypeScript types for backend file persistence
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

/** API request body for creating a file */
export interface CreateFileRequest {
    name: string;
    type: FileType;
    content?: string;
}

/** API request body for updating a file */
export interface UpdateFileRequest {
    content: string;
    createCheckpoint?: boolean;
    checkpointLabel?: string;
}

/** API request body for creating a checkpoint */
export interface CreateCheckpointRequest {
    label?: string;
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

/** API response for file history */
export interface GetHistoryResponse {
    history: VersionEntry[];
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
