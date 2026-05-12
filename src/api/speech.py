import io
import numpy as np
import sherpa_onnx
import threading
import time
import wave
from fastapi import APIRouter, Depends, HTTPException, Body, Response, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from typing import Annotated, cast

from src.schemas.speech import ASREntity, TTSRequest
from src.speech.asr import init_sense, init_online
from src.speech.tts import init_tts
from src.utils.auth import get_chat_entity, get_chat_websocket
from src.utils.speech import load_audio, pcm_callback_generator


_tts_lock = threading.Lock()
speech_router = APIRouter(
    prefix="/speech",
    tags=["Speech 语音模块"]
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
        tts: sherpa_onnx.OfflineTts = Depends(init_tts),
        _ = Depends(get_chat_entity),
):
    """
    将文本转换为语音，直接返回 WAV 音频文件
    """

    try:
        # 加锁，防止并发调用导致问题
        with _tts_lock:
            audio = tts.generate(text=body.text, sid=body.sid)

        # 安全转换 float32 -> int16
        samples = cast(np.ndarray, np.clip(audio.samples, -1.0, 1.0))
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
        tts: sherpa_onnx.OfflineTts = Depends(init_tts),
        _ = Depends(get_chat_entity),
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


@speech_router.post(
    path="/asr",
    summary="语音转文字 (ASR)",
    description="上传音频文件（支持 webm/wav/mp3 等），使用 SenseVoiceSmall 模型进行高精度识别，支持中英日韩多语种及情感识别。",
    response_model=ASREntity
)
async def speech_to_text(
        file: UploadFile = File(..., description="录音音频文件"),
        _ = Depends(get_chat_entity),
):
    # 1. 读取文件
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="音频文件为空")

    # 2. 初始化识别器
    recognizer = init_sense()

    try:
        # 3. 将上传的文件转换为模型需要的采样率 (SenseVoice 通常需要 16kHz)
        # 注意：这里建议使用 ffmpeg 或 librosa 进行预处理，
        # 如果前端直接发送的是 16kHz 的 wav 字节流，可以直接用下面的逻辑：
        stream = recognizer.create_stream()

        # 这里的处理逻辑取决于你是否在后端进行重采样
        # 简化版示例（假设已处理为单声道 16k 采样率的 samples）:
        samples = load_audio(content)

        stream.accept_waveform(16000, samples)

        # 4. 执行识别
        start_time = time.time()
        # 注意：sherpa-onnx 的 OfflineRecognizer 直接读取字节流可能需要 decode
        # 下面展示标准的识别流程：
        recognizer.decode_stream(stream)  # 某些版本支持直接 decode buffer

        # 5. 格式化结果
        # SenseVoice 的结果通常带有 <|zh|><|HAPPY|> 等标签
        raw_text = stream.result.text
        # 过滤掉标签获取纯文本（正则或简单替换）
        clean_text = raw_text.split(">")[-1].strip()

        return ASREntity(
            text=clean_text,
            raw_text=raw_text,
            duration=round(time.time() - start_time, 2)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")


@speech_router.websocket("/asr-stream")
async def speech_to_text_stream(
        websocket: WebSocket,
        chat_entity: str = Depends(get_chat_websocket),
):
    await websocket.accept()

    recognizer = init_online()
    stream = recognizer.create_stream()

    last_text = ""

    try:
        while True:
            # 接收二进制数据
            message = await websocket.receive()

            # 安全检查：处理断开连接的情况
            if message.get("type") == "websocket.disconnect":
                break

            data = message.get("bytes")
            if not data:
                continue

            # 2. 转换为 float32 归一化
            samples = np.frombuffer(data, dtype=np.int16).copy().astype(np.float32) / 32768.0

            # 3. 喂入识别器
            stream.accept_waveform(16000, samples)

            # 4. 解码循环
            while recognizer.is_ready(stream):
                recognizer.decode_stream(stream)

            # 5. 获取结果
            result = stream.result
            current_text = result.text.strip()

            # 6. 推送逻辑
            if current_text:
                is_endpoint = recognizer.is_endpoint(stream)

                # 只有当文字确实变化了，或者是终点时才推送
                if current_text != last_text or is_endpoint:
                    await websocket.send_json({
                        "text": current_text,
                        "is_final": is_endpoint,
                        "entity": chat_entity
                    })
                    last_text = current_text

                # 7. 如果检测到一句话结束
                if is_endpoint:
                    # 告知模型这一段结束了，有助于提升最后一两个词的准确度
                    recognizer.decode_stream(stream)
                    # 重置流，准备接收下一句话
                    recognizer.reset(stream)
                    last_text = ""

    except WebSocketDisconnect:
        pass
    except Exception:
        import traceback
        traceback.print_exc()
    finally:
        # 显式清理资源
        del stream
