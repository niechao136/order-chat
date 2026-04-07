
export interface ChatThread {
  thread_id: string
  last_id: string
  summary: string
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}
