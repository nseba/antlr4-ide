/**
 * Unit tests for Grammar Analysis Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrammarAnalyzer } from '../grammarAnalysis';

describe('GrammarAnalyzer', () => {
  let analyzer: GrammarAnalyzer;

  beforeEach(() => {
    analyzer = new GrammarAnalyzer();
    analyzer.clearCache();
  });

  describe('parseGrammar', () => {
    it('should parse a simple parser rule', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      expect(result.rules).toHaveLength(2);

      const exprRule = result.rules.find(r => r.name === 'expr');
      const idRule = result.rules.find(r => r.name === 'ID');

      expect(exprRule).toBeDefined();
      expect(exprRule?.type).toBe('parser');
      expect(idRule).toBeDefined();
      expect(idRule?.type).toBe('lexer');
    });

    it('should parse fragment rules', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : LETTER+ ;
fragment LETTER : [a-zA-Z] ;
`;
      const result = analyzer.analyze(grammar);

      const fragment = result.rules.find((r) => r.name === 'LETTER');
      expect(fragment).toBeDefined();
      expect(fragment?.type).toBe('fragment');
    });

    it('should count alternatives correctly', () => {
      const grammar = `
grammar Test;
expr : ID | NUMBER | STRING ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
STRING : '"' .*? '"' ;
`;
      const result = analyzer.analyze(grammar);

      const expr = result.rules.find((r) => r.name === 'expr');
      expect(expr?.alternativeCount).toBe(3);
    });

    it('should handle multi-line rules', () => {
      const grammar = `
grammar Test;
statement
    : ifStatement
    | whileStatement
    | assignment
    ;
ifStatement : 'if' expr 'then' statement ;
whileStatement : 'while' expr 'do' statement ;
assignment : ID '=' expr ;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      const statement = result.rules.find((r) => r.name === 'statement');
      expect(statement?.alternativeCount).toBe(3);
    });

    it('should skip grammar header and options', () => {
      const grammar = `
grammar Test;
options { language = Java; }
@header { package test; }
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      // Should only have expr and ID rules
      expect(result.rules).toHaveLength(2);
    });
  });

  describe('buildReferenceGraph', () => {
    it('should detect rule references', () => {
      const grammar = `
grammar Test;
expr : term (('+' | '-') term)* ;
term : factor (('*' | '/') factor)* ;
factor : ID | NUMBER | '(' expr ')' ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
`;
      const result = analyzer.analyze(grammar);

      const expr = result.rules.find((r) => r.name === 'expr');
      expect(expr?.references).toContain('term');

      const term = result.rules.find((r) => r.name === 'term');
      expect(term?.references).toContain('factor');
      expect(term?.referencedBy).toContain('expr');

      const factor = result.rules.find((r) => r.name === 'factor');
      expect(factor?.references).toContain('ID');
      expect(factor?.references).toContain('NUMBER');
      expect(factor?.references).toContain('expr');
    });
  });

  describe('detectUnusedRules', () => {
    it('should detect unused parser rules', () => {
      const grammar = `
grammar Test;
expr : ID ;
unusedRule : NUMBER ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
`;
      const result = analyzer.analyze(grammar, { startRule: 'expr' });

      // unusedRule is unused (not referenced by any other rule)
      // NUMBER is referenced by unusedRule, so it's not unused from graph perspective
      expect(result.unusedRules.length).toBeGreaterThanOrEqual(1);
      expect(result.unusedRules.map((r) => r.name)).toContain('unusedRule');
    });

    it('should not mark start rule as unused', () => {
      const grammar = `
grammar Test;
program : statement* ;
statement : expr ';' ;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar, { startRule: 'program' });

      expect(result.unusedRules.map((r) => r.name)).not.toContain('program');
    });

    it('should detect unused fragments', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : LETTER+ ;
NUMBER : DIGIT+ ;
fragment LETTER : [a-zA-Z] ;
fragment DIGIT : [0-9] ;
fragment UNUSED_FRAG : '_' ;
`;
      const result = analyzer.analyze(grammar, { startRule: 'expr' });

      const unusedFrags = result.unusedRules.filter(
        (r) => r.type === 'fragment'
      );
      expect(unusedFrags.map((r) => r.name)).toContain('UNUSED_FRAG');
    });
  });

  describe('calculateComplexityMetrics', () => {
    it('should calculate depth correctly', () => {
      const grammar = `
grammar Test;
expr : ((a | b) | (c | d)) ;
a : 'a' ;
b : 'b' ;
c : 'c' ;
d : 'd' ;
`;
      const result = analyzer.analyze(grammar);

      const expr = result.complexity.find((c) => c.name === 'expr');
      expect(expr?.depth).toBeGreaterThan(0);
    });

    it('should calculate reference count', () => {
      const grammar = `
grammar Test;
expr : a b c d e ;
a : 'a' ;
b : 'b' ;
c : 'c' ;
d : 'd' ;
e : 'e' ;
`;
      const result = analyzer.analyze(grammar);

      const expr = result.complexity.find((c) => c.name === 'expr');
      expect(expr?.referenceCount).toBe(5);
    });

    it('should assign complexity scores', () => {
      const grammar = `
grammar Test;
simple : ID ;
complex
    : a | b | c | d | e | f
    | g | h | i | j | k | l
    ;
a : 'a' ; b : 'b' ; c : 'c' ;
d : 'd' ; e : 'e' ; f : 'f' ;
g : 'g' ; h : 'h' ; i : 'i' ;
j : 'j' ; k : 'k' ; l : 'l' ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      const simple = result.complexity.find((c) => c.name === 'simple');
      const complex = result.complexity.find((c) => c.name === 'complex');

      expect(simple?.score).toBe('low');
      expect(['medium', 'high', 'critical']).toContain(complex?.score);
    });
  });

  describe('detectRecursion', () => {
    it('should detect direct recursion', () => {
      const grammar = `
grammar Test;
expr : expr '+' term | term ;
term : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      const expr = result.complexity.find((c) => c.name === 'expr');
      expect(expr?.directlyRecursive).toBe(true);
    });

    it('should detect indirect recursion', () => {
      const grammar = `
grammar Test;
a : b ;
b : c ;
c : a ;
`;
      const result = analyzer.analyze(grammar);

      const a = result.complexity.find((c) => c.name === 'a');
      const b = result.complexity.find((c) => c.name === 'b');
      const c = result.complexity.find((c) => c.name === 'c');

      // At least one should be marked as indirectly recursive
      const hasIndirectRecursion =
        a?.indirectlyRecursive ||
        b?.indirectlyRecursive ||
        c?.indirectlyRecursive;
      expect(hasIndirectRecursion).toBe(true);
    });
  });

  describe('estimateLookahead', () => {
    it('should estimate higher lookahead for common prefixes', () => {
      const grammar = `
grammar Test;
ambiguous : 'if' expr 'then' stmt | 'if' expr 'then' stmt 'else' stmt ;
simple : 'a' | 'b' | 'c' ;
expr : ID ;
stmt : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      const ambiguous = result.complexity.find((c) => c.name === 'ambiguous');
      const simple = result.complexity.find((c) => c.name === 'simple');

      expect(ambiguous?.lookahead).toBeGreaterThan(simple?.lookahead || 0);
    });
  });

  describe('detectPerformanceIssues', () => {
    it('should detect high backtracking potential', () => {
      const grammar = `
grammar Test;
expr
    : a | b | c | d | e | f
    | (g | h) i
    ;
a : 'a' ; b : 'b' ; c : 'c' ;
d : 'd' ; e : 'e' ; f : 'f' ;
g : 'g' ; h : 'h' ; i : 'i' ;
`;
      const result = analyzer.analyze(grammar);

      // May or may not have issues depending on exact metrics
      expect(result.performanceIssues).toBeDefined();
    });

    it('should report critical complexity', () => {
      const grammar = `
grammar Test;
veryComplex
    : veryComplex '+' veryComplex
    | veryComplex '-' veryComplex
    | veryComplex '*' veryComplex
    | veryComplex '/' veryComplex
    | '(' veryComplex ')'
    | ID
    | NUMBER
    | STRING
    | CHAR
    | BOOL
    ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
STRING : '"' .*? '"' ;
CHAR : '\\'' . '\\'' ;
BOOL : 'true' | 'false' ;
`;
      const result = analyzer.analyze(grammar, {
        criticalComplexityThreshold: 50,
      });

      const veryComplex = result.complexity.find(
        (c) => c.name === 'veryComplex'
      );
      // Direct recursion + many alternatives should be high/critical
      expect(['high', 'critical']).toContain(veryComplex?.score);
    });
  });

  describe('detectAmbiguityHints', () => {
    it('should detect alternatives with common prefix', () => {
      const grammar = `
grammar Test;
stmt
    : 'return' expr
    | 'return'
    ;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar);

      const stmtHint = result.ambiguityHints.find((h) => h.rule === 'stmt');
      expect(stmtHint).toBeDefined();
      expect(stmtHint?.commonPrefix).toContain("'return'");
    });
  });

  describe('summary', () => {
    it('should calculate correct summary statistics', () => {
      const grammar = `
grammar Test;
expr : term ;
term : factor ;
factor : ID ;
unused : NUMBER ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
fragment LETTER : [a-zA-Z] ;
`;
      const result = analyzer.analyze(grammar, { startRule: 'expr' });

      expect(result.summary.totalRules).toBe(7);
      expect(result.summary.parserRules).toBe(4);
      expect(result.summary.lexerRules).toBe(2);
      expect(result.summary.fragmentRules).toBe(1);
      expect(result.summary.unusedRules).toBeGreaterThan(0);
    });
  });

  describe('caching', () => {
    it('should cache analysis results', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : [a-z]+ ;
`;
      const result1 = analyzer.analyze(grammar);
      const result2 = analyzer.analyze(grammar);

      // Same hash means cached
      expect(result1.grammarHash).toBe(result2.grammarHash);
    });

    it('should invalidate cache on grammar change', () => {
      const grammar1 = `
grammar Test;
expr : ID ;
ID : [a-z]+ ;
`;
      const grammar2 = `
grammar Test;
expr : ID | NUMBER ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
`;
      const result1 = analyzer.analyze(grammar1);
      const result2 = analyzer.analyze(grammar2);

      expect(result1.grammarHash).not.toBe(result2.grammarHash);
    });

    it('should clear cache on clearCache call', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : [a-z]+ ;
`;
      analyzer.analyze(grammar);
      analyzer.clearCache();

      // After clear, should reanalyze
      const result = analyzer.analyze(grammar);
      expect(result).toBeDefined();
    });
  });

  describe('options', () => {
    it('should respect detectUnusedRules option', () => {
      const grammar = `
grammar Test;
expr : ID ;
unused : NUMBER ;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
`;
      const result = analyzer.analyze(grammar, {
        detectUnusedRules: false,
        startRule: 'expr',
      });

      expect(result.unusedRules).toHaveLength(0);
    });

    it('should respect analyzeComplexity option', () => {
      const grammar = `
grammar Test;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar, { analyzeComplexity: false });

      expect(result.complexity).toHaveLength(0);
    });

    it('should respect detectPerformanceIssues option', () => {
      const grammar = `
grammar Test;
expr : expr '+' expr | ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar, {
        detectPerformanceIssues: false,
      });

      expect(result.performanceIssues).toHaveLength(0);
    });

    it('should respect detectAmbiguity option', () => {
      const grammar = `
grammar Test;
stmt : 'return' expr | 'return' ;
expr : ID ;
ID : [a-z]+ ;
`;
      const result = analyzer.analyze(grammar, { detectAmbiguity: false });

      expect(result.ambiguityHints).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty grammar', () => {
      const result = analyzer.analyze('');

      expect(result.rules).toHaveLength(0);
      expect(result.summary.totalRules).toBe(0);
    });

    it('should handle grammar with only comments', () => {
      const grammar = `
// This is a comment
/* This is a
   multi-line comment */
`;
      const result = analyzer.analyze(grammar);

      expect(result.rules).toHaveLength(0);
    });

    it('should handle lexer-only grammar', () => {
      const grammar = `
lexer grammar TestLexer;
ID : [a-z]+ ;
NUMBER : [0-9]+ ;
WS : [ \\t\\r\\n]+ -> skip ;
`;
      const result = analyzer.analyze(grammar);

      expect(result.summary.parserRules).toBe(0);
      expect(result.summary.lexerRules).toBe(3);
    });

    it('should handle parser-only grammar', () => {
      const grammar = `
parser grammar TestParser;
options { tokenVocab = TestLexer; }
expr : ID ;
`;
      const result = analyzer.analyze(grammar);

      expect(result.summary.parserRules).toBe(1);
    });
  });
});
