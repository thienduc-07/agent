"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Agent } from "@/types";

interface AgentAvatarProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agent: Agent) => void;
  liveThought?: string;
}

export default function AgentAvatar({
  agent,
  isSelected,
  onSelect,
  liveThought,
}: AgentAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const statusRingRef = useRef<THREE.Mesh>(null);
  const alertMarkerRef = useRef<THREE.Group>(null);
  const toolSparksRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle breathing/bobbing
      const bobOffset = Math.sin(t * 2 + agent.pos_x) * 0.08;
      groupRef.current.position.y = agent.pos_y + bobOffset;
    }

    // State-based dynamic visual updates
    if (statusRingRef.current) {
      if (agent.status === "EXECUTING_TOOL") {
        statusRingRef.current.rotation.z = t * 4;
        statusRingRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.15);
      } else if (agent.status === "THINKING") {
        statusRingRef.current.rotation.z = t * 1.5;
        statusRingRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      } else if (agent.status === "AWAITING_APPROVAL") {
        statusRingRef.current.rotation.z = t * 0.5;
        statusRingRef.current.scale.setScalar(1 + Math.sin(t * 6) * 0.25);
      } else {
        statusRingRef.current.rotation.z = t * 0.4;
        statusRingRef.current.scale.setScalar(1);
      }
    }

    if (alertMarkerRef.current && agent.status === "AWAITING_APPROVAL") {
      alertMarkerRef.current.rotation.y = t * 3;
      alertMarkerRef.current.position.y = 2.4 + Math.sin(t * 4) * 0.1;
    }

    if (toolSparksRef.current && agent.status === "EXECUTING_TOOL") {
      toolSparksRef.current.rotation.y = t * 5;
    }
  });

  const getStatusColor = () => {
    switch (agent.status) {
      case "THINKING":
        return "#38bdf8"; // Cyan
      case "EXECUTING_TOOL":
        return "#f59e0b"; // Amber
      case "AWAITING_APPROVAL":
        return "#ef4444"; // Pulsing Danger Red
      case "COMPLETED":
        return "#10b981"; // Emerald Green
      case "FAILED":
        return "#f43f5e"; // Rose Red
      default:
        return agent.color || "#64748b"; // Idle color
    }
  };

  const statusColor = getStatusColor();

  return (
    <group
      ref={groupRef}
      position={[agent.pos_x, agent.pos_y, agent.pos_z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agent);
      }}
    >
      {/* Dynamic Base Status Ring */}
      <mesh
        ref={statusRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 0]}
      >
        <ringGeometry args={[0.7, 0.88, 32]} />
        <meshBasicMaterial
          color={statusColor}
          side={THREE.DoubleSide}
          transparent
          opacity={agent.status === "IDLE" ? 0.4 : 0.9}
        />
      </mesh>

      {/* Selected Indicator Halo */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
          <ringGeometry args={[0.95, 1.05, 32]} />
          <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* --- 3D CHARACTER BODY & OUTFIT --- */}
      {/* Body / Coat */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.9, 12]} />
        <meshStandardMaterial
          color={
            agent.avatar === "captain"
              ? "#991b1b" // Red Coat
              : agent.avatar === "swordsman"
              ? "#065f46" // Green Coat
              : agent.avatar === "scholar"
              ? "#1e40af" // Blue Robe
              : "#7f1d1d" // Cyborg Heavy
          }
          roughness={0.5}
        />
      </mesh>

      {/* Character Head */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.4} />
      </mesh>

      {/* Anime Hair / Accessories based on Avatar */}
      {agent.avatar === "captain" && (
        <group position={[0, 1.48, 0]}>
          {/* Captain Bicorne Pirate Hat */}
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.22, 0.35]} />
            <meshStandardMaterial color="#1e1e24" />
          </mesh>
          <mesh position={[0, 0.05, 0.18]}>
            <circleGeometry args={[0.08, 12]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>
      )}

      {agent.avatar === "swordsman" && (
        <group position={[0, 1.38, 0]}>
          {/* Black Pirate Bandana */}
          <mesh>
            <sphereGeometry args={[0.27, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Triple Katana on Hip */}
          <mesh position={[0.38, -0.6, 0.1]} rotation={[0.4, 0.2, -0.6]}>
            <boxGeometry args={[0.08, 0.9, 0.15]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
          </mesh>
        </group>
      )}

      {agent.avatar === "scholar" && (
        <group position={[0, 1.3, 0]}>
          {/* Orange Navigator Hair */}
          <mesh position={[0, 0.05, -0.05]}>
            <sphereGeometry args={[0.28, 14, 14]} />
            <meshStandardMaterial color="#f97316" roughness={0.6} />
          </mesh>
          {/* Navigational Staff */}
          <mesh position={[-0.42, -0.4, 0.2]} rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.03, 0.03, 1.4, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} />
          </mesh>
        </group>
      )}

      {agent.avatar === "engineer" && (
        <group position={[0, 0.9, 0]}>
          {/* Massive Cyborg Shoulders */}
          <mesh position={[-0.48, 0, 0]} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.8} />
          </mesh>
          <mesh position={[0.48, 0, 0]} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.8} />
          </mesh>
        </group>
      )}

      {/* --- AWAITING APPROVAL WARNING BEACON --- */}
      {agent.status === "AWAITING_APPROVAL" && (
        <group ref={alertMarkerRef} position={[0, 2.3, 0]}>
          <mesh>
            <octahedronGeometry args={[0.35, 0]} />
            <meshBasicMaterial color="#ef4444" wireframe={false} />
          </mesh>
          <pointLight color="#ef4444" intensity={4.0} distance={5} />
        </group>
      )}

      {/* --- EXECUTING TOOL SPARKS / RINGS --- */}
      {agent.status === "EXECUTING_TOOL" && (
        <group ref={toolSparksRef} position={[0, 0.8, 0]}>
          <mesh rotation={[0.5, 0, 0]}>
            <torusGeometry args={[0.65, 0.03, 8, 24]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <mesh rotation={[-0.5, 0.8, 0]}>
            <torusGeometry args={[0.6, 0.03, 8, 24]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      )}

      {/* --- 3D HTML BILLBOARD OVERLAY --- */}
      <Html
        position={[0, 2.1, 0]}
        center
        distanceFactor={13}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center select-none text-center transform -translate-y-2 pointer-events-auto cursor-pointer"
             onClick={() => onSelect(agent)}>
          {/* Speech Bubble / Thought Banner */}
          {(agent.status !== "IDLE" || liveThought) && (
            <div
              className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-medium max-w-xs shadow-lg backdrop-blur-md transition-all ${
                agent.status === "AWAITING_APPROVAL"
                  ? "bg-red-950/90 border border-red-500 text-red-200 approval-pulse"
                  : agent.status === "EXECUTING_TOOL"
                  ? "bg-amber-950/90 border border-amber-500 text-amber-200"
                  : "bg-slate-900/90 border border-cyan-500/50 text-cyan-200"
              }`}
            >
              <div className="flex items-center gap-1.5 justify-center">
                {agent.status === "AWAITING_APPROVAL" && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                )}
                {agent.status === "EXECUTING_TOOL" && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                )}
                <span className="truncate">
                  {agent.status === "AWAITING_APPROVAL"
                    ? "⚠️ Captain's Authorization Needed!"
                    : agent.status === "EXECUTING_TOOL"
                    ? "⚙️ Executing Real Tool..."
                    : agent.status === "THINKING"
                    ? "🧠 Analyzing mission parameters..."
                    : liveThought || "Standing by"}
                </span>
              </div>
            </div>
          )}

          {/* Agent Badge Card */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md border backdrop-blur-md transition-transform hover:scale-110 ${
              isSelected
                ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-amber-500/20"
                : "bg-slate-900/80 border-slate-700 text-slate-200"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span>{agent.name.split(" ")[0]}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60">
              [{agent.status}]
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
