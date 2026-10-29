"use client";

import React, { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import Ocean from "./Ocean";
import IslandTerrain from "./IslandTerrain";
import AgentAvatar from "./AgentAvatar";
import CameraController from "./CameraController";
import { Agent } from "@/types";

interface CityCanvasProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectStation: (stationKey: string) => void;
  viewPreset: "tactical" | "agent";
  liveThoughts?: Record<string, string>;
}

export default function CityCanvas({
  agents,
  selectedAgent,
  onSelectAgent,
  onSelectStation,
  viewPreset,
  liveThoughts = {},
}: CityCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 16, 22], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        <color attach="background" args={["#070b14"]} />
        <fog attach="fog" args={["#070b14", 25, 70]} />

        {/* Ambient & Directional Pirate Island Lighting */}
        <ambientLight intensity={0.6} color="#94a3b8" />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.8}
          color="#fef08a"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <hemisphereLight args={["#38bdf8", "#0369a1", 0.5]} />

        <Suspense fallback={null}>
          <Ocean />
          <IslandTerrain onSelectStation={onSelectStation} />

          {agents.map((agent) => (
            <AgentAvatar
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onSelect={onSelectAgent}
              liveThought={liveThoughts[agent.id]}
            />
          ))}

          <CameraController
            selectedAgent={selectedAgent}
            viewPreset={viewPreset}
            controlsRef={controlsRef}
          />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={4}
            maxDistance={35}
            maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera going below ocean
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
