"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import { useWorldStore } from "@/store/worldStore";

// Sanji's Traditional Wooden Restaurant & Veranda by the Central Lake (Image 2)
function TraditionalTavern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main Timber Foundation Deck */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.5, 3.8]} />
        <meshStandardMaterial color="#582f0e" roughness={0.85} />
      </mesh>

      {/* Main Wooden Walls (Brown timber post & beam) */}
      <mesh position={[0, 1.4, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 1.8, 2.8]} />
        <meshStandardMaterial color="#78350f" roughness={0.75} />
      </mesh>

      {/* Traditional Hipped Brown Tile Roof (Image 2) */}
      <mesh position={[0, 2.7, -0.4]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.2, 1.2, 4]} />
        <meshStandardMaterial color="#451a03" roughness={0.8} />
      </mesh>

      {/* Front Wooden Veranda / Porch */}
      <mesh position={[0, 0.35, 1.3]} receiveShadow>
        <boxGeometry args={[4.2, 0.15, 1.2]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </mesh>

      {/* Porch Pillars */}
      {[-1.8, 1.8].map((px, i) => (
        <mesh key={`pillar-${i}`} position={[px, 1.1, 1.7]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      ))}

      {/* Paper Lanterns */}
      {[-1.5, 1.5].map((lx, i) => (
        <group key={`lantern-${i}`} position={[lx, 1.8, 1.8]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.14, 0.35, 10]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
          <pointLight color="#f59e0b" intensity={1.5} distance={4} />
        </group>
      ))}
    </group>
  );
}

// Nami's Tangerine Orchard Grove (Image 2, Eastern Hill [10, 2.8, 1])
function TangerineGrove({ position }: { position: [number, number, number] }) {
  const trees = useMemo(() => {
    const list: Array<{ x: number; z: number; scale: number }> = [];
    const offsets = [
      [-1.8, -1.2],
      [-2.4, 0.6],
      [-1.2, 1.8],
      [1.4, -1.6],
      [2.2, -0.4],
      [1.8, 1.4],
      [0.2, 2.2],
      [-0.4, -2.2],
    ];
    offsets.forEach(([ox, oz], i) => {
      list.push({ x: ox, z: oz, scale: 0.85 + (i % 3) * 0.15 });
    });
    return list;
  }, []);

  return (
    <group position={position}>
      {/* Tangerine Trees with Bright Orange Fruit Spheres */}
      {trees.map((t, idx) => (
        <group key={`tree-${idx}`} position={[t.x, 0, t.z]}>
          {/* Tree Trunk */}
          <mesh position={[0, 0.7 * t.scale, 0]} castShadow>
            <cylinderGeometry args={[0.1 * t.scale, 0.14 * t.scale, 1.4 * t.scale, 8]} />
            <meshStandardMaterial color="#582f0e" roughness={0.85} />
          </mesh>
          {/* Lush Green Foliage Canopy */}
          <mesh position={[0, 1.6 * t.scale, 0]} castShadow>
            <sphereGeometry args={[0.75 * t.scale, 12, 10]} />
            <meshStandardMaterial color="#2d7a22" roughness={0.7} />
          </mesh>
          {/* Cluster of Orange Tangerine Fruits */}
          {[
            [0.4, 1.5, 0.4],
            [-0.4, 1.7, 0.3],
            [0.1, 1.8, -0.5],
            [-0.3, 1.4, -0.4],
            [0.5, 1.6, -0.2],
          ].map(([fx, fy, fz], fi) => (
            <mesh key={`fruit-${fi}`} position={[fx * t.scale, fy * t.scale, fz * t.scale]}>
              <sphereGeometry args={[0.11 * t.scale, 8, 8]} />
              <meshStandardMaterial color="#f97316" roughness={0.3} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Zeus Thundercloud & Golden Raitei Lightning Sparkles above Nami */}
      <group position={[0, 2.6, 0]}>
        <Sparkles count={30} scale={3.5} size={3.8} speed={1.6} color="#fde047" opacity={0.9} />
        <pointLight color="#facc15" intensity={2.5} distance={6} />
      </group>
    </group>
  );
}

// Sanji's Ifrit Jambe Blue-Orange Plasma Flame VFX
function IfritJambeFlame() {
  const flameRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (flameRef.current) {
      flameRef.current.intensity = 3.5 + Math.sin(t * 12.0) * 1.2;
    }
  });

  return (
    <group position={[0.4, 0.4, 0]}>
      {/* Blue Plasma Core */}
      <mesh>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
      {/* Yellow-Orange Outer Flame */}
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
      <pointLight ref={flameRef} color="#38bdf8" intensity={3.5} distance={6} />
    </group>
  );
}

export default function StrawHatVillageArea() {
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const hoveredAreaId = useWorldStore((s) => s.hoveredAreaId);
  const selectArea = useWorldStore((s) => s.selectArea);
  const setHoveredArea = useWorldStore((s) => s.setHoveredArea);

  const isSelected = selectedAreaId === "strawhat_village";
  const isHovered = hoveredAreaId === "strawhat_village";

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        selectArea("strawhat_village");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredArea("strawhat_village");
      }}
      onPointerOut={() => setHoveredArea(null)}
    >
      {/* ========================================================
          1. SANJI'S LAKESIDE RESTAURANT & TAVERN ([-10, 2.2, 2])
          ======================================================== */}
      <group position={[-10, 2.2, 2]}>
        <TraditionalTavern position={[0, 0, -2.5]} />
        <IfritJambeFlame />
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.25}>
          <Sparkles count={25} scale={[6, 4, 6]} size={3.5} speed={0.7} color="#38bdf8" />
        </Float>
        <pointLight position={[0, 2.5, 0]} color="#f59e0b" intensity={2.5} distance={12} />
      </group>

      {/* ========================================================
          2. NAMI'S TANGERINE ORCHARD GROVE ([10, 2.8, 1])
          ======================================================== */}
      <TangerineGrove position={[10, 2.8, 1]} />

      {/* Tactical Selection Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[-10, 2.35, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.2, 4.8, 36]} />
          <meshBasicMaterial
            color={isSelected ? "#ffaa00" : "#fbbf24"}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
