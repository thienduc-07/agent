"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Sparkles, Html } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { WorldAgentStatus } from "@/types";
import { applyAnimeCelShading } from "@/lib/animeCelShading";

interface AgentCharacterModelProps {
  appearance: string;
  color: string;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}

export const CHARACTER_SPECS: Record<
  string,
  {
    url: string;
    targetHeight: number;
    auraColor: string;
    rotationX?: number;
    name: string;
  }
> = {
  "luffy-gear5": {
    url: "/models/characters/luffy.glb",
    targetHeight: 2.35,
    auraColor: "#ff1a1a",
    name: "Luffy (Gear 5)",
  },
  captain: {
    url: "/models/characters/luffy.glb",
    targetHeight: 2.35,
    auraColor: "#ff1a1a",
    name: "Luffy (Gear 5)",
  },
  zoro: {
    url: "/models/characters/zoro.glb",
    targetHeight: 2.35,
    auraColor: "#00ffaa",
    name: "Zoro",
  },
  nami: {
    url: "/models/characters/nami.glb",
    targetHeight: 2.10,
    auraColor: "#ffea00",
    name: "Nami",
  },
  usopp: {
    url: "/models/characters/usopp.glb",
    targetHeight: 2.20,
    auraColor: "#ff6600",
    name: "Usopp",
  },
  sanji: {
    url: "/models/characters/sanji.glb",
    targetHeight: 2.35,
    auraColor: "#3399ff",
    name: "Sanji",
  },
  chopper: {
    url: "/models/characters/chopper.glb",
    targetHeight: 1.15,
    auraColor: "#ff80bf",
    name: "Chopper",
  },
  robin: {
    url: "/models/characters/robin.glb",
    targetHeight: 2.40,
    auraColor: "#d966ff",
    name: "Robin",
  },
  franky: {
    url: "/models/characters/franky.glb",
    targetHeight: 3.50,
    auraColor: "#ffcc00",
    rotationX: Math.PI / 2, // Rotates Franky +90 deg around X so he stands 100% upright on his feet
    name: "Franky",
  },
  brook: {
    url: "/models/characters/brook.glb",
    targetHeight: 2.95,
    auraColor: "#33ffff",
    name: "Brook",
  },
  jinbe: {
    url: "/models/characters/jinbe.glb",
    targetHeight: 2.85,
    auraColor: "#0099ff",
    name: "Jinbe",
  },
};

/**
 * Universal Master Normalizer
 * - Applies rotationX to orient models upright (Franky +90 deg brings head from -Z to +Y)
 * - Relaxes T-pose horizontal arms into a natural anime stance
 * - Sets accurate target height and aligns feet to ground surface (min.y = 0)
 */
export function prepareAndNormalizeCharacter(
  rawScene: THREE.Object3D,
  targetHeight: number,
  rotationX = 0
): THREE.Group {
  const clone = SkeletonUtils.clone(rawScene);
  applyAnimeCelShading(clone);

  // Correct orientation (Franky needs +PI/2)
  clone.rotation.x = rotationX;

  const wrapper = new THREE.Group();
  wrapper.add(clone);
  wrapper.updateMatrixWorld(true);

  // 1. Natural Arm Relaxation (Removes T-pose / A-pose)
  clone.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
    if ((obj as THREE.Bone).isBone) {
      const boneName = obj.name.toLowerCase();
      const isLeftUpperArm =
        (boneName.includes("left") || boneName.endsWith("_l") || boneName.endsWith(".l")) &&
        (boneName.includes("arm") || boneName.includes("shoulder")) &&
        !boneName.includes("fore") &&
        !boneName.includes("lower") &&
        !boneName.includes("hand") &&
        !boneName.includes("finger");

      const isRightUpperArm =
        (boneName.includes("right") || boneName.endsWith("_r") || boneName.endsWith(".r")) &&
        (boneName.includes("arm") || boneName.includes("shoulder")) &&
        !boneName.includes("fore") &&
        !boneName.includes("lower") &&
        !boneName.includes("hand") &&
        !boneName.includes("finger");

      if (isLeftUpperArm && Math.abs(obj.rotation.z) < 0.3) {
        obj.rotation.z = -1.15;
        obj.rotation.y = 0.2;
      }
      if (isRightUpperArm && Math.abs(obj.rotation.z) < 0.3) {
        obj.rotation.z = 1.15;
        obj.rotation.y = -0.2;
      }

      // Natural slight elbow bend
      const isForeArm = boneName.includes("fore") || boneName.includes("elbow");
      if (isForeArm) {
        if (boneName.includes("left") || boneName.endsWith("_l")) {
          obj.rotation.y = 0.35;
        } else if (boneName.includes("right") || boneName.endsWith("_r")) {
          obj.rotation.y = -0.35;
        }
      }
    }
  });

  // 2. Compute true bounding box and scale to target height
  wrapper.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(wrapper);
  let size = new THREE.Vector3();
  box.getSize(size);

  if (!isFinite(size.y) || size.y < 0.05) {
    box.makeEmpty();
    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.computeBoundingBox();
        const geoBox = (child as THREE.Mesh).geometry.boundingBox;
        if (geoBox) {
          box.union(geoBox.clone().applyMatrix4(child.matrixWorld));
        }
      }
    });
    box.getSize(size);
  }

  const safeHeight = Math.max(size.y, 0.001);
  const uniformScale = targetHeight / safeHeight;
  wrapper.scale.setScalar(uniformScale);
  wrapper.updateMatrixWorld(true);

  // 3. Align feet to exact ground surface (min.y = 0)
  const finalBox = new THREE.Box3().setFromObject(wrapper);
  const finalCenter = new THREE.Vector3();
  finalBox.getCenter(finalCenter);

  wrapper.position.set(-finalCenter.x, -finalBox.min.y, -finalCenter.z);
  return wrapper;
}

// ============================================================================
// 1. LUFFY (GEAR 5 - SUN GOD NIKA) ANIMATED COMPONENT
// Joyful Drums of Liberation Bouncing, Elastic Laughing, Cloud Aura Billowing
// ============================================================================
function LuffyAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);
  const cloudAuraRef = useRef<THREE.Mesh>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isMoving) {
      // High-speed Gear 5 running bounce
      const runStep = t * 11.0;
      modelRef.current.position.y = Math.abs(Math.sin(runStep)) * 0.12;
      modelRef.current.rotation.x = 0.12; // Forward lean
      modelRef.current.rotation.y = Math.sin(runStep * 0.5) * 0.08;
      modelRef.current.scale.set(1.0, 1.0 + Math.sin(runStep) * 0.05, 1.0);
    } else {
      // Nika Drums of Liberation rhythmic bouncing heartbeat (Squash & Stretch)
      const nikaPulse = Math.sin(t * 5.2);
      const isLaughing = t % 8.0 > 5.2;

      if (isLaughing) {
        // Joyful Nika laugh: leans back with arms spread wide
        modelRef.current.rotation.x = -0.18 + Math.sin(t * 12.0) * 0.04;
        modelRef.current.position.y = 0.08 + Math.abs(Math.sin(t * 8.0)) * 0.08;
        modelRef.current.scale.set(1.05, 0.95, 1.05);
      } else {
        // Continuous elastic bobbing
        modelRef.current.position.y = Math.abs(nikaPulse) * 0.06;
        modelRef.current.rotation.x = 0;
        modelRef.current.scale.set(
          1 - Math.abs(nikaPulse) * 0.03,
          1 + Math.abs(nikaPulse) * 0.05,
          1 - Math.abs(nikaPulse) * 0.03
        );
      }
    }

    if (cloudAuraRef.current) {
      cloudAuraRef.current.rotation.y = t * 2.0;
      cloudAuraRef.current.scale.setScalar(1.0 + Math.sin(t * 3.5) * 0.1);
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Floating Gear 5 Cloud Hagoromo Ribbon */}
      <mesh ref={cloudAuraRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[0.75, 0.12, 12, 28]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#ffffff"
          emissiveIntensity={0.6}
          roughness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Conqueror's Haki Lightning Spear */}
      <group position={[0.2, 1.1, 0.2]}>
        <Sparkles count={25} scale={2.8} size={4.2} speed={1.8} color="#ff1111" opacity={0.9} />
        <pointLight color="#ff1111" intensity={3.8} distance={6} />
      </group>
    </group>
  );
}

// ============================================================================
// 2. RORONOA ZORO (KING OF HELL) ANIMATED COMPONENT
// 3 Attached Katanas, Sword Drawing Slash, Emerald Dragon Damnation Blade Waves
// ============================================================================
export function ZoroThreeSwords({ isSlashing }: { isSlashing?: boolean }) {
  return (
    <group position={[-0.32, 1.08, -0.06]} rotation={[0.42, -0.32, -0.58]}>
      {/* 3 Scabbards side-by-side along left hip sash */}
      {[
        { name: "Wado", hiltColor: "#ffffff", sayaColor: "#f8fafc", tsubaColor: "#fbbf24", offsetZ: -0.07, rotY: 0.0 },
        { name: "Kitetsu", hiltColor: "#dc2626", sayaColor: "#1e1b4b", tsubaColor: "#d97706", offsetZ: 0.0, rotY: 0.04 },
        { name: "Enma", hiltColor: "#9333ea", sayaColor: "#581c87", tsubaColor: "#facc15", offsetZ: 0.07, rotY: -0.04 },
      ].map((sword, idx) => (
        <group key={`katana-${idx}`} position={[0, 0, sword.offsetZ]} rotation={[0, sword.rotY, 0]}>
          <mesh position={[0, -0.48, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.018, 0.98, 8]} />
            <meshStandardMaterial color={sword.sayaColor} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.98, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.014, 0.06, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.026, 0.024, 0.035, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.014, 12]} />
            <meshStandardMaterial color={sword.tsubaColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.022, 0.28, 8]} />
            <meshStandardMaterial color={sword.hiltColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* Drawn Katana in Right Hand with Dynamic Slashing Gesture */}
      {isSlashing && (
        <group position={[0.82, 0.05, 0.58]} rotation={[-0.85, 0.45, 1.25]}>
          <mesh position={[0, 0.52, 0]} castShadow>
            <boxGeometry args={[0.015, 1.05, 0.04]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.52, 0.022]}>
            <boxGeometry args={[0.005, 1.05, 0.01]} />
            <meshBasicMaterial color="#00ffaa" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.015, 12]} />
            <meshStandardMaterial color="#facc15" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.022, 0.28, 8]} />
            <meshStandardMaterial color="#9333ea" roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ZoroAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);
  const slashWaveRef = useRef<THREE.Mesh>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  const slashCycle = useRef(0);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();
    const isWorking = status === "working";

    // Periodic sword slash action every 6.5 seconds
    const cycleTime = t % 6.5;
    const isSlashing = isWorking || (cycleTime > 4.2 && cycleTime < 5.8);
    slashCycle.current = isSlashing ? 1 : 0;

    if (isMoving) {
      const step = t * 9.0;
      modelRef.current.position.y = Math.abs(Math.sin(step)) * 0.04;
      modelRef.current.rotation.x = 0.08;
      modelRef.current.rotation.z = Math.sin(step) * 0.03;
    } else if (isSlashing) {
      // Dynamic sword slash attack swing
      const slashProgress = (cycleTime - 4.2) / 1.6;
      modelRef.current.rotation.y = -0.4 + Math.sin(slashProgress * Math.PI) * 0.75;
      modelRef.current.rotation.x = 0.06;
      modelRef.current.position.y = 0.02;

      if (slashWaveRef.current) {
        slashWaveRef.current.visible = true;
        slashWaveRef.current.scale.setScalar(0.5 + slashProgress * 2.2);
        slashWaveRef.current.rotation.z = slashProgress * Math.PI * 0.8;
      }
    } else {
      // Swordsman focused ready stance
      modelRef.current.position.y = Math.sin(t * 1.8) * 0.015;
      modelRef.current.rotation.y = -0.15;
      modelRef.current.rotation.x = 0.03; // Slight forward combat crouch
      modelRef.current.rotation.z = 0;

      if (slashWaveRef.current) {
        slashWaveRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Zoro's 3 Attached Katanas & Drawn Katana */}
      <ZoroThreeSwords isSlashing={true} />

      {/* Emerald Dragon Damnation Slash Wave */}
      <mesh ref={slashWaveRef} position={[0.4, 1.2, 0.8]} rotation={[0.2, 0, 0.4]} visible={false}>
        <ringGeometry args={[0.6, 0.95, 24, 1, 0, Math.PI * 1.3]} />
        <meshBasicMaterial color="#00ffaa" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      <Sparkles count={20} scale={2.5} size={3.2} speed={1.2} color="#00ffaa" opacity={0.85} />
      <pointLight position={[0, 1.2, 0]} color="#00ffaa" intensity={2.8} distance={6} />
    </group>
  );
}

// ============================================================================
// 3. FRANKY (IRON PIRATE CYBORG BF-38) ANIMATED COMPONENT
// Stands 100% Upright (+PI/2), Iconic "SUUUUPER!!" Arm Pose, Arm Stars & Laser
// ============================================================================
function FrankyAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);
  const starGlowRef = useRef<THREE.Mesh>(null);

  const normalizedGroup = useMemo(() => {
    // Franky MUST have rotationX = Math.PI / 2 to stand upright on his feet!
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, Math.PI / 2);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();
    const isWorking = status === "working";

    // Iconic SUUUUPER pose triggered every 7.5 seconds
    const cycleTime = t % 7.5;
    const isSuperPose = isWorking || (cycleTime > 4.5 && cycleTime < 6.8);

    if (isMoving) {
      // Heavy mechanical stride
      const step = t * 7.5;
      modelRef.current.position.y = Math.abs(Math.sin(step)) * 0.05;
      modelRef.current.rotation.x = 0.05;
      modelRef.current.rotation.y = 0;
    } else if (isSuperPose) {
      // Magnificent SUUUUPER!! Triumphant Pose
      modelRef.current.position.y = 0.06;
      modelRef.current.rotation.x = -0.08; // Chest pushed out proudly
      modelRef.current.rotation.y = Math.sin(t * 8.0) * 0.02;

      if (starGlowRef.current) {
        starGlowRef.current.visible = true;
        const pulse = 1.0 + Math.sin(t * 18.0) * 0.25;
        starGlowRef.current.scale.setScalar(pulse);
      }
    } else {
      // Upright confident cyborg stance
      modelRef.current.position.y = Math.sin(t * 1.5) * 0.012;
      modelRef.current.rotation.x = 0;
      modelRef.current.rotation.y = Math.sin(t * 0.6) * 0.04;

      if (starGlowRef.current) {
        starGlowRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Franky "SUUUUPER!!" Forearm Star Energy Blast Emblem */}
      <group ref={starGlowRef} position={[0, 3.65, 0.4]} visible={false}>
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <pointLight color="#38bdf8" intensity={4.5} distance={8} />
        <Html position={[0, 0.6, 0]} center transform distanceFactor={14}>
          <div className="font-extrabold text-2xl text-cyan-300 drop-shadow-[0_0_12px_#38bdf8] select-none pointer-events-none">
            ⭐ SUUUUPER!! ⭐
          </div>
        </Html>
      </group>

      <Sparkles count={25} scale={3.5} size={4.0} speed={1.2} color="#ffcc00" opacity={0.8} />
    </group>
  );
}

// ============================================================================
// 4. SANJI (BLACK LEG) ANIMATED COMPONENT
// 30 Skeletal Animations via AnimationMixer, Ifrit Jambe Plasma Kicks
// ============================================================================
function SanjiAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene, animations } = (useGLTF as any)(spec.url);
  const groupRef = useRef<THREE.Group>(null);

  const { normalizedGroup, mixer, actions } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    applyAnimeCelShading(clone);

    // Normalize height
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = spec.targetHeight / Math.max(size.y, 0.01);
    wrapper.scale.setScalar(scale);
    wrapper.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(wrapper);
    const center = new THREE.Vector3();
    finalBox.getCenter(center);
    wrapper.position.set(-center.x, -finalBox.min.y, -center.z);

    // Direct AnimationMixer on cloned skeleton
    const mx = new THREE.AnimationMixer(clone);
    const acts: Record<string, THREE.AnimationAction> = {};
    if (animations && animations.length > 0) {
      animations.forEach((clip: THREE.AnimationClip) => {
        acts[clip.name] = mx.clipAction(clip);
      });
    }

    return { normalizedGroup: wrapper, mixer: mx, actions: acts };
  }, [scene, animations, spec]);

  useEffect(() => {
    const isWorking = status === "working";
    const currentActionName = isMoving || isWorking ? "pl_sanji_atta01_run" : "pl_sanji_atta01_idle_a";
    const active = actions[currentActionName] || actions["pl_sanji_atta01_idle_a"];

    if (active) {
      active.reset().fadeIn(0.35).play();
    }

    return () => {
      active?.fadeOut(0.25);
    };
  }, [actions, status, isMoving]);

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return (
    <group ref={groupRef}>
      <primitive object={normalizedGroup} />

      {/* Ifrit Jambe Blue Plasma Fire on Right Leg */}
      <group position={[0.22, 0.28, 0]}>
        <mesh>
          <coneGeometry args={[0.22, 0.7, 8]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <pointLight color="#38bdf8" intensity={3.5} distance={4} />
      </group>
    </group>
  );
}

// ============================================================================
// 5. CHOPPER (REINDEER DOCTOR) ANIMATED COMPONENT
// Adorable Hops, Mortar & Pestle Brewing, Sakura Blossom Shower
// ============================================================================
function ChopperAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();
    const isWorking = status === "working";

    if (isMoving) {
      // Cute fast hopping run
      const hop = Math.abs(Math.sin(t * 12.0));
      modelRef.current.position.y = hop * 0.12;
      modelRef.current.rotation.x = 0.1;
      modelRef.current.rotation.z = Math.sin(t * 12.0) * 0.08;
    } else if (isWorking) {
      // Medicine brewing activity
      modelRef.current.position.y = Math.sin(t * 4.0) * 0.03;
      modelRef.current.rotation.y = Math.sin(t * 3.0) * 0.25;
    } else {
      // Joyful hops & ear wiggles
      const hopCycle = t % 5.0;
      if (hopCycle > 3.5) {
        modelRef.current.position.y = Math.abs(Math.sin((hopCycle - 3.5) * Math.PI * 3)) * 0.14;
        modelRef.current.rotation.z = Math.sin(t * 14.0) * 0.06;
      } else {
        modelRef.current.position.y = Math.sin(t * 2.2) * 0.02;
        modelRef.current.rotation.z = 0;
        modelRef.current.rotation.y = Math.sin(t * 1.0) * 0.08;
      }
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />
      <Sparkles count={25} scale={1.8} size={3.5} speed={0.9} color="#f472b6" opacity={0.9} />
    </group>
  );
}

// ============================================================================
// 6. NAMI (WEATHER QUEEN) ANIMATED COMPONENT
// Clima-Tact Swings, Floating Zeus Stormcloud, Golden Raitei Lightning
// ============================================================================
function NamiAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);
  const zeusCloudRef = useRef<THREE.Group>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isMoving) {
      const step = t * 8.5;
      modelRef.current.position.y = Math.abs(Math.sin(step)) * 0.03;
      modelRef.current.rotation.x = 0.06;
      modelRef.current.rotation.z = Math.sin(step) * 0.03;
    } else {
      // Elegant standing posture with breathing
      modelRef.current.position.y = Math.sin(t * 2.0) * 0.015;
      modelRef.current.rotation.y = Math.sin(t * 0.7) * 0.06;
      modelRef.current.rotation.x = 0;
    }

    if (zeusCloudRef.current) {
      zeusCloudRef.current.position.y = 2.45 + Math.sin(t * 3.0) * 0.12;
      zeusCloudRef.current.rotation.y = t * 0.6;
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Miniature Floating Zeus Stormcloud with Lightning */}
      <group ref={zeusCloudRef} position={[0.4, 2.45, 0.2]}>
        <mesh>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <mesh position={[-0.15, -0.04, 0]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        <mesh position={[0.16, -0.02, 0]}>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        <Sparkles count={25} scale={1.5} size={3.8} speed={1.8} color="#facc15" opacity={0.95} />
        <pointLight color="#facc15" intensity={2.8} distance={5} />
      </group>
    </group>
  );
}

// ============================================================================
// 7. BROOK (SOUL KING) ANIMATED COMPONENT
// Violin Performance, Floating Melody Notes, Soul Solid Ice Mist
// ============================================================================
function BrookAnimatedCharacter({
  spec,
  status,
  isMoving,
}: {
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);
  const notesRef = useRef<THREE.Group>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isMoving) {
      const step = t * 8.0;
      modelRef.current.position.y = Math.abs(Math.sin(step)) * 0.05;
      modelRef.current.rotation.z = Math.sin(step) * 0.04;
    } else {
      // Lively musical swaying while playing violin
      modelRef.current.rotation.z = Math.sin(t * 3.2) * 0.05;
      modelRef.current.position.y = Math.abs(Math.sin(t * 3.2)) * 0.03;
    }

    if (notesRef.current) {
      notesRef.current.position.y = 2.9 + Math.sin(t * 2.0) * 0.2;
      notesRef.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Floating 3D Musical Melody */}
      <group ref={notesRef}>
        <Html position={[-0.45, 0, 0]} center transform distanceFactor={14}>
          <span className="text-cyan-300 text-2xl font-bold select-none pointer-events-none drop-shadow-[0_0_8px_#22d3ee]">
            ♪
          </span>
        </Html>
        <Html position={[0.45, 0.35, 0]} center transform distanceFactor={14}>
          <span className="text-cyan-200 text-2xl font-bold select-none pointer-events-none drop-shadow-[0_0_10px_#67e8f9]">
            ♫
          </span>
        </Html>
        <Sparkles count={20} scale={2.8} size={3.0} speed={0.8} color="#38bdf8" />
      </group>
    </group>
  );
}

// ============================================================================
// 8. JINBE, USOPP, ROBIN ANIMATED COMPONENTS
// ============================================================================
function OtherCrewAnimatedCharacter({
  appearance,
  spec,
  status,
  isMoving,
}: {
  appearance: string;
  spec: any;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight, spec.rotationX || 0);
  }, [scene, spec]);

  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isMoving) {
      const step = t * 8.5;
      modelRef.current.position.y = Math.abs(Math.sin(step)) * 0.04;
      modelRef.current.rotation.x = 0.07;
      modelRef.current.rotation.z = Math.sin(step) * 0.035;
    } else {
      if (appearance === "jinbe") {
        // Fishman Karate breathing kata
        modelRef.current.position.y = Math.sin(t * 1.6) * 0.02;
        modelRef.current.rotation.y = Math.sin(t * 0.8) * 0.06;
      } else if (appearance === "usopp") {
        // Sniper aiming scan
        modelRef.current.rotation.y = Math.sin(t * 0.9) * 0.22;
        modelRef.current.rotation.x = 0.04;
      } else if (appearance === "robin") {
        // Cien Fleurs graceful calm
        modelRef.current.position.y = Math.sin(t * 1.8) * 0.015;
        modelRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
      }
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />
      <Sparkles
        count={15}
        scale={spec.targetHeight * 1.1}
        size={2.5}
        speed={0.6}
        color={spec.auraColor}
        opacity={0.6}
      />
    </group>
  );
}

// ============================================================================
// MAIN AGENT CHARACTER MODEL ROUTER
// Routes each Straw Hat member to their dedicated animated component
// ============================================================================
export default function AgentCharacterModel({
  appearance,
  color,
  status = "idle",
  isMoving = false,
}: AgentCharacterModelProps) {
  const spec = CHARACTER_SPECS[appearance] || CHARACTER_SPECS["luffy-gear5"];

  if (appearance === "luffy-gear5" || appearance === "captain") {
    return <LuffyAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "zoro") {
    return <ZoroAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "franky") {
    return <FrankyAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "sanji") {
    return <SanjiAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "chopper") {
    return <ChopperAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "nami") {
    return <NamiAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }
  if (appearance === "brook") {
    return <BrookAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }

  // Jinbe, Usopp, Robin
  return (
    <OtherCrewAnimatedCharacter
      appearance={appearance}
      spec={spec}
      status={status}
      isMoving={isMoving}
    />
  );
}

// Preload all 10 Straw Hat character models
useGLTF.preload("/models/characters/luffy.glb");
useGLTF.preload("/models/characters/zoro.glb");
useGLTF.preload("/models/characters/nami.glb");
useGLTF.preload("/models/characters/usopp.glb");
useGLTF.preload("/models/characters/sanji.glb");
useGLTF.preload("/models/characters/chopper.glb");
useGLTF.preload("/models/characters/robin.glb");
useGLTF.preload("/models/characters/franky.glb");
useGLTF.preload("/models/characters/brook.glb");
useGLTF.preload("/models/characters/jinbe.glb");
