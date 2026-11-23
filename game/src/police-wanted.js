import { WANTED_THRESHOLDS, getWorldClockInfo } from './config.js';
import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import {
  resolveCircleBuildingCollisions,
  resolveCircleProps,
  raycastColliders3D,
  pointInBuilding
} from './city-map.js';
import { triggerPlayerOutcome, ensureCareerStats } from './player-vitals.js';
import { getActiveWalkInShopAt } from './shops-economy.js';

function normalizeAngleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function hasBuildingOcclusion(x1, y1, z1, x2, y2, z2, colliders) {
  if (!colliders || colliders.length === 0) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 4) return false;
  const hit = raycastColliders3D(
    x1,
    y1,
    z1,
    dx / dist,
    dy / dist,
    dz / dist,
    dist - 2.0,
    colliders,
    0
  );
  return Boolean(hit && hit.t < dist - 2.0);
}

export function createWantedState() {
  return {
    heat: 0,
    stars: 0,
    cooldownTimer: 0,
    sirenTimer: 0,
    spawnTimer: 0,
    patrolSpawnTimer: 2.0,
    inSight: false,
    evading: false,
    evadeTimer: 0,
    evadeDuration: 15,
    lastKnownX: 2720,
    lastKnownY: 2050,
    bustMeter: 0,
    roadblockDeployed: false,
    helicopter: {
      active: false,
      x: 2720,
      y: 2050,
      z: 148,
      angle: 0,
      rotorAngle: 0,
      orbitPhase: 0
    },
    roadblocks: [],
    sightCones: []
  };
}

export function addCrimeHeat(state, amount, reason = 'VCPD DISPATCH ALERT') {
  if (!state || state.outcome || state.isShowcaseShot) return;
  const { wanted, player } = state;
  wanted.heat = Math.min(1150, wanted.heat + amount);
  wanted.cooldownTimer = 0;
  if (player) {
    wanted.lastKnownX = player.x;
    wanted.lastKnownY = player.y;
  }

  let newStars = 0;
  for (let s = 5; s >= 1; s--) {
    if (wanted.heat >= WANTED_THRESHOLDS[s]) {
      newStars = s;
      break;
    }
  }
  if (newStars > wanted.stars) {
    wanted.stars = newStars;
    wanted.evadeTimer = 0;
    wanted.evading = false;
    wanted.evadeDuration = 12 + newStars * 3;
    const stats = ensureCareerStats(state);
    stats.highestWanted = Math.max(stats.highestWanted || 0, newStars);
    state.hudBanner = {
      title: `WANTED LEVEL ${newStars}★ ESCALATION`,
      subtitle: reason,
      color: '#d95b66',
      timer: 2.6
    };
  }
}

function deployOfficersFromCruiser(state, cruiser) {
  const { pedestrians, cityMap } = state;
  const colliders = (cityMap && (cityMap.colliders || cityMap.buildings)) || [];
  const remaining = Math.max(0, 2 - (cruiser.officersDeployed || 0));
  if (remaining <= 0 || pedestrians.length >= 165) return 0;

  let spawned = 0;
  for (let i = 0; i < remaining; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const doorAng = cruiser.angle + side * Math.PI * 0.5;
    const ox = cruiser.x + Math.cos(doorAng) * ((cruiser.width || 24) * 0.5 + 13);
    const oy = cruiser.y + Math.sin(doorAng) * ((cruiser.width || 24) * 0.5 + 13);
    const officer = createPedestrian(ox, oy, 'police', {
      angle: cruiser.angle
    });
    resolveCircleBuildingCollisions(officer, 9, colliders);
    if (cityMap && cityMap.propColliders) {
      resolveCircleProps(officer, 9, 0, cityMap.propColliders);
    }
    pedestrians.push(officer);
    spawned++;
  }
  cruiser.officersDeployed = 2;
  return spawned;
}

function deployRoadblockAhead(state) {
  const { wanted, player, vehicles, pedestrians, cityMap } = state;
  if (!cityMap || !cityMap.verticalRoads || !cityMap.horizontalRoads) return false;
  const colliders = cityMap.colliders || cityMap.buildings || [];

  const heading = player.vehicle ? player.vehicle.angle : player.angle || -Math.PI * 0.5;
  const targetX = player.x + Math.cos(heading) * 380;
  const targetY = player.y + Math.sin(heading) * 380;

  // Snap to nearest vertical avenue & clear mid-block Y away from intersections
  let roadX = 2496;
  let bestDx = Infinity;
  for (const rx of cityMap.verticalRoads) {
    if (rx < 576 || rx > 2720) continue;
    const d = Math.abs(targetX - rx);
    if (d < bestDx) {
      bestDx = d;
      roadX = rx;
    }
  }

  let roadY = Math.max(416, Math.min(4400, targetY));
  // Ensure away from horizontal intersections so cars sit cleanly across road
  for (const hy of cityMap.horizontalRoads) {
    if (Math.abs(roadY - hy) < 72) {
      roadY = hy + (roadY >= hy ? 110 : -110);
    }
  }
  roadY = Math.max(416, Math.min(4400, roadY));

  if (pointInBuilding(roadX, roadY, colliders, 12)) return false;

  const unitType = wanted.stars >= 4 ? 'swat_van' : 'police_cruiser';
  const c1 = createVehicle(unitType, roadX - 18, roadY, 0.24, {
    aiRole: 'police_roadblock',
    driver: null,
    isRoadblock: true,
    officersDeployed: 2
  });
  const c2 = createVehicle(unitType, roadX + 18, roadY, Math.PI - 0.24, {
    aiRole: 'police_roadblock',
    driver: null,
    isRoadblock: true,
    officersDeployed: 2
  });
  resolveCircleBuildingCollisions(c1, 20, colliders);
  resolveCircleBuildingCollisions(c2, 20, colliders);
  vehicles.push(c1, c2);

  const behindSign = Math.sin(heading) >= 0 ? 1 : -1;
  for (const offX of [-16, 16]) {
    const officer = createPedestrian(roadX + offX, roadY + behindSign * 30, 'police', {
      angle: behindSign > 0 ? -Math.PI * 0.5 : Math.PI * 0.5
    });
    resolveCircleBuildingCollisions(officer, 9, colliders);
    pedestrians.push(officer);
  }

  wanted.roadblocks.push({
    x: roadX,
    y: roadY,
    createdAt: state.time || 0,
    vehicleIds: [c1.id, c2.id]
  });
  wanted.roadblockDeployed = true;
  return true;
}

export function updatePoliceSystem(state, dt) {
  const { wanted, player, vehicles, pedestrians, cityMap } = state;
  const colliders = (cityMap && (cityMap.colliders || cityMap.buildings)) || [];
  const clock = getWorldClockInfo(state.worldTime);
  const isNight = clock.isNight;

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
  if (wanted.stars > 0) {
    const stats = ensureCareerStats(state);
    stats.highestWanted = Math.max(stats.highestWanted || 0, wanted.stars);
  }

  // Collect active police vision sight-cones & check building-occluded LOS
  const cones = [];
  let inSight = false;
  const playerZ = (player.z || 0) + 10;
  const cruiserHalfAngle = (42 * Math.PI) / 180;
  const officerHalfAngle = (55 * Math.PI) / 180;

  for (const v of vehicles) {
    if (!v.isPolice || v.destroyed || player.vehicle === v) continue;
    cones.push({
      x: v.x,
      y: v.y,
      angle: v.angle,
      range: 360,
      halfAngle: cruiserHalfAngle,
      kind: 'cruiser'
    });
    if (wanted.stars > 0) {
      const dx = player.x - v.x;
      const dy = player.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 360) {
        const angToPlayer = Math.atan2(dy, dx);
        const diff = Math.abs(normalizeAngleDiff(angToPlayer, v.angle));
        if (diff <= cruiserHalfAngle && !hasBuildingOcclusion(v.x, v.y, 10, player.x, player.y, playerZ, colliders)) {
          inSight = true;
        }
      }
    }
  }

  for (const npc of pedestrians) {
    if (npc.dead || npc.inCar || npc.role !== 'police') continue;
    cones.push({
      x: npc.x,
      y: npc.y,
      angle: npc.angle,
      range: 240,
      halfAngle: officerHalfAngle,
      kind: 'officer'
    });
    if (wanted.stars > 0) {
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 240) {
        const angToPlayer = Math.atan2(dy, dx);
        const diff = Math.abs(normalizeAngleDiff(angToPlayer, npc.angle));
        if (
          diff <= officerHalfAngle &&
          !hasBuildingOcclusion(npc.x, npc.y, (npc.z || 0) + 12, player.x, player.y, playerZ, colliders)
        ) {
          inSight = true;
        }
      }
    }
  }

  const heli = wanted.helicopter;
  if (wanted.stars >= 4 && heli && heli.active) {
    const beamForward = Math.tan(0.24) * (heli.z || 115) + 14;
    const poolX = heli.x + Math.cos(heli.angle) * beamForward;
    const poolY = heli.y + Math.sin(heli.angle) * beamForward;
    cones.push({
      x: poolX,
      y: poolY,
      angle: heli.angle,
      range: 220,
      halfAngle: Math.PI,
      kind: 'heli'
    });
    const sheltered = Boolean(cityMap && getActiveWalkInShopAt(player.x, player.y, cityMap.shops));
    if (!sheltered && Math.hypot(player.x - poolX, player.y - poolY) <= 220) {
      inSight = true;
    }
  }

  wanted.sightCones = cones;

  if (wanted.stars === 0) {
    wanted.helicopter.active = false;
    wanted.inSight = false;
    wanted.evading = false;
    wanted.evadeTimer = 0;
    wanted.bustMeter = 0;
    wanted.roadblockDeployed = false;
    wanted.roadblocks = [];

    // Keep gentle night VCPD patrols cruising avenues when worldTime is at night
    let patrolCount = 0;
    for (const v of vehicles) {
      if (v.isPolice && !v.destroyed && player.vehicle !== v) {
        if (v.aiRole === 'police_pursuit') {
          v.aiRole = 'police_patrol';
          v.roadX = v.roadX || 2496;
        }
        if (v.aiRole === 'police_patrol') {
          patrolCount++;
          const dir = Math.sin(v.angle) >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          v.angle += normalizeAngleDiff(dir, v.angle) * Math.min(1, 3.0 * dt);
          v.speed += (105 - v.speed) * Math.min(1, 2.5 * dt);
          v.vx = Math.cos(v.angle) * v.speed;
          v.vy = Math.sin(v.angle) * v.speed;
          if (v.y > 4600) v.angle = -Math.PI * 0.5;
          else if (v.y < 340) v.angle = Math.PI * 0.5;
        }
      }
    }
    if (isNight && patrolCount < 2 && !state.startScreenOpen) {
      wanted.patrolSpawnTimer = (wanted.patrolSpawnTimer ?? 2.0) - dt;
      if (wanted.patrolSpawnTimer <= 0) {
        wanted.patrolSpawnTimer = 6.0;
        const avenues = [1536, 1856, 2176, 2496, 2720];
        const rx = avenues[Math.floor(Math.random() * avenues.length)];
        const dir = Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;
        const sy = Math.max(380, Math.min(4400, player.y + (Math.random() < 0.5 ? 520 : -520)));
        const patrolCar = createVehicle('police_cruiser', rx + (dir > 0 ? -13 : 13), sy, dir, {
          aiRole: 'police_patrol',
          driver: 'police',
          roadX: rx
        });
        resolveCircleBuildingCollisions(patrolCar, 24, colliders);
        vehicles.push(patrolCar);
      }
    }
    return;
  }

  // Update LOS evasion timer across ALL wanted levels (1★ through 5★)
  wanted.evadeDuration = 12 + wanted.stars * 3;
  wanted.inSight = inSight;

  if (inSight) {
    wanted.evading = false;
    wanted.evadeTimer = 0;
    wanted.cooldownTimer = 0;
    wanted.lastKnownX = player.x;
    wanted.lastKnownY = player.y;
  } else {
    wanted.evading = true;
    wanted.evadeTimer = Math.min(wanted.evadeDuration, (wanted.evadeTimer || 0) + dt);
    if (wanted.evadeTimer >= wanted.evadeDuration) {
      wanted.stars = 0;
      wanted.heat = 0;
      wanted.evading = false;
      wanted.evadeTimer = 0;
      wanted.bustMeter = 0;
      wanted.inSight = false;
      wanted.helicopter.active = false;
      wanted.roadblocks = [];
      wanted.roadblockDeployed = false;
      const stats = ensureCareerStats(state);
      stats.copsEscaped = (stats.copsEscaped || 0) + 1;
      state.hudBanner = {
        title: 'VCPD PURSUIT EVADED',
        subtitle: 'LINE OF SIGHT BROKEN • HEAT CLEARED TO 0★',
        color: '#63c792',
        timer: 3.2
      };
      return;
    }
  }

  // BUSTED Apprehension Progress Meter (0..1)
  const inProtectedMode = Boolean(
    state.outcome ||
      state.isShowcaseShot ||
      (state.nightlife && state.nightlife.session)
  );
  if (!inProtectedMode) {
    const playerMoveSpd = player.vehicle
      ? Math.abs(player.vehicle.speed || 0)
      : Math.hypot(player.vx || 0, player.vy || 0);
    let bustThreat = false;

    for (const npc of pedestrians) {
      if (npc.dead || npc.inCar || npc.role !== 'police') continue;
      if (Math.hypot(npc.x - player.x, npc.y - player.y) <= 34) {
        bustThreat = true;
        break;
      }
    }
    if (!bustThreat && playerMoveSpd < 28) {
      for (const v of vehicles) {
        if (!v.isPolice || v.destroyed || v === player.vehicle) continue;
        if (Math.hypot(v.x - player.x, v.y - player.y) <= 56) {
          bustThreat = true;
          break;
        }
      }
    }

    if (bustThreat) {
      wanted.bustMeter = Math.min(1, (wanted.bustMeter || 0) + dt / 2.4);
      if (wanted.bustMeter >= 1.0) {
        triggerPlayerOutcome(state, 'busted');
        return;
      }
    } else {
      wanted.bustMeter = Math.max(0, (wanted.bustMeter || 0) - 0.6 * dt);
    }
  } else {
    wanted.bustMeter = 0;
  }

  // Active police cruiser pursuit steering (pursues player in sight, searches lastKnownX/Y when evading)
  let activePoliceVehicles = 0;
  for (const v of vehicles) {
    if (!v.isPolice || v.destroyed || player.vehicle === v) continue;
    if (v.aiRole === 'police_patrol') v.aiRole = 'police_pursuit';

    if (v.aiRole === 'police_roadblock') {
      v.speed *= Math.exp(-6 * dt);
      v.vx *= Math.exp(-6 * dt);
      v.vy *= Math.exp(-6 * dt);
      continue;
    }

    activePoliceVehicles++;

    const tx = wanted.inSight ? player.x : wanted.lastKnownX;
    const ty = wanted.inSight ? player.y : wanted.lastKnownY;
    const dx = tx - v.x;
    const dy = ty - v.y;
    const dist = Math.hypot(dx, dy);
    let desiredAngle = Math.atan2(dy, dx);
    let targetSpd = dist > 95 ? v.maxSpeed * 0.84 : 110;

    if (!wanted.inSight && dist < 82) {
      // Sweep around last known position when LOS is broken
      desiredAngle += 1.05;
      targetSpd = 145;
    }

    const diff = normalizeAngleDiff(desiredAngle, v.angle);
    v.steerAngle = Math.max(-0.42, Math.min(0.42, diff));
    v.angle += Math.sign(diff) * Math.min(Math.abs(diff), v.turnRate * dt);

    // At 2★+, deploy up to 2 foot police officers when cruiser closes within 115u of on-foot player
    const playerDist = Math.hypot(player.x - v.x, player.y - v.y);
    if (wanted.stars >= 2 && !player.vehicle && playerDist < 115 && (v.officersDeployed || 0) < 2) {
      targetSpd = 28;
      v.speed *= 0.45;
      deployOfficersFromCruiser(state, v);
    }

    v.speed += (targetSpd - v.speed) * Math.min(1, 3.2 * dt);
    v.vx = Math.cos(v.angle) * v.speed;
    v.vy = Math.sin(v.angle) * v.speed;
    v.rpm = Math.min(0.95, 0.25 + (v.speed / v.maxSpeed) * 0.72);
  }

  // Spawn reinforcement police interceptors or SWAT Bearcat units (boosted at night up to cap 7)
  wanted.spawnTimer -= dt;
  const desiredCount = Math.min(7, wanted.stars + 1 + (isNight ? 2 : 0));
  if (wanted.spawnTimer <= 0 && activePoliceVehicles < desiredCount) {
    wanted.spawnTimer = 4.0;
    const spawnAngle = player.angle + (Math.random() < 0.5 ? 0.65 : -0.65);
    const spawnDist = 420;
    const sx = Math.max(220, Math.min(2720, player.x + Math.cos(spawnAngle) * spawnDist));
    const sy = Math.max(240, Math.min(4500, player.y + Math.sin(spawnAngle) * spawnDist));
    const unitType = wanted.stars >= 4 ? 'swat_van' : 'police_cruiser';
    const copCar = createVehicle(unitType, sx, sy, spawnAngle + Math.PI, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    resolveCircleBuildingCollisions(copCar, 24, colliders);
    vehicles.push(copCar);

    if (pedestrians.length < 155) {
      const officer = createPedestrian(copCar.x + 24, copCar.y + 24, 'police');
      resolveCircleBuildingCollisions(officer, 9, colliders);
      pedestrians.push(officer);
    }
  }

  // 3★+ VCPD Roadblock deployment (once per chase)
  if (wanted.stars >= 3 && !wanted.roadblockDeployed) {
    deployRoadblockAhead(state);
  }

  // 4★-5★ Airborne 3D Police Helicopter with Searchlight Cone
  if (wanted.stars >= 4) {
    heli.active = true;
    heli.orbitPhase += dt * 0.85;
    heli.rotorAngle += dt * 28;
    const anchorX = wanted.inSight ? player.x : wanted.lastKnownX;
    const anchorY = wanted.inSight ? player.y : wanted.lastKnownY;
    const orbitRad = wanted.inSight ? 95 : 150;
    const targetX = anchorX + Math.cos(heli.orbitPhase) * orbitRad;
    const targetY = anchorY + Math.sin(heli.orbitPhase) * orbitRad;
    heli.x += (targetX - heli.x) * Math.min(1, 3.5 * dt);
    heli.y += (targetY - heli.y) * Math.min(1, 3.5 * dt);
    heli.angle = Math.atan2(anchorY - heli.y, anchorX - heli.x);
  } else {
    wanted.helicopter.active = false;
  }
}
