'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getChatHistory, getGraphList, getThreadList, sendMessage } from '@/services/chat';
import { ChatMessage, ChatThread, ChatReq } from '@/types/chat';


export const chatKeys = {
  temp_ai: 'temp-ai' as const,
  temp_user: 'temp-user' as const,
  all: [ 'chat' ] as const,
  graph: () => [ ...chatKeys.all, 'graph' ] as const,
  threads: () => [ ...chatKeys.all, 'threads' ] as const,
  thread: (graph: string) => [ ...chatKeys.threads(), graph ] as const,
  histories: () => [ ...chatKeys.all, 'history' ] as const,
  history: (graph: string, thread_id: string) => [ ...chatKeys.histories(), graph, thread_id ] as const,
};


export function useGraph() {
  return useQuery({
    queryKey: chatKeys.graph(),
    queryFn: getGraphList,
    staleTime: 1000 * 60 * 10
  });
}

export function useThreads(graph: string, graphs: string[]) {
  return useQuery({
    queryKey: chatKeys.thread(graph),
    queryFn: () => getThreadList(graph).then(res => res.data),
    enabled: graphs.includes(graph)
  });
}

export function useHistory(graph: string, thread_id: string) {
  return useQuery({
    // 联合 Key：只有当 graph 或 thread_id 变化时才刷新
    queryKey: chatKeys.history(graph, thread_id),
    queryFn: () => getChatHistory(graph, thread_id).then(res => res.data),
    // 只有当两个参数都存在时才允许执行
    enabled: !!graph && !!thread_id && !thread_id.startsWith('temp_'),
    // 可选：如果希望进入页面时数据是最新的，可以设置
    staleTime: 1000 * 30 // 30秒内认为数据是新鲜的
  });
}

export function useChatAction(graph: string = '') {
  const queryClient = useQueryClient();

  const sendMsg = useMutation({
    mutationFn: ({ req, onChunk, onFinished, onThreadCreated }: {
      req: ChatReq;
      onChunk: (content: string, node?: string) => void;
      onFinished?: () => void;
      onError?: () => void;
      onThreadCreated?: (thread_id: string) => void;
    }) => {
      const { thread_id } = req;
      let finalThreadId = thread_id;

      const onDone = async () => {
        // 对话完成后，刷新历史
        if (finalThreadId) {
          await queryClient.invalidateQueries({ queryKey: chatKeys.history(graph, finalThreadId) });
        }

        // 对话完成后，刷新侧边栏
        await queryClient.invalidateQueries({ queryKey: chatKeys.thread(graph) });

        // 执行调用方传入的成功回调
        onFinished?.();
      };

      const handleThreadCreated = (newThreadId: string) => {
        finalThreadId = newThreadId;
        onThreadCreated?.(newThreadId);
      };

      return sendMessage(req, onChunk, onDone, handleThreadCreated);
    },
    onMutate: async ({ req }) => {
      const { thread_id, message } = req;
      const optimisticThreadId = thread_id || `temp_${Date.now()}`;

      // 乐观更新侧边栏
      await queryClient.cancelQueries({ queryKey: chatKeys.thread(graph) });
      const previousThreads = queryClient.getQueryData<ChatThread[]>(chatKeys.thread(graph));
      queryClient.setQueryData<ChatThread[]>(chatKeys.thread(graph), (old) => {
        const oldList = Array.isArray(old) ? old : [];

        // 旧对话逻辑，将该对话置顶
        if (thread_id) {
          const exists = oldList.find(t => t.thread_id === thread_id);
          if (exists) {
            const filtered = oldList.filter(t => t.thread_id !== thread_id);
            return [exists, ...filtered];
          }
        }

        // 新对话逻辑，加入临时对话
        const optimisticThread: ChatThread = {
          thread_id: optimisticThreadId,
          summary: message, // 标题为首条消息
          last_id: new Date().toISOString()
        };
        return [ optimisticThread, ...oldList ];
      });

      // 历史记录乐观更新（仅当 thread_id 已知）
      let previousHistory: ChatMessage[] | undefined;
      if (thread_id) {
        await queryClient.cancelQueries({ queryKey: chatKeys.history(graph, thread_id) });
        previousHistory = queryClient.getQueryData<ChatMessage[]>(chatKeys.history(graph, thread_id));

        const userMsg: ChatMessage = {
          id: chatKeys.temp_user,
          role: 'user',
          content: message
        };
        const aiMsg: ChatMessage = {
          id: chatKeys.temp_ai,
          role: 'assistant',
          content: '' // 初始为空，由 onChunk 更新
        };
        queryClient.setQueryData<ChatMessage[]>(chatKeys.history(graph, thread_id), (old) => {
          return [ ...(old ?? []), userMsg, aiMsg ];
        });
      }
      return { previousThreads, previousHistory, optimisticThreadId };
    },
    onError: (error, variables, context) => {
      console.error(error);
      const { onError } = variables;

      // 1. 回滚侧边栏
      if (context?.previousThreads) {
        queryClient.setQueryData(chatKeys.thread(graph), context.previousThreads);
      }

      // 2. 回滚历史记录
      if (context?.previousHistory && variables.req.thread_id) {
        queryClient.setQueryData(chatKeys.history(graph, variables.req.thread_id), context.previousHistory);
      }

      // 3. 执行回调
      onError?.();
    }
  });

  const fetchGraph = async () => {
    return await queryClient.fetchQuery({
      queryKey: chatKeys.graph(),
      queryFn: getGraphList,
      staleTime: 0
    });
  };

  return {
    sendMsg,
    fetchGraph,
  };
}
