import { VEHICLE_TYPES, GEAR_THRESHOLDS } from './config.js';
import {
  resolveCircleBuildingCollisions,
  resolveCircleProps,
  resolveCircleOBBCollision,
  resolveOBBvsBuildings,
  resolveOBBvsOBB,
  getGroundHeightAt
} from './city-map.js';
import { closeShopModal } from './shops-economy.js';
import { createPedestrian, handleVehiclePedestrianContacts } from './pedestrians.js';
import { addCrimeHeat } from './police-wanted.js';
import { triggerExplosion } from './combat-weapons.js';
import { damagePlayer, ensureCareerStats } from './player-vitals.js';

let nextVehicleId = 1;

export function createVehicle(typeId, x, y, angle = 0, overrides = {}) {
  const spec = VEHICLE_TYPES[typeId] || VEHICLE_TYPES.apex_gt;
  return {
    id: `veh_${nextVehicleId++}`,
    typeId: spec.id,
    name: spec.name,
    category: spec.category,
    width: spec.width,
    length: spec.length,
    height: spec.height,
    maxSpeed: spec.maxSpeed,
    accel: spec.accel,
    brake: spec.brake,
    turnRate: spec.turnRate,
    driftGrip: spec.driftGrip,
    maxHp: spec.maxHp,
    hp: spec.maxHp,
    mass: spec.isHeavy ? 2.4 : spec.isPolice ? 1.3 : 1.0,
    color: overrides.color || spec.color,
    stripeColor: overrides.stripeColor || spec.stripeColor,
    hasSpoiler: Boolean(spec.hasSpoiler),
    isConvertible: Boolean(spec.isConvertible),
    isPolice: Boolean(spec.isPolice),
    isTaxi: Boolean(spec.isTaxi),
    isCommercialVan: Boolean(spec.isCommercialVan),
    isHeavy: Boolean(spec.isHeavy),
    value: spec.value,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    angle,
    steerAngle: 0,
    wheelSpin: 0,
    gear: 1,
    rpm: 0.22,
    shiftDipTimer: 0,
    prevThrottle: 0,
    braking: false,
    slipIntensity: 0,
    bodyRoll: 0,
    bodyPitch: 0,
    suspBounce: 0,
    suspVel: 0,
    crashCooldown: 0,
    scrapeCooldown: 0,
    skidAccum: 0,
    nitro: 100,
    nitroActive: false,
    drifting: false,
    driver: overrides.driver || null,
    aiRole: overrides.aiRole || 'traffic',
    isCurbParked: Boolean(overrides.isCurbParked),
    roadX: overrides.roadX || x,
    targetX: x,
    targetY: y,
    sirenPhase: Math.random() * 10,
    onFire: false,
    fireTimer: 0,
    smokeTimer: 0,
    fireAlarmCooldown: 0,
    officersDeployed: 0,
    destroyed: false,
    ...overrides
  };
}

export function spawnInitialVehicles(cityMap) {
  const list = [];

  // 1. Hero Apex V8 GT Supercar on Ocean Drive Northbound Lane
  list.push(
    createVehicle('apex_gt', 2734, 2120, -Math.PI * 0.5, {
      aiRole: 'player_starter'
    })
  );

  // 2. Exotic parked supercars at Starfish Marina Safehouse & Neon Strip
  list.push(
    createVehicle('comet_cabrio', 2535, 835, -Math.PI * 0.35, { aiRole: 'parked', isCurbParked: true }),
    createVehicle('apex_gt', 2465, 845, -Math.PI * 0.65, {
      color: '#b6ad9d',
      stripeColor: '#2d343e',
      aiRole: 'parked',
      isCurbParked: true
    }),
    createVehicle('stinger_muscle', 1895, 2020, -Math.PI * 0.5, { aiRole: 'parked', isCurbParked: true })
  );

  // 3. Neatly parked curbside cars across major avenues (clear of traffic lanes & shop doors)
  if (cityMap.parkedBays) {
    for (const bay of cityMap.parkedBays) {
      const overrides = { aiRole: 'parked', isCurbParked: true, driver: null };
      if (bay.color) overrides.color = bay.color;
      list.push(createVehicle(bay.typeId, bay.x, bay.y, bay.angle, overrides));
    }
  }

  // 4. Lively, well-spaced moving metropolitan traffic across boulevards (18–20 active traffic cars)
  const trafficTypes = [
    'city_taxi',
    'eclipse_sedan',
    'comet_cabrio',
    'delivery_van',
    'stinger_muscle',
    'city_taxi',
    'bison_suv',
    'apex_gt'
  ];

  const trafficRoads = [896, 1216, 1536, 1856, 2176, 2496, 2720];
  let idx = 0;
  let trafficCount = 0;
  const maxAmbientTraffic = 19;

  for (let rIdx = 0; rIdx < trafficRoads.length && trafficCount < maxAmbientTraffic; rIdx++) {
    const rx = trafficRoads[rIdx];
    const yStart = 440 + (rIdx % 3) * 210;
    for (let y = yStart; y <= 2840 && trafficCount < maxAmbientTraffic; y += 780) {
      if (Math.abs(rx - 2720) < 20 && Math.abs(y - 2120) < 230) continue;
      const tId = trafficTypes[idx % trafficTypes.length];
      const dir = (idx + rIdx) % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      // Cleanly separated right-hand lanes (Ocean Drive: 2706 / 2734; inland avenues: rx ± 13)
      const laneX =
        rx === 2720 ? (dir > 0 ? 2706 : 2734) : rx + (dir > 0 ? -13 : 13);
      const tooClose = list.some((other) => Math.hypot(other.x - laneX, other.y - y) < 185);
      if (tooClose) {
        idx++;
        continue;
      }
      const v = createVehicle(tId, laneX, y, dir, {
        aiRole: 'traffic',
        driver: 'civilian',
        roadX: rx
      });
      v.speed = tId === 'delivery_van' ? 92 : 114;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      list.push(v);
      idx++;
      trafficCount++;
    }
  }

  return list;
}

function spawnSkidPair(state, v) {
  if (!state.skidMarks) state.skidMarks = [];
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  const rearX = v.x - cos * (v.length * 0.31);
  const rearY = v.y - sin * (v.length * 0.31);
  const trackHalfW = v.width * 0.38;
  for (const side of [-1, 1]) {
    state.skidMarks.push({
      x: rearX - sin * trackHalfW * side,
      y: rearY + cos * trackHalfW * side,
      angle: v.angle,
      length: 5.5,
      width: 2.3,
      life: 7.5,
      maxLife: 7.5
    });
  }
  if (state.skidMarks.length > 160) {
    state.skidMarks.splice(0, state.skidMarks.length - 160);
  }
}

function updateKnockedProps(cityMap, dt) {
  if (!cityMap || !cityMap.propColliders) return;
  for (const p of cityMap.propColliders) {
    if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);
    if (!p.knocked) continue;
    if (p.tilt < 1.48) {
      p.kx += p.kvx * dt;
      p.ky += p.kvy * dt;
      p.kz += p.kvz * dt;
      p.kvz -= 220 * dt;
      p.kvx *= Math.exp(-2.8 * dt);
      p.kvy *= Math.exp(-2.8 * dt);
      p.tilt = Math.min(1.48, p.tilt + 5.8 * dt);
      if (p.kz <= (p.z || 0)) {
        p.kz = p.z || 0;
        p.kvz = Math.abs(p.kvz) > 25 ? -p.kvz * 0.28 : 0;
      }
    }
  }
}

function resolveVehicleVsProps(state, v, isPlayer) {
  const props = state.cityMap && state.cityMap.propColliders;
  if (!props) return;
  const hl = (v.length || 50) * 0.5;
  const hw = (v.width || 24) * 0.5;
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);

  for (const p of props) {
    if (p.knocked) continue;
    const dx = p.x - v.x;
    const dy = p.y - v.y;
    const maxR = hl + hw + p.radius;
    if (dx * dx + dy * dy > maxR * maxR) continue;

    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    const cx = Math.max(-hl, Math.min(hl, lx));
    const cy = Math.max(-hw, Math.min(hw, ly));
    const offX = lx - cx;
    const offY = ly - cy;
    const dSq = offX * offX + offY * offY;
    if (dSq >= p.radius * p.radius) continue;

    if (p.breakable && v.speed > 72) {
      p.knocked = true;
      const spdScale = Math.min(1.0, v.speed / 240);
      p.kvx = v.vx * 0.65 + (p.x - v.x) * 1.8;
      p.kvy = v.vy * 0.65 + (p.y - v.y) * 1.8;
      p.kvz = 36 + spdScale * 48;
      p.tiltAxisAngle = Math.atan2(v.vy || sin, v.vx || cos);
      v.vx *= 0.91;
      v.vy *= 0.91;
      v.speed = Math.hypot(v.vx, v.vy);
      v.suspVel += 8;

      if (state.particles) {
        const isHydrant = p.kind === 'hydrant';
        for (let k = 0; k < (isHydrant ? 10 : 5); k++) {
          state.particles.push({
            x: p.x + (Math.random() - 0.5) * 4,
            y: p.y + (Math.random() - 0.5) * 4,
            z: isHydrant ? 4 + k * 2 : 3,
            vx: (Math.random() - 0.5) * 70,
            vy: (Math.random() - 0.5) * 70,
            vz: isHydrant ? 55 + Math.random() * 55 : 22 + Math.random() * 30,
            size: isHydrant ? 3.2 : 2.1,
            color: isHydrant ? '#bfe3f2' : '#f2c96d',
            life: isHydrant ? 0.55 : 0.25,
            maxLife: isHydrant ? 0.55 : 0.25,
            kind: isHydrant ? 'smoke' : 'spark'
          });
        }
      }
      if (isPlayer) {
        state.camera.trauma = Math.min(1, state.camera.trauma + 0.14);
      }
      if (state.audio && state.audio.playPropHit && (isPlayer || Math.hypot(p.x - state.player.x, p.y - state.player.y) < 360)) {
        state.audio.playPropHit(p.kind, p.x, p.y);
      }
    } else {
      const dist = Math.sqrt(dSq) || 0.001;
      const pen = p.radius - dist;
      const nLx = dist > 0.001 ? -offX / dist : lx >= 0 ? -1 : 1;
      const nLy = dist > 0.001 ? -offY / dist : 0;
      const nx = cos * nLx - sin * nLy;
      const ny = sin * nLx + cos * nLy;
      v.x += nx * pen;
      v.y += ny * pen;
      const vn = -(v.vx * nx + v.vy * ny);
      if (vn > 0) {
        v.vx += nx * vn * 1.2;
        v.vy += ny * vn * 1.2;
        v.speed = Math.hypot(v.vx, v.vy);
        if (vn > 45 && v.crashCooldown <= 0) {
          v.crashCooldown = 0.18;
          v.suspVel += Math.min(12, vn * 0.05);
          if (isPlayer) {
            state.camera.trauma = Math.min(1, state.camera.trauma + Math.min(0.28, vn / 420));
          }
          if (state.audio && state.audio.playCrash && (isPlayer || Math.hypot(v.x - state.player.x, v.y - state.player.y) < 360)) {
            state.audio.playCrash(Math.min(1, vn / 260), v.x, v.y);
          }
        }
      }
    }
  }
}

export function updateVehicles(state, dt) {
  const { player, input, vehicles, cityMap } = state;
  const colliders = cityMap.colliders || cityMap.buildings;

  updateKnockedProps(cityMap, dt);

  if (state.skidMarks) {
    for (let i = state.skidMarks.length - 1; i >= 0; i--) {
      state.skidMarks[i].life -= dt;
      if (state.skidMarks[i].life <= 0) {
        state.skidMarks.splice(i, 1);
      }
    }
  }

  for (const v of vehicles) {
    if (v.destroyed) continue;
    v.sirenPhase += dt * 9;
    v.crashCooldown = Math.max(0, (v.crashCooldown || 0) - dt);
    v.scrapeCooldown = Math.max(0, (v.scrapeCooldown || 0) - dt);
    v.shiftDipTimer = Math.max(0, (v.shiftDipTimer || 0) - dt);

    const isPlayer = player.vehicle === v;
    if (isPlayer) {
      updatePlayerDrivenVehicle(state, v, input, dt);
      if (v.speed > 1 && !state.startScreenOpen && !state.outcome) {
        ensureCareerStats(state).distanceDrivenMeters += v.speed * dt * 0.25;
      }
    } else if (v.isPolice && (v.aiRole === 'police_pursuit' || v.aiRole === 'police_patrol')) {
      // Velocity was set by updatePoliceSystem; advance via shared substepped collision below
    } else if (v.aiRole === 'traffic' && v.driver === 'civilian') {
      updateTrafficVehicleAI(v, vehicles, player, cityMap, dt);
    } else if (v.aiRole === 'convoy') {
      updateConvoyVehicleAI(v, dt);
    } else {
      v.vx *= Math.exp(-4.5 * dt);
      v.vy *= Math.exp(-4.5 * dt);
      if (Math.hypot(v.vx, v.vy) < 1.5) {
        v.vx = 0;
        v.vy = 0;
      }
      v.speed = Math.hypot(v.vx, v.vy);
      v.nitroActive = false;
      v.drifting = false;
      v.braking = false;
      v.slipIntensity = 0;
      v.rpm = Math.max(0, (v.rpm || 0) * Math.exp(-3 * dt));
    }

    // Substepped integration & OBB building/prop/pedestrian collisions (no step > 3.5 units -> zero tunneling!)
    const moveDist = Math.hypot(v.vx * dt, v.vy * dt);
    const steps = Math.max(1, Math.min(16, Math.ceil(moveDist / 3.5)));
    const subDt = dt / steps;
    let maxWallImpact = 0;
    let wallHitNx = 0;
    let wallHitNy = 0;

    for (let step = 0; step < steps; step++) {
      v.x += v.vx * subDt;
      v.y += v.vy * subDt;

      const bRes = resolveOBBvsBuildings(v, colliders);
      if (bRes.hit) {
        const vn = -(v.vx * bRes.nx + v.vy * bRes.ny);
        if (vn > 0) {
          const rest = vn > 110 ? 0.26 : 0.08;
          v.vx += bRes.nx * vn * (1 + rest);
          v.vy += bRes.ny * vn * (1 + rest);
          const tx = -bRes.ny;
          const ty = bRes.nx;
          const vt = v.vx * tx + v.vy * ty;
          const scrapeDamp = Math.max(0.75, 1 - 0.12 * Math.min(1, vn / 140));
          v.vx = (v.vx - tx * vt) + tx * vt * scrapeDamp;
          v.vy = (v.vy - ty * vt) + ty * vt * scrapeDamp;
          if (vn > maxWallImpact) {
            maxWallImpact = vn;
            wallHitNx = bRes.nx;
            wallHitNy = bRes.ny;
          }
        } else if (isPlayer && v.speed > 65 && v.scrapeCooldown <= 0) {
          v.scrapeCooldown = 0.06;
          if (state.particles) {
            state.particles.push({
              x: v.x - bRes.nx * (v.width * 0.45),
              y: v.y - bRes.ny * (v.width * 0.45),
              z: 4.5,
              vx: -v.vx * 0.25 + (Math.random() - 0.5) * 60,
              vy: -v.vy * 0.25 + (Math.random() - 0.5) * 60,
              vz: 24 + Math.random() * 26,
              size: 2.2,
              color: '#f5ca64',
              life: 0.22,
              maxLife: 0.22,
              kind: 'spark'
            });
          }
        }
      }

      if (v.speed > 5 || isPlayer) {
        resolveVehicleVsProps(state, v, isPlayer);
      }

      if (v.speed > 25 && (isPlayer || v.isPolice || Math.hypot(v.x - player.x, v.y - player.y) < 420)) {
        handleVehiclePedestrianContacts(state, v);
      }
    }

    if (maxWallImpact > 42 && v.crashCooldown <= 0) {
      v.crashCooldown = 0.16;
      v.suspVel += Math.min(14, maxWallImpact * 0.06);
      if (isPlayer) {
        state.camera.trauma = Math.min(1, state.camera.trauma + Math.min(0.45, maxWallImpact / 360));
        v.hp = Math.max(1, v.hp - maxWallImpact * 0.045);
      }
      if (state.particles) {
        const sparkX = v.x - wallHitNx * (v.length * 0.35);
        const sparkY = v.y - wallHitNy * (v.length * 0.35);
        for (let k = 0; k < 7; k++) {
          state.particles.push({
            x: sparkX + (Math.random() - 0.5) * 6,
            y: sparkY + (Math.random() - 0.5) * 6,
            z: 4.5,
            vx: wallHitNx * 65 + (Math.random() - 0.5) * 90,
            vy: wallHitNy * 65 + (Math.random() - 0.5) * 90,
            vz: 26 + Math.random() * 40,
            size: 2.3,
            color: '#f5ca64',
            life: 0.26,
            maxLife: 0.26,
            kind: 'spark'
          });
        }
      }
      if (state.audio && state.audio.playCrash && (isPlayer || Math.hypot(v.x - player.x, v.y - player.y) < 380)) {
        state.audio.playCrash(Math.min(1, maxWallImpact / 280), v.x, v.y);
      }
    }

    v.speed = Math.hypot(v.vx, v.vy);
    const forwardDot = v.vx * Math.cos(v.angle) + v.vy * Math.sin(v.angle);
    const wheelRadius = v.isHeavy ? 4.4 : 3.7;
    v.wheelSpin += (forwardDot * dt) / wheelRadius;

    // Suspension bounce spring-damper
    const springF = -95 * (v.suspBounce || 0) - 13 * (v.suspVel || 0);
    v.suspVel = (v.suspVel || 0) + springF * dt;
    v.suspBounce = Math.max(-1.6, Math.min(1.6, (v.suspBounce || 0) + v.suspVel * dt));

    // Progressive Vehicle Damage Stages: Smoke (<35%) -> Fire (<16% + 3.2s bailout) -> Explosion
    const hpRatio = v.hp / (v.maxHp || 280);
    if (hpRatio >= 0.16 && v.onFire) {
      v.onFire = false;
      v.fireTimer = 0;
    }
    const hoodX = v.x + Math.cos(v.angle) * ((v.length || 50) * 0.34);
    const hoodY = v.y + Math.sin(v.angle) * ((v.length || 50) * 0.34);
    const hoodZ = (v.z || 0) + (v.height || 14) * 0.62;

    if (hpRatio < 0.35 && hpRatio >= 0.16) {
      v.smokeTimer = (v.smokeTimer || 0) - dt;
      if (v.smokeTimer <= 0 && state.particles) {
        v.smokeTimer = 0.085;
        state.particles.push({
          x: hoodX + (Math.random() - 0.5) * 5,
          y: hoodY + (Math.random() - 0.5) * 5,
          z: hoodZ,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.5) * 14,
          vz: 24 + Math.random() * 14,
          size: 4.8,
          color: '#6b7280',
          life: 0.72,
          maxLife: 0.72,
          kind: 'smoke'
        });
      }
    } else if (hpRatio < 0.16 && !state.isShowcaseShot) {
      if (!v.onFire) {
        v.onFire = true;
        v.fireTimer = 3.2;
        v.fireAlarmCooldown = 0;
        if (v.driver && v.driver !== 'player' && state.pedestrians) {
          const bailAng = v.angle - Math.PI * 0.5;
          const bx = v.x + Math.cos(bailAng) * ((v.width || 24) * 0.5 + 13);
          const by = v.y + Math.sin(bailAng) * ((v.width || 24) * 0.5 + 13);
          const npc = createPedestrian(bx, by, v.isPolice ? 'police' : 'civilian', {
            angle: bailAng,
            panicTimer: 6.0,
            shoveTimer: 0.35,
            vx: Math.cos(bailAng) * 85,
            vy: Math.sin(bailAng) * 85
          });
          resolveCircleBuildingCollisions(npc, 9, colliders);
          state.pedestrians.push(npc);
          v.aiRole = 'parked';
          v.driver = null;
        }
      }

      v.fireTimer = Math.max(0, (v.fireTimer ?? 3.2) - dt);

      if (state.particles) {
        state.particles.push({
          x: hoodX + (Math.random() - 0.5) * 6,
          y: hoodY + (Math.random() - 0.5) * 6,
          z: hoodZ + 1.5,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          vz: 34 + Math.random() * 20,
          size: 4.2,
          color: Math.random() < 0.55 ? '#f27c2c' : '#f5be54',
          life: 0.28,
          maxLife: 0.28,
          kind: 'fireball'
        });
        state.particles.push({
          x: hoodX + (Math.random() - 0.5) * 8,
          y: hoodY + (Math.random() - 0.5) * 8,
          z: hoodZ + 5.5,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          vz: 42 + Math.random() * 18,
          size: 6.2,
          color: '#2d3138',
          life: 0.65,
          maxLife: 0.65,
          kind: 'smoke_heavy'
        });
      }

      if (isPlayer) {
        v.fireAlarmCooldown = (v.fireAlarmCooldown || 0) - dt;
        if (v.fireAlarmCooldown <= 0) {
          v.fireAlarmCooldown = 0.45;
          if (state.audio && state.audio.playFireAlarmTick) {
            state.audio.playFireAlarmTick();
          }
        }
      }

      if (v.fireTimer <= 0) {
        const playerInside = player.vehicle === v;
        v.hp = 0;
        v.destroyed = true;
        v.onFire = false;
        v.color = '#1e293b';
        v.stripeColor = '#334155';
        if (playerInside) {
          damagePlayer(state, 115, 'explosion');
        }
        triggerExplosion(state, v.x, v.y, 8, 120, 260, { skipPlayerBlast: playerInside });
      }
    }
  }

  // Exact multi-pass OBB-to-OBB Vehicle collision resolution (zero overlapping/stacking or building tunneling)
  for (let pass = 0; pass < 4; pass++) {
    let anyPairHit = false;
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      if (a.destroyed) continue;
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        if (b.destroyed) continue;
        if (a.isCurbParked && b.isCurbParked && a.speed < 1 && b.speed < 1) continue;

        const res = resolveOBBvsOBB(
          a.x,
          a.y,
          a.angle,
          (a.length || 50) * 0.5,
          (a.width || 24) * 0.5,
          b.x,
          b.y,
          b.angle,
          (b.length || 50) * 0.5,
          (b.width || 24) * 0.5
        );
        if (!res || res.overlap <= 0.001) continue;

        anyPairHit = true;
        const { nx, ny, overlap } = res;
        const aIsPlayer = player.vehicle === a;
        const bIsPlayer = player.vehicle === b;

        if (a.isCurbParked && !b.isCurbParked && !bIsPlayer && a.speed < 2) {
          b.x += nx * overlap;
          b.y += ny * overlap;
          resolveOBBvsBuildings(b, colliders);
        } else if (b.isCurbParked && !a.isCurbParked && !aIsPlayer && b.speed < 2) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          resolveOBBvsBuildings(a, colliders);
        } else {
          a.isCurbParked = false;
          b.isCurbParked = false;
          const invMa = 1 / (a.mass || 1);
          const invMb = 1 / (b.mass || 1);
          const invSum = invMa + invMb;
          a.x -= nx * overlap * (invMa / invSum);
          a.y -= ny * overlap * (invMa / invSum);
          b.x += nx * overlap * (invMb / invSum);
          b.y += ny * overlap * (invMb / invSum);

          resolveOBBvsBuildings(a, colliders);
          resolveOBBvsBuildings(b, colliders);

          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const impact = relVx * nx + relVy * ny;
          if (impact > 0) {
            const restitution = 0.34;
            const jImp = ((1 + restitution) * impact) / invSum;
            a.vx -= nx * jImp * invMa;
            a.vy -= ny * jImp * invMa;
            b.vx += nx * jImp * invMb;
            b.vy += ny * jImp * invMb;
            a.speed = Math.hypot(a.vx, a.vy);
            b.speed = Math.hypot(b.vx, b.vy);

            if (impact > 42 && (a.crashCooldown <= 0 || b.crashCooldown <= 0)) {
              a.crashCooldown = 0.16;
              b.crashCooldown = 0.16;
              a.suspVel += 6;
              b.suspVel += 6;
              const hitX = (a.x + b.x) * 0.5;
              const hitY = (a.y + b.y) * 0.5;
              if (aIsPlayer || bIsPlayer) {
                state.camera.trauma = Math.min(1, state.camera.trauma + Math.min(0.45, impact / 320));
              }
              if (state.particles && impact > 65) {
                for (let k = 0; k < 6; k++) {
                  state.particles.push({
                    x: hitX + (Math.random() - 0.5) * 6,
                    y: hitY + (Math.random() - 0.5) * 6,
                    z: 5,
                    vx: (Math.random() - 0.5) * 110,
                    vy: (Math.random() - 0.5) * 110,
                    vz: 24 + Math.random() * 32,
                    size: 2.2,
                    color: '#f5ca64',
                    life: 0.24,
                    maxLife: 0.24,
                    kind: 'spark'
                  });
                }
              }
              if (state.audio && state.audio.playCrash && (aIsPlayer || bIsPlayer || Math.hypot(hitX - player.x, hitY - player.y) < 380)) {
                state.audio.playCrash(Math.min(1, impact / 240), hitX, hitY);
              }
            }
          }
        }
      }
    }
    if (!anyPairHit) break;
  }

  // Hard post-OBB anti-beach safeguard: guarantee zero AI traffic cars ever sit or drive on boardwalk/beach
  for (const v of vehicles) {
    if (v.destroyed || v.aiRole !== 'traffic' || player.vehicle === v) continue;
    if (isTrafficVehicleOnBeachOrBoardwalk(v)) {
      rescueTrafficOffBeach(v, vehicles, player, cityMap);
    }
  }

  // Sync player world position to active vehicle
  if (player.vehicle) {
    player.x = player.vehicle.x;
    player.y = player.vehicle.y;
    player.z = player.vehicle.z || 0;
    player.angle = player.vehicle.angle;
  }

  if (state.payNsprayCooldown > 0) {
    state.payNsprayCooldown = Math.max(0, state.payNsprayCooldown - dt);
  }
}

function updatePlayerDrivenVehicle(state, v, input, dt) {
  const modalOpen = Boolean(
    state.outcome ||
      state.startScreenOpen ||
      (state.shopModal && state.shopModal.open) ||
      state.safehouseModalOpen ||
      (state.nightlife &&
        (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session))
  );
  const throttle = modalOpen
    ? 0
    : (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) -
      (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
  const steerInput = modalOpen
    ? 0
    : (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) -
      (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
  const handbrake = modalOpen ? true : Boolean(input.keys.Space);
  const wantNitro = !modalOpen && Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);

  v.steerAngle += (steerInput * 0.44 - v.steerAngle) * Math.min(1, 12 * dt);
  v.isCurbParked = false;

  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  let forwardSpeed = v.vx * cos + v.vy * sin;
  let lateralSpeed = -v.vx * sin + v.vy * cos;

  // Nitro boost
  if (wantNitro && v.nitro > 4 && throttle > 0) {
    v.nitroActive = true;
    v.nitro = Math.max(0, v.nitro - 28 * dt);
    forwardSpeed += v.accel * 1.55 * dt;
  } else {
    v.nitroActive = false;
    v.nitro = Math.min(100, v.nitro + 12 * dt);
  }

  const maxSpd = v.nitroActive ? v.maxSpeed * 1.24 : v.maxSpeed;
  const speedRatio = Math.min(1.02, Math.abs(forwardSpeed) / maxSpd);
  const torque = 1.32 - 0.42 * speedRatio;

  if (throttle > 0) {
    v.braking = false;
    forwardSpeed += v.accel * torque * throttle * dt;
  } else if (throttle < 0) {
    if (forwardSpeed > 18) {
      v.braking = true;
      forwardSpeed -= v.brake * 1.28 * dt;
    } else {
      v.braking = false;
      forwardSpeed += v.accel * 0.68 * throttle * dt;
    }
  } else {
    v.braking = false;
    // Rolling resistance + subtle aerodynamic drag
    forwardSpeed -=
      forwardSpeed * 1.15 * dt +
      Math.sign(forwardSpeed) * forwardSpeed * forwardSpeed * 0.00085 * dt;
  }

  if (handbrake) {
    forwardSpeed *= Math.exp(-1.9 * dt);
  }

  forwardSpeed = Math.max(-maxSpd * 0.40, Math.min(maxSpd, forwardSpeed));

  // Auto gear + RPM model with shift dips
  let targetGear = 1;
  for (let g = 1; g < GEAR_THRESHOLDS.length; g++) {
    if (speedRatio >= GEAR_THRESHOLDS[g]) targetGear = g + 1;
  }
  targetGear = Math.min(v.maxSpeed >= 380 ? 6 : 5, targetGear);
  if (targetGear > (v.gear || 1) && forwardSpeed > 30) {
    v.shiftDipTimer = 0.13;
  }
  v.gear = forwardSpeed < -10 ? 0 : targetGear;

  const bandLow = GEAR_THRESHOLDS[Math.max(0, targetGear - 1)] || 0;
  const bandHigh = GEAR_THRESHOLDS[Math.min(GEAR_THRESHOLDS.length - 1, targetGear)] || 1;
  const bandNorm = Math.max(0, Math.min(1, (speedRatio - bandLow) / Math.max(0.08, bandHigh - bandLow)));
  const targetRpm =
    0.20 +
    bandNorm * 0.74 +
    (throttle > 0 ? 0.08 : 0) -
    (v.shiftDipTimer > 0 ? 0.24 : 0);
  v.rpm += (Math.max(0.16, Math.min(1.0, targetRpm)) - (v.rpm || 0.2)) * Math.min(1, 14 * dt);

  // Exhaust pop on high-RPM throttle lift-off
  if (v.prevThrottle > 0.35 && throttle <= 0 && v.rpm > 0.62) {
    if (state.audio && state.audio.playExhaustPop) {
      state.audio.playExhaustPop(v.x, v.y);
    }
  }
  v.prevThrottle = throttle;

  // Speed-sensitive steering (nimble at low speed, steady at 400+ top speed)
  const lowSpeedFactor = Math.min(1, Math.abs(forwardSpeed) / 72);
  const highSpeedTaper = 1 / (1 + Math.abs(forwardSpeed) * 0.0018);
  const dirSign = forwardSpeed >= -5 ? 1 : -1;
  const turnMult = handbrake ? 1.32 : 1.0;
  v.angle += steerInput * v.turnRate * lowSpeedFactor * highSpeedTaper * dirSign * turnMult * dt;

  // Lateral grip & drift slip
  const grip = handbrake ? 2.25 : 9.2 * v.driftGrip;
  lateralSpeed *= Math.exp(-grip * dt);
  v.slipIntensity = Math.min(1, Math.max(0, (Math.abs(lateralSpeed) - 24) / 86));
  if (v.braking && Math.abs(forwardSpeed) > 130) {
    v.slipIntensity = Math.max(v.slipIntensity, 0.45);
  }
  v.drifting =
    (handbrake && Math.abs(forwardSpeed) > 85) || Math.abs(lateralSpeed) > 42;

  const nCos = Math.cos(v.angle);
  const nSin = Math.sin(v.angle);
  v.vx = nCos * forwardSpeed - nSin * lateralSpeed;
  v.vy = nSin * forwardSpeed + nCos * lateralSpeed;
  v.speed = Math.hypot(v.vx, v.vy);

  // Smooth visual body roll & squat/dive pitch
  const targetRoll =
    Math.max(-0.16, Math.min(0.16, ((steerInput * forwardSpeed) / 360) * 0.13 + (lateralSpeed / 180) * 0.08));
  const targetPitch =
    (throttle > 0 ? 0.028 : v.braking ? -0.048 : 0) + (v.nitroActive ? 0.024 : 0);
  v.bodyRoll += (targetRoll - (v.bodyRoll || 0)) * Math.min(1, 10 * dt);
  v.bodyPitch += (targetPitch - (v.bodyPitch || 0)) * Math.min(1, 10 * dt);

  // Skid marks & 3D tire drift smoke particles
  if (v.drifting || (v.braking && Math.abs(forwardSpeed) > 125)) {
    v.skidAccum = (v.skidAccum || 0) + v.speed * dt;
    if (v.skidAccum >= 4.2) {
      v.skidAccum = 0;
      spawnSkidPair(state, v);
    }
  }
  if ((v.drifting || v.nitroActive || v.slipIntensity > 0.3) && state.particles) {
    state.particles.push({
      x: v.x - nCos * (v.length * 0.42) + (Math.random() - 0.5) * 10,
      y: v.y - nSin * (v.length * 0.42) + (Math.random() - 0.5) * 10,
      z: 2.2,
      vx: -v.vx * 0.16 + (Math.random() - 0.5) * 20,
      vy: -v.vy * 0.16 + (Math.random() - 0.5) * 20,
      vz: 10 + Math.random() * 14,
      size: v.nitroActive ? 4.4 : 5.6,
      color: v.nitroActive ? '#a8b7c4' : '#b8b6b0',
      life: 0.45,
      maxLife: 0.45,
      kind: 'smoke'
    });
  }
}

function isTrafficVehicleOnBeachOrBoardwalk(v) {
  if (!v) return false;
  if (v.x > 2758 && v.x < 3160) {
    const onCauseway = Math.abs(v.y - 896) < 42 || Math.abs(v.y - 1856) < 42;
    return !onCauseway;
  }
  return false;
}

function getTrafficLaneX(roadX, dir) {
  const isSouth = Math.sin(dir) > 0;
  return roadX === 2720 ? (isSouth ? 2706 : 2734) : roadX + (isSouth ? -13 : 13);
}

function hasVehicleClearance(vehicles, player, self, x, y, minDist = 165) {
  if (player && Math.hypot(player.x - x, player.y - y) < minDist) return false;
  for (const other of vehicles) {
    if (other === self || other.destroyed) continue;
    if (Math.hypot(other.x - x, other.y - y) < minDist) return false;
  }
  return true;
}

function getNearbyTrafficAvenues(playerX, cityMap) {
  if (playerX > 3050 && cityMap && cityMap.islandVerticalRoads) {
    return cityMap.islandVerticalRoads;
  }
  const all =
    cityMap && cityMap.verticalRoads
      ? cityMap.verticalRoads.filter((rx) => rx >= 576 && rx <= 2720)
      : [1536, 1856, 2176, 2496, 2720];
  return [...all].sort((a, b) => Math.abs(a - playerX) - Math.abs(b - playerX)).slice(0, 4);
}

function tryRelocateTrafficCleanly(v, vehicles, player, cityMap, avenues, minClearance = 165) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const rx = avenues[(attempt + Math.floor(Math.random() * avenues.length)) % avenues.length];
    const dir = Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;
    const candX = getTrafficLaneX(rx, dir);
    const maxY = rx > 3000 ? 1950 : 4580;
    const minY = rx > 3000 ? 540 : 340;
    const ySign = attempt % 2 === 0 ? 1 : -1;
    const candY = Math.max(
      minY,
      Math.min(maxY, player.y + ySign * (360 + Math.random() * 540))
    );
    if (hasVehicleClearance(vehicles, player, v, candX, candY, minClearance)) {
      v.roadX = rx;
      v.angle = dir;
      v.x = candX;
      v.y = candY;
      v.speed = v.isCommercialVan ? 92 : 112;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      return true;
    }
  }
  return false;
}

function rescueTrafficOffBeach(v, vehicles, player, cityMap) {
  const mainlandAves = [2496, 2176, 1856, 2720, 1536];
  if (tryRelocateTrafficCleanly(v, vehicles, player, cityMap, mainlandAves, 165)) {
    return true;
  }
  // Hard fallback: never remain on boardwalk/beach; place on clearest inland lane stopped
  for (const rx of [2496, 2176, 1856, 1536]) {
    const dir = -Math.PI * 0.5;
    const candX = getTrafficLaneX(rx, dir);
    for (const offY of [-520, 520, -820, 820, -280, 280]) {
      const candY = Math.max(360, Math.min(4500, player.y + offY));
      if (hasVehicleClearance(vehicles, player, v, candX, candY, 88)) {
        v.roadX = rx;
        v.angle = dir;
        v.x = candX;
        v.y = candY;
        v.speed = 0;
        v.vx = 0;
        v.vy = 0;
        return true;
      }
    }
  }
  v.roadX = 2496;
  v.angle = -Math.PI * 0.5;
  v.x = getTrafficLaneX(2496, v.angle);
  v.speed = 0;
  v.vx = 0;
  v.vy = 0;
  return true;
}

function updateTrafficVehicleAI(v, vehicles, player, cityMap, dt) {
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  let blocked = false;

  // Lookahead spacing against player
  const pdx = player.x - v.x;
  const pdy = player.y - v.y;
  const pDist = Math.hypot(pdx, pdy);
  if (pDist < 120 && (pdx * cos + pdy * sin) / (pDist || 1) > 0.72) {
    blocked = true;
  }

  // Lookahead spacing against all vehicles ahead in or crossing the lane
  if (!blocked) {
    for (const other of vehicles) {
      if (other === v || other.destroyed) continue;
      const odx = other.x - v.x;
      const ody = other.y - v.y;
      const forward = odx * cos + ody * sin;
      if (forward > 8 && forward < 105) {
        const lateral = Math.abs(-odx * sin + ody * cos);
        if (lateral < 20) {
          blocked = true;
          break;
        }
      }
    }
  }

  const targetSpeed = blocked ? 0 : v.isCommercialVan ? 92 : 114;
  const rate = blocked ? 5.8 : 3.4;
  v.speed += (targetSpeed - v.speed) * Math.min(1, rate * dt);
  if (blocked && v.speed < 2.5) {
    v.speed = 0;
    v.vx = 0;
    v.vy = 0;
  } else {
    v.vx = Math.cos(v.angle) * v.speed;
    v.vy = Math.sin(v.angle) * v.speed;
  }
  v.rpm = Math.min(0.75, 0.22 + (v.speed / v.maxSpeed) * 0.55);

  // Gentle lane-keeping lateral restoring force so moving AI traffic stays centered in its lane
  const rx = v.roadX || 2176;
  const isSouth = Math.sin(v.angle) >= 0;
  const targetDir = isSouth ? Math.PI * 0.5 : -Math.PI * 0.5;
  const laneX = getTrafficLaneX(rx, targetDir);
  if (v.speed > 4 && Math.abs(Math.sin(v.angle)) > 0.65) {
    v.x += (laneX - v.x) * Math.min(1, 2.4 * dt);
    let angDiff = ((targetDir - v.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    v.angle += angDiff * Math.min(1, 3.2 * dt);
    v.steerAngle = Math.max(-0.25, Math.min(0.25, angDiff));
  } else {
    v.steerAngle *= Math.exp(-6 * dt);
  }

  // Smooth U-turn at boulevard ends across expanded 5200x5120 city
  if (v.y > 4720) {
    v.angle = -Math.PI * 0.5;
    v.y = 4700;
    v.x = getTrafficLaneX(rx, v.angle);
  } else if (v.y < 250) {
    v.angle = Math.PI * 0.5;
    v.y = 260;
    v.x = getTrafficLaneX(rx, v.angle);
  }

  // Anti-beach safeguard before streaming check
  if (v.aiRole === 'traffic' && isTrafficVehicleOnBeachOrBoardwalk(v)) {
    rescueTrafficOffBeach(v, vehicles, player, cityMap);
    return;
  }

  // Smart multi-avenue traffic streaming with strict >=165 spacing check
  if (pDist > 1350 && v.aiRole === 'traffic') {
    const avenues = getNearbyTrafficAvenues(player.x, cityMap);
    tryRelocateTrafficCleanly(v, vehicles, player, cityMap, avenues, 165);
  }

  if (v.x > 3820) {
    v.angle = Math.PI;
    v.x = 3810;
  } else if (v.x < 240) {
    v.angle = 0;
    v.x = 250;
  }
}

function updateConvoyVehicleAI(v, dt) {
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  v.speed = 135;
  v.vx = cos * v.speed;
  v.vy = sin * v.speed;
  v.rpm = 0.52;
  if (v.x > 2450) v.angle = Math.PI;
  if (v.x < 450) v.angle = 0;
}

export function findNearestHijackableVehicle(player, vehicles, maxRadius = 78) {
  if (player.vehicle) return null;
  let best = null;
  let bestDist = maxRadius;
  for (const v of vehicles) {
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function tryToggleVehicle(state) {
  const { player, vehicles, cityMap } = state;
  if (state.shopModal && state.shopModal.open) {
    closeShopModal(state);
  }
  if (player.vehicle) {
    // Exit vehicle onto street side, safely resolving building/prop/vehicle clearance
    const v = player.vehicle;
    const exitSideAngle = v.angle - Math.PI * 0.5;
    const distOut = v.width * 0.5 + 11;
    player.x = v.x + Math.cos(exitSideAngle) * distOut;
    player.y = v.y + Math.sin(exitSideAngle) * distOut;
    player.z = getGroundHeightAt(player.x, player.y, 0);
    player.vz = 0;
    player.grounded = true;
    player.vx = 0;
    player.vy = 0;
    if (cityMap && (cityMap.colliders || cityMap.buildings)) {
      resolveCircleBuildingCollisions(player, 9, cityMap.colliders || cityMap.buildings);
      resolveCircleProps(player, 9, player.z, cityMap.propColliders);
    }
    resolveCircleOBBCollision(player, 9, v, false);
    player.vehicle = null;
    v.driver = null;
    v.nitroActive = false;
    v.drifting = false;
    v.braking = false;
    if (
      player.reloadTimer > 0 &&
      player.reloadingWeaponId !== 'pistol' &&
      player.reloadingWeaponId !== 'smg'
    ) {
      player.reloadTimer = 0;
      player.reloadingWeaponId = null;
    }
    if (state.audio && state.audio.onVehicleExit) {
      state.audio.onVehicleExit(v);
    }
    return { action: 'exit', vehicle: v };
  }

  const target = findNearestHijackableVehicle(player, vehicles, 82);
  if (target) {
    const hadAiDriver =
      (target.driver && target.driver !== 'player') ||
      target.aiRole === 'traffic' ||
      target.aiRole === 'police_pursuit' ||
      target.aiRole === 'police_patrol' ||
      target.aiRole === 'police_roadblock' ||
      target.aiRole === 'convoy';

    if (hadAiDriver && state.pedestrians) {
      const colliders = (cityMap && (cityMap.colliders || cityMap.buildings)) || [];
      const doorAng = target.angle - Math.PI * 0.5;
      const distOut = (target.width || 24) * 0.5 + 14;
      const ex = target.x + Math.cos(doorAng) * distOut;
      const ey = target.y + Math.sin(doorAng) * distOut;
      const driverRole = target.isPolice
        ? 'police'
        : target.driver === 'syndicate'
          ? 'syndicate'
          : 'civilian';
      const pulledNpc = createPedestrian(ex, ey, driverRole, {
        angle: doorAng,
        shoveTimer: 0.45,
        panicTimer: 5.5,
        vx: Math.cos(doorAng) * 95,
        vy: Math.sin(doorAng) * 95,
        vz: 18
      });
      resolveCircleBuildingCollisions(pulledNpc, 9, colliders);
      if (cityMap && cityMap.propColliders) {
        resolveCircleProps(pulledNpc, 9, 0, cityMap.propColliders);
      }
      state.pedestrians.push(pulledNpc);
      if (state.audio && state.audio.playNpcGrunt) {
        state.audio.playNpcGrunt(pulledNpc.voicePitch, pulledNpc.x, pulledNpc.y);
      }
      addCrimeHeat(
        state,
        target.isPolice ? 85 : 28,
        target.isPolice ? 'VCPD CRUISER HIJACKED' : 'GRAND THEFT AUTO REPORTED'
      );
    }

    if (target.aiRole !== 'player_starter' && target.aiRole !== 'player_stolen') {
      ensureCareerStats(state).carsStolen += 1;
      target.aiRole = 'player_stolen';
    }

    player.vehicle = target;
    player.x = target.x;
    player.y = target.y;
    player.z = target.z || 0;
    player.vz = 0;
    player.grounded = true;
    player.angle = target.angle;
    target.driver = 'player';
    target.isCurbParked = false;
    if (
      player.reloadTimer > 0 &&
      player.reloadingWeaponId !== 'pistol' &&
      player.reloadingWeaponId !== 'smg'
    ) {
      player.reloadTimer = 0;
      player.reloadingWeaponId = null;
    }
    if (state.camera) {
      state.camera.orbitIdleTimer = 2.0;
    }
    if (state.audio && state.audio.onVehicleEnter) {
      state.audio.onVehicleEnter(target);
    }
    return { action: 'enter', vehicle: target };
  }
  return null;
}
