import { apiRequest, getBaseUrl } from '@/services/api';
import { AsrRes } from '@/types/speech';
import { getToken } from '@/utils/cookie';


export async function synthesizeSpeech(body: string) {
  const res = await apiRequest(`speech/tts`, {
    method: 'POST',
    body,
  });
  const audioBlob = await res.blob();
  return URL.createObjectURL(audioBlob);
}

export async function synthesizeSpeechStream(body: string) {

  const token = await getToken();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/speech/tts-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',   // 携带 Cookie（匿名用户标识）
    body: body
  });

  if (!res.ok) throw new Error('网络请求失败');
  if (!res.body) throw new Error('流数据为空');

  const sampleRate = parseInt(res.headers.get('X-Sample-Rate') || '22050');
  const channels = parseInt(res.headers.get('X-Channels') || '1');

  const reader = res.body!.getReader();
  const audioCtx = new AudioContext({ sampleRate });

  // 关键：用于记录下一段音频应该开始播放的时间，防止断音
  let nextStartTime = audioCtx.currentTime;
  // 关键：处理奇数字节，防止 RangeError
  let leftover: Uint8Array | null = null;

  const pump = async () => {

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // --- 处理字节对齐逻辑 ---
      let rawData = value;
      if (leftover) {
        const combined = new Uint8Array(leftover.length + value.length);
        combined.set(leftover);
        combined.set(value, leftover.length);
        rawData = combined;
      }

      // 确保是 2 的倍数
      const playableByteLength = Math.floor(rawData.length / 2) * 2;
      const remains = rawData.length % 2;

      if (remains > 0) {
        leftover = rawData.slice(playableByteLength);
      } else {
        leftover = null;
      }

      if (playableByteLength === 0) continue;

      // 使用 DataView 或强制对齐转换，避免 buffer 偏移量问题
      // 注意：直接 new Int16Array(rawData.buffer) 在 slice 后可能会有对齐问题
      // 最稳健的方法是创建一个新的 view
      const int16Array = new Int16Array(rawData.buffer, 0, playableByteLength / 2);

      // --- 将 int16 转为 Float32 ---
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      // --- 播放逻辑 ---
      const buffer = audioCtx.createBuffer(channels, float32Array.length, sampleRate);
      buffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      // 如果当前时间已经过了预定的播放时间，则从当前开始
      const startTime = Math.max(nextStartTime, audioCtx.currentTime);
      source.start(startTime);

      // 更新下一次播放的起始时间 (buffer.duration 是当前块的长度)
      nextStartTime = startTime + buffer.duration;
    }
  };

  await pump();

  // 等待最后一段音频播放完再关闭 Context
  const waitTime = (nextStartTime - audioCtx.currentTime) * 1000;
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime + 100));
  }
  await audioCtx.close();

}

export async function recognizeSpeech(body: FormData) {
  const res = await apiRequest(`speech/asr`, {
    method: 'POST',
    body,
  });
  const data: AsrRes = await res.json();
  return data;
}
