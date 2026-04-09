'use client';

import { Send, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { v7 } from 'uuid';

import { useParams, useRouter } from 'next/navigation';

import { MessageList } from '@/components/chat/message-list';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatAction, useHistory, chatKeys } from '@/hooks/use-chat';
import { useOwner } from '@/hooks/use-user';

export default function GraphPage() {

  const params = useParams();
  const graph = params.graph as string;
  const router = useRouter();

  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: owner } = useOwner();
  const { sendMsg } = useChatAction(graph);
  const { data: history } = useHistory(graph, threadId ?? '');

  const displayMessages = useMemo(() => {
    const msgs = history ?? [];
    if (!isStreaming) return msgs;

    return msgs.map(o =>
      o.id === chatKeys.temp_ai ? { ...o, content: streamingContent } : o
    );
  }, [ history, isStreaming, streamingContent ]);

  const handleStartChat = async () => {

    if (!input.trim()) return;

    const thread_id = `user_${owner?.id}_${v7()}`;
    const content = input;

    setInput('');
    setThreadId(thread_id);
    setStreamingContent('');
    setIsStreaming(true);

    sendMsg.mutate({
      thread_id,
      content,
      onChunk: (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
      },
      onError: () => {
        setInput(content);
        setThreadId(null);
        setIsStreaming(false);
        toast.error('消息发送失败，请检查网络连接');
      },
      onFinished: () => {
        setIsStreaming(false);
        // 流结束后跳转，此时侧边栏已经有了（乐观更新注入的），不会有空档期
        router.replace(`/chat/${graph}/${thread_id}`, { scroll: false });
      },
    });
  };

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
              <Sparkles className="w-8 h-8 text-primary"/>
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
                await handleStartChat();
              }
            }}
          />
          <div className="flex flex-col justify-end pb-2 pr-2">
            <Button
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0"
              disabled={!input.trim()}
              onClick={handleStartChat}
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
