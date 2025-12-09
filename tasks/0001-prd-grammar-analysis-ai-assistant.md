# PRD: Grammar Analysis & AI Assistant

**Status:** In Progress (Tasks 1.0-6.0 Complete)

**Progress:**
- [x] Task 1.0: Grammar Analysis Engine - Complete
- [x] Task 2.0: Analysis UI Panel and Inline Annotations - Complete
- [x] Task 3.0: Interactive Parse Tree with Editor Selection - Complete
- [x] Task 4.0: AI Service with Multi-Provider Support - Complete
- [x] Task 5.0: AI Chat Panel UI - Complete
- [x] Task 6.0: Feature Integration and Layout Update - Complete
- [ ] Task 7.0: Testing, Documentation and QA - Not Started

## Introduction

ANTLR4 Lab Next currently provides basic grammar editing and parse tree visualization. Users need advanced tooling to understand grammar quality, identify potential issues, and get intelligent assistance for grammar development. This feature set adds comprehensive grammar analysis (unused rules, complexity metrics, performance bottlenecks), an AI-powered chatbot for grammar assistance, and improved tree-to-editor interactivity.

### Problem Statement

1. **No grammar quality feedback**: Users cannot easily identify unused rules, overly complex constructs, or potential performance issues in their grammars
2. **Limited learning support**: New users struggle to understand grammar structure, optimization techniques, and ANTLR best practices
3. **Disconnected visualization**: The parse tree is view-only; users cannot click nodes to navigate to corresponding code locations
4. **Manual optimization**: Users must manually analyze and refactor grammars without intelligent suggestions

## Goals

1. **Grammar Analysis**: Provide automated detection of unused rules, complexity metrics, and performance bottleneck identification with both inline editor annotations and a dedicated analysis panel
2. **AI Assistant**: Implement a configurable AI chatbot that can analyze, explain, refactor, optimize, and generate grammar rules
3. **Interactive Tree**: Enable bidirectional navigation between parse tree nodes and editor selections (both input text and grammar rules)
4. **Developer Experience**: Run analysis automatically on parse with manual refresh option, presenting results in an intuitive UI

## User Stories

### Grammar Analysis

1. **As a grammar developer**, I want to see which rules are never referenced so that I can clean up dead code from my grammar
2. **As a grammar developer**, I want to understand the complexity of each rule so that I can identify candidates for refactoring
3. **As a grammar developer**, I want to be warned about potential performance bottlenecks so that I can optimize my grammar before it causes issues
4. **As a grammar developer**, I want to see analysis results as inline annotations in the editor so that I can quickly locate issues
5. **As a grammar developer**, I want a detailed analysis panel so that I can review all issues in one place with explanations

### AI Assistant

6. **As a new ANTLR user**, I want to ask the AI to explain what a specific rule does so that I can understand existing grammars
7. **As a grammar developer**, I want to ask the AI to suggest refactoring improvements so that I can write cleaner grammars
8. **As a grammar developer**, I want the AI to help optimize rules for performance so that my parser runs efficiently
9. **As a grammar developer**, I want to describe a pattern in natural language and have the AI generate the grammar rule so that I can work faster
10. **As a user**, I want to choose my preferred AI provider so that I can use the service I have access to

### Interactive Tree

11. **As a user**, I want to click a node in the parse tree and have the corresponding text highlighted in the input editor so that I can see what text matched
12. **As a user**, I want to click a node in the parse tree and have the corresponding rule highlighted in the grammar editor so that I can see the rule definition
13. **As a user**, I want visual feedback when hovering over tree nodes so that I know they are clickable

## Functional Requirements

### FR1: Grammar Analysis Engine

1.1. **Unused Rule Detection**
   - Analyze all parser and lexer rules in loaded grammar files
   - Identify rules that are never referenced by other rules
   - Exclude the start rule from unused detection
   - Mark fragment rules that are never used by other lexer rules

1.2. **Complexity Metrics**
   - Calculate for each rule:
     - Rule depth (nesting level of sub-rules)
     - Number of alternatives (choices with `|`)
     - Token/rule reference count
     - Recursion detection (direct and indirect)
     - Lookahead requirements (k value estimation)
     - Ambiguity hints (potential ambiguous alternatives)
   - Assign complexity score (low/medium/high/critical)

1.3. **Performance Bottleneck Detection**
   - Identify rules with excessive backtracking potential
   - Detect left-recursive rules (report if not properly handled)
   - Flag rules with high lookahead requirements
   - Estimate relative parse time impact
   - Provide memory usage hints for deep recursion

1.4. **Analysis Execution**
   - Run automatically after each successful parse
   - Provide manual "Analyze" button for on-demand refresh
   - Cache results until grammar changes
   - Complete analysis within 500ms for typical grammars

### FR2: Analysis UI

2.1. **Inline Editor Annotations**
   - Display squiggly underlines in Monaco editor:
     - Yellow for warnings (unused rules, medium complexity)
     - Orange for performance concerns
     - Blue for informational hints
   - Show hover tooltip with issue description
   - Provide quick-fix suggestions where applicable

2.2. **Analysis Panel**
   - New tab alongside "Console" and "Tokens" tabs called "Analysis"
   - Sections:
     - **Summary**: Total rules, issues count by severity
     - **Unused Rules**: List with rule names, click to navigate
     - **Complexity Report**: Table with rule name, metrics, score
     - **Performance Issues**: List with description and suggestions
   - Filter/sort options for the lists
   - Click any item to jump to rule in editor

### FR3: AI Chatbot

3.1. **Provider Configuration**
   - Support multiple AI providers:
     - Anthropic Claude (claude-3-sonnet, claude-3-opus)
     - OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
     - Google Gemini (gemini-pro)
   - Settings panel to select provider and enter API key
   - Store API key in localStorage (with security warning)
   - Validate API key on save

3.2. **Chat Interface**
   - Collapsible side panel on the right side
   - Chat history with user/assistant message bubbles
   - Input field with send button
   - "Clear chat" button
   - Loading indicator during AI response
   - Copy button on assistant messages
   - Syntax highlighting for code blocks in responses

3.3. **AI Capabilities**
   - **Analyze**: "Analyze rule X" - detailed explanation of what a rule does
   - **Explain**: "Explain this grammar" - overview of grammar structure and purpose
   - **Refactor**: "Refactor rule X" - suggest cleaner alternatives
   - **Optimize**: "Optimize for performance" - performance improvement suggestions
   - **Generate**: "Create a rule that matches..." - generate rules from descriptions
   - **Fix**: "Fix the error in rule X" - help resolve grammar errors
   - **Describe**: "Describe what this grammar parses" - high-level description

3.4. **Context Awareness**
   - Automatically include current grammar content in prompts
   - Include selected text/rule if user has selection
   - Include recent parse errors for context
   - Include analysis results for optimization suggestions

### FR4: Interactive Parse Tree

4.1. **Click Behavior**
   - Clicking a tree node triggers dual selection:
     - In input editor: highlight the text span that matched
     - In grammar editor: highlight the rule definition
   - Smooth scroll to selection if off-screen
   - Visual pulse animation on selected elements

4.2. **Hover Behavior**
   - Change cursor to pointer on hoverable nodes
   - Highlight node on hover (subtle background change)
   - Show tooltip with: rule name, matched text preview, span position

4.3. **Selection Persistence**
   - Maintain selection until user clicks elsewhere
   - Clear selection when new parse is run
   - Support keyboard navigation (arrow keys) through tree nodes

### FR5: Editor Enhancements

5.1. **Grammar Editor**
   - Method to programmatically select/highlight a rule by name
   - Support highlighting multiple ranges (for complex rules)
   - Highlight style: background color + optional border

5.2. **Input Editor**
   - Method to programmatically select text by character range
   - Support for multi-range selection
   - Coordinate with token highlighting (don't conflict)

## Non-Goals (Out of Scope)

1. **Real-time collaboration**: No multi-user editing features
2. **Grammar version control**: No built-in git integration
3. **Custom AI fine-tuning**: Use standard models only, no custom training
4. **Offline AI**: Requires internet connection for AI features
5. **Grammar auto-fix**: AI suggests fixes, does not auto-apply them
6. **Cross-file analysis**: Analysis limited to loaded grammar files
7. **Historical analysis**: No tracking of analysis results over time

## Design Considerations

### Layout Changes

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header (Run, Save, Load, Start Rule, [Analyze])                     │
├────────┬──────────────────────────────────┬────────────┬────────────┤
│        │                                  │            │            │
│  File  │         Editor Area              │   Parse    │    AI      │
│  List  │    (Grammar / Input tabs)        │   Tree     │   Chat     │
│        │                                  │            │  (toggle)  │
│        │                                  │            │            │
├────────┴──────────────────────────────────┴────────────┴────────────┤
│ Console / Tokens / Analysis (tabs)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Color Scheme for Analysis

- **Unused rules**: Yellow underline, yellow icon in panel
- **High complexity**: Orange underline, orange icon
- **Performance issues**: Red underline, red icon
- **Info/suggestions**: Blue underline, blue icon

### AI Chat Panel

- Width: 350px default, resizable
- Toggle button in header or floating button
- Persists open/closed state in localStorage

## Technical Considerations

### Dependencies

- **AI Integration**: Need HTTP client for API calls to Claude/OpenAI/Gemini
- **Analysis Engine**: Pure TypeScript, runs in browser or server
- **Monaco Integration**: Use Monaco's decoration API for inline annotations

### Architecture

1. **Analysis Service** (`src/services/grammarAnalysis.ts`)
   - Parse grammar AST (use existing ANTLR4 parser)
   - Build reference graph for unused rule detection
   - Calculate complexity metrics
   - Return structured analysis results

2. **AI Service** (`src/services/aiService.ts`)
   - Abstract interface for multiple providers
   - Provider-specific implementations
   - Prompt engineering for grammar context
   - Streaming response support (optional)

3. **State Management**
   - Analysis results in React state
   - AI chat history in React state + localStorage
   - Provider config in localStorage

### API Considerations

- AI API calls should go through backend to protect API keys in production
- For development, direct browser calls acceptable with user-provided keys
- Rate limiting considerations for AI calls

### Performance

- Analysis should be non-blocking (use Web Worker if needed)
- Debounce analysis on rapid grammar changes
- Lazy-load AI panel components
- Virtualize long analysis result lists

## Success Metrics

1. **Analysis Accuracy**: >95% accuracy in unused rule detection
2. **Analysis Speed**: Complete analysis in <500ms for grammars under 1000 lines
3. **AI Response Time**: First token within 2 seconds of sending request
4. **User Engagement**: Track usage of AI features (local analytics only)
5. **Tree Navigation**: Click-to-select completes within 100ms

## Open Questions

1. **API Key Security**: Should we require backend proxy for AI calls in production, or trust user-provided keys in localStorage?
2. **AI Cost Management**: Should we add token counting/budget features to prevent unexpected API costs?
3. **Analysis Caching**: How long should we cache analysis results? Per-session or persist to localStorage?
4. **Grammar AST Access**: Can we reuse the Java parser's AST output, or do we need a separate TypeScript grammar parser for analysis?
5. **Provider Defaults**: Should we pre-configure a default provider or require user setup?

## Appendix

### Example Analysis Output

```json
{
  "summary": {
    "totalRules": 45,
    "unusedRules": 3,
    "highComplexityRules": 5,
    "performanceIssues": 2
  },
  "unusedRules": [
    { "name": "deprecatedExpr", "line": 42, "type": "parser" },
    { "name": "OLD_KEYWORD", "line": 156, "type": "lexer" }
  ],
  "complexity": [
    {
      "name": "expression",
      "depth": 5,
      "alternatives": 12,
      "references": 8,
      "recursive": true,
      "lookahead": 3,
      "score": "high"
    }
  ],
  "performance": [
    {
      "rule": "statement",
      "issue": "High backtracking potential",
      "suggestion": "Consider reordering alternatives by frequency"
    }
  ]
}
```

### Example AI Prompts

**Analyze Rule:**
```
You are an ANTLR4 grammar expert. Analyze the following rule and explain what it does:

Rule: expression
: primary
| expression ('*'|'/') expression
| expression ('+'|'-') expression
;

Grammar context: [full grammar here]
```

**Optimize:**
```
You are an ANTLR4 performance expert. Review this grammar and suggest optimizations:

[grammar content]

Current analysis shows these performance issues:
- Rule 'statement' has high backtracking potential
- Rule 'expression' has lookahead of 5

Provide specific, actionable suggestions.
```
