from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.app.core.config import settings
from backend.app.agent_runtime.cancellation import CancellationToken

class TaskContext(BaseModel):
    task_id: str
    agent_id: str
    iteration: int = 0
    max_iterations: int = Field(default_factory=lambda: settings.MAX_EXECUTION_ITERATIONS)
    tool_call_count: int = 0
    max_tool_calls: int = Field(default_factory=lambda: settings.MAX_TOOL_CALLS)
    files_read: List[str] = Field(default_factory=list)
    artifacts_created: List[Dict[str, Any]] = Field(default_factory=list)
    tool_results: List[Dict[str, Any]] = Field(default_factory=list)
    verification_passed: bool = False

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def increment_iteration(self) -> None:
        self.iteration += 1
        if self.iteration > self.max_iterations:
            raise RuntimeError(f"Task exceeded maximum iterations ({self.max_iterations}). Halting.")

    def record_tool_call(self) -> None:
        self.tool_call_count += 1
        if self.tool_call_count > self.max_tool_calls:
            raise RuntimeError(f"Task exceeded maximum tool calls ({self.max_tool_calls}). Halting.")
