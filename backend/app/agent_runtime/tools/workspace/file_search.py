import os
import fnmatch
from pathlib import Path
from typing import Dict, Any, List
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError

IGNORE_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next", ".pytest_cache"}

class FileSearchTool:
    name: str = "file_search"
    description: str = (
        "Search for files by name pattern or text content within the permitted workspace. "
        "Returns up to 50 matching files."
    )
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 20
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "Filename glob pattern (e.g. '*.py', '*test*', 'schema*.ts')",
                "default": "*"
            },
            "content_query": {
                "type": "string",
                "description": "Optional substring to search for inside file contents",
                "default": ""
            },
            "subpath": {
                "type": "string",
                "description": "Subdirectory path to restrict search within (default: root)",
                "default": ""
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum matching results to return (default: 30, max: 50)",
                "default": 30
            }
        }
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        pattern = arguments.get("pattern", "*").strip() or "*"
        content_query = arguments.get("content_query", "").strip()
        subpath = arguments.get("subpath", "")
        max_results = min(max(1, arguments.get("max_results", 30)), 50)

        try:
            target_root = safe_resolve_path(subpath, base_root=settings.WORKSPACE_ROOT, must_exist=True)

            matches: List[Dict[str, Any]] = []

            for root, dirs, files in os.walk(target_root):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

                for f in files:
                    if f.startswith(".env") or f.endswith((".pyc", ".DS_Store")):
                        continue

                    if fnmatch.fnmatch(f.lower(), pattern.lower()):
                        file_path = Path(root) / f
                        rel_path = str(file_path.relative_to(settings.WORKSPACE_ROOT))

                        matched = False
                        match_snippet = None

                        if content_query:
                            # Content search only for files under 200KB
                            if file_path.stat().st_size <= 200 * 1024:
                                try:
                                    with open(file_path, "r", encoding="utf-8", errors="ignore") as fp:
                                        for line_idx, line in enumerate(fp, start=1):
                                            if content_query.lower() in line.lower():
                                                matched = True
                                                match_snippet = f"Line {line_idx}: {line.strip()[:100]}"
                                                break
                                except Exception:
                                    pass
                        else:
                            matched = True

                        if matched:
                            matches.append({
                                "path": rel_path,
                                "name": f,
                                "size_bytes": file_path.stat().st_size,
                                "snippet": match_snippet
                            })

                        if len(matches) >= max_results:
                            break

                if len(matches) >= max_results:
                    break

            summary = f"File search completed. Found {len(matches)} matches for pattern='{pattern}'"
            if content_query:
                summary += f" containing '{content_query}'"
            summary += ":\n"

            lines = []
            for m in matches:
                item_str = f"- {m['path']} ({m['size_bytes']} bytes)"
                if m.get("snippet"):
                    item_str += f" | {m['snippet']}"
                lines.append(item_str)

            return ToolResult(
                success=True,
                data={"matches": matches, "count": len(matches)},
                output=summary + "\n".join(lines) if matches else summary + "(No matching files found)"
            )

        except PathSecurityError as e:
            return ToolResult(success=False, output=str(e), error="SECURITY_VIOLATION")
        except Exception as e:
            return ToolResult(success=False, output=f"Search failed: {str(e)}", error="EXECUTION_ERROR")
