"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Sparkles, Html } from "@react-three/drei";
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
    targetHeight: 2.10, // Strict maximum 2.10m - No giant Nami
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
    targetHeight: 1.15, // Compact doctor reindeer
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
    targetHeight: 3.50, // Massive upright cyborg
    auraColor: "#ffcc00",
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
 * Universal Master Normalizer & Anti T-Pose Relaxer
 * - Preserves upright GLTF coordinate system (Franky stands on feet, head at +Y)
 * - Relaxes T-pose horizontal arms into a natural relaxed stance
 * - Locks height scale precisely to targetHeight
 * - Aligns ground contact to min.y = 0 so feet sit firmly on the island surface
 */
export function prepareAndNormalizeCharacter(
  rawScene: THREE.Object3D,
  targetHeight: number
): THREE.Group {
  const clone = SkeletonUtils.clone(rawScene);
  applyAnimeCelShading(clone);

  // Guarantee upright orientation (Franky and all GLBs have +Y up in world)
  clone.rotation.x = 0;

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

// Zoro's Three Legendary Katanas (Wadō Ichimonji, Sandai Kitetsu, Enma)
// Accurately mounted on his left hip sash at authentic angle, zero ground clipping
export function ZoroThreeSwords({ isWorking }: { isWorking?: boolean }) {
  return (
    <group position={[-0.32, 1.08, -0.06]} rotation={[0.42, -0.32, -0.58]}>
      {/* 3 Scabbards side-by-side along hip */}
      {[
        { name: "Wado", hiltColor: "#ffffff", sayaColor: "#f8fafc", tsubaColor: "#fbbf24", offsetZ: -0.07, rotY: 0.0 },
        { name: "Kitetsu", hiltColor: "#dc2626", sayaColor: "#1e1b4b", tsubaColor: "#d97706", offsetZ: 0.0, rotY: 0.04 },
        { name: "Enma", hiltColor: "#9333ea", sayaColor: "#581c87", tsubaColor: "#facc15", offsetZ: 0.07, rotY: -0.04 },
      ].map((sword, idx) => (
        <group key={`katana-${idx}`} position={[0, 0, sword.offsetZ]} rotation={[0, sword.rotY, 0]}>
          {/* Scabbard Body (Elevated above ground) */}
          <mesh position={[0, -0.48, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.018, 0.98, 8]} />
            <meshStandardMaterial color={sword.sayaColor} roughness={0.35} />
          </mesh>
          {/* Kojiri (Brass Tip) */}
          <mesh position={[0, -0.98, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.014, 0.06, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Koiguchi (Collar) */}
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.026, 0.024, 0.035, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Tsuba (Crossguard) */}
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.014, 12]} />
            <meshStandardMaterial color={sword.tsubaColor} metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Tsuka (Handle with cord wrap) */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.022, 0.28, 8]} />
            <meshStandardMaterial color={sword.hiltColor} roughness={0.5} />
          </mesh>
          {/* Kashira (Pommel Cap) */}
          <mesh position={[0, 0.33, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* Active Battle Stance: Drawn Katana in Right Hand */}
      {isWorking && (
        <group position={[0.78, 0.08, 0.52]} rotation={[-0.85, 0.35, 1.25]}>
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

// Luffy Gear 5 Red-Black Conqueror's Haki Lightning Core
function LuffyHakiVFX() {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 6.0;
      const s = 0.9 + Math.sin(t * 18.0) * 0.2;
      meshRef.current.scale.set(s, 1.0, s);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3.5 + Math.sin(t * 22.0) * 1.5;
    }
  });

  return (
    <group position={[0.2, 1.2, 0.3]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.04, 0.08, 1.6, 6]} />
        <meshBasicMaterial color="#ff1111" />
      </mesh>
      <pointLight ref={lightRef} color="#ff1111" intensity={3.5} distance={5} />
    </group>
  );
}

// Zoro Cyan-Green Dragon Blade Aura
function ZoroBladeVFX() {
  const auraRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (auraRef.current) {
      auraRef.current.rotation.y = state.clock.getElapsedTime() * 2.5;
    }
  });

  return (
    <group ref={auraRef} position={[0, 0.9, 0]}>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, x > 0 ? 0.3 : -0.3]}>
          <ringGeometry args={[0.3, 0.45, 16]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Sparkles count={18} scale={2.2} size={3} speed={1.2} color="#00ffaa" opacity={0.8} />
    </group>
  );
}

// Sanji Ifrit Jambe Fire on Right Leg
function SanjiFlameVFX() {
  const flameRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flameRef.current) {
      const t = state.clock.getElapsedTime();
      const s = 0.85 + Math.sin(t * 16.0) * 0.25;
      flameRef.current.scale.set(s, s * 1.2, s);
    }
  });

  return (
    <group position={[0.25, 0.3, 0]}>
      <mesh ref={flameRef}>
        <coneGeometry args={[0.25, 0.65, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      <pointLight color="#38bdf8" intensity={2.5} distance={3} />
    </group>
  );
}

// Brook Floating 3D Musical Notes
function BrookNotesVFX() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = 2.4 + Math.sin(t * 2.0) * 0.2;
      groupRef.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      <Html position={[-0.4, 0, 0]} center transform distanceFactor={14}>
        <span className="text-cyan-300 text-lg font-bold select-none pointer-events-none drop-shadow-[0_0_8px_#22d3ee]">
          ♪
        </span>
      </Html>
      <Html position={[0.4, 0.3, 0]} center transform distanceFactor={14}>
        <span className="text-cyan-200 text-xl font-bold select-none pointer-events-none drop-shadow-[0_0_10px_#67e8f9]">
          ♫
        </span>
      </Html>
      <Sparkles count={15} scale={2.5} size={2.5} speed={0.6} color="#38bdf8" />
    </group>
  );
}

// Nami Golden Zeus Lightning Sparkles
function NamiZeusVFX() {
  return (
    <group position={[0, 1.8, 0]}>
      <Sparkles count={25} scale={2.5} size={3.8} speed={1.5} color="#fde047" opacity={0.9} />
      <pointLight color="#facc15" intensity={2.0} distance={4} />
    </group>
  );
}

// Chopper Sakura Petals
function ChopperSakuraVFX() {
  return (
    <group position={[0, 0.8, 0]}>
      <Sparkles count={20} scale={1.8} size={3.0} speed={0.8} color="#f472b6" opacity={0.85} />
    </group>
  );
}

// Sanji Animated Component with 30 Genuine Skeletal Animations
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
  const { actions } = useAnimations(animations, groupRef);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight);
  }, [scene, spec]);

  useEffect(() => {
    if (!actions) return;
    const isWorking = status === "working";
    const currentAction = isMoving || isWorking ? "pl_sanji_atta01_run" : "pl_sanji_atta01_idle_a";
    const prevAction = currentAction === "pl_sanji_atta01_run" ? "pl_sanji_atta01_idle_a" : "pl_sanji_atta01_run";

    actions[prevAction]?.fadeOut(0.3);
    const active = actions[currentAction] || actions["pl_sanji_atta01_idle_a"];
    if (active) {
      active.reset().fadeIn(0.3).play();
    }

    return () => {
      actions[currentAction]?.fadeOut(0.2);
    };
  }, [actions, status, isMoving]);

  return (
    <group ref={groupRef}>
      <primitive object={normalizedGroup} />
      <SanjiFlameVFX />
    </group>
  );
}

// Nami Rigged Skeletal Animation Component (250 bones)
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
  const groupRef = useRef<THREE.Group>(null);
  const bonesRef = useRef<{
    leftThigh?: THREE.Bone;
    rightThigh?: THREE.Bone;
    leftKnee?: THREE.Bone;
    rightKnee?: THREE.Bone;
    hips?: THREE.Bone;
    spine?: THREE.Bone;
  }>({});

  const normalizedGroup = useMemo(() => {
    const norm = prepareAndNormalizeCharacter(scene, spec.targetHeight);
    norm.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const name = obj.name.toLowerCase();
        if (name.includes("leg_left_thigh") || name.includes("thigh_l")) bonesRef.current.leftThigh = obj as THREE.Bone;
        if (name.includes("leg_right_thigh") || name.includes("thigh_r")) bonesRef.current.rightThigh = obj as THREE.Bone;
        if (name.includes("leg_left_knee") || name.includes("knee_l")) bonesRef.current.leftKnee = obj as THREE.Bone;
        if (name.includes("leg_right_knee") || name.includes("knee_r")) bonesRef.current.rightKnee = obj as THREE.Bone;
        if (name.includes("root_hips") || name.includes("pelvis")) bonesRef.current.hips = obj as THREE.Bone;
        if (name.includes("spine")) bonesRef.current.spine = obj as THREE.Bone;
      }
    });
    return norm;
  }, [scene, spec]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const bones = bonesRef.current;

    if (isMoving) {
      // Coordinated alternating leg walk stride on Nami's skeletal joints
      const stride = Math.sin(t * 8.5);
      if (bones.leftThigh) bones.leftThigh.rotation.x = stride * 0.42;
      if (bones.rightThigh) bones.rightThigh.rotation.x = -stride * 0.42;
      if (bones.leftKnee) bones.leftKnee.rotation.x = Math.max(0, -stride * 0.45);
      if (bones.rightKnee) bones.rightKnee.rotation.x = Math.max(0, stride * 0.45);
      if (bones.hips) bones.hips.position.y = Math.abs(Math.sin(t * 8.5)) * 0.025;
    } else {
      // Natural idle breathing & posture weight shift
      const breathe = Math.sin(t * 2.2) * 0.02;
      if (bones.spine) bones.spine.rotation.x = breathe;
      if (bones.hips) bones.hips.rotation.z = Math.sin(t * 1.1) * 0.025;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={normalizedGroup} />
      <NamiZeusVFX />
    </group>
  );
}

// Standard Character Mesh with Character-Specific Procedural Behaviors & Gait
function StandardCharacterMesh({
  appearance,
  status,
  isMoving,
}: {
  appearance: string;
  status?: WorldAgentStatus;
  isMoving?: boolean;
}) {
  const spec = CHARACTER_SPECS[appearance] || CHARACTER_SPECS["luffy-gear5"];
  const { scene } = (useGLTF as any)(spec.url);
  const modelRef = useRef<THREE.Group>(null);

  const normalizedGroup = useMemo(() => {
    return prepareAndNormalizeCharacter(scene, spec.targetHeight);
  }, [scene, spec]);

  // Unique phase offset per character so breathing & activities are un-synchronized
  const phaseOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < appearance.length; i++) hash += appearance.charCodeAt(i);
    return (hash % 100) * 0.1;
  }, [appearance]);

  // Natural Procedural Idle & Locomotion Gait Cycle
  useFrame((state) => {
    if (!modelRef.current) return;
    const t = state.clock.getElapsedTime() + phaseOffset;
    const isWorking = status === "working";

    if (isMoving) {
      // Active Locomotion Walking / Running Cycle:
      // - Forward lean pitch
      // - Coordinated shoulder counter-twist
      // - Rhythmic foot contact bobbing (subtle 0.04m, NOT 0.25m jumping)
      const strideCadence = t * 9.0;
      modelRef.current.position.y = Math.abs(Math.sin(strideCadence)) * 0.035;
      modelRef.current.rotation.x = 0.07; // Natural slight forward lean
      modelRef.current.rotation.z = Math.sin(strideCadence) * 0.035; // Shoulder sway
      modelRef.current.rotation.y = Math.sin(strideCadence * 0.5) * 0.03;
    } else if (isWorking) {
      // Active Task Working Pose
      modelRef.current.position.y = Math.abs(Math.sin(t * 4.5)) * 0.04;
      modelRef.current.rotation.x = 0.02;
      modelRef.current.rotation.y = Math.sin(t * 2.5) * 0.12;
      modelRef.current.rotation.z = 0;
    } else {
      // Natural Autonomous Idle Behaviors:
      // 1. Continuous breathing rhythm
      const breathe = Math.sin(t * 2.0) * 0.012;
      // 2. Subtle weight shift
      const weightShift = Math.sin(t * 0.8) * 0.02;

      // 3. Periodic character-specific gestures (every ~6-8 seconds)
      const cycle = t % 7.5;
      let glanceY = 0;
      let gestureX = 0;

      if (cycle > 5.5) {
        // Natural look around glance
        glanceY = Math.sin((cycle - 5.5) * Math.PI) * 0.14;
      }

      if (appearance.includes("luffy") && cycle > 3.0 && cycle < 4.5) {
        // Luffy joyful laugh / head tilt
        gestureX = -Math.sin((cycle - 3.0) * Math.PI * 0.67) * 0.08;
      } else if (appearance === "zoro" && cycle > 2.0 && cycle < 3.5) {
        // Zoro posture check / swordsman adjustment
        glanceY = 0.08;
      } else if (appearance === "chopper" && cycle > 1.5 && cycle < 3.0) {
        // Chopper curious hop
        gestureX = Math.sin((cycle - 1.5) * Math.PI * 0.67) * 0.04;
      } else if (appearance === "franky") {
        // Franky solid upright stance
        gestureX = 0;
      }

      modelRef.current.position.y = breathe;
      modelRef.current.rotation.x = gestureX;
      modelRef.current.rotation.y = glanceY;
      modelRef.current.rotation.z = weightShift;
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedGroup} />

      {/* Signature Gear & Character Equipments */}
      {(appearance === "luffy-gear5" || appearance === "captain") && <LuffyHakiVFX />}
      {appearance === "zoro" && (
        <>
          <ZoroBladeVFX />
          {/* Zoro's 3 Attached Katanas & Sheaths */}
          <ZoroThreeSwords isWorking={status === "working"} />
        </>
      )}
      {appearance === "brook" && <BrookNotesVFX />}
      {appearance === "chopper" && <ChopperSakuraVFX />}

      {/* Haki / Power Aura Sparkles */}
      {status === "working" ? (
        <Sparkles
          count={35}
          scale={spec.targetHeight * 1.3}
          size={4.5}
          speed={1.4}
          color={spec.auraColor}
          opacity={0.9}
        />
      ) : (
        <Sparkles
          count={10}
          scale={spec.targetHeight * 1.1}
          size={2.2}
          speed={0.5}
          color={spec.auraColor}
          opacity={0.5}
        />
      )}
    </group>
  );
}

export default function AgentCharacterModel({
  appearance,
  color,
  status = "idle",
  isMoving = false,
}: AgentCharacterModelProps) {
  const spec = CHARACTER_SPECS[appearance] || CHARACTER_SPECS["luffy-gear5"];

  // Sanji uses genuine skeletal animations (30 clips)
  if (appearance === "sanji") {
    return <SanjiAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }

  // Nami uses procedural skeletal kinematics (250 joints)
  if (appearance === "nami") {
    return <NamiAnimatedCharacter spec={spec} status={status} isMoving={isMoving} />;
  }

  // All other Straw Hat members use standard technical procedural locomotion & idle behavior
  return (
    <StandardCharacterMesh
      appearance={appearance}
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
