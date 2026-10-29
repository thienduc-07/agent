from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.artifact import ArtifactModel

class ArtifactService:
    @staticmethod
    def list_artifacts(db: Session, task_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[ArtifactModel]:
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        query = db.query(ArtifactModel)
        if task_id:
            query = query.filter(ArtifactModel.task_id == task_id)

        return query.order_by(desc(ArtifactModel.created_at)).offset(offset).limit(limit).all()

artifact_service = ArtifactService()
