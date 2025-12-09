import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorageService } from '../services/fileStorage.js';

describe('FileStorageService', () => {
    let service: FileStorageService;
    const testDataDir = './data/test-projects';

    beforeEach(async () => {
        service = new FileStorageService(testDataDir);
        await service.ensureDataDir();
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDataDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('ensureDataDir', () => {
        it('should create the data directory if it does not exist', async () => {
            const newDir = './data/test-new-dir';
            const newService = new FileStorageService(newDir);

            await newService.ensureDataDir();

            const stat = await fs.stat(newDir);
            expect(stat.isDirectory()).toBe(true);

            // Clean up
            await fs.rm(newDir, { recursive: true, force: true });
        });

        it('should not fail if directory already exists', async () => {
            await service.ensureDataDir();
            await expect(service.ensureDataDir()).resolves.not.toThrow();
        });
    });

    describe('createFile', () => {
        it('should create a file with auto-generated UUID', async () => {
            const metadata = await service.createFile('test.g4', 'grammar', 'grammar Test;');

            expect(metadata.id).toBeDefined();
            expect(metadata.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(metadata.name).toBe('test.g4');
            expect(metadata.type).toBe('grammar');
            expect(metadata.createdAt).toBeDefined();
            expect(metadata.modifiedAt).toBeDefined();
        });

        it('should create grammar file with .g4 extension', async () => {
            const metadata = await service.createFile('test.g4', 'grammar', 'grammar Test;');
            const filePath = path.join(testDataDir, `${metadata.id}.g4`);

            const content = await fs.readFile(filePath, 'utf-8');
            expect(content).toBe('grammar Test;');
        });

        it('should create text file with .txt extension', async () => {
            const metadata = await service.createFile('input.txt', 'text', 'hello world');
            const filePath = path.join(testDataDir, `${metadata.id}.txt`);

            const content = await fs.readFile(filePath, 'utf-8');
            expect(content).toBe('hello world');
        });

        it('should create metadata sidecar file', async () => {
            const metadata = await service.createFile('test.g4', 'grammar');
            const metaPath = path.join(testDataDir, `${metadata.id}.meta.json`);

            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const savedMeta = JSON.parse(metaContent);

            expect(savedMeta.id).toBe(metadata.id);
            expect(savedMeta.name).toBe('test.g4');
            expect(savedMeta.type).toBe('grammar');
        });
    });

    describe('listFiles', () => {
        it('should return empty array when no files exist', async () => {
            const files = await service.listFiles();
            expect(files).toEqual([]);
        });

        it('should return all files sorted by name', async () => {
            await service.createFile('zeta.g4', 'grammar');
            await service.createFile('alpha.txt', 'text');
            await service.createFile('beta.g4', 'grammar');

            const files = await service.listFiles();

            expect(files).toHaveLength(3);
            expect(files[0].name).toBe('alpha.txt');
            expect(files[1].name).toBe('beta.g4');
            expect(files[2].name).toBe('zeta.g4');
        });
    });

    describe('getFile', () => {
        it('should return file content and metadata', async () => {
            const created = await service.createFile('test.g4', 'grammar', 'grammar Test;');

            const file = await service.getFile(created.id);

            expect(file).not.toBeNull();
            expect(file!.metadata.id).toBe(created.id);
            expect(file!.metadata.name).toBe('test.g4');
            expect(file!.content).toBe('grammar Test;');
        });

        it('should return null for non-existent file', async () => {
            const file = await service.getFile('non-existent-id');
            expect(file).toBeNull();
        });
    });

    describe('updateFile', () => {
        it('should update file content', async () => {
            const created = await service.createFile('test.g4', 'grammar', 'old content');

            await service.updateFile(created.id, 'new content');

            const file = await service.getFile(created.id);
            expect(file!.content).toBe('new content');
        });

        it('should update modifiedAt timestamp', async () => {
            const created = await service.createFile('test.g4', 'grammar');
            const originalModified = created.modifiedAt;

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            const updated = await service.updateFile(created.id, 'updated');

            expect(updated!.modifiedAt).not.toBe(originalModified);
            expect(new Date(updated!.modifiedAt).getTime()).toBeGreaterThan(
                new Date(originalModified).getTime()
            );
        });

        it('should return null for non-existent file', async () => {
            const result = await service.updateFile('non-existent', 'content');
            expect(result).toBeNull();
        });
    });

    describe('renameFile', () => {
        it('should rename a file', async () => {
            const created = await service.createFile('old-name.g4', 'grammar');

            const renamed = await service.renameFile(created.id, 'new-name.g4');

            expect(renamed!.name).toBe('new-name.g4');
            expect(renamed!.id).toBe(created.id);
        });

        it('should return null for non-existent file', async () => {
            const result = await service.renameFile('non-existent', 'new-name.g4');
            expect(result).toBeNull();
        });
    });

    describe('deleteFile', () => {
        it('should delete file and metadata', async () => {
            const created = await service.createFile('test.g4', 'grammar', 'content');

            const success = await service.deleteFile(created.id);

            expect(success).toBe(true);
            expect(await service.getFile(created.id)).toBeNull();
        });

        it('should return false for non-existent file', async () => {
            const success = await service.deleteFile('non-existent');
            expect(success).toBe(false);
        });

        it('should also delete history file if it exists', async () => {
            const created = await service.createFile('test.g4', 'grammar');
            const historyPath = path.join(testDataDir, `${created.id}.history.json`);
            await fs.writeFile(historyPath, JSON.stringify({ versions: [] }));

            await service.deleteFile(created.id);

            await expect(fs.access(historyPath)).rejects.toThrow();
        });
    });

    describe('hasFiles', () => {
        it('should return false when no files exist', async () => {
            const has = await service.hasFiles();
            expect(has).toBe(false);
        });

        it('should return true when files exist', async () => {
            await service.createFile('test.g4', 'grammar');

            const has = await service.hasFiles();
            expect(has).toBe(true);
        });
    });
});
