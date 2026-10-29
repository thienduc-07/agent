import os
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError

class FileReadTool:
    name: str = "file_read"
    description: str = (
        "Reads textual content from a permitted file in the workspace. "
        "Strictly enforces size boundaries and blocks private/credential files."
    )
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {
                "type": "string",
                "description": "Relative file path within workspace to read"
            },
            "max_lines": {
                "type": "integer",
                "description": "Maximum number of lines to read (default: 500)",
                "default": 500
            },
            "offset_line": {
                "type": "integer",
                "description": "Starting line number (1-indexed, default: 1)",
                "default": 1
            }
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "")
        max_lines = max(1, min(arguments.get("max_lines", 500), 2000))
        offset_line = max(1, arguments.get("offset_line", 1))

        if not filepath.strip():
            return ToolResult(success=False, output="Filepath argument cannot be empty.", error="INVALID_ARGUMENTS")

        try:
            target_path = safe_resolve_path(filepath, base_root=settings.WORKSPACE_ROOT, must_exist=True)

            if target_path.is_dir():
                return ToolResult(
                    success=False,
                    output=f"Target path '{filepath}' is a directory, not a file.",
                    error="IS_A_DIRECTORY"
                )

            # Check file size limit
            file_size = target_path.stat().st_size
            if file_size > settings.MAX_FILE_READ_BYTES:
                return ToolResult(
                    success=False,
                    output=(
                        f"File size ({file_size} bytes) exceeds safety maximum "
                        f"({settings.MAX_FILE_READ_BYTES} bytes). Use offset or inspect smaller files."
                    ),
                    error="FILE_TOO_LARGE"
                )

            # Read file with encoding fallback
            content_lines = []
            try:
                with open(target_path, "r", encoding="utf-8", errors="replace") as f:
                    for i, line in enumerate(f, start=1):
                        if i < offset_line:
                            continue
                        if len(content_lines) >= max_lines:
                            break
                        content_lines.append(line)
            except Exception as e:
                return ToolResult(success=False, output=f"Failed to read file: {str(e)}", error="READ_FAILED")

            output_text = "".join(content_lines)
            return ToolResult(
                success=True,
                data={
                    "filepath": str(target_path.relative_to(settings.WORKSPACE_ROOT)),
                    "total_size_bytes": file_size,
                    "lines_returned": len(content_lines),
                    "start_line": offset_line,
                },
                output=output_text
            )

        except PathSecurityError as e:
            return ToolResult(success=False, output=str(e), error="SECURITY_VIOLATION")
        except FileNotFoundError as e:
            return ToolResult(success=False, output=str(e), error="FILE_NOT_FOUND")
        except Exception as e:
            return ToolResult(success=False, output=f"Read error: {str(e)}", error="EXECUTION_ERROR")
