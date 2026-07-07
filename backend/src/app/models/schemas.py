from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str | None = None
    system_prompt: str = ""
    user_message: str = Field(min_length=1)
    stream: bool = False


class ChatCompletionResponse(BaseModel):
    message: str


class ChatCompletionChunk(BaseModel):
    content: str


class ModelListResponse(BaseModel):
    models: list[str]
