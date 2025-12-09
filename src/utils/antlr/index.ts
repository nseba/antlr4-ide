import { JavaParser } from './JavaParser';
import { ParseResult } from './types';

export type { Token, ParseNode, ParseError, ParseResult, GrammarInfo } from './types';

/**
 * Parse ANTLR grammar using Java ANTLR runtime.
 * This is the only parser implementation - it's reliable and handles all grammar sizes.
 */
export async function parseANTLRGrammar(
    grammarFiles: { name: string; content: string }[],
    inputText: string,
    startRule: string
): Promise<ParseResult> {
    const startTime = performance.now();

    // Check if Java is available
    if (!JavaParser.isAvailable()) {
        const duration = performance.now() - startTime;
        return {
            tree: {
                id: 'error_root',
                name: 'ERROR',
                type: 'error',
                error: 'Java ANTLR parser not available. Please ensure Java is installed.'
            },
            tokens: [],
            errors: [
                {
                    line: 1,
                    column: 0,
                    message: 'Java ANTLR parser not available. Please ensure Java is installed and lib/antlr-4.13.2-complete.jar exists.',
                    severity: 'error'
                }
            ],
            duration
        };
    }

    try {
        console.log(`Using Java ANTLR parser for ${grammarFiles.length} grammar file(s)`);

        const javaParser = new JavaParser();
        const result = await javaParser.parse(grammarFiles, inputText, startRule);

        const duration = performance.now() - startTime;
        return {
            ...result,
            duration
        };
    } catch (e) {
        const duration = performance.now() - startTime;
        return {
            tree: {
                id: 'error_root',
                name: 'ERROR',
                type: 'error',
                error: `Parse error: ${e}`
            },
            tokens: [],
            errors: [
                {
                    line: 1,
                    column: 0,
                    message: `Parse error: ${e}`,
                    severity: 'error'
                }
            ],
            duration
        };
    }
}
