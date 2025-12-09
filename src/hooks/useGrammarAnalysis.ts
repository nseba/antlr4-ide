/**
 * React hook for managing grammar analysis state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { grammarAnalyzer, GrammarAnalyzer } from '../services/grammarAnalysis';
import {
  AnalysisResult,
  AnalysisOptions,
  AnalysisDecoration,
} from '../services/grammarAnalysis.types';

export interface UseGrammarAnalysisOptions {
  /** Automatically analyze on grammar change */
  autoAnalyze?: boolean;
  /** Debounce delay in ms for auto-analysis */
  debounceMs?: number;
  /** Analysis options */
  analysisOptions?: AnalysisOptions;
}

export interface UseGrammarAnalysisReturn {
  /** Current analysis result */
  result: AnalysisResult | null;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Trigger manual analysis */
  analyze: (grammarContent: string) => void;
  /** Clear analysis results */
  clearAnalysis: () => void;
  /** Get decorations for Monaco editor */
  getDecorations: () => AnalysisDecoration[];
  /** Set analysis options */
  setOptions: (options: AnalysisOptions) => void;
}

const DEFAULT_OPTIONS: UseGrammarAnalysisOptions = {
  autoAnalyze: true,
  debounceMs: 500,
  analysisOptions: {},
};

/**
 * Hook for managing grammar analysis state
 */
export function useGrammarAnalysis(
  initialOptions: UseGrammarAnalysisOptions = {}
): UseGrammarAnalysisReturn {
  const options = { ...DEFAULT_OPTIONS, ...initialOptions };

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>(
    options.analysisOptions || {}
  );

  const analyzerRef = useRef<GrammarAnalyzer>(grammarAnalyzer);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGrammarRef = useRef<string>('');

  /**
   * Perform analysis on grammar content
   */
  const performAnalysis = useCallback(
    (grammarContent: string) => {
      if (!grammarContent.trim()) {
        setResult(null);
        setError(null);
        return;
      }

      setIsAnalyzing(true);
      setError(null);

      try {
        const analysisResult = analyzerRef.current.analyze(
          grammarContent,
          analysisOptions
        );
        setResult(analysisResult);
        lastGrammarRef.current = grammarContent;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);
        setResult(null);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analysisOptions]
  );

  /**
   * Analyze grammar with optional debouncing
   */
  const analyze = useCallback(
    (grammarContent: string) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Skip if content hasn't changed
      if (grammarContent === lastGrammarRef.current && result) {
        return;
      }

      if (options.autoAnalyze && options.debounceMs && options.debounceMs > 0) {
        debounceTimerRef.current = setTimeout(() => {
          performAnalysis(grammarContent);
        }, options.debounceMs);
      } else {
        performAnalysis(grammarContent);
      }
    },
    [options.autoAnalyze, options.debounceMs, performAnalysis, result]
  );

  /**
   * Clear analysis results
   */
  const clearAnalysis = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setResult(null);
    setError(null);
    lastGrammarRef.current = '';
  }, []);

  /**
   * Generate Monaco editor decorations from analysis results
   */
  const getDecorations = useCallback((): AnalysisDecoration[] => {
    if (!result) return [];

    const decorations: AnalysisDecoration[] = [];

    // Unused rules - yellow warning
    for (const unused of result.unusedRules) {
      decorations.push({
        startLine: unused.line,
        startColumn: unused.column + 1,
        endLine: unused.line,
        endColumn: unused.column + unused.name.length + 1,
        severity: 'warning',
        message: unused.suggestion,
        source: 'unused',
      });
    }

    // Performance issues
    for (const issue of result.performanceIssues) {
      decorations.push({
        startLine: issue.line,
        startColumn: issue.column + 1,
        endLine: issue.line,
        endColumn: issue.column + issue.rule.length + 1,
        severity: issue.severity,
        message: `${issue.issue}: ${issue.description}\n\nSuggestion: ${issue.suggestion}`,
        source: 'performance',
      });
    }

    // Complexity warnings for high/critical rules
    for (const metric of result.complexity) {
      if (metric.score === 'high' || metric.score === 'critical') {
        const rule = result.rules.find((r) => r.name === metric.name);
        if (rule) {
          decorations.push({
            startLine: rule.line,
            startColumn: rule.column + 1,
            endLine: rule.line,
            endColumn: rule.column + rule.name.length + 1,
            severity: metric.score === 'critical' ? 'error' : 'warning',
            message: `Complexity: ${metric.score} (score: ${metric.complexityValue})\nDepth: ${metric.depth}, Alternatives: ${metric.alternatives}, References: ${metric.referenceCount}${metric.directlyRecursive ? '\nDirectly recursive' : ''}${metric.indirectlyRecursive ? '\nIndirectly recursive' : ''}`,
            source: 'complexity',
          });
        }
      }
    }

    // Ambiguity hints - info
    for (const hint of result.ambiguityHints) {
      const rule = result.rules.find((r) => r.name === hint.rule);
      if (rule) {
        decorations.push({
          startLine: hint.line,
          startColumn: rule.column + 1,
          endLine: hint.line,
          endColumn: rule.column + rule.name.length + 1,
          severity: 'info',
          message: hint.description,
          source: 'ambiguity',
        });
      }
    }

    return decorations;
  }, [result]);

  /**
   * Update analysis options
   */
  const setOptions = useCallback((newOptions: AnalysisOptions) => {
    setAnalysisOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    result,
    isAnalyzing,
    error,
    analyze,
    clearAnalysis,
    getDecorations,
    setOptions,
  };
}

export default useGrammarAnalysis;
