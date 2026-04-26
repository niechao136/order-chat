import { create } from 'zustand';


interface ChatState {
  conversationId: string | null;
  pendingConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  setConversationId: (id: string | null) => void;
  setPendingConversationId: (id: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  pendingConversationId: null,
  isStreaming: false,
  streamingContent: '',

  setConversationId: (conversationId) => set({ conversationId }),
  setPendingConversationId: (pendingConversationId) => set({ pendingConversationId }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  // 专门用于流式追加的方法
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  resetChat: () => set({
    conversationId: null,
    pendingConversationId: null,
    isStreaming: false,
    streamingContent: ''
  }),
}));
