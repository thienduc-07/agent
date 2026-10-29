import pytest
from sqlalchemy.exc import IntegrityError
from backend.app.models.task import TaskModel
from backend.app.models.task_step import TaskStepModel
from backend.app.models.agent_event import AgentEventModel

def test_sqlite_foreign_key_enforcement(db_session):
    # Attempt to insert a TaskStep for a non-existent task
    orphaned_step = TaskStepModel(
        id="orphaned-step-1",
        task_id="non-existent-task-uuid",
        step_index=1,
        title="Orphaned Step",
        status="pending"
    )
    db_session.add(orphaned_step)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_unique_constraint_task_step_index(db_session, seed_test_agent):
    task = TaskModel(
        id="task-steps-constraint-test",
        title="Multi-step Mission",
        description="Testing unique step indices",
        status="queued",
        priority="normal",
        assigned_agent_id=seed_test_agent.id
    )
    db_session.add(task)
    db_session.commit()

    step1 = TaskStepModel(
        id="step-uuid-1",
        task_id=task.id,
        step_index=1,
        title="Step One",
        status="pending"
    )
    db_session.add(step1)
    db_session.commit()

    # Step with duplicate (task_id, step_index) must violate unique constraint
    duplicate_index_step = TaskStepModel(
        id="step-uuid-2",
        task_id=task.id,
        step_index=1,  # Same index as step1
        title="Conflicting Step",
        status="pending"
    )
    db_session.add(duplicate_index_step)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_transaction_rollback_integrity(db_session, seed_test_agent):
    # Simulate a transaction failure: adding valid task then failing
    task = TaskModel(
        id="task-rollback-test",
        title="Rollback Test Task",
        description="Verify rollback prevents orphaned state",
        status="queued",
        priority="normal",
        assigned_agent_id=seed_test_agent.id
    )
    event = AgentEventModel(
        id="event-rollback-test",
        event_type="task.created",
        task_id=task.id,
        agent_id=seed_test_agent.id
    )
    db_session.add(task)
    db_session.add(event)

    # Intentionally trigger rollback
    db_session.rollback()

    # Verify neither task nor event were committed
    persisted_task = db_session.query(TaskModel).filter(TaskModel.id == "task-rollback-test").first()
    persisted_event = db_session.query(AgentEventModel).filter(AgentEventModel.id == "event-rollback-test").first()

    assert persisted_task is None
    assert persisted_event is None
