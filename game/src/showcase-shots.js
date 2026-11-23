import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import { startMissionByIndex } from './missions-story.js';
import { triggerExplosion } from './combat-weapons.js';
import { saveCareerToStorage } from './audio-save.js';

function clearBackgroundVehiclesNear(vehicles, cx, cy, radius, keepVehicle = null, keepCurbParked = false) {
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v === keepVehicle) continue;
    if (keepCurbParked && v.isCurbParked) continue;
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
    // Shot 1: 4-Star Sunset Supercar & Police Chopper Pursuit on a BUSTLING Ocean Drive
    startMissionByIndex(state, 0);
    const heroCar = vehicles[0];
    clearBackgroundVehiclesNear(vehicles, 2720, 1980, 320, heroCar, true);

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

    // Pursuing VCPD Interceptors framing the supercar cleanly
    const cop1 = createVehicle('police_cruiser', 2690, 1995, -Math.PI * 0.48, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop1.speed = 355;
    cop1.sirenPhase = 0.6;

    const cop2 = createVehicle('police_cruiser', 2736, 1916, -Math.PI * 0.56, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    cop2.speed = 345;
    cop2.sirenPhase = 3.6;

    // Iconic yellow Solaris City Cab & sports roadster further up Ocean Drive
    const taxiAhead = createVehicle('city_taxi', 2696, 1848, Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    taxiAhead.speed = 140;

    const cabrioAhead = createVehicle('comet_cabrio', 2734, 1795, -Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    cabrioAhead.speed = 190;

    vehicles.push(cop1, cop2, taxiAhead, cabrioAhead);

    // Extra lively pedestrians along Ocean Drive cafés, Solaris Tacos cart & boardwalk joggers
    pedestrians.push(
      createPedestrian(2666, 2046, 'civilian', {
        angle: -Math.PI * 0.2,
        accessory: 'shopping_bag',
        hat: 'sunhat',
        bagColor: '#c46f5c'
      }),
      createPedestrian(2667, 2064, 'civilian', {
        angle: -Math.PI * 0.5,
        accessory: 'backpack',
        hat: 'cap'
      }),
      createPedestrian(2666, 1994, 'civilian', {
        angle: Math.PI * 0.5,
        accessory: 'shopping_bag',
        bagColor: '#4c868c'
      }),
      createPedestrian(2756, 2012, 'jogger', {
        z: 0.58,
        angle: -Math.PI * 0.5,
        walkPhase: 1.4
      }),
      createPedestrian(2761, 1940, 'civilian', {
        z: 0.58,
        angle: Math.PI * 0.5,
        hat: 'sunhat',
        accessory: 'shopping_bag'
      }),
      createPedestrian(2824, 1985, 'beachgoer', {
        angle: -Math.PI * 0.35,
        hat: 'sunhat'
      })
    );

    // Airborne 3D VCPD Police Helicopter ahead sweeping its translucent searchlight
    wanted.helicopter.active = true;
    wanted.helicopter.x = 2675;
    wanted.helicopter.y = 1865;
    wanted.helicopter.z = 112;
    wanted.helicopter.angle = Math.PI * 0.48;
    wanted.helicopter.rotorAngle = 0.75;

    // Subtle tire-level drift wisps leaving rear bumper, exhausts & nitro flames crisp
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -10 : 10;
      particles.push({
        x: heroCar.x + side,
        y: heroCar.y + 28 + i * 5.2,
        z: 1.8,
        vx: 0,
        vy: 15,
        vz: 4,
        size: 2.2 + (i % 3) * 0.55,
        color: i < 4 ? '#b0bac4' : '#c0bbb2',
        life: 0.35,
        maxLife: 0.5,
        kind: 'smoke'
      });
    }

    // Low-angle 3D chase camera framing bustling Ocean Drive sidewalks, cafés, Solaris Tacos, palms & beach
    state.camera.overridePose = {
      eye: [2720, 34, 2154],
      look: [2696, 26, 1890],
      fov: 61
    };
  } else if (shot === 'hijack') {
    // Shot 2: On-Foot 3D Carjacking & Street Gunfight in Lively Vice Neon Strip (Vice Armory + Vice Burger)
    startMissionByIndex(state, 1);
    clearBackgroundVehiclesNear(vehicles, 1856, 1740, 260, null, true);

    player.vehicle = null;
    player.x = 1844;
    player.y = 1796;
    player.angle = -Math.PI * 0.44;
    player.weaponIndex = 1; // Spectre Micro-SMG
    player.muzzleTimer = 0.09;
    player.cash = 164200;

    wanted.stars = 2;
    wanted.heat = 280;

    // Convertible Comet GT Cabrio ready to carjack + Muscle Car + VCPD Cruiser + Yellow Cab upstreet
    const targetCabrio = createVehicle('comet_cabrio', 1874, 1766, -Math.PI * 0.56, {
      aiRole: 'parked'
    });
    const neonMuscle = createVehicle('stinger_muscle', 1824, 1718, Math.PI * 0.45, {
      aiRole: 'parked'
    });
    const copInterceptor = createVehicle('police_cruiser', 1868, 1648, Math.PI * 0.62, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    const taxiUpstreet = createVehicle('city_taxi', 1838, 1592, Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    vehicles.push(targetCabrio, neonMuscle, copInterceptor, taxiUpstreet);

    // Syndicate Enforcers exchanging gunfire with player
    const guard1 = createPedestrian(1846, 1706, 'syndicate');
    guard1.angle = Math.PI * 0.52;
    guard1.muzzleTimer = 0.08;

    const guard2 = createPedestrian(1878, 1698, 'syndicate');
    guard2.angle = Math.PI * 0.58;
    guard2.muzzleTimer = 0.08;

    // Startled bystanders ducking/fleeing along the Vice Burger & Vice Armory sidewalks
    const bystander1 = createPedestrian(1802, 1762, 'civilian', {
      angle: Math.PI * 0.72,
      panicTimer: 4.0,
      walkPhase: 2.1,
      accessory: 'shopping_bag'
    });
    const bystander2 = createPedestrian(1908, 1746, 'civilian', {
      angle: -Math.PI * 0.25,
      panicTimer: 3.5,
      walkPhase: 1.2,
      accessory: 'backpack'
    });
    const bystander3 = createPedestrian(1804, 1690, 'civilian', {
      angle: -Math.PI * 0.65,
      panicTimer: 4.5,
      walkPhase: 0.9,
      hat: 'cap'
    });
    pedestrians.push(guard1, guard2, bystander1, bystander2, bystander3);

    // Warm ballistic bullet tracers in mid-air
    for (let i = 0; i < 5; i++) {
      projectiles.push({
        x: player.x + 4 + i * 1.5,
        y: player.y - 18 - i * 14,
        z: 12.5,
        vx: 120,
        vy: -780,
        damage: 26,
        life: 0.6,
        color: '#e8c47a',
        fromPlayer: true
      });
    }

    state.camera.overridePose = {
      eye: [1832, 31, 1868],
      look: [1860, 22, 1706],
      fov: 60
    };
  } else if (shot === 'heist') {
    // Shot 3: 5-Star Story Heist in Bustling Downtown Vice Plaza (Palm 24/7 Mart, Café, Bus Stop & Traffic Lights)
    startMissionByIndex(state, 4);
    const heroCar = vehicles[0];
    const convoy = state.missions.targetEntity;
    clearBackgroundVehiclesNear(vehicles, 1216, 810, 260, heroCar, true);
    if (convoy && !vehicles.includes(convoy)) {
      vehicles.push(convoy);
    }

    heroCar.x = 1246;
    heroCar.y = 894;
    heroCar.angle = -Math.PI * 0.55;
    heroCar.color = '#b6ad9d';
    heroCar.stripeColor = '#2c323b';

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

    if (convoy) {
      convoy.x = 1216;
      convoy.y = 768;
      convoy.angle = Math.PI * 0.12;
      convoy.hp = 410;
      if (state.missions.activeMission) {
        state.missions.activeMission.targetX = convoy.x;
        state.missions.activeMission.targetY = convoy.y;
      }
    }

    const swat1 = createVehicle('swat_van', 1178, 790, 0.35, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    const cop1 = createVehicle('police_cruiser', 1256, 794, -2.6, {
      aiRole: 'police_pursuit',
      driver: 'police'
    });
    const plazaVan = createVehicle('delivery_van', 1196, 650, Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    vehicles.push(swat1, cop1, plazaVan);

    // Trigger dramatic layered 3D Explosion Fireball & Charcoal Smoke Plumes next to the convoy
    triggerExplosion(state, 1236, 778, 8, 95, 110);
    // Keep foreground sidewalk spotless (no stray dropped cash octahedrons from staged blast)
    state.pickups.length = 0;

    // Startled Downtown office commuters & shoppers fleeing cleanly on both sidewalks
    pedestrians.push(
      createPedestrian(1162, 852, 'civilian', {
        angle: Math.PI * 0.6,
        panicTimer: 5.0,
        walkPhase: 1.5,
        accessory: 'backpack'
      }),
      createPedestrian(1271, 848, 'civilian', {
        angle: Math.PI * 0.35,
        panicTimer: 5.0,
        walkPhase: 2.4,
        accessory: 'shopping_bag',
        bagColor: '#5eb3aa'
      }),
      createPedestrian(1270, 728, 'civilian', {
        angle: -Math.PI * 0.3,
        panicTimer: 4.2,
        walkPhase: 0.7,
        hat: 'cap'
      })
    );

    // Airborne 5-Star Police Chopper hovering above Downtown Plaza
    wanted.helicopter.active = true;
    wanted.helicopter.x = 1190;
    wanted.helicopter.y = 700;
    wanted.helicopter.z = 118;
    wanted.helicopter.angle = Math.PI * 0.45;

    state.camera.overridePose = {
      eye: [1196, 36, 954],
      look: [1222, 24, 752],
      fov: 61
    };
  } else if (shot === 'safehouse') {
    // Shot 4: Starfish Marina Safehouse Villa, Living Boardwalk, Tropical Juice Bar & Persistent Career Dossier
    state.missions.completedIds = [
      'm1_neon_courier',
      'm2_chrome_hijack',
      'm3_marina_extraction',
      'm4_casino_blackout',
      'm5_federal_convoy'
    ];
    startMissionByIndex(state, 5);

    const heroCar = vehicles[0];
    clearBackgroundVehiclesNear(vehicles, 2720, 810, 260, heroCar, true);

    // Park hero supercar & roadster cleanly along Ocean Drive, leaving boardwalk & Tropical Juice Bar front and center
    heroCar.x = 2694;
    heroCar.y = 842;
    heroCar.angle = -Math.PI * 0.46;
    heroCar.speed = 0;
    heroCar.nitroActive = false;

    const parkedCabrio = createVehicle('comet_cabrio', 2714, 738, -Math.PI * 0.54, {
      aiRole: 'parked'
    });
    const marinaTaxi = createVehicle('city_taxi', 2684, 672, Math.PI * 0.5, {
      aiRole: 'traffic'
    });
    vehicles.push(parkedCabrio, marinaTaxi);

    // Position player right on the Marina Boardwalk facing Tropical Juice Bar (triggers diegetic [E] shop prompt!)
    player.vehicle = null;
    player.x = 2742;
    player.y = 812;
    player.angle = -Math.PI * 0.12;
    player.cash = 385000;
    player.armor = 100;
    player.hp = 100;

    wanted.stars = 0;
    wanted.heat = 0;
    wanted.helicopter.active = false;

    // Lively Marina Boardwalk tourists, beachgoers & joggers framing the left side of the screen
    pedestrians.push(
      createPedestrian(2756, 774, 'civilian', {
        z: 0.58,
        angle: Math.PI * 0.45,
        hat: 'sunhat',
        accessory: 'shopping_bag',
        bagColor: '#c46f5c'
      }),
      createPedestrian(2754, 836, 'civilian', {
        z: 0.58,
        angle: -Math.PI * 0.4,
        accessory: 'backpack',
        hat: 'cap'
      }),
      createPedestrian(2815, 792, 'beachgoer', {
        angle: -Math.PI * 0.3,
        hat: 'sunhat'
      }),
      createPedestrian(2838, 742, 'beachgoer', {
        angle: Math.PI * 0.65
      })
    );

    state.safehouseModalOpen = true;
    saveCareerToStorage(state);
    state.hudBanner = null;

    // Frame the vibrant Starfish Marina waterfront, Tropical Juice Bar + vendor, boardwalk locals, beach & yachts
    state.camera.overridePose = {
      eye: [2620, 46, 926],
      look: [2868, 14, 738],
      fov: 59
    };
  }

  return shot;
}
