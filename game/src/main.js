import { WEAPONS, RADIO_STATIONS } from './config.js';
import { createCityMap } from './city-map.js';
import { spawnInitialVehicles, updateVehicles, tryToggleVehicle } from './vehicles.js';
import { spawnInitialPedestrians, updatePedestrians } from './pedestrians.js';
import { createWantedState, updatePoliceSystem } from './police-wanted.js';
import { createMissionState, startMissionByIndex, updateMissionSystem } from './missions-story.js';
import { updatePlayerOnFoot, updateCombatAndProjectiles, firePlayerWeapon } from './combat-weapons.js';
import { createAudioController, saveCareerToStorage, loadCareerFromStorage } from './audio-save.js';
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
import { renderHud2D } from './render-hud.js';
import { applyShowcaseShotIfRequested } from './showcase-shots.js';

const webglCanvas = document.getElementById('webgl-canvas');
const hudCanvas = document.getElementById('hud-canvas');
const hudCtx = hudCanvas.getContext('2d');

const cityMap = createCityMap();
const initialVehicles = spawnInitialVehicles(cityMap);

const state = {
  time: 0,
  cityMap,
  player: {
    x: initialVehicles[0].x,
    y: initialVehicles[0].y,
    z: 0,
    vx: 0,
    vy: 0,
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
    dashCooldown: 0
  },
  input: {
    keys: {},
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mouseActive: false,
    aimAngle: -Math.PI * 0.5
  },
  camera: {
    trauma: 0,
    overridePose: null,
    nightlifePose: null,
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
  projectedMarkers: null,
  hudBanner: null,
  safehouseModalOpen: false,
  payNsprayCooldown: 0,
  lastSaveStatus: 'LOCALSTORAGE PERSISTENCE READY',
  audio: createAudioController()
};

applyPlayerOutfit(state.player, 'default_coral');
initialVehicles[0].driver = 'player';
startMissionByIndex(state, 0);
loadCareerFromStorage(state);

const activeShot = applyShowcaseShotIfRequested(state);

const worldRenderer = createWorldRenderer3D(webglCanvas, state);

// Input Listeners
window.addEventListener('keydown', (e) => {
  state.input.keys[e.code] = true;
  state.audio.ensureContext();

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
    if (state.safehouseModalOpen) state.input.mouseDown = false;
    return;
  }

  if (e.code === 'KeyK') {
    saveCareerToStorage(state);
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
    tryToggleVehicle(state);
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

webglCanvas.addEventListener('mousemove', (e) => {
  const rect = webglCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * 1280;
  const my = ((e.clientY - rect.top) / rect.height) * 720;
  state.input.mouseX = mx;
  state.input.mouseY = my;

  if (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen) {
    updateNightlifeMenuHover(state, mx, my);
    return;
  }
  if (state.shopModal.open) {
    updateShopDrawerHover(state, mx, my);
    return;
  }
  if (state.safehouseModalOpen || state.nightlife.session) return;

  state.input.mouseActive = true;
  const dx = mx - 640;
  const dy = my - 420;
  const heading = state.player.vehicle ? state.player.vehicle.angle : state.player.angle;
  state.input.aimAngle = heading + Math.atan2(dx, -dy) * 0.65;
});

webglCanvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  state.audio.ensureContext();

  const rect = webglCanvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * 1280;
  const my = ((e.clientY - rect.top) / rect.height) * 720;

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
    if (mx >= 652 && mx <= 932 && my >= 610 && my <= 646) {
      saveCareerToStorage(state);
    } else if (mx >= 952 && mx <= 1234 && my >= 610 && my <= 646) {
      state.safehouseModalOpen = false;
    }
    return;
  }

  state.input.mouseDown = true;
  firePlayerWeapon(state);
});

window.addEventListener('mouseup', () => {
  state.input.mouseDown = false;
});

let lastTime = performance.now();

function frame(now) {
  const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  if (!activeShot) {
    state.time += rawDt;
    updateVehicles(state, rawDt);
    updatePlayerOnFoot(state, rawDt);
    updatePedestrians(state, rawDt);
    updatePoliceSystem(state, rawDt);
    updateCombatAndProjectiles(state, rawDt);
    updateMissionSystem(state, rawDt);
    updateShopSystem(state, rawDt);
    updateNightlifeSystem(state, rawDt);
    state.audio.updateRadio(state, rawDt);

    if (state.hudBanner && state.hudBanner.timer > 0) {
      state.hudBanner.timer = Math.max(0, state.hudBanner.timer - rawDt);
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
}
requestAnimationFrame(frame);
