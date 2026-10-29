import json
import logging
from typing import List, Dict, Any, Optional
import httpx

from backend.app.agent_runtime.llm.base import (
    LLMProvider,
    LLMResponse,
    ToolCallRequest,
    LLMUsage,
    LLMTimeoutError,
    LLMResponseError,
)

logger = logging.getLogger("grandline.llm.ollama")

class OllamaProvider:
    def __init__(
        self,
        base_url: Optional[str] = None,
        model: str = "llama3",
        timeout_seconds: int = 60,
    ):
        self.base_url = (base_url or "http://localhost:11434").rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def generate(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )

                if response.status_code != 200:
                    raise LLMResponseError(
                        f"Ollama returned HTTP {response.status_code}: {response.text}"
                    )

                data = response.json()
                msg = data.get("message", {})
                content = msg.get("content", "")

                prompt_eval_count = data.get("prompt_eval_count", 0)
                eval_count = data.get("eval_count", 0)
                usage = LLMUsage(
                    prompt_tokens=prompt_eval_count,
                    completion_tokens=eval_count,
                    total_tokens=prompt_eval_count + eval_count,
                )

                return LLMResponse(
                    content=content,
                    tool_calls=[],
                    thought=f"Ollama response ({self.model})",
                    finish_reason="stop",
                    usage=usage,
                )

        except httpx.TimeoutException as e:
            raise LLMTimeoutError(f"Ollama request timed out after {self.timeout_seconds}s") from e
        except LLMResponseError:
            raise
        except Exception as e:
            raise LLMResponseError(f"Failed to communicate with Ollama: {str(e)}") from e
