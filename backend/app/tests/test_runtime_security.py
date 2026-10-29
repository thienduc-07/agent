import pytest
from pathlib import Path
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError
from backend.app.agent_runtime.tools.registry import default_tool_registry
from backend.app.core.config import settings

def test_safe_path_inside_workspace():
    path = safe_resolve_path("backend/app/main.py", base_root=settings.WORKSPACE_ROOT)
    assert path.exists()
    assert path.is_file()

def test_reject_dotdot_path_traversal():
    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path("../../../etc/passwd", base_root=settings.WORKSPACE_ROOT)
    assert "escapes allowed boundary" in str(exc_info.value)

def test_reject_absolute_path_outside_workspace():
    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path("/etc/shadow", base_root=settings.WORKSPACE_ROOT)
    assert "escapes allowed boundary" in str(exc_info.value)

def test_reject_env_file_access():
    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path(".env", base_root=settings.WORKSPACE_ROOT)
    assert "strictly forbidden" in str(exc_info.value)

    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path(".env.local", base_root=settings.WORKSPACE_ROOT)
    assert "strictly forbidden" in str(exc_info.value)

def test_reject_private_key_access():
    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path("id_rsa", base_root=settings.WORKSPACE_ROOT)
    assert "strictly forbidden" in str(exc_info.value)

    with pytest.raises(PathSecurityError) as exc_info:
        safe_resolve_path("certificates/server.key", base_root=settings.WORKSPACE_ROOT)
    assert "strictly forbidden" in str(exc_info.value)

@pytest.mark.asyncio
async def test_file_read_tool_blocks_path_traversal():
    result = await default_tool_registry.execute(
        tool_name="file_read",
        arguments={"filepath": "../../etc/hosts"}
    )
    assert result.success is False
    assert result.error == "SECURITY_VIOLATION"

@pytest.mark.asyncio
async def test_file_read_tool_blocks_env():
    result = await default_tool_registry.execute(
        tool_name="file_read",
        arguments={"filepath": ".env"}
    )
    assert result.success is False
    assert result.error == "SECURITY_VIOLATION"

@pytest.mark.asyncio
async def test_workspace_write_tool_blocks_traversal_outside_sandbox():
    result = await default_tool_registry.execute(
        tool_name="workspace_write",
        arguments={"filepath": "../escape.txt", "content": "malicious"}
    )
    assert result.success is False
    assert result.error == "SECURITY_VIOLATION"
