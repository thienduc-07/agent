import os
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError

class VerificationTool:
    name: str = "verification_tool"
    description: str = (
        "Verifies that a target file or artifact exists in workspace/sandbox, is non-empty, "
        "and satisfies expected structural criteria (e.g. minimum size, expected substring)."
    )
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    timeout_seconds: int = 15
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {
                "type": "string",
                "description": "Path to file to verify (can be relative to sandbox or workspace root)"
            },
            "min_size_bytes": {
                "type": "integer",
                "description": "Minimum expected file size in bytes (default: 1)",
                "default": 1
            },
            "required_substring": {
                "type": "string",
                "description": "Optional substring that must be present in the file content",
                "default": ""
            }
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "").strip()
        min_size = max(0, arguments.get("min_size_bytes", 1))
        required_substring = arguments.get("required_substring", "").strip()

        if not filepath:
            return ToolResult(success=False, output="Filepath argument cannot be empty.", error="INVALID_ARGUMENTS")

        # Check sandbox first, then workspace root
        target_path: Optional[Path] = None
        sandbox_candidate = settings.SANDBOX_DIR / filepath
        if sandbox_candidate.exists():
            target_path = sandbox_candidate
        else:
            try:
                target_path = safe_resolve_path(filepath, base_root=settings.WORKSPACE_ROOT)
            except PathSecurityError as e:
                return ToolResult(success=False, output=str(e), error="SECURITY_VIOLATION")

        if not target_path or not target_path.exists():
            return ToolResult(
                success=False,
                output=f"Verification failed: File '{filepath}' does NOT exist.",
                error="FILE_DOES_NOT_EXIST"
            )

        if not target_path.is_file():
            return ToolResult(
                success=False,
                output=f"Verification failed: '{filepath}' is a directory, not a file.",
                error="NOT_A_FILE"
            )

        file_size = target_path.stat().st_size
        if file_size < min_size:
            return ToolResult(
                success=False,
                output=(
                    f"Verification failed: File size ({file_size} bytes) is below "
                    f"required threshold ({min_size} bytes)."
                ),
                error="FILE_TOO_SMALL"
            )

        content_preview = ""
        try:
            with open(target_path, "r", encoding="utf-8", errors="replace") as f:
                content_preview = f.read(500)
                if required_substring and required_substring.lower() not in content_preview.lower():
                    # Check entire file if not in preview
                    f.seek(0)
                    full_content = f.read(settings.MAX_FILE_READ_BYTES)
                    if required_substring.lower() not in full_content.lower():
                        return ToolResult(
                            success=False,
                            output=f"Verification failed: Required substring '{required_substring}' not found in file.",
                            error="SUBSTRING_NOT_FOUND"
                        )
        except Exception as e:
            return ToolResult(success=False, output=f"Verification read error: {str(e)}", error="READ_ERROR")

        rel_path = str(target_path.relative_to(settings.WORKSPACE_ROOT)) if target_path.is_relative_to(settings.WORKSPACE_ROOT) else str(target_path)
        return ToolResult(
            success=True,
            data={
                "filepath": rel_path,
                "verified": True,
                "size_bytes": file_size,
                "preview": content_preview[:150],
            },
            output=(
                f"Verification PASSED for '{rel_path}': File exists, size={file_size} bytes (>= {min_size} bytes), "
                f"content verified non-empty."
            )
        )
