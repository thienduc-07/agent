from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.event import AgentEventResponse
from backend.app.services.event_service import event_service

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[AgentEventResponse])
def list_events(
    agent_id: Optional[str] = Query(None, description="Filter events by agent"),
    task_id: Optional[str] = Query(None, description="Filter events by task"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return event_service.get_events(
        db=db,
        agent_id=agent_id,
        task_id=task_id,
        event_type=event_type,
        limit=limit,
        offset=offset
    )
