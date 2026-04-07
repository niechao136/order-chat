'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { getChatHistory, getGraphList, getThreadList, sendMessage } from '@/services/chat';
import { getOwnerInfo } from '@/services/user';
import { ChatThread } from '@/types/chat';


export function useFetch() {
  const queryClient = useQueryClient();

  const fetchGraph = async () => {
    const graph = await queryClient.fetchQuery({
      queryKey: [ 'chat', 'graph' ],
      queryFn: getGraphList,
      staleTime: 0
    });

    return { graph };
  };

  return {
    fetchGraph
  };
}

export function useGraph() {
  return useQuery({
    queryKey: ['chat', 'graph'],
    queryFn: () => getGraphList().then(res => res),
  });
}

export function useOwner() {
  return useQuery({
    queryKey: ['user', 'owner'],
    queryFn: () => getOwnerInfo().then(res => res.data),
  });
}

export function useThreads(graph: string, graphs: string[]) {
  return useQuery({
    queryKey: ['chat', 'threads', graph],
    queryFn: () => getThreadList(graph).then(res => res.data),
    enabled: graphs.includes(graph),
  });
}

export function useHistory(graph: string, thread_id: string) {
  return useQuery({
    // 联合 Key：只有当 graph 或 thread_id 变化时才刷新
    queryKey: [ 'chat', 'history', graph, thread_id ],
    queryFn: () => getChatHistory(graph, thread_id).then(res => res.data),
    // 只有当两个参数都存在时才允许执行
    enabled: !!graph && !!thread_id,
    // 可选：如果希望进入页面时数据是最新的，可以设置
    staleTime: 1000 * 60 // 1分钟内认为数据是新鲜的
  });
}

export function useStartChat(graph: string) {
  const queryClient = useQueryClient();
  const queryKey = ['chat', 'threads', graph];

  return useMutation({
    mutationFn: ({ thread_id, content, onChunk, onDone }: {
      thread_id: string;
      content: string;
      onChunk: (content: string, node?: string) => void;
      onDone?: () => void;
    }) =>
      sendMessage(graph, thread_id, content, onChunk, onDone),

    onMutate: async ({ thread_id, content }) => {
      // 1. 取消正在进行的列表请求
      await queryClient.cancelQueries({ queryKey });

      // 2. 保存备份
      const previousThreads = queryClient.getQueryData(queryKey);

      // 3. 乐观地插入一个新对话到侧边栏列表
      const optimisticThread: ChatThread = {
        thread_id: thread_id,
        summary: content, // 初始标题通常是首条消息
        last_id: new Date().toISOString(),
      };

      console.log(previousThreads, optimisticThread)

      queryClient.setQueryData<ChatThread[]>(queryKey, (old) => {
        const oldList = Array.isArray(old) ? old : [];
        console.log(old, oldList)
        return [ optimisticThread, ...oldList ];
      });

      return { previousThreads };
    },
    onError: (error, variables, context) => {
      console.log(error, variables);
      if (context?.previousThreads) {
        queryClient.setQueryData(queryKey, context.previousThreads);
      }
    },
    onSuccess: async (data, variables) => {
      console.log(data);
      const { thread_id } = variables;
      // 仅在成功时刷新历史记录
      await queryClient.invalidateQueries({
        queryKey: [ 'chat', 'history', graph, thread_id ]
      });
    },
    onSettled: async () => {
      // 无论成败都可以尝试刷新侧边栏，确保列表状态正确
      await queryClient.invalidateQueries({ queryKey });
    },
  })
}
