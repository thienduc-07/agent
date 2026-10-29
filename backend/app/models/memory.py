import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Index,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class MemoryModel(Base):
    __tablename__ = "memories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Scope & Type
    # memory_type: "working", "task", "agent", "shared"
    memory_type = Column(String(32), nullable=False, default="task")
    # scope_type: "working", "task", "agent", "shared", "workspace"
    scope_type = Column(String(32), nullable=False, default="shared")
    # scope_id: e.g. agent_id if scope_type=="agent", task_id if scope_type=="task"
    scope_id = Column(String(64), nullable=True)
    # owner_agent_id: agent who created / owns this memory
    owner_agent_id = Column(String(64), nullable=True)

    # Content
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)

    # Provenance
    source_type = Column(String(64), nullable=False, default="task_execution")
    source_id = Column(String(255), nullable=True)
    source_task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Float, nullable=False, default=1.0)
    verification_status = Column(String(32), nullable=False, default="unverified")
    sensitivity_level = Column(String(32), nullable=False, default="normal")

    # Lifecycle & Expiration
    # status: "candidate", "active", "archived", "expired", "rejected", "deleted"
    status = Column(String(32), nullable=False, default="candidate")
    expires_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, nullable=False, default=0)

    # Metadata & Versioning
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    source_task = relationship("TaskModel", foreign_keys=[source_task_id])
    citations = relationship("MemoryCitationModel", back_populates="memory", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_memories_status_scope", "status", "scope_type", "scope_id"),
        Index("ix_memories_owner_status", "owner_agent_id", "status"),
        Index("ix_memories_type_status", "memory_type", "status"),
        Index("ix_memories_source_task", "source_task_id"),
        Index("ix_memories_created_at", "created_at"),
    )

    def is_expired(self) -> bool:
        if self.expires_at and self.expires_at < datetime.utcnow():
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "memory_type": self.memory_type,
            "scope_type": self.scope_type,
            "scope_id": self.scope_id,
            "owner_agent_id": self.owner_agent_id,
            "title": self.title,
            "content": self.content,
            "summary": self.summary,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "source_task_id": self.source_task_id,
            "confidence": self.confidence,
            "verification_status": self.verification_status,
            "sensitivity_level": self.sensitivity_level,
            "status": "expired" if self.is_expired() and self.status == "active" else self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "access_count": self.access_count,
            "metadata": self.metadata_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class MemoryCitationModel(Base):
    __tablename__ = "memory_citations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    memory_id = Column(String(36), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    agent_id = Column(String(64), nullable=False)
    relevance_score = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    memory = relationship("MemoryModel", back_populates="citations")
    task = relationship("TaskModel", foreign_keys=[task_id])

    __table_args__ = (
        Index("ix_memory_citations_memory_id", "memory_id"),
        Index("ix_memory_citations_task_id", "task_id"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "memory_id": self.memory_id,
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "relevance_score": self.relevance_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
