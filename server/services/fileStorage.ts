import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata, FileType, FileWithContent } from '../types.js';

/**
 * Service for managing file storage on the filesystem.
 * Files are stored with metadata sidecar files.
 */
export class FileStorageService {
    private dataDir: string;

    constructor(dataDir?: string) {
        this.dataDir = dataDir || process.env.DATA_DIR || './data/projects';
    }

    /**
     * Ensure the data directory exists, creating it if necessary.
     */
    async ensureDataDir(): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            console.log(`[FileStorage] Data directory ready: ${this.dataDir}`);
        } catch (error) {
            console.error(`[FileStorage] Failed to create data directory: ${this.dataDir}`, error);
            throw error;
        }
    }

    /**
     * Get the file extension for a given file type.
     */
    private getExtension(type: FileType): string {
        return type === 'grammar' ? '.g4' : '.txt';
    }

    /**
     * Get the path to the actual content file.
     */
    private getFilePath(id: string, type: FileType): string {
        return path.join(this.dataDir, `${id}${this.getExtension(type)}`);
    }

    /**
     * Get the path to the metadata sidecar file.
     */
    private getMetadataPath(id: string): string {
        return path.join(this.dataDir, `${id}.meta.json`);
    }

    /**
     * List all files in the data directory.
     */
    async listFiles(): Promise<FileMetadata[]> {
        await this.ensureDataDir();

        const files = await fs.readdir(this.dataDir);
        const metadataFiles = files.filter(f => f.endsWith('.meta.json'));

        const metadataList: FileMetadata[] = [];

        for (const metaFile of metadataFiles) {
            try {
                const metaPath = path.join(this.dataDir, metaFile);
                const content = await fs.readFile(metaPath, 'utf-8');
                const metadata = JSON.parse(content) as FileMetadata;
                metadataList.push(metadata);
            } catch (error) {
                console.warn(`[FileStorage] Failed to read metadata file: ${metaFile}`, error);
            }
        }

        // Sort by name
        metadataList.sort((a, b) => a.name.localeCompare(b.name));

        return metadataList;
    }

    /**
     * Get a file's metadata by ID.
     */
    async getMetadata(id: string): Promise<FileMetadata | null> {
        try {
            const metaPath = this.getMetadataPath(id);
            const content = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(content) as FileMetadata;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get a file's content and metadata by ID.
     */
    async getFile(id: string): Promise<FileWithContent | null> {
        const metadata = await this.getMetadata(id);
        if (!metadata) {
            return null;
        }

        try {
            const filePath = this.getFilePath(id, metadata.type);
            const content = await fs.readFile(filePath, 'utf-8');
            return { metadata, content };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create a new file with generated UUID.
     */
    async createFile(name: string, type: FileType, content: string = ''): Promise<FileMetadata> {
        await this.ensureDataDir();

        const id = uuidv4();
        const now = new Date().toISOString();

        const metadata: FileMetadata = {
            id,
            name,
            type,
            createdAt: now,
            modifiedAt: now,
        };

        // Write metadata file
        const metaPath = this.getMetadataPath(id);
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

        // Write content file
        const filePath = this.getFilePath(id, type);
        await fs.writeFile(filePath, content, 'utf-8');

        console.log(`[FileStorage] Created file: ${name} (${id})`);

        return metadata;
    }

    /**
     * Update a file's content.
     */
    async updateFile(id: string, content: string): Promise<FileMetadata | null> {
        const metadata = await this.getMetadata(id);
        if (!metadata) {
            return null;
        }

        // Update content file
        const filePath = this.getFilePath(id, metadata.type);
        await fs.writeFile(filePath, content, 'utf-8');

        // Update metadata with new modifiedAt timestamp
        metadata.modifiedAt = new Date().toISOString();
        const metaPath = this.getMetadataPath(id);
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

        console.log(`[FileStorage] Updated file: ${metadata.name} (${id})`);

        return metadata;
    }

    /**
     * Rename a file.
     */
    async renameFile(id: string, newName: string): Promise<FileMetadata | null> {
        const metadata = await this.getMetadata(id);
        if (!metadata) {
            return null;
        }

        // Update metadata with new name and modifiedAt timestamp
        metadata.name = newName;
        metadata.modifiedAt = new Date().toISOString();
        const metaPath = this.getMetadataPath(id);
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

        console.log(`[FileStorage] Renamed file to: ${newName} (${id})`);

        return metadata;
    }

    /**
     * Delete a file and its metadata.
     */
    async deleteFile(id: string): Promise<boolean> {
        const metadata = await this.getMetadata(id);
        if (!metadata) {
            return false;
        }

        try {
            // Delete content file
            const filePath = this.getFilePath(id, metadata.type);
            await fs.unlink(filePath).catch(() => {});

            // Delete metadata file
            const metaPath = this.getMetadataPath(id);
            await fs.unlink(metaPath).catch(() => {});

            // Delete history file if it exists
            const historyPath = path.join(this.dataDir, `${id}.history.json`);
            await fs.unlink(historyPath).catch(() => {});

            console.log(`[FileStorage] Deleted file: ${metadata.name} (${id})`);

            return true;
        } catch (error) {
            console.error(`[FileStorage] Failed to delete file: ${id}`, error);
            return false;
        }
    }

    /**
     * Check if any files exist in the data directory.
     */
    async hasFiles(): Promise<boolean> {
        const files = await this.listFiles();
        return files.length > 0;
    }

    /**
     * Get the data directory path.
     */
    getDataDir(): string {
        return this.dataDir;
    }
}

// Default singleton instance
export const fileStorage = new FileStorageService();
