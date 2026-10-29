import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ToolDefinitionModel(Base):
    """
    Persistent registry entry for tools available to autonomous agents.
    Tracks metadata, category, permissions, approval gates, and dynamic enable/disable states.
    """
    __tablename__ = "tool_definitions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    version = Column(String(32), default="1.0.0", nullable=False)
    category = Column(String(32), nullable=False, index=True)  # workspace, artifact, data, web, api, memory
    permission_level = Column(Integer, default=0, nullable=False)  # 0: read-only, 1: workspace write, 2: command/admin
    side_effect_level = Column(String(32), default="read_only", nullable=False)  # read_only, reversible_mutation, high_risk
    requires_approval = Column(Boolean, default=False, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False, index=True)
    is_healthy = Column(Boolean, default=True, nullable=False)
    rate_limit = Column(Integer, default=60, nullable=False)  # max invocations per minute
    execution_timeout = Column(Integer, default=30, nullable=False)
    max_output_size = Column(Integer, default=100000, nullable=False)
    input_schema = Column(JSON, default=dict, nullable=False)
    output_schema = Column(JSON, default=dict, nullable=False)
    config = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_tool_defs_category_enabled", "category", "is_enabled"),
    )

class ToolExecutionModel(Base):
    """
    Immutable audit trail of tool executions across all agent tasks and workflows.
    Maintains provenance, duration, status, sanitized arguments, and generated artifacts.
    """
    __tablename__ = "tool_executions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    tool_name = Column(String(64), nullable=False, index=True)
    task_id = Column(String(64), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    approval_id = Column(String(64), ForeignKey("approvals.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="succeeded", index=True)  # pending, running, succeeded, failed, timed_out, awaiting_approval, denied
    arguments = Column(JSON, default=dict, nullable=False)
    output_summary = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    duration_ms = Column(Integer, default=0, nullable=False)
    artifact_ids = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    task = relationship("TaskModel", backref="tool_executions", lazy="select")
    agent = relationship("AgentModel", backref="tool_executions", lazy="select")

    __table_args__ = (
        Index("ix_tool_exec_task_created", "task_id", "created_at"),
        Index("ix_tool_exec_name_status", "tool_name", "status"),
    )
