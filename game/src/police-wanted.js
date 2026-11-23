import { WANTED_THRESHOLDS } from './config.js';
import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';

export function createWantedState() {
  return {
    heat: 0,
    stars: 0,
    cooldownTimer: 0,
    sirenTimer: 0,
    spawnTimer: 0,
    helicopter: {
      active: false,
      x: 2720,
      y: 2050,
      z: 148,
      angle: 0,
      rotorAngle: 0,
      orbitPhase: 0
    },
    roadblocks: []
  };
}

export function addCrimeHeat(state, amount, reason = 'VCPD DISPATCH ALERT') {
  const { wanted } = state;
  wanted.heat = Math.min(1150, wanted.heat + amount);
  wanted.cooldownTimer = 0;

  let newStars = 0;
  for (let s = 5; s >= 1; s--) {
    if (wanted.heat >= WANTED_THRESHOLDS[s]) {
      newStars = s;
      break;
    }
  }
  if (newStars > wanted.stars) {
    wanted.stars = newStars;
    state.hudBanner = {
      title: `WANTED LEVEL ${newStars}★ ESCALATION`,
      subtitle: reason,
      color: '#ff2a85',
      timer: 2.6
    };
  }
}

export function updatePoliceSystem(state, dt) {
  const { wanted, player, vehicles, pedestrians } = state;
  wanted.sirenTimer += dt * 8;

  // Recalculate stars from heat
  let targetStars = 0;
  for (let s = 5; s >= 1; s--) {
    if (wanted.heat >= WANTED_THRESHOLDS[s]) {
      targetStars = s;
      break;
    }
  }
  wanted.stars = Math.max(wanted.stars, targetStars);

  if (wanted.stars === 0) {
    wanted.helicopter.active = false;
    return;
  }

  // Check if any police unit has direct sight of player
  let policeNearby = false;
  for (const v of vehicles) {
    if (v.isPolice && !v.destroyed) {
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d < 520) {
        policeNearby = true;
        break;
      }
    }
  }

  if (!policeNearby && wanted.stars <= 3) {
    wanted.cooldownTimer += dt;
    if (wanted.cooldownTimer > 11) {
      wanted.heat = Math.max(0, wanted.heat - 45 * dt);
      if (wanted.heat < WANTED_THRESHOLDS[1]) {
        wanted.stars = 0;
        wanted.heat = 0;
      }
    }
  } else {
    wanted.cooldownTimer = 0;
  }

  // Active police cruiser pursuit steering
  let activePoliceVehicles = 0;
  for (const v of vehicles) {
    if (!v.isPolice || v.destroyed || player.vehicle === v) continue;
    activePoliceVehicles++;

    const dx = player.x - v.x;
    const dy = player.y - v.y;
    const dist = Math.hypot(dx, dy);
    const desiredAngle = Math.atan2(dy, dx);

    let diff = desiredAngle - v.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    v.steerAngle = Math.max(-0.42, Math.min(0.42, diff));
    v.angle += Math.sign(diff) * Math.min(Math.abs(diff), v.turnRate * dt);

    const targetSpd = dist > 95 ? v.maxSpeed * 0.86 : 110;
    v.speed += (targetSpd - v.speed) * Math.min(1, 3.2 * dt);
    v.vx = Math.cos(v.angle) * v.speed;
    v.vy = Math.sin(v.angle) * v.speed;
    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }

  // Spawn reinforcement police interceptors or SWAT Bearcat units
  wanted.spawnTimer -= dt;
  const desiredCount = Math.min(5, wanted.stars + 1);
  if (wanted.spawnTimer <= 0 && activePoliceVehicles < desiredCount) {
    wanted.spawnTimer = 4.2;
    const spawnAngle = player.angle + (Math.random() < 0.5 ? 0.65 : -0.65);
    const spawnDist = 420;
    const sx = Math.max(220, Math.min(2720, player.x + Math.cos(spawnAngle) * spawnDist));
    const sy = Math.max(240, Math.min(3200, player.y + Math.sin(spawnAngle) * spawnDist));
    const unitType = wanted.stars >= 4 ? 'swat_van' : 'police_cruiser';
    const copCar = createVehicle(unitType, sx, sy, spawnAngle + Math.PI, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    vehicles.push(copCar);

    if (pedestrians.length < 62) {
      pedestrians.push(createPedestrian(sx + 24, sy + 24, 'police'));
    }
  }

  // 4★-5★ Airborne 3D Police Helicopter with Searchlight Cone
  if (wanted.stars >= 4) {
    const heli = wanted.helicopter;
    heli.active = true;
    heli.orbitPhase += dt * 0.85;
    heli.rotorAngle += dt * 28;
    const targetX = player.x + Math.cos(heli.orbitPhase) * 95;
    const targetY = player.y + Math.sin(heli.orbitPhase) * 95;
    heli.x += (targetX - heli.x) * Math.min(1, 3.5 * dt);
    heli.y += (targetY - heli.y) * Math.min(1, 3.5 * dt);
    heli.angle = Math.atan2(player.y - heli.y, player.x - heli.x);
  } else {
    wanted.helicopter.active = false;
  }
}
