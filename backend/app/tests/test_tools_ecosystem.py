import pytest
import os
import json
from pathlib import Path
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import (
    ToolPermissionLevel, ToolCategory, SideEffectLevel, sanitize_for_audit
)
from backend.app.agent_runtime.tools.registry import default_tool_registry, ToolRegistry
from backend.app.agent_runtime.policies.engine import policy_engine
from backend.app.agent_runtime.policies.permissions import AgentPolicy
from backend.app.agent_runtime.tools.artifact.artifact_tools import (
    ArtifactCreateTool, ArtifactGetTool, ArtifactListTool, ArtifactVerifyTool
)
from backend.app.agent_runtime.tools.data.data_tools import (
    DataInspectTool, DataProfileTool, DataSummarizeTool, DataValidateTool
)
from backend.app.agent_runtime.tools.web.web_tools import (
    WebSearchTool, WebFetchPageTool, WebExtractTextTool, validate_ssrf_safety
)
from backend.app.agent_runtime.tools.api.api_tools import ApiCallTool
from backend.app.agent_runtime.tools.workspace.workspace_write import WorkspaceWriteTool
from backend.app.agent_runtime.tools.workspace.file_read import FileReadTool
from backend.app.agent_runtime.tools.workspace.verification import VerificationTool

@pytest.mark.asyncio
async def test_tool_registry_registration_and_aliases():
    """Verify registry registers tools and properly resolves aliases."""
    reg = ToolRegistry()
    create_tool = ArtifactCreateTool()
    reg.register(create_tool, aliases=["artifact_create", "art.new"])

    assert reg.get("artifact.create") is not None
    assert reg.get("artifact_create") is not None
    assert reg.get("art.new") is not None
    assert reg.get("nonexistent_tool") is None

    meta = reg.get_metadata("artifact.create")
    assert meta is not None
    assert meta.category == ToolCategory.ARTIFACT
    assert meta.permission_level == ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE

@pytest.mark.asyncio
async def test_tool_dynamic_enable_disable():
    """Verify tool can be dynamically enabled/disabled and execution is blocked when disabled."""
    reg = ToolRegistry()
    tool = ArtifactCreateTool()
    reg.register(tool)

    assert reg.is_enabled("artifact.create") is True

    reg.disable_tool("artifact.create")
    assert reg.is_enabled("artifact.create") is False

    res = await reg.execute("artifact.create", {"name": "test.md", "content": "hello"})
    assert res.success is False
    assert res.error == "TOOL_DISABLED"

    reg.enable_tool("artifact.create")
    assert reg.is_enabled("artifact.create") is True

@pytest.mark.asyncio
async def test_workspace_security_path_traversal():
    """Verify that path traversal attempts are strictly blocked by file tools."""
    read_tool = FileReadTool()
    res = await read_tool.execute({"filepath": "../../etc/passwd"})
    assert res.success is False
    assert res.error == "SECURITY_VIOLATION"

    write_tool = WorkspaceWriteTool()
    res = await write_tool.execute({"filepath": "../../../malicious.sh", "content": "rm -rf"})
    assert res.success is False
    assert res.error == "SECURITY_VIOLATION"

@pytest.mark.asyncio
async def test_document_and_artifact_suite(tmp_path):
    """Verify artifact.create, artifact.get, and artifact.verify lifecycle."""
    create_tool = ArtifactCreateTool()
    get_tool = ArtifactGetTool()
    verify_tool = ArtifactVerifyTool()

    # 1. Create artifact
    art_name = "test_deliverable.md"
    art_content = "# Grand Line Defense Protocol\nShield status: 100% active."
    res = await create_tool.execute({"name": art_name, "content": art_content})
    assert res.success is True
    assert "artifact_id" in res.data
    assert len(res.artifact_ids) == 1

    # 2. Get artifact
    get_res = await get_tool.execute({"name": art_name})
    assert get_res.success is True
    assert "Grand Line Defense Protocol" in get_res.output

    # 3. Verify artifact
    ver_res = await verify_tool.execute({"name": art_name, "required_format": ".md", "min_size_bytes": 10})
    assert ver_res.success is True
    assert ver_res.data["verified"] is True

@pytest.mark.asyncio
async def test_data_analysis_suite():
    """Verify data.inspect, data.profile, and data.validate on structured data."""
    # Write sample dataset into sandbox
    sample_file = settings.SANDBOX_DIR / "test_fleet.json"
    sample_file.parent.mkdir(parents=True, exist_ok=True)
    sample_data = [
        {"vessel_id": "V1", "crew": 25, "cannon_power": 150.0, "status": "active"},
        {"vessel_id": "V2", "crew": 40, "cannon_power": 220.5, "status": "active"},
        {"vessel_id": "V3", "crew": None, "cannon_power": 80.0, "status": "docked"},
    ]
    with open(sample_file, "w", encoding="utf-8") as f:
        json.dump(sample_data, f)

    inspect_tool = DataInspectTool()
    profile_tool = DataProfileTool()
    validate_tool = DataValidateTool()

    # 1. Inspect
    insp_res = await inspect_tool.execute({"filepath": "test_fleet.json"})
    assert insp_res.success is True
    assert insp_res.data["row_count"] == 3
    assert "crew" in insp_res.data["columns"]

    # 2. Profile
    prof_res = await profile_tool.execute({"filepath": "test_fleet.json"})
    assert prof_res.success is True
    assert prof_res.data["null_counts"]["crew"] == 1
    assert "cannon_power" in prof_res.data["numeric_stats"]
    assert prof_res.data["numeric_stats"]["cannon_power"]["min"] == 80.0

    # 3. Validate
    val_res = await validate_tool.execute({
        "filepath": "test_fleet.json",
        "required_columns": ["vessel_id", "status"],
        "min_rows": 2,
    })
    assert val_res.success is True
    assert val_res.data["passed"] is True

    # 4. Validate failure on null constraint
    val_fail = await validate_tool.execute({
        "filepath": "test_fleet.json",
        "no_nulls_in": ["crew"],
    })
    assert val_fail.success is False
    assert len(val_fail.data["violations"]) > 0

@pytest.mark.asyncio
async def test_ssrf_and_api_security():
    """Verify SSRF validation blocks private network targets and metadata endpoints."""
    # Localhost
    with pytest.raises(ValueError, match="SSRF policy|loopback"):
        validate_ssrf_safety("http://localhost:8000/secret")

    with pytest.raises(ValueError, match="SSRF policy|loopback"):
        validate_ssrf_safety("http://127.0.0.1:8080/admin")

    # Cloud metadata endpoint
    with pytest.raises(ValueError, match="metadata IP|SSRF"):
        validate_ssrf_safety("http://169.254.169.254/latest/meta-data/")

    # Web fetch blocks SSRF
    fetch_tool = WebFetchPageTool()
    res = await fetch_tool.execute({"url": "http://127.0.0.1:9000/internal"})
    assert res.success is False
    assert res.error == "SSRF_BLOCKED"

@pytest.mark.asyncio
async def test_secret_sanitization_in_audit():
    """Verify API keys, passwords, and tokens are redacted before logging."""
    raw_args = {
        "api_key": "sk-1234567890abcdef1234567890abcdef",
        "gemini_token": "AIzaSyD-123456789012345678901234567890",
        "auth_header": "Bearer secret_jwt_token_here_with_length",
        "query": "safe query text",
    }
    cleaned = sanitize_for_audit(raw_args)
    assert cleaned["api_key"] == "[REDACTED_CREDENTIAL]"
    assert cleaned["query"] == "safe query text"

@pytest.mark.asyncio
async def test_policy_engine_clearance_and_approval_gate():
    """Verify PolicyEngine enforces permission limits and flags high-risk tools for approval."""
    read_policy = AgentPolicy(
        agent_id="scholar-nami",
        max_permission_level=ToolPermissionLevel.LEVEL_0_READ_ONLY,
        allowed_tools=["file_read", "data.inspect"],
    )

    # 1. Allowed Level 0
    read_tool = FileReadTool()
    decision = policy_engine.evaluate_tool_call(read_tool, {"filepath": "sample.txt"}, policy=read_policy)
    assert decision.allowed is True
    assert decision.requires_approval is False

    # 2. Disallowed Level 1 (Write attempted by Read-Only agent)
    write_tool = WorkspaceWriteTool()
    decision = policy_engine.evaluate_tool_call(write_tool, {"filepath": "file.txt", "content": "x"}, policy=read_policy)
    assert decision.allowed is False

    # 3. High Risk tool requires approval
    write_policy = AgentPolicy(
        agent_id="shipwright-franky",
        max_permission_level=ToolPermissionLevel.LEVEL_1_WORKSPACE_WRITE,
        allowed_tools=["workspace_write", "api.call"],
    )
    api_tool = ApiCallTool()
    api_tool.requires_approval = True
    decision = policy_engine.evaluate_tool_call(api_tool, {"endpoint_url": "https://httpbin.org/get"}, policy=write_policy)
    assert decision.allowed is True
    assert decision.requires_approval is True
