import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.tool_service import tool_service
from backend.app.agent_runtime.tools.registry import default_tool_registry
from backend.app.agent_runtime.tools.base import ToolPermissionLevel
from backend.app.schemas.tool import (
    ToolDefinitionResponse,
    ToolToggleRequest,
    ToolExecutionResponse,
    ToolTestExecuteRequest,
)

logger = logging.getLogger("grandline.api.tools")
router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("", response_model=List[ToolDefinitionResponse])
async def list_tools(
    category: Optional[str] = Query(None, description="Filter by tool category (workspace, artifact, data, web, api, memory)"),
    is_enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: Session = Depends(get_db),
):
    """
    List all registered tools in the ecosystem with their capabilities, clearance levels, and operational states.
    """
    tools = tool_service.list_tools(db, category=category, is_enabled=is_enabled)
    if not tools:
        # First-time sync
        tool_service.sync_tool_definitions(db)
        tools = tool_service.list_tools(db, category=category, is_enabled=is_enabled)
    return tools

@router.get("/executions/history", response_model=List[ToolExecutionResponse])
async def list_tool_executions(
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
    task_id: Optional[str] = Query(None, description="Filter by associated task UUID"),
    agent_id: Optional[str] = Query(None, description="Filter by executing agent"),
    status: Optional[str] = Query(None, description="Filter by execution status"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db),
):
    """
    Query the immutable tool execution audit trail with telemetry, duration, and error metrics.
    """
    return tool_service.list_executions(
        db,
        tool_name=tool_name,
        task_id=task_id,
        agent_id=agent_id,
        status=status,
        limit=limit,
    )

@router.get("/{name}", response_model=ToolDefinitionResponse)
async def get_tool(
    name: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve full specification and schema for a specific tool.
    """
    tool = tool_service.get_tool(db, name)
    if not tool:
        # Check in memory registry and sync if found
        meta = default_tool_registry.get_metadata(name)
        if meta:
            tool_service.sync_tool_definitions(db)
            tool = tool_service.get_tool(db, name)
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{name}' not found.")
    return tool

@router.post("/{name}/toggle", response_model=ToolDefinitionResponse)
async def toggle_tool(
    name: str,
    body: ToolToggleRequest = ToolToggleRequest(),
    db: Session = Depends(get_db),
):
    """
    Dynamically enable or disable a tool without redeploying the system.
    """
    updated = tool_service.toggle_tool(db, name=name, enable=body.enable)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{name}' not found.")
    return updated

@router.get("/{name}/executions", response_model=List[ToolExecutionResponse])
async def get_tool_executions(
    name: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get recent execution logs specifically for the given tool.
    """
    return tool_service.list_executions(db, tool_name=name, limit=limit)

@router.post("/{name}/test")
async def test_execute_tool(
    name: str,
    body: ToolTestExecuteRequest,
    db: Session = Depends(get_db),
):
    """
    Test-run a registered tool within safe clearance bounds with live schema verification and audit recording.
    """
    tool = default_tool_registry.get(name)
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{name}' not found.")

    if not default_tool_registry.is_enabled(name):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Tool '{name}' is currently disabled.")

    # Execute tool with LEVEL_1 clearance for test runner
    result = await default_tool_registry.execute(
        tool_name=name,
        arguments=body.arguments,
        context=None,
        max_allowed_level=ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE,
    )

    # Record in audit trail
    tool_service.record_execution(
        db=db,
        tool_name=name,
        arguments=body.arguments,
        output_summary=result.output,
        error=result.error,
        status="succeeded" if result.success else "failed",
        duration_ms=result.duration_ms,
        agent_id=body.agent_id,
        artifact_ids=result.artifact_ids,
    )

    return {
        "success": result.success,
        "output": result.output,
        "data": result.data,
        "error": result.error,
        "duration_ms": result.duration_ms,
        "artifact_ids": result.artifact_ids,
    }
