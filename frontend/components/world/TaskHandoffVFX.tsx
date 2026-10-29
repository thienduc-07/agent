"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWorldStore } from "@/store/worldStore";

// Predefined Straw Hat Peak Form Skills
export const CREW_SKILLS: Record<
  string,
  {
    name: string;
    vietnameseName: string;
    color: string;
    trailColor: string;
    icon: string;
  }
> = {
  "agent-captain-roger": {
    name: "Gomu Gomu no Bajrang Gun",
    vietnameseName: "Haki Bá Vương Đỏ Đen & Bajrang Gun",
    color: "#ef4444",
    trailColor: "#7f1d1d",
    icon: "⚡",
  },
  "agent-zoro-quartermaster": {
    name: "103 Mercies Dragon Damnation",
    vietnameseName: "Tam Kiếm Phái: Diêm Vương Phi Long Tuyệt Chiêu",
    color: "#10b981",
    trailColor: "#065f46",
    icon: "⚔️",
  },
  "agent-nami-navigator": {
    name: "Raitei (Zeus Breeze Tempo)",
    vietnameseName: "Lôi Đình Zeus Breeze Tempo",
    color: "#facc15",
    trailColor: "#854d0e",
    icon: "🌩️",
  },
  "agent-usopp-sniper": {
    name: "Hissatsu: Firebird Star",
    vietnameseName: "Tất Sát: Hỏa Điểu Tinh",
    color: "#f97316",
    trailColor: "#9a3412",
    icon: "🎯",
  },
  "agent-sanji-cook": {
    name: "Ifrit Jambe: Boeuf Burst",
    vietnameseName: "Cước Lửa Quỷ Ifrit: Boeuf Burst",
    color: "#38bdf8",
    trailColor: "#0369a1",
    icon: "🔥",
  },
  "agent-chopper-doctor": {
    name: "Kokutei Cross / Sakura Blizzard",
    vietnameseName: "Cơn Lốc Hoa Anh Đào & Khắc Ấn Móng Guốc",
    color: "#f472b6",
    trailColor: "#9d174d",
    icon: "🌸",
  },
  "agent-robin-archaeologist": {
    name: "Mil Fleur: Gigantesco Mano",
    vietnameseName: "Nghìn Cánh Hoa: Cánh Tay Khổng Lồ",
    color: "#a855f7",
    trailColor: "#581c87",
    icon: "🪷",
  },
  "agent-franky-shipwright": {
    name: "Franky Radical Beam",
    vietnameseName: "Chùm Laser Radical Beam BF-38",
    color: "#fbbf24",
    trailColor: "#b45309",
    icon: "💥",
  },
  "agent-brook-musician": {
    name: "Yahazu Giri / Soul Solid",
    vietnameseName: "Băng Kiếm Soul Solid & Khúc Nhạc Linh Hồn",
    color: "#67e8f9",
    trailColor: "#155e75",
    icon: "🎵",
  },
  "agent-jinbe-helmsman": {
    name: "Kairyu Ipponzeoi",
    vietnameseName: "Ngũ Thiên Ngói Chưởng & Thủy Lưu Quật Nhất",
    color: "#0284c7",
    trailColor: "#075985",
    icon: "🌊",
  },
};

export default function TaskHandoffVFX() {
  const activeHandoff = useWorldStore((s) => s.activeHandoff);
  const clearTaskHandoff = useWorldStore((s) => s.clearTaskHandoff);
  const agents = useWorldStore((s) => s.agents);

  const projectileRef = useRef<THREE.Group>(null);
  const trailPointsRef = useRef<THREE.Points>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  // Source & Target 3D coordinates
  const { startPos, endPos, skillInfo } = useMemo(() => {
    if (!activeHandoff) {
      return {
        startPos: new THREE.Vector3(0, 8, 0),
        endPos: new THREE.Vector3(0, 8, 0),
        skillInfo: CREW_SKILLS["agent-captain-roger"],
      };
    }

    const fromAgent = agents[activeHandoff.fromAgentId];
    const toAgent = agents[activeHandoff.toAgentId];

    const sPos = fromAgent
      ? new THREE.Vector3(fromAgent.position[0], fromAgent.position[1] + 1.2, fromAgent.position[2])
      : new THREE.Vector3(0, 8, 0);

    const ePos = toAgent
      ? new THREE.Vector3(toAgent.position[0], toAgent.position[1] + 1.2, toAgent.position[2])
      : new THREE.Vector3(0, 8, 0);

    const info = CREW_SKILLS[activeHandoff.fromAgentId] || CREW_SKILLS["agent-captain-roger"];

    return { startPos: sPos, endPos: ePos, skillInfo: info };
  }, [activeHandoff, agents]);

  // Cubic Bézier Curve with high parabolic arch over the island
  const curve = useMemo(() => {
    const midX = (startPos.x + endPos.x) / 2;
    const midZ = (startPos.z + endPos.z) / 2;
    // Arch apex proportional to distance
    const dist = startPos.distanceTo(endPos);
    const archHeight = Math.max(startPos.y, endPos.y) + Math.min(18, Math.max(7, dist * 0.35));

    const ctrl1 = new THREE.Vector3(
      startPos.x * 0.6 + midX * 0.4,
      archHeight,
      startPos.z * 0.6 + midZ * 0.4
    );
    const ctrl2 = new THREE.Vector3(
      endPos.x * 0.6 + midX * 0.4,
      archHeight,
      endPos.z * 0.6 + midZ * 0.4
    );

    return new THREE.CubicBezierCurve3(startPos, ctrl1, ctrl2, endPos);
  }, [startPos, endPos]);

  // Trail particle positions buffer
  const trailCount = 40;
  const trailPositions = useMemo(() => new Float32Array(trailCount * 3), [trailCount]);

  useFrame((state) => {
    if (!activeHandoff) return;

    const currentTime = state.clock.getElapsedTime();
    const elapsed = currentTime - activeHandoff.startTime;
    const progress = Math.min(1.0, elapsed / (activeHandoff.duration || 2.2));

    // Get current position on Bézier curve
    const currentPoint = curve.getPoint(progress);

    if (projectileRef.current) {
      projectileRef.current.position.copy(currentPoint);
      // Spinning dynamic rotation
      projectileRef.current.rotation.y = currentTime * 8.0;
      projectileRef.current.rotation.z = currentTime * 6.0;
    }

    if (shockwaveRef.current) {
      // Pulsing energy shockwave
      const scale = 1.0 + Math.sin(currentTime * 12.0) * 0.3;
      shockwaveRef.current.scale.set(scale, scale, scale);
    }

    // Update trailing particles along curve behind the projectile
    if (trailPointsRef.current) {
      for (let i = 0; i < trailCount; i++) {
        const trailProgress = Math.max(0, progress - (i / trailCount) * 0.35);
        const trailPt = curve.getPoint(trailProgress);
        trailPositions[i * 3] = trailPt.x + (Math.sin(currentTime * 10 + i) * 0.2);
        trailPositions[i * 3 + 1] = trailPt.y + (Math.cos(currentTime * 10 + i) * 0.2);
        trailPositions[i * 3 + 2] = trailPt.z;
      }
      trailPointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Finished transition: clear handoff
    if (progress >= 1.0) {
      clearTaskHandoff();
    }
  });

  if (!activeHandoff) return null;

  return (
    <group>
      {/* Trailing Particle System */}
      <points ref={trailPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={skillInfo.color}
          size={0.65}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Main Projectile Head with Anime VFX */}
      <group ref={projectileRef} position={[startPos.x, startPos.y, startPos.z]}>
        {/* Core Glowing Energy Sphere */}
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color={skillInfo.color} />
        </mesh>

        {/* Outer Aura Shell */}
        <mesh>
          <sphereGeometry args={[0.85, 12, 12]} />
          <meshBasicMaterial
            color={skillInfo.trailColor}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Orbiting Shockwave Energy Rings */}
        <mesh ref={shockwaveRef} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.1, 0.08, 8, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
          <torusGeometry args={[0.95, 0.06, 8, 24]} />
          <meshBasicMaterial color={skillInfo.color} transparent opacity={0.8} />
        </mesh>

        {/* Dynamic Point Light illuminating the terrain below */}
        <pointLight color={skillInfo.color} intensity={5.0} distance={20} />
      </group>
    </group>
  );
}
