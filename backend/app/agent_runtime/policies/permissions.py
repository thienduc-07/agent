from pydantic import BaseModel, Field
from typing import List, Set, Optional
from backend.app.agent_runtime.tools.base import ToolPermissionLevel

class AgentPolicy(BaseModel):
    agent_id: str
    max_permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE
    allowed_tools: List[str] = Field(default_factory=lambda: [
        "workspace_list",
        "file_read",
        "file_search",
        "workspace_write",
        "verification_tool",
    ])
    allow_sandbox_write: bool = True
    require_approval_for_overwrite: bool = False
    allow_external_network: bool = False
    max_iterations: int = 10
    max_tool_calls: int = 15
