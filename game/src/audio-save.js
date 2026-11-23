import { RADIO_STATIONS, STORAGE_KEY } from './config.js';
import { startMissionByIndex } from './missions-story.js';
import { applyPlayerOutfit, createInitialWeaponAmmo } from './shops-economy.js';

export function createAudioController() {
  let ctx = null;
  let noteStep = 0;
  let stepTimer = 0;

  function ensureContext() {
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          ctx = new AudioCtx();
        } catch {
          ctx = null;
        }
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playShot(weaponId) {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = weaponId === 'rpg' ? 'sawtooth' : 'square';
      const now = audio.currentTime;
      osc.frequency.setValueAtTime(weaponId === 'rpg' ? 140 : 320, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // Ignore autoplay constraints in headless mode
    }
  }

  function playExplosion() {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.35);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Ignore autoplay constraints
    }
  }

  let discoStep = 0;
  let discoTimer = 0;

  function playHorn() {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const now = audio.currentTime;
      for (const freq of [349.23, 440.0]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.032, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Ignore autoplay constraints
    }
  }

  function playIntimatePulse(isCar = false) {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const now = audio.currentTime;
      const bass = audio.createOscillator();
      const bGain = audio.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(isCar ? 92 : 110, now);
      bass.frequency.exponentialRampToValueAtTime(54, now + 0.22);
      bGain.gain.setValueAtTime(0.048, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      bass.connect(bGain);
      bGain.connect(audio.destination);
      bass.start(now);
      bass.stop(now + 0.25);

      const top = audio.createOscillator();
      const tGain = audio.createGain();
      top.type = 'triangle';
      if (isCar) {
        top.frequency.setValueAtTime(620, now + 0.04);
        top.frequency.exponentialRampToValueAtTime(840, now + 0.14);
      } else {
        top.frequency.setValueAtTime(329.63, now);
        top.frequency.exponentialRampToValueAtTime(392.0, now + 0.22);
      }
      tGain.gain.setValueAtTime(0.018, now + 0.02);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      top.connect(tGain);
      tGain.connect(audio.destination);
      top.start(now + 0.02);
      top.stop(now + 0.24);
    } catch {
      // Ignore autoplay constraints
    }
  }

  function updateRadio(state, dt) {
    if (!ctx || ctx.state !== 'running') return;

    // Seamless 124 BPM Disco / House Groove inside and around Club Eclipse
    const clubDist = Math.hypot(state.player.x - 1706, state.player.y - 1696);
    if (clubDist < 245 && !(state.nightlife && state.nightlife.session)) {
      const stepDur = 60 / 124 / 2;
      discoTimer += dt;
      if (discoTimer >= stepDur) {
        discoTimer -= stepDur;
        const idx = discoStep % 16;
        discoStep++;
        const volScale = Math.max(0.25, 1 - clubDist / 260);
        try {
          const now = ctx.currentTime;
          if (idx % 2 === 0) {
            const kick = ctx.createOscillator();
            const kGain = ctx.createGain();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(128, now);
            kick.frequency.exponentialRampToValueAtTime(42, now + 0.12);
            kGain.gain.setValueAtTime(0.065 * volScale, now);
            kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            kick.connect(kGain);
            kGain.connect(ctx.destination);
            kick.start(now);
            kick.stop(now + 0.14);
          }
          const houseBass = [
            110, 220, 110, 220, 130.81, 261.63, 146.83, 293.66,
            110, 220, 164.81, 146.83, 130.81, 261.63, 98.0, 196.0
          ];
          const synth = ctx.createOscillator();
          const sGain = ctx.createGain();
          synth.type = idx % 2 === 1 ? 'sawtooth' : 'triangle';
          synth.frequency.setValueAtTime(houseBass[idx], now);
          sGain.gain.setValueAtTime(0.022 * volScale, now);
          sGain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.85);
          synth.connect(sGain);
          sGain.connect(ctx.destination);
          synth.start(now);
          synth.stop(now + stepDur * 0.9);
        } catch {
          // Ignore WebAudio scheduling edge
        }
      }
      return;
    }

    const station = RADIO_STATIONS[state.player.radioIndex] || RADIO_STATIONS[0];
    if (!station || station.bpm <= 0) return;
    const stepDuration = 60 / station.bpm / 2;
    stepTimer += dt;
    if (stepTimer >= stepDuration) {
      stepTimer -= stepDuration;
      const freq = station.notes[noteStep % station.notes.length];
      noteStep++;
      if (freq) {
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.018, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + stepDuration * 0.92);
        } catch {
          // Ignore audio context timing issue
        }
      }
    }
  }

  function playShopChime(soft = false) {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const now = audio.currentTime;
      const notes = soft ? [523.25, 659.25] : [587.33, 880.0, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(soft ? 0.032 : 0.048, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {
      // Ignore autoplay constraints
    }
  }

  function playErrorTone() {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.14);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore autoplay constraints
    }
  }

  return {
    ensureContext,
    playShot,
    playExplosion,
    playShopChime,
    playErrorTone,
    playHorn,
    playIntimatePulse,
    updateRadio
  };
}

export function saveCareerToStorage(state) {
  try {
    const payload = {
      version: 3,
      savedAt: new Date().toISOString(),
      cash: state.player.cash,
      hp: state.player.hp,
      maxHp: state.player.maxHp || 100,
      armor: state.player.armor,
      weaponIndex: state.player.weaponIndex,
      weaponAmmo: state.player.weaponAmmo || createInitialWeaponAmmo(),
      outfitId: state.player.outfitId || 'default_coral',
      radioIndex: state.player.radioIndex,
      missionIndex: state.missions.currentIndex,
      completedIds: state.missions.completedIds
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    state.lastSaveStatus = 'CAREER SAVED TO LOCALSTORAGE';
    state.hudBanner = {
      title: 'SAFEHOUSE CAREER DOSSIER SAVED',
      subtitle: `BANKROLL $${state.player.cash.toLocaleString()} • PERSISTED TO LOCALSTORAGE`,
      color: '#63c792',
      timer: 3.0
    };
    return true;
  } catch {
    return false;
  }
}

export function loadCareerFromStorage(state) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;

    if (typeof data.cash === 'number' && Number.isFinite(data.cash)) {
      state.player.cash = Math.max(0, data.cash);
    }
    if (typeof data.maxHp === 'number' && Number.isFinite(data.maxHp)) {
      state.player.maxHp = Math.max(100, Math.min(125, Math.floor(data.maxHp)));
    }
    if (typeof data.hp === 'number' && Number.isFinite(data.hp)) {
      state.player.hp = Math.max(15, Math.min(state.player.maxHp || 100, data.hp));
    }
    if (typeof data.armor === 'number' && Number.isFinite(data.armor)) {
      state.player.armor = Math.max(0, Math.min(100, data.armor));
    }
    if (typeof data.weaponIndex === 'number' && Number.isFinite(data.weaponIndex)) {
      state.player.weaponIndex = Math.max(0, Math.min(4, Math.floor(data.weaponIndex)));
    }
    if (data.weaponAmmo && typeof data.weaponAmmo === 'object') {
      const defaults = createInitialWeaponAmmo();
      state.player.weaponAmmo = { ...defaults };
      for (const key of Object.keys(defaults)) {
        if (typeof data.weaponAmmo[key] === 'number' && Number.isFinite(data.weaponAmmo[key])) {
          state.player.weaponAmmo[key] = Math.max(0, Math.floor(data.weaponAmmo[key]));
        }
      }
    }
    if (typeof data.outfitId === 'string') {
      applyPlayerOutfit(state.player, data.outfitId);
    }
    if (typeof data.radioIndex === 'number' && Number.isFinite(data.radioIndex)) {
      state.player.radioIndex =
        ((Math.floor(data.radioIndex) % RADIO_STATIONS.length) + RADIO_STATIONS.length) %
        RADIO_STATIONS.length;
    }
    if (Array.isArray(data.completedIds)) {
      state.missions.completedIds = [...data.completedIds];
    }
    if (typeof data.missionIndex === 'number' && Number.isFinite(data.missionIndex)) {
      startMissionByIndex(state, data.missionIndex);
    }
    state.lastSaveStatus = 'LOADED SAVED CAREER FROM LOCALSTORAGE';
    return true;
  } catch {
    return false;
  }
}
