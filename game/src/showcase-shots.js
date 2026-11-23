import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import { startMissionByIndex } from './missions-story.js';
import { triggerExplosion } from './combat-weapons.js';
import { saveCareerToStorage } from './audio-save.js';

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
    heroCar.x = 2714;
    heroCar.y = 2040;
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

    // Two pursuing VCPD Interceptors flanking the supercar with flashing sirens
    const cop1 = createVehicle('police_cruiser', 2742, 2110, -Math.PI * 0.52, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop1.speed = 355;
    cop1.sirenPhase = 0.6;

    const cop2 = createVehicle('police_cruiser', 2684, 2126, -Math.PI * 0.48, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop2.speed = 345;
    cop2.sirenPhase = 3.6;

    // Oncoming cyan sports roadster in the far lane
    const cabrio = createVehicle('comet_cabrio', 2688, 1930, Math.PI * 0.5, {
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

    // 3D Tire Drift & Cyan Nitro Smoke Puffs behind the rear wheels
    for (let i = 0; i < 14; i++) {
      particles.push({
        x: heroCar.x + (i % 2 === 0 ? -9 : 9) + (Math.random() - 0.5) * 6,
        y: heroCar.y + 24 + i * 3.8,
        z: 2.5 + i * 0.4,
        vx: 0,
        vy: 15,
        vz: 8,
        size: 4.8 + (i % 3) * 1.4,
        color: i < 5 ? '#00f0ff' : '#e2e8f0',
        life: 0.4,
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
    player.vehicle = null;
    player.x = 1844;
    player.y = 1796;
    player.angle = -Math.PI * 0.44;
    player.weaponIndex = 1; // Spectre Micro-SMG
    player.muzzleTimer = 0.09;
    player.cash = 164200;

    wanted.stars = 2;
    wanted.heat = 280;

    // Convertible Comet GT Cabrio right next to player ready to carjack
    const targetCabrio = createVehicle('comet_cabrio', 1868, 1770, -Math.PI * 0.58, {
      aiRole: 'parked'
    });
    const neonMuscle = createVehicle('stinger_muscle', 1820, 1695, Math.PI * 0.42, {
      aiRole: 'parked'
    });
    const copInterceptor = createVehicle('police_cruiser', 1882, 1665, Math.PI * 0.62, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    vehicles.push(targetCabrio, neonMuscle, copInterceptor);

    // Syndicate Enforcers exchanging gunfire with player
    const guard1 = createPedestrian(1848, 1712, 'syndicate');
    guard1.angle = Math.PI * 0.52;
    guard1.muzzleTimer = 0.08;

    const guard2 = createPedestrian(1876, 1705, 'syndicate');
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
      look: [1862, 24, 1705],
      fov: 58
    };
  } else if (shot === 'heist') {
    // Shot 3: 5-Star Story Heist: Federal Reserve Convoy Ambush in Downtown Vice Plaza
    startMissionByIndex(state, 4);
    const heroCar = vehicles[0];
    heroCar.x = 1236;
    heroCar.y = 890;
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
    const convoy = state.missions.targetEntity;
    if (convoy) {
      convoy.x = 1216;
      convoy.y = 772;
      convoy.angle = Math.PI * 0.12;
      convoy.hp = 410;
    }

    const swat1 = createVehicle('swat_van', 1174, 786, 0.35, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    const cop1 = createVehicle('police_cruiser', 1258, 792, -2.6, {
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
    heroCar.x = 2705;
    heroCar.y = 825;
    heroCar.angle = -Math.PI * 0.38;
    heroCar.speed = 0;
    heroCar.nitroActive = false;

    const parkedCabrio = createVehicle('comet_cabrio', 2745, 790, -Math.PI * 0.62, {
      aiRole: 'parked'
    });
    vehicles.push(parkedCabrio);

    player.vehicle = null;
    player.x = 2722;
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
    state.hudBanner = null; // keep top-center clean above safehouse

    // Frame the 3D Starfish Marina waterfront, supercars, palm trees & superyachts on the left half
    state.camera.overridePose = {
      eye: [2635, 38, 925],
      look: [2890, 22, 745],
      fov: 58
    };
  }

  return shot;
}
