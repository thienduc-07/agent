import pytest
import os
from backend.app.agent_runtime.tools.registry import default_tool_registry, ToolRegistry
from backend.app.agent_runtime.tools.base import ToolPermissionLevel
from backend.app.core.config import settings

@pytest.mark.asyncio
async def test_workspace_list_execution():
    result = await default_tool_registry.execute(
        tool_name="workspace_list",
        arguments={"subpath": "", "max_depth": 2}
    )
    assert result.success is True
    assert result.data is not None
    assert "items" in result.data
    assert result.data["total_count"] > 0
    # Verify no file contents leaked in listing
    assert not any("content" in item for item in result.data["items"])

@pytest.mark.asyncio
async def test_file_search_execution():
    result = await default_tool_registry.execute(
        tool_name="file_search",
        arguments={"pattern": "*.py", "max_results": 10}
    )
    assert result.success is True
    assert result.data is not None
    assert len(result.data["matches"]) > 0

@pytest.mark.asyncio
async def test_workspace_write_and_verification_lifecycle():
    test_filename = "test_runtime_output.txt"
    test_content = "Grand Line Runtime Verified Artifact Content 12345"

    # 1. Write file to sandbox
    write_res = await default_tool_registry.execute(
        tool_name="workspace_write",
        arguments={"filepath": test_filename, "content": test_content}
    )
    assert write_res.success is True
    assert write_res.data["filename"] == test_filename
    assert write_res.data["size_bytes"] == len(test_content)

    # Verify physical file existence in sandbox
    expected_path = settings.SANDBOX_DIR / test_filename
    assert expected_path.exists()
    assert expected_path.read_text(encoding="utf-8") == test_content

    # 2. Verify file with verification_tool
    verify_res = await default_tool_registry.execute(
        tool_name="verification_tool",
        arguments={
            "filepath": test_filename,
            "min_size_bytes": 10,
            "required_substring": "Grand Line"
        }
    )
    assert verify_res.success is True
    assert verify_res.data["verified"] is True

    # 3. Read back file with file_read
    read_res = await default_tool_registry.execute(
        tool_name="file_read",
        arguments={"filepath": f"workspace_sandbox/{test_filename}"}
    )
    assert read_res.success is True
    assert test_content in read_res.output

    # Cleanup
    if expected_path.exists():
        os.remove(expected_path)

@pytest.mark.asyncio
async def test_unknown_tool_rejection():
    result = await default_tool_registry.execute(
        tool_name="non_existent_hack_tool",
        arguments={}
    )
    assert result.success is False
    assert result.error == "TOOL_NOT_FOUND"

@pytest.mark.asyncio
async def test_permission_level_enforcement():
    # Attempting to execute a Level 1 tool when max allowed level is Level 0 (Read only)
    result = await default_tool_registry.execute(
        tool_name="workspace_write",
        arguments={"filepath": "denied.txt", "content": "denied"},
        max_allowed_level=ToolPermissionLevel.LEVEL_0_READ_ONLY
    )
    assert result.success is False
    assert result.error == "PERMISSION_DENIED"
