import { Router, Request, Response } from 'express';
import { fileStorage } from '../services/fileStorage.js';
import { historyService } from '../services/historyService.js';
import type {
    CreateFileRequest,
    UpdateFileRequest,
    ListFilesResponse,
    GetFileResponse,
    ApiErrorResponse,
} from '../types.js';

const router = Router();

/**
 * GET /api/files
 * List all files in the project
 */
router.get('/', async (_req: Request, res: Response<ListFilesResponse | ApiErrorResponse>) => {
    try {
        const files = await fileStorage.listFiles();
        res.json({ files });
    } catch (error) {
        console.error('[Files API] List files error:', error);
        res.status(500).json({
            error: 'Failed to list files',
            message: (error as Error).message,
        });
    }
});

/**
 * GET /api/files/:id
 * Get a specific file's content and metadata
 */
router.get('/:id', async (req: Request, res: Response<GetFileResponse | ApiErrorResponse>) => {
    try {
        const { id } = req.params;
        const file = await fileStorage.getFile(id);

        if (!file) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        res.json(file);
    } catch (error) {
        console.error('[Files API] Get file error:', error);
        res.status(500).json({
            error: 'Failed to get file',
            message: (error as Error).message,
        });
    }
});

/**
 * POST /api/files
 * Create a new file
 */
router.post('/', async (req: Request<object, object, CreateFileRequest>, res: Response) => {
    try {
        const { name, type, content } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Name is required and must be a string',
            });
        }

        if (!type || (type !== 'grammar' && type !== 'text')) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Type is required and must be "grammar" or "text"',
            });
        }

        const metadata = await fileStorage.createFile(name, type, content || '');

        // Create initial history entry
        await historyService.addVersion(metadata.id, content || '', 'Initial version');

        res.status(201).json({ metadata });
    } catch (error) {
        console.error('[Files API] Create file error:', error);
        res.status(500).json({
            error: 'Failed to create file',
            message: (error as Error).message,
        });
    }
});

/**
 * PUT /api/files/:id
 * Update a file's content
 */
router.put('/:id', async (req: Request<{ id: string }, object, UpdateFileRequest>, res: Response) => {
    try {
        const { id } = req.params;
        const { content, createCheckpoint, checkpointLabel } = req.body;

        if (content === undefined || typeof content !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Content is required and must be a string',
            });
        }

        // Check if file exists
        const existingFile = await fileStorage.getFile(id);
        if (!existingFile) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        // Create checkpoint before saving if requested
        if (createCheckpoint) {
            const description = checkpointLabel || 'Manual checkpoint';
            await historyService.addVersion(id, existingFile.content, description);
        }

        const metadata = await fileStorage.updateFile(id, content);

        res.json({ metadata });
    } catch (error) {
        console.error('[Files API] Update file error:', error);
        res.status(500).json({
            error: 'Failed to update file',
            message: (error as Error).message,
        });
    }
});

/**
 * PATCH /api/files/:id
 * Rename a file
 */
router.patch('/:id', async (req: Request<{ id: string }, object, { name: string }>, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Name is required and must be a string',
            });
        }

        const metadata = await fileStorage.renameFile(id, name);

        if (!metadata) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        res.json({ metadata });
    } catch (error) {
        console.error('[Files API] Rename file error:', error);
        res.status(500).json({
            error: 'Failed to rename file',
            message: (error as Error).message,
        });
    }
});

/**
 * DELETE /api/files/:id
 * Delete a file and its history
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = await fileStorage.deleteFile(id);

        if (!success) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        // Also delete the file's history
        await historyService.deleteHistory(id);

        res.json({ success: true });
    } catch (error) {
        console.error('[Files API] Delete file error:', error);
        res.status(500).json({
            error: 'Failed to delete file',
            message: (error as Error).message,
        });
    }
});

export default router;
