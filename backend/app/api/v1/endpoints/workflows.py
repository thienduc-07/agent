from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.workflow import WorkflowCreate, WorkflowResponse, SubtaskResponse
from backend.app.services.workflow_service import workflow_service

router = APIRouter(prefix="/workflows", tags=["Workflows"])

@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(workflow_in: WorkflowCreate, db: Session = Depends(get_db)):
    """Creates and queues a multi-agent workflow for execution."""
    return workflow_service.create_workflow(db=db, workflow_in=workflow_in)

@router.get("", response_model=List[WorkflowResponse])
def list_workflows(
    status: Optional[str] = Query(None, description="Filter by workflow status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lists multi-agent workflows."""
    return workflow_service.list_workflows(db=db, status=status, limit=limit, offset=offset)

@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """Retrieves full workflow state, subtasks DAG, and aggregated execution results."""
    return workflow_service.get_workflow(db=db, workflow_id=workflow_id)

@router.get("/{workflow_id}/subtasks", response_model=List[SubtaskResponse])
def get_workflow_subtasks(workflow_id: str, db: Session = Depends(get_db)):
    """Retrieves all subtasks for a specific workflow."""
    wf = workflow_service.get_workflow(db=db, workflow_id=workflow_id)
    return wf.get("subtasks", [])

@router.post("/{workflow_id}/cancel", response_model=WorkflowResponse)
def cancel_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """Requests cancellation of a workflow and its active subtasks."""
    return workflow_service.cancel_workflow(db=db, workflow_id=workflow_id)
