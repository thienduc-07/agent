import logging
from typing import Optional
from backend.app.core.config import settings
from backend.app.agent_runtime.llm.base import LLMProvider, LLMConfigError
from backend.app.agent_runtime.llm.openai_provider import OpenAIProvider
from backend.app.agent_runtime.llm.ollama_provider import OllamaProvider
from backend.app.agent_runtime.llm.deterministic_provider import DeterministicProvider

logger = logging.getLogger("grandline.llm.factory")

def get_llm_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout_seconds: Optional[int] = None,
) -> LLMProvider:
    name = (provider_name or settings.LLM_PROVIDER).lower().strip()
    timeout = timeout_seconds or settings.LLM_TIMEOUT_SECONDS

    if name in ("deterministic", "local", "mock", "test"):
        return DeterministicProvider(model=model or "deterministic-v1")

    if name in ("openai", "groq", "openrouter"):
        key = api_key or settings.LLM_API_KEY
        if not key:
            raise LLMConfigError(
                f"Provider '{name}' requires an API key, but LLM_API_KEY is not configured. "
                f"Please set LLM_API_KEY in .env or switch LLM_PROVIDER to 'deterministic'."
            )
        return OpenAIProvider(
            api_key=key,
            base_url=base_url or settings.LLM_BASE_URL,
            model=model or settings.LLM_MODEL,
            timeout_seconds=timeout,
        )

    if name in ("ollama", "local_ollama"):
        url = base_url or settings.LLM_BASE_URL or "http://localhost:11434"
        return OllamaProvider(
            base_url=url,
            model=model or settings.LLM_MODEL or "llama3",
            timeout_seconds=timeout,
        )

    raise LLMConfigError(
        f"Unsupported LLM provider '{name}'. Supported providers: 'deterministic', 'openai', 'ollama'."
    )
