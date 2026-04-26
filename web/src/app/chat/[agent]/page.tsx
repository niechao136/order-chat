'use client';

import { SparklesIcon } from 'lucide-react';
import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ChatInput } from '@/components/chat/chat-input';
import { MessageList } from '@/components/chat/message-list';

import { useAgent, useHistory, chatKeys } from '@/hooks/use-chat';
import { useDatasetList } from '@/hooks/use-dataset';
import { useChatStore } from '@/stores/chat';


function ChatWelcome() {
  return (
    <div className="max-w-2xl w-full text-center space-y-6 mb-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
        <SparklesIcon className="w-8 h-8 text-primary"/>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        你好！
      </h1>
      <p className="text-slate-500 text-lg">
        今天有什么我可以帮你的吗？
      </p>
    </div>
  )
}


export default function AgentPage() {

  const params = useParams();
  const agent = params.agent as string;

  const conversationId = useChatStore((s) => s.conversationId);
  const pendingConversationId = useChatStore((s) => s.pendingConversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);

  const { data: dataset } = useDatasetList();
  const { data: agents } = useAgent();
  const { data: history } = useHistory(agent, conversationId ?? '');

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
      {pendingConversationId || conversationId ? <MessageList messages={displayMessages}/> : <ChatWelcome/>}

      {agentConfig && (
        <ChatInput
          agent={agent}
          start={true}
          config={agentConfig}
          datasets={datasets}
        />)}
    </div>
  );
}
