import ast
import operator
import platform
import psutil
from typing import Callable, Dict, Any, List, Optional
from pydantic import BaseModel, Field
import httpx
from backend.app.config import settings
from backend.app.agent_core.sandbox.executor import sandbox_executor

class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    risk_level: str = "SAFE"  # "SAFE" or "HIGH"
    risk_reason: Optional[str] = None


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._handlers: Dict[str, Callable] = {}

    def register(self, definition: ToolDefinition, handler: Callable):
        self._tools[definition.name] = definition
        self._handlers[definition.name] = handler

    def get(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def get_handler(self, name: str) -> Optional[Callable]:
        return self._handlers.get(name)

    def list_all(self) -> List[ToolDefinition]:
        return list(self._tools.values())

    def get_schemas(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            }
            for t in self._tools.values()
        ]

    async def execute(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        handler = self.get_handler(tool_name)
        if not handler:
            return {"error": f"Tool '{tool_name}' not found in registry"}
        try:
            return await handler(**args)
        except Exception as e:
            return {"error": f"Error executing tool '{tool_name}': {str(e)}"}

# Instantiate Global Registry
tool_registry = ToolRegistry()


# --- SAFE TOOL HANDLERS ---

async def handle_system_status() -> Dict[str, Any]:
    """Inspects the host machine and Grand Line Command Center status."""
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(logical=True),
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_total_gb": round(vm.total / (1024**3), 2),
        "memory_used_gb": round(vm.used / (1024**3), 2),
        "memory_percent": vm.percent,
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": disk.percent,
        "status": "Operational",
        "station": "Grand Line Command Deck"
    }

tool_registry.register(
    ToolDefinition(
        name="system_status",
        description="Get current system metrics (CPU, RAM, Disk, OS platform, and node health).",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        },
        risk_level="SAFE"
    ),
    handle_system_status
)


# Safe AST Math Evaluator
_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

def _eval_expr(node):
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise TypeError(f"Unsafe constant type: {type(node.value)}")
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            return _SAFE_OPERATORS[op_type](_eval_expr(node.left), _eval_expr(node.right))
        raise ValueError(f"Unsupported binary operator: {op_type}")
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            return _SAFE_OPERATORS[op_type](_eval_expr(node.operand))
        raise ValueError(f"Unsupported unary operator: {op_type}")
    else:
        raise TypeError(f"Unsafe syntax node: {type(node)}")

async def handle_calculator(expression: str) -> Dict[str, Any]:
    """Safely evaluates arithmetic expressions using Python AST."""
    try:
        parsed = ast.parse(expression, mode='eval')
        result = _eval_expr(parsed.body)
        return {"expression": expression, "result": result, "success": True}
    except Exception as e:
        return {"expression": expression, "error": f"Evaluation error: {str(e)}", "success": False}

tool_registry.register(
    ToolDefinition(
        name="calculator",
        description="Perform safe mathematical and arithmetic calculations (e.g., '128 * 45 + 1024 / 8').",
        parameters={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "The math expression to evaluate, e.g. '(15 * 4) + 120'"
                }
            },
            "required": ["expression"]
        },
        risk_level="SAFE"
    ),
    handle_calculator
)


async def handle_file_list() -> Dict[str, Any]:
    """Lists files in the sandbox workspace directory."""
    try:
        files = []
        for p in settings.SANDBOX_DIR.iterdir():
            if p.is_file():
                files.append({
                    "name": p.name,
                    "size_bytes": p.stat().st_size,
                    "modified": p.stat().st_mtime
                })
        return {"sandbox_directory": str(settings.SANDBOX_DIR.name), "files": files, "count": len(files)}
    except Exception as e:
        return {"error": str(e)}

tool_registry.register(
    ToolDefinition(
        name="file_list",
        description="List all files currently in the sandboxed workspace directory.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        },
        risk_level="SAFE"
    ),
    handle_file_list
)


async def handle_file_read(filename: str) -> Dict[str, Any]:
    """Reads a text file inside the sandbox."""
    try:
        safe_path = sandbox_executor._resolve_safe_path(filename)
        if not safe_path.exists():
            return {"error": f"File '{filename}' does not exist in sandbox."}
        if safe_path.stat().st_size > settings.MAX_FILE_SIZE_BYTES:
            return {"error": f"File '{filename}' exceeds safe size limit ({settings.MAX_FILE_SIZE_BYTES} bytes)."}
        content = safe_path.read_text(encoding="utf-8")
        return {"filename": filename, "content": content, "size_bytes": len(content)}
    except Exception as e:
        return {"error": str(e)}

tool_registry.register(
    ToolDefinition(
        name="file_read",
        description="Read the contents of a file inside the sandboxed workspace directory.",
        parameters={
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Name of the file to read"
                }
            },
            "required": ["filename"]
        },
        risk_level="SAFE"
    ),
    handle_file_read
)


async def handle_web_fetch(url: str) -> Dict[str, Any]:
    """Safely fetches public content over HTTP/HTTPS with timeout."""
    if not (url.startswith("http://") or url.startswith("https://")):
        return {"error": "Invalid URL scheme. Must be http:// or https://"}
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url)
            text_snippet = resp.text[:5000]
            return {
                "url": url,
                "status_code": resp.status_code,
                "content_type": resp.headers.get("content-type", ""),
                "snippet": text_snippet,
                "length": len(resp.text)
            }
    except Exception as e:
        return {"url": url, "error": f"Failed to fetch: {str(e)}"}

tool_registry.register(
    ToolDefinition(
        name="web_fetch",
        description="Safely fetch text content or JSON from an external public HTTP/HTTPS URL.",
        parameters={
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to fetch, e.g. 'https://httpbin.org/get'"
                }
            },
            "required": ["url"]
        },
        risk_level="SAFE"
    ),
    handle_web_fetch
)


# --- RISKY TOOLS (REQUIRE CAPTAIN'S APPROVAL) ---

async def handle_python_exec(code: str, filename: str = "script.py") -> Dict[str, Any]:
    """Executes python code inside the restricted sandbox directory."""
    return await sandbox_executor.execute_python(code=code, filename=filename)

tool_registry.register(
    ToolDefinition(
        name="python_exec",
        description="Execute a Python script inside the sandboxed environment with stdout/stderr capture.",
        parameters={
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Complete Python script to execute"
                },
                "filename": {
                    "type": "string",
                    "description": "Optional filename, e.g. 'calc_route.py'"
                }
            },
            "required": ["code"]
        },
        risk_level="HIGH",
        risk_reason="Executes arbitrary Python code in subprocess. Requires Captain Authorization to protect system integrity."
    ),
    handle_python_exec
)


async def handle_file_write(filename: str, content: str) -> Dict[str, Any]:
    """Writes or overwrites a file inside the sandbox."""
    try:
        safe_path = sandbox_executor._resolve_safe_path(filename)
        safe_path.write_text(content, encoding="utf-8")
        return {
            "success": True,
            "filename": filename,
            "bytes_written": len(content),
            "message": f"Successfully wrote {len(content)} bytes to {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

tool_registry.register(
    ToolDefinition(
        name="file_write",
        description="Write or overwrite content to a file inside the sandboxed workspace directory.",
        parameters={
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Name of the target file, e.g. 'mission_log.txt'"
                },
                "content": {
                    "type": "string",
                    "description": "Text content to write into the file"
                }
            },
            "required": ["filename", "content"]
        },
        risk_level="HIGH",
        risk_reason="Modifies files on the filesystem. Requires Captain Authorization to prevent unauthorized overwrite."
    ),
    handle_file_write
)


async def handle_shell_command(command: str) -> Dict[str, Any]:
    """Executes a whitelisted shell command inside the sandbox."""
    return await sandbox_executor.execute_shell(command=command)

tool_registry.register(
    ToolDefinition(
        name="shell_command",
        description="Run a whitelisted shell command (ls, pwd, cat, wc, stat, date) inside the sandbox folder.",
        parameters={
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Shell command to run (e.g. 'ls -lh')"
                }
            },
            "required": ["command"]
        },
        risk_level="HIGH",
        risk_reason="Shell process invocation in local environment. Requires Captain Authorization."
    ),
    handle_shell_command
)
