import { Router, Request, Response } from 'express';
import { fileStorage } from '../services/fileStorage.js';
import { historyService } from '../services/historyService.js';
import type {
    CreateCheckpointRequest,
    GetHistoryResponse,
    RestoreVersionResponse,
    ApiErrorResponse,
} from '../types.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/files/:id/history
 * Get all versions for a file
 */
router.get('/', async (req: Request, res: Response<GetHistoryResponse | ApiErrorResponse>) => {
    try {
        const { id } = req.params;

        // Check if file exists
        const metadata = await fileStorage.getMetadata(id);
        if (!metadata) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        const history = await historyService.getHistory(id);
        res.json({ history });
    } catch (error) {
        console.error('[History API] Get history error:', error);
        res.status(500).json({
            error: 'Failed to get history',
            message: (error as Error).message,
        });
    }
});

/**
 * POST /api/files/:id/history
 * Create a manual checkpoint
 */
router.post('/', async (req: Request<{ id: string }, object, CreateCheckpointRequest>, res: Response) => {
    try {
        const { id } = req.params;
        const { label } = req.body;

        // Get current file content
        const file = await fileStorage.getFile(id);
        if (!file) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        const description = label || 'Manual checkpoint';
        const version = await historyService.addVersion(id, file.content, description, label);

        res.status(201).json({ version });
    } catch (error) {
        console.error('[History API] Create checkpoint error:', error);
        res.status(500).json({
            error: 'Failed to create checkpoint',
            message: (error as Error).message,
        });
    }
});

/**
 * GET /api/files/:id/history/:version
 * Get a specific version's content
 */
router.get('/:version', async (req: Request<{ id: string; version: string }>, res: Response) => {
    try {
        const { id, version: versionStr } = req.params;
        const versionNumber = parseInt(versionStr, 10);

        if (isNaN(versionNumber) || versionNumber < 1) {
            return res.status(400).json({
                error: 'Invalid version',
                message: 'Version must be a positive integer',
            });
        }

        // Check if file exists
        const metadata = await fileStorage.getMetadata(id);
        if (!metadata) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        const versionEntry = await historyService.getVersion(id, versionNumber);
        if (!versionEntry) {
            return res.status(404).json({
                error: 'Version not found',
                message: `No version ${versionNumber} found for file ${id}`,
            });
        }

        res.json({ version: versionEntry });
    } catch (error) {
        console.error('[History API] Get version error:', error);
        res.status(500).json({
            error: 'Failed to get version',
            message: (error as Error).message,
        });
    }
});

/**
 * POST /api/files/:id/history/:version/restore
 * Restore a file to a specific version
 */
router.post('/:version/restore', async (req: Request<{ id: string; version: string }>, res: Response<RestoreVersionResponse | ApiErrorResponse>) => {
    try {
        const { id, version: versionStr } = req.params;
        const versionNumber = parseInt(versionStr, 10);

        if (isNaN(versionNumber) || versionNumber < 1) {
            return res.status(400).json({
                error: 'Invalid version',
                message: 'Version must be a positive integer',
            });
        }

        // Check if file exists
        const metadata = await fileStorage.getMetadata(id);
        if (!metadata) {
            return res.status(404).json({
                error: 'File not found',
                message: `No file found with ID: ${id}`,
            });
        }

        // Restore the version
        const result = await historyService.restoreVersion(id, versionNumber);
        if (!result) {
            return res.status(404).json({
                error: 'Version not found',
                message: `No version ${versionNumber} found for file ${id}`,
            });
        }

        // Update the file with restored content
        const updatedMetadata = await fileStorage.updateFile(id, result.content);
        if (!updatedMetadata) {
            return res.status(500).json({
                error: 'Restore failed',
                message: 'Failed to update file with restored content',
            });
        }

        res.json({
            metadata: updatedMetadata,
            content: result.content,
            newVersion: result.newVersion,
        });
    } catch (error) {
        console.error('[History API] Restore version error:', error);
        res.status(500).json({
            error: 'Failed to restore version',
            message: (error as Error).message,
        });
    }
});

export default router;
