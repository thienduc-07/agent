import sys
import os

sys.path.insert(0, os.path.abspath("."))

from backend.app.agent_runtime.skills.skill_loader import skill_loader

def main():
    print("=" * 60)
    print("VERIFYING STRAW HAT MULTI-AGENT LIVING WORLD SYSTEM")
    print("=" * 60)

    skills = skill_loader.list_skills()

    print(f"\n[+] Total Anthropic Skills Loaded: {len(skills)}")
    assert len(skills) >= 15, "Expected at least 15 Anthropic skills loaded"

    crew_members = [
        ("agent-captain-roger", "Monkey D. Luffy (Gear 5 - Sun God Nika)"),
        ("agent-zoro-quartermaster", "Roronoa Zoro (King of Hell)"),
        ("agent-nami-navigator", "Nami (Clima-Tact & Zeus)"),
        ("agent-usopp-sniper", "God Usopp (Kuro Kabuto)"),
        ("agent-sanji-cook", "Vinsmoke Sanji (Ifrit Jambe)"),
        ("agent-chopper-doctor", "Tony Tony Chopper (Doctor)"),
        ("agent-robin-archaeologist", "Nico Robin (Gigante Fleur)"),
        ("agent-franky-shipwright", "Franky (General Franky BF-38)"),
        ("agent-brook-musician", "Brook (Soul King)"),
        ("agent-jinbe-helmsman", "Jinbe (Knight of the Sea)"),
    ]

    print("\n--- MAPPING 10 CREW MEMBERS TO ANTHROPIC SKILLS ---")
    for agent_id, agent_name in crew_members:
        agent_skills = skill_loader.get_agent_skills(agent_id)
        skill_names = [s.name for s in agent_skills]
        print(f"\n🏴‍☠️ {agent_name} ({agent_id}):")
        print(f"   Equipped Skills ({len(skill_names)}): {', '.join(skill_names)}")
        assert len(skill_names) > 0, f"Agent {agent_id} has no skills mapped"

        # Check skill prompt generation
        prompt_snippet = skill_loader.get_skills_prompt_for_agent(agent_id)
        assert len(prompt_snippet) > 50, f"Prompt snippet too short for {agent_id}"

    # Check key skill assignments
    zoro_skills = [s.name for s in skill_loader.get_agent_skills("agent-zoro-quartermaster")]
    assert "mcp-builder" in zoro_skills, "Zoro should have mcp-builder skill"

    nami_skills = [s.name for s in skill_loader.get_agent_skills("agent-nami-navigator")]
    assert "xlsx" in nami_skills and "pptx" in nami_skills, "Nami should have xlsx and pptx skills"

    robin_skills = [s.name for s in skill_loader.get_agent_skills("agent-robin-archaeologist")]
    assert "docx" in robin_skills and "pdf" in robin_skills, "Robin should have docx and pdf skills"

    sanji_skills = [s.name for s in skill_loader.get_agent_skills("agent-sanji-cook")]
    assert "frontend-design" in sanji_skills or "theme-factory" in sanji_skills, "Sanji should have frontend skills"

    usopp_skills = [s.name for s in skill_loader.get_agent_skills("agent-usopp-sniper")]
    assert "webapp-testing" in usopp_skills, "Usopp should have webapp-testing skill"

    print("\n" + "=" * 60)
    print("✅ ALL 10 STRAW HAT CREW MEMBERS & ANTHROPIC SKILLS VERIFIED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    main()
