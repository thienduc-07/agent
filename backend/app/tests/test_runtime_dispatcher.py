import pytest
from datetime import datetime
from backend.app.models.task import TaskModel
from backend.app.models.agent import AgentModel
from backend.app.agent_runtime.dispatcher.crash_recovery import recover_abandoned_tasks

def test_crash_recovery_resolves_abandoned_tasks(db_session, seed_test_agent):
    # Simulate an abandoned task stuck in 'running' state
    abandoned_task = TaskModel(
        id="abandoned-task-99",
        title="Interrupted Mission",
        description="Task crashed during prior server run",
        status="running",
        priority="high",
        assigned_agent_id=seed_test_agent.id,
        started_at=datetime.utcnow()
    )
    seed_test_agent.status = "working"
    seed_test_agent.current_task_id = abandoned_task.id
    db_session.add(abandoned_task)
    db_session.commit()

    # Run crash recovery
    recovered_count = recover_abandoned_tasks(db_session)
    assert recovered_count == 1

    # Verify task state changed to failed
    refreshed_task = db_session.query(TaskModel).filter(TaskModel.id == "abandoned-task-99").first()
    assert refreshed_task.status == "failed"
    assert "interruption" in refreshed_task.error_message.lower() or "restart" in refreshed_task.error_message.lower()

    # Verify agent state reset to idle
    refreshed_agent = db_session.query(AgentModel).filter(AgentModel.id == seed_test_agent.id).first()
    assert refreshed_agent.status == "idle"
    assert refreshed_agent.current_task_id is None
