import { resolveCircleBuildingCollisions } from './city-map.js';

let nextNpcId = 1;

const CIVILIAN_OUTFITS = [
  { jacket: '#ff2a85', shirt: '#00f0ff', pants: '#1e293b' },
  { jacket: '#00f0ff', shirt: '#fde047', pants: '#0f172a' },
  { jacket: '#a855f7', shirt: '#f472b6', pants: '#1e1b4b' },
  { jacket: '#f97316', shirt: '#ffffff', pants: '#1e293b' },
  { jacket: '#10b981', shirt: '#fef08a', pants: '#0f172a' }
];

export function createPedestrian(x, y, role = 'civilian', overrides = {}) {
  const outfit =
    CIVILIAN_OUTFITS[nextNpcId % CIVILIAN_OUTFITS.length];
  const isHostile = role === 'syndicate' || role === 'police';
  return {
    id: `npc_${nextNpcId++}`,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    role,
    hostile: isHostile,
    hp: role === 'syndicate' ? 110 : role === 'police' ? 95 : 55,
    maxHp: role === 'syndicate' ? 110 : role === 'police' ? 95 : 55,
    speed: isHostile ? 98 : 48,
    walkPhase: Math.random() * 10,
    fireCooldown: 0.4 + Math.random() * 0.6,
    muzzleTimer: 0,
    panicTimer: 0,
    cashReward: role === 'syndicate' ? 650 : role === 'police' ? 250 : 120,
    jacketColor:
      role === 'police'
        ? '#0f172a'
        : role === 'syndicate'
          ? '#991b1b'
          : outfit.jacket,
    shirtColor:
      role === 'police'
        ? '#38bdf8'
        : role === 'syndicate'
          ? '#fde047'
          : outfit.shirt,
    pantsColor: outfit.pants,
    hasWeapon: isHostile,
    dead: false,
    ...overrides
  };
}

export function spawnInitialPedestrians(cityMap) {
  const list = [];
  for (let i = 0; i < 42; i++) {
    const rx = cityMap.verticalRoads[i % cityMap.verticalRoads.length];
    const side = i % 2 === 0 ? -56 : 56;
    const y = 380 + ((i * 211) % 2750);
    list.push(createPedestrian(rx + side, y, 'civilian'));
  }
  return list;
}

export function updatePedestrians(state, dt) {
  const { player, pedestrians, cityMap, projectiles, pickups } = state;

  for (const npc of pedestrians) {
    if (npc.dead) continue;
    npc.muzzleTimer = Math.max(0, npc.muzzleTimer - dt);
    npc.fireCooldown = Math.max(0, npc.fireCooldown - dt);

    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const dist = Math.hypot(dx, dy);

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

      // Hostile fire at player
      if (dist < 430 && npc.fireCooldown <= 0) {
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
    } else {
      // Civilian sidewalk stroll or panic flee
      if (npc.panicTimer > 0) {
        npc.panicTimer = Math.max(0, npc.panicTimer - dt);
        npc.angle = Math.atan2(-dy, -dx);
        npc.vx = Math.cos(npc.angle) * 115;
        npc.vy = Math.sin(npc.angle) * 115;
      } else {
        npc.vx = Math.cos(npc.angle) * npc.speed;
        npc.vy = Math.sin(npc.angle) * npc.speed;
        if (Math.random() < 0.012) {
          npc.angle += (Math.random() - 0.5) * 1.4;
        }
      }
    }

    npc.x += npc.vx * dt;
    npc.y += npc.vy * dt;
    const moveSpd = Math.hypot(npc.vx, npc.vy);
    npc.walkPhase += moveSpd * dt * 0.14;

    const hitWall = resolveCircleBuildingCollisions(npc, 8, cityMap.buildings);
    if (hitWall && !npc.hostile) {
      npc.angle += Math.PI * 0.5;
    }

    // Vehicle roadkill check if player is driving fast
    if (player.vehicle && player.vehicle.speed > 130 && dist < 24) {
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
  npc.x += impulseX * 0.03;
  npc.y += impulseY * 0.03;

  // Trigger panic in nearby civilians
  for (const other of state.pedestrians) {
    if (!other.hostile && Math.hypot(other.x - npc.x, other.y - npc.y) < 260) {
      other.panicTimer = 5.5;
    }
  }

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
