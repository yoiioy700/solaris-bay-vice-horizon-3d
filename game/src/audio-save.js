import { RADIO_STATIONS, STORAGE_KEY } from './config.js';
import { startMissionByIndex } from './missions-story.js';

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

  function updateRadio(state, dt) {
    const station = RADIO_STATIONS[state.player.radioIndex] || RADIO_STATIONS[0];
    if (!station || station.bpm <= 0 || !ctx || ctx.state !== 'running') return;
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

  return {
    ensureContext,
    playShot,
    playExplosion,
    updateRadio
  };
}

export function saveCareerToStorage(state) {
  try {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      cash: state.player.cash,
      hp: state.player.hp,
      armor: state.player.armor,
      weaponIndex: state.player.weaponIndex,
      radioIndex: state.player.radioIndex,
      missionIndex: state.missions.currentIndex,
      completedIds: state.missions.completedIds
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    state.lastSaveStatus = 'CAREER SAVED TO LOCALSTORAGE';
    state.hudBanner = {
      title: 'SAFEHOUSE CAREER DOSSIER SAVED',
      subtitle: `BANKROLL $${state.player.cash.toLocaleString()} • PERSISTED TO LOCALSTORAGE`,
      color: '#10b981',
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

    if (typeof data.cash === 'number') state.player.cash = data.cash;
    if (typeof data.hp === 'number') state.player.hp = data.hp;
    if (typeof data.armor === 'number') state.player.armor = data.armor;
    if (typeof data.weaponIndex === 'number') state.player.weaponIndex = data.weaponIndex;
    if (typeof data.radioIndex === 'number') state.player.radioIndex = data.radioIndex;
    if (Array.isArray(data.completedIds)) {
      state.missions.completedIds = data.completedIds;
    }
    if (typeof data.missionIndex === 'number') {
      startMissionByIndex(state, data.missionIndex);
    }
    state.lastSaveStatus = 'LOADED SAVED CAREER FROM LOCALSTORAGE';
    return true;
  } catch {
    return false;
  }
}
