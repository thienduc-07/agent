from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class MemoryCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=5)
    summary: Optional[str] = None
    memory_type: str = Field(default="task", description="working, task, agent, shared")
    scope_type: str = Field(default="shared", description="working, task, agent, shared, workspace")
    scope_id: Optional[str] = None
    owner_agent_id: Optional[str] = None
    source_type: str = Field(default="task_execution", description="task_execution, tool_result, user_directive, artifact, reviewer_verdict, manual")
    source_id: Optional[str] = None
    source_task_id: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    verification_status: str = Field(default="unverified", description="unverified, verified, rejected")
    sensitivity_level: str = Field(default="normal", description="public, normal, restricted")
    status: str = Field(default="candidate", description="candidate, active, archived, expired, rejected, deleted")
    expires_in_seconds: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class MemoryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    verification_status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MemoryResponse(BaseModel):
    id: str
    memory_type: str
    scope_type: str
    scope_id: Optional[str] = None
    owner_agent_id: Optional[str] = None
    title: str
    content: str
    summary: Optional[str] = None
    source_type: str
    source_id: Optional[str] = None
    source_task_id: Optional[str] = None
    confidence: float
    verification_status: str
    sensitivity_level: str
    status: str
    expires_at: Optional[str] = None
    last_accessed_at: Optional[str] = None
    access_count: int = 0
    metadata: Dict[str, Any] = {}
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MemorySearchResultItem(BaseModel):
    memory: MemoryResponse
    relevance_score: float

class MemorySearchResponse(BaseModel):
    total: int
    items: List[MemorySearchResultItem]

class MemoryOverviewStats(BaseModel):
    total_active: int
    total_candidate: int
    total_archived: int
    total_expired: int
    by_scope: Dict[str, int]
    by_type: Dict[str, int]
    recent_memories: List[MemoryResponse]
