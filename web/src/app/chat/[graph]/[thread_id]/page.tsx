'use client';

import { Send } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { useParams } from 'next/navigation';

import { MessageList } from '@/components/chat/message-list';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendMsg, useHistory, useUpdate, TEMP_AI } from '@/hooks/use-query';


export default function ThreadPage() {

  const params = useParams();
  const graph = params.graph as string;
  const thread_id = params.thread_id as string;

  const { data: history } = useHistory(graph, thread_id);
  const { mutate: sendMsg } = useSendMsg(graph);
  const { updateMsg } = useUpdate();

  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const displayMessages = useMemo(() => {
    const msgs = history ?? [];
    if (!isStreaming) return msgs;

    return msgs.map(o =>
      o.id === TEMP_AI ? { ...o, content: streamingContent } : o
    );
  }, [ history, isStreaming, streamingContent ]);

  const handleSendMsg = async () => {

    if (!input.trim()) return;

    const content = input;

    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    sendMsg({
      thread_id,
      content,
      onChunk: (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
        updateMsg(chunk, graph, thread_id);
      },
      onError: () => {
        setInput(content);
        setIsStreaming(false);
        toast.error("消息发送失败，请检查网络连接");
      },
      onFinished: () => {
        setIsStreaming(false);
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <MessageList
        messages={displayMessages}
      />

      <div className="max-w-3xl w-full sticky bottom-8">
        <div
          className="relative flex items-center bg-white rounded-2xl shadow-lg border p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Textarea
            placeholder={`发送消息...`}
            className="min-h-14 border-0 focus-visible:ring-0 resize-none py-4 px-4 text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await handleSendMsg();
              }
            }}
          />
          <div className="flex flex-col justify-end pb-2 pr-2">
            <Button
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0"
              disabled={!input.trim()}
              onClick={handleSendMsg}
            >
              <Send className="w-4 h-4"/>
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3">
          AI 生成的内容可能不准确，请注意甄别。
        </p>
      </div>
    </div>
  );
}
