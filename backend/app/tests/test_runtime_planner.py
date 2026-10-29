import pytest
from backend.app.agent_runtime.planner.planner import Planner
from backend.app.agent_runtime.tools.registry import default_tool_registry
from backend.app.agent_runtime.llm.deterministic_provider import DeterministicProvider

@pytest.mark.asyncio
async def test_planner_creates_structured_plan():
    planner = Planner(tool_registry=default_tool_registry)
    provider = DeterministicProvider()

    plan = await planner.create_plan(
        task_title="Compile Island Defense Report",
        task_description="Read docs and compile analysis report",
        llm_provider=provider,
        agent_role="Fleet Leader",
    )

    assert plan is not None
    assert plan.objective is not None
    assert len(plan.steps) >= 2
    assert len(plan.steps) <= 8 # Capped at MAX_PLAN_STEPS

    # Verify each step structure
    for step in plan.steps:
        assert step.step_index >= 1
        assert step.title
        assert step.description
        assert step.expected_output

def test_planner_fallback_plan():
    planner = Planner(tool_registry=default_tool_registry)
    tool_names = {"workspace_list", "workspace_write", "verification_tool"}
    fallback = planner._create_fallback_plan("Fallback Task", "Testing fallback mechanism", tool_names)

    assert fallback.objective == "Fallback Task"
    assert len(fallback.steps) == 3
    assert fallback.steps[0].required_tool == "workspace_list"
    assert fallback.steps[1].required_tool == "workspace_write"
    assert fallback.steps[2].required_tool == "verification_tool"
