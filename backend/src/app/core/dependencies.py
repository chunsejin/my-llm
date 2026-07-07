from app.core.config import get_settings
from app.providers.base import LLMProvider
from app.providers.ollama import OllamaProvider


def get_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "ollama":
        return OllamaProvider(
            base_url=settings.ollama_base_url,
            default_model=settings.default_model,
        )

    raise ValueError(f"Unsupported provider: {settings.llm_provider}")
