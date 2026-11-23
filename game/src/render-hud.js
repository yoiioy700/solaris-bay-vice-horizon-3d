import { WEAPONS, RADIO_STATIONS, COAST_X } from './config.js';
import { getDistrictAt } from './city-map.js';
import { STORY_MISSIONS } from './missions-story.js';

function drawAngledGlassPanel(ctx, x, y, w, h, cut = 12, fill = 'rgba(11, 8, 24, 0.78)', border = 'rgba(0, 240, 255, 0.55)') {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

export function renderHud2D(ctx, state) {
  ctx.clearRect(0, 0, 1280, 720);

  // 1. Diegetic 3D World-Space Screen Markers (Projected from Three.js Camera)
  renderDiegeticWorldMarkers(ctx, state);

  // 2. Top-Left Slim Floating Mission Pill (leaves center & upper sky completely open)
  renderTopLeftMissionPill(ctx, state);

  // 3. Top-Right Compact Wanted Stars, Cash & Weapon Cluster
  renderTopRightStatusCluster(ctx, state);

  // 4. Bottom-Left Rotating 3D Circular Radar Minimap & Health/Armor/Nitro Bars
  renderBottomLeftRadar(ctx, state);

  // 5. Bottom-Right Sleek Automotive Tachometer / Speedometer & Synthwave Radio Gauge
  if (!state.safehouseModalOpen) {
    renderBottomRightTelemetry(ctx, state);
  }

  // 6. Temporary Event Banner (Mission Passed / Pay 'N' Spray / Wanted Alert)
  if (state.hudBanner && state.hudBanner.timer > 0) {
    renderCenterEventBanner(ctx, state.hudBanner);
  }

  // 7. Safehouse Career Dossier Modal (when toggled with Tab / M or ?shot=safehouse)
  if (state.safehouseModalOpen) {
    renderSafehouseDossierModal(ctx, state);
  }

  // 8. Slim Bottom-Edge Control Legend Bar
  renderBottomControlStrip(ctx);
}

function renderDiegeticWorldMarkers(ctx, state) {
  const markers = state.projectedMarkers;
  if (!markers) return;

  // Projected 3D Mission Target Waypoint Diamond
  const active = state.missions.activeMission;
  if (markers.missionTarget && active) {
    const { x, y } = markers.missionTarget;
    const dist = Math.round(
      Math.hypot(state.player.x - active.targetX, state.player.y - active.targetY)
    );
    if (x >= 30 && x <= 1250 && y >= 40 && y <= 650) {
      ctx.save();
      ctx.translate(x, y);
      // Outer pulsing neon diamond
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 42, 133, 0.88)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f0ff';
      ctx.stroke();

      // Distance pill below diamond
      ctx.fillStyle = 'rgba(9, 4, 20, 0.85)';
      ctx.fillRect(-38, 18, 76, 18);
      ctx.strokeStyle = 'rgba(255, 42, 133, 0.7)';
      ctx.strokeRect(-38, 18, 76, 18);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`TARGET ${dist}m`, 0, 31);
      ctx.restore();
    }
  }

  // Projected [F] CARJACK prompt above nearest 3D vehicle when on foot
  if (markers.hijackTarget && markers.hijackTarget.screen) {
    const { car, screen } = markers.hijackTarget;
    const { x, y } = screen;
    if (x >= 60 && x <= 1220 && y >= 50 && y <= 660) {
      const label = `[F] CARJACK ${car.name}`;
      ctx.save();
      ctx.font = '800 12px "Segoe UI", sans-serif';
      const w = Math.max(176, ctx.measureText(label).width + 26);
      drawAngledGlassPanel(
        ctx,
        x - w * 0.5,
        y - 34,
        w,
        26,
        8,
        'rgba(9, 6, 24, 0.88)',
        '#00f0ff'
      );
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 17);
      ctx.restore();
    }
  }

  // Projected Armored Boss Health Bar above Syndicate Goliath Convoy
  if (markers.convoyBoss && markers.convoyBoss.screen) {
    const { entity, screen } = markers.convoyBoss;
    const { x, y } = screen;
    if (x >= 60 && x <= 1220 && y >= 40 && y <= 650) {
      const hpRatio = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
      ctx.save();
      drawAngledGlassPanel(
        ctx,
        x - 95,
        y - 44,
        190,
        32,
        8,
        'rgba(15, 6, 24, 0.9)',
        '#fde047'
      );
      ctx.fillStyle = '#fde047';
      ctx.font = '800 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ARMORED BULLION CONVOY', x, y - 30);

      ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      ctx.fillRect(x - 80, y - 24, 160, 7);
      ctx.fillStyle = '#ff2a85';
      ctx.fillRect(x - 80, y - 24, 160 * hpRatio, 7);
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

  drawAngledGlassPanel(
    ctx,
    20,
    16,
    462,
    56,
    12,
    'rgba(11, 7, 25, 0.78)',
    'rgba(255, 42, 133, 0.68)'
  );

  // Left neon accent bar
  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(30, 23, 4, 42);

  ctx.fillStyle = '#00f0ff';
  ctx.font = '800 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${active.code} • ${active.title}`, 42, 34);

  // GPS Distance pill on right of header
  ctx.fillStyle = '#fde047';
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`GPS ${dist}m`, 466, 34);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '600 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(active.objective, 42, 55);
}

function renderTopRightStatusCluster(ctx, state) {
  const { player, wanted } = state;
  const weapon = WEAPONS[player.weaponIndex] || WEAPONS[0];

  drawAngledGlassPanel(
    ctx,
    964,
    16,
    296,
    84,
    12,
    'rgba(11, 7, 25, 0.78)',
    wanted.stars > 0 ? 'rgba(255, 42, 133, 0.82)' : 'rgba(0, 240, 255, 0.55)'
  );

  // 5-Star Wanted Level row
  for (let s = 1; s <= 5; s++) {
    const active = s <= wanted.stars;
    const sx = 988 + (s - 1) * 24;
    ctx.font = '900 19px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    if (active) {
      const flashRed = Math.sin(wanted.sirenTimer) >= 0;
      ctx.fillStyle = flashRed ? '#fde047' : '#ff2a85';
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
    }
    ctx.fillText('★', sx, 40);
  }

  // Police Tactical Scanner Status Tag
  if (wanted.stars > 0) {
    const isRed = Math.sin(wanted.sirenTimer) >= 0;
    ctx.fillStyle = isRed ? 'rgba(239, 68, 68, 0.28)' : 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(1105, 23, 140, 20);
    ctx.strokeStyle = isRed ? '#ef4444' : '#38bdf8';
    ctx.strokeRect(1105, 23, 140, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      wanted.stars >= 4 ? 'VCPD CHOPPER + SWAT' : `VCPD PURSUIT ${wanted.stars}★`,
      1175,
      37
    );
  } else {
    ctx.fillStyle = '#10b981';
    ctx.font = '800 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('CLEAR • 0★ HEAT', 1244, 37);
  }

  // Cash counter
  ctx.fillStyle = '#34d399';
  ctx.font = '900 20px "Consolas", "Segoe UI", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`$${player.cash.toLocaleString()}`, 980, 66);

  // Equipped Weapon & Ammo Badge
  ctx.fillStyle = weapon.color;
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${weapon.shortName} • ${weapon.ammo} RDS`, 1244, 65);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px "Segoe UI", sans-serif';
  ctx.fillText('[1-5] WEAPONS  [TAB] SAFEHOUSE', 1244, 88);
}

function renderBottomLeftRadar(ctx, state) {
  const { player, cityMap, vehicles, wanted, missions } = state;
  const cx = 108;
  const cy = 576;
  const r = 72;
  const scale = 0.085;

  // Radar Outer Bezel
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9, 6, 22, 0.88)';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle =
    wanted.stars > 0
      ? Math.sin(wanted.sirenTimer) >= 0
        ? '#ff2a85'
        : '#00f0ff'
      : 'rgba(0, 240, 255, 0.72)';
  ctx.stroke();

  // Clip inside radar disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#0c1021';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Rotate radar relative to player heading (player forward points UP on radar)
  const heading = player.vehicle ? player.vehicle.angle : player.angle;
  ctx.translate(cx, cy);
  ctx.rotate(-heading - Math.PI * 0.5);

  // Draw Ocean Water on right of coast
  const oceanDx = (COAST_X - player.x) * scale;
  ctx.fillStyle = 'rgba(2, 132, 199, 0.45)';
  ctx.fillRect(oceanDx, -1200, 800, 2400);

  // Draw City Buildings on radar
  ctx.fillStyle = 'rgba(51, 65, 85, 0.85)';
  for (const b of cityMap.buildings) {
    const bx = (b.x - player.x) * scale;
    const by = (b.y - player.y) * scale;
    if (Math.abs(bx) > 130 && Math.abs(by) > 130) continue;
    ctx.fillRect(bx, by, b.w * scale, b.h * scale);
  }

  // Draw Glowing Magenta GPS Route Path
  if (missions.gpsPoints && missions.gpsPoints.length >= 2) {
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 3.2;
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

  // Draw Vehicle & Police Blips
  for (const v of vehicles) {
    if (v.destroyed || v === player.vehicle) continue;
    const vx = (v.x - player.x) * scale;
    const vy = (v.y - player.y) * scale;
    if (vx * vx + vy * vy > (r - 6) * (r - 6)) continue;
    ctx.fillStyle = v.isPolice ? '#ef4444' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(vx, vy, v.isPolice ? 3.8 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Active Mission Target Blip
  if (missions.activeMission) {
    const tx = (missions.activeMission.targetX - player.x) * scale;
    const ty = (missions.activeMission.targetY - player.y) * scale;
    const dist = Math.hypot(tx, ty);
    const clampedDist = Math.min(r - 8, dist);
    const ang = Math.atan2(ty, tx);
    const bx = Math.cos(ang) * clampedDist;
    const by = Math.sin(ang) * clampedDist;

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Center Player Directional Arrow on Radar
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5.5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5.5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // North 'N' badge on Radar Ring
  const northAng = -heading - Math.PI * 0.5;
  const nx = cx + Math.cos(northAng) * (r + 2);
  const ny = cy + Math.sin(northAng) * (r + 2);
  ctx.fillStyle = '#090414';
  ctx.beginPath();
  ctx.arc(nx, ny, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.font = '800 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + 3.5);

  // Segmented Health, Armor & Nitro Bars below Radar + District Tag
  const barX = 24;
  const barY = 660;
  const hpRatio = Math.max(0, Math.min(1, player.hp / 100));
  const armorRatio = Math.max(0, Math.min(1, player.armor / 100));
  const nitroRatio = player.vehicle ? Math.max(0, Math.min(1, player.vehicle.nitro / 100)) : 1;

  // Health Bar (Emerald)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(barX, barY, 76, 8);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(barX, barY, 76 * hpRatio, 8);

  // Armor Bar (Cyan)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(barX + 82, barY, 76, 8);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(barX + 82, barY, 76 * armorRatio, 8);

  // Nitro Bar (Amber/Magenta)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(barX + 164, barY, 64, 8);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(barX + 164, barY, 64 * nitroRatio, 8);

  const district = getDistrictAt(player.x, player.y);
  ctx.fillStyle = district.accent || '#ff2a85';
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ ${district.name}`, barX, 684);
}

function renderBottomRightTelemetry(ctx, state) {
  const { player } = state;
  const station = RADIO_STATIONS[player.radioIndex] || RADIO_STATIONS[0];

  drawAngledGlassPanel(
    ctx,
    992,
    576,
    268,
    112,
    12,
    'rgba(11, 7, 25, 0.8)',
    'rgba(0, 240, 255, 0.6)'
  );

  if (player.vehicle) {
    const v = player.vehicle;
    const mph = Math.round(v.speed * 0.48);
    const rpmRatio = Math.min(1, v.speed / v.maxSpeed);
    const gear = mph < 15 ? 'G1' : mph < 55 ? 'G2' : mph < 95 ? 'G3' : mph < 135 ? 'G4' : mph < 175 ? 'G5' : 'G6';

    // Radial Arc Tachometer on left of telemetry card
    const gx = 1044;
    const gy = 632;
    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, 34, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      gx,
      gy,
      34,
      Math.PI * 0.75,
      Math.PI * 0.75 + Math.PI * 1.5 * rpmRatio
    );
    ctx.lineWidth = 6;
    ctx.strokeStyle = v.nitroActive ? '#00f0ff' : '#ff2a85';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fde047';
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gear, gx, gy + 4);

    // Digital MPH Speed Readout
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px "Consolas", "Segoe UI", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${mph}`, 1094, 620);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.fillText(v.nitroActive ? 'MPH • NITRO' : 'MPH', 1158, 618);

    // Vehicle Name & Category
    ctx.fillStyle = '#f472b6';
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.fillText(`${v.name} (${v.category})`, 1094, 642);

    // Synthwave Radio Station Ticker
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.fillText(`♪ ${station.name}`, 1012, 674);
  } else {
    // On-Foot Tactical Arsenal Display
    ctx.fillStyle = '#00f0ff';
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ON-FOOT TACTICAL MODE • 3D AIM', 1010, 600);

    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const active = i === player.weaponIndex;
      const sx = 1010 + i * 48;
      ctx.fillStyle = active ? 'rgba(255, 42, 133, 0.35)' : 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(sx, 612, 43, 32);
      ctx.strokeStyle = active ? '#ff2a85' : 'rgba(148, 163, 184, 0.3)';
      ctx.strokeRect(sx, 612, 43, 32);

      ctx.fillStyle = active ? '#fde047' : '#94a3b8';
      ctx.font = '800 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, sx + 21, 626);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 8px "Segoe UI", sans-serif';
      ctx.fillText(w.id.toUpperCase(), sx + 21, 639);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('[F] CARJACK NEARBY VEHICLE • [LMB] FIRE', 1010, 672);
  }
}

function renderCenterEventBanner(ctx, banner) {
  ctx.save();
  drawAngledGlassPanel(
    ctx,
    390,
    92,
    500,
    54,
    14,
    'rgba(9, 4, 20, 0.88)',
    banner.color || '#fde047'
  );
  ctx.fillStyle = banner.color || '#fde047';
  ctx.font = '900 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(banner.title, 640, 115);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.fillText(banner.subtitle, 640, 135);
  ctx.restore();
}

function renderSafehouseDossierModal(ctx, state) {
  const x = 626;
  const y = 108;
  const w = 632;
  const h = 556;

  drawAngledGlassPanel(
    ctx,
    x,
    y,
    w,
    h,
    16,
    'rgba(9, 5, 22, 0.88)',
    '#00f0ff'
  );

  // Header strip
  ctx.fillStyle = '#ff2a85';
  ctx.font = '900 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STARFISH BAY SAFEHOUSE • CAREER & HEIST DOSSIER', x + 26, y + 34);

  ctx.fillStyle = '#10b981';
  ctx.font = '800 11px "Segoe UI", sans-serif';
  ctx.fillText(
    `✓ ${state.lastSaveStatus || 'LOCALSTORAGE CAREER PERSISTENCE ACTIVE'}`,
    x + 26,
    y + 54
  );

  // Career Telemetry Summary Pills
  const stats = [
    { label: 'CAREER BANKROLL', val: `$${state.player.cash.toLocaleString()}`, col: '#34d399' },
    {
      label: 'CAMPAIGN PROGRESS',
      val: `${state.missions.completedIds.length} / ${STORY_MISSIONS.length} COMPLETED`,
      col: '#00f0ff'
    },
    {
      label: 'ACTIVE RADIO',
      val: RADIO_STATIONS[state.player.radioIndex].name,
      col: '#f472b6'
    }
  ];

  for (let i = 0; i < stats.length; i++) {
    const sx = x + 24 + i * 198;
    ctx.fillStyle = 'rgba(20, 14, 42, 0.9)';
    ctx.fillRect(sx, y + 66, 188, 44);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.strokeRect(sx, y + 66, 188, 44);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 9px "Segoe UI", sans-serif';
    ctx.fillText(stats[i].label, sx + 10, y + 82);

    ctx.fillStyle = stats[i].col;
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.fillText(stats[i].val, sx + 10, y + 101);
  }

  // 6 Story Missions List (Full unclipped descriptions)
  for (let i = 0; i < STORY_MISSIONS.length; i++) {
    const m = STORY_MISSIONS[i];
    const ry = y + 122 + i * 62;
    const isCompleted = state.missions.completedIds.includes(m.id);
    const isCurrent = state.missions.currentIndex === i;

    ctx.fillStyle = isCurrent
      ? 'rgba(255, 42, 133, 0.18)'
      : isCompleted
        ? 'rgba(16, 185, 129, 0.12)'
        : 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(x + 24, ry, w - 48, 54);
    ctx.strokeStyle = isCurrent
      ? '#ff2a85'
      : isCompleted
        ? '#10b981'
        : 'rgba(148, 163, 184, 0.25)';
    ctx.strokeRect(x + 24, ry, w - 48, 54);

    ctx.fillStyle = isCompleted ? '#10b981' : isCurrent ? '#fde047' : '#38bdf8';
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${m.code}: ${m.title}`, x + 36, ry + 20);

    const statusBadge = isCompleted
      ? `COMPLETED • +$${m.reward.toLocaleString()}`
      : isCurrent
        ? `ACTIVE CONTRACT • $${m.reward.toLocaleString()}`
        : `PAYOUT $${m.reward.toLocaleString()}`;
    ctx.textAlign = 'right';
    ctx.fillText(statusBadge, x + w - 36, ry + 20);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(m.briefing, x + 36, ry + 41);
  }

  // Bottom Persistence Action Buttons
  drawAngledGlassPanel(
    ctx,
    x + 24,
    y + 502,
    280,
    36,
    8,
    'rgba(16, 185, 129, 0.24)',
    '#10b981'
  );
  ctx.fillStyle = '#10b981';
  ctx.font = '800 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[K] SAVE CAREER TO LOCALSTORAGE', x + 164, y + 525);

  drawAngledGlassPanel(
    ctx,
    x + 324,
    y + 502,
    284,
    36,
    8,
    'rgba(0, 240, 255, 0.18)',
    '#00f0ff'
  );
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('[TAB / M] RESUME 3D OPEN WORLD', x + 466, y + 525);
}

function renderBottomControlStrip(ctx) {
  ctx.fillStyle = 'rgba(7, 4, 16, 0.82)';
  ctx.fillRect(0, 698, 1280, 22);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '[WASD] DRIVE / MOVE   [SPACE] HANDBRAKE DRIFT   [SHIFT] NITRO / SPRINT   [F] CARJACK / EXIT   [MOUSE + CLICK] 3D AIM & FIRE   [1-5] WEAPONS   [R] SYNTHWAVE RADIO   [K] SAVE CAREER   [TAB] DOSSIER',
    640,
    713
  );
}
