import { LANDMARKS, PLAYER_PHYSICS, WEAPONS } from './config.js';
import {
  resolveCircleBuildingCollisions,
  resolveCircleProps,
  resolveCircleOBBCollision
} from './city-map.js';

export function createInitialCareerStats() {
  return {
    carsStolen: 0,
    copsEscaped: 0,
    highestWanted: 0,
    distanceDrivenMeters: 0,
    enemiesNeutralized: 0,
    meleeKnockouts: 0,
    timesWasted: 0,
    timesBusted: 0
  };
}

export function ensureCareerStats(state) {
  if (!state.careerStats) {
    state.careerStats = createInitialCareerStats();
  }
  return state.careerStats;
}

/**
 * Centralized player damage handler:
 * Ignores damage during outcomes, start screen, pause, nightlife sessions, or showcase shots.
 * Drains armor first, then HP down to 0, triggering WASTED slow-mo outcome when HP <= 0.
 */
export function damagePlayer(state, amount, source = 'gunfire') {
  if (!state || !state.player) return false;
  if (
    state.outcome ||
    state.startScreenOpen ||
    state.paused ||
    state.isShowcaseShot ||
    (state.nightlife && state.nightlife.session)
  ) {
    return false;
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return false;

  const { player, camera } = state;
  let remaining = amt;

  if ((player.armor || 0) > 0) {
    const absorbed = Math.min(player.armor, remaining);
    player.armor = Math.max(0, player.armor - absorbed);
    remaining -= absorbed;
  }

  if (remaining > 0) {
    player.hp = Math.max(0, (player.hp || 0) - remaining);
  }

  if (camera) {
    camera.damageFlash = source === 'explosion' ? 0.9 : 0.68;
    camera.trauma = Math.min(1, (camera.trauma || 0) + (source === 'explosion' ? 0.36 : 0.18));
  }

  if (player.hp <= 0) {
    triggerPlayerOutcome(state, 'wasted');
  }
  return true;
}

/**
 * Starts the 3.4s 0.22x slow-mo WASTED or BUSTED sequence before hospital/precinct respawn.
 */
export function triggerPlayerOutcome(state, type = 'wasted') {
  if (!state || state.outcome || state.startScreenOpen || state.isShowcaseShot) return false;
  if (state.nightlife && state.nightlife.session) return false;

  const outcomeType = type === 'busted' ? 'busted' : 'wasted';
  const { player } = state;

  state.paused = false;
  state.safehouseModalOpen = false;
  if (state.shopModal) state.shopModal.open = false;
  if (state.nightlife) {
    state.nightlife.vipMenuOpen = false;
    state.nightlife.carMenuOpen = false;
    state.nightlife.dancing = false;
  }
  if (state.input) {
    state.input.keys = {};
    state.input.mouseDown = false;
  }
  if (state.camera) {
    state.camera.aiming = false;
    state.camera.aimBlend = 0;
  }
  if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch {
      // Ignore pointer lock exit failure
    }
  }

  if (outcomeType === 'wasted') {
    player.hp = 0;
  }

  const fee =
    outcomeType === 'wasted'
      ? Math.min(500, Math.floor((player.cash || 0) * 0.08))
      : Math.min(750, Math.floor((player.cash || 0) * 0.1));

  state.outcome = {
    type: outcomeType,
    timer: 3.4,
    duration: 3.4,
    fee,
    startYaw: state.camera && typeof state.camera.yaw === 'number' ? state.camera.yaw : player.angle || 0,
    targetLandmark: outcomeType === 'wasted' ? LANDMARKS.hospital : LANDMARKS.precinct
  };

  if (state.audio && state.audio.playOutcomeSting) {
    state.audio.playOutcomeSting(outcomeType);
  }
  return true;
}

export function completePlayerOutcome(state) {
  const outcome = state && state.outcome;
  if (!outcome) return false;

  const { player, wanted, cityMap, vehicles } = state;
  const stats = ensureCareerStats(state);
  const isWasted = outcome.type === 'wasted';
  const lm = isWasted ? LANDMARKS.hospital : LANDMARKS.precinct;

  const fee = isWasted
    ? Math.min(500, Math.floor((player.cash || 0) * 0.08))
    : Math.min(750, Math.floor((player.cash || 0) * 0.1));
  player.cash = Math.max(0, (player.cash || 0) - fee);

  if (isWasted) {
    stats.timesWasted = (stats.timesWasted || 0) + 1;
  } else {
    stats.timesBusted = (stats.timesBusted || 0) + 1;
    if (player.weaponAmmo) {
      for (const w of WEAPONS) {
        if (w.isMelee) continue;
        const cur = player.weaponAmmo[w.id] ?? 0;
        player.weaponAmmo[w.id] = Math.max(0, Math.floor(cur * 0.75));
      }
    }
  }

  // Eject cleanly from any vehicle
  if (player.vehicle) {
    const prevVeh = player.vehicle;
    prevVeh.driver = null;
    prevVeh.nitroActive = false;
    prevVeh.drifting = false;
    prevVeh.braking = false;
    player.vehicle = null;
    if (state.audio && state.audio.onVehicleExit) {
      state.audio.onVehicleExit(prevVeh);
    }
  }

  if (state.nightlife) {
    state.nightlife.companionApproaching = null;
    if (state.nightlife.companionInCar) {
      state.nightlife.companionInCar.inCar = false;
      state.nightlife.companionInCar = null;
    }
  }

  player.x = lm.x;
  player.y = lm.y;
  player.z = 0;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.grounded = true;
  player.angle = typeof lm.spawnAngle === 'number' ? lm.spawnAngle : -Math.PI * 0.5;
  player.hp = player.maxHp || 100;
  player.reloadTimer = 0;
  player.reloadingWeaponId = null;
  player.fireCooldown = 0;
  player.muzzleTimer = 0;

  // Cleanly resolve against buildings, props, and nearby vehicles
  const colliders = (cityMap && (cityMap.colliders || cityMap.buildings)) || [];
  resolveCircleBuildingCollisions(player, PLAYER_PHYSICS.radius, colliders);
  if (cityMap && cityMap.propColliders) {
    resolveCircleProps(player, PLAYER_PHYSICS.radius, 0, cityMap.propColliders);
  }
  if (vehicles) {
    for (const v of vehicles) {
      if (v.destroyed) continue;
      resolveCircleOBBCollision(player, PLAYER_PHYSICS.radius, v, false);
    }
  }
  // Re-apply building clearance after vehicle push
  resolveCircleBuildingCollisions(player, PLAYER_PHYSICS.radius, colliders);

  // Reset wanted state cleanly
  if (wanted) {
    wanted.stars = 0;
    wanted.heat = 0;
    wanted.cooldownTimer = 0;
    wanted.bustMeter = 0;
    wanted.inSight = false;
    wanted.evading = false;
    wanted.evadeTimer = 0;
    wanted.roadblocks = [];
    wanted.sightCones = [];
    wanted.roadblockDeployed = false;
    if (wanted.helicopter) wanted.helicopter.active = false;
  }

  if (state.camera) {
    state.camera.yaw = player.angle;
    state.camera.pitch = -0.06;
    state.camera.recoilYaw = 0;
    state.camera.recoilPitch = 0;
    state.camera.damageFlash = 0;
    state.camera.explosionFlash = 0;
    state.camera.trauma = 0;
    state.camera.aiming = false;
    state.camera.aimBlend = 0;
  }

  state.outcome = null;
  state.hudBanner = {
    title: isWasted ? `${lm.name} • DISCHARGED` : `${lm.name} • RELEASED`,
    subtitle: isWasted
      ? `MEDICAL FEE -$${fee.toLocaleString()} • FULL HP RESTORED`
      : `BAIL FEE -$${fee.toLocaleString()} • -25% RESERVE AMMO CONFISCATED`,
    color: isWasted ? '#63c792' : '#64bcc9',
    timer: 3.4
  };
  return true;
}

export function updatePlayerOutcome(state, realDt) {
  if (!state || !state.outcome) return false;
  state.outcome.timer -= realDt;
  if (state.outcome.timer <= 0) {
    completePlayerOutcome(state);
    return true;
  }
  return false;
}
