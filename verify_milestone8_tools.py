import os
import sys
import json
import asyncio
import httpx
import websockets

BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/events/ws"

async def run_live_verification():
    print("=" * 65)
    print("LIVE TOOL ECOSYSTEM & REGISTRY VERIFICATION — MILESTONE 8")
    print("=" * 65)

    ws_captured_events = []
    ws_task = None

    async def listen_ws():
        try:
            async with websockets.connect(WS_URL, origin="http://localhost:3000") as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    evt_type = data.get("event_type", data.get("type", ""))
                    if evt_type and (evt_type.startswith("tool.") or evt_type.startswith("artifact.") or evt_type.startswith("task.")):
                        ws_captured_events.append(data)
                        print(f"  [WS Event] {evt_type}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            pass

    ws_task = asyncio.create_task(listen_ws())
    await asyncio.sleep(0.5)

    async with httpx.AsyncClient(timeout=20.0) as client:
        # 1. Check Tool Catalog API
        print("\n1. Fetching Registered Tool Catalog (GET /api/v1/tools)...")
        res = await client.get(f"{BASE_URL}/tools")
        assert res.status_code == 200, f"Failed: {res.text}"
        tools = res.json()
        categories = sorted(list(set(t["category"] for t in tools)))
        print(f"✓ Total Registered Tools: {len(tools)}")
        print(f"✓ Supported Tool Categories: {categories}")
        assert len(tools) >= 15, "Expected at least 15 registered tools"

        # 2. Dynamic Enable/Disable Toggle
        print("\n2. Testing Dynamic Tool Toggle (POST /api/v1/tools/data.profile/toggle)...")
        toggle_off = await client.post(f"{BASE_URL}/tools/data.profile/toggle", json={"enable": False})
        assert toggle_off.status_code == 200
        assert toggle_off.json()["is_enabled"] is False
        print("✓ Tool 'data.profile' successfully DISABLED.")

        # Verify execution is blocked
        test_disabled = await client.post(f"{BASE_URL}/tools/data.profile/test", json={"arguments": {"filepath": "dummy.json"}})
        assert test_disabled.status_code == 403, f"Expected 403, got {test_disabled.status_code}"
        print("✓ Execution of disabled tool correctly rejected with HTTP 403.")

        # Re-enable
        toggle_on = await client.post(f"{BASE_URL}/tools/data.profile/toggle", json={"enable": True})
        assert toggle_on.status_code == 200
        assert toggle_on.json()["is_enabled"] is True
        print("✓ Tool 'data.profile' re-enabled successfully.")

        # 3. Workspace Security & Path Traversal
        print("\n3. Testing Workspace Sandbox Security & Path Traversal Defenses...")
        trav_res = await client.post(f"{BASE_URL}/tools/file_read/test", json={"arguments": {"filepath": "../../etc/passwd"}})
        assert trav_res.status_code == 200
        res_data = trav_res.json()
        assert res_data["success"] is False
        assert res_data["error"] == "SECURITY_VIOLATION"
        print("✓ Path Traversal escape attempt blocked: 'SECURITY_VIOLATION'.")

        # 4. Data Analysis Suite
        print("\n4. Testing Data Analysis Suite (data.inspect & data.validate)...")
        sandbox_dir = os.path.join(os.path.dirname(__file__), "workspace_sandbox")
        os.makedirs(sandbox_dir, exist_ok=True)
        sample_cargo = os.path.join(sandbox_dir, "fleet_cargo.json")
        with open(sample_cargo, "w", encoding="utf-8") as f:
            json.dump([
                {"item": "Cannons", "quantity": 50, "condition": "good"},
                {"item": "Gunpowder", "quantity": 120, "condition": "dry"},
                {"item": "Hardtack", "quantity": 500, "condition": "preserved"},
            ], f)

        inspect_res = await client.post(f"{BASE_URL}/tools/data.inspect/test", json={"arguments": {"filepath": "fleet_cargo.json"}})
        assert inspect_res.status_code == 200
        insp_body = inspect_res.json()
        assert insp_body["success"] is True
        print(f"✓ data.inspect parsed {insp_body['data']['row_count']} rows. Columns: {insp_body['data']['columns']}")

        val_res = await client.post(f"{BASE_URL}/tools/data.validate/test", json={
            "arguments": {
                "filepath": "fleet_cargo.json",
                "required_columns": ["item", "quantity"],
                "min_rows": 2
            }
        })
        assert val_res.status_code == 200
        assert val_res.json()["success"] is True
        print("✓ data.validate passed structural and quality checks.")

        # 5. Document & Artifact Suite
        print("\n5. Testing Document & Artifact Creation (artifact.create, artifact.get, artifact.verify)...")
        art_res = await client.post(f"{BASE_URL}/tools/artifact.create/test", json={
            "arguments": {
                "name": "citadel_armory_manifest.md",
                "content": "# Grand Line Citadel Armory Manifest\n- Cannons: 50\n- Status: Combat Ready",
                "artifact_type": "report"
            }
        })
        assert art_res.status_code == 200
        art_body = art_res.json()
        assert art_body["success"] is True
        print(f"✓ Artifact created: {art_body['data']['name']} (Storage: {art_body['data']['storage_path']})")

        ver_art = await client.post(f"{BASE_URL}/tools/artifact.verify/test", json={
            "arguments": {
                "name": "citadel_armory_manifest.md",
                "required_format": ".md",
                "min_size_bytes": 10
            }
        })
        assert ver_art.status_code == 200
        assert ver_art.json()["success"] is True
        print("✓ Artifact verified: Format valid and content confirmed.")

        # 6. SSRF Protection on API Tools
        print("\n6. Testing SSRF Defense on api.call...")
        ssrf_res = await client.post(f"{BASE_URL}/tools/api.call/test", json={
            "arguments": {"endpoint_url": "http://127.0.0.1:8000/api/v1/health"}
        })
        assert ssrf_res.status_code == 200
        ssrf_body = ssrf_res.json()
        assert ssrf_body["success"] is False
        assert ssrf_body["error"] == "SSRF_FORBIDDEN"
        print("✓ SSRF target 'http://127.0.0.1:8000' blocked with error: SSRF_FORBIDDEN.")

        # 7. Tool Execution Audit Trail
        print("\n7. Inspecting Tool Execution Audit Trail (GET /api/v1/tools/executions/history)...")
        hist_res = await client.get(f"{BASE_URL}/tools/executions/history?limit=10")
        assert hist_res.status_code == 200
        records = hist_res.json()
        print(f"✓ Total Audit Records retrieved: {len(records)}")
        assert len(records) > 0
        latest = records[0]
        print(f"✓ Latest Audit Record: {latest['tool_name']} (status={latest['status']}, duration={latest['duration_ms']}ms)")

    # Allow WS events to settle
    await asyncio.sleep(0.5)
    if ws_task:
        ws_task.cancel()

    print(f"\n✓ WebSocket Events Captured during tool test runs: {len(ws_captured_events)}")
    print("=" * 65)
    print("ALL MILESTONE 8 TOOL ECOSYSTEM VERIFICATIONS PASSED!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_live_verification())
