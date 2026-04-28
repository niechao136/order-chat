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

  // 1. 处理初始化进入页面时的自动滚动
  // 依赖 history 数据加载完成的时机 (第一次 messages 长度大于 0 时)
  useEffect(() => {
    if (messages.length > 0) {
      // 初始化跳转建议用 'instant' 或 'auto'，不要 smooth，否则页面加载时会有闪烁感
      setTimeout(() => scrollToBottom('auto'), 100); 
    }
  }, [messages.length]);

  // 2. 处理消息内容变化（包括流式输出）时的滚动
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
