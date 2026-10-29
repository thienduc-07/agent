"use client";

import React from "react";
import { Sky, Environment } from "@react-three/drei";
import { WORLD_CONFIG } from "@/data/worldConfig";

export default function WorldLighting() {
  const { sunLight, skyLight, ambientLight } = WORLD_CONFIG.environment;

  return (
    <group>
      {/* 1. Preetham/Hosek-Wilkie Procedural Daylight Sky */}
      <Sky
        sunPosition={[50, 45, 30]}
        turbidity={2.0}
        rayleigh={1.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* 2. Soft Daylight Environment Reflections */}
      <Environment preset="sunset" environmentIntensity={0.65} />

      {/* 3. Ambient Light for crisp shadows and clear foliage */}
      <ambientLight color={ambientLight.color} intensity={ambientLight.intensity} />

      {/* 4. High-Intensity Radiant Tropical Sun (Directional Light with 4K Shadows) */}
      <directionalLight
        position={sunLight.position}
        color={sunLight.color}
        intensity={sunLight.intensity}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={1.0}
        shadow-camera-far={260}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={65}
        shadow-camera-bottom={-65}
        shadow-bias={-0.00015}
      />

      {/* 5. Hemisphere Light (Anime Sky / Foliage Bounce) */}
      <hemisphereLight
        args={[skyLight.skyColor, skyLight.groundColor, skyLight.intensity]}
      />

      {/* 6. Subtle Ocean Blue Fill Light from Sea Horizon */}
      <directionalLight
        position={[-60, 25, -60]}
        color="#38bdf8"
        intensity={0.7}
      />
    </group>
  );
}
