import pytest
from backend.app.agent_runtime.llm.base import (
    LLMConfigError,
    LLMTimeoutError,
    LLMAuthError,
    LLMResponseError,
    ToolCallRequest,
)
from backend.app.agent_runtime.llm.factory import get_llm_provider
from backend.app.agent_runtime.llm.openai_provider import OpenAIProvider
from backend.app.agent_runtime.llm.deterministic_provider import DeterministicProvider

def test_openai_missing_api_key_raises_config_error():
    with pytest.raises(LLMConfigError) as exc_info:
        OpenAIProvider(api_key="")
    assert "LLM_API_KEY" in str(exc_info.value) or "API key" in str(exc_info.value)

def test_unsupported_provider_raises_config_error():
    with pytest.raises(LLMConfigError) as exc_info:
        get_llm_provider("unsupported_super_ai")
    assert "Unsupported LLM provider" in str(exc_info.value)

@pytest.mark.asyncio
async def test_deterministic_provider_offline_generation():
    provider = DeterministicProvider()
    messages = [
        {"role": "user", "content": "Analyze workspace structure and generate report"}
    ]
    tools = [
        {"function": {"name": "workspace_list", "description": "List files", "parameters": {}}},
        {"function": {"name": "workspace_write", "description": "Write file", "parameters": {}}},
        {"function": {"name": "verification_tool", "description": "Verify file", "parameters": {}}},
    ]
    response = await provider.generate(messages, tools=tools)
    assert response is not None
    assert response.tool_calls or response.content
    assert response.usage.total_tokens > 0

@pytest.mark.asyncio
async def test_deterministic_provider_planning_generation():
    provider = DeterministicProvider()
    messages = [
        {"role": "user", "content": "Generate an execution plan in json format for project report"}
    ]
    response = await provider.generate(messages)
    assert response.content is not None
    import json
    plan_dict = json.loads(response.content)
    assert "objective" in plan_dict
    assert "steps" in plan_dict
    assert len(plan_dict["steps"]) >= 2
