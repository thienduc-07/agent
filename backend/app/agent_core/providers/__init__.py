from backend.app.agent_core.providers.base import BaseModelProvider, ProviderStepResponse, ToolCallRequest
from backend.app.agent_core.providers.deterministic_provider import DeterministicProvider
from backend.app.agent_core.providers.gemini_provider import GeminiProvider
from backend.app.agent_core.providers.openai_provider import OpenAIProvider
from backend.app.config import settings

def get_provider(name: str = None) -> BaseModelProvider:
    provider_name = (name or settings.DEFAULT_PROVIDER).lower()
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "openai":
        return OpenAIProvider()
    else:
        return DeterministicProvider()
