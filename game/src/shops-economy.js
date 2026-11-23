import { WEAPONS } from './config.js';

export const PLAYER_OUTFITS = {
  default_coral: {
    id: 'default_coral',
    name: 'Coastal Terracotta',
    jacketColor: '#b55649',
    shirtColor: '#d8d1c5',
    pantsColor: '#252e3a'
  },
  coral_linen: {
    id: 'coral_linen',
    name: 'Coral Linen Resort',
    jacketColor: '#c96f5d',
    shirtColor: '#e3dacb',
    pantsColor: '#44525e'
  },
  vice_navy: {
    id: 'vice_navy',
    name: 'Vice Navy Blazer',
    jacketColor: '#273c56',
    shirtColor: '#d6d2c8',
    pantsColor: '#1f2630'
  },
  cream_tropical: {
    id: 'cream_tropical',
    name: 'Cream Tropical Shirt',
    jacketColor: '#cfc4ae',
    shirtColor: '#569492',
    pantsColor: '#3a4650'
  },
  midnight_tactical: {
    id: 'midnight_tactical',
    name: 'Midnight Tactical Jacket',
    jacketColor: '#282f38',
    shirtColor: '#495866',
    pantsColor: '#1c2026'
  },
  gold_silk: {
    id: 'gold_silk',
    name: 'Gold Silk Resort',
    jacketColor: '#c79c52',
    shirtColor: '#262d38',
    pantsColor: '#242b34'
  }
};

export const MAX_WEAPON_AMMO = {
  pistol: 999,
  smg: 600,
  shotgun: 160,
  carbine: 450,
  rpg: 30
};

export const SHOP_RADAR_COLORS = {
  food: '#e0b268',
  armory: '#d97c5b',
  mart_boutique: '#5eb3aa',
  clothing: '#6cb8c4',
  garage: '#63c792',
  club_bar: '#c988b8'
};

export const SHOP_CATALOG = {
  food: {
    categoryLabel: 'STREET FOOD & CAFÉ',
    accent: '#e0b268',
    hint: '$20+ • FOOD & DRINKS',
    items: [
      {
        id: 'street_tacos',
        name: 'Street Tacos',
        price: 20,
        effectLabel: '+35 HP',
        heal: 35
      },
      {
        id: 'vice_burger',
        name: 'Vice Double Burger',
        price: 45,
        effectLabel: '+70 HP',
        heal: 70
      },
      {
        id: 'tropical_cold_brew',
        name: 'Tropical Cold Brew',
        price: 30,
        effectLabel: '+25 HP & Full Nitro',
        heal: 25,
        refillNitro: true
      }
    ]
  },
  armory: {
    categoryLabel: 'WALK-IN WEAPON & TACTICAL ARMORY',
    accent: '#d97c5b',
    hint: 'GUNS, AMMO & KEVLAR',
    items: [
      {
        id: 'kevlar_vest',
        name: 'Tactical Kevlar Vest',
        price: 250,
        effectLabel: '100% Armor',
        fullArmor: true
      },
      {
        id: 'smg_carbine_crate',
        name: 'SMG + Carbine Ammo Crate',
        price: 120,
        effectLabel: '+180 SMG, +120 Carbine',
        ammoGrant: { smg: 180, carbine: 120 }
      },
      {
        id: 'shotgun_shells',
        name: 'Heavy Shotgun Shells',
        price: 160,
        effectLabel: '+48 Shells',
        ammoGrant: { shotgun: 48 }
      },
      {
        id: 'rpg_rockets',
        name: 'Titan RPG Rockets',
        price: 600,
        effectLabel: '+8 Rockets',
        ammoGrant: { rpg: 8 }
      },
      {
        id: 'full_restock',
        name: 'Full Tactical Restock',
        price: 900,
        effectLabel: 'Max Ammo + Max Armor',
        fullRestock: true
      }
    ]
  },
  clothing: {
    categoryLabel: 'WALK-IN COASTAL FASHION BOUTIQUE',
    accent: '#6cb8c4',
    hint: 'LIVE 3D OUTFITS & STYLE',
    items: [
      {
        id: 'outfit_coral_linen',
        name: 'Outfit: Coral Linen Resort',
        price: 150,
        effectLabel: 'Equips Coastal Linen Jacket',
        outfitId: 'coral_linen'
      },
      {
        id: 'outfit_vice_navy',
        name: 'Outfit: Vice Navy Blazer',
        price: 150,
        effectLabel: 'Equips Vice Navy Blazer',
        outfitId: 'vice_navy'
      },
      {
        id: 'outfit_cream_tropical',
        name: 'Outfit: Cream Tropical Shirt',
        price: 150,
        effectLabel: 'Equips Cream Tropical Style',
        outfitId: 'cream_tropical'
      },
      {
        id: 'outfit_midnight_tactical',
        name: 'Outfit: Midnight Tactical Jacket',
        price: 150,
        effectLabel: 'Equips Midnight Tactical Gear',
        outfitId: 'midnight_tactical'
      },
      {
        id: 'outfit_gold_silk',
        name: 'Outfit: Gold Silk Resort',
        price: 220,
        effectLabel: 'Equips VIP Gold Silk Blazer',
        outfitId: 'gold_silk'
      }
    ]
  },
  mart_boutique: {
    categoryLabel: 'WALK-IN 24/7 MART & GEAR SHOP',
    accent: '#5eb3aa',
    hint: 'MEDKITS, GEAR & OUTFITS',
    items: [
      {
        id: 'medkit',
        name: 'First-Aid Medkit',
        price: 80,
        effectLabel: 'Full HP Restore',
        fullHeal: true
      },
      {
        id: 'field_repair_gear',
        name: 'Field Repair & Tactical Gear Kit',
        price: 180,
        effectLabel: 'Repairs Nearby Vehicle + +50 Armor',
        fieldRepairArmor: true
      },
      {
        id: 'outfit_vice_navy',
        name: 'Outfit: Vice Navy Blazer',
        price: 150,
        effectLabel: 'Equips Vice Navy Blazer',
        outfitId: 'vice_navy'
      },
      {
        id: 'street_snacks',
        name: 'Street Snacks & Cold Drink',
        price: 25,
        effectLabel: '+40 HP',
        heal: 40
      },
      {
        id: 'energy_booster',
        name: 'Turbo Energy Booster',
        price: 55,
        effectLabel: 'Full Nitro + Stamina Refresh',
        refillNitro: true
      }
    ]
  },
  garage: {
    categoryLabel: 'DRIVE-IN AUTO CUSTOMS • PAY-N-SPRAY',
    accent: '#63c792',
    hint: 'REPAIR, RESPRAY & NITRO',
    items: [
      {
        id: 'repair_respray',
        name: 'Full Repair & Metallic Respray',
        price: 200,
        effectLabel: '100% Vehicle HP + New Paint + Clear Heat',
        repairRespray: true
      },
      {
        id: 'nitro_refill',
        name: 'Street Nitro Refill',
        price: 75,
        effectLabel: '100% Nitro Tank',
        refillNitro: true
      }
    ]
  },
  club_bar: {
    categoryLabel: 'CLUB ECLIPSE • COCKTAIL BAR',
    accent: '#c988b8',
    hint: 'COCKTAILS & CHAMPAGNE',
    items: [
      {
        id: 'solaris_mojito',
        name: 'Solaris Sunset Mojito',
        price: 35,
        effectLabel: '+35 HP Refresh',
        heal: 35
      },
      {
        id: 'eclipse_champagne',
        name: 'Eclipse Gold Champagne',
        price: 95,
        effectLabel: '+80 HP & Full Nitro',
        heal: 80,
        refillNitro: true
      },
      {
        id: 'vip_bottle_service',
        name: 'VIP Bottle Service',
        price: 180,
        effectLabel: 'Full HP + 100% Armor',
        fullHeal: true,
        fullArmor: true
      }
    ]
  }
};

export function createInitialWeaponAmmo() {
  const ammo = {};
  for (const w of WEAPONS) {
    ammo[w.id] = w.ammo;
  }
  return ammo;
}

export function applyPlayerOutfit(player, outfitId) {
  const spec = PLAYER_OUTFITS[outfitId] || PLAYER_OUTFITS.default_coral;
  player.outfitId = spec.id;
  player.jacketColor = spec.jacketColor;
  player.shirtColor = spec.shirtColor;
  player.pantsColor = spec.pantsColor;
  player.outfitVersion = (player.outfitVersion || 0) + 1;
  return spec;
}

/**
 * Helper to construct a seamless walk-in or drive-in interior footprint anchored to a building edge.
 * facing = 0 means doorway opens East (+X) from wallX; facing = Math.PI opens West (-X) from wallX.
 */
function makeInterior(wallX, centerY, facing, depth = 48, halfSpan = 29, ceilingH = 28) {
  const dir = Math.cos(facing) >= 0 ? 1 : -1;
  const xA = wallX - dir * depth;
  const xB = wallX + dir * 2;
  return {
    x1: Math.min(xA, xB),
    x2: Math.max(xA, xB),
    y1: centerY - halfSpan,
    y2: centerY + halfSpan,
    wallX,
    centerY,
    depth,
    halfSpan,
    ceilingH,
    dir,
    floorX: wallX - dir * (depth * 0.42),
    floorY: centerY,
    counterX: wallX - dir * (depth * 0.72),
    counterY: centerY,
    vendorX: wallX - dir * (depth * 0.84),
    vendorY: centerY
  };
}

export function createCityShops() {
  return [
    // === WALK-IN / DRIVE-IN FURNISHED 3D INTERIORS ===
    {
      id: 'cafe_del_mar_ocean',
      kind: 'food',
      variant: 'walkin_cafe',
      name: 'CAFÉ DEL MAR • SOLARIS DINER',
      signText: 'CAFE DEL MAR',
      subtitle: 'Walk-In Ocean Drive Bistro & Espresso',
      primaryColor: '#e0b268',
      accentColor: '#5eb3aa',
      awningColors: ['#467c82', '#d9d0c1'],
      x: 2648,
      y: 1966,
      z: 0,
      facing: 0, // Opens East onto Ocean Drive (building ix=7, iy=5 East face x=2648)
      interactRadius: 68,
      promptShort: 'CAFÉ DEL MAR • WALK-IN DINER ($20+)',
      interior: makeInterior(2648, 1966, 0, 46, 29, 28)
    },
    {
      id: 'solaris_threads_ocean',
      kind: 'clothing',
      variant: 'walkin_clothing',
      name: 'SOLARIS THREADS • BOUTIQUE',
      signText: 'SOLARIS THREADS',
      subtitle: 'Walk-In Coastal Fashion & Outfit Boutique',
      primaryColor: '#6cb8c4',
      accentColor: '#d8b06c',
      awningColors: ['#4c7a76', '#d6cdc0'],
      x: 2648,
      y: 1696,
      z: 0,
      facing: 0, // Opens East onto Ocean Drive (building ix=7, iy=4 East face x=2648)
      interactRadius: 68,
      promptShort: 'SOLARIS THREADS • WALK-IN CLOTHING',
      interior: makeInterior(2648, 1696, 0, 46, 29, 28)
    },
    {
      id: 'vice_armory_neon',
      kind: 'armory',
      variant: 'walkin_armory',
      name: 'VICE ARMORY • GUNS & GEAR',
      signText: 'VICE ARMORY',
      subtitle: 'Walk-In Neon Strip Tactical Outfitter',
      primaryColor: '#d98856',
      accentColor: '#e0b268',
      awningColors: ['#3b4652', '#c89b55'],
      x: 1928,
      y: 1736,
      z: 0,
      facing: Math.PI, // Opens West onto Vice Neon Strip (building ix=5, iy=4 West face x=1928)
      interactRadius: 74,
      promptShort: 'VICE ARMORY • WALK-IN GUN SHOP',
      interior: makeInterior(1928, 1736, Math.PI, 48, 29, 28)
    },
    {
      id: 'palm_mart_downtown',
      kind: 'mart_boutique',
      variant: 'walkin_mart',
      name: 'PALM 24/7 MART & GEAR',
      signText: 'PALM 24/7 MART',
      subtitle: 'Walk-In Medkits, Gear & Essentials',
      primaryColor: '#5eb3aa',
      accentColor: '#e0b268',
      awningColors: ['#407578', '#d9d0c1'],
      x: 1288,
      y: 794,
      z: 0,
      facing: Math.PI, // Opens West onto Downtown Plaza (building ix=3, iy=1 West face x=1288)
      interactRadius: 74,
      promptShort: 'PALM 24/7 MART • WALK-IN GEAR & MEDS',
      interior: makeInterior(1288, 794, Math.PI, 48, 29, 28)
    },
    {
      id: 'vice_armory_downtown',
      kind: 'armory',
      variant: 'walkin_armory',
      name: 'VICE ARMORY • DOWNTOWN',
      signText: 'VICE ARMORY',
      subtitle: 'Walk-In Downtown Heavy Ordnance',
      primaryColor: '#d98856',
      accentColor: '#e0b268',
      awningColors: ['#3b4652', '#c89b55'],
      x: 1288,
      y: 688,
      z: 0,
      facing: Math.PI, // Opens West onto Downtown Plaza (building ix=3, iy=1 North bay)
      interactRadius: 74,
      promptShort: 'VICE ARMORY • WALK-IN GUN SHOP',
      interior: makeInterior(1288, 688, Math.PI, 48, 29, 28)
    },
    {
      id: 'pay_n_spray_ocean',
      kind: 'garage',
      variant: 'drivein_garage',
      name: 'SOLARIS CUSTOMS • PAY-N-SPRAY',
      signText: 'PAY-N-SPRAY',
      subtitle: 'Drive-In Auto Respray, Repair & Nitro Bay',
      primaryColor: '#63c792',
      accentColor: '#e0b268',
      awningColors: ['#375b56', '#c8b89a'],
      x: 2248,
      y: 1736,
      z: 0,
      facing: Math.PI, // Opens West onto rx=2176 (building ix=6, iy=4 West face x=2248)
      interactRadius: 112,
      promptShort: 'PAY-N-SPRAY • DRIVE-IN REPAIR ($200)',
      interior: makeInterior(2248, 1736, Math.PI, 68, 34, 32)
    },
    {
      id: 'pay_n_spray_downtown',
      kind: 'garage',
      variant: 'drivein_garage',
      name: 'SOLARIS CUSTOMS • DOWNTOWN',
      signText: 'PAY-N-SPRAY',
      subtitle: 'Drive-In Downtown Auto Customs Garage',
      primaryColor: '#63c792',
      accentColor: '#e0b268',
      awningColors: ['#375b56', '#c8b89a'],
      x: 1288,
      y: 1054,
      z: 0,
      facing: Math.PI, // Opens West onto rx=1216 (building ix=3, iy=2 West face x=1288)
      interactRadius: 112,
      promptShort: 'PAY-N-SPRAY • DRIVE-IN REPAIR ($200)',
      interior: makeInterior(1288, 1054, Math.PI, 68, 34, 32)
    },

    // === CLUB ECLIPSE INDOOR COCKTAIL BAR ===
    {
      id: 'club_eclipse_bar',
      kind: 'club_bar',
      variant: 'club_bar',
      name: 'CLUB ECLIPSE • COCKTAIL BAR',
      signText: 'ECLIPSE BAR',
      subtitle: 'Disco Lounge Drinks & Champagne',
      primaryColor: '#c988b8',
      accentColor: '#e0b268',
      awningColors: ['#4a3250', '#c988b8'],
      x: 1706,
      y: 1760,
      z: 0,
      facing: -Math.PI * 0.5,
      interactRadius: 68,
      promptShort: 'CLUB ECLIPSE BAR • COCKTAILS ($35+)'
    },

    // === STREET FOOD & JUICE CARTS (OPEN-AIR SIDEWALK & BOARDWALK VENDORS) ===
    {
      id: 'solaris_tacos_ocean',
      kind: 'food',
      variant: 'cart',
      name: 'SOLARIS TACOS',
      signText: 'SOLARIS TACOS',
      subtitle: 'Ocean Drive Street Cart',
      primaryColor: '#d4864b',
      accentColor: '#e0b268',
      awningColors: ['#b55d53', '#d9d0c1'],
      x: 2660,
      y: 2052,
      z: 0,
      facing: 0,
      interactRadius: 78,
      promptShort: 'SOLARIS TACOS • $20 (+35 HP)'
    },
    {
      id: 'solaris_tacos_south',
      kind: 'food',
      variant: 'cart',
      name: 'SOLARIS TACOS SOUTH',
      signText: 'SOLARIS TACOS',
      subtitle: 'South Beach Promenade Cart',
      primaryColor: '#d4864b',
      accentColor: '#5eb3aa',
      awningColors: ['#b8674c', '#d8d0c2'],
      x: 2660,
      y: 2350,
      z: 0,
      facing: 0,
      interactRadius: 78,
      promptShort: 'SOLARIS TACOS • $20 (+35 HP)'
    },
    {
      id: 'tropical_juice_marina',
      kind: 'food',
      variant: 'cart',
      name: 'TROPICAL JUICE BAR',
      signText: 'TROPICAL JUICE',
      subtitle: 'Starfish Marina Boardwalk Stand',
      primaryColor: '#e0b268',
      accentColor: '#63c792',
      awningColors: ['#4e8976', '#dfd6c5'],
      x: 2758,
      y: 804,
      z: 0.58,
      facing: Math.PI,
      interactRadius: 82,
      promptShort: 'TROPICAL JUICE BAR • $20 (+35 HP)'
    },
    {
      id: 'vice_burger_neon',
      kind: 'food',
      variant: 'cart',
      name: 'VICE BURGER',
      signText: 'VICE BURGER',
      subtitle: 'Neon Strip Late-Night Grill',
      primaryColor: '#d67367',
      accentColor: '#e0b268',
      awningColors: ['#a84f47', '#dfd6c7'],
      x: 1796,
      y: 1768,
      z: 0,
      facing: 0,
      interactRadius: 78,
      promptShort: 'VICE BURGER • $20+ FOOD'
    },
    {
      id: 'plaza_cafe_downtown',
      kind: 'food',
      variant: 'cart',
      name: 'CAFÉ DEL MAR • PLAZA',
      signText: 'CAFE DEL MAR',
      subtitle: 'Downtown Coffee & Taco Kiosk',
      primaryColor: '#e0b268',
      accentColor: '#5eb3aa',
      awningColors: ['#8c5b43', '#dfd6c5'],
      x: 1156,
      y: 822,
      z: 0,
      facing: 0,
      interactRadius: 78,
      promptShort: 'CAFÉ DEL MAR • FOOD & COFFEE'
    },
    {
      id: 'sunset_hills_cafe',
      kind: 'food',
      variant: 'cart',
      name: 'SUNSET HILLS ESPRESSO',
      signText: 'SUNSET CAFE',
      subtitle: 'Sunset Hills Villa Promenade',
      primaryColor: '#e0b268',
      accentColor: '#d67367',
      awningColors: ['#b5674c', '#e0d6c6'],
      x: 1916,
      y: 3610,
      z: 0,
      facing: Math.PI,
      interactRadius: 78,
      promptShort: 'SUNSET HILLS CAFÉ • $20+ FOOD'
    },
    {
      id: 'starfish_island_bar',
      kind: 'food',
      variant: 'cart',
      name: 'ISLAND PALM TACO BAR',
      signText: 'ISLAND TACOS',
      subtitle: 'Starfish Island Marina Stand',
      primaryColor: '#5eb3aa',
      accentColor: '#e0b268',
      awningColors: ['#467c82', '#dfd6c5'],
      x: 3375,
      y: 940,
      z: 0,
      facing: Math.PI,
      interactRadius: 80,
      promptShort: 'ISLAND TACOS • $20 (+35 HP)'
    }
  ];
}

export function getActiveWalkInShopAt(x, y, shops) {
  if (!shops) return null;
  for (const s of shops) {
    const ib = s.interior;
    if (!ib) continue;
    if (x >= ib.x1 - 2 && x <= ib.x2 + 2 && y >= ib.y1 - 2 && y <= ib.y2 + 2) {
      return s;
    }
  }
  return null;
}

export function createShopModalState() {
  return {
    open: false,
    shop: null,
    hoveredIndex: -1,
    feedbackText: '',
    feedbackColor: '#63c792',
    feedbackTimer: 0
  };
}

export function findNearestShop(state) {
  const { player, cityMap } = state;
  const shops = cityMap && cityMap.shops ? cityMap.shops : [];

  // If physically inside a walk-in / drive-in shop interior, prioritize that exact store immediately!
  const inside = getActiveWalkInShopAt(player.x, player.y, shops);
  if (inside) return inside;

  let best = null;
  let bestDist = Infinity;

  for (const shop of shops) {
    const anchorX = shop.interior ? shop.interior.floorX : shop.x;
    const anchorY = shop.interior ? shop.interior.floorY : shop.y;
    const dDoor = Math.hypot(player.x - shop.x, player.y - shop.y);
    const dFloor = Math.hypot(player.x - anchorX, player.y - anchorY);
    const d = Math.min(dDoor, dFloor);
    const maxR =
      shop.kind === 'garage'
        ? shop.interactRadius
        : player.vehicle
          ? player.vehicle.speed < 85
            ? shop.interactRadius + 8
            : 0
          : shop.interactRadius;
    if (maxR > 0 && d <= maxR && d < bestDist) {
      bestDist = d;
      best = shop;
    }
  }
  return best;
}

export function openShopModal(state, shop) {
  if (!shop) return false;
  state.safehouseModalOpen = false;
  if (state.nightlife) {
    state.nightlife.vipMenuOpen = false;
    state.nightlife.carMenuOpen = false;
  }
  state.input.mouseDown = false;
  if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch {
      // Ignore exit pointer lock errors in headless mode
    }
  }
  state.shopModal.open = true;
  state.shopModal.shop = shop;
  state.shopModal.hoveredIndex = -1;
  state.shopModal.feedbackText = '';
  state.shopModal.feedbackTimer = 0;
  if (state.audio && state.audio.playShopChime) {
    state.audio.playShopChime(true);
  }
  return true;
}

export function closeShopModal(state) {
  if (!state.shopModal) return;
  state.shopModal.open = false;
  state.shopModal.shop = null;
  state.shopModal.hoveredIndex = -1;
}

export function toggleNearbyShop(state) {
  if (state.shopModal && state.shopModal.open) {
    closeShopModal(state);
    return { action: 'closed' };
  }
  const nearest = findNearestShop(state);
  if (nearest) {
    openShopModal(state, nearest);
    return { action: 'opened', shop: nearest };
  }
  return null;
}

export function getShopDrawerLayout(shop) {
  if (!shop) return null;
  const catalog = SHOP_CATALOG[shop.kind];
  if (!catalog) return null;
  const items = catalog.items;
  const w = 494;
  const rowH = 54;
  const headerH = 92;
  const footerH = 54;
  const h = headerH + items.length * (rowH + 8) + footerH;
  const x = Math.round((1280 - w) * 0.5);
  const y = Math.round((700 - h) * 0.5);

  const itemRects = items.map((item, idx) => ({
    index: idx,
    item,
    x: x + 20,
    y: y + headerH + idx * (rowH + 8),
    w: w - 40,
    h: rowH
  }));

  const closeRect = {
    x: x + w - 122,
    y: y + h - 42,
    w: 102,
    h: 28
  };

  return { x, y, w, h, headerH, footerH, itemRects, closeRect, catalog };
}

export function findTargetVehicleForGarage(state, shop) {
  if (state.player.vehicle && !state.player.vehicle.destroyed) {
    return state.player.vehicle;
  }
  let best = null;
  let bestDist = 195;
  for (const v of state.vehicles) {
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - shop.x, v.y - shop.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function purchaseShopItem(state, itemIndex) {
  if (!state.shopModal || !state.shopModal.open || !state.shopModal.shop) {
    return { ok: false, reason: 'closed' };
  }
  const shop = state.shopModal.shop;
  const catalog = SHOP_CATALOG[shop.kind];
  if (!catalog) return { ok: false, reason: 'invalid_shop' };
  const item = catalog.items[itemIndex];
  if (!item) return { ok: false, reason: 'invalid_item' };

  const { player, wanted, particles } = state;

  let garageVehicle = null;
  if (shop.kind === 'garage') {
    garageVehicle = findTargetVehicleForGarage(state, shop);
    if (!garageVehicle) {
      const msg = 'DRIVE OR PARK A VEHICLE NEAR THE BAY';
      state.shopModal.feedbackText = msg;
      state.shopModal.feedbackColor = '#d95b66';
      state.shopModal.feedbackTimer = 2.8;
      state.hudBanner = {
        title: 'NO VEHICLE AT GARAGE BAY',
        subtitle: msg,
        color: '#d95b66',
        timer: 2.5
      };
      if (state.audio && state.audio.playErrorTone) state.audio.playErrorTone();
      return { ok: false, reason: 'no_vehicle' };
    }
  }

  if (player.cash < item.price) {
    const msg = `INSUFFICIENT FUNDS • NEED $${item.price.toLocaleString()}`;
    state.shopModal.feedbackText = msg;
    state.shopModal.feedbackColor = '#d95b66';
    state.shopModal.feedbackTimer = 2.8;
    state.hudBanner = {
      title: 'INSUFFICIENT FUNDS',
      subtitle: `${item.name.toUpperCase()} COSTS $${item.price.toLocaleString()}`,
      color: '#d95b66',
      timer: 2.5
    };
    if (state.audio && state.audio.playErrorTone) state.audio.playErrorTone();
    return { ok: false, reason: 'insufficient_funds' };
  }

  // Deduct cost cleanly (never negative)
  player.cash = Math.max(0, player.cash - item.price);

  // Apply item effect (respecting 125 Max HP Overheal!)
  const hpCap = player.maxHp || 100;
  if (item.heal) {
    player.hp = Math.min(hpCap, player.hp + item.heal);
  }
  if (item.fullHeal) {
    player.hp = hpCap;
  }
  if (item.fullArmor) {
    player.armor = 100;
  }
  if (item.fieldRepairArmor) {
    player.armor = Math.min(100, player.armor + 50);
    const nearCar = findTargetVehicleForGarage(state, shop) || state.vehicles[0];
    if (nearCar && !nearCar.destroyed) {
      nearCar.hp = nearCar.maxHp;
    }
  }
  if (item.refillNitro) {
    const nitroCar = garageVehicle || player.vehicle || state.vehicles[0];
    if (nitroCar) nitroCar.nitro = 100;
    player.dashCooldown = 0;
  }
  if (item.ammoGrant) {
    if (!player.weaponAmmo) player.weaponAmmo = createInitialWeaponAmmo();
    for (const [wId, qty] of Object.entries(item.ammoGrant)) {
      const cap = MAX_WEAPON_AMMO[wId] || 999;
      player.weaponAmmo[wId] = Math.min(cap, (player.weaponAmmo[wId] || 0) + qty);
    }
  }
  if (item.fullRestock) {
    if (!player.weaponAmmo) player.weaponAmmo = createInitialWeaponAmmo();
    for (const [wId, cap] of Object.entries(MAX_WEAPON_AMMO)) {
      player.weaponAmmo[wId] = cap;
    }
    player.armor = 100;
  }
  if (item.outfitId) {
    applyPlayerOutfit(player, item.outfitId);
  }
  if (item.repairRespray && garageVehicle) {
    garageVehicle.hp = garageVehicle.maxHp;
    const palette = ['#246b7f', '#a6283b', '#ad5937', '#b6ad9d', '#44685e', '#384556'];
    const choices = palette.filter((c) => c !== garageVehicle.color);
    garageVehicle.color = choices[Math.floor(Math.random() * choices.length)] || palette[0];
    wanted.stars = 0;
    wanted.heat = 0;
    wanted.cooldownTimer = 0;
    wanted.helicopter.active = false;
    if (particles) {
      for (let k = 0; k < 14; k++) {
        particles.push({
          x: garageVehicle.x + (Math.random() - 0.5) * 24,
          y: garageVehicle.y + (Math.random() - 0.5) * 24,
          z: 4 + Math.random() * 10,
          vx: (Math.random() - 0.5) * 55,
          vy: (Math.random() - 0.5) * 55,
          vz: 18 + Math.random() * 24,
          size: 4.5,
          color: '#b4c0ca',
          life: 0.65,
          maxLife: 0.65,
          kind: 'smoke'
        });
      }
    }
  }

  const toastTitle = `PURCHASED: ${item.name.toUpperCase()} (${item.effectLabel})`;
  state.shopModal.feedbackText = `✓ ${toastTitle}`;
  state.shopModal.feedbackColor = '#63c792';
  state.shopModal.feedbackTimer = 2.8;
  state.hudBanner = {
    title: toastTitle,
    subtitle: `${shop.name} • -$${item.price.toLocaleString()} (BALANCE $${player.cash.toLocaleString()})`,
    color: '#63c792',
    timer: 2.6
  };

  if (state.audio && state.audio.playShopChime) {
    state.audio.playShopChime(false);
  }
  return { ok: true, item, shop };
}

export function handleShopDrawerClick(state, mx, my) {
  if (!state.shopModal || !state.shopModal.open || !state.shopModal.shop) return false;
  const layout = getShopDrawerLayout(state.shopModal.shop);
  if (!layout) return false;

  const c = layout.closeRect;
  if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
    closeShopModal(state);
    return true;
  }

  for (const r of layout.itemRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      purchaseShopItem(state, r.index);
      return true;
    }
  }

  if (
    mx >= layout.x &&
    mx <= layout.x + layout.w &&
    my >= layout.y &&
    my <= layout.y + layout.h
  ) {
    return true;
  }

  closeShopModal(state);
  return true;
}

export function updateShopDrawerHover(state, mx, my) {
  if (!state.shopModal || !state.shopModal.open || !state.shopModal.shop) return;
  const layout = getShopDrawerLayout(state.shopModal.shop);
  if (!layout) return;
  let found = -1;
  for (const r of layout.itemRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      found = r.index;
      break;
    }
  }
  state.shopModal.hoveredIndex = found;
}

export function updateShopSystem(state, dt) {
  if (!state.shopModal) return;
  if (state.shopModal.feedbackTimer > 0) {
    state.shopModal.feedbackTimer = Math.max(0, state.shopModal.feedbackTimer - dt);
  }
  if (state.shopModal.open && state.shopModal.shop) {
    const s = state.shopModal.shop;
    const anchorX = s.interior ? s.interior.floorX : s.x;
    const anchorY = s.interior ? s.interior.floorY : s.y;
    const dist = Math.min(
      Math.hypot(state.player.x - s.x, state.player.y - s.y),
      Math.hypot(state.player.x - anchorX, state.player.y - anchorY)
    );
    if (dist > s.interactRadius + 95) {
      closeShopModal(state);
    }
  }
}
