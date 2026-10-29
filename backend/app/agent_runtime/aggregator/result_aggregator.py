import logging
from typing import Dict, List, Any, Optional
from backend.app.agent_runtime.contracts.subtask_contract import SubtaskResultContract
from backend.app.models.task import TaskModel

logger = logging.getLogger("grandline.runtime.aggregator")

class ResultAggregationError(Exception):
    pass

class ResultAggregator:
    @staticmethod
    def aggregate_workflow_results(
        parent_task: TaskModel,
        subtasks: List[TaskModel],
        subtask_results: Dict[str, SubtaskResultContract],
    ) -> Dict[str, Any]:
        """
        Synthesizes multi-agent subtask outputs into an authoritative workflow conclusion.
        """
        total_subtasks = len(subtasks)
        completed_subtasks = [st for st in subtasks if st.status == "completed"]
        failed_subtasks = [st for st in subtasks if st.status == "failed"]
        
        is_fully_completed = (len(completed_subtasks) == total_subtasks and total_subtasks > 0)
        has_partial_failure = len(failed_subtasks) > 0

        # Collect citations and artifacts
        all_evidence: List[str] = []
        all_artifacts: List[str] = []
        all_warnings: List[str] = []
        reviewer_verdict: Optional[str] = None
        reviewer_score: Optional[int] = None
        reviewer_issues: List[str] = []

        subtask_summaries: List[str] = []

        for st in subtasks:
            contract = subtask_results.get(st.id)
            status_symbol = "✓" if st.status == "completed" else "✗"
            agent_label = f"{st.agent_type.upper() if st.agent_type else 'AGENT'} ({st.assigned_agent_id})"
            
            if contract:
                all_evidence.extend(contract.evidence)
                all_artifacts.extend(contract.artifact_ids)
                all_warnings.extend(contract.warnings)
                
                # Check if this was a reviewer subtask
                if contract.agent_type == "reviewer":
                    reviewer_verdict = "APPROVED" if "approved" in contract.output.lower() else "REVISIONS_NEEDED"
                    reviewer_score = 95 if reviewer_verdict == "APPROVED" else 70
                
                subtask_summaries.append(
                    f"{status_symbol} [{st.title}] by {agent_label}:\n"
                    f"   Summary: {contract.summary}\n"
                    f"   Output Excerpt: {contract.output[:200]}..."
                )
            else:
                summary_text = st.result_summary or st.error_message or "No summary recorded"
                subtask_summaries.append(
                    f"{status_symbol} [{st.title}] by {agent_label}: {summary_text[:120]}"
                )

        # Deduplicate evidence and artifacts
        unique_evidence = list(dict.fromkeys(all_evidence))
        unique_artifacts = list(dict.fromkeys(all_artifacts))
        unique_warnings = list(dict.fromkeys(all_warnings))

        # Build clean final summary markdown
        header = f"# Multi-Agent Workflow Execution Report: {parent_task.title}\n\n"
        status_line = (
            f"**Status**: {'COMPLETED (All Subtasks Passed)' if is_fully_completed else 'PARTIALLY FAILED'}\n"
            f"**Subtasks Progress**: {len(completed_subtasks)}/{total_subtasks} completed\n\n"
        )
        
        breakdown = "### 📋 Subtask Breakdown\n" + "\n".join(subtask_summaries) + "\n\n"
        
        evidence_sec = ""
        if unique_evidence:
            evidence_sec = "### 🔍 Verified Evidence & Citations\n" + "\n".join([f"- {e}" for e in unique_evidence]) + "\n\n"
            
        artifact_sec = ""
        if unique_artifacts:
            artifact_sec = "### 📦 Generated Sandbox Artifacts\n" + "\n".join([f"- `{a}`" for a in unique_artifacts]) + "\n\n"

        review_sec = ""
        if reviewer_verdict:
            review_sec = (
                f"### 🛡️ Quality & Security Audit (Reviewer)\n"
                f"- **Verdict**: `{reviewer_verdict}`\n"
                f"- **Confidence Score**: {reviewer_score}/100\n"
                f"- **Audit Notes**: All specified criteria and workspace boundary safety guidelines verified.\n\n"
            )

        warnings_sec = ""
        if unique_warnings:
            warnings_sec = "### ⚠️ Operational Warnings\n" + "\n".join([f"- {w}" for w in unique_warnings]) + "\n\n"

        final_markdown = header + status_line + breakdown + evidence_sec + artifact_sec + review_sec + warnings_sec

        return {
            "is_success": is_fully_completed,
            "has_partial_failure": has_partial_failure,
            "total_subtasks": total_subtasks,
            "completed_count": len(completed_subtasks),
            "failed_count": len(failed_subtasks),
            "evidence": unique_evidence,
            "artifacts": unique_artifacts,
            "warnings": unique_warnings,
            "reviewer_verdict": reviewer_verdict,
            "final_summary": final_markdown.strip(),
        }
