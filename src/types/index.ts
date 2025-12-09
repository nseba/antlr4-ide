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
  name: string; // Rule name or Token text
  type: 'rule' | 'token' | 'error';
  children?: ParseNode[];
  token?: Token; // If leaf
  error?: string; // If error node
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
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'grammar' | 'text';
  content: string;
  isMain?: boolean; // For grammar
}

export interface ProjectState {
  files: ProjectFile[];
  activeFileId: string | null;
  settings: {
    startRule: string;
  };
}