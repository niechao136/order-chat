from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, examples=["你好世界"])
    sid: int = Field(default=0, ge=0, description="说话人ID")


class ASREntity(BaseModel):
    text: str = Field(..., description="识别出的文本内容（已去除情感标签）")
    raw_text: str = Field(..., description="包含情感/语种标签的原始文本")
    duration: float = Field(..., description="音频时长（秒）")
