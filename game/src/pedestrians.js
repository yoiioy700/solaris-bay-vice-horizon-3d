import { resolveCircleBuildingCollisions } from './city-map.js';
import { COAST_X } from './config.js';
import { CLUB_ECLIPSE_BOUNDS, isInsideClubEclipse } from './nightlife-romance.js';
import { getActiveWalkInShopAt } from './shops-economy.js';

let nextNpcId = 1;

const CIVILIAN_OUTFITS = [
  { jacket: '#5c8279', shirt: '#d8d1c5', pants: '#27313d', bag: '#c46f5c' },
  { jacket: '#c49d76', shirt: '#dfd8cc', pants: '#34404d', bag: '#4c868c' },
  { jacket: '#4c6882', shirt: '#d6d0c4', pants: '#252c36', bag: '#cfa052' },
  { jacket: '#b56a5a', shirt: '#e0d9ce', pants: '#2e3844', bag: '#588276' },
  { jacket: '#5a6e5b', shirt: '#d5cfc3', pants: '#28303b', bag: '#b56358' },
  { jacket: '#c8bc9e', shirt: '#528c8e', pants: '#3a4654', bag: '#4a6b82' },
  { jacket: '#865b6e', shirt: '#dcd4c8', pants: '#262f3b', bag: '#c99b56' },
  { jacket: '#44767d', shirt: '#e0d8c8', pants: '#39414c', bag: '#b86852' }
];

const JOGGER_OUTFITS = [
  { jacket: '#4d7c86', shirt: '#dad4c8', pants: '#27303b' },
  { jacket: '#ba6d5a', shirt: '#dfd9cc', pants: '#2d3540' },
  { jacket: '#5c846c', shirt: '#dad3c6', pants: '#262e38' }
];

const SKIN_TONES = ['#cfa07e', '#b98766', '#d8b090', '#966b4f', '#c79674', '#a87858'];
const HAIR_COLORS = ['#242120', '#3d3028', '#5c4632', '#2c2725', '#786048'];

export function createPedestrian(x, y, role = 'civilian', overrides = {}) {
  const idNum = nextNpcId++;
  const outfit =
    role === 'jogger'
      ? JOGGER_OUTFITS[idNum % JOGGER_OUTFITS.length]
      : CIVILIAN_OUTFITS[idNum % CIVILIAN_OUTFITS.length];
  const skinColor = SKIN_TONES[idNum % SKIN_TONES.length];
  const isHostile = role === 'syndicate' || role === 'police';
  const isVendor = role === 'vendor' || role === 'bouncer' || role === 'dj';
  const isSeated = role === 'seated';
  const isJogger = role === 'jogger';
  const isBeachgoer = role === 'beachgoer';
  const isDancer = role === 'dancer';
  const isCompanion = role === 'companion' || role === 'vip_companion';

  let accessory = null;
  let hat = null;
  let hasShades = isHostile || role === 'bouncer' || role === 'dj' || idNum % 3 === 0;

  if (role === 'vendor') {
    accessory = 'apron';
    hat = 'cap';
    hasShades = false;
  } else if (role === 'bouncer' || role === 'dj') {
    hasShades = true;
  } else if (isCompanion || isDancer) {
    hasShades = idNum % 3 === 0;
  } else if (!isHostile && !isSeated) {
    if (isBeachgoer) {
      hat = idNum % 2 === 0 ? 'sunhat' : null;
      hasShades = true;
    } else if (isJogger) {
      hat = idNum % 2 === 0 ? 'cap' : null;
    } else {
      const mod = idNum % 6;
      if (mod === 0 || mod === 1) accessory = 'shopping_bag';
      else if (mod === 2) accessory = 'backpack';
      if (idNum % 4 === 0) hat = 'cap';
      else if (idNum % 5 === 0) hat = 'sunhat';
    }
  } else if (isSeated) {
    hat = idNum % 4 === 0 ? 'sunhat' : null;
  }

  return {
    id: `npc_${idNum}`,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    role,
    hostile: isHostile,
    isVendor,
    isSeated,
    isJogger,
    isBeachgoer,
    isDancer,
    isCompanion,
    inCar: false,
    hp: role === 'syndicate' ? 110 : role === 'police' ? 95 : 55,
    maxHp: role === 'syndicate' ? 110 : role === 'police' ? 95 : 55,
    speed: isHostile ? 98 : isJogger ? 88 : isBeachgoer ? 34 : isCompanion ? 24 : 46 + (idNum % 14),
    walkPhase: Math.random() * 10,
    idlePhase: Math.random() * 6.28,
    fireCooldown: 0.4 + Math.random() * 0.6,
    muzzleTimer: 0,
    panicTimer: 0,
    duckTimer: 0,
    cashReward: role === 'syndicate' ? 650 : role === 'police' ? 250 : 120,
    jacketColor:
      role === 'police'
        ? '#223044'
        : role === 'syndicate'
          ? '#363b45'
          : role === 'bouncer'
            ? '#1e242e'
            : role === 'dj'
              ? '#5a3a64'
              : isCompanion
                ? idNum % 2 === 0
                  ? '#b84c68'
                  : '#9c4260'
                : role === 'vendor'
                  ? '#3b4a58'
                  : outfit.jacket,
    shirtColor:
      role === 'police'
        ? '#6c8eab'
        : role === 'syndicate'
          ? '#9e4d46'
          : isCompanion
            ? '#e2c8c4'
            : outfit.shirt,
    pantsColor: role === 'police' || role === 'bouncer' ? '#1c2533' : outfit.pants,
    skinColor,
    hairColor: HAIR_COLORS[idNum % HAIR_COLORS.length],
    accessory,
    hat,
    hatColor: outfit.bag || '#467c82',
    bagColor: outfit.bag || '#c46f5c',
    apronColor: idNum % 2 === 0 ? '#dfd8ca' : '#324854',
    hasShades,
    heightScale: isHostile ? 1.0 : 0.92 + (idNum % 5) * 0.032,
    hasWeapon: isHostile,
    walkAxis: idNum % 2 === 0 ? 'y' : 'x',
    walkDir: idNum % 4 < 2 ? 1 : -1,
    homeX: x,
    homeY: y,
    dead: false,
    ...overrides
  };
}

export function spawnInitialPedestrians(cityMap) {
  const list = [];

  // 1. Dedicated animated Vendors & Indoor Shop Clerks behind every shop/cart/bar counter
  if (cityMap.shops) {
    for (const shop of cityMap.shops) {
      let vx;
      let vy;
      if (shop.interior) {
        vx = shop.interior.vendorX;
        vy = shop.interior.vendorY;
        if (shop.kind === 'garage') {
          // Mechanic standing beside the rolling tool chest inside drive-in bay
          vy = shop.interior.y1 + 12;
        }
      } else if (shop.variant === 'club_bar') {
        vx = shop.x;
        vy = shop.y + 8.5;
      } else {
        const fCos = Math.cos(shop.facing || 0);
        const fSin = Math.sin(shop.facing || 0);
        vx = shop.x - fCos * 3.4;
        vy = shop.y - fSin * 3.4;
      }
      list.push(
        createPedestrian(vx, vy, 'vendor', {
          z: shop.z || 0,
          angle: shop.facing || 0,
          shopId: shop.id,
          homeX: vx,
          homeY: vy,
          apronColor:
            shop.kind === 'armory'
              ? '#2e3844'
              : shop.kind === 'garage'
                ? '#364d4a'
                : shop.kind === 'club_bar'
                  ? '#252932'
                  : '#dfd8ca',
          jacketColor:
            shop.kind === 'armory'
              ? '#343c46'
              : shop.kind === 'garage'
                ? '#3b5954'
                : shop.kind === 'club_bar'
                  ? '#4a3250'
                  : '#b86c52'
        })
      );
    }
  }

  // 1B. CLUB ECLIPSE NIGHTCLUB CAST: DJ, 2 Bouncers, 14 Dancing Clubgoers, VIP Suite Companion & Street Companions
  const ce = CLUB_ECLIPSE_BOUNDS;
  list.push(
    createPedestrian(ce.x1 + 32, ce.centerY, 'dj', {
      z: 4.2,
      angle: 0,
      homeX: ce.x1 + 32,
      homeY: ce.centerY
    }),
    createPedestrian(ce.x2 + 6, ce.centerY - 17, 'bouncer', {
      angle: 0,
      homeX: ce.x2 + 6,
      homeY: ce.centerY - 17
    }),
    createPedestrian(ce.x2 + 6, ce.centerY + 17, 'bouncer', {
      angle: 0,
      homeX: ce.x2 + 6,
      homeY: ce.centerY + 17
    }),
    createPedestrian(ce.vipX, ce.vipY + 4, 'vip_companion', {
      angle: Math.PI * 0.5,
      homeX: ce.vipX,
      homeY: ce.vipY + 4,
      jacketColor: '#a63858',
      shirtColor: '#e0c6c2',
      pantsColor: '#2a202c'
    })
  );

  // 14 animated dancing clubgoers grooving on the pulsing LED disco floor
  const dancerOffsets = [
    [-22, -20], [-6, -24], [12, -20], [26, -16],
    [-26, -2], [-10, -4], [8, -2], [24, 4],
    [-20, 16], [-4, 18], [14, 16], [26, 20],
    [-12, -12], [14, -10]
  ];
  for (let i = 0; i < dancerOffsets.length; i++) {
    const [ox, oy] = dancerOffsets[i];
    list.push(
      createPedestrian(ce.centerX + ox, ce.centerY + oy, 'dancer', {
        z: 0.36,
        angle: (i * 1.1) % (Math.PI * 2),
        homeX: ce.centerX + ox,
        homeY: ce.centerY + oy,
        walkPhase: i * 0.85
      })
    );
  }

  // 4 stylish 21+ Nightlife Street Companions outside Club Eclipse & Neon Strip (for [H]/[E] In-Car Pickup!)
  const companionSpots = [
    { x: 1804, y: 1732, angle: 0 },
    { x: 1804, y: 1658, angle: 0 },
    { x: 1804, y: 1904, angle: 0 },
    { x: 1906, y: 1814, angle: Math.PI }
  ];
  for (const cs of companionSpots) {
    list.push(
      createPedestrian(cs.x, cs.y, 'companion', {
        angle: cs.angle,
        homeX: cs.x,
        homeY: cs.y
      })
    );
  }

  // 2. Seated Café Patrons & Bench Sitters at patios, bus stops & Marina boardwalk benches
  if (cityMap.seatedSpots) {
    const maxSeated = Math.min(22, cityMap.seatedSpots.length);
    for (let i = 0; i < maxSeated; i++) {
      const sp = cityMap.seatedSpots[i];
      list.push(
        createPedestrian(sp.x, sp.y, 'seated', {
          z: sp.z || 0,
          angle: sp.angle || 0,
          seatKind: sp.kind || 'cafe',
          homeX: sp.x,
          homeY: sp.y
        })
      );
    }
  }

  // 3. Boardwalk Joggers along Ocean Drive timber promenade
  const joggerYs = [690, 865, 1140, 1520, 1890, 2020, 2240, 2580];
  for (let i = 0; i < joggerYs.length; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    list.push(
      createPedestrian(COAST_X - 21 + (i % 2) * 5, joggerYs[i], 'jogger', {
        z: 0.58,
        angle: dir < 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
        walkAxis: 'y',
        walkDir: dir
      })
    );
  }

  // 4. Beachgoers strolling near umbrellas & lifeguard towers on golden sand
  const beachYs = [740, 835, 1680, 1935, 2045, 2160];
  for (let i = 0; i < beachYs.length; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    list.push(
      createPedestrian(COAST_X + 74 + (i % 3) * 26, beachYs[i], 'beachgoer', {
        z: 0,
        angle: dir < 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
        walkAxis: 'y',
        walkDir: dir
      })
    );
  }

  // 5. Bustling Strolling Sidewalk Locals & Tourists distributed across lively districts
  const hotSidewalks = [
    // Ocean Drive (West sidewalk x=2664, East boardwalk x=2758)
    { x: 2664, y: 2070, axis: 'y', dir: -1 },
    { x: 2666, y: 2018, axis: 'y', dir: 1 },
    { x: 2663, y: 1962, axis: 'y', dir: -1 },
    { x: 2665, y: 1908, axis: 'y', dir: 1 },
    { x: 2664, y: 1748, axis: 'y', dir: -1 },
    { x: 2665, y: 828, axis: 'y', dir: -1 },
    { x: 2758, y: 780, axis: 'y', dir: 1, z: 0.58 },
    { x: 2760, y: 832, axis: 'y', dir: -1, z: 0.58 },
    // Vice Neon Strip (West sidewalk 1798, East sidewalk 1912)
    { x: 1800, y: 1775, axis: 'y', dir: -1 },
    { x: 1802, y: 1712, axis: 'y', dir: 1 },
    { x: 1910, y: 1766, axis: 'y', dir: -1 },
    { x: 1912, y: 1692, axis: 'y', dir: 1 },
    { x: 1800, y: 1645, axis: 'y', dir: 1 },
    // Downtown Plaza (West sidewalk 1160, East sidewalk 1272)
    { x: 1161, y: 830, axis: 'y', dir: -1 },
    { x: 1162, y: 760, axis: 'y', dir: 1 },
    { x: 1271, y: 816, axis: 'y', dir: -1 },
    { x: 1273, y: 735, axis: 'y', dir: 1 },
    { x: 1271, y: 1030, axis: 'y', dir: -1 }
  ];

  for (const s of hotSidewalks) {
    list.push(
      createPedestrian(s.x, s.y, 'civilian', {
        z: s.z || 0,
        walkAxis: s.axis,
        walkDir: s.dir,
        angle: s.axis === 'y' ? (s.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5) : s.dir > 0 ? 0 : Math.PI
      })
    );
  }

  // Citywide strolling sidewalk citizens across all avenues
  const activeRoads = [896, 1216, 1536, 1856, 2176, 2496, 2720];
  for (let i = 0; i < 24; i++) {
    const rx = activeRoads[i % activeRoads.length];
    const side = rx === 2720 ? -57 : i % 2 === 0 ? -58 : 58;
    const y = 380 + ((i * 239) % 2560);
    const dir = i % 2 === 0 ? -1 : 1;
    list.push(
      createPedestrian(rx + side, y, 'civilian', {
        walkAxis: 'y',
        walkDir: dir,
        angle: dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5
      })
    );
  }

  return list;
}

export function alertNearbyCivilians(state, cx, cy, radius = 290) {
  if (!state || !state.pedestrians) return;
  for (const npc of state.pedestrians) {
    if (npc.dead || npc.hostile) continue;
    const d = Math.hypot(npc.x - cx, npc.y - cy);
    if (d < radius) {
      if (npc.isVendor) {
        npc.duckTimer = 4.5;
      } else {
        npc.panicTimer = 5.5;
      }
    }
  }
}

export function updatePedestrians(state, dt) {
  const { player, pedestrians, cityMap, projectiles, pickups } = state;

  for (const npc of pedestrians) {
    if (npc.dead) continue;
    npc.muzzleTimer = Math.max(0, npc.muzzleTimer - dt);
    npc.fireCooldown = Math.max(0, npc.fireCooldown - dt);
    npc.idlePhase = (npc.idlePhase || 0) + dt * 2.2;

    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const dist = Math.hypot(dx, dy);

    // 1. Vendors, Bouncers, DJ & VIP Companion remain stationed (ducking if gunfire happens)
    if (npc.isVendor || npc.role === 'vip_companion') {
      npc.duckTimer = Math.max(0, (npc.duckTimer || 0) - dt);
      npc.vx = 0;
      npc.vy = 0;
      continue;
    }

    // 1B. Dancing Clubgoers groove to 124 BPM beat on the disco floor
    if (npc.isDancer) {
      npc.walkPhase += dt * 6.4;
      npc.vx = 0;
      npc.vy = 0;
      continue;
    }

    // 1C. Street Nightlife Companions wait stylishly on the strip unless riding in player's car
    if (npc.role === 'companion') {
      if (npc.inCar) continue;
      if (state.nightlife && state.nightlife.companionApproaching && state.nightlife.companionApproaching.npc === npc) {
        continue;
      }
      npc.vx = 0;
      npc.vy = 0;
      continue;
    }

    // 2. Seated Café Patrons & Bench Sitters relax & chat unless gunfire forces them to flee
    if (npc.isSeated && npc.panicTimer <= 0) {
      npc.vx = 0;
      npc.vy = 0;
      continue;
    }

    if (npc.hostile) {
      npc.angle = Math.atan2(dy, dx);
      if (dist > 145 && dist < 560) {
        npc.vx = Math.cos(npc.angle) * npc.speed;
        npc.vy = Math.sin(npc.angle) * npc.speed;
      } else if (dist < 110) {
        npc.vx = -Math.cos(npc.angle) * (npc.speed * 0.45);
        npc.vy = -Math.sin(npc.angle) * (npc.speed * 0.45);
      } else {
        npc.vx *= 0.85;
        npc.vy *= 0.85;
      }

      const playerSheltered =
        Boolean(state.nightlife && state.nightlife.session) ||
        isInsideClubEclipse(player.x, player.y) ||
        Boolean(getActiveWalkInShopAt(player.x, player.y, cityMap.shops));
      if (!playerSheltered && dist < 430 && npc.fireCooldown <= 0) {
        npc.fireCooldown = npc.role === 'syndicate' ? 0.65 : 0.82;
        npc.muzzleTimer = 0.09;
        const aimAngle = npc.angle + (Math.random() - 0.5) * 0.08;
        projectiles.push({
          x: npc.x + Math.cos(aimAngle) * 14,
          y: npc.y + Math.sin(aimAngle) * 14,
          z: 11,
          vx: Math.cos(aimAngle) * 560,
          vy: Math.sin(aimAngle) * 560,
          damage: 9,
          life: 0.9,
          color: '#fb7185',
          fromPlayer: false,
          explosiveRadius: 0
        });
      }
    } else if (npc.panicTimer > 0) {
      // Panicked fleeing civilian (including startled café patrons)
      npc.panicTimer = Math.max(0, npc.panicTimer - dt);
      npc.angle = Math.atan2(-dy, -dx);
      npc.vx = Math.cos(npc.angle) * 118;
      npc.vy = Math.sin(npc.angle) * 118;
    } else if (npc.isJogger) {
      // Boardwalk jogger running cleanly along Ocean Drive timber boardwalk
      npc.z = 0.58;
      npc.angle = npc.walkDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      npc.vx = 0;
      npc.vy = npc.walkDir * npc.speed;
      if (npc.y < 380) npc.walkDir = 1;
      if (npc.y > 3080) npc.walkDir = -1;
    } else if (npc.isBeachgoer) {
      // Strolling peacefully on the golden sand
      npc.angle = npc.walkDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      npc.vx = Math.sin(npc.idlePhase * 0.35) * 6;
      npc.vy = npc.walkDir * npc.speed;
      if (npc.y < 420) npc.walkDir = 1;
      if (npc.y > 3040) npc.walkDir = -1;
    } else {
      // Structured sidewalk corridor strolling across the expanded 5200x5120 city
      if (npc.walkAxis === 'y') {
        npc.angle = npc.walkDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        npc.vx = 0;
        npc.vy = npc.walkDir * npc.speed;
        if (npc.y < 300) npc.walkDir = 1;
        if (npc.y > 4660) npc.walkDir = -1;
      } else {
        npc.angle = npc.walkDir > 0 ? 0 : Math.PI;
        npc.vx = npc.walkDir * npc.speed;
        npc.vy = 0;
        if (npc.x < 320) npc.walkDir = 1;
        if (npc.x > 3820) npc.walkDir = -1;
      }

      // Smooth crowd streaming: recycle far-off strolling civilians onto sidewalks around the player
      if (dist > 980 && npc.role === 'civilian') {
        const allRoadsX = [...cityMap.verticalRoads, ...(cityMap.islandVerticalRoads || [])];
        let bestRoad = allRoadsX[0];
        let bestD = Infinity;
        for (const rx of allRoadsX) {
          const rd = Math.abs(rx - player.x);
          if (rd < bestD) {
            bestD = rd;
            bestRoad = rx;
          }
        }
        const side = bestRoad === 2720 ? -57 : Math.random() < 0.5 ? -58 : 58;
        const offsetY = (Math.random() < 0.5 ? 1 : -1) * (220 + Math.random() * 280);
        npc.x = bestRoad + side;
        const maxY = bestRoad > 3000 ? 2040 : 4640;
        const minY = bestRoad > 3000 ? 520 : 320;
        npc.y = Math.max(minY, Math.min(maxY, player.y + offsetY));
        npc.walkAxis = 'y';
        npc.walkDir = offsetY > 0 ? -1 : 1;
        npc.z = 0;
      }
    }

    npc.x += npc.vx * dt;
    npc.y += npc.vy * dt;
    const moveSpd = Math.hypot(npc.vx, npc.vy);
    npc.walkPhase += moveSpd * dt * 0.14;

    const hitWall = resolveCircleBuildingCollisions(
      npc,
      8,
      cityMap.colliders || cityMap.buildings
    );
    if (hitWall && !npc.hostile) {
      npc.walkDir = -npc.walkDir;
      npc.angle += Math.PI;
    }

    // Keep civilians clear of solid street cart footprints so they never walk through shop counters
    if (!npc.isVendor && cityMap.shops) {
      for (const s of cityMap.shops) {
        if (s.variant !== 'cart') continue;
        const sdx = npc.x - s.x;
        const sdy = npc.y - s.y;
        const sd = Math.hypot(sdx, sdy);
        if (sd < 12 && sd > 0.01) {
          npc.x += (sdx / sd) * (12 - sd);
          npc.y += (sdy / sd) * (12 - sd);
        }
      }
    }

    // Vehicle roadkill check if player is driving fast
    if (player.vehicle && player.vehicle.speed > 130 && dist < 24 && !npc.isVendor) {
      damagePedestrian(state, npc, 120, player.vehicle.vx, player.vehicle.vy);
    }
  }

  // Collect cash & armor pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.phase = (p.phase || 0) + dt * 5;
    if (p.life <= 0) {
      pickups.splice(i, 1);
      continue;
    }
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < 42) {
      if (p.kind === 'cash') {
        player.cash += p.amount;
      } else if (p.kind === 'armor') {
        player.armor = Math.min(100, player.armor + 35);
      }
      pickups.splice(i, 1);
    }
  }
}

export function damagePedestrian(state, npc, amount, impulseX = 0, impulseY = 0) {
  if (npc.dead) return;
  npc.hp -= amount;
  if (!npc.isVendor) {
    npc.x += impulseX * 0.03;
    npc.y += impulseY * 0.03;
  }

  // Trigger panic / ducking in nearby civilians & vendors
  alertNearbyCivilians(state, npc.x, npc.y, 260);

  if (npc.hp <= 0) {
    npc.dead = true;
    state.pickups.push({
      x: npc.x,
      y: npc.y,
      z: 3,
      kind: 'cash',
      amount: npc.cashReward || 150,
      life: 18,
      phase: 0
    });
  }
}
