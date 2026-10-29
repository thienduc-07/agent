from typing import Dict, Any, Optional
from backend.app.agent_runtime.tools.base import ToolPermissionLevel, ToolResult, ToolCategory
from backend.app.core.database import SessionLocal
from backend.app.services.memory_service import memory_service

class MemorySearchTool:
    name: str = "memory_search"
    display_name: str = "Search Fleet Memory"
    category: ToolCategory = ToolCategory.MEMORY
    description: str = "Search persistent memory and fleet knowledge for relevant prior findings, procedures, and data."
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Keywords or search phrase to look up in persistent memory."
            },
            "scope_type": {
                "type": "string",
                "enum": ["shared", "agent", "task", "workspace"],
                "description": "Optional scope filter: shared (default), agent, task, workspace."
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of memory items to return (default: 5, max: 10)."
            }
        },
        "required": ["query"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        query = arguments.get("query", "").strip()
        scope_type = arguments.get("scope_type")
        limit = min(int(arguments.get("limit", 5)), 10)

        caller_agent_id = getattr(context, "agent_id", None) if context else None
        task_id = getattr(context, "task_id", None) if context else None

        db = getattr(context, "db", None)
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            resp = memory_service.search_memories(
                db=db,
                query=query,
                scope_type=scope_type,
                caller_agent_id=caller_agent_id,
                status="active",
                limit=limit,
                task_id_for_citation=task_id,
            )

            if not resp.items:
                return ToolResult(
                    success=True,
                    output=f"No active memories found matching query: '{query}'.",
                    data={"total": 0, "items": []}
                )

            formatted_snippets = []
            for item in resp.items:
                mem = item.memory
                formatted_snippets.append(
                    f"- [ID: {mem.id}] {mem.title} (Scope: {mem.scope_type}, Score: {item.relevance_score})\n"
                    f"  Summary: {mem.summary or mem.content[:150]}"
                )

            output_text = f"Found {len(resp.items)} memories for '{query}':\n" + "\n".join(formatted_snippets)
            return ToolResult(
                success=True,
                output=output_text,
                data={
                    "total": resp.total,
                    "items": [item.model_dump() for item in resp.items]
                }
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output=f"Error searching memory: {str(e)}",
                error=str(e)
            )
        finally:
            if close_db:
                db.close()
