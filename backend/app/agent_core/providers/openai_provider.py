import json
from typing import List, Dict, Any
import httpx
from backend.app.agent_core.providers.base import BaseModelProvider, ProviderStepResponse, ToolCallRequest
from backend.app.config import settings

class OpenAIProvider(BaseModelProvider):
    def __init__(self, api_key: str = "", base_url: str = ""):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")

    async def generate_step(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]]
    ) -> ProviderStepResponse:
        if not self.api_key:
            return ProviderStepResponse(
                thought="No OPENAI_API_KEY configured.",
                final_response="OpenAI API Key is missing. Please configure OPENAI_API_KEY or use the Default Local Engine.",
                is_done=True
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Convert tool format
        body = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.2
        }
        if tools:
            body["tools"] = tools

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=body)
                data = res.json()
                choice = data.get("choices", [{}])[0].get("message", {})
                
                tool_calls = choice.get("tool_calls", [])
                if tool_calls:
                    tc = tool_calls[0].get("function", {})
                    args = json.loads(tc.get("arguments", "{}"))
                    return ProviderStepResponse(
                        thought=f"OpenAI selected tool: {tc.get('name')}",
                        tool_call=ToolCallRequest(
                            tool_name=tc.get("name"),
                            arguments=args
                        ),
                        is_done=False
                    )
                
                content = choice.get("content", "")
                return ProviderStepResponse(
                    thought="OpenAI generated final output.",
                    final_response=content,
                    is_done=True
                )
        except Exception as e:
            return ProviderStepResponse(
                thought=f"OpenAI API call failed: {str(e)}",
                final_response=f"OpenAI API error: {str(e)}",
                is_done=True
            )
