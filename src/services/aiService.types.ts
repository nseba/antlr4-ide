/**
 * Type definitions for AI Chat Service
 *
 * The AI configuration (provider, model, API keys) is managed server-side.
 * The client only sends messages and grammar context.
 */

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** True if message is still streaming */
  isStreaming?: boolean;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Grammar context sent with AI requests
 */
export interface GrammarContext {
  /** Full grammar content */
  grammarContent: string;
  /** Input text being parsed */
  inputText?: string;
  /** Start rule name */
  startRule?: string;
  /** Recent parse errors */
  parseErrors?: string[];
  /** Analysis results summary */
  analysisIssues?: string[];
}

/**
 * AI chat request to server
 */
export interface AIChatRequest {
  /** Chat history */
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Grammar context */
  context?: GrammarContext;
  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * AI chat response from server
 */
export interface AIChatResponse {
  /** Response content */
  content: string;
  /** Error message if request failed */
  error?: string;
}

/**
 * AI chat state for the hook
 */
export interface AIChatState {
  /** Chat history */
  messages: ChatMessage[];
  /** Whether chat panel is open */
  isOpen: boolean;
  /** Panel width */
  panelWidth: number;
}
