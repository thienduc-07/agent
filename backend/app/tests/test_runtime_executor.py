import pytest
import os
from backend.app.agent_runtime.executor import ExecutionLoop, ExecutionResult
from backend.app.agent_runtime.tools.registry import default_tool_registry
from backend.app.agent_runtime.policies.engine import policy_engine
from backend.app.agent_runtime.policies.permissions import AgentPolicy
from backend.app.agent_runtime.verifier import result_verifier, ResultVerifier
from backend.app.agent_runtime.cancellation import CancellationToken, TaskCancelledException
from backend.app.agent_runtime.llm.deterministic_provider import DeterministicProvider
from backend.app.core.config import settings

@pytest.mark.asyncio
async def test_execution_loop_cancellation():
    executor = ExecutionLoop(
        tool_registry=default_tool_registry,
        policy_engine=policy_engine,
        verifier=result_verifier,
    )
    provider = DeterministicProvider()
    policy = AgentPolicy(agent_id="test-agent")
    token = CancellationToken()

    # Pre-cancel token
    token.cancel("User initiated abort")

    with pytest.raises(TaskCancelledException):
        await executor.run(
            task_id="cancelled-task-1",
            agent_id="test-agent",
            user_prompt="Run long operation",
            llm_provider=provider,
            agent_policy=policy,
            cancellation_token=token,
        )

def test_result_verifier_rejects_missing_file():
    outcome = ResultVerifier.verify_execution(
        artifacts=[{"filepath": "non_existent_ghost_file.txt", "absolute_path": str(settings.SANDBOX_DIR / "non_existent_ghost_file.txt")}],
        tool_results=[{"tool": "workspace_write", "success": True}],
        final_summary="Finished writing report",
    )
    assert outcome.passed is False
    assert "does not physically exist" in outcome.reason

def test_result_verifier_rejects_empty_file():
    empty_path = settings.SANDBOX_DIR / "empty_test_artifact.txt"
    empty_path.write_text("", encoding="utf-8")

    try:
        outcome = ResultVerifier.verify_execution(
            artifacts=[{"filepath": "empty_test_artifact.txt", "absolute_path": str(empty_path)}],
            tool_results=[{"tool": "workspace_write", "success": True}],
            final_summary="Finished writing report",
        )
        assert outcome.passed is False
        assert "empty (0 bytes)" in outcome.reason
    finally:
        if empty_path.exists():
            os.remove(empty_path)

def test_result_verifier_accepts_valid_file():
    valid_path = settings.SANDBOX_DIR / "valid_test_artifact.txt"
    valid_path.write_text("Valid verified content output for testing", encoding="utf-8")

    try:
        outcome = ResultVerifier.verify_execution(
            artifacts=[{"filepath": "valid_test_artifact.txt", "absolute_path": str(valid_path)}],
            tool_results=[{"tool": "workspace_write", "success": True}],
            final_summary="Finished writing report and verified content integrity.",
        )
        assert outcome.passed is True
        assert outcome.details["verified_artifacts_count"] == 1
    finally:
        if valid_path.exists():
            os.remove(valid_path)
