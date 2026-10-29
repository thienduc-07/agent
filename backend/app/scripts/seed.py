import sys
from datetime import datetime
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.agent import AgentModel
from backend.app.models import TaskModel, TaskStepModel, AgentEventModel, ApprovalModel, ArtifactModel

INITIAL_AGENTS = [
    {
        "id": "agent-captain-roger",
        "name": "Monkey D. Luffy — Gear 5",
        "role": "Grand Fleet Captain & Sun God Nika",
        "station": "captain_hq",
        "status": "idle",
        "color": "#f59e0b",
        "avatar": "luffy-gear5",
        "pos_x": 0.0,
        "pos_y": 7.8,
        "pos_z": 0.0,
        "description": "Thuyền trưởng tối cao băng Mũ Rơm trong trạng thái Gear 5 Thần Mặt Trời Nika, chỉ huy toàn đảo và hoạch định chiến dịch lớn."
    },
    {
        "id": "agent-zoro-quartermaster",
        "name": "Roronoa Zoro",
        "role": "Combat Chief & Master Swordsman",
        "station": "lookout_cliffs",
        "status": "idle",
        "color": "#10b981",
        "avatar": "zoro",
        "pos_x": 22.0,
        "pos_y": 6.2,
        "pos_z": 18.0,
        "description": "Kiếm sĩ tam kiếm phái trấn thủ vách đá quan sát, rèn luyện kiếm đạo, giám sát an ninh và đánh giá chất lượng nhiệm vụ."
    },
    {
        "id": "agent-nami-navigator",
        "name": "Nami",
        "role": "Chief Cartographer & Weather Navigator",
        "station": "captain_hq",
        "status": "idle",
        "color": "#f97316",
        "avatar": "nami",
        "pos_x": 2.2,
        "pos_y": 7.5,
        "pos_z": 1.8,
        "description": "Hoa tiêu thiên tài với Clima-Tact, phụ trách vẽ hải đồ chiến lược, tính toán lộ trình, theo dõi tài nguyên và điều phối hòn đảo."
    },
    {
        "id": "agent-usopp-sniper",
        "name": "Usopp",
        "role": "Sniper & Gadget Inventor",
        "station": "workshop",
        "status": "idle",
        "color": "#eab308",
        "avatar": "usopp",
        "pos_x": -14.0,
        "pos_y": 4.4,
        "pos_z": -18.0,
        "description": "Xạ thủ kiêm nhà phát minh dụng cụ tại xưởng cơ khí, thử nghiệm thiết bị và hỗ trợ tinh chỉnh công cụ."
    },
    {
        "id": "agent-sanji-cook",
        "name": "Sanji",
        "role": "Head Chef & Tactical Strategist",
        "station": "strawhat_village",
        "status": "idle",
        "color": "#38bdf8",
        "avatar": "sanji",
        "pos_x": -6.0,
        "pos_y": 2.5,
        "pos_z": 16.0,
        "description": "Đầu bếp thượng hạng phụ trách căn bếp hải tặc tại làng trung tâm, phân tích nguyên liệu và chuẩn bị năng lượng cho hòn đảo."
    },
    {
        "id": "agent-chopper-doctor",
        "name": "Tony Tony Chopper",
        "role": "Chief Medical Doctor & Diagnostic Specialist",
        "station": "library",
        "status": "idle",
        "color": "#ec4899",
        "avatar": "chopper",
        "pos_x": 22.0,
        "pos_y": 5.5,
        "pos_z": -8.0,
        "description": "Bác sĩ tuần lộc đáng yêu phụ trách phòng y tế tại tầng thư viện, chẩn đoán sức khỏe hệ thống và kiểm kê vật tư cứu thương."
    },
    {
        "id": "agent-robin-archaeologist",
        "name": "Nico Robin",
        "role": "Lead Archaeologist & Historical Scholar",
        "station": "library",
        "status": "idle",
        "color": "#8b5cf6",
        "avatar": "robin",
        "pos_x": 24.0,
        "pos_y": 5.5,
        "pos_z": -12.0,
        "description": "Nhà khảo cổ học tại tháp thư viện tri thức, tra cứu Poneglyph, giải mã cổ thư, trích xuất dữ liệu và nghiên cứu chuyên sâu."
    },
    {
        "id": "agent-franky-shipwright",
        "name": "Franky",
        "role": "Master Cyborg Shipwright & Engineer",
        "station": "sunny_shipyard",
        "status": "idle",
        "color": "#06b6d4",
        "avatar": "franky",
        "pos_x": -23.0,
        "pos_y": 1.5,
        "pos_z": -12.0,
        "description": "Thợ đóng tàu cyborg siêu cấp phụ trách bảo trì tàu Thousand Sunny tại xưởng cạn và thực thi mã lệnh kỹ thuật trong sandbox."
    },
    {
        "id": "agent-brook-musician",
        "name": "Brook",
        "role": "Soul King Musician & Morale Officer",
        "station": "strawhat_village",
        "status": "idle",
        "color": "#a855f7",
        "avatar": "brook",
        "pos_x": -4.5,
        "pos_y": 2.5,
        "pos_z": 18.0,
        "description": "Nhạc công Soul King bộ xương lịch lãm biểu diễn violin tại quảng trường làng, nâng cao nhuệ khí và tuần tra bờ cõi."
    },
    {
        "id": "agent-jinbe-helmsman",
        "name": "Jinbe",
        "role": "Master Helmsman & Ocean Guardian",
        "station": "harbor",
        "status": "idle",
        "color": "#2563eb",
        "avatar": "jinbe",
        "pos_x": -26.0,
        "pos_y": 1.2,
        "pos_z": 18.0,
        "description": "Hiệp sĩ biển cả kiêm lái tàu đại tài trấn giữ bến cảng ven biển, điều phối tàu thuyền, quan sát đại dương và hải lưu Grand Line."
    }
]

def seed_database():
    print("Connecting to database and verifying schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0

        for agent_data in INITIAL_AGENTS:
            agent = db.query(AgentModel).filter(AgentModel.id == agent_data["id"]).first()
            if not agent:
                new_agent = AgentModel(
                    id=agent_data["id"],
                    name=agent_data["name"],
                    role=agent_data["role"],
                    station=agent_data["station"],
                    status=agent_data["status"],
                    color=agent_data["color"],
                    avatar=agent_data["avatar"],
                    pos_x=agent_data["pos_x"],
                    pos_y=agent_data["pos_y"],
                    pos_z=agent_data["pos_z"],
                    description=agent_data["description"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_agent)
                created_count += 1
            else:
                agent.name = agent_data["name"]
                agent.role = agent_data["role"]
                agent.station = agent_data["station"]
                agent.color = agent_data["color"]
                agent.avatar = agent_data["avatar"]
                agent.pos_x = agent_data["pos_x"]
                agent.pos_y = agent_data["pos_y"]
                agent.pos_z = agent_data["pos_z"]
                agent.description = agent_data["description"]
                agent.updated_at = datetime.utcnow()
                updated_count += 1

        db.commit()
        print(f"Seed completed: {created_count} agents created, {updated_count} existing agents updated to Straw Hat Crew.")

        # Seed initial Grand Line fleet memories
        from backend.app.models.memory import MemoryModel
        initial_memories = [
            {
                "id": "mem-seed-cartography-001",
                "title": "Grand Line Archipelago Maritime Chart & Guidelines",
                "content": "Official maritime cartography protocol: Navigation coordinates across Grand Line islands require astronomical alignment and telemetry verification from the Observatory Archives. Standard workspace structure contains workspace_sandbox/ for safe generated reports.",
                "summary": "Maritime navigation coordinates and observatory archive verification guidelines.",
                "memory_type": "shared",
                "scope_type": "shared",
                "owner_agent_id": "agent-nami-navigator",
                "confidence": 1.0,
                "verification_status": "verified",
                "status": "active",
            },
            {
                "id": "mem-seed-sandbox-002",
                "title": "Safe Workspace Sandbox Execution Protocol",
                "content": "All agents writing code or reports must target workspace_sandbox/ strictly. Path traversals, absolute escapes, and reading credentials (.env or private keys) are strictly blocked by PolicyEngine.",
                "summary": "Mandatory sandbox directory constraints and path traversal defenses.",
                "memory_type": "shared",
                "scope_type": "shared",
                "owner_agent_id": "agent-captain-roger",
                "confidence": 1.0,
                "verification_status": "verified",
                "status": "active",
            },
            {
                "id": "mem-seed-zoro-hardware-003",
                "title": "Quartermaster Zoro's Hardware Telemetry Baseline",
                "content": "Baseline system diagnostics: Host platform CPU, RAM, and disk storage must be verified before executing heavy analytical pipelines. Zoro maintains armory diagnostics.",
                "summary": "Hardware telemetry baselines and resource monitoring standards.",
                "memory_type": "agent",
                "scope_type": "agent",
                "owner_agent_id": "agent-zoro-quartermaster",
                "confidence": 0.95,
                "verification_status": "verified",
                "status": "active",
            },
            {
                "id": "mem-seed-proposal-004",
                "title": "Proposed Fleet Tactical Reorganization Plan",
                "content": "Candidate operational proposal for coordinating 4 specialized stations during multi-agent expeditions. Pending Captain's review and approval.",
                "summary": "Candidate reorganization plan awaiting verification.",
                "memory_type": "task",
                "scope_type": "shared",
                "owner_agent_id": "agent-captain-roger",
                "confidence": 0.85,
                "verification_status": "unverified",
                "status": "candidate",
            }
        ]

        mem_created = 0
        for m_data in initial_memories:
            existing_m = db.query(MemoryModel).filter(MemoryModel.id == m_data["id"]).first()
            if not existing_m:
                mem_record = MemoryModel(
                    id=m_data["id"],
                    title=m_data["title"],
                    content=m_data["content"],
                    summary=m_data["summary"],
                    memory_type=m_data["memory_type"],
                    scope_type=m_data["scope_type"],
                    owner_agent_id=m_data["owner_agent_id"],
                    source_type="seed_knowledge",
                    confidence=m_data["confidence"],
                    verification_status=m_data["verification_status"],
                    status=m_data["status"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(mem_record)
                mem_created += 1

        db.commit()
        if mem_created > 0:
            print(f"Seeded {mem_created} initial persistent memories.")

        # Milestone 8: Synchronize Tool Definitions
        from backend.app.services.tool_service import tool_service
        tool_service.sync_tool_definitions(db)
        print("Synchronized all Tool Registry definitions to SQLite database.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
