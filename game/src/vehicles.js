import { VEHICLE_TYPES, LANDMARKS } from './config.js';
import { resolveCircleBuildingCollisions } from './city-map.js';

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
    color: overrides.color || spec.color,
    stripeColor: overrides.stripeColor || spec.stripeColor,
    hasSpoiler: spec.hasSpoiler,
    isConvertible: spec.isConvertible,
    isPolice: Boolean(spec.isPolice),
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
    nitro: 100,
    nitroActive: false,
    drifting: false,
    driver: overrides.driver || null,
    aiRole: overrides.aiRole || 'traffic',
    targetX: x,
    targetY: y,
    sirenPhase: Math.random() * 10,
    destroyed: false,
    ...overrides
  };
}

export function spawnInitialVehicles(cityMap) {
  const list = [];

  // Hero Apex V8 GT Supercar on Ocean Drive
  list.push(
    createVehicle('apex_gt', 2720, 2120, -Math.PI * 0.5, {
      aiRole: 'player_starter'
    })
  );

  // Exotic parked supercars at Starfish Marina Safehouse & Neon Strip
  list.push(
    createVehicle('comet_cabrio', 2535, 835, -Math.PI * 0.35, { aiRole: 'parked' }),
    createVehicle('apex_gt', 2465, 845, -Math.PI * 0.65, {
      color: '#b6ad9d',
      stripeColor: '#2d343e',
      aiRole: 'parked'
    }),
    createVehicle('stinger_muscle', 1856, 1780, 0, { aiRole: 'parked' }),
    createVehicle('comet_cabrio', 1536, 1740, Math.PI * 0.5, { aiRole: 'parked' })
  );

  // Moving coastal & boulevard traffic vehicles
  const trafficTypes = [
    'comet_cabrio',
    'stinger_muscle',
    'eclipse_sedan',
    'bison_suv',
    'apex_gt'
  ];

  let idx = 0;
  for (const rx of cityMap.verticalRoads) {
    for (let y = 450; y <= 2950; y += 560) {
      if (Math.abs(rx - 2720) < 20 && Math.abs(y - 2120) < 180) continue;
      const tId = trafficTypes[idx % trafficTypes.length];
      const dir = idx % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const laneOffset = dir > 0 ? -20 : 20;
      const v = createVehicle(tId, rx + laneOffset, y, dir, {
        aiRole: 'traffic',
        driver: 'civilian'
      });
      v.speed = 115;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      list.push(v);
      idx++;
      if (list.length >= 26) break;
    }
    if (list.length >= 26) break;
  }

  return list;
}

export function updateVehicles(state, dt) {
  const { player, input, vehicles, cityMap, particles } = state;

  for (const v of vehicles) {
    if (v.destroyed) continue;
    v.sirenPhase += dt * 9;

    if (player.vehicle === v) {
      updatePlayerDrivenVehicle(state, v, input, dt);
    } else if (v.aiRole === 'traffic' && v.driver === 'civilian') {
      updateTrafficVehicleAI(v, cityMap, player, dt);
    } else if (v.aiRole === 'convoy') {
      updateConvoyVehicleAI(v, cityMap, dt);
    } else {
      // Friction slowdown for unoccupied vehicles
      v.vx *= Math.exp(-3.8 * dt);
      v.vy *= Math.exp(-3.8 * dt);
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.speed = Math.hypot(v.vx, v.vy);
      v.nitroActive = false;
      v.drifting = false;
    }

    // Advance wheel spin & building collision
    const forwardDot = v.vx * Math.cos(v.angle) + v.vy * Math.sin(v.angle);
    v.wheelSpin += (forwardDot * dt) / 3.6;

    const hitBuilding = resolveCircleBuildingCollisions(
      v,
      Math.max(v.width, v.length) * 0.38,
      cityMap.buildings
    );
    if (hitBuilding && v.speed > 90) {
      v.vx *= -0.35;
      v.vy *= -0.35;
      v.speed *= 0.35;
      if (player.vehicle === v) {
        state.camera.trauma = Math.min(1, state.camera.trauma + 0.25);
      }
    }
  }

  // Vehicle-to-Vehicle collision resolution
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.destroyed) continue;
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (b.destroyed) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = (a.width + b.width) * 0.58;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const impact = relVx * nx + relVy * ny;
        if (impact > 0) {
          a.vx -= nx * impact * 0.55;
          a.vy -= ny * impact * 0.55;
          b.vx += nx * impact * 0.55;
          b.vy += ny * impact * 0.55;
          if (impact > 110 && (player.vehicle === a || player.vehicle === b)) {
            state.camera.trauma = Math.min(1, state.camera.trauma + 0.32);
          }
        }
      }
    }
  }

  // Sync player world position to active vehicle
  if (player.vehicle) {
    player.x = player.vehicle.x;
    player.y = player.vehicle.y;
    player.angle = player.vehicle.angle;
  }

  // Check Pay 'N' Spray respray & repair bays
  if (player.vehicle) {
    for (const key of ['payNsprayOcean', 'payNsprayDowntown']) {
      const bay = LANDMARKS[key];
      const d = Math.hypot(player.vehicle.x - bay.x, player.vehicle.y - bay.y);
      if (d < bay.radius && state.payNsprayCooldown <= 0) {
        if (state.wanted.stars > 0 || player.vehicle.hp < player.vehicle.maxHp) {
          player.vehicle.hp = player.vehicle.maxHp;
          state.wanted.stars = 0;
          state.wanted.heat = 0;
          state.payNsprayCooldown = 8.0;
          const exoticColors = ['#a6283b', '#246b7f', '#b6ad9d', '#ad5937', '#383f4a'];
          player.vehicle.color =
            exoticColors[Math.floor(Math.random() * exoticColors.length)];
          state.hudBanner = {
            title: "PAY 'N' SPRAY RESPRAY COMPLETE",
            subtitle: 'VEHICLE REPAIRED • WANTED HEAT CLEARED',
            color: '#64bcc9',
            timer: 3.4
          };
          if (particles) {
            for (let k = 0; k < 16; k++) {
              particles.push({
                x: player.vehicle.x + (Math.random() - 0.5) * 26,
                y: player.vehicle.y + (Math.random() - 0.5) * 26,
                z: 4 + Math.random() * 10,
                vx: (Math.random() - 0.5) * 70,
                vy: (Math.random() - 0.5) * 70,
                vz: 20 + Math.random() * 30,
                size: 5,
                color: '#a8b8c4',
                life: 0.7,
                maxLife: 0.7,
                kind: 'smoke'
              });
            }
          }
        }
      }
    }
  }
  if (state.payNsprayCooldown > 0) {
    state.payNsprayCooldown = Math.max(0, state.payNsprayCooldown - dt);
  }
}

function updatePlayerDrivenVehicle(state, v, input, dt) {
  const throttle = (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) -
                   (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
  const steerInput = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) -
                     (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
  const handbrake = Boolean(input.keys.Space);
  const wantNitro = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);

  v.steerAngle = steerInput * 0.44;

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

  if (throttle > 0) {
    forwardSpeed += v.accel * throttle * dt;
  } else if (throttle < 0) {
    if (forwardSpeed > 20) {
      forwardSpeed -= v.brake * dt;
    } else {
      forwardSpeed += v.accel * 0.65 * throttle * dt;
    }
  } else {
    forwardSpeed *= Math.exp(-1.5 * dt);
  }

  if (handbrake) {
    forwardSpeed *= Math.exp(-1.9 * dt);
  }

  const maxSpd = v.nitroActive ? v.maxSpeed * 1.24 : v.maxSpeed;
  forwardSpeed = Math.max(-maxSpd * 0.42, Math.min(maxSpd, forwardSpeed));

  // Steering turn rate scales with speed
  const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 95);
  const dirSign = forwardSpeed >= -5 ? 1 : -1;
  const turnMult = handbrake ? 1.28 : 1.0;
  v.angle += steerInput * v.turnRate * speedFactor * dirSign * turnMult * dt;

  // Lateral grip & drift slip
  const grip = handbrake ? 2.2 : 7.8 * v.driftGrip;
  lateralSpeed *= Math.exp(-grip * dt);
  v.drifting =
    (handbrake && Math.abs(forwardSpeed) > 110) || Math.abs(lateralSpeed) > 48;

  const nCos = Math.cos(v.angle);
  const nSin = Math.sin(v.angle);
  v.vx = nCos * forwardSpeed - nSin * lateralSpeed;
  v.vy = nSin * forwardSpeed + nCos * lateralSpeed;

  v.x += v.vx * dt;
  v.y += v.vy * dt;
  v.speed = Math.hypot(v.vx, v.vy);

  // Emit 3D tire drift smoke particles
  if ((v.drifting || v.nitroActive) && state.particles) {
    state.particles.push({
      x: v.x - nCos * (v.length * 0.42) + (Math.random() - 0.5) * 10,
      y: v.y - nSin * (v.length * 0.42) + (Math.random() - 0.5) * 10,
      z: 2.2,
      vx: -v.vx * 0.18 + (Math.random() - 0.5) * 20,
      vy: -v.vy * 0.18 + (Math.random() - 0.5) * 20,
      vz: 10 + Math.random() * 14,
      size: v.nitroActive ? 4.4 : 5.8,
      color: v.nitroActive ? '#a8b7c4' : '#b8b6b0',
      life: 0.45,
      maxLife: 0.45,
      kind: 'smoke'
    });
  }
}

function updateTrafficVehicleAI(v, cityMap, player, dt) {
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);

  // Slow down if player is directly ahead
  const dx = player.x - v.x;
  const dy = player.y - v.y;
  const distToPlayer = Math.hypot(dx, dy);
  const aheadDot = (dx * cos + dy * sin) / (distToPlayer || 1);

  const cruiseSpeed = distToPlayer < 110 && aheadDot > 0.65 ? 25 : 120;
  v.speed += (cruiseSpeed - v.speed) * Math.min(1, 3.5 * dt);
  v.vx = cos * v.speed;
  v.vy = sin * v.speed;
  v.x += v.vx * dt;
  v.y += v.vy * dt;

  // Wrap around boulevard ends smoothly
  if (v.y > 3220) {
    v.angle = -Math.PI * 0.5;
    v.y = 3210;
  } else if (v.y < 240) {
    v.angle = Math.PI * 0.5;
    v.y = 250;
  }
  if (v.x > 2760) {
    v.angle = Math.PI;
    v.x = 2750;
  } else if (v.x < 240) {
    v.angle = 0;
    v.x = 250;
  }
}

function updateConvoyVehicleAI(v, cityMap, dt) {
  const cos = Math.cos(v.angle);
  const sin = Math.sin(v.angle);
  v.speed = 135;
  v.vx = cos * v.speed;
  v.vy = sin * v.speed;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
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
  const { player, vehicles } = state;
  if (player.vehicle) {
    // Exit vehicle onto street side
    const v = player.vehicle;
    const exitSideAngle = v.angle - Math.PI * 0.5;
    player.x = v.x + Math.cos(exitSideAngle) * (v.width * 0.85);
    player.y = v.y + Math.sin(exitSideAngle) * (v.width * 0.85);
    player.vehicle = null;
    v.driver = null;
    v.nitroActive = false;
    v.drifting = false;
    return { action: 'exit', vehicle: v };
  }

  const target = findNearestHijackableVehicle(player, vehicles, 82);
  if (target) {
    player.vehicle = target;
    player.x = target.x;
    player.y = target.y;
    player.angle = target.angle;
    target.driver = 'player';
    return { action: 'enter', vehicle: target };
  }
  return null;
}
