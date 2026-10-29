"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Custom vertex shader for anime water waves
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color("#0c2d48") },
      uSurfaceColor: { value: new THREE.Color("#145da0") },
      uFoamColor: { value: new THREE.Color("#2e8bc0") },
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms) {
        mat.uniforms.uTime.value = state.clock.getElapsedTime();
      }
    }
  });

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float wave1 = sin(pos.x * 0.15 + uTime * 1.5) * cos(pos.y * 0.15 + uTime * 1.2) * 0.45;
      float wave2 = sin(pos.x * 0.35 - uTime * 0.8) * cos(pos.y * 0.35 + uTime * 0.9) * 0.2;
      float wave3 = sin(pos.x * 0.05 + pos.y * 0.05 + uTime * 0.5) * 0.6;
      
      float totalWave = wave1 + wave2 + wave3;
      pos.z += totalWave;
      vElevation = totalWave;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uDeepColor;
    uniform vec3 uSurfaceColor;
    uniform vec3 uFoamColor;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Color mix based on wave height
      float mixFactor = smoothstep(-0.6, 0.6, vElevation);
      vec3 color = mix(uDeepColor, uSurfaceColor, mixFactor);

      // Foam crests at high wave points
      if (vElevation > 0.35) {
        float foamFactor = smoothstep(0.35, 0.6, vElevation);
        color = mix(color, uFoamColor, foamFactor * 0.8);
      }

      gl_FragColor = vec4(color, 0.88);
    }
  `;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
      <planeGeometry args={[120, 120, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
