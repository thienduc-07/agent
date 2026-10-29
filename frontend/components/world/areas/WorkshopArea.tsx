"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import { useWorldStore } from "@/store/worldStore";

// Usopp's Tall Wooden Sniping Watchtower with X-Braces (Image 2)
function WoodenWatchtower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 4 Angled Timber Stilt Legs */}
      {[
        [-1.1, -1.1],
        [1.1, -1.1],
        [-1.1, 1.1],
        [1.1, 1.1],
      ].map(([lx, lz], li) => (
        <mesh
          key={`tower-leg-${li}`}
          position={[lx * 0.72, 3.6, lz * 0.72]}
          rotation={[lz * 0.04, 0, -lx * 0.04]}
          castShadow
        >
          <cylinderGeometry args={[0.1, 0.16, 7.2, 8]} />
          <meshStandardMaterial color="#582f0e" roughness={0.85} />
        </mesh>
      ))}

      {/* Structural X-Bracing across tiers */}
      {[2.2, 4.6].map((hy, hi) => (
        <group key={`cross-tier-${hi}`} position={[0, hy, 0]}>
          <mesh>
            <boxGeometry args={[1.8, 0.1, 0.1]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.8, 0.1, 0.1]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      ))}

      {/* Observation Deck Platform (Where God Usopp stands at y ~ 7.2) */}
      <mesh position={[0, 7.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.2, 2.7]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>

      {/* Wooden Deck Railings */}
      {[
        [0, 7.6, 1.3, 2.6, 0.08, 0.06],
        [0, 7.6, -1.3, 2.6, 0.08, 0.06],
        [1.3, 7.6, 0, 0.06, 0.08, 2.6],
        [-1.3, 7.6, 0, 0.06, 0.08, 2.6],
      ].map(([rx, ry, rz, sx, sy, sz], ri) => (
        <mesh key={`railing-${ri}`} position={[rx, ry, rz]}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color="#451a03" />
        </mesh>
      ))}

      {/* Thatched Roof Canopy on Top */}
      <mesh position={[0, 9.4, 0]} castShadow>
        <coneGeometry args={[2.3, 1.4, 4]} />
        <meshStandardMaterial color="#854d0e" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Franky's Dedicated Shipbuilding Workbench & Tool Staging (Image 2)
function FrankySandstoneLedge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Light Sandstone Ledge Platform */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.6, 0.7, 24]} />
        <meshStandardMaterial color="#e5d0ac" roughness={0.7} />
      </mesh>

      {/* Heavy Timber Carpentry Workbench */}
      <group position={[1.8, 0.7, 0.4]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.85, 0.7]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {/* Steel Worktop with Anvil */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[1.7, 0.08, 0.76]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Steel Anvil */}
        <mesh position={[-0.4, 1.05, 0]} castShadow>
          <boxGeometry args={[0.35, 0.22, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Blueprint Scroll */}
        <mesh position={[0.3, 0.96, 0]} rotation={[0, 0.2, 0]}>
          <planeGeometry args={[0.5, 0.35]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.5} />
        </mesh>
      </group>

      {/* Spare Ship Timbers & Iron Gears */}
      <group position={[-1.8, 0.7, 0.6]} rotation={[0, 0.5, 0]}>
        {/* Stacked Wooden Planks */}
        {[-0.08, 0.08].map((py, pi) => (
          <mesh key={`plank-${pi}`} position={[0, py + 0.1, 0]} rotation={[0, pi * 0.1, 0]} castShadow>
            <boxGeometry args={[1.8, 0.12, 0.3]} />
            <meshStandardMaterial color="#92400e" roughness={0.75} />
          </mesh>
        ))}
        {/* Iron Cog Gear */}
        <mesh position={[0.2, 0.35, -0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* Palm Trees framing the back of the ledge */}
      {[-2.2, 2.2].map((px, pi) => (
        <group key={`ledge-palm-${pi}`} position={[px, 0.7, -1.2]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1.8, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.7, 8, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Franky's Radical Beam Laser Energy Glow (Image 2)
function RadicalBeamLaser() {
  const laserRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (laserRef.current) {
      const pulse = 0.9 + Math.sin(t * 20.0) * 0.15;
      laserRef.current.scale.set(pulse, 1.0, pulse);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3.5 + Math.sin(t * 22.0) * 1.2;
    }
  });

  return (
    <group position={[12, 6.2, -5.5]} rotation={[0.08, -0.65, 0]}>
      {/* Outer Golden Orange Energy Beam Tube */}
      <mesh position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.26, 6.8, 12]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.55} />
      </mesh>
      {/* Blazing White-Yellow Core Beam */}
      <mesh ref={laserRef} position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 6.8, 12]} />
        <meshBasicMaterial color="#ffea00" />
      </mesh>
      {/* Laser Muzzle Flare */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, 1.5]} color="#ffaa00" intensity={3.5} distance={12} />
    </group>
  );
}

export default function WorkshopArea() {
  const selectArea = useWorldStore((s) => s.selectArea);
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const hoveredAreaId = useWorldStore((s) => s.hoveredAreaId);
  const setHoveredArea = useWorldStore((s) => s.setHoveredArea);

  const isSelected = selectedAreaId === "workshop";
  const isHovered = hoveredAreaId === "workshop";

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        selectArea("workshop");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredArea("workshop");
      }}
      onPointerOut={() => setHoveredArea(null)}
    >
      {/* ========================================================
          1. USOPP'S TALL WOODEN WATCHTOWER ([4.5, 3.8, -8.5])
          ======================================================== */}
      <WoodenWatchtower position={[4.5, 3.8, -8.5]} />

      {/* ========================================================
          2. FRANKY'S SANDSTONE LEDGE ([12, 5.0, -5.5])
          ======================================================== */}
      <FrankySandstoneLedge position={[12, 4.8, -5.5]} />

      {/* Franky's Blazing Radical Beam Laser (Image 2) */}
      <RadicalBeamLaser />

      {/* Molten Metal & Super Laser Sparks */}
      <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.35}>
        <Sparkles count={35} scale={[10, 6, 10]} size={4} speed={1.0} color="#ffcc00" />
      </Float>

      {/* Selection Ring for Workshop */}
      {(isSelected || isHovered) && (
        <mesh position={[12, 5.2, -5.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.2, 4.8, 36]} />
          <meshBasicMaterial color="#ff3333" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
