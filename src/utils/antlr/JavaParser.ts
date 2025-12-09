import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join, dirname, delimiter } from 'path';
import { fileURLToPath } from 'url';
import { ParseResult, ParseNode, Token } from './types';

/**
 * Java-based ANTLR parser using the official ANTLR4 jar.
 * This is used as a fallback for very large grammars that cause
 * stack overflow in the TypeScript ATN interpreter.
 */
export class JavaParser {
    private antlrJar: string;
    private workDir: string;

    constructor() {
        // Find the jar relative to the project root
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const projectRoot = join(__dirname, '../../..');
        this.antlrJar = join(projectRoot, 'lib/antlr-4.13.2-complete.jar');
        this.workDir = join(projectRoot, '.antlr-tmp');
    }

    /**
     * Parse input using Java ANTLR runtime
     */
    async parse(
        grammarFiles: Array<{ name: string; content: string }>,
        input: string,
        startRule: string
    ): Promise<ParseResult> {
        try {
            // Create temporary directory
            mkdirSync(this.workDir, { recursive: true });

            // Write grammar files (using grammar name from content, not frontend filename)
            const grammarFileNames: string[] = [];
            const extractedGrammarNames: { name: string; type: 'lexer' | 'parser' | 'combined' }[] = [];

            for (const file of grammarFiles) {
                // Strip target-specific code (TypeScript @header/@members) for Java compilation
                const cleanedContent = this.stripTargetSpecificCode(file.content);

                // Extract grammar name and type from the file content
                const lexerMatch = cleanedContent.match(/lexer\s+grammar\s+(\w+)\s*;/);
                const parserMatch = cleanedContent.match(/parser\s+grammar\s+(\w+)\s*;/);
                const combinedMatch = cleanedContent.match(/^grammar\s+(\w+)\s*;/m);

                let grammarName: string;
                let grammarType: 'lexer' | 'parser' | 'combined';

                if (lexerMatch) {
                    grammarName = lexerMatch[1];
                    grammarType = 'lexer';
                } else if (parserMatch) {
                    grammarName = parserMatch[1];
                    grammarType = 'parser';
                } else if (combinedMatch) {
                    grammarName = combinedMatch[1];
                    grammarType = 'combined';
                } else {
                    grammarName = file.name.replace('.g4', '');
                    grammarType = 'combined';
                }

                const fileName = `${grammarName}.g4`;
                extractedGrammarNames.push({ name: grammarName, type: grammarType });

                const filePath = join(this.workDir, fileName);
                writeFileSync(filePath, cleanedContent, 'utf-8');
                grammarFileNames.push(fileName);
            }

            // Write input file
            const inputFile = join(this.workDir, 'input.txt');
            writeFileSync(inputFile, input, 'utf-8');

            // Generate parser
            const generateCmd = `java -jar "${this.antlrJar}" -Dlanguage=Java ${grammarFileNames.join(' ')}`;
            execSync(generateCmd, {
                cwd: this.workDir,
                stdio: 'pipe',
                timeout: 60000,
            });

            // Compile generated Java files
            const javaFiles = execSync('find . -name "*.java"', { cwd: this.workDir, encoding: 'utf-8' })
                .trim()
                .split('\n');

            if (javaFiles.length > 0 && javaFiles[0]) {
                const compileCmd = `javac -cp "${this.antlrJar}" ${javaFiles.join(' ')}`;
                execSync(compileCmd, {
                    cwd: this.workDir,
                    stdio: 'pipe',
                    timeout: 60000,
                });
            }

            // Determine grammar name for TestRig
            // For split grammars (FooLexer + FooParser), TestRig expects the base name "Foo"
            // For combined grammars, use the grammar name directly
            let testRigGrammarName: string;

            const parserGrammar = extractedGrammarNames.find(g => g.type === 'parser');
            const combinedGrammar = extractedGrammarNames.find(g => g.type === 'combined');

            if (parserGrammar) {
                // Split grammar: remove "Parser" suffix to get base name
                testRigGrammarName = parserGrammar.name.replace(/Parser$/, '');
            } else if (combinedGrammar) {
                // Combined grammar: use name directly
                testRigGrammarName = combinedGrammar.name;
            } else {
                // Fallback: use first grammar name
                testRigGrammarName = extractedGrammarNames[0]?.name || 'Grammar';
            }

            // Run grun (TestRig) to get tokens
            const tokensCmd = `java -cp ".${delimiter}${this.antlrJar}" org.antlr.v4.gui.TestRig ${testRigGrammarName} ${startRule} -tokens 2>&1`;
            const tokensResult = execSync(tokensCmd, {
                cwd: this.workDir,
                input: input,
                encoding: 'utf-8',
                timeout: 120000,
            });
            const tokens = this.parseTokensOutput(tokensResult);

            // Run grun (TestRig) to parse tree
            const grunCmd = `java -cp ".${delimiter}${this.antlrJar}" org.antlr.v4.gui.TestRig ${testRigGrammarName} ${startRule} -tree 2>&1`;
            const result = execSync(grunCmd, {
                cwd: this.workDir,
                input: input,
                encoding: 'utf-8',
                timeout: 120000,
            });
            const tree = this.parseTreeOutput(result);

            return {
                tree,
                errors: [],
                tokens,
            };
        } catch (error: any) {
            console.error('[JavaParser] Error:', error.message);

            return {
                tree: {
                    id: 'error',
                    type: 'error',
                    name: 'JAVA_PARSER_ERROR',
                    error: String(error),
                },
                errors: [{
                    line: 1,
                    column: 0,
                    message: `Java parser error: ${error.message}`,
                    severity: 'error',
                }],
                tokens: [],
            };
        } finally {
            // Cleanup
            try {
                rmSync(this.workDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Strip target-specific code from grammar (e.g., TypeScript @header/@members blocks)
     * so the grammar can be compiled with Java target
     */
    private stripTargetSpecificCode(content: string): string {
        // Remove @header, @members, @parser::header, @lexer::header, etc.
        // These blocks contain target-specific code that won't compile in Java
        let result = content;

        // Remove superClass option (custom base classes won't exist in Java)
        result = result.replace(/superClass\s*=\s*\w+\s*;?/g, '');

        // Remove tokenVocab if it's causing issues (we'll let ANTLR figure it out from files)
        // Actually keep tokenVocab as it's needed for split grammars

        // Match @name { ... } blocks with balanced braces
        const actionPattern = /@(?:header|members|parser::(?:header|members)|lexer::(?:header|members))\s*\{/g;
        let match;

        while ((match = actionPattern.exec(result)) !== null) {
            const startIndex = match.index;
            let braceCount = 1;
            let endIndex = match.index + match[0].length;

            // Find the matching closing brace
            while (braceCount > 0 && endIndex < result.length) {
                if (result[endIndex] === '{') braceCount++;
                else if (result[endIndex] === '}') braceCount--;
                endIndex++;
            }

            // Remove the entire block
            result = result.slice(0, startIndex) + result.slice(endIndex);
            // Reset regex lastIndex since we modified the string
            actionPattern.lastIndex = startIndex;
        }

        // Clean up empty options blocks
        result = result.replace(/options\s*\{\s*\}/g, '');

        return result;
    }

    /**
     * Parse ANTLR's tree output format into our ParseNode structure
     * ANTLR outputs trees in LISP-like format: (rule token token (subrule ...))
     */
    private parseTreeOutput(treeStr: string): ParseNode {
        const input = treeStr.trim();
        let pos = 0;
        let nodeId = 0;

        const parseNode = (): ParseNode | null => {
            // Skip whitespace
            while (pos < input.length && /\s/.test(input[pos])) pos++;

            if (pos >= input.length) return null;

            if (input[pos] === '(') {
                // Rule node: (ruleName children...)
                pos++; // skip '('

                // Skip whitespace
                while (pos < input.length && /\s/.test(input[pos])) pos++;

                // Read rule name
                let name = '';
                while (pos < input.length && !/[\s()]/.test(input[pos])) {
                    name += input[pos++];
                }

                const children: ParseNode[] = [];

                // Parse children until ')'
                while (pos < input.length) {
                    while (pos < input.length && /\s/.test(input[pos])) pos++;

                    if (input[pos] === ')') {
                        pos++; // skip ')'
                        break;
                    }

                    const child = parseNode();
                    if (child) children.push(child);
                }

                return {
                    id: `node_${nodeId++}`,
                    type: 'rule',
                    name,
                    children: children.length > 0 ? children : undefined,
                };
            } else {
                // Token: just read until whitespace or paren
                let text = '';
                while (pos < input.length && !/[\s()]/.test(input[pos])) {
                    text += input[pos++];
                }

                if (!text) return null;

                return {
                    id: `token_${nodeId++}`,
                    type: 'token',
                    name: text,
                };
            }
        };

        const result = parseNode();
        return result || {
            id: 'empty',
            type: 'rule',
            name: 'empty',
        };
    }

    /**
     * Parse TestRig -tokens output into Token array
     * Format: [@index,start:stop='text',<TYPE>,channel,line:column]
     */
    private parseTokensOutput(output: string): Token[] {
        const tokens: Token[] = [];
        const lines = output.trim().split('\n');

        // Token format: [@0,0:6='PROGRAM',<PROGRAM>,1:0]
        const tokenPattern = /\[@(\d+),(\d+):(\d+)='([^']*)',<([^>]+)>,(?:channel=\d+,)?(\d+):(\d+)\]/;

        for (const line of lines) {
            const match = line.match(tokenPattern);
            if (match) {
                tokens.push({
                    tokenIndex: parseInt(match[1], 10),
                    start: parseInt(match[2], 10),
                    stop: parseInt(match[3], 10),
                    text: match[4],
                    type: match[5],
                    line: parseInt(match[6], 10),
                    column: parseInt(match[7], 10),
                });
            }
        }

        return tokens;
    }

    /**
     * Check if Java and the ANTLR jar are available
     */
    static isAvailable(): boolean {
        try {
            // Check Java
            execSync('java -version', { stdio: 'pipe' });

            // Check ANTLR jar
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const projectRoot = join(__dirname, '../../..');
            const jarPath = join(projectRoot, 'lib/antlr-4.13.2-complete.jar');
            readFileSync(jarPath);

            return true;
        } catch (error) {
            return false;
        }
    }
}
