import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models import AgentModel, TaskModel, EventLogModel, PendingActionModel
from backend.app.schemas import AgentResponse
from backend.app.agent_core.providers import get_provider
from backend.app.agent_core.tools.registry import tool_registry
from backend.app.websocket_manager import ws_manager

logger = logging.getLogger("grandline.orchestrator")

class AgentOrchestrator:
    """
    Manages the lifecycle, state transitions, tool execution,
    and Captain's Approval workflow for Grand Line agents.
    """

    async def log_event(
        self,
        db: Session,
        task_id: str,
        agent_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> EventLogModel:
        event = EventLogModel(
            task_id=task_id,
            agent_id=agent_id,
            event_type=event_type,
            payload=payload,
            timestamp=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Broadcast event in real-time
        await ws_manager.broadcast("event_logged", {
            "id": event.id,
            "task_id": task_id,
            "agent_id": agent_id,
            "event_type": event_type,
            "payload": payload,
            "timestamp": event.timestamp.isoformat()
        })
        return event

    async def update_agent_status(
        self,
        db: Session,
        agent: AgentModel,
        status: str,
        current_task_id: Optional[str] = None
    ):
        agent.status = status
        if current_task_id is not None:
            agent.current_task_id = current_task_id
        db.commit()
        db.refresh(agent)

        await ws_manager.broadcast("agent_status", {
            "agent_id": agent.id,
            "name": agent.name,
            "station": agent.station,
            "status": agent.status,
            "current_task_id": agent.current_task_id
        })

    async def run_task(
        self,
        task_id: str,
        db: Session,
        provider_name: Optional[str] = None
    ):
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        agent = db.query(AgentModel).filter(AgentModel.id == task.agent_id).first()
        if not agent:
            logger.error(f"Agent {task.agent_id} not found for task {task_id}")
            return

        provider = get_provider(provider_name)
        tool_schemas = tool_registry.get_schemas()

        # Update initial states
        task.status = "IN_PROGRESS"
        db.commit()

        await self.update_agent_status(db, agent, "THINKING", current_task_id=task.id)
        await self.log_event(db, task.id, agent.id, "STEP_START", {
            "prompt": task.prompt,
            "provider": provider.__class__.__name__
        })

        messages: List[Dict[str, Any]] = [
            {"role": "user", "content": task.prompt}
        ]

        # Multi-step loop with safety limit (max 5 iterations)
        for step_idx in range(5):
            step_res = await provider.generate_step(messages=messages, tools=tool_schemas)

            # Record thought
            if step_res.thought:
                await self.log_event(db, task.id, agent.id, "AGENT_THOUGHT", {
                    "step": step_idx + 1,
                    "thought": step_res.thought
                })

            # Check if provider chose to call a tool
            if step_res.tool_call:
                tool_name = step_res.tool_call.tool_name
                tool_args = step_res.tool_call.arguments
                tool_def = tool_registry.get(tool_name)

                if not tool_def:
                    err_msg = f"Unknown tool: '{tool_name}'"
                    messages.append({"role": "tool", "name": tool_name, "content": {"error": err_msg}})
                    continue

                # RISK CHECK: Does this tool require Captain Approval?
                if tool_def.risk_level == "HIGH":
                    task.status = "AWAITING_APPROVAL"
                    task.risk_level = "HIGH"
                    db.commit()

                    # Create PendingAction
                    pending = PendingActionModel(
                        task_id=task.id,
                        agent_id=agent.id,
                        tool_name=tool_name,
                        tool_args=tool_args,
                        risk_reason=tool_def.risk_reason or "High risk action requires Captain Authorization."
                    )
                    db.add(pending)
                    db.commit()
                    db.refresh(pending)

                    await self.update_agent_status(db, agent, "AWAITING_APPROVAL")
                    await self.log_event(db, task.id, agent.id, "APPROVAL_REQUIRED", {
                        "action_id": pending.id,
                        "tool_name": tool_name,
                        "tool_args": tool_args,
                        "risk_reason": pending.risk_reason
                    })

                    # Broadcast approval required notice
                    await ws_manager.broadcast("approval_required", {
                        "action_id": pending.id,
                        "task_id": task.id,
                        "agent_id": agent.id,
                        "agent_name": agent.name,
                        "tool_name": tool_name,
                        "tool_args": tool_args,
                        "risk_reason": pending.risk_reason
                    })
                    
                    # Agent halts here! Will resume upon Captain decision.
                    return

                # Safe Tool Execution
                await self.update_agent_status(db, agent, "EXECUTING_TOOL")
                await self.log_event(db, task.id, agent.id, "TOOL_CALL", {
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "risk_level": "SAFE"
                })

                # Execute
                tool_output = await tool_registry.execute(tool_name, tool_args)

                await self.log_event(db, task.id, agent.id, "TOOL_RESULT", {
                    "tool_name": tool_name,
                    "output": tool_output
                })

                # Append to messages for next cycle
                messages.append({"role": "tool", "name": tool_name, "content": tool_output})
                continue

            # If task is completed
            if step_res.is_done:
                task.status = "COMPLETED"
                task.result = step_res.final_response
                db.commit()

                await self.update_agent_status(db, agent, "IDLE", current_task_id=None)
                await self.log_event(db, task.id, agent.id, "TASK_COMPLETED", {
                    "result": task.result
                })

                await ws_manager.broadcast("task_completed", {
                    "task_id": task.id,
                    "agent_id": agent.id,
                    "result": task.result
                })
                return

        # Exceeded iterations without completion
        task.status = "COMPLETED"
        task.result = "Task reached maximum execution steps."
        db.commit()
        await self.update_agent_status(db, agent, "IDLE", current_task_id=None)

    async def handle_approval_decision(
        self,
        action_id: str,
        decision: str,
        reason: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Handles Captain's Authorization decision (APPROVE or REJECT)."""
        pending = db.query(PendingActionModel).filter(PendingActionModel.id == action_id).first()
        if not pending:
            return {"success": False, "error": f"PendingAction {action_id} not found"}

        if pending.status != "PENDING":
            return {"success": False, "error": f"Action {action_id} is already {pending.status}"}

        task = db.query(TaskModel).filter(TaskModel.id == pending.task_id).first()
        agent = db.query(AgentModel).filter(AgentModel.id == pending.agent_id).first()

        pending.status = decision
        pending.decided_at = datetime.utcnow()
        db.commit()

        await self.log_event(db, task.id, agent.id, "APPROVAL_DECISION", {
            "action_id": pending.id,
            "decision": decision,
            "reason": reason
        })

        if decision == "REJECT":
            task.status = "CANCELLED"
            task.error = f"Captain Veto: Tool execution of '{pending.tool_name}' was denied. Reason: {reason or 'No reason provided'}"
            db.commit()

            await self.update_agent_status(db, agent, "IDLE", current_task_id=None)
            await ws_manager.broadcast("task_cancelled", {
                "task_id": task.id,
                "agent_id": agent.id,
                "reason": task.error
            })
            return {"success": True, "status": "REJECTED"}

        # If APPROVED: Execute the risky tool now!
        await self.update_agent_status(db, agent, "EXECUTING_TOOL")
        await self.log_event(db, task.id, agent.id, "TOOL_CALL", {
            "tool_name": pending.tool_name,
            "tool_args": pending.tool_args,
            "risk_level": "HIGH",
            "authorized_by": "Captain"
        })

        tool_output = await tool_registry.execute(pending.tool_name, pending.tool_args)

        await self.log_event(db, task.id, agent.id, "TOOL_RESULT", {
            "tool_name": pending.tool_name,
            "output": tool_output
        })

        # Finalize the task with the real output
        provider = get_provider()
        messages = [
            {"role": "user", "content": task.prompt},
            {"role": "tool", "name": pending.tool_name, "content": tool_output}
        ]
        final_step = await provider.generate_step(messages=messages, tools=[])

        task.status = "COMPLETED"
        task.result = final_step.final_response or f"Execution output: {str(tool_output)}"
        db.commit()

        await self.update_agent_status(db, agent, "IDLE", current_task_id=None)
        await self.log_event(db, task.id, agent.id, "TASK_COMPLETED", {
            "result": task.result
        })

        await ws_manager.broadcast("task_completed", {
            "task_id": task.id,
            "agent_id": agent.id,
            "result": task.result
        })

        return {"success": True, "status": "APPROVED", "result": task.result}

orchestrator = AgentOrchestrator()
