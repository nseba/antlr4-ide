import express, { Request, Response } from 'express';
import cors from 'cors';
import { parseANTLRGrammar } from '../src/utils/antlr/index.js';
import { fileStorage } from './services/fileStorage.js';
import { historyService } from './services/historyService.js';
import filesRouter from './routes/files.js';
import historyRouter from './routes/history.js';
import workspaceRouter from './routes/workspace.js';
import aiRouter from './routes/ai.js';
import { workspaceService } from './services/workspaceService.js';

// Seed data for first-time users
const SEED_GRAMMAR = `grammar Expr;

expr:   term (('+'|'-') term)* ;
term:   factor (('*'|'/') factor)* ;
factor: NUMBER | '(' expr ')' ;

NUMBER: [0-9]+ ;
WS:     [ \\t\\r\\n]+ -> skip ;
`;

const SEED_INPUT = `(10 + 20) * 3`;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// File persistence API routes
app.use('/api/files', filesRouter);
app.use('/api/files/:id/history', historyRouter);
app.use('/api/workspace', workspaceRouter);

// AI proxy routes
app.use('/api/ai', aiRouter);

// Parse endpoint
app.post('/api/parse', async (req: Request, res: Response) => {
    try {
        const { grammarFiles, inputText, startRule } = req.body;

        // Validate request
        if (!grammarFiles || !Array.isArray(grammarFiles)) {
            return res.status(400).json({
                error: 'Invalid request: grammarFiles must be an array'
            });
        }

        if (!inputText || typeof inputText !== 'string') {
            return res.status(400).json({
                error: 'Invalid request: inputText must be a string'
            });
        }

        if (!startRule || typeof startRule !== 'string') {
            return res.status(400).json({
                error: 'Invalid request: startRule must be a string'
            });
        }

        // Validate grammar files format
        for (const file of grammarFiles) {
            if (!file.name || !file.content) {
                return res.status(400).json({
                    error: 'Invalid request: each grammar file must have name and content'
                });
            }
        }

        console.log(`[API] Parsing with ${grammarFiles.length} grammar file(s), start rule: ${startRule}`);

        // Parse the grammar
        const result = await parseANTLRGrammar(grammarFiles, inputText, startRule);

        console.log(`[API] Parse completed in ${result.duration}ms`);

        res.json(result);
    } catch (err) {
        const error = err as Error;
        console.error('[API] Parse error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Create seed data for first-time users (empty data directory).
 * Creates a sample grammar file and input file to help users get started.
 */
async function createSeedData(): Promise<void> {
    const hasFiles = await fileStorage.hasFiles();
    if (hasFiles) {
        console.log('📂 Existing files found, skipping seed data creation');
        return;
    }

    console.log('🌱 Creating seed data for first-time user...');

    try {
        // Create the grammar file
        const grammar = await fileStorage.createFile('Expr.g4', 'grammar', SEED_GRAMMAR);
        // Create initial history entry for the grammar
        await historyService.addVersion(grammar.id, SEED_GRAMMAR, 'Initial version');
        console.log(`   ✓ Created ${grammar.name}`);

        // Create the input file
        const input = await fileStorage.createFile('input.txt', 'text', SEED_INPUT);
        // Create initial history entry for the input
        await historyService.addVersion(input.id, SEED_INPUT, 'Initial version');
        console.log(`   ✓ Created ${input.name}`);

        // Create workspace with these files open
        await workspaceService.updateWorkspace({
            openTabs: [grammar.id, input.id],
            activeTabId: grammar.id,
            settings: { startRule: 'expr' }
        });
        console.log('   ✓ Created workspace.json');

        console.log('🌱 Seed data created successfully');
    } catch (error) {
        console.error('⚠️ Failed to create seed data:', error);
        // Don't fail startup if seed data creation fails
    }
}

// Initialize and start server
async function startServer() {
    try {
        // Ensure data directory exists
        await fileStorage.ensureDataDir();
        const dataDir = fileStorage.getDataDir();
        console.log(`📁 Data directory: ${dataDir}`);

        // Create seed data if this is a fresh install
        await createSeedData();

        // Start listening
        app.listen(PORT, () => {
            console.log(`🚀 ANTLR4 Lab Backend Server running on http://localhost:${PORT}`);
            console.log(`   - Health check: http://localhost:${PORT}/health`);
            console.log(`   - Parse API: http://localhost:${PORT}/api/parse`);
            console.log(`   - Files API: http://localhost:${PORT}/api/files`);
            console.log(`   - Workspace API: http://localhost:${PORT}/api/workspace`);
            console.log(`   - AI API: http://localhost:${PORT}/api/ai`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
