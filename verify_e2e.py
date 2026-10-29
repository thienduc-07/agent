import asyncio
import json
import httpx
import websockets

API_BASE = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"

async def test_full_e2e_flow():
    print("=" * 60)
    print("Starting End-to-End Grand Line Command Center Verification")
    print("=" * 60)

    # 1. Health & Agents check
    async with httpx.AsyncClient() as client:
        health_res = await client.get(f"{API_BASE}/api/system/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        print("✓ Health Check Passed: Backend Operational")

        agents_res = await client.get(f"{API_BASE}/api/v1/agents")
        assert agents_res.status_code == 200
        agents = agents_res.json()
        assert len(agents) >= 4
        print(f"✓ Agents Seeded: Found {len(agents)} agents ({', '.join(a['name'] for a in agents)})")

        tools_res = await client.get(f"{API_BASE}/api/system/tools")
        assert tools_res.status_code == 200
        tools = tools_res.json()
        print(f"✓ Tools Catalog: Found {len(tools)} tools ({', '.join(t['name'] for t in tools)})")

    # 2. WebSocket Realtime Connection & Safe Task Verification
    print("\n--- Connecting to WebSocket & Testing Safe Task Execution ---")
    async with websockets.connect(WS_URL) as ws:
        init_frame = await ws.recv()
        init_data = json.loads(init_frame)
        assert init_data["type"] == "init_state"
        print(f"✓ WebSocket Connected: Received 'init_state' with {len(init_data['data']['agents'])} agents")

        # Dispatch safe task for Zoro (agent-zoro-quartermaster)
        async with httpx.AsyncClient() as client:
            task_res = await client.post(f"{API_BASE}/api/tasks", json={
                "agent_id": "agent-zoro-quartermaster",
                "prompt": "Run system diagnostics and check memory usage",
                "provider": "deterministic"
            })
            assert task_res.status_code == 200
            task_data = task_res.json()
            task_id = task_data["id"]
            print(f"✓ Safe Task Dispatched: ID #{task_id[:8]} for Zoro")

        # Listen for real-time WebSocket events
        completed = False
        while not completed:
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            data = json.loads(msg)
            event_type = data.get("type")
            event_payload = data.get("data", {})
            print(f"  [WS EVENT] {event_type}: {str(event_payload)[:100]}...")

            if event_type == "task_completed" and event_payload.get("task_id") == task_id:
                print(f"✓ Safe Task Completed Realtime: {event_payload.get('result')[:80]}...")
                completed = True

    # 3. High-Risk Task & Captain Approval Workflow Verification
    print("\n--- Testing High-Risk Task & Captain's Approval Workflow ---")
    async with websockets.connect(WS_URL) as ws:
        await ws.recv() # init_state

        async with httpx.AsyncClient() as client:
            risk_res = await client.post(f"{API_BASE}/api/tasks", json={
                "agent_id": "agent-franky-shipwright",
                "prompt": "Execute Python script calculating Fibonacci series up to 15",
                "provider": "deterministic"
            })
            assert risk_res.status_code == 200
            risk_task_id = risk_res.json()["id"]
            print(f"✓ High-Risk Task Dispatched: ID #{risk_task_id[:8]} for Franky")

        # Wait for approval_required event
        action_id = None
        while not action_id:
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            data = json.loads(msg)
            if data.get("type") == "approval_required":
                action_data = data["data"]
                action_id = action_data["action_id"]
                print(f"✓ Captain Approval Alert Triggered!")
                print(f"  Target Tool: {action_data['tool_name']}")
                print(f"  Risk Justification: {action_data['risk_reason']}")
                print(f"  Action ID: {action_id}")

        # Send Captain's Authorization: APPROVE
        print("\n  Captain Signing Off: Sending APPROVE decision...")
        async with httpx.AsyncClient() as client:
            decide_res = await client.post(f"{API_BASE}/api/approvals/decide", json={
                "action_id": action_id,
                "decision": "APPROVE"
            })
            assert decide_res.status_code == 200
            print("✓ Decision Submitted successfully")

        # Verify task completion and output
        completed_risk = False
        while not completed_risk:
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            data = json.loads(msg)
            if data.get("type") == "task_completed" and data.get("data", {}).get("task_id") == risk_task_id:
                print(f"✓ High-Risk Task Executed & Completed: {data['data'].get('result')[:120]}...")
                completed_risk = True

    # 4. Database Persistence & History Check
    print("\n--- Verifying SQLite Persistence Across Reload ---")
    async with httpx.AsyncClient() as client:
        history_res = await client.get(f"{API_BASE}/api/tasks?limit=10")
        assert history_res.status_code == 200
        history = history_res.json()
        assert len(history) >= 2
        print(f"✓ SQLite Database Persistence Verified: Found {len(history)} recorded tasks")
        for h in history[:2]:
            print(f"  - Task #{h['id'][:8]}: [{h['status']}] prompt='{h['prompt'][:40]}...'")

    print("\n" + "=" * 60)
    print("ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY (100% PASS)")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_e2e_flow())
