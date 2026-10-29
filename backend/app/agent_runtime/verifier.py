import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

class VerificationOutcome:
    def __init__(self, passed: bool, reason: str, details: Optional[Dict[str, Any]] = None):
        self.passed = passed
        self.reason = reason
        self.details = details or {}

class ResultVerifier:
    """
    Verifies that the executed task produced real, non-empty, and verifiable outputs
    before allowing the task to transition to COMPLETED.
    """
    @staticmethod
    def verify_execution(
        artifacts: List[Dict[str, Any]],
        tool_results: List[Dict[str, Any]],
        final_summary: str,
    ) -> VerificationOutcome:
        # 1. If any artifact was recorded as created, verify physical file on disk
        for artifact in artifacts:
            filepath = artifact.get("filepath")
            abs_path = artifact.get("absolute_path")

            target = Path(abs_path) if abs_path else settings.WORKSPACE_ROOT / filepath
            if not target.exists():
                return VerificationOutcome(
                    passed=False,
                    reason=f"Claimed output file does not physically exist on disk: '{filepath}'"
                )

            if target.stat().st_size <= 0:
                return VerificationOutcome(
                    passed=False,
                    reason=f"Claimed output file exists but is empty (0 bytes): '{filepath}'"
                )

        # 2. Check if at least one tool executed successfully
        successful_tools = [t for t in tool_results if t.get("success") is True]
        if not successful_tools and not artifacts:
            return VerificationOutcome(
                passed=False,
                reason="No tools executed successfully to verify task completion."
            )

        # 3. Check that the final summary is meaningful and not empty
        if not final_summary or len(final_summary.strip()) < 10:
            return VerificationOutcome(
                passed=False,
                reason="Task completion summary is empty or too short."
            )

        return VerificationOutcome(
            passed=True,
            reason="All execution criteria and physical artifacts verified successfully.",
            details={
                "verified_artifacts_count": len(artifacts),
                "successful_tool_count": len(successful_tools),
            }
        )

result_verifier = ResultVerifier()
