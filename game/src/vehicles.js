import { VEHICLE_TYPES } from './config.js';
import { resolveCircleBuildingCollisions } from './city-map.js';
import { closeShopModal } from './shops-economy.js';

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

export function updateVehicles(state, dt) {
  const { player, input, vehicles, cityMap } = state;

  for (const v of vehicles) {
    if (v.destroyed) continue;
    v.sirenPhase += dt * 9;

    if (player.vehicle === v) {
      updatePlayerDrivenVehicle(state, v, input, dt);
    } else if (v.aiRole === 'traffic' && v.driver === 'civilian') {
      updateTrafficVehicleAI(v, vehicles, player, dt);
    } else if (v.aiRole === 'convoy') {
      updateConvoyVehicleAI(v, dt);
    } else {
      // Friction slowdown for unoccupied / parked vehicles
      v.vx *= Math.exp(-4.5 * dt);
      v.vy *= Math.exp(-4.5 * dt);
      if (Math.hypot(v.vx, v.vy) < 1.5) {
        v.vx = 0;
        v.vy = 0;
      }
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
      Math.max(v.width, v.length) * 0.36,
      cityMap.colliders || cityMap.buildings
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

  // Vehicle-to-Vehicle collision resolution with clean parallel-lane clearance
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.destroyed) continue;
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (b.destroyed) continue;
      // Two stationary curb-parked vehicles never push each other
      if (a.isCurbParked && b.isCurbParked && a.speed < 1 && b.speed < 1) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // Tight realistic side-by-side clearance (0.48 * sum of widths) so parallel lanes & curb bays don't bump
      const minDist = (a.width + b.width) * 0.49;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        // If one car is curb-parked and the other is AI traffic, steer AI smoothly without displacing parked car
        if (a.isCurbParked && !b.isCurbParked && player.vehicle !== b) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        } else if (b.isCurbParked && !a.isCurbParked && player.vehicle !== a) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        } else {
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
        }

        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const impact = relVx * nx + relVy * ny;
        if (impact > 0) {
          a.vx -= nx * impact * 0.52;
          a.vy -= ny * impact * 0.52;
          b.vx += nx * impact * 0.52;
          b.vy += ny * impact * 0.52;
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

  if (state.payNsprayCooldown > 0) {
    state.payNsprayCooldown = Math.max(0, state.payNsprayCooldown - dt);
  }
}

function updatePlayerDrivenVehicle(state, v, input, dt) {
  const modalOpen = Boolean(
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

  v.steerAngle = steerInput * 0.44;
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
    forwardSpeed *= Math.exp(-2.2 * dt);
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
  v.x += v.vx * dt;
  v.y += v.vy * dt;

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
  const { player, vehicles, cityMap } = state;
  if (state.shopModal && state.shopModal.open) {
    closeShopModal(state);
  }
  if (player.vehicle) {
    // Exit vehicle onto street side, safely resolving building clearance
    const v = player.vehicle;
    const exitSideAngle = v.angle - Math.PI * 0.5;
    player.x = v.x + Math.cos(exitSideAngle) * (v.width * 0.9);
    player.y = v.y + Math.sin(exitSideAngle) * (v.width * 0.9);
    if (cityMap && (cityMap.colliders || cityMap.buildings)) {
      resolveCircleBuildingCollisions(player, 9, cityMap.colliders || cityMap.buildings);
    }
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
    target.isCurbParked = false;
    return { action: 'enter', vehicle: target };
  }
  return null;
}
