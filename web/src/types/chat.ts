
export interface GraphConfig {
  name: string
  lang: string
  collection_name: string
}

export interface ChatThread {
  thread_id: string
  last_id: string
  summary: string
}

export interface ChatReq {
  graph: string
  thread_id: string | null
  message: string
  lang: string
  collection_name: string
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}
