from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import AgentModel
from backend.app.schemas import AgentResponse

router = APIRouter(prefix="/api/agents", tags=["Agents"])

INITIAL_AGENTS = [
    {
        "id": "agent-captain-roger",
        "name": "Captain Gol D. Roger",
        "role": "Grand Fleet Commander",
        "station": "captain_bridge",
        "avatar": "captain",
        "color": "#f59e0b", # Amber Gold
        "pos_x": 0.0,
        "pos_y": 1.2,
        "pos_z": 0.0,
        "status": "IDLE",
        "description": "Command Citadel & Fleet Flagship. Strategic orchestration, multi-step planning, high command intelligence."
    },
    {
        "id": "agent-zoro-quartermaster",
        "name": "First Mate Zoro",
        "role": "Quartermaster & Armory Chief",
        "station": "armory_deck",
        "avatar": "swordsman",
        "color": "#10b981", # Emerald Green
        "pos_x": -6.5,
        "pos_y": 0.5,
        "pos_z": 4.0,
        "status": "IDLE",
        "description": "Coastal Armory & Harbor Docks. Host telemetry, CPU/memory performance, hardware status, and inventory tracking."
    },
    {
        "id": "agent-nami-navigator",
        "name": "Navigator Nami",
        "role": "Chief Cartographer & Scholar",
        "station": "archives_tower",
        "avatar": "scholar",
        "color": "#3b82f6", # Ocean Sapphire
        "pos_x": 6.5,
        "pos_y": 2.4,
        "pos_z": -4.0,
        "status": "IDLE",
        "description": "Observatory Lighthouse & Grand Archives. High-precision astronomical math, safe web document retrieval, intelligence queries."
    },
    {
        "id": "agent-franky-shipwright",
        "name": "Shipwright Franky",
        "role": "Master Cyborg Engineer",
        "station": "blacksmith_forge",
        "avatar": "engineer",
        "color": "#ef4444", # Molten Crimson
        "pos_x": 0.0,
        "pos_y": 0.6,
        "pos_z": -6.5,
        "status": "IDLE",
        "description": "Artillery Workshop & Molten Blacksmith Forge. High-risk Python sandbox code execution, algorithmic calculations, automated scripts."
    }
]

def seed_default_agents(db: Session):
    for a in INITIAL_AGENTS:
        existing = db.query(AgentModel).filter(AgentModel.id == a["id"]).first()
        if not existing:
            agent = AgentModel(**a)
            db.add(agent)
    db.commit()

@router.get("", response_model=List[AgentResponse])
def get_all_agents(db: Session = Depends(get_db)):
    agents = db.query(AgentModel).all()
    if not agents:
        seed_default_agents(db)
        agents = db.query(AgentModel).all()
    return agents

@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(AgentModel).filter(AgentModel.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
