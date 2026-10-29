# ⚓ AI AGENT CITY — GRAND LINE COMMAND CENTER

> **An interactive 3D Anime Pirate Island Command Center where users orchestrate genuine, stateful autonomous AI agents with real tool execution, subprocess sandboxing, and Captain's Approval workflows.**

---

## 🌟 Key Features

1. **Interactive 3D Anime Pirate World**:
   - Built with **Three.js**, **React Three Fiber (R3F)**, and **Drei**.
   - Procedural anime ocean waves with real-time vertex displacement shader and foam crests.
   - 3D Island landmass with **4 distinct fleet stations**:
     - 🏛️ **Citadel & Flagship Wheelhouse** (Center) — *Captain Roger*
     - ⚓ **Coastal Armory & Harbor Docks** with moored Galleon ship & waving Jolly Roger flag — *First Mate Zoro*
     - 🔭 **Observatory Lighthouse & Grand Archives** with rotating sapphire beam — *Navigator Nami*
     - 🌋 **Molten Blacksmith & Artillery Forge** with smoking chimneys & lava basin — *Shipwright Franky*
   - Dynamic 3D Agent Avatars reflecting genuine backend states (Idle bobbing, Thinking rune rings, Running tool energy sparks, Awaiting approval danger beacon, and Victory gold confetti).
   - Smooth cinematic camera controller transitions between tactical island overview and targeted station close-ups.

2. **Stateful AI Agent Architecture (Milestone 3 — Backend & Database)**:
   - Powered by **FastAPI** (Python 3.9+ async engine) and **SQLAlchemy 2.0 ORM** with **SQLite** (`grandline.db`).
   - Managed with **Alembic Database Migrations** (`alembic upgrade head`).
   - Enforced SQLite foreign key integrity (`PRAGMA foreign_keys = ON;`) and unique constraints (`(task_id, step_index)`).
   - Strict agent & task state machines:
     - Agents: `idle`, `working`, `waiting_approval`, `error`, `offline`.
     - Tasks: `queued`, `planning`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`.
   - **Service Layer Architecture**:
     - `routers/endpoints`: Schema validation, standard HTTP status codes.
     - `services`: Business logic, state transition rules, transactional event audit logging (`agent_events`).
     - `models`: Relational ORM models for `agents`, `tasks`, `task_steps`, `agent_events`, `approvals`, `artifacts`.
     - `core/errors`: Standardized API error contract `{"error": {"code": "...", "message": "..."}}`.
   - **Centralized Frontend API Client**:
     - Located in `frontend/lib/api/` (`client.ts`, `agents.ts`, `tasks.ts`).
     - Configurable via `NEXT_PUBLIC_API_BASE_URL`.
     - Interactive `TaskCreateModal` with live queued state visualization and error feedback.

3. **Real Tool Registry & Security Sandbox**:
   - **Safe Tools** (Immediate execution):
     - `system_status`: Inspect host CPU, memory, OS platform, and active node telemetry.
     - `calculator`: Safe AST arithmetic evaluation preventing arbitrary code injection.
     - `file_list`: Inspect safe sandbox directory `/workspace_sandbox`.
     - `file_read`: Read sandboxed mission files with path-traversal guards.
     - `web_fetch`: Safe HTTP GET requester with timeouts.
   - **High-Risk Tools (Sandbox + Captain's Approval Required)**:
     - `python_exec`: Executes Python algorithms in a restricted subprocess environment with strict timeouts, path validation, and stdout/stderr capture.
     - `file_write`: Writes files strictly inside `/workspace_sandbox`.
     - `shell_command`: Runs whitelisted shell diagnostics (`ls`, `pwd`, `date`, `echo`) with strict path confinement.

4. **Captain's Approval Workflow**:
   - Any high-risk tool automatically halts agent execution and places the task into `waiting_approval`.
   - Emits a real-time WebSocket alert. The 3D agent pulses red, and the UI displays a **Captain's Authorization Modal** with code payload inspector.
   - The user can click **AUTHORIZE & EXECUTE** or **VETO / DENY**.
   - Resolved approvals are audited in the `approvals` table. Duplicate decisions return `409 Conflict`.

5. **Bidirectional Realtime WebSocket & Persistence (Milestone 5)**:
   - Full live streaming of events using standardized Event Envelopes (`/api/v1/events/ws`).
   - Authoritative SQLite database persistence with monotonic `sequence_id` for guaranteed ordering and replay.
   - Authoritative initial snapshot sent upon connection (`message_type: "snapshot"`).
   - Ping/Pong heartbeat (15s interval) and connection status management.
   - Reconnect with exponential backoff + jitter and missed event replay cursor (`action: "replay"`).
   - Event deduplication via `event_id` and strict sequence monotonic validation.
   - Fallback REST polling during network disruption.
   - Real-time 3D avatar synchronization in React Three Fiber reflecting live runtime states.

6. **Multi-Agent Orchestration, Collaboration & Workflow Execution (Milestone 6)**:
   - **Specialized Agent Registry**: 5 distinct agent definitions (`general`, `research`, `analyst`, `writer`, `reviewer`) with isolated tool whitelists, system prompts, and permission levels.
   - **Task Decomposition & DAG Planner**: Kahn's algorithm for topological sorting, cycle detection, and missing dependency validation.
   - **Subtask Dependency Engine & Concurrency**: Controlled parallel execution with safe state transitions (`queued` -> `running` -> `completed`/`failed`).
   - **Inter-Agent Data Contracts**: `SubtaskResultContract` guaranteeing structured data flow (evidence, artifacts, citations) without unstructured text bloat.
   - **Result Aggregator & Reviewer Audit**: Final synthesis generating consolidated reports, citations, physical sandbox artifacts, and independent reviewer audits.
   - **Real-Time Fleet Mission Control HUD**: Mode switcher for single-agent vs multi-agent fleet missions, real-time subtask DAG visualization, and live WebSocket synchronization across stations.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Frontend [Next.js + Three.js + R3F + Tailwind]
        Canvas[3D Ocean & Pirate Island Canvas]
        Avatars[4 Agent 3D Avatars & Stations]
        HUD[Glassmorphic Command HUD]
        TaskModal[Task Create Modal /api/v1/tasks]
        ApprovalUI[Captain Authorization Modal]
        APIClient[Centralized API Client: lib/api/*]
        WSClient[Realtime WebSocket Client]
    end

    subgraph Backend [FastAPI + Python]
        APIV1[/api/v1 Endpoints: agents, tasks, events, approvals]
        ServiceLayer[Service Layer: agent_service, task_service, etc.]
        Errors[Standard Error Formatter]
        WSMgr[WebSocket Manager]
        ToolRegistry[Tool Registry: Safe vs High-Risk]
        SandboxExec[Subprocess Sandbox Executor]
        Alembic[Alembic Migrations Engine]
        DB[(SQLite: grandline.db with FK Enforcement)]
    end

    Canvas --> Avatars
    HUD --> TaskModal
    TaskModal --> APIClient
    APIClient --> APIV1
    APIV1 --> ServiceLayer
    ServiceLayer --> DB
    Alembic --> DB
    ApprovalUI --> APIClient
    WSClient <==>|Realtime Events| WSMgr
    ServiceLayer --> ToolRegistry
    ToolRegistry --> SandboxExec
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18 (Tested on v24.14.0)
- Python >= 3.9 (Tested on Python 3.9.6)
- Git

### 1. Backend Setup

```bash
# Navigate to project root
cd /Users/thienduc/Desktop/Code/OPagent

# Create Python virtual environment
python3 -m venv backend/venv

# Activate virtual environment
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run Alembic migrations
PYTHONPATH=. backend/venv/bin/alembic upgrade head

# Run Idempotent Seed (creates the 4 island agents if not present)
PYTHONPATH=. backend/venv/bin/python backend/app/scripts/seed.py

# Run FastAPI Server
backend/venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will start at: `http://localhost:8000`
- API Health: `http://localhost:8000/api/v1/health`
- Swagger Interactive Docs: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- WebSocket: `ws://localhost:8000/ws`

### 2. Frontend Setup

```bash
# In a new terminal window
cd /Users/thienduc/Desktop/Code/OPagent/frontend

# Install dependencies
npm install

# Run Next.js Development Server
npm run dev -- -p 3000
```

The frontend will be available at: `http://localhost:3000`

---

## 📡 Milestone 5 — Real-time Event System & WebSocket Specification

### WebSocket Endpoints
- **Authoritative Stream**: `ws://localhost:8000/api/v1/events/ws`
- **Legacy Stream Alias**: `ws://localhost:8000/ws`

### Standardized Event Envelope
Every event emitted by the Backend Agent Runtime is wrapped in a strict JSON envelope:
```json
{
  "schema_version": 1,
  "event_id": "evt_4b2c129e92bf4450",
  "event_type": "tool.execution_completed",
  "occurred_at": "2026-10-29T00:35:49.123456Z",
  "sequence_id": 46,
  "agent_id": "agent-captain-roger",
  "task_id": "733d549e-d3ee-4e95-909f-47541e6f4088",
  "payload": {
    "tool_name": "workspace_list",
    "output": "Discovered 41 items in workspace..."
  }
}
```

### Supported Event Types
- **Task Lifecycle**: `task.created`, `task.queued`, `task.started`, `task.status_changed`, `task.completed`, `task.failed`, `task.cancel_requested`, `task.cancelled`
- **Agent Lifecycle**: `agent.status_changed`, `agent.idle`, `agent.working`, `agent.waiting_for_approval`, `agent.error`
- **Execution & Tool Lifecycle**: `task.plan_created`, `task.step.started`, `task.step.completed`, `task.step.failed`, `tool.execution_started`, `tool.execution_completed`, `tool.execution_failed`, `approval.required`, `approval.resolved`, `artifact.created`

### Protocol Control Messages (Client -> Server)
- **Ping Heartbeat**: `{"action": "ping", "timestamp": 1720000000}` -> Server replies with `{"message_type": "pong", ...}`.
- **Resync Request**: `{"action": "resync"}` -> Server replies with complete authoritative snapshot.
- **Event Replay Request**: `{"action": "replay", "last_sequence_id": 40}` -> Server streams all missed events with `sequence_id > 40`.

---

## 🧪 Testing & Verification

### Running Automated Test Suite (Pytest)

```bash
cd /Users/thienduc/Desktop/Code/OPagent
backend/venv/bin/pytest backend/app/tests -v
```

*Results: 110/110 automated tests passing with 100% success rate:*
- **Milestone 8 Tool Ecosystem, Registry & Intelligent Execution**:
  - Tool Registry: Canonical name & alias mapping, metadata tracking, dynamic enable/disable state.
  - Workspace Suite: Path traversal protection (`../../`), canonical root enforcement, `.env`/private keys protection, overwrite approval gates.
  - Document & Artifact Suite: `artifact.create`, `artifact.get`, `artifact.list`, `artifact.verify` deliverable lifecycle.
  - Data Analysis Suite: `data.inspect` (schema inference), `data.profile` (null/duplicate stats, numeric min/max/mean), `data.validate` (quality assertions).
  - Web & API Security: SSRF validation blocking localhost, private IP subnets, and cloud metadata (169.254.169.254); prompt injection isolation via `<untrusted_web_content>`.
  - Audit Trail: Immutable execution logging in `tool_executions`, secret credential redaction (`sk-...`, `AIza...`), duration metrics.
  - Policy Engine Clearance: Level 0 Read-Only, Level 1 Sandbox Write, Level 2 Command/High-Risk approval gates.
  - REST API & WebSocket: `/api/v1/tools`, `/api/v1/tools/executions/history`, toggle endpoints, and real-time streaming.
- **Milestone 7 Persistent Memory**: 4 memory scopes, citations, BM25 relevance ranking, context builder.
- **Milestone 6 Multi-Agent Orchestration**: DAG planner, topological sort, Kahn's cycle detection, workflow execution loop.
- **Milestone 5 Real-time WebSocket**: Event envelope serialization, monotonic sequence IDs, snapshot, ping/pong, resync, replay.
- **Milestone 4 Agent Runtime**: Tool whitelists, policy levels, deterministic offline execution loop.
- **Milestone 3 Backend & Database**: SQLite foreign keys, transactions, migrations, sandbox boundaries.

### Running Live Milestone 8 Tool Ecosystem Verification

```bash
cd /Users/thienduc/Desktop/Code/OPagent
backend/venv/bin/python verify_milestone8_tools.py
```

*Verifies:*
1. Tool Catalog API (`GET /api/v1/tools` with 22+ registered tools across all 6 categories)
2. Dynamic Tool Toggle (`POST /api/v1/tools/{name}/toggle` and execution rejection when disabled)
3. Workspace Security & Path Traversal Defenses (`../../etc/passwd` blocked)
4. Data Analysis Suite (`data.inspect` and `data.validate` on sandbox datasets)
5. Document & Artifact Suite (`artifact.create`, `artifact.get`, `artifact.verify`)
6. SSRF Protection on API Tools (`http://127.0.0.1` and `169.254.169.254` blocked)
7. Tool Execution Audit Trail (`GET /api/v1/tools/executions/history` with durations and status)

### Running Live Milestone 7 Memory & Knowledge Verification

```bash
cd /Users/thienduc/Desktop/Code/OPagent
backend/venv/bin/python verify_milestone7_memory.py
```

*Verifies:*
1. Memory Overview Stats (`GET /api/v1/memories/stats/overview`)
2. Proposing a Candidate Memory (`POST /api/v1/memories`)
3. Approving Candidate to Active status (`POST /api/v1/memories/{id}/approve`)
4. Keyword & Token Relevance Search
5. Strict Access Control (Franky blocked from Zoro's private memory; Roger permitted)
6. Task Dispatch with Bounded `<reference_memory>` Context injection
7. Memory Access Telemetry, Citations (`memory_citations`), and counter increments
8. Archiving Memory (`POST /api/v1/memories/{id}/archive`) & 19+ WebSocket Events Captured

### Running Live Multi-Agent Workflow Verification

```bash
cd /Users/thienduc/Desktop/Code/OPagent
backend/venv/bin/python3 verify_milestone6_live.py
```

*Verifies:*
1. Agent Registry endpoint `/api/v1/agents/registry` (all 5 roles registered)
2. Live WebSocket subscription to `/api/v1/events/ws`
3. Submitting complex workflow via `POST /api/v1/workflows`
4. Streaming 40+ real-time events (`workflow.created` -> `workflow.planned` -> 4x `subtask.created` -> sequential execution of Research -> Analyst -> Writer -> Reviewer -> `workflow.completed`)
5. Physical sandbox artifact generation (`workspace_sandbox/multiagent_report.md`)
6. Reviewer audit report and final aggregated response

---

## 📂 Project Structure

```
OPagent/
├── ARCHITECTURE.md                 # System architecture blueprint
├── README.md                       # Complete documentation & run guide
├── verify_e2e.py                   # Automated end-to-end integration test
├── grandline.db                    # SQLite database
├── workspace_sandbox/              # Sandboxed folder for safe script & file executions
├── backend/
│   ├── requirements.txt            # Python dependencies (FastAPI, SQLAlchemy, etc.)
│   ├── venv/                       # Python virtual environment
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, lifespan, WebSocket router
│       ├── config.py               # Settings and environment configuration
│       ├── database.py             # SQLAlchemy engine & session factory
│       ├── models.py               # Database ORM models (Agent, Task, EventLog, PendingAction)
│       ├── schemas.py              # Pydantic validation schemas
│       ├── websocket_manager.py    # WebSocket broadcaster and connection manager
│       ├── routers/                # REST endpoints (agents, tasks, approvals, system)
│       ├── agent_core/
│       │   ├── orchestrator.py     # Stateful agent orchestrator & approval handler
│       │   ├── providers/          # Model provider abstraction (Deterministic, Gemini, OpenAI)
│       │   ├── tools/              # Safe & risky tool implementations
│       │   └── sandbox/            # Subprocess sandbox executor with path boundary validation
│       └── tests/                  # Pytest test suite
└── frontend/
    ├── package.json                # Next.js, Three.js, R3F, Drei dependencies
    ├── types/                      # TypeScript definitions
    ├── app/
    │   ├── layout.tsx              # Root HTML & SEO layout
    │   ├── page.tsx                # Main Grand Line Command Center page
    │   └── globals.css             # Glassmorphic cyberpunk/pirate theme CSS
    └── components/
        ├── canvas/
        │   ├── CityCanvas.tsx       # Three.js R3F canvas wrapper
        │   ├── Ocean.tsx            # Anime ocean vertex wave shader
        │   ├── IslandTerrain.tsx    # 3D pirate fortress island & stations
        │   ├── AgentAvatar.tsx      # 3D character avatars with live state animations & HTML HUD
        │   └── CameraController.tsx # Smooth cinematic camera orbit transitions
        └── hud/
            ├── TopNav.tsx           # Glassmorphic top navigation & provider switcher
            ├── StationRoster.tsx    # Fleet stations roster with live status badges
            ├── MissionControl.tsx   # Realtime terminal, suggestions, & mission dispatcher
            ├── CaptainApprovalModal.tsx # Interactive approval dialog for high-risk actions
            └── TaskHistoryModal.tsx # SQLite mission archives & persistent logs
```

---

## 🛡️ Security & Sandbox Boundaries

1. **Path Traversal Defense**: All file operations (`file_read`, `file_write`, `python_exec`) resolve target paths relative to `/workspace_sandbox`. Any attempt to escape via `../` throws an immediate `PermissionError`.
2. **Execution Timeout**: Subprocess execution enforces a hard 15-second timeout; lingering processes are immediately terminated with `SIGKILL`.
3. **Command Whitelisting**: Shell commands only permit safe diagnostic binaries (`ls`, `pwd`, `date`, `cat`, `echo`, `head`, `tail`, `wc`, `stat`).
4. **Zero Untrusted Execution**: Python execution requires human Captain authorization via interactive approval modal before any subprocess spawn occurs.

---

## ⚓ Credits & License
Built with passion for the **Grand Line** using Next.js, React Three Fiber, Three.js, and FastAPI.
All procedural 3D assets and shaders are custom-crafted and 100% royalty-free under the MIT License.
# agent
