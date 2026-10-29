from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class ProviderStepResponse(BaseModel):
    thought: str
    tool_call: Optional[ToolCallRequest] = None
    final_response: Optional[str] = None
    is_done: bool = False

class BaseModelProvider(ABC):
    @abstractmethod
    async def generate_step(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]]
    ) -> ProviderStepResponse:
        """Generates the next reasoning step or tool call based on current message history."""
        pass
