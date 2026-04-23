'use client';

import { SendIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { ChatConfig } from '@/components/chat/chat-config';

import { useChatAction, } from '@/hooks/use-chat';
import { GraphConfig } from '@/types/chat';


interface ChatInputProp {
  graph: string
  thread_id: string | null
  start: boolean
  config: GraphConfig
  collections: string[]
  streamingContent: string
  setStreamingContent: (streamingContent: string) => void
  setIsStreaming: (isStreaming: boolean) => void
  setThreadId: (threadId: string | null) => void
}


export function ChatInput({ graph, thread_id, start, config, collections, streamingContent, setIsStreaming, setStreamingContent, setThreadId }: ChatInputProp) {

  const router = useRouter();

  const [ input, setInput ] = useState('');
  const [ lang, setLang ] = useState(config.lang);
  const [ collection, setCollection ] = useState(config.collection_name);

  const { sendMsg } = useChatAction(graph);

  const setConfig = (lang: string, collection_name: string) => {
    setLang(lang);
    setCollection(collection_name);
  }

  const handleStartChat = async () => {

    if (!input.trim()) return;

    const content = input;

    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    sendMsg.mutate({
      req: {
        graph,
        thread_id,
        message: content,
        lang,
        collection_name: collection,
      },
      onChunk: (chunk: string) => {
        setStreamingContent(streamingContent + chunk);
      },
      onError: () => {
        setInput(content);
        if (start) {
          setThreadId(null);
        }
        setIsStreaming(false);
        toast.error('消息发送失败，请检查网络连接');
      },
      onFinished: () => {
        setIsStreaming(false);
        if (start) {
          router.replace(`/chat/${graph}/${thread_id}`, { scroll: false });
        }
      },
      onThreadCreated: (newThreadId: string) => {
        if (start) {
          setThreadId(newThreadId);
        }
      },
    });
  };

  return (
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
          <ChatConfig
            collection_name={collection}
            collections={collections}
            disabled={!!thread_id}
            lang={lang}
            setConfig={setConfig}
          />
          <Button
            size="icon"
            className="rounded-xl h-10 w-10 shrink-0"
            disabled={!input.trim()}
            onClick={handleStartChat}
          >
            <SendIcon className="w-4 h-4"/>
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-center text-slate-400 mt-3">
        AI 生成的内容可能不准确，请注意甄别。
      </p>
    </div>
  );

}
