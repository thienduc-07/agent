import json
import logging
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.agent_runtime.planner.schemas import AgentPlan, PlanStep
from backend.app.agent_runtime.llm.base import LLMProvider
from backend.app.agent_runtime.tools.registry import ToolRegistry

logger = logging.getLogger("grandline.runtime.planner")

class Planner:
    def __init__(self, tool_registry: ToolRegistry):
        self.tool_registry = tool_registry

    async def create_plan(
        self,
        task_title: str,
        task_description: str,
        llm_provider: LLMProvider,
        agent_role: str = "General Assistant",
    ) -> AgentPlan:
        registered_tools = self.tool_registry.list_tools()
        tools_summary = "\n".join(
            [f"- {t.name}: {t.description}" for t in registered_tools]
        )
        tool_names = {t.name for t in registered_tools}

        system_prompt = (
            f"You are the Strategic Planner for {agent_role} in AI Agent City.\n"
            "Your job is to break down the user's task into a structured, sequential plan.\n"
            "Output MUST be strict JSON matching this schema:\n"
            "{\n"
            '  "objective": "Brief summary of objective",\n'
            '  "steps": [\n'
            '    {\n'
            '      "step_index": 1,\n'
            '      "title": "Short title",\n'
            '      "description": "Specific action to perform",\n'
            '      "expected_output": "What this step produces",\n'
            '      "required_tool": "Exact tool name or null"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Available tools in registry:\n{tools_summary}\n\n"
            f"Rules:\n"
            f"1. Maximum {settings.MAX_PLAN_STEPS} steps. Do NOT produce infinite loops.\n"
            f"2. required_tool MUST be one of {list(tool_names)} or null.\n"
            f"3. Always include a final verification step using 'verification_tool' if writing files or artifacts."
        )

        user_content = (
            f"Generate an execution plan for this task:\n"
            f"Task Title: {task_title}\n"
            f"Task Description: {task_description}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        try:
            response = await llm_provider.generate(messages, temperature=0.1)
            raw_content = response.content or "{}"
            
            # Extract JSON substring if surrounded by markdown codeblocks
            clean_json = raw_content.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            parsed = json.loads(clean_json)
            raw_steps = parsed.get("steps", [])

            # Validate and clamp steps
            validated_steps: List[PlanStep] = []
            for idx, s in enumerate(raw_steps[:settings.MAX_PLAN_STEPS], start=1):
                req_tool = s.get("required_tool")
                if req_tool and req_tool not in tool_names:
                    req_tool = None # Reject unknown tool

                validated_steps.append(
                    PlanStep(
                        step_index=idx,
                        title=s.get("title", f"Step {idx}"),
                        description=s.get("description", "Execute step"),
                        expected_output=s.get("expected_output", "Success"),
                        required_tool=req_tool,
                        status="pending"
                    )
                )

            if not validated_steps:
                raise ValueError("LLM returned 0 valid plan steps.")

            return AgentPlan(
                objective=parsed.get("objective", task_title),
                steps=validated_steps
            )

        except Exception as e:
            logger.warning(f"Planner LLM generation error or invalid JSON: {e}. Falling back to default plan.")
            return self._create_fallback_plan(task_title, task_description, tool_names)

    def _create_fallback_plan(
        self,
        task_title: str,
        task_description: str,
        tool_names: set,
    ) -> AgentPlan:
        steps = [
            PlanStep(
                step_index=1,
                title="Inspect workspace context",
                description="Scan workspace files to assess context",
                expected_output="Workspace listing",
                required_tool="workspace_list" if "workspace_list" in tool_names else None,
            ),
            PlanStep(
                step_index=2,
                title="Execute primary task operation",
                description=f"Fulfill objective: {task_title}",
                expected_output="Task operation output",
                required_tool="workspace_write" if "workspace_write" in tool_names else None,
            ),
            PlanStep(
                step_index=3,
                title="Verify task outcome",
                description="Verify execution results and file integrity",
                expected_output="Verification confirmation",
                required_tool="verification_tool" if "verification_tool" in tool_names else None,
            ),
        ]
        return AgentPlan(objective=task_title, steps=steps)
