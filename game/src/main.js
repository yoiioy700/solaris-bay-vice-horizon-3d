import { WEAPONS, RADIO_STATIONS, PLAYER_PHYSICS } from './config.js';
import { createCityMap } from './city-map.js';
import { spawnInitialVehicles, updateVehicles, tryToggleVehicle } from './vehicles.js';
import { spawnInitialPedestrians, updatePedestrians } from './pedestrians.js';
import { createWantedState, updatePoliceSystem } from './police-wanted.js';
import {
  createMissionState,
  startMissionByIndex,
  updateMissionSystem
} from './missions-story.js';
import {
  updatePlayerOnFoot,
  updateCombatAndProjectiles,
  firePlayerWeapon,
  switchPlayerWeapon,
  startWeaponReload,
  getDriveByWeapon,
  performMeleePunch,
  computeAimRay,
  updatePlayerOutcome
} from './combat-weapons.js';
import { createInitialCareerStats } from './player-vitals.js';
import {
  createAudioController,
  saveCareerToStorage,
  loadCareerFromStorage,
  hasSavedCareer,
  clearCareerStorage,
  loadSettingsFromStorage,
  applyRuntimeSettings,
  saveSettingsToStorage,
  sleepToHour
} from './audio-save.js';
import {
  createInitialWeaponAmmo,
  createInitialWeaponMag,
  createShopModalState,
  applyPlayerOutfit,
  toggleNearbyShop,
  closeShopModal,
  purchaseShopItem,
  handleShopDrawerClick,
  updateShopDrawerHover,
  updateShopSystem
} from './shops-economy.js';
import {
  createNightlifeState,
  togglePlayerDance,
  tryInviteCompanionOrHonk,
  tryInteractNightlife,
  closeNightlifeMenus,
  startNightlifeOption,
  boostNightlifeRhythm,
  finishNightlifeSession,
  handleNightlifeMenuClick,
  updateNightlifeMenuHover,
  updateNightlifeSystem
} from './nightlife-romance.js';
import { createWorldRenderer3D } from './render-world.js';
import { renderHud2D, getStartScreenLayout } from './render-hud.js';
import {
  PAUSE_TABS,
  createPauseHubState,
  handlePauseHubKeyDown,
  handlePauseHubMouseMove,
  handlePauseHubMouseDown,
  handlePauseHubMouseUp,
  handlePauseHubWheel
} from './pause-hub.js';
import { applyShowcaseShotIfRequested } from './showcase-shots.js';

const webglCanvas = document.getElementById('webgl-canvas');
const hudCanvas = document.getElementById('hud-canvas');
const hudCtx = hudCanvas.getContext('2d');

const cityMap = createCityMap();
const initialVehicles = spawnInitialVehicles(cityMap);

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + diff * Math.min(1, t);
}

function exitPointerLockSafe() {
  if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch {
      // Ignore exit pointer lock errors in headless Chrome
    }
  }
}

function requestPointerLockSafe() {
  if (
    typeof document !== 'undefined' &&
    document.pointerLockElement !== webglCanvas &&
    webglCanvas &&
    webglCanvas.requestPointerLock
  ) {
    try {
      const p = webglCanvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Ignore pointer lock rejection in headless mode
    }
  }
}

function isAnyModalOpen(st) {
  return Boolean(
    st.startScreenOpen ||
      st.outcome ||
      (st.shopModal && st.shopModal.open) ||
      st.safehouseModalOpen ||
      (st.nightlife &&
        (st.nightlife.vipMenuOpen || st.nightlife.carMenuOpen || st.nightlife.session))
  );
}

const state = {
  time: 0,
  worldTime: 17.2,
  nightFactor: 0,
  paused: false,
  pauseTab: 'SAVE',
  pauseOpenedFromTitle: false,
  pauseMap: createPauseHubState(),
  pauseHover: null,
  startScreenOpen: true,
  startScreenHover: null,
  hasSavedCareer: hasSavedCareer(),
  isShowcaseShot: false,
  outcome: null,
  careerStats: createInitialCareerStats(),
  customWaypoint: null,
  customWaypointGps: [],
  settings: loadSettingsFromStorage(),
  liveFps: 60,
  cityMap,
  player: {
    x: initialVehicles[0].x,
    y: initialVehicles[0].y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    landSquash: 0,
    angle: initialVehicles[0].angle,
    hp: 100,
    maxHp: 100,
    armor: 100,
    cash: 42500,
    weaponIndex: 1,
    weaponAmmo: createInitialWeaponAmmo(),
    weaponMag: createInitialWeaponMag(),
    reloadTimer: 0,
    reloadingWeaponId: null,
    punchTimer: 0,
    punchDuration: 0.28,
    punchHand: 'right',
    punchCombo: 0,
    punchCooldown: 0,
    outfitId: 'default_coral',
    jacketColor: '#b55649',
    shirtColor: '#d8d1c5',
    pantsColor: '#252e3a',
    outfitVersion: 0,
    radioIndex: 0,
    vehicle: initialVehicles[0],
    walkPhase: 0,
    fireCooldown: 0,
    muzzleTimer: 0,
    aimHoldTimer: 0,
    weaponRecoil: 0,
    spreadBloom: 0,
    muzzleWorldPos: null,
    dashCooldown: 0
  },
  input: {
    keys: {},
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mouseActive: false,
    jumpBuffer: 0,
    aimAngle: -Math.PI * 0.5
  },
  camera: {
    yaw: initialVehicles[0].angle,
    pitch: -0.06,
    recoilYaw: 0,
    recoilPitch: 0,
    aiming: false,
    aimBlend: 0,
    orbitIdleTimer: 0,
    vehCamPreset: 1,
    vehCamLabelTimer: 0,
    trauma: 0,
    hitMarkerTimer: 0,
    hitMarkerCrit: false,
    damageFlash: 0,
    explosionFlash: 0,
    aimHitPoint: null,
    aimTargetType: null,
    aimDirection: null,
    aimDirection3D: null,
    currentEye: null,
    currentLook: null,
    overridePose: null,
    nightlifePose: null,
    showShowcaseCrosshair: false,
    indoorMode: 'outdoor'
  },
  vehicles: initialVehicles,
  pedestrians: spawnInitialPedestrians(cityMap),
  wanted: createWantedState(),
  missions: createMissionState(),
  shopModal: createShopModalState(),
  nightlife: createNightlifeState(),
  projectiles: [],
  particles: [],
  pickups: [],
  skidMarks: [],
  impactMarks: [],
  projectedMarkers: null,
  hudBanner: null,
  safehouseModalOpen: false,
  payNsprayCooldown: 0,
  lastSaveStatus: 'LOCALSTORAGE PERSISTENCE READY',
  audio: createAudioController()
};

function setPaused(paused) {
  const next = Boolean(paused);
  if (next === state.paused) return;
  state.paused = next;
  state.pauseHover = null;
  if (next) {
    state.input.keys = {};
    state.input.mouseDown = false;
    state.camera.aiming = false;
    exitPointerLockSafe();
    if (state.audio && state.audio.setPaused) state.audio.setPaused(true);
  } else {
    if (state.audio && state.audio.setPaused) state.audio.setPaused(false);
  }
}

function openPauseHub(tab = null, fromTitle = false) {
  if (state.outcome || state.isShowcaseShot) return;
  state.safehouseModalOpen = false;
  closeShopModal(state);
  closeNightlifeMenus(state);
  if (tab && PAUSE_TABS.includes(tab)) {
    state.pauseTab = tab;
  } else if (!PAUSE_TABS.includes(state.pauseTab)) {
    state.pauseTab = 'SAVE';
  }
  if (state.pauseTab === 'MAP' && state.pauseMap) {
    state.pauseMap.panX = state.player.x;
    state.pauseMap.panY = state.player.y;
  }
  state.pauseOpenedFromTitle = Boolean(fromTitle);
  if (fromTitle) {
    state.startScreenOpen = false;
  }
  setPaused(true);
}

function closePauseHub() {
  if (!state.paused) return;
  if (state.pauseOpenedFromTitle) {
    state.pauseOpenedFromTitle = false;
    setPaused(false);
    state.startScreenOpen = true;
    return;
  }
  setPaused(false);
}

function returnToTitleScreen() {
  state.pauseOpenedFromTitle = false;
  setPaused(false);
  state.outcome = null;
  state.startScreenOpen = true;
  state.startScreenHover = null;
  state.safehouseModalOpen = false;
  closeShopModal(state);
  closeNightlifeMenus(state);
  state.input.keys = {};
  state.input.mouseDown = false;
  state.camera.aiming = false;
  state.audio.stats.engineRunning = false;
  if (state.audio && state.audio.setPaused) state.audio.setPaused(true);
}

function resetToNewGame(clearSave = true) {
  if (clearSave) {
    clearCareerStorage();
    state.hasSavedCareer = hasSavedCareer();
  }

  state.pauseOpenedFromTitle = false;
  state.paused = false;
  state.pauseHover = null;
  state.outcome = null;
  state.worldTime = 17.2;
  state.nightFactor = 0;
  state.careerStats = createInitialCareerStats();
  state.customWaypoint = null;
  state.customWaypointGps = [];
  state.vehicles = spawnInitialVehicles(cityMap);
  state.vehicles[0].driver = 'player';
  state.pedestrians = spawnInitialPedestrians(cityMap);
  state.wanted = createWantedState();
  state.missions = createMissionState();
  state.shopModal = createShopModalState();
  state.nightlife = createNightlifeState();
  state.projectiles = [];
  state.particles = [];
  state.pickups = [];
  state.skidMarks = [];
  state.impactMarks = [];
  state.safehouseModalOpen = false;
  state.payNsprayCooldown = 0;

  const heroCar = state.vehicles[0];
  Object.assign(state.player, {
    x: heroCar.x,
    y: heroCar.y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    landSquash: 0,
    angle: heroCar.angle,
    hp: 100,
    maxHp: 100,
    armor: 100,
    cash: 42500,
    weaponIndex: 1,
    weaponAmmo: createInitialWeaponAmmo(),
    weaponMag: createInitialWeaponMag(),
    reloadTimer: 0,
    reloadingWeaponId: null,
    punchTimer: 0,
    punchDuration: 0.28,
    punchHand: 'right',
    punchCombo: 0,
    punchCooldown: 0,
    radioIndex: 0,
    vehicle: heroCar,
    walkPhase: 0,
    fireCooldown: 0,
    muzzleTimer: 0,
    aimHoldTimer: 0,
    weaponRecoil: 0,
    spreadBloom: 0,
    dashCooldown: 0
  });
  applyPlayerOutfit(state.player, 'default_coral');
  startMissionByIndex(state, 0);

  state.camera.yaw = heroCar.angle;
  state.camera.pitch = -0.06;
  state.camera.recoilYaw = 0;
  state.camera.recoilPitch = 0;
  state.camera.aiming = false;
  state.camera.aimBlend = 0;
  state.camera.orbitIdleTimer = 0;
  state.camera.vehCamPreset = 1;
  state.camera.vehCamLabelTimer = 0;
  state.camera.trauma = 0;
  state.camera.hitMarkerTimer = 0;
  state.camera.damageFlash = 0;
  state.camera.explosionFlash = 0;
  state.camera.overridePose = null;
  state.camera.nightlifePose = null;
  state.camera.indoorMode = 'outdoor';

  state.input.keys = {};
  state.input.mouseDown = false;
  state.input.jumpBuffer = 0;
  state.lastSaveStatus = 'NEW CAREER STARTED • READY TO SAVE [K]';
  state.startScreenOpen = false;
  state.startScreenHover = null;
  state.hudBanner = {
    title: 'SOLARIS BAY • NEW GAME STARTED',
    subtitle: 'ACT I MISSION 01: PUSH THE APEX V8 GT UP OCEAN DRIVE',
    color: '#e0b268',
    timer: 3.2
  };

  state.audio.ensureContext();
  if (state.audio.setPaused) state.audio.setPaused(false);
  applyRuntimeSettings(state, worldRenderer);
  if (state.player.vehicle) {
    state.audio.onVehicleEnter(state.player.vehicle);
  }
}

function continueSavedCareer() {
  if (!hasSavedCareer()) return false;
  loadCareerFromStorage(state);
  state.pauseOpenedFromTitle = false;
  state.paused = false;
  state.pauseHover = null;
  state.outcome = null;
  state.hasSavedCareer = true;
  state.startScreenOpen = false;
  state.startScreenHover = null;
  state.safehouseModalOpen = false;
  state.camera.yaw = state.player.vehicle ? state.player.vehicle.angle : state.player.angle;
  state.camera.pitch = -0.06;
  state.hudBanner = {
    title: 'CAREER RESUMED FROM LOCALSTORAGE',
    subtitle: `BANKROLL $${state.player.cash.toLocaleString()} • HP ${Math.round(state.player.hp)}/${state.player.maxHp}`,
    color: '#63c792',
    timer: 3.0
  };
  state.audio.ensureContext();
  if (state.audio.setPaused) state.audio.setPaused(false);
  applyRuntimeSettings(state, worldRenderer);
  if (state.player.vehicle) {
    state.audio.onVehicleEnter(state.player.vehicle);
  }
  return true;
}

applyPlayerOutfit(state.player, 'default_coral');
initialVehicles[0].driver = 'player';
startMissionByIndex(state, 0);

const activeShot = applyShowcaseShotIfRequested(state);
state.isShowcaseShot = Boolean(activeShot);
if (activeShot) {
  state.startScreenOpen = false;
  state.worldTime = 17.2;
  loadCareerFromStorage(state);
  state.customWaypoint = null;
  state.customWaypointGps = [];
  applyShowcaseShotIfRequested(state);
  state.worldTime = 17.2;
  state.audio.stats.engineRunning = Boolean(state.player.vehicle);
} else {
  state.startScreenOpen = true;
  state.audio.stats.engineRunning = false;
}

const worldRenderer = createWorldRenderer3D(webglCanvas, state);
if (activeShot) {
  worldRenderer.renderer.toneMappingExposure = 0.96;
} else {
  applyRuntimeSettings(state, worldRenderer);
  computeAimRay(state);
}

const pauseHubActions = {
  worldRenderer,
  closeHub: () => closePauseHub(),
  startNewGame: () => resetToNewGame(true),
  returnToTitle: () => returnToTitleScreen()
};

let wasPointerLocked = false;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === webglCanvas;
    document.body.classList.toggle('pointer-locked', locked);
    if (
      wasPointerLocked &&
      !locked &&
      !isAnyModalOpen(state) &&
      !state.startScreenOpen &&
      !activeShot &&
      !state.paused
    ) {
      openPauseHub(null, false);
    }
    wasPointerLocked = locked;
  });
}

// Input Listeners
window.addEventListener('blur', () => {
  state.input.keys = {};
  state.input.mouseDown = false;
  state.camera.aiming = false;
});

window.addEventListener('keydown', (e) => {
  state.audio.ensureContext();

  // Start / Title Screen shortcuts
  if (state.startScreenOpen) {
    state.input.keys[e.code] = true;
    if (e.code === 'Enter') {
      e.preventDefault();
      resetToNewGame(true);
    } else if (e.code === 'KeyC' && hasSavedCareer()) {
      e.preventDefault();
      continueSavedCareer();
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      openPauseHub('SAVE', true);
    } else if (e.code === 'KeyO') {
      e.preventDefault();
      openPauseHub('SETTINGS', true);
    }
    return;
  }

  // Unified 7-Tab Pause Hub keyboard delegation
  if (state.paused) {
    handlePauseHubKeyDown(e, state, pauseHubActions);
    return;
  }

  // Ignore game actions during WASTED / BUSTED slow-mo outcome
  if (state.outcome) {
    return;
  }

  state.input.keys[e.code] = true;

  // Active VIP Suite or Car Sex session controls
  if (state.nightlife.session) {
    if (e.code === 'Space') {
      e.preventDefault();
      boostNightlifeRhythm(state);
    } else if (e.code === 'Escape') {
      finishNightlifeSession(state, true);
    }
    return;
  }

  if (e.code === 'Escape') {
    if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
      closeNightlifeMenus(state);
    } else if (state.shopModal.open) {
      closeShopModal(state);
    } else if (state.safehouseModalOpen) {
      state.safehouseModalOpen = false;
    } else if (!activeShot) {
      openPauseHub(null, false);
    }
    state.camera.aiming = false;
    exitPointerLockSafe();
    return;
  }

  if (e.code === 'KeyP' && !isAnyModalOpen(state) && !activeShot) {
    e.preventDefault();
    openPauseHub(null, false);
    return;
  }

  if (e.code === 'KeyM' && !activeShot) {
    e.preventDefault();
    openPauseHub('MAP', false);
    return;
  }

  if (e.code === 'Space' && !isAnyModalOpen(state)) {
    e.preventDefault();
    if (!state.player.vehicle) {
      state.player.jumpBufferTimer = PLAYER_PHYSICS.jumpBuffer;
      state.input.jumpBuffer = PLAYER_PHYSICS.jumpBuffer;
    }
    return;
  }

  if (e.code === 'KeyE') {
    if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
      closeNightlifeMenus(state);
      return;
    }
    if (state.shopModal.open) {
      closeShopModal(state);
      return;
    }
    if (!tryInteractNightlife(state)) {
      toggleNearbyShop(state);
    }
    if (isAnyModalOpen(state)) {
      state.camera.aiming = false;
      exitPointerLockSafe();
    }
    return;
  }

  if (e.code === 'KeyG') {
    togglePlayerDance(state);
    return;
  }

  if (e.code === 'KeyH') {
    tryInviteCompanionOrHonk(state);
    return;
  }

  if (e.code === 'Tab') {
    e.preventDefault();
    if (state.shopModal.open) closeShopModal(state);
    closeNightlifeMenus(state);
    state.safehouseModalOpen = !state.safehouseModalOpen;
    if (state.safehouseModalOpen) {
      state.input.mouseDown = false;
      state.camera.aiming = false;
      exitPointerLockSafe();
    }
    return;
  }

  if (e.code === 'KeyK') {
    if (saveCareerToStorage(state)) {
      state.hasSavedCareer = true;
    }
    return;
  }

  if (e.code === 'KeyN' && state.safehouseModalOpen) {
    resetToNewGame(true);
    return;
  }

  if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
    if (e.code.startsWith('Digit')) {
      const num = Number(e.code.replace('Digit', ''));
      if (num >= 1 && num <= 2) {
        startNightlifeOption(state, num - 1);
      }
    }
    return;
  }

  if (state.shopModal.open) {
    if (e.code.startsWith('Digit')) {
      const num = Number(e.code.replace('Digit', ''));
      if (num >= 1 && num <= 5) {
        purchaseShopItem(state, num - 1);
      }
    }
    return;
  }

  if (e.code === 'KeyF' || e.code === 'Enter') {
    const toggled = tryToggleVehicle(state);
    if (toggled && toggled.action === 'exit') {
      state.camera.aiming = false;
    } else if (toggled && toggled.action === 'enter') {
      state.camera.aiming = false;
      state.camera.orbitIdleTimer = 2.0;
    }
  } else if (e.code === 'KeyX') {
    state.player.radioIndex = (state.player.radioIndex + 1) % RADIO_STATIONS.length;
  } else if (e.code === 'KeyR') {
    if (state.player.vehicle) {
      const dbW = getDriveByWeapon(state.player);
      const curMag = state.player.weaponMag?.[dbW.id] ?? 0;
      const res = state.player.weaponAmmo?.[dbW.id] ?? 0;
      if (dbW && !dbW.isMelee && curMag < dbW.magSize && res > 0) {
        startWeaponReload(state);
      } else {
        state.player.radioIndex = (state.player.radioIndex + 1) % RADIO_STATIONS.length;
      }
    } else {
      startWeaponReload(state);
    }
  } else if (e.code === 'KeyV') {
    if (state.player.vehicle) {
      state.camera.vehCamPreset = ((state.camera.vehCamPreset ?? 1) + 1) % 4;
      state.camera.vehCamLabelTimer = 2.2;
    } else {
      performMeleePunch(state);
    }
  } else if (e.code === 'KeyQ') {
    switchPlayerWeapon(state, state.player.weaponIndex + WEAPONS.length - 1);
  } else if (e.code.startsWith('Digit')) {
    const num = Number(e.code.replace('Digit', ''));
    if (num >= 1 && num <= WEAPONS.length) {
      switchPlayerWeapon(state, num - 1);
    }
  }
});

window.addEventListener('keyup', (e) => {
  state.input.keys[e.code] = false;
});

webglCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  const rect = webglCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / (rect.width || 1280)) * 1280;
  const my = ((e.clientY - rect.top) / (rect.height || 720)) * 720;
  state.input.mouseX = mx;
  state.input.mouseY = my;

  if (state.startScreenOpen) {
    const { newGameRect, continueRect, loadSlotRect, settingsRect } = getStartScreenLayout();
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(newGameRect)) state.startScreenHover = 'new';
    else if (hit(continueRect)) state.startScreenHover = 'continue';
    else if (hit(loadSlotRect)) state.startScreenHover = 'load';
    else if (hit(settingsRect)) state.startScreenHover = 'settings';
    else state.startScreenHover = null;
    return;
  }

  if (state.paused) {
    handlePauseHubMouseMove(state, mx, my, pauseHubActions);
    return;
  }

  if (state.outcome) return;

  if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
    updateNightlifeMenuHover(state, mx, my);
    return;
  }
  if (state.shopModal.open) {
    updateShopDrawerHover(state, mx, my);
    return;
  }
  if (state.safehouseModalOpen || state.nightlife.session) return;

  const isLocked = typeof document !== 'undefined' && document.pointerLockElement === webglCanvas;
  const hasButtons = (e.buttons & 3) !== 0;
  if (isLocked || hasButtons) {
    const dx = Math.max(-60, Math.min(60, e.movementX || 0));
    const dy = Math.max(-60, Math.min(60, e.movementY || 0));
    const mult = (state.settings && state.settings.mouseSensitivity) || 1.0;
    const sens = (state.camera.aiming ? 0.0018 : 0.0026) * mult;
    state.camera.yaw += dx * sens;
    state.camera.pitch = Math.max(-0.55, Math.min(0.68, state.camera.pitch - dy * sens));
    if (state.player.vehicle && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
      state.camera.orbitIdleTimer = 1.5;
    }
    state.input.mouseActive = true;
    state.input.aimAngle = state.camera.yaw;
  }
});

webglCanvas.addEventListener('mousedown', (e) => {
  state.audio.ensureContext();

  const rect = webglCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / (rect.width || 1280)) * 1280;
  const my = ((e.clientY - rect.top) / (rect.height || 720)) * 720;

  if (state.startScreenOpen) {
    if (e.button !== 0) return;
    const { newGameRect, continueRect, loadSlotRect, settingsRect } = getStartScreenLayout();
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(newGameRect)) {
      resetToNewGame(true);
    } else if (hit(continueRect) && hasSavedCareer()) {
      continueSavedCareer();
    } else if (hit(loadSlotRect)) {
      openPauseHub('SAVE', true);
    } else if (hit(settingsRect)) {
      openPauseHub('SETTINGS', true);
    }
    return;
  }

  if (state.paused) {
    handlePauseHubMouseDown(state, mx, my, e.button, pauseHubActions);
    return;
  }

  if (state.outcome) return;

  if (e.button === 2) {
    e.preventDefault();
    if (!isAnyModalOpen(state) && !state.player.vehicle) {
      state.camera.aiming = true;
      requestPointerLockSafe();
    }
    return;
  }
  if (e.button !== 0) return;

  if (state.nightlife.session) {
    boostNightlifeRhythm(state);
    return;
  }

  if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
    handleNightlifeMenuClick(state, mx, my);
    return;
  }

  if (state.shopModal.open) {
    handleShopDrawerClick(state, mx, my);
    return;
  }

  if (state.safehouseModalOpen) {
    if (mx >= 652 && mx <= 844 && my >= 610 && my <= 646) {
      if (saveCareerToStorage(state)) {
        state.hasSavedCareer = true;
      }
    } else if (mx >= 854 && mx <= 1040 && my >= 610 && my <= 646) {
      resetToNewGame(true);
    } else if (mx >= 1050 && mx <= 1234 && my >= 610 && my <= 646) {
      state.safehouseModalOpen = false;
    }
    return;
  }

  requestPointerLockSafe();
  state.input.mouseDown = true;
  firePlayerWeapon(state);
});

window.addEventListener('mouseup', (e) => {
  const rect = webglCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / (rect.width || 1280)) * 1280;
  const my = ((e.clientY - rect.top) / (rect.height || 720)) * 720;

  if (state.paused) {
    handlePauseHubMouseUp(state, mx, my, e.button, pauseHubActions);
    return;
  }

  if (e.button === 2) {
    state.camera.aiming = false;
  } else if (e.button === 0) {
    state.input.mouseDown = false;
  }
});

webglCanvas.addEventListener(
  'wheel',
  (e) => {
    if (state.paused) {
      const rect = webglCanvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / (rect.width || 1280)) * 1280;
      const my = ((e.clientY - rect.top) / (rect.height || 720)) * 720;
      handlePauseHubWheel(state, mx, my, e.deltaY);
      return;
    }
    if (isAnyModalOpen(state) || state.player.vehicle) return;
    if (Math.abs(e.deltaY) < 2) return;
    const step = e.deltaY > 0 ? 1 : WEAPONS.length - 1;
    switchPlayerWeapon(state, state.player.weaponIndex + step);
  },
  { passive: true }
);

let lastTime = performance.now();
let lowFpsAccum = 0;

function frame(now) {
  const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  // Rolling FPS tracking & optional Auto-Quality step-down (disabled during headless QA / showcase)
  const instFps = 1 / Math.max(0.004, rawDt);
  state.liveFps = state.liveFps * 0.9 + instFps * 0.1;
  const isHeadlessQa = typeof navigator !== 'undefined' && navigator.webdriver === true;
  if (
    !activeShot &&
    !isHeadlessQa &&
    !state.paused &&
    !state.startScreenOpen &&
    state.settings &&
    state.settings.autoQuality
  ) {
    if (state.liveFps < 28) {
      lowFpsAccum += rawDt;
      if (lowFpsAccum > 2.5) {
        lowFpsAccum = 0;
        if (state.settings.quality === 'HIGH') {
          state.settings.quality = 'MEDIUM';
          saveSettingsToStorage(state.settings);
          applyRuntimeSettings(state, worldRenderer);
          state.hudBanner = {
            title: 'AUTO-FPS: QUALITY SET TO MEDIUM',
            subtitle: 'KEEPING SMOOTH FRAME PACING • ADJUST IN SETTINGS [P]',
            color: '#64bcc9',
            timer: 2.4
          };
        } else if (state.settings.quality === 'MEDIUM') {
          state.settings.quality = 'LOW';
          saveSettingsToStorage(state.settings);
          applyRuntimeSettings(state, worldRenderer);
          state.hudBanner = {
            title: 'AUTO-FPS: QUALITY SET TO LOW',
            subtitle: 'OPTIMIZED DRAW CULLING • ADJUST IN SETTINGS [P]',
            color: '#64bcc9',
            timer: 2.4
          };
        }
      }
    } else {
      lowFpsAccum = 0;
    }
  }

  const simDt = state.outcome ? rawDt * 0.22 : rawDt;

  if (!activeShot) {
    if (!state.paused) {
      state.time += simDt;

      if (state.startScreenOpen) {
        updateVehicles(state, simDt);
        updatePedestrians(state, simDt);
      } else {
        // Advance 24h Day/Night clock (1 in-game hour = 60s real-time) during live gameplay
        if (!state.outcome) {
          state.worldTime = (state.worldTime + simDt / 60) % 24;
        }

        if (state.player.vehicle && !isAnyModalOpen(state)) {
          state.camera.aiming = false;
          state.camera.orbitIdleTimer = Math.max(0, (state.camera.orbitIdleTimer || 0) - rawDt);
          if (state.camera.orbitIdleTimer <= 0 && state.player.vehicle.speed > 18) {
            state.camera.yaw = lerpAngle(state.camera.yaw, state.player.vehicle.angle, 4.0 * rawDt);
            state.camera.pitch += (-0.08 - state.camera.pitch) * Math.min(1, 3.5 * rawDt);
          }
        }

        if (state.input.jumpBuffer > 0) {
          state.input.jumpBuffer = Math.max(0, state.input.jumpBuffer - simDt);
        }

        updateVehicles(state, simDt);
        updatePlayerOnFoot(state, simDt);
        updatePedestrians(state, simDt);
        updatePoliceSystem(state, simDt);
        updateCombatAndProjectiles(state, simDt);
        updateMissionSystem(state, simDt);
        updateShopSystem(state, simDt);
        updateNightlifeSystem(state, simDt);
        updatePlayerOutcome(state, rawDt);
        state.audio.update(state, simDt);

        if (state.hudBanner && state.hudBanner.timer > 0) {
          state.hudBanner.timer = Math.max(0, state.hudBanner.timer - rawDt);
        }
      }
    }
  } else {
    state.time = 1.25;
  }

  worldRenderer.render(state.paused ? 0 : simDt);
  renderHud2D(hudCtx, state);

  requestAnimationFrame(frame);
}

// Render initial synchronous frame immediately for deterministic screenshot capture
worldRenderer.render(0.016);
renderHud2D(hudCtx, state);
if (typeof window !== 'undefined') {
  window.__SOLARIS_STATE = state;
  window.__SOLARIS_RENDERER = worldRenderer;
  window.__SOLARIS_ACTIONS = {
    startNewGame: () => resetToNewGame(true),
    continueCareer: () => continueSavedCareer(),
    sleepToHour: (hour) => sleepToHour(state, hour)
  };
}
requestAnimationFrame(frame);
