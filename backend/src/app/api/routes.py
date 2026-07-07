from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_provider
from app.core.exceptions import AppError
from app.models.schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    HealthResponse,
    ModelListResponse,
)
from app.providers.base import LLMProvider

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/api/v1/models", response_model=ModelListResponse)
async def list_models(provider: LLMProvider = Depends(get_provider)) -> ModelListResponse:
    models = await provider.list_models()
    return ModelListResponse(models=models)


@router.post("/api/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    provider: LLMProvider = Depends(get_provider),
):
    if request.stream:
        stream = provider.stream_chat_completion(request)
        return StreamingResponse(stream, media_type="text/event-stream")

    text = await provider.chat_completion(request)
    if text is None:
        raise AppError(message="No response from provider", status_code=502)

    return ChatCompletionResponse(message=text)
