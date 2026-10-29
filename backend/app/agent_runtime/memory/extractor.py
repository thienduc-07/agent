import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.services.memory_service import memory_service
from backend.app.schemas.memory import MemoryCreate
from backend.app.models.memory import MemoryModel
from backend.app.services.event_service import event_service
from backend.app.websocket_manager import ws_manager

logger = logging.getLogger("grandline.memory.extractor")

class MemoryExtractor:
    async def extract_and_propose(
        self,
        db: Session,
        task_id: str,
        agent_id: str,
        task_title: str,
        task_description: str,
        execution_summary: str,
        artifacts: Optional[List[Dict[str, Any]]] = None,
        confidence: float = 0.9,
        auto_activate: bool = False,
        scope_type: str = "shared",
        memory_type: str = "task",
    ) -> Optional[MemoryModel]:
        """
        Analyzes a completed task execution outcome and proposes or persists a reusable memory candidate.
        """
        if not execution_summary or len(execution_summary.strip()) < 10:
            return None

        # Filter out generic error messages or empty results
        if "failed" in execution_summary.lower() and "unhandled" in execution_summary.lower():
            return None

        # Create concise title and summary
        title = f"Knowledge: {task_title[:80]}"
        content = execution_summary.strip()
        summary = (
            f"Result from task '{task_title}' executed by agent {agent_id}. "
            f"Findings: {content[:150]}..."
        )

        metadata: Dict[str, Any] = {
            "task_description": task_description[:200],
            "extracted_by": "MemoryExtractor",
        }
        source_id = None
        if artifacts and len(artifacts) > 0:
            first_art = artifacts[0]
            source_id = first_art.get("filepath") or first_art.get("filename")
            metadata["artifacts_count"] = len(artifacts)
            metadata["primary_artifact"] = source_id

        mem_create = MemoryCreate(
            title=title,
            content=content,
            summary=summary,
            memory_type=memory_type,
            scope_type=scope_type,
            scope_id=agent_id if scope_type == "agent" else task_id if scope_type == "task" else None,
            owner_agent_id=agent_id,
            source_type="task_execution",
            source_id=source_id,
            source_task_id=task_id,
            confidence=confidence,
            verification_status="verified" if auto_activate else "unverified",
            sensitivity_level="normal",
            status="active" if auto_activate else "candidate",
            metadata=metadata,
        )

        try:
            mem = memory_service.create_memory(db, mem_create, auto_activate=auto_activate)

            # Emit memory event
            ev_type = "memory.created" if mem.status == "active" else "memory.candidate_created"
            ev = event_service.create_event(
                db=db,
                event_type=ev_type,
                agent_id=agent_id,
                task_id=task_id,
                payload={
                    "memory_id": mem.id,
                    "title": mem.title,
                    "scope_type": mem.scope_type,
                    "status": mem.status,
                    "confidence": mem.confidence,
                },
                commit=False,
            )
            db.commit()
            await ws_manager.broadcast_envelope(ev.to_envelope())
            logger.info(f"Memory proposed from task '{task_id}': '{mem.id}' ({mem.status})")
            return mem
        except Exception as e:
            logger.error(f"Failed to extract memory from task '{task_id}': {e}", exc_info=True)
            return None

memory_extractor = MemoryExtractor()
