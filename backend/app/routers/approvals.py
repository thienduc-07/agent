from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import PendingActionModel
from backend.app.schemas import PendingActionResponse, ApprovalDecisionRequest
from backend.app.agent_core.orchestrator import orchestrator

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])

@router.get("/pending", response_model=List[PendingActionResponse])
def get_pending_actions(db: Session = Depends(get_db)):
    return db.query(PendingActionModel).filter(PendingActionModel.status == "PENDING").all()

@router.post("/decide")
async def decide_approval(
    req: ApprovalDecisionRequest,
    db: Session = Depends(get_db)
):
    if req.decision not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Decision must be either 'APPROVE' or 'REJECT'")

    result = await orchestrator.handle_approval_decision(
        action_id=req.action_id,
        decision=req.decision,
        reason=req.reason,
        db=db
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to process decision"))

    return result
