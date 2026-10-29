import pytest
from backend.app.agent_core.sandbox.executor import sandbox_executor

@pytest.mark.asyncio
async def test_python_sandbox_execution():
    code = (
        "items = [1, 2, 3, 4, 5]\n"
        "squared = [x**2 for x in items]\n"
        "print(f'Computed: {squared}')\n"
    )
    res = await sandbox_executor.execute_python(code, filename="test_calc.py")
    assert res["success"] is True
    assert res["exit_code"] == 0
    assert "Computed: [1, 4, 9, 16, 25]" in res["stdout"]

@pytest.mark.asyncio
async def test_python_sandbox_error_capture():
    code = "raise ValueError('Grand Line Sea Beast Alert!')"
    res = await sandbox_executor.execute_python(code, filename="test_err.py")
    assert res["success"] is False
    assert res["exit_code"] != 0
    assert "Grand Line Sea Beast Alert!" in res["stderr"]

@pytest.mark.asyncio
async def test_shell_command_whitelist_security():
    # Allowed command
    res_allowed = await sandbox_executor.execute_shell("echo GrandLine")
    assert res_allowed["success"] is True
    assert "GrandLine" in res_allowed["stdout"]

    # Blocked dangerous command
    res_blocked = await sandbox_executor.execute_shell("rm -rf /")
    assert res_blocked["success"] is False
    assert "Security restriction" in res_blocked["stderr"]
