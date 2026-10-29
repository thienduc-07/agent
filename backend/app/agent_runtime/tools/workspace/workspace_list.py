import os
from pathlib import Path
from typing import Dict, Any, List
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError

IGNORE_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next", ".pytest_cache", ".idea", ".vscode"}
IGNORE_FILES = {".DS_Store", "thumbs.db"}

class WorkspaceListTool:
    name: str = "workspace_list"
    description: str = (
        "List files and directories in the workspace up to a specific depth. "
        "Does NOT return file contents."
    )
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "subpath": {
                "type": "string",
                "description": "Relative subdirectory path within workspace to inspect (default: root)",
                "default": ""
            },
            "max_depth": {
                "type": "integer",
                "description": "Maximum directory traversal depth (default: 2, max: 4)",
                "default": 2
            }
        }
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        subpath = arguments.get("subpath", "")
        max_depth = min(max(1, arguments.get("max_depth", 2)), 4)

        try:
            target_dir = safe_resolve_path(subpath, base_root=settings.WORKSPACE_ROOT, must_exist=True)
            if not target_dir.is_dir():
                return ToolResult(
                    success=False,
                    output=f"Target path '{subpath}' is not a directory.",
                    error="NOT_A_DIRECTORY"
                )

            items: List[Dict[str, Any]] = []
            root_depth = len(target_dir.parts)

            for root, dirs, files in os.walk(target_dir):
                current_depth = len(Path(root).parts) - root_depth
                if current_depth >= max_depth:
                    dirs.clear() # Do not recurse deeper
                    continue

                # Filter out ignored directories in-place
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

                rel_root = str(Path(root).relative_to(target_dir))
                if rel_root == ".":
                    rel_root = ""

                for d in sorted(dirs):
                    items.append({
                        "name": d,
                        "path": os.path.join(rel_root, d) if rel_root else d,
                        "type": "directory"
                    })

                for f in sorted(files):
                    if f in IGNORE_FILES or f.startswith(".env"):
                        continue
                    file_path = Path(root) / f
                    items.append({
                        "name": f,
                        "path": os.path.join(rel_root, f) if rel_root else f,
                        "type": "file",
                        "size_bytes": file_path.stat().st_size if file_path.exists() else 0
                    })

            summary = f"Discovered {len(items)} items in workspace '{subpath or '.'}' (max_depth={max_depth}):\n"
            lines = [f"- [{i['type'][0].upper()}] {i['path']}" for i in items[:100]]
            if len(items) > 100:
                lines.append(f"... and {len(items) - 100} more items.")

            return ToolResult(
                success=True,
                data={"items": items, "total_count": len(items)},
                output=summary + "\n".join(lines)
            )

        except PathSecurityError as e:
            return ToolResult(success=False, output=str(e), error="SECURITY_VIOLATION")
        except FileNotFoundError as e:
            return ToolResult(success=False, output=str(e), error="NOT_FOUND")
        except Exception as e:
            return ToolResult(success=False, output=f"Listing failed: {str(e)}", error="EXECUTION_ERROR")
