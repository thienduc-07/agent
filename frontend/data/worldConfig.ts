export const WORLD_CONFIG = {
  islandName: "Grand Line — Straw Hat Crew Living World",
  regionLore: "Mega Multi-Level Anime Island & Sunny Shipyard",
  tacticalCamera: {
    position: [0, 24, 38] as [number, number, number],
    target: [0, 3.5, 0] as [number, number, number],
    fov: 44,
    minDistance: 10,
    maxDistance: 80,
    maxPolarAngle: Math.PI / 2 - 0.08, // Prevent going under ocean
  },
  environment: {
    fogColor: "#7dd3fc", // Bright anime daytime horizon
    fogNear: 120,
    fogFar: 450,
    oceanSize: 800,
    islandRadius: 26.0,
    sunPosition: [50, 45, 30] as [number, number, number],
    sunLight: {
      position: [50, 45, 30] as [number, number, number],
      color: "#fff7ed", // Warm golden tropical sunlight
      intensity: 3.8,
    },
    skyLight: {
      skyColor: "#38bdf8", // Vibrant Anime blue sky
      groundColor: "#4d7c0f", // Lush tropical foliage bounce
      intensity: 1.4,
    },
    ambientLight: {
      color: "#e0f2fe",
      intensity: 0.9,
    },
  },
};

export const ISLAND_CAMERA_BOOKMARKS = [
  {
    id: "all-island",
    label: "Toàn Đảo",
    icon: "Compass",
    cameraPosition: [0, 30, 48] as [number, number, number],
    targetPosition: [0, 3, 2] as [number, number, number],
  },
  {
    id: "command-peak",
    label: "Đài Luffy (Gear 5)",
    icon: "Crown",
    cameraPosition: [3, 12, 18] as [number, number, number],
    targetPosition: [2, 6, 2] as [number, number, number],
  },
  {
    id: "thousand-sunny",
    label: "Tàu Sunny & Cầu Cảng",
    icon: "Ship",
    cameraPosition: [-32, 11, 34] as [number, number, number],
    targetPosition: [-20, 2, 18] as [number, number, number],
  },
  {
    id: "sakura-clinic",
    label: "Đồi Anh Đào (Chopper)",
    icon: "HeartPulse",
    cameraPosition: [-16, 9.5, 9] as [number, number, number],
    targetPosition: [-12.5, 4.4, -1.0] as [number, number, number],
  },
  {
    id: "village-kitchen",
    label: "Làng & Bếp (Sanji & Jinbe)",
    icon: "Utensils",
    cameraPosition: [-22, 10, 18] as [number, number, number],
    targetPosition: [-10, 2.5, 5] as [number, number, number],
  },
  {
    id: "bamboo-cliff",
    label: "Vách Đá Kiếm Đạo (Zoro & Brook)",
    icon: "Swords",
    cameraPosition: [8, 10, 24] as [number, number, number],
    targetPosition: [3, 4, 10] as [number, number, number],
  },
  {
    id: "shipyard-grove",
    label: "Gờ Xưởng & Vườn Quýt (Franky & Nami)",
    icon: "Wrench",
    cameraPosition: [24, 14, 10] as [number, number, number],
    targetPosition: [11, 5, -3] as [number, number, number],
  },
  {
    id: "robin-sanctuary",
    label: "Thư Viện Hoa (Robin & Usopp)",
    icon: "BookOpen",
    cameraPosition: [28, 12, 12] as [number, number, number],
    targetPosition: [16, 3, -2] as [number, number, number],
  },
];
