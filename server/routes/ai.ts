/**
 * AI Chat Route
 *
 * Single endpoint for AI chat - all configuration is server-side.
 * The client only sends the conversation messages and grammar context.
 *
 * Environment variables:
 * - AI_PROVIDER: Which provider to use ('anthropic', 'openai', 'gemini'). Default: 'anthropic'
 * - AI_MODEL: Model ID to use. Default depends on provider.
 * - ANTHROPIC_API_KEY: Required if AI_PROVIDER is 'anthropic'
 * - OPENAI_API_KEY: Required if AI_PROVIDER is 'openai'
 * - GEMINI_API_KEY: Required if AI_PROVIDER is 'gemini'
 * - AI_MAX_TOKENS: Maximum tokens for response. Default: 2048
 * - AI_TEMPERATURE: Temperature for generation. Default: 0.7
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Provider configuration from environment
type AIProvider = 'anthropic' | 'openai' | 'gemini';

interface ProviderConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    gemini: 'gemini-1.5-flash',
};

function getProviderConfig(): ProviderConfig | null {
    const provider = (process.env.AI_PROVIDER || 'anthropic') as AIProvider;

    let apiKey: string | undefined;
    switch (provider) {
        case 'anthropic':
            apiKey = process.env.ANTHROPIC_API_KEY;
            break;
        case 'openai':
            apiKey = process.env.OPENAI_API_KEY;
            break;
        case 'gemini':
            apiKey = process.env.GEMINI_API_KEY;
            break;
    }

    if (!apiKey) {
        return null;
    }

    return {
        provider,
        model: process.env.AI_MODEL || DEFAULT_MODELS[provider],
        apiKey,
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    };
}

// System prompt for ANTLR4 grammar assistance
const SYSTEM_PROMPT = `You are an expert ANTLR4 grammar assistant. You help users understand, debug, and improve their ANTLR4 grammars.

Your capabilities include:
- Explaining grammar rules and their behavior
- Identifying issues like left recursion, ambiguity, and undefined rules
- Suggesting optimizations and best practices
- Helping generate new rules from descriptions
- Explaining parse errors and how to fix them

When analyzing grammars:
- Be precise about rule types (lexer vs parser rules)
- Consider both the grammar structure and the input being parsed
- Provide actionable suggestions with code examples
- Use ANTLR4 terminology correctly

Format your responses with markdown when helpful for code blocks and lists.`;

// =============================================================================
// Configuration endpoint - tells frontend if AI is available
// =============================================================================

router.get('/config', (_req: Request, res: Response) => {
    const config = getProviderConfig();
    res.json({
        available: config !== null,
    });
});

// =============================================================================
// Main chat endpoint
// =============================================================================

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequest {
    messages: ChatMessage[];
    context?: {
        grammarContent?: string;
        inputText?: string;
        startRule?: string;
        parseErrors?: string[];
        analysisIssues?: string[];
    };
    stream?: boolean;
}

router.post('/chat', async (req: Request, res: Response) => {
    try {
        const config = getProviderConfig();

        if (!config) {
            return res.status(503).json({
                error: 'AI is not configured. Set AI_PROVIDER and the corresponding API key environment variable.',
            });
        }

        const { messages, context, stream } = req.body as ChatRequest;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: 'Messages array is required',
            });
        }

        // Build context-enhanced first message if context is provided
        const enhancedMessages = [...messages];
        if (context && enhancedMessages.length > 0) {
            const firstUserIdx = enhancedMessages.findIndex(m => m.role === 'user');
            if (firstUserIdx !== -1) {
                let contextInfo = '';
                if (context.grammarContent) {
                    contextInfo += `\n\n<grammar>\n${context.grammarContent}\n</grammar>`;
                }
                if (context.inputText) {
                    contextInfo += `\n\n<input>\n${context.inputText}\n</input>`;
                }
                if (context.startRule) {
                    contextInfo += `\n\nStart rule: ${context.startRule}`;
                }
                if (context.parseErrors && context.parseErrors.length > 0) {
                    contextInfo += `\n\nParse errors:\n${context.parseErrors.join('\n')}`;
                }
                if (context.analysisIssues && context.analysisIssues.length > 0) {
                    contextInfo += `\n\nAnalysis issues:\n${context.analysisIssues.join('\n')}`;
                }

                if (contextInfo) {
                    enhancedMessages[firstUserIdx] = {
                        ...enhancedMessages[firstUserIdx],
                        content: enhancedMessages[firstUserIdx].content + contextInfo,
                    };
                }
            }
        }

        // Route to appropriate provider
        switch (config.provider) {
            case 'anthropic':
                return await handleAnthropic(req, res, config, enhancedMessages, stream);
            case 'openai':
                return await handleOpenAI(req, res, config, enhancedMessages, stream);
            case 'gemini':
                return await handleGemini(req, res, config, enhancedMessages, stream);
            default:
                return res.status(500).json({ error: 'Unknown provider configured' });
        }
    } catch (error) {
        console.error('[AI Chat] Error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// =============================================================================
// Provider Handlers
// =============================================================================

async function handleAnthropic(
    _req: Request,
    res: Response,
    config: ProviderConfig,
    messages: ChatMessage[],
    stream?: boolean
) {
    const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens,
            system: SYSTEM_PROMPT,
            messages: anthropicMessages,
            stream: stream ?? false,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
            error: errorData.error?.message || `Anthropic API error: ${response.status}`,
        });
    }

    if (stream && response.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } else {
        const data = await response.json();
        res.json({
            content: data.content?.[0]?.text || '',
        });
    }
}

async function handleOpenAI(
    _req: Request,
    res: Response,
    config: ProviderConfig,
    messages: ChatMessage[],
    stream?: boolean
) {
    const openaiMessages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            messages: openaiMessages,
            stream: stream ?? false,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
            error: errorData.error?.message || `OpenAI API error: ${response.status}`,
        });
    }

    if (stream && response.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } else {
        const data = await response.json();
        res.json({
            content: data.choices?.[0]?.message?.content || '',
        });
    }
}

async function handleGemini(
    _req: Request,
    res: Response,
    config: ProviderConfig,
    messages: ChatMessage[],
    stream?: boolean
) {
    const geminiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const endpoint = stream
        ? `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: geminiMessages,
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
                maxOutputTokens: config.maxTokens,
                temperature: config.temperature,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
            error: errorData.error?.message || `Gemini API error: ${response.status}`,
        });
    }

    if (stream && response.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } else {
        const data = await response.json();
        res.json({
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        });
    }
}

export default router;
