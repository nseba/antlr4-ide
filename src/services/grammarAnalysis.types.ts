/**
 * Type definitions for Grammar Analysis Engine
 * Provides interfaces for analysis results, metrics, and issues
 */

/** Severity levels for analysis issues */
export type Severity = 'info' | 'warning' | 'error' | 'critical';

/** Complexity score classification */
export type ComplexityScore = 'low' | 'medium' | 'high' | 'critical';

/** Type of grammar rule */
export type RuleType = 'parser' | 'lexer' | 'fragment';

/**
 * Information about a grammar rule
 */
export interface RuleInfo {
  /** Rule name */
  name: string;
  /** Type of rule (parser, lexer, fragment) */
  type: RuleType;
  /** Line number where rule is defined (1-based) */
  line: number;
  /** Column number where rule starts (0-based) */
  column: number;
  /** End line of the rule */
  endLine: number;
  /** End column of the rule */
  endColumn: number;
  /** The rule definition text */
  text: string;
  /** Number of alternatives in the rule */
  alternativeCount: number;
  /** Rules that this rule references */
  references: string[];
  /** Rules that reference this rule */
  referencedBy: string[];
}

/**
 * Information about an unused rule
 */
export interface UnusedRule {
  /** Rule name */
  name: string;
  /** Type of rule */
  type: RuleType;
  /** Line number where rule is defined */
  line: number;
  /** Column number */
  column: number;
  /** Suggestion message */
  suggestion: string;
}

/**
 * Complexity metrics for a single rule
 */
export interface ComplexityMetrics {
  /** Rule name */
  name: string;
  /** Type of rule */
  type: RuleType;
  /** Line number */
  line: number;
  /** Maximum nesting depth of sub-rules */
  depth: number;
  /** Number of alternatives (choices with |) */
  alternatives: number;
  /** Number of token/rule references */
  referenceCount: number;
  /** Whether the rule is directly recursive */
  directlyRecursive: boolean;
  /** Whether the rule is indirectly recursive */
  indirectlyRecursive: boolean;
  /** Estimated lookahead requirement (k value) */
  lookahead: number;
  /** Overall complexity score */
  score: ComplexityScore;
  /** Numeric complexity value for sorting */
  complexityValue: number;
}

/**
 * Performance issue detected in the grammar
 */
export interface PerformanceIssue {
  /** Rule name where issue was detected */
  rule: string;
  /** Type of rule */
  type: RuleType;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Severity of the issue */
  severity: Severity;
  /** Short description of the issue */
  issue: string;
  /** Detailed explanation */
  description: string;
  /** Suggested fix or improvement */
  suggestion: string;
  /** Category of performance issue */
  category: 'backtracking' | 'lookahead' | 'recursion' | 'memory' | 'ambiguity';
}

/**
 * Ambiguity hint - potential ambiguous alternatives
 */
export interface AmbiguityHint {
  /** Rule name */
  rule: string;
  /** Line number */
  line: number;
  /** Indices of potentially ambiguous alternatives */
  alternativeIndices: number[];
  /** Common prefix tokens that cause ambiguity */
  commonPrefix: string[];
  /** Description of the ambiguity */
  description: string;
}

/**
 * Summary statistics for the analysis
 */
export interface AnalysisSummary {
  /** Total number of rules */
  totalRules: number;
  /** Number of parser rules */
  parserRules: number;
  /** Number of lexer rules */
  lexerRules: number;
  /** Number of fragment rules */
  fragmentRules: number;
  /** Number of unused rules */
  unusedRules: number;
  /** Number of high complexity rules */
  highComplexityRules: number;
  /** Number of performance issues */
  performanceIssues: number;
  /** Number of ambiguity hints */
  ambiguityHints: number;
  /** Issues count by severity */
  issuesBySeverity: Record<Severity, number>;
}

/**
 * Complete analysis result for a grammar
 */
export interface AnalysisResult {
  /** Summary statistics */
  summary: AnalysisSummary;
  /** All rules found in the grammar */
  rules: RuleInfo[];
  /** Detected unused rules */
  unusedRules: UnusedRule[];
  /** Complexity metrics for each rule */
  complexity: ComplexityMetrics[];
  /** Detected performance issues */
  performanceIssues: PerformanceIssue[];
  /** Ambiguity hints */
  ambiguityHints: AmbiguityHint[];
  /** Timestamp when analysis was performed */
  timestamp: number;
  /** Duration of analysis in milliseconds */
  duration: number;
  /** Grammar content hash for cache invalidation */
  grammarHash: string;
}

/**
 * Options for configuring the analysis
 */
export interface AnalysisOptions {
  /** Include unused rule detection */
  detectUnusedRules?: boolean;
  /** Include complexity analysis */
  analyzeComplexity?: boolean;
  /** Include performance issue detection */
  detectPerformanceIssues?: boolean;
  /** Include ambiguity hints */
  detectAmbiguity?: boolean;
  /** Name of the start rule (excluded from unused detection) */
  startRule?: string;
  /** Complexity threshold for 'high' score */
  highComplexityThreshold?: number;
  /** Complexity threshold for 'critical' score */
  criticalComplexityThreshold?: number;
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions> = {
  detectUnusedRules: true,
  analyzeComplexity: true,
  detectPerformanceIssues: true,
  detectAmbiguity: true,
  startRule: '',
  highComplexityThreshold: 50,
  criticalComplexityThreshold: 100,
};

/**
 * Reference graph node for tracking rule dependencies
 */
export interface ReferenceGraphNode {
  /** Rule name */
  name: string;
  /** Type of rule */
  type: RuleType;
  /** Set of rules this rule references */
  references: Set<string>;
  /** Set of rules that reference this rule */
  referencedBy: Set<string>;
}

/**
 * Reference graph for the entire grammar
 */
export type ReferenceGraph = Map<string, ReferenceGraphNode>;

/**
 * Position information for editor decorations
 */
export interface AnalysisDecoration {
  /** Start line (1-based) */
  startLine: number;
  /** Start column (1-based) */
  startColumn: number;
  /** End line (1-based) */
  endLine: number;
  /** End column (1-based) */
  endColumn: number;
  /** Severity for decoration styling */
  severity: Severity;
  /** Message to show on hover */
  message: string;
  /** Source of the decoration (unused, complexity, performance, ambiguity) */
  source: 'unused' | 'complexity' | 'performance' | 'ambiguity';
}
