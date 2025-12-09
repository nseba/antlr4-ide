import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Play, FilePlus, FileText, Settings,
  ChevronDown, Trash2, Clock, AlertTriangle, List, Edit2, FolderOpen, Info, Layers, Search, Loader2, Download, History, MessageSquare
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import TreeVisualizer from '@/components/TreeVisualizer';
import AnalysisPanel from '@/components/AnalysisPanel';
import HistoryPanel from '@/components/HistoryPanel';
import DiffViewer from '@/components/DiffViewer';
import SaveStatus from '@/components/SaveStatus';
import TabBar from '@/components/TabBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastContainer from '@/components/ToastContainer';
import AIChatPanel from '@/components/AIChatPanel';
import { useGrammarAnalysis } from '@/hooks/useGrammarAnalysis';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/hooks/useToast';
import { useAIChat } from '@/hooks/useAIChat';
import type { GrammarContext } from '@/services/aiService.types';
import { ProjectFile, ParseResult, Token, ParseNode, CodeEditorRef, EditorDecoration } from '@/types';
import * as fileService from '@/services/fileService';
import * as workspaceService from '@/services/workspaceService';
import type { FileMetadata } from '@/types/api'; 

// Initial Demo Data
const INITIAL_GRAMMAR = `grammar Expr;

expr:   term (('+'|'-') term)* ;
term:   factor (('*'|'/') factor)* ;
factor: NUMBER | '(' expr ')' ;

NUMBER: [0-9]+ ;
WS:     [ \\t\\r\\n]+ -> skip ;
`;

const INITIAL_INPUT = `(10 + 20) * 3`;

// --- Helpers for LocalStorage (for layout persistence only) ---
const STORAGE_KEYS = {
  LAYOUT: 'antlr4ide_layout',
  // Legacy keys for migration
  FILES: 'antlr4ide_files',
  ACTIVE_ID: 'antlr4ide_active_id',
  SETTINGS: 'antlr4ide_settings'
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

// Helper to convert FileMetadata to ProjectFile
const metadataToProjectFile = (metadata: FileMetadata, content: string): ProjectFile => ({
  id: metadata.id,
  name: metadata.name,
  type: metadata.type,
  content,
  isMain: false
});

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
  // --- Loading and Error State ---
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- File State (loaded from backend) ---
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]); // File IDs in tab order
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [startRule, setStartRule] = useState<string>('expr');
  const [consoleHeight, setConsoleHeight] = useState<number>(() => loadState(STORAGE_KEYS.LAYOUT, { consoleHeight: 250 }).consoleHeight);

  // Track dirty files for unsaved changes indicator
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());

  // Confirm dialog state for unsaved changes
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    fileId: string | null;
    action: 'close' | 'closeOthers' | 'closeAll' | 'closeToRight' | null;
  }>({ isOpen: false, fileId: null, action: null });

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'tokens' | 'analysis' | 'history'>('console');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Diff viewer state
  const [diffState, setDiffState] = useState<{
    isOpen: boolean;
    oldContent: string;
    newContent: string;
    oldLabel: string;
    newLabel: string;
  } | null>(null);

  // Hidden input for file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grammar editor ref for programmatic control
  const grammarEditorRef = useRef<CodeEditorRef>(null);

  // Input editor ref for programmatic control (highlighting matched text)
  const inputEditorRef = useRef<CodeEditorRef>(null);

  // Toast notifications
  const { toasts, showToast, dismissToast } = useToast();

  // AI Chat hook
  const {
    messages: aiMessages,
    isLoading: isAILoading,
    error: aiError,
    isAvailable: isAIAvailable,
    isPanelOpen: isAIPanelOpen,
    panelWidth: aiPanelWidth,
    sendMessage: sendAIMessage,
    clearHistory: clearAIHistory,
    togglePanel: toggleAIPanel,
    setPanelWidth: setAIPanelWidth,
    stopGeneration: stopAIGeneration,
  } = useAIChat();

  // Grammar analysis hook
  const mainGrammarFile = useMemo(() => files.find(f => f.type === 'grammar'), [files]);
  const {
    result: analysisResult,
    isAnalyzing,
    analyze: runAnalysis,
    getDecorations
  } = useGrammarAnalysis({ analysisOptions: { startRule } });

  // Total issue count for badge display
  const totalAnalysisIssues = useMemo(() => {
    if (!analysisResult) return 0;
    const { summary } = analysisResult;
    return summary.unusedRules + summary.performanceIssues + summary.highComplexityRules + summary.ambiguityHints;
  }, [analysisResult]);

  // Get decorations for the current grammar
  const grammarDecorations = useMemo<EditorDecoration[]>(() => {
    if (!analysisResult) return [];
    return getDecorations();
  }, [analysisResult, getDecorations]);

  // Build grammar context for AI chat
  const grammarContext = useMemo<GrammarContext>(() => {
    const inputFile = files.find(f => f.type === 'text');
    return {
      grammarContent: mainGrammarFile?.content || '',
      inputText: inputFile?.content || '',
      startRule,
      parseErrors: parseResult?.errors?.map(e => `Line ${e.line}:${e.column} - ${e.message}`) || [],
      analysisIssues: analysisResult ? [
        ...analysisResult.unusedRules.map(r => `Unused rule: ${r.name}`),
        ...analysisResult.performanceIssues.map(i => `${i.issue}: ${i.rule}`),
      ] : [],
    };
  }, [mainGrammarFile?.content, files, startRule, parseResult?.errors, analysisResult]);

  // --- Derived State ---
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

  // --- Auto-save Hook ---
  const {
    status: saveStatus,
    lastSaved,
    saveNow,
    markDirty,
    error: saveError
  } = useAutoSave(activeFileId, activeFile?.content || '', {
    throttleMs: 1000,
    onSave: () => {
      if (activeFileId) {
        setDirtyFileIds(prev => {
          const next = new Set(prev);
          next.delete(activeFileId);
          return next;
        });
      }
    }
  });

  // --- Initial Data Loading ---
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Fetch files from backend
        const fileMetadata = await fileService.fetchFiles();

        if (fileMetadata.length === 0) {
          // No files exist - create initial demo files
          const grammarMeta = await fileService.createFile('Expr.g4', 'grammar', INITIAL_GRAMMAR);
          const inputMeta = await fileService.createFile('input.txt', 'text', INITIAL_INPUT);

          setFiles([
            metadataToProjectFile(grammarMeta, INITIAL_GRAMMAR),
            metadataToProjectFile(inputMeta, INITIAL_INPUT)
          ]);
          setActiveFileId(grammarMeta.id);
          setOpenTabs([grammarMeta.id, inputMeta.id]);

          // Save initial workspace state
          await workspaceService.updateWorkspace({
            openTabs: [grammarMeta.id, inputMeta.id],
            activeTabId: grammarMeta.id,
            settings: { startRule: 'expr' }
          });
        } else {
          // Load existing files
          const loadedFiles = await Promise.all(
            fileMetadata.map(async (meta) => {
              const { content } = await fileService.fetchFile(meta.id);
              return metadataToProjectFile(meta, content);
            })
          );
          setFiles(loadedFiles);

          // Load workspace state
          const workspace = await workspaceService.fetchWorkspace();
          setStartRule(workspace.settings.startRule);

          // Initialize open tabs from workspace or default to all files
          const tabs = workspace.openTabs && workspace.openTabs.length > 0
            ? workspace.openTabs.filter(id => loadedFiles.some(f => f.id === id))
            : loadedFiles.map(f => f.id);
          setOpenTabs(tabs);
          setActiveFileId(workspace.activeTabId || tabs[0] || null);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // --- Effects for Persistence ---
  // Only persist layout to localStorage (fast, doesn't need backend)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify({ consoleHeight }));
  }, [consoleHeight]);

  // Persist workspace state to backend when tabs or settings change
  useEffect(() => {
    if (isLoading) return;

    const updateWorkspace = async () => {
      try {
        await workspaceService.updateWorkspace({
          openTabs,
          activeTabId: activeFileId,
          settings: { startRule }
        });
      } catch (error) {
        console.error('Failed to save workspace:', error);
      }
    };

    // Debounce workspace updates
    const timeout = setTimeout(updateWorkspace, 500);
    return () => clearTimeout(timeout);
  }, [activeFileId, openTabs, startRule, isLoading]);

  // --- Handlers ---
  const handleFileContentChange = (val: string | undefined) => {
    if (!activeFile || val === undefined) return;
    setFiles(files.map(f => f.id === activeFile.id ? { ...f, content: val } : f));
    // Mark file as dirty and trigger auto-save
    setDirtyFileIds(prev => new Set(prev).add(activeFile.id));
    markDirty();
  };

  const addFile = async (type: 'grammar' | 'text') => {
    // Calculate a unique default name
    const baseName = type === 'grammar' ? 'NewGrammar' : 'input';
    const ext = type === 'grammar' ? '.g4' : '.txt';
    let name = baseName + ext;
    let counter = 1;

    while (files.some(f => f.name === name)) {
      name = `${baseName}${counter}${ext}`;
      counter++;
    }

    try {
      const metadata = await fileService.createFile(name, type, '');
      const newFile = metadataToProjectFile(metadata, '');
      setFiles([...files, newFile]);
      setOpenTabs(prev => [...prev, metadata.id]);
      setActiveFileId(metadata.id);
      setRenamingFileId(metadata.id);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file');
    }
  };

  const deleteFile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (files.length <= 1) return;

    try {
      await fileService.deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
      setOpenTabs(prev => prev.filter(tabId => tabId !== id));
      if (activeFileId === id) {
        const remainingFiles = files.filter(f => f.id !== id);
        setActiveFileId(remainingFiles[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const handleRenameComplete = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (trimmed.length > 0) {
      try {
        await fileService.renameFile(id, trimmed);
        setFiles(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f));
      } catch (error) {
        console.error('Failed to rename file:', error);
      }
    }
    setRenamingFileId(null);
  };

  // --- Tab Handlers ---
  const handleTabActivate = useCallback((id: string) => {
    setActiveFileId(id);
    // Add to open tabs if not already there
    if (!openTabs.includes(id)) {
      setOpenTabs(prev => [...prev, id]);
    }
  }, [openTabs]);

  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    setOpenTabs(prev => {
      const newTabs = [...prev];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      return newTabs;
    });
  }, []);

  // Close a single tab (with unsaved changes check)
  const closeTab = useCallback(async (id: string, force = false) => {
    if (!force && dirtyFileIds.has(id)) {
      setConfirmDialog({ isOpen: true, fileId: id, action: 'close' });
      return;
    }

    const tabIndex = openTabs.indexOf(id);
    const newTabs = openTabs.filter(tabId => tabId !== id);
    setOpenTabs(newTabs);

    // If closing the active tab, switch to adjacent tab
    if (activeFileId === id) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveFileId(newTabs[newActiveIndex] || null);
    }

    // Clean up dirty state
    setDirtyFileIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [openTabs, activeFileId, dirtyFileIds]);

  // Close all tabs except the specified one
  const closeOtherTabs = useCallback((keepId: string) => {
    const otherDirty = openTabs.filter(id => id !== keepId && dirtyFileIds.has(id));
    if (otherDirty.length > 0) {
      setConfirmDialog({ isOpen: true, fileId: keepId, action: 'closeOthers' });
      return;
    }

    setOpenTabs([keepId]);
    setActiveFileId(keepId);
  }, [openTabs, dirtyFileIds]);

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    const anyDirty = openTabs.some(id => dirtyFileIds.has(id));
    if (anyDirty) {
      setConfirmDialog({ isOpen: true, fileId: null, action: 'closeAll' });
      return;
    }

    setOpenTabs([]);
    setActiveFileId(null);
  }, [openTabs, dirtyFileIds]);

  // Close tabs to the right of specified tab
  const closeTabsToRight = useCallback((id: string) => {
    const index = openTabs.indexOf(id);
    const tabsToClose = openTabs.slice(index + 1);
    const anyDirty = tabsToClose.some(tabId => dirtyFileIds.has(tabId));

    if (anyDirty) {
      setConfirmDialog({ isOpen: true, fileId: id, action: 'closeToRight' });
      return;
    }

    const newTabs = openTabs.slice(0, index + 1);
    setOpenTabs(newTabs);
    if (!newTabs.includes(activeFileId || '')) {
      setActiveFileId(id);
    }
  }, [openTabs, activeFileId, dirtyFileIds]);

  // Handle confirm dialog actions
  const handleConfirmSave = useCallback(async () => {
    const { fileId, action } = confirmDialog;

    // Save the dirty files first
    if (fileId && action === 'close') {
      await saveNow();
    }

    // Close the dialog and proceed with force close
    setConfirmDialog({ isOpen: false, fileId: null, action: null });

    // Execute the action
    switch (action) {
      case 'close':
        if (fileId) closeTab(fileId, true);
        break;
      case 'closeOthers':
        if (fileId) {
          // Force close all others
          setOpenTabs([fileId]);
          setActiveFileId(fileId);
          setDirtyFileIds(new Set());
        }
        break;
      case 'closeAll':
        setOpenTabs([]);
        setActiveFileId(null);
        setDirtyFileIds(new Set());
        break;
      case 'closeToRight':
        if (fileId) {
          const index = openTabs.indexOf(fileId);
          const newTabs = openTabs.slice(0, index + 1);
          setOpenTabs(newTabs);
          if (!newTabs.includes(activeFileId || '')) {
            setActiveFileId(fileId);
          }
          setDirtyFileIds(prev => {
            const next = new Set(prev);
            openTabs.slice(index + 1).forEach(id => next.delete(id));
            return next;
          });
        }
        break;
    }
  }, [confirmDialog, saveNow, closeTab, openTabs, activeFileId]);

  const handleConfirmDiscard = useCallback(() => {
    const { fileId, action } = confirmDialog;
    setConfirmDialog({ isOpen: false, fileId: null, action: null });

    // Execute the action without saving
    switch (action) {
      case 'close':
        if (fileId) closeTab(fileId, true);
        break;
      case 'closeOthers':
        if (fileId) {
          setOpenTabs([fileId]);
          setActiveFileId(fileId);
          setDirtyFileIds(new Set());
        }
        break;
      case 'closeAll':
        setOpenTabs([]);
        setActiveFileId(null);
        setDirtyFileIds(new Set());
        break;
      case 'closeToRight':
        if (fileId) {
          const index = openTabs.indexOf(fileId);
          const newTabs = openTabs.slice(0, index + 1);
          setOpenTabs(newTabs);
          if (!newTabs.includes(activeFileId || '')) {
            setActiveFileId(fileId);
          }
          setDirtyFileIds(prev => {
            const next = new Set(prev);
            openTabs.slice(index + 1).forEach(id => next.delete(id));
            return next;
          });
        }
        break;
    }
  }, [confirmDialog, closeTab, openTabs, activeFileId]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmDialog({ isOpen: false, fileId: null, action: null });
  }, []);

  // Handle new file from tab bar
  const handleNewFileFromTab = useCallback(() => {
    // Default to creating a text file from tab bar
    addFile('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]); // files is used by addFile to check for name conflicts

  // Compute tabs metadata for TabBar
  const tabsMetadata = useMemo((): FileMetadata[] => {
    return openTabs
      .map(id => files.find(f => f.id === id))
      .filter((f): f is ProjectFile => f !== undefined)
      .map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        createdAt: '',
        modifiedAt: ''
      }));
  }, [openTabs, files]);

  const runParser = () => {
    setIsCompiling(true);
    // Clear previous selections when starting a new parse
    clearTreeSelection();
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
        } catch (error) {
            const e = error as Error;
            console.error(e);
            alert(`Error executing parser: ${e.message}`);
        }
        setIsCompiling(false);
    }, 100);
  };

  const exportProject = () => {
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
        } catch {
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

  // Prevent browser's default save dialog (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Auto-save handles saving automatically
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler for navigating to rules from AnalysisPanel
  const handleNavigateToRule = useCallback((ruleName: string, line: number) => {
    // Find the main grammar file
    const grammarFile = files.find(f => f.type === 'grammar');
    if (grammarFile) {
      // Switch to the grammar file
      setActiveFileId(grammarFile.id);
      // Use setTimeout to ensure editor is ready
      setTimeout(() => {
        if (grammarEditorRef.current) {
          grammarEditorRef.current.revealLine(line);
          // Highlight the rule name in the line
          const lineContent = grammarFile.content.split('\n')[line - 1] || '';
          const ruleIndex = lineContent.indexOf(ruleName);
          if (ruleIndex >= 0) {
            grammarEditorRef.current.selectRange(line, ruleIndex + 1, line, ruleIndex + ruleName.length + 1);
          }
        }
      }, 50);
    }
  }, [files]);

  // Helper function to find rule definition line in grammar content
  const findRuleDefinitionLine = useCallback((grammarContent: string, ruleName: string): { line: number; column: number } | null => {
    const lines = grammarContent.split('\n');

    // Pattern to match rule definition: ruleName followed by optional whitespace and colon
    // Handles both parser rules (lowercase) and lexer rules (UPPERCASE)
    const rulePattern = new RegExp(`^\\s*(${ruleName})\\s*:`);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(rulePattern);
      if (match) {
        return {
          line: i + 1, // 1-based line number
          column: lines[i].indexOf(ruleName) + 1 // 1-based column
        };
      }
    }
    return null;
  }, []);

  // Handler for tree node clicks - highlights text in input and navigates to rule in grammar
  const handleTreeNodeClick = useCallback((node: ParseNode) => {
    // Update selected node state
    setSelectedNodeId(node.id);

    // Find the input file and grammar file
    const inputFile = files.find(f => f.type === 'text');
    const grammarFile = files.find(f => f.type === 'grammar');

    // For rule nodes (not tokens), navigate to the grammar rule definition
    if (node.type === 'rule' && grammarFile) {
      const ruleDef = findRuleDefinitionLine(grammarFile.content, node.name);

      if (ruleDef) {
        // Open grammar tab if not already open
        if (!openTabs.includes(grammarFile.id)) {
          setOpenTabs(prev => [...prev, grammarFile.id]);
        }

        // Switch to grammar file
        setActiveFileId(grammarFile.id);

        // Use setTimeout to ensure editor is mounted and ref is connected
        setTimeout(() => {
          if (grammarEditorRef.current) {
            // Reveal and highlight the rule definition
            grammarEditorRef.current.revealLine(ruleDef.line);
            grammarEditorRef.current.selectRange(
              ruleDef.line,
              ruleDef.column,
              ruleDef.line,
              ruleDef.column + node.name.length
            );
            grammarEditorRef.current.highlightRange(
              ruleDef.line,
              ruleDef.column,
              ruleDef.line,
              ruleDef.column + node.name.length,
              'tree-selection-highlight'
            );
          }
        }, 100);
      } else {
        // Rule not found in grammar - show toast notification
        showToast(`Rule "${node.name}" definition not found in grammar`, 'warning');
      }
    }

    // Highlight in input editor if node has position info (for tokens or rule matched text)
    if (inputFile && node.startLine !== undefined && node.startColumn !== undefined) {
      // For token nodes, switch to input file
      if (node.type === 'token') {
        if (activeFileId !== inputFile.id) {
          handleTabActivate(inputFile.id);
        }
      }

      // Use setTimeout to ensure editor is mounted and ref is connected
      setTimeout(() => {
        if (inputEditorRef.current) {
          const endLine = node.endLine ?? node.startLine;
          const endCol = node.endColumn ?? (node.startColumn + (node.matchedText?.length || 1));

          // Highlight and select the matched text
          inputEditorRef.current.highlightRange(
            node.startLine!,
            node.startColumn! + 1, // Monaco is 1-based for columns
            endLine,
            endCol + 1,
            'tree-selection-highlight'
          );

          // Only reveal if we're viewing the input file
          if (node.type === 'token' || activeFileId === inputFile.id) {
            inputEditorRef.current.revealLine(node.startLine!);
          }
        }
      }, 100); // Increased timeout to ensure editor is ready after tab switch
    }
  }, [files, activeFileId, openTabs, handleTabActivate, findRuleDefinitionLine, showToast]);

  // Clear selections when a new parse is run
  const clearTreeSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedToken(null);
    if (inputEditorRef.current) {
      inputEditorRef.current.clearHighlights();
    }
  }, []);

  // Show loading screen while fetching initial data
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-ide-bg text-ide-text items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ide-accent mb-4" />
        <p className="text-gray-400">Loading workspace...</p>
      </div>
    );
  }

  // Show error screen if loading failed
  if (loadError) {
    return (
      <div className="flex flex-col h-screen w-full bg-ide-bg text-ide-text items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-red-400 mb-2">Failed to load workspace</p>
        <p className="text-gray-500 text-sm mb-4">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-ide-accent text-white rounded hover:bg-blue-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

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
          <h1 className="font-semibold text-ide-textActive">ANTLR4 IDE</h1>
          
          <div className="h-4 w-[1px] bg-gray-600 mx-2"></div>
          
          <div className="flex gap-2">
            <button
                onClick={exportProject}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
                title="Export project as JSON"
            >
                <Download size={14} /> Export
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
                title="Import project from JSON"
            >
                <FolderOpen size={14} /> Import
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

           <button
             onClick={() => {
               if (mainGrammarFile) {
                 runAnalysis(mainGrammarFile.content);
                 setActiveTab('analysis');
               }
             }}
             disabled={isAnalyzing || !mainGrammarFile}
             className={`flex items-center gap-2 px-4 py-1.5 rounded transition ${
                 isAnalyzing ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white'
             }`}
           >
             {isAnalyzing ? (
                 <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
             ) : (
                <Search size={16} />
             )}
             <span className="text-sm font-medium">{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
           </button>

           <button
             onClick={toggleAIPanel}
             className={`flex items-center gap-2 px-4 py-1.5 rounded transition ${
               isAIPanelOpen ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
             }`}
             title="Toggle AI Assistant"
           >
             <MessageSquare size={16} />
             <span className="text-sm font-medium">AI</span>
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
                        onActivate={() => handleTabActivate(f.id)}
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
                        onActivate={() => handleTabActivate(f.id)}
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
          {/* Tab Bar */}
          <TabBar
            tabs={tabsMetadata}
            activeTabId={activeFileId}
            dirtyFiles={dirtyFileIds}
            onTabActivate={handleTabActivate}
            onTabClose={closeTab}
            onTabReorder={handleTabReorder}
            onNewFile={handleNewFileFromTab}
            onCloseOthers={closeOtherTabs}
            onCloseAll={closeAllTabs}
            onCloseToRight={closeTabsToRight}
          />

          {activeFile ? (
            <div className="flex-1 min-h-0 overflow-hidden">
                <CodeEditor
                    ref={activeFile.type === 'grammar' ? grammarEditorRef : inputEditorRef}
                    value={activeFile.content}
                    onChange={handleFileContentChange}
                    language={activeFile.type === 'grammar' ? 'antlr4' : 'plaintext'}
                    decorations={activeFile.type === 'grammar' ? grammarDecorations : []}
                />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                {openTabs.length === 0 ? 'Open a file from the explorer or create a new one' : 'Select a file to edit'}
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
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-3 h-full text-xs font-medium flex items-center gap-2 border-r border-ide-border transition ${activeTab === 'analysis' ? 'text-white bg-ide-bg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Layers size={12} /> Analysis
                    {analysisResult && totalAnalysisIssues > 0 && (
                        <span className="bg-purple-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{totalAnalysisIssues}</span>
                    )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 h-full text-xs font-medium flex items-center gap-2 border-r border-ide-border transition ${activeTab === 'history' ? 'text-white bg-ide-bg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <History size={12} /> History
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

                {activeTab === 'analysis' && (
                    <AnalysisPanel
                        result={analysisResult}
                        isAnalyzing={isAnalyzing}
                        onNavigateToRule={handleNavigateToRule}
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryPanel
                        fileId={activeFileId}
                        fileName={activeFile?.name || 'Untitled'}
                        currentContent={activeFile?.content || ''}
                        onRestore={(content) => {
                            if (activeFile) {
                                setFiles(files.map(f => f.id === activeFile.id ? { ...f, content } : f));
                                showToast('File restored to previous version', 'success');
                            }
                        }}
                        onViewDiff={(oldContent, newContent, oldLabel, newLabel) => {
                            setDiffState({ isOpen: true, oldContent, newContent, oldLabel, newLabel });
                        }}
                    />
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
                    onNodeClick={handleTreeNodeClick}
                    selectedNodeId={selectedNodeId}
                />
             </div>
        </div>

        {/* AI Chat Panel */}
        {isAIPanelOpen && (
          <AIChatPanel
            messages={aiMessages}
            isLoading={isAILoading}
            error={aiError}
            isAvailable={isAIAvailable}
            isOpen={isAIPanelOpen}
            width={aiPanelWidth}
            grammarContext={grammarContext}
            onSendMessage={sendAIMessage}
            onClearHistory={clearAIHistory}
            onToggle={toggleAIPanel}
            onSetWidth={setAIPanelWidth}
            onStopGeneration={stopAIGeneration}
          />
        )}

      </div>
      
      {/* Footer Status Bar */}
      <footer className="h-6 bg-ide-accent flex items-center px-4 text-[10px] text-white select-none shrink-0">
         <div className="flex gap-4 items-center">
             <span>ready</span>
             <span>UTF-8</span>
             {activeFile && <span>{activeFile.type === 'grammar' ? 'ANTLR4' : 'Plain Text'}</span>}
             <div className="h-3 w-[1px] bg-white/30" />
             <SaveStatus status={saveStatus} lastSaved={lastSaved} error={saveError} onRetry={saveNow} />
         </div>
         <div className="ml-auto opacity-75">
             ANTLR4 IDE v1.0.0
         </div>
      </footer>

      {/* Confirm Dialog for unsaved changes */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to save them before closing?"
        confirmText="Save"
        cancelText="Cancel"
        dangerousConfirmText="Don't Save"
        onConfirm={handleConfirmSave}
        onCancel={handleConfirmCancel}
        onDangerous={handleConfirmDiscard}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Diff Viewer Modal */}
      {diffState?.isOpen && (
        <DiffViewer
          oldContent={diffState.oldContent}
          newContent={diffState.newContent}
          oldLabel={diffState.oldLabel}
          newLabel={diffState.newLabel}
          onClose={() => setDiffState(null)}
        />
      )}
    </div>
  );
};

export default App;