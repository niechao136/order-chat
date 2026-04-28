'use client';

import { memo, useEffect, useRef } from 'react';
import { MessageItem } from '@/components/chat/message-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/types/chat';

export function MsgList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 封装统一的滚动到底部函数
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior: behavior });
  };

  useEffect(() => {
    // 如果正在打字机输出或者有新消息，平滑滚动到底部
    scrollToBottom('smooth');
  }, [messages]);

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="max-w-3xl mx-auto flex flex-col pb-32 pt-4">
        {messages.map((msg) => (
          <MessageItem
            key={msg.message_id}
            role={msg.role}
            content={msg.content}
          />
        ))}
        {messages.length === 0 && (
          <div className="flex h-40 items-center justify-center text-slate-400 text-sm italic">
            暂无消息，开始对话吧...
          </div>
        )}
        <div ref={bottomRef} className="h-px w-full" />
      </div>
    </ScrollArea>
  );
}


export const MessageList = memo(MsgList);
