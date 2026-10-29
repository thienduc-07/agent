import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.agent_event import AgentEventModel
from backend.app.models.agent import AgentModel
from backend.app.models.task import TaskModel

# Standardized Event Types conforming to Milestone 5 Specification
TASK_CREATED = "task.created"
TASK_QUEUED = "task.queued"
TASK_STARTED = "task.started"
TASK_STATUS_CHANGED = "task.status_changed"
TASK_COMPLETED = "task.completed"
TASK_FAILED = "task.failed"
TASK_CANCEL_REQUESTED = "task.cancel_requested"
TASK_CANCELLED = "task.cancelled"

AGENT_STATUS_CHANGED = "agent.status_changed"
AGENT_IDLE = "agent.idle"
AGENT_WORKING = "agent.working"
AGENT_WAITING_FOR_APPROVAL = "agent.waiting_for_approval"
AGENT_ERROR = "agent.error"

TASK_STEP_STARTED = "task.step.started"
TASK_STEP_COMPLETED = "task.step.completed"
TASK_STEP_FAILED = "task.step.failed"

TOOL_EXECUTION_STARTED = "tool.execution_started"
TOOL_EXECUTION_COMPLETED = "tool.execution_completed"
TOOL_EXECUTION_FAILED = "tool.execution_failed"

APPROVAL_REQUIRED = "approval.required"
APPROVAL_RESOLVED = "approval.resolved"
ARTIFACT_CREATED = "artifact.created"

# Milestone 6: Multi-Agent Workflow & Subtask Lifecycle Events
WORKFLOW_CREATED = "workflow.created"
WORKFLOW_PLANNED = "workflow.planned"
WORKFLOW_STARTED = "workflow.started"
WORKFLOW_COMPLETED = "workflow.completed"
WORKFLOW_FAILED = "workflow.failed"

SUBTASK_CREATED = "subtask.created"
SUBTASK_ASSIGNED = "subtask.assigned"
SUBTASK_STARTED = "subtask.started"
SUBTASK_COMPLETED = "subtask.completed"
SUBTASK_FAILED = "subtask.failed"

AGENT_DELEGATED = "agent.delegated"
AGENT_RESULT_RECEIVED = "agent.result_received"
WORKFLOW_REVIEW_STARTED = "workflow.review_started"
WORKFLOW_REVIEW_COMPLETED = "workflow.review_completed"

# Milestone 7: Persistent Memory & Knowledge Events
MEMORY_CANDIDATE_CREATED = "memory.candidate_created"
MEMORY_CREATED = "memory.created"
MEMORY_UPDATED = "memory.updated"
MEMORY_ARCHIVED = "memory.archived"
MEMORY_EXPIRED = "memory.expired"
MEMORY_DELETED = "memory.deleted"
MEMORY_RETRIEVAL_COMPLETED = "memory.retrieval_completed"

VALID_EVENT_TYPES: Set[str] = {
    TASK_CREATED,
    TASK_QUEUED,
    TASK_STARTED,
    TASK_STATUS_CHANGED,
    TASK_COMPLETED,
    TASK_FAILED,
    TASK_CANCEL_REQUESTED,
    TASK_CANCELLED,
    AGENT_STATUS_CHANGED,
    AGENT_IDLE,
    AGENT_WORKING,
    AGENT_WAITING_FOR_APPROVAL,
    AGENT_ERROR,
    TASK_STEP_STARTED,
    TASK_STEP_COMPLETED,
    TASK_STEP_FAILED,
    TOOL_EXECUTION_STARTED,
    TOOL_EXECUTION_COMPLETED,
    TOOL_EXECUTION_FAILED,
    APPROVAL_REQUIRED,
    APPROVAL_RESOLVED,
    ARTIFACT_CREATED,
    WORKFLOW_CREATED,
    WORKFLOW_PLANNED,
    WORKFLOW_STARTED,
    WORKFLOW_COMPLETED,
    WORKFLOW_FAILED,
    SUBTASK_CREATED,
    SUBTASK_ASSIGNED,
    SUBTASK_STARTED,
    SUBTASK_COMPLETED,
    SUBTASK_FAILED,
    AGENT_DELEGATED,
    AGENT_RESULT_RECEIVED,
    WORKFLOW_REVIEW_STARTED,
    WORKFLOW_REVIEW_COMPLETED,
    MEMORY_CANDIDATE_CREATED,
    MEMORY_CREATED,
    MEMORY_UPDATED,
    MEMORY_ARCHIVED,
    MEMORY_EXPIRED,
    MEMORY_DELETED,
    MEMORY_RETRIEVAL_COMPLETED,
}

class EventService:
    TASK_CREATED = TASK_CREATED
    TASK_QUEUED = TASK_QUEUED
    TASK_STARTED = TASK_STARTED
    TASK_STATUS_CHANGED = TASK_STATUS_CHANGED
    TASK_COMPLETED = TASK_COMPLETED
    TASK_FAILED = TASK_FAILED
    TASK_CANCEL_REQUESTED = TASK_CANCEL_REQUESTED
    TASK_CANCELLED = TASK_CANCELLED
    AGENT_STATUS_CHANGED = AGENT_STATUS_CHANGED
    AGENT_IDLE = AGENT_IDLE
    AGENT_WORKING = AGENT_WORKING
    AGENT_WAITING_FOR_APPROVAL = AGENT_WAITING_FOR_APPROVAL
    AGENT_ERROR = AGENT_ERROR
    TASK_STEP_STARTED = TASK_STEP_STARTED
    TASK_STEP_COMPLETED = TASK_STEP_COMPLETED
    TASK_STEP_FAILED = TASK_STEP_FAILED
    TOOL_EXECUTION_STARTED = TOOL_EXECUTION_STARTED
    TOOL_EXECUTION_COMPLETED = TOOL_EXECUTION_COMPLETED
    TOOL_EXECUTION_FAILED = TOOL_EXECUTION_FAILED
    APPROVAL_REQUIRED = APPROVAL_REQUIRED
    APPROVAL_RESOLVED = APPROVAL_RESOLVED
    ARTIFACT_CREATED = ARTIFACT_CREATED

    WORKFLOW_CREATED = WORKFLOW_CREATED
    WORKFLOW_PLANNED = WORKFLOW_PLANNED
    WORKFLOW_STARTED = WORKFLOW_STARTED
    WORKFLOW_COMPLETED = WORKFLOW_COMPLETED
    WORKFLOW_FAILED = WORKFLOW_FAILED
    SUBTASK_CREATED = SUBTASK_CREATED
    SUBTASK_ASSIGNED = SUBTASK_ASSIGNED
    SUBTASK_STARTED = SUBTASK_STARTED
    SUBTASK_COMPLETED = SUBTASK_COMPLETED
    SUBTASK_FAILED = SUBTASK_FAILED
    AGENT_DELEGATED = AGENT_DELEGATED
    AGENT_RESULT_RECEIVED = AGENT_RESULT_RECEIVED
    WORKFLOW_REVIEW_STARTED = WORKFLOW_REVIEW_STARTED
    WORKFLOW_REVIEW_COMPLETED = WORKFLOW_REVIEW_COMPLETED

    EVENT_AGENT_STATUS_CHANGED = AGENT_STATUS_CHANGED
    EVENT_TASK_CREATED = TASK_CREATED
    EVENT_TASK_STARTED = TASK_STARTED
    EVENT_TASK_COMPLETED = TASK_COMPLETED

    @staticmethod
    def create_event(
        db: Session,
        event_type: str,
        agent_id: Optional[str] = None,
        task_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        commit: bool = True,
    ) -> AgentEventModel:
        """
        Creates and persists an event record with monotonic sequence_id.
        """
        max_seq = db.query(func.coalesce(func.max(AgentEventModel.sequence_id), 0)).scalar() or 0
        next_seq = int(max_seq) + 1

        # Safeguard FK existence to prevent FK constraint failures with system/mock callers
        resolved_agent_id = agent_id
        if resolved_agent_id:
            if not db.query(AgentModel.id).filter(AgentModel.id == resolved_agent_id).first():
                resolved_agent_id = None

        resolved_task_id = task_id
        if resolved_task_id:
            if not db.query(TaskModel.id).filter(TaskModel.id == resolved_task_id).first():
                resolved_task_id = None

        event = AgentEventModel(
            id=f"evt_{uuid.uuid4().hex[:16]}",
            sequence_id=next_seq,
            event_type=event_type,
            agent_id=resolved_agent_id,
            task_id=resolved_task_id,
            payload_json=payload or {},
            created_at=datetime.utcnow(),
        )
        db.add(event)
        if commit:
            db.commit()
            db.refresh(event)
        return event

    @staticmethod
    def get_events(
        db: Session,
        agent_id: Optional[str] = None,
        task_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AgentEventModel]:
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        query = db.query(AgentEventModel)
        if agent_id:
            query = query.filter(AgentEventModel.agent_id == agent_id)
        if task_id:
            query = query.filter(AgentEventModel.task_id == task_id)
        if event_type:
            query = query.filter(AgentEventModel.event_type == event_type)

        return query.order_by(desc(AgentEventModel.created_at)).offset(offset).limit(limit).all()

    @staticmethod
    def get_events_after(
        db: Session,
        last_sequence_id: int,
        limit: int = 100,
    ) -> List[AgentEventModel]:
        """
        Retrieves missed events after a given sequence cursor for replay.
        """
        return (
            db.query(AgentEventModel)
            .filter(AgentEventModel.sequence_id > last_sequence_id)
            .order_by(AgentEventModel.sequence_id.asc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def build_initial_snapshot(db: Session) -> Dict[str, Any]:
        """
        Constructs an authoritative state snapshot for newly connected or resyncing clients.
        """
        all_agents = db.query(AgentModel).all()
        active_tasks = (
            db.query(TaskModel)
            .filter(TaskModel.status.in_(["queued", "planning", "running", "waiting_approval"]))
            .order_by(TaskModel.created_at.desc())
            .limit(20)
            .all()
        )

        max_seq = db.query(func.coalesce(func.max(AgentEventModel.sequence_id), 0)).scalar() or 0

        return {
            "message_type": "snapshot",
            "snapshot_id": f"snap_{uuid.uuid4().hex[:12]}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "last_sequence_id": int(max_seq),
            "data": {
                "agents": [
                    {
                        "id": a.id,
                        "name": a.name,
                        "role": a.role,
                        "station": a.station,
                        "status": a.status,
                        "color": a.color,
                        "avatar": a.avatar,
                        "pos_x": a.pos_x,
                        "pos_y": a.pos_y,
                        "pos_z": a.pos_z,
                        "current_task_id": a.current_task_id,
                        "description": a.description,
                    }
                    for a in all_agents
                ],
                "active_tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "description": t.description,
                        "status": t.status,
                        "priority": t.priority,
                        "assigned_agent_id": t.assigned_agent_id,
                        "created_at": t.created_at.isoformat() if t.created_at else None,
                        "started_at": t.started_at.isoformat() if t.started_at else None,
                    }
                    for t in active_tasks
                ],
            },
        }

event_service = EventService()

# Module-level aliases
record_event = event_service.create_event
get_events_after = event_service.get_events_after
build_initial_snapshot = event_service.build_initial_snapshot
