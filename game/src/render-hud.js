import { WEAPONS, RADIO_STATIONS, COAST_X } from './config.js';
import { getDistrictAt } from './city-map.js';
import { STORY_MISSIONS } from './missions-story.js';

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

export function renderHud2D(ctx, state) {
  ctx.clearRect(0, 0, 1280, 720);

  // 1. Diegetic 3D World-Space Screen Markers
  renderDiegeticWorldMarkers(ctx, state);

  // 2. Top-Left Slim Floating Mission Pill
  renderTopLeftMissionPill(ctx, state);

  // 3. Top-Right Compact Wanted Stars, Cash & Weapon Cluster
  renderTopRightStatusCluster(ctx, state);

  // 4. Bottom-Left Rotating Circular Radar Minimap & Status Bars
  renderBottomLeftRadar(ctx, state);

  // 5. Bottom-Right Sleek Automotive Tachometer / Tactical Arsenal
  if (!state.safehouseModalOpen) {
    renderBottomRightTelemetry(ctx, state);
  }

  // 6. Temporary Event Banner
  if (state.hudBanner && state.hudBanner.timer > 0) {
    renderCenterEventBanner(ctx, state.hudBanner);
  }

  // 7. Safehouse Career Dossier Modal
  if (state.safehouseModalOpen) {
    renderSafehouseDossierModal(ctx, state);
  }

  // 8. Slim Bottom-Edge Control Legend Bar
  renderBottomControlStrip(ctx);
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
  if (markers.hijackTarget && markers.hijackTarget.screen) {
    const { car, screen } = markers.hijackTarget;
    const { x, y } = screen;
    if (x >= 90 && x <= 1190 && y >= 55 && y <= 650) {
      const label = `[F] CARJACK ${car.name}`;
      ctx.save();
      ctx.font = '700 11px "Segoe UI", sans-serif';
      const w = Math.max(168, ctx.measureText(label).width + 26);
      drawFrostedGlassPanel(
        ctx,
        x - w * 0.5,
        y - 34,
        w,
        25,
        6,
        GLASS_BG_STRONG,
        'rgba(100, 188, 201, 0.42)'
      );
      ctx.fillStyle = ACCENT_CYAN;
      ctx.fillRect(x - w * 0.5 + 8, y - 28, 3, 13);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 3, y - 18);
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
  if (!active) return;

  const dist = Math.round(
    Math.hypot(state.player.x - active.targetX, state.player.y - active.targetY)
  );

  drawFrostedGlassPanel(ctx, 20, 16, 456, 54, 8, GLASS_BG, GLASS_BORDER);

  // Subtle warm-gold left accent bar
  ctx.fillStyle = ACCENT_GOLD;
  ctx.fillRect(29, 24, 3, 38);

  ctx.fillStyle = ACCENT_CYAN;
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${active.code} • ${active.title}`, 40, 34);

  ctx.fillStyle = ACCENT_GOLD;
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`GPS ${dist}m`, 460, 34);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '500 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(active.objective, 40, 54);
}

function renderTopRightStatusCluster(ctx, state) {
  const { player, wanted } = state;
  const weapon = WEAPONS[player.weaponIndex] || WEAPONS[0];

  drawFrostedGlassPanel(
    ctx,
    968,
    16,
    292,
    82,
    8,
    GLASS_BG,
    wanted.stars > 0 ? 'rgba(224, 178, 104, 0.35)' : GLASS_BORDER
  );

  // 5-Star Wanted Level row (calm gold / subtle crimson pulse)
  for (let s = 1; s <= 5; s++) {
    const active = s <= wanted.stars;
    const sx = 990 + (s - 1) * 22;
    ctx.font = '800 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    if (active) {
      const flashWarm = Math.sin(wanted.sirenTimer) >= 0;
      ctx.fillStyle = flashWarm ? ACCENT_GOLD : ACCENT_ALERT;
    } else {
      ctx.fillStyle = 'rgba(154, 168, 184, 0.24)';
    }
    ctx.fillText('★', sx, 39);
  }

  // Police Tactical Scanner Status Tag
  if (wanted.stars > 0) {
    const isRed = Math.sin(wanted.sirenTimer) >= 0;
    ctx.fillStyle = isRed ? 'rgba(217, 91, 102, 0.20)' : 'rgba(100, 188, 201, 0.18)';
    ctx.fillRect(1106, 23, 138, 19);
    ctx.strokeStyle = isRed ? 'rgba(217, 91, 102, 0.55)' : 'rgba(100, 188, 201, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1106, 23, 138, 19);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      wanted.stars >= 4 ? 'VCPD CHOPPER + SWAT' : `VCPD PURSUIT ${wanted.stars}★`,
      1175,
      36
    );
  } else {
    ctx.fillStyle = ACCENT_EMERALD;
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('CLEAR • 0★ HEAT', 1244, 36);
  }

  // Calm Emerald Cash Counter
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '800 20px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`$${player.cash.toLocaleString()}`, 984, 65);

  // Equipped Weapon & Ammo Badge
  ctx.fillStyle = weapon.color || ACCENT_CYAN;
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${weapon.shortName} • ${weapon.ammo} RDS`, 1244, 64);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 10px "Segoe UI", sans-serif';
  ctx.fillText('[1-5] WEAPONS  [TAB] SAFEHOUSE', 1244, 86);
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

  // Rotate radar relative to player heading
  const heading = player.vehicle ? player.vehicle.angle : player.angle;
  ctx.translate(cx, cy);
  ctx.rotate(-heading - Math.PI * 0.5);

  // Muted Tropical Ocean on right of coast
  const oceanDx = (COAST_X - player.x) * scale;
  ctx.fillStyle = 'rgba(44, 126, 144, 0.42)';
  ctx.fillRect(oceanDx, -1200, 800, 2400);

  // City Blocks on radar
  ctx.fillStyle = 'rgba(68, 82, 100, 0.78)';
  for (const b of cityMap.buildings) {
    const bx = (b.x - player.x) * scale;
    const by = (b.y - player.y) * scale;
    if (Math.abs(bx) > 130 && Math.abs(by) > 130) continue;
    ctx.fillRect(bx, by, b.w * scale, b.h * scale);
  }

  // Warm-Gold GPS Route Path
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
  const hpRatio = Math.max(0, Math.min(1, player.hp / 100));
  const armorRatio = Math.max(0, Math.min(1, player.armor / 100));
  const nitroRatio = player.vehicle ? Math.max(0, Math.min(1, player.vehicle.nitro / 100)) : 1;

  // Health Bar (Calm Emerald)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, barY, 68, 6);
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.fillRect(barX, barY, 68 * hpRatio, 6);

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

  drawFrostedGlassPanel(ctx, 996, 580, 264, 108, 8, GLASS_BG, GLASS_BORDER);

  if (player.vehicle) {
    const v = player.vehicle;
    const mph = Math.round(v.speed * 0.48);
    const rpmRatio = Math.min(1, v.speed / v.maxSpeed);
    const gear =
      mph < 15
        ? 'G1'
        : mph < 55
          ? 'G2'
          : mph < 95
            ? 'G3'
            : mph < 135
              ? 'G4'
              : mph < 175
                ? 'G5'
                : 'G6';

    // Sleek Radial Arc Tachometer
    const gx = 1046;
    const gy = 634;
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
    ctx.fillText(`${mph}`, 1094, 622);

    ctx.fillStyle = v.nitroActive ? ACCENT_CYAN : TEXT_MUTED;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(v.nitroActive ? 'MPH • NITRO' : 'MPH', 1154, 620);

    // Vehicle Name & Category
    ctx.fillStyle = ACCENT_GOLD;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`${v.name} (${v.category})`, 1094, 643);

    // Radio Station Ticker
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`♪ ${station.name}`, 1014, 675);
  } else {
    // On-Foot Tactical Arsenal Display
    ctx.fillStyle = ACCENT_CYAN;
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ON-FOOT TACTICAL MODE • 3D AIM', 1014, 601);

    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const active = i === player.weaponIndex;
      const sx = 1014 + i * 47;
      ctx.fillStyle = active ? 'rgba(224, 178, 104, 0.22)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(sx, 613, 42, 32);
      ctx.strokeStyle = active ? ACCENT_GOLD : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, 613, 42, 32);

      ctx.fillStyle = active ? ACCENT_GOLD : TEXT_MUTED;
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, sx + 21, 627);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '600 8px "Segoe UI", sans-serif';
      ctx.fillText(w.id.toUpperCase(), sx + 21, 640);
    }

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('[F] CARJACK NEARBY VEHICLE • [LMB] FIRE', 1014, 673);
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

  // Bottom Persistence Action Buttons
  drawFrostedGlassPanel(
    ctx,
    x + 24,
    y + 502,
    280,
    36,
    6,
    'rgba(99, 199, 146, 0.18)',
    'rgba(99, 199, 146, 0.55)'
  );
  ctx.fillStyle = ACCENT_EMERALD;
  ctx.font = '700 11.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[K] SAVE CAREER TO LOCALSTORAGE', x + 164, y + 524);

  drawFrostedGlassPanel(
    ctx,
    x + 324,
    y + 502,
    282,
    36,
    6,
    'rgba(100, 188, 201, 0.16)',
    'rgba(100, 188, 201, 0.52)'
  );
  ctx.fillStyle = ACCENT_CYAN;
  ctx.fillText('[TAB / M] RESUME 3D OPEN WORLD', x + 465, y + 524);
}

function renderBottomControlStrip(ctx) {
  ctx.fillStyle = 'rgba(10, 14, 21, 0.76)';
  ctx.fillRect(0, 698, 1280, 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(0, 698, 1280, 1);
  ctx.fillStyle = '#bcc7d4';
  ctx.font = '500 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '[WASD] DRIVE / MOVE   [SPACE] HANDBRAKE DRIFT   [SHIFT] NITRO / SPRINT   [F] CARJACK / EXIT   [MOUSE + CLICK] 3D AIM & FIRE   [1-5] WEAPONS   [R] RADIO   [K] SAVE CAREER   [TAB] DOSSIER',
    640,
    713
  );
}
