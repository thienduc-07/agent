import * as THREE from "three";

let cachedGradientMap: THREE.DataTexture | null = null;

export function getAnimeGradientMap(): THREE.DataTexture {
  if (cachedGradientMap) return cachedGradientMap;

  // 3-step anime lighting ramp: Dark Shadow (65) -> Midtone (160) -> Highlight (255)
  const format = THREE.RedFormat;
  const colors = new Uint8Array([65, 160, 255]);
  const texture = new THREE.DataTexture(colors, 3, 1, format);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  cachedGradientMap = texture;
  return texture;
}

export function applyAnimeCelShading(root: THREE.Object3D, options: { emissiveBoost?: number } = {}) {
  const gradientMap = getAnimeGradientMap();

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const newMats = mats.map((mat) => {
          if (mat instanceof THREE.MeshToonMaterial) {
            mat.gradientMap = gradientMap;
            return mat;
          }

          const baseColor = (mat as any).color ? (mat as any).color.clone() : new THREE.Color(0xffffff);
          const map = (mat as any).map || null;
          const emissive = (mat as any).emissive ? (mat as any).emissive.clone() : new THREE.Color(0x000000);
          const emissiveIntensity = (mat as any).emissiveIntensity || 0;
          const transparent = (mat as any).transparent || false;
          const opacity = (mat as any).opacity !== undefined ? (mat as any).opacity : 1;

          return new THREE.MeshToonMaterial({
            color: baseColor,
            map: map,
            gradientMap: gradientMap,
            emissive: emissive,
            emissiveIntensity: emissiveIntensity * (options.emissiveBoost || 1),
            transparent: transparent,
            opacity: opacity,
            side: (mat as any).side || THREE.FrontSide,
          });
        });

        mesh.material = newMats.length === 1 ? newMats[0] : newMats;
      }
    }
  });
}
