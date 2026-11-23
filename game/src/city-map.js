import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  BLOCK_SIZE,
  ROAD_WIDTH,
  COAST_X,
  BEACH_WIDTH,
  DISTRICTS,
  LANDMARKS
} from './config.js';

export function createCityMap() {
  const verticalRoads = [];
  const horizontalRoads = [];
  const intersections = [];

  for (let x = 256; x <= 2496; x += BLOCK_SIZE) {
    verticalRoads.push(x);
  }
  // Coastal Ocean Drive boulevard
  verticalRoads.push(2720);

  for (let y = 256; y <= 3136; y += BLOCK_SIZE) {
    horizontalRoads.push(y);
  }

  for (const rx of verticalRoads) {
    for (const ry of horizontalRoads) {
      intersections.push({ x: rx, y: ry });
    }
  }

  const buildings = [];
  const palmTrees = [];
  const streetlights = [];
  const yachts = [];
  const beachProps = [];

  const accentPalette = ['#d67367', '#5eb3aa', '#d8b06c', '#7c9eb2', '#c88b6d', '#6fa696'];
  const landmarkSigns = {
    '6_4': { text: 'HOTEL SOLARIS', neon: '#d67367', trim: '#5eb3aa', height: 155 },
    '6_5': { text: 'FLAMINGO RESORT', neon: '#5eb3aa', trim: '#d8b06c', height: 145 },
    '6_6': { text: 'PALM BEACH CLUB', neon: '#d8b06c', trim: '#5eb3aa', height: 135 },
    '4_4': { text: 'CLUB ECLIPSE', neon: '#d67367', trim: '#d8b06c', height: 170 },
    '4_5': { text: 'PALM CASINO', neon: '#5eb3aa', trim: '#d67367', height: 185 },
    '3_4': { text: 'VICE ARMORY', neon: '#d8b06c', trim: '#7c9eb2', height: 130 },
    '5_4': { text: "PAY 'N' SPRAY", neon: '#5eb3aa', trim: '#d8b06c', height: 95 },
    '2_1': { text: 'VICE PLAZA TOWER', neon: '#7c9eb2', trim: '#d8b06c', height: 245 },
    '3_1': { text: 'SOLARIS RESERVE', neon: '#d8b06c', trim: '#5eb3aa', height: 230 },
    '4_1': { text: 'HORIZON CORP', neon: '#d67367', trim: '#7c9eb2', height: 215 },
    '6_1': { text: 'STARFISH VILLA', neon: '#5eb3aa', trim: '#d8b06c', height: 105 }
  };

  let bId = 1;
  for (let ix = 0; ix < verticalRoads.length - 1; ix++) {
    const leftRoad = verticalRoads[ix];
    const rightRoad = verticalRoads[ix + 1];
    const blockLeft = leftRoad + ROAD_WIDTH * 0.5 + 18;
    const blockRight = rightRoad - ROAD_WIDTH * 0.5 - 18;
    const availW = blockRight - blockLeft;
    if (availW < 70) continue;

    for (let iy = 0; iy < horizontalRoads.length - 1; iy++) {
      const topRoad = horizontalRoads[iy];
      const botRoad = horizontalRoads[iy + 1];
      const blockTop = topRoad + ROAD_WIDTH * 0.5 + 18;
      const blockBot = botRoad - ROAD_WIDTH * 0.5 - 18;
      const availH = blockBot - blockTop;
      if (availH < 70) continue;

      const key = `${ix}_${iy}`;
      const landmark = landmarkSigns[key];

      // Determine district architectural style
      const centerX = (blockLeft + blockRight) * 0.5;
      const centerY = (blockTop + blockBot) * 0.5;
      let styleIndex = 0; // Art-Deco Resort
      let baseHeight = 105;

      if (centerY < 1180 && centerX < 2050) {
        styleIndex = 1; // Downtown Glass Skyscraper
        baseHeight = 175 + ((ix * 37 + iy * 53) % 75);
      } else if (centerX >= 1150 && centerX < 2050 && centerY >= 1180) {
        styleIndex = 2; // Neon Strip Casino
        baseHeight = 135 + ((ix * 29 + iy * 41) % 60);
      } else if (centerX < 1150 && centerY >= 1180) {
        styleIndex = 3; // Harbor Warehouse
        baseHeight = 78 + ((ix * 19 + iy * 23) % 40);
      } else {
        styleIndex = 0; // Ocean Drive / Marina Art-Deco Hotel
        baseHeight = 115 + ((ix * 31 + iy * 47) % 55);
      }

      // Split large city blocks into 2 buildings or 1 signature tower with courtyard plaza
      if (landmark || availW < 155) {
        const neonColor = landmark
          ? landmark.neon
          : accentPalette[(ix * 5 + iy * 3) % accentPalette.length];
        buildings.push({
          id: `b_${bId++}`,
          x: blockLeft + 6,
          y: blockTop + 6,
          w: availW - 12,
          h: availH - 12,
          height3D: landmark ? landmark.height : baseHeight,
          styleIndex,
          variant: (ix * 3 + iy * 7) % 3,
          neonColor,
          trimColor: landmark ? landmark.trim : '#5eb3aa',
          signText: landmark ? landmark.text : null
        });
      } else {
        const halfH = (availH - 22) * 0.5;
        for (let sub = 0; sub < 2; sub++) {
          const neonColor = accentPalette[(ix * 7 + iy * 3 + sub) % accentPalette.length];
          buildings.push({
            id: `b_${bId++}`,
            x: blockLeft + 6,
            y: blockTop + 6 + sub * (halfH + 10),
            w: availW - 12,
            h: halfH,
            height3D: baseHeight + (sub === 0 ? 18 : -12),
            styleIndex,
            variant: (ix * 5 + iy * 2 + sub) % 3,
            neonColor,
            trimColor: '#5eb3aa',
            signText: null
          });
        }
      }

      // Corner palm trees & streetlights around each block
      palmTrees.push(
        {
          x: blockLeft - 6,
          y: blockTop - 6,
          scale: 0.92 + ((ix + iy) % 3) * 0.12,
          leanAngle: ((ix * 1.7 + iy) % 6.28)
        },
        {
          x: blockRight + 6,
          y: blockBot + 6,
          scale: 0.95 + ((ix * 2 + iy) % 3) * 0.12,
          leanAngle: ((ix + iy * 2.1) % 6.28)
        }
      );

      streetlights.push({
        x: blockRight + 8,
        y: blockTop - 8,
        color: '#e8c488'
      });
    }
  }

  // Dense row of signature curved 3D Palm Trees along Ocean Drive & Solaris Beach Boardwalk
  for (let y = 260; y <= 3320; y += 64) {
    palmTrees.push({
      x: COAST_X - 8,
      y,
      scale: 1.06 + ((y * 13) % 5) * 0.06,
      leanAngle: (y * 0.04) % (Math.PI * 2)
    });
    palmTrees.push({
      x: COAST_X + 46,
      y: y + 28,
      scale: 0.98 + ((y * 7) % 4) * 0.07,
      leanAngle: ((y + 90) * 0.05) % (Math.PI * 2)
    });
  }

  // Coastal Solaris Beach umbrellas and lifeguard stations
  const umbrellaColors = ['#b85e54', '#467e88', '#c89b55', '#5a8376'];
  for (let y = 480; y <= 3100; y += 115) {
    beachProps.push({
      kind: 'umbrella',
      x: COAST_X + 95 + ((y * 17) % 48),
      y,
      color: umbrellaColors[Math.floor(y / 115) % umbrellaColors.length],
      tilt: ((y % 7) - 3) * 0.03
    });
    beachProps.push({
      kind: 'umbrella',
      x: COAST_X + 138 + ((y * 11) % 32),
      y: y + 48,
      color: umbrellaColors[(Math.floor(y / 115) + 2) % umbrellaColors.length],
      tilt: ((y % 5) - 2) * 0.03
    });
  }
  for (const ly of [760, 1460, 1940, 2560]) {
    beachProps.push({
      kind: 'lifeguard',
      x: COAST_X + 124,
      y: ly,
      color: '#6ca2a8'
    });
  }

  // Luxury 3D Superyachts anchored in Starfish Bay Marina & Ocean Drive waters
  yachts.push(
    { id: 'yacht_1', x: 3068, y: 745, angle: 0.24, trimColor: '#2c6e80' },
    { id: 'yacht_2', x: 3165, y: 920, angle: -0.1, trimColor: '#9c3e4b' },
    { id: 'yacht_3', x: 3150, y: 1620, angle: 0.42, trimColor: '#b59257' },
    { id: 'yacht_4', x: 3220, y: 2140, angle: -0.25, trimColor: '#2c6e80' },
    { id: 'yacht_5', x: 3140, y: 2680, angle: 0.08, trimColor: '#4a6b65' }
  );

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    coastX: COAST_X,
    beachWidth: BEACH_WIDTH,
    verticalRoads,
    horizontalRoads,
    intersections,
    buildings,
    palmTrees,
    streetlights,
    yachts,
    beachProps,
    landmarks: LANDMARKS
  };
}

export function getDistrictAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.bounds.x1 && x <= d.bounds.x2 && y >= d.bounds.y1 && y <= d.bounds.y2) {
      return d;
    }
  }
  return DISTRICTS[0];
}

export function resolveCircleBuildingCollisions(entity, radius, buildings) {
  let hit = false;
  for (const b of buildings) {
    const closestX = Math.max(b.x, Math.min(entity.x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(entity.y, b.y + b.h));
    const dx = entity.x - closestX;
    const dy = entity.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = radius - dist;
      entity.x += (dx / dist) * overlap;
      entity.y += (dy / dist) * overlap;
      hit = true;
    }
  }
  // Keep out of deep ocean water
  const maxLandX = COAST_X + BEACH_WIDTH - 24;
  if (entity.x > maxLandX) {
    entity.x = maxLandX;
    hit = true;
  }
  entity.x = Math.max(80, Math.min(maxLandX, entity.x));
  entity.y = Math.max(80, Math.min(WORLD_HEIGHT - 80, entity.y));
  return hit;
}

export function pointInBuilding(x, y, buildings, padding = 4) {
  for (const b of buildings) {
    if (
      x >= b.x - padding &&
      x <= b.x + b.w + padding &&
      y >= b.y - padding &&
      y <= b.y + b.h + padding
    ) {
      return b;
    }
  }
  return null;
}
