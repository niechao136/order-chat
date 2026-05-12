// public/asr-processor.js
class AsrProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._keepAlive = true; // 显式标记
    this.chunkSize = 1280; // 统一使用 320
    this.buffer = new Int16Array(this.chunkSize);
    this.offset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

      // 缓冲区满了才发送
      if (this.offset >= this.chunkSize) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(this.chunkSize); // 重新分配新内存
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('asr-processor', AsrProcessor);
