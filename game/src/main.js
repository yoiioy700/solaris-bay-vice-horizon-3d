import { WEAPONS, RADIO_STATIONS, PLAYER_PHYSICS } from './config.js';
import { createCityMap } from './city-map.js';
import { spawnInitialVehicles, updateVehicles, tryToggleVehicle } from './vehicles.js';
import { spawnInitialPedestrians, updatePedestrians } from './pedestrians.js';
import { createWantedState, updatePoliceSystem } from './police-wanted.js';
import { createMissionState, startMissionByIndex, updateMissionSystem } from './missions-story.js';
import {
  updatePlayerOnFoot,
  updateCombatAndProjectiles,
  firePlayerWeapon,
  computeAimRay
} from './combat-weapons.js';
import {
  createAudioController,
  saveCareerToStorage,
  loadCareerFromStorage,
  hasSavedCareer,
  clearCareerStorage
} from './audio-save.js';
import {
  createInitialWeaponAmmo,
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
      (st.shopModal && st.shopModal.open) ||
      st.safehouseModalOpen ||
      (st.nightlife &&
        (st.nightlife.vipMenuOpen || st.nightlife.carMenuOpen || st.nightlife.session))
  );
}

const state = {
  time: 0,
  startScreenOpen: true,
  startScreenHover: null,
  hasSavedCareer: hasSavedCareer(),
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

function resetToNewGame(clearSave = true) {
  if (clearSave) {
    clearCareerStorage();
    state.hasSavedCareer = false;
  }

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
  if (state.player.vehicle) {
    state.audio.onVehicleEnter(state.player.vehicle);
  }
}

function continueSavedCareer() {
  if (!hasSavedCareer()) return false;
  loadCareerFromStorage(state);
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
  if (state.player.vehicle) {
    state.audio.onVehicleEnter(state.player.vehicle);
  }
  return true;
}

applyPlayerOutfit(state.player, 'default_coral');
initialVehicles[0].driver = 'player';
startMissionByIndex(state, 0);

const activeShot = applyShowcaseShotIfRequested(state);
if (activeShot) {
  state.startScreenOpen = false;
  loadCareerFromStorage(state);
  // Re-apply requested shot after load so showcase state is deterministic
  applyShowcaseShotIfRequested(state);
  state.audio.stats.engineRunning = Boolean(state.player.vehicle);
} else {
  state.startScreenOpen = true;
  state.audio.stats.engineRunning = false;
}

const worldRenderer = createWorldRenderer3D(webglCanvas, state);
if (!activeShot) {
  computeAimRay(state);
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('pointer-locked', document.pointerLockElement === webglCanvas);
  });
}

// Input Listeners
window.addEventListener('blur', () => {
  state.input.keys = {};
  state.input.mouseDown = false;
  state.camera.aiming = false;
});

window.addEventListener('keydown', (e) => {
  state.input.keys[e.code] = true;
  state.audio.ensureContext();

  // Start / Title Screen keyboard shortcuts ([Enter] New Game, [C] Continue Career)
  if (state.startScreenOpen) {
    if (e.code === 'Enter') {
      e.preventDefault();
      resetToNewGame(true);
    } else if (e.code === 'KeyC' && hasSavedCareer()) {
      e.preventDefault();
      continueSavedCareer();
    }
    return;
  }

  // Active VIP Suite or Car Sex session controls ([SPACE] rhythm boost, [ESC] finish early)
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
    }
    state.camera.aiming = false;
    exitPointerLockSafe();
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

  if (e.code === 'Tab' || e.code === 'KeyM') {
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

  // While VIP / Car Service menu is open, Digit1..Digit2 trigger service options cleanly
  if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
    if (e.code.startsWith('Digit')) {
      const num = Number(e.code.replace('Digit', ''));
      if (num >= 1 && num <= 2) {
        startNightlifeOption(state, num - 1);
      }
    }
    return;
  }

  // While Shop Overlay Drawer is open, Digit1..Digit5 purchase shop items instead of switching weapons
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
  } else if (e.code === 'KeyR') {
    state.player.radioIndex = (state.player.radioIndex + 1) % RADIO_STATIONS.length;
  } else if (e.code === 'KeyQ') {
    state.player.weaponIndex =
      (state.player.weaponIndex + WEAPONS.length - 1) % WEAPONS.length;
  } else if (e.code.startsWith('Digit')) {
    const num = Number(e.code.replace('Digit', ''));
    if (num >= 1 && num <= WEAPONS.length) {
      state.player.weaponIndex = num - 1;
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
    const { newGameRect, continueRect } = getStartScreenLayout();
    if (
      mx >= newGameRect.x &&
      mx <= newGameRect.x + newGameRect.w &&
      my >= newGameRect.y &&
      my <= newGameRect.y + newGameRect.h
    ) {
      state.startScreenHover = 'new';
    } else if (
      mx >= continueRect.x &&
      mx <= continueRect.x + continueRect.w &&
      my >= continueRect.y &&
      my <= continueRect.y + continueRect.h
    ) {
      state.startScreenHover = 'continue';
    } else {
      state.startScreenHover = null;
    }
    return;
  }

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
    const sens = state.camera.aiming ? 0.0018 : 0.0026;
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
    const { newGameRect, continueRect } = getStartScreenLayout();
    if (
      mx >= newGameRect.x &&
      mx <= newGameRect.x + newGameRect.w &&
      my >= newGameRect.y &&
      my <= newGameRect.y + newGameRect.h
    ) {
      resetToNewGame(true);
    } else if (
      mx >= continueRect.x &&
      mx <= continueRect.x + continueRect.w &&
      my >= continueRect.y &&
      my <= continueRect.y + continueRect.h &&
      hasSavedCareer()
    ) {
      continueSavedCareer();
    }
    return;
  }

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
  if (e.button === 2) {
    state.camera.aiming = false;
  } else if (e.button === 0) {
    state.input.mouseDown = false;
  }
});

webglCanvas.addEventListener(
  'wheel',
  (e) => {
    if (isAnyModalOpen(state) || state.player.vehicle) return;
    if (Math.abs(e.deltaY) < 2) return;
    const step = e.deltaY > 0 ? 1 : WEAPONS.length - 1;
    state.player.weaponIndex = (state.player.weaponIndex + step) % WEAPONS.length;
  },
  { passive: true }
);

let lastTime = performance.now();

function frame(now) {
  const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  if (!activeShot) {
    state.time += rawDt;

    if (state.startScreenOpen) {
      updateVehicles(state, rawDt);
      updatePedestrians(state, rawDt);
    } else {
      if (state.player.vehicle && !isAnyModalOpen(state)) {
        state.camera.aiming = false;
        state.camera.orbitIdleTimer = Math.max(0, (state.camera.orbitIdleTimer || 0) - rawDt);
        if (state.camera.orbitIdleTimer <= 0 && state.player.vehicle.speed > 18) {
          state.camera.yaw = lerpAngle(state.camera.yaw, state.player.vehicle.angle, 4.0 * rawDt);
          state.camera.pitch += (-0.08 - state.camera.pitch) * Math.min(1, 3.5 * rawDt);
        }
      }

      if (state.input.jumpBuffer > 0) {
        state.input.jumpBuffer = Math.max(0, state.input.jumpBuffer - rawDt);
      }

      updateVehicles(state, rawDt);
      updatePlayerOnFoot(state, rawDt);
      updatePedestrians(state, rawDt);
      updatePoliceSystem(state, rawDt);
      updateCombatAndProjectiles(state, rawDt);
      updateMissionSystem(state, rawDt);
      updateShopSystem(state, rawDt);
      updateNightlifeSystem(state, rawDt);
      state.audio.update(state, rawDt);

      if (state.hudBanner && state.hudBanner.timer > 0) {
        state.hudBanner.timer = Math.max(0, state.hudBanner.timer - rawDt);
      }
    }
  } else {
    state.time = 1.25;
  }

  worldRenderer.render(rawDt);
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
    continueCareer: () => continueSavedCareer()
  };
}
requestAnimationFrame(frame);
