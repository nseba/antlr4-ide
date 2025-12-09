import React from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'antlr4', readOnly = false }) => {
  const monaco = useMonaco();

  React.useEffect(() => {
    if (monaco) {
      // Register a simple ANTLR4 language definition for basic highlighting
      if (!monaco.languages.getLanguages().some(l => l.id === 'antlr4')) {
        monaco.languages.register({ id: 'antlr4' });
        monaco.languages.setMonarchTokensProvider('antlr4', {
          tokenizer: {
            root: [
              [/[A-Z][a-zA-Z0-9_]*/, 'type.identifier'], // Lexer rules
              [/[a-z][a-zA-Z0-9_]*/, 'identifier'],      // Parser rules
              [/'[^']*'/, 'string'],
              [/\/\/.*/, 'comment'],
              [/\/\*[\s\S]*?\*\//, 'comment'],
              [/[{}():;|]/, 'delimiter'],
            ]
          }
        });
      }
    }
  }, [monaco]);

  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-ide-border bg-ide-bg">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        language={language}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"Fira Code", monospace',
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          readOnly,
          renderWhitespace: 'selection',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
