from typing import Dict, Any
from backend.app.agent_runtime.tools.base import ToolPermissionLevel, ToolResult, ToolCategory
from backend.app.core.database import SessionLocal
from backend.app.services.memory_service import memory_service

class MemoryGetTool:
    name: str = "memory_get"
    display_name: str = "Get Memory by ID"
    category: ToolCategory = ToolCategory.MEMORY
    description: str = "Retrieve the full content, provenance, and verification metadata of a specific memory by its ID."
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "memory_id": {
                "type": "string",
                "description": "Unique UUID of the memory item to retrieve."
            }
        },
        "required": ["memory_id"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        memory_id = arguments.get("memory_id", "").strip()
        if not memory_id:
            return ToolResult(success=False, output="memory_id cannot be blank.", error="MISSING_MEMORY_ID")

        caller_agent_id = getattr(context, "agent_id", None) if context else None

        db = getattr(context, "db", None)
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            mem = memory_service.get_memory_by_id(
                db=db,
                memory_id=memory_id,
                caller_agent_id=caller_agent_id,
                record_access=True,
            )

            details = (
                f"Memory #{mem.id}:\n"
                f"Title: {mem.title}\n"
                f"Scope: {mem.scope_type} (Owner: {mem.owner_agent_id or 'none'})\n"
                f"Confidence: {mem.confidence} | Verification: {mem.verification_status}\n"
                f"Source Task: {mem.source_task_id or 'none'} | Source Type: {mem.source_type}\n"
                f"Content:\n{mem.content}\n"
            )
            return ToolResult(
                success=True,
                output=details,
                data=mem.to_dict()
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output=f"Failed to retrieve memory '{memory_id}': {str(e)}",
                error=str(e)
            )
        finally:
            if close_db:
                db.close()
