import os
import re
import yaml
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

logger = logging.getLogger("grandline.skills.loader")

class SkillDefinition(BaseModel):
    name: str
    description: str
    license: Optional[str] = None
    path: str
    instructions: str
    scripts: List[str] = []
    assigned_agents: List[str] = []

# Explicit mapping of Anthropics Skills to Straw Hat Crew Members
AGENT_SKILL_ASSIGNMENTS: Dict[str, List[str]] = {
    # 1. Monkey D. Luffy — Gear 5 (Master Router & Orchestrator)
    "agent-captain-roger": [
        "claude-api",
        "skill-creator",
        "discernment-nudge",
        "internal-comms",
    ],
    # 2. Roronoa Zoro — King of Hell (Systems, C++/Python/TypeScript, Algorithms)
    "agent-zoro-quartermaster": [
        "mcp-builder",
        "claude-api",
    ],
    # 3. Nami — Weather Queen (Data Analytics, Spreadsheets, Business Intelligence)
    "agent-nami-navigator": [
        "xlsx",
        "pptx",
        "brand-guidelines",
    ],
    # 4. Usopp — God Usopp (QA Automation, E2E Testing, Security Edge-Cases)
    "agent-usopp-sniper": [
        "webapp-testing",
        "discernment-nudge",
    ],
    # 5. Vinsmoke Sanji — Ifrit Jambe (Frontend Architecture, UI/UX, WebGL & Styling)
    "agent-sanji-cook": [
        "frontend-design",
        "canvas-design",
        "theme-factory",
    ],
    # 6. Tony Tony Chopper — Sakura Clinic (Code Doctor, Diagnostics, Memory & Fixes)
    "agent-chopper-doctor": [
        "discernment-nudge",
        "webapp-testing",
        "academy-guide",
    ],
    # 7. Nico Robin — Demonio Fleur (Deep Research, Documentation, RAG, Word & PDF)
    "agent-robin-archaeologist": [
        "docx",
        "pdf",
        "doc-coauthoring",
    ],
    # 8. Franky — General Franky (Full-Stack Builder, DevOps, Docker & Deploy)
    "agent-franky-shipwright": [
        "web-artifacts-builder",
        "mcp-builder",
    ],
    # 9. Brook — Soul King (Video, Audio Synthesis, Motion Graphics & Art)
    "agent-brook-musician": [
        "algorithmic-art",
        "slack-gif-creator",
    ],
    # 10. Jinbe — Knight of the Sea (API Gateway, Real-Time Streams & Integrations)
    "agent-jinbe-helmsman": [
        "claude-api",
        "internal-comms",
    ],
}

class SkillLoader:
    """
    SkillLoader parses and indexes Anthropic Skills from ./agent-skills/skills
    and equips them to Straw Hat Crew Agents.
    """
    def __init__(self, search_paths: Optional[List[str]] = None):
        if search_paths is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            self.search_paths = [
                str(base_dir / "agent-skills" / "skills"),
                str(Path(__file__).resolve().parent),
            ]
        else:
            self.search_paths = search_paths
            
        self.skills: Dict[str, SkillDefinition] = {}
        self.load_all_skills()

    def load_all_skills(self) -> None:
        """Scan directory trees and parse each SKILL.md file"""
        for root_path_str in self.search_paths:
            root_path = Path(root_path_str)
            if not root_path.exists() or not root_path.is_dir():
                continue

            for item in root_path.iterdir():
                if item.is_dir():
                    skill_md = item / "SKILL.md"
                    if skill_md.exists() and skill_md.is_file():
                        try:
                            skill = self._parse_skill_file(skill_md, item)
                            if skill.name not in self.skills:
                                self.skills[skill.name] = skill
                                logger.info(f"Loaded skill '{skill.name}' from {skill_md}")
                        except Exception as e:
                            logger.error(f"Failed to parse skill at {skill_md}: {e}")

    def _parse_skill_file(self, file_path: Path, dir_path: Path) -> SkillDefinition:
        content = file_path.read_text(encoding="utf-8")
        frontmatter = {}
        instructions = content

        # Check for YAML frontmatter enclosed in ---
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
        if match:
            yaml_str = match.group(1)
            instructions = match.group(2).strip()
            try:
                frontmatter = yaml.safe_load(yaml_str) or {}
            except Exception as e:
                logger.warning(f"Error parsing frontmatter in {file_path}: {e}")

        skill_name = frontmatter.get("name", dir_path.name)
        skill_desc = frontmatter.get("description", instructions[:200] + "...")
        skill_license = frontmatter.get("license", "")

        # Find bundled scripts inside the skill directory
        scripts = []
        scripts_dir = dir_path / "scripts"
        if scripts_dir.exists() and scripts_dir.is_dir():
            for script_file in scripts_dir.glob("**/*"):
                if script_file.is_file():
                    scripts.append(str(script_file.relative_to(dir_path)))

        # Find assigned agents
        assigned = []
        for agent_id, skill_names in AGENT_SKILL_ASSIGNMENTS.items():
            if skill_name in skill_names:
                assigned.append(agent_id)

        return SkillDefinition(
            name=skill_name,
            description=skill_desc,
            license=skill_license,
            path=str(dir_path),
            instructions=instructions,
            scripts=scripts,
            assigned_agents=assigned,
        )

    def get_skill(self, name: str) -> Optional[SkillDefinition]:
        return self.skills.get(name)

    def list_skills(self) -> List[SkillDefinition]:
        return list(self.skills.values())

    def get_agent_skills(self, agent_id: str) -> List[SkillDefinition]:
        assigned_names = AGENT_SKILL_ASSIGNMENTS.get(agent_id, [])
        return [self.skills[name] for name in assigned_names if name in self.skills]

    def get_skills_prompt_for_agent(self, agent_id: str) -> str:
        """
        Builds a concise prompt injection summarizing the agent's equipped Anthropic skills.
        """
        agent_skills = self.get_agent_skills(agent_id)
        if not agent_skills:
            return ""

        prompt_lines = [
            "\n### EQUIPPED ANTHROPIC SKILLS & CAPABILITIES:",
            "You have direct access to the following operational skills:"
        ]
        for skill in agent_skills:
            prompt_lines.append(f"- **{skill.name}**: {skill.description}")
            if skill.scripts:
                prompt_lines.append(f"  Available scripts: {', '.join(skill.scripts[:5])}")

        prompt_lines.append(
            "\nFollow the operational standards defined in these skills when producing outputs, reports, code, tests, or documents."
        )
        return "\n".join(prompt_lines)

# Global singleton
skill_loader = SkillLoader()
