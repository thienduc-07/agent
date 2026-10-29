import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.database import get_db, SessionLocal
from backend.app.models import TaskModel, AgentModel
from backend.app.schemas import TaskResponse, TaskDetailResponse, TaskCreate
from backend.app.agent_core.orchestrator import orchestrator
from backend.app.websocket_manager import ws_manager

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

def run_task_in_background(task_id: str, provider: str = None):
    # Create an isolated database session for background task
    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(orchestrator.run_task(task_id, db, provider))
    finally:
        db.close()

@router.get("", response_model=List[TaskResponse])
def get_all_tasks(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(TaskModel).order_by(TaskModel.created_at.desc()).limit(limit).all()

@router.get("/{task_id}", response_model=TaskDetailResponse)
def get_task_detail(task_id: str, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("", response_model=TaskResponse)
async def create_task(
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    agent = db.query(AgentModel).filter(AgentModel.id == payload.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{payload.agent_id}' does not exist")

    task = TaskModel(
        agent_id=payload.agent_id,
        prompt=payload.prompt,
        status="PENDING",
        risk_level="SAFE"
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Broadcast task creation to WebSocket clients
    await ws_manager.broadcast("task_created", {
        "task_id": task.id,
        "agent_id": task.agent_id,
        "prompt": task.prompt,
        "status": task.status
    })

    # Trigger orchestrator execution in background
    asyncio.create_task(orchestrator.run_task(task.id, db, payload.provider))

    return task
