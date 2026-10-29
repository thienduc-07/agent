from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, agents, tasks, events, approvals, artifacts, workflows, memories, tools, skills

api_v1_router = APIRouter(prefix="/api/v1")

# Mount sub-routers
api_v1_router.include_router(health.router)
api_v1_router.include_router(agents.router)
api_v1_router.include_router(tasks.router)
api_v1_router.include_router(workflows.router)
api_v1_router.include_router(memories.router, prefix="/memories", tags=["memories"])
api_v1_router.include_router(tools.router)
api_v1_router.include_router(skills.router)
api_v1_router.include_router(events.router)
api_v1_router.include_router(approvals.router)
api_v1_router.include_router(artifacts.router)

