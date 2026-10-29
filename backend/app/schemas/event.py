from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class AgentEventResponse(BaseModel):
    id: str
    event_type: str
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
