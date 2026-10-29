/**
 * Living World Navigation Graph & Pathfinding for Straw Hat Crew on Grand Line Island (5x Mega Scale)
 */

export interface NavNode {
  id: string;
  position: [number, number, number];
  neighbors: string[];
}

// 7-Tier Island 5x Waypoint Graph
export const ISLAND_NAV_GRAPH: Record<string, NavNode> = {
  // Tier 1: Harbor
  harbor_dock: {
    id: "harbor_dock",
    position: [-26, 0.9, 18],
    neighbors: ["harbor_pier", "shipyard_path"],
  },
  harbor_pier: {
    id: "harbor_pier",
    position: [-20, 1.0, 17],
    neighbors: ["harbor_dock", "village_lower_stair"],
  },

  // Tier 2: Sunny Shipyard
  shipyard_path: {
    id: "shipyard_path",
    position: [-25, 1.0, 2],
    neighbors: ["harbor_dock", "shipyard_deck"],
  },
  shipyard_deck: {
    id: "shipyard_deck",
    position: [-25, 1.2, -12],
    neighbors: ["shipyard_path", "workshop_lower"],
  },

  // Tier 3: Village & Galley
  village_lower_stair: {
    id: "village_lower_stair",
    position: [-14, 1.6, 16],
    neighbors: ["harbor_pier", "village_plaza"],
  },
  village_plaza: {
    id: "village_plaza",
    position: [-6, 2.3, 16],
    neighbors: ["village_lower_stair", "village_kitchen", "summit_lower_stair", "workshop_lower"],
  },
  village_kitchen: {
    id: "village_kitchen",
    position: [-8, 2.3, 14],
    neighbors: ["village_plaza"],
  },

  // Tier 4: Workshop Ridge
  workshop_lower: {
    id: "workshop_lower",
    position: [-10, 2.8, -6],
    neighbors: ["village_plaza", "shipyard_deck", "workshop_bench"],
  },
  workshop_bench: {
    id: "workshop_bench",
    position: [-14, 4.2, -18],
    neighbors: ["workshop_lower", "summit_west_ramp"],
  },

  // Tier 6: Captain's Command Summit
  summit_west_ramp: {
    id: "summit_west_ramp",
    position: [-8, 5.5, -8],
    neighbors: ["workshop_bench", "summit_center"],
  },
  summit_lower_stair: {
    id: "summit_lower_stair",
    position: [-3, 4.8, 8],
    neighbors: ["village_plaza", "summit_center"],
  },
  summit_center: {
    id: "summit_center",
    position: [0.0, 7.4, 0.0],
    neighbors: ["summit_west_ramp", "summit_lower_stair", "summit_east_stair", "summit_cliffs_stair"],
  },

  // Tier 5: Robin's Library & Chopper's Clinic
  summit_east_stair: {
    id: "summit_east_stair",
    position: [12, 6.2, -5],
    neighbors: ["summit_center", "library_promontory"],
  },
  library_promontory: {
    id: "library_promontory",
    position: [24, 5.4, -10],
    neighbors: ["summit_east_stair", "clinic_station"],
  },
  clinic_station: {
    id: "clinic_station",
    position: [22, 5.4, -8],
    neighbors: ["library_promontory"],
  },

  // Tier 7: Lookout Cliffs
  summit_cliffs_stair: {
    id: "summit_cliffs_stair",
    position: [11, 6.5, 9],
    neighbors: ["summit_center", "lookout_training"],
  },
  lookout_training: {
    id: "lookout_training",
    position: [22, 6.0, 18],
    neighbors: ["summit_cliffs_stair"],
  },
};

/**
 * Breadth-First Search (BFS) to compute shortest path along the 7-tier island graph
 */
export function findPath(startNodeId: string, targetNodeId: string): [number, number, number][] {
  if (!ISLAND_NAV_GRAPH[startNodeId] || !ISLAND_NAV_GRAPH[targetNodeId]) {
    return [];
  }
  if (startNodeId === targetNodeId) {
    return [ISLAND_NAV_GRAPH[targetNodeId].position];
  }

  const queue: string[][] = [[startNodeId]];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const currentNodeId = currentPath[currentPath.length - 1];

    if (currentNodeId === targetNodeId) {
      return currentPath.map((id) => ISLAND_NAV_GRAPH[id].position);
    }

    const neighbors = ISLAND_NAV_GRAPH[currentNodeId]?.neighbors || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...currentPath, neighborId]);
      }
    }
  }

  return [ISLAND_NAV_GRAPH[targetNodeId].position];
}

/**
 * Returns closest nav node ID for any 3D coordinate
 */
export function getClosestNavNode(position: [number, number, number]): string {
  let closestId = "summit_center";
  let minDistanceSq = Infinity;

  for (const [nodeId, node] of Object.entries(ISLAND_NAV_GRAPH)) {
    const dx = node.position[0] - position[0];
    const dy = node.position[1] - position[1];
    const dz = node.position[2] - position[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestId = nodeId;
    }
  }

  return closestId;
}
