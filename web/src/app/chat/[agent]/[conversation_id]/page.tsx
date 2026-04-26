'use client';

import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ChatInput } from '@/components/chat/chat-input';
import { MessageList } from '@/components/chat/message-list';
import { useHistory, chatKeys, useAgent } from '@/hooks/use-chat';
import { useDatasetList } from '@/hooks/use-dataset';
import { useChatStore } from '@/stores/chat';


export default function ConversationPage() {

  const params = useParams();
  const agent = params.agent as string;
  const conversation_id = params.conversation_id as string;

  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);

  const { data: dataset } = useDatasetList();
  const { data: agents } = useAgent();
  const { data: history } = useHistory(agent, conversation_id);

  const agentConfig = useMemo(() => {
    return (agents ?? []).find(o => o.name === agent) ?? null;
  }, [agents, agent]);

  const datasets = useMemo(() => {
    return (dataset ?? []).map(o => o.name);
  }, [dataset]);

  const displayMessages = useMemo(() => {
    const msgs = history ?? [];
    if (!isStreaming) return msgs;

    return msgs.map(o =>
      o.message_id === chatKeys.temp_ai ? { ...o, content: streamingContent } : o
    );
  }, [ history, isStreaming, streamingContent ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <MessageList
        messages={displayMessages}
      />

      {agentConfig && (
        <ChatInput
          agent={agent}
          start={false}
          config={agentConfig}
          datasets={datasets}
        />)}
    </div>
  );
}
