from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.artifact import ArtifactResponse
from backend.app.services.artifact_service import artifact_service

router = APIRouter(prefix="/artifacts", tags=["Artifacts"])

@router.get("", response_model=List[ArtifactResponse])
def list_artifacts(
    task_id: Optional[str] = Query(None, description="Filter artifacts by task ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return artifact_service.list_artifacts(db=db, task_id=task_id, limit=limit, offset=offset)
