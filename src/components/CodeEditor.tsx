import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { EditorDecoration, CodeEditorRef } from '@/types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
  decorations?: EditorDecoration[];
}

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  ({ value, onChange, language = 'antlr4', readOnly = false, decorations = [] }, ref) => {
    const monaco = useMonaco();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const decorationIdsRef = useRef<string[]>([]);
    const highlightDecorationIdsRef = useRef<string[]>([]);

    // Handle editor mount
    const handleEditorDidMount: OnMount = (editor) => {
      editorRef.current = editor;
    };

    // Apply decorations when they change
    React.useEffect(() => {
      if (!editorRef.current || !monaco) return;

      const monacoDecorations: editor.IModelDeltaDecoration[] = decorations.map((dec) => {
        let className = 'analysis-decoration-info';
        let glyphClassName = 'analysis-glyph-info';

        switch (dec.severity) {
          case 'warning':
            className = 'analysis-decoration-warning';
            glyphClassName = 'analysis-glyph-warning';
            break;
          case 'error':
            className = 'analysis-decoration-error';
            glyphClassName = 'analysis-glyph-error';
            break;
          case 'critical':
            className = 'analysis-decoration-critical';
            glyphClassName = 'analysis-glyph-critical';
            break;
        }

        return {
          range: new monaco.Range(
            dec.startLine,
            dec.startColumn,
            dec.endLine,
            dec.endColumn
          ),
          options: {
            className,
            glyphMarginClassName: glyphClassName,
            hoverMessage: { value: `**${dec.source}**: ${dec.message}` },
            overviewRuler: {
              color: dec.severity === 'critical' ? '#ef4444' :
                     dec.severity === 'error' ? '#f97316' :
                     dec.severity === 'warning' ? '#eab308' : '#3b82f6',
              position: monaco.editor.OverviewRulerLane.Right,
            },
          },
        };
      });

      decorationIdsRef.current = editorRef.current.deltaDecorations(
        decorationIdsRef.current,
        monacoDecorations
      );
    }, [decorations, monaco]);

    // Expose imperative methods
    const selectRange = useCallback(
      (startLine: number, startCol: number, endLine: number, endCol: number) => {
        if (!editorRef.current) return;
        editorRef.current.setSelection({
          startLineNumber: startLine,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        });
        editorRef.current.revealLineInCenter(startLine);
      },
      []
    );

    const highlightRange = useCallback(
      (startLine: number, startCol: number, endLine: number, endCol: number, className = 'highlight-range') => {
        if (!editorRef.current || !monaco) return;

        const decoration: editor.IModelDeltaDecoration = {
          range: new monaco.Range(startLine, startCol, endLine, endCol),
          options: {
            className,
            isWholeLine: false,
          },
        };

        highlightDecorationIdsRef.current = editorRef.current.deltaDecorations(
          highlightDecorationIdsRef.current,
          [decoration]
        );
      },
      [monaco]
    );

    const clearHighlights = useCallback(() => {
      if (!editorRef.current) return;
      highlightDecorationIdsRef.current = editorRef.current.deltaDecorations(
        highlightDecorationIdsRef.current,
        []
      );
    }, []);

    const revealLine = useCallback((line: number) => {
      if (!editorRef.current) return;
      editorRef.current.revealLineInCenter(line);
    }, []);

    const setDecorations = useCallback(
      (newDecorations: EditorDecoration[]) => {
        if (!editorRef.current || !monaco) return;

        const monacoDecorations: editor.IModelDeltaDecoration[] = newDecorations.map((dec) => ({
          range: new monaco.Range(
            dec.startLine,
            dec.startColumn,
            dec.endLine,
            dec.endColumn
          ),
          options: {
            className: `analysis-decoration-${dec.severity}`,
            glyphMarginClassName: `analysis-glyph-${dec.severity}`,
            hoverMessage: { value: `**${dec.source}**: ${dec.message}` },
          },
        }));

        decorationIdsRef.current = editorRef.current.deltaDecorations(
          decorationIdsRef.current,
          monacoDecorations
        );
      },
      [monaco]
    );

    const clearDecorations = useCallback(() => {
      if (!editorRef.current) return;
      decorationIdsRef.current = editorRef.current.deltaDecorations(
        decorationIdsRef.current,
        []
      );
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        selectRange,
        highlightRange,
        clearHighlights,
        revealLine,
        setDecorations,
        clearDecorations,
      }),
      [selectRange, highlightRange, clearHighlights, revealLine, setDecorations, clearDecorations]
    );

    // Register ANTLR4 language
    React.useEffect(() => {
      if (monaco) {
        // Register a comprehensive ANTLR4 language definition
        if (!monaco.languages.getLanguages().some((l) => l.id === 'antlr4')) {
          monaco.languages.register({ id: 'antlr4' });
          monaco.languages.setMonarchTokensProvider('antlr4', {
            keywords: [
              'grammar', 'lexer', 'parser', 'options', 'tokens', 'channels',
              'import', 'fragment', 'mode', 'pushMode', 'popMode', 'type',
              'skip', 'channel', 'returns', 'locals', 'throws', 'catch', 'finally',
              'private', 'protected', 'public'
            ],
            operators: ['|', '?', '*', '+', '~', '->', '=>', '..', '.'],
            symbols: /[=><!~?:&|+\-*/^%]+/,
            tokenizer: {
              root: [
                // Keywords
                [/\b(grammar|lexer|parser|options|tokens|channels|import|fragment|mode)\b/, 'keyword'],
                [/\b(returns|locals|throws|catch|finally)\b/, 'keyword'],
                [/->\s*(skip|channel|type|pushMode|popMode|mode)\b/, 'keyword'],

                // Actions and semantic predicates
                [/\{/, { token: 'delimiter.curly', next: '@action' }],
                [/\[/, { token: 'delimiter.square', next: '@args' }],

                // Lexer rules (UPPERCASE)
                [/[A-Z][A-Z0-9_]*/, 'type.identifier'],

                // Parser rules (lowercase)
                [/[a-z][a-zA-Z0-9_]*/, 'identifier'],

                // Strings
                [/'[^']*'/, 'string'],

                // Character sets
                [/\[/, { token: 'string.bracket', next: '@charset' }],

                // Comments
                [/\/\/.*$/, 'comment'],
                [/\/\*/, { token: 'comment', next: '@comment' }],

                // Operators and delimiters
                [/[{}()[\]:;|?*+~]/, 'delimiter'],
                [/->/, 'keyword.operator'],
                [/\.\./, 'operator'],
                [/#/, 'annotation'],
                [/@[a-zA-Z_][a-zA-Z0-9_]*/, 'annotation'],

                // Numbers
                [/\d+/, 'number'],

                // Whitespace
                [/[ \t\r\n]+/, 'white'],
              ],
              comment: [
                [/[^/*]+/, 'comment'],
                [/\*\//, { token: 'comment', next: '@pop' }],
                [/[/*]/, 'comment'],
              ],
              action: [
                [/\{/, { token: 'delimiter.curly', next: '@push' }],
                [/\}/, { token: 'delimiter.curly', next: '@pop' }],
                [/./, 'source'],
              ],
              args: [
                [/\[/, { token: 'delimiter.square', next: '@push' }],
                [/\]/, { token: 'delimiter.square', next: '@pop' }],
                [/./, 'variable'],
              ],
              charset: [
                [/\]/, { token: 'string.bracket', next: '@pop' }],
                [/\\[^\]]/, 'string.escape'],
                [/[^\]\\]+/, 'string'],
              ],
            },
          });

          // Configure language settings
          monaco.languages.setLanguageConfiguration('antlr4', {
            comments: {
              lineComment: '//',
              blockComment: ['/*', '*/'],
            },
            brackets: [
              ['{', '}'],
              ['[', ']'],
              ['(', ')'],
            ],
            autoClosingPairs: [
              { open: '{', close: '}' },
              { open: '[', close: ']' },
              { open: '(', close: ')' },
              { open: "'", close: "'" },
            ],
            surroundingPairs: [
              { open: '{', close: '}' },
              { open: '[', close: ']' },
              { open: '(', close: ')' },
              { open: "'", close: "'" },
            ],
          });
        }

        // Define custom CSS for decorations
        const styleId = 'analysis-decoration-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            .analysis-decoration-info {
              background-color: rgba(59, 130, 246, 0.15);
              border-bottom: 2px wavy #3b82f6;
            }
            .analysis-decoration-warning {
              background-color: rgba(234, 179, 8, 0.15);
              border-bottom: 2px wavy #eab308;
            }
            .analysis-decoration-error {
              background-color: rgba(249, 115, 22, 0.15);
              border-bottom: 2px wavy #f97316;
            }
            .analysis-decoration-critical {
              background-color: rgba(239, 68, 68, 0.2);
              border-bottom: 2px wavy #ef4444;
            }
            .analysis-glyph-info {
              background-color: #3b82f6;
              border-radius: 50%;
              margin-left: 5px;
            }
            .analysis-glyph-warning {
              background-color: #eab308;
              border-radius: 50%;
              margin-left: 5px;
            }
            .analysis-glyph-error {
              background-color: #f97316;
              border-radius: 50%;
              margin-left: 5px;
            }
            .analysis-glyph-critical {
              background-color: #ef4444;
              border-radius: 50%;
              margin-left: 5px;
            }
            .highlight-range {
              background-color: rgba(250, 204, 21, 0.3);
              border: 1px solid #facc15;
            }
            .tree-selection-highlight {
              background-color: rgba(59, 130, 246, 0.3);
              border: 1px solid #3b82f6;
              animation: pulse-highlight 1s ease-out;
            }
            @keyframes pulse-highlight {
              0% {
                background-color: rgba(59, 130, 246, 0.5);
                box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
              }
              100% {
                background-color: rgba(59, 130, 246, 0.3);
                box-shadow: none;
              }
            }
          `;
          document.head.appendChild(style);
        }
      }
    }, [monaco]);

    return (
      <div className="h-full w-full overflow-hidden bg-ide-bg" style={{ minHeight: 0 }}>
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="plaintext"
          language={language}
          value={value}
          onChange={onChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: '"Fira Code", monospace',
            padding: { top: 8 },
            scrollBeyondLastLine: false,
            readOnly,
            renderWhitespace: 'selection',
            automaticLayout: true,
            glyphMargin: true,
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'off',
          }}
        />
      </div>
    );
  }
);

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
