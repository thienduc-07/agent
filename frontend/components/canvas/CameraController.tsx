"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Agent } from "@/types";

interface CameraControllerProps {
  selectedAgent: Agent | null;
  viewPreset: "tactical" | "agent";
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export default function CameraController({
  selectedAgent,
  viewPreset,
  controlsRef,
}: CameraControllerProps) {
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(0, 16, 22));
  const targetLook = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    if (viewPreset === "agent" && selectedAgent) {
      // Position camera nicely offset from selected character
      targetPos.current.set(
        selectedAgent.pos_x + 3.2,
        selectedAgent.pos_y + 2.6,
        selectedAgent.pos_z + 4.2
      );
      targetLook.current.set(
        selectedAgent.pos_x,
        selectedAgent.pos_y + 1.0,
        selectedAgent.pos_z
      );
    } else {
      // Tactical Island Overview
      targetPos.current.set(0, 16, 22);
      targetLook.current.set(0, 1, 0);
    }
  }, [selectedAgent, viewPreset]);

  useFrame((_, delta) => {
    const step = Math.min(delta * 3.5, 0.15);

    // Smoothly interpolate camera position
    camera.position.lerp(targetPos.current, step);

    // Smoothly interpolate OrbitControls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, step);
      controlsRef.current.update();
    }
  });

  return null;
}
