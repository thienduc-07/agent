from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.agent import AgentModel
from backend.app.models.task import TaskModel
from backend.app.models.task_step import TaskStepModel
from backend.app.models.agent_event import AgentEventModel
from backend.app.schemas.task import TaskCreate, TaskCancelResponse
from backend.app.core.errors import NotFoundError, ConflictError, ValidationError
from backend.app.services.event_service import event_service

from backend.app.websocket_manager import ws_manager

class TaskService:
    @staticmethod
    def create_task(db: Session, task_in: TaskCreate) -> TaskModel:
        # 1. Verify assigned agent exists
        agent = db.query(AgentModel).filter(AgentModel.id == task_in.assigned_agent_id).first()
        if not agent:
            raise NotFoundError(
                message=f"Agent '{task_in.assigned_agent_id}' does not exist",
                code="AGENT_NOT_FOUND"
            )

        if not task_in.title.strip():
            raise ValidationError(message="Task title cannot be blank", code="EMPTY_TASK_TITLE")

        if not task_in.description.strip():
            raise ValidationError(message="Task description cannot be blank", code="EMPTY_TASK_DESC")

        # 2. Create task record with queued status
        task = TaskModel(
            title=task_in.title.strip(),
            description=task_in.description.strip(),
            assigned_agent_id=task_in.assigned_agent_id,
            priority=task_in.priority,
            status="queued"
        )
        db.add(task)
        db.flush() # Flush to generate task.id

        # 3. Create initial step 1
        initial_step = TaskStepModel(
            task_id=task.id,
            step_index=1,
            title="Task queued for execution",
            description="Mission registered and queued in Grand Line Command backlog",
            status="pending"
        )
        db.add(initial_step)

        # 4. Log event in same transaction
        ev = event_service.create_event(
            db=db,
            event_type="task.created",
            agent_id=task.assigned_agent_id,
            task_id=task.id,
            payload={
                "title": task.title,
                "priority": task.priority,
                "assigned_agent_id": task.assigned_agent_id
            },
            commit=False
        )

        db.commit()
        db.refresh(task)

        # 5. Broadcast authoritative event envelope to WebSocket clients
        ws_manager.broadcast_sync(ev.to_envelope())

        return task

    @staticmethod
    def list_tasks(
        db: Session,
        status: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[TaskModel]:
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        query = db.query(TaskModel)
        if status:
            query = query.filter(TaskModel.status == status)
        if agent_id:
            query = query.filter(TaskModel.assigned_agent_id == agent_id)

        return query.order_by(desc(TaskModel.created_at)).offset(offset).limit(limit).all()

    @staticmethod
    def get_task_by_id(db: Session, task_id: str) -> TaskModel:
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not task:
            raise NotFoundError(message=f"Task '{task_id}' not found", code="TASK_NOT_FOUND")
        return task

    @staticmethod
    def get_task_steps(db: Session, task_id: str) -> List[TaskStepModel]:
        # Validate task exists first
        TaskService.get_task_by_id(db, task_id)
        return (
            db.query(TaskStepModel)
            .filter(TaskStepModel.task_id == task_id)
            .order_by(TaskStepModel.step_index.asc())
            .all()
        )

    @staticmethod
    def cancel_task(db: Session, task_id: str) -> TaskCancelResponse:
        task = TaskService.get_task_by_id(db, task_id)

        if task.status == "completed":
            raise ConflictError(
                message="Cannot cancel an already completed task",
                code="TASK_ALREADY_COMPLETED"
            )

        if task.status == "cancelled":
            raise ConflictError(
                message="Task is already cancelled",
                code="TASK_ALREADY_CANCELLED"
            )

        task.status = "cancelled"
        task.updated_at = datetime.utcnow()

        # Free assigned agent if this was their active task
        agent = db.query(AgentModel).filter(AgentModel.id == task.assigned_agent_id).first()
        if agent and agent.current_task_id == task.id:
            agent.status = "idle"
            agent.current_task_id = None
            agent.updated_at = datetime.utcnow()

        # Signal runtime cooperative cancellation if actively processing
        try:
            from backend.app.agent_runtime import agent_runtime
            agent_runtime.cancel_task(task.id)
        except Exception:
            pass

        ev = event_service.create_event(
            db=db,
            event_type="task.cancelled",
            agent_id=task.assigned_agent_id,
            task_id=task.id,
            payload={"reason": "User requested task cancellation"},
            commit=False
        )

        db.commit()

        # Broadcast event envelope
        ws_manager.broadcast_sync(ev.to_envelope())

        return TaskCancelResponse(
            id=task.id,
            status=task.status,
            message="Task was successfully cancelled"
        )

    @staticmethod
    def get_task_events(db: Session, task_id: str) -> List[AgentEventModel]:
        TaskService.get_task_by_id(db, task_id)
        return (
            db.query(AgentEventModel)
            .filter(AgentEventModel.task_id == task_id)
            .order_by(AgentEventModel.created_at.asc())
            .all()
        )

task_service = TaskService()
