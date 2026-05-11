'use client';

import { MicIcon, SendIcon } from 'lucide-react';
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { ChatConfig } from '@/components/chat/chat-config';

import { cn } from '@/lib/utils';
import { useChatAction } from '@/hooks/use-chat';
import { useSpeechStream } from '@/hooks/use-speech';
import { useVoiceActivity } from '@/hooks/use-media';
import { useChatStore } from '@/stores/chat';
import { AgentConfig } from '@/types/chat';


interface ChatInputProp {
  agent: string;
  start: boolean;
  config: AgentConfig;
  datasets: string[];
}


export function ChatInput({
  agent,
  start,
  config,
  datasets,
}: ChatInputProp) {

  const router = useRouter();

  const conversationId = useChatStore((s) => s.conversationId);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setPendingConversationId = useChatStore((s) => s.setPendingConversationId);

  const [input, setInput] = useState('');
  const [lang, setLang] = useState(config.lang);
  const [dataset, setDataset] = useState(config.dataset);
  const [isRecording, setIsRecording] = useState(false);
  const [tempResult, setTempResult] = useState('');

  const { sendMsg } = useChatAction(agent);
  const volumeValue = useVoiceActivity(isRecording);
  const { startStreaming, stopStreaming } = useSpeechStream((text, isFinal) => {
    // 实时更新输入框内容
    // 这里逻辑可以优化：如果是中间结果，替换末尾；如果是最终结果，确认追加
    setTempResult(text);

    if (isFinal) {
      setInput(prev => prev + text);
      setTempResult('');
    }
  });

  const scale = useTransform(volumeValue, [0, 1], [1, 2.5]);
  const opacity = useTransform(volumeValue, [0, 1], [0.4, 0.8]);
  const iconScale = useTransform(volumeValue, [0, 1], [1, 1.4]);

  const setConfig = (lang: string, dataset: string) => {
    setLang(lang);
    setDataset(dataset);
  };

  const handleStartChat = async () => {
    if (!input.trim()) return;

    const content = input;
    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    sendMsg.mutate({
      req: {
        agent,
        conversation_id: conversationId,
        query: content,
        lang,
        dataset,
      },
      onChunk: (chunk: string) => {
        appendStreamingContent(chunk);
      },
      onError: () => {
        setInput(content);
        if (start) {
          setConversationId(null);
          setPendingConversationId(null);
        }
        setIsStreaming(false);
        toast.error('消息发送失败，请检查网络连接');
      },
      onFinished: () => {
        setIsStreaming(false);
        const pendingId = useChatStore.getState().pendingConversationId;
        if (start && pendingId) {
          setConversationId(pendingId);
          setPendingConversationId(null);
          router.replace(`/chat/${agent}/${pendingId}`, { scroll: false });
        }
      },
      onConversationCreated: (newConversationId: string) => {
        if (start) {
          setPendingConversationId(newConversationId);
        }
      },
    });
  };

  const handleMicClick = async () => {
    if (!isRecording) {
      try {
        await startStreaming();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
        toast.error('无法启动实时语音识别');
      }
    } else {
      stopStreaming();
      setIsRecording(false);
      // 停止后，将最后剩余的临时文字填入输入框
      if (tempResult) {
        setInput(prev => prev + tempResult);
        setTempResult('');
      }
    }
  };

  return (
    <div className="max-w-3xl w-full sticky bottom-8 px-4 md:px-0">
      <div className="relative bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-slate-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300">

        {/* 输入区域 */}
        <Textarea
          rows={1}
          placeholder="发送消息..."
          className="w-full min-h-15 max-h-50 border-0 focus-visible:ring-0 resize-none pt-4 pb-12 px-4 text-base bg-transparent"
          value={input + (tempResult ? ` ${tempResult}` : '')}
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
            {/* 语音输入按钮 */}
            <div className="relative flex items-center justify-center w-10 h-10">
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    style={{ scale, opacity }} // 直接绑定 MotionValue
                    className="absolute inset-0 rounded-full bg-red-400/30 z-0"
                  />
                )}
              </AnimatePresence>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'relative z-10 h-9 w-9 rounded-xl transition-all duration-300',
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600'
                    : 'text-slate-400 hover:bg-slate-100'
                )}
                onClick={() => handleMicClick()}
              >
                <motion.div style={{ scale: isRecording ? iconScale : 1 }}>
                  <MicIcon className="h-5 w-5"/>
                </motion.div>
              </Button>
            </div>

            {/* 配置按钮 */}
            <ChatConfig
              dataset={dataset}
              datasets={datasets}
              disabled={!!conversationId}
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
