import asyncio
import json
import sys
import httpx
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000/api/v1/events/ws"

async def test_live_multiagent_flow():
    print("=" * 60)
    print("LIVE MULTI-AGENT VERIFICATION — MILESTONE 6")
    print("=" * 60)

    # 1. Health check & Agent Registry check
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BACKEND_HTTP}/api/v1/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✓ Backend health check passed.")

        # Check Agent Registry
        resp = await client.get(f"{BACKEND_HTTP}/api/v1/agents/registry")
        assert resp.status_code == 200, f"Registry failed: {resp.text}"
        registry = resp.json()
        print(f"✓ Agent Registry contains {len(registry)} agent types: {[a['agent_type'] for a in registry]}")
        assert any(a["agent_type"] == "research" for a in registry)
        assert any(a["agent_type"] == "analyst" for a in registry)
        assert any(a["agent_type"] == "writer" for a in registry)
        assert any(a["agent_type"] == "reviewer" for a in registry)

    # 2. Connect WebSocket
    events_received = []
    
    async def ws_listener(ws):
        try:
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                events_received.append(data)
                ev_type = data.get("event_type") or data.get("type")
                if ev_type:
                    print(f"  [WS Event] {ev_type} (seq: {data.get('sequence_id', 'N/A')})")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            pass

    async with websockets.connect(BACKEND_WS) as ws:
        listener_task = asyncio.create_task(ws_listener(ws))
        await asyncio.sleep(0.5)

        # 3. Create Multi-Agent Workflow
        workflow_payload = {
            "title": "Grand Line Strategic Analysis & Market Report",
            "description": "Read workspace documents, analyze operational metrics, write intelligence report, and review report.",
            "assigned_agent_id": "agent-captain-roger",
            "priority": "normal"
        }

        print("\nSubmitting Multi-Agent Workflow via POST /api/v1/workflows...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{BACKEND_HTTP}/api/v1/workflows", json=workflow_payload)
            assert resp.status_code == 201, f"Failed to create workflow: {resp.text}"
            wf_data = resp.json()
            workflow_id = wf_data["id"]
            print(f"✓ Workflow created with ID: {workflow_id}")

            # 4. Wait for execution and completion (Dispatcher runs in background)
            print("Awaiting workflow execution and subtask completion...")
            completed = False
            for i in range(25):
                await asyncio.sleep(1.0)
                resp = await client.get(f"{BACKEND_HTTP}/api/v1/workflows/{workflow_id}")
                assert resp.status_code == 200
                wf_current = resp.json()
                st_count = len(wf_current.get("subtasks", []))
                st_completed = sum(1 for st in wf_current.get("subtasks", []) if st["status"] == "completed")
                status = wf_current["status"]
                print(f"  Status: {status} | Subtasks: {st_completed}/{st_count}")
                if status in ["completed", "failed", "cancelled"]:
                    completed = True
                    break

            assert completed, f"Workflow timed out. Current status: {status}"
            assert status == "completed", f"Workflow did not complete successfully. Status: {status}"
            
            # Print final aggregated results
            print("\n" + "=" * 60)
            print("WORKFLOW COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            final_output = wf_current.get("output_data") or {}
            print(f"Final Aggregated Output Keys: {list(final_output.keys())}")
            print(f"Summary: {wf_current.get('result_summary')}")
            print(f"Reviewer Verdict: {final_output.get('reviewer_verdict')}")
            print(f"Subtasks Executed: {len(wf_current.get('subtasks', []))}")
            for st in wf_current.get("subtasks", []):
                print(f"  - [{st['status']}] {st['title']} (Agent: {st.get('assigned_agent_id')}, Type: {st.get('agent_type')})")
                print(f"    Summary: {st.get('result_summary', 'N/A')[:80]}...")

        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

    print(f"\n✓ Total WebSocket events captured during workflow: {len(events_received)}")
    print("ALL LIVE VERIFICATIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_live_multiagent_flow())
