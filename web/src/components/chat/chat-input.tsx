'use client';

import { SendIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { ChatConfig } from '@/components/chat/chat-config';
import { VoiceButton } from '@/components/chat/voice-button';

import { useChatAction } from '@/hooks/use-chat';
import { useSpeechAction, useSpeechStream } from '@/hooks/use-speech';
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
  const [isRecord, setIsRecord] = useState(false);
  const [tempResult, setTempResult] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { sendMsg } = useChatAction(agent);
  const { startStreaming, stopStreaming } = useSpeechStream((text, isFinal) => {
    // 实时更新输入框内容
    // 这里逻辑可以优化：如果是中间结果，替换末尾；如果是最终结果，确认追加
    setTempResult(text);

    if (isFinal) {
      setInput(prev => prev + text);
      setTempResult('');
    }
  });
  const { recognize } = useSpeechAction();

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

  const handleRecognize = async (blob: Blob) => {
    const toastId = toast.loading('正在识别语音...');

    const formData = new FormData();
    formData.append('file', blob, 'record.webm');

    recognize.mutate(formData, {
      onSuccess: (res) => {
        setInput(prev => {
          return prev && res.text ? `${prev} ${res.text}` : (res.text ?? '');
        });
        toast.success('识别成功', { id: toastId });
      },
      onError: (err: Error) => {
        toast.error(err.message || '语音识别失败', { id: toastId });
      },
    });
  };

  const handleMic = async () => {
    if (!isRecord) {
      // --- 开始录音逻辑 ---
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 注意：某些浏览器 webm 兼容性更好，SenseVoice 接收 webm 也没问题
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await handleRecognize(audioBlob);
        };

        recorder.start();
        setIsRecord(true);
        toast.success('正在聆听...');
      } catch (err) {
        console.log(err);
        toast.error('无法访问麦克风');
      }
    } else {
      // --- 停止录音逻辑 ---
      recorderRef.current?.stop();
      setIsRecord(false);
      // 停止流中的所有轨道以释放硬件
      recorderRef.current?.stream.getTracks().forEach(track => track.stop());
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
            {/* 语音输入按钮，流式 */}
            <VoiceButton
              onClick={() => handleMicClick()}
              isRecording={isRecording}
            />

            {/* 语音输入按钮，非流式 */}
            <VoiceButton
              onClick={() => handleMic()}
              isRecording={isRecord}
            />

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
