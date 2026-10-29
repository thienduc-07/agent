from typing import Protocol, List, Dict, Any, Optional
from pydantic import BaseModel, Field

class LLMError(Exception):
    """Base exception for LLM provider errors."""
    pass

class LLMConfigError(LLMError):
    """Raised when an LLM provider is misconfigured or missing credentials."""
    pass

class LLMTimeoutError(LLMError):
    """Raised when an LLM provider request times out."""
    pass

class LLMAuthError(LLMError):
    """Raised when an LLM provider rejects authentication."""
    pass

class LLMResponseError(LLMError):
    """Raised when an LLM provider returns an invalid response."""
    pass

class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    call_id: Optional[str] = None

class LLMUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class LLMResponse(BaseModel):
    content: Optional[str] = None
    tool_calls: List[ToolCallRequest] = Field(default_factory=list)
    thought: Optional[str] = None
    finish_reason: Optional[str] = None
    usage: LLMUsage = Field(default_factory=LLMUsage)

class LLMProvider(Protocol):
    async def generate(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """Generates a model completion with optional tool calls."""
        ...
