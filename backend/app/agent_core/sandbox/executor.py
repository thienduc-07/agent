import os
import sys
import subprocess
import asyncio
from pathlib import Path
from typing import Dict, Any, Tuple
from backend.app.config import settings

class SandboxExecutor:
    """Executes sandboxed Python scripts and commands in a restricted workspace directory."""
    
    def __init__(self, sandbox_dir: Path = settings.SANDBOX_DIR):
        self.sandbox_dir = sandbox_dir
        self.sandbox_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, relative_or_abs_path: str) -> Path:
        """Ensures the target file path stays strictly within the sandbox directory."""
        target = (self.sandbox_dir / relative_or_abs_path).resolve()
        try:
            target.relative_to(self.sandbox_dir.resolve())
        except ValueError:
            raise PermissionError(f"Access Denied: Path '{relative_or_abs_path}' escapes sandbox boundaries!")
        return target

    async def execute_python(self, code: str, filename: str = "temp_script.py") -> Dict[str, Any]:
        """Executes python code inside the sandbox workspace asynchronously with strict timeout."""
        safe_path = self._resolve_safe_path(filename)
        safe_path.write_text(code, encoding="utf-8")

        # Run via subprocess with timeout
        cmd = [sys.executable, "-u", str(safe_path.name)]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(self.sandbox_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=settings.MAX_EXECUTION_TIME_SECONDS
                )
                stdout = stdout_data.decode("utf-8", errors="replace")[:10000]
                stderr = stderr_data.decode("utf-8", errors="replace")[:10000]
                exit_code = proc.returncode

                return {
                    "success": exit_code == 0,
                    "exit_code": exit_code,
                    "stdout": stdout,
                    "stderr": stderr,
                    "script_name": filename
                }
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return {
                    "success": False,
                    "exit_code": -1,
                    "stdout": "",
                    "stderr": f"Execution timed out after {settings.MAX_EXECUTION_TIME_SECONDS} seconds.",
                    "script_name": filename
                }
        except Exception as e:
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Subprocess invocation error: {str(e)}",
                "script_name": filename
            }

    async def execute_shell(self, command: str) -> Dict[str, Any]:
        """Executes a vetted shell diagnostic command inside the sandbox."""
        # Split command into parts safely without shell=True to avoid shell injections
        parts = command.strip().split()
        if not parts:
            return {"success": False, "stderr": "Empty command provided."}
        
        allowed_bins = {"ls", "pwd", "date", "echo", "head", "tail", "cat", "wc", "stat", "find", "grep"}
        base_cmd = parts[0]
        if base_cmd not in allowed_bins:
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Security restriction: Command '{base_cmd}' is not in the allowed sandbox whitelist ({', '.join(sorted(allowed_bins))})."
            }

        try:
            proc = await asyncio.create_subprocess_exec(
                *parts,
                cwd=str(self.sandbox_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_data, stderr_data = await asyncio.wait_for(
                proc.communicate(),
                timeout=settings.MAX_EXECUTION_TIME_SECONDS
            )
            return {
                "success": proc.returncode == 0,
                "exit_code": proc.returncode,
                "stdout": stdout_data.decode("utf-8", errors="replace")[:10000],
                "stderr": stderr_data.decode("utf-8", errors="replace")[:10000]
            }
        except Exception as e:
            return {"success": False, "exit_code": -1, "stdout": "", "stderr": str(e)}

sandbox_executor = SandboxExecutor()
