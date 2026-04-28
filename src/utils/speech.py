import asyncio
import numpy as np
import io
import queue
import threading
from fastapi import HTTPException
from pydub import AudioSegment


async def pcm_callback_generator(tts, text: str, sid: int):
    # 创建一个线程安全的队列
    q = queue.Queue()

    def audio_callback(samples: np.ndarray, _: float):
        if samples.size > 0:
            # 缩放并转换为 int16 字节流
            data = (samples * 32767).astype(np.int16).tobytes()
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


def load_audio(content: bytes):
    try:
        # 1. 使用 pydub 读取任意格式的音频流
        audio = AudioSegment.from_file(io.BytesIO(content))

        # 2. 强制转换为模型要求的格式：16000Hz, 单声道
        audio = audio.set_frame_rate(16000).set_channels(1)

        # 3. 将采样数据转换为 float32 数组
        # pydub 默认是 int16，所以除以 32768.0 进行归一化
        samples = np.array(audio.get_array_of_samples()).astype(np.float32) / 32768.0

        return samples

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转换失败: {str(e)}")
