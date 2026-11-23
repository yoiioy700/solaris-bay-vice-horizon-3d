import {
  WEAPONS,
  RADIO_STATIONS,
  COAST_X,
  ISLAND_X1,
  ISLAND_X2,
  ISLAND_Y1,
  ISLAND_Y2,
  CAUSEWAY_YS,
  getWorldClockInfo
} from './config.js';
import { getDistrictAt } from './city-map.js';
import { STORY_MISSIONS } from './missions-story.js';
import { getDriveByWeapon } from './combat-weapons.js';
import {
  SHOP_RADAR_COLORS,
  getShopDrawerLayout,
  findTargetVehicleForGarage
} from './shops-economy.js';
import { CLUB_ECLIPSE_BOUNDS, getNightlifeMenuLayout } from './nightlife-romance.js';
import { getSavedCareerSummary } from './audio-save.js';
import { renderPauseHubOverlay } from './pause-hub.js';

const GLASS_BG = 'rgba(12, 17, 25, 0.78)';
const GLASS_BG_STRONG = 'rgba(12, 17, 25, 0.86)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.15)';
const GLASS_SHEEN = 'rgba(255, 255, 255, 0.08)';
const ACCENT_GOLD = '#e0b268';
const ACCENT_CYAN = '#64bcc9';
const ACCENT_EMERALD = '#63c792';
const ACCENT_ALERT = '#d95b66';
const TEXT_PRIMARY = '#edf1f5';
const TEXT_MUTED = '#9aa8b8';

function drawFrostedGlassPanel(
  ctx,
  x,
  y,
  w,
  h,
  cut = 8,
  fill = GLASS_BG,
  border = GLASS_BORDER
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // Subtle top frosted glass sheen line
  ctx.beginPath();
  ctx.moveTo(x + cut + 1, y + 1);
  ctx.lineTo(x + w - 1, y + 1);
  ctx.strokeStyle = GLASS_SHEEN;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crisp 1px frosted border
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

export function getStartScreenLayout() {
  const w = 560;
  const h = 448;
  const x = Math.round((1280 - w) * 0.5);
  const y = 142;
  return {
    x,
    y,
    w,
    h,
    newGameRect: { x: x + 28, y: y + 132, w: 244, h: 58 },
    continueRect: { x: x + 288, y: y + 132, w: 244, h: 58 },
    loadSlotRect: { x: x + 28, y: y + 198, w: 244, h: 34 },
    settingsRect: { x: x + 288, y: y + 198, w: 244, h: 34 }
  };
}

export function getPauseMenuLayout() {
  const w = 420;
  const h = 418;
  const x = Math.round((1280 - w) * 0.5);
  const y = 148;
  const bw = w - 56;
  const bh = 44;
  const bx = x + 28;
  const startY = y + 112;
  const gap = 11;
  return {
    x,
    y,
    w,
    h,
    resumeRect: { id: 'resume', x: bx, y: startY, w: bw, h: bh },
    saveRect: { id: 'save', x: bx, y: startY + (bh + gap), w: bw, h: bh },
    audioRect: { id: 'audio', x: bx, y: startY + (bh + gap) * 2, w: bw, h: bh },
    newGameRect: { id: 'new', x: bx, y: startY + (bh + gap) * 3, w: bw, h: bh },
    titleRect: { id: 'title', x: bx, y: startY + (bh + gap) * 4, w: bw, h: bh }
  };
}

export function renderHud2D(ctx, state) {
  ctx.clearRect(0, 0, 1280, 720);

  if (state.startScreenOpen) {
    renderStartTitleScreen(ctx, state);
    renderBottomControlStrip(ctx);
    return;
  }

  if (state.paused && state.pauseOpenedFromTitle) {
    renderPauseHubOverlay(ctx, state);
    return;
  }

  // 0. Damage & Explosion Vignette Flashes
  renderDamageAndBlastOverlay(ctx, state);

  // 1. Diegetic 3D World-Space Screen Markers
  if (!state.outcome) {
    renderDiegeticWorldMarkers(ctx, state);
  }

  // 1B. Dynamic Over-the-Shoulder & Drive-By Crosshair + Hit Marker
  renderDynamicCrosshair(ctx, state);

  // 2. Top-Left Slim Floating Mission Pill
  renderTopLeftMissionPill(ctx, state);

  // 3. Top-Right Compact Wanted Stars, Clock, Cash & Weapon Cluster
  renderTopRightStatusCluster(ctx, state);

  // 4. Bottom-Left Rotating Circular Radar Minimap & Status Bars
  renderBottomLeftRadar(ctx, state);

  // 5. Bottom-Right Sleek Automotive Tachometer / Tactical Arsenal
  if (!state.safehouseModalOpen && !state.outcome) {
    renderBottomRightTelemetry(ctx, state);
  }

  // 5B. Vehicle Engine Fire Bailout Alert & BUSTED Apprehension Warning Bar
  if (!state.outcome && state.player.vehicle && state.player.vehicle.onFire) {
    renderEngineFireWarning(ctx, state.player.vehicle, state.time || 0);
  } else if (!state.outcome && state.wanted && state.wanted.bustMeter > 0.15) {
    renderBustProgressWarning(ctx, state.wanted.bustMeter, state.time || 0);
  }

  // 6. Temporary Event Banner
  if (!state.outcome && state.hudBanner && state.hudBanner.timer > 0) {
    renderCenterEventBanner(ctx, state.hudBanner);
  }

  // 7. Interactive Shop / Vendor Overlay Drawer
  if (state.shopModal && state.shopModal.open && state.shopModal.shop) {
    renderShopOverlayDrawer(ctx, state);
  }

  // 7B. Club Eclipse 21+ VIP Suite / Car Service Menu Drawer & Active Intimate Session Overlay
  if (state.nightlife && (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen)) {
    renderNightlifeMenuDrawer(ctx, state);
  }
  if (state.nightlife && state.nightlife.session) {
    renderActiveNightlifeSessionHud(ctx, state);
  }

  // 8. Safehouse Career Dossier Modal
  if (state.safehouseModalOpen) {
    renderSafehouseDossierModal(ctx, state);
  }

  // 8B. Unified 7-Tab Pause Hub Overlay
  if (state.paused) {
    renderPauseHubOverlay(ctx, state);
  }

  // 8C. WASTED / BUSTED Slow-Mo Outcome Overlay
  if (state.outcome) {
    renderOutcomeOverlay(ctx, state.outcome);
  }

  // 9. Slim Bottom-Edge Control Legend Bar (hidden in COMPACT HUD density)
  const hudDensity = (state.settings && state.settings.hudDensity) || 'FULL';
  if (hudDensity !== 'COMPACT' && !state.outcome) {
    renderBottomControlStrip(ctx);
  }
}

function renderDamageAndBlastOverlay(ctx, state) {
  const cam = state.camera;
  if (!cam) return;
  if ((cam.damageFlash || 0) > 0.01) {
    ctx.save();
    const vig = ctx.createRadialGradient(640, 360, 260, 640, 360, 740);
    vig.addColorStop(0, 'rgba(180, 24, 38, 0)');
    vig.addColorStop(1, `rgba(195, 28, 42, ${Math.min(0.45, cam.damageFlash * 0.55)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
  if ((cam.explosionFlash || 0) > 0.01) {
    ctx.save();
    const vig = ctx.createRadialGradient(640, 360, 240, 640, 360, 740);
    vig.addColorStop(0, 'rgba(255, 200, 110, 0)');
    vig.addColorStop(1, `rgba(255, 195, 110, ${Math.min(0.28, cam.explosionFlash * 0.35)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}

function renderDynamicCrosshair(ctx, state) {
  const { player, camera: cam } = state;
  if (!cam || state.paused || state.outcome) return;

  const modalOpen = Boolean(
    (state.shopModal && state.shopModal.open) ||
      state.safehouseModalOpen ||
      (state.nightlife &&
        (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session || state.nightlife.dancing))
  );
  if (modalOpen) return;
  if (cam.overridePose && !cam.showShowcaseCrosshair) return;

  const isDriveBy = Boolean(player.vehicle);
  const weapon = isDriveBy ? getDriveByWeapon(player) : WEAPONS[player.weaponIndex] || WEAPONS[1];
  const speed = isDriveBy ? (player.vehicle.speed || 0) * 0.25 : Math.hypot(player.vx || 0, player.vy || 0);
  const aimBlend = cam.aimBlend || 0;
  const baseGap = (8.5 - aimBlend * 4.2) + Math.min(9.5, speed * 0.055) + (weapon.spread || 0.02) * 85 + (player.spreadBloom || 0) * 115;
  const gap = Math.max(4, Math.min(26, baseGap));
  const tickLen = isDriveBy ? 5.0 : aimBlend > 0.5 ? 6.5 : 7.5;

  const cx = 640;
  const cy = 360;
  const targetType = cam.aimTargetType;
  const mainCol =
    targetType === 'npc'
      ? '#ff5a66'
      : targetType === 'vehicle'
        ? '#e8bc6b'
        : isDriveBy
          ? 'rgba(224, 240, 250, 0.72)'
          : 'rgba(244, 248, 252, 0.94)';

  ctx.save();
  ctx.lineCap = 'round';

  if (weapon.isMelee && !isDriveBy) {
    // Compact melee diamond reticle
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.65)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainCol;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = mainCol;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Crisp subtle dark halo behind ticks for daylight/sky readability
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.65)';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(cx - gap - tickLen, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + tickLen, cy);
    ctx.moveTo(cx, cy - gap - tickLen);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + tickLen);
    ctx.stroke();

    // Foreground dynamic crosshair ticks
    ctx.strokeStyle = mainCol;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - gap - tickLen, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + tickLen, cy);
    ctx.moveTo(cx, cy - gap - tickLen);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + tickLen);
    ctx.stroke();

    // Center precision dot
    ctx.fillStyle = mainCol;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Circular reload progress ring around crosshair
  if ((player.reloadTimer || 0) > 0 && weapon.reloadTime > 0) {
    const progress = 1 - Math.max(0, Math.min(1, player.reloadTimer / weapon.reloadTime));
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.55)';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 16, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * progress);
    ctx.strokeStyle = ACCENT_CYAN;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RELOADING', cx, cy + 30);
  }

  // Brief Hit Marker 'X' when bullets or punches connect
  if ((cam.hitMarkerTimer || 0) > 0) {
    const hmAlpha = Math.min(1, cam.hitMarkerTimer / 0.14);
    ctx.strokeStyle = cam.hitMarkerCrit
      ? `rgba(255, 86, 102, ${hmAlpha})`
      : `rgba(245, 224, 168, ${hmAlpha})`;
    ctx.lineWidth = 2.2;
    const inner = 5;
    const outer = 12;
    ctx.beginPath();
    ctx.moveTo(cx - outer, cy - outer);
    ctx.lineTo(cx - inner, cy - inner);
    ctx.moveTo(cx + outer, cy - outer);
    ctx.lineTo(cx + inner, cy - inner);
    ctx.moveTo(cx - outer, cy + outer);
    ctx.lineTo(cx - inner, cy + inner);
    ctx.moveTo(cx + outer, cy + outer);
    ctx.lineTo(cx + inner, cy + inner);
    ctx.stroke();
  }

  ctx.restore();
}

function renderDiegeticWorldMarkers(ctx, state) {
  const markers = state.projectedMarkers;
  if (!markers) return;

  const active = state.missions.activeMission;
  const hasBossBar = Boolean(markers.convoyBoss && markers.convoyBoss.screen);

  // Projected 3D Mission Target Waypoint Diamond (suppressed when boss bar already anchors target)
  if (markers.missionTarget && active && !hasBossBar) {
    const { x, y } = markers.missionTarget;
    const dist = Math.round(
      Math.hypot(state.player.x - active.targetX, state.player.y - active.targetY)
    );
    if (x >= 40 && x <= 1240 && y >= 45 && y <= 645) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(224, 178, 104, 0.88)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.stroke();

      drawFrostedGlassPanel(ctx, -38, 15, 76, 18, 4, GLASS_BG_STRONG, GLASS_BORDER);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`TARGET ${dist}m`, 0, 27);
      ctx.restore();
    }
  }

  // Projected [F] CARJACK prompt above nearest 3D vehicle when on foot
  let hijackPillRect = null;
  if (
    markers.hijackTarget &&
    markers.hijackTarget.screen &&
    !(state.shopModal && state.shopModal.open)
  ) {
    const { car, screen } = markers.hijackTarget;
    const { x, y } = screen;
    if (x >= 90 && x <= 1190 && y >= 55 && y <= 650) {
      const label = `[F] CARJACK ${car.name}`;
      ctx.save();
      ctx.font = '700 11px "Segoe UI", sans-serif';
      const w = Math.max(168, ctx.measureText(label).width + 26);
      const px = x - w * 0.5;
      const py = y - 34;
      hijackPillRect = { x: px, y: py, w, h: 25 };
      drawFrostedGlassPanel(
        ctx,
        px,
        py,
        w,
        25,
        6,
        GLASS_BG_STRONG,
        'rgba(100, 188, 201, 0.42)'
      );
      ctx.fillStyle = ACCENT_CYAN;
      ctx.fillRect(px + 8, py + 6, 3, 13);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 3, py + 16);
      ctx.restore();
    }
  }

  // Projected [E] SHOP / STREET VENDOR prompt pill (anti-overlap protected against [F] CARJACK & Dossier)
  const nlOpen = Boolean(
    state.nightlife &&
      (state.nightlife.vipMenuOpen || state.nightlife.carMenuOpen || state.nightlife.session)
  );
  if (markers.shopTarget && !(state.shopModal && state.shopModal.open) && !nlOpen && !markers.vipTarget) {
    const { shop, screen } = markers.shopTarget;
    const label = `[E] ${shop.promptShort || shop.name}`;
    const accent = SHOP_RADAR_COLORS[shop.kind] || ACCENT_GOLD;
    ctx.save();
    ctx.font = '700 11px "Segoe UI", sans-serif';
    const w = Math.max(198, ctx.measureText(label).width + 28);

    const maxSafeX = state.safehouseModalOpen ? 614 : 1245;
    let px = 640 - w * 0.5;
    let py = 650;

    if (screen && screen.y >= 78 && screen.y <= 645 && screen.x >= -40 && screen.x <= 1320) {
      px = Math.max(24, Math.min(maxSafeX - w, screen.x - w * 0.5));
      py = Math.max(82, screen.y - 34);
      // Avoid overlapping [F] CARJACK pill if both are nearby
      if (
        hijackPillRect &&
        px < hijackPillRect.x + hijackPillRect.w + 8 &&
        px + w + 8 > hijackPillRect.x &&
        py < hijackPillRect.y + hijackPillRect.h + 8 &&
        py + 26 + 8 > hijackPillRect.y
      ) {
        py = Math.max(82, hijackPillRect.y - 36);
      }
    } else if (state.safehouseModalOpen) {
      px = Math.max(24, Math.min(maxSafeX - w, 360 - w * 0.5));
      py = 310;
    }

    drawFrostedGlassPanel(ctx, px, py, w, 26, 6, GLASS_BG_STRONG, accent);
    ctx.fillStyle = accent;
    ctx.fillRect(px + 8, py + 6, 3, 14);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.textAlign = 'center';
    ctx.fillText(label, px + w * 0.5 + 3, py + 17);
    ctx.restore();
  }

  // Club Eclipse 21+ VIP Private Suite prompt, Disco Dance prompt & Nightlife Companion prompt
  if (state.nightlife && !nlOpen && !(state.shopModal && state.shopModal.open) && !state.safehouseModalOpen) {
    const nl = state.nightlife;
    let promptLabel = null;
    let promptAccent = '#d97c8c';
    if (nl.nearVipLounge) {
      promptLabel = '[E] CLUB ECLIPSE VIP PRIVATE SUITE • 21+ ($100 / $250)';
      promptAccent = '#d97c8c';
    } else if (state.player.vehicle && nl.companionInCar) {
      promptLabel = '[E / H] PRIVATE CAR SERVICE • 21+ ($50 / $120)';
      promptAccent = '#d97c8c';
    } else if (nl.nearCompanion && state.player.vehicle) {
      promptLabel = '[H / E] HONK TO INVITE NIGHTLIFE COMPANION INTO CAR';
      promptAccent = '#c988b8';
    } else if (nl.inClub && !state.player.vehicle) {
      promptLabel = nl.dancing
        ? '[G] STOP DANCING • CLUB ECLIPSE DISCO'
        : '[G] DANCE ON CLUB ECLIPSE DISCO FLOOR';
      promptAccent = '#c988b8';
    }

    if (promptLabel) {
      ctx.save();
      ctx.font = '700 11.5px "Segoe UI", sans-serif';
      const w = Math.max(260, ctx.measureText(promptLabel).width + 32);
      const px = Math.round(640 - w * 0.5);
      const py = 648;
      drawFrostedGlassPanel(ctx, px, py, w, 28, 6, GLASS_BG_STRONG, promptAccent);
      ctx.fillStyle = promptAccent;
      ctx.fillRect(px + 8, py + 6, 3, 16);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'center';
      ctx.fillText(promptLabel, 643, py + 18);
      ctx.restore();
    }
  }

  // Projected Armored Boss Health Bar above Syndicate Goliath Convoy
  if (hasBossBar) {
    const { entity, screen } = markers.convoyBoss;
    const { x, y } = screen;
    if (x >= 100 && x <= 1180 && y >= 50 && y <= 640) {
      const hpRatio = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
      const dist = Math.round(Math.hypot(state.player.x - entity.x, state.player.y - entity.y));
      ctx.save();
      drawFrostedGlassPanel(
        ctx,
        x - 104,
        y - 46,
        208,
        34,
        6,
        GLASS_BG_STRONG,
        'rgba(224, 178, 104, 0.45)'
      );
      ctx.fillStyle = ACCENT_GOLD;
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ARMORED BULLION CONVOY • ${dist}m`, x, y - 31);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x - 88, y - 23, 176, 6);
      ctx.fillStyle = ACCENT_ALERT;
      ctx.fillRect(x - 88, y - 23, 176 * hpRatio, 6);
      ctx.restore();
    }
  }
}

function renderTopLeftMissionPill(ctx, state) {
  const active = state.missions.activeMission;
  const compact = (state.settings && state.settings.hudDensity) === 'COMPACT';
  if (!active && !state.customWaypoint) return;

  if (active) {
    const dist = Math.round(
      Math.hypot(state.player.x - active.targetX, state.player.y - active.targetY)
    );
    const pillH = compact ? 34 : 54;
    drawFrostedGlassPanel(ctx, 20, 16, 456, pillH, 8, GLASS_BG, GLASS_BORDER);

    ctx.fillStyle = ACCENT_GOLD;
    ctx.fillRect(29, 23, 3, pillH - 14);

    ctx.fillStyle = ACCENT_CYAN;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${active.code} • ${active.title}`, 40, 34);

    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`GPS ${dist}m`, 460, 34);

    if (!compact) {
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '500 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(active.objective, 40, 54);
    }
  }

  if (state.customWaypoint) {
    const wpDist = Math.round(
      Math.hypot(state.player.x - state.customWaypoint.x, state.player.y - state.customWaypoint.y)
    );
    const wy = active ? (compact ? 56 : 76) : 16;
    drawFrostedGlassPanel(ctx, 20, wy, 228, 26, 6, GLASS_BG_STRONG, 'rgba(100, 188, 201, 0.52)');
    ctx.fillStyle = ACCENT_CYAN;
    ctx.fillRect(28, wy + 6, 3, 14);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CUSTOM WAYPOINT • ${wpDist}m`, 38, wy + 17);
  }
}

function renderTopRightStatusCluster(ctx, state) {
  const { player, wanted } = state;
  const weapon = player.vehicle ? getDriveByWeapon(player) : WEAPONS[player.weaponIndex] || WEAPONS[0];
  const clock = getWorldClockInfo(state.worldTime);
  const isEvading = Boolean(wanted.stars > 0 && wanted.evading);
  const panelH = isEvading ? 104 : 84;

  drawFrostedGlassPanel(
    ctx,
    968,
    16,
    292,
    panelH,
    8,
    GLASS_BG,
    wanted.stars > 0 ? 'rgba(224, 178, 104, 0.35)' : GLASS_BORDER
  );

  // 5-Star Wanted Level row (flashes subtly when evading)
  const evadeAlpha = isEvading ? 0.45 + 0.55 * Math.abs(Math.sin((state.time || 0) * 6.5)) : 1;
  for (let s = 1; s <= 5; s++) {
    const active = s <= wanted.stars;
    const sx = 990 + (s - 1) * 22;
    ctx.font = '800 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    if (active) {
      ctx.save();
      ctx.globalAlpha = evadeAlpha;
      const flashWarm = Math.sin(wanted.sirenTimer) >= 0;
      ctx.fillStyle = isEvading ? ACCENT_CYAN : flashWarm ? ACCENT_GOLD : ACCENT_ALERT;
      ctx.fillText('★', sx, 39);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(154, 168, 184, 0.24)';
      ctx.fillText('★', sx, 39);
    }
  }

  // Police Tactical Scanner Status Tag + World Clock Pill
  if (wanted.stars > 0) {
    const isRed = Math.sin(wanted.sirenTimer) >= 0;
    ctx.fillStyle = isEvading
      ? 'rgba(100, 188, 201, 0.20)'
      : isRed
        ? 'rgba(217, 91, 102, 0.20)'
        : 'rgba(100, 188, 201, 0.18)';
    ctx.fillRect(1104, 23, 140, 19);
    ctx.strokeStyle = isEvading
      ? ACCENT_CYAN
      : isRed
        ? 'rgba(217, 91, 102, 0.55)'
        : 'rgba(100, 188, 201, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1104, 23, 140, 19);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isEvading
        ? `EVADING ${wanted.stars}★`
        : wanted.stars >= 4
          ? 'VCPD CHOPPER + SWAT'
          : `VCPD PURSUIT ${wanted.stars}★`,
      1174,
      36
    );
  } else {
    ctx.fillStyle = clock.isNight ? ACCENT_CYAN : ACCENT_GOLD;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${clock.formatted} • ${clock.phase}`, 1244, 36);
  }

  // Calm Emerald Cash Counter
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '800 20px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`$${player.cash.toLocaleString()}`, 984, 65);

  // Equipped Weapon & Live Mag / Reserve Ammo Badge
  const curMag =
    player.weaponMag && typeof player.weaponMag[weapon.id] === 'number'
      ? player.weaponMag[weapon.id]
      : weapon.magSize || 0;
  const reserveAmmo =
    player.weaponAmmo && typeof player.weaponAmmo[weapon.id] === 'number'
      ? player.weaponAmmo[weapon.id]
      : weapon.ammo;
  const weaponReadout = weapon.isMelee
    ? `${weapon.shortName} • UNARMED`
    : (player.reloadTimer || 0) > 0
      ? `${weapon.shortName} • RELOADING`
      : `${weapon.shortName} • ${curMag} / ${reserveAmmo}`;
  ctx.fillStyle = weapon.color || ACCENT_CYAN;
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(weaponReadout, 1244, 64);

  if (isEvading) {
    const dur = Math.max(1, wanted.evadeDuration || 15);
    const rem = Math.max(0, Math.ceil(dur - (wanted.evadeTimer || 0)));
    const ratio = Math.max(0, Math.min(1, (wanted.evadeTimer || 0) / dur));
    ctx.fillStyle = ACCENT_CYAN;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`EVADING • CLEAR IN ${rem}s`, 984, 88);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(984, 96, 260, 6);
    ctx.fillStyle = ACCENT_EMERALD;
    ctx.fillRect(984, 96, 260 * ratio, 6);
  } else {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${clock.formatted} ${clock.phase}`, 984, 86);
    ctx.textAlign = 'right';
    ctx.fillText('[P] HUB  [M] MAP  [R] RELOAD', 1244, 86);
  }
}

function renderBottomLeftRadar(ctx, state) {
  const { player, cityMap, vehicles, wanted, missions } = state;
  const cx = 104;
  const cy = 576;
  const r = 70;
  const scale = 0.085;

  // Sleek Dark-Slate Radar Outer Bezel
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 17, 25, 0.86)';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle =
    wanted.stars > 0
      ? Math.sin(wanted.sirenTimer) >= 0
        ? 'rgba(217, 91, 102, 0.72)'
        : 'rgba(100, 188, 201, 0.72)'
      : 'rgba(255, 255, 255, 0.22)';
  ctx.stroke();

  // Clip inside radar disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#121924';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Rotate radar relative to player / camera heading
  const heading =
    state.camera && typeof state.camera.yaw === 'number' && !state.camera.overridePose
      ? state.camera.yaw
      : player.vehicle
        ? player.vehicle.angle
        : player.angle;
  ctx.translate(cx, cy);
  ctx.rotate(-heading - Math.PI * 0.5);

  // Muted Tropical Ocean on right of coast + Starfish Island + 2 Causeway Bridges
  const oceanDx = (COAST_X - player.x) * scale;
  ctx.fillStyle = 'rgba(44, 126, 144, 0.42)';
  ctx.fillRect(oceanDx, -1200, 1400, 2600);

  // Starfish Island Landmass & Causeway Bridges on Radar
  ctx.fillStyle = 'rgba(72, 90, 108, 0.85)';
  ctx.fillRect(
    (ISLAND_X1 - player.x) * scale,
    (ISLAND_Y1 - player.y) * scale,
    (ISLAND_X2 - ISLAND_X1) * scale,
    (ISLAND_Y2 - ISLAND_Y1) * scale
  );
  ctx.fillStyle = 'rgba(130, 142, 156, 0.72)';
  for (const bY of CAUSEWAY_YS) {
    ctx.fillRect(
      (2720 - player.x) * scale,
      (bY - 32 - player.y) * scale,
      (ISLAND_X1 - 2720 + 60) * scale,
      64 * scale
    );
  }

  // City Blocks on radar
  ctx.fillStyle = 'rgba(68, 82, 100, 0.78)';
  for (const b of cityMap.buildings) {
    const bx = (b.x - player.x) * scale;
    const by = (b.y - player.y) * scale;
    if (Math.abs(bx) > 130 && Math.abs(by) > 130) continue;
    ctx.fillRect(bx, by, b.w * scale, b.h * scale);
  }

  // Warm-Gold GPS Route Path + Custom Waypoint Cyan-Gold Path
  if (missions.gpsPoints && missions.gpsPoints.length >= 2) {
    ctx.strokeStyle = ACCENT_GOLD;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < missions.gpsPoints.length; i++) {
      const pt = missions.gpsPoints[i];
      const gx = (pt.x - player.x) * scale;
      const gy = (pt.y - player.y) * scale;
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();
  }
  if (state.customWaypointGps && state.customWaypointGps.length >= 2) {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = ACCENT_CYAN;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < state.customWaypointGps.length; i++) {
      const pt = state.customWaypointGps[i];
      const gx = (pt.x - player.x) * scale;
      const gy = (pt.y - player.y) * scale;
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Translucent Crimson-Blue Police Vision Sight-Cones on Radar Minimap
  if (wanted && wanted.sightCones) {
    for (const cone of wanted.sightCones) {
      const sx = (cone.x - player.x) * scale;
      const sy = (cone.y - player.y) * scale;
      const rad = cone.range * scale;
      if (Math.hypot(sx, sy) > r + rad) continue;
      ctx.beginPath();
      if (cone.kind === 'heli') {
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      } else {
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, rad, cone.angle - cone.halfAngle, cone.angle + cone.halfAngle);
        ctx.closePath();
      }
      ctx.fillStyle = cone.kind === 'heli' ? 'rgba(224, 178, 104, 0.22)' : 'rgba(217, 91, 102, 0.24)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 188, 201, 0.50)';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }
  }

  // Distinct Violet-Gold Club Eclipse Nightclub ♪ Icon on Radar
  const clubX = (CLUB_ECLIPSE_BOUNDS.centerX - player.x) * scale;
  const clubY = (CLUB_ECLIPSE_BOUNDS.centerY - player.y) * scale;
  if (clubX * clubX + clubY * clubY <= (r - 6) * (r - 6)) {
    ctx.fillStyle = '#c988b8';
    ctx.beginPath();
    ctx.arc(clubX, clubY, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ACCENT_GOLD;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#121924';
    ctx.font = '800 8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', clubX, clubY + 3);
  }

  // Interactive Shop & Street Vendor Color-Coded Icons on Radar
  if (cityMap.shops) {
    for (const s of cityMap.shops) {
      const sx = (s.x - player.x) * scale;
      const sy = (s.y - player.y) * scale;
      if (sx * sx + sy * sy > (r - 6) * (r - 6)) continue;
      ctx.fillStyle = SHOP_RADAR_COLORS[s.kind] || ACCENT_GOLD;
      ctx.fillRect(sx - 3.2, sy - 3.2, 6.4, 6.4);
      ctx.strokeStyle = 'rgba(12, 17, 25, 0.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 3.2, sy - 3.2, 6.4, 6.4);
    }
  }

  // Vehicle & Police Blips
  for (const v of vehicles) {
    if (v.destroyed || v === player.vehicle) continue;
    const vx = (v.x - player.x) * scale;
    const vy = (v.y - player.y) * scale;
    if (vx * vx + vy * vy > (r - 6) * (r - 6)) continue;
    ctx.fillStyle = v.isPolice ? ACCENT_ALERT : ACCENT_CYAN;
    ctx.beginPath();
    ctx.arc(vx, vy, v.isPolice ? 3.5 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active Mission Target Blip
  if (missions.activeMission) {
    const tx = (missions.activeMission.targetX - player.x) * scale;
    const ty = (missions.activeMission.targetY - player.y) * scale;
    const dist = Math.hypot(tx, ty);
    const clampedDist = Math.min(r - 8, dist);
    const ang = Math.atan2(ty, tx);
    const bx = Math.cos(ang) * clampedDist;
    const by = Math.sin(ang) * clampedDist;

    ctx.fillStyle = ACCENT_GOLD;
    ctx.beginPath();
    ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Custom Waypoint Pin Blip on Radar Edge
  if (state.customWaypoint) {
    const wx = (state.customWaypoint.x - player.x) * scale;
    const wy = (state.customWaypoint.y - player.y) * scale;
    const dist = Math.hypot(wx, wy);
    const clampedDist = Math.min(r - 8, dist);
    const ang = Math.atan2(wy, wx);
    const bx = Math.cos(ang) * clampedDist;
    const by = Math.sin(ang) * clampedDist;

    ctx.fillStyle = ACCENT_CYAN;
    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ACCENT_GOLD;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();

  // Center Player Directional Arrow on Radar
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.beginPath();
  ctx.moveTo(0, -6.5);
  ctx.lineTo(5, 5.5);
  ctx.lineTo(0, 2.8);
  ctx.lineTo(-5, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // North 'N' badge on Radar Ring
  const northAng = -heading - Math.PI * 0.5;
  const nx = cx + Math.cos(northAng) * (r + 2);
  const ny = cy + Math.sin(northAng) * (r + 2);
  ctx.fillStyle = 'rgba(12, 17, 25, 0.94)';
  ctx.beginPath();
  ctx.arc(nx, ny, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GLASS_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '700 9.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + 3.2);

  // Frosted Status Tray below Radar (Health / Armor / Nitro + District Tag)
  drawFrostedGlassPanel(ctx, 20, 654, 224, 36, 6, GLASS_BG, GLASS_BORDER);

  const barX = 30;
  const barY = 661;
  const maxHp = player.maxHp || 100;
  const hpRatio = Math.max(0, Math.min(1, player.hp / 100));
  const overhealRatio = Math.max(0, Math.min(1, (player.hp - 100) / 25));
  const armorRatio = Math.max(0, Math.min(1, player.armor / 100));
  const nitroRatio = player.vehicle ? Math.max(0, Math.min(1, player.vehicle.nitro / 100)) : 1;

  // Health Bar (Calm Emerald + Rose-Gold 125 HP Overheal Cap)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, barY, 68, 6);
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.fillRect(barX, barY, 68 * hpRatio, 6);
  if (maxHp > 100 && overhealRatio > 0) {
    ctx.fillStyle = '#e08ca4';
    ctx.fillRect(barX, barY, 68 * overhealRatio, 2.5);
  }

  // Armor Bar (Muted Coastal Cyan)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX + 74, barY, 68, 6);
  ctx.fillStyle = ACCENT_CYAN;
  ctx.fillRect(barX + 74, barY, 68 * armorRatio, 6);

  // Nitro Bar (Warm Champagne Gold)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX + 148, barY, 56, 6);
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillRect(barX + 148, barY, 56 * nitroRatio, 6);

  const district = getDistrictAt(player.x, player.y);
  ctx.fillStyle = district.accent || ACCENT_GOLD;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ ${district.name}`, barX, 682);
}

function renderBottomRightTelemetry(ctx, state) {
  const { player } = state;
  const station = RADIO_STATIONS[player.radioIndex] || RADIO_STATIONS[0];

  drawFrostedGlassPanel(ctx, 964, 574, 296, 114, 8, GLASS_BG, GLASS_BORDER);

  if (player.vehicle) {
    const v = player.vehicle;
    const mph = Math.round(v.speed * 0.48);
    const rpmRatio = Math.min(1, Math.max(0.08, v.rpm || v.speed / v.maxSpeed));
    const gear = v.gear === 0 ? 'R' : `G${v.gear || 1}`;

    // Sleek Radial Arc Tachometer
    const gx = 1020;
    const gy = 630;
    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, 32, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gx, gy, 32, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * rpmRatio);
    ctx.lineWidth = 5;
    ctx.strokeStyle = v.nitroActive ? ACCENT_CYAN : ACCENT_GOLD;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gear, gx, gy + 4);

    // Digital MPH Speed Readout
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '800 30px "Consolas", "Segoe UI", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${mph}`, 1068, 619);

    ctx.fillStyle = v.nitroActive ? ACCENT_CYAN : TEXT_MUTED;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(v.nitroActive ? 'MPH • NITRO' : 'MPH', 1130, 617);

    // Vehicle Name & Category
    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`${v.name} (${v.category})`, 1068, 636);

    // Active Drive-By Weapon Badge & Vehicle Cam Preset Indicator
    const dbW = getDriveByWeapon(player);
    const dbMag = player.weaponMag ? (player.weaponMag[dbW.id] ?? 0) : dbW.magSize;
    const dbRes = player.weaponAmmo ? (player.weaponAmmo[dbW.id] ?? 0) : dbW.ammo;
    const camNames = ['CLOSE', 'STANDARD', 'FAR', 'HOOD'];
    const camIdx = (state.camera && state.camera.vehCamPreset !== undefined) ? state.camera.vehCamPreset : 1;
    const camLabel = camNames[camIdx] || 'STANDARD';
    ctx.fillStyle = (player.reloadTimer || 0) > 0 ? ACCENT_GOLD : ACCENT_CYAN;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText(
      (player.reloadTimer || 0) > 0
        ? `DRIVE-BY • ${dbW.shortName} • RELOADING`
        : `DRIVE-BY • ${dbW.shortName} • ${dbMag}/${dbRes}`,
      1068,
      653
    );

    ctx.fillStyle = (state.camera && (state.camera.vehCamLabelTimer || 0) > 0) ? ACCENT_GOLD : TEXT_MUTED;
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`CAM: ${camLabel} [V]`, 1246, 675);

    // Radio Station Ticker
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`♪ ${station.name}`, 980, 675);
  } else {
    // On-Foot Tactical Arsenal Display (6 Slots + Live Mag/Reserve Ammo Readout)
    const activeW = WEAPONS[player.weaponIndex] || WEAPONS[1];
    const curMag =
      player.weaponMag && typeof player.weaponMag[activeW.id] === 'number'
        ? player.weaponMag[activeW.id]
        : activeW.magSize || 0;
    const reserve =
      player.weaponAmmo && typeof player.weaponAmmo[activeW.id] === 'number'
        ? player.weaponAmmo[activeW.id]
        : activeW.ammo;

    ctx.fillStyle = activeW.color || ACCENT_CYAN;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(activeW.name, 978, 595);

    ctx.textAlign = 'right';
    if (activeW.isMelee) {
      ctx.fillStyle = '#e6c5a3';
      ctx.font = '800 12.5px "Consolas", "Segoe UI", monospace';
      ctx.fillText('MELEE • UNARMED', 1246, 596);
    } else if ((player.reloadTimer || 0) > 0) {
      ctx.fillStyle = ACCENT_GOLD;
      ctx.font = '800 12.5px "Segoe UI", sans-serif';
      ctx.fillText('RELOADING...', 1246, 596);
    } else {
      const lowClip = curMag > 0 && curMag <= Math.max(1, Math.ceil(activeW.magSize * 0.3));
      ctx.fillStyle = curMag === 0 ? ACCENT_ALERT : lowClip ? ACCENT_GOLD : ACCENT_EMERALD;
      ctx.font = '800 15.5px "Consolas", "Segoe UI", monospace';
      ctx.fillText(`${curMag} / ${reserve}`, 1246, 596);
    }

    const slotShort = {
      fists: 'FISTS',
      pistol: 'PISTOL',
      smg: 'SMG',
      shotgun: '12G',
      carbine: 'V-416',
      rpg: 'RPG'
    };

    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const active = i === player.weaponIndex;
      const sx = 978 + i * 45;
      ctx.fillStyle = active ? 'rgba(224, 178, 104, 0.24)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(sx, 606, 41, 44);
      ctx.strokeStyle = active ? ACCENT_GOLD : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = active ? 1.4 : 1;
      ctx.strokeRect(sx, 606, 41, 44);

      ctx.fillStyle = active ? ACCENT_GOLD : TEXT_MUTED;
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, sx + 20.5, 617);

      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      ctx.fillText(slotShort[w.id] || w.id.toUpperCase(), sx + 20.5, 630);

      const m = player.weaponMag && typeof player.weaponMag[w.id] === 'number' ? player.weaponMag[w.id] : w.magSize || 0;
      const r = player.weaponAmmo && typeof player.weaponAmmo[w.id] === 'number' ? player.weaponAmmo[w.id] : w.ammo;
      const total = w.isMelee ? 'INF' : `${m + r}`;
      ctx.fillStyle = !w.isMelee && m + r === 0 ? ACCENT_ALERT : active ? ACCENT_EMERALD : TEXT_MUTED;
      ctx.font = '700 8.5px "Consolas", "Segoe UI", monospace';
      ctx.fillText(total, sx + 20.5, 644);
    }

    if ((player.reloadTimer || 0) > 0 && activeW.reloadTime > 0) {
      const p = 1 - Math.max(0, Math.min(1, player.reloadTimer / activeW.reloadTime));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(978, 662, 268, 7);
      ctx.fillStyle = ACCENT_CYAN;
      ctx.fillRect(978, 662, 268 * p, 7);
    } else {
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '500 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('[R] RELOAD • [V] PUNCH • [RMB] ADS', 978, 673);
    }
  }
}

function renderCenterEventBanner(ctx, banner) {
  ctx.save();
  drawFrostedGlassPanel(
    ctx,
    394,
    90,
    492,
    52,
    8,
    GLASS_BG_STRONG,
    banner.color || ACCENT_GOLD
  );
  ctx.fillStyle = banner.color || ACCENT_GOLD;
  ctx.font = '800 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(banner.title, 640, 113);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '500 11px "Segoe UI", sans-serif';
  ctx.fillText(banner.subtitle, 640, 132);
  ctx.restore();
}

function renderSafehouseDossierModal(ctx, state) {
  const x = 628;
  const y = 108;
  const w = 630;
  const h = 556;

  drawFrostedGlassPanel(ctx, x, y, w, h, 10, GLASS_BG_STRONG, GLASS_BORDER);

  // Subtle top accent bar
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillRect(x + 24, y + 18, 42, 3);

  // Header strip
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '800 17px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STARFISH BAY SAFEHOUSE • CAREER & HEIST DOSSIER', x + 24, y + 40);

  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.fillText(
    `✓ ${state.lastSaveStatus || 'LOCALSTORAGE CAREER PERSISTENCE ACTIVE'}`,
    x + 24,
    y + 58
  );

  // Career Telemetry Summary Cards
  const stats = [
    { label: 'CAREER BANKROLL', val: `$${state.player.cash.toLocaleString()}`, col: ACCENT_EMERALD },
    {
      label: 'CAMPAIGN PROGRESS',
      val: `${state.missions.completedIds.length} / ${STORY_MISSIONS.length} COMPLETED`,
      col: ACCENT_CYAN
    },
    {
      label: 'ACTIVE RADIO',
      val: RADIO_STATIONS[state.player.radioIndex].name,
      col: ACCENT_GOLD
    }
  ];

  for (let i = 0; i < stats.length; i++) {
    const sx = x + 24 + i * 197;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(sx, y + 68, 187, 44);
    ctx.strokeStyle = GLASS_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, y + 68, 187, 44);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 9px "Segoe UI", sans-serif';
    ctx.fillText(stats[i].label, sx + 10, y + 84);

    ctx.fillStyle = stats[i].col;
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillText(stats[i].val, sx + 10, y + 102);
  }

  // 6 Story Missions List
  for (let i = 0; i < STORY_MISSIONS.length; i++) {
    const m = STORY_MISSIONS[i];
    const ry = y + 124 + i * 62;
    const isCompleted = state.missions.completedIds.includes(m.id);
    const isCurrent = state.missions.currentIndex === i;

    ctx.fillStyle = isCurrent
      ? 'rgba(224, 178, 104, 0.14)'
      : isCompleted
        ? 'rgba(99, 199, 146, 0.10)'
        : 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x + 24, ry, w - 48, 54);
    ctx.strokeStyle = isCurrent
      ? 'rgba(224, 178, 104, 0.65)'
      : isCompleted
        ? 'rgba(99, 199, 146, 0.45)'
        : GLASS_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 24, ry, w - 48, 54);

    // Thin status bar on left of row
    ctx.fillStyle = isCompleted ? ACCENT_EMERALD : isCurrent ? ACCENT_GOLD : TEXT_MUTED;
    ctx.fillRect(x + 24, ry, 3, 54);

    ctx.fillStyle = isCompleted ? ACCENT_EMERALD : isCurrent ? ACCENT_GOLD : ACCENT_CYAN;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${m.code}: ${m.title}`, x + 36, ry + 20);

    const statusBadge = isCompleted
      ? `COMPLETED • +$${m.reward.toLocaleString()}`
      : isCurrent
        ? `ACTIVE CONTRACT • $${m.reward.toLocaleString()}`
        : `PAYOUT $${m.reward.toLocaleString()}`;
    ctx.textAlign = 'right';
    ctx.fillText(statusBadge, x + w - 36, ry + 20);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(m.briefing, x + 36, ry + 41);
  }

  // Bottom Persistence & Reset Action Buttons
  drawFrostedGlassPanel(
    ctx,
    x + 24,
    y + 502,
    192,
    36,
    6,
    'rgba(99, 199, 146, 0.18)',
    'rgba(99, 199, 146, 0.55)'
  );
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[K] SAVE CAREER', x + 120, y + 524);

  drawFrostedGlassPanel(
    ctx,
    x + 226,
    y + 502,
    186,
    36,
    6,
    'rgba(224, 178, 104, 0.15)',
    'rgba(224, 178, 104, 0.50)'
  );
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillText('[N] NEW GAME RESET', x + 319, y + 524);

  drawFrostedGlassPanel(
    ctx,
    x + 422,
    y + 502,
    184,
    36,
    6,
    'rgba(100, 188, 201, 0.16)',
    'rgba(100, 188, 201, 0.52)'
  );
  ctx.fillStyle = ACCENT_CYAN;
  ctx.fillText('[TAB / M] RESUME WORLD', x + 514, y + 524);
}

function renderStartTitleScreen(ctx, state) {
  const layout = getStartScreenLayout();
  const { x, y, w, h, newGameRect, continueRect, loadSlotRect, settingsRect } = layout;
  const saved = state.hasSavedCareer ? getSavedCareerSummary() : null;

  ctx.save();
  // Subtle atmospheric scrim over live 3D Ocean Drive backdrop
  const scrim = ctx.createRadialGradient(640, 360, 160, 640, 360, 760);
  scrim.addColorStop(0, 'rgba(10, 14, 21, 0.16)');
  scrim.addColorStop(1, 'rgba(10, 14, 21, 0.58)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, 1280, 720);

  drawFrostedGlassPanel(ctx, x, y, w, h, 12, GLASS_BG_STRONG, 'rgba(224, 178, 104, 0.48)');

  // Warm gold top bar
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillRect(x + 28, y + 20, 58, 3.5);

  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THREE.JS WEBGL 2.0 OPEN-WORLD CRIME & DRIVING SANDBOX', x + 28, y + 44);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '800 26px "Segoe UI", sans-serif';
  ctx.fillText('SOLARIS BAY: VICE HORIZON 3D', x + 28, y + 78);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 11.5px "Segoe UI", sans-serif';
  ctx.fillText(
    '9 Districts • Walk-In 3D Shops • Club Eclipse 21+ • 6-Mission Heist Campaign',
    x + 28,
    y + 102
  );

  // Divider
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(x + 28, y + 116, w - 56, 1);

  // Button 1: NEW GAME
  const hoverNew = state.startScreenHover === 'new';
  drawFrostedGlassPanel(
    ctx,
    newGameRect.x,
    newGameRect.y,
    newGameRect.w,
    newGameRect.h,
    8,
    hoverNew ? 'rgba(224, 178, 104, 0.28)' : 'rgba(224, 178, 104, 0.16)',
    ACCENT_GOLD
  );
  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '800 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[ENTER] NEW GAME', newGameRect.x + newGameRect.w * 0.5, newGameRect.y + 26);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '500 10.5px "Segoe UI", sans-serif';
  ctx.fillText(
    'Fresh Career • $42,500 • Mission 01',
    newGameRect.x + newGameRect.w * 0.5,
    newGameRect.y + 44
  );

  // Button 2: CONTINUE CAREER
  const hoverCont = state.startScreenHover === 'continue' && Boolean(saved);
  drawFrostedGlassPanel(
    ctx,
    continueRect.x,
    continueRect.y,
    continueRect.w,
    continueRect.h,
    8,
    saved
      ? hoverCont
        ? 'rgba(99, 199, 146, 0.28)'
        : 'rgba(99, 199, 146, 0.16)'
      : 'rgba(255, 255, 255, 0.04)',
    saved ? ACCENT_EMERALD : GLASS_BORDER
  );
  ctx.fillStyle = saved ? ACCENT_EMERALD : TEXT_MUTED;
  ctx.font = '800 14px "Segoe UI", sans-serif';
  ctx.fillText('[C] CONTINUE CAREER', continueRect.x + continueRect.w * 0.5, continueRect.y + 26);
  ctx.fillStyle = saved ? TEXT_PRIMARY : TEXT_MUTED;
  ctx.font = '500 10.5px "Segoe UI", sans-serif';
  ctx.fillText(
    saved
      ? `$${saved.cash.toLocaleString()} • ${saved.completedCount}/6 Completed`
      : 'No Saved Career Found',
    continueRect.x + continueRect.w * 0.5,
    continueRect.y + 44
  );

  // Button 3: [L] LOAD SLOT & Button 4: [O] SETTINGS
  const hoverLoad = state.startScreenHover === 'load';
  drawFrostedGlassPanel(
    ctx,
    loadSlotRect.x,
    loadSlotRect.y,
    loadSlotRect.w,
    loadSlotRect.h,
    6,
    hoverLoad ? 'rgba(100, 188, 201, 0.26)' : 'rgba(100, 188, 201, 0.14)',
    ACCENT_CYAN
  );
  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 11.5px "Segoe UI", sans-serif';
  ctx.fillText('[L] LOAD SLOT (3 SLOTS)', loadSlotRect.x + loadSlotRect.w * 0.5, loadSlotRect.y + 21);

  const hoverSettings = state.startScreenHover === 'settings';
  drawFrostedGlassPanel(
    ctx,
    settingsRect.x,
    settingsRect.y,
    settingsRect.w,
    settingsRect.h,
    6,
    hoverSettings ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)',
    GLASS_BORDER
  );
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText('[O] SETTINGS & GRAPHICS', settingsRect.x + settingsRect.w * 0.5, settingsRect.y + 21);

  // Compact Controls Guide Box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.fillRect(x + 28, y + 244, w - 56, 178);
  ctx.strokeStyle = GLASS_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 28, y + 244, w - 56, 178);

  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONTROLS & SANDBOX GUIDE', x + 42, y + 266);

  const leftRows = [
    ['[CLICK]', 'Lock 3D Aim / Drive-By Fire'],
    ['[RMB HOLD]', 'Over-the-Shoulder ADS Zoom'],
    ['[WASD]', 'Drive Vehicle / Move On Foot'],
    ['[SPACE]', 'Jump / Handbrake Drift'],
    ['[SHIFT]', 'Sprint / Nitro Boost']
  ];
  const rightRows = [
    ['[F / ENTER]', 'Carjack / Exit Vehicle'],
    ['[E] / [V]', 'Shops / Punch / Car Cam'],
    ['[G] / [H]', 'Club Dance / Honk Companion'],
    ['[1-6 / R]', 'Weapons / Reload'],
    ['[P / M / X]', 'Pause Hub / Map / Radio']
  ];

  ctx.font = '600 10.5px "Segoe UI", sans-serif';
  for (let i = 0; i < leftRows.length; i++) {
    const ry = y + 292 + i * 25;
    ctx.fillStyle = ACCENT_GOLD;
    ctx.fillText(leftRows[i][0], x + 42, ry);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(leftRows[i][1], x + 124, ry);

    ctx.fillStyle = ACCENT_GOLD;
    ctx.fillText(rightRows[i][0], x + 306, ry);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(rightRows[i][1], x + 382, ry);
  }

  ctx.restore();
}

function renderShopOverlayDrawer(ctx, state) {
  const { shop, hoveredIndex, feedbackText, feedbackColor, feedbackTimer } = state.shopModal;
  const layout = getShopDrawerLayout(shop);
  if (!layout) return;

  const { x, y, w, h, itemRects, closeRect, catalog } = layout;
  const accent = catalog.accent || ACCENT_GOLD;

  ctx.save();
  drawFrostedGlassPanel(ctx, x, y, w, h, 10, GLASS_BG_STRONG, accent);

  // Top accent strip
  ctx.fillStyle = accent;
  ctx.fillRect(x + 20, y + 14, 46, 3);

  // Shop header & category
  ctx.fillStyle = accent;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(catalog.categoryLabel, x + 20, y + 32);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '800 17px "Segoe UI", sans-serif';
  ctx.fillText(shop.name, x + 20, y + 53);

  // Player cash & status readout top-right
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '800 16px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`$${state.player.cash.toLocaleString()}`, x + w - 20, y + 40);

  let statusLine = `HP ${Math.round(state.player.hp)}% • ARMOR ${Math.round(state.player.armor)}%`;
  if (shop.kind === 'garage') {
    const v = findTargetVehicleForGarage(state, shop);
    statusLine = v
      ? `${v.name} • HP ${Math.round((v.hp / v.maxHp) * 100)}%`
      : 'NO VEHICLE AT BAY';
  }
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '600 10px "Segoe UI", sans-serif';
  ctx.fillText(statusLine, x + w - 20, y + 57);

  // Subtle divider line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(x + 20, y + 72, w - 40, 1);

  // Shop item rows
  for (const r of itemRects) {
    const canAfford = state.player.cash >= r.item.price;
    const isHovered = hoveredIndex === r.index;
    const isEquippedOutfit =
      r.item.outfitId && state.player.outfitId === r.item.outfitId;

    ctx.fillStyle = isHovered
      ? 'rgba(255, 255, 255, 0.11)'
      : 'rgba(255, 255, 255, 0.045)';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.strokeStyle = isHovered ? accent : GLASS_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Key badge [1]..[5]
    ctx.fillStyle = canAfford ? 'rgba(224, 178, 104, 0.18)' : 'rgba(217, 91, 102, 0.14)';
    ctx.fillRect(r.x + 10, r.y + 13, 28, 28);
    ctx.strokeStyle = canAfford ? accent : ACCENT_ALERT;
    ctx.strokeRect(r.x + 10, r.y + 13, 28, 28);

    ctx.fillStyle = canAfford ? accent : ACCENT_ALERT;
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${r.index + 1}`, r.x + 24, r.y + 31);

    // Item title & effect subtitle
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 12.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      isEquippedOutfit ? `${r.item.name} (WORN)` : r.item.name,
      r.x + 48,
      r.y + 23
    );

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.fillText(r.item.effectLabel, r.x + 48, r.y + 41);

    // Price pill
    ctx.fillStyle = canAfford ? ACCENT_EMERALD : ACCENT_ALERT;
    ctx.font = '800 14px "Consolas", "Segoe UI", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${r.item.price.toLocaleString()}`, r.x + r.w - 14, r.y + 32);
  }

  // Footer status / hint + Close button
  if (feedbackTimer > 0 && feedbackText) {
    ctx.fillStyle = feedbackColor || ACCENT_EMERALD;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(feedbackText, x + 20, y + h - 23);
  } else {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRESS [1-5] OR CLICK ITEM TO PURCHASE', x + 20, y + h - 23);
  }

  drawFrostedGlassPanel(
    ctx,
    closeRect.x,
    closeRect.y,
    closeRect.w,
    closeRect.h,
    5,
    'rgba(255, 255, 255, 0.08)',
    GLASS_BORDER
  );
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[E / ESC] CLOSE', closeRect.x + closeRect.w * 0.5, closeRect.y + 18);
  ctx.restore();
}

function renderNightlifeMenuDrawer(ctx, state) {
  const nl = state.nightlife;
  const mode = nl.vipMenuOpen ? 'vip' : 'car';
  const layout = getNightlifeMenuLayout(mode);
  const { x, y, w, h, itemRects, closeRect } = layout;
  const accent = '#d97c8c';

  ctx.save();
  drawFrostedGlassPanel(ctx, x, y, w, h, 10, GLASS_BG_STRONG, accent);

  ctx.fillStyle = accent;
  ctx.fillRect(x + 20, y + 14, 48, 3);

  ctx.fillStyle = accent;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    mode === 'vip' ? 'CLUB ECLIPSE • 21+ VIP PRIVATE SUITE' : 'PRIVATE CAR SERVICE • 21+ NIGHTLIFE',
    x + 20,
    y + 32
  );

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '800 17px "Segoe UI", sans-serif';
  ctx.fillText(
    mode === 'vip' ? 'VELVET VIP LOUNGE EXPERIENCE' : 'BACKSEAT & PASSENGER SERVICE',
    x + 20,
    y + 53
  );

  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '800 16px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`$${state.player.cash.toLocaleString()}`, x + w - 20, y + 40);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '600 10px "Segoe UI", sans-serif';
  ctx.fillText(
    `HP ${Math.round(state.player.hp)}/${state.player.maxHp || 100} • ARMOR ${Math.round(state.player.armor)}%`,
    x + w - 20,
    y + 57
  );

  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(x + 20, y + 72, w - 40, 1);

  for (const r of itemRects) {
    const canAfford = state.player.cash >= r.item.price;
    const isHovered = nl.hoveredIndex === r.index;
    ctx.fillStyle = isHovered ? 'rgba(217, 124, 140, 0.16)' : 'rgba(255, 255, 255, 0.045)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = isHovered ? accent : GLASS_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = canAfford ? 'rgba(217, 124, 140, 0.22)' : 'rgba(217, 91, 102, 0.14)';
    ctx.fillRect(r.x + 10, r.y + 15, 28, 28);
    ctx.strokeStyle = canAfford ? accent : ACCENT_ALERT;
    ctx.strokeRect(r.x + 10, r.y + 15, 28, 28);

    ctx.fillStyle = canAfford ? accent : ACCENT_ALERT;
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${r.index + 1}`, r.x + 24, r.y + 33);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 12.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r.item.name, r.x + 48, r.y + 24);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.fillText(r.item.effectLabel, r.x + 48, r.y + 43);

    ctx.fillStyle = canAfford ? ACCENT_EMERALD : ACCENT_ALERT;
    ctx.font = '800 14px "Consolas", "Segoe UI", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${r.item.price.toLocaleString()}`, r.x + r.w - 14, r.y + 34);
  }

  if (nl.feedbackTimer > 0 && nl.feedbackText) {
    ctx.fillStyle = nl.feedbackColor || ACCENT_ALERT;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(nl.feedbackText, x + 20, y + h - 23);
  } else {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRESS [1-2] OR CLICK OPTION • ADULTS 21+', x + 20, y + h - 23);
  }

  drawFrostedGlassPanel(
    ctx,
    closeRect.x,
    closeRect.y,
    closeRect.w,
    closeRect.h,
    5,
    'rgba(255, 255, 255, 0.08)',
    GLASS_BORDER
  );
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 10.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[E / ESC] CLOSE', closeRect.x + closeRect.w * 0.5, closeRect.y + 18);
  ctx.restore();
}

function renderActiveNightlifeSessionHud(ctx, state) {
  const s = state.nightlife.session;
  if (!s) return;

  ctx.save();
  // Steamy crimson-amber vignette framing the intimate scene
  const vig = ctx.createRadialGradient(640, 360, 220, 640, 360, 740);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(84, 18, 34, 0.44)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 1280, 720);

  // Pleasure / Climax Meter & Adult Dialogue Card at Bottom Center
  const w = 520;
  const h = 104;
  const x = Math.round(640 - w * 0.5);
  const y = 576;
  drawFrostedGlassPanel(ctx, x, y, w, h, 8, GLASS_BG_STRONG, '#d97c8c');

  ctx.fillStyle = '#e08ca4';
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    s.mode.startsWith('vip')
      ? 'CLUB ECLIPSE • 21+ VIP PRIVATE SUITE'
      : 'PRIVATE CAR SESSION • 21+ BACKSEAT',
    x + 18,
    y + 22
  );

  ctx.fillStyle = ACCENT_GOLD;
  ctx.textAlign = 'right';
  ctx.fillText(`PLEASURE ${Math.round(s.progress)}%`, x + w - 18, y + 22);

  // Dialogue line
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '600 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(s.dialogueText || '', x + 18, y + 44);

  // Animated Pleasure / Climax Bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x + 18, y + 54, w - 36, 12);
  const barGrad = ctx.createLinearGradient(x + 18, 0, x + w - 18, 0);
  barGrad.addColorStop(0, '#c96884');
  barGrad.addColorStop(1, '#e0b268');
  ctx.fillStyle = barGrad;
  ctx.fillRect(x + 18, y + 54, (w - 36) * Math.min(1, s.progress / 100), 12);

  // Rhythm Boost & Exit controls
  ctx.fillStyle = '#e0b268';
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('[SPACE] TAP RHYTHM BOOST', x + 18, y + 88);

  ctx.fillStyle = TEXT_MUTED;
  ctx.textAlign = 'right';
  ctx.fillText('[ESC] FINISH EARLY', x + w - 18, y + 88);
  ctx.restore();
}

function renderEngineFireWarning(ctx, v, time) {
  const pulse = 0.55 + 0.45 * Math.sin(time * 16);
  ctx.save();
  drawFrostedGlassPanel(
    ctx,
    380,
    90,
    520,
    46,
    8,
    `rgba(110, 20, 28, ${0.72 + pulse * 0.2})`,
    ACCENT_ALERT
  );
  ctx.fillStyle = '#ff6b78';
  ctx.font = '800 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `ENGINE ON FIRE — BAIL OUT [F]! (${Math.max(0, v.fireTimer || 0).toFixed(1)}s)`,
    640,
    118
  );
  ctx.restore();
}

function renderBustProgressWarning(ctx, bustMeter, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 12);
  ctx.save();
  drawFrostedGlassPanel(
    ctx,
    440,
    92,
    400,
    46,
    8,
    GLASS_BG_STRONG,
    pulse > 0.5 ? ACCENT_ALERT : ACCENT_CYAN
  );
  ctx.fillStyle = pulse > 0.5 ? '#ff6b78' : ACCENT_CYAN;
  ctx.font = '800 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`BUSTED • VCPD APPREHENSION ${Math.round(bustMeter * 100)}%`, 640, 112);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(468, 121, 344, 8);
  ctx.fillStyle = pulse > 0.5 ? ACCENT_ALERT : ACCENT_CYAN;
  ctx.fillRect(468, 121, 344 * Math.min(1, bustMeter), 8);
  ctx.restore();
}

function renderOutcomeOverlay(ctx, outcome) {
  const isWasted = outcome.type === 'wasted';
  const progress = 1 - Math.max(0, outcome.timer / (outcome.duration || 3.4));
  const fade = Math.min(1, progress * 3.2);

  ctx.save();
  // Desaturated dark-slate vignette
  ctx.fillStyle = `rgba(14, 19, 27, ${0.38 * fade})`;
  ctx.fillRect(0, 0, 1280, 720);
  const vig = ctx.createRadialGradient(640, 360, 160, 640, 360, 760);
  vig.addColorStop(0, 'rgba(12, 16, 24, 0.12)');
  vig.addColorStop(1, `rgba(8, 11, 17, ${0.78 * fade})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 1280, 720);

  const bw = 580;
  const bh = 132;
  const bx = Math.round(640 - bw * 0.5);
  const by = 290;
  const accent = isWasted ? ACCENT_ALERT : ACCENT_CYAN;

  drawFrostedGlassPanel(ctx, bx, by, bw, bh, 12, 'rgba(12, 17, 25, 0.90)', accent);
  ctx.fillStyle = accent;
  ctx.fillRect(bx + 24, by + 16, 64, 3.5);

  ctx.fillStyle = accent;
  ctx.font = '900 44px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isWasted ? 'WASTED' : 'BUSTED', 640, by + 68);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillText(
    isWasted
      ? `${outcome.targetLandmark.name} • MEDICAL FEE -$${outcome.fee.toLocaleString()}`
      : `${outcome.targetLandmark.name} • BAIL FEE -$${outcome.fee.toLocaleString()} • -25% AMMO CONFISCATED`,
    640,
    by + 104
  );
  ctx.restore();
}

function renderBottomControlStrip(ctx) {
  ctx.fillStyle = 'rgba(10, 14, 21, 0.76)';
  ctx.fillRect(0, 698, 1280, 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(0, 698, 1280, 1);
  ctx.fillStyle = '#bcc7d4';
  ctx.font = '500 9.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '[CLICK] AIM/DRIVE-BY  [RMB] ADS  [R] RELOAD  [V] PUNCH/CAM  [SPACE] JUMP/DRIFT  [1-6] WEAPONS  [F] CARJACK  [E] SHOPS  [P/ESC] HUB  [M] MAP  [TAB] DOSSIER',
    640,
    713
  );
}
