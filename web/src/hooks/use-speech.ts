import { useMutation } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';

import { getBaseUrl } from '@/services/api';
import { recognizeSpeech, synthesizeSpeech } from '@/services/speech';


export function useSpeechAction() {

  const play = useMutation({
    mutationFn: synthesizeSpeech,
  });

  const recognize = useMutation({
    mutationFn: recognizeSpeech,
  });

  return {
    play,
    recognize,
  };

}


export function useSpeechStream(onResult: (text: string, isFinal: boolean) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStreaming = useCallback(async () => {
    // 1. 初始化 WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let websocket = `${protocol}//${window.location.host}/api/speech/asr-stream`;
    const base = getBaseUrl();
    if (base.startsWith('http')) {
       const host = base.replace('http:', 'ws:').replace('https:', 'wss:')
       websocket = `${host}/speech/asr-stream`;
    }
    wsRef.current = new WebSocket(websocket);
    wsRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onResult(data.text, data.is_final);
    };

    // 2. 初始化 AudioContext
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });

    // 3. 加载并启动 AudioWorklet
    await audioContextRef.current.audioWorklet.addModule('/asr-processor.js');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

    // 创建 Worklet 节点
    workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'asr-processor');

    // 监听来自 Worklet 线程的数据
    workletNodeRef.current.onprocessorerror = (event) => {
      console.error('Worklet 处理器出错:', event);
    };

    workletNodeRef.current.port.onmessage = (event) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }
    };

    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 0;
    sourceRef.current.connect(workletNodeRef.current);
    workletNodeRef.current.connect(audioContextRef.current.destination);
    gainNode.connect(audioContextRef.current.destination);
  }, [onResult]);

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current?.close();
    }
    wsRef.current?.close();
    wsRef.current = null;
    audioContextRef.current = null;
    workletNodeRef.current = null;
    sourceRef.current = null;
  }, []);

  return { startStreaming, stopStreaming };
}
