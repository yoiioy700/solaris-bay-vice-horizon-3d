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
import { handleVehiclePedestrianContacts } from './pedestrians.js';

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

  // 4. Lively moving metropolitan traffic including Solaris City Cabs & Delivery Vans
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

  let idx = 0;
  for (const rx of cityMap.verticalRoads) {
    for (let y = 460; y <= 2960; y += 540) {
      if (Math.abs(rx - 2720) < 20 && Math.abs(y - 2120) < 190) continue;
      const tId = trafficTypes[idx % trafficTypes.length];
      const dir = idx % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      // Cleanly separated right-hand lanes (Ocean Drive: 2706 / 2734; inland avenues: rx ± 13)
      const laneX =
        rx === 2720 ? (dir > 0 ? 2706 : 2734) : rx + (dir > 0 ? -13 : 13);
      const v = createVehicle(tId, laneX, y, dir, {
        aiRole: 'traffic',
        driver: 'civilian',
        roadX: rx
      });
      v.speed = tId === 'delivery_van' ? 98 : 118;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      list.push(v);
      idx++;
      if (list.length >= 44) break;
    }
    if (list.length >= 44) break;
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
    } else if (v.isPolice && v.aiRole === 'police_pursuit') {
      // Velocity was set by updatePoliceSystem; advance via shared substepped collision below
    } else if (v.aiRole === 'traffic' && v.driver === 'civilian') {
      updateTrafficVehicleAI(v, vehicles, player, dt);
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
        v.hp = Math.max(15, v.hp - maxWallImpact * 0.045);
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

function updateTrafficVehicleAI(v, vehicles, player, dt) {
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  let blocked = false;

  // Lookahead spacing against player
  const pdx = player.x - v.x;
  const pdy = player.y - v.y;
  const pDist = Math.hypot(pdx, pdy);
  if (pDist < 115 && (pdx * cos + pdy * sin) / (pDist || 1) > 0.78) {
    blocked = true;
  }

  // Lookahead spacing against other vehicles directly ahead in same lane (prevents traffic pileups!)
  if (!blocked) {
    for (const other of vehicles) {
      if (other === v || other.destroyed) continue;
      const odx = other.x - v.x;
      const ody = other.y - v.y;
      const forward = odx * cos + ody * sin;
      if (forward > 12 && forward < 92) {
        const lateral = Math.abs(-odx * sin + ody * cos);
        if (lateral < 18) {
          blocked = true;
          break;
        }
      }
    }
  }

  const targetSpeed = blocked ? 8 : v.isCommercialVan ? 96 : 118;
  v.speed += (targetSpeed - v.speed) * Math.min(1, 3.8 * dt);
  v.vx = cos * v.speed;
  v.vy = sin * v.speed;
  v.rpm = Math.min(0.75, 0.22 + (v.speed / v.maxSpeed) * 0.55);

  // Smooth U-turn at boulevard ends across expanded 5200x5120 city + smart traffic streaming near player
  const rx = v.roadX || 1856;
  if (v.y > 4720) {
    v.angle = -Math.PI * 0.5;
    v.y = 4700;
    v.x = rx === 2720 ? 2734 : rx + 13;
  } else if (v.y < 250) {
    v.angle = Math.PI * 0.5;
    v.y = 260;
    v.x = rx === 2720 ? 2706 : rx - 13;
  }
  if (pDist > 1250 && v.aiRole === 'traffic') {
    const targetRoad =
      player.x > 3050 ? 3320 : Math.min(2720, Math.max(576, Math.round(player.x / 320) * 320));
    const clampedRoad = Math.abs(targetRoad - 2720) < 120 ? 2720 : targetRoad;
    const dir = Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;
    v.roadX = clampedRoad;
    v.angle = dir;
    v.x = clampedRoad === 2720 ? (dir > 0 ? 2706 : 2734) : clampedRoad + (dir > 0 ? -13 : 13);
    const maxY = clampedRoad > 3000 ? 1950 : 4640;
    const minY = clampedRoad > 3000 ? 540 : 320;
    v.y = Math.max(minY, Math.min(maxY, player.y + (dir > 0 ? -420 : 420)));
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
    if (state.audio && state.audio.onVehicleExit) {
      state.audio.onVehicleExit(v);
    }
    return { action: 'exit', vehicle: v };
  }

  const target = findNearestHijackableVehicle(player, vehicles, 82);
  if (target) {
    player.vehicle = target;
    player.x = target.x;
    player.y = target.y;
    player.z = target.z || 0;
    player.vz = 0;
    player.grounded = true;
    player.angle = target.angle;
    target.driver = 'player';
    target.isCurbParked = false;
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
