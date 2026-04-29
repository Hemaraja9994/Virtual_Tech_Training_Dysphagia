from pydantic import BaseModel, Field


class SemgSample(BaseModel):
    timestamp_ms: int
    amplitude: float = Field(ge=0.0, le=1.0)
    source: str = "mock_semg"
    quality: float = Field(default=1.0, ge=0.0, le=1.0)

