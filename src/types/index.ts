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

// Re-export analysis types for convenience
export type {
  AnalysisResult,
  AnalysisSummary,
  RuleInfo,
  UnusedRule,
  ComplexityMetrics,
  PerformanceIssue,
  AmbiguityHint,
  AnalysisDecoration,
  Severity,
  ComplexityScore,
  RuleType,
} from '../services/grammarAnalysis.types';

// Editor ref interface for programmatic control
export interface CodeEditorRef {
  selectRange: (startLine: number, startCol: number, endLine: number, endCol: number) => void;
  highlightRange: (startLine: number, startCol: number, endLine: number, endCol: number, className?: string) => void;
  clearHighlights: () => void;
  revealLine: (line: number) => void;
  setDecorations: (decorations: EditorDecoration[]) => void;
  clearDecorations: () => void;
}

// Editor decoration for Monaco
export interface EditorDecoration {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
}