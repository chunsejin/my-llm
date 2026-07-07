from collections.abc import AsyncGenerator, Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_provider
from app.main import app
from app.models.schemas import ChatCompletionRequest
from app.providers.base import LLMProvider


class StubProvider(LLMProvider):
    def __init__(
        self,
        *,
        models: list[str] | None = None,
        completion: str | None = "stub response",
        stream_chunks: list[str] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.models = models or ["llama3.1:8b"]
        self.completion = completion
        self.stream_chunks = stream_chunks or []
        self.error = error

    async def list_models(self) -> list[str]:
        if self.error is not None:
            raise self.error
        return self.models

    async def chat_completion(self, request: ChatCompletionRequest) -> str | None:
        if self.error is not None:
            raise self.error
        return self.completion

    async def stream_chat_completion(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        if self.error is not None:
            raise self.error
        for chunk in self.stream_chunks:
            yield chunk


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def client_no_raise() -> Iterator[TestClient]:
    app.dependency_overrides.clear()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def override_provider(provider: LLMProvider) -> None:
    app.dependency_overrides[get_provider] = lambda: provider


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_models_returns_provider_models(client: TestClient) -> None:
    override_provider(StubProvider(models=["llama3.1:8b", "qwen2.5:7b"]))

    response = client.get("/api/v1/models")

    assert response.status_code == 200
    assert response.json() == {"models": ["llama3.1:8b", "qwen2.5:7b"]}


@pytest.mark.parametrize("payload", [{}, {"user_message": ""}])
def test_chat_completions_validation(client: TestClient, payload: dict[str, object]) -> None:
    response = client.post("/api/v1/chat/completions", json=payload)

    assert response.status_code == 422


def test_chat_completions_returns_provider_message(client: TestClient) -> None:
    override_provider(StubProvider(completion="Hello from provider"))

    response = client.post("/api/v1/chat/completions", json={"user_message": "Hello"})

    assert response.status_code == 200
    assert response.json() == {"message": "Hello from provider"}


def test_chat_completions_502_on_none_response(client: TestClient) -> None:
    override_provider(StubProvider(completion=None))

    response = client.post("/api/v1/chat/completions", json={"user_message": "Hello"})

    assert response.status_code == 502
    assert response.json() == {"detail": "No response from provider"}


def test_models_provider_failure_returns_500(client_no_raise: TestClient) -> None:
    override_provider(StubProvider(error=RuntimeError("provider failed")))

    models_response = client_no_raise.get("/api/v1/models")

    assert models_response.status_code == 500
    assert models_response.json() == {"detail": "Internal server error"}


def test_chat_provider_failure_returns_500(client_no_raise: TestClient) -> None:
    override_provider(StubProvider(error=RuntimeError("provider failed")))

    chat_response = client_no_raise.post("/api/v1/chat/completions", json={"user_message": "Hello"})

    assert chat_response.status_code == 500
    assert chat_response.json() == {"detail": "Internal server error"}


def test_streaming_chat_completions_returns_sse_chunks(client: TestClient) -> None:
    override_provider(
        StubProvider(
            stream_chunks=[
                "Hello",
                " world",
            ]
        )
    )

    with client.stream(
        "POST",
        "/api/v1/chat/completions",
        json={"user_message": "Hello", "stream": True},
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert body == 'data: {"content": "Hello"}\n\ndata: {"content": " world"}\n\n'


def test_streaming_provider_failure_returns_error_event(client_no_raise: TestClient) -> None:
    override_provider(StubProvider(error=RuntimeError("provider failed")))

    with client_no_raise.stream(
        "POST",
        "/api/v1/chat/completions",
        json={"user_message": "Hello", "stream": True},
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert body == 'data: {"error": "Internal server error"}\n\n'
