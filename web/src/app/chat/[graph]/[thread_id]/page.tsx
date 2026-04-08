'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { useParams } from 'next/navigation';

import { MessageList } from '@/components/chat/message-list';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStartChat, useHistory } from '@/hooks/use-query';
import { ChatMessage } from '@/types/chat';


export default function ThreadPage() {

  const params = useParams();
  const graph = params.graph as string;
  const thread_id = params.thread_id as string;

  const { data: history } = useHistory(graph, thread_id);
  const { mutate: startChat } = useStartChat(graph);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleStartChat = async () => {

    if (!input.trim()) return;

    const content = input;

    setInput('');

    const userMsg: ChatMessage = { role: 'user', content, id: Date.now().toString() };
    setMessages([userMsg]);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: aiMsgId }]);

    startChat({
      thread_id,
      content,
      onChunk: (chunk: string) => {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMsgId ? { ...msg, content: msg.content + chunk } : msg
        ));
      },
      onDone: () => {
        setMessages([]);
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <MessageList
        messages={[...(history ?? []), ...messages]}
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
