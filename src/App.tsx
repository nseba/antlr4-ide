import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Play, Save, FilePlus, FileText, Settings, 
  ChevronRight, ChevronDown, Trash2, Clock, AlertTriangle, List, Edit2, FolderOpen, Download, Info
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import TreeVisualizer from '@/components/TreeVisualizer';
import { ProjectFile, ParseResult, Token } from '@/types'; 

// Initial Demo Data
const INITIAL_GRAMMAR = `grammar Expr;

expr:   term (('+'|'-') term)* ;
term:   factor (('*'|'/') factor)* ;
factor: NUMBER | '(' expr ')' ;

NUMBER: [0-9]+ ;
WS:     [ \\t\\r\\n]+ -> skip ;
`;

const INITIAL_INPUT = `(10 + 20) * 3`;

// --- Helpers for LocalStorage ---
const STORAGE_KEYS = {
  FILES: 'antlr4lab_files',
  ACTIVE_ID: 'antlr4lab_active_id',
  SETTINGS: 'antlr4lab_settings',
  LAYOUT: 'antlr4lab_layout'
};

const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage`, e);
    return fallback;
  }
};

// --- Sub-component for File List Items ---
interface FileListItemProps {
  file: ProjectFile;
  isActive: boolean;
  isRenaming: boolean;
  onActivate: () => void;
  onRenameStart: () => void;
  onRenameComplete: (id: string, newName: string) => void;
  onRenameCancel: () => void;
  onDelete: (e: React.MouseEvent) => void;
  canDelete: boolean;
}

const FileListItem: React.FC<FileListItemProps> = ({
  file, isActive, isRenaming, onActivate, onRenameStart, onRenameComplete, onRenameCancel, onDelete, canDelete
}) => {
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync name when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      setName(file.name);
      // Timeout to ensure render before focus/select
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isRenaming, file.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameComplete(file.id, name);
    } else if (e.key === 'Escape') {
      onRenameCancel();
    }
  };

  if (isRenaming) {
    return (
      <div className="px-2 py-1 bg-ide-activity border-l-2 border-ide-accent">
         <div className="flex items-center gap-2">
            {file.type === 'grammar' ? <Settings size={14} className="text-purple-400 shrink-0" /> : <FileText size={14} className="text-blue-400 shrink-0" />}
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => onRenameComplete(file.id, name)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1e1e1e] text-white text-xs px-1 py-0.5 w-full outline-none border border-ide-accent rounded font-mono"
            />
         </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onActivate}
      onDoubleClick={(e) => { e.stopPropagation(); onRenameStart(); }}
      className={`group flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-l-2 transition-colors ${
        isActive 
          ? 'bg-ide-activity border-ide-accent text-ide-textActive' 
          : 'border-transparent text-ide-text hover:bg-[#2a2d2e]'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {file.type === 'grammar' ? <Settings size={14} className="text-purple-400 shrink-0" /> : <FileText size={14} className="text-blue-400 shrink-0" />}
        <span className="truncate select-none">{file.name}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/10 focus:outline-none"
          onClick={(e) => { e.stopPropagation(); onRenameStart(); }}
          title="Rename"
          type="button"
        >
          <Edit2 size={12} />
        </button>
        {canDelete && (
            <button 
              className="text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-white/10 focus:outline-none" 
              onClick={onDelete}
              title="Delete"
              type="button"
            >
              <Trash2 size={12} />
            </button>
        )}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  // --- State with LocalStorage Initialization ---
  const [files, setFiles] = useState<ProjectFile[]>(() => loadState(STORAGE_KEYS.FILES, [
    { id: '1', name: 'Expr.g4', type: 'grammar', content: INITIAL_GRAMMAR, isMain: true },
    { id: '2', name: 'input.txt', type: 'text', content: INITIAL_INPUT }
  ]));
  
  const [activeFileId, setActiveFileId] = useState<string>(() => loadState(STORAGE_KEYS.ACTIVE_ID, '1'));
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [startRule, setStartRule] = useState<string>(() => loadState(STORAGE_KEYS.SETTINGS, { startRule: 'expr' }).startRule);
  const [consoleHeight, setConsoleHeight] = useState<number>(() => loadState(STORAGE_KEYS.LAYOUT, { consoleHeight: 250 }).consoleHeight);
  
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'tokens'>('console');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Hidden input for file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived State ---
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
  
  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, JSON.stringify(activeFileId));
  }, [activeFileId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ startRule }));
  }, [startRule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify({ consoleHeight }));
  }, [consoleHeight]);

  // --- Handlers ---
  const handleFileContentChange = (val: string | undefined) => {
    if (!activeFile || val === undefined) return;
    setFiles(files.map(f => f.id === activeFile.id ? { ...f, content: val } : f));
  };

  const addFile = (type: 'grammar' | 'text') => {
    const id = Date.now().toString();
    // Calculate a unique default name
    let baseName = type === 'grammar' ? 'NewGrammar' : 'input';
    let ext = type === 'grammar' ? '.g4' : '.txt';
    let name = baseName + ext;
    let counter = 1;
    
    while(files.some(f => f.name === name)) {
        name = `${baseName}${counter}${ext}`;
        counter++;
    }

    const newFile: ProjectFile = {
      id,
      name,
      type,
      content: ''
    };
    setFiles([...files, newFile]);
    setActiveFileId(id);
    setRenamingFileId(id);
  };

  const deleteFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    setFiles(files.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(files.find(f => f.id !== id)?.id || '');
  };

  const handleRenameComplete = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (trimmed.length > 0) {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f));
    }
    setRenamingFileId(null);
  };

  const runParser = () => {
    setIsCompiling(true);
    // Slight delay to allow UI to show loading state
    setTimeout(async () => {
        const inputFile = files.find(f => f.type === 'text');
        // Collect all grammar files
        const grammarFiles = files
            .filter(f => f.type === 'grammar')
            .map(f => ({ name: f.name, content: f.content }));

        if (!inputFile || grammarFiles.length === 0) {
            alert("Please ensure you have at least one grammar file and one input file.");
            setIsCompiling(false);
            return;
        }

        try {
            // Call the backend API
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grammarFiles,
                    inputText: inputFile.content,
                    startRule
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'API request failed');
            }

            const result = await response.json();
            setParseResult(result);
            // Switch to console to show loading status/errors
            setActiveTab('console');
        } catch (e: any) {
            console.error(e);
            alert(`Error executing parser: ${e.message}`);
        }
        setIsCompiling(false);
    }, 100);
  };

  const saveProject = () => {
    const projectData = {
        files,
        startRule
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'antlr4-lab-project.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (data.files && Array.isArray(data.files)) {
                setFiles(data.files);
                if (data.files.length > 0) setActiveFileId(data.files[0].id);
            }
            if (data.startRule) setStartRule(data.startRule);
            // Reset state
            setParseResult(null);
            setSelectedToken(null);
        } catch (err) {
            alert("Failed to load project file. Invalid format.");
        }
    };
    reader.readAsText(file);
    // clear input
    e.target.value = '';
  };
  
  // --- Console Resizing Logic ---
  
  const startResizing = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
  };

  useEffect(() => {
      if (!isResizing) return;

      const handleMouseMove = (e: MouseEvent) => {
          const totalHeight = window.innerHeight;
          const headerHeight = 48; // h-12 = 3rem = 48px
          const footerHeight = 24; // h-6 = 1.5rem = 24px
          const fixedHeights = headerHeight + footerHeight;

          // Calculate new height from bottom of viewport
          const newHeight = totalHeight - e.clientY - footerHeight;

          // Constraints
          const minHeight = 100;
          const maxHeight = totalHeight - fixedHeights - 200; // Leave room for editor

          const clampedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
          setConsoleHeight(clampedHeight);
      };

      const handleMouseUp = () => {
          setIsResizing(false);
      };

      // Add listeners to document to catch moves outside the handle
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing]);


  return (
    <div className="flex flex-col h-screen w-full bg-ide-bg text-ide-text select-none">
      
      {/* Global Resize Overlay to capture all events */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-row-resize" style={{ background: 'transparent' }} />
      )}

      {/* Header */}
      <header className="h-12 flex items-center px-4 border-b border-ide-border bg-ide-sidebar justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-ide-accent rounded flex items-center justify-center">
            <span className="font-bold text-white text-xs">A4</span>
          </div>
          <h1 className="font-semibold text-ide-textActive">ANTLR4 Lab Next</h1>
          
          <div className="h-4 w-[1px] bg-gray-600 mx-2"></div>
          
          <div className="flex gap-2">
            <button 
                onClick={saveProject}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
            >
                <Save size={14} /> Save
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
            >
                <FolderOpen size={14} /> Open
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={loadProject} 
                className="hidden" 
                accept=".json"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Start Rule:</span>
              <input 
                 type="text" 
                 value={startRule}
                 onChange={(e) => setStartRule(e.target.value)}
                 className="bg-[#1e1e1e] border border-ide-border text-xs px-2 py-1 rounded w-24 text-white focus:border-ide-accent outline-none font-mono"
              />
           </div>

           <button 
             onClick={runParser}
             disabled={isCompiling}
             className={`flex items-center gap-2 px-4 py-1.5 rounded transition ${
                 isCompiling ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 text-white'
             }`}
           >
             {isCompiling ? (
                 <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
             ) : (
                <Play size={16} fill="currentColor" />
             )}
             <span className="text-sm font-medium">{isCompiling ? 'Running...' : 'Run'}</span>
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col shrink-0">
          <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
            <span>Explorer</span>
            <div className="flex gap-1">
                <button onClick={() => addFile('grammar')} title="New Grammar" className="cursor-pointer hover:text-white transition focus:outline-none">
                  <FilePlus size={16} />
                </button>
                <button onClick={() => addFile('text')} title="New Input" className="cursor-pointer hover:text-white transition focus:outline-none">
                  <FileText size={16} />
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
             <div className="mb-2">
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <ChevronDown size={12} /> Grammars
                </div>
                {files.filter(f => f.type === 'grammar').map(f => (
                    <FileListItem 
                        key={f.id}
                        file={f}
                        isActive={activeFileId === f.id}
                        isRenaming={renamingFileId === f.id}
                        onActivate={() => setActiveFileId(f.id)}
                        onRenameStart={() => setRenamingFileId(f.id)}
                        onRenameComplete={handleRenameComplete}
                        onRenameCancel={() => setRenamingFileId(null)}
                        onDelete={(e) => deleteFile(e, f.id)}
                        canDelete={files.length > 1}
                    />
                ))}
             </div>
             <div>
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <ChevronDown size={12} /> Input Data
                </div>
                {files.filter(f => f.type === 'text').map(f => (
                    <FileListItem 
                        key={f.id}
                        file={f}
                        isActive={activeFileId === f.id}
                        isRenaming={renamingFileId === f.id}
                        onActivate={() => setActiveFileId(f.id)}
                        onRenameStart={() => setRenamingFileId(f.id)}
                        onRenameComplete={handleRenameComplete}
                        onRenameCancel={() => setRenamingFileId(null)}
                        onDelete={(e) => deleteFile(e, f.id)}
                        canDelete={files.length > 1}
                    />
                ))}
             </div>
          </div>
        </aside>

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-ide-border bg-ide-bg overflow-hidden">
          {activeFile ? (
            <>
                <div className="flex items-center h-9 bg-ide-activity px-4 text-sm border-t border-ide-accent text-ide-textActive shrink-0">
                    {activeFile.name} {activeFile.type === 'grammar' && <span className="ml-2 text-xs text-gray-400">(ANTLR4)</span>}
                </div>
                <div className="flex-1 relative min-h-0">
                    <CodeEditor
                        value={activeFile.content}
                        onChange={handleFileContentChange}
                        language={activeFile.type === 'grammar' ? 'antlr4' : 'plaintext'}
                    />
                </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a file to edit
            </div>
          )}

          {/* Resizer Handle */}
          <div
             className="h-2 bg-ide-border cursor-row-resize hover:bg-ide-accent transition-colors shrink-0 z-20 flex justify-center items-center"
             onMouseDown={startResizing}
             title="Drag to resize console"
          >
             <div className="w-8 h-0.5 bg-gray-600 rounded-full"></div>
          </div>

          {/* Bottom Panel: Output/Console */}
          <div className="flex flex-col bg-ide-panel shrink-0 select-text" style={{ height: `${consoleHeight}px`, minHeight: '100px', maxHeight: '600px' }}>
             <div className="flex items-center h-8 bg-ide-sidebar border-b border-ide-border px-2 shrink-0">
                <button 
                  onClick={() => setActiveTab('console')}
                  className={`px-3 h-full text-xs font-medium flex items-center gap-2 border-r border-ide-border transition ${activeTab === 'console' ? 'text-white bg-ide-bg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <AlertTriangle size={12} /> Console
                    {parseResult && parseResult.errors.filter(e => e.severity === 'error').length > 0 && (
                        <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{parseResult.errors.filter(e => e.severity === 'error').length}</span>
                    )}
                </button>
                <button 
                  onClick={() => setActiveTab('tokens')}
                  className={`px-3 h-full text-xs font-medium flex items-center gap-2 border-r border-ide-border transition ${activeTab === 'tokens' ? 'text-white bg-ide-bg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <List size={12} /> Tokens
                    {parseResult && (
                        <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{parseResult.tokens.length}</span>
                    )}
                </button>
                {parseResult && (
                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 px-2">
                        <Clock size={12} /> {parseResult.duration.toFixed(2)}ms
                    </div>
                )}
             </div>
             
             <div className="flex-1 overflow-auto p-2 font-mono text-xs select-text">
                {activeTab === 'console' && (
                    <div className="space-y-1 select-text">
                        {!parseResult && <div className="text-gray-500 italic">Ready to parse.</div>}
                        {parseResult?.errors.map((err, i) => (
                            <div key={i} className={`flex gap-2 select-text ${
                                err.severity === 'error' ? 'text-red-400' :
                                err.severity === 'warning' ? 'text-yellow-400' : 'text-gray-400'
                            }`}>
                                {err.severity === 'info' ? (
                                    <Info size={14} className="mt-0.5 shrink-0 text-blue-400" />
                                ) : (
                                    <span className="shrink-0">[Line {err.line}:{err.column}]</span>
                                )}
                                <span className="select-text">{err.message}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'tokens' && parseResult && (
                    <table className="w-full text-left border-collapse select-text">
                        <thead>
                            <tr className="text-gray-500 border-b border-gray-700 select-text">
                                <th className="py-1">Index</th>
                                <th className="py-1">Type</th>
                                <th className="py-1">Text</th>
                                <th className="py-1">Line:Col</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parseResult.tokens.map((t) => (
                                <tr 
                                    key={t.tokenIndex} 
                                    className={`hover:bg-white/5 cursor-pointer ${selectedToken?.tokenIndex === t.tokenIndex ? 'bg-blue-900/30 text-blue-200' : ''}`}
                                    onClick={() => setSelectedToken(t)}
                                >
                                    <td className="py-1 text-gray-500">{t.tokenIndex}</td>
                                    <td className="py-1 text-yellow-500">{t.type}</td>
                                    <td className="py-1 text-white">'{t.text}'</td>
                                    <td className="py-1 text-gray-500">{t.line}:{t.column}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
             </div>
          </div>
        </div>

        {/* Right: Visualization */}
        <div className="flex-1 bg-[#151515] flex flex-col border-l border-ide-border min-w-0">
             <div className="h-9 flex items-center justify-between px-4 bg-ide-sidebar border-b border-ide-border text-sm text-gray-300 shrink-0">
                <span className="font-semibold">Parse Tree</span>
                {selectedToken && (
                    <span className="text-xs text-blue-400 font-mono">
                        Selected: '{selectedToken.text}' ({selectedToken.type})
                    </span>
                )}
             </div>
             <div className="flex-1 relative overflow-hidden">
                <TreeVisualizer 
                    data={parseResult?.tree || null} 
                    selectedToken={selectedToken}
                    onSelectToken={setSelectedToken}
                />
             </div>
        </div>

      </div>
      
      {/* Footer Status Bar */}
      <footer className="h-6 bg-ide-accent flex items-center px-4 text-[10px] text-white select-none shrink-0">
         <div className="flex gap-4">
             <span>ready</span>
             <span>UTF-8</span>
             {activeFile && <span>{activeFile.type === 'grammar' ? 'ANTLR4' : 'Plain Text'}</span>}
         </div>
         <div className="ml-auto opacity-75">
             ANTLR4 Lab Next v1.0.0
         </div>
      </footer>
    </div>
  );
};

export default App;