"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Procedural Gerstner Wave height evaluator for synchronizing buoyant objects (like Thousand Sunny).
 */
export function getOceanWaveHeight(x: number, z: number, time: number): { height: number; roll: number; pitch: number } {
  // Wave 1: Primary Swell
  const d1x = 0.85, d1z = 0.52;
  const k1 = (2 * Math.PI) / 32.0;
  const c1 = 1.25;
  const a1 = 0.45;
  const phase1 = k1 * (d1x * x + d1z * z) - c1 * time;

  // Wave 2: Secondary Cross Wave
  const d2x = -0.6, d2z = 0.8;
  const k2 = (2 * Math.PI) / 18.0;
  const c2 = 1.45;
  const a2 = 0.28;
  const phase2 = k2 * (d2x * x + d2z * z) - c2 * time;

  // Wave 3: Surface Chop
  const d3x = 0.3, d3z = -0.95;
  const k3 = (2 * Math.PI) / 9.5;
  const c3 = 1.8;
  const a3 = 0.15;
  const phase3 = k3 * (d3x * x + d3z * z) - c3 * time;

  const height = a1 * Math.sin(phase1) + a2 * Math.sin(phase2) + a3 * Math.sin(phase3);

  // Approximate slope gradients for roll & pitch
  const slopeX = a1 * k1 * d1x * Math.cos(phase1) + a2 * k2 * d2x * Math.cos(phase2);
  const slopeZ = a1 * k1 * d1z * Math.cos(phase1) + a2 * k2 * d2z * Math.cos(phase2);

  return {
    height,
    roll: -slopeX * 0.45,
    pitch: slopeZ * 0.45,
  };
}

export default function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunPosition: { value: new THREE.Vector3(50.0, 45.0, 30.0) },
      uShallowColor: { value: new THREE.Color("#00d2d3") },   // Crystal turquoise near shore
      uSurfaceColor: { value: new THREE.Color("#00a8cc") },   // Seamless anime cyan-blue
      uDeepColor: { value: new THREE.Color("#005f99") },      // Deep ocean sapphire
      uFoamColor: { value: new THREE.Color("#ffffff") },      // Clean white shoreline surf foam
      uHorizonColor: { value: new THREE.Color("#7dd3fc") },   // Horizon sky blend
      uIslandCenter: { value: new THREE.Vector2(0, 0) },
      uIslandRadius: { value: 26.0 },
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
    uniform vec2 uIslandCenter;
    uniform float uIslandRadius;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vElevation;
    varying float vCoastlineProximity;

    // Gerstner Wave Formula
    vec3 gerstnerWave(vec3 p, vec2 dir, float steepness, float wavelength, float speed, float time, inout vec3 tangent, inout vec3 binormal) {
      float k = 2.0 * 3.14159265 / wavelength;
      float c = sqrt(9.8 / k) * speed * 0.35;
      vec2 d = normalize(dir);
      float f = k * (dot(d, p.xy) - c * time);
      float a = steepness / k;

      tangent += vec3(
        -d.x * d.x * (steepness * sin(f)),
        -d.x * d.y * (steepness * sin(f)),
        d.x * (steepness * cos(f))
      );
      binormal += vec3(
        -d.x * d.y * (steepness * sin(f)),
        -d.y * d.y * (steepness * sin(f)),
        d.y * (steepness * cos(f))
      );

      return vec3(
        d.x * (a * cos(f)),
        d.y * (a * cos(f)),
        a * sin(f)
      );
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Island proximity damping to avoid water clipping into mountains
      float distFromIsland = length(pos.xy - uIslandCenter);
      float islandDamp = smoothstep(18.0, 28.0, distFromIsland);
      vCoastlineProximity = 1.0 - smoothstep(19.0, 27.0, distFromIsland);

      vec3 tangent = vec3(1.0, 0.0, 0.0);
      vec3 binormal = vec3(0.0, 1.0, 0.0);
      vec3 wavePos = pos;

      // 1. Primary Deep Ocean Swell
      wavePos += gerstnerWave(pos, vec2(0.85, 0.52), 0.28, 32.0, 1.25, uTime, tangent, binormal);

      // 2. Secondary Cross Wave
      wavePos += gerstnerWave(pos, vec2(-0.6, 0.8), 0.22, 18.0, 1.45, uTime, tangent, binormal);

      // 3. Medium Wind Chop Wave
      wavePos += gerstnerWave(pos, vec2(0.3, -0.95), 0.16, 9.5, 1.8, uTime, tangent, binormal);

      // 4. Capillary Surface Ripple
      wavePos += gerstnerWave(pos, vec2(-0.8, -0.4), 0.09, 4.8, 2.4, uTime, tangent, binormal);

      // Interpolate displacement with island proximity
      pos.z = mix(pos.z, wavePos.z, islandDamp);
      pos.xy = mix(pos.xy, wavePos.xy, islandDamp * 0.7);

      vElevation = pos.z;
      vNormal = normalize(cross(binormal, tangent));

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uSunPosition;
    uniform vec3 uShallowColor;
    uniform vec3 uSurfaceColor;
    uniform vec3 uDeepColor;
    uniform vec3 uFoamColor;
    uniform vec3 uHorizonColor;
    uniform vec2 uIslandCenter;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vElevation;
    varying float vCoastlineProximity;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);

      // 1. Fresnel factor for water surface reflection vs refraction
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

      // 2. Depth Color Gradients (#006994 to #00b4d8 near shore)
      float shallowFactor = vCoastlineProximity;
      vec3 waterBaseColor = mix(uSurfaceColor, uShallowColor, shallowFactor * 0.9);

      // Elevation-based wave shading
      float elevBlend = smoothstep(-0.45, 0.45, vElevation);
      vec3 color = mix(uDeepColor, waterBaseColor, elevBlend);

      // 3. Radiant Tropical Sun Specular Highlight on wave ripples
      vec3 halfVector = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfVector), 0.0), 96.0);
      color += vec3(1.0, 0.98, 0.9) * specular * 1.5;

      // 4. Shoreline Surf Foam Wave (Delicate white foam line hugging sandy beach)
      if (vCoastlineProximity > 0.08) {
        float surfPulse = sin(uTime * 2.2 - vCoastlineProximity * 12.0);
        float shoreFoam = smoothstep(0.4, 0.88, vCoastlineProximity) * smoothstep(0.2, 0.85, surfPulse);
        color = mix(color, uFoamColor, shoreFoam * 0.75);
      }

      // 6. Horizon Sky Fade (Seamless blend into daylight horizon)
      float distFromCamera = length(vWorldPosition - cameraPosition);
      float horizonFog = smoothstep(90.0, 480.0, distFromCamera);
      color = mix(color, uHorizonColor, horizonFog);

      gl_FragColor = vec4(color, mix(0.92, 1.0, horizonFog));
    }
  `;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      receiveShadow
      raycast={() => null} // Non-blocking pointer events
    >
      <planeGeometry args={[1400, 1400, 160, 160]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
