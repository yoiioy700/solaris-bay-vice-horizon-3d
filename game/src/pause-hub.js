import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COAST_X,
  BEACH_WIDTH,
  ISLAND_X1,
  ISLAND_X2,
  ISLAND_Y1,
  ISLAND_Y2,
  CAUSEWAY_YS,
  LANDMARKS,
  RADIO_STATIONS,
  getWorldClockInfo
} from './config.js';
import { getDistrictAt } from './city-map.js';
import { STORY_MISSIONS, updateMissionGpsRoute } from './missions-story.js';
import { SHOP_RADAR_COLORS } from './shops-economy.js';
import { CLUB_ECLIPSE_BOUNDS } from './nightlife-romance.js';
import {
  DEFAULT_SETTINGS,
  saveSettingsToStorage,
  applyRuntimeSettings,
  listSaveSlots,
  saveCareerToSlot,
  loadCareerFromSlot,
  clearCareerSlot,
  sleepToHour
} from './audio-save.js';
import { ensureCareerStats } from './player-vitals.js';

export const PAUSE_TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];

const GLASS_BG = 'rgba(12, 17, 25, 0.86)';
const GLASS_PANEL = 'rgba(20, 28, 40, 0.78)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.15)';
const ACCENT_GOLD = '#e0b268';
const ACCENT_CYAN = '#64bcc9';
const ACCENT_EMERALD = '#63c792';
const ACCENT_ALERT = '#d95b66';
const ACCENT_VIOLET = '#c988b8';
const TEXT_PRIMARY = '#edf1f5';
const TEXT_MUTED = '#9aa8b8';

const CAST_CODEX = [
  {
    name: 'RICO VANCE',
    role: 'PROTAGONIST • SOLARIS SYNDICATE',
    accent: ACCENT_GOLD,
    bio: 'Former coastal wheelman carving out territory from Ocean Drive to Starfish Island.'
  },
  {
    name: 'NADIA SOLIS',
    role: 'BROKER & VIP FIXER',
    accent: ACCENT_CYAN,
    bio: 'Coordinates high-stakes contracts, marina laundering, and Club Eclipse backroom intel.'
  },
  {
    name: 'VICTOR REYES',
    role: 'REYES SYNDICATE BOSS',
    accent: ACCENT_ALERT,
    bio: 'Controls Port Solaris armored bullion convoys and Palm Casino security details.'
  },
  {
    name: 'CAPT. MORALES',
    role: 'VCPD TACTICAL COMMAND',
    accent: '#6fa4d8',
    bio: 'Directs VCPD Interceptors, 3★ roadblocks, SWAT Bearcats, and Air-One searchlight choppers.'
  },
  {
    name: 'CLUB ECLIPSE',
    role: '21+ NIGHTLIFE QUARTER',
    accent: ACCENT_VIOLET,
    bio: 'Open-air 124 BPM disco pavilion, cocktail bar, velvet VIP suites, and Neon Strip hustle.'
  }
];

const SOLARIS_CREW = [
  {
    name: 'ELENA VEGA',
    role: 'WHEELWOMAN • HEAT EVASION',
    accent: ACCENT_GOLD,
    specialty: 'Getaway Routing & Line-of-Sight Breaks',
    bio: 'Veteran Ocean Drive midnight runner who knows every causeway bottleneck, blind alley, and harbor shortcut across Solaris Bay.',
    perkName: 'GHOST PURSUIT LINE',
    perkDesc: '-25% VCPD Evade Timer & Enhanced Cornering Grip',
    status: 'READY IN STAGE 7B'
  },
  {
    name: 'MARCUS COLE',
    role: 'PIT MECHANIC • FAST REPAIR',
    accent: ACCENT_EMERALD,
    specialty: 'Turbo Tuning & Chassis Reinforcement',
    bio: 'Master fabricator behind Solaris Customs Pay-N-Spray bays; tunes supercharged V8 blocks and reinforces frame armor under heavy fire.',
    perkName: 'REINFORCED FRAME',
    perkDesc: '+30% Vehicle Durability & Field Engine Stabilization',
    status: 'READY IN STAGE 7B'
  },
  {
    name: 'DEVON CRUZ',
    role: 'TECH RECON • POLICE SCANNER',
    accent: ACCENT_CYAN,
    specialty: 'Encrypted VCPD Comms & Radar Sweeps',
    bio: 'Ex-dispatch signal analyst who intercepts VCPD cruiser telemetry, widens radar sight-cone sweeps, and flags roadblocks early.',
    perkName: 'GRID INTERCEPTOR',
    perkDesc: '+40% Radar Cone Telemetry & Roadblock Pre-Warning',
    status: 'READY IN STAGE 7B'
  }
];

export function createPauseHubState() {
  return {
    zoom: 1.0,
    panX: 2050,
    panY: 1850,
    dragging: false,
    dragMoved: false,
    dragStartX: 0,
    dragStartY: 0,
    startPanX: 0,
    startPanY: 0,
    activeSlider: null,
    hoverId: null
  };
}

function drawGlassBox(ctx, x, y, w, h, cut = 8, fill = GLASS_BG, border = GLASS_BORDER) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

export function getPauseHubLayout() {
  const x = 84;
  const y = 46;
  const w = 1112;
  const h = 628;
  const tabY = 98;
  const tabH = 34;
  const tabW = 148;
  const tabGap = 6;
  const tabStartX = 104;
  const tabs = PAUSE_TABS.map((id, i) => ({
    id,
    x: tabStartX + i * (tabW + tabGap),
    y: tabY,
    w: tabW,
    h: tabH
  }));

  const content = { x: 104, y: 146, w: 1072, h: 506 };
  const mapRect = { x: 104, y: 146, w: 816, h: 506 };
  const legendRect = { x: 934, y: 146, w: 242, h: 506 };

  return {
    x,
    y,
    w,
    h,
    closeRect: { id: 'close_hub', x: x + w - 186, y: y + 14, w: 166, h: 30 },
    tabs,
    content,
    mapRect,
    legendRect,
    clearWaypointRect: { id: 'clear_waypoint', x: legendRect.x + 14, y: legendRect.y + 422, w: 214, h: 32 },
    centerMapRect: { id: 'center_map', x: legendRect.x + 14, y: legendRect.y + 462, w: 214, h: 32 }
  };
}

function getMapTransform(state, mapRect) {
  const pm = state.pauseMap || createPauseHubState();
  const baseScale = Math.min(mapRect.w / 4250, mapRect.h / WORLD_HEIGHT);
  const scale = baseScale * (pm.zoom || 1.0);
  const cx = mapRect.x + mapRect.w * 0.5;
  const cy = mapRect.y + mapRect.h * 0.5;
  return {
    scale,
    toScreenX: (wx) => cx + (wx - pm.panX) * scale,
    toScreenY: (wy) => cy + (wy - pm.panY) * scale,
    toWorldX: (sx) => pm.panX + (sx - cx) / scale,
    toWorldY: (sy) => pm.panY + (sy - cy) / scale
  };
}

function getSettingsControlsLayout(content) {
  const leftX = content.x + 16;
  const rowW = 620;
  const sliderTrackX = leftX + 220;
  const sliderTrackW = 310;
  const sliders = [
    { id: 'musicVolume', label: 'MUSIC & RADIO VOLUME', min: 0, max: 1, y: content.y + 52, fmt: (v) => `${Math.round(v * 100)}%` },
    { id: 'sfxVolume', label: 'SFX & ENGINE VOLUME', min: 0, max: 1, y: content.y + 114, fmt: (v) => `${Math.round(v * 100)}%` },
    { id: 'mouseSensitivity', label: 'MOUSE AIM SENSITIVITY', min: 0.3, max: 2.0, y: content.y + 176, fmt: (v) => `${v.toFixed(2)}x` }
  ].map((s) => ({
    ...s,
    rowRect: { x: leftX, y: s.y - 18, w: rowW, h: 48 },
    trackRect: { x: sliderTrackX, y: s.y + 2, w: sliderTrackW, h: 12 }
  }));

  const qualityButtons = ['HIGH', 'MEDIUM', 'LOW'].map((q, idx) => ({
    id: `quality_${q}`,
    val: q,
    x: sliderTrackX + idx * 106,
    y: content.y + 232,
    w: 98,
    h: 32
  }));

  const toggles = [
    { id: 'autoQuality', label: 'AUTO-FPS MONITOR (<28 FPS)', y: content.y + 292 },
    { id: 'shadows', label: 'SUN & VEHICLE SHADOWS', y: content.y + 346 },
    { id: 'hudDensity', label: 'HUD DENSITY MODE', y: content.y + 400 }
  ].map((t) => ({
    ...t,
    btnRect: { id: t.id, x: sliderTrackX, y: t.y - 6, w: 196, h: 32 }
  }));

  const rightX = leftX + rowW + 24;
  const rightW = content.w - rowW - 56;
  return {
    sliders,
    qualityButtons,
    toggles,
    muteRect: { id: 'mute_audio', x: rightX, y: content.y + 56, w: rightW, h: 42 },
    resetSettingsRect: { id: 'reset_settings', x: rightX, y: content.y + 112, w: rightW, h: 42 }
  };
}

function getSaveTabLayout(content) {
  const slotCards = [1, 2, 3].map((slot, idx) => {
    const sy = content.y + 24 + idx * 102;
    return {
      slot,
      x: content.x + 12,
      y: sy,
      w: content.w - 24,
      h: 90,
      saveRect: { id: `save_slot_${slot}`, slot, x: content.x + 656, y: sy + 24, w: 122, h: 38 },
      loadRect: { id: `load_slot_${slot}`, slot, x: content.x + 788, y: sy + 24, w: 122, h: 38 },
      clearRect: { id: `clear_slot_${slot}`, slot, x: content.x + 920, y: sy + 24, w: 112, h: 38 }
    };
  });

  const sleepY = content.y + 344;
  const sleepButtons = [
    { id: 'sleep_dawn', hour: 8.0, label: 'SLEEP: 08:00 DAWN', x: content.x + 12, y: sleepY, w: 334, h: 44 },
    { id: 'sleep_golden', hour: 17.25, label: 'SLEEP: 17:15 GOLDEN HOUR', x: content.x + 362, y: sleepY, w: 348, h: 44 },
    { id: 'sleep_night', hour: 21.0, label: 'SLEEP: 21:00 NIGHT PATROL', x: content.x + 726, y: sleepY, w: 334, h: 44 }
  ];

  const actionY = content.y + 422;
  const actionButtons = [
    { id: 'new_game', label: '[N] NEW GAME', x: content.x + 12, y: actionY, w: 334, h: 46, accent: ACCENT_GOLD },
    { id: 'title_screen', label: '[T] TITLE SCREEN', x: content.x + 362, y: actionY, w: 348, h: 46, accent: TEXT_MUTED },
    { id: 'resume_game', label: '[P / ESC] RESUME GAME', x: content.x + 726, y: actionY, w: 334, h: 46, accent: ACCENT_EMERALD }
  ];

  return { slotCards, sleepButtons, actionButtons };
}

export function cyclePauseTab(state, delta) {
  const cur = PAUSE_TABS.indexOf(state.pauseTab || 'MAP');
  const next = ((cur < 0 ? 0 : cur) + delta + PAUSE_TABS.length) % PAUSE_TABS.length;
  state.pauseTab = PAUSE_TABS[next];
  return state.pauseTab;
}

export function handlePauseHubKeyDown(e, state, actions) {
  if (!state.paused) return false;

  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    actions.closeHub();
    return true;
  }
  if (e.code === 'KeyM') {
    e.preventDefault();
    if (state.pauseTab === 'MAP' && !state.pauseOpenedFromTitle) {
      actions.closeHub();
    } else {
      state.pauseTab = 'MAP';
      if (state.pauseMap) {
        state.pauseMap.panX = state.player.x;
        state.pauseMap.panY = state.player.y;
      }
    }
    return true;
  }
  if (e.code === 'KeyQ' || e.code === 'ArrowLeft') {
    e.preventDefault();
    cyclePauseTab(state, -1);
    return true;
  }
  if (e.code === 'KeyE' || e.code === 'ArrowRight') {
    e.preventDefault();
    cyclePauseTab(state, 1);
    return true;
  }
  if (e.code === 'KeyU') {
    if (state.audio && state.audio.toggleMute) state.audio.toggleMute();
    return true;
  }
  if (e.code === 'KeyK') {
    if (!state.pauseOpenedFromTitle && saveCareerToSlot(state, 1)) {
      state.hasSavedCareer = true;
    }
    return true;
  }
  if (e.code === 'KeyN') {
    actions.startNewGame();
    return true;
  }
  if (e.code === 'KeyT') {
    actions.returnToTitle();
    return true;
  }
  return false;
}

function applySliderAt(state, slider, mx, actions) {
  const t = Math.max(0, Math.min(1, (mx - slider.trackRect.x) / slider.trackRect.w));
  const val = slider.min + t * (slider.max - slider.min);
  state.settings[slider.id] = Number(val.toFixed(2));
  saveSettingsToStorage(state.settings);
  applyRuntimeSettings(state, actions.worldRenderer);
}

export function handlePauseHubMouseMove(state, mx, my, actions) {
  if (!state.paused) return false;
  const layout = getPauseHubLayout();
  const pm = state.pauseMap || (state.pauseMap = createPauseHubState());

  if (state.pauseTab === 'MAP' && pm.dragging) {
    const dx = mx - pm.dragStartX;
    const dy = my - pm.dragStartY;
    if (Math.hypot(dx, dy) > 5) pm.dragMoved = true;
    const tr = getMapTransform(state, layout.mapRect);
    pm.panX = Math.max(200, Math.min(4100, pm.startPanX - dx / tr.scale));
    pm.panY = Math.max(200, Math.min(WORLD_HEIGHT - 200, pm.startPanY - dy / tr.scale));
    return true;
  }

  if (state.pauseTab === 'SETTINGS' && pm.activeSlider) {
    const sc = getSettingsControlsLayout(layout.content);
    const slider = sc.sliders.find((s) => s.id === pm.activeSlider);
    if (slider) {
      applySliderAt(state, slider, mx, actions);
      return true;
    }
  }

  let hovered = null;
  const hit = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  if (hit(layout.closeRect)) hovered = layout.closeRect.id;
  for (const t of layout.tabs) {
    if (hit(t)) hovered = `tab_${t.id}`;
  }
  if (state.pauseTab === 'MAP') {
    if (hit(layout.clearWaypointRect)) hovered = 'clear_waypoint';
    if (hit(layout.centerMapRect)) hovered = 'center_map';
  } else if (state.pauseTab === 'SETTINGS') {
    const sc = getSettingsControlsLayout(layout.content);
    for (const q of sc.qualityButtons) if (hit(q)) hovered = q.id;
    for (const tg of sc.toggles) if (hit(tg.btnRect)) hovered = tg.btnRect.id;
    if (hit(sc.muteRect)) hovered = sc.muteRect.id;
    if (hit(sc.resetSettingsRect)) hovered = sc.resetSettingsRect.id;
  } else if (state.pauseTab === 'SAVE') {
    const sv = getSaveTabLayout(layout.content);
    for (const card of sv.slotCards) {
      if (hit(card.saveRect)) hovered = card.saveRect.id;
      if (hit(card.loadRect)) hovered = card.loadRect.id;
      if (hit(card.clearRect)) hovered = card.clearRect.id;
    }
    for (const sb of sv.sleepButtons) if (hit(sb)) hovered = sb.id;
    for (const ab of sv.actionButtons) if (hit(ab)) hovered = ab.id;
  }
  pm.hoverId = hovered;
  state.pauseHover = hovered;
  return true;
}

export function handlePauseHubMouseDown(state, mx, my, button, actions) {
  if (!state.paused) return false;
  const layout = getPauseHubLayout();
  const pm = state.pauseMap || (state.pauseMap = createPauseHubState());
  const hit = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

  // Right-click inside Map clears custom waypoint cleanly
  if (button === 2 && state.pauseTab === 'MAP' && hit(layout.mapRect)) {
    state.customWaypoint = null;
    updateMissionGpsRoute(state);
    return true;
  }
  if (button !== 0) return true;

  if (hit(layout.closeRect)) {
    actions.closeHub();
    return true;
  }

  for (const t of layout.tabs) {
    if (hit(t)) {
      state.pauseTab = t.id;
      return true;
    }
  }

  if (state.pauseTab === 'MAP') {
    if (hit(layout.clearWaypointRect)) {
      state.customWaypoint = null;
      updateMissionGpsRoute(state);
      return true;
    }
    if (hit(layout.centerMapRect)) {
      pm.panX = state.player.x;
      pm.panY = state.player.y;
      return true;
    }
    if (hit(layout.mapRect)) {
      pm.dragging = true;
      pm.dragMoved = false;
      pm.dragStartX = mx;
      pm.dragStartY = my;
      pm.startPanX = pm.panX;
      pm.startPanY = pm.panY;
      return true;
    }
  } else if (state.pauseTab === 'SETTINGS') {
    const sc = getSettingsControlsLayout(layout.content);
    for (const s of sc.sliders) {
      if (hit(s.rowRect) || hit(s.trackRect)) {
        pm.activeSlider = s.id;
        applySliderAt(state, s, mx, actions);
        return true;
      }
    }
    for (const q of sc.qualityButtons) {
      if (hit(q)) {
        state.settings.quality = q.val;
        saveSettingsToStorage(state.settings);
        applyRuntimeSettings(state, actions.worldRenderer);
        return true;
      }
    }
    for (const tg of sc.toggles) {
      if (hit(tg.btnRect)) {
        if (tg.id === 'autoQuality') state.settings.autoQuality = !state.settings.autoQuality;
        else if (tg.id === 'shadows') state.settings.shadows = !state.settings.shadows;
        else if (tg.id === 'hudDensity') {
          state.settings.hudDensity = state.settings.hudDensity === 'FULL' ? 'COMPACT' : 'FULL';
        }
        saveSettingsToStorage(state.settings);
        applyRuntimeSettings(state, actions.worldRenderer);
        return true;
      }
    }
    if (hit(sc.muteRect)) {
      if (state.audio && state.audio.toggleMute) state.audio.toggleMute();
      return true;
    }
    if (hit(sc.resetSettingsRect)) {
      state.settings = { ...DEFAULT_SETTINGS };
      saveSettingsToStorage(state.settings);
      applyRuntimeSettings(state, actions.worldRenderer);
      return true;
    }
  } else if (state.pauseTab === 'SAVE') {
    const sv = getSaveTabLayout(layout.content);
    for (const card of sv.slotCards) {
      if (hit(card.saveRect)) {
        if (!state.pauseOpenedFromTitle) {
          saveCareerToSlot(state, card.slot);
        }
        return true;
      }
      if (hit(card.loadRect)) {
        if (loadCareerFromSlot(state, card.slot)) {
          state.pauseOpenedFromTitle = false;
          state.startScreenOpen = false;
          actions.closeHub();
        }
        return true;
      }
      if (hit(card.clearRect)) {
        clearCareerSlot(card.slot);
        state.hasSavedCareer = listSaveSlots().some(Boolean);
        return true;
      }
    }
    for (const sb of sv.sleepButtons) {
      if (hit(sb)) {
        if (!state.pauseOpenedFromTitle) {
          sleepToHour(state, sb.hour);
        }
        return true;
      }
    }
    for (const ab of sv.actionButtons) {
      if (hit(ab)) {
        if (ab.id === 'new_game') actions.startNewGame();
        else if (ab.id === 'title_screen') actions.returnToTitle();
        else if (ab.id === 'resume_game') actions.closeHub();
        return true;
      }
    }
  }

  return true;
}

export function handlePauseHubMouseUp(state, mx, my, button) {
  if (!state.paused) return false;
  const pm = state.pauseMap;
  if (!pm) return true;
  if (button === 0) {
    if (state.pauseTab === 'MAP' && pm.dragging && !pm.dragMoved) {
      const layout = getPauseHubLayout();
      const mr = layout.mapRect;
      if (mx >= mr.x && mx <= mr.x + mr.w && my >= mr.y && my <= mr.y + mr.h) {
        const tr = getMapTransform(state, mr);
        const wx = Math.max(80, Math.min(4100, Math.round(tr.toWorldX(mx))));
        const wy = Math.max(80, Math.min(WORLD_HEIGHT - 80, Math.round(tr.toWorldY(my))));
        state.customWaypoint = { x: wx, y: wy };
        updateMissionGpsRoute(state);
      }
    }
    pm.dragging = false;
    pm.dragMoved = false;
    pm.activeSlider = null;
  }
  return true;
}

export function handlePauseHubWheel(state, mx, my, deltaY) {
  if (!state.paused || state.pauseTab !== 'MAP') return false;
  const layout = getPauseHubLayout();
  const mr = layout.mapRect;
  if (mx < mr.x || mx > mr.x + mr.w || my < mr.y || my > mr.y + mr.h) return false;
  const pm = state.pauseMap || (state.pauseMap = createPauseHubState());
  const factor = deltaY < 0 ? 1.16 : 0.86;
  pm.zoom = Math.max(0.8, Math.min(3.2, Number(((pm.zoom || 1.0) * factor).toFixed(3))));
  return true;
}

function renderMapTab(ctx, state, layout) {
  const { mapRect, legendRect, clearWaypointRect, centerMapRect } = layout;
  const { cityMap, player, vehicles, wanted, missions } = state;
  const pm = state.pauseMap || createPauseHubState();
  const tr = getMapTransform(state, mapRect);

  // 1. Clipped Interactive Map Viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);
  ctx.clip();

  // Ocean backdrop
  ctx.fillStyle = '#0d2638';
  ctx.fillRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);

  // Mainland slab
  const mlX = tr.toScreenX(0);
  const mlY = tr.toScreenY(0);
  ctx.fillStyle = '#192230';
  ctx.fillRect(mlX, mlY, COAST_X * tr.scale, WORLD_HEIGHT * tr.scale);

  // Beach strip
  ctx.fillStyle = '#8b7758';
  ctx.fillRect(tr.toScreenX(COAST_X), mlY, BEACH_WIDTH * tr.scale, WORLD_HEIGHT * tr.scale);

  // Starfish Island + Causeway Bridges
  ctx.fillStyle = '#202b3b';
  ctx.fillRect(
    tr.toScreenX(ISLAND_X1),
    tr.toScreenY(ISLAND_Y1),
    (ISLAND_X2 - ISLAND_X1) * tr.scale,
    (ISLAND_Y2 - ISLAND_Y1) * tr.scale
  );
  ctx.fillStyle = '#3b485b';
  for (const cy of CAUSEWAY_YS) {
    ctx.fillRect(
      tr.toScreenX(2720),
      tr.toScreenY(cy - 34),
      (ISLAND_X1 - 2720 + 60) * tr.scale,
      68 * tr.scale
    );
  }

  // City Roads
  ctx.fillStyle = '#2b3646';
  for (const rx of cityMap.verticalRoads) {
    ctx.fillRect(tr.toScreenX(rx - 48), mlY, 96 * tr.scale, WORLD_HEIGHT * tr.scale);
  }
  for (const ry of cityMap.horizontalRoads) {
    ctx.fillRect(mlX, tr.toScreenY(ry - 48), COAST_X * tr.scale, 96 * tr.scale);
  }
  if (cityMap.islandVerticalRoads) {
    for (const rx of cityMap.islandVerticalRoads) {
      ctx.fillRect(
        tr.toScreenX(rx - 44),
        tr.toScreenY(ISLAND_Y1),
        88 * tr.scale,
        (ISLAND_Y2 - ISLAND_Y1) * tr.scale
      );
    }
  }
  if (cityMap.islandHorizontalRoads) {
    for (const ry of cityMap.islandHorizontalRoads) {
      ctx.fillRect(
        tr.toScreenX(ISLAND_X1),
        tr.toScreenY(ry - 44),
        (ISLAND_X2 - ISLAND_X1) * tr.scale,
        88 * tr.scale
      );
    }
  }

  // City Buildings
  ctx.fillStyle = '#364559';
  for (const b of cityMap.buildings) {
    ctx.fillRect(tr.toScreenX(b.x), tr.toScreenY(b.y), b.w * tr.scale, b.h * tr.scale);
  }

  // Club Eclipse Pavilion
  const ce = CLUB_ECLIPSE_BOUNDS;
  ctx.fillStyle = 'rgba(201, 136, 184, 0.35)';
  ctx.fillRect(tr.toScreenX(ce.x1), tr.toScreenY(ce.y1), (ce.x2 - ce.x1) * tr.scale, (ce.y2 - ce.y1) * tr.scale);

  // District Labels
  ctx.fillStyle = 'rgba(237, 241, 245, 0.38)';
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN VICE PLAZA', tr.toScreenX(1180), tr.toScreenY(660));
  ctx.fillText('OCEAN DRIVE', tr.toScreenX(2720), tr.toScreenY(2050));
  ctx.fillText('STARFISH ISLAND', tr.toScreenX(3540), tr.toScreenY(1250));
  ctx.fillText('SUNSET HILLS', tr.toScreenX(2050), tr.toScreenY(3750));
  ctx.fillText('PALM HARBOR', tr.toScreenX(640), tr.toScreenY(3650));

  // Police Vision Sight-Cones (translucent crimson-blue cones)
  if (wanted && wanted.sightCones) {
    for (const cone of wanted.sightCones) {
      const sx = tr.toScreenX(cone.x);
      const sy = tr.toScreenY(cone.y);
      const rad = cone.range * tr.scale;
      ctx.beginPath();
      if (cone.kind === 'heli') {
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      } else {
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, rad, cone.angle - cone.halfAngle, cone.angle + cone.halfAngle);
        ctx.closePath();
      }
      ctx.fillStyle = cone.kind === 'heli' ? 'rgba(224, 178, 104, 0.16)' : 'rgba(217, 91, 102, 0.20)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 188, 201, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // GPS Paths (Mission gold + Custom Waypoint gold-cyan)
  if (missions.gpsPoints && missions.gpsPoints.length >= 2) {
    ctx.strokeStyle = 'rgba(224, 178, 104, 0.72)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    missions.gpsPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(tr.toScreenX(p.x), tr.toScreenY(p.y));
      else ctx.lineTo(tr.toScreenX(p.x), tr.toScreenY(p.y));
    });
    ctx.stroke();
  }
  if (state.customWaypointGps && state.customWaypointGps.length >= 2) {
    ctx.save();
    ctx.setLineDash([7, 4]);
    ctx.strokeStyle = ACCENT_CYAN;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    state.customWaypointGps.forEach((p, i) => {
      if (i === 0) ctx.moveTo(tr.toScreenX(p.x), tr.toScreenY(p.y));
      else ctx.lineTo(tr.toScreenX(p.x), tr.toScreenY(p.y));
    });
    ctx.stroke();
    ctx.restore();
  }

  // Shops & Pay-N-Spray
  if (cityMap.shops) {
    for (const s of cityMap.shops) {
      const sx = tr.toScreenX(s.x);
      const sy = tr.toScreenY(s.y);
      ctx.fillStyle = SHOP_RADAR_COLORS[s.kind] || ACCENT_GOLD;
      ctx.fillRect(sx - 3.5, sy - 3.5, 7, 7);
    }
  }

  // Club Eclipse ♪
  {
    const sx = tr.toScreenX(ce.centerX);
    const sy = tr.toScreenY(ce.centerY);
    ctx.fillStyle = ACCENT_VIOLET;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#121924';
    ctx.font = '800 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', sx, sy + 3);
  }

  // Hospital (H), Precinct (P), Safehouse (S)
  const fixedMarkers = [
    { lm: LANDMARKS.hospital, col: ACCENT_EMERALD, ch: 'H' },
    { lm: LANDMARKS.precinct, col: ACCENT_CYAN, ch: 'P' },
    { lm: LANDMARKS.safehouse, col: '#5eb3aa', ch: 'S' }
  ];
  for (const fm of fixedMarkers) {
    const fx = tr.toScreenX(fm.lm.x);
    const fy = tr.toScreenY(fm.lm.y);
    ctx.fillStyle = fm.col;
    ctx.beginPath();
    ctx.arc(fx, fy, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e141e';
    ctx.font = '800 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fm.ch, fx, fy + 3.4);
  }

  // Police vehicle blips
  for (const v of vehicles) {
    if (!v.isPolice || v.destroyed || v === player.vehicle) continue;
    ctx.fillStyle = ACCENT_ALERT;
    ctx.beginPath();
    ctx.arc(tr.toScreenX(v.x), tr.toScreenY(v.y), 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active Mission Diamond
  if (missions.activeMission) {
    const mx = tr.toScreenX(missions.activeMission.targetX);
    const my = tr.toScreenY(missions.activeMission.targetY);
    ctx.fillStyle = ACCENT_GOLD;
    ctx.beginPath();
    ctx.moveTo(mx, my - 7);
    ctx.lineTo(mx + 7, my);
    ctx.lineTo(mx, my + 7);
    ctx.lineTo(mx - 7, my);
    ctx.closePath();
    ctx.fill();
  }

  // Custom Waypoint Pin
  if (state.customWaypoint) {
    const wx = tr.toScreenX(state.customWaypoint.x);
    const wy = tr.toScreenY(state.customWaypoint.y);
    ctx.strokeStyle = ACCENT_GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, wy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ACCENT_CYAN;
    ctx.beginPath();
    ctx.arc(wx, wy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player Chevron
  {
    const px = tr.toScreenX(player.x);
    const py = tr.toScreenY(player.y);
    const pAng = player.vehicle ? player.vehicle.angle : player.angle || 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pAng + Math.PI * 0.5);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.strokeStyle = ACCENT_GOLD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Map hint pill
  ctx.fillStyle = 'rgba(12, 17, 25, 0.84)';
  ctx.fillRect(mapRect.x + 10, mapRect.y + mapRect.h - 28, 498, 20);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '600 9.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `ZOOM ${(pm.zoom || 1).toFixed(1)}x  •  WHEEL: ZOOM  •  DRAG: PAN  •  CLICK: SET WAYPOINT  •  RMB: CLEAR`,
    mapRect.x + 18,
    mapRect.y + mapRect.h - 14
  );
  ctx.restore();

  ctx.strokeStyle = GLASS_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h);

  // 2. Right 9-Icon Legend Sidebar
  drawGlassBox(ctx, legendRect.x, legendRect.y, legendRect.w, legendRect.h, 8, GLASS_PANEL, GLASS_BORDER);
  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARIS BAY LEGEND', legendRect.x + 14, legendRect.y + 24);

  const legendItems = [
    { label: 'MISSION OBJECTIVE', color: ACCENT_GOLD, shape: 'diamond' },
    { label: 'CUSTOM GPS WAYPOINT', color: ACCENT_CYAN, shape: 'pin' },
    { label: 'SHOPS & STREET FOOD', color: ACCENT_GOLD, shape: 'square' },
    { label: 'PAY-N-SPRAY GARAGE', color: ACCENT_EMERALD, shape: 'square' },
    { label: 'CLUB ECLIPSE NIGHTLIFE', color: ACCENT_VIOLET, shape: 'circle', char: '♪' },
    { label: 'SOLARIS HOSPITAL', color: ACCENT_EMERALD, shape: 'circle', char: 'H' },
    { label: 'VCPD CENTRAL PRECINCT', color: ACCENT_CYAN, shape: 'circle', char: 'P' },
    { label: 'SAFEHOUSE VILLA', color: '#5eb3aa', shape: 'circle', char: 'S' },
    { label: 'VCPD VISION CONE', color: ACCENT_ALERT, shape: 'cone' }
  ];

  legendItems.forEach((it, idx) => {
    const iy = legendRect.y + 46 + idx * 33;
    const ix = legendRect.x + 24;
    if (it.shape === 'diamond') {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.moveTo(ix, iy - 6);
      ctx.lineTo(ix + 6, iy);
      ctx.lineTo(ix, iy + 6);
      ctx.lineTo(ix - 6, iy);
      ctx.closePath();
      ctx.fill();
    } else if (it.shape === 'pin') {
      ctx.strokeStyle = ACCENT_GOLD;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ix, iy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(ix, iy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.shape === 'square') {
      ctx.fillStyle = it.color;
      ctx.fillRect(ix - 5, iy - 5, 10, 10);
    } else if (it.shape === 'cone') {
      ctx.fillStyle = 'rgba(217, 91, 102, 0.35)';
      ctx.beginPath();
      ctx.moveTo(ix - 4, iy);
      ctx.arc(ix - 4, iy, 11, -0.55, 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(ix - 4, iy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(ix, iy, 7, 0, Math.PI * 2);
      ctx.fill();
      if (it.char) {
        ctx.fillStyle = '#0e141e';
        ctx.font = '800 8.5px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(it.char, ix, iy + 3);
      }
    }
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(it.label, legendRect.x + 42, iy + 3.5);
  });

  // Active Waypoint Status Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(legendRect.x + 14, legendRect.y + 346, 214, 62);
  ctx.strokeStyle = GLASS_BORDER;
  ctx.strokeRect(legendRect.x + 14, legendRect.y + 346, 214, 62);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 9.5px "Segoe UI", sans-serif';
  ctx.fillText('ACTIVE GPS TARGET', legendRect.x + 22, legendRect.y + 365);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '600 10.5px "Segoe UI", sans-serif';
  if (state.customWaypoint) {
    const wpDist = Math.round(Math.hypot(player.x - state.customWaypoint.x, player.y - state.customWaypoint.y));
    ctx.fillText(`WAYPOINT: ${wpDist}m (${state.customWaypoint.x}, ${state.customWaypoint.y})`, legendRect.x + 22, legendRect.y + 385);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9.5px "Segoe UI", sans-serif';
    ctx.fillText(getDistrictAt(state.customWaypoint.x, state.customWaypoint.y).name, legendRect.x + 22, legendRect.y + 400);
  } else {
    ctx.fillText('NO CUSTOM PIN SET', legendRect.x + 22, legendRect.y + 385);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9.5px "Segoe UI", sans-serif';
    ctx.fillText('Click anywhere on map to route', legendRect.x + 22, legendRect.y + 400);
  }

  for (const btn of [
    { rect: clearWaypointRect, label: 'CLEAR WAYPOINT', accent: ACCENT_ALERT },
    { rect: centerMapRect, label: 'CENTER ON PLAYER', accent: ACCENT_CYAN }
  ]) {
    const hov = pm.hoverId === btn.rect.id;
    drawGlassBox(
      ctx,
      btn.rect.x,
      btn.rect.y,
      btn.rect.w,
      btn.rect.h,
      5,
      hov ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)',
      hov ? btn.accent : GLASS_BORDER
    );
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.rect.x + btn.rect.w * 0.5, btn.rect.y + 20);
  }
}

function renderStoryTab(ctx, state, content) {
  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('3-ACT HEIST CAMPAIGN PROGRESSION', content.x + 12, content.y + 20);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.fillText('SOLARIS BAY CAST & FACTIONS CODEX', content.x + 668, content.y + 20);

  STORY_MISSIONS.forEach((m, i) => {
    const ry = content.y + 32 + i * 76;
    const isCompleted = state.missions.completedIds.includes(m.id);
    const isCurrent = state.missions.currentIndex === i;
    const status = isCompleted ? 'COMPLETED' : isCurrent ? 'ACTIVE' : 'AVAILABLE';
    const col = isCompleted ? ACCENT_EMERALD : isCurrent ? ACCENT_GOLD : ACCENT_CYAN;

    drawGlassBox(
      ctx,
      content.x + 12,
      ry,
      636,
      66,
      6,
      isCurrent ? 'rgba(224, 178, 104, 0.13)' : 'rgba(255, 255, 255, 0.045)',
      isCurrent ? ACCENT_GOLD : GLASS_BORDER
    );
    ctx.fillStyle = col;
    ctx.fillRect(content.x + 12, ry, 4, 66);

    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${m.code} • ${m.title}`, content.x + 26, ry + 22);

    ctx.textAlign = 'right';
    ctx.fillText(`${status} • $${m.reward.toLocaleString()}`, content.x + 634, ry + 22);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(m.briefing, content.x + 26, ry + 45);
  });

  CAST_CODEX.forEach((c, i) => {
    const cy = content.y + 32 + i * 92;
    drawGlassBox(ctx, content.x + 668, cy, 392, 82, 6, 'rgba(255, 255, 255, 0.045)', GLASS_BORDER);
    ctx.fillStyle = c.accent;
    ctx.fillRect(content.x + 668, cy, 4, 82);
    ctx.font = '800 11.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.name, content.x + 682, cy + 22);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText(c.role, content.x + 682, cy + 38);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.fillText(c.bio.slice(0, 62), content.x + 682, cy + 56);
    if (c.bio.length > 62) {
      ctx.fillText(c.bio.slice(62).trim(), content.x + 682, cy + 70);
    }
  });
}

function renderStatsTab(ctx, state, content) {
  const cs = ensureCareerStats(state);
  const clock = getWorldClockInfo(state.worldTime);
  const cards = [
    { label: 'CAREER BANKROLL', val: `$${state.player.cash.toLocaleString()}`, col: ACCENT_EMERALD },
    { label: 'MISSIONS COMPLETED', val: `${state.missions.completedIds.length} / ${STORY_MISSIONS.length}`, col: ACCENT_GOLD },
    { label: 'SOLARIS CLOCK', val: `${clock.formatted} • ${clock.phase}`, col: ACCENT_CYAN },
    { label: 'CARS STOLEN', val: `${cs.carsStolen || 0}`, col: ACCENT_GOLD },
    { label: 'COPS EVADED', val: `${cs.copsEscaped || 0}`, col: ACCENT_EMERALD },
    { label: 'HIGHEST WANTED LEVEL', val: `${cs.highestWanted || 0} ★`, col: ACCENT_ALERT },
    { label: 'DISTANCE DRIVEN', val: `${Math.round(cs.distanceDrivenMeters || 0).toLocaleString()} m`, col: ACCENT_CYAN },
    { label: 'ENEMIES NEUTRALIZED', val: `${cs.enemiesNeutralized || 0}`, col: ACCENT_GOLD },
    { label: 'MELEE KNOCKOUTS', val: `${cs.meleeKnockouts || 0}`, col: ACCENT_VIOLET },
    { label: 'TIMES WASTED', val: `${cs.timesWasted || 0}`, col: ACCENT_ALERT },
    { label: 'TIMES BUSTED', val: `${cs.timesBusted || 0}`, col: ACCENT_CYAN },
    { label: 'PLAYER VITALS', val: `HP ${Math.round(state.player.hp)}/${state.player.maxHp} • ARMOR ${Math.round(state.player.armor)}%`, col: ACCENT_EMERALD }
  ];

  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE CAREER TELEMETRY & CRIMINAL RECORD', content.x + 12, content.y + 22);

  cards.forEach((c, i) => {
    const colIdx = i % 3;
    const rowIdx = Math.floor(i / 3);
    const cx = content.x + 12 + colIdx * 354;
    const cy = content.y + 40 + rowIdx * 112;
    drawGlassBox(ctx, cx, cy, 340, 96, 8, 'rgba(255, 255, 255, 0.05)', GLASS_BORDER);
    ctx.fillStyle = c.col;
    ctx.fillRect(cx, cy, 4, 96);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.label, cx + 18, cy + 32);
    ctx.fillStyle = c.col;
    ctx.font = '800 21px "Consolas", "Segoe UI", monospace';
    ctx.fillText(c.val, cx + 18, cy + 66);
  });
}

function renderCrewTab(ctx, state, content) {
  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARIS CREW • SPECIALIST ROSTER & STAGE 7B PERKS', content.x + 12, content.y + 22);

  SOLARIS_CREW.forEach((m, i) => {
    const cx = content.x + 12 + i * 354;
    const cy = content.y + 40;
    const cw = 340;
    const ch = 446;
    drawGlassBox(ctx, cx, cy, cw, ch, 10, 'rgba(255, 255, 255, 0.05)', m.accent);
    ctx.fillStyle = m.accent;
    ctx.fillRect(cx + 18, cy + 16, 48, 3.5);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '800 19px "Segoe UI", sans-serif';
    ctx.fillText(m.name, cx + 18, cy + 52);

    ctx.fillStyle = m.accent;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(m.role, cx + 18, cy + 72);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cx + 18, cy + 88, cw - 36, 1);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText('SPECIALTY', cx + 18, cy + 114);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '600 11.5px "Segoe UI", sans-serif';
    ctx.fillText(m.specialty, cx + 18, cy + 134);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText('OPERATIVE DOSSIER', cx + 18, cy + 166);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 11px "Segoe UI", sans-serif';
    const words = m.bio.split(' ');
    let line = '';
    let ly = cy + 186;
    for (const w of words) {
      if ((line + ' ' + w).length > 42) {
        ctx.fillText(line.trim(), cx + 18, ly);
        line = w;
        ly += 18;
      } else {
        line += ' ' + w;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), cx + 18, ly);

    // Perk preview box
    drawGlassBox(ctx, cx + 18, cy + 296, cw - 36, 128, 6, 'rgba(12, 17, 25, 0.72)', GLASS_BORDER);
    ctx.fillStyle = ACCENT_CYAN;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText('CREW PERK SLOT', cx + 32, cy + 320);
    ctx.fillStyle = m.accent;
    ctx.font = '800 13px "Segoe UI", sans-serif';
    ctx.fillText(m.perkName, cx + 32, cy + 344);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.fillText(m.perkDesc, cx + 32, cy + 368);

    ctx.fillStyle = ACCENT_EMERALD;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText(`● ${m.status}`, cx + 32, cy + 404);
  });
}

function renderSettingsTab(ctx, state, content) {
  const sc = getSettingsControlsLayout(content);
  const settings = state.settings || DEFAULT_SETTINGS;
  const pm = state.pauseMap || {};
  const muted = Boolean(state.audio && state.audio.stats && state.audio.stats.muted);

  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AUDIO, CONTROLS, GRAPHICS & HUD PREFERENCES (AUTO-SAVED)', content.x + 16, content.y + 22);

  for (const s of sc.sliders) {
    const val = settings[s.id];
    const ratio = Math.max(0, Math.min(1, (val - s.min) / (s.max - s.min)));
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, s.rowRect.x, s.y + 12);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(s.trackRect.x, s.trackRect.y, s.trackRect.w, s.trackRect.h);
    ctx.fillStyle = ACCENT_CYAN;
    ctx.fillRect(s.trackRect.x, s.trackRect.y, s.trackRect.w * ratio, s.trackRect.h);

    const knobX = s.trackRect.x + s.trackRect.w * ratio;
    ctx.fillStyle = ACCENT_GOLD;
    ctx.beginPath();
    ctx.arc(knobX, s.trackRect.y + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ACCENT_EMERALD;
    ctx.font = '800 12px "Consolas", "Segoe UI", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(s.fmt(val), s.rowRect.x + s.rowRect.w - 8, s.y + 12);
  }

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GRAPHICS QUALITY PRESET', content.x + 16, content.y + 252);
  for (const q of sc.qualityButtons) {
    const active = settings.quality === q.val;
    const hov = pm.hoverId === q.id;
    drawGlassBox(
      ctx,
      q.x,
      q.y,
      q.w,
      q.h,
      5,
      active ? 'rgba(224, 178, 104, 0.24)' : hov ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
      active ? ACCENT_GOLD : GLASS_BORDER
    );
    ctx.fillStyle = active ? ACCENT_GOLD : TEXT_PRIMARY;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(q.val, q.x + q.w * 0.5, q.y + 20);
  }

  for (const tg of sc.toggles) {
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(tg.label, content.x + 16, tg.y + 14);

    let txt = 'ON';
    let on = true;
    if (tg.id === 'autoQuality') {
      on = settings.autoQuality !== false;
      txt = on ? 'ON (AUTO-STEP <28 FPS)' : 'OFF (MANUAL LOCK)';
    } else if (tg.id === 'shadows') {
      on = settings.shadows !== false;
      txt = on ? 'ENABLED' : 'DISABLED';
    } else if (tg.id === 'hudDensity') {
      on = settings.hudDensity === 'FULL';
      txt = settings.hudDensity || 'FULL';
    }
    const hov = pm.hoverId === tg.btnRect.id;
    drawGlassBox(
      ctx,
      tg.btnRect.x,
      tg.btnRect.y,
      tg.btnRect.w,
      tg.btnRect.h,
      5,
      on ? 'rgba(99, 199, 146, 0.18)' : 'rgba(255, 255, 255, 0.05)',
      hov || on ? ACCENT_EMERALD : GLASS_BORDER
    );
    ctx.fillStyle = on ? ACCENT_EMERALD : TEXT_MUTED;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(txt, tg.btnRect.x + tg.btnRect.w * 0.5, tg.btnRect.y + 20);
  }

  // Right-side Quick Buttons
  drawGlassBox(
    ctx,
    sc.muteRect.x,
    sc.muteRect.y,
    sc.muteRect.w,
    sc.muteRect.h,
    6,
    muted ? 'rgba(217, 91, 102, 0.18)' : 'rgba(99, 199, 146, 0.16)',
    muted ? ACCENT_ALERT : ACCENT_EMERALD
  );
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(muted ? '[U] AUDIO: MUTED' : '[U] AUDIO: ACTIVE', sc.muteRect.x + sc.muteRect.w * 0.5, sc.muteRect.y + 25);

  drawGlassBox(
    ctx,
    sc.resetSettingsRect.x,
    sc.resetSettingsRect.y,
    sc.resetSettingsRect.w,
    sc.resetSettingsRect.h,
    6,
    'rgba(255, 255, 255, 0.06)',
    ACCENT_GOLD
  );
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillText('RESET DEFAULT SETTINGS', sc.resetSettingsRect.x + sc.resetSettingsRect.w * 0.5, sc.resetSettingsRect.y + 25);

  drawGlassBox(ctx, sc.muteRect.x, content.y + 174, sc.muteRect.w, 250, 6, 'rgba(255, 255, 255, 0.04)', GLASS_BORDER);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RENDER ENGINE TELEMETRY', sc.muteRect.x + 16, content.y + 200);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 10.5px "Segoe UI", sans-serif';
  const fpsVal = Math.round(state.liveFps || 60);
  ctx.fillText(`Live FPS: ${fpsVal} FPS`, sc.muteRect.x + 16, content.y + 228);
  ctx.fillText(`Renderer: Three.js r183 WebGL 2.0`, sc.muteRect.x + 16, content.y + 252);
  ctx.fillText(`Tone Mapping: AgX (Exp 0.96)`, sc.muteRect.x + 16, content.y + 276);
  ctx.fillText(`Auto-FPS scales quality under 28 FPS`, sc.muteRect.x + 16, content.y + 306);
  ctx.fillText(`during live gameplay.`, sc.muteRect.x + 16, content.y + 324);
}

function renderControlsTab(ctx, content) {
  const left = [
    ['[WASD / ARROWS]', 'Move On Foot / Steer & Throttle'],
    ['[SHIFT]', 'Sprint On Foot / Nitro Afterburner'],
    ['[SPACE]', 'Jump On Foot / Handbrake / Rhythm Boost'],
    ['[LMB CLICK]', 'Lock Pointer & Fire / Punch / Drive-By'],
    ['[RMB HOLD]', 'Over-the-Shoulder ADS Precision Zoom'],
    ['[1 - 6 / Q / WHEEL]', 'Switch Weapons (Fists..RPG)'],
    ['[R]', 'Reload Firearm (On Foot & Drive-By)'],
    ['[V] (ON FOOT)', 'Quick 3-Hit Boxing Melee Combo'],
    ['[E]', 'Walk-In Shops / Bar / VIP Suite'],
    ['[G]', 'Dance on Club Eclipse LED Floor'],
    ['[TAB]', 'Safehouse Career Dossier']
  ];
  const right = [
    ['[F / ENTER]', 'Carjack (Pull Out Driver) / Exit Vehicle'],
    ['[V] (IN VEHICLE)', 'Cycle Cam (Close / Std / Far / Hood)'],
    ['[LMB] (IN VEHICLE)', 'Drive-By Pistol / SMG Out Driver Window'],
    ['[H]', 'Honk Horn / Invite Companion into Car'],
    ['[X]', 'Cycle Synthwave Radio / Police Scanner'],
    ['[P / ESC]', 'Open / Close 7-Tab Pause Hub'],
    ['[M]', 'Open Full Interactive Map & Waypoint'],
    ['[Q / E] (IN HUB)', 'Switch Between 7 Pause Hub Tabs'],
    ['[K]', 'Quick Save Career to Slot 1'],
    ['[U]', 'Mute / Unmute WebAudio Master Bus'],
    ['[N / T] (IN HUB)', 'New Game Reset / Return to Title Screen']
  ];

  drawGlassBox(ctx, content.x + 12, content.y + 18, 514, 468, 8, 'rgba(255, 255, 255, 0.04)', GLASS_BORDER);
  drawGlassBox(ctx, content.x + 546, content.y + 18, 514, 468, 8, 'rgba(255, 255, 255, 0.04)', GLASS_BORDER);

  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ON-FOOT, COMBAT & WORLD INTERACTION', content.x + 28, content.y + 44);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.fillText('DRIVING, DRIVE-BY & PAUSE HUB', content.x + 562, content.y + 44);

  left.forEach((row, idx) => {
    const ry = content.y + 76 + idx * 36;
    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 10.5px "Consolas", "Segoe UI", monospace';
    ctx.fillText(row[0], content.x + 28, ry);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.fillText(row[1], content.x + 184, ry);
  });

  right.forEach((row, idx) => {
    const ry = content.y + 76 + idx * 36;
    ctx.fillStyle = ACCENT_CYAN;
    ctx.font = '700 10.5px "Consolas", "Segoe UI", monospace';
    ctx.fillText(row[0], content.x + 562, ry);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.fillText(row[1], content.x + 718, ry);
  });
}

function renderSaveTab(ctx, state, content) {
  const sv = getSaveTabLayout(content);
  const slots = listSaveSlots();
  const pm = state.pauseMap || {};

  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERSISTENT CAREER SAVE SLOTS (LOCALSTORAGE)', content.x + 12, content.y + 14);

  sv.slotCards.forEach((card, i) => {
    const info = slots[i];
    drawGlassBox(
      ctx,
      card.x,
      card.y,
      card.w,
      card.h,
      7,
      info ? 'rgba(99, 199, 146, 0.08)' : 'rgba(255, 255, 255, 0.04)',
      info ? 'rgba(99, 199, 146, 0.42)' : GLASS_BORDER
    );

    ctx.fillStyle = info ? ACCENT_EMERALD : TEXT_MUTED;
    ctx.font = '800 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      card.slot === 1 ? `SLOT 1 • PRIMARY CAREER` : `SLOT ${card.slot} • MANUAL CAREER`,
      card.x + 18,
      card.y + 28
    );

    ctx.fillStyle = info ? TEXT_PRIMARY : TEXT_MUTED;
    ctx.font = '600 11.5px "Segoe UI", sans-serif';
    if (info) {
      const ts = info.savedAt ? info.savedAt.slice(0, 16).replace('T', ' ') : '';
      ctx.fillText(
        `$${info.cash.toLocaleString()} • ${info.completedCount}/6 Completed • HP ${info.hp}/${info.maxHp} • ${info.clockFormatted} • ${info.districtName}`,
        card.x + 18,
        card.y + 52
      );
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '500 9.5px "Segoe UI", sans-serif';
      ctx.fillText(`SAVED ${ts}`, card.x + 18, card.y + 72);
    } else {
      ctx.fillText('EMPTY SAVE SLOT — CLICK SAVE HERE TO STORE CURRENT PROGRESS', card.x + 18, card.y + 54);
    }

    const btns = [
      { rect: card.saveRect, label: 'SAVE HERE', accent: ACCENT_EMERALD, disabled: Boolean(state.pauseOpenedFromTitle) },
      { rect: card.loadRect, label: 'LOAD', accent: ACCENT_CYAN, disabled: !info },
      { rect: card.clearRect, label: 'CLEAR', accent: ACCENT_ALERT, disabled: !info }
    ];
    for (const b of btns) {
      const hov = pm.hoverId === b.rect.id && !b.disabled;
      drawGlassBox(
        ctx,
        b.rect.x,
        b.rect.y,
        b.rect.w,
        b.rect.h,
        5,
        b.disabled ? 'rgba(255, 255, 255, 0.03)' : hov ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.07)',
        b.disabled ? GLASS_BORDER : b.accent
      );
      ctx.fillStyle = b.disabled ? TEXT_MUTED : b.accent;
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.rect.x + b.rect.w * 0.5, b.rect.y + 23);
    }
  });

  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '800 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SAFEHOUSE SLEEP & TIME-SKIP (RESTORES HP)', content.x + 12, content.y + 336);

  for (const sb of sv.sleepButtons) {
    const hov = pm.hoverId === sb.id;
    const disabled = Boolean(state.pauseOpenedFromTitle);
    drawGlassBox(
      ctx,
      sb.x,
      sb.y,
      sb.w,
      sb.h,
      6,
      disabled ? 'rgba(255, 255, 255, 0.03)' : hov ? 'rgba(100, 188, 201, 0.2)' : 'rgba(255, 255, 255, 0.06)',
      disabled ? GLASS_BORDER : ACCENT_CYAN
    );
    ctx.fillStyle = disabled ? TEXT_MUTED : TEXT_PRIMARY;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sb.label, sb.x + sb.w * 0.5, sb.y + 26);
  }

  for (const ab of sv.actionButtons) {
    const hov = pm.hoverId === ab.id;
    drawGlassBox(
      ctx,
      ab.x,
      ab.y,
      ab.w,
      ab.h,
      6,
      hov ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.07)',
      ab.accent
    );
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ab.label, ab.x + ab.w * 0.5, ab.y + 28);
  }
}

export function renderPauseHubOverlay(ctx, state) {
  if (!state.paused) return;
  const layout = getPauseHubLayout();
  const activeTab = PAUSE_TABS.includes(state.pauseTab) ? state.pauseTab : 'MAP';
  const district = getDistrictAt(state.player.x, state.player.y);
  const clock = getWorldClockInfo(state.worldTime);
  const pm = state.pauseMap || {};

  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 18, 0.62)';
  ctx.fillRect(0, 0, 1280, 720);

  drawGlassBox(ctx, layout.x, layout.y, layout.w, layout.h, 12, GLASS_BG, 'rgba(224, 178, 104, 0.45)');

  // Header
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillRect(layout.x + 20, layout.y + 14, 48, 3);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `SOLARIS BAY HUB  •  ${district.name}  •  ${clock.formatted} ${clock.phase}`,
    layout.x + 20,
    layout.y + 32
  );

  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '700 11.5px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `$${state.player.cash.toLocaleString()}  •  HP ${Math.round(state.player.hp)}/${state.player.maxHp || 100}`,
    layout.closeRect.x - 16,
    layout.y + 33
  );

  // Close / Resume button
  const hovClose = pm.hoverId === layout.closeRect.id;
  drawGlassBox(
    ctx,
    layout.closeRect.x,
    layout.closeRect.y,
    layout.closeRect.w,
    layout.closeRect.h,
    5,
    hovClose ? 'rgba(99, 199, 146, 0.24)' : 'rgba(99, 199, 146, 0.14)',
    ACCENT_EMERALD
  );
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.pauseOpenedFromTitle ? '[ESC] BACK TO TITLE' : '[P / ESC] RESUME',
    layout.closeRect.x + layout.closeRect.w * 0.5,
    layout.closeRect.y + 19
  );

  // 7 Tab Bar
  for (const t of layout.tabs) {
    const isAct = t.id === activeTab;
    const hov = pm.hoverId === `tab_${t.id}`;
    drawGlassBox(
      ctx,
      t.x,
      t.y,
      t.w,
      t.h,
      6,
      isAct ? 'rgba(224, 178, 104, 0.24)' : hov ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
      isAct ? ACCENT_GOLD : GLASS_BORDER
    );
    ctx.fillStyle = isAct ? ACCENT_GOLD : TEXT_PRIMARY;
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.id, t.x + t.w * 0.5, t.y + 21);
  }

  if (activeTab === 'MAP') renderMapTab(ctx, state, layout);
  else if (activeTab === 'STORY') renderStoryTab(ctx, state, layout.content);
  else if (activeTab === 'STATS') renderStatsTab(ctx, state, layout.content);
  else if (activeTab === 'CREW') renderCrewTab(ctx, state, layout.content);
  else if (activeTab === 'SETTINGS') renderSettingsTab(ctx, state, layout.content);
  else if (activeTab === 'CONTROLS') renderControlsTab(ctx, layout.content);
  else if (activeTab === 'SAVE') renderSaveTab(ctx, state, layout.content);

  ctx.restore();
}
