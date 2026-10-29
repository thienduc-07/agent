from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class SubtaskResultContract(BaseModel):
    task_id: str = Field(..., description="Unique subtask database ID")
    subtask_key: str = Field(..., description="Plan subtask identifier, e.g. research_01")
    parent_task_id: Optional[str] = Field(default=None, description="Parent workflow ID")
    agent_id: str = Field(..., description="Physical agent ID that performed execution")
    agent_type: str = Field(..., description="Specialized agent type, e.g. research, writer")
    status: str = Field(..., description="Status: completed or failed")
    summary: str = Field(..., description="High-level summary of subtask outcome")
    output: str = Field(default="", description="Detailed textual or JSON output produced")
    evidence: List[str] = Field(default_factory=list, description="Citations, file paths, or line references verified")
    artifact_ids: List[str] = Field(default_factory=list, description="IDs of generated artifacts in sandbox")
    warnings: List[str] = Field(default_factory=list, description="Operational warnings or limitations observed")
    error: Optional[str] = Field(default=None, description="Error explanation if subtask failed")
    started_at: Optional[str] = Field(default=None)
    completed_at: Optional[str] = Field(default=None)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
