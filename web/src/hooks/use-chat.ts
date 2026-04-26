'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getChatHistory, getAgentList, getConversationList, sendMessage } from '@/services/chat';
import { ChatMessage, ChatConversation, ChatReq } from '@/types/chat';


export const chatKeys = {
  temp_ai: 'temp-ai' as const,
  temp_user: 'temp-user' as const,
  all: [ 'chat' ] as const,
  agent: () => [ ...chatKeys.all, 'agent' ] as const,
  conversations: () => [ ...chatKeys.all, 'conversations' ] as const,
  conversation: (agent: string) => [ ...chatKeys.conversations(), agent ] as const,
  histories: () => [ ...chatKeys.all, 'history' ] as const,
  history: (agent: string, conversation_id: string) => [ ...chatKeys.histories(), agent, conversation_id ] as const,
};


export function useAgent() {
  return useQuery({
    queryKey: chatKeys.agent(),
    queryFn: getAgentList,
    staleTime: 1000 * 60 * 10
  });
}

export function useConversations(agent: string, agents: string[]) {
  return useQuery({
    queryKey: chatKeys.conversation(agent),
    queryFn: () => getConversationList(agent).then(res => res.data),
    enabled: agents.includes(agent)
  });
}

export function useHistory(agent: string, conversation_id: string) {
  return useQuery({
    // 联合 Key：只有当 agent 或 conversation_id 变化时才刷新
    queryKey: chatKeys.history(agent, conversation_id),
    queryFn: () => getChatHistory(agent, conversation_id).then(res => res.data),
    // 只有当两个参数都存在时才允许执行
    enabled: !!agent && !!conversation_id,
    // 可选：如果希望进入页面时数据是最新的，可以设置
    staleTime: 1000 * 30 // 30秒内认为数据是新鲜的
  });
}

export function useChatAction(agent: string = '') {
  const queryClient = useQueryClient();

  const sendMsg = useMutation({
    mutationFn: ({ req, onChunk, onFinished, onConversationCreated }: {
      req: ChatReq;
      onChunk: (content: string, node?: string) => void;
      onFinished?: () => void;
      onError?: () => void;
      onConversationCreated?: (conversation_id: string) => void;
    }) => {
      const { conversation_id } = req;
      let finalConversationId = conversation_id;

      const onDone = async () => {
        // 对话完成后，刷新历史
        if (finalConversationId) {
          await queryClient.invalidateQueries({ queryKey: chatKeys.history(agent, finalConversationId) });
        }

        // 对话完成后，刷新侧边栏
        await queryClient.invalidateQueries({ queryKey: chatKeys.conversation(agent) });

        // 执行调用方传入的成功回调
        onFinished?.();
      };

      const handleConversationCreated = (newConversationId: string) => {
        finalConversationId = newConversationId;
        onConversationCreated?.(newConversationId);
      };

      return sendMessage(req, onChunk, onDone, handleConversationCreated);
    },
    onMutate: async ({ req }) => {
      const { conversation_id, query } = req;
      const optimisticConversationId = conversation_id || '';

      // 乐观更新侧边栏
      await queryClient.cancelQueries({ queryKey: chatKeys.conversation(agent) });
      const previousConversations = queryClient.getQueryData<ChatConversation[]>(chatKeys.conversation(agent));
      queryClient.setQueryData<ChatConversation[]>(chatKeys.conversation(agent), (old) => {
        const oldList = Array.isArray(old) ? old : [];

        // 旧对话逻辑，将该对话置顶
        if (conversation_id) {
          const exists = oldList.find(t => t.conversation_id === conversation_id);
          if (exists) {
            const filtered = oldList.filter(t => t.conversation_id !== conversation_id);
            return [exists, ...filtered];
          }
        }

        // 新对话逻辑，加入临时对话
        const optimisticConversation: ChatConversation = {
          conversation_id: optimisticConversationId,
          summary: query, // 标题为首条消息
          last_message_id: new Date().toISOString()
        };
        return [ optimisticConversation, ...oldList ];
      });

      // 历史记录乐观更新
      await queryClient.cancelQueries({ queryKey: chatKeys.history(agent, optimisticConversationId) });
      const previousHistory = queryClient.getQueryData<ChatMessage[]>(chatKeys.history(agent, optimisticConversationId));

      const userMsg: ChatMessage = {
        message_id: chatKeys.temp_user,
        role: 'user',
        content: query
      };
      const aiMsg: ChatMessage = {
        message_id: chatKeys.temp_ai,
        role: 'ai',
        content: '' // 初始为空，由 onChunk 更新
      };
      queryClient.setQueryData<ChatMessage[]>(chatKeys.history(agent, optimisticConversationId), (old) => {
        return [ ...(old ?? []), userMsg, aiMsg ];
      });
      return { previousConversations, previousHistory, optimisticConversationId };
    },
    onError: (error, variables, context) => {
      console.error(error);
      const { onError } = variables;

      // 1. 回滚侧边栏
      if (context?.previousConversations) {
        queryClient.setQueryData(chatKeys.conversation(agent), context.previousConversations);
      }

      // 2. 回滚历史记录
      if (context?.previousHistory && variables.req.conversation_id) {
        queryClient.setQueryData(chatKeys.history(agent, variables.req.conversation_id), context.previousHistory);
      }

      // 3. 执行回调
      onError?.();
    }
  });

  const fetchAgent = async () => {
    return await queryClient.fetchQuery({
      queryKey: chatKeys.agent(),
      queryFn: getAgentList,
      staleTime: 0
    });
  };

  return {
    sendMsg,
    fetchAgent,
  };
}
