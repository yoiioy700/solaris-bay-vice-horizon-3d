export const WORLD_WIDTH = 3600;
export const WORLD_HEIGHT = 3600;
export const BLOCK_SIZE = 320;
export const ROAD_WIDTH = 96;
export const SIDEWALK_WIDTH = 18;
export const COAST_X = 2780;
export const BEACH_WIDTH = 220;

export const STORAGE_KEY = 'solaris_bay_vice_horizon_3d_save_v1';

export const DISTRICTS = [
  {
    id: 'ocean_drive',
    name: 'OCEAN DRIVE • SOLARIS BEACH',
    subtitle: 'Art-Deco Resort Strip & Palm Boardwalk',
    accent: '#ff2a85',
    bounds: { x1: 2050, y1: 1200, x2: 3150, y2: 3450 }
  },
  {
    id: 'neon_strip',
    name: 'VICE NEON STRIP',
    subtitle: 'High-Rollers Casino Boulevard & Nightclubs',
    accent: '#00f0ff',
    bounds: { x1: 1150, y1: 1200, x2: 2050, y2: 2480 }
  },
  {
    id: 'downtown',
    name: 'DOWNTOWN VICE PLAZA',
    subtitle: 'Financial Glass Towers & Corporate Center',
    accent: '#f59e0b',
    bounds: { x1: 350, y1: 350, x2: 2050, y2: 1200 }
  },
  {
    id: 'marina',
    name: 'STARFISH BAY MARINA',
    subtitle: 'Superyacht Docks & Luxury Safehouse Villa',
    accent: '#10b981',
    bounds: { x1: 2050, y1: 250, x2: 3200, y2: 1200 }
  },
  {
    id: 'harbor',
    name: 'PORT SOLARIS CARGO HARBOR',
    subtitle: 'Industrial Logistics & Syndicate Foundry',
    accent: '#a855f7',
    bounds: { x1: 250, y1: 1200, x2: 1150, y2: 3400 }
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
    color: '#ff1e74',
    stripeColor: '#00f6ff',
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
    color: '#00e5ff',
    stripeColor: '#ffffff',
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
    color: '#f97316',
    stripeColor: '#111827',
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
    color: '#8b5cf6',
    stripeColor: '#e2e8f0',
    hasSpoiler: false,
    isConvertible: false,
    value: 54000
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
    color: '#10b981',
    stripeColor: '#064e3b',
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
    color: '#0f172a',
    stripeColor: '#f8fafc',
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
    color: '#1e293b',
    stripeColor: '#38bdf8',
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
    color: '#b45309',
    stripeColor: '#fde047',
    hasSpoiler: false,
    isHeavy: true,
    value: 250000
  }
};

export const WEAPONS = [
  {
    id: 'pistol',
    slot: 1,
    name: 'VICE 9MM PISTOL',
    shortName: '9MM PISTOL',
    damage: 34,
    fireRate: 0.22,
    speed: 780,
    range: 540,
    spread: 0.025,
    pellets: 1,
    ammo: 999,
    color: '#fde047'
  },
  {
    id: 'smg',
    slot: 2,
    name: 'SPECTRE MICRO-SMG',
    shortName: 'SPECTRE SMG',
    damage: 26,
    fireRate: 0.085,
    speed: 840,
    range: 560,
    spread: 0.055,
    pellets: 1,
    ammo: 360,
    color: '#00f0ff'
  },
  {
    id: 'shotgun',
    slot: 3,
    name: 'BREACHER TACTICAL 12G',
    shortName: 'TACTICAL 12G',
    damage: 24,
    fireRate: 0.58,
    speed: 720,
    range: 360,
    spread: 0.14,
    pellets: 6,
    ammo: 96,
    color: '#fb923c'
  },
  {
    id: 'carbine',
    slot: 4,
    name: 'STRIKER M4 CARBINE',
    shortName: 'STRIKER M4',
    damage: 44,
    fireRate: 0.11,
    speed: 960,
    range: 720,
    spread: 0.03,
    pellets: 1,
    ammo: 240,
    color: '#34d399'
  },
  {
    id: 'rpg',
    slot: 5,
    name: 'TITAN AT-4 LAUNCHER',
    shortName: 'TITAN RPG',
    damage: 260,
    fireRate: 1.15,
    speed: 620,
    range: 780,
    spread: 0.01,
    pellets: 1,
    explosiveRadius: 115,
    ammo: 18,
    color: '#ff2a85'
  }
];

export const RADIO_STATIONS = [
  {
    id: 'vice_104',
    name: 'VICE 104.9 SYNTHWAVE',
    genre: 'Outrun Sunset Electro',
    bpm: 118,
    notes: [220, 261.63, 329.63, 392.0, 329.63, 293.66, 261.63, 196.0],
    bass: [110, 110, 130.81, 146.83]
  },
  {
    id: 'solaris_fm',
    name: 'SOLARIS 98.3 MIAMI BASS',
    genre: 'Cyberpunk Club Drive',
    bpm: 126,
    notes: [196.0, 233.08, 293.66, 349.23, 392.0, 349.23, 293.66, 233.08],
    bass: [98.0, 98.0, 116.54, 130.81]
  },
  {
    id: 'neon_pulse',
    name: 'NEON PULSE 107.7',
    genre: 'Darkwave Arpeggio',
    bpm: 132,
    notes: [164.81, 196.0, 246.94, 329.63, 293.66, 246.94, 196.0, 146.83],
    bass: [82.41, 82.41, 98.0, 123.47]
  },
  {
    id: 'radio_off',
    name: 'POLICE SCANNER / OFF',
    genre: 'VCPD Tactical Dispatch',
    bpm: 0,
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
    name: "PAY 'N' SPRAY OCEAN DRIVE",
    x: 2176,
    y: 1760,
    radius: 58,
    cost: 1000,
    color: '#00f0ff'
  },
  payNsprayDowntown: {
    id: 'pay_n_spray_downtown',
    name: "PAY 'N' SPRAY DOWNTOWN",
    x: 1216,
    y: 800,
    radius: 58,
    cost: 1000,
    color: '#00f0ff'
  },
  armory: {
    id: 'vice_armory',
    name: 'VICE TACTICAL ARMORY',
    x: 1536,
    y: 1440,
    radius: 55,
    cost: 750,
    color: '#f59e0b'
  }
};
