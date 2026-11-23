import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import { startMissionByIndex } from './missions-story.js';
import { triggerExplosion } from './combat-weapons.js';
import { saveCareerToStorage } from './audio-save.js';

function clearBackgroundVehiclesNear(vehicles, cx, cy, radius, keepVehicle = null) {
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v === keepVehicle) continue;
    if (Math.hypot(v.x - cx, v.y - cy) < radius) {
      vehicles.splice(i, 1);
    }
  }
}

export function applyShowcaseShotIfRequested(state) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;

  const { player, vehicles, pedestrians, wanted, projectiles, particles } = state;

  if (shot === 'chase') {
    // Shot 1: 4-Star Sunset Supercar & Police Chopper Pursuit on Ocean Drive
    startMissionByIndex(state, 0);
    const heroCar = vehicles[0];
    clearBackgroundVehiclesNear(vehicles, 2714, 2000, 320, heroCar);

    heroCar.x = 2722;
    heroCar.y = 2042;
    heroCar.angle = -Math.PI * 0.46;
    heroCar.speed = 382;
    heroCar.vx = Math.cos(heroCar.angle) * heroCar.speed;
    heroCar.vy = Math.sin(heroCar.angle) * heroCar.speed;
    heroCar.steerAngle = 0.26;
    heroCar.nitroActive = true;
    heroCar.drifting = true;
    heroCar.nitro = 84;

    player.vehicle = heroCar;
    player.x = heroCar.x;
    player.y = heroCar.y;
    player.angle = heroCar.angle;
    player.cash = 148500;
    player.weaponIndex = 1;

    wanted.stars = 4;
    wanted.heat = 720;
    wanted.sirenTimer = 0.4;

    // Pursuing VCPD Interceptor in adjacent left lane slightly ahead/beside hero supercar (100% visible, no bottom clipping)
    const cop1 = createVehicle('police_cruiser', 2682, 1998, -Math.PI * 0.48, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop1.speed = 355;
    cop1.sirenPhase = 0.6;

    // Second VCPD Interceptor further ahead angling across the avenue
    const cop2 = createVehicle('police_cruiser', 2744, 1912, -Math.PI * 0.58, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop2.speed = 345;
    cop2.sirenPhase = 3.6;

    // Oncoming cyan sports roadster in the far lane
    const cabrio = createVehicle('comet_cabrio', 2686, 1838, Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    cabrio.speed = 180;

    vehicles.push(cop1, cop2, cabrio);

    // Airborne 3D VCPD Police Helicopter ahead in the upper sunset sky sweeping its searchlight cone
    wanted.helicopter.active = true;
    wanted.helicopter.x = 2675;
    wanted.helicopter.y = 1865;
    wanted.helicopter.z = 112;
    wanted.helicopter.angle = Math.PI * 0.48;
    wanted.helicopter.rotorAngle = 0.75;

    // Crisp, subtle tire-level drift wisps that leave the rear bumper, spoiler, exhausts & nitro flames 100% sharp
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -11 : 11;
      particles.push({
        x: heroCar.x + side,
        y: heroCar.y + 28 + i * 5.2,
        z: 1.8,
        vx: 0,
        vy: 15,
        vz: 4,
        size: 2.3 + (i % 3) * 0.65,
        color: i < 4 ? '#00f0ff' : '#cbd5e1',
        life: 0.35,
        maxLife: 0.5,
        kind: 'smoke'
      });
    }

    // Cinematic low-angle 3D chase camera looking north up Ocean Drive toward HOTEL SOLARIS, palm trees & chopper
    state.camera.overridePose = {
      eye: [2744, 34, 2145],
      look: [2692, 32, 1890],
      fov: 62
    };
  } else if (shot === 'hijack') {
    // Shot 2: On-Foot 3D Carjacking & Street Gunfight in Vice Neon Strip
    startMissionByIndex(state, 1);
    clearBackgroundVehiclesNear(vehicles, 1856, 1740, 320);

    player.vehicle = null;
    player.x = 1844;
    player.y = 1796;
    player.angle = -Math.PI * 0.44;
    player.weaponIndex = 1; // Spectre Micro-SMG
    player.muzzleTimer = 0.09;
    player.cash = 164200;

    wanted.stars = 2;
    wanted.heat = 280;

    // Convertible Comet GT Cabrio cleanly parked on the right lane ready to carjack (zero overlap!)
    const targetCabrio = createVehicle('comet_cabrio', 1874, 1766, -Math.PI * 0.56, {
      aiRole: 'parked'
    });
    // Orange Stinger 426 Hemi Muscle Car cleanly separated in the left lane 62 units away
    const neonMuscle = createVehicle('stinger_muscle', 1814, 1718, Math.PI * 0.45, {
      aiRole: 'parked'
    });
    // VCPD Interceptor responding up the avenue
    const copInterceptor = createVehicle('police_cruiser', 1868, 1648, Math.PI * 0.62, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    vehicles.push(targetCabrio, neonMuscle, copInterceptor);

    // Syndicate Enforcers exchanging gunfire with player
    const guard1 = createPedestrian(1846, 1706, 'syndicate');
    guard1.angle = Math.PI * 0.52;
    guard1.muzzleTimer = 0.08;

    const guard2 = createPedestrian(1878, 1698, 'syndicate');
    guard2.angle = Math.PI * 0.58;
    guard2.muzzleTimer = 0.08;

    pedestrians.push(guard1, guard2);

    // 3D Glowing Bullet Tracers & Muzzle Sparks in mid-air
    for (let i = 0; i < 5; i++) {
      projectiles.push({
        x: player.x + 4 + i * 1.5,
        y: player.y - 18 - i * 14,
        z: 12.5,
        vx: 120,
        vy: -780,
        damage: 26,
        life: 0.6,
        color: '#00f0ff',
        fromPlayer: true
      });
    }

    state.camera.overridePose = {
      eye: [1828, 30, 1864],
      look: [1860, 24, 1705],
      fov: 58
    };
  } else if (shot === 'heist') {
    // Shot 3: 5-Star Story Heist: Federal Reserve Convoy Ambush in Downtown Vice Plaza
    startMissionByIndex(state, 4);
    const heroCar = vehicles[0];
    const convoy = state.missions.targetEntity;
    clearBackgroundVehiclesNear(vehicles, 1216, 810, 320, heroCar);
    if (convoy && !vehicles.includes(convoy)) {
      vehicles.push(convoy);
    }

    heroCar.x = 1244;
    heroCar.y = 892;
    heroCar.angle = -Math.PI * 0.55;
    heroCar.color = '#fde047';
    heroCar.stripeColor = '#111827';

    player.vehicle = null;
    player.x = 1208;
    player.y = 882;
    player.angle = -Math.PI * 0.48;
    player.weaponIndex = 4; // Titan AT-4 RPG Launcher
    player.muzzleTimer = 0.09;
    player.cash = 248000;

    wanted.stars = 5;
    wanted.heat = 980;
    wanted.sirenTimer = 0.3;

    // Position the Armored Syndicate Goliath Bullion Convoy & SWAT Bearcat roadblock ahead
    if (convoy) {
      convoy.x = 1216;
      convoy.y = 770;
      convoy.angle = Math.PI * 0.12;
      convoy.hp = 410;
    }

    const swat1 = createVehicle('swat_van', 1168, 788, 0.35, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    const cop1 = createVehicle('police_cruiser', 1262, 794, -2.6, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    vehicles.push(swat1, cop1);

    // Trigger dramatic 3D Explosion Fireball & Shockwave Ring next to the convoy
    triggerExplosion(state, 1234, 782, 10, 115, 120);

    // Airborne 5-Star Police Chopper hovering above Downtown Plaza
    wanted.helicopter.active = true;
    wanted.helicopter.x = 1190;
    wanted.helicopter.y = 700;
    wanted.helicopter.z = 118;
    wanted.helicopter.angle = Math.PI * 0.45;

    state.camera.overridePose = {
      eye: [1192, 36, 956],
      look: [1218, 28, 750],
      fov: 60
    };
  } else if (shot === 'safehouse') {
    // Shot 4: Starfish Marina Safehouse Villa & Persistent Career Dossier
    state.missions.completedIds = [
      'm1_neon_courier',
      'm2_chrome_hijack',
      'm3_marina_extraction',
      'm4_casino_blackout',
      'm5_federal_convoy'
    ];
    startMissionByIndex(state, 5);

    const heroCar = vehicles[0];
    clearBackgroundVehiclesNear(vehicles, 2720, 810, 320, heroCar);

    heroCar.x = 2700;
    heroCar.y = 838;
    heroCar.angle = -Math.PI * 0.42;
    heroCar.speed = 0;
    heroCar.nitroActive = false;

    const parkedCabrio = createVehicle('comet_cabrio', 2746, 768, -Math.PI * 0.56, {
      aiRole: 'parked'
    });
    vehicles.push(parkedCabrio);

    player.vehicle = null;
    player.x = 2724;
    player.y = 842;
    player.angle = -Math.PI * 0.35;
    player.cash = 385000;
    player.armor = 100;
    player.hp = 100;

    wanted.stars = 0;
    wanted.heat = 0;
    wanted.helicopter.active = false;

    state.safehouseModalOpen = true;
    saveCareerToStorage(state);
    state.hudBanner = null;

    // Frame the 3D Starfish Marina waterfront, supercars, palm trees & superyachts on the left half
    state.camera.overridePose = {
      eye: [2635, 38, 925],
      look: [2890, 22, 745],
      fov: 58
    };
  }

  return shot;
}
