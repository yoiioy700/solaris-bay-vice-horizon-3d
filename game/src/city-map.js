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
  const bh3D = b.height3D || 120;
  if (!walkInShops || walkInShops.length === 0) {
    return [{ x: b.x, y: b.y, w: b.w, h: b.h, height: bh3D }];
  }

  const out = [];
  const first = walkInShops[0].interior;
  const opensEast = first.dir > 0;
  const maxDepth = Math.max(...walkInShops.map((s) => s.interior.depth));
  const splitX = opensEast ? b.x + b.w - maxDepth : b.x + maxDepth;

  // 1. Solid back structural core behind the ground-floor shop bay(s)
  if (opensEast) {
    const backW = Math.max(10, splitX - b.x);
    out.push({ x: b.x, y: b.y, w: backW, h: b.h, height: bh3D });
  } else {
    const backW = Math.max(10, b.x + b.w - splitX);
    out.push({ x: splitX, y: b.y, w: backW, h: b.h, height: bh3D });
  }

  // 2. Solid flanking walls between/around the carved bay(s) along the front strip
  const stripX = opensEast ? splitX : b.x;
  const stripW = maxDepth;
  const sorted = [...walkInShops].sort((a, c) => a.interior.y1 - c.interior.y1);
  let cursorY = b.y;
  for (const s of sorted) {
    const ib = s.interior;
    if (ib.y1 > cursorY + 2) {
      out.push({ x: stripX, y: cursorY, w: stripW, h: ib.y1 - cursorY, height: bh3D });
    }
    // Thin interior counter collider near the back wall & glass storefront flanks for non-garage stores
    if (s.kind !== 'garage') {
      const cx = ib.dir > 0 ? ib.x1 + 2 : ib.x2 - 11;
      out.push({ x: cx, y: ib.y1 + 6, w: 9, h: ib.y2 - ib.y1 - 12, height: 8 });
      const doorHalf = 13.5;
      const frontX = ib.dir > 0 ? s.x - 1.5 : s.x - 0.5;
      if (s.y - doorHalf - ib.y1 > 2) {
        out.push({ x: frontX, y: ib.y1, w: 2, h: s.y - doorHalf - ib.y1, height: ib.ceilingH || 28 });
      }
      if (ib.y2 - (s.y + doorHalf) > 2) {
        out.push({ x: frontX, y: s.y + doorHalf, w: 2, h: ib.y2 - (s.y + doorHalf), height: ib.ceilingH || 28 });
      }
    }
    cursorY = Math.max(cursorY, ib.y2);
  }
  if (b.y + b.h > cursorY + 2) {
    out.push({ x: stripX, y: cursorY, w: stripW, h: b.y + b.h - cursorY, height: bh3D });
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
          { x: c.x1 - 4, y: c.y1 - 4, w: 7, h: c.y2 - c.y1 + 8, height: 28 }, // West DJ back wall
          { x: c.x1, y: c.y1 - 4, w: c.x2 - c.x1, h: 7, height: 28 }, // North VIP back wall
          { x: c.x1, y: c.y2 - 3, w: c.x2 - c.x1, h: 7, height: 28 }, // South Bar back wall
          // East facade wall segments flanking the grand 66u-wide red-carpet doorway (y = 1663..1729 open!)
          { x: c.x2 - 3, y: c.y1, w: 6, h: 55, height: 28 },
          { x: c.x2 - 3, y: c.y2 - 55, w: 6, h: 55, height: 28 }
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
          { x: cx - 54, y: cy - 48, w: 42, h: 96, height: 26 },
          { x: cx + 14, y: cy - 48, w: 42, h: 96, height: 26 }
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
          colliders.push({ x: bObj.x, y: bObj.y, w: bObj.w, h: bObj.h, height: bObj.height3D });
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
      colliders.push({ x: villa.x, y: villa.y, w: villa.w, h: villa.h, height: villa.height3D });

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

  // Build unified solid & breakable world prop colliders (palms, lamps, hydrants, benches, patios, beach props)
  const propColliders = [];
  let propColliderId = 1;
  function isClearForPropCollider(px, py) {
    if (nearAnyShop(px, py, 19)) return false;
    if (px >= 1756 && px <= 1828 && py >= 1660 && py <= 1732) return false;
    for (const rx of verticalRoads) {
      if (Math.abs(px - rx) < 42) return false;
    }
    return true;
  }

  function registerPropCollider(sourceObj, kind, radius, height, breakable) {
    if (!isClearForPropCollider(sourceObj.x, sourceObj.y)) return;
    const pc = {
      id: `pc_${propColliderId++}`,
      kind,
      x: sourceObj.x,
      y: sourceObj.y,
      z: sourceObj.z || 0,
      radius,
      height,
      breakable,
      knocked: false,
      kx: sourceObj.x,
      ky: sourceObj.y,
      kz: sourceObj.z || 0,
      kvx: 0,
      kvy: 0,
      kvz: 0,
      tilt: 0,
      tiltAxisAngle: 0,
      hitCooldown: 0
    };
    sourceObj.collider = pc;
    propColliders.push(pc);
  }

  for (const t of palmTrees) {
    registerPropCollider(t, 'palm', 2.7 * (t.scale || 1), 36, false);
  }
  for (const sl of streetlights) {
    registerPropCollider(sl, 'streetlight', 1.7, 22, true);
  }
  for (const tl of trafficLights) {
    registerPropCollider(tl, 'traffic_light', 2.0, 25, false);
  }
  for (const p of streetProps) {
    if (p.kind === 'hydrant') registerPropCollider(p, 'hydrant', 1.8, 4.5, true);
    else if (p.kind === 'bench') registerPropCollider(p, 'bench', 3.4, 4.5, true);
    else if (p.kind === 'trashbin') registerPropCollider(p, 'trashbin', 1.8, 4.2, true);
    else if (p.kind === 'newsbox') registerPropCollider(p, 'newsbox', 2.0, 4.8, true);
    else if (p.kind === 'bollard') registerPropCollider(p, 'bollard', 1.4, 4.2, true);
    else if (p.kind === 'planter') registerPropCollider(p, 'planter', 4.2, 4.5, false);
    else if (p.kind === 'vending') registerPropCollider(p, 'vending', 3.2, 9.5, false);
    else if (p.kind === 'bus_stop') registerPropCollider(p, 'bus_stop', 5.2, 13.0, false);
  }
  for (const cp of cafePatios) {
    registerPropCollider(cp, 'cafe_patio', 3.4, 12.0, false);
  }
  for (const bp of beachProps) {
    if (bp.kind === 'lifeguard') registerPropCollider(bp, 'lifeguard', 8.2, 22.0, false);
    else if (bp.kind === 'umbrella') registerPropCollider(bp, 'umbrella', 2.2, 11.5, true);
    else if (bp.kind === 'surfboards') registerPropCollider(bp, 'surfboards', 2.0, 10.5, true);
  }

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
    propColliders,
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

export function resolveWorldBounds(entity, margin = 10) {
  let hit = false;
  let nx = 0;
  let ny = 0;
  const maxMainlandX = COAST_X + BEACH_WIDTH - 24;
  const bridgeY = isOnCausewayBridge(entity.y);
  const inIslandY = entity.y >= ISLAND_Y1 && entity.y <= ISLAND_Y2;

  if (entity.x > maxMainlandX) {
    if (entity.x >= ISLAND_X1 && entity.x <= ISLAND_X2 && inIslandY) {
      // Valid on Starfish Island
    } else if (bridgeY !== null && entity.x <= ISLAND_X1 + 20) {
      const clampedY = Math.max(bridgeY - 40, Math.min(bridgeY + 40, entity.y));
      if (clampedY !== entity.y) {
        ny = clampedY > entity.y ? 1 : -1;
        entity.y = clampedY;
        hit = true;
      }
    } else if (entity.x > ISLAND_X2 - margin * 0.25) {
      entity.x = ISLAND_X2 - margin * 0.25;
      nx = -1;
      hit = true;
    } else if (entity.x > (maxMainlandX + ISLAND_X1) * 0.5 && inIslandY) {
      entity.x = ISLAND_X1;
      nx = 1;
      hit = true;
    } else if (entity.x >= ISLAND_X1 && !inIslandY) {
      ny = entity.y < ISLAND_Y1 ? 1 : -1;
      entity.y = entity.y < ISLAND_Y1 ? ISLAND_Y1 : ISLAND_Y2;
      hit = true;
    } else {
      entity.x = maxMainlandX;
      nx = -1;
      hit = true;
    }
  }

  const minX = 80 + margin * 0.5;
  const maxX = ISLAND_X2;
  const minY = 80 + margin * 0.5;
  const maxY = WORLD_HEIGHT - 120;
  if (entity.x < minX) {
    entity.x = minX;
    nx = 1;
    hit = true;
  } else if (entity.x > maxX) {
    entity.x = maxX;
    nx = -1;
    hit = true;
  }
  if (entity.y < minY) {
    entity.y = minY;
    ny = 1;
    hit = true;
  } else if (entity.y > maxY) {
    entity.y = maxY;
    ny = -1;
    hit = true;
  }
  return { hit, nx, ny };
}

/**
 * Exact 2D Separating Axis Theorem check for an Oriented Bounding Box vs an axis-aligned box.
 */
export function resolveOBBvsAABB(cx, cy, angle, halfL, halfW, aabb) {
  const bx = aabb.x + aabb.w * 0.5;
  const by = aabb.y + aabb.h * 0.5;
  const bw2 = aabb.w * 0.5;
  const bh2 = aabb.h * 0.5;
  const dx = cx - bx;
  const dy = cy - by;

  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const rx = -uy;
  const ry = ux;

  // Quick circle broadphase
  const maxR = halfL + halfW;
  if (Math.abs(dx) > bw2 + maxR || Math.abs(dy) > bh2 + maxR) {
    return null;
  }

  let minPen = Infinity;
  let bestNx = 0;
  let bestNy = 0;

  const axes = [
    [1, 0],
    [0, 1],
    [ux, uy],
    [rx, ry]
  ];

  for (let i = 0; i < 4; i++) {
    const ax = axes[i][0];
    const ay = axes[i][1];
    const projV = halfL * Math.abs(ax * ux + ay * uy) + halfW * Math.abs(ax * rx + ay * ry);
    const projB = bw2 * Math.abs(ax) + bh2 * Math.abs(ay);
    const dist = dx * ax + dy * ay;
    const pen = projV + projB - Math.abs(dist);
    if (pen <= 0) return null;
    if (pen < minPen) {
      minPen = pen;
      const sign = dist >= 0 ? 1 : -1;
      bestNx = ax * sign;
      bestNy = ay * sign;
    }
  }

  return { overlap: minPen, nx: bestNx, ny: bestNy };
}

/**
 * Exact 2D Separating Axis Theorem check between two Oriented Bounding Boxes.
 */
export function resolveOBBvsOBB(ax, ay, aAng, aHL, aHW, bx, by, bAng, bHL, bHW) {
  const dx = bx - ax;
  const dy = by - ay;
  const maxR = aHL + aHW + bHL + bHW;
  if (dx * dx + dy * dy > maxR * maxR) return null;

  const aux = Math.cos(aAng);
  const auy = Math.sin(aAng);
  const arx = -auy;
  const ary = aux;

  const bux = Math.cos(bAng);
  const buy = Math.sin(bAng);
  const brx = -buy;
  const bry = bux;

  let minPen = Infinity;
  let bestNx = 0;
  let bestNy = 0;

  const axes = [
    [aux, auy],
    [arx, ary],
    [bux, buy],
    [brx, bry]
  ];

  for (let i = 0; i < 4; i++) {
    const lx = axes[i][0];
    const ly = axes[i][1];
    const projA = aHL * Math.abs(lx * aux + ly * auy) + aHW * Math.abs(lx * arx + ly * ary);
    const projB = bHL * Math.abs(lx * bux + ly * buy) + bHW * Math.abs(lx * brx + ly * bry);
    const dist = dx * lx + dy * ly;
    const pen = projA + projB - Math.abs(dist);
    if (pen <= 0) return null;
    if (pen < minPen) {
      minPen = pen;
      const sign = dist >= 0 ? 1 : -1;
      bestNx = lx * sign;
      bestNy = ly * sign;
    }
  }

  return { overlap: minPen, nx: bestNx, ny: bestNy };
}

export function resolveOBBvsBuildings(v, colliders) {
  const hl = (v.length || 50) * 0.5;
  const hw = (v.width || 24) * 0.5;
  let hit = false;
  let outNx = 0;
  let outNy = 0;
  let maxPen = 0;

  if (colliders) {
    for (let pass = 0; pass < 2; pass++) {
      let anyPass = false;
      for (const b of colliders) {
        const res = resolveOBBvsAABB(v.x, v.y, v.angle, hl, hw, b);
        if (res && res.overlap > 0.001) {
          v.x += res.nx * res.overlap;
          v.y += res.ny * res.overlap;
          hit = true;
          anyPass = true;
          if (res.overlap > maxPen) {
            maxPen = res.overlap;
            outNx = res.nx;
            outNy = res.ny;
          }
        }
      }
      if (!anyPass) break;
    }
  }

  const wb = resolveWorldBounds(v, hw);
  if (wb.hit) {
    hit = true;
    if (outNx === 0 && outNy === 0) {
      outNx = wb.nx;
      outNy = wb.ny;
    }
  }

  return { hit, nx: outNx, ny: outNy, maxPen };
}

/**
 * Resolves a circle entity (player or pedestrian) against a vehicle's oriented bounding box.
 */
export function resolveCircleOBBCollision(entity, radius, v, allowRoofStand = false) {
  const hl = (v.length || 50) * 0.5;
  const hw = (v.width || 24) * 0.5;
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  const dx = entity.x - v.x;
  const dy = entity.y - v.y;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const clampedX = Math.max(-hl, Math.min(hl, lx));
  const clampedY = Math.max(-hw, Math.min(hw, ly));
  const offX = lx - clampedX;
  const offY = ly - clampedY;
  const distSq = offX * offX + offY * offY;
  if (distSq >= radius * radius) return false;

  if (allowRoofStand && (entity.z || 0) >= (v.height || 14) * 0.68) {
    return false;
  }

  let pushLx = 0;
  let pushLy = 0;
  if (distSq > 0.0001) {
    const d = Math.sqrt(distSq);
    const overlap = radius - d;
    pushLx = (offX / d) * overlap;
    pushLy = (offY / d) * overlap;
  } else {
    const penX = hl - Math.abs(lx) + radius;
    const penY = hw - Math.abs(ly) + radius;
    if (penX < penY) pushLx = (lx >= 0 ? 1 : -1) * penX;
    else pushLy = (ly >= 0 ? 1 : -1) * penY;
  }

  entity.x += cos * pushLx - sin * pushLy;
  entity.y += sin * pushLx + cos * pushLy;
  return true;
}

export function resolveCircleProps(entity, radius, entityZ, propColliders) {
  if (!propColliders) return false;
  let hit = false;
  for (const p of propColliders) {
    if (p.knocked) continue;
    if (entityZ > p.height + 1.0) continue;
    const dx = entity.x - p.x;
    const dy = entity.y - p.y;
    const minDist = radius + p.radius;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDist * minDist) {
      const d = Math.sqrt(dSq) || 0.001;
      const overlap = minDist - d;
      entity.x += (dx / d) * overlap;
      entity.y += (dy / d) * overlap;
      hit = true;
    }
  }
  return hit;
}

export function getGroundHeightAt(x, y, z, vehicles = null) {
  let groundZ = 0;
  if (x >= COAST_X - 32 && x <= COAST_X - 4) {
    groundZ = 0.58;
  } else if (
    x >= CLUB_ECLIPSE_BOUNDS.x1 &&
    x <= CLUB_ECLIPSE_BOUNDS.x2 &&
    y >= CLUB_ECLIPSE_BOUNDS.y1 &&
    y <= CLUB_ECLIPSE_BOUNDS.y2
  ) {
    groundZ = 0.36;
  }

  if (vehicles) {
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const topZ = v.height || 14;
      if (z < topZ * 0.68) continue;
      const cos = Math.cos(v.angle);
      const sin = Math.sin(v.angle);
      const dx = x - v.x;
      const dy = y - v.y;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      if (Math.abs(lx) <= (v.length || 50) * 0.48 && Math.abs(ly) <= (v.width || 24) * 0.48) {
        if (topZ > groundZ) groundZ = topZ;
      }
    }
  }
  return groundZ;
}

function rayBoxSlab(ox, oy, oz, dx, dy, dz, minX, maxX, minY, maxY, minZ, maxZ) {
  let tmin = -Infinity;
  let tmax = Infinity;
  let nx = 0;
  let ny = 0;
  let nz = 0;

  // X slab
  if (Math.abs(dx) < 1e-8) {
    if (ox < minX || ox > maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv;
    let t2 = (maxX - ox) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = sign;
      ny = 0;
      nz = 0;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  // Y slab (world 2D Y)
  if (Math.abs(dy) < 1e-8) {
    if (oy < minY || oy > maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv;
    let t2 = (maxY - oy) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = sign;
      nz = 0;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  // Z slab (vertical height)
  if (Math.abs(dz) < 1e-8) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - oz) * inv;
    let t2 = (maxZ - oz) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = 0;
      nz = sign;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (tmax < 0) return null;
  return { t: tmin >= 0 ? tmin : tmax, nx, ny, nz, inside: tmin < 0 };
}

/**
 * 3D raycast against building / wall colliders in world (x, y, zHeight) coordinates.
 */
export function raycastColliders3D(ox, oy, oz, dx, dy, dz, maxDist, colliders, padding = 0) {
  if (!colliders) return null;
  let best = null;
  let bestT = maxDist;

  for (const c of colliders) {
    const h = c.height || 140;
    const hit = rayBoxSlab(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      c.x - padding,
      c.x + c.w + padding,
      c.y - padding,
      c.y + c.h + padding,
      0,
      h + padding
    );
    if (hit && hit.t >= 0 && hit.t < bestT) {
      bestT = hit.t;
      best = {
        t: hit.t,
        x: ox + dx * hit.t,
        y: oy + dy * hit.t,
        z: oz + dz * hit.t,
        nx: hit.nx,
        ny: hit.ny,
        nz: hit.nz,
        inside: hit.inside,
        collider: c
      };
    }
  }
  return best;
}

/**
 * 3D crosshair raycast against buildings, vehicles, pedestrians, and ground plane.
 */
export function raycastWorldForAim(ox, oy, oz, dx, dy, dz, maxDist, state, minT = 0) {
  const { cityMap, vehicles, pedestrians, player } = state;
  let bestT = maxDist;
  let bestHit = null;

  // 1. Buildings & walls
  const colliders = cityMap.colliders || cityMap.buildings;
  if (colliders) {
    for (const c of colliders) {
      const hit = rayBoxSlab(ox, oy, oz, dx, dy, dz, c.x, c.x + c.w, c.y, c.y + c.h, 0, c.height || 140);
      if (hit && hit.t >= minT && hit.t < bestT) {
        bestT = hit.t;
        bestHit = {
          t: hit.t,
          x: ox + dx * hit.t,
          y: oy + dy * hit.t,
          z: oz + dz * hit.t,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          type: 'building',
          entity: c
        };
      }
    }
  }

  // 2. Vehicles (3D OBB)
  if (vehicles) {
    for (const v of vehicles) {
      if (v.destroyed || v === player.vehicle) continue;
      const cos = Math.cos(v.angle);
      const sin = Math.sin(v.angle);
      const rx = ox - v.x;
      const ry = oy - v.y;
      const lox = rx * cos + ry * sin;
      const loy = -rx * sin + ry * cos;
      const ldx = dx * cos + dy * sin;
      const ldy = -dx * sin + dy * cos;
      const hl = (v.length || 50) * 0.5;
      const hw = (v.width || 24) * 0.5;
      const hit = rayBoxSlab(lox, loy, oz - (v.z || 0), ldx, ldy, dz, -hl, hl, -hw, hw, 0, v.height || 14);
      if (hit && hit.t >= minT && hit.t < bestT) {
        bestT = hit.t;
        bestHit = {
          t: hit.t,
          x: ox + dx * hit.t,
          y: oy + dy * hit.t,
          z: oz + dz * hit.t,
          nx: cos * hit.nx - sin * hit.ny,
          ny: sin * hit.nx + cos * hit.ny,
          nz: hit.nz,
          type: 'vehicle',
          entity: v
        };
      }
    }
  }

  // 3. Living Pedestrians (vertical cylinder)
  if (pedestrians) {
    const a2 = dx * dx + dy * dy;
    const rad = 6.8;
    for (const npc of pedestrians) {
      if (npc.dead || npc.inCar) continue;
      const rx = ox - npc.x;
      const ry = oy - npc.y;
      if (a2 > 1e-6) {
        const b2 = 2 * (rx * dx + ry * dy);
        const c2 = rx * rx + ry * ry - rad * rad;
        const disc = b2 * b2 - 4 * a2 * c2;
        if (disc < 0) continue;
        const sqrtD = Math.sqrt(disc);
        let tHit = (-b2 - sqrtD) / (2 * a2);
        if (tHit < minT) tHit = (-b2 + sqrtD) / (2 * a2);
        if (tHit >= minT && tHit < bestT) {
          const hz = oz + dz * tHit;
          const baseZ = npc.z || 0;
          if (hz >= baseZ - 0.5 && hz <= baseZ + 18.8 * (npc.heightScale || 1)) {
            bestT = tHit;
            const hx = ox + dx * tHit;
            const hy = oy + dy * tHit;
            const nLen = Math.hypot(hx - npc.x, hy - npc.y) || 1;
            bestHit = {
              t: tHit,
              x: hx,
              y: hy,
              z: hz,
              nx: (hx - npc.x) / nLen,
              ny: (hy - npc.y) / nLen,
              nz: 0,
              type: 'npc',
              entity: npc
            };
          }
        }
      }
    }
  }

  // 4. Ground plane z = 0
  if (dz < -1e-4) {
    const tg = -oz / dz;
    if (tg >= minT && tg < bestT) {
      bestT = tg;
      bestHit = {
        t: tg,
        x: ox + dx * tg,
        y: oy + dy * tg,
        z: 0,
        nx: 0,
        ny: 0,
        nz: 1,
        type: 'ground',
        entity: null
      };
    }
  }

  if (!bestHit) {
    return {
      t: maxDist,
      x: ox + dx * maxDist,
      y: oy + dy * maxDist,
      z: Math.max(0, oz + dz * maxDist),
      nx: -dx,
      ny: -dy,
      nz: -dz,
      type: null,
      entity: null
    };
  }
  return bestHit;
}
