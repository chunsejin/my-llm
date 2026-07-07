import json
import logging

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
logger = logging.getLogger(__name__)


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

        async def safe_stream():
            try:
                async for chunk in provider.stream_chat_completion(request):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
            except AppError as exc:
                yield f"data: {json.dumps({'error': exc.message})}\n\n"
            except Exception:
                logger.exception("Unhandled streaming exception")
                yield f"data: {json.dumps({'error': 'Internal server error'})}\n\n"

        return StreamingResponse(safe_stream(), media_type="text/event-stream")

    text = await provider.chat_completion(request)
    if text is None:
        raise AppError(message="No response from provider", status_code=502)

    return ChatCompletionResponse(message=text)
