import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageItemProps {
  role: 'user' | 'assistant';
  content: string;
  node?: string; // 对应你后端返回的 langgraph_node
}

export function MessageItem({ role, content, node }: MessageItemProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex w-full items-start gap-4 py-4 px-2 transition-colors",
      isUser ? "flex-row-reverse" : "bg-slate-50/50" // 给 AI 回复加个微弱背景色区分
    )}>
      <Avatar className={cn("mt-1 border shadow-sm", isUser ? "bg-primary text-primary-foreground" : "bg-white text-slate-600")}>
        <AvatarFallback>{isUser ? <User size={18} /> : <Bot size={18} />}</AvatarFallback>
      </Avatar>

      <div className={cn("flex max-w-[85%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* 如果有 node 信息，可以显示一个小标签，显示当前是哪个节点在处理 */}
        {!isUser && node && (
          <span className="text-[10px] font-mono text-slate-400 bg-slate-200/50 px-1.5 rounded mb-1">
            {node}
          </span>
        )}

        <div className={cn(
          "prose prose-sm max-w-none break-words px-4 py-2.5 shadow-sm rounded-2xl",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-white border text-slate-800 rounded-tl-none"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || (isUser ? "" : "...")}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
