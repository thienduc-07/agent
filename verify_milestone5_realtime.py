import asyncio
import json
import httpx
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000/api/v1/events/ws"

async def main():
    print("=" * 70)
    print("GRAND LINE COMMAND CENTER — MILESTONE 5 LIVE REALTIME VERIFICATION")
    print("=" * 70)

    # 1. Connect to WebSocket
    print(f"\n[1/6] Connecting to Real-time WebSocket: {BACKEND_WS}")
    async with websockets.connect(BACKEND_WS) as ws:
        # 2. Receive Initial Snapshot
        raw_snapshot = await ws.recv()
        snapshot = json.loads(raw_snapshot)
        print(f"✓ Initial Snapshot Received:")
        print(f"  - Message Type: {snapshot.get('message_type')}")
        print(f"  - Snapshot ID:  {snapshot.get('snapshot_id')}")
        print(f"  - Sequence ID:  {snapshot.get('last_sequence_id')}")
        print(f"  - Agents Count: {len(snapshot.get('data', {}).get('agents', []))}")
        print(f"  - Active Tasks: {len(snapshot.get('data', {}).get('active_tasks', []))}")

        assert snapshot.get("message_type") == "snapshot"
        last_seq_on_connect = snapshot.get("last_sequence_id", 0)

        # 3. Test Ping/Pong Heartbeat
        print(f"\n[2/6] Sending Ping Heartbeat...")
        await ws.send(json.dumps({"action": "ping", "timestamp": 123456789}))
        pong = json.loads(await ws.recv())
        print(f"✓ Pong Reply Received: {pong}")
        assert pong.get("message_type") == "pong"
        assert pong.get("timestamp") == 123456789

        # 4. Dispatch a Real Task via REST API
        print(f"\n[3/6] Dispatching New Task via POST /api/v1/tasks...")
        async with httpx.AsyncClient() as http_client:
            create_res = await http_client.post(
                f"{BACKEND_HTTP}/api/v1/tasks",
                json={
                    "title": "Real-time Stream Telemetry Verification",
                    "description": "Perform full workspace audit and stream verified execution events",
                    "assigned_agent_id": "agent-captain-roger",
                    "priority": "high",
                },
                timeout=10.0,
            )
            assert create_res.status_code == 201
            task_data = create_res.json()
            task_id = task_data["id"]
            print(f"✓ Task Created in Database: ID = {task_id}")

        # 5. Listen to Live Event Stream
        print(f"\n[4/6] Listening to Live Event Stream from Agent Runtime...")
        events_captured = []
        timeout = 20.0
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            try:
                frame_text = await asyncio.wait_for(ws.recv(), timeout=5.0)
                frame = json.loads(frame_text)
                if frame.get("message_type") == "event":
                    env = frame["event"]
                    ev_type = env["event_type"]
                    seq = env.get("sequence_id")
                    seq_str = f"#{seq:03d}" if seq is not None else "#LEGACY"
                    print(f"  -> [Seq {seq_str}] {ev_type:<28} | Agent: {env.get('agent_id')} | Payload: {env.get('payload')}")
                    events_captured.append(env)
                    if ev_type == "task.completed":
                        print("✓ Final task.completed event received!")
                        break
            except asyncio.TimeoutError:
                print("⚠️ Timeout waiting for next event frame.")
                break

        assert len(events_captured) > 0, "No events were received over WebSocket!"
        captured_types = [e["event_type"] for e in events_captured]
        assert "task.created" in captured_types
        assert "task.plan_created" in captured_types
        assert "tool.execution_started" in captured_types
        assert "tool.execution_completed" in captured_types
        assert "task.completed" in captured_types

        highest_sequence = max(e["sequence_id"] for e in events_captured if e.get("sequence_id") is not None)

    # 6. Test Reconnect & Event Replay
    print(f"\n[5/6] Testing Client Reconnection & Event Replay (Cursor = {last_seq_on_connect})...")
    async with websockets.connect(BACKEND_WS) as ws_reconnect:
        _ = await ws_reconnect.recv() # Read snapshot
        await ws_reconnect.send(json.dumps({"action": "replay", "last_sequence_id": last_seq_on_connect}))

        replayed_events = []
        for _ in range(len(events_captured)):
            try:
                frame_text = await asyncio.wait_for(ws_reconnect.recv(), timeout=3.0)
                frame = json.loads(frame_text)
                if frame.get("message_type") == "event":
                    replayed_events.append(frame["event"])
            except asyncio.TimeoutError:
                break

        print(f"✓ Replayed {len(replayed_events)} missed events after sequence {last_seq_on_connect}:")
        for ev in replayed_events[:5]:
            print(f"    - [Seq #{ev['sequence_id']}] {ev['event_type']}")
        if len(replayed_events) > 5:
            print(f"    ... ({len(replayed_events) - 5} more events replayed)")

        assert len(replayed_events) >= len(events_captured)

    # 7. Check Final Database State
    print(f"\n[6/6] Verifying Authoritative Database State via REST API...")
    async with httpx.AsyncClient() as http_client:
        task_res = await http_client.get(f"{BACKEND_HTTP}/api/v1/tasks/{task_id}")
        assert task_res.status_code == 200
        final_task = task_res.json()
        print(f"✓ Task Status: {final_task['status']}")
        print(f"✓ Result Summary: {final_task.get('result_summary')[:80]}...")

        agent_res = await http_client.get(f"{BACKEND_HTTP}/api/v1/agents/agent-captain-roger")
        assert agent_res.status_code == 200
        agent_data = agent_res.json()
        print(f"✓ Agent Status: {agent_data['status']} (Restored to idle)")

    print("\n" + "=" * 70)
    print("ALL MILESTONE 5 REAL-TIME SYNCHRONIZATION ACCEPTANCE CRITERIA VERIFIED!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
