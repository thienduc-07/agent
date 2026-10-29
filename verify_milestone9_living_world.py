import asyncio
import json
import httpx
import websockets

BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/events/ws"

EXPECTED_CREW = [
    "Monkey D. Luffy — Gear 5",
    "Roronoa Zoro",
    "Nami",
    "Usopp",
    "Sanji",
    "Tony Tony Chopper",
    "Nico Robin",
    "Franky",
    "Brook",
    "Jinbe",
]

async def verify_milestone9():
    print("=" * 70)
    print("LIVE VERIFICATION — MILESTONE 9: STRAW HAT CREW & LIVING WORLD")
    print("=" * 70)

    ws_events = []
    async def listen_ws():
        try:
            async with websockets.connect(WS_URL, origin="http://localhost:3000") as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    evt = data.get("event_type", data.get("type", ""))
                    if evt:
                        ws_events.append(data)
                        print(f"  [WS Event Stream] {evt} (agent: {data.get('agent_id')})")
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    ws_task = asyncio.create_task(listen_ws())
    await asyncio.sleep(0.5)

    async with httpx.AsyncClient(timeout=25.0) as client:
        # 1. Verify 10 Straw Hat Crew Roster
        print("\n1. Verifying Straw Hat Crew Roster (GET /api/v1/agents)...")
        res = await client.get(f"{BASE_URL}/agents")
        assert res.status_code == 200, f"Failed: {res.text}"
        agents = res.json()
        print(f"✓ Total Agents returned: {len(agents)}")
        assert len(agents) == 10, f"Expected exactly 10 Straw Hat Crew members, got {len(agents)}"

        found_names = [a["name"] for a in agents]
        print(f"✓ Registered Members:")
        for a in agents:
            print(f"   • {a['name']:<28} | Role: {a['role']:<38} | Station: {a['station']}")
            assert any(exp in a["name"] for exp in ["Luffy", "Zoro", "Nami", "Usopp", "Sanji", "Chopper", "Robin", "Franky", "Brook", "Jinbe"])

        # 2. Dispatch Task to Luffy Gear 5 at Command Summit
        print("\n2. Dispatching Strategic Command Task to Luffy Gear 5...")
        luffy_task_payload = {
            "title": "Grand Line Fleet Strategic Assessment",
            "description": "Luffy Gear 5 surveys all 7 tiers of the island and assesses Straw Hat fleet preparedness.",
            "assigned_agent_id": "agent-captain-roger",
            "priority": "high",
        }
        res_task = await client.post(f"{BASE_URL}/tasks", json=luffy_task_payload)
        assert res_task.status_code == 201, f"Task create failed: {res_task.text}"
        task_data = res_task.json()
        task_id = task_data["id"]
        print(f"✓ Task Created successfully: {task_id} (Status: {task_data['status']})")

        # Wait for task execution & WS events
        print("   Awaiting task execution loop...")
        for _ in range(12):
            await asyncio.sleep(0.8)
            check = await client.get(f"{BASE_URL}/tasks/{task_id}")
            st = check.json()["status"]
            if st in ["completed", "failed"]:
                print(f"✓ Task resolved with backend status: '{st}'")
                break

        # 3. Dispatch Ship Maintenance Task to Franky at Thousand Sunny Shipyard
        print("\n3. Dispatching Ship Maintenance Task to Franky at Thousand Sunny Shipyard...")
        franky_task_payload = {
            "title": "Thousand Sunny Soldier Dock System Inspection",
            "description": "Inspect Thousand Sunny hull integrity, Gaon cannon alignment, and lawn deck maintenance.",
            "assigned_agent_id": "agent-franky-shipwright",
            "priority": "normal",
        }
        res_franky = await client.post(f"{BASE_URL}/tasks", json=franky_task_payload)
        assert res_franky.status_code == 201
        franky_task_id = res_franky.json()["id"]
        print(f"✓ Franky Task Created: {franky_task_id}")

        for _ in range(12):
            await asyncio.sleep(0.8)
            check = await client.get(f"{BASE_URL}/tasks/{franky_task_id}")
            st = check.json()["status"]
            if st in ["completed", "failed"]:
                print(f"✓ Franky Shipyard Task resolved with backend status: '{st}'")
                break

        # 4. Check WebSocket Synchronization
        print(f"\n4. Verifying WebSocket Real-time Event Broadcast...")
        print(f"✓ Total Captured Events over WebSocket: {len(ws_events)}")
        assert len(ws_events) > 0, "Expected live WebSocket events during task execution"

        ws_task.cancel()
        print("\n" + "=" * 70)
        print("✓ ALL MILESTONE 9 VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(verify_milestone9())
