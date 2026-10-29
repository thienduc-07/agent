import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.services.tool_service import tool_service

@pytest.fixture(scope="module")
def client():
    # Sync tool definitions to database prior to running integration tests
    db = SessionLocal()
    try:
        tool_service.sync_tool_definitions(db)
    finally:
        db.close()
    with TestClient(app) as c:
        yield c

def test_tools_api_catalog_and_filtering(client):
    """Verify GET /api/v1/tools returns all tools and supports category filtering."""
    # 1. Full catalog
    res = client.get("/api/v1/tools")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 15

    names = [t["name"] for t in data]
    assert "workspace.read_file" in names or "file_read" in names
    assert "data.inspect" in names
    assert "artifact.create" in names
    assert "web.search" in names

    # 2. Filter by category=data
    res_data = client.get("/api/v1/tools?category=data")
    assert res_data.status_code == 200
    data_tools = res_data.json()
    assert len(data_tools) >= 4
    for t in data_tools:
        assert t["category"] == "data"

def test_tool_toggle_endpoint(client):
    """Verify POST /api/v1/tools/{name}/toggle dynamically toggles enabled state."""
    tool_name = "data.inspect"

    # Disable tool
    res = client.post(f"/api/v1/tools/{tool_name}/toggle", json={"enable": False})
    assert res.status_code == 200
    assert res.json()["is_enabled"] is False

    # Attempt to test run disabled tool -> should be rejected
    test_res = client.post(f"/api/v1/tools/{tool_name}/test", json={"arguments": {"filepath": "sample.json"}})
    assert test_res.status_code == 403

    # Re-enable tool
    res_enable = client.post(f"/api/v1/tools/{tool_name}/toggle", json={"enable": True})
    assert res_enable.status_code == 200
    assert res_enable.json()["is_enabled"] is True

def test_tool_execution_audit_logging(client):
    """Verify tool test execution records an audit entry in the database."""
    # Write a test file in sandbox
    from backend.app.core.config import settings
    import json
    target_file = settings.SANDBOX_DIR / "audit_test.json"
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump([{"key": "alpha", "val": 100}], f)

    # Execute test run
    test_res = client.post("/api/v1/tools/data.inspect/test", json={
        "arguments": {"filepath": "audit_test.json"},
        "agent_id": "agent-captain-roger"
    })
    assert test_res.status_code == 200
    data = test_res.json()
    assert data["success"] is True

    # Query audit history
    hist_res = client.get("/api/v1/tools/executions/history?tool_name=data.inspect&limit=5")
    assert hist_res.status_code == 200
    records = hist_res.json()
    assert len(records) >= 1
    latest = records[0]
    assert latest["tool_name"] == "data.inspect"
    assert latest["status"] == "succeeded"
    assert latest["duration_ms"] >= 0
