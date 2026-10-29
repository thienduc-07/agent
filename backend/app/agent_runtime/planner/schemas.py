from typing import List, Optional
from pydantic import BaseModel, Field

class PlanStep(BaseModel):
    step_index: int
    title: str
    description: str
    expected_output: str
    required_tool: Optional[str] = None
    status: str = "pending"

class AgentPlan(BaseModel):
    objective: str
    steps: List[PlanStep] = Field(default_factory=list)
