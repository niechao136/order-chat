'use client';

import { SparklesIcon } from 'lucide-react';
import { useState, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ChatInput } from '@/components/chat/chat-input';
import { MessageList } from '@/components/chat/message-list';

import { useGraph, useHistory, chatKeys } from '@/hooks/use-chat';
import { useColList } from '@/hooks/use-dataset';

export default function GraphPage() {

  const params = useParams();
  const graph = params.graph as string;

  const [threadId, setThreadId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: cols } = useColList();
  const { data: graphs } = useGraph();
  const { data: history } = useHistory(graph, threadId ?? '');

  const graphConfig = useMemo(() => {
    return (graphs ?? []).find(o => o.name === graph) ?? null;
  }, [graphs, graph]);

  const collections = useMemo(() => {
    return (cols ?? []).map(o => o.name);
  }, [cols]);

  const displayMessages = useMemo(() => {
    const msgs = history ?? [];
    if (!isStreaming) return msgs;

    return msgs.map(o =>
      o.id === chatKeys.temp_ai ? { ...o, content: streamingContent } : o
    );
  }, [ history, isStreaming, streamingContent ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      {!!threadId
        ? (
          <MessageList
            messages={displayMessages}
          />
        )
        : (
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

      {graphConfig && (
        <ChatInput
          graph={graph}
          thread_id={threadId}
          start={true}
          config={graphConfig}
          collections={collections}
          streamingContent={streamingContent}
          setStreamingContent={setStreamingContent}
          setIsStreaming={setIsStreaming}
          setThreadId={setThreadId}
        />)}
    </div>
  );
}
