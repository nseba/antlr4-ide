import express, { Request, Response } from 'express';
import cors from 'cors';
import { parseANTLRGrammar } from '../src/utils/antlr/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    } catch (error: any) {
        console.error('[API] Parse error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ANTLR4 Lab Backend Server running on http://localhost:${PORT}`);
    console.log(`   - Health check: http://localhost:${PORT}/health`);
    console.log(`   - Parse API: http://localhost:${PORT}/api/parse`);
});
