"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface IslandTerrainProps {
  onSelectStation?: (stationKey: string) => void;
}

export default function IslandTerrain({ onSelectStation }: IslandTerrainProps) {
  const lighthouseBeaconRef = useRef<THREE.Group>(null);
  const shipFlagRef = useRef<THREE.Mesh>(null);
  const forgeGlowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Rotate lighthouse beam
    if (lighthouseBeaconRef.current) {
      lighthouseBeaconRef.current.rotation.y = t * 1.2;
    }
    // Sway pirate flag in wind
    if (shipFlagRef.current) {
      shipFlagRef.current.rotation.z = Math.sin(t * 3) * 0.15;
    }
    // Forge pulsating ember light
    if (forgeGlowRef.current) {
      forgeGlowRef.current.intensity = 2.0 + Math.sin(t * 5) * 0.8;
    }
  });

  return (
    <group>
      {/* --- MAIN ISLAND LANDMASS --- */}
      {/* Sandy Shallow Shore */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[14, 15.5, 0.4, 32]} />
        <meshStandardMaterial color="#d4a373" roughness={0.9} />
      </mesh>

      {/* Island Stone Foundation */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[12, 13.5, 0.6, 28]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Central Citadel Plateau */}
      <mesh position={[0, 0.7, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[7, 8, 0.6, 24]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* --- STATION 1: CITADEL & FLAGSHIP BRIDGE (Center: 0, 1.2, 0) --- */}
      <group
        position={[0, 1.0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStation?.("captain_bridge");
        }}
      >
        {/* Fortress Stone Citadel Base */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.2, 3.6, 0.8, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.2} />
        </mesh>

        {/* Command Wheelhouse Tower */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[2.0, 2.3, 1.0, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>

        {/* Golden Grand Line Helm / Wheel */}
        <mesh position={[0, 1.8, 0.8]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.5, 0.08, 8, 24]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Commander Flagpole & Banner */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1.8, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} />
        </mesh>
        <mesh position={[0.45, 3.0, 0]}>
          <boxGeometry args={[0.9, 0.5, 0.04]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>

        {/* Ambient Station Beacon */}
        <pointLight position={[0, 2.2, 0]} color="#f59e0b" intensity={2.5} distance={10} />
      </group>

      {/* --- STATION 2: ARMORY & PIRATE SHIP DOCKS (West: -6.5, 0.5, 4.0) --- */}
      <group
        position={[-6.5, 0.3, 4.0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStation?.("armory_deck");
        }}
      >
        {/* Wooden Pier Deck */}
        <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
          <boxGeometry args={[4.5, 0.25, 2.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {/* Pier Support Stilts */}
        {[-1.8, 0, 1.8].map((x, i) => (
          <mesh key={i} position={[x, -0.4, 1.0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.9, 8]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
        ))}

        {/* Pirate Galleon Ship Moored at Dock */}
        <group position={[-2.2, 0.3, 1.2]} rotation={[0, 0.2, 0]}>
          {/* Wooden Hull */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.8, 1.3]} />
            <meshStandardMaterial color="#582f0e" roughness={0.7} />
          </mesh>
          {/* Main Mast */}
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 3.2, 8]} />
            <meshStandardMaterial color="#7f4f24" />
          </mesh>
          {/* Folded Sails / Crossbeam */}
          <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
            <meshStandardMaterial color="#936639" />
          </mesh>
          <mesh position={[0, 2.1, 0.05]}>
            <boxGeometry args={[1.5, 0.6, 0.05]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </mesh>
          {/* Jolly Roger Pirate Flag */}
          <mesh ref={shipFlagRef} position={[0.4, 3.2, 0]}>
            <boxGeometry args={[0.7, 0.45, 0.03]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Armory Weapon Racks & Cannons */}
        <mesh position={[1.2, 0.4, -0.6]} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} />
        </mesh>
        <mesh position={[1.2, 0.6, -0.6]} rotation={[Math.PI / 2, 0, -0.3]}>
          <cylinderGeometry args={[0.12, 0.16, 0.8, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        <pointLight position={[0, 1.5, 0]} color="#10b981" intensity={2.0} distance={8} />
      </group>

      {/* --- STATION 3: OBSERVATORY LIGHTHOUSE & ARCHIVES (East: 6.5, 2.4, -4.0) --- */}
      <group
        position={[6.5, 0.3, -4.0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStation?.("archives_tower");
        }}
      >
        {/* High Rocky Cliff Outcrop */}
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.5, 3.2, 2.0, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>

        {/* White Stone Lighthouse Tower */}
        <mesh position={[0, 2.8, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.6, 2.4, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Sapphire Observation Gallery */}
        <mesh position={[0, 4.2, 0]}>
          <cylinderGeometry args={[1.4, 1.4, 0.4, 16]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Glass Dome */}
        <mesh position={[0, 4.6, 0]}>
          <sphereGeometry args={[1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} roughness={0.1} />
        </mesh>

        {/* Rotating Holographic Search Beam */}
        <group ref={lighthouseBeaconRef} position={[0, 4.6, 0]}>
          <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.2, 7.0, 16, 1, true]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>
        </group>

        <pointLight position={[0, 4.8, 0]} color="#3b82f6" intensity={3.5} distance={12} />
      </group>

      {/* --- STATION 4: MOLTEN BLACKSMITH & FORGE (South: 0.0, 0.6, -6.5) --- */}
      <group
        position={[0.0, 0.3, -6.5]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStation?.("blacksmith_forge");
        }}
      >
        {/* Dark Basalt Workshop Foundation */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.6, 3.8]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>

        {/* Volcanic Lava Basin */}
        <mesh position={[0, 0.65, 0.6]}>
          <cylinderGeometry args={[1.0, 1.0, 0.1, 16]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.8} />
        </mesh>

        {/* Iron Anvil & Mechanical Gears */}
        <mesh position={[0, 0.95, -0.4]} castShadow>
          <boxGeometry args={[0.7, 0.5, 0.4]} />
          <meshStandardMaterial color="#52525b" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Twin Smoking Chimneys */}
        <mesh position={[-1.2, 1.6, -1.0]} castShadow>
          <cylinderGeometry args={[0.3, 0.35, 2.0, 10]} />
          <meshStandardMaterial color="#27272a" roughness={0.7} />
        </mesh>
        <mesh position={[1.2, 1.6, -1.0]} castShadow>
          <cylinderGeometry args={[0.3, 0.35, 2.0, 10]} />
          <meshStandardMaterial color="#27272a" roughness={0.7} />
        </mesh>

        {/* Glowing Molten Forge Light */}
        <pointLight ref={forgeGlowRef} position={[0, 1.2, 0.6]} color="#ef4444" intensity={2.5} distance={9} />
      </group>
    </group>
  );
}
