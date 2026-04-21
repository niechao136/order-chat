'use client';

import { memo, useEffect, useRef } from 'react';
import { MessageItem } from '@/components/chat/message-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/types/chat';

export function MsgList({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 只要消息列表长度或内容发生变化，就滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  return (
    <ScrollArea ref={scrollRef} className="flex-1 w-full">
      <div className="max-w-3xl mx-auto flex flex-col pb-32 pt-4">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            role={msg.role}
            content={msg.content}
          />
        ))}
        {messages.length === 0 && (
          <div className="flex h-40 items-center justify-center text-slate-400 text-sm italic">
            暂无消息，开始对话吧...
          </div>
        )}
      </div>
    </ScrollArea>
  );
}


export const MessageList = memo(MsgList);
