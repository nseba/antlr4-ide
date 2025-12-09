// Types for the ANTLR4 runtime interpreter

export interface Token {
    type: string;
    text: string;
    start: number;
    stop: number;
    line: number;
    column: number;
    tokenIndex: number;
}

export interface ParseNode {
    id: string;
    name: string;
    type: 'rule' | 'token' | 'error';
    children?: ParseNode[];
    token?: Token;
    error?: string;
    /** Start character index in input text (0-based) */
    startIndex?: number;
    /** Stop character index in input text (0-based, inclusive) */
    stopIndex?: number;
    /** Start line in input (1-based) */
    startLine?: number;
    /** Start column in input (0-based) */
    startColumn?: number;
    /** End line in input (1-based) */
    endLine?: number;
    /** End column in input (0-based) */
    endColumn?: number;
    /** The matched text from the input */
    matchedText?: string;
}

export interface LexerCommand {
    type: 'skip' | 'channel' | 'type' | 'mode' | 'pushMode' | 'popMode' | 'more';
    value?: string | number;
}

export interface LexerRule {
    name: string;
    pattern: RegExp | null;
    fragment: boolean;
    channel: number;
    mode?: string;  // Which mode this rule belongs to (undefined = default mode)
    commands?: LexerCommand[];  // Commands like skip, channel, pushMode, etc.
}

export interface ParserRule {
    name: string;
    alternatives: Alternative[];
}

export interface Alternative {
    elements: Element[];
    label?: string;
}

export interface Element {
    type: 'token' | 'rule' | 'string' | 'any' | 'block';
    value: string;
    quantifier?: '?' | '*' | '+';
    alternatives?: Alternative[];  // For block elements
}

export interface GrammarInfo {
    type: 'lexer' | 'parser' | 'combined';
    name: string;
    lexerRules: Map<string, LexerRule>;
    parserRules: Map<string, ParserRule>;
    tokenNames: string[];
    modes: string[];  // List of defined modes (first is always default mode)
}

export interface ParseError {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export interface ParseResult {
    tree: ParseNode;
    tokens: Token[];
    errors: ParseError[];
    duration: number; // ms
    grammarInfo?: GrammarInfo;
}
