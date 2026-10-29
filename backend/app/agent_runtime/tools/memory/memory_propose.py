from typing import Dict, Any
from backend.app.agent_runtime.tools.base import ToolPermissionLevel, ToolResult, ToolCategory
from backend.app.core.database import SessionLocal
from backend.app.services.memory_service import memory_service
from backend.app.schemas.memory import MemoryCreate
from backend.app.services.event_service import event_service
from backend.app.websocket_manager import ws_manager

class MemoryProposeTool:
    name: str = "memory_propose"
    display_name: str = "Propose Memory Candidate"
    category: ToolCategory = ToolCategory.MEMORY
    description: str = "Propose a new candidate memory or verified insight to be stored in persistent memory."
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Short, clear title describing the knowledge item."
            },
            "content": {
                "type": "string",
                "description": "The reusable knowledge, verified fact, or analytical conclusion."
            },
            "summary": {
                "type": "string",
                "description": "Optional concise summary of the knowledge item."
            },
            "scope_type": {
                "type": "string",
                "enum": ["shared", "agent", "task", "workspace"],
                "description": "Target scope (default: shared)."
            },
            "memory_type": {
                "type": "string",
                "enum": ["task", "agent", "shared"],
                "description": "Memory type (default: task)."
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score between 0.0 and 1.0 (default: 0.9)."
            }
        },
        "required": ["title", "content"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        title = arguments.get("title", "").strip()
        content = arguments.get("content", "").strip()
        summary = arguments.get("summary")
        scope_type = arguments.get("scope_type", "shared")
        memory_type = arguments.get("memory_type", "task")
        confidence = float(arguments.get("confidence", 0.9))

        if not title or not content:
            return ToolResult(success=False, output="Title and content are required.", error="VALIDATION_ERROR")

        caller_agent_id = getattr(context, "agent_id", None) if context else None
        task_id = getattr(context, "task_id", None) if context else None

        mem_create = MemoryCreate(
            title=title,
            content=content,
            summary=summary,
            memory_type=memory_type,
            scope_type=scope_type,
            scope_id=caller_agent_id if scope_type == "agent" else task_id if scope_type == "task" else None,
            owner_agent_id=caller_agent_id,
            source_type="agent_tool_proposal",
            source_task_id=task_id,
            confidence=confidence,
            verification_status="unverified",
            sensitivity_level="normal",
            status="candidate",
        )

        db = getattr(context, "db", None)
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            mem = memory_service.create_memory(db, mem_create, auto_activate=False)

            ev = event_service.create_event(
                db=db,
                event_type="memory.candidate_created",
                agent_id=caller_agent_id or "system",
                task_id=task_id,
                payload={
                    "memory_id": mem.id,
                    "title": mem.title,
                    "status": mem.status,
                    "scope_type": mem.scope_type,
                },
                commit=False
            )
            db.commit()
            await ws_manager.broadcast_envelope(ev.to_envelope())

            return ToolResult(
                success=True,
                output=f"Candidate memory '{mem.title}' successfully proposed with ID '{mem.id}'.",
                data=mem.to_dict()
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output=f"Failed to propose memory: {str(e)}",
                error=str(e)
            )
        finally:
            if close_db:
                db.close()
