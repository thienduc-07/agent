from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from backend.app.schemas.task import TaskResponse
from backend.app.services.agent_service import agent_service

from backend.app.agent_runtime.registry.agent_registry import default_agent_registry
from backend.app.core.errors import NotFoundError

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("/registry")
def list_agent_registry_definitions():
    """Lists all active specialized agent definitions and capabilities."""
    return [a.model_dump() for a in default_agent_registry.list_active()]

@router.get("/registry/{agent_type}")
def get_agent_registry_definition(agent_type: str):
    """Retrieves definition, system prompt, and allowed tools for a specific agent type."""
    defn = default_agent_registry.get(agent_type)
    if not defn or not defn.enabled:
        raise NotFoundError(message=f"Agent definition '{agent_type}' not found or disabled", code="AGENT_TYPE_NOT_FOUND")
    return defn.model_dump()

@router.get("", response_model=List[AgentResponse])
def list_agents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return agent_service.list_agents(db=db, limit=limit, offset=offset)

@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    return agent_service.get_agent_by_id(db=db, agent_id=agent_id)

@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(agent_in: AgentCreate, db: Session = Depends(get_db)):
    return agent_service.create_agent(db=db, agent_in=agent_in)

@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, agent_in: AgentUpdate, db: Session = Depends(get_db)):
    return agent_service.update_agent(db=db, agent_id=agent_id, agent_in=agent_in)

@router.get("/{agent_id}/tasks", response_model=List[TaskResponse])
def get_agent_tasks(
    agent_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return agent_service.get_agent_tasks(db=db, agent_id=agent_id, limit=limit, offset=offset)
