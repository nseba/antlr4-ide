# Tasks: Grammar Analysis & AI Assistant

Generated from: `0001-prd-grammar-analysis-ai-assistant.md`

## Relevant Files

### New Files to Create

- `src/services/grammarAnalysis.ts` - Grammar analysis engine (unused rules, complexity, performance)
- `src/services/grammarAnalysis.types.ts` - Type definitions for analysis results
- `src/services/aiService.ts` - Abstract AI service interface and factory
- `src/services/aiProviders/anthropic.ts` - Anthropic Claude provider implementation
- `src/services/aiProviders/openai.ts` - OpenAI GPT provider implementation
- `src/services/aiProviders/gemini.ts` - Google Gemini provider implementation
- `src/services/aiProviders/index.ts` - Provider exports and factory
- `src/components/AnalysisPanel.tsx` - Analysis results panel UI component
- `src/components/AIChatPanel.tsx` - AI chat side panel component
- `src/components/AISettingsModal.tsx` - AI provider configuration modal
- `src/components/ChatMessage.tsx` - Individual chat message component
- `src/hooks/useGrammarAnalysis.ts` - React hook for grammar analysis state
- `src/hooks/useAIChat.ts` - React hook for AI chat state and history
- `server/routes/ai.ts` - Backend proxy routes for AI API calls

### Files to Modify

- `src/App.tsx` - Update layout, add AI panel toggle, integrate analysis
- `src/components/TreeVisualizer.tsx` - Add click handlers for editor selection
- `src/components/CodeEditor.tsx` - Add methods for programmatic selection and decorations
- `src/types/index.ts` - Add new type definitions
- `src/utils/antlr/types.ts` - Extend ParseNode with position info for tree selection
- `server/index.ts` - Add AI proxy routes
- `package.json` - Add any new dependencies (markdown rendering, syntax highlighting)

### Test Files

- `src/services/__tests__/grammarAnalysis.test.ts` - Unit tests for analysis engine
- `src/services/__tests__/aiService.test.ts` - Unit tests for AI service

## Tasks

- [x] 1.0 Implement Grammar Analysis Engine
  - [x] 1.1 Create `src/services/grammarAnalysis.types.ts` with TypeScript interfaces for analysis results (AnalysisResult, UnusedRule, ComplexityMetrics, PerformanceIssue, RuleInfo)
  - [x] 1.2 Create `src/services/grammarAnalysis.ts` with GrammarAnalyzer class skeleton and main analyze() method signature
  - [x] 1.3 Implement grammar parsing logic to extract all rule definitions (parser rules, lexer rules, fragments) with their line numbers and positions
  - [x] 1.4 Implement rule reference graph builder to track which rules reference which other rules
  - [x] 1.5 Implement unused rule detection algorithm using the reference graph, excluding start rule
  - [x] 1.6 Implement complexity metrics calculator: rule depth, number of alternatives, token count, reference count
  - [x] 1.7 Implement recursion detection (direct and indirect) using depth-first search on reference graph
  - [x] 1.8 Implement lookahead estimation based on alternative patterns and optional elements
  - [x] 1.9 Implement ambiguity hint detection for alternatives that start with the same tokens
  - [x] 1.10 Implement performance bottleneck detection: backtracking potential, high lookahead, deep recursion warnings
  - [x] 1.11 Implement complexity score calculation (low/medium/high/critical) based on weighted metrics
  - [x] 1.12 Add caching mechanism to avoid re-analyzing unchanged grammars
  - [x] 1.13 Create `src/hooks/useGrammarAnalysis.ts` hook to manage analysis state in React
  - [ ] 1.14 Write unit tests in `src/services/__tests__/grammarAnalysis.test.ts` for all analysis functions
  - [x] 1.15 Run linter and fix any warnings
  - [x] 1.16 Run test suite and verify all tests pass
  - [x] 1.17 Build project and verify successful compilation
  - [ ] 1.18 Manually test analysis with sample grammars of varying complexity

- [x] 2.0 Create Analysis UI Panel and Inline Annotations
  - [x] 2.1 Update `src/types/index.ts` to add AnalysisResult type and related interfaces for UI consumption
  - [x] 2.2 Create `src/components/AnalysisPanel.tsx` with summary section showing total rules, issues by severity
  - [x] 2.3 Add Unused Rules section to AnalysisPanel with clickable list items
  - [x] 2.4 Add Complexity Report section with sortable table (rule name, depth, alternatives, score)
  - [x] 2.5 Add Performance Issues section with descriptions and suggestions
  - [x] 2.6 Implement filter/sort controls for each section in AnalysisPanel
  - [x] 2.7 Add click-to-navigate functionality: clicking an issue scrolls to and highlights the rule in editor
  - [x] 2.8 Update `src/components/CodeEditor.tsx` to accept decorations prop for inline annotations
  - [x] 2.9 Implement Monaco decoration API integration for squiggly underlines (yellow=warning, orange=perf, blue=info)
  - [x] 2.10 Add hover tooltip provider in CodeEditor to show issue details on hover
  - [x] 2.11 Update `src/App.tsx` to add "Analysis" tab alongside Console and Tokens tabs
  - [x] 2.12 Wire up analysis results to both AnalysisPanel and CodeEditor decorations
  - [x] 2.13 Add "Analyze" button to header that triggers manual analysis refresh
  - [x] 2.14 Implement auto-analysis after successful parse (with debouncing)
  - [x] 2.15 Run linter and fix any warnings
  - [x] 2.16 Run test suite and verify all tests pass
  - [x] 2.17 Build project and verify successful compilation
  - [ ] 2.18 Manually test analysis UI with various grammars, verify navigation works

- [x] 3.0 Implement Interactive Parse Tree with Editor Selection
  - [x] 3.1 Update `src/utils/antlr/types.ts` to add start/stop positions to ParseNode for text span tracking
  - [x] 3.2 Update `src/utils/antlr/JavaParser.ts` to extract and include text positions in ParseNode from TestRig output
  - [x] 3.3 Update `src/components/CodeEditor.tsx` to expose imperative methods via forwardRef: selectRange(), highlightRange(), clearHighlights()
  - [x] 3.4 Create editor ref types in `src/types/index.ts` for CodeEditorRef interface
  - [x] 3.5 Update `src/App.tsx` to create refs for grammar editor and input editor instances
  - [x] 3.6 Update `src/components/TreeVisualizer.tsx` props to include onNodeClick callback with ParseNode data
  - [x] 3.7 Implement hover effects in TreeVisualizer: cursor pointer, subtle background highlight on hover
  - [x] 3.8 Add tooltip on hover showing rule name, matched text preview, and span position
  - [x] 3.9 Implement click handler in TreeVisualizer that emits node data with position info
  - [x] 3.10 Update `src/App.tsx` to handle tree node clicks: highlight text span in input editor
  - [x] 3.11 Implement grammar rule lookup: find rule definition line by rule name in grammar content
  - [x] 3.12 Update `src/App.tsx` to also highlight/navigate to rule definition in grammar editor on node click
  - [x] 3.13 Add smooth scroll behavior when selection is off-screen
  - [x] 3.14 Add visual pulse animation CSS for newly selected elements
  - [x] 3.15 Implement selection clearing when new parse is run or user clicks elsewhere
  - [x] 3.16 Run linter and fix any warnings
  - [x] 3.17 Run test suite and verify all tests pass
  - [x] 3.18 Build project and verify successful compilation
  - [ ] 3.19 Manually test tree click behavior with various parse trees

- [x] 4.0 Build AI Service with Multi-Provider Support
  - [x] 4.1 Create `src/services/aiService.types.ts` with AIProvider interface (sendMessage, validateKey, getModels)
  - [x] 4.2 Create `src/services/aiProviders/index.ts` with provider factory and type exports
  - [x] 4.3 Implement `src/services/aiProviders/anthropic.ts` Claude provider with streaming support
  - [x] 4.4 Implement `src/services/aiProviders/openai.ts` OpenAI provider with streaming support
  - [x] 4.5 Implement `src/services/aiProviders/gemini.ts` Gemini provider with streaming support
  - [x] 4.6 Create prompt templates in `src/services/aiPrompts.ts` for each AI capability
  - [x] 4.7 Implement context builder that includes grammar content, selection, errors in prompts
  - [x] 4.8 Add `server/routes/ai.ts` with proxy endpoints for each provider to protect API keys
  - [x] 4.9 Update `server/index.ts` to mount AI routes under /api/ai/*
  - [x] 4.10 Implement API key validation endpoint for each provider
  - [ ] 4.11 Add rate limiting middleware for AI endpoints (deferred - not critical)
  - [x] 4.12 Create `src/hooks/useAIChat.ts` hook for managing chat state, history, and localStorage persistence
  - [ ] 4.13 Write unit tests in `src/services/__tests__/aiService.test.ts` for provider implementations
  - [x] 4.14 Run linter and fix any warnings
  - [x] 4.15 Run test suite and verify all tests pass
  - [x] 4.16 Build project and verify successful compilation
  - [ ] 4.17 Manually test AI service with each provider using test API keys

- [x] 5.0 Create AI Chat Panel UI
  - [x] 5.1 Create `src/components/ChatMessage.tsx` component with user/assistant message styling
  - [x] 5.2 Add code block parsing in ChatMessage with copy functionality
  - [x] 5.3 Add copy-to-clipboard button on code blocks
  - [x] 5.4 Create `src/components/AIChatPanel.tsx` with collapsible panel structure (350px default width)
  - [x] 5.5 Implement chat history display with auto-scroll to latest message
  - [x] 5.6 Add message input field with send button and Enter key support
  - [x] 5.7 Add loading indicator (typing animation) while waiting for AI response
  - [x] 5.8 Implement streaming response display (show text as it arrives)
  - [x] 5.9 Add "Clear chat" button to reset conversation
  - [x] 5.10 Create `src/components/AISettingsModal.tsx` for provider selection and API key entry
  - [x] 5.11 Add provider radio buttons (Claude, OpenAI, Gemini) in settings modal
  - [x] 5.12 Add model selection dropdown based on chosen provider
  - [x] 5.13 Add API key input field with show/hide toggle and security warning
  - [x] 5.14 Implement API key validation on save with user feedback
  - [x] 5.15 Store provider config and API key in localStorage (via useAIChat hook)
  - [x] 5.16 Add settings gear icon button in chat panel header to open settings modal
  - [x] 5.17 Implement panel resize handle for adjustable width
  - [x] 5.18 Persist panel open/closed state and width in localStorage (via useAIChat hook)
  - [x] 5.19 Run linter and fix any warnings
  - [x] 5.20 Run test suite and verify all tests pass
  - [x] 5.21 Build project and verify successful compilation
  - [ ] 5.22 Manually test chat panel UI interactions and settings

- [x] 6.0 Integrate All Features and Update Layout
  - [x] 6.1 Update `src/App.tsx` layout to accommodate AI chat panel on right side
  - [x] 6.2 Add AI panel toggle button to header (MessageSquare icon from lucide-react)
  - [x] 6.3 Implement conditional rendering of AI panel based on toggle state
  - [x] 6.4 Wire up grammar analysis to run automatically after successful parse (already done in Task 2)
  - [x] 6.5 Connect analysis results to AnalysisPanel component (already done in Task 2)
  - [x] 6.6 Connect analysis results to CodeEditor decorations (already done in Task 2)
  - [x] 6.7 Wire up tree node click handler to editor selection functions (already done in Task 3)
  - [x] 6.8 Connect AI chat to use current grammar and selection as context
  - [x] 6.9 Pass recent parse errors to AI context for the "fix" capability
  - [x] 6.10 Pass analysis results to AI context for optimization suggestions
  - [x] 6.11 Update App state management to handle all new features coherently
  - [x] 6.12 Ensure proper cleanup of subscriptions and event listeners (hooks handle cleanup)
  - [ ] 6.13 Test responsive behavior with different window sizes
  - [x] 6.14 Run linter and fix any warnings
  - [x] 6.15 Run test suite and verify all tests pass
  - [x] 6.16 Build project and verify successful compilation
  - [ ] 6.17 End-to-end manual testing of complete feature integration

- [ ] 7.0 Testing, Documentation and Quality Assurance
  - [ ] 7.1 Write comprehensive unit tests for grammarAnalysis service achieving >80% coverage
  - [ ] 7.2 Write unit tests for AI service providers
  - [ ] 7.3 Write integration tests for tree-to-editor selection flow
  - [ ] 7.4 Test all AI providers with real API keys (manual testing checklist)
  - [ ] 7.5 Test analysis accuracy with known grammars that have unused rules
  - [ ] 7.6 Test complexity metrics against manually calculated values
  - [ ] 7.7 Performance test: verify analysis completes in <500ms for 1000-line grammars
  - [ ] 7.8 Performance test: verify tree click-to-select completes in <100ms
  - [ ] 7.9 Update CLAUDE.md with new architecture documentation
  - [ ] 7.10 Add inline code comments for complex analysis algorithms
  - [ ] 7.11 Update Dockerfile if new dependencies require system packages
  - [ ] 7.12 Test Docker build and container startup
  - [ ] 7.13 Run full linter check and fix all warnings
  - [ ] 7.14 Run complete test suite and verify 100% pass rate
  - [ ] 7.15 Build production bundle and verify no errors
  - [ ] 7.16 Perform final end-to-end testing of all features
  - [ ] 7.17 Create git commit with all changes

## Notes

- Test commands: `npm run test`, `npm run lint`, `npm run build`
- Dev server: `npm run dev:all` (runs both frontend and backend)
- The AI chat panel should be lazy-loaded to improve initial page load
- Monaco decorations use the `deltaDecorations` API for inline annotations
- Consider using `react-markdown` and `react-syntax-highlighter` for chat message rendering
- API keys stored in localStorage should display a security warning to users
- The grammar analysis runs in the browser; for very large grammars, consider moving to a Web Worker
