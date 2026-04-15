'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getChatHistory, getGraphList, getThreadList, sendMessage } from '@/services/chat';
import { ChatMessage, ChatThread } from '@/types/chat';


export const chatKeys = {
  temp_ai: 'temp-ai' as const,
  temp_user: 'temp-user' as const,
  all: [ 'chat' ] as const,
  graph: () => [ ...chatKeys.all, 'graph' ] as const,
  threads: () => [ ...chatKeys.all, 'threads' ] as const,
  thread: (graph: string) => [ ...chatKeys.threads(), graph ] as const,
  histories: () => [ ...chatKeys.all, 'history' ] as const,
  history: (graph: string, thread_id: string) => [ ...chatKeys.histories(), graph, thread_id ] as const,
}


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
    enabled: !!graph && !!thread_id,
    // 可选：如果希望进入页面时数据是最新的，可以设置
    staleTime: 1000 * 30 // 30秒内认为数据是新鲜的
  });
}

export function useChatAction(graph: string = '') {
  const queryClient = useQueryClient();

  const sendMsg = useMutation({
    mutationFn: ({ thread_id, content, onChunk, onFinished }: {
      thread_id: string;
      content: string;
      onChunk: (content: string, node?: string) => void;
      onFinished?: () => void;
      onError?: () => void;
    }) => {
      const onDone = async () => {
        // 对话完成后，刷新历史
        await queryClient.invalidateQueries({ queryKey: chatKeys.history(graph, thread_id) });

        // 对话完成后，刷新侧边栏
        await queryClient.invalidateQueries({ queryKey: chatKeys.thread(graph) });

        // 执行调用方传入的成功回调
        onFinished?.();
      };

      return sendMessage(graph, thread_id, content, onChunk, onDone);
    },
    onMutate: async ({ thread_id, content }) => {
      // 1. 取消正在进行的请求（列表和历史）
      await queryClient.cancelQueries({ queryKey: chatKeys.thread(graph) });
      await queryClient.cancelQueries({ queryKey: chatKeys.history(graph, thread_id) });

      // 2. 保存备份
      const previousThreads = queryClient.getQueryData<ChatThread[]>(chatKeys.thread(graph));
      const previousHistory = queryClient.getQueryData<ChatMessage[]>(chatKeys.history(graph, thread_id));

      // 3. 乐观更新左侧列表
      queryClient.setQueryData<ChatThread[]>(chatKeys.thread(graph), (old) => {
        const oldList = Array.isArray(old) ? old : [];

        // 检查该 thread_id 是否已在列表中
        const exists = oldList.find(t => t.thread_id === thread_id);

        if (exists) {
          // --- 旧对话逻辑 ---
          // 1. 过滤掉旧的该对话项
          const filtered = oldList.filter(t => t.thread_id !== thread_id);
          // 2. 将其置顶，并更新最后活跃时间（可选是否更新 summary）
          return [
            exists,
            ...filtered
          ];
        } else {
          // --- 新对话逻辑 ---
          const optimisticThread: ChatThread = {
            thread_id: thread_id,
            summary: content, // 初始标题通常是首条消息
            last_id: new Date().toISOString()
          };
          return [ optimisticThread, ...oldList ];
        }
      });

      // 4. 乐观更新消息历史
      const userMsg: ChatMessage = {
        id: chatKeys.temp_user,
        role: 'user',
        content: content
      };
      const aiMsg: ChatMessage = {
        id: chatKeys.temp_ai,
        role: 'assistant',
        content: '' // 初始为空，由 onChunk 更新
      };
      queryClient.setQueryData<ChatMessage[]>(chatKeys.history(graph, thread_id), (old) => {
        return [ ...(old ?? []), userMsg, aiMsg ];
      });

      return { previousThreads, previousHistory };
    },
    onError: (error, variables, context) => {
      console.log(error);
      const { thread_id, onError } = variables;

      // 1. 回滚侧边栏
      if (context?.previousThreads) {
        queryClient.setQueryData(chatKeys.thread(graph), context.previousThreads);
      }

      // 2. 回滚历史记录
      if (context?.previousHistory) {
        queryClient.setQueryData(chatKeys.history(graph, thread_id), context.previousHistory);
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
  }
}
