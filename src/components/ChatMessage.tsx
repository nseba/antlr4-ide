/**
 * Chat Message Component
 *
 * Displays a single chat message with support for:
 * - User and assistant message styling
 * - Code block syntax highlighting
 * - Copy-to-clipboard functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, User, Bot, AlertCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../services/aiService.types';

interface ChatMessageProps {
  message: ChatMessageType;
}

interface ParsedBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

/**
 * Parse message content into text and code blocks
 */
function parseMessageContent(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) {
        blocks.push({ type: 'text', content: text });
      }
    }

    // Add code block
    blocks.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) {
      blocks.push({ type: 'text', content: text });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content }];
}

/**
 * Format text with inline code, bold, and italic
 */
function formatInlineText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match inline code, bold, and italic
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matched = match[0];
    if (matched.startsWith('`') && matched.endsWith('`')) {
      // Inline code
      parts.push(
        <code
          key={keyIndex++}
          className="bg-ide-sidebar px-1.5 py-0.5 rounded text-sm font-mono text-blue-400"
        >
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={keyIndex++} className="font-semibold">
          {matched.slice(2, -2)}
        </strong>
      );
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic
      parts.push(
        <em key={keyIndex++}>{matched.slice(1, -1)}</em>
      );
    }

    lastIndex = match.index + matched.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Code block component with copy button
 */
function CodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-ide-activity px-3 py-1 rounded-t text-xs text-ide-textActive/70">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-ide-textActive transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-ide-sidebar p-3 rounded-b overflow-x-auto">
        <code className="text-sm font-mono text-ide-text whitespace-pre-wrap break-words">
          {content}
        </code>
      </pre>
    </div>
  );
}

/**
 * Chat message component
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = !!message.error;

  const parsedBlocks = useMemo(
    () => parseMessageContent(message.content || ''),
    [message.content]
  );

  return (
    <div
      className={`flex gap-3 p-3 ${
        isUser ? 'bg-ide-panel' : 'bg-ide-bg'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : isError ? 'bg-red-600' : 'bg-green-600'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : isError ? (
          <AlertCircle size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ide-textActive/70 mb-1">
          {isUser ? 'You' : 'AI Assistant'}
          {message.isStreaming && (
            <span className="ml-2 animate-pulse text-blue-400">
              typing...
            </span>
          )}
        </div>

        {isError ? (
          <div className="text-red-400 text-sm">
            Error: {message.error}
          </div>
        ) : (
          <div className="text-sm text-ide-text leading-relaxed">
            {parsedBlocks.map((block, index) => {
              if (block.type === 'code') {
                return (
                  <CodeBlock
                    key={index}
                    content={block.content}
                    language={block.language}
                  />
                );
              }
              return (
                <p key={index} className="whitespace-pre-wrap">
                  {formatInlineText(block.content)}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
