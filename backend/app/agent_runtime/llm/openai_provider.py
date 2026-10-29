import json
import logging
from typing import List, Dict, Any, Optional
import httpx

from backend.app.agent_runtime.llm.base import (
    LLMProvider,
    LLMResponse,
    ToolCallRequest,
    LLMUsage,
    LLMConfigError,
    LLMTimeoutError,
    LLMAuthError,
    LLMResponseError,
)

logger = logging.getLogger("grandline.llm.openai")

class OpenAIProvider:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "gpt-4o-mini",
        timeout_seconds: int = 60,
    ):
        if not api_key:
            raise LLMConfigError("OpenAI provider requires an API key (LLM_API_KEY). None provided.")

        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def generate(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 401 or response.status_code == 403:
                    raise LLMAuthError("Invalid or unauthorized API key provided to LLM provider.")

                if response.status_code == 429:
                    raise LLMResponseError("LLM Provider rate limit exceeded. Please try again later.")

                if response.status_code != 200:
                    raise LLMResponseError(
                        f"LLM Provider returned error HTTP {response.status_code}: {response.text}"
                    )

                data = response.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                finish_reason = choice.get("finish_reason")

                # Parse usage
                usage_raw = data.get("usage", {})
                usage = LLMUsage(
                    prompt_tokens=usage_raw.get("prompt_tokens", 0),
                    completion_tokens=usage_raw.get("completion_tokens", 0),
                    total_tokens=usage_raw.get("total_tokens", 0),
                )

                # Parse tool calls
                tool_calls: List[ToolCallRequest] = []
                for tc in message.get("tool_calls", []):
                    fn = tc.get("function", {})
                    call_id = tc.get("id")
                    args_str = fn.get("arguments", "{}")
                    try:
                        args = json.loads(args_str) if isinstance(args_str, str) else args_str
                    except Exception:
                        args = {}
                    tool_calls.append(
                        ToolCallRequest(
                            tool_name=fn.get("name", ""),
                            arguments=args,
                            call_id=call_id,
                        )
                    )

                content = message.get("content")
                return LLMResponse(
                    content=content,
                    tool_calls=tool_calls,
                    thought=f"OpenAI reasoning completed ({self.model})",
                    finish_reason=finish_reason,
                    usage=usage,
                )

        except httpx.TimeoutException as e:
            logger.error(f"LLM request timed out after {self.timeout_seconds}s")
            raise LLMTimeoutError(f"LLM request timed out after {self.timeout_seconds} seconds") from e
        except (LLMAuthError, LLMResponseError, LLMConfigError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI provider: {str(e)}")
            raise LLMResponseError(f"Failed to communicate with LLM provider: {str(e)}") from e
