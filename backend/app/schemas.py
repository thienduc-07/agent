from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Agent Schemas
class AgentBase(BaseModel):
    name: str
    role: str
    station: str
    status: str = "IDLE"
    current_task_id: Optional[str] = None
    pos_x: float = 0.0
    pos_y: float = 1.0
    pos_z: float = 0.0
    color: str = "#f59e0b"
    avatar: str = "captain"
    description: Optional[str] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    status: Optional[str] = None
    current_task_id: Optional[str] = None

class AgentResponse(AgentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Event Log Schemas
class EventLogResponse(BaseModel):
    id: str
    task_id: str
    agent_id: str
    event_type: str
    payload: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# Pending Action Schemas
class PendingActionResponse(BaseModel):
    id: str
    task_id: str
    agent_id: str
    tool_name: str
    tool_args: Dict[str, Any]
    risk_reason: str
    status: str
    created_at: datetime
    decided_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ApprovalDecisionRequest(BaseModel):
    action_id: str
    decision: str = Field(..., description="'APPROVE' or 'REJECT'")
    reason: Optional[str] = None


# Task Schemas
class TaskCreate(BaseModel):
    agent_id: str
    prompt: str = Field(..., min_length=1)
    provider: Optional[str] = None  # deterministic, gemini, openai, ollama

class TaskResponse(BaseModel):
    id: str
    agent_id: str
    prompt: str
    status: str
    risk_level: str
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskDetailResponse(TaskResponse):
    events: List[EventLogResponse] = []
    pending_actions: List[PendingActionResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Realtime WebSocket Schemas
class WSMessage(BaseModel):
    type: str # e.g. "agent_status", "task_created", "tool_call", "approval_required", "task_completed"
    data: Dict[str, Any]
