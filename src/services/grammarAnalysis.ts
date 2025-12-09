/**
 * Grammar Analysis Engine
 * Analyzes ANTLR4 grammars for unused rules, complexity metrics,
 * performance bottlenecks, and potential ambiguities.
 */

import {
  AnalysisResult,
  AnalysisOptions,
  AnalysisSummary,
  RuleInfo,
  UnusedRule,
  ComplexityMetrics,
  PerformanceIssue,
  AmbiguityHint,
  ReferenceGraph,
  RuleType,
  ComplexityScore,
  Severity,
  DEFAULT_ANALYSIS_OPTIONS,
} from './grammarAnalysis.types';

/**
 * Cache entry for analysis results
 */
interface CacheEntry {
  result: AnalysisResult;
  hash: string;
  timestamp: number;
}

/**
 * GrammarAnalyzer - Main class for grammar analysis
 */
export class GrammarAnalyzer {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Main analysis method - analyzes grammar content and returns results
   * @param grammarContent - The full grammar file content
   * @param options - Analysis configuration options
   * @returns Complete analysis result
   */
  public analyze(
    grammarContent: string,
    options: AnalysisOptions = {}
  ): AnalysisResult {
    const startTime = performance.now();
    const mergedOptions = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
    const grammarHash = this.hashGrammar(grammarContent);

    // Check cache
    const cached = this.getFromCache(grammarHash);
    if (cached) {
      return cached;
    }

    // Parse grammar to extract rules
    const rules = this.parseGrammar(grammarContent);

    // Build reference graph
    const referenceGraph = this.buildReferenceGraph(rules);

    // Update rules with reference information
    this.updateRuleReferences(rules, referenceGraph);

    // Detect unused rules
    const unusedRules = mergedOptions.detectUnusedRules
      ? this.detectUnusedRules(rules, referenceGraph, mergedOptions.startRule)
      : [];

    // Calculate complexity metrics
    const complexity = mergedOptions.analyzeComplexity
      ? this.calculateComplexityMetrics(rules, referenceGraph, mergedOptions)
      : [];

    // Detect performance issues
    const performanceIssues = mergedOptions.detectPerformanceIssues
      ? this.detectPerformanceIssues(rules, referenceGraph, complexity)
      : [];

    // Detect ambiguity hints
    const ambiguityHints = mergedOptions.detectAmbiguity
      ? this.detectAmbiguityHints(rules, grammarContent)
      : [];

    // Calculate summary
    const summary = this.calculateSummary(
      rules,
      unusedRules,
      complexity,
      performanceIssues,
      ambiguityHints
    );

    const duration = performance.now() - startTime;

    const result: AnalysisResult = {
      summary,
      rules,
      unusedRules,
      complexity,
      performanceIssues,
      ambiguityHints,
      timestamp: Date.now(),
      duration,
      grammarHash,
    };

    // Cache result
    this.setCache(grammarHash, result);

    return result;
  }

  /**
   * Parse grammar content to extract all rule definitions
   */
  private parseGrammar(content: string): RuleInfo[] {
    const rules: RuleInfo[] = [];

    // First, remove comments and clean up the content
    const cleanedContent = this.removeComments(content);

    // Remove header blocks (@header, @members, options, etc.)
    const contentWithoutHeaders = this.removeHeaderBlocks(cleanedContent);

    // Extract rules using regex
    // Fragment rule pattern
    const fragmentPattern = /fragment\s+([A-Z][a-zA-Z0-9_]*)\s*:([\s\S]*?);/g;
    // Lexer rule pattern (uppercase, at start of line or after whitespace/newline)
    const lexerRulePattern = /(?:^|\n)\s*([A-Z][a-zA-Z0-9_]*)\s*:([\s\S]*?);/g;
    // Parser rule pattern (lowercase, at start of line or after whitespace/newline)
    const parserRulePattern = /(?:^|\n)\s*([a-z][a-zA-Z0-9_]*)\s*:([\s\S]*?);/g;

    // Helper to find line number for a position in original content
    const getLineNumber = (pos: number): number => {
      let lineNum = 1;
      for (let i = 0; i < pos && i < content.length; i++) {
        if (content[i] === '\n') lineNum++;
      }
      return lineNum;
    };

    // Helper to find column in original content
    const getColumn = (pos: number): number => {
      let lastNewline = content.lastIndexOf('\n', pos - 1);
      return pos - lastNewline - 1;
    };

    // Track processed rule names to avoid duplicates
    const processedRules = new Set<string>();

    // Process fragment rules first
    let match;
    while ((match = fragmentPattern.exec(contentWithoutHeaders)) !== null) {
      const ruleName = match[1];
      if (processedRules.has(ruleName)) continue;
      processedRules.add(ruleName);

      const ruleBody = match[2];
      const ruleText = `fragment ${ruleName} :${ruleBody};`;

      // Find position in original content
      const originalPos = content.indexOf(`fragment ${ruleName}`);
      const lineNumber = originalPos >= 0 ? getLineNumber(originalPos) : 1;
      const column = originalPos >= 0 ? getColumn(originalPos) : 0;

      // Find end position
      const endPos = content.indexOf(';', originalPos + ruleName.length);
      const endLine = endPos >= 0 ? getLineNumber(endPos) : lineNumber;
      const endColumn = endPos >= 0 ? getColumn(endPos) + 1 : ruleText.length;

      rules.push({
        name: ruleName,
        type: 'fragment',
        line: lineNumber,
        column,
        endLine,
        endColumn,
        text: ruleText.trim(),
        alternativeCount: this.countAlternatives(ruleText),
        references: [],
        referencedBy: [],
      });
    }

    // Process lexer rules (but exclude fragments)
    // First, collect all fragment names
    const fragmentNames = new Set(rules.filter(r => r.type === 'fragment').map(r => r.name));

    while ((match = lexerRulePattern.exec(contentWithoutHeaders)) !== null) {
      const ruleName = match[1];
      if (processedRules.has(ruleName) || fragmentNames.has(ruleName)) continue;

      // Skip if this is actually a fragment (check original content)
      const fragCheck = new RegExp(`fragment\\s+${ruleName}\\s*:`);
      if (fragCheck.test(content)) continue;

      processedRules.add(ruleName);

      const ruleBody = match[2];
      const ruleText = `${ruleName} :${ruleBody};`;

      // Find position in original content
      const originalPos = this.findRulePosition(content, ruleName);
      const lineNumber = originalPos >= 0 ? getLineNumber(originalPos) : 1;
      const column = originalPos >= 0 ? getColumn(originalPos) : 0;

      // Find end position
      const endPos = content.indexOf(';', originalPos + ruleName.length);
      const endLine = endPos >= 0 ? getLineNumber(endPos) : lineNumber;
      const endColumn = endPos >= 0 ? getColumn(endPos) + 1 : ruleText.length;

      rules.push({
        name: ruleName,
        type: 'lexer',
        line: lineNumber,
        column,
        endLine,
        endColumn,
        text: ruleText.trim(),
        alternativeCount: this.countAlternatives(ruleText),
        references: [],
        referencedBy: [],
      });
    }

    // Process parser rules
    while ((match = parserRulePattern.exec(contentWithoutHeaders)) !== null) {
      const ruleName = match[1];
      if (processedRules.has(ruleName)) continue;

      // Skip ANTLR keywords
      if (this.isKeyword(ruleName)) continue;

      processedRules.add(ruleName);

      const ruleBody = match[2];
      const ruleText = `${ruleName} :${ruleBody};`;

      // Find position in original content
      const originalPos = this.findRulePosition(content, ruleName);
      const lineNumber = originalPos >= 0 ? getLineNumber(originalPos) : 1;
      const column = originalPos >= 0 ? getColumn(originalPos) : 0;

      // Find end position
      const endPos = content.indexOf(';', originalPos + ruleName.length);
      const endLine = endPos >= 0 ? getLineNumber(endPos) : lineNumber;
      const endColumn = endPos >= 0 ? getColumn(endPos) + 1 : ruleText.length;

      rules.push({
        name: ruleName,
        type: 'parser',
        line: lineNumber,
        column,
        endLine,
        endColumn,
        text: ruleText.trim(),
        alternativeCount: this.countAlternatives(ruleText),
        references: [],
        referencedBy: [],
      });
    }

    return rules;
  }

  /**
   * Find the position of a rule definition in the content
   */
  private findRulePosition(content: string, ruleName: string): number {
    // Look for the rule name followed by optional whitespace and colon
    const pattern = new RegExp(`(^|\\n|\\s)(${ruleName})\\s*:`, 'm');
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      return match.index + match[0].indexOf(ruleName);
    }
    return -1;
  }

  /**
   * Remove comments from content
   */
  private removeComments(content: string): string {
    // Remove single-line comments
    let result = content.replace(/\/\/[^\n]*/g, '');
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
  }

  /**
   * Remove header blocks like grammar declaration, options, @header, etc.
   */
  private removeHeaderBlocks(content: string): string {
    let result = content;

    // Remove grammar declaration (including the grammar name)
    result = result.replace(/(grammar|lexer\s+grammar|parser\s+grammar)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;/g, '');

    // Remove options blocks (handle nested braces)
    result = this.removeBlock(result, /options\s*\{/g);

    // Remove tokens blocks
    result = this.removeBlock(result, /tokens\s*\{/g);

    // Remove @header, @members, etc. blocks
    result = result.replace(/@[a-zA-Z_][a-zA-Z0-9_:]*\s*\{[^}]*\}/g, '');

    // Remove import statements
    result = result.replace(/import\s+[^;]+;/g, '');

    // Remove channels blocks
    result = this.removeBlock(result, /channels\s*\{/g);

    // Remove mode declarations (but not mode actions)
    result = result.replace(/^mode\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;/gm, '');

    return result;
  }

  /**
   * Remove a block starting with a pattern and ending with matching brace
   */
  private removeBlock(content: string, startPattern: RegExp): string {
    let result = content;
    let match;

    while ((match = startPattern.exec(result)) !== null) {
      const startIdx = match.index;
      let braceCount = 1;
      let endIdx = startIdx + match[0].length;

      while (endIdx < result.length && braceCount > 0) {
        if (result[endIdx] === '{') braceCount++;
        else if (result[endIdx] === '}') braceCount--;
        endIdx++;
      }

      result = result.substring(0, startIdx) + result.substring(endIdx);
      startPattern.lastIndex = 0; // Reset regex state
    }

    return result;
  }

  /**
   * Count alternatives (|) in a rule
   */
  private countAlternatives(ruleText: string): number {
    let count = 1;
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < ruleText.length; i++) {
      const char = ruleText[i];
      const prevChar = ruleText[i - 1];

      // Track strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      // Track parentheses depth
      if (char === '(') depth++;
      if (char === ')') depth--;

      // Count top-level alternatives only
      if (char === '|' && depth === 0) {
        count++;
      }
    }

    return count;
  }

  /**
   * Build reference graph from parsed rules
   */
  private buildReferenceGraph(rules: RuleInfo[]): ReferenceGraph {
    const graph: ReferenceGraph = new Map();

    // Initialize nodes
    for (const rule of rules) {
      graph.set(rule.name, {
        name: rule.name,
        type: rule.type,
        references: new Set(),
        referencedBy: new Set(),
      });
    }

    // Build references
    for (const rule of rules) {
      const refs = this.extractReferences(rule.text, rule.type);
      const node = graph.get(rule.name)!;

      for (const ref of refs) {
        node.references.add(ref);

        // Update referenced rule's referencedBy
        const refNode = graph.get(ref);
        if (refNode) {
          refNode.referencedBy.add(rule.name);
        }
      }
    }

    return graph;
  }

  /**
   * Extract rule/token references from rule text
   */
  private extractReferences(ruleText: string, _ruleType: RuleType): string[] {
    const references: Set<string> = new Set();

    // Remove the rule name and colon
    const colonIndex = ruleText.indexOf(':');
    if (colonIndex === -1) return [];

    const body = ruleText.substring(colonIndex + 1);

    // Remove strings
    const withoutStrings = body.replace(/'[^']*'|"[^"]*"/g, '');

    // Remove comments
    const withoutComments = withoutStrings
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove action blocks
    const withoutActions = this.removeActionBlocks(withoutComments);

    // Find identifiers
    // Parser rules: lowercase start
    // Lexer rules/tokens: uppercase start
    const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = identifierPattern.exec(withoutActions)) !== null) {
      const name = match[1];
      // Skip keywords
      if (this.isKeyword(name)) continue;
      // Skip if it's a semantic predicate or action reference
      if (name.startsWith('$')) continue;

      references.add(name);
    }

    return Array.from(references);
  }

  /**
   * Remove action blocks {...} from text
   */
  private removeActionBlocks(text: string): string {
    let result = '';
    let braceDepth = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      } else if (braceDepth === 0) {
        result += char;
      }
    }

    return result;
  }

  /**
   * Check if identifier is an ANTLR keyword
   */
  private isKeyword(name: string): boolean {
    const keywords = [
      'fragment',
      'grammar',
      'lexer',
      'parser',
      'options',
      'tokens',
      'channels',
      'import',
      'mode',
      'returns',
      'locals',
      'throws',
      'catch',
      'finally',
      'true',
      'false',
      'null',
      'skip',
      'channel',
      'type',
      'more',
      'popMode',
      'pushMode',
      'EOF',
    ];
    return keywords.includes(name);
  }

  /**
   * Update rules with reference information from graph
   */
  private updateRuleReferences(
    rules: RuleInfo[],
    graph: ReferenceGraph
  ): void {
    for (const rule of rules) {
      const node = graph.get(rule.name);
      if (node) {
        rule.references = Array.from(node.references);
        rule.referencedBy = Array.from(node.referencedBy);
      }
    }
  }

  /**
   * Detect unused rules (rules that are never referenced)
   */
  private detectUnusedRules(
    rules: RuleInfo[],
    graph: ReferenceGraph,
    startRule: string
  ): UnusedRule[] {
    const unusedRules: UnusedRule[] = [];

    for (const rule of rules) {
      const node = graph.get(rule.name);
      if (!node) continue;

      // Skip start rule
      if (rule.name === startRule || rule.name.toLowerCase() === startRule.toLowerCase()) {
        continue;
      }

      // Skip if referenced by any other rule
      if (node.referencedBy.size > 0) {
        continue;
      }

      // For parser rules, they might be the implicit start rule (first parser rule)
      if (rule.type === 'parser' && !startRule) {
        const firstParserRule = rules.find((r) => r.type === 'parser');
        if (firstParserRule && firstParserRule.name === rule.name) {
          continue;
        }
      }

      unusedRules.push({
        name: rule.name,
        type: rule.type,
        line: rule.line,
        column: rule.column,
        suggestion:
          rule.type === 'fragment'
            ? `Fragment '${rule.name}' is never used by other lexer rules. Consider removing it.`
            : `Rule '${rule.name}' is never referenced. Consider removing it or making it the start rule.`,
      });
    }

    return unusedRules;
  }

  /**
   * Calculate complexity metrics for each rule
   */
  private calculateComplexityMetrics(
    rules: RuleInfo[],
    graph: ReferenceGraph,
    options: Required<AnalysisOptions>
  ): ComplexityMetrics[] {
    const metrics: ComplexityMetrics[] = [];

    // Detect recursion first
    const recursionInfo = this.detectRecursion(rules, graph);

    for (const rule of rules) {
      const depth = this.calculateRuleDepth(rule.text);
      const node = graph.get(rule.name);
      const referenceCount = node ? node.references.size : 0;
      const lookahead = this.estimateLookahead(rule.text);

      const { complexityValue, score } = this.calculateComplexityScore(
        depth,
        rule.alternativeCount,
        referenceCount,
        recursionInfo.directlyRecursive.has(rule.name),
        recursionInfo.indirectlyRecursive.has(rule.name),
        lookahead,
        options
      );

      metrics.push({
        name: rule.name,
        type: rule.type,
        line: rule.line,
        depth,
        alternatives: rule.alternativeCount,
        referenceCount,
        directlyRecursive: recursionInfo.directlyRecursive.has(rule.name),
        indirectlyRecursive: recursionInfo.indirectlyRecursive.has(rule.name),
        lookahead,
        score,
        complexityValue,
      });
    }

    // Sort by complexity value descending
    metrics.sort((a, b) => b.complexityValue - a.complexityValue);

    return metrics;
  }

  /**
   * Calculate nesting depth of a rule
   */
  private calculateRuleDepth(ruleText: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < ruleText.length; i++) {
      const char = ruleText[i];
      const prevChar = ruleText[i - 1];

      // Track strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      if (char === '(' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')' || char === ']') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Detect direct and indirect recursion
   */
  private detectRecursion(
    rules: RuleInfo[],
    graph: ReferenceGraph
  ): { directlyRecursive: Set<string>; indirectlyRecursive: Set<string> } {
    const directlyRecursive = new Set<string>();
    const indirectlyRecursive = new Set<string>();

    for (const rule of rules) {
      const node = graph.get(rule.name);
      if (!node) continue;

      // Direct recursion: rule references itself
      if (node.references.has(rule.name)) {
        directlyRecursive.add(rule.name);
      }

      // Indirect recursion: DFS to find cycles
      const visited = new Set<string>();
      const path = new Set<string>();

      const hasCycle = this.dfsFindCycle(
        rule.name,
        rule.name,
        graph,
        visited,
        path
      );

      if (hasCycle && !directlyRecursive.has(rule.name)) {
        indirectlyRecursive.add(rule.name);
      }
    }

    return { directlyRecursive, indirectlyRecursive };
  }

  /**
   * DFS to find cycles in reference graph
   */
  private dfsFindCycle(
    start: string,
    current: string,
    graph: ReferenceGraph,
    visited: Set<string>,
    path: Set<string>
  ): boolean {
    if (path.has(current) && current === start && path.size > 1) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);
    path.add(current);

    const node = graph.get(current);
    if (node) {
      for (const ref of node.references) {
        if (ref === start && path.size > 1) {
          return true;
        }
        if (!visited.has(ref)) {
          if (this.dfsFindCycle(start, ref, graph, visited, path)) {
            return true;
          }
        }
      }
    }

    path.delete(current);
    return false;
  }

  /**
   * Estimate lookahead requirement for a rule
   */
  private estimateLookahead(ruleText: string): number {
    // Simple heuristic based on rule structure
    let lookahead = 1;

    // Count optional elements at the start of alternatives
    const alternatives = this.splitAlternatives(ruleText);

    if (alternatives.length > 1) {
      // Check for common prefixes
      const prefixes = alternatives.map((alt) =>
        this.extractPrefix(alt).toLowerCase()
      );
      const uniquePrefixes = new Set(prefixes);

      if (uniquePrefixes.size < alternatives.length) {
        // Common prefixes increase lookahead
        lookahead = Math.min(lookahead + 2, 5);
      }
    }

    // Optional elements at start increase lookahead
    if (ruleText.includes('?') || ruleText.includes('*')) {
      lookahead++;
    }

    // Nested rules increase lookahead
    const depth = this.calculateRuleDepth(ruleText);
    if (depth > 2) {
      lookahead += Math.floor(depth / 2);
    }

    return Math.min(lookahead, 10); // Cap at 10
  }

  /**
   * Split rule body into alternatives
   */
  private splitAlternatives(ruleText: string): string[] {
    const colonIndex = ruleText.indexOf(':');
    if (colonIndex === -1) return [ruleText];

    const body = ruleText.substring(colonIndex + 1);
    const alternatives: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      const prevChar = body[i - 1];

      // Track strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        if (char === ')' || char === ']' || char === '}') depth--;

        if (char === '|' && depth === 0) {
          alternatives.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      alternatives.push(current.trim().replace(/;$/, ''));
    }

    return alternatives;
  }

  /**
   * Extract the first token/rule reference from an alternative
   */
  private extractPrefix(alternative: string): string {
    // Find first identifier or string literal
    const match = alternative.match(
      /^\s*(?:'[^']*'|"[^"]*"|[a-zA-Z_][a-zA-Z0-9_]*)/
    );
    return match ? match[0].trim() : '';
  }

  /**
   * Calculate complexity score based on metrics
   */
  private calculateComplexityScore(
    depth: number,
    alternatives: number,
    referenceCount: number,
    directlyRecursive: boolean,
    indirectlyRecursive: boolean,
    lookahead: number,
    options: Required<AnalysisOptions>
  ): { complexityValue: number; score: ComplexityScore } {
    // Weighted sum of metrics
    let value = 0;

    value += depth * 5;
    value += alternatives * 3;
    value += referenceCount * 2;
    value += lookahead * 4;

    if (directlyRecursive) value += 15;
    if (indirectlyRecursive) value += 25;

    let score: ComplexityScore;
    if (value >= options.criticalComplexityThreshold) {
      score = 'critical';
    } else if (value >= options.highComplexityThreshold) {
      score = 'high';
    } else if (value >= options.highComplexityThreshold / 2) {
      score = 'medium';
    } else {
      score = 'low';
    }

    return { complexityValue: value, score };
  }

  /**
   * Detect performance issues in the grammar
   */
  private detectPerformanceIssues(
    rules: RuleInfo[],
    graph: ReferenceGraph,
    complexity: ComplexityMetrics[]
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (const rule of rules) {
      const metrics = complexity.find((c) => c.name === rule.name);
      if (!metrics) continue;

      // High backtracking potential
      if (metrics.alternatives > 5 && metrics.lookahead > 2) {
        issues.push({
          rule: rule.name,
          type: rule.type,
          line: rule.line,
          column: rule.column,
          severity: 'warning',
          issue: 'High backtracking potential',
          description: `Rule has ${metrics.alternatives} alternatives with lookahead of ${metrics.lookahead}, which may cause excessive backtracking.`,
          suggestion:
            'Consider reordering alternatives by frequency or refactoring to reduce ambiguity.',
          category: 'backtracking',
        });
      }

      // High lookahead
      if (metrics.lookahead >= 4) {
        issues.push({
          rule: rule.name,
          type: rule.type,
          line: rule.line,
          column: rule.column,
          severity: 'warning',
          issue: 'High lookahead requirement',
          description: `Rule requires estimated lookahead of ${metrics.lookahead} tokens.`,
          suggestion:
            'Consider left-factoring common prefixes or using syntactic predicates.',
          category: 'lookahead',
        });
      }

      // Deep recursion warning
      if (metrics.indirectlyRecursive && metrics.depth > 3) {
        issues.push({
          rule: rule.name,
          type: rule.type,
          line: rule.line,
          column: rule.column,
          severity: 'info',
          issue: 'Deep indirect recursion',
          description: `Rule has indirect recursion with depth ${metrics.depth}, which may cause deep stack usage.`,
          suggestion:
            'Consider flattening the recursion or adding iteration limits.',
          category: 'recursion',
        });
      }

      // Memory usage warning for deep nesting
      if (metrics.depth > 5) {
        issues.push({
          rule: rule.name,
          type: rule.type,
          line: rule.line,
          column: rule.column,
          severity: 'info',
          issue: 'Deep nesting',
          description: `Rule has nesting depth of ${metrics.depth}, which increases memory usage.`,
          suggestion: 'Consider breaking down into simpler sub-rules.',
          category: 'memory',
        });
      }

      // Critical complexity
      if (metrics.score === 'critical') {
        issues.push({
          rule: rule.name,
          type: rule.type,
          line: rule.line,
          column: rule.column,
          severity: 'error',
          issue: 'Critical complexity',
          description: `Rule has critical complexity score (${metrics.complexityValue}). This may severely impact parse performance.`,
          suggestion:
            'This rule should be refactored to reduce complexity. Consider breaking it into smaller rules.',
          category: 'backtracking',
        });
      }
    }

    // Sort by severity
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      error: 1,
      warning: 2,
      info: 3,
    };
    issues.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return issues;
  }

  /**
   * Detect potential ambiguity hints
   */
  private detectAmbiguityHints(
    rules: RuleInfo[],
    _grammarContent: string
  ): AmbiguityHint[] {
    const hints: AmbiguityHint[] = [];

    for (const rule of rules) {
      if (rule.type !== 'parser') continue;

      const alternatives = this.splitAlternatives(rule.text);
      if (alternatives.length < 2) continue;

      // Extract first tokens of each alternative
      const prefixes = alternatives.map((alt, idx) => ({
        index: idx,
        prefix: this.extractPrefix(alt),
      }));

      // Group by common prefix
      const groups = new Map<string, number[]>();
      for (const { index, prefix } of prefixes) {
        const normalized = prefix.toLowerCase();
        if (!groups.has(normalized)) {
          groups.set(normalized, []);
        }
        groups.get(normalized)!.push(index);
      }

      // Find groups with multiple alternatives
      for (const [prefix, indices] of groups) {
        if (indices.length > 1 && prefix) {
          hints.push({
            rule: rule.name,
            line: rule.line,
            alternativeIndices: indices,
            commonPrefix: [prefix],
            description: `Alternatives ${indices.map((i) => i + 1).join(', ')} start with the same token '${prefix}', which may cause ambiguity.`,
          });
        }
      }
    }

    return hints;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    rules: RuleInfo[],
    unusedRules: UnusedRule[],
    complexity: ComplexityMetrics[],
    performanceIssues: PerformanceIssue[],
    ambiguityHints: AmbiguityHint[]
  ): AnalysisSummary {
    const parserRules = rules.filter((r) => r.type === 'parser').length;
    const lexerRules = rules.filter((r) => r.type === 'lexer').length;
    const fragmentRules = rules.filter((r) => r.type === 'fragment').length;

    const highComplexityRules = complexity.filter(
      (c) => c.score === 'high' || c.score === 'critical'
    ).length;

    const issuesBySeverity: Record<Severity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    for (const issue of performanceIssues) {
      issuesBySeverity[issue.severity]++;
    }

    // Count unused rules as warnings
    issuesBySeverity.warning += unusedRules.length;

    // Count ambiguity hints as info
    issuesBySeverity.info += ambiguityHints.length;

    return {
      totalRules: rules.length,
      parserRules,
      lexerRules,
      fragmentRules,
      unusedRules: unusedRules.length,
      highComplexityRules,
      performanceIssues: performanceIssues.length,
      ambiguityHints: ambiguityHints.length,
      issuesBySeverity,
    };
  }

  /**
   * Simple hash function for grammar content
   */
  private hashGrammar(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get cached result if valid
   */
  private getFromCache(hash: string): AnalysisResult | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result in cache
   */
  private setCache(hash: string, result: AnalysisResult): void {
    this.cache.set(hash, {
      result,
      hash,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 10) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const grammarAnalyzer = new GrammarAnalyzer();
