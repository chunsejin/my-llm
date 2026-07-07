from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

from app.models.schemas import ChatCompletionRequest


class LLMProvider(ABC):
    @abstractmethod
    async def list_models(self) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    async def chat_completion(self, request: ChatCompletionRequest) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def stream_chat_completion(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        raise NotImplementedError
