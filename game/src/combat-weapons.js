import { WEAPONS } from './config.js';
import { pointInBuilding, resolveCircleBuildingCollisions } from './city-map.js';
import { damagePedestrian } from './pedestrians.js';
import { addCrimeHeat } from './police-wanted.js';

export function updatePlayerOnFoot(state, dt) {
  const { player, input, cityMap } = state;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.muzzleTimer = Math.max(0, player.muzzleTimer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

  if (player.vehicle) return;

  const moveX =
    (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) -
    (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
  const moveY =
    (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0) -
    (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0);

  const isSprinting = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
  const baseSpeed = isSprinting ? 148 : 102;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    const nx = moveX / len;
    const ny = moveY / len;
    player.vx = nx * baseSpeed;
    player.vy = ny * baseSpeed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.walkPhase += baseSpeed * dt * 0.14;
    if (!input.mouseActive) {
      player.angle = Math.atan2(ny, nx);
    }
  } else {
    player.vx *= 0.8;
    player.vy *= 0.8;
  }

  if (input.mouseActive && Number.isFinite(input.aimAngle)) {
    player.angle = input.aimAngle;
  }

  resolveCircleBuildingCollisions(player, 9, cityMap.buildings);
}

export function firePlayerWeapon(state) {
  const { player, projectiles, particles } = state;
  if (player.fireCooldown > 0) return;

  const weapon = WEAPONS[player.weaponIndex] || WEAPONS[0];
  player.fireCooldown = weapon.fireRate;
  player.muzzleTimer = 0.09;

  const aimAngle = player.angle;
  const originDist = player.vehicle ? 26 : 15;
  const ox = player.x + Math.cos(aimAngle) * originDist;
  const oy = player.y + Math.sin(aimAngle) * originDist;
  const oz = player.vehicle ? 11 : 13;

  for (let p = 0; p < weapon.pellets; p++) {
    const spreadAngle = aimAngle + (Math.random() - 0.5) * weapon.spread * 2;
    projectiles.push({
      x: ox,
      y: oy,
      z: oz,
      vx: Math.cos(spreadAngle) * weapon.speed,
      vy: Math.sin(spreadAngle) * weapon.speed,
      damage: weapon.damage,
      life: weapon.range / weapon.speed,
      color: weapon.color,
      fromPlayer: true,
      explosiveRadius: weapon.explosiveRadius || 0,
      isRocket: Boolean(weapon.explosiveRadius)
    });
  }

  // Muzzle flash sparks
  for (let i = 0; i < 5; i++) {
    const spAngle = aimAngle + (Math.random() - 0.5) * 0.5;
    particles.push({
      x: ox,
      y: oy,
      z: oz,
      vx: Math.cos(spAngle) * (120 + Math.random() * 90),
      vy: Math.sin(spAngle) * (120 + Math.random() * 90),
      vz: (Math.random() - 0.3) * 40,
      size: 2.2,
      color: weapon.color,
      life: 0.16,
      maxLife: 0.16,
      kind: 'spark'
    });
  }

  state.camera.trauma = Math.min(1, state.camera.trauma + (weapon.explosiveRadius ? 0.28 : 0.07));
  if (state.audio) state.audio.playShot(weapon.id);
}

export function triggerExplosion(state, x, y, z = 8, radius = 115, maxDamage = 260) {
  const { particles, vehicles, pedestrians, player } = state;

  // Volumetric 3D fireball core spheres
  particles.push({
    x,
    y,
    z: z + 6,
    vx: 0,
    vy: 0,
    vz: 14,
    size: 24,
    color: '#fde047',
    life: 0.55,
    maxLife: 0.55,
    kind: 'fireball'
  });

  particles.push({
    x: x + 6,
    y: y - 4,
    z: z + 10,
    vx: 0,
    vy: 0,
    vz: 18,
    size: 34,
    color: '#f97316',
    life: 0.72,
    maxLife: 0.72,
    kind: 'fireball'
  });

  // Expanding 3D ground shockwave ring
  particles.push({
    x,
    y,
    z: 2.5,
    vx: 0,
    vy: 0,
    vz: 0,
    size: radius * 0.85,
    color: '#ff2a85',
    life: 0.48,
    maxLife: 0.48,
    kind: 'shockwave'
  });

  // Radial debris & smoke plumes
  for (let i = 0; i < 24; i++) {
    const ang = (i * Math.PI * 2) / 24 + Math.random() * 0.2;
    const spd = 70 + Math.random() * 180;
    particles.push({
      x: x + Math.cos(ang) * 8,
      y: y + Math.sin(ang) * 8,
      z: z + Math.random() * 10,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      vz: 45 + Math.random() * 95,
      size: i % 2 === 0 ? 4.5 : 8.5,
      color: i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#fb923c' : '#475569',
      life: 0.65 + Math.random() * 0.4,
      maxLife: 1.0,
      kind: i % 2 === 0 ? 'spark' : 'smoke'
    });
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
        v.color = '#1e293b';
        v.stripeColor = '#334155';
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
      damagePedestrian(state, npc, maxDamage * factor);
    }
  }

  const playerDist = Math.hypot(player.x - x, player.y - y);
  if (playerDist < 520) {
    state.camera.trauma = Math.min(1, state.camera.trauma + 0.65 * (1 - playerDist / 520));
  }
  if (state.audio) state.audio.playExplosion();
}

export function updateCombatAndProjectiles(state, dt) {
  const { projectiles, particles, cityMap, vehicles, pedestrians, player, input } = state;

  if (input.mouseDown) {
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

    if (proj.isRocket && Math.random() < 0.85) {
      particles.push({
        x: proj.x,
        y: proj.y,
        z: proj.z,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        vz: 12,
        size: 4.5,
        color: '#fb923c',
        life: 0.28,
        maxLife: 0.28,
        kind: 'smoke'
      });
    }

    // Check building impact
    if (pointInBuilding(proj.x, proj.y, cityMap.buildings, 2)) {
      if (proj.explosiveRadius > 0) {
        triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
      } else {
        particles.push({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx: -proj.vx * 0.15,
          vy: -proj.vy * 0.15,
          vz: 25,
          size: 2.5,
          color: '#fde047',
          life: 0.18,
          maxLife: 0.18,
          kind: 'spark'
        });
      }
      projectiles.splice(i, 1);
      continue;
    }

    let hitSomething = false;

    if (proj.fromPlayer) {
      // Check pedestrian hit
      for (const npc of pedestrians) {
        if (npc.dead) continue;
        if (Math.hypot(npc.x - proj.x, npc.y - proj.y) < 15) {
          if (proj.explosiveRadius > 0) {
            triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
          } else {
            damagePedestrian(state, npc, proj.damage, proj.vx, proj.vy);
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
          if (Math.hypot(v.x - proj.x, v.y - proj.y) < Math.max(v.width, v.length) * 0.45) {
            if (proj.explosiveRadius > 0) {
              triggerExplosion(state, proj.x, proj.y, proj.z, proj.explosiveRadius, proj.damage);
            } else {
              v.hp -= proj.damage;
              particles.push({
                x: proj.x,
                y: proj.y,
                z: proj.z,
                vx: (Math.random() - 0.5) * 90,
                vy: (Math.random() - 0.5) * 90,
                vz: 35,
                size: 2.8,
                color: '#38bdf8',
                life: 0.2,
                maxLife: 0.2,
                kind: 'spark'
              });
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
      // Enemy projectile hitting player or player vehicle
      if (Math.hypot(player.x - proj.x, player.y - proj.y) < 18) {
        if (player.vehicle) {
          player.vehicle.hp = Math.max(25, player.vehicle.hp - proj.damage * 0.5);
        } else if (player.armor > 0) {
          player.armor = Math.max(0, player.armor - proj.damage);
        } else {
          player.hp = Math.max(15, player.hp - proj.damage);
        }
        hitSomething = true;
      }
    }

    if (hitSomething) {
      projectiles.splice(i, 1);
    }
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
    }
  }
}
