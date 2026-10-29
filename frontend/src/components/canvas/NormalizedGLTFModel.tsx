"use client";

import React, { useMemo, useRef } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { CharacterPlacement } from '../../config/islandManifest';
import { getGroundHeight } from '../../utils/terrainPhysics';
import { applyAnimeCelShading } from '@/lib/animeCelShading';

interface Props {
  config: CharacterPlacement;
  targetRunPosition?: [number, number] | null;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  status?: string;
}

export const NormalizedCharacterModel: React.FC<Props> = ({
  config,
  targetRunPosition,
  isSelected,
  onSelect,
  status
}) => {
  const { scene } = useGLTF(config.modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const currentXZ = useRef<[number, number]>([...config.position]);

  const { clonedScene, normalizedScale, offsetVector } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    applyAnimeCelShading(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const scale = config.targetHeight / Math.max(size.y, 0.001);
    const offset = new THREE.Vector3(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    return { clonedScene: clone, normalizedScale: scale, offsetVector: offset };
  }, [scene, config.targetHeight]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dest = targetRunPosition || config.position;
    const dx = dest[0] - currentXZ.current[0];
    const dz = dest[1] - currentXZ.current[1];
    const dist = Math.hypot(dx, dz);

    if (dist > 0.15) {
      const step = Math.min(dist, delta * 9.5);
      currentXZ.current[0] += (dx / dist) * step;
      currentXZ.current[1] += (dz / dist) * step;
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    } else {
      groupRef.current.rotation.y = config.rotationY;
    }

    const t = state.clock.getElapsedTime();
    const isWorking = status === "working";
    const idleBob = Math.sin(t * (isWorking ? 4.5 : 2.0) + config.position[0]) * (isWorking ? 0.06 : 0.03);

    const groundY = getGroundHeight(currentXZ.current[0], currentXZ.current[1]);
    groupRef.current.position.set(currentXZ.current[0], groundY + idleBob, currentXZ.current[1]);
  });

  const initialY = getGroundHeight(config.position[0], config.position[1]);

  return (
    <group
      ref={groupRef}
      position={[config.position[0], initialY, config.position[1]]}
      rotation={[0, config.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(config.id);
      }}
    >
      <group position={offsetVector} scale={normalizedScale}>
        <primitive object={clonedScene} />
      </group>

      {/* Ground Selection & Contact Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.55, 0.75, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#ffffff' : config.accentColor}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Pill Name & Role Badge (Matching Image 2) */}
      <Html
        position={[0, config.targetHeight + 0.45, 0]}
        center
        distanceFactor={28}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: `1.5px solid ${config.accentColor}`,
            borderRadius: '999px',
            padding: '3px 10px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: config.accentColor,
              display: 'inline-block'
            }}
          />
          <span>{config.name}</span>
        </div>
      </Html>
    </group>
  );
};
