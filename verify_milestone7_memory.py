import asyncio
import json
import httpx
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000/api/v1/events/ws"

async def test_live_memory_lifecycle():
    print("=" * 65)
    print("LIVE PERSISTENT MEMORY & KNOWLEDGE VERIFICATION — MILESTONE 7")
    print("=" * 65)

    events_captured = []

    async def ws_listener(ws):
        try:
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                events_captured.append(data)
                ev_type = data.get("event_type") or data.get("type")
                if ev_type and ("memory" in ev_type or "task" in ev_type):
                    print(f"  [WS Event] {ev_type}")
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    async with websockets.connect(BACKEND_WS) as ws:
        listener_task = asyncio.create_task(ws_listener(ws))
        await asyncio.sleep(0.5)

        async with httpx.AsyncClient(timeout=20.0) as client:
            # 1. Fetch initial Memory Overview Stats
            print("\n1. Fetching Memory Overview Stats (GET /api/v1/memories/stats/overview)...")
            resp = await client.get(f"{BACKEND_HTTP}/api/v1/memories/stats/overview")
            assert resp.status_code == 200, f"Failed overview stats: {resp.text}"
            stats = resp.json()
            print(f"✓ Initial Active Memories: {stats['total_active']}")
            print(f"✓ Initial Candidates: {stats['total_candidate']}")
            print(f"✓ Scopes Breakdown: {stats['by_scope']}")

            # 2. Propose a new candidate memory
            print("\n2. Proposing a new candidate memory (POST /api/v1/memories)...")
            propose_payload = {
                "title": "Grand Line Citadel Strategic Defense Protocol",
                "content": "Verified defensive protocol: Perimeter shields require synchronized telemetry with Zoro's coastal armory and Nami's observatory tower.",
                "summary": "Citadel 3-layer synchronized defense protocol.",
                "scope_type": "shared",
                "memory_type": "task",
                "status": "candidate",
                "confidence": 0.98,
            }
            resp = await client.post(f"{BACKEND_HTTP}/api/v1/memories", json=propose_payload)
            assert resp.status_code == 201, f"Failed proposing memory: {resp.text}"
            mem_data = resp.json()
            candidate_id = mem_data["id"]
            print(f"✓ Candidate memory proposed with ID: {candidate_id} (status: {mem_data['status']})")

            # 3. Approve candidate to active
            print("\n3. Approving candidate memory (POST /api/v1/memories/{id}/approve)...")
            resp = await client.post(f"{BACKEND_HTTP}/api/v1/memories/{candidate_id}/approve")
            assert resp.status_code == 200, f"Failed approving memory: {resp.text}"
            assert resp.json()["status"] == "active"
            print(f"✓ Memory '{candidate_id}' successfully transitioned to ACTIVE.")

            # 4. Search and retrieve active memory by keyword
            print("\n4. Searching active memories by keyword 'citadel defense'...")
            resp = await client.get(f"{BACKEND_HTTP}/api/v1/memories?query=citadel%20defense&status=active")
            assert resp.status_code == 200
            search_res = resp.json()
            assert search_res["total"] >= 1, "Expected at least 1 memory match"
            top_hit = search_res["items"][0]["memory"]
            print(f"✓ Top search hit: '{top_hit['title']}' (Relevance: {search_res['items'][0]['relevance_score']})")

            # 5. Access Control Test: Agent-Private Memory
            print("\n5. Testing Access Control on Agent-Private Memory...")
            zoro_private = {
                "title": "Zoro Secret Swordsmanship Strategy",
                "content": "Confidential Santoryu stance maneuvers for armory dock defense.",
                "summary": "Private combat strategy.",
                "scope_type": "agent",
                "owner_agent_id": "agent-zoro-quartermaster",
                "status": "active",
                "confidence": 0.95,
            }
            resp_priv = await client.post(f"{BACKEND_HTTP}/api/v1/memories?auto_activate=true", json=zoro_private)
            assert resp_priv.status_code == 201
            zoro_mem_id = resp_priv.json()["id"]

            # Query as Franky (unauthorized) -> should be filtered out
            resp_unauth = await client.get(
                f"{BACKEND_HTTP}/api/v1/memories?query=Santoryu&caller_agent_id=agent-franky-shipwright&status=active"
            )
            assert resp_unauth.status_code == 200
            assert resp_unauth.json()["total"] == 0, "Unauthorized agent Franky should NOT see Zoro's private memory!"
            print("✓ Access Control: Franky cannot access Zoro's private memory.")

            # Query as Roger (supervisor) -> permitted
            resp_auth = await client.get(
                f"{BACKEND_HTTP}/api/v1/memories?query=Santoryu&caller_agent_id=agent-captain-roger&status=active"
            )
            assert resp_auth.status_code == 200
            assert resp_auth.json()["total"] >= 1, "Supervisor Roger should be able to view agent private memory!"
            print("✓ Access Control: Supervisor Roger can access agent private memory.")

            # 6. Execute Task that utilizes Memory in Context
            print("\n6. Dispatching Task: 'Inspect Citadel Defense and Reinforce Shield'...")
            task_payload = {
                "title": "Inspect Citadel Defense and Reinforce Shield",
                "description": "Analyze existing citadel defense protocols, inspect workspace structure, and verify status.",
                "assigned_agent_id": "agent-captain-roger",
                "priority": "high",
            }
            resp_task = await client.post(f"{BACKEND_HTTP}/api/v1/tasks", json=task_payload)
            assert resp_task.status_code == 201
            task_id = resp_task.json()["id"]
            print(f"✓ Task dispatched with ID: {task_id}. Awaiting runtime completion and memory citation...")

            # Wait for execution loop to complete
            task_completed = False
            for _ in range(20):
                await asyncio.sleep(1.0)
                resp_t = await client.get(f"{BACKEND_HTTP}/api/v1/tasks/{task_id}")
                if resp_t.status_code == 200:
                    status = resp_t.json()["status"]
                    if status in ["completed", "failed", "cancelled"]:
                        task_completed = True
                        break

            assert task_completed, "Task execution timed out."
            print(f"✓ Task finished with status: {status}")

            # 7. Verify Memory Access Telemetry
            print("\n7. Verifying Memory Access Telemetry & Provenance...")
            resp_mem = await client.get(f"{BACKEND_HTTP}/api/v1/memories/{candidate_id}")
            assert resp_mem.status_code == 200
            mem_updated = resp_mem.json()
            print(f"✓ Memory Access Count: {mem_updated['access_count']} times")
            print(f"✓ Last Accessed At: {mem_updated['last_accessed_at']}")
            assert mem_updated["access_count"] >= 1

            # 8. Archive the test memory
            print("\n8. Archiving test memory (POST /api/v1/memories/{id}/archive)...")
            resp_arch = await client.post(
                f"{BACKEND_HTTP}/api/v1/memories/{candidate_id}/archive?reason=Mission%20Accomplished"
            )
            assert resp_arch.status_code == 200
            assert resp_arch.json()["status"] == "archived"
            print(f"✓ Memory '{candidate_id}' successfully ARCHIVED.")

        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

    print(f"\n✓ WebSocket Events Captured during lifecycle: {len(events_captured)}")
    print("=" * 65)
    print("ALL MILESTONE 7 PERSISTENT MEMORY VERIFICATIONS PASSED!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(test_live_memory_lifecycle())
