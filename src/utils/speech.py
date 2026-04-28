import asyncio
import numpy as np
import queue
import threading


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
