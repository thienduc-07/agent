import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    station = Column(String(100), nullable=False, unique=True)
    status = Column(String(50), default="IDLE")  # IDLE, THINKING, EXECUTING_TOOL, AWAITING_APPROVAL, COMPLETED, FAILED
    current_task_id = Column(String(36), nullable=True)
    
    # 3D Coordinates & Styling for Anime World
    pos_x = Column(Float, default=0.0)
    pos_y = Column(Float, default=1.0)
    pos_z = Column(Float, default=0.0)
    color = Column(String(50), default="#f59e0b")
    avatar = Column(String(50), default="captain") # captain, swordsman, scholar, engineer
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("TaskModel", back_populates="agent", cascade="all, delete-orphan")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False)
    prompt = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, AWAITING_APPROVAL, COMPLETED, FAILED, CANCELLED
    risk_level = Column(String(20), default="SAFE")  # SAFE, LOW, HIGH
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agent = relationship("AgentModel", back_populates="tasks")
    events = relationship("EventLogModel", back_populates="task", cascade="all, delete-orphan")
    pending_actions = relationship("PendingActionModel", back_populates="task", cascade="all, delete-orphan")


class EventLogModel(Base):
    __tablename__ = "event_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    agent_id = Column(String(36), nullable=False)
    event_type = Column(String(50), nullable=False)  # TASK_CREATED, STEP_START, TOOL_CALL, APPROVAL_REQUIRED, APPROVAL_DECISION, TOOL_RESULT, TASK_COMPLETED, TASK_FAILED
    payload = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    task = relationship("TaskModel", back_populates="events")


class PendingActionModel(Base):
    __tablename__ = "pending_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    agent_id = Column(String(36), nullable=False)
    tool_name = Column(String(100), nullable=False)
    tool_args = Column(JSON, nullable=False)
    risk_reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)

    task = relationship("TaskModel", back_populates="pending_actions")
