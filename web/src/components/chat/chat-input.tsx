'use client';

import { SendIcon, MicIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { ChatConfig } from '@/components/chat/chat-config';

import { useChatAction } from '@/hooks/use-chat';
import { useChatStore } from '@/stores/chat';
import { GraphConfig } from '@/types/chat';

interface ChatInputProp {
  graph: string;
  start: boolean;
  config: GraphConfig;
  collections: string[];
}

export function ChatInput({
  graph,
  start,
  config,
  collections,
}: ChatInputProp) {
  const router = useRouter();

  const threadId = useChatStore((s) => s.threadId);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const setThreadId = useChatStore((s) => s.setThreadId);
  const setPendingThreadId = useChatStore((s) => s.setPendingThreadId);

  const [input, setInput] = useState('');
  const [lang, setLang] = useState(config.lang);
  const [collection, setCollection] = useState(config.collection_name);

  const { sendMsg } = useChatAction(graph);

  const setConfig = (lang: string, collection_name: string) => {
    setLang(lang);
    setCollection(collection_name);
  };

  const handleStartChat = async () => {
    if (!input.trim()) return;

    const content = input;
    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    sendMsg.mutate({
      req: {
        graph,
        thread_id: threadId,
        message: content,
        lang,
        collection_name: collection,
      },
      onChunk: (chunk: string) => {
        appendStreamingContent(chunk);
      },
      onError: () => {
        setInput(content);
        if (start) {
          setThreadId(null);
          setPendingThreadId(null);
        }
        setIsStreaming(false);
        toast.error('消息发送失败，请检查网络连接');
      },
      onFinished: () => {
        setIsStreaming(false);
        const pendingId = useChatStore.getState().pendingThreadId;
        if (start && pendingId) {
          setThreadId(pendingId);
          setPendingThreadId(null);
          router.replace(`/chat/${graph}/${pendingId}`, { scroll: false });
        }
      },
      onThreadCreated: (newThreadId: string) => {
        if (start) {
          setPendingThreadId(newThreadId);
        }
      },
    });
  };

  return (
    <div className="max-w-3xl w-full sticky bottom-8 px-4 md:px-0">
      <div className="relative bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-slate-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300">

        {/* 输入区域 */}
        <Textarea
          rows={1}
          placeholder="发送消息..."
          className="w-full min-h-[60px] max-h-[200px] border-0 focus-visible:ring-0 resize-none pt-4 pb-12 px-4 text-base bg-transparent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              await handleStartChat();
            }
          }}
        />

        {/* 底部工具栏 */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* 语音输入按钮预留位置 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              onClick={() => toast.info('语音输入功能开发中...')}
            >
              <MicIcon className="h-4.5 w-4.5" />
            </Button>

            {/* 配置按钮 */}
            <ChatConfig
              collection_name={collection}
              collections={collections}
              disabled={!!threadId}
              lang={lang}
              setConfig={setConfig}
            />
          </div>

          {/* 发送按钮 */}
          <Button
            size="sm"
            className="rounded-xl h-8 px-3 gap-1.5 transition-all active:scale-95"
            disabled={!input.trim()}
            onClick={handleStartChat}
          >
            <span className="text-xs font-medium">发送</span>
            <SendIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-center text-slate-400 mt-4 tracking-wide">
        AI 生成的内容可能不准确，请注意甄别。
      </p>
    </div>
  );
}
