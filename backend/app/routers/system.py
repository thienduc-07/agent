from fastapi import APIRouter
from backend.app.agent_core.tools.registry import tool_registry
from backend.app.config import settings
import platform
import psutil

router = APIRouter(prefix="/api/system", tags=["System"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mode": "Grand Line Operational"
    }

@router.get("/tools")
def get_tools():
    tools = tool_registry.list_all()
    return [
        {
            "name": t.name,
            "description": t.description,
            "risk_level": t.risk_level,
            "risk_reason": t.risk_reason,
            "parameters": t.parameters
        }
        for t in tools
    ]

@router.get("/status")
def get_system_status():
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_total_gb": round(vm.total / (1024**3), 2),
        "memory_used_gb": round(vm.used / (1024**3), 2),
        "memory_percent": vm.percent,
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": disk.percent,
        "sandbox_path": str(settings.SANDBOX_DIR)
    }
