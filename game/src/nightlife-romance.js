/**
 * Club Eclipse 21+ Nightlife, Dancefloor, VIP Private Suite & In-Car Companion System.
 * Coordinates Space/E/G/H input handoff cleanly with on-foot jump, vehicle handbrake, and camera pose overrides.
 */
export const CLUB_ECLIPSE_BOUNDS = {
  x1: 1608,
  y1: 1608,
  x2: 1784,
  y2: 1784,
  centerX: 1706,
  centerY: 1696,
  entranceX: 1786,
  entranceY: 1696,
  danceX1: 1660,
  danceY1: 1650,
  danceX2: 1752,
  danceY2: 1742,
  vipX: 1656,
  vipY: 1638,
  vipBedX: 1648,
  vipBedY: 1624,
  barX: 1706,
  barY: 1758
};

export const VIP_MENU_ITEMS = [
  {
    id: 'vip_lapdance',
    name: 'Private VIP Lap Dance',
    price: 100,
    effectLabel: '+35 HP & Full Nitro • Private Velvet Booth',
    mode: 'vip_lapdance',
    duration: 5.5,
    heal: 35,
    refillNitro: true,
    overheal: false
  },
  {
    id: 'vip_sex',
    name: 'VIP Suite Hookup (Full Intimate Session)',
    price: 250,
    effectLabel: '125 Max HP Overheal + Full Armor • Private Suite',
    mode: 'vip_sex',
    duration: 7.5,
    overheal: true,
    fullArmor: true
  }
];

export const CAR_SEX_MENU_ITEMS = [
  {
    id: 'car_quickie',
    name: 'Quickie (Front Seat)',
    price: 50,
    effectLabel: '+30 HP • Classic Car Rocking',
    mode: 'car_quickie',
    duration: 5.0,
    heal: 30,
    overheal: false
  },
  {
    id: 'car_sex',
    name: 'Full Backseat Sex Session',
    price: 120,
    effectLabel: 'Iconic GTA 125 Max HP Overheal • Steamy Backseat',
    mode: 'car_sex',
    duration: 7.2,
    overheal: true
  }
];

const SESSION_DIALOGUES = {
  vip_lapdance: [
    'VIP SUITE • VELVET CURTAINS DRAWN — SLOW BASS DROPS',
    'CLOSE HEAT UNDER CRIMSON AMBER LIGHTS — TAP [SPACE] TO MATCH RHYTHM',
    'SILK, CHAMPAGNE & PURE VICE ENERGY — HEARTBEAT RACING'
  ],
  vip_sex: [
    'CLUB ECLIPSE VIP SUITE • DOOR LOCKED — CLOTHES HIT THE VELVET FLOOR',
    'SKIN ON SKIN ON THE CRIMSON DAYBED — TAP [SPACE] TO PUSH THE TEMPO',
    'BREATHLESS RHYTHM BUILDING FAST — STEAMY VIP CLIMAX APPROACHING',
    'CLIMAX REACHED • PURE ADRENALINE — 125 MAX HP OVERHEAL UNLOCKED!'
  ],
  car_quickie: [
    'WINDOWS FOGGING UP — PASSENGER SEAT RECLINED',
    'SUSPENSION CREAKING ON THE NIGHT STRIP — TAP [SPACE] FOR RHYTHM',
    'QUICK THRILL COMPLETE — CATCHING YOUR BREATH'
  ],
  car_sex: [
    'DOORS LOCKED • WINDOWS STEAMED — SLIDING INTO THE BACKSEAT',
    'SHOCKS BOUNCING HARD ON THE SPRINGS — TAP [SPACE] TO PICK UP SPEED',
    'HEAVY BREATHING & ROCKING CHASSIS — ALMOST AT THE PEAK',
    'PEAK CLIMAX • UNSTOPPABLE RUSH — 125 MAX HP OVERHEAL UNLOCKED!'
  ]
};

export function createNightlifeState() {
  return {
    inClub: false,
    onDancefloor: false,
    dancing: false,
    dancePhase: 0,
    vipMenuOpen: false,
    carMenuOpen: false,
    hoveredIndex: -1,
    companionInCar: null,
    companionApproaching: null,
    nearVipLounge: false,
    nearCompanion: null,
    session: null,
    feedbackText: '',
    feedbackColor: '#e0b268',
    feedbackTimer: 0
  };
}

export function isInsideClubEclipse(x, y) {
  return (
    x >= CLUB_ECLIPSE_BOUNDS.x1 &&
    x <= CLUB_ECLIPSE_BOUNDS.x2 &&
    y >= CLUB_ECLIPSE_BOUNDS.y1 &&
    y <= CLUB_ECLIPSE_BOUNDS.y2
  );
}

export function isNearVipLounge(player) {
  if (player.vehicle) return false;
  return Math.hypot(player.x - CLUB_ECLIPSE_BOUNDS.vipX, player.y - CLUB_ECLIPSE_BOUNDS.vipY) <= 58;
}

export function findNearestNightlifeCompanion(state, maxRadius = 118) {
  const { player, pedestrians } = state;
  let best = null;
  let bestDist = maxRadius;
  for (const npc of pedestrians) {
    if (npc.dead || npc.role !== 'companion' || npc.inCar) continue;
    const d = Math.hypot(npc.x - player.x, npc.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = npc;
    }
  }
  return best;
}

export function getNightlifeMenuLayout(mode) {
  const items = mode === 'vip' ? VIP_MENU_ITEMS : CAR_SEX_MENU_ITEMS;
  const w = 500;
  const rowH = 58;
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

  return { x, y, w, h, headerH, footerH, itemRects, closeRect, items, mode };
}

export function closeNightlifeMenus(state) {
  if (!state.nightlife) return;
  state.nightlife.vipMenuOpen = false;
  state.nightlife.carMenuOpen = false;
  state.nightlife.hoveredIndex = -1;
}

export function togglePlayerDance(state) {
  const nl = state.nightlife;
  if (!nl || state.player.vehicle || nl.session) return false;
  if (!isInsideClubEclipse(state.player.x, state.player.y)) {
    return false;
  }
  nl.dancing = !nl.dancing;
  if (nl.dancing) {
    state.player.vx = 0;
    state.player.vy = 0;
  }
  state.hudBanner = {
    title: nl.dancing ? 'CLUB ECLIPSE • DANCING ON THE FLOOR' : 'STOPPED DANCING',
    subtitle: nl.dancing ? 'GROOVING TO 124 BPM SOLARIS HOUSE • [WASD] OR [G] TO STOP' : 'BACK TO FREE ROAM',
    color: '#c988b8',
    timer: 2.2
  };
  return true;
}

export function tryInviteCompanionOrHonk(state) {
  const { player, nightlife } = state;
  if (!nightlife || nightlife.session) return false;
  if (!player.vehicle) return false;

  if (state.audio && state.audio.playHorn) {
    state.audio.playHorn(player.x, player.y);
  }

  if (nightlife.companionInCar) {
    // Already have a companion in the car -> open private car service menu if slowed down
    if (player.vehicle.speed < 95) {
      openCarSexMenu(state);
      return true;
    }
    state.hudBanner = {
      title: 'PULL OVER TO START PRIVATE SESSION',
      subtitle: 'SLOW DOWN & PRESS [E] OR [H] FOR CAR SERVICE',
      color: '#d97c8c',
      timer: 2.2
    };
    return true;
  }

  if (player.vehicle.speed > 110) return false;

  const comp = findNearestNightlifeCompanion(state, 125);
  if (!comp) return false;

  // Companion walks right up to passenger door & hops in
  nightlife.companionApproaching = {
    npc: comp,
    vehicle: player.vehicle,
    timer: 0
  };
  state.hudBanner = {
    title: 'NIGHTLIFE COMPANION APPROACHING',
    subtitle: 'HOLD STEADY AS SHE HOPS INTO THE PASSENGER SEAT',
    color: '#d97c8c',
    timer: 2.4
  };
  return true;
}

export function openVipMenu(state) {
  if (!state.nightlife || state.nightlife.session) return false;
  state.safehouseModalOpen = false;
  if (state.shopModal) state.shopModal.open = false;
  state.input.mouseDown = false;
  state.nightlife.dancing = false;
  state.nightlife.carMenuOpen = false;
  state.nightlife.vipMenuOpen = true;
  state.nightlife.hoveredIndex = -1;
  state.nightlife.feedbackText = '';
  state.nightlife.feedbackTimer = 0;
  if (state.audio && state.audio.playShopChime) state.audio.playShopChime(true);
  return true;
}

export function openCarSexMenu(state) {
  if (!state.nightlife || state.nightlife.session || !state.nightlife.companionInCar) return false;
  if (!state.player.vehicle) return false;
  state.safehouseModalOpen = false;
  if (state.shopModal) state.shopModal.open = false;
  state.input.mouseDown = false;
  state.nightlife.vipMenuOpen = false;
  state.nightlife.carMenuOpen = true;
  state.nightlife.hoveredIndex = -1;
  state.nightlife.feedbackText = '';
  state.nightlife.feedbackTimer = 0;
  if (state.audio && state.audio.playShopChime) state.audio.playShopChime(true);
  return true;
}

export function tryInteractNightlife(state) {
  const nl = state.nightlife;
  if (!nl) return false;

  if (nl.session) {
    return false;
  }
  if (nl.vipMenuOpen || nl.carMenuOpen) {
    closeNightlifeMenus(state);
    return true;
  }

  // 1. Inside Club Eclipse VIP Lounge on foot
  if (isNearVipLounge(state.player)) {
    openVipMenu(state);
    return true;
  }

  // 2. Inside a car with a companion on board -> open Car Service menu
  if (state.player.vehicle && nl.companionInCar && state.player.vehicle.speed < 95) {
    openCarSexMenu(state);
    return true;
  }

  // 3. Inside a slowed car next to a nightlife companion -> invite them in!
  if (state.player.vehicle && !nl.companionInCar && state.player.vehicle.speed < 95) {
    const comp = findNearestNightlifeCompanion(state, 120);
    if (comp) {
      return tryInviteCompanionOrHonk(state);
    }
  }

  return false;
}

export function startNightlifeOption(state, itemIndex) {
  const nl = state.nightlife;
  if (!nl) return { ok: false, reason: 'no_state' };

  const isVip = nl.vipMenuOpen;
  const isCar = nl.carMenuOpen;
  if (!isVip && !isCar) return { ok: false, reason: 'closed' };

  const items = isVip ? VIP_MENU_ITEMS : CAR_SEX_MENU_ITEMS;
  const item = items[itemIndex];
  if (!item) return { ok: false, reason: 'invalid_item' };

  const { player } = state;
  if (player.cash < item.price) {
    const msg = `INSUFFICIENT FUNDS • NEED $${item.price.toLocaleString()}`;
    nl.feedbackText = msg;
    nl.feedbackColor = '#d95b66';
    nl.feedbackTimer = 2.8;
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
  closeNightlifeMenus(state);
  state.input.mouseDown = false;

  if (isVip) {
    const vipNpc = state.pedestrians.find((p) => !p.dead && p.role === 'vip_companion') || null;
    nl.session = {
      mode: item.mode,
      item,
      progress: 0,
      duration: item.duration,
      elapsed: 0,
      rhythmBoost: 0,
      tempo: 1.0,
      phase: 0,
      partnerNpc: vipNpc,
      vehicle: null,
      cost: item.price,
      savedPlayerPos: { x: player.x, y: player.y, angle: player.angle },
      savedPartnerPos: vipNpc ? { x: vipNpc.x, y: vipNpc.y, angle: vipNpc.angle } : null,
      dialogueText: SESSION_DIALOGUES[item.mode][0]
    };
    // Position couple cleanly on the velvet VIP suite couch
    player.x = CLUB_ECLIPSE_BOUNDS.vipBedX + 2;
    player.y = CLUB_ECLIPSE_BOUNDS.vipBedY + 3;
    player.angle = -Math.PI * 0.5;
    if (vipNpc) {
      vipNpc.x = CLUB_ECLIPSE_BOUNDS.vipBedX + 2;
      vipNpc.y = CLUB_ECLIPSE_BOUNDS.vipBedY - 1.5;
      vipNpc.angle = Math.PI * 0.5;
    }
  } else {
    const car = player.vehicle;
    if (!car || !nl.companionInCar) {
      return { ok: false, reason: 'no_car_or_companion' };
    }
    car.vx = 0;
    car.vy = 0;
    car.speed = 0;
    nl.session = {
      mode: item.mode,
      item,
      progress: 0,
      duration: item.duration,
      elapsed: 0,
      rhythmBoost: 0,
      tempo: 1.0,
      phase: 0,
      partnerNpc: nl.companionInCar,
      vehicle: car,
      cost: item.price,
      savedPlayerPos: { x: player.x, y: player.y, angle: player.angle },
      savedPartnerPos: null,
      dialogueText: SESSION_DIALOGUES[item.mode][0]
    };
  }

  if (state.audio && state.audio.playShopChime) state.audio.playShopChime(false);
  return { ok: true, session: nl.session };
}

export function boostNightlifeRhythm(state) {
  const nl = state.nightlife;
  if (!nl || !nl.session) return false;
  nl.session.rhythmBoost = Math.min(1.6, nl.session.rhythmBoost + 0.55);
  nl.session.progress = Math.min(100, nl.session.progress + 9.5);
  if (state.audio && state.audio.playIntimatePulse) {
    state.audio.playIntimatePulse(nl.session.mode.startsWith('car'));
  }
  return true;
}

export function finishNightlifeSession(state, cancelled = false) {
  const nl = state.nightlife;
  if (!nl || !nl.session) return false;
  const sess = nl.session;
  const { player } = state;

  // Apply iconic GTA rewards if completed naturally (or partial if cancelled late)
  if (!cancelled || sess.progress >= 65) {
    const item = sess.item;
    if (item.overheal) {
      player.maxHp = 125;
      player.hp = 125;
    } else if (item.heal) {
      player.hp = Math.min(player.maxHp || 100, player.hp + item.heal);
    }
    if (item.fullArmor) {
      player.armor = 100;
    }
    if (item.refillNitro) {
      const targetCar = player.vehicle || state.vehicles[0];
      if (targetCar) targetCar.nitro = 100;
      player.dashCooldown = 0;
    }

    state.hudBanner = {
      title: item.overheal
        ? `${item.mode === 'vip_sex' ? 'VIP SUITE' : 'BACKSEAT'} SESSION COMPLETE • 125 HP OVERHEAL!`
        : `${item.name.toUpperCase()} COMPLETE`,
      subtitle: item.overheal
        ? 'MAX HEALTH BOOSTED TO 125 HP • CONTROLS RESTORED'
        : `${item.effectLabel}`,
      color: '#d97c8c',
      timer: 3.4
    };
  } else {
    state.hudBanner = {
      title: 'SESSION ENDED EARLY',
      subtitle: 'BACK TO SOLARIS BAY OPEN WORLD',
      color: '#9aa8b8',
      timer: 2.0
    };
  }

  // Restore clean world positions & release camera override
  if (sess.mode.startsWith('vip')) {
    player.x = CLUB_ECLIPSE_BOUNDS.vipX + 4;
    player.y = CLUB_ECLIPSE_BOUNDS.vipY + 14;
    player.angle = Math.PI * 0.5;
    if (sess.partnerNpc && sess.savedPartnerPos) {
      sess.partnerNpc.x = sess.savedPartnerPos.x;
      sess.partnerNpc.y = sess.savedPartnerPos.y;
      sess.partnerNpc.angle = sess.savedPartnerPos.angle;
    }
  } else if (sess.vehicle && sess.partnerNpc) {
    // Companion steps safely back out onto passenger-side street
    const v = sess.vehicle;
    const outAng = v.angle + Math.PI * 0.5;
    sess.partnerNpc.inCar = false;
    sess.partnerNpc.x = v.x + Math.cos(outAng) * (v.width * 0.95);
    sess.partnerNpc.y = v.y + Math.sin(outAng) * (v.width * 0.95);
    sess.partnerNpc.angle = outAng;
    nl.companionInCar = null;
  }

  nl.session = null;
  if (state.camera && state.camera.nightlifePose) {
    state.camera.nightlifePose = null;
  }
  return true;
}

export function handleNightlifeMenuClick(state, mx, my) {
  const nl = state.nightlife;
  if (!nl || (!nl.vipMenuOpen && !nl.carMenuOpen)) return false;
  const layout = getNightlifeMenuLayout(nl.vipMenuOpen ? 'vip' : 'car');

  const c = layout.closeRect;
  if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
    closeNightlifeMenus(state);
    return true;
  }
  for (const r of layout.itemRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      startNightlifeOption(state, r.index);
      return true;
    }
  }
  if (mx >= layout.x && mx <= layout.x + layout.w && my >= layout.y && my <= layout.y + layout.h) {
    return true;
  }
  closeNightlifeMenus(state);
  return true;
}

export function updateNightlifeMenuHover(state, mx, my) {
  const nl = state.nightlife;
  if (!nl || (!nl.vipMenuOpen && !nl.carMenuOpen)) return;
  const layout = getNightlifeMenuLayout(nl.vipMenuOpen ? 'vip' : 'car');
  let found = -1;
  for (const r of layout.itemRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      found = r.index;
      break;
    }
  }
  nl.hoveredIndex = found;
}

export function updateNightlifeSystem(state, dt) {
  const { player, nightlife: nl, particles } = state;
  if (!nl) return;

  if (nl.feedbackTimer > 0) {
    nl.feedbackTimer = Math.max(0, nl.feedbackTimer - dt);
  }

  nl.inClub = !player.vehicle && isInsideClubEclipse(player.x, player.y);
  nl.onDancefloor =
    nl.inClub &&
    player.x >= CLUB_ECLIPSE_BOUNDS.danceX1 &&
    player.x <= CLUB_ECLIPSE_BOUNDS.danceX2 &&
    player.y >= CLUB_ECLIPSE_BOUNDS.danceY1 &&
    player.y <= CLUB_ECLIPSE_BOUNDS.danceY2;
  nl.nearVipLounge = isNearVipLounge(player);

  if (nl.dancing) {
    nl.dancePhase += dt * 6.5;
    const keys = (state.input && state.input.keys) || {};
    const movingKey = Boolean(
      keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ||
      keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight ||
      keys.Space
    );
    if (!nl.inClub || player.vehicle || movingKey) {
      nl.dancing = false;
    }
  }

  // Track nearby companion when driving slowly without a passenger
  if (player.vehicle && !nl.companionInCar && !nl.companionApproaching && !nl.session) {
    nl.nearCompanion =
      player.vehicle.speed < 105 ? findNearestNightlifeCompanion(state, 120) : null;
  } else {
    nl.nearCompanion = null;
  }

  // If player exits vehicle while a companion is in the car, companion hops out cleanly
  if (nl.companionInCar && !player.vehicle && !nl.session) {
    nl.companionInCar.inCar = false;
    nl.companionInCar.x = player.x + 18;
    nl.companionInCar.y = player.y + 8;
    nl.companionInCar = null;
  }

  // Handle companion walking to passenger door & hopping in
  if (nl.companionApproaching) {
    const { npc, vehicle } = nl.companionApproaching;
    nl.companionApproaching.timer += dt;
    if (!player.vehicle || player.vehicle !== vehicle || vehicle.speed > 130 || npc.dead) {
      nl.companionApproaching = null;
    } else {
      const doorAng = vehicle.angle + Math.PI * 0.5;
      const tx = vehicle.x + Math.cos(doorAng) * (vehicle.width * 0.65);
      const ty = vehicle.y + Math.sin(doorAng) * (vehicle.width * 0.65);
      const dx = tx - npc.x;
      const dy = ty - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14 || nl.companionApproaching.timer > 2.2) {
        npc.inCar = true;
        nl.companionInCar = npc;
        nl.companionApproaching = null;
        state.hudBanner = {
          title: 'COMPANION HOPPED IN!',
          subtitle: 'STOP & PRESS [E] OR [H] FOR PRIVATE CAR SERVICE (21+)',
          color: '#d97c8c',
          timer: 3.2
        };
      } else {
        const spd = 76;
        npc.angle = Math.atan2(dy, dx);
        npc.x += (dx / dist) * spd * dt;
        npc.y += (dy / dist) * spd * dt;
        npc.walkPhase += spd * dt * 0.16;
      }
    }
  }

  // Keep companion synced to vehicle while riding along
  if (nl.companionInCar && player.vehicle) {
    nl.companionInCar.x = player.vehicle.x;
    nl.companionInCar.y = player.vehicle.y;
  }

  // Auto-close VIP menu if player walks far away
  if (nl.vipMenuOpen && !nl.nearVipLounge) {
    nl.vipMenuOpen = false;
  }
  if (nl.carMenuOpen && (!player.vehicle || !nl.companionInCar)) {
    nl.carMenuOpen = false;
  }

  // Update active intimate VIP Suite or Car Sex session
  if (nl.session) {
    const s = nl.session;
    s.elapsed += dt;
    s.rhythmBoost = Math.max(0, s.rhythmBoost - dt * 0.7);
    s.tempo = 1.0 + s.rhythmBoost;
    s.phase += dt * (4.8 * s.tempo);

    const baseRate = 100 / s.duration;
    s.progress = Math.min(100, s.progress + baseRate * (0.85 + s.rhythmBoost * 0.55) * dt);

    // Periodic sensual bass / spring pulse cue
    const prevBeat = Math.floor((s.phase - dt * 4.8 * s.tempo) / (Math.PI * 2));
    const curBeat = Math.floor(s.phase / (Math.PI * 2));
    if (curBeat > prevBeat && state.audio && state.audio.playIntimatePulse) {
      state.audio.playIntimatePulse(s.mode.startsWith('car'));
    }

    // Update stage dialogue line cleanly
    const lines = SESSION_DIALOGUES[s.mode] || SESSION_DIALOGUES.vip_sex;
    const lineIdx = Math.min(lines.length - 1, Math.floor((s.progress / 100) * lines.length));
    s.dialogueText = lines[lineIdx];

    if (s.mode.startsWith('car') && s.vehicle) {
      // Lock vehicle stationary while rocking on springs + emit subtle steamy window mist
      s.vehicle.vx = 0;
      s.vehicle.vy = 0;
      s.vehicle.speed = 0;

      if (particles && Math.random() < 0.35) {
        particles.push({
          x: s.vehicle.x + (Math.random() - 0.5) * 18,
          y: s.vehicle.y + (Math.random() - 0.5) * 18,
          z: s.vehicle.height + 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          vz: 10 + Math.random() * 6,
          size: 3.4,
          color: '#d9c4cc',
          life: 0.65,
          maxLife: 0.65,
          kind: 'smoke'
        });
      }

      // Smooth swaying low-angle camera framing the rocking car
      const camAng = s.vehicle.angle + 0.85 + Math.sin(s.elapsed * 0.65) * 0.25;
      state.camera.nightlifePose = {
        eye: [
          s.vehicle.x + Math.cos(camAng) * 74,
          24 + Math.sin(s.phase * 0.5) * 1.4,
          s.vehicle.y + Math.sin(camAng) * 74
        ],
        look: [s.vehicle.x, 10, s.vehicle.y],
        fov: 52
      };
    } else {
      // Dimmed intimate crimson-amber VIP Private Suite camera orbiting the velvet daybed
      const bx = CLUB_ECLIPSE_BOUNDS.vipBedX + 2;
      const by = CLUB_ECLIPSE_BOUNDS.vipBedY + 1;
      const sway = Math.sin(s.elapsed * 0.7) * 10;
      state.camera.nightlifePose = {
        eye: [bx + 26 + sway * 0.4, 21 + Math.sin(s.phase * 0.5) * 0.8, by + 28],
        look: [bx, 8.5, by],
        fov: 50
      };
    }

    if (s.progress >= 100 || s.elapsed >= s.duration + 1.2) {
      finishNightlifeSession(state, false);
    }
  }
}
