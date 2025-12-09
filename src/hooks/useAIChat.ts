/**
 * React hook for managing AI chat state
 *
 * All AI configuration is server-side. This hook only manages
 * the chat UI state and makes requests to /api/ai/chat.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  GrammarContext,
  AIChatState,
} from '../services/aiService.types';

// Local storage keys
const STORAGE_KEYS = {
  CHAT_HISTORY: 'ai-chat-history',
  PANEL_STATE: 'ai-panel-state',
};

export interface UseAIChatOptions {
  /** Maximum messages to keep in history */
  maxHistoryLength?: number;
}

export interface UseAIChatReturn {
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether AI is generating a response */
  isLoading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Whether AI is available (configured on server) */
  isAvailable: boolean;
  /** Whether the chat panel is open */
  isPanelOpen: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Send a message to the AI */
  sendMessage: (message: string, context: GrammarContext) => Promise<void>;
  /** Clear chat history */
  clearHistory: () => void;
  /** Toggle panel visibility */
  togglePanel: () => void;
  /** Set panel width */
  setPanelWidth: (width: number) => void;
  /** Stop current generation */
  stopGeneration: () => void;
  /** Check if AI is available */
  checkAvailability: () => Promise<boolean>;
}

const DEFAULT_OPTIONS: UseAIChatOptions = {
  maxHistoryLength: 100,
};

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load state from localStorage
 */
function loadStoredState(): Partial<AIChatState> {
  try {
    const history = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    const panel = localStorage.getItem(STORAGE_KEYS.PANEL_STATE);

    return {
      messages: history ? JSON.parse(history) : [],
      isOpen: panel ? JSON.parse(panel).isOpen : false,
      panelWidth: panel ? JSON.parse(panel).panelWidth : 350,
    };
  } catch {
    return { messages: [], isOpen: false, panelWidth: 350 };
  }
}

/**
 * Hook for managing AI chat state
 */
export function useAIChat(
  initialOptions: UseAIChatOptions = {}
): UseAIChatReturn {
  const options = { ...DEFAULT_OPTIONS, ...initialOptions };

  // Load initial state from localStorage
  const storedState = useRef(loadStoredState());

  const [messages, setMessages] = useState<ChatMessage[]>(
    storedState.current.messages || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(
    storedState.current.isOpen || false
  );
  const [panelWidth, setPanelWidthState] = useState(
    storedState.current.panelWidth || 350
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check AI availability on mount
  useEffect(() => {
    checkAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  // Persist panel state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.PANEL_STATE,
        JSON.stringify({ isOpen: isPanelOpen, panelWidth })
      );
    } catch {
      // Ignore storage errors
    }
  }, [isPanelOpen, panelWidth]);

  /**
   * Check if AI is available on the server
   */
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/ai/config');
      const data = await response.json();
      const available = data.available === true;
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(
    async (message: string, context: GrammarContext) => {
      if (!message.trim()) {
        return;
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: message.trim(),
        timestamp: Date.now(),
      };

      // Create placeholder for assistant response
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      // Add messages to history
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Build messages array for API (without IDs and timestamps)
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            context,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // Mark streaming as complete
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
                break;
              }

              buffer += decoder.decode(value, { stream: true });

              // Parse SSE events
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    // Handle different provider formats
                    const text =
                      parsed.delta?.text || // Anthropic
                      parsed.choices?.[0]?.delta?.content || // OpenAI
                      parsed.candidates?.[0]?.content?.parts?.[0]?.text; // Gemini

                    if (text) {
                      fullContent += text;
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessage.id
                            ? { ...msg, content: fullContent }
                            : msg
                        )
                      );
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } else {
          // Non-streaming response
          const data = await response.json();
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: data.content || '', isStreaming: false }
                : msg
            )
          );
        }

        // Trim history if needed
        if (options.maxHistoryLength) {
          setMessages((prev) => {
            if (prev.length > options.maxHistoryLength!) {
              return prev.slice(prev.length - options.maxHistoryLength!);
            }
            return prev;
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get AI response';
        setError(errorMessage);

        // Update assistant message with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: '',
                  error: errorMessage,
                  isStreaming: false,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, options.maxHistoryLength]
  );

  /**
   * Clear chat history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  /**
   * Toggle panel visibility
   */
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  /**
   * Set panel width
   */
  const setPanelWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(250, Math.min(600, width));
    setPanelWidthState(clampedWidth);
  }, []);

  /**
   * Stop current generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);

    // Mark any streaming messages as complete
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      )
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    isAvailable,
    isPanelOpen,
    panelWidth,
    sendMessage,
    clearHistory,
    togglePanel,
    setPanelWidth,
    stopGeneration,
    checkAvailability,
  };
}

export default useAIChat;
