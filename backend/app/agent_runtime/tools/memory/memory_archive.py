from typing import Dict, Any
from backend.app.agent_runtime.tools.base import ToolPermissionLevel, ToolResult, ToolCategory
from backend.app.core.database import SessionLocal
from backend.app.services.memory_service import memory_service
from backend.app.services.event_service import event_service
from backend.app.websocket_manager import ws_manager

class MemoryArchiveTool:
    name: str = "memory_archive"
    display_name: str = "Archive Memory"
    category: ToolCategory = ToolCategory.MEMORY
    description: str = "Archive an outdated or superseded memory so it is excluded from primary search."
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "memory_id": {
                "type": "string",
                "description": "UUID of the memory to archive."
            },
            "reason": {
                "type": "string",
                "description": "Reason for archiving (e.g. 'Superseded by updated research findings')."
            }
        },
        "required": ["memory_id"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        memory_id = arguments.get("memory_id", "").strip()
        reason = arguments.get("reason", "Archived by agent request")
        if not memory_id:
            return ToolResult(success=False, output="memory_id cannot be blank.", error="MISSING_MEMORY_ID")

        caller_agent_id = getattr(context, "agent_id", None) if context else None
        task_id = getattr(context, "task_id", None) if context else None

        db = getattr(context, "db", None)
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            mem = memory_service.get_memory_by_id(db, memory_id, caller_agent_id=caller_agent_id)
            archived_mem = memory_service.archive_memory(db, memory_id, reason=reason)

            ev = event_service.create_event(
                db=db,
                event_type="memory.archived",
                agent_id=caller_agent_id or "system",
                task_id=task_id,
                payload={"memory_id": memory_id, "reason": reason},
                commit=False
            )
            db.commit()
            await ws_manager.broadcast_envelope(ev.to_envelope())

            return ToolResult(
                success=True,
                output=f"Memory '{memory_id}' has been archived. Reason: {reason}",
                data={"memory_id": memory_id, "status": "archived"}
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output=f"Failed to archive memory: {str(e)}",
                error=str(e)
            )
        finally:
            if close_db:
                db.close()
