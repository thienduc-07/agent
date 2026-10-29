from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskStepResponse,
    TaskCancelResponse
)
from backend.app.schemas.event import AgentEventResponse
from backend.app.services.task_service import task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    return task_service.create_task(db=db, task_in=task_in)

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None, description="Filter by task status"),
    agent_id: Optional[str] = Query(None, description="Filter by assigned agent ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return task_service.list_tasks(db=db, status=status, agent_id=agent_id, limit=limit, offset=offset)

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    return task_service.get_task_by_id(db=db, task_id=task_id)

@router.get("/{task_id}/steps", response_model=List[TaskStepResponse])
def get_task_steps(task_id: str, db: Session = Depends(get_db)):
    return task_service.get_task_steps(db=db, task_id=task_id)

@router.post("/{task_id}/cancel", response_model=TaskCancelResponse)
def cancel_task(task_id: str, db: Session = Depends(get_db)):
    return task_service.cancel_task(db=db, task_id=task_id)

@router.get("/{task_id}/events", response_model=List[AgentEventResponse])
def get_task_events(task_id: str, db: Session = Depends(get_db)):
    return task_service.get_task_events(db=db, task_id=task_id)
