from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ArtifactResponse(BaseModel):
    id: str
    task_id: str
    name: str
    artifact_type: str
    storage_path: str
    mime_type: str
    size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
