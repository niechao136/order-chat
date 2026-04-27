import asyncio
import numpy as np
import queue
import threading
from typing import AsyncGenerator


# 设定一个最小发送阈值，比如 2048 采样点 (约 128ms @ 16kHz)
MIN_CHUNK_SIZE = 2048


async def pcm_callback_generator(tts, text: str, sid: int):
    # 创建一个线程安全的队列
    q = queue.Queue()
    buffer = np.array([], dtype=np.float32)

    def audio_callback(samples: np.ndarray, _: float):
        nonlocal buffer
        if samples.size > 0:
            # 将新样本拼接到缓冲区
            buffer = np.concatenate((buffer, samples))

            # 当缓冲区足够大时，才放入队列
            while buffer.size >= MIN_CHUNK_SIZE:
                to_send = buffer[:MIN_CHUNK_SIZE]
                buffer = buffer[MIN_CHUNK_SIZE:]
                data = (to_send * 32767).astype(np.int16).tobytes()
                q.put(data)

        return 1

    def run_inference():
        try:
            # 调用 sherpa-onnx 的 generate，传入回调
            tts.generate(
                text=text,
                sid=sid,
                callback=audio_callback
            )
            # 最后处理剩余的数据
            if buffer.size > 0:
                q.put((buffer * 32767).astype(np.int16).tobytes())
        except Exception as e:
            q.put(e)
        finally:
            # 无论成功失败，最后放入 None 作为结束标志
            q.put(None)

    # 在后台线程启动合成
    threading.Thread(target=run_inference, daemon=True).start()

    # 在异步生成器中不断从队列取出数据并 yield
    while True:
        # 使用 run_in_executor 避免在等待队列时阻塞事件循环
        chunk = await asyncio.to_thread(q.get)

        if chunk is None:
            break
        if isinstance(chunk, Exception):
            raise chunk
        yield chunk


def tts_audio_generator(tts, text, sid):
  def on_chunk(samples_chunk):
    # 累积收到的音频块
    nonlocal all_chunks
    all_chunks.append(samples_chunk)

  all_chunks = []
  # 假设 Python SDK 支持这样的回调
  tts.generate(text, sid=sid, callback=on_chunk)

  for chunk in all_chunks:
    yield chunk # 逐个产出音频块


class CallbackAudioGenerator:
    def __init__(self, tts_model):
        self.tts_model = tts_model
        self.audio_queue = asyncio.Queue()
        self.is_done = False

    def _on_audio_chunk(self, samples: np.ndarray):
        """这是 C API 的回调函数，在生成音频块时被调用"""
        int_samples = (samples * 32767).astype(np.int16)
        self.audio_queue.put_nowait(int_samples.tobytes())

    def _on_complete(self):
        """生成完成的回调"""
        self.is_done = True
        self.audio_queue.put_nowait(None)  # 发送结束信号

    async def stream(self, text: str, sid: int = 0) -> AsyncGenerator[bytes, None]:
        """异步生成器，用于流式返回音频块"""
        # 在单独的线程中启动 TTS 生成，以避免阻塞事件循环
        import threading
        def _run_tts():
            try:
                # 假设 C API 支持 generateWithCallback 方法
                self.tts_model.generate(
                    text=text,
                    sid=sid,
                    callback=self._on_audio_chunk,
                    on_complete=self._on_complete
                )
            except Exception as e:
                # 处理生成错误
                self.audio_queue.put_nowait(e)

        thread = threading.Thread(target=_run_tts)
        thread.start()

        while True:
            chunk = await self.audio_queue.get()
            if chunk is None:  # 收到结束信号
                break
            if isinstance(chunk, Exception):
                raise chunk
            yield chunk