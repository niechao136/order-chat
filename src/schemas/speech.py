from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, examples=["你好世界"])
    sid: int = Field(default=0, ge=0, description="说话人ID")
