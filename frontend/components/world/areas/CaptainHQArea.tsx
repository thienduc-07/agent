"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useWorldStore } from "@/store/worldStore";

// Procedural Bajrang Conqueror's Haki Lightning Spear striking the ground (Image 2)
function BajrangLightning() {
  const lightningMeshRef = useRef<THREE.Mesh>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const craterRef = useRef<THREE.Mesh>(null);

  // Jagged lightning path from Luffy's hand to ground crater
  const curve = useMemo(() => {
    const points = [
      new THREE.Vector3(0.3, 2.8, 0.2),
      new THREE.Vector3(0.55, 2.2, 0.45),
      new THREE.Vector3(0.2, 1.6, 0.75),
      new THREE.Vector3(0.65, 1.1, 1.1),
      new THREE.Vector3(0.35, 0.6, 1.45),
      new THREE.Vector3(0.7, 0.05, 1.8),
    ];
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.1, 8, false), [curve]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (lightningMeshRef.current) {
      const pulse = 0.85 + Math.sin(t * 22.0) * 0.25;
      lightningMeshRef.current.scale.set(pulse, 1.0, pulse);
    }
    if (glowLightRef.current) {
      glowLightRef.current.intensity = 4.5 + Math.sin(t * 26.0) * 1.8;
    }
    if (craterRef.current) {
      const s = 1.0 + Math.sin(t * 14.0) * 0.15;
      craterRef.current.scale.set(s, s, 1.0);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Pitch-Black Haki Aura Sheath */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#1a0000" transparent opacity={0.88} />
      </mesh>
      {/* Blazing Red-Black Core Lightning Bolt */}
      <mesh ref={lightningMeshRef} geometry={tubeGeo} scale={[0.72, 1.0, 0.72]}>
        <meshBasicMaterial color="#ff1111" />
      </mesh>
      {/* Molten Ground Impact Flare Ring (Fiery Crater in Image 2) */}
      <mesh ref={craterRef} position={[0.7, 0.08, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.85, 24]} />
        <meshBasicMaterial color="#ff3b00" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.7, 0.09, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 16]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      <pointLight
        ref={glowLightRef}
        position={[0.7, 0.8, 1.8]}
        color="#ff2200"
        intensity={5.5}
        distance={8}
      />
    </group>
  );
}

// Pirate Sign Board / Marker Post behind Luffy (Image 2)
function PirateMarkerBoard() {
  return (
    <group position={[-0.8, 1.4, -0.6]} rotation={[0, 0.35, 0]}>
      {/* Timber Post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 1.4, 8]} />
        <meshStandardMaterial color="#582f0e" roughness={0.8} />
      </mesh>
      {/* Board Frame */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[1.1, 0.65, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      {/* Sign Emblem Disc */}
      <mesh position={[0, 1.25, 0.05]}>
        <circleGeometry args={[0.24, 20]} />
        <meshStandardMaterial color="#fef08a" roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function CaptainHQArea() {
  const selectArea = useWorldStore((s) => s.selectArea);
  const selectedAreaId = useWorldStore((s) => s.selectedAreaId);
  const isSelected = selectedAreaId === "captain_hq";

  return (
    <group
      position={[2, 2.2, 2]}
      onClick={(e) => {
        e.stopPropagation();
        selectArea("captain_hq");
      }}
    >
      {/* ========================================================
          3-TIERED CONCENTRIC ROUND BASALT ROCK PEDESTAL (Image 2)
          ======================================================== */}
      {/* Tier 1: Wide Dark Basalt Foundation Base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.3, 3.7, 0.6, 32]} />
        <meshStandardMaterial color="#2d3139" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Tier 1 Gold Rim Bevel */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.35, 32]} />
        <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Tier 2: Middle Concentric Basalt Step */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.3, 2.6, 0.55, 32]} />
        <meshStandardMaterial color="#373c46" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Tier 2 Gold Rim Bevel */}
      <mesh position={[0, 1.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.22, 2.34, 32]} />
        <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Tier 3: Top Basalt Summit Pedestal (Luffy Gear 5 command stage) */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.45, 32]} />
        <meshStandardMaterial color="#424855" roughness={0.75} metalness={0.15} />
      </mesh>
      {/* Top Golden Sun Ring Rim */}
      <mesh position={[0, 1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.54, 32]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.7} />
      </mesh>

      {/* Pirate Marker Sign Board behind Luffy */}
      <PirateMarkerBoard />

      {/* Luffy's Blazing Bajrang Conqueror's Haki Lightning Spear striking the crater */}
      <BajrangLightning />

      {/* Divine Sun God Sparkles */}
      <Sparkles count={45} scale={7} size={4.2} speed={0.8} color="#fef08a" opacity={0.9} />

      {/* Warm Golden Sunlight Focus */}
      <pointLight position={[0, 4.0, 0]} color="#fff7ed" intensity={4.5} distance={16} />

      {/* Selection Halo */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.9, 4.4, 36]} />
          <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
