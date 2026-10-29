import pytest
from backend.app.agent_core.tools.registry import (
    handle_system_status,
    handle_calculator,
    handle_file_list,
    handle_file_read,
    handle_file_write
)
from backend.app.agent_core.sandbox.executor import sandbox_executor

@pytest.mark.asyncio
async def test_system_status():
    status = await handle_system_status()
    assert "platform" in status
    assert "cpu_percent" in status
    assert "memory_percent" in status
    assert status["status"] == "Operational"

@pytest.mark.asyncio
async def test_calculator_safe_eval():
    res = await handle_calculator("25 * 4 + 100 / 2")
    assert res["success"] is True
    assert res["result"] == 150.0

@pytest.mark.asyncio
async def test_calculator_rejects_code_injection():
    res = await handle_calculator("__import__('os').system('echo pwned')")
    assert res["success"] is False
    assert "error" in res

@pytest.mark.asyncio
async def test_sandbox_file_lifecycle_and_path_traversal():
    # Write a test file
    write_res = await handle_file_write("test_grandline.txt", "Gold Roger's Treasure coordinates: 12.34, 56.78")
    assert write_res["success"] is True

    # Read the test file
    read_res = await handle_file_read("test_grandline.txt")
    assert "Treasure coordinates" in read_res["content"]

    # Test path traversal attack prevention
    with pytest.raises(PermissionError):
        sandbox_executor._resolve_safe_path("../../../etc/passwd")
