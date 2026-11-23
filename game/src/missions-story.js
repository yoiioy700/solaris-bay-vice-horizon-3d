import { createVehicle } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import { addCrimeHeat } from './police-wanted.js';

export const STORY_MISSIONS = [
  {
    id: 'm1_neon_courier',
    index: 1,
    code: 'ACT I • MISSION 01',
    title: 'NEON COURIER OVERDRIVE',
    objective: 'Deliver the supercharged Apex V8 GT along Ocean Drive to Club Eclipse.',
    briefing: 'Push the twin-turbo Apex V8 GT north up Ocean Drive to the Neon Strip VIP drop.',
    reward: 15000,
    targetX: 1856,
    targetY: 1760,
    requiresVehicle: true
  },
  {
    id: 'm2_chrome_hijack',
    index: 2,
    code: 'ACT I • MISSION 02',
    title: 'CHROME ROADSTER HIJACK',
    objective: 'Carjack the Syndicate Comet GT Cabrio in Neon Strip & eliminate escort guards.',
    briefing: 'Seize the cyan roadster outside Palm Casino and neutralize the Syndicate detail.',
    reward: 22500,
    targetX: 1536,
    targetY: 1440,
    spawnGuards: 3
  },
  {
    id: 'm3_marina_extraction',
    index: 3,
    code: 'ACT II • MISSION 03',
    title: 'STARFISH MARINA EXTRACTION',
    objective: 'Clear the cartel pier ambush at Starfish Bay Marina & secure the ledger.',
    briefing: 'Storm the superyacht pier, eliminate the cartel enforcers, and claim the ledger.',
    reward: 30000,
    targetX: 2720,
    targetY: 800,
    spawnGuards: 4
  },
  {
    id: 'm4_casino_blackout',
    index: 4,
    code: 'ACT II • MISSION 04',
    title: 'PALM CASINO BLACKOUT',
    objective: 'Ambush the Syndicate treasury exchange at Neon Strip Boulevard.',
    briefing: 'Use heavy weaponry to breach the casino vault courier perimeter.',
    reward: 42000,
    targetX: 1856,
    targetY: 2080,
    spawnGuards: 5
  },
  {
    id: 'm5_federal_convoy',
    index: 5,
    code: 'ACT III • MISSION 05',
    title: 'FEDERAL RESERVE CONVOY HEIST',
    objective: 'Intercept & destroy the armored Syndicate Goliath Bullion Rig in Downtown Plaza.',
    briefing: 'Hit the armored gold carrier with Titan RPGs amidst a 5-Star VCPD tactical lockdown.',
    reward: 85000,
    targetX: 1216,
    targetY: 800,
    spawnConvoy: true
  },
  {
    id: 'm6_horizon_sovereign',
    index: 6,
    code: 'FINALE • MISSION 06',
    title: 'VICE HORIZON SOVEREIGN',
    objective: 'Escape the lockdown to Starfish Bay Safehouse Villa & bank the heist payout.',
    briefing: 'Evade VCPD choppers or respray at Pay-N-Spray and reach your Marina Safehouse Villa.',
    reward: 125000,
    targetX: 2496,
    targetY: 800
  }
];

export function createMissionState() {
  return {
    currentIndex: 0,
    completedIds: [],
    activeMission: STORY_MISSIONS[0],
    targetEntity: null,
    guardsSpawnedForId: null,
    gpsPoints: []
  };
}

export function startMissionByIndex(state, idx) {
  const clamped = Math.max(0, Math.min(STORY_MISSIONS.length - 1, idx));
  const mission = { ...STORY_MISSIONS[clamped] };
  state.missions.currentIndex = clamped;
  state.missions.activeMission = mission;
  state.missions.targetEntity = null;
  state.missions.guardsSpawnedForId = null;

  spawnMissionEntitiesIfNeeded(state, mission);
  updateMissionGpsRoute(state);
}

export function spawnMissionEntitiesIfNeeded(state, mission) {
  if (!mission || state.missions.guardsSpawnedForId === mission.id) return;
  state.missions.guardsSpawnedForId = mission.id;

  if (mission.spawnGuards) {
    for (let i = 0; i < mission.spawnGuards; i++) {
      const ang = (i * Math.PI * 2) / mission.spawnGuards;
      const gx = mission.targetX + Math.cos(ang) * 48;
      const gy = mission.targetY + Math.sin(ang) * 48;
      state.pedestrians.push(createPedestrian(gx, gy, 'syndicate'));
    }
  }

  if (mission.spawnConvoy) {
    const convoyRig = createVehicle(
      'goliath_convoy',
      mission.targetX,
      mission.targetY,
      0,
      {
        aiRole: 'convoy',
        driver: 'syndicate',
        hp: 650,
        maxHp: 650
      }
    );
    state.vehicles.push(convoyRig);
    state.missions.targetEntity = convoyRig;
  }
}

export function updateMissionSystem(state, dt) {
  const { missions, player } = state;
  const active = missions.activeMission;
  if (!active) return;

  spawnMissionEntitiesIfNeeded(state, active);

  // If mission tracks a moving convoy entity, update target coordinates
  if (missions.targetEntity && !missions.targetEntity.destroyed) {
    active.targetX = missions.targetEntity.x;
    active.targetY = missions.targetEntity.y;
  }

  updateMissionGpsRoute(state);

  const dist = Math.hypot(player.x - active.targetX, player.y - active.targetY);

  // Check completion condition
  const convoyDone =
    !active.spawnConvoy ||
    (missions.targetEntity && missions.targetEntity.destroyed) ||
    dist < 75;

  if (dist < 78 && convoyDone) {
    completeActiveMission(state);
  }
}

export function completeActiveMission(state) {
  const { missions, player } = state;
  const active = missions.activeMission;
  if (!active) return;

  player.cash += active.reward;
  if (!missions.completedIds.includes(active.id)) {
    missions.completedIds.push(active.id);
  }

  state.hudBanner = {
    title: `MISSION PASSED • +$${active.reward.toLocaleString()}`,
    subtitle: `${active.title} COMPLETED`,
    color: '#e0b268',
    timer: 4.0
  };
  if (state.audio && state.audio.playShopChime) {
    state.audio.playShopChime(false);
  }

  if (active.index === 3 || active.index === 5) {
    addCrimeHeat(state, 280, 'HIGH-PROFILE SYNDICATE HEIST REPORTED');
  }

  const nextIdx = (missions.currentIndex + 1) % STORY_MISSIONS.length;
  startMissionByIndex(state, nextIdx);
}

export function updateMissionGpsRoute(state) {
  const { player, missions, cityMap } = state;
  const active = missions.activeMission;
  if (!active) {
    missions.gpsPoints = [];
    return;
  }

  // Snap to nearest vertical/horizontal road intersection for Manhattan L-route
  let nearestRoadX = cityMap.verticalRoads[0];
  let bestDx = Infinity;
  for (const rx of cityMap.verticalRoads) {
    const d = Math.abs(player.x - rx);
    if (d < bestDx) {
      bestDx = d;
      nearestRoadX = rx;
    }
  }

  let targetRoadY = cityMap.horizontalRoads[0];
  let bestDy = Infinity;
  for (const ry of cityMap.horizontalRoads) {
    const d = Math.abs(active.targetY - ry);
    if (d < bestDy) {
      bestDy = d;
      targetRoadY = ry;
    }
  }

  missions.gpsPoints = [
    { x: player.x, y: player.y },
    { x: nearestRoadX, y: player.y },
    { x: nearestRoadX, y: targetRoadY },
    { x: active.targetX, y: targetRoadY },
    { x: active.targetX, y: active.targetY }
  ];
}
