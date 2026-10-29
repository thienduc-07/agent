import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ArtifactModel(Base):
    __tablename__ = "artifacts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    task_id = Column(String(64), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    artifact_type = Column(String(64), nullable=False, default="file")
    storage_path = Column(String(255), nullable=False)
    mime_type = Column(String(64), nullable=False, default="text/plain")
    size_bytes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    task = relationship("TaskModel", back_populates="artifacts")

    __table_args__ = (
        Index("ix_artifacts_task_created", "task_id", "created_at"),
    )
