import { WEAPONS, PLAYER_PHYSICS, COAST_X } from './config.js';
import {
  pointInBuilding,
  resolveCircleBuildingCollisions,
  resolveCircleProps,
  resolveCircleOBBCollision,
  getGroundHeightAt,
  raycastColliders3D,
  raycastWorldForAim
} from './city-map.js';
import { damagePedestrian, alertNearbyCivilians } from './pedestrians.js';
import { addCrimeHeat } from './police-wanted.js';
import {
  createInitialWeaponAmmo,
  createInitialWeaponMag,
  getActiveWalkInShopAt
} from './shops-economy.js';
import { isInsideClubEclipse } from './nightlife-romance.js';
import {
  damagePlayer,
  triggerPlayerOutcome,
  updatePlayerOutcome
} from './player-vitals.js';

export { damagePlayer, triggerPlayerOutcome, updatePlayerOutcome };

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + diff * Math.min(1, t);
}

/**
 * Computes exact third-person over-the-shoulder (on foot) or chase (in vehicle) camera framing,
 * including building wall collision pull-in so the camera never clips inside geometry.
 */
export function computeDesiredCameraPose(state) {
  const { player, cityMap } = state;
  const cam = state.camera || {};
  const colliders = cityMap.colliders || cityMap.buildings;
  const yaw = (cam.yaw !== undefined ? cam.yaw : -Math.PI * 0.5) + (cam.recoilYaw || 0);
  const rawPitch = (cam.pitch !== undefined ? cam.pitch : -0.06) + (cam.recoilPitch || 0);
  const pitch = Math.max(-0.58, Math.min(0.72, rawPitch));

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const rightX = -sinY;
  const rightY = cosY;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // Camera look direction in world (x, y_2d, z_height)
  const dirX = cosP * cosY;
  const dirY = cosP * sinY;
  const dirZ = sinP;

  const insideShop = getActiveWalkInShopAt(player.x, player.y, cityMap.shops);
  const inClub = isInsideClubEclipse(player.x, player.y);

  if (player.vehicle) {
    const v = player.vehicle;
    const spd = v.speed || 0;
    const preset = cam.vehCamPreset !== undefined ? cam.vehCamPreset : 1;
    let distBack = 92 + Math.min(28, spd * 0.065);
    let anchorUp = 19.5;
    let fov = 58 + Math.min(14, (spd / 420) * 14) + (v.nitroActive ? 4 : 0);
    let indoorMode = 'outdoor';

    if (insideShop && insideShop.interior) {
      distBack = 42;
      anchorUp = Math.min(insideShop.interior.ceilingH - 9, 15.5);
      fov = 60;
      indoorMode = 'shop';
    } else if (inClub) {
      distBack = 64;
      anchorUp = 17.5;
      indoorMode = 'club';
    } else if (preset === 0) {
      // CLOSE
      distBack = 68 + Math.min(18, spd * 0.045);
      anchorUp = 17.5;
      fov = 56 + Math.min(12, (spd / 420) * 12) + (v.nitroActive ? 4 : 0);
    } else if (preset === 2) {
      // FAR
      distBack = 128 + Math.min(34, spd * 0.08);
      anchorUp = 24.5;
      fov = 62 + Math.min(14, (spd / 420) * 14) + (v.nitroActive ? 4 : 0);
    } else if (preset === 3) {
      // HOOD CAM
      const hoodX = player.x + Math.cos(v.angle) * ((v.length || 50) * 0.16);
      const hoodY = player.y + Math.sin(v.angle) * ((v.length || 50) * 0.16);
      const hoodZ = (player.z || 0) + (v.height || 14) * 0.92;
      return {
        eyeX: hoodX,
        eyeY: hoodY,
        eyeZ: hoodZ,
        lookX: hoodX + dirX * 220,
        lookY: hoodY + dirY * 220,
        lookZ: hoodZ + dirZ * 220,
        dirX,
        dirY,
        dirZ,
        pivX: hoodX,
        pivY: hoodY,
        pivZ: hoodZ,
        actualDist: 0,
        fov: 66 + (v.nitroActive ? 4 : 0),
        indoorMode: 'outdoor'
      };
    }

    const pivX = player.x;
    const pivY = player.y;
    const pivZ = (player.z || 0) + anchorUp;

    let actualDist = distBack;
    if (dirZ > 0.01 && pivZ - dirZ * actualDist < 3.0) {
      actualDist = Math.max(6, (pivZ - 3.0) / dirZ);
    }
    if (insideShop && insideShop.interior && dirZ < -0.01) {
      const ceil = insideShop.interior.ceilingH - 2.5;
      if (pivZ - dirZ * actualDist > ceil) {
        actualDist = Math.max(6, (ceil - pivZ) / -dirZ);
      }
    }

    const hitWall = raycastColliders3D(pivX, pivY, pivZ, -dirX, -dirY, -dirZ, actualDist + 2.5, colliders, 2.4);
    if (hitWall) {
      actualDist = Math.max(6.0, hitWall.t - 2.4);
    }

    let eyeX = pivX - dirX * actualDist;
    let eyeY = pivY - dirY * actualDist;
    let eyeZ = Math.max(2.6, pivZ - dirZ * actualDist);

    if (pointInBuilding(eyeX, eyeY, colliders, 1.8)) {
      eyeX = pivX - dirX * 4;
      eyeY = pivY - dirY * 4;
    }

    return {
      eyeX,
      eyeY,
      eyeZ,
      lookX: pivX + dirX * 220,
      lookY: pivY + dirY * 220,
      lookZ: pivZ + dirZ * 220,
      dirX,
      dirY,
      dirZ,
      pivX,
      pivY,
      pivZ,
      actualDist,
      fov,
      indoorMode
    };
  }

  // On-foot over-the-shoulder TPS camera (widens slightly when sprinting, tightens on RMB aim)
  const aimBlend = cam.aimBlend || 0;
  let distBack = 44 - aimBlend * 20;
  let shoulderRight = 6.6 + aimBlend * 1.8;
  let anchorUp = 15.6 + aimBlend * 0.6;
  let fov = 58 - aimBlend * 14;
  let indoorMode = 'outdoor';

  if (insideShop && insideShop.interior) {
    distBack = 25 - aimBlend * 7;
    shoulderRight = 4.2 + aimBlend * 1.3;
    anchorUp = Math.min(insideShop.interior.ceilingH - 9, 14.5);
    fov = 60 - aimBlend * 12;
    indoorMode = 'shop';
  } else if (inClub) {
    distBack = 35 - aimBlend * 12;
    shoulderRight = 5.4 + aimBlend * 1.4;
    anchorUp = 15.0;
    indoorMode = 'club';
  }

  // Prevent right-shoulder offset from clipping into a wall to the player's right
  const chestZ = (player.z || 0) + 14.5;
  const hitShoulder = raycastColliders3D(player.x, player.y, chestZ, rightX, rightY, 0, shoulderRight + 2.2, colliders, 2.0);
  if (hitShoulder) {
    shoulderRight = Math.max(0, hitShoulder.t - 2.2);
  }

  const pivX = player.x + rightX * shoulderRight;
  const pivY = player.y + rightY * shoulderRight;
  const pivZ = (player.z || 0) + anchorUp;

  let actualDist = distBack;
  if (dirZ > 0.01 && pivZ - dirZ * actualDist < 2.2) {
    actualDist = Math.max(4.5, (pivZ - 2.2) / dirZ);
  }
  if (insideShop && insideShop.interior && dirZ < -0.01) {
    const ceil = insideShop.interior.ceilingH - 2.4;
    if (pivZ - dirZ * actualDist > ceil) {
      actualDist = Math.max(4.5, (ceil - pivZ) / -dirZ);
    }
  }

  const hitWall = raycastColliders3D(pivX, pivY, pivZ, -dirX, -dirY, -dirZ, actualDist + 2.5, colliders, 2.4);
  if (hitWall) {
    actualDist = Math.max(4.5, hitWall.t - 2.4);
  }

  let eyeX = pivX - dirX * actualDist;
  let eyeY = pivY - dirY * actualDist;
  let eyeZ = Math.max(2.2, pivZ - dirZ * actualDist);

  if (insideShop && insideShop.interior) {
    const ib = insideShop.interior;
    eyeY = Math.max(ib.y1 + 3.5, Math.min(ib.y2 - 3.5, eyeY));
  }
  if (pointInBuilding(eyeX, eyeY, colliders, 1.6)) {
    for (let s = 0.8; s >= 0.1; s -= 0.15) {
      const tx = pivX + (eyeX - pivX) * s;
      const ty = pivY + (eyeY - pivY) * s;
      if (!pointInBuilding(tx, ty, colliders, 1.6)) {
        eyeX = tx;
        eyeY = ty;
        break;
      }
    }
    if (pointInBuilding(eyeX, eyeY, colliders, 1.2)) {
      eyeX = player.x;
      eyeY = player.y;
    }
  }

  return {
    eyeX,
    eyeY,
    eyeZ,
    lookX: pivX + dirX * 220,
    lookY: pivY + dirY * 220,
    lookZ: pivZ + dirZ * 220,
    dirX,
    dirY,
    dirZ,
    pivX,
    pivY,
    pivZ,
    actualDist,
    fov,
    indoorMode
  };
}

export function computeAimRay(state) {
  const pose = computeDesiredCameraPose(state);
  const hit = raycastWorldForAim(
    pose.eyeX,
    pose.eyeY,
    pose.eyeZ,
    pose.dirX,
    pose.dirY,
    pose.dirZ,
    900,
    state,
    pose.actualDist + 3.5
  );
  if (state.camera) {
    state.camera.aimHitPoint = { x: hit.x, y: hit.y, z: hit.z };
    state.camera.aimTargetType = hit.type;
    state.camera.aimDirection = { x: pose.dirX, y: pose.dirY, z: pose.dirZ };
    state.camera.aimDirection3D = { x: pose.dirX, y: pose.dirZ, z: pose.dirY };
  }
  return { pose, hit };
}

export function switchPlayerWeapon(state, newIndex) {
  const { player } = state;
  const count = WEAPONS.length;
  const clamped = ((Math.floor(newIndex) % count) + count) % count;
  if (clamped !== player.weaponIndex) {
    player.weaponIndex = clamped;
    player.reloadTimer = 0;
    player.reloadingWeaponId = null;
    player.fireCooldown = Math.min(player.fireCooldown || 0, 0.12);
  }
  return clamped;
}

export function completeWeaponReload(state) {
  const { player } = state;
  const targetId = player.reloadingWeaponId;
  player.reloadTimer = 0;
  player.reloadingWeaponId = null;
  const weapon = WEAPONS.find((w) => w.id === targetId) || WEAPONS[player.weaponIndex];
  if (!weapon || weapon.isMelee || !weapon.magSize) return false;

  if (!player.weaponAmmo) player.weaponAmmo = createInitialWeaponAmmo();
  if (!player.weaponMag) player.weaponMag = createInitialWeaponMag();

  const curMag = player.weaponMag[weapon.id] ?? 0;
  const reserve = player.weaponAmmo[weapon.id] ?? 0;
  const needed = Math.max(0, weapon.magSize - curMag);
  const loaded = Math.min(needed, reserve);
  if (loaded > 0) {
    player.weaponMag[weapon.id] = curMag + loaded;
    player.weaponAmmo[weapon.id] = reserve - loaded;
  }
  if (state.audio && state.audio.playReloadFinish) {
    state.audio.playReloadFinish(weapon.id, player.x, player.y);
  }
  return loaded > 0;
}

export function getDriveByWeapon(player) {
  const cur = WEAPONS[player.weaponIndex] || WEAPONS[1];
  if (cur.id === 'pistol' || cur.id === 'smg') {
    const m = player.weaponMag?.[cur.id] ?? 0;
    const r = player.weaponAmmo?.[cur.id] ?? 0;
    if (m + r > 0) return cur;
  }
  const pistol = WEAPONS[1];
  const smg = WEAPONS[2];
  const pm = (player.weaponMag?.[pistol.id] ?? 0) + (player.weaponAmmo?.[pistol.id] ?? 0);
  const sm = (player.weaponMag?.[smg.id] ?? 0) + (player.weaponAmmo?.[smg.id] ?? 0);
  if (pm > 0) return pistol;
  if (sm > 0) return smg;
  return cur.id === 'smg' ? smg : pistol;
}

export function startWeaponReload(state) {
  const { player } = state;
  if (
    state.paused ||
    state.startScreenOpen ||
    state.outcome ||
    (state.shopModal && state.shopModal.open) ||
    state.safehouseModalOpen ||
    (state.nightlife &&
      (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session))
  ) {
    return false;
  }

  const weapon = player.vehicle
    ? getDriveByWeapon(player)
    : WEAPONS[player.weaponIndex] || WEAPONS[1];
  if (!weapon || weapon.isMelee || !weapon.magSize) return false;
  if ((player.reloadTimer || 0) > 0) return false;

  if (!player.weaponAmmo) player.weaponAmmo = createInitialWeaponAmmo();
  if (!player.weaponMag) player.weaponMag = createInitialWeaponMag();

  const curMag = player.weaponMag[weapon.id] ?? weapon.magSize;
  const reserve = player.weaponAmmo[weapon.id] ?? 0;
  if (curMag >= weapon.magSize || reserve <= 0) return false;

  player.reloadTimer = weapon.reloadTime || 1.25;
  player.reloadingWeaponId = weapon.id;
  if (state.camera) state.camera.aiming = false;
  if (state.audio && state.audio.playReloadStart) {
    state.audio.playReloadStart(weapon.id, player.x, player.y);
  }
  return true;
}

export function performMeleePunch(state) {
  const { player, pedestrians, vehicles, particles } = state;
  if (
    state.paused ||
    state.startScreenOpen ||
    player.vehicle ||
    (state.shopModal && state.shopModal.open) ||
    state.safehouseModalOpen ||
    (state.nightlife &&
      (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session))
  ) {
    return false;
  }
  if ((player.punchCooldown || 0) > 0) return false;

  // Cancel active reload cleanly for instant responsive melee
  if ((player.reloadTimer || 0) > 0) {
    player.reloadTimer = 0;
    player.reloadingWeaponId = null;
  }

  const combo = ((player.punchCombo || 0) % 3) + 1;
  player.punchCombo = combo;
  player.punchHand = combo === 1 ? 'left' : combo === 2 ? 'right' : 'heavy';
  player.punchDuration = 0.28;
  player.punchTimer = 0.28;
  player.punchCooldown = 0.34;
  player.fireCooldown = 0.34;
  player.aimHoldTimer = 0.45;
  if (state.nightlife && state.nightlife.dancing) {
    state.nightlife.dancing = false;
  }

  const camYaw = state.camera && typeof state.camera.yaw === 'number' ? state.camera.yaw : player.angle;
  player.angle = camYaw;
  const cosA = Math.cos(player.angle);
  const sinA = Math.sin(player.angle);

  // Crisp forward boxing step lunge
  player.vx += cosA * 38;
  player.vy += sinA * 38;

  if (state.audio && state.audio.playMeleeSwing) {
    state.audio.playMeleeSwing(combo, player.x, player.y);
  }

  const range = 36;
  const damage = combo === 3 ? 42 : 28;
  let bestNpc = null;
  let bestNpcDist = Infinity;

  if (pedestrians) {
    for (const npc of pedestrians) {
      if (npc.dead || npc.inCar) continue;
      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;
      if (Math.abs((npc.z || 0) - (player.z || 0)) > 20) continue;
      const dot = dist > 0.01 ? (dx * cosA + dy * sinA) / dist : 1;
      if (dist < 11 || dot > 0.35) {
        if (dist < bestNpcDist) {
          bestNpcDist = dist;
          bestNpc = npc;
        }
      }
    }
  }

  if (bestNpc) {
    const isHeavy = combo === 3;
    const willDie = bestNpc.hp - damage <= 0;
    bestNpc.shoveTimer = isHeavy ? 0.48 : 0.36;
    bestNpc.vx = cosA * (isHeavy ? 135 : 92);
    bestNpc.vy = sinA * (isHeavy ? 135 : 92);
    bestNpc.vz = isHeavy ? 30 : 18;

    damagePedestrian(state, bestNpc, damage, cosA * 115, sinA * 115, { isMelee: true });

    if (
      !bestNpc.dead &&
      bestNpc.brave &&
      !bestNpc.isVendor &&
      !bestNpc.isSeated &&
      !bestNpc.isDancer &&
      !bestNpc.isCompanion &&
      !bestNpc.hostile
    ) {
      bestNpc.fightBackTimer = 14.0;
      bestNpc.panicTimer = 0;
      bestNpc.meleeCooldown = 0.45;
    }

    if (state.audio && state.audio.playMeleeHit) {
      state.audio.playMeleeHit(isHeavy, bestNpc.x, bestNpc.y);
    }
    if (particles) {
      for (let k = 0; k < 5; k++) {
        particles.push({
          x: bestNpc.x + (Math.random() - 0.5) * 6,
          y: bestNpc.y + (Math.random() - 0.5) * 6,
          z: (bestNpc.z || 0) + 11 + Math.random() * 4,
          vx: cosA * 38 + (Math.random() - 0.5) * 45,
          vy: sinA * 38 + (Math.random() - 0.5) * 45,
          vz: 14 + Math.random() * 18,
          size: 3.0,
          color: '#dfd5c6',
          life: 0.28,
          maxLife: 0.28,
          kind: 'smoke'
        });
      }
    }
    if (state.camera) {
      state.camera.hitMarkerTimer = 0.17;
      state.camera.hitMarkerCrit = willDie;
      state.camera.trauma = Math.min(1, (state.camera.trauma || 0) + (isHeavy ? 0.14 : 0.08));
    }
    addCrimeHeat(state, bestNpc.role === 'police' ? 58 : 22, 'MELEE ASSAULT REPORTED');
    return true;
  }

  // Check melee strike against nearby vehicles
  if (vehicles) {
    let bestVeh = null;
    let bestVehDist = Infinity;
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const dx = v.x - player.x;
      const dy = v.y - player.y;
      const dist = Math.hypot(dx, dy);
      const effDist = dist - Math.max(v.width || 24, v.length || 50) * 0.45;
      if (effDist > range) continue;
      const dot = dist > 0.01 ? (dx * cosA + dy * sinA) / dist : 1;
      if (effDist < 12 || dot > 0.35) {
        if (effDist < bestVehDist) {
          bestVehDist = effDist;
          bestVeh = v;
        }
      }
    }
    if (bestVeh) {
      bestVeh.hp = Math.max(15, bestVeh.hp - 14);
      bestVeh.suspVel = (bestVeh.suspVel || 0) + 5;
      const hitX = player.x + cosA * 18;
      const hitY = player.y + sinA * 18;
      if (state.audio && state.audio.playMeleeHit) {
        state.audio.playMeleeHit(false, hitX, hitY);
      }
      if (particles) {
        for (let k = 0; k < 4; k++) {
          particles.push({
            x: hitX,
            y: hitY,
            z: (player.z || 0) + 10,
            vx: (Math.random() - 0.5) * 65,
            vy: (Math.random() - 0.5) * 65,
            vz: 18 + Math.random() * 20,
            size: 2.2,
            color: '#f2ca78',
            life: 0.2,
            maxLife: 0.2,
            kind: 'spark'
          });
        }
      }
      if (state.camera) {
        state.camera.hitMarkerTimer = 0.14;
        state.camera.hitMarkerCrit = false;
        state.camera.trauma = Math.min(1, (state.camera.trauma || 0) + 0.07);
      }
      return true;
    }
  }

  return true;
}

export function updatePlayerOnFoot(state, dt) {
  const { player, input, cityMap } = state;
  const cam = state.camera;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.punchCooldown = Math.max(0, (player.punchCooldown || 0) - dt);
  player.punchTimer = Math.max(0, (player.punchTimer || 0) - dt);
  player.muzzleTimer = Math.max(0, player.muzzleTimer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.aimHoldTimer = Math.max(0, (player.aimHoldTimer || 0) - dt);
  player.weaponRecoil = Math.max(0, (player.weaponRecoil || 0) - 9.5 * dt);
  player.landSquash = Math.max(0, (player.landSquash || 0) - 7.5 * dt);
  player.spreadBloom = Math.max(0, (player.spreadBloom || 0) - 0.14 * dt);
  player.jumpBufferTimer = Math.max(0, (player.jumpBufferTimer || 0) - dt);

  if (cam) {
    cam.recoilPitch = (cam.recoilPitch || 0) * Math.exp(-13 * dt);
    cam.recoilYaw = (cam.recoilYaw || 0) * Math.exp(-13 * dt);
    cam.hitMarkerTimer = Math.max(0, (cam.hitMarkerTimer || 0) - dt);
    cam.damageFlash = Math.max(0, (cam.damageFlash || 0) - 2.4 * dt);
    cam.explosionFlash = Math.max(0, (cam.explosionFlash || 0) - 3.2 * dt);
    cam.vehCamLabelTimer = Math.max(0, (cam.vehCamLabelTimer || 0) - dt);
    const targetAim = cam.aiming && !player.vehicle && (player.reloadTimer || 0) <= 0 ? 1 : 0;
    cam.aimBlend = (cam.aimBlend || 0) + (targetAim - (cam.aimBlend || 0)) * Math.min(1, 14 * dt);
  }

  if ((player.reloadTimer || 0) > 0) {
    player.reloadTimer = Math.max(0, player.reloadTimer - dt);
    if (player.reloadTimer <= 0) {
      completeWeaponReload(state);
    }
  }

  if (player.vehicle) {
    return;
  }

  const modalOpen = Boolean(
    state.outcome ||
      (state.shopModal && state.shopModal.open) ||
      state.safehouseModalOpen ||
      (state.nightlife &&
        (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session))
  );

  const colliders = cityMap.colliders || cityMap.buildings;

  if (modalOpen) {
    player.vx *= Math.exp(-10 * dt);
    player.vy *= Math.exp(-10 * dt);
    player.vz = (player.vz || 0) - PLAYER_PHYSICS.gravity * dt;
    player.z = Math.max(getGroundHeightAt(player.x, player.y, player.z || 0, state.vehicles), (player.z || 0) + player.vz * dt);
    if (player.z <= getGroundHeightAt(player.x, player.y, player.z, state.vehicles)) {
      player.vz = 0;
      player.grounded = true;
    }
    return;
  }

  // Camera-relative WASD axes
  const camYaw = cam && cam.yaw !== undefined ? cam.yaw : -Math.PI * 0.5;
  const fwdX = Math.cos(camYaw);
  const fwdY = Math.sin(camYaw);
  const rightX = -fwdY;
  const rightY = fwdX;

  const moveRight =
    (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) -
    (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
  const moveFwd =
    (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) -
    (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);

  const aiming = Boolean(cam && cam.aiming);
  const hasMoveInput = moveRight !== 0 || moveFwd !== 0;
  const isSprinting =
    !aiming && hasMoveInput && Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
  const targetSpeed = aiming
    ? PLAYER_PHYSICS.aimSpeed
    : isSprinting
      ? PLAYER_PHYSICS.sprintSpeed
      : PLAYER_PHYSICS.walkSpeed;

  let wishVx = 0;
  let wishVy = 0;
  if (hasMoveInput) {
    let wx = fwdX * moveFwd + rightX * moveRight;
    let wy = fwdY * moveFwd + rightY * moveRight;
    const len = Math.hypot(wx, wy) || 1;
    wx /= len;
    wy /= len;
    wishVx = wx * targetSpeed;
    wishVy = wy * targetSpeed;
    if (state.nightlife && state.nightlife.dancing) {
      state.nightlife.dancing = false;
    }
  }

  const grounded = player.grounded !== false;
  const accelRate = grounded
    ? hasMoveInput
      ? PLAYER_PHYSICS.accelRate
      : PLAYER_PHYSICS.decelRate
    : PLAYER_PHYSICS.airControl;
  const alpha = 1 - Math.exp(-accelRate * dt);
  player.vx += (wishVx - player.vx) * alpha;
  player.vy += (wishVy - player.vy) * alpha;
  if (!hasMoveInput && Math.hypot(player.vx, player.vy) < 1.2) {
    player.vx = 0;
    player.vy = 0;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Jump on Space (with coyote time + jump buffer) + gravity
  const preGroundZ = getGroundHeightAt(player.x, player.y, player.z || 0, state.vehicles);
  if ((player.jumpBufferTimer || 0) > 0 && (grounded || (player.coyoteTimer || 0) > 0)) {
    player.vz = PLAYER_PHYSICS.jumpVelocity;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    if (state.nightlife && state.nightlife.dancing) {
      state.nightlife.dancing = false;
    }
    if (state.particles) {
      for (let k = 0; k < 4; k++) {
        state.particles.push({
          x: player.x + (Math.random() - 0.5) * 6,
          y: player.y + (Math.random() - 0.5) * 6,
          z: preGroundZ + 0.8,
          vx: (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 35,
          vz: 8 + Math.random() * 14,
          size: 2.8,
          color: '#c9c1b2',
          life: 0.32,
          maxLife: 0.32,
          kind: 'smoke'
        });
      }
    }
    if (state.audio && state.audio.playJump) {
      state.audio.playJump(player.x, player.y);
    }
  }

  player.vz = (player.vz || 0) - PLAYER_PHYSICS.gravity * dt;
  player.z = (player.z || 0) + player.vz * dt;
  const postGroundZ = getGroundHeightAt(player.x, player.y, player.z, state.vehicles);

  if (player.z <= postGroundZ) {
    const impactVz = player.vz;
    if (!grounded && impactVz < -35) {
      const fallIntensity = Math.min(1, Math.abs(impactVz) / 115);
      player.landSquash = Math.max(player.landSquash || 0, fallIntensity);
      if (state.particles) {
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI * 2) / 6;
          state.particles.push({
            x: player.x + Math.cos(ang) * 4,
            y: player.y + Math.sin(ang) * 4,
            z: postGroundZ + 0.8,
            vx: Math.cos(ang) * (25 + fallIntensity * 25),
            vy: Math.sin(ang) * (25 + fallIntensity * 25),
            vz: 10 + Math.random() * 12,
            size: 3.2,
            color: '#c4bcb0',
            life: 0.38,
            maxLife: 0.38,
            kind: 'smoke'
          });
        }
      }
      if (state.audio && state.audio.playLand) {
        state.audio.playLand(fallIntensity, player.x, player.y);
      }
    }
    player.z = postGroundZ;
    player.vz = 0;
    player.grounded = true;
    player.coyoteTimer = PLAYER_PHYSICS.coyoteTime;
  } else {
    player.grounded = false;
    player.coyoteTimer = Math.max(0, (player.coyoteTimer || 0) - dt);
  }

  // Footstep phase & procedural footstep audio synced to gait
  const horizSpd = Math.hypot(player.vx, player.vy);
  if (player.grounded && horizSpd > 14) {
    const prevPhase = player.walkPhase;
    player.walkPhase += horizSpd * dt * 0.14;
    if (Math.floor(prevPhase / Math.PI) !== Math.floor(player.walkPhase / Math.PI)) {
      const surface =
        player.x >= COAST_X
          ? 'sand'
          : player.x >= COAST_X - 32 && player.x < COAST_X
            ? 'boardwalk'
            : 'pavement';
      if (state.audio && state.audio.playFootstep) {
        state.audio.playFootstep(surface, isSprinting, player.x, player.y);
      }
      if ((isSprinting || surface === 'sand') && state.particles) {
        state.particles.push({
          x: player.x + (Math.random() - 0.5) * 4,
          y: player.y + (Math.random() - 0.5) * 4,
          z: postGroundZ + 0.6,
          vx: -player.vx * 0.12 + (Math.random() - 0.5) * 14,
          vy: -player.vy * 0.12 + (Math.random() - 0.5) * 14,
          vz: 8 + Math.random() * 8,
          size: 2.2,
          color: surface === 'sand' ? '#d4bf98' : '#b8b2a6',
          life: 0.28,
          maxLife: 0.28,
          kind: 'smoke'
        });
      }
    }
  }

  // Smooth facing: face crosshair when aiming/firing, else face movement direction
  if (aiming || player.aimHoldTimer > 0 || player.muzzleTimer > 0) {
    let targetYaw = camYaw;
    if (cam && cam.aimHitPoint) {
      const dxH = cam.aimHitPoint.x - player.x;
      const dyH = cam.aimHitPoint.y - player.y;
      if (dxH * dxH + dyH * dyH > 144) {
        targetYaw = Math.atan2(dyH, dxH);
      }
    }
    player.angle = lerpAngle(player.angle, targetYaw, 22 * dt);
  } else if (horizSpd > 8) {
    player.angle = lerpAngle(player.angle, Math.atan2(player.vy, player.vx), 13 * dt);
  }

  // Solid collisions against buildings, world props, and vehicles (cannot walk through cars!)
  resolveCircleBuildingCollisions(player, PLAYER_PHYSICS.radius, colliders);
  resolveCircleProps(player, PLAYER_PHYSICS.radius, player.z || 0, cityMap.propColliders);
  if (state.vehicles) {
    for (const v of state.vehicles) {
      if (v.destroyed) continue;
      resolveCircleOBBCollision(player, PLAYER_PHYSICS.radius, v, true);
    }
  }
}

export function firePlayerWeapon(state) {
  const { player, projectiles, particles } = state;
  if (
    state.paused ||
    state.startScreenOpen ||
    state.outcome ||
    (state.shopModal && state.shopModal.open) ||
    state.safehouseModalOpen ||
    (state.nightlife &&
      (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session))
  ) {
    return false;
  }

  const weapon = player.vehicle
    ? getDriveByWeapon(player)
    : WEAPONS[player.weaponIndex] || WEAPONS[1];
  if (weapon.isMelee) {
    if (player.vehicle) return false;
    return performMeleePunch(state);
  }

  if ((player.reloadTimer || 0) > 0) return false;
  if (player.fireCooldown > 0) return false;

  if (!player.weaponAmmo) {
    player.weaponAmmo = createInitialWeaponAmmo();
  }
  if (!player.weaponMag) {
    player.weaponMag = createInitialWeaponMag();
  }

  const curMag = player.weaponMag[weapon.id] ?? 0;
  const reserve = player.weaponAmmo[weapon.id] ?? 0;

  if (curMag <= 0) {
    if (reserve > 0) {
      startWeaponReload(state);
      return false;
    } else {
      player.fireCooldown = 0.35;
      state.hudBanner = {
        title: `${weapon.shortName} OUT OF AMMO`,
        subtitle: 'VISIT VICE ARMORY • GUNS & GEAR TO RESTOCK [E]',
        color: '#d97c5b',
        timer: 2.2
      };
      if (state.audio && state.audio.playDryFire) state.audio.playDryFire(player.x, player.y);
      else if (state.audio && state.audio.playErrorTone) state.audio.playErrorTone();
      return false;
    }
  }

  const activeMag = player.weaponMag[weapon.id] ?? 0;
  player.weaponMag[weapon.id] = Math.max(0, activeMag - 1);
  player.fireCooldown = weapon.fireRate;
  player.muzzleTimer = 0.09;
  player.aimHoldTimer = 0.9;
  player.weaponRecoil = 1.0;

  const { hit } = computeAimRay(state);
  const camYaw = state.camera && state.camera.yaw !== undefined ? state.camera.yaw : player.angle;
  const camPitch = state.camera && state.camera.pitch !== undefined ? state.camera.pitch : 0;

  // Snap character toward target yaw on shot
  const dxT = hit.x - player.x;
  const dyT = hit.y - player.y;
  if (!player.vehicle && dxT * dxT + dyT * dyT > 64) {
    player.angle = Math.atan2(dyT, dxT);
  } else if (!player.vehicle) {
    player.angle = camYaw;
  }

  const aimAngle = player.vehicle ? camYaw : Number.isFinite(player.angle) ? player.angle : -Math.PI * 0.5;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  let ox;
  let oy;
  let oz;

  if (player.vehicle) {
    const v = player.vehicle;
    const drvSideAng = v.angle - Math.PI * 0.5;
    ox = player.x + Math.cos(v.angle) * 4 + Math.cos(drvSideAng) * ((v.width || 24) * 0.48);
    oy = player.y + Math.sin(v.angle) * 4 + Math.sin(drvSideAng) * ((v.width || 24) * 0.48);
    oz = (player.z || 0) + (v.height || 14) * 0.66;
    player.muzzleWorldPos = { x: ox, y: oy, z: oz };
  } else if (player.muzzleWorldPos) {
    ox = player.muzzleWorldPos.x;
    oy = player.muzzleWorldPos.y;
    oz = player.muzzleWorldPos.z;
  } else {
    ox = player.x + cosA * 11 - sinA * 3.1;
    oy = player.y + sinA * 11 + cosA * 3.1;
    oz = (player.z || 0) + 14.8 + Math.sin(camPitch) * 4;
  }

  // Exact 3D direction from muzzle to crosshair raycast hit point
  let dirX = hit.x - ox;
  let dirY = hit.y - oy;
  let dirZ = hit.z - oz;
  const dLen = Math.hypot(dirX, dirY, dirZ) || 1;
  dirX /= dLen;
  dirY /= dLen;
  dirZ /= dLen;

  const baseSpread = weapon.spread * (state.camera && state.camera.aiming ? 0.65 : 1.0) + (player.spreadBloom || 0) * 0.35;
  const baseYaw = Math.atan2(dirY, dirX);
  const basePitch = Math.asin(Math.max(-0.98, Math.min(0.98, dirZ)));

  for (let p = 0; p < weapon.pellets; p++) {
    const sy = baseYaw + (Math.random() - 0.5) * baseSpread * 2;
    const sp = basePitch + (Math.random() - 0.5) * baseSpread * 1.4;
    const cp = Math.cos(sp);
    projectiles.push({
      x: ox,
      y: oy,
      z: oz,
      vx: cp * Math.cos(sy) * weapon.speed,
      vy: cp * Math.sin(sy) * weapon.speed,
      vz: Math.sin(sp) * weapon.speed,
      damage: weapon.damage,
      life: weapon.range / weapon.speed,
      color: weapon.color,
      fromPlayer: true,
      explosiveRadius: weapon.explosiveRadius || 0,
      isRocket: Boolean(weapon.explosiveRadius)
    });
  }

  player.spreadBloom = Math.min(0.14, (player.spreadBloom || 0) + (weapon.bloomPerShot || 0.015));
  if (state.camera) {
    state.camera.recoilPitch = Math.min(0.14, (state.camera.recoilPitch || 0) + (weapon.recoilPitch || 0.018));
    state.camera.recoilYaw = (state.camera.recoilYaw || 0) + (Math.random() - 0.5) * 0.012;
    state.camera.trauma = Math.min(1, state.camera.trauma + (weapon.explosiveRadius ? 0.28 : 0.075));
  }

  // Nearby civilians realistically flee & vendors duck behind counters on gunshots
  alertNearbyCivilians(state, ox, oy, 280);

  // Muzzle flash sparks
  for (let i = 0; i < 6; i++) {
    const spAngle = aimAngle + (Math.random() - 0.5) * 0.55;
    particles.push({
      x: ox,
      y: oy,
      z: oz,
      vx: Math.cos(spAngle) * (130 + Math.random() * 100),
      vy: Math.sin(spAngle) * (130 + Math.random() * 100),
      vz: Math.sin(basePitch) * 90 + (Math.random() - 0.3) * 40,
      size: 2.1,
      color: '#f2c26b',
      life: 0.16,
      maxLife: 0.16,
      kind: 'spark'
    });
  }

  if (state.audio) state.audio.playShot(weapon.id, ox, oy);

  // Auto-reload cleanly when magazine empties and reserve ammo remains
  if (player.weaponMag[weapon.id] <= 0 && (player.weaponAmmo[weapon.id] || 0) > 0) {
    startWeaponReload(state);
  }
  return true;
}

export function triggerExplosion(state, x, y, z = 8, radius = 115, maxDamage = 260, opts = {}) {
  const { particles, vehicles, pedestrians, player } = state;

  // Layered wispy warm-amber fireball core nestled inside dark charcoal smoke plumes
  const smokeOffsets = [
    [-12, -8, 18, 16, '#2e3138'],
    [11, -9, 22, 17, '#383c44'],
    [-6, 8, 25, 18, '#2b2e35'],
    [14, 5, 17, 15, '#3f444d'],
    [2, -4, 30, 19, '#31353d'],
    [-14, 2, 13, 14, '#3a3e47']
  ];
  for (const [ox, oy, oz, sz, col] of smokeOffsets) {
    particles.push({
      x: x + ox,
      y: y + oy,
      z: z + oz,
      vx: ox * 1.4,
      vy: oy * 1.4,
      vz: 24 + (sz % 5) * 4,
      size: sz,
      color: col,
      life: 0.85,
      maxLife: 1.05,
      kind: 'smoke_heavy'
    });
  }

  particles.push({
    x: x + 3,
    y: y + 4,
    z: z + 9,
    vx: 0,
    vy: 0,
    vz: 16,
    size: 16,
    color: '#d96226',
    life: 0.62,
    maxLife: 0.72,
    kind: 'fireball'
  });

  particles.push({
    x: x - 4,
    y: y + 5,
    z: z + 11,
    vx: 0,
    vy: 0,
    vz: 14,
    size: 14,
    color: '#e6842e',
    life: 0.66,
    maxLife: 0.75,
    kind: 'fireball'
  });

  particles.push({
    x: x,
    y: y + 6,
    z: z + 9,
    vx: 0,
    vy: 0,
    vz: 12,
    size: 11,
    color: '#f2be63',
    life: 0.48,
    maxLife: 0.55,
    kind: 'fireball_core'
  });

  // Subtle warm-amber ground blast shockwave ring
  particles.push({
    x,
    y,
    z: 1.8,
    vx: 0,
    vy: 0,
    vz: 0,
    size: radius * 0.62,
    color: '#d9823b',
    life: 0.44,
    maxLife: 0.52,
    kind: 'shockwave'
  });

  // Fine ember sparks, rising ash wisps & tumbling 3D debris chunks
  for (let i = 0; i < 20; i++) {
    const ang = (i * Math.PI * 2) / 20 + ((i % 3) - 1) * 0.08;
    const spd = 65 + (i % 5) * 28;
    const isEmber = i % 2 === 0;
    particles.push({
      x: x + Math.cos(ang) * (isEmber ? 14 : 18),
      y: y + Math.sin(ang) * (isEmber ? 14 : 18),
      z: z + 6 + (i % 4) * 5,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      vz: 42 + (i % 4) * 18,
      size: isEmber ? 2.4 : 7.5,
      color: isEmber ? '#f0a44b' : '#3a3e46',
      life: 0.65 + (i % 3) * 0.14,
      maxLife: 1.0,
      kind: isEmber ? 'spark' : 'smoke_heavy'
    });
  }
  for (let d = 0; d < 10; d++) {
    const ang = (d * Math.PI * 2) / 10 + 0.2;
    const spd = 55 + (d % 4) * 28;
    particles.push({
      x: x + Math.cos(ang) * 8,
      y: y + Math.sin(ang) * 8,
      z: z + 4,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      vz: 85 + (d % 3) * 32,
      size: 1.6 + (d % 3) * 0.5,
      color: '#2d3138',
      life: 1.05,
      maxLife: 1.05,
      rot: d * 0.8,
      rotVel: 6 + d,
      kind: 'debris'
    });
  }
  if (!state.impactMarks) state.impactMarks = [];
  state.impactMarks.push({
    x,
    y,
    z: 0.2,
    size: Math.min(28, radius * 0.24),
    life: 10,
    maxLife: 10
  });
  if (state.impactMarks.length > 32) {
    state.impactMarks.splice(0, state.impactMarks.length - 32);
  }

  // Damage vehicles in blast radius
  for (const v of vehicles) {
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < radius) {
      const factor = 1 - d / radius;
      v.hp -= maxDamage * factor;
      const pushAng = Math.atan2(v.y - y, v.x - x);
      v.vx += Math.cos(pushAng) * 180 * factor;
      v.vy += Math.sin(pushAng) * 180 * factor;
      if (v.hp <= 0 && !v.destroyed) {
        v.destroyed = true;
        v.onFire = false;
        v.color = '#1e293b';
        v.stripeColor = '#334155';
        if (player.vehicle === v) {
          if (!opts.skipPlayerBlast) {
            damagePlayer(state, 115, 'explosion');
          }
          player.vehicle = null;
          v.driver = null;
          player.x = v.x + 28;
          player.y = v.y;
          resolveCircleBuildingCollisions(player, 9, state.cityMap.buildings);
        }
        addCrimeHeat(state, v.isPolice ? 160 : 85, 'VEHICLE DESTROYED IN BLAST');
      }
    }
  }

  // Damage pedestrians in blast radius
  for (const npc of pedestrians) {
    if (npc.dead) continue;
    const d = Math.hypot(npc.x - x, npc.y - y);
    if (d < radius) {
      const factor = 1 - d / radius;
      damagePedestrian(state, npc, maxDamage * factor, npc.x - x, npc.y - y);
    }
  }

  const playerDist = Math.hypot(player.x - x, player.y - y);
  if (!player.vehicle && playerDist < radius) {
    const f = 1 - playerDist / radius;
    const pAng = Math.atan2(player.y - y, player.x - x);
    player.vx += Math.cos(pAng) * 140 * f;
    player.vy += Math.sin(pAng) * 140 * f;
    player.vz = Math.max(player.vz || 0, 48 * f);
    player.grounded = false;
    if (!opts.skipPlayerBlast) {
      damagePlayer(state, Math.round(maxDamage * 0.45 * f), 'explosion');
    }
  }
  if (playerDist < 520) {
    state.camera.trauma = Math.min(1, state.camera.trauma + 0.68 * (1 - playerDist / 520));
    state.camera.explosionFlash = Math.max(state.camera.explosionFlash || 0, 0.48 * (1 - playerDist / 520));
  }
  if (state.audio) state.audio.playExplosion(x, y);
}

function addBulletImpactMark(state, x, y, z) {
  if (!state.impactMarks) state.impactMarks = [];
  state.impactMarks.push({
    x,
    y,
    z: Math.max(0.22, z),
    size: 2.2,
    life: 6.5,
    maxLife: 6.5
  });
  if (state.impactMarks.length > 32) {
    state.impactMarks.splice(0, state.impactMarks.length - 32);
  }
}

export function updateCombatAndProjectiles(state, dt) {
  const { projectiles, particles, cityMap, vehicles, pedestrians, player, input } = state;

  // Keep aim raycast live every frame for crosshair target tinting & direction telemetry
  if (!state.camera.overridePose && !state.camera.nightlifePose) {
    computeAimRay(state);
  }

  if (state.impactMarks) {
    for (let i = state.impactMarks.length - 1; i >= 0; i--) {
      state.impactMarks[i].life -= dt;
      if (state.impactMarks[i].life <= 0) state.impactMarks.splice(i, 1);
    }
  }

  if (
    input.mouseDown &&
    !state.paused &&
    !state.startScreenOpen &&
    !state.outcome &&
    !(state.shopModal && state.shopModal.open) &&
    !state.safehouseModalOpen
  ) {
    firePlayerWeapon(state);
  }

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.life -= dt;
    if (proj.life <= 0) {
      if (proj.explosiveRadius > 0) {
        triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
      }
      projectiles.splice(i, 1);
      continue;
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.z = (proj.z || 11) + (proj.vz || 0) * dt;

    if (proj.isRocket && Math.random() < 0.88) {
      particles.push({
        x: proj.x,
        y: proj.y,
        z: proj.z,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        vz: 12,
        size: 4.8,
        color: '#fb923c',
        life: 0.28,
        maxLife: 0.28,
        kind: 'smoke'
      });
    }

    // Check ground impact
    if (proj.z <= 0.2) {
      if (proj.explosiveRadius > 0) {
        triggerExplosion(state, proj.x, proj.y, 2, proj.explosiveRadius, proj.damage);
      } else {
        addBulletImpactMark(state, proj.x, proj.y, 0.22);
        for (let k = 0; k < 3; k++) {
          particles.push({
            x: proj.x,
            y: proj.y,
            z: 1.0,
            vx: (Math.random() - 0.5) * 65,
            vy: (Math.random() - 0.5) * 65,
            vz: 24 + Math.random() * 25,
            size: 2.2,
            color: '#c9bfae',
            life: 0.26,
            maxLife: 0.26,
            kind: 'smoke'
          });
        }
        if (state.audio && state.audio.playBulletImpact) {
          state.audio.playBulletImpact('concrete', proj.x, proj.y);
        }
      }
      projectiles.splice(i, 1);
      continue;
    }

    // Check building / carved interior wall impact respecting height
    const hitBldg = pointInBuilding(proj.x, proj.y, cityMap.colliders || cityMap.buildings, 2);
    if (hitBldg && proj.z <= (hitBldg.height || 140)) {
      if (proj.explosiveRadius > 0) {
        triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
      } else {
        addBulletImpactMark(state, proj.x, proj.y, proj.z);
        for (let k = 0; k < 4; k++) {
          particles.push({
            x: proj.x,
            y: proj.y,
            z: proj.z,
            vx: -proj.vx * 0.14 + (Math.random() - 0.5) * 80,
            vy: -proj.vy * 0.14 + (Math.random() - 0.5) * 80,
            vz: 22 + Math.random() * 28,
            size: 2.4,
            color: '#fde047',
            life: 0.19,
            maxLife: 0.19,
            kind: 'spark'
          });
        }
        if (state.audio && state.audio.playBulletImpact) {
          state.audio.playBulletImpact('concrete', proj.x, proj.y);
        }
      }
      projectiles.splice(i, 1);
      continue;
    }

    let hitSomething = false;

    if (proj.fromPlayer) {
      // Check pedestrian hit (3D height check)
      for (const npc of pedestrians) {
        if (npc.dead || npc.inCar) continue;
        const baseZ = npc.z || 0;
        if (proj.z < baseZ - 1 || proj.z > baseZ + 19.5) continue;
        if (Math.hypot(npc.x - proj.x, npc.y - proj.y) < 12) {
          if (proj.explosiveRadius > 0) {
            triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
          } else {
            const willDie = npc.hp - proj.damage <= 0;
            if (state.camera) {
              state.camera.hitMarkerTimer = 0.17;
              state.camera.hitMarkerCrit = willDie;
            }
            damagePedestrian(state, npc, proj.damage, proj.vx, proj.vy);
            if (state.audio && state.audio.playBulletImpact) {
              state.audio.playBulletImpact('flesh', proj.x, proj.y);
            }
            addCrimeHeat(state, npc.role === 'police' ? 75 : 35, 'ARMED ASSAULT REPORTED');
          }
          hitSomething = true;
          break;
        }
      }

      // Check vehicle hit
      if (!hitSomething) {
        for (const v of vehicles) {
          if (v.destroyed || player.vehicle === v) continue;
          if (proj.z > (v.height || 14) + 3) continue;
          if (Math.hypot(v.x - proj.x, v.y - proj.y) < Math.max(v.width, v.length) * 0.45) {
            if (proj.explosiveRadius > 0) {
              triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
            } else {
              v.hp -= proj.damage;
              if (state.camera) {
                state.camera.hitMarkerTimer = 0.14;
                state.camera.hitMarkerCrit = false;
              }
              for (let k = 0; k < 4; k++) {
                particles.push({
                  x: proj.x,
                  y: proj.y,
                  z: proj.z,
                  vx: (Math.random() - 0.5) * 110,
                  vy: (Math.random() - 0.5) * 110,
                  vz: 32 + Math.random() * 28,
                  size: 2.6,
                  color: '#7dd3fc',
                  life: 0.22,
                  maxLife: 0.22,
                  kind: 'spark'
                });
              }
              if (state.audio && state.audio.playBulletImpact) {
                state.audio.playBulletImpact('metal', proj.x, proj.y);
              }
              if (v.hp <= 0) {
                triggerExplosion(state, v.x, v.y, 8, 110, 220);
              }
            }
            hitSomething = true;
            break;
          }
        }
      }
    } else {
      // Enemy projectile hitting player or player vehicle (blocked during outcome or locked private nightlife sessions)
      const inProtected = Boolean(state.outcome) || Boolean(state.nightlife && state.nightlife.session);
      if (!inProtected && Math.hypot(player.x - proj.x, player.y - proj.y) < 18 && Math.abs(proj.z - (player.z || 0) - 9) < 12) {
        if (player.vehicle) {
          const minHp = player.vehicle.onFire ? 0 : 1;
          player.vehicle.hp = Math.max(minHp, player.vehicle.hp - proj.damage * 0.5);
          if (state.camera) {
            state.camera.damageFlash = 0.48;
            state.camera.trauma = Math.min(1, state.camera.trauma + 0.14);
          }
        } else {
          damagePlayer(state, proj.damage, 'gunfire');
        }
        hitSomething = true;
      }
    }

    if (hitSomething) {
      projectiles.splice(i, 1);
    }
  }

  // Cap active particles for consistent 60 FPS
  if (particles.length > 180) {
    particles.splice(0, particles.length - 180);
  }

  // Update 3D particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    pt.x += (pt.vx || 0) * dt;
    pt.y += (pt.vy || 0) * dt;
    pt.z = Math.max(0.5, (pt.z || 2) + (pt.vz || 0) * dt);
    if (pt.kind === 'spark') {
      pt.vz = (pt.vz || 0) - 120 * dt;
    } else if (pt.kind === 'debris') {
      pt.vz = (pt.vz || 0) - 220 * dt;
      pt.rot = (pt.rot || 0) + (pt.rotVel || 4) * dt;
      if (pt.z <= 0.6 && pt.vz < 0) {
        pt.vz = -pt.vz * 0.35;
        pt.vx *= 0.65;
        pt.vy *= 0.65;
      }
    }
  }
}
