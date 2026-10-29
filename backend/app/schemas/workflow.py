from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SubtaskResponse(BaseModel):
    id: str
    parent_task_id: Optional[str]
    title: str
    description: str
    status: str
    assigned_agent_id: str
    agent_type: Optional[str]
    dependencies: List[str] = []
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    max_retries: int = 2
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    result_summary: Optional[str] = None

class WorkflowCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=5)
    assigned_agent_id: Optional[str] = Field(default="agent-captain-roger", description="Primary orchestrator agent")
    priority: str = Field(default="normal", description="Priority level: low, normal, high, urgent")

class WorkflowResponse(BaseModel):
    id: str
    title: str
    description: str
    task_type: str = "workflow"
    status: str
    priority: str
    assigned_agent_id: str
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None
    subtasks: List[SubtaskResponse] = []
