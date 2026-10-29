import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '../public/models');

const ensureDir = (p) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};

ensureDir(path.join(baseDir, 'characters'));
ensureDir(path.join(baseDir, 'environment'));
ensureDir(path.join(baseDir, 'structures'));
ensureDir(path.join(baseDir, 'ship'));

function exportGLB(scene, outPath) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        const buf = Buffer.isBuffer(gltf) ? gltf : Buffer.from(gltf);
        fs.writeFileSync(outPath, buf);
        console.log(`[+] Exported: ${path.relative(baseDir, outPath)} (${(buf.length / 1024).toFixed(1)} KB)`);
        resolve(outPath);
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

// -------------------------------------------------------------
// HELPER FOR COMBINED MESH CREATION
// -------------------------------------------------------------
function makeMesh(geom, color, options = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.5,
    metalness: options.metalness ?? 0.1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    wireframe: options.wireframe ?? false,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  const m = new THREE.Mesh(geom, mat);
  if (options.pos) m.position.set(...options.pos);
  if (options.rot) m.rotation.set(...options.rot);
  if (options.scale) m.scale.set(...options.scale);
  return m;
}

// =============================================================
// 1. CHARACTERS GENERATOR
// =============================================================

// ZORO (King of Hell - Three Swords, Wano green coat)
async function buildZoro() {
  const root = new THREE.Group();
  root.name = 'Zoro_KingOfHell';

  // Body / Torso with green Wano kimono
  root.add(makeMesh(new THREE.CylinderGeometry(0.26, 0.24, 0.75, 12), 0x15803d, { pos: [0, 0.7, 0] }));
  // Red Haramaki sash
  root.add(makeMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.25, 12), 0xdc2626, { pos: [0, 0.55, 0] }));
  // Dark pants
  root.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), 0x0f172a, { pos: [-0.12, 0.25, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), 0x0f172a, { pos: [0.12, 0.25, 0] }));

  // Head & Anime Face
  root.add(makeMesh(new THREE.SphereGeometry(0.24, 16, 16), 0xfed7aa, { pos: [0, 1.25, 0] }));
  // Green cropped hair (Marimo)
  root.add(makeMesh(new THREE.SphereGeometry(0.26, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), 0x16a34a, { pos: [0, 1.34, 0] }));
  // Black Bandana tied on left bicep
  root.add(makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), 0x09090b, { pos: [-0.34, 0.8, 0] }));

  // Arms in action stance
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), 0x15803d, { pos: [-0.34, 0.7, 0.1], rot: [0.6, 0, -0.4] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), 0x15803d, { pos: [0.34, 0.7, 0.1], rot: [0.6, 0, 0.4] }));

  // Three Katanas (Enma, Wado Ichimonji, Sandai Kitetsu)
  // 1. Right hand katana (Enma - purple scabbard, gold guard)
  const enma = new THREE.Group();
  enma.add(makeMesh(new THREE.BoxGeometry(0.04, 0.04, 1.3), 0x581c87, { pos: [0, 0, 0.6] }));
  enma.add(makeMesh(new THREE.BoxGeometry(0.02, 0.03, 1.0), 0xe2e8f0, { pos: [0, 0, 1.6], metalness: 0.9 }));
  enma.add(makeMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), 0xf59e0b, { pos: [0, 0, 1.1], rot: [Math.PI / 2, 0, 0] }));
  enma.position.set(0.42, 0.7, 0.2);
  enma.rotation.set(-0.4, 0.2, 0.5);
  root.add(enma);

  // 2 & 3: Two hip katanas (Wado Ichimonji white, Kitetsu red)
  const hipSwords = new THREE.Group();
  hipSwords.add(makeMesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), 0xf8fafc, { pos: [0, 0, 0], rot: [0.3, 0.4, -0.2] }));
  hipSwords.add(makeMesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), 0xb91c1c, { pos: [0, -0.06, 0], rot: [0.35, 0.4, -0.2] }));
  hipSwords.position.set(-0.28, 0.55, 0.05);
  root.add(hipSwords);

  // 4. Emerald Haki aura flames (Enma King of Hell effect)
  root.add(makeMesh(new THREE.TorusGeometry(0.35, 0.04, 8, 20), 0x10b981, {
    pos: [0, 0.8, 0],
    rot: [Math.PI / 4, 0, 0],
    emissive: 0x059669,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.75,
  }));

  await exportGLB(root, path.join(baseDir, 'characters/zoro.glb'));
}

// NAMI (Clima-Tact, Zeus cloud, orange hair)
async function buildNami() {
  const root = new THREE.Group();
  root.name = 'Nami_ClimaTact';

  // Body & Blue/White Onigashima dress
  root.add(makeMesh(new THREE.CylinderGeometry(0.2, 0.18, 0.65, 12), 0x38bdf8, { pos: [0, 0.65, 0] }));
  // Orange Obi sash
  root.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0xf97316, { pos: [0, 0.5, 0] }));
  // Legs in high brown boots
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), 0x78350f, { pos: [-0.1, 0.25, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), 0x78350f, { pos: [0.1, 0.25, 0] }));

  // Head & Anime Face
  root.add(makeMesh(new THREE.SphereGeometry(0.22, 16, 16), 0xfed7aa, { pos: [0, 1.18, 0] }));
  // Long Flowing Orange Hair
  root.add(makeMesh(new THREE.SphereGeometry(0.25, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.7), 0xf97316, { pos: [0, 1.25, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), 0xf97316, { pos: [0, 0.95, -0.15], rot: [0.2, 0, 0] }));

  // Sorcery Clima-Tact Staff (Orange / Gold baton)
  const staff = new THREE.Group();
  staff.add(makeMesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), 0xf59e0b, { pos: [0, 0, 0], metalness: 0.8 }));
  staff.add(makeMesh(new THREE.SphereGeometry(0.08, 8, 8), 0x38bdf8, { pos: [0, 0.9, 0], emissive: 0x0284c7 }));
  staff.position.set(0.32, 0.8, 0.1);
  staff.rotation.set(0.2, 0, 0.15);
  root.add(staff);

  // Zeus Cloud Companion floating beside Nami
  const zeus = new THREE.Group();
  zeus.add(makeMesh(new THREE.SphereGeometry(0.24, 10, 10), 0xffffff, { pos: [0, 0, 0] }));
  zeus.add(makeMesh(new THREE.SphereGeometry(0.18, 8, 8), 0xffffff, { pos: [-0.18, 0.06, 0] }));
  zeus.add(makeMesh(new THREE.SphereGeometry(0.16, 8, 8), 0xffffff, { pos: [0.18, 0.04, 0] }));
  // Zeus angry eyes & mouth
  zeus.add(makeMesh(new THREE.SphereGeometry(0.03, 6, 6), 0x000000, { pos: [-0.08, 0.04, 0.22] }));
  zeus.add(makeMesh(new THREE.SphereGeometry(0.03, 6, 6), 0x000000, { pos: [0.08, 0.04, 0.22] }));
  // Tiny lightning bolt spark
  zeus.add(makeMesh(new THREE.ConeGeometry(0.04, 0.25, 4), 0xfacc15, { pos: [0, -0.22, 0], emissive: 0xeab308 }));
  zeus.position.set(-0.45, 1.35, 0.2);
  root.add(zeus);

  await exportGLB(root, path.join(baseDir, 'characters/nami.glb'));
}

// USOPP (God Usopp - Kuro Kabuto, Sniper Goggles, Hat)
async function buildUsopp() {
  const root = new THREE.Group();
  root.name = 'Usopp_GodSniper';

  // Body & Yellow Overalls
  root.add(makeMesh(new THREE.CylinderGeometry(0.24, 0.22, 0.7, 12), 0xeab308, { pos: [0, 0.65, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), 0xca8a04, { pos: [-0.12, 0.25, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), 0xca8a04, { pos: [0.12, 0.25, 0] }));

  // Head & Long Nose
  root.add(makeMesh(new THREE.SphereGeometry(0.22, 16, 16), 0xd97706, { pos: [0, 1.18, 0] }));
  // Long iconic nose
  root.add(makeMesh(new THREE.CylinderGeometry(0.03, 0.035, 0.28, 8), 0xd97706, { pos: [0, 1.15, 0.28], rot: [Math.PI / 2, 0, 0] }));

  // White Sniper Hat & Goggles
  root.add(makeMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.2, 12), 0xffffff, { pos: [0, 1.35, 0] }));
  root.add(makeMesh(new THREE.TorusGeometry(0.3, 0.04, 6, 16), 0x475569, { pos: [0, 1.3, 0], rot: [Math.PI / 2, 0, 0] }));
  // Sniper Goggles
  root.add(makeMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), 0xd97706, { pos: [-0.1, 1.25, 0.2], rot: [Math.PI / 2, 0, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), 0xd97706, { pos: [0.1, 1.25, 0.2], rot: [Math.PI / 2, 0, 0] }));

  // Kuro Kabuto (Black Giant Slingshot) in hand
  const kabuto = new THREE.Group();
  kabuto.add(makeMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), 0x1e293b, { pos: [0, 0, 0] }));
  // Slingshot fork
  kabuto.add(makeMesh(new THREE.TorusGeometry(0.22, 0.035, 8, 16, Math.PI), 0x1e293b, { pos: [0, 0.75, 0], rot: [0, 0, 0] }));
  kabuto.add(makeMesh(new THREE.SphereGeometry(0.08, 8, 8), 0x22c55e, { pos: [0, 0.85, 0.05], emissive: 0x15803d })); // Pop green seed
  kabuto.position.set(0.36, 0.75, 0.15);
  kabuto.rotation.set(0.3, 0, -0.2);
  root.add(kabuto);

  // Pop Green Leather Ammo Bag
  root.add(makeMesh(new THREE.BoxGeometry(0.22, 0.22, 0.14), 0x78350f, { pos: [-0.25, 0.45, 0.1] }));

  await exportGLB(root, path.join(baseDir, 'characters/usopp.glb'));
}

// SANJI (Ifrit Jambe, Black Suit, Plasma Flame Leg)
async function buildSanji() {
  const root = new THREE.Group();
  root.name = 'Sanji_IfritJambe';

  // Sleek Black 3-piece Suit
  root.add(makeMesh(new THREE.CylinderGeometry(0.24, 0.22, 0.75, 12), 0x09090b, { pos: [0, 0.72, 0] }));
  // White shirt collar & blue tie
  root.add(makeMesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), 0xf8fafc, { pos: [0, 0.95, 0.1] }));
  root.add(makeMesh(new THREE.BoxGeometry(0.05, 0.22, 0.045), 0x0284c7, { pos: [0, 0.88, 0.11] }));

  // Black trousers
  root.add(makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), 0x09090b, { pos: [-0.12, 0.28, 0] }));
  // Right Leg: Awakened Ifrit Jambe (Fiery Blue-Yellow Plasma Flames)
  const fireLeg = new THREE.Group();
  fireLeg.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.11, 0.6, 8), 0x0284c7, {
    pos: [0, 0, 0],
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
  }));
  // Blue/Yellow Plasma flame sheath
  fireLeg.add(makeMesh(new THREE.ConeGeometry(0.25, 0.8, 8), 0x38bdf8, {
    pos: [0, 0.1, 0],
    rot: [Math.PI, 0, 0],
    emissive: 0xfacc15,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.8,
  }));
  fireLeg.position.set(0.15, 0.3, 0.1);
  fireLeg.rotation.set(-0.35, 0, 0.2);
  root.add(fireLeg);

  // Head & Blond Anime Hair over one eye
  root.add(makeMesh(new THREE.SphereGeometry(0.22, 16, 16), 0xfed7aa, { pos: [0, 1.25, 0] }));
  // Blond hair
  root.add(makeMesh(new THREE.SphereGeometry(0.25, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), 0xfacc15, { pos: [0, 1.32, 0] }));
  // Hair fringe covering right eye
  root.add(makeMesh(new THREE.BoxGeometry(0.14, 0.2, 0.06), 0xfacc15, { pos: [0.1, 1.24, 0.2], rot: [0, 0, -0.4] }));

  // Hands in pockets relaxed prince stance
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), 0x09090b, { pos: [-0.28, 0.72, 0.05], rot: [-0.3, 0, 0.2] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), 0x09090b, { pos: [0.28, 0.72, 0.05], rot: [-0.3, 0, -0.2] }));

  await exportGLB(root, path.join(baseDir, 'characters/sanji.glb'));
}

// CHOPPER (Tony Tony Chopper - Blue Nose Reindeer, Pink Hat with White X)
async function buildChopper() {
  const root = new THREE.Group();
  root.name = 'Chopper_Doctor';

  // Small furry body
  root.add(makeMesh(new THREE.SphereGeometry(0.28, 12, 12), 0x78350f, { pos: [0, 0.38, 0] }));
  // Maroon shorts
  root.add(makeMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12), 0x991b1b, { pos: [0, 0.2, 0] }));
  // Hooves
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 6), 0x1c1917, { pos: [-0.12, 0.08, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 6), 0x1c1917, { pos: [0.12, 0.08, 0] }));

  // Big cute head & blue nose
  root.add(makeMesh(new THREE.SphereGeometry(0.32, 16, 16), 0x9a3412, { pos: [0, 0.8, 0] }));
  // Blue shiny nose
  root.add(makeMesh(new THREE.SphereGeometry(0.06, 8, 8), 0x0284c7, { pos: [0, 0.78, 0.32], emissive: 0x0369a1 }));
  // Big eyes
  root.add(makeMesh(new THREE.SphereGeometry(0.05, 8, 8), 0x09090b, { pos: [-0.12, 0.88, 0.28] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.05, 8, 8), 0x09090b, { pos: [0.12, 0.88, 0.28] }));

  // Big Pink Doctor Hat with White Cross
  root.add(makeMesh(new THREE.CylinderGeometry(0.38, 0.42, 0.32, 16), 0xf472b6, { pos: [0, 1.12, 0] }));
  root.add(makeMesh(new THREE.TorusGeometry(0.44, 0.08, 8, 20), 0xf472b6, { pos: [0, 0.98, 0], rot: [Math.PI / 2, 0, 0] }));
  // White Cross emblem
  root.add(makeMesh(new THREE.BoxGeometry(0.18, 0.06, 0.02), 0xffffff, { pos: [0, 1.15, 0.42] }));
  root.add(makeMesh(new THREE.BoxGeometry(0.06, 0.18, 0.02), 0xffffff, { pos: [0, 1.15, 0.42] }));

  // Reindeer Antlers
  root.add(makeMesh(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6), 0x451a03, { pos: [-0.34, 1.25, 0], rot: [0, 0, -0.6] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6), 0x451a03, { pos: [0.34, 1.25, 0], rot: [0, 0, 0.6] }));

  // Blue medical backpack
  root.add(makeMesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), 0x0284c7, { pos: [0, 0.45, -0.24] }));

  await exportGLB(root, path.join(baseDir, 'characters/chopper.glb'));
}

// ROBIN (Nico Robin - Gigante Fleur Blooming Purple Hands)
async function buildRobin() {
  const root = new THREE.Group();
  root.name = 'Robin_GiganteFleur';

  // Elegant dark blue leather vest & pink sarong
  root.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.18, 0.7, 12), 0x1e3a8a, { pos: [0, 0.7, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 12), 0xdb2777, { pos: [0, 0.35, 0] }));

  // Head & Long sleek black hair
  root.add(makeMesh(new THREE.SphereGeometry(0.22, 16, 16), 0xfed7aa, { pos: [0, 1.2, 0] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.25, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.7), 0x0f172a, { pos: [0, 1.26, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.15, 0.22, 0.8, 8), 0x0f172a, { pos: [0, 0.9, -0.15] }));
  // Sunglasses perched on forehead
  root.add(makeMesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), 0xf97316, { pos: [0, 1.35, 0.18] }));

  // Cross-armed stance (Cien Fleur posture)
  root.add(makeMesh(new THREE.BoxGeometry(0.38, 0.08, 0.12), 0xfed7aa, { pos: [0, 0.8, 0.18] }));

  // Blooming Giant Floral Wings/Arms at back (Gigante Fleur)
  const flowerWings = new THREE.Group();
  [-0.6, -0.3, 0.3, 0.6].forEach((x, i) => {
    const arm = makeMesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 8), 0xc084fc, {
      pos: [x, 0.8 + (i % 2) * 0.3, -0.25],
      rot: [0.3, 0, x * 0.8],
      emissive: 0x9333ea,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    // Hand petal
    arm.add(makeMesh(new THREE.BoxGeometry(0.18, 0.24, 0.06), 0xd8b4fe, { pos: [0, 0.65, 0] }));
    flowerWings.add(arm);
  });
  root.add(flowerWings);

  await exportGLB(root, path.join(baseDir, 'characters/robin.glb'));
}

// BROOK (Soul King - Skeleton Afro, Guitar, Feather Boa)
async function buildBrook() {
  const root = new THREE.Group();
  root.name = 'Brook_SoulKing';

  // Tall slender skeleton frame & formal suit
  root.add(makeMesh(new THREE.CylinderGeometry(0.14, 0.12, 0.9, 8), 0x18181b, { pos: [0, 0.8, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), 0x18181b, { pos: [-0.09, 0.35, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), 0x18181b, { pos: [0.09, 0.35, 0] }));

  // Skull Head
  root.add(makeMesh(new THREE.SphereGeometry(0.18, 12, 12), 0xf8fafc, { pos: [0, 1.45, 0] }));
  // Eye sockets
  root.add(makeMesh(new THREE.SphereGeometry(0.05, 6, 6), 0x000000, { pos: [-0.07, 1.48, 0.15] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.05, 6, 6), 0x000000, { pos: [0.07, 1.48, 0.15] }));

  // Massive Black Afro
  root.add(makeMesh(new THREE.SphereGeometry(0.45, 16, 16), 0x09090b, { pos: [0, 1.75, -0.05] }));
  // Soul King Golden Crown
  root.add(makeMesh(new THREE.ConeGeometry(0.25, 0.22, 5), 0xf59e0b, { pos: [0, 2.25, -0.05], metalness: 0.9 }));

  // Pink Feather Boa around neck
  root.add(makeMesh(new THREE.TorusGeometry(0.28, 0.1, 8, 16), 0xec4899, { pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0] }));

  // Shark Electric Guitar
  const guitar = new THREE.Group();
  guitar.add(makeMesh(new THREE.BoxGeometry(0.35, 0.6, 0.08), 0x06b6d4, { pos: [0, 0, 0] }));
  guitar.add(makeMesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), 0xf59e0b, { pos: [0, 0.75, 0] }));
  guitar.position.set(0.28, 0.95, 0.22);
  guitar.rotation.set(0.4, 0.2, -0.6);
  root.add(guitar);

  await exportGLB(root, path.join(baseDir, 'characters/brook.glb'));
}

// JINBE (First Son of the Sea - Blue Whale Shark Fishman, Sun Tattoo, Kimono)
async function buildJinbe() {
  const root = new THREE.Group();
  root.name = 'Jinbe_FishmanKarate';

  // Broad muscular blue torso
  root.add(makeMesh(new THREE.CylinderGeometry(0.45, 0.48, 0.8, 14), 0x38bdf8, { pos: [0, 0.7, 0] }));
  // Traditional Orange Kimono Coat
  root.add(makeMesh(new THREE.CylinderGeometry(0.48, 0.52, 0.82, 14, 1, true), 0xea580c, { pos: [0, 0.7, 0] }));
  // Black Martial Arts Obi Belt
  root.add(makeMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 14), 0x09090b, { pos: [0, 0.5, 0] }));

  // Sturdy wide legs
  root.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8), 0x38bdf8, { pos: [-0.22, 0.22, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8), 0x38bdf8, { pos: [0.22, 0.22, 0] }));

  // Broad Whale Shark Head & Brow
  root.add(makeMesh(new THREE.SphereGeometry(0.35, 14, 14), 0x38bdf8, { pos: [0, 1.25, 0] }));
  // Lower jaw tusks
  root.add(makeMesh(new THREE.ConeGeometry(0.05, 0.16, 6), 0xffffff, { pos: [-0.18, 1.18, 0.32], rot: [0.3, 0, 0.3] }));
  root.add(makeMesh(new THREE.ConeGeometry(0.05, 0.16, 6), 0xffffff, { pos: [0.18, 1.18, 0.32], rot: [0.3, 0, -0.3] }));
  // Red Sun Pirates tattoo on chest
  root.add(makeMesh(new THREE.CircleGeometry(0.14, 12), 0xdc2626, { pos: [0, 0.85, 0.49] }));

  // Fishman Karate Stance Arms
  root.add(makeMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 8), 0x38bdf8, { pos: [-0.48, 0.78, 0.18], rot: [0.8, 0, -0.4] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 8), 0x38bdf8, { pos: [0.48, 0.78, 0.18], rot: [0.8, 0, 0.4] }));

  // Swirling water aura ring
  root.add(makeMesh(new THREE.TorusGeometry(0.65, 0.06, 8, 24), 0x0284c7, {
    pos: [0, 0.8, 0],
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.75,
  }));

  await exportGLB(root, path.join(baseDir, 'characters/jinbe.glb'));
}

// =============================================================
// 2. THOUSAND SUNNY SHIP MODEL
// =============================================================
async function buildThousandSunny() {
  const root = new THREE.Group();
  root.name = 'ThousandSunny';

  // 1. Mahogany / Red-Orange Main Hull
  root.add(makeMesh(new THREE.BoxGeometry(4.8, 2.2, 10.5), 0x9a3412, { pos: [0, 1.1, 0] }));
  // Tapered bow
  root.add(makeMesh(new THREE.BoxGeometry(4.2, 1.8, 3.2), 0xc2410c, { pos: [0, 1.3, 5.8], rot: [0.25, 0, 0] }));
  // Raised aft quarterdeck
  root.add(makeMesh(new THREE.BoxGeometry(4.6, 1.6, 3.6), 0xea580c, { pos: [0, 2.3, -3.8] }));

  // 2. Iconic Lion Figurehead & Gaon Cannon
  const lion = new THREE.Group();
  // Golden face
  lion.add(makeMesh(new THREE.SphereGeometry(1.2, 16, 16), 0xfacc15, { pos: [0, 0, 0], metalness: 0.4 }));
  // Gaon cannon mouth
  lion.add(makeMesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 12), 0x0f172a, { pos: [0, 0, 1.0], rot: [Math.PI / 2, 0, 0] }));
  // 12 Sun Petal Mane
  for (let i = 0; i < 12; i++) {
    const rad = (i * Math.PI) / 6;
    lion.add(makeMesh(new THREE.ConeGeometry(0.35, 0.8, 6), 0xf59e0b, {
      pos: [Math.sin(rad) * 1.45, Math.cos(rad) * 1.45, -0.1],
      rot: [0, 0, -rad],
    }));
  }
  // Lion ears
  lion.add(makeMesh(new THREE.SphereGeometry(0.3, 8, 8), 0xfacc15, { pos: [-1.0, 1.0, -0.1] }));
  lion.add(makeMesh(new THREE.SphereGeometry(0.3, 8, 8), 0xfacc15, { pos: [1.0, 1.0, -0.1] }));
  lion.position.set(0, 2.2, 7.5);
  root.add(lion);

  // 3. Green Lawn Deck (Boong cỏ xanh)
  root.add(makeMesh(new THREE.BoxGeometry(4.4, 0.15, 6.2), 0x65a30d, { pos: [0, 2.2, 0.6] }));

  // 4. White Main Mast & Straw Hat Jolly Roger Sail
  const mainMast = new THREE.Group();
  mainMast.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.28, 8.5, 10), 0x78350f, { pos: [0, 4.25, 0] }));
  // Cross yardarm
  mainMast.add(makeMesh(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 8), 0x451a03, { pos: [0, 5.8, 0], rot: [0, 0, Math.PI / 2] }));
  // White Sail with red/yellow Jolly Roger
  mainMast.add(makeMesh(new THREE.BoxGeometry(6.0, 3.2, 0.08), 0xfffbeb, { pos: [0, 4.4, 0.2] }));
  // Jolly Roger Skull
  mainMast.add(makeMesh(new THREE.CircleGeometry(0.85, 20), 0xdc2626, { pos: [0, 4.4, 0.28] }));
  mainMast.add(makeMesh(new THREE.CircleGeometry(0.6, 20), 0xfacc15, { pos: [0, 4.4, 0.29] }));
  // Crow's Nest (Đài quan sát)
  mainMast.add(makeMesh(new THREE.CylinderGeometry(1.0, 0.85, 1.0, 12), 0xb45309, { pos: [0, 7.8, 0] }));
  mainMast.position.set(0, 2.2, -0.8);
  root.add(mainMast);

  // 5. Fore Mast & Sail
  const foreMast = new THREE.Group();
  foreMast.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 8), 0x78350f, { pos: [0, 3.4, 0] }));
  foreMast.add(makeMesh(new THREE.BoxGeometry(4.5, 2.4, 0.06), 0xfffbeb, { pos: [0, 3.6, 0.18] }));
  foreMast.position.set(0, 2.2, 3.8);
  root.add(foreMast);

  // 6. Windmill & Nami's 3 Tangerine Trees on Aft Deck
  const aftWindmill = new THREE.Group();
  aftWindmill.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), 0xf8fafc, { pos: [0, 0.4, 0] }));
  // 4 blades
  for (let b = 0; b < 4; b++) {
    aftWindmill.add(makeMesh(new THREE.BoxGeometry(0.12, 0.9, 0.02), 0x38bdf8, {
      pos: [0, 0.8, 0],
      rot: [0, 0, (b * Math.PI) / 2],
    }));
  }
  aftWindmill.position.set(0, 3.2, -4.5);
  root.add(aftWindmill);

  // 3 Tangerine trees
  [-1.2, 0, 1.2].forEach((tx, ti) => {
    const tree = new THREE.Group();
    tree.add(makeMesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6), 0x78350f, { pos: [0, 0.4, 0] }));
    tree.add(makeMesh(new THREE.SphereGeometry(0.55, 8, 8), 0x16a34a, { pos: [0, 0.9, 0] }));
    tree.add(makeMesh(new THREE.SphereGeometry(0.12, 6, 6), 0xea580c, { pos: [0.2, 0.9, 0.4] }));
    tree.position.set(tx, 3.1, -2.8);
    root.add(tree);
  });

  await exportGLB(root, path.join(baseDir, 'ship/thousand_sunny.glb'));
}

// =============================================================
// 3. ARCHITECTURAL SANCTUARIES & BASES
// =============================================================

// 1. SUN GOD SHRINE (Đài Thái Dương Cổ Đại Luffy)
async function buildSunGodShrine() {
  const root = new THREE.Group();
  root.name = 'SunGodShrine';

  // Broad white marble tiers
  root.add(makeMesh(new THREE.CylinderGeometry(9.5, 10.8, 0.6, 32), 0xf8fafc, { pos: [0, 0.3, 0], roughness: 0.3 }));
  root.add(makeMesh(new THREE.CylinderGeometry(7.8, 8.4, 0.4, 32), 0xf8fafc, { pos: [0, 0.8, 0], roughness: 0.3 }));

  // Gold Sun Rim
  root.add(makeMesh(new THREE.TorusGeometry(8.0, 0.15, 8, 36), 0xf59e0b, { pos: [0, 1.05, 0], rot: [Math.PI / 2, 0, 0], metalness: 0.9 }));

  // 4 Ancient Glowing Poneglyph Pillars
  [
    [5.4, 5.4],
    [-5.4, 5.4],
    [-5.4, -5.4],
    [5.4, -5.4],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Group();
    pillar.add(makeMesh(new THREE.BoxGeometry(1.2, 4.2, 1.2), 0xcbd5e1, { pos: [0, 2.1, 0] }));
    pillar.add(makeMesh(new THREE.ConeGeometry(0.9, 0.8, 4), 0xf59e0b, { pos: [0, 4.6, 0], metalness: 0.85 }));
    // Blue Glowing Poneglyph Rune
    pillar.add(makeMesh(new THREE.PlaneGeometry(0.8, 3.2), 0x38bdf8, {
      pos: [0, 2.1, 0.62],
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
    }));
    pillar.position.set(px, 0.6, pz);
    root.add(pillar);
  });

  // Center Sun God Solar Altar
  root.add(makeMesh(new THREE.CylinderGeometry(3.2, 3.6, 0.6, 24), 0xfef3c7, { pos: [0, 1.3, 0] }));
  root.add(makeMesh(new THREE.CircleGeometry(2.8, 24), 0xf59e0b, { pos: [0, 1.62, 0], rot: [-Math.PI / 2, 0, 0], metalness: 0.8 }));

  await exportGLB(root, path.join(baseDir, 'structures/sun_god_shrine.glb'));
}

// 2. WANO DOJO (Đạo Trường Kiếm Đạo Wano Zoro)
async function buildWanoDojo() {
  const root = new THREE.Group();
  root.name = 'WanoDojo';

  // Wooden platform
  root.add(makeMesh(new THREE.BoxGeometry(8.5, 0.5, 7.5), 0x78350f, { pos: [0, 0.25, 0] }));
  // Japanese Dojo Temple Hall
  root.add(makeMesh(new THREE.BoxGeometry(6.2, 3.2, 5.2), 0x451a03, { pos: [0, 1.85, -0.6] }));
  // Curved Traditional Tile Roof
  root.add(makeMesh(new THREE.ConeGeometry(5.2, 2.2, 4), 0x1e293b, { pos: [0, 4.2, -0.6], rot: [0, Math.PI / 4, 0] }));

  // Red Torii Gate leading into dojo
  const torii = new THREE.Group();
  torii.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.2, 3.6, 8), 0xdc2626, { pos: [-1.8, 1.8, 0] }));
  torii.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.2, 3.6, 8), 0xdc2626, { pos: [1.8, 1.8, 0] }));
  torii.add(makeMesh(new THREE.BoxGeometry(4.8, 0.3, 0.35), 0xdc2626, { pos: [0, 3.6, 0] }));
  torii.add(makeMesh(new THREE.BoxGeometry(4.2, 0.2, 0.25), 0x0f172a, { pos: [0, 3.1, 0] }));
  torii.position.set(0, 0.2, 2.8);
  root.add(torii);

  // Stone Lanterns
  [-2.8, 2.8].forEach((lx) => {
    const lantern = new THREE.Group();
    lantern.add(makeMesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8), 0x64748b, { pos: [0, 0.6, 0] }));
    lantern.add(makeMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 0x10b981, { pos: [0, 1.4, 0], emissive: 0x059669 }));
    lantern.add(makeMesh(new THREE.ConeGeometry(0.65, 0.4, 4), 0x1e293b, { pos: [0, 1.8, 0] }));
    lantern.position.set(lx, 0.2, 2.2);
    root.add(lantern);
  });

  await exportGLB(root, path.join(baseDir, 'structures/wano_dojo.glb'));
}

// 3. BARATIE RESTAURANT (Nhà Hàng Nổi Baratie Mini Ven Hồ Sanji)
async function buildBaratieRestaurant() {
  const root = new THREE.Group();
  root.name = 'BaratieRestaurant';

  // Wooden dock terrace by water
  root.add(makeMesh(new THREE.BoxGeometry(8.5, 0.4, 7.5), 0x78350f, { pos: [0, 0.2, 0] }));
  // European maritime restaurant building
  root.add(makeMesh(new THREE.BoxGeometry(5.8, 3.6, 4.6), 0x92400e, { pos: [0, 2.0, -1.0] }));
  // Slanted Terracotta Roof
  root.add(makeMesh(new THREE.ConeGeometry(4.6, 2.4, 4), 0xc2410c, { pos: [0, 4.6, -1.0] }));

  // Steaming Kitchen Chimney
  root.add(makeMesh(new THREE.CylinderGeometry(0.35, 0.4, 2.6, 8), 0x334155, { pos: [1.8, 5.2, -1.2] }));

  // Outdoor Dining Tables & Chairs
  [-1.8, 1.8].forEach((tx) => {
    root.add(makeMesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12), 0xf8fafc, { pos: [tx, 1.0, 1.8] }));
    root.add(makeMesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), 0x78350f, { pos: [tx, 0.55, 1.8] }));
  });

  await exportGLB(root, path.join(baseDir, 'structures/baratie_restaurant.glb'));
}

// 4. SAKURA MEDICAL CASTLE (Lâu Đài Y Khoa Drum Chopper)
async function buildSakuraMedicalCastle() {
  const root = new THREE.Group();
  root.name = 'SakuraMedicalCastle';

  // Drum Castle Base Tower
  root.add(makeMesh(new THREE.CylinderGeometry(3.6, 4.2, 4.8, 20), 0xf8fafc, { pos: [0, 2.4, 0] }));
  // Pink Pavilion Dome
  root.add(makeMesh(new THREE.ConeGeometry(4.2, 2.8, 16), 0xf472b6, { pos: [0, 5.8, 0] }));
  // Medical Red Cross Emblem
  root.add(makeMesh(new THREE.BoxGeometry(1.4, 0.38, 0.15), 0xef4444, { pos: [0, 7.6, 0] }));
  root.add(makeMesh(new THREE.BoxGeometry(0.38, 1.4, 0.15), 0xef4444, { pos: [0, 7.6, 0] }));

  // Arched pillared terrace
  for (let i = 0; i < 8; i++) {
    const rad = (i * Math.PI) / 4;
    root.add(makeMesh(new THREE.CylinderGeometry(0.14, 0.16, 2.8, 6), 0xcbd5e1, {
      pos: [Math.sin(rad) * 4.4, 1.4, Math.cos(rad) * 4.4],
    }));
  }

  await exportGLB(root, path.join(baseDir, 'structures/sakura_medical_castle.glb'));
}

// 5. OHARA ARCHIVE (Thư Viện Ohara & Đền Poneglyph Robin)
async function buildOharaArchive() {
  const root = new THREE.Group();
  root.name = 'OharaArchive';

  // Ancient mossy stone foundation
  root.add(makeMesh(new THREE.CylinderGeometry(5.2, 5.8, 0.8, 20), 0x475569, { pos: [0, 0.4, 0] }));
  // White marble circular observatory tower
  root.add(makeMesh(new THREE.CylinderGeometry(3.4, 3.8, 4.2, 20), 0xf8fafc, { pos: [0, 2.7, 0] }));
  // Glass celestial observatory dome
  root.add(makeMesh(new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 0x93c5fd, {
    pos: [0, 4.8, 0],
    transparent: true,
    opacity: 0.7,
  }));

  // Massive Poneglyph Cube
  const poneglyph = new THREE.Group();
  poneglyph.add(makeMesh(new THREE.BoxGeometry(1.8, 2.0, 1.8), 0x0f172a, { pos: [0, 1.0, 0] }));
  poneglyph.add(makeMesh(new THREE.PlaneGeometry(1.4, 1.6), 0xa855f7, {
    pos: [0, 1.0, 0.91],
    emissive: 0x7e22ce,
    emissiveIntensity: 0.9,
  }));
  poneglyph.position.set(-2.8, 0.4, 1.8);
  root.add(poneglyph);

  await exportGLB(root, path.join(baseDir, 'structures/ohara_library.glb'));
}

// =============================================================
// 4. ENVIRONMENT ASSETS (.GLB)
// =============================================================

// Tropical Palm Tree
async function buildPalmTree() {
  const root = new THREE.Group();
  root.name = 'TropicalPalm';

  // Curved segmented trunk
  root.add(makeMesh(new THREE.CylinderGeometry(0.2, 0.28, 2.0, 8), 0x854d0e, { pos: [0, 1.0, 0], rot: [0, 0, 0.08] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.15, 0.21, 1.8, 8), 0x713f12, { pos: [0.2, 2.7, 0], rot: [0, 0, 0.18] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), 0x582f0e, { pos: [0.5, 4.0, 0], rot: [0, 0, 0.28] }));

  // Coconuts
  root.add(makeMesh(new THREE.SphereGeometry(0.16, 8, 8), 0x3f2305, { pos: [0.65, 4.5, 0.1] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.15, 8, 8), 0x492403, { pos: [0.68, 4.5, -0.1] }));

  // 6 Palm Fronds
  for (let i = 0; i < 6; i++) {
    const rad = (i * Math.PI) / 3;
    const leaf = new THREE.Group();
    leaf.add(makeMesh(new THREE.BoxGeometry(2.2, 0.06, 0.65), i % 2 === 0 ? 0x15803d : 0x16a34a, { pos: [1.1, -0.22, 0] }));
    leaf.position.set(0.68, 4.65, 0);
    leaf.rotation.set(0.4, rad, -0.3);
    root.add(leaf);
  }

  await exportGLB(root, path.join(baseDir, 'environment/tropical_palm.glb'));
}

// Sakura Blossom Tree
async function buildSakuraTree() {
  const root = new THREE.Group();
  root.name = 'SakuraTree';

  // Weathered dark trunk
  root.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.35, 2.8, 8), 0x4a2511, { pos: [0, 1.4, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.14, 0.18, 1.6, 6), 0x4a2511, { pos: [0.5, 2.8, 0.2], rot: [0.4, 0.2, 0.6] }));
  root.add(makeMesh(new THREE.CylinderGeometry(0.13, 0.17, 1.5, 6), 0x4a2511, { pos: [-0.5, 2.6, -0.2], rot: [-0.3, 0.5, -0.6] }));

  // Pink Blossom Cloud Clusters
  root.add(makeMesh(new THREE.SphereGeometry(1.5, 10, 10), 0xf472b6, { pos: [0, 3.8, 0] }));
  root.add(makeMesh(new THREE.SphereGeometry(1.1, 8, 8), 0xfbcfe8, { pos: [0.9, 4.0, 0.4] }));
  root.add(makeMesh(new THREE.SphereGeometry(1.0, 8, 8), 0xec4899, { pos: [-0.8, 3.6, -0.4] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.9, 8, 8), 0xfbcfe8, { pos: [0.2, 4.6, -0.2] }));

  await exportGLB(root, path.join(baseDir, 'environment/sakura_tree.glb'));
}

// Bamboo Stalk
async function buildBambooStalk() {
  const root = new THREE.Group();
  root.name = 'BambooStalk';

  root.add(makeMesh(new THREE.CylinderGeometry(0.08, 0.1, 5.0, 6), 0x22c55e, { pos: [0, 2.5, 0] }));
  // Joint rings
  [-1.5, 0, 1.5].forEach((y) => {
    root.add(makeMesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 6), 0x15803d, { pos: [0, 2.5 + y, 0] }));
  });
  // Leaf sprigs
  root.add(makeMesh(new THREE.BoxGeometry(0.7, 0.02, 0.18), 0x4ade80, { pos: [0.25, 4.5, 0], rot: [0.3, 0, 0.5] }));
  root.add(makeMesh(new THREE.BoxGeometry(0.65, 0.02, 0.16), 0x22c55e, { pos: [-0.25, 4.8, 0.05], rot: [-0.2, 0.4, -0.5] }));

  await exportGLB(root, path.join(baseDir, 'environment/bamboo_stalk.glb'));
}

// Mossy Rock
async function buildMossyRock() {
  const root = new THREE.Group();
  root.name = 'MossyRock';

  root.add(makeMesh(new THREE.DodecahedronGeometry(1.5, 1), 0x475569, { pos: [0, 1.0, 0], roughness: 0.9 }));
  root.add(makeMesh(new THREE.SphereGeometry(1.2, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), 0x15803d, { pos: [0, 1.4, 0] }));

  await exportGLB(root, path.join(baseDir, 'environment/mossy_rock.glb'));
}

// Tangerine Observatory (Đài Thiên Văn & Biệt Thự Nami)
async function buildTangerineObservatory() {
  const root = new THREE.Group();
  root.name = 'TangerineObservatory';
  root.add(makeMesh(new THREE.CylinderGeometry(4.2, 4.8, 1.2, 20), 0xfef3c7, { pos: [0, 0.6, 0] }));
  root.add(makeMesh(new THREE.CylinderGeometry(3.2, 3.6, 3.8, 20), 0xf8fafc, { pos: [0, 3.1, 0] }));
  root.add(makeMesh(new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 0xfde047, {
    pos: [0, 5.0, 0],
    metalness: 0.8,
    roughness: 0.2,
  }));
  // Brass anemometer / weather vanes
  root.add(makeMesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), 0xb45309, { pos: [0, 7.5, 0], metalness: 0.9 }));
  await exportGLB(root, path.join(baseDir, 'structures/tangerine_observatory.glb'));
}

// Sniper Fortress (Pháo Đài Bắn Tỉa Usopp)
async function buildSniperFortress() {
  const root = new THREE.Group();
  root.name = 'SniperFortress';
  // 4 heavy timber stilt legs
  [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([lx, lz]) => {
    root.add(makeMesh(new THREE.CylinderGeometry(0.2, 0.28, 9.5, 6), 0x582f0e, { pos: [lx, 4.75, lz] }));
  });
  // Observation platform
  root.add(makeMesh(new THREE.BoxGeometry(4.8, 0.35, 4.8), 0x78350f, { pos: [0, 9.5, 0] }));
  // Thatched roof
  root.add(makeMesh(new THREE.ConeGeometry(3.8, 2.2, 4), 0x854d0e, { pos: [0, 12.2, 0] }));
  await exportGLB(root, path.join(baseDir, 'structures/sniper_fortress.glb'));
}

// Dock 1 Workshop (Siêu Xưởng Cơ Khí Dock 1 Franky)
async function buildDock1Workshop() {
  const root = new THREE.Group();
  root.name = 'Dock1Workshop';
  root.add(makeMesh(new THREE.BoxGeometry(11.0, 0.8, 9.0), 0x18181b, { pos: [0, 0.4, 0] }));
  root.add(makeMesh(new THREE.BoxGeometry(7.5, 4.8, 6.5), 0x27272a, { pos: [-1.2, 3.2, 0] }));
  root.add(makeMesh(new THREE.BoxGeometry(8.2, 0.35, 7.2), 0xdc2626, { pos: [-1.2, 5.7, 0] }));
  // Industrial crane arm
  root.add(makeMesh(new THREE.CylinderGeometry(0.25, 0.35, 6.5, 6), 0xf59e0b, { pos: [3.8, 4.0, 2.5], rot: [0, 0, -0.4] }));
  await exportGLB(root, path.join(baseDir, 'structures/dock1_workshop.glb'));
}

// Ice Theater (Nhà Hát Nhạc Kịch Băng Giá Brook)
async function buildIceTheater() {
  const root = new THREE.Group();
  root.name = 'IceTheater';
  root.add(makeMesh(new THREE.CylinderGeometry(6.2, 6.8, 0.5, 24), 0xa5f3fc, {
    pos: [0, 0.25, 0],
    emissive: 0x06b6d4,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.85,
  }));
  // Glowing ice crystals around shell amphitheater
  for (let i = 0; i < 10; i++) {
    const rad = (i * Math.PI) / 5 - Math.PI / 2;
    root.add(makeMesh(new THREE.ConeGeometry(0.45, 2.4, 5), 0xcffafe, {
      pos: [Math.sin(rad) * 5.6, 1.2, Math.cos(rad) * 5.6],
      rot: [0.2, rad, 0.2],
      emissive: 0x0891b2,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.9,
    }));
  }
  await exportGLB(root, path.join(baseDir, 'structures/ice_theater.glb'));
}

// Coral Palace (Cung Điện San Hô Jinbe)
async function buildCoralPalace() {
  const root = new THREE.Group();
  root.name = 'CoralPalace';
  root.add(makeMesh(new THREE.BoxGeometry(10.5, 0.5, 6.5), 0x78350f, { pos: [0, 0.25, 0] }));
  // Giant pink/cyan coral arch
  root.add(makeMesh(new THREE.TorusGeometry(3.5, 0.35, 8, 24, Math.PI), 0xf43f5e, { pos: [0, 2.5, -2.0] }));
  // Twin water beacon spouts
  [-3.5, 3.5].forEach((bx) => {
    root.add(makeMesh(new THREE.CylinderGeometry(0.5, 0.3, 4.5, 12, 1, true), 0x38bdf8, {
      pos: [bx, 2.25, 1.5],
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
    }));
  });
  await exportGLB(root, path.join(baseDir, 'structures/coral_palace.glb'));
}

// Tangerine Tree
async function buildTangerineTree() {
  const root = new THREE.Group();
  root.name = 'TangerineTree';
  root.add(makeMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 8), 0x78350f, { pos: [0, 0.9, 0] }));
  root.add(makeMesh(new THREE.SphereGeometry(1.2, 10, 10), 0x16a34a, { pos: [0, 2.1, 0] }));
  root.add(makeMesh(new THREE.SphereGeometry(0.85, 8, 8), 0x22c55e, { pos: [0.35, 2.6, 0.2] }));
  // Oranges
  [[-0.5, 2.0, 0.7], [0.6, 2.2, 0.6], [0.2, 2.4, -0.7], [-0.6, 1.8, -0.5], [0.7, 1.9, -0.4]].forEach(([tx, ty, tz]) => {
    root.add(makeMesh(new THREE.SphereGeometry(0.14, 8, 8), 0xea580c, { pos: [tx, ty, tz], metalness: 0.2 }));
  });
  await exportGLB(root, path.join(baseDir, 'environment/tangerine_tree.glb'));
}

// Grass Patch
async function buildGrassPatch() {
  const root = new THREE.Group();
  root.name = 'GrassPatch';
  for (let i = 0; i < 8; i++) {
    const rad = (i * Math.PI) / 4;
    root.add(makeMesh(new THREE.ConeGeometry(0.08, 0.6, 4), 0x65a30d, {
      pos: [Math.sin(rad) * 0.25, 0.3, Math.cos(rad) * 0.25],
      rot: [0.2, rad, 0.2],
    }));
  }
  await exportGLB(root, path.join(baseDir, 'environment/grass_patch.glb'));
}

// RUN ALL GENERATORS
async function main() {
  console.log('--- GENERATING COMPREHENSIVE ONE PIECE 3D GLB MODELS ---');
  await buildZoro();
  await buildNami();
  await buildUsopp();
  await buildSanji();
  await buildChopper();
  await buildRobin();
  await buildBrook();
  await buildJinbe();
  await buildThousandSunny();
  await buildSunGodShrine();
  await buildWanoDojo();
  await buildBaratieRestaurant();
  await buildSakuraMedicalCastle();
  await buildOharaArchive();
  await buildTangerineObservatory();
  await buildSniperFortress();
  await buildDock1Workshop();
  await buildIceTheater();
  await buildCoralPalace();
  await buildPalmTree();
  await buildSakuraTree();
  await buildTangerineTree();
  await buildBambooStalk();
  await buildMossyRock();
  await buildGrassPatch();
  console.log('✅ ALL ONE PIECE 3D GLB MODELS SUCCESSFULLY GENERATED!');
}

main().catch(console.error);

