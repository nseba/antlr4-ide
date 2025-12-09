/**
 * AI Chat Panel Component
 *
 * Collapsible side panel for AI-assisted grammar development.
 * Features:
 * - Chat history display with auto-scroll
 * - Message input with send button
 * - Loading indicator during AI response
 * - Resizable panel width
 *
 * All AI configuration is server-side - the client just sends messages.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  X,
  StopCircle,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType, GrammarContext } from '../services/aiService.types';

interface AIChatPanelProps {
  /** Chat messages */
  messages: ChatMessageType[];
  /** Whether AI is generating a response */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether AI is available on the server */
  isAvailable: boolean;
  /** Whether panel is open */
  isOpen: boolean;
  /** Panel width */
  width: number;
  /** Current grammar context for AI prompts */
  grammarContext: GrammarContext;
  /** Send a message */
  onSendMessage: (message: string, context: GrammarContext) => Promise<void>;
  /** Clear chat history */
  onClearHistory: () => void;
  /** Toggle panel */
  onToggle: () => void;
  /** Set panel width */
  onSetWidth: (width: number) => void;
  /** Stop current generation */
  onStopGeneration: () => void;
}

export function AIChatPanel({
  messages,
  isLoading,
  error,
  isAvailable,
  isOpen,
  width,
  grammarContext,
  onSendMessage,
  onClearHistory,
  onToggle,
  onSetWidth,
  onStopGeneration,
}: AIChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isResizing, setIsResizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current && isAvailable) {
      inputRef.current.focus();
    }
  }, [isOpen, isAvailable]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading || !isAvailable) return;

    setInputValue('');
    await onSendMessage(trimmedInput, grammarContext);
  }, [inputValue, isLoading, isAvailable, grammarContext, onSendMessage]);

  // Handle key press in input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;
      onSetWidth(Math.max(250, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onSetWidth]);

  // Closed state - show toggle button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 bg-ide-sidebar border border-ide-border rounded-l-lg p-2 hover:bg-ide-panel transition-colors z-10"
        title="Open AI Chat"
      >
        <ChevronRight size={20} className="text-ide-textActive rotate-180" />
        <MessageSquare size={20} className="text-ide-textActive mt-2" />
      </button>
    );
  }

  return (
    <>
      {/* Resize handle */}
      <div
        className={`w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-ide-border'
        }`}
        onMouseDown={handleResizeStart}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="flex flex-col bg-ide-sidebar border-l border-ide-border h-full"
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border bg-ide-activity">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-ide-textActive" />
            <span className="text-sm font-medium text-ide-textActive">
              AI Assistant
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClearHistory}
              className="p-1.5 hover:bg-ide-panel rounded transition-colors"
              title="Clear chat"
              disabled={messages.length === 0}
            >
              <Trash2
                size={14}
                className={
                  messages.length === 0
                    ? 'text-ide-textActive/30'
                    : 'text-ide-textActive/70 hover:text-ide-textActive'
                }
              />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-ide-panel rounded transition-colors"
              title="Close panel"
            >
              <X
                size={14}
                className="text-ide-textActive/70 hover:text-ide-textActive"
              />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!isAvailable ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle size={48} className="text-yellow-500/50 mb-4" />
              <p className="text-sm text-ide-textActive/70 mb-2">
                AI Assistant is not available
              </p>
              <p className="text-xs text-ide-textActive/50">
                The server has not been configured with an AI provider.
                Contact your administrator to enable this feature.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare size={48} className="text-ide-textActive/30 mb-4" />
              <p className="text-sm text-ide-textActive/70 mb-2">
                Ask me anything about your ANTLR4 grammar!
              </p>
              <p className="text-xs text-ide-textActive/50">
                I can help analyze rules, explain grammar structure, suggest
                optimizations, and more.
              </p>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="px-3 py-2 bg-red-900/30 border-t border-red-800 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-ide-border p-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isAvailable
                  ? 'Ask about your grammar...'
                  : 'AI not available'
              }
              disabled={!isAvailable || isLoading}
              className="flex-1 bg-ide-bg border border-ide-border rounded px-3 py-2 text-sm text-ide-text placeholder:text-ide-textActive/40 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
              rows={2}
            />
            {isLoading ? (
              <button
                onClick={onStopGeneration}
                className="self-end px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Stop generation"
              >
                <StopCircle size={18} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!isAvailable || !inputValue.trim()}
                className="self-end px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send size={18} />
              </button>
            )}
          </div>
          {isAvailable && (
            <div className="text-xs text-ide-textActive/50 mt-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AIChatPanel;
