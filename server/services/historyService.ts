import * as fs from 'fs/promises';
import * as path from 'path';
import type { VersionEntry, FileHistory } from '../types.js';

/**
 * Service for managing file version history.
 * Each file has a separate history JSON file.
 */
export class HistoryService {
    private dataDir: string;

    constructor(dataDir?: string) {
        this.dataDir = dataDir || process.env.DATA_DIR || './data/projects';
    }

    /**
     * Get the path to a file's history JSON file.
     */
    private getHistoryPath(fileId: string): string {
        return path.join(this.dataDir, `${fileId}.history.json`);
    }

    /**
     * Get the complete history for a file.
     */
    async getHistory(fileId: string): Promise<VersionEntry[]> {
        try {
            const historyPath = this.getHistoryPath(fileId);
            const content = await fs.readFile(historyPath, 'utf-8');
            const history = JSON.parse(content) as FileHistory;
            return history.versions;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Add a new version to a file's history.
     */
    async addVersion(fileId: string, content: string, description: string, label?: string): Promise<VersionEntry> {
        const versions = await this.getHistory(fileId);

        const nextVersion = versions.length > 0
            ? Math.max(...versions.map(v => v.version)) + 1
            : 1;

        const newEntry: VersionEntry = {
            version: nextVersion,
            timestamp: new Date().toISOString(),
            content,
            description,
            label,
        };

        versions.push(newEntry);

        const history: FileHistory = {
            fileId,
            versions,
        };

        const historyPath = this.getHistoryPath(fileId);
        await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

        console.log(`[HistoryService] Added version ${nextVersion} for file ${fileId}: ${description}`);

        return newEntry;
    }

    /**
     * Get a specific version's content.
     */
    async getVersion(fileId: string, versionNumber: number): Promise<VersionEntry | null> {
        const versions = await this.getHistory(fileId);
        return versions.find(v => v.version === versionNumber) || null;
    }

    /**
     * Restore a file to a specific version.
     * Creates a new version entry with "Restored from version N" description.
     * Returns the content of the restored version.
     */
    async restoreVersion(fileId: string, versionNumber: number): Promise<{ content: string; newVersion: VersionEntry } | null> {
        const targetVersion = await this.getVersion(fileId, versionNumber);
        if (!targetVersion) {
            return null;
        }

        // Create a new version entry for the restore
        const newVersion = await this.addVersion(
            fileId,
            targetVersion.content,
            `Restored from version ${versionNumber}`
        );

        return {
            content: targetVersion.content,
            newVersion,
        };
    }

    /**
     * Delete a file's history.
     */
    async deleteHistory(fileId: string): Promise<boolean> {
        try {
            const historyPath = this.getHistoryPath(fileId);
            await fs.unlink(historyPath);
            console.log(`[HistoryService] Deleted history for file ${fileId}`);
            return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return true; // File didn't exist, consider it a success
            }
            console.error(`[HistoryService] Failed to delete history for file ${fileId}`, error);
            return false;
        }
    }

    /**
     * Delete specific versions from history (optional cleanup).
     */
    async deleteVersions(fileId: string, versionNumbers: number[]): Promise<boolean> {
        const versions = await this.getHistory(fileId);
        const filteredVersions = versions.filter(v => !versionNumbers.includes(v.version));

        const history: FileHistory = {
            fileId,
            versions: filteredVersions,
        };

        const historyPath = this.getHistoryPath(fileId);
        await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

        return true;
    }

    /**
     * Set the data directory path.
     */
    setDataDir(dataDir: string): void {
        this.dataDir = dataDir;
    }
}

// Default singleton instance
export const historyService = new HistoryService();
