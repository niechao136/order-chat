'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue } from 'framer-motion';


export function useVoiceActivity(isActive: boolean) {
  // 使用 MotionValue 绕过 React 渲染周期
  const volume = useMotionValue(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {

    const startTracking = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 256;
          source.connect(analyser);

          audioContextRef.current = audioContext;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const update = () => {
            if (!analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;

            // 更新 MotionValue，这里不会触发组件重新渲染
            volume.set(Math.min(average / 100, 1));

            animationFrameRef.current = requestAnimationFrame(update);
          };
          update();
        } catch (err) {
          console.error("麦克风访问失败:", err);
        }
      };

    const stopTracking = async () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }

      // 关键修复：检查 state，只有不是 'closed' 时才关闭
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn("关闭 AudioContext 失败:", e);
        }
      }
      audioContextRef.current = null;
      analyserRef.current = null;

      // 释放麦克风硬件占用，否则浏览器的录音图标会一直亮着
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      volume.set(0);
    };

    if (isActive) {
      startTracking().then();
    } else {
      stopTracking().then();
    }

    return () => {
      stopTracking().then();
    };
  }, [isActive, volume]);

  return volume;
}
