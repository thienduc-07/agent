import pytest
from backend.app.agent_runtime.registry.agent_registry import (
    AgentRegistry,
    AgentDefinition,
    default_agent_registry,
    GENERAL_AGENT_DEF,
    RESEARCH_AGENT_DEF,
    ANALYST_AGENT_DEF,
    WRITER_AGENT_DEF,
    REVIEWER_AGENT_DEF,
)
from backend.app.agent_runtime.planner.multi_agent_planner import (
    MultiAgentPlanner,
    WorkflowPlan,
    SubtaskPlanItem,
    DAGValidationError,
    MAX_WORKFLOW_SUBTASKS,
)
from backend.app.agent_runtime.contracts.subtask_contract import SubtaskResultContract
from backend.app.agent_runtime.aggregator.result_aggregator import ResultAggregator
from backend.app.agent_runtime.tools.base import ToolPermissionLevel
from backend.app.models.task import TaskModel

def test_agent_registry_defaults_and_filtering():
    """Verifies that AgentRegistry returns active agents and filters disabled agents."""
    reg = AgentRegistry()
    reg.register(GENERAL_AGENT_DEF)
    reg.register(RESEARCH_AGENT_DEF)
    
    # Custom disabled agent
    disabled_agent = AgentDefinition(
        agent_type="disabled_bot",
        display_name="Disabled Bot",
        description="Disabled testing agent",
        default_assigned_agent_id="agent-disabled",
        system_prompt="Disabled",
        allowed_tools=[],
        enabled=False,
    )
    reg.register(disabled_agent)

    active = reg.list_active()
    active_types = [a.agent_type for a in active]
    assert "general" in active_types
    assert "research" in active_types
    assert "disabled_bot" not in active_types
    assert len(reg.list_all()) == 3

def test_agent_registry_permissions_and_policy():
    """Verifies that each agent definition enforces strict permission boundaries."""
    # Research Agent is strictly Read-Only Level 0
    research_policy = RESEARCH_AGENT_DEF.to_policy()
    assert research_policy.max_permission_level == ToolPermissionLevel.LEVEL_0_READ_ONLY
    assert research_policy.allow_sandbox_write is False
    assert "workspace_write" not in research_policy.allowed_tools

    # Writer Agent is Level 1 Workspace Write
    writer_policy = WRITER_AGENT_DEF.to_policy()
    assert writer_policy.max_permission_level == ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE
    assert writer_policy.allow_sandbox_write is True
    assert "workspace_write" in writer_policy.allowed_tools

def test_planner_creates_valid_dag_topological_sort():
    """Verifies that MultiAgentPlanner validates a valid DAG and produces proper topological order."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    plan = WorkflowPlan(
        goal="Test Research, Write, and Review Pipeline",
        subtasks=[
            SubtaskPlanItem(
                subtask_key="research_01",
                title="Research",
                description="Gather sources",
                agent_type="research",
                dependencies=[]
            ),
            SubtaskPlanItem(
                subtask_key="writer_01",
                title="Write Report",
                description="Synthesize report",
                agent_type="writer",
                dependencies=["research_01"]
            ),
            SubtaskPlanItem(
                subtask_key="reviewer_01",
                title="Review Report",
                description="Audit report",
                agent_type="reviewer",
                dependencies=["writer_01"]
            ),
        ]
    )

    topo_order = planner.validate_dag(plan)
    assert topo_order == ["research_01", "writer_01", "reviewer_01"]

def test_planner_detects_dependency_cycle():
    """Verifies that DAG cycle (A -> B -> A) is detected and rejected."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    plan = WorkflowPlan(
        goal="Cyclic Plan",
        subtasks=[
            SubtaskPlanItem(
                subtask_key="task_A",
                title="A",
                description="Step A",
                agent_type="research",
                dependencies=["task_B"]
            ),
            SubtaskPlanItem(
                subtask_key="task_B",
                title="B",
                description="Step B",
                agent_type="writer",
                dependencies=["task_A"]
            ),
        ]
    )

    with pytest.raises(DAGValidationError, match="Dependency cycle detected"):
        planner.validate_dag(plan)

def test_planner_detects_self_dependency():
    """Verifies that self-referencing subtask (A -> A) is rejected."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    plan = WorkflowPlan(
        goal="Self Reference Plan",
        subtasks=[
            SubtaskPlanItem(
                subtask_key="task_self",
                title="Self",
                description="Self dependency",
                agent_type="research",
                dependencies=["task_self"]
            )
        ]
    )

    with pytest.raises(DAGValidationError, match="cannot depend on itself"):
        planner.validate_dag(plan)

def test_planner_detects_missing_dependency():
    """Verifies that referencing a non-existent subtask raises validation error."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    plan = WorkflowPlan(
        goal="Missing Dep Plan",
        subtasks=[
            SubtaskPlanItem(
                subtask_key="task_real",
                title="Real",
                description="Depends on ghost",
                agent_type="research",
                dependencies=["non_existent_subtask_99"]
            )
        ]
    )

    with pytest.raises(DAGValidationError, match="non-existent dependency"):
        planner.validate_dag(plan)

def test_planner_rejects_unknown_agent_type():
    """Verifies that requesting an unregistered agent type is rejected."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    plan = WorkflowPlan(
        goal="Invalid Agent Plan",
        subtasks=[
            SubtaskPlanItem(
                subtask_key="task_rogue",
                title="Rogue",
                description="Invalid agent",
                agent_type="hacker_agent_007",
                dependencies=[]
            )
        ]
    )

    with pytest.raises(DAGValidationError, match="unknown or disabled agent_type"):
        planner.validate_dag(plan)

def test_planner_rejects_subtasks_exceeding_limit():
    """Verifies that plans exceeding MAX_WORKFLOW_SUBTASKS are rejected."""
    planner = MultiAgentPlanner(registry=default_agent_registry)
    excess_subtasks = [
        SubtaskPlanItem(
            subtask_key=f"sub_{i}",
            title=f"Sub {i}",
            description="Exceeds limit",
            agent_type="research",
            dependencies=[]
        )
        for i in range(MAX_WORKFLOW_SUBTASKS + 2)
    ]
    plan = WorkflowPlan(goal="Excessive Plan", subtasks=excess_subtasks)

    with pytest.raises(DAGValidationError, match="exceeds maximum subtask limit"):
        planner.validate_dag(plan)

def test_subtask_contract_serialization_and_validation():
    """Verifies SubtaskResultContract serialization, evidence citations, and schema fields."""
    contract = SubtaskResultContract(
        task_id="subtask_123",
        subtask_key="research_01",
        parent_task_id="wf_456",
        agent_id="agent-nami-navigator",
        agent_type="research",
        status="completed",
        summary="Discovered 3 key architectural components.",
        output="Workspace analysis details...",
        evidence=["README.md", "ARCHITECTURE.md"],
        artifact_ids=[],
        warnings=["Non-critical warning"],
    )

    d = contract.to_dict()
    assert d["task_id"] == "subtask_123"
    assert d["agent_type"] == "research"
    assert "README.md" in d["evidence"]
    assert d["status"] == "completed"

def test_result_aggregator_synthesizes_report_and_verifies_completeness():
    """Verifies ResultAggregator correctly identifies full completion vs partial failure."""
    parent = TaskModel(id="wf_test", title="Audit Grand Line Systems")
    st1 = TaskModel(id="st_1", status="completed", title="Research", agent_type="research", assigned_agent_id="agent-nami-navigator")
    st2 = TaskModel(id="st_2", status="completed", title="Synthesis", agent_type="writer", assigned_agent_id="agent-franky-shipwright")
    st3 = TaskModel(id="st_3", status="completed", title="Quality Review", agent_type="reviewer", assigned_agent_id="agent-zoro-quartermaster")

    results = {
        "st_1": SubtaskResultContract(
            task_id="st_1", subtask_key="r1", agent_id="agent-nami", agent_type="research",
            status="completed", summary="Found 12 telemetry endpoints", output="Full output...", evidence=["system.py"]
        ),
        "st_2": SubtaskResultContract(
            task_id="st_2", subtask_key="w1", agent_id="agent-franky", agent_type="writer",
            status="completed", summary="Generated verified markdown report", output="Full report...", artifact_ids=["workspace_sandbox/report.md"]
        ),
        "st_3": SubtaskResultContract(
            task_id="st_3", subtask_key="rv1", agent_id="agent-zoro", agent_type="reviewer",
            status="completed", summary="Audited report", output="APPROVED - High quality", warnings=[]
        ),
    }

    agg = ResultAggregator.aggregate_workflow_results(parent, [st1, st2, st3], results)
    assert agg["is_success"] is True
    assert agg["has_partial_failure"] is False
    assert agg["completed_count"] == 3
    assert "system.py" in agg["evidence"]
    assert "workspace_sandbox/report.md" in agg["artifacts"]
    assert agg["reviewer_verdict"] == "APPROVED"
    assert "Multi-Agent Workflow Execution Report" in agg["final_summary"]

def test_result_aggregator_detects_failed_subtask():
    """Verifies that a failed subtask causes workflow to be marked partially failed."""
    parent = TaskModel(id="wf_fail", title="Failed Workflow")
    st1 = TaskModel(id="st_1", status="completed", title="Research", agent_type="research", assigned_agent_id="agent-nami-navigator")
    st2 = TaskModel(id="st_2", status="failed", title="Synthesis", agent_type="writer", assigned_agent_id="agent-franky-shipwright", error_message="Disk quota exceeded")

    results = {
        "st_1": SubtaskResultContract(
            task_id="st_1", subtask_key="r1", agent_id="agent-nami", agent_type="research",
            status="completed", summary="Found docs", output="Details", evidence=[]
        )
    }

    agg = ResultAggregator.aggregate_workflow_results(parent, [st1, st2], results)
    assert agg["is_success"] is False
    assert agg["has_partial_failure"] is True
    assert agg["completed_count"] == 1
    assert agg["failed_count"] == 1
