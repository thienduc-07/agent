from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ToolDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    display_name: str
    description: str
    version: str = "1.0.0"
    category: str
    permission_level: int
    side_effect_level: str
    requires_approval: bool
    is_enabled: bool
    is_healthy: bool
    rate_limit: int
    execution_timeout: int
    max_output_size: int
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    config: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ToolToggleRequest(BaseModel):
    enable: Optional[bool] = None

class ToolExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tool_name: str
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    approval_id: Optional[str] = None
    status: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    output_summary: Optional[str] = None
    error: Optional[str] = None
    duration_ms: int = 0
    artifact_ids: List[str] = Field(default_factory=list)
    created_at: datetime

class ToolTestExecuteRequest(BaseModel):
    arguments: Dict[str, Any] = Field(default_factory=dict)
    agent_id: Optional[str] = "agent-captain-roger"
