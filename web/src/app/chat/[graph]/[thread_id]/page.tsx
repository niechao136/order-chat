'use client';

import { useState, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ChatInput } from '@/components/chat/chat-input';
import { MessageList } from '@/components/chat/message-list';
import { useHistory, chatKeys, useGraph } from '@/hooks/use-chat';
import { useColList } from '@/hooks/use-dataset';


export default function ThreadPage() {

  const params = useParams();
  const graph = params.graph as string;
  const thread_id = params.thread_id as string;

  const { data: cols } = useColList();
  const { data: graphs } = useGraph();
  const { data: history } = useHistory(graph, thread_id);

  const graphConfig = useMemo(() => {
    return (graphs ?? []).find(o => o.name === graph) ?? null;
  }, [graphs, graph]);

  const collections = useMemo(() => {
    return (cols ?? []).map(o => o.name);
  }, [cols]);

  const [threadId, setThreadId] = useState<string | null>(thread_id);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const displayMessages = useMemo(() => {
    const msgs = history ?? [];
    if (!isStreaming) return msgs;

    return msgs.map(o =>
      o.id === chatKeys.temp_ai ? { ...o, content: streamingContent } : o
    );
  }, [ history, isStreaming, streamingContent ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <MessageList
        messages={displayMessages}
      />

      {graphConfig && (
        <ChatInput
          graph={graph}
          thread_id={threadId}
          start={false}
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
