import logging
from typing import Dict, Any, Optional
from backend.app.agent_runtime.tools.base import Tool, ToolPermissionLevel, SideEffectLevel
from backend.app.agent_runtime.policies.permissions import AgentPolicy
from backend.app.agent_runtime.tools.registry import default_tool_registry

logger = logging.getLogger("grandline.runtime.policy")

class PolicyDecision:
    def __init__(
        self,
        allowed: bool,
        reason: str,
        requires_approval: bool = False,
        approval_action_type: Optional[str] = None,
        approval_description: Optional[str] = None,
    ):
        self.allowed = allowed
        self.reason = reason
        self.requires_approval = requires_approval
        self.approval_action_type = approval_action_type
        self.approval_description = approval_description

class PolicyEngine:
    """
    Evaluates tool execution requests against agent permissions,
    resource boundaries, side-effect classifications, and approval gates.
    """
    def __init__(self, default_policy: Optional[AgentPolicy] = None):
        self.default_policy = default_policy or AgentPolicy(agent_id="default")

    def evaluate_tool_call(
        self,
        tool: Tool,
        arguments: Dict[str, Any],
        policy: Optional[AgentPolicy] = None,
    ) -> PolicyDecision:
        active_policy = policy or self.default_policy

        # Canonicalize tool name and collect aliases
        canonical_name = default_tool_registry._aliases.get(tool.name, tool.name)
        tool_names_to_check = {tool.name, canonical_name}
        for alias, target in default_tool_registry._aliases.items():
            if target == canonical_name:
                tool_names_to_check.add(alias)

        # 1. Check if tool or any alias is in allowed_tools list
        is_allowed = any(name in active_policy.allowed_tools for name in tool_names_to_check)
        if not is_allowed:
            return PolicyDecision(
                allowed=False,
                reason=f"Tool '{tool.name}' is not in the allowed tools list for agent '{active_policy.agent_id}'."
            )

        # 2. Check maximum permission clearance
        if tool.permission_level > active_policy.max_permission_level:
            return PolicyDecision(
                allowed=False,
                reason=(
                    f"Tool '{tool.name}' requires permission level {tool.permission_level}, "
                    f"which exceeds the maximum allowed level {active_policy.max_permission_level}."
                )
            )

        # 3. High-Risk / Command Execution always requires Captain approval
        side_effect = getattr(tool, "side_effect_level", SideEffectLevel.READ_ONLY)
        requires_approval = getattr(tool, "requires_approval", False)

        if tool.permission_level == ToolPermissionLevel.LEVEL_2_COMMAND_EXEC or side_effect == SideEffectLevel.HIGH_RISK or requires_approval:
            return PolicyDecision(
                allowed=True,
                reason="High-risk action requires explicit human authorization.",
                requires_approval=True,
                approval_action_type=f"execute_{canonical_name}",
                approval_description=f"Request to execute high-impact tool '{canonical_name}' with arguments: {arguments}"
            )

        # 4. Level 1 (Write): Check overwrite approval requirement
        if canonical_name in ("workspace_write", "workspace.write_file") and active_policy.require_approval_for_overwrite:
            filepath = arguments.get("filepath", "")
            if arguments.get("overwrite", True):
                return PolicyDecision(
                    allowed=True,
                    reason="Overwriting workspace files requires approval under current policy.",
                    requires_approval=True,
                    approval_action_type="workspace_file_overwrite",
                    approval_description=f"Request to overwrite file: {filepath}"
                )

        return PolicyDecision(
            allowed=True,
            reason="Action conforms to security policy."
        )

policy_engine = PolicyEngine()
