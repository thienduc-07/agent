import json
import logging
from typing import List, Dict, Set, Optional
from pydantic import BaseModel, Field, ValidationError

from backend.app.agent_runtime.registry.agent_registry import default_agent_registry
from backend.app.agent_runtime.llm.base import LLMProvider

logger = logging.getLogger("grandline.runtime.multi_agent_planner")

MAX_WORKFLOW_SUBTASKS = 8

class DAGValidationError(Exception):
    """Raised when a workflow plan violates DAG constraints or contains cycles."""
    pass

class SubtaskPlanItem(BaseModel):
    subtask_key: str = Field(..., description="Unique subtask key, e.g. 'research_01'")
    title: str = Field(..., description="Short descriptive title of subtask")
    description: str = Field(..., description="Detailed instructions for the assigned agent")
    agent_type: str = Field(..., description="Specialized agent type: research, analyst, writer, reviewer, general")
    dependencies: List[str] = Field(default_factory=list, description="List of prerequisite subtask_keys")
    expected_output: str = Field(default="", description="Description of the expected artifact or result")
    priority: str = Field(default="normal", description="Priority level: low, normal, high")

class WorkflowPlan(BaseModel):
    goal: str = Field(..., description="High-level goal of the multi-agent workflow")
    subtasks: List[SubtaskPlanItem] = Field(..., description="List of subtasks forming a DAG")

class MultiAgentPlanner:
    def __init__(self, registry=None):
        self.registry = registry or default_agent_registry

    def validate_dag(self, plan: WorkflowPlan) -> List[str]:
        """
        Validates that subtasks form a valid Directed Acyclic Graph (DAG).
        Returns topological ordering of subtask_keys if valid.
        Raises DAGValidationError if invalid or cycles exist.
        """
        if not plan.subtasks:
            raise DAGValidationError("Workflow plan must contain at least one subtask.")

        if len(plan.subtasks) > MAX_WORKFLOW_SUBTASKS:
            raise DAGValidationError(
                f"Workflow plan exceeds maximum subtask limit of {MAX_WORKFLOW_SUBTASKS} "
                f"(received {len(plan.subtasks)} subtasks)."
            )

        keys: Set[str] = set()
        for st in plan.subtasks:
            if st.subtask_key in keys:
                raise DAGValidationError(f"Duplicate subtask_key detected: '{st.subtask_key}'")
            keys.add(st.subtask_key)

            # Validate agent_type
            agent_def = self.registry.get(st.agent_type)
            if not agent_def or not agent_def.enabled:
                raise DAGValidationError(
                    f"Subtask '{st.subtask_key}' requests unknown or disabled agent_type: '{st.agent_type}'"
                )

        # Validate that all dependencies exist
        adj: Dict[str, List[str]] = {st.subtask_key: [] for st in plan.subtasks}
        in_degree: Dict[str, int] = {st.subtask_key: 0 for st in plan.subtasks}

        for st in plan.subtasks:
            for dep in st.dependencies:
                if dep == st.subtask_key:
                    raise DAGValidationError(f"Subtask '{st.subtask_key}' cannot depend on itself.")
                if dep not in keys:
                    raise DAGValidationError(
                        f"Subtask '{st.subtask_key}' references non-existent dependency: '{dep}'"
                    )
                adj[dep].append(st.subtask_key)
                in_degree[st.subtask_key] += 1

        # Kahn's algorithm for cycle detection and topological sorting
        queue = [k for k, deg in in_degree.items() if deg == 0]
        topological_order = []

        while queue:
            curr = queue.pop(0)
            topological_order.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(topological_order) != len(plan.subtasks):
            cycle_nodes = [k for k, deg in in_degree.items() if deg > 0]
            raise DAGValidationError(
                f"Dependency cycle detected involving subtasks: {cycle_nodes}"
            )

        return topological_order

    def generate_deterministic_plan(self, title: str, description: str) -> WorkflowPlan:
        """
        Creates a structured multi-agent plan deterministically when offline or using deterministic provider.
        """
        desc_lower = (title + " " + description).lower()
        needs_analysis = any(w in desc_lower for w in ["analys", "metric", "calc", "data", "benchmark", "số liệu", "tính"])

        if needs_analysis:
            subtasks = [
                SubtaskPlanItem(
                    subtask_key="research_01",
                    title="Research & Source Telemetry Collection",
                    description=f"Inspect workspace files and gather raw configuration and structure data for: {title}",
                    agent_type="research",
                    dependencies=[],
                    expected_output="Verified file paths, directory inventory, and relevant documentation sources",
                    priority="high"
                ),
                SubtaskPlanItem(
                    subtask_key="analysis_01",
                    title="Data Analysis & Quantitative Verification",
                    description="Analyze gathered data, compute metrics via calculator, and extract operational patterns",
                    agent_type="analyst",
                    dependencies=["research_01"],
                    expected_output="Statistical analysis, numerical computations, and key metric summaries",
                    priority="normal"
                ),
                SubtaskPlanItem(
                    subtask_key="report_01",
                    title="Synthesis & Report Generation",
                    description="Synthesize research and quantitative analysis into a verified markdown report in workspace_sandbox/",
                    agent_type="writer",
                    dependencies=["research_01", "analysis_01"],
                    expected_output="Complete markdown report written to workspace_sandbox/multiagent_report.md",
                    priority="normal"
                ),
                SubtaskPlanItem(
                    subtask_key="review_01",
                    title="Final Quality & Verification Audit",
                    description="Review the generated report for accuracy, claim validation, and requirement fulfillment",
                    agent_type="reviewer",
                    dependencies=["report_01"],
                    expected_output="Audit verdict (APPROVED / REVISIONS_NEEDED) and checklist verification",
                    priority="normal"
                )
            ]
        else:
            subtasks = [
                SubtaskPlanItem(
                    subtask_key="research_01",
                    title="Workspace Inspection & Document Gathering",
                    description=f"Inspect workspace repository structure, read relevant documentation, and extract evidence for: {title}",
                    agent_type="research",
                    dependencies=[],
                    expected_output="Structured research notes, verified file paths, and factual excerpts",
                    priority="high"
                ),
                SubtaskPlanItem(
                    subtask_key="report_01",
                    title="Report Synthesis & Artifact Writing",
                    description="Synthesize research findings into a comprehensive, verified markdown report in workspace_sandbox/",
                    agent_type="writer",
                    dependencies=["research_01"],
                    expected_output="Complete markdown report written to workspace_sandbox/multiagent_report.md",
                    priority="normal"
                ),
                SubtaskPlanItem(
                    subtask_key="review_01",
                    title="Quality Audit & Specification Review",
                    description="Review the written report against original user objectives, verify sandbox file existence, and issue verdict",
                    agent_type="reviewer",
                    dependencies=["report_01"],
                    expected_output="Audit verdict (APPROVED) and verification report",
                    priority="normal"
                )
            ]

        plan = WorkflowPlan(
            goal=f"Execute multi-agent workflow: {title}",
            subtasks=subtasks
        )
        self.validate_dag(plan)
        return plan

    async def create_plan(
        self,
        task_title: str,
        task_description: str,
        llm_provider: LLMProvider,
    ) -> WorkflowPlan:
        """
        Decomposes a user task into a structured Multi-Agent DAG plan via LLM or deterministic fallback.
        """
        available_agents = self.registry.list_active()
        agent_catalog = "\n".join([
            f"- {a.agent_type}: {a.display_name} ({a.description}). Allowed tools: {', '.join(a.allowed_tools)}"
            for a in available_agents
        ])

        system_prompt = (
            "You are the Multi-Agent Fleet Orchestrator Planner in AI Agent City.\n"
            "Your job is to decompose the user's high-level request into a structured Directed Acyclic Graph (DAG) of subtasks.\n"
            "Each subtask must be assigned to an appropriate specialized agent type.\n\n"
            f"Available Agent Types:\n{agent_catalog}\n\n"
            "Strict Rules:\n"
            "1. Output MUST be valid JSON matching this schema:\n"
            "{\n"
            '  "goal": "High level workflow goal",\n'
            '  "subtasks": [\n'
            '    {\n'
            '      "subtask_key": "unique_id_like_research_01",\n'
            '      "title": "Short title",\n'
            '      "description": "Specific actionable prompt for agent",\n'
            '      "agent_type": "research | analyst | writer | reviewer | general",\n'
            '      "dependencies": ["list_of_prerequisite_subtask_keys"],\n'
            '      "expected_output": "What artifact or result this produces",\n'
            '      "priority": "normal"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            f"2. Maximum {MAX_WORKFLOW_SUBTASKS} subtasks. NO cyclic dependencies.\n"
            "3. Dependencies must reference only earlier subtask_keys in this plan.\n"
            "4. For research/documentation tasks, follow a pipeline: research -> writer -> reviewer."
        )

        user_content = (
            f"Decompose this mission into a multi-agent DAG workflow:\n"
            f"Title: {task_title}\n"
            f"Description: {task_description}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        try:
            response = await llm_provider.generate(messages, temperature=0.1)
            raw = (response.content or "").strip()
            
            # Clean markdown code blocks
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()

            parsed = json.loads(raw)
            plan = WorkflowPlan(**parsed)
            self.validate_dag(plan)
            logger.info(f"Successfully generated LLM multi-agent plan with {len(plan.subtasks)} subtasks")
            return plan

        except Exception as e:
            logger.warning(
                f"LLM multi-agent plan generation failed or produced invalid DAG ({e}). "
                f"Falling back to safe deterministic DAG plan."
            )
            return self.generate_deterministic_plan(task_title, task_description)
