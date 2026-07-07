import json
from collections.abc import AsyncGenerator

import httpx

from app.models.schemas import ChatCompletionRequest
from app.providers.base import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str, default_model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            payload = response.json()
        return [item["name"] for item in payload.get("models", []) if "name" in item]

    async def chat_completion(self, request: ChatCompletionRequest) -> str | None:
        model = request.model or self.default_model
        payload = {
            "model": model,
            "stream": False,
            "messages": self._build_messages(request),
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()

        return data.get("message", {}).get("content")

    async def stream_chat_completion(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        model = request.model or self.default_model
        payload = {
            "model": model,
            "stream": True,
            "messages": self._build_messages(request),
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if chunk.get("done"):
                        break

    @staticmethod
    def _build_messages(request: ChatCompletionRequest) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.user_message})
        return messages
