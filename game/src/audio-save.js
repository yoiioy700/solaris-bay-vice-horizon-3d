import { RADIO_STATIONS, STORAGE_KEY } from './config.js';
import { startMissionByIndex } from './missions-story.js';
import { applyPlayerOutfit, createInitialWeaponAmmo } from './shops-economy.js';

export function createAudioController() {
  let ctx = null;
  let graphReady = false;
  let compressor = null;
  let masterGain = null;
  let sfxBus = null;
  let musicDuckGain = null;
  let reverbNode = null;
  let reverbReturn = null;
  let noiseBuffer = null;

  let engineNodes = null;
  let screechNodes = null;
  let ambientNodes = null;
  let sirenNodes = null;
  let heliNodes = null;

  let noteStep = 0;
  let stepTimer = 0;
  let discoStep = 0;
  let discoTimer = 0;
  let duckTimer = 0;

  let listenerPos = { x: 2720, y: 2050, z: 12 };

  const stats = {
    engineRunning: false,
    npcHits: 0,
    shots: 0,
    crashes: 0,
    explosions: 0,
    footsteps: 0,
    jumps: 0,
    muted: false
  };

  function createNoiseBuffer(audio) {
    const length = audio.sampleRate * 2;
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.08 * white) / 1.08;
      data[i] = white * 0.52 + last * 1.15;
    }
    return buffer;
  }

  function createReverbImpulse(audio) {
    const seconds = 1.25;
    const len = Math.floor(audio.sampleRate * seconds);
    const buf = audio.createBuffer(2, len, audio.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.8);
        data[i] = (Math.random() * 2 - 1) * decay * 0.65;
      }
    }
    return buf;
  }

  function initGraph(audio) {
    if (graphReady || !audio) return;
    try {
      compressor = audio.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audio.currentTime);
      compressor.knee.setValueAtTime(18, audio.currentTime);
      compressor.ratio.setValueAtTime(5, audio.currentTime);
      compressor.attack.setValueAtTime(0.004, audio.currentTime);
      compressor.release.setValueAtTime(0.16, audio.currentTime);

      masterGain = audio.createGain();
      masterGain.gain.setValueAtTime(stats.muted ? 0 : 0.88, audio.currentTime);

      sfxBus = audio.createGain();
      sfxBus.gain.setValueAtTime(1.0, audio.currentTime);

      musicDuckGain = audio.createGain();
      musicDuckGain.gain.setValueAtTime(1.0, audio.currentTime);

      reverbNode = audio.createConvolver();
      reverbNode.buffer = createReverbImpulse(audio);
      reverbReturn = audio.createGain();
      reverbReturn.gain.setValueAtTime(0.16, audio.currentTime);

      noiseBuffer = createNoiseBuffer(audio);

      sfxBus.connect(compressor);
      musicDuckGain.connect(compressor);
      reverbNode.connect(reverbReturn);
      reverbReturn.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(audio.destination);

      graphReady = true;
    } catch {
      graphReady = false;
    }
  }

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
    if (ctx) {
      if (!graphReady) initGraph(ctx);
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
    return ctx;
  }

  function ensureContinuousVoices(audio) {
    if (!audio || !graphReady || audio.state !== 'running') return;
    const now = audio.currentTime;

    if (!engineNodes) {
      try {
        const osc1 = audio.createOscillator();
        const osc2 = audio.createOscillator();
        const oscSub = audio.createOscillator();
        const oscTurbo = audio.createOscillator();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        const turboGain = audio.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        oscSub.type = 'sine';
        oscTurbo.type = 'sine';

        osc1.frequency.setValueAtTime(52, now);
        osc2.frequency.setValueAtTime(104, now);
        oscSub.frequency.setValueAtTime(26, now);
        oscTurbo.frequency.setValueAtTime(1250, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, now);
        filter.Q.setValueAtTime(1.8, now);

        gain.gain.setValueAtTime(0.0001, now);
        turboGain.gain.setValueAtTime(0.0001, now);

        osc1.connect(filter);
        osc2.connect(filter);
        oscSub.connect(filter);
        filter.connect(gain);
        gain.connect(sfxBus);

        oscTurbo.connect(turboGain);
        turboGain.connect(sfxBus);

        osc1.start(now);
        osc2.start(now);
        oscSub.start(now);
        oscTurbo.start(now);

        engineNodes = { osc1, osc2, oscSub, oscTurbo, filter, gain, turboGain };
      } catch {
        engineNodes = null;
      }
    }

    if (!screechNodes && noiseBuffer) {
      try {
        const src = audio.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const bp = audio.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1380, now);
        bp.Q.setValueAtTime(4.8, now);
        const gain = audio.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        src.connect(bp);
        bp.connect(gain);
        gain.connect(sfxBus);
        src.start(now);
        screechNodes = { src, bp, gain };
      } catch {
        screechNodes = null;
      }
    }

    if (!ambientNodes && noiseBuffer) {
      try {
        const windSrc = audio.createBufferSource();
        windSrc.buffer = noiseBuffer;
        windSrc.loop = true;
        const windLp = audio.createBiquadFilter();
        windLp.type = 'lowpass';
        windLp.frequency.setValueAtTime(260, now);
        const windGain = audio.createGain();
        windGain.gain.setValueAtTime(0.008, now);
        windSrc.connect(windLp);
        windLp.connect(windGain);
        windGain.connect(sfxBus);
        windSrc.start(now);

        const oceanSrc = audio.createBufferSource();
        oceanSrc.buffer = noiseBuffer;
        oceanSrc.loop = true;
        const oceanBp = audio.createBiquadFilter();
        oceanBp.type = 'bandpass';
        oceanBp.frequency.setValueAtTime(380, now);
        oceanBp.Q.setValueAtTime(0.65, now);
        const oceanGain = audio.createGain();
        oceanGain.gain.setValueAtTime(0.0001, now);
        oceanSrc.connect(oceanBp);
        oceanBp.connect(oceanGain);
        oceanGain.connect(sfxBus);
        oceanSrc.start(now);

        ambientNodes = { windGain, oceanGain, oceanBp };
      } catch {
        ambientNodes = null;
      }
    }

    if (!sirenNodes) {
      try {
        const osc = audio.createOscillator();
        const lp = audio.createBiquadFilter();
        const gain = audio.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(680, now);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1650, now);
        gain.gain.setValueAtTime(0.0001, now);
        osc.connect(lp);
        lp.connect(gain);
        gain.connect(sfxBus);
        osc.start(now);
        sirenNodes = { osc, lp, gain };
      } catch {
        sirenNodes = null;
      }
    }

    if (!heliNodes && noiseBuffer) {
      try {
        const src = audio.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        const lp = audio.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(175, now);
        const gain = audio.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        src.connect(lp);
        lp.connect(gain);
        gain.connect(sfxBus);
        src.start(now);
        heliNodes = { src, lp, gain };
      } catch {
        heliNodes = null;
      }
    }
  }

  function createSpatialNode(audio, wx, wy, wz = 4, reverbMix = 0.14, refDist = 46, maxDist = 640) {
    const out = audio.createGain();
    const dry = audio.createGain();
    dry.gain.setValueAtTime(1.0, audio.currentTime);
    out.connect(dry);

    if (typeof wx === 'number' && typeof wy === 'number' && audio.createPanner) {
      const panner = audio.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = refDist;
      panner.maxDistance = maxDist;
      panner.rolloffFactor = 1.15;
      if (panner.positionX) {
        panner.positionX.setValueAtTime(wx, audio.currentTime);
        panner.positionY.setValueAtTime(wz, audio.currentTime);
        panner.positionZ.setValueAtTime(wy, audio.currentTime);
      } else if (panner.setPosition) {
        panner.setPosition(wx, wz, wy);
      }
      dry.connect(panner);
      panner.connect(sfxBus || audio.destination);
    } else {
      dry.connect(sfxBus || audio.destination);
    }

    if (reverbNode && reverbMix > 0.001) {
      const send = audio.createGain();
      send.gain.setValueAtTime(reverbMix, audio.currentTime);
      out.connect(send);
      send.connect(reverbNode);
    }
    return out;
  }

  function triggerDuck(level = 0.42, duration = 0.24) {
    duckTimer = Math.max(duckTimer, duration);
    if (!ctx || !musicDuckGain || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      musicDuckGain.gain.cancelScheduledValues(now);
      musicDuckGain.gain.setTargetAtTime(level, now, 0.015);
    } catch {
      // Ignore scheduling edge
    }
  }

  function spawnNoiseBurst(audio, dest, startTime, dur, filterType, freqStart, freqEnd, gainPeak, q = 1.0) {
    if (!noiseBuffer) return;
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audio.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(Math.max(30, freqStart), startTime);
    if (freqEnd && freqEnd !== freqStart) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), startTime + dur);
    }
    const g = audio.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, gainPeak), startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(startTime, Math.random() * 1.1, dur + 0.02);
    src.stop(startTime + dur + 0.03);
  }

  function playShot(weaponId, x, y) {
    stats.shots++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 12, weaponId === 'rpg' ? 0.26 : 0.16);
      triggerDuck(weaponId === 'rpg' ? 0.32 : 0.62, 0.22);

      if (weaponId === 'rpg') {
        spawnNoiseBurst(audio, dest, now, 0.42, 'bandpass', 520, 190, 0.22, 0.9);
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.34);
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (weaponId === 'shotgun') {
        spawnNoiseBurst(audio, dest, now, 0.24, 'lowpass', 2400, 320, 0.26, 0.7);
        const body = audio.createOscillator();
        const bg = audio.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(155, now);
        body.frequency.exponentialRampToValueAtTime(38, now + 0.15);
        bg.gain.setValueAtTime(0.18, now);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        body.connect(bg);
        bg.connect(dest);
        body.start(now);
        body.stop(now + 0.18);
      } else if (weaponId === 'carbine') {
        spawnNoiseBurst(audio, dest, now, 0.14, 'bandpass', 1850, 480, 0.18, 1.1);
        const crack = audio.createOscillator();
        const cg = audio.createGain();
        crack.type = 'sawtooth';
        crack.frequency.setValueAtTime(340, now);
        crack.frequency.exponentialRampToValueAtTime(75, now + 0.08);
        cg.gain.setValueAtTime(0.09, now);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        crack.connect(cg);
        cg.connect(dest);
        crack.start(now);
        crack.stop(now + 0.1);
      } else if (weaponId === 'smg') {
        spawnNoiseBurst(audio, dest, now, 0.08, 'bandpass', 2200, 720, 0.13, 1.2);
        const pop = audio.createOscillator();
        const pg = audio.createGain();
        pop.type = 'triangle';
        pop.frequency.setValueAtTime(420, now);
        pop.frequency.exponentialRampToValueAtTime(105, now + 0.06);
        pg.gain.setValueAtTime(0.08, now);
        pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        pop.connect(pg);
        pg.connect(dest);
        pop.start(now);
        pop.stop(now + 0.07);
      } else {
        // Pistol
        spawnNoiseBurst(audio, dest, now, 0.12, 'bandpass', 1950, 520, 0.16, 1.0);
        const thump = audio.createOscillator();
        const tg = audio.createGain();
        thump.type = 'triangle';
        thump.frequency.setValueAtTime(280, now);
        thump.frequency.exponentialRampToValueAtTime(68, now + 0.08);
        tg.gain.setValueAtTime(0.11, now);
        tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        thump.connect(tg);
        tg.connect(dest);
        thump.start(now);
        thump.stop(now + 0.1);
      }

      // Subtle metallic brass shell casing tink on firearm shots
      if (weaponId !== 'rpg') {
        const tink = audio.createOscillator();
        const tkGain = audio.createGain();
        const t = now + 0.17 + Math.random() * 0.07;
        tink.type = 'sine';
        tink.frequency.setValueAtTime(4400 + Math.random() * 900, t);
        tkGain.gain.setValueAtTime(0.012, t);
        tkGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        tink.connect(tkGain);
        tkGain.connect(dest);
        tink.start(t);
        tink.stop(t + 0.05);
      }
    } catch {
      // Ignore autoplay constraints in headless mode
    }
  }

  function playBulletImpact(surface, x, y) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 5, 0.1);
      if (surface === 'metal') {
        const ping = audio.createOscillator();
        const g = audio.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(1180 + Math.random() * 480, now);
        ping.frequency.exponentialRampToValueAtTime(760, now + 0.11);
        g.gain.setValueAtTime(0.055, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        ping.connect(g);
        g.connect(dest);
        ping.start(now);
        ping.stop(now + 0.13);
        spawnNoiseBurst(audio, dest, now, 0.06, 'highpass', 1800, 1200, 0.06);
      } else if (surface === 'flesh') {
        spawnNoiseBurst(audio, dest, now, 0.065, 'lowpass', 720, 220, 0.08);
      } else {
        spawnNoiseBurst(audio, dest, now, 0.075, 'bandpass', 1600, 580, 0.07, 1.4);
        if (Math.random() < 0.35) {
          const ric = audio.createOscillator();
          const rg = audio.createGain();
          ric.type = 'sine';
          ric.frequency.setValueAtTime(1600 + Math.random() * 600, now);
          ric.frequency.exponentialRampToValueAtTime(3400, now + 0.11);
          rg.gain.setValueAtTime(0.025, now);
          rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          ric.connect(rg);
          rg.connect(dest);
          ric.start(now);
          ric.stop(now + 0.13);
        }
      }
    } catch {
      // Ignore WebAudio constraints
    }
  }

  function playExplosion(x, y) {
    stats.explosions++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 8, 0.34, 70, 900);
      triggerDuck(0.24, 0.45);

      const sub = audio.createOscillator();
      const sg = audio.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(98, now);
      sub.frequency.exponentialRampToValueAtTime(22, now + 0.55);
      sg.gain.setValueAtTime(0.28, now);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      sub.connect(sg);
      sg.connect(dest);
      sub.start(now);
      sub.stop(now + 0.6);

      spawnNoiseBurst(audio, dest, now, 0.68, 'lowpass', 1450, 140, 0.34, 0.7);
      spawnNoiseBurst(audio, dest, now + 0.04, 0.42, 'bandpass', 580, 120, 0.18, 0.8);
    } catch {
      // Ignore autoplay constraints
    }
  }

  function triggerFormantVoice(audio, dest, basePitch, duration, intensity) {
    const now = audio.currentTime;
    const glottal = audio.createOscillator();
    glottal.type = 'sawtooth';
    const p = Math.max(95, Math.min(340, basePitch || 175));
    glottal.frequency.setValueAtTime(p * 1.18, now);
    glottal.frequency.exponentialRampToValueAtTime(p * 0.76, now + duration);

    const f1 = audio.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(640 + Math.random() * 180, now);
    f1.Q.setValueAtTime(4.5, now);

    const f2 = audio.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1280 + Math.random() * 320, now);
    f2.Q.setValueAtTime(5.2, now);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.095 * intensity, now + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    glottal.connect(f1);
    glottal.connect(f2);
    f1.connect(env);
    f2.connect(env);
    env.connect(dest);
    glottal.start(now);
    glottal.stop(now + duration + 0.02);
  }

  function playNpcHit(speed = 120, pitch = 170, x, y) {
    stats.npcHits++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const intensity = Math.max(0.45, Math.min(1.2, (speed || 120) / 170));
      const dest = createSpatialNode(audio, x, y, 8, 0.14);

      const thud = audio.createOscillator();
      const tg = audio.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(118, now);
      thud.frequency.exponentialRampToValueAtTime(36, now + 0.14);
      tg.gain.setValueAtTime(0.18 * intensity, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      thud.connect(tg);
      tg.connect(dest);
      thud.start(now);
      thud.stop(now + 0.17);

      spawnNoiseBurst(audio, dest, now, 0.11, 'lowpass', 640, 180, 0.13 * intensity);
      triggerFormantVoice(audio, dest, pitch, 0.22 + Math.random() * 0.08, intensity);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playNpcGrunt(pitch = 165, x, y) {
    stats.npcHits++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const dest = createSpatialNode(audio, x, y, 10, 0.1);
      triggerFormantVoice(audio, dest, pitch, 0.16 + Math.random() * 0.06, 0.75);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playCrash(intensity = 0.6, x, y) {
    stats.crashes++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const amp = Math.max(0.25, Math.min(1.1, intensity));
      const dest = createSpatialNode(audio, x, y, 6, 0.16);

      spawnNoiseBurst(audio, dest, now, 0.24, 'bandpass', 680, 190, 0.22 * amp, 0.9);
      const thump = audio.createOscillator();
      const tg = audio.createGain();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(105, now);
      thump.frequency.exponentialRampToValueAtTime(32, now + 0.18);
      tg.gain.setValueAtTime(0.16 * amp, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      thump.connect(tg);
      tg.connect(dest);
      thump.start(now);
      thump.stop(now + 0.22);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playPropHit(kind, x, y) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 5, 0.14);
      if (kind === 'hydrant') {
        const clang = audio.createOscillator();
        const cg = audio.createGain();
        clang.type = 'triangle';
        clang.frequency.setValueAtTime(620, now);
        clang.frequency.exponentialRampToValueAtTime(240, now + 0.15);
        cg.gain.setValueAtTime(0.11, now);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
        clang.connect(cg);
        cg.connect(dest);
        clang.start(now);
        clang.stop(now + 0.18);
        spawnNoiseBurst(audio, dest, now + 0.04, 0.36, 'bandpass', 1800, 1200, 0.09, 1.4);
      } else {
        spawnNoiseBurst(audio, dest, now, 0.16, 'bandpass', 820, 260, 0.12, 1.0);
      }
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playExhaustPop(x, y) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 4, 0.1);
      const pop = audio.createOscillator();
      const pg = audio.createGain();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(145, now);
      pop.frequency.exponentialRampToValueAtTime(48, now + 0.07);
      pg.gain.setValueAtTime(0.08, now);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      pop.connect(pg);
      pg.connect(dest);
      pop.start(now);
      pop.stop(now + 0.09);
      spawnNoiseBurst(audio, dest, now, 0.055, 'lowpass', 950, 280, 0.075);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playFootstep(surface = 'pavement', isSprinting = false, x, y) {
    stats.footsteps++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const amp = isSprinting ? 0.052 : 0.032;
      const dest = createSpatialNode(audio, x, y, 1, 0.04);
      if (surface === 'sand') {
        spawnNoiseBurst(audio, dest, now, 0.085, 'bandpass', 1350, 620, amp * 0.9, 1.1);
      } else if (surface === 'boardwalk') {
        const knock = audio.createOscillator();
        const kg = audio.createGain();
        knock.type = 'sine';
        knock.frequency.setValueAtTime(185 + Math.random() * 25, now);
        knock.frequency.exponentialRampToValueAtTime(88, now + 0.055);
        kg.gain.setValueAtTime(amp * 1.15, now);
        kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        knock.connect(kg);
        kg.connect(dest);
        knock.start(now);
        knock.stop(now + 0.065);
      } else {
        spawnNoiseBurst(audio, dest, now, 0.048, 'bandpass', 780, 340, amp, 1.4);
      }
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playJump(x, y) {
    stats.jumps++;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 6, 0.05);
      spawnNoiseBurst(audio, dest, now, 0.13, 'bandpass', 320, 740, 0.055, 1.2);
      const lift = audio.createOscillator();
      const lg = audio.createGain();
      lift.type = 'sine';
      lift.frequency.setValueAtTime(140, now);
      lift.frequency.exponentialRampToValueAtTime(220, now + 0.09);
      lg.gain.setValueAtTime(0.038, now);
      lg.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      lift.connect(lg);
      lg.connect(dest);
      lift.start(now);
      lift.stop(now + 0.11);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playLand(intensity = 0.6, x, y) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const amp = Math.max(0.35, Math.min(1.0, intensity));
      const dest = createSpatialNode(audio, x, y, 1, 0.06);
      const thump = audio.createOscillator();
      const tg = audio.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(115, now);
      thump.frequency.exponentialRampToValueAtTime(42, now + 0.09);
      tg.gain.setValueAtTime(0.095 * amp, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      thump.connect(tg);
      tg.connect(dest);
      thump.start(now);
      thump.stop(now + 0.11);
      spawnNoiseBurst(audio, dest, now, 0.08, 'lowpass', 650, 220, 0.065 * amp);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function onVehicleEnter(v) {
    stats.engineRunning = true;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, v ? v.x : listenerPos.x, v ? v.y : listenerPos.y, 6, 0.08);
      // Door clunk + starter crank
      const door = audio.createOscillator();
      const dg = audio.createGain();
      door.type = 'sine';
      door.frequency.setValueAtTime(135, now);
      door.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      dg.gain.setValueAtTime(0.1, now);
      dg.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      door.connect(dg);
      dg.connect(dest);
      door.start(now);
      door.stop(now + 0.11);

      const crank = audio.createOscillator();
      const cg = audio.createGain();
      crank.type = 'sawtooth';
      crank.frequency.setValueAtTime(95, now + 0.08);
      crank.frequency.linearRampToValueAtTime(155, now + 0.24);
      cg.gain.setValueAtTime(0.0001, now + 0.08);
      cg.gain.linearRampToValueAtTime(0.045, now + 0.12);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      crank.connect(cg);
      cg.connect(dest);
      crank.start(now + 0.08);
      crank.stop(now + 0.28);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function onVehicleExit(v) {
    stats.engineRunning = false;
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, v ? v.x : listenerPos.x, v ? v.y : listenerPos.y, 6, 0.08);
      const clunk = audio.createOscillator();
      const cg = audio.createGain();
      clunk.type = 'sine';
      clunk.frequency.setValueAtTime(115, now);
      clunk.frequency.exponentialRampToValueAtTime(42, now + 0.08);
      cg.gain.setValueAtTime(0.08, now);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      clunk.connect(cg);
      cg.connect(dest);
      clunk.start(now);
      clunk.stop(now + 0.1);
    } catch {
      // Ignore WebAudio limits
    }
  }

  function playHorn(x, y) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const dest = createSpatialNode(audio, x, y, 8, 0.12);
      for (const freq of [349.23, 440.0]) {
        const osc = audio.createOscillator();
        const lp = audio.createBiquadFilter();
        const gain = audio.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1450, now);
        gain.gain.setValueAtTime(0.036, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(lp);
        lp.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {
      // Ignore autoplay constraints
    }
  }

  function playIntimatePulse(isCar = false) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const bass = audio.createOscillator();
      const bGain = audio.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(isCar ? 92 : 110, now);
      bass.frequency.exponentialRampToValueAtTime(54, now + 0.22);
      bGain.gain.setValueAtTime(0.05, now);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      bass.connect(bGain);
      bGain.connect(sfxBus || audio.destination);
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
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      top.connect(tGain);
      tGain.connect(sfxBus || audio.destination);
      top.start(now + 0.02);
      top.stop(now + 0.24);
    } catch {
      // Ignore autoplay constraints
    }
  }

  function updateRadio(state, dt) {
    if (!ctx || ctx.state !== 'running' || !graphReady) return;

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
            kick.frequency.setValueAtTime(124, now);
            kick.frequency.exponentialRampToValueAtTime(42, now + 0.12);
            kGain.gain.setValueAtTime(0.068 * volScale, now);
            kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
            kick.connect(kGain);
            kGain.connect(musicDuckGain);
            kick.start(now);
            kick.stop(now + 0.14);
          }
          const houseBass = [
            110, 220, 110, 220, 130.81, 261.63, 146.83, 293.66,
            110, 220, 164.81, 146.83, 130.81, 261.63, 98.0, 196.0
          ];
          const synth = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const sGain = ctx.createGain();
          synth.type = idx % 2 === 1 ? 'sawtooth' : 'triangle';
          synth.frequency.setValueAtTime(houseBass[idx], now);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(780, now);
          sGain.gain.setValueAtTime(0.022 * volScale, now);
          sGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDur * 0.85);
          synth.connect(lp);
          lp.connect(sGain);
          sGain.connect(musicDuckGain);
          synth.start(now);
          synth.stop(now + stepDur * 0.9);
        } catch {
          // Ignore WebAudio scheduling edge
        }
      }
      return;
    }

    const station = RADIO_STATIONS[state.player.radioIndex] || RADIO_STATIONS[0];
    if (!station || station.bpm <= 0 || !state.player.vehicle) return;

    const stepDuration = 60 / station.bpm / 2;
    stepTimer += dt;
    if (stepTimer >= stepDuration) {
      stepTimer -= stepDuration;
      const stepIdx = noteStep++;
      const freq = station.notes[stepIdx % station.notes.length];
      const bassFreq = station.bass && station.bass[Math.floor(stepIdx / 2) % station.bass.length];
      try {
        const now = ctx.currentTime;
        if (freq) {
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(station.cutoff || 820, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.017, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 0.88);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(musicDuckGain);
          osc.start(now);
          osc.stop(now + stepDuration * 0.9);
        }
        if (bassFreq && stepIdx % 2 === 0) {
          const bOsc = ctx.createOscillator();
          const bLp = ctx.createBiquadFilter();
          const bGain = ctx.createGain();
          bOsc.type = 'sawtooth';
          bOsc.frequency.setValueAtTime(bassFreq, now);
          bLp.type = 'lowpass';
          bLp.frequency.setValueAtTime(340, now);
          bGain.gain.setValueAtTime(0.02, now);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 1.7);
          bOsc.connect(bLp);
          bLp.connect(bGain);
          bGain.connect(musicDuckGain);
          bOsc.start(now);
          bOsc.stop(now + stepDuration * 1.75);
        }
      } catch {
        // Ignore audio context timing issue
      }
    }
  }

  function update(state, dt = 0.016) {
    const player = state && state.player;
    const activeVeh = player ? player.vehicle : null;
    stats.engineRunning = Boolean(activeVeh && !activeVeh.destroyed);

    if (player) {
      listenerPos.x = player.x;
      listenerPos.y = player.y;
      listenerPos.z = (player.z || 0) + 12;
    }

    if (!ctx || ctx.state !== 'running' || !graphReady) {
      return;
    }

    ensureContinuousVoices(ctx);
    const now = ctx.currentTime;

    // Update WebAudio 3D listener pose from player / camera
    try {
      const L = ctx.listener;
      const yaw =
        state.camera && typeof state.camera.yaw === 'number'
          ? state.camera.yaw
          : player
            ? player.angle
            : -Math.PI * 0.5;
      const pitch = state.camera && typeof state.camera.pitch === 'number' ? state.camera.pitch : 0;
      const fx = Math.cos(pitch) * Math.cos(yaw);
      const fy = Math.sin(pitch);
      const fz = Math.cos(pitch) * Math.sin(yaw);

      if (L.positionX) {
        L.positionX.setValueAtTime(listenerPos.x, now);
        L.positionY.setValueAtTime(listenerPos.z, now);
        L.positionZ.setValueAtTime(listenerPos.y, now);
        L.forwardX.setValueAtTime(fx, now);
        L.forwardY.setValueAtTime(fy, now);
        L.forwardZ.setValueAtTime(fz, now);
        L.upX.setValueAtTime(0, now);
        L.upY.setValueAtTime(1, now);
        L.upZ.setValueAtTime(0, now);
      } else if (L.setPosition) {
        L.setPosition(listenerPos.x, listenerPos.z, listenerPos.y);
        if (L.setOrientation) L.setOrientation(fx, fy, fz, 0, 1, 0);
      }
    } catch {
      // Ignore listener edge
    }

    // Music duck recovery
    if (duckTimer > 0) {
      duckTimer = Math.max(0, duckTimer - dt);
      if (duckTimer <= 0 && musicDuckGain) {
        musicDuckGain.gain.setTargetAtTime(1.0, now, 0.14);
      }
    }

    // Continuous player car engine & tire screech
    if (engineNodes) {
      if (stats.engineRunning && activeVeh) {
        const baseFreq = activeVeh.isHeavy
          ? 38
          : activeVeh.isPolice
            ? 54
            : activeVeh.typeId === 'apex_gt' || activeVeh.typeId === 'comet_cabrio'
              ? 62
              : 48;
        const rpm = Math.max(0.16, Math.min(1.05, activeVeh.rpm || 0.22));
        const freq = baseFreq * (0.86 + rpm * 2.45);
        engineNodes.osc1.frequency.setTargetAtTime(freq, now, 0.045);
        engineNodes.osc2.frequency.setTargetAtTime(freq * 1.995, now, 0.045);
        engineNodes.oscSub.frequency.setTargetAtTime(freq * 0.5, now, 0.045);
        engineNodes.filter.frequency.setTargetAtTime(185 + rpm * 880, now, 0.05);
        engineNodes.gain.gain.setTargetAtTime(0.036 + rpm * 0.044, now, 0.05);

        const turboLevel = activeVeh.nitroActive ? 0.018 : 0.0001;
        engineNodes.oscTurbo.frequency.setTargetAtTime(1150 + rpm * 1650, now, 0.06);
        engineNodes.turboGain.gain.setTargetAtTime(turboLevel, now, 0.06);
      } else {
        engineNodes.gain.gain.setTargetAtTime(0.0001, now, 0.08);
        engineNodes.turboGain.gain.setTargetAtTime(0.0001, now, 0.06);
      }
    }

    if (screechNodes) {
      const slip = activeVeh
        ? Math.max(
            activeVeh.slipIntensity || 0,
            activeVeh.drifting ? 0.68 : 0,
            activeVeh.braking && activeVeh.speed > 125 ? 0.45 : 0
          )
        : 0;
      screechNodes.gain.gain.setTargetAtTime(slip > 0.06 ? Math.min(0.052, slip * 0.056) : 0.0001, now, 0.04);
    }

    // Coastal ocean surf + urban wind bed
    if (ambientNodes && player) {
      const coastProx = Math.max(0, Math.min(1, (player.x - 2460) / 420));
      ambientNodes.oceanGain.gain.setTargetAtTime(0.0001 + coastProx * 0.022, now, 0.2);
      ambientNodes.windGain.gain.setTargetAtTime(0.006 + (activeVeh ? Math.min(0.014, activeVeh.speed / 22000) : 0), now, 0.15);
    }

    // Police sirens with Doppler pitch shift + Chopper rotor thump
    const wanted = state && state.wanted;
    if (sirenNodes) {
      let nearestCop = null;
      let nearestDist = 660;
      if (wanted && wanted.stars > 0 && state.vehicles && player) {
        for (const v of state.vehicles) {
          if (!v.isPolice || v.destroyed) continue;
          const d = Math.hypot(v.x - player.x, v.y - player.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestCop = v;
          }
        }
      }
      if (nearestCop && player) {
        const dx = player.x - nearestCop.x;
        const dy = player.y - nearestCop.y;
        const dist = Math.max(18, nearestDist);
        const relVx = (nearestCop.vx || 0) - (player.vx || 0);
        const relVy = (nearestCop.vy || 0) - (player.vy || 0);
        const closingVel = (relVx * dx + relVy * dy) / dist;
        const doppler = Math.max(0.82, Math.min(1.22, 1 + closingVel / 920));
        const wail = 740 + Math.sin((wanted.sirenTimer || 0) * 0.65) * 195;
        const atten = Math.max(0, 1 - dist / 660);
        sirenNodes.osc.frequency.setTargetAtTime(wail * doppler, now, 0.05);
        sirenNodes.gain.gain.setTargetAtTime(0.0001 + atten * atten * 0.024, now, 0.06);
      } else {
        sirenNodes.gain.gain.setTargetAtTime(0.0001, now, 0.1);
      }
    }

    if (heliNodes) {
      if (wanted && wanted.helicopter && wanted.helicopter.active && player) {
        const h = wanted.helicopter;
        const dist = Math.hypot(h.x - player.x, h.y - player.y);
        if (dist < 560) {
          const atten = Math.max(0, 1 - dist / 560);
          const chopPulse = 0.55 + 0.45 * Math.sin((h.rotorAngle || 0) * 1.4);
          heliNodes.gain.gain.setTargetAtTime(0.0001 + atten * 0.036 * chopPulse, now, 0.03);
        } else {
          heliNodes.gain.gain.setTargetAtTime(0.0001, now, 0.1);
        }
      } else {
        heliNodes.gain.gain.setTargetAtTime(0.0001, now, 0.1);
      }
    }

    updateRadio(state, dt);
  }

  function playShopChime(soft = false) {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
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
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(gain);
        gain.connect(sfxBus || audio.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {
      // Ignore autoplay constraints
    }
  }

  function playErrorTone() {
    const audio = ensureContext();
    if (!audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.14);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(sfxBus || audio.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore autoplay constraints
    }
  }

  function setMuted(muted) {
    stats.muted = Boolean(muted);
    if (ctx && masterGain) {
      try {
        masterGain.gain.setTargetAtTime(stats.muted ? 0 : 0.88, ctx.currentTime, 0.03);
      } catch {
        // Ignore
      }
    }
  }

  return {
    stats,
    ensureContext,
    setMuted,
    playShot,
    playBulletImpact,
    playExplosion,
    playNpcHit,
    playNpcGrunt,
    playCrash,
    playPropHit,
    playExhaustPop,
    playFootstep,
    playJump,
    playLand,
    onVehicleEnter,
    onVehicleExit,
    playShopChime,
    playErrorTone,
    playHorn,
    playIntimatePulse,
    updateRadio,
    update
  };
}

export function hasSavedCareer() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function clearCareerStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getSavedCareerSummary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      cash: typeof data.cash === 'number' ? Math.max(0, data.cash) : 42500,
      maxHp: typeof data.maxHp === 'number' ? data.maxHp : 100,
      completedCount: Array.isArray(data.completedIds) ? data.completedIds.length : 0,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0
    };
  } catch {
    return null;
  }
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
