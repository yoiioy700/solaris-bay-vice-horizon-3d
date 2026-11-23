import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  BLOCK_SIZE,
  ROAD_WIDTH,
  COAST_X,
  BEACH_WIDTH,
  ISLAND_X1,
  ISLAND_X2,
  ISLAND_Y1,
  ISLAND_Y2,
  CAUSEWAY_YS,
  DISTRICTS,
  LANDMARKS
} from './config.js';
import { createCityShops } from './shops-economy.js';
import { CLUB_ECLIPSE_BOUNDS } from './nightlife-romance.js';

/**
 * Splits a solid building AABB into exact non-overlapping collision boxes around
 * any ground-floor walk-in / drive-in shop interiors carved into its East or West facade.
 */
function buildCarvedCollidersForBuilding(b, walkInShops) {
  if (!walkInShops || walkInShops.length === 0) {
    return [{ x: b.x, y: b.y, w: b.w, h: b.h }];
  }

  const out = [];
  const first = walkInShops[0].interior;
  const opensEast = first.dir > 0;
  const maxDepth = Math.max(...walkInShops.map((s) => s.interior.depth));
  const splitX = opensEast ? b.x + b.w - maxDepth : b.x + maxDepth;

  // 1. Solid back structural core behind the ground-floor shop bay(s)
  if (opensEast) {
    const backW = Math.max(10, splitX - b.x);
    out.push({ x: b.x, y: b.y, w: backW, h: b.h });
  } else {
    const backW = Math.max(10, b.x + b.w - splitX);
    out.push({ x: splitX, y: b.y, w: backW, h: b.h });
  }

  // 2. Solid flanking walls between/around the carved bay(s) along the front strip
  const stripX = opensEast ? splitX : b.x;
  const stripW = maxDepth;
  const sorted = [...walkInShops].sort((a, c) => a.interior.y1 - c.interior.y1);
  let cursorY = b.y;
  for (const s of sorted) {
    const ib = s.interior;
    if (ib.y1 > cursorY + 2) {
      out.push({ x: stripX, y: cursorY, w: stripW, h: ib.y1 - cursorY });
    }
    // Thin interior counter collider near the back wall for non-garage walk-in stores
    if (s.kind !== 'garage') {
      const cx = ib.dir > 0 ? ib.x1 + 2 : ib.x2 - 11;
      out.push({ x: cx, y: ib.y1 + 6, w: 9, h: ib.y2 - ib.y1 - 12 });
    }
    cursorY = Math.max(cursorY, ib.y2);
  }
  if (b.y + b.h > cursorY + 2) {
    out.push({ x: stripX, y: cursorY, w: stripW, h: b.y + b.h - cursorY });
  }

  return out;
}

export function createCityMap() {
  const verticalRoads = [];
  const horizontalRoads = [];
  const intersections = [];

  for (let x = 256; x <= 2496; x += BLOCK_SIZE) {
    verticalRoads.push(x);
  }
  // Coastal Ocean Drive boulevard
  verticalRoads.push(2720);

  // Expanded ~2x South mainland road grid (15 horizontal avenues reaching Sunset Hills & Palm Harbor)
  for (let y = 256; y <= 4736; y += BLOCK_SIZE) {
    horizontalRoads.push(y);
  }

  // Starfish Island Offshore Road Network (connected via 2 Palm Causeway Bridges at y = 896 & 1856)
  const islandVerticalRoads = [3320, 3640, 3810];
  const islandHorizontalRoads = [576, 896, 1216, 1536, 1856];

  for (const rx of verticalRoads) {
    for (const ry of horizontalRoads) {
      intersections.push({ x: rx, y: ry });
    }
  }
  for (const rx of islandVerticalRoads) {
    for (const ry of islandHorizontalRoads) {
      intersections.push({ x: rx, y: ry });
    }
  }

  const buildings = [];
  const colliders = [];
  const palmTrees = [];
  const streetlights = [];
  const trafficLights = [];
  const cafePatios = [];
  const streetProps = [];
  const harborProps = [];
  const seatedSpots = [];
  const parkedBays = [];
  const yachts = [];
  const beachProps = [];
  const boardwalkRailings = [];
  const shops = createCityShops();

  const accentPalette = ['#d67367', '#5eb3aa', '#d8b06c', '#7c9eb2', '#c88b6d', '#6fa696'];
  const landmarkSigns = {
    '6_4': { text: 'HOTEL SOLARIS', neon: '#d67367', trim: '#5eb3aa', height: 155 },
    '6_5': { text: 'FLAMINGO RESORT', neon: '#5eb3aa', trim: '#d8b06c', height: 145 },
    '6_6': { text: 'PALM BEACH CLUB', neon: '#d8b06c', trim: '#5eb3aa', height: 135 },
    '4_5': { text: 'PALM CASINO', neon: '#5eb3aa', trim: '#d67367', height: 185 },
    '3_4': { text: 'VICE PLAZA ARCADE', neon: '#d8b06c', trim: '#7c9eb2', height: 130 },
    '5_4': { text: 'VICE ARMORY', neon: '#d8b06c', trim: '#7c9eb2', height: 148 },
    '6_4_bay': { text: 'PAY-N-SPRAY', neon: '#63c792', trim: '#d8b06c', height: 105 },
    '2_1': { text: 'VICE PLAZA TOWER', neon: '#7c9eb2', trim: '#d8b06c', height: 245 },
    '3_1': { text: 'SOLARIS RESERVE', neon: '#d8b06c', trim: '#5eb3aa', height: 230 },
    '4_1': { text: 'HORIZON CORP', neon: '#d67367', trim: '#7c9eb2', height: 215 },
    '6_1': { text: 'STARFISH VILLA', neon: '#5eb3aa', trim: '#d8b06c', height: 105 },
    '5_10': { text: 'SUNSET HILLS CLUB', neon: '#d89b60', trim: '#5eb3aa', height: 120 },
    '6_11': { text: 'BELVEDERE PALMS', neon: '#d67367', trim: '#d8b06c', height: 132 }
  };

  function nearAnyShop(x, y, minDist = 28) {
    for (const s of shops) {
      if (Math.hypot(x - s.x, y - s.y) < minDist) return true;
      if (s.interior) {
        const ib = s.interior;
        if (x >= ib.x1 - 12 && x <= ib.x2 + 12 && y >= ib.y1 - 8 && y <= ib.y2 + 8) {
          return true;
        }
      }
    }
    return false;
  }

  function findShopsCarvingBuilding(bx, by, bw, bh) {
    const matched = [];
    for (const s of shops) {
      if (!s.interior) continue;
      const ib = s.interior;
      const overlapX = ib.x2 > bx - 4 && ib.x1 < bx + bw + 4;
      const overlapY = ib.y2 > by - 4 && ib.y1 < by + bh + 4;
      if (overlapX && overlapY) matched.push(s);
    }
    return matched;
  }

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

      // Dedicated open-air enterable CLUB ECLIPSE 21+ DISCO & VIP PAVILION occupies block ix=4, iy=4!
      if (ix === 4 && iy === 4) {
        // Add only thin perimeter wall colliders on West, North & South — leaving East entrance wide open!
        const c = CLUB_ECLIPSE_BOUNDS;
        colliders.push(
          { x: c.x1 - 4, y: c.y1 - 4, w: 7, h: c.y2 - c.y1 + 8 }, // West DJ back wall
          { x: c.x1, y: c.y1 - 4, w: c.x2 - c.x1, h: 7 }, // North VIP back wall
          { x: c.x1, y: c.y2 - 3, w: c.x2 - c.x1, h: 7 }, // South Bar back wall
          // East facade wall segments flanking the grand 66u-wide red-carpet doorway (y = 1663..1729 open!)
          { x: c.x2 - 3, y: c.y1, w: 6, h: 55 },
          { x: c.x2 - 3, y: c.y2 - 55, w: 6, h: 55 }
        );
        palmTrees.push(
          { x: blockLeft - 6, y: blockTop - 6, scale: 1.05, leanAngle: 0.7 },
          { x: blockRight + 6, y: blockBot + 6, scale: 1.05, leanAngle: 2.8 }
        );
        continue;
      }

      // Dedicated Palm Harbor Docks container terminal & gantry crane yards in SW harbor blocks
      if (ix <= 2 && iy >= 8 && (ix + iy) % 2 === 0) {
        const cx = (blockLeft + blockRight) * 0.5;
        const cy = (blockTop + blockBot) * 0.5;
        harborProps.push({
          kind: 'container_yard',
          x: cx,
          y: cy,
          w: availW - 18,
          h: availH - 18,
          hasCrane: ix === 1 || iy === 9 || iy === 12
        });
        // Add crisp colliders around the container stacks so cars don't drive through steel containers
        colliders.push(
          { x: cx - 54, y: cy - 48, w: 42, h: 96 },
          { x: cx + 14, y: cy - 48, w: 42, h: 96 }
        );
        continue;
      }

      const key = `${ix}_${iy}`;
      const landmark = landmarkSigns[key];

      const centerX = (blockLeft + blockRight) * 0.5;
      const centerY = (blockTop + blockBot) * 0.5;
      let styleIndex = 0;
      let baseHeight = 105;

      if (centerY < 1180 && centerX < 2050) {
        styleIndex = 1; // Downtown Glass Skyscraper
        baseHeight = 175 + ((ix * 37 + iy * 53) % 75);
      } else if (centerX < 1150 && centerY >= 1180) {
        styleIndex = 3; // Harbor Warehouse / Port Solaris
        baseHeight = 76 + ((ix * 19 + iy * 23) % 38);
      } else if (centerY >= 3060 && centerX >= 1150) {
        styleIndex = 4; // Sunset Hills Mediterranean Luxury Villas & Coastal Estates
        baseHeight = 68 + ((ix * 23 + iy * 29) % 44);
      } else if (centerX >= 1150 && centerX < 2050 && centerY >= 1180) {
        styleIndex = 2; // Neon Strip Casino / Club Quarter
        baseHeight = 135 + ((ix * 29 + iy * 41) % 60);
      } else {
        styleIndex = 0; // Ocean Drive / Marina Art-Deco Hotel
        baseHeight = 115 + ((ix * 31 + iy * 47) % 55);
      }

      const retailNames = [
        'SOLARIS BAKERY',
        'BAYSIDE ESPRESSO',
        'COASTAL SURF CO.',
        'PALM PHARMACY',
        'VICE RECORDS',
        'MARINA GELATO',
        'SUNSET DINER',
        'CORAL BOUTIQUE'
      ];
      const hasGroundRetail = styleIndex !== 3;
      const retailLabel = hasGroundRetail
        ? retailNames[(ix * 5 + iy * 3) % retailNames.length]
        : null;

      const bx = blockLeft + 6;
      const by = blockTop + 6;
      const bw = availW - 12;
      const bh = availH - 12;
      const blockWalkIns = findShopsCarvingBuilding(bx, by, bw, bh);

      if (landmark || availW < 155 || blockWalkIns.length > 0) {
        const neonColor = landmark
          ? landmark.neon
          : accentPalette[(ix * 5 + iy * 3) % accentPalette.length];
        const bObj = {
          id: `b_${bId++}`,
          x: bx,
          y: by,
          w: bw,
          h: bh,
          height3D: landmark ? landmark.height : Math.max(96, baseHeight),
          styleIndex,
          variant: (ix * 3 + iy * 7) % 3,
          neonColor,
          trimColor: landmark ? landmark.trim : '#5eb3aa',
          signText: landmark ? landmark.text : null,
          retailLabel: landmark || blockWalkIns.length > 0 ? null : retailLabel,
          walkInShops: blockWalkIns
        };
        buildings.push(bObj);
        colliders.push(...buildCarvedCollidersForBuilding(bObj, blockWalkIns));
      } else {
        const halfH = (availH - 22) * 0.5;
        for (let sub = 0; sub < 2; sub++) {
          const neonColor = accentPalette[(ix * 7 + iy * 3 + sub) % accentPalette.length];
          const bObj = {
            id: `b_${bId++}`,
            x: bx,
            y: by + sub * (halfH + 10),
            w: bw,
            h: halfH,
            height3D: baseHeight + (sub === 0 ? 18 : -12),
            styleIndex,
            variant: (ix * 5 + iy * 2 + sub) % 3,
            neonColor,
            trimColor: '#5eb3aa',
            signText: null,
            retailLabel: sub === 0 ? retailLabel : null,
            walkInShops: []
          };
          buildings.push(bObj);
          colliders.push({ x: bObj.x, y: bObj.y, w: bObj.w, h: bObj.h });
        }
      }

      // Corner palm trees & streetlights around each block (sparsified slightly far south for 60 FPS)
      palmTrees.push(
        {
          x: blockLeft - 6,
          y: blockTop - 6,
          scale: 0.92 + ((ix + iy) % 3) * 0.12,
          leanAngle: (ix * 1.7 + iy) % 6.28
        },
        {
          x: blockRight + 6,
          y: blockBot + 6,
          scale: 0.95 + ((ix * 2 + iy) % 3) * 0.12,
          leanAngle: (ix + iy * 2.1) % 6.28
        }
      );

      streetlights.push({
        x: blockRight + 8,
        y: blockTop - 8,
        color: '#e8c488'
      });

      // Everyday urban micro-details on bustling districts (including Sunset Hills!)
      const isLivelyBlock = ix >= 2 && iy >= 0 && iy <= 12;
      if (isLivelyBlock) {
        const midY = (blockTop + blockBot) * 0.5;
        const rightCurbX = rightRoad - 51;
        const leftCurbX = leftRoad + 51;

        if ((ix + iy) % 2 === 0 && !nearAnyShop(rightCurbX, blockBot - 4, 24)) {
          streetProps.push({ kind: 'hydrant', x: rightCurbX, y: blockBot - 4, rot: 0 });
        }
        if (!nearAnyShop(leftCurbX, blockTop + 14, 24)) {
          streetProps.push({ kind: 'trashbin', x: leftCurbX, y: blockTop + 14, rot: 0 });
        }
        if ((ix + iy) % 2 === 1 && !nearAnyShop(rightCurbX - 1, blockTop + 16, 24)) {
          streetProps.push({
            kind: 'newsbox',
            x: rightCurbX - 1,
            y: blockTop + 16,
            rot: Math.PI * 0.5
          });
        }
        if (!nearAnyShop(rightRoad - 60, midY + 42, 32)) {
          streetProps.push({ kind: 'bench', x: rightRoad - 61, y: midY + 42, rot: 0 });
          if ((ix + iy) % 3 === 0 && iy <= 8) {
            seatedSpots.push({ x: rightRoad - 60.5, y: midY + 42, z: 0, angle: 0, kind: 'bench' });
          }
        }
        if (!nearAnyShop(leftRoad + 62, midY - 38, 30)) {
          streetProps.push({ kind: 'planter', x: leftRoad + 62, y: midY - 38, rot: 0 });
        }
        if ((ix * 3 + iy) % 3 === 0 && !nearAnyShop(blockLeft + 1, midY + 26, 30)) {
          streetProps.push({
            kind: 'vending',
            x: blockLeft + 1,
            y: midY + 26,
            rot: Math.PI,
            color: (ix + iy) % 2 === 0 ? '#4d8287' : '#b25b50'
          });
        }
        if ((ix === 2 || ix === 4 || ix === 6) && (iy === 1 || iy === 3 || iy === 5 || iy === 9)) {
          const bxStop = rightRoad - 58;
          const byStop = midY - 22;
          if (!nearAnyShop(bxStop, byStop, 36)) {
            streetProps.push({ kind: 'bus_stop', x: bxStop, y: byStop, rot: 0 });
          }
        }
      }
    }
  }

  // === STARFISH ISLAND LUXURY VILLAS & COASTAL ESTATES ===
  for (let ix = 0; ix < islandVerticalRoads.length - 1; ix++) {
    const leftR = islandVerticalRoads[ix];
    const rightR = islandVerticalRoads[ix + 1];
    const bLeft = leftR + ROAD_WIDTH * 0.5 + 18;
    const bRight = rightR - ROAD_WIDTH * 0.5 - 18;
    const aW = bRight - bLeft;
    if (aW < 55) continue;

    for (let iy = 0; iy < islandHorizontalRoads.length - 1; iy++) {
      const topR = islandHorizontalRoads[iy];
      const botR = islandHorizontalRoads[iy + 1];
      const bTop = topR + ROAD_WIDTH * 0.5 + 18;
      const bBot = botR - ROAD_WIDTH * 0.5 - 18;
      const aH = bBot - bTop;
      if (aH < 55) continue;

      const villa = {
        id: `b_${bId++}`,
        x: bLeft + 8,
        y: bTop + 8,
        w: aW - 16,
        h: aH - 16,
        height3D: 54 + ((ix * 17 + iy * 23) % 34),
        styleIndex: 4, // Coastal Luxury Villa
        variant: (ix + iy) % 3,
        neonColor: '#5eb3aa',
        trimColor: '#d8b06c',
        signText: ix === 0 && iy === 1 ? 'STARFISH ISLAND' : null,
        retailLabel: null,
        walkInShops: []
      };
      buildings.push(villa);
      colliders.push({ x: villa.x, y: villa.y, w: villa.w, h: villa.h });

      palmTrees.push(
        { x: bLeft - 4, y: bTop - 4, scale: 1.05, leanAngle: (ix + iy) * 1.1 },
        { x: bRight + 4, y: bBot + 4, scale: 1.02, leanAngle: (ix + iy) * 2.1 }
      );
    }
  }

  // Cantilevered Intersection Traffic Lights across active corridors (including Sunset Hills)
  const signalAvenuesX = [1216, 1536, 1856, 2176, 2496, 2720];
  const signalStreetsY = [576, 896, 1216, 1536, 1856, 2176, 2496, 2816, 3136, 3456, 3776, 4096];
  for (const rx of signalAvenuesX) {
    for (const ry of signalStreetsY) {
      trafficLights.push({
        x: rx - 52,
        y: ry + 52,
        rot: 0,
        phaseOffset: (rx + ry) * 0.003
      });
      if (rx < 2700) {
        trafficLights.push({
          x: rx + 52,
          y: ry - 52,
          rot: Math.PI,
          phaseOffset: (rx + ry) * 0.003 + Math.PI
        });
      }
    }
  }

  // Curated Sidewalk Café Patios (bistro tables, chairs, striped umbrellas & seated diners)
  const patioSpecs = [
    // Ocean Drive — Café del Mar outdoor terrace right outside the walk-in café (visible in Shot 1!)
    { x: 2659, y: 1944, umbrellaColor: '#467c82', hasPatrons: true, facing: 0 },
    { x: 2659, y: 1998, umbrellaColor: '#b55d53', hasPatrons: true, facing: 0 },
    { x: 2659, y: 2022, umbrellaColor: '#c89b55', hasPatrons: true, facing: 0 },
    { x: 2659, y: 2088, umbrellaColor: '#467c82', hasPatrons: true, facing: 0 },
    // Ocean Drive — North resort patio near Solaris Threads
    { x: 2659, y: 1744, umbrellaColor: '#b55d53', hasPatrons: true, facing: 0 },
    { x: 2659, y: 1776, umbrellaColor: '#5a8376', hasPatrons: true, facing: 0 },
    // Ocean Drive — Marina Promenade café near Safehouse
    { x: 2659, y: 780, umbrellaColor: '#467c82', hasPatrons: true, facing: 0 },
    { x: 2659, y: 816, umbrellaColor: '#c89b55', hasPatrons: true, facing: 0 },
    // Vice Neon Strip — outside Club Eclipse & Vice Armory (Shot 2!)
    { x: 1798, y: 1644, umbrellaColor: '#b55d53', hasPatrons: true, facing: 0 },
    { x: 1916, y: 1666, umbrellaColor: '#467c82', hasPatrons: true, facing: Math.PI },
    // Downtown Vice Plaza — Plaza Café patio (Shot 3!)
    { x: 1156, y: 774, umbrellaColor: '#c89b55', hasPatrons: true, facing: 0 },
    { x: 1156, y: 706, umbrellaColor: '#467c82', hasPatrons: true, facing: 0 },
    // Sunset Hills Boulevard café patio
    { x: 1914, y: 3566, umbrellaColor: '#b55d53', hasPatrons: true, facing: Math.PI },
    { x: 2659, y: 3610, umbrellaColor: '#c89b55', hasPatrons: true, facing: 0 }
  ];

  for (const p of patioSpecs) {
    cafePatios.push(p);
    if (p.hasPatrons) {
      seatedSpots.push({ x: p.x, y: p.y - 4.6, z: 0, angle: Math.PI * 0.5, kind: 'cafe' });
      if (Math.round(p.y) % 2 === 0) {
        seatedSpots.push({ x: p.x, y: p.y + 4.6, z: 0, angle: -Math.PI * 0.5, kind: 'cafe' });
      }
    }
  }

  // Targeted Hero Street Micro-Details
  streetProps.push(
    // Ocean Drive (Shot 1)
    { kind: 'hydrant', x: 2669, y: 2076, rot: 0 },
    { kind: 'trashbin', x: 2668, y: 2032, rot: 0 },
    { kind: 'planter', x: 2657, y: 2032, rot: 0 },
    { kind: 'planter', x: 2657, y: 1924, rot: 0 },
    { kind: 'newsbox', x: 2668, y: 1928, rot: 0 },
    { kind: 'bench', x: 2768, y: 2040, z: 0.58, rot: Math.PI },
    { kind: 'bench', x: 2768, y: 1955, z: 0.58, rot: Math.PI },
    { kind: 'trashbin', x: 2770, y: 2010, z: 0.58, rot: 0 },

    // Vice Neon Strip & Club Eclipse (Shot 2)
    { kind: 'hydrant', x: 1805, y: 1788, rot: 0 },
    { kind: 'trashbin', x: 1805, y: 1742, rot: 0 },
    { kind: 'vending', x: 1923, y: 1694, rot: Math.PI, color: '#4d8287' },
    { kind: 'newsbox', x: 1908, y: 1776, rot: Math.PI },
    { kind: 'trashbin', x: 1908, y: 1764, rot: 0 },
    { kind: 'bollard', x: 1910, y: 1756, rot: 0 },
    { kind: 'bollard', x: 1910, y: 1716, rot: 0 },
    { kind: 'planter', x: 1920, y: 1778, rot: 0 },

    // Downtown Vice Plaza (Shot 3)
    { kind: 'bus_stop', x: 1158, y: 742, rot: 0 },
    { kind: 'planter', x: 1156, y: 844, rot: 0 },
    { kind: 'hydrant', x: 1165, y: 836, rot: 0 },
    { kind: 'trashbin', x: 1165, y: 794, rot: 0 },
    { kind: 'vending', x: 1283, y: 742, rot: Math.PI, color: '#b25b50' },
    { kind: 'newsbox', x: 1268, y: 822, rot: Math.PI },
    { kind: 'planter', x: 1278, y: 836, rot: 0 },

    // Starfish Bay Marina Boardwalk (Shot 4)
    { kind: 'bench', x: 2766, y: 756, z: 0.58, rot: Math.PI },
    { kind: 'bench', x: 2766, y: 848, z: 0.58, rot: Math.PI },
    { kind: 'planter', x: 2764, y: 828, z: 0.58, rot: 0 },
    { kind: 'trashbin', x: 2769, y: 778, z: 0.58, rot: 0 },
    { kind: 'hydrant', x: 2669, y: 842, rot: 0 }
  );

  // Deduplicate nearby street props of the same kind
  const dedupedStreetProps = [];
  for (const p of streetProps) {
    const tooClose = dedupedStreetProps.some(
      (q) => q.kind === p.kind && Math.hypot(q.x - p.x, q.y - p.y) < 16
    );
    if (!tooClose) dedupedStreetProps.push(p);
  }
  streetProps.length = 0;
  streetProps.push(...dedupedStreetProps);

  // Seated locals on Marina & Ocean Drive boardwalk benches
  seatedSpots.push(
    { x: 2764.8, y: 756, z: 0.58, angle: Math.PI, kind: 'bench' },
    { x: 2764.8, y: 848, z: 0.58, angle: Math.PI, kind: 'bench' },
    { x: 2766.8, y: 2040, z: 0.58, angle: Math.PI, kind: 'bench' },
    { x: 2766.8, y: 1955, z: 0.58, angle: Math.PI, kind: 'bench' }
  );

  // Neatly designated curbside parking bays (strictly outside active traffic lanes, shop fronts & intersections)
  parkedBays.push(
    // Ocean Drive West curb
    { x: 2681, y: 1898, angle: Math.PI * 0.5, typeId: 'eclipse_sedan', color: '#4d6173' },
    { x: 2681, y: 1756, angle: Math.PI * 0.5, typeId: 'city_taxi' },
    { x: 2681, y: 2360, angle: Math.PI * 0.5, typeId: 'bison_suv', color: '#3b4552' },
    // Club Eclipse VIP valet supercar parked cleanly outside Neon Strip curb
    { x: 1817, y: 1646, angle: Math.PI * 0.5, typeId: 'apex_gt', color: '#246b7f' },
    { x: 1895, y: 1650, angle: -Math.PI * 0.5, typeId: 'eclipse_sedan', color: '#b4a998' },
    { x: 1817, y: 2010, angle: Math.PI * 0.5, typeId: 'delivery_van' },
    // Downtown Plaza curb bays
    { x: 1177, y: 694, angle: Math.PI * 0.5, typeId: 'city_taxi' },
    { x: 1255, y: 696, angle: -Math.PI * 0.5, typeId: 'bison_suv', color: '#46525e' },
    { x: 1177, y: 1030, angle: Math.PI * 0.5, typeId: 'delivery_van' },
    // Starfish Marina & Starfish Island & Sunset Hills curb bays
    { x: 2681, y: 688, angle: Math.PI * 0.5, typeId: 'stinger_muscle', color: '#ad5937' },
    { x: 2681, y: 1010, angle: Math.PI * 0.5, typeId: 'city_taxi' },
    { x: 1895, y: 3580, angle: -Math.PI * 0.5, typeId: 'comet_cabrio', color: '#b85e54' },
    { x: 3358, y: 1040, angle: -Math.PI * 0.5, typeId: 'apex_gt', color: '#c9a132' }
  );

  // Extended Coastal Palm Tree Boulevard along Ocean Drive & Southern Sunset Beach
  for (let y = 260; y <= 4860; y += 64) {
    // Keep causeway road entrances clear of palm trunks!
    if (CAUSEWAY_YS.some((cy) => Math.abs(y - cy) < 58)) continue;
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

  // Boardwalk wooden railing segments (interrupted cleanly at the 2 Causeway Bridges!)
  for (let y = 340; y <= 4820; y += 28) {
    if (CAUSEWAY_YS.some((cy) => Math.abs(y - cy) < 56)) continue;
    boardwalkRailings.push({ x: COAST_X - 5.6, y, z: 0.58 });
  }

  // Extended Solaris Beach Umbrellas, Loungers, Surfboards & Lifeguard Stations
  const umbrellaColors = ['#b85e54', '#467e88', '#c89b55', '#5a8376'];
  const towelColors = ['#d4865c', '#58969e', '#d6b46c', '#6e9c84'];
  for (let y = 440; y <= 4680; y += 92) {
    if (CAUSEWAY_YS.some((cy) => Math.abs(y - cy) < 70)) continue;
    const idxU = Math.floor(y / 92);
    beachProps.push({
      kind: 'umbrella',
      x: COAST_X + 86 + ((y * 17) % 42),
      y,
      color: umbrellaColors[idxU % umbrellaColors.length],
      towelColor: towelColors[(idxU + 1) % towelColors.length],
      tilt: ((y % 7) - 3) * 0.03
    });
    beachProps.push({
      kind: 'umbrella',
      x: COAST_X + 138 + ((y * 11) % 34),
      y: y + 42,
      color: umbrellaColors[(idxU + 2) % umbrellaColors.length],
      towelColor: towelColors[(idxU + 3) % towelColors.length],
      tilt: ((y % 5) - 2) * 0.03
    });
  }
  for (const ly of [760, 1460, 1985, 2560, 3420, 4180]) {
    beachProps.push({ kind: 'lifeguard', x: COAST_X + 124, y: ly, color: '#6ca2a8' });
    beachProps.push({
      kind: 'surfboards',
      x: COAST_X + 106,
      y: ly + 18,
      color: '#c8725a',
      accentColor: '#52939c'
    });
  }
  beachProps.push(
    { kind: 'surfboards', x: COAST_X + 76, y: 812, color: '#d4a454', accentColor: '#488890' },
    { kind: 'surfboards', x: COAST_X + 82, y: 1935, color: '#c46b5c', accentColor: '#d4b468' }
  );

  // Luxury 3D Superyachts anchored around Starfish Bay Marina, Starfish Island & Sunset Beach
  yachts.push(
    { id: 'yacht_1', x: 3022, y: 685, angle: 0.28, trimColor: '#2c6e80' },
    { id: 'yacht_2', x: 3060, y: 1120, angle: -0.14, trimColor: '#9c3e4b' },
    { id: 'yacht_3', x: 3070, y: 1580, angle: 0.36, trimColor: '#b59257' },
    { id: 'yacht_4', x: 3085, y: 2040, angle: -0.22, trimColor: '#2c6e80' },
    { id: 'yacht_5', x: 4050, y: 840, angle: 0.16, trimColor: '#4a6b65' },
    { id: 'yacht_6', x: 4070, y: 1560, angle: -0.25, trimColor: '#9c3e4b' },
    { id: 'yacht_7', x: 3140, y: 2980, angle: 0.12, trimColor: '#2c6e80' },
    { id: 'yacht_8', x: 3160, y: 3820, angle: -0.18, trimColor: '#b59257' }
  );

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    coastX: COAST_X,
    beachWidth: BEACH_WIDTH,
    islandBounds: { x1: ISLAND_X1, x2: ISLAND_X2, y1: ISLAND_Y1, y2: ISLAND_Y2 },
    causewayYs: CAUSEWAY_YS,
    verticalRoads,
    horizontalRoads,
    islandVerticalRoads,
    islandHorizontalRoads,
    intersections,
    buildings,
    colliders,
    palmTrees,
    streetlights,
    trafficLights,
    cafePatios,
    streetProps,
    harborProps,
    seatedSpots,
    parkedBays,
    shops,
    yachts,
    beachProps,
    boardwalkRailings,
    clubEclipse: CLUB_ECLIPSE_BOUNDS,
    landmarks: LANDMARKS
  };
}

export function getDistrictAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.bounds.x1 && x <= d.bounds.x2 && y >= d.bounds.y1 && y <= d.bounds.y2) {
      return d;
    }
  }
  return DISTRICTS[4];
}

export function getDistrictName(x, y) {
  return getDistrictAt(x, y).name;
}

function isOnCausewayBridge(y) {
  for (const cy of CAUSEWAY_YS) {
    if (Math.abs(y - cy) <= 44) return cy;
  }
  return null;
}

export function resolveCircleBuildingCollisions(entity, radius, colliders) {
  let hit = false;
  if (colliders) {
    for (const b of colliders) {
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
  }

  // Keep entities cleanly on Mainland, Causeway Bridges, or Starfish Island (out of deep water!)
  const maxMainlandX = COAST_X + BEACH_WIDTH - 24; // 2976
  const bridgeY = isOnCausewayBridge(entity.y);
  const inIslandY = entity.y >= ISLAND_Y1 && entity.y <= ISLAND_Y2;

  if (entity.x > maxMainlandX) {
    if (entity.x >= ISLAND_X1 && entity.x <= ISLAND_X2 && inIslandY) {
      // Valid on Starfish Island
    } else if (bridgeY !== null && entity.x <= ISLAND_X1 + 20) {
      // Valid driving/walking across Causeway Bridge toward Starfish Island
      const clampedY = Math.max(bridgeY - 40, Math.min(bridgeY + 40, entity.y));
      if (clampedY !== entity.y) {
        entity.y = clampedY;
        hit = true;
      }
    } else if (entity.x > ISLAND_X2) {
      entity.x = ISLAND_X2;
      hit = true;
    } else if (entity.x > (maxMainlandX + ISLAND_X1) * 0.5 && inIslandY) {
      // Clamp to West edge of Starfish Island if trying to wade into bay channel
      entity.x = ISLAND_X1;
      hit = true;
    } else if (entity.x >= ISLAND_X1 && !inIslandY) {
      entity.y = entity.y < ISLAND_Y1 ? ISLAND_Y1 : ISLAND_Y2;
      hit = true;
    } else {
      entity.x = maxMainlandX;
      hit = true;
    }
  }

  entity.x = Math.max(80, Math.min(ISLAND_X2, entity.x));
  entity.y = Math.max(80, Math.min(WORLD_HEIGHT - 120, entity.y));
  return hit;
}

export function pointInBuilding(x, y, colliders, padding = 4) {
  if (!colliders) return null;
  for (const b of colliders) {
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
