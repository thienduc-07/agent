import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.tool import ToolDefinitionModel, ToolExecutionModel
from backend.app.agent_runtime.tools.registry import default_tool_registry
from backend.app.agent_runtime.tools.base import sanitize_for_audit, ToolExecutionStatus

logger = logging.getLogger("grandline.services.tool")

class ToolService:
    @staticmethod
    def sync_tool_definitions(db: Session) -> None:
        """
        Synchronizes all registered tools from default_tool_registry into the database.
        Idempotent: updates existing records and inserts new ones.
        """
        registered_metas = default_tool_registry.list_metadata()
        for meta in registered_metas:
            db_def = db.query(ToolDefinitionModel).filter(ToolDefinitionModel.name == meta.name).first()
            if not db_def:
                db_def = ToolDefinitionModel(
                    id=f"tool-{meta.name}",
                    name=meta.name,
                    display_name=meta.display_name,
                    description=meta.description,
                    version=meta.version,
                    category=meta.category.value,
                    permission_level=meta.permission_level.value,
                    side_effect_level=meta.side_effect_level.value,
                    requires_approval=meta.requires_approval,
                    is_enabled=meta.is_enabled,
                    is_healthy=meta.is_healthy,
                    rate_limit=meta.rate_limit,
                    execution_timeout=meta.timeout_seconds,
                    max_output_size=meta.max_output_size,
                    input_schema=meta.input_schema,
                    output_schema=meta.output_schema,
                    config={},
                )
                db.add(db_def)
            else:
                db_def.display_name = meta.display_name
                db_def.description = meta.description
                db_def.version = meta.version
                db_def.category = meta.category.value
                db_def.permission_level = meta.permission_level.value
                db_def.side_effect_level = meta.side_effect_level.value
                db_def.requires_approval = meta.requires_approval
                db_def.execution_timeout = meta.timeout_seconds
                db_def.max_output_size = meta.max_output_size
                db_def.input_schema = meta.input_schema
                db_def.output_schema = meta.output_schema

        db.commit()
        logger.info(f"Synchronized {len(registered_metas)} tool definitions to database.")

    @staticmethod
    def list_tools(
        db: Session,
        category: Optional[str] = None,
        is_enabled: Optional[bool] = None,
    ) -> List[ToolDefinitionModel]:
        query = db.query(ToolDefinitionModel)
        if category:
            query = query.filter(ToolDefinitionModel.category == category)
        if is_enabled is not None:
            query = query.filter(ToolDefinitionModel.is_enabled == is_enabled)
        return query.order_by(ToolDefinitionModel.category, ToolDefinitionModel.name).all()

    @staticmethod
    def get_tool(db: Session, name: str) -> Optional[ToolDefinitionModel]:
        return db.query(ToolDefinitionModel).filter(ToolDefinitionModel.name == name).first()

    @staticmethod
    def toggle_tool(db: Session, name: str, enable: Optional[bool] = None) -> Optional[ToolDefinitionModel]:
        db_tool = db.query(ToolDefinitionModel).filter(ToolDefinitionModel.name == name).first()
        if not db_tool:
            return None

        new_state = enable if enable is not None else not db_tool.is_enabled
        db_tool.is_enabled = new_state
        db_tool.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_tool)

        # Update in-memory registry state
        if new_state:
            default_tool_registry.enable_tool(name)
        else:
            default_tool_registry.disable_tool(name)

        return db_tool

    @staticmethod
    def record_execution(
        db: Session,
        tool_name: str,
        arguments: Dict[str, Any],
        output_summary: Optional[str] = None,
        error: Optional[str] = None,
        status: str = "succeeded",
        duration_ms: int = 0,
        task_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        approval_id: Optional[str] = None,
        artifact_ids: Optional[List[str]] = None,
    ) -> ToolExecutionModel:
        """
        Persists a sanitized tool execution record for auditing.
        """
        # Verify foreign keys before inserting to avoid constraint failures
        clean_task_id = task_id
        if clean_task_id:
            from backend.app.models.task import TaskModel
            if not db.query(TaskModel).filter(TaskModel.id == clean_task_id).first():
                clean_task_id = None

        clean_agent_id = agent_id
        if clean_agent_id:
            from backend.app.models.agent import AgentModel
            if not db.query(AgentModel).filter(AgentModel.id == clean_agent_id).first():
                clean_agent_id = None

        clean_approval_id = approval_id
        if clean_approval_id:
            from backend.app.models.approval import ApprovalModel
            if not db.query(ApprovalModel).filter(ApprovalModel.id == clean_approval_id).first():
                clean_approval_id = None

        sanitized_args = sanitize_for_audit(arguments)
        sanitized_output = sanitize_for_audit(output_summary[:2000]) if output_summary else None

        record = ToolExecutionModel(
            id=str(uuid.uuid4()),
            tool_name=tool_name,
            task_id=clean_task_id,
            agent_id=clean_agent_id,
            approval_id=clean_approval_id,
            status=status,
            arguments=sanitized_args if isinstance(sanitized_args, dict) else {"raw": str(sanitized_args)},
            output_summary=sanitized_output,
            error=str(error)[:1000] if error else None,
            duration_ms=duration_ms,
            artifact_ids=artifact_ids or [],
            created_at=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def list_executions(
        db: Session,
        tool_name: Optional[str] = None,
        task_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[ToolExecutionModel]:
        query = db.query(ToolExecutionModel)
        if tool_name:
            query = query.filter(ToolExecutionModel.tool_name == tool_name)
        if task_id:
            query = query.filter(ToolExecutionModel.task_id == task_id)
        if agent_id:
            query = query.filter(ToolExecutionModel.agent_id == agent_id)
        if status:
            query = query.filter(ToolExecutionModel.status == status)
        return query.order_by(ToolExecutionModel.created_at.desc()).limit(limit).all()

tool_service = ToolService()
