'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageRole } from '@/types/chat';
import { toast } from 'sonner';

export function MsgItem({ role, content }: {
  role: MessageRole;
  content: string;
}) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  // 通用复制功能
  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error('复制失败');
    }
  };

  const handlePlay = () => {
    toast.info('语音播放功能开发中...');
  };

  return (
    <div className={cn(
      "group flex w-full items-start gap-4 py-6 px-2 transition-colors",
      isUser ? "flex-row-reverse" : "hover:bg-slate-50/50"
    )}>
      {/* 头像 */}
      <Avatar className={cn(
        "mt-1 border shadow-sm shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-white text-slate-600"
      )}>
        <AvatarFallback>{isUser ? <User size={18} /> : <Bot size={18} />}</AvatarFallback>
      </Avatar>

      {/* 消息主体容器 */}
      <div className={cn(
        "flex max-w-[85%] flex-col gap-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 消息气泡 */}
        <div className={cn(
          "prose prose-sm max-w-none break-words px-4 py-3 shadow-sm rounded-2xl transition-all",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-white border text-slate-800 rounded-tl-none"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || (isUser ? "" : "...")}
          </ReactMarkdown>
        </div>

        {/* 操作工具栏 */}
        {content && (
          <div className={cn(
            "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "flex-row-reverse mr-1" : "ml-1"
          )}>
            {/* 复制按钮 (用户和 AI 都有) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-primary transition-colors"
              onClick={handleCopy}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </Button>

            {/* 播放按钮 (仅 AI 消息显示) */}
            {!isUser && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-primary transition-colors"
                onClick={handlePlay}
              >
                <Volume2 size={14} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageItem = memo(MsgItem);
