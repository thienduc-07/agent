import json
from typing import List, Dict, Any
import httpx
from backend.app.agent_core.providers.base import BaseModelProvider, ProviderStepResponse, ToolCallRequest
from backend.app.config import settings

class GeminiProvider(BaseModelProvider):
    def __init__(self, api_key: str = ""):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def generate_step(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]]
    ) -> ProviderStepResponse:
        if not self.api_key:
            return ProviderStepResponse(
                thought="No GEMINI_API_KEY configured. Fallback required.",
                final_response="Google Gemini API Key is missing. Please configure GEMINI_API_KEY or use the Default Local Engine.",
                is_done=True
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        # Transform contents
        contents = []
        for m in messages:
            role = "user" if m.get("role") in ["user", "tool"] else "model"
            text_val = str(m.get("content", ""))
            contents.append({"role": role, "parts": [{"text": text_val}]})

        # Convert tool schemas
        gemini_tools = []
        if tools:
            declarations = []
            for t in tools:
                fn = t.get("function", {})
                declarations.append({
                    "name": fn.get("name"),
                    "description": fn.get("description", ""),
                    "parameters": fn.get("parameters", {})
                })
            gemini_tools.append({"function_declarations": declarations})

        body = {
            "contents": contents,
            "generationConfig": {"temperature": 0.2}
        }
        if gemini_tools:
            body["tools"] = gemini_tools

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=body)
                data = res.json()
                
                candidates = data.get("candidates", [])
                if not candidates:
                    return ProviderStepResponse(
                        thought="No response from Gemini API.",
                        final_response=str(data.get("error", "Unknown Gemini Error")),
                        is_done=True
                    )
                
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    if "functionCall" in part:
                        fc = part["functionCall"]
                        return ProviderStepResponse(
                            thought=f"Gemini decided to call tool: {fc.get('name')}",
                            tool_call=ToolCallRequest(
                                tool_name=fc.get("name"),
                                arguments=fc.get("args", {})
                            ),
                            is_done=False
                        )
                    if "text" in part:
                        return ProviderStepResponse(
                            thought="Gemini generated response text.",
                            final_response=part["text"],
                            is_done=True
                        )
                return ProviderStepResponse(
                    thought="Empty parts received.",
                    final_response="Received empty response.",
                    is_done=True
                )
        except Exception as e:
            return ProviderStepResponse(
                thought=f"Gemini API request failed: {str(e)}",
                final_response=f"Gemini Error: {str(e)}",
                is_done=True
            )
