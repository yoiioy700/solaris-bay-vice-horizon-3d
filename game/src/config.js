export const WORLD_WIDTH = 5200;
export const WORLD_HEIGHT = 5120;
export const BLOCK_SIZE = 320;
export const ROAD_WIDTH = 96;
export const SIDEWALK_WIDTH = 18;
export const COAST_X = 2780;
export const BEACH_WIDTH = 220;
export const ISLAND_X1 = 3160;
export const ISLAND_X2 = 3920;
export const ISLAND_Y1 = 440;
export const ISLAND_Y2 = 2160;
export const CAUSEWAY_YS = [896, 1856];

export const STORAGE_KEY = 'solaris_bay_vice_horizon_3d_save_v1';
export const SAVE_SLOT_KEYS = [
  STORAGE_KEY,
  `${STORAGE_KEY}_slot2`,
  `${STORAGE_KEY}_slot3`
];
export const SETTINGS_STORAGE_KEY = 'solaris_bay_vice_horizon_3d_settings_v1';

export function getWorldClockInfo(worldTime = 17.2) {
  const h = ((Number.isFinite(worldTime) ? worldTime : 17.2) % 24 + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const formatted = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  let phase = 'MIDNIGHT NEON';
  if (h >= 5.0 && h < 7.5) phase = 'DAWN';
  else if (h >= 7.5 && h < 16.5) phase = 'DAYLIGHT';
  else if (h >= 16.5 && h < 18.75) phase = 'GOLDEN HOUR';
  else if (h >= 18.75 && h < 20.5) phase = 'DUSK';

  // 0 during golden hour (<= 17.2) & daylight; ramps smoothly 18.0 -> 20.2 -> 1.0, down 4.8 -> 6.8 -> 0.0
  let nightFactor = 0;
  if (h >= 20.2 || h < 4.8) {
    nightFactor = 1;
  } else if (h >= 18.0 && h < 20.2) {
    nightFactor = (h - 18.0) / 2.2;
  } else if (h >= 4.8 && h < 6.8) {
    nightFactor = 1 - (h - 4.8) / 2.0;
  }

  return {
    hour: h,
    formatted,
    phase,
    nightFactor,
    isNight: h >= 19 || h < 6
  };
}

export const DISTRICTS = [
  {
    id: 'club_eclipse',
    name: 'CLUB ECLIPSE NIGHTLIFE QUARTER',
    subtitle: '21+ Open-Air Disco Pavilion, VIP Suites & Nightlife',
    accent: '#c988b8',
    bounds: { x1: 1480, y1: 1560, x2: 2040, y2: 2240 }
  },
  {
    id: 'starfish_island',
    name: 'STARFISH ISLAND & EXTENDED MARINA',
    subtitle: 'Private Causeway Island Estates & Superyacht Slips',
    accent: '#5eb3aa',
    bounds: { x1: 3000, y1: 320, x2: 4200, y2: 2350 }
  },
  {
    id: 'sunset_hills',
    name: 'SUNSET HILLS BOULEVARD',
    subtitle: 'Coastal Luxury Villas & Southern Palm Promenade',
    accent: '#d89b60',
    bounds: { x1: 1150, y1: 3000, x2: 3000, y2: 5050 }
  },
  {
    id: 'palm_harbor',
    name: 'PALM HARBOR DOCKS',
    subtitle: 'Container Terminals, Gantry Cranes & Waterfront Piers',
    accent: '#8ca0b5',
    bounds: { x1: 80, y1: 2480, x2: 1150, y2: 5050 }
  },
  {
    id: 'ocean_drive',
    name: 'OCEAN DRIVE • SOLARIS BEACH',
    subtitle: 'Art-Deco Resort Strip & Palm Boardwalk',
    accent: '#e0b268',
    bounds: { x1: 2050, y1: 1200, x2: 3000, y2: 3000 }
  },
  {
    id: 'neon_strip',
    name: 'VICE NEON STRIP',
    subtitle: 'Boutique Casino Boulevard & Nightlife',
    accent: '#64bcc9',
    bounds: { x1: 1150, y1: 1200, x2: 2050, y2: 3000 }
  },
  {
    id: 'downtown',
    name: 'DOWNTOWN VICE PLAZA',
    subtitle: 'Financial Glass Towers & Corporate Center',
    accent: '#d8a660',
    bounds: { x1: 200, y1: 250, x2: 2050, y2: 1200 }
  },
  {
    id: 'marina',
    name: 'STARFISH BAY MARINA',
    subtitle: 'Superyacht Docks & Luxury Safehouse Villa',
    accent: '#63c792',
    bounds: { x1: 2050, y1: 250, x2: 3000, y2: 1200 }
  },
  {
    id: 'harbor',
    name: 'PORT SOLARIS CARGO HARBOR',
    subtitle: 'Industrial Logistics & Syndicate Foundry',
    accent: '#9ca8ba',
    bounds: { x1: 80, y1: 1200, x2: 1150, y2: 2480 }
  }
];

export const VEHICLE_TYPES = {
  apex_gt: {
    id: 'apex_gt',
    name: 'APEX V8 GT',
    category: 'SUPERCAR',
    width: 24,
    length: 50,
    height: 14,
    maxSpeed: 420,
    accel: 310,
    brake: 360,
    turnRate: 2.75,
    driftGrip: 0.88,
    maxHp: 280,
    color: '#a6283b',
    stripeColor: '#cfc5b4',
    hasSpoiler: true,
    isConvertible: false,
    value: 145000
  },
  comet_cabrio: {
    id: 'comet_cabrio',
    name: 'COMET GT CABRIO',
    category: 'SPORTS ROADSTER',
    width: 23,
    length: 48,
    height: 13,
    maxSpeed: 390,
    accel: 285,
    brake: 340,
    turnRate: 2.85,
    driftGrip: 0.86,
    maxHp: 250,
    color: '#246b7f',
    stripeColor: '#d2cdc2',
    hasSpoiler: true,
    isConvertible: true,
    value: 110000
  },
  stinger_muscle: {
    id: 'stinger_muscle',
    name: 'STINGER 426 HEMI',
    category: 'VICE MUSCLE',
    width: 24,
    length: 51,
    height: 14.5,
    maxSpeed: 365,
    accel: 270,
    brake: 300,
    turnRate: 2.55,
    driftGrip: 0.81,
    maxHp: 310,
    color: '#ad5937',
    stripeColor: '#2c323b',
    hasSpoiler: true,
    isConvertible: false,
    value: 78000
  },
  eclipse_sedan: {
    id: 'eclipse_sedan',
    name: 'ECLIPSE EXEC V6',
    category: 'LUXURY SEDAN',
    width: 23,
    length: 49,
    height: 15,
    maxSpeed: 325,
    accel: 220,
    brake: 290,
    turnRate: 2.45,
    driftGrip: 0.9,
    maxHp: 270,
    color: '#b6ad9d',
    stripeColor: '#3f4752',
    hasSpoiler: false,
    isConvertible: false,
    value: 54000
  },
  city_taxi: {
    id: 'city_taxi',
    name: 'SOLARIS CITY CAB',
    category: 'METROPOLITAN TAXI',
    width: 23,
    length: 49,
    height: 15,
    maxSpeed: 335,
    accel: 235,
    brake: 300,
    turnRate: 2.55,
    driftGrip: 0.9,
    maxHp: 290,
    color: '#c9a132',
    stripeColor: '#232830',
    hasSpoiler: false,
    isConvertible: false,
    isTaxi: true,
    value: 38000
  },
  delivery_van: {
    id: 'delivery_van',
    name: 'SOLARIS FRESH VAN',
    category: 'COMMERCIAL DELIVERY',
    width: 25,
    length: 54,
    height: 19.5,
    maxSpeed: 275,
    accel: 190,
    brake: 275,
    turnRate: 2.1,
    driftGrip: 0.93,
    maxHp: 380,
    color: '#cfc9bc',
    stripeColor: '#4c7e76',
    hasSpoiler: false,
    isConvertible: false,
    isHeavy: true,
    isCommercialVan: true,
    value: 46000
  },
  bison_suv: {
    id: 'bison_suv',
    name: 'BISON TRX 4X4',
    category: 'HEAVY SUV',
    width: 26,
    length: 53,
    height: 18,
    maxSpeed: 305,
    accel: 210,
    brake: 280,
    turnRate: 2.25,
    driftGrip: 0.91,
    maxHp: 420,
    color: '#383f4a',
    stripeColor: '#69727d',
    hasSpoiler: false,
    isConvertible: false,
    value: 68000
  },
  police_cruiser: {
    id: 'police_cruiser',
    name: 'VCPD INTERCEPTOR',
    category: 'LAW ENFORCEMENT',
    width: 24,
    length: 50,
    height: 15,
    maxSpeed: 395,
    accel: 295,
    brake: 350,
    turnRate: 2.7,
    driftGrip: 0.89,
    maxHp: 340,
    color: '#1f2a3a',
    stripeColor: '#d8d3c8',
    hasSpoiler: false,
    isPolice: true,
    value: 85000
  },
  swat_van: {
    id: 'swat_van',
    name: 'VCPD SWAT BEARCAT',
    category: 'TACTICAL ARMOR',
    width: 28,
    length: 58,
    height: 21,
    maxSpeed: 295,
    accel: 205,
    brake: 310,
    turnRate: 2.05,
    driftGrip: 0.94,
    maxHp: 640,
    color: '#2c3440',
    stripeColor: '#587894',
    hasSpoiler: false,
    isPolice: true,
    isHeavy: true,
    value: 165000
  },
  goliath_convoy: {
    id: 'goliath_convoy',
    name: 'SYNDICATE GOLIATH',
    category: 'ARMORED BULLION RIG',
    width: 29,
    length: 60,
    height: 22,
    maxSpeed: 285,
    accel: 195,
    brake: 295,
    turnRate: 1.95,
    driftGrip: 0.95,
    maxHp: 750,
    color: '#7a5c3a',
    stripeColor: '#c7a461',
    hasSpoiler: false,
    isHeavy: true,
    value: 250000
  }
};

export const PLAYER_PHYSICS = {
  walkSpeed: 106,
  sprintSpeed: 164,
  aimSpeed: 74,
  accelRate: 13.5,
  decelRate: 15.5,
  airControl: 4.5,
  gravity: 235,
  jumpVelocity: 98,
  coyoteTime: 0.11,
  jumpBuffer: 0.12,
  radius: 9,
  height: 18.5
};

export const GEAR_THRESHOLDS = [0, 0.17, 0.35, 0.56, 0.78, 1.02];

export const WEAPONS = [
  {
    id: 'fists',
    slot: 1,
    name: 'FISTS (MELEE)',
    shortName: 'FISTS',
    category: 'MELEE',
    isMelee: true,
    damage: 28,
    fireRate: 0.34,
    speed: 0,
    range: 36,
    spread: 0.03,
    recoilPitch: 0,
    bloomPerShot: 0,
    pellets: 0,
    magSize: 0,
    ammo: Infinity,
    reloadTime: 0,
    color: '#e6c5a3'
  },
  {
    id: 'pistol',
    slot: 2,
    name: 'VICE 9MM PISTOL',
    shortName: '9MM PISTOL',
    category: 'SIDEARM',
    isMelee: false,
    damage: 34,
    fireRate: 0.22,
    speed: 820,
    range: 560,
    spread: 0.018,
    recoilPitch: 0.018,
    bloomPerShot: 0.016,
    pellets: 1,
    magSize: 15,
    ammo: 120,
    reloadTime: 1.15,
    color: '#e0b268'
  },
  {
    id: 'smg',
    slot: 3,
    name: 'SPECTRE MICRO-SMG',
    shortName: 'SPECTRE SMG',
    category: 'SUBMACHINE',
    isMelee: false,
    damage: 26,
    fireRate: 0.085,
    speed: 860,
    range: 580,
    spread: 0.036,
    recoilPitch: 0.012,
    bloomPerShot: 0.013,
    pellets: 1,
    magSize: 32,
    ammo: 256,
    reloadTime: 1.45,
    color: '#64bcc9'
  },
  {
    id: 'shotgun',
    slot: 4,
    name: 'BREACHER TACTICAL 12G',
    shortName: 'TACTICAL 12G',
    category: 'SHOTGUN',
    isMelee: false,
    damage: 24,
    fireRate: 0.58,
    speed: 740,
    range: 380,
    spread: 0.11,
    recoilPitch: 0.046,
    bloomPerShot: 0.042,
    pellets: 6,
    magSize: 8,
    ammo: 48,
    reloadTime: 1.75,
    color: '#d98c57'
  },
  {
    id: 'carbine',
    slot: 5,
    name: 'V-416 TACTICAL CARBINE',
    shortName: 'V-416 CARBINE',
    category: 'ASSAULT RIFLE',
    isMelee: false,
    damage: 44,
    fireRate: 0.11,
    speed: 980,
    range: 740,
    spread: 0.02,
    recoilPitch: 0.016,
    bloomPerShot: 0.014,
    pellets: 1,
    magSize: 30,
    ammo: 180,
    reloadTime: 1.65,
    color: '#63c792'
  },
  {
    id: 'rpg',
    slot: 6,
    name: 'TITAN AT-4 LAUNCHER',
    shortName: 'TITAN RPG',
    category: 'HEAVY LAUNCHER',
    isMelee: false,
    damage: 260,
    fireRate: 1.15,
    speed: 640,
    range: 800,
    spread: 0.008,
    recoilPitch: 0.064,
    bloomPerShot: 0.035,
    pellets: 1,
    explosiveRadius: 120,
    magSize: 1,
    ammo: 8,
    reloadTime: 2.15,
    color: '#d96b6b'
  }
];

export const RADIO_STATIONS = [
  {
    id: 'vice_104',
    name: 'VICE 104.9 SYNTHWAVE',
    genre: 'Outrun Sunset Electro',
    bpm: 118,
    cutoff: 880,
    notes: [220, 261.63, 329.63, 392.0, 329.63, 293.66, 261.63, 196.0],
    bass: [110, 110, 130.81, 146.83]
  },
  {
    id: 'solaris_fm',
    name: 'SOLARIS 98.3 MIAMI BASS',
    genre: 'Cyberpunk Club Drive',
    bpm: 126,
    cutoff: 820,
    notes: [196.0, 233.08, 293.66, 349.23, 392.0, 349.23, 293.66, 233.08],
    bass: [98.0, 98.0, 116.54, 130.81]
  },
  {
    id: 'neon_pulse',
    name: 'NEON PULSE 107.7',
    genre: 'Darkwave Arpeggio',
    bpm: 132,
    cutoff: 760,
    notes: [164.81, 196.0, 246.94, 329.63, 293.66, 246.94, 196.0, 146.83],
    bass: [82.41, 82.41, 98.0, 123.47]
  },
  {
    id: 'radio_off',
    name: 'POLICE SCANNER / OFF',
    genre: 'VCPD Tactical Dispatch',
    bpm: 0,
    cutoff: 600,
    notes: [],
    bass: []
  }
];

export const WANTED_THRESHOLDS = [0, 100, 240, 420, 650, 900];

export const LANDMARKS = {
  safehouse: {
    id: 'safehouse',
    name: 'STARFISH BAY SAFEHOUSE VILLA',
    x: 2496,
    y: 800,
    radius: 65,
    color: '#10b981'
  },
  payNsprayOcean: {
    id: 'pay_n_spray_ocean',
    name: 'SOLARIS CUSTOMS • PAY-N-SPRAY',
    x: 2238,
    y: 1736,
    radius: 105,
    cost: 200,
    color: '#63c792'
  },
  payNsprayDowntown: {
    id: 'pay_n_spray_downtown',
    name: 'SOLARIS CUSTOMS • DOWNTOWN',
    x: 1280,
    y: 1054,
    radius: 105,
    cost: 200,
    color: '#63c792'
  },
  armory: {
    id: 'vice_armory',
    name: 'VICE ARMORY • GUNS & GEAR',
    x: 1920,
    y: 1732,
    radius: 82,
    cost: 250,
    color: '#d97c5b'
  },
  hospital: {
    id: 'hospital',
    name: 'SOLARIS GENERAL HOSPITAL',
    x: 2496,
    y: 1536,
    spawnAngle: -Math.PI * 0.5,
    radius: 65,
    color: '#63c792'
  },
  precinct: {
    id: 'precinct',
    name: 'VCPD CENTRAL PRECINCT',
    x: 1536,
    y: 896,
    spawnAngle: Math.PI * 0.5,
    radius: 65,
    color: '#64bcc9'
  }
};
