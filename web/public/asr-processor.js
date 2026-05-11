// public/asr-processor.js
class AsrProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32Data = input[0]; // 获取左声道数据

      // 将 Float32 转换为 PCM 16bit
      const pcmData = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // 发送回主线程
      this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
    }
    return true;
  }
}

registerProcessor('asr-processor', AsrProcessor);
