"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import { useWorldStore } from "@/store/worldStore";

// Jinbe's Dynamic Swirling Water Vortex Geysers (Kairyu Ipponzeoi - Image 2)
function SwirlingWaterVortex({
  position,
  height = 4.6,
}: {
  position: [number, number, number];
  height?: number;
}) {
  const outerSpoutRef = useRef<THREE.Group>(null);
  const foamRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (outerSpoutRef.current) {
      outerSpoutRef.current.rotation.y = t * 5.0;
    }
    if (foamRef.current) {
      const s = 1.0 + Math.sin(t * 12.0) * 0.15;
      foamRef.current.scale.set(s, 1.0, s);
    }
  });

  return (
    <group position={position}>
      {/* Twisting Spiral Water Geyser Tubes */}
      <group ref={outerSpoutRef}>
        {[0, 1, 2].map((idx) => {
          const rotOffset = (idx * Math.PI * 2) / 3;
          return (
            <mesh
              key={`spiral-${idx}`}
              position={[Math.cos(rotOffset) * 0.2, height / 2, Math.sin(rotOffset) * 0.2]}
              rotation={[0.1, rotOffset, 0.08]}
            >
              <cylinderGeometry args={[0.75, 0.35, height, 16, 8, true]} />
              <meshStandardMaterial
                color="#0ea5e9"
                emissive="#0284c7"
                emissiveIntensity={0.65}
                roughness={0.15}
                metalness={0.25}
                transparent
                opacity={0.82}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}

        {/* Churning White-Blue Core Geyser */}
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[0.42, 0.22, height + 0.4, 12, 4, true]} />
          <meshStandardMaterial
            color="#e0f2fe"
            emissive="#7dd3fc"
            emissiveIntensity={0.9}
            transparent
            opacity={0.88}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Foamy Churning Base Splash Ring */}
      <mesh ref={foamRef} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 2.2, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Rising Water Mist & Spray Particles */}
      <Sparkles
        count={28}
        scale={[2.2, height, 2.2]}
        size={3.8}
        speed={1.6}
        color="#bae6fd"
        opacity={0.9}
      />
    </group>
  );
}

// Brook's Stepped Grass Platform & Glowing Cyan Ice Crystals (Image 2)
function BrookIcePedestal({ position }: { position: [number, number, number] }) {
  const crystals = useMemo(() => {
    return [
      { x: -1.4, z: -0.8, h: 2.2, rot: [0.15, 0.4, -0.15] },
      { x: -0.6, z: -1.2, h: 2.8, rot: [0.2, 0.1, 0.05] },
      { x: 0.5, z: -1.3, h: 3.1, rot: [0.25, -0.2, 0.1] },
      { x: 1.3, z: -0.9, h: 2.4, rot: [0.15, -0.4, 0.2] },
    ];
  }, []);

  return (
    <group position={position}>
      {/* Tier 1 Round Grass Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.8, 0.4, 24]} />
        <meshStandardMaterial color="#3d8f2e" roughness={0.7} />
      </mesh>

      {/* Tier 2 Step for Brook */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 2.1, 0.35, 24]} />
        <meshStandardMaterial color="#4da83b" roughness={0.65} />
      </mesh>

      {/* Glowing Cyan Ice Crystals behind Brook's Back */}
      {crystals.map((c, i) => (
        <mesh
          key={`crystal-${i}`}
          position={[c.x, 0.5 + c.h / 2, c.z]}
          rotation={c.rot as [number, number, number]}
          castShadow
        >
          <coneGeometry args={[0.28, c.h, 6]} />
          <meshStandardMaterial
            color="#a5f3fc"
            emissive="#06b6d4"
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.3}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Ice Crystal Glow Light */}
      <pointLight position={[0, 2.2, -0.8]} color="#22d3ee" intensity={3.0} distance={7} />
    </group>
  );
}

export default function HarborArea() {
  const selectArea = useWorldStore((s) => s.selectArea);
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const hoveredAreaId = useWorldStore((s) => s.hoveredAreaId);
  const setHoveredArea = useWorldStore((s) => s.setHoveredArea);

  const isSelected = selectedAreaId === "harbor";
  const isHovered = hoveredAreaId === "harbor";

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        selectArea("harbor");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredArea("harbor");
      }}
      onPointerOut={() => setHoveredArea(null)}
    >
      {/* ========================================================
          1. JINBE'S TIMBER DOCK & DYNAMIC WATER VORTEX GEYSERS ([-6.5, 0.8, 7.5])
          ======================================================== */}
      {/* Square Timber Dock for Jinbe */}
      <mesh position={[-6.5, 0.85, 7.5]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.3, 3.4]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>

      {/* Cross Timber Planks */}
      {[-1.2, -0.6, 0, 0.6, 1.2].map((pz, idx) => (
        <mesh key={`dock-plank-${idx}`} position={[-6.5, 1.02, 7.5 + pz]}>
          <boxGeometry args={[3.35, 0.04, 0.1]} />
          <meshStandardMaterial color="#451a03" />
        </mesh>
      ))}

      {/* Dock Pilings into Water */}
      {[-1.5, 1.5].flatMap((px) =>
        [-1.5, 1.5].map((pz, idx) => (
          <mesh key={`piling-${px}-${pz}-${idx}`} position={[-6.5 + px, 0.2, 7.5 + pz]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 1.4, 8]} />
            <meshStandardMaterial color="#3e1f07" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* 2 Dynamic Twisting Water Vortex Geysers flanking Jinbe (Image 2) */}
      <SwirlingWaterVortex position={[-9.2, 0.4, 6.8]} height={4.6} />
      <SwirlingWaterVortex position={[-4.5, 0.4, 8.8]} height={4.2} />

      {/* ========================================================
          2. BROOK'S STEPPED GRASS PEDESTAL & ICE CRYSTALS ([-1.5, 2.0, 9.5])
          ======================================================== */}
      <BrookIcePedestal position={[-1.5, 2.0, 9.5]} />

      {/* Ocean Mist Sparkles */}
      <Float speed={2.0} rotationIntensity={0.2} floatIntensity={0.3}>
        <Sparkles count={35} scale={[12, 5, 12]} size={3.5} speed={0.8} color="#38bdf8" />
      </Float>

      {/* Azure Ocean Light */}
      <pointLight position={[-6.5, 2.8, 7.5]} color="#0099ff" intensity={3.5} distance={14} />

      {/* Selection Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[-6.5, 1.1, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.8, 4.4, 36]} />
          <meshBasicMaterial color="#0099ff" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
