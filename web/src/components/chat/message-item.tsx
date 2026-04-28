'use client';

import { User, Bot, Copy, Check, Volume2 } from 'lucide-react';
import { memo, useState } from 'react';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';
import { synthesizeSpeechStream } from '@/services/speech';
import { MessageRole } from '@/types/chat';
import { copyToClipboard, getAudioText } from '@/utils/string';


export function MsgItem({ role, content }: {
  role: MessageRole;
  content: string;
}) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 通用复制功能
  const handleCopy = async () => {
    if (!content) return;
    const res = await copyToClipboard(content);
    if (res) {
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  const handlePlay = async () => {
    if (isPlaying) return;

    try {
      setIsPlaying(true);
      const text = getAudioText(content);
      const body = JSON.stringify({ text });
      await synthesizeSpeechStream(body);
    } catch (error) {
      console.error("播放失败:", error);
      toast.error("播放失败");
    } finally {
      // 无论成功还是失败，播放结束后重置状态
      setIsPlaying(false);
    }
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
          "prose prose-sm max-w-none wrap-break-word px-4 py-3 shadow-sm rounded-2xl transition-all",
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
            isUser ? "flex-row-reverse mr-1" : "ml-1",
            (isPlaying || copied) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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
                disabled={isPlaying}
                onClick={handlePlay}
              >
                {isPlaying ? (
                  <Volume2 size={14} className="animate-pulse text-green-500"/>
                ) : (
                  <Volume2 size={14}/>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageItem = memo(MsgItem);
