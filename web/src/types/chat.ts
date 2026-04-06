
export interface ChatThread {
  thread_id: string
  last_id: string
  summary: string
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  node?: string;
}
