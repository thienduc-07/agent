"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Sparkles, Float } from "@react-three/drei";
import { useWorldStore } from "@/store/worldStore";

// Robin's 10 Giant Blooming Pink-Purple Arms (Mil Fleur / Gigantesco Mano - Exactly matching Image 2)
function GiantFlowerArms({ position }: { position: [number, number, number] }) {
  const arms = useMemo(() => {
    // 10 arms forming a graceful symmetrical blooming lotus fan behind Robin
    const list: Array<{ x: number; z: number; rotZ: number; rotX: number; scale: number }> = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 9) * 2 - 1; // -1 to +1
      list.push({
        x: t * 3.4,
        z: -Math.abs(t) * 0.9 - 0.4,
        rotZ: -t * 0.55,
        rotX: -0.15 + (1 - Math.abs(t)) * 0.2,
        scale: 1.1 + (1 - Math.abs(t)) * 0.35,
      });
    }
    return list;
  }, []);

  return (
    <group position={position}>
      {/* Stone Pedestal for Robin */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.7, 0.4, 24]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* 10 Curved Blooming Arms (#d474b8) with 5 Natural Spread Fingers */}
      {arms.map((a, idx) => (
        <group
          key={`blooming-arm-${idx}`}
          position={[a.x, 0.1, a.z]}
          rotation={[a.rotX, 0, a.rotZ]}
          scale={a.scale}
        >
          {/* Smooth Forearm */}
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.3, 2.7, 12]} />
            <meshStandardMaterial color="#d474b8" roughness={0.35} />
          </mesh>
          {/* Natural Palm */}
          <mesh position={[0, 2.85, 0]} castShadow>
            <boxGeometry args={[0.55, 0.55, 0.2]} />
            <meshStandardMaterial color="#db7dbd" roughness={0.35} />
          </mesh>
          {/* 5 Distinct Spread Fingers (Lotus Petal Flare) */}
          {[-0.2, -0.1, 0.0, 0.1, 0.2].map((fx, fIdx) => (
            <mesh
              key={`finger-${fIdx}`}
              position={[fx, 3.45 + (fIdx === 2 ? 0.22 : fIdx === 1 || fIdx === 3 ? 0.12 : 0), 0.05]}
              rotation={[0.12, 0, fx * 0.65]}
              castShadow
            >
              <cylinderGeometry args={[0.045, 0.06, 0.8, 8]} />
              <meshStandardMaterial color="#e598cc" roughness={0.3} />
            </mesh>
          ))}
          {/* Purple Fleur Light */}
          <pointLight position={[0, 3.2, 0.2]} color="#e879f9" intensity={1.2} distance={4} />
        </group>
      ))}
    </group>
  );
}

// Chopper's White Medical Clinic with Pink-Orange Roof & Red Cross (Image 2)
function SakuraMedicalClinic({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* White Clinic Building */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.2, 3.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Pink-Orange Gabled Tile Roof */}
      <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.4, 1.4, 4]} />
        <meshStandardMaterial color="#fb923c" roughness={0.65} />
      </mesh>

      {/* Front Entrance Canopy */}
      <mesh position={[0, 0.9, 1.7]}>
        <boxGeometry args={[1.6, 1.6, 0.3]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Prominent Red Medical Cross (+) on Front Wall */}
      <group position={[0, 1.8, 1.62]}>
        {/* Vertical Cross Bar */}
        <mesh>
          <boxGeometry args={[0.2, 0.75, 0.04]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {/* Horizontal Cross Bar */}
        <mesh>
          <boxGeometry args={[0.75, 0.2, 0.04]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
}

// Multi-Tier Fluffy Sakura Cherry Blossom Trees with Layered Clouds of Pink Foliage (Framing Behind Clinic)
function SakuraFluffyGrove({ position }: { position: [number, number, number] }) {
  const trees = useMemo(() => {
    // All trees placed behind or to far sides (z <= -1.8) so line-of-sight to Chopper is 100% clear
    return [
      { x: -3.8, z: -2.8, scale: 1.2 },
      { x: -2.4, z: -4.5, scale: 1.35 },
      { x: 0.0, z: -5.2, scale: 1.4 },
      { x: 2.8, z: -4.2, scale: 1.3 },
      { x: 3.8, z: -2.2, scale: 1.15 },
    ];
  }, []);

  return (
    <group position={position}>
      {trees.map((t, idx) => (
        <group key={`sakura-tree-${idx}`} position={[t.x, 0, t.z]}>
          {/* Trunk */}
          <mesh position={[0, 1.0 * t.scale, 0]} castShadow>
            <cylinderGeometry args={[0.15 * t.scale, 0.22 * t.scale, 2.0 * t.scale, 8]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
          {/* Multi-Tier Fluffy Pink Blossom Clouds */}
          {[
            [0, 2.4, 0, 1.1],
            [-0.6, 2.7, 0.3, 0.85],
            [0.6, 2.8, -0.2, 0.9],
            [0.1, 3.3, 0.1, 0.75],
            [-0.3, 3.2, -0.4, 0.65],
          ].map(([bx, by, bz, br], bi) => (
            <mesh
              key={`puff-${bi}`}
              position={[bx * t.scale, by * t.scale, bz * t.scale]}
              castShadow
            >
              <sphereGeometry args={[br * t.scale, 10, 10]} />
              <meshStandardMaterial color="#f472b6" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Chopper's Dedicated Medical Apothecary Station & Herb Garden (Image 2)
function ChopperApothecaryStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rustic Wooden Apothecary Table */}
      <mesh position={[0.85, 0.45, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.9, 0.65]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Table Top Surface Rim */}
      <mesh position={[0.85, 0.92, 0.2]} castShadow>
        <boxGeometry args={[1.2, 0.06, 0.72]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </mesh>
      {/* Colorful Healing Medicine Bottles */}
      <mesh position={[0.6, 1.08, 0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.26, 8]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.8, 1.05, 0.25]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.22, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[1.0, 1.1, 0.18]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.3, 8]} />
        <meshStandardMaterial color="#facc15" roughness={0.1} transparent opacity={0.85} />
      </mesh>
      {/* Mortar & Pestle */}
      <mesh position={[0.85, 0.98, 0.35]} castShadow>
        <cylinderGeometry args={[0.09, 0.06, 0.12, 10]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* Small Herb Planter with Colorful Healing Flowers */}
      <mesh position={[-0.9, 0.2, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.35, 0.6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>
      {[-0.25, 0, 0.25].map((fx, fi) => (
        <group key={`flower-${fi}`} position={[-0.9 + fx, 0.42, 0.2]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={fi === 0 ? "#f43f5e" : fi === 1 ? "#38bdf8" : "#fbbf24"} />
          </mesh>
        </group>
      ))}
      {/* Cute Wooden Medical Signpost */}
      <group position={[1.6, 0.6, 0.1]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, 0.45, 0.05]} castShadow>
          <boxGeometry args={[0.42, 0.35, 0.06]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
        {/* Red Cross on Signpost */}
        <mesh position={[0, 0.45, 0.09]}>
          <boxGeometry args={[0.08, 0.22, 0.02]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 0.45, 0.09]}>
          <boxGeometry args={[0.22, 0.08, 0.02]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
      </group>
    </group>
  );
}

export default function LibraryArea() {
  const selectArea = useWorldStore((s) => s.selectArea);
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const hoveredAreaId = useWorldStore((s) => s.hoveredAreaId);
  const setHoveredArea = useWorldStore((s) => s.setHoveredArea);

  const isSelected = selectedAreaId === "library";
  const isHovered = hoveredAreaId === "library";

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        selectArea("library");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredArea("library");
      }}
      onPointerOut={() => setHoveredArea(null)}
    >
      {/* ========================================================
          1. CHOPPER'S SAKURA MEDICAL HILL (North-West Promontory, [-12.5, 4.22, -1.0])
          ======================================================== */}
      <group position={[-12.5, 4.22, -1.0]}>
        {/* Background Medical Clinic & Cherry Blossom Trees */}
        <SakuraMedicalClinic position={[-1.2, 0, -3.8]} />
        <SakuraFluffyGrove position={[0, 0, -2.0]} />

        {/* Dedicated Foreground Apothecary Table & Herb Garden */}
        <ChopperApothecaryStation position={[0, 0, 0]} />

        {/* Falling Pink Sakura Blossom Petals */}
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.4}>
          <Sparkles count={45} scale={[10, 6, 10]} size={4.2} speed={0.6} color="#ff80bf" opacity={0.9} />
        </Float>
        <pointLight position={[0, 3.5, 0]} color="#f472b6" intensity={2.5} distance={14} />

        {/* Selection Ring for Clinic */}
        {(isSelected || isHovered) && (
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.2, 4.8, 36]} />
            <meshBasicMaterial color="#ff66b2" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
        )}
      </group>

      {/* ========================================================
          2. NICO ROBIN'S 10 BLOOMING LOTUS ARMS (East, [19, 2.2, 0])
          ======================================================== */}
      <group position={[19, 2.2, 0]}>
        <GiantFlowerArms position={[0, 0, -0.8]} />

        {/* Fleur Petal Sparkles */}
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
          <Sparkles count={35} scale={[8, 6, 8]} size={4} speed={0.5} color="#d966ff" opacity={0.85} />
        </Float>
        <pointLight position={[0, 3.5, 0]} color="#d966ff" intensity={2.5} distance={12} />

        {/* Selection Ring for Robin's Shrine */}
        {(isSelected || isHovered) && (
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.2, 4.8, 36]} />
            <meshBasicMaterial color="#d966ff" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
        )}
      </group>
    </group>
  );
}
