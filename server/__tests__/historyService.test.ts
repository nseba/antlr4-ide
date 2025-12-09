import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HistoryService } from '../services/historyService.js';

describe('HistoryService', () => {
    let service: HistoryService;
    const testDataDir = './data/test-history';

    beforeEach(async () => {
        service = new HistoryService(testDataDir);
        await fs.mkdir(testDataDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDataDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('getHistory', () => {
        it('should return empty array for new file', async () => {
            const history = await service.getHistory('non-existent-file');
            expect(history).toEqual([]);
        });

        it('should return versions in order', async () => {
            const fileId = 'test-file-1';

            await service.addVersion(fileId, 'v1 content', 'First version');
            await service.addVersion(fileId, 'v2 content', 'Second version');
            await service.addVersion(fileId, 'v3 content', 'Third version');

            const history = await service.getHistory(fileId);

            expect(history).toHaveLength(3);
            expect(history[0].version).toBe(1);
            expect(history[1].version).toBe(2);
            expect(history[2].version).toBe(3);
        });
    });

    describe('addVersion', () => {
        it('should auto-increment version numbers starting from 1', async () => {
            const fileId = 'test-file';

            const v1 = await service.addVersion(fileId, 'content 1', 'First');
            const v2 = await service.addVersion(fileId, 'content 2', 'Second');
            const v3 = await service.addVersion(fileId, 'content 3', 'Third');

            expect(v1.version).toBe(1);
            expect(v2.version).toBe(2);
            expect(v3.version).toBe(3);
        });

        it('should store content in version entry', async () => {
            const fileId = 'test-file';
            const content = 'grammar Test;\nrule : ID ;';

            const version = await service.addVersion(fileId, content, 'Test version');

            expect(version.content).toBe(content);
        });

        it('should store description and optional label', async () => {
            const fileId = 'test-file';

            const v1 = await service.addVersion(fileId, 'content', 'AI: Refactoring', 'Auto-refactor');
            const v2 = await service.addVersion(fileId, 'content', 'Manual save');

            expect(v1.description).toBe('AI: Refactoring');
            expect(v1.label).toBe('Auto-refactor');
            expect(v2.description).toBe('Manual save');
            expect(v2.label).toBeUndefined();
        });

        it('should store timestamp', async () => {
            const before = new Date();
            const version = await service.addVersion('test-file', 'content', 'Test');
            const after = new Date();

            const timestamp = new Date(version.timestamp);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should persist to history file', async () => {
            const fileId = 'persist-test';
            await service.addVersion(fileId, 'content', 'Test');

            const historyPath = path.join(testDataDir, `${fileId}.history.json`);
            const content = await fs.readFile(historyPath, 'utf-8');
            const history = JSON.parse(content);

            expect(history.fileId).toBe(fileId);
            expect(history.versions).toHaveLength(1);
        });
    });

    describe('getVersion', () => {
        it('should return specific version', async () => {
            const fileId = 'test-file';

            await service.addVersion(fileId, 'v1 content', 'First');
            await service.addVersion(fileId, 'v2 content', 'Second');
            await service.addVersion(fileId, 'v3 content', 'Third');

            const version = await service.getVersion(fileId, 2);

            expect(version).not.toBeNull();
            expect(version!.version).toBe(2);
            expect(version!.content).toBe('v2 content');
            expect(version!.description).toBe('Second');
        });

        it('should return null for non-existent version', async () => {
            const fileId = 'test-file';
            await service.addVersion(fileId, 'content', 'First');

            const version = await service.getVersion(fileId, 999);
            expect(version).toBeNull();
        });

        it('should return null for non-existent file', async () => {
            const version = await service.getVersion('non-existent', 1);
            expect(version).toBeNull();
        });
    });

    describe('restoreVersion', () => {
        it('should create new version with restored content', async () => {
            const fileId = 'restore-test';

            await service.addVersion(fileId, 'v1 content', 'First');
            await service.addVersion(fileId, 'v2 content', 'Second');
            await service.addVersion(fileId, 'v3 content', 'Third');

            const result = await service.restoreVersion(fileId, 1);

            expect(result).not.toBeNull();
            expect(result!.content).toBe('v1 content');
            expect(result!.newVersion.version).toBe(4);
            expect(result!.newVersion.description).toBe('Restored from version 1');
        });

        it('should preserve forward history (strictly linear)', async () => {
            const fileId = 'linear-test';

            await service.addVersion(fileId, 'v1', 'First');
            await service.addVersion(fileId, 'v2', 'Second');
            await service.addVersion(fileId, 'v3', 'Third');

            await service.restoreVersion(fileId, 1);

            const history = await service.getHistory(fileId);

            // Should have 4 versions: original 3 + restored
            expect(history).toHaveLength(4);
            expect(history[0].version).toBe(1);
            expect(history[1].version).toBe(2);
            expect(history[2].version).toBe(3);
            expect(history[3].version).toBe(4);
        });

        it('should return null for non-existent version', async () => {
            const fileId = 'test-file';
            await service.addVersion(fileId, 'content', 'First');

            const result = await service.restoreVersion(fileId, 999);
            expect(result).toBeNull();
        });
    });

    describe('deleteHistory', () => {
        it('should delete history file', async () => {
            const fileId = 'delete-test';
            await service.addVersion(fileId, 'content', 'Test');

            const historyPath = path.join(testDataDir, `${fileId}.history.json`);
            await expect(fs.access(historyPath)).resolves.not.toThrow();

            await service.deleteHistory(fileId);

            await expect(fs.access(historyPath)).rejects.toThrow();
        });

        it('should return true if file does not exist', async () => {
            const result = await service.deleteHistory('non-existent');
            expect(result).toBe(true);
        });
    });

    describe('persistence across restarts', () => {
        it('should persist history across service instances', async () => {
            const fileId = 'persist-test';

            // Add versions with first service instance
            await service.addVersion(fileId, 'v1', 'First');
            await service.addVersion(fileId, 'v2', 'Second');

            // Create new service instance (simulates restart)
            const newService = new HistoryService(testDataDir);

            // Should retrieve existing history
            const history = await newService.getHistory(fileId);
            expect(history).toHaveLength(2);

            // Should continue version numbering
            const v3 = await newService.addVersion(fileId, 'v3', 'Third');
            expect(v3.version).toBe(3);
        });
    });
});
