import { create } from 'zustand';


interface ChatState {
  threadId: string | null;
  pendingThreadId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  setThreadId: (id: string | null) => void;
  setPendingThreadId: (id: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  threadId: null,
  pendingThreadId: null,
  isStreaming: false,
  streamingContent: '',

  setThreadId: (id) => set({ threadId: id }),
  setPendingThreadId: (pendingThreadId) => set({ pendingThreadId }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  // 专门用于流式追加的方法
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  resetChat: () => set({
    threadId: null,
    pendingThreadId: null,
    isStreaming: false,
    streamingContent: ''
  }),
}));
