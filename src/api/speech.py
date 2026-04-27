import io
import numpy as np
import sherpa_onnx
import threading
import wave
from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
from typing import Annotated

from src.schemas.speech import TTSRequest
from src.speech.tts import init_tts
from src.utils.auth import get_chat_entity
from src.utils.speech import pcm_callback_generator


_tts_lock = threading.Lock()
speech_router = APIRouter(
    prefix="/speech",
    tags=["Speech 语音模块"],
    dependencies=[Depends(get_chat_entity)]
)


@speech_router.post(
    path="/tts",
    summary="文本转语音",
    description="""
将文本合成为语音，直接返回 WAV 格式的音频文件。

- **text**：要合成的文本内容，长度不超过 500 字符。
- **sid**：说话人 ID，默认为 0，可根据模型支持的发言人数量进行调整。
- 返回 `audio/wav` 格式的音频流，可直接用于 `<audio>` 标签或下载。
""",
    responses={
        200: {
            "description": "成功返回 WAV 音频文件",
            "content": {
                "audio/wav": {
                    "schema": {
                        "type": "string",
                        "format": "binary"
                    }
                }
            }
        }
    }
)
async def synthesize(
        body: Annotated[TTSRequest, Body(description="请求参数")],
        tts: sherpa_onnx.OfflineTts = Depends(init_tts)
):
    """
    将文本转换为语音，直接返回 WAV 音频文件
    """

    try:
        # 加锁，防止并发调用导致问题
        with _tts_lock:
            audio = tts.generate(text=body.text, sid=body.sid)

        # 安全转换 float32 -> int16
        samples = np.clip(audio.samples, -1.0, 1.0)
        samples = (samples * 32767).astype(np.int16)

        # 写入内存 buffer
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(audio.sample_rate)
            f.writeframes(samples.tobytes())
        buffer.seek(0)

        return Response(
            content=buffer.read(),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=tts.wav"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")


@speech_router.post(
    path="/tts-stream",
    summary="流式文本转语音（原始 PCM）",
    description="""
将文本合成为语音，并以原始 PCM 格式（int16，单声道）流式返回。

**流式特点**：音频数据会边合成边发送，客户端可实时解码播放，大幅降低首音延迟。

- **text**：要合成的文本内容，长度不超过 500 字符。
- **sid**：说话人 ID，默认为 0，可根据模型支持的发言人数量进行调整。
- 返回 `audio/pcm` 裸流，使用分块传输编码（chunked transfer），需结合响应头 `X-Sample-Rate` 等参数进行前端播放。
""",
    responses={
        200: {
            "description": "成功返回 PCM 音频流（分块传输）",
            "content": {
                "audio/pcm": {
                    "schema": {
                        "type": "string",
                        "format": "binary"
                    },
                    "example": "(二进制 PCM 流，无固定示例)"
                }
            }
        }
    }
)
async def synthesize_stream(
        body: Annotated[TTSRequest, Body(description="请求参数")],
        tts: sherpa_onnx.OfflineTts = Depends(init_tts)
):
    """
    将文本转换为语音，使用边合成边输出的 Callback 机制，以 StreamingResponse
    直接返回 PCM（int16）字节流，配合前端 AudioContext 实现低延迟播放。
    """

    return StreamingResponse(
        pcm_callback_generator(tts=tts, text=body.text, sid=body.sid),
        media_type="audio/pcm",
        headers={
            "X-Sample-Rate": str(tts.sample_rate),
            "X-Channels": "1",
            "X-Bits-Per-Sample": "16",
            "Access-Control-Expose-Headers": "X-Sample-Rate, X-Channels, X-Bits-Per-Sample",
        }
    )
