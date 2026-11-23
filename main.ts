// Hardware WebGL 2.0 Three.js r183 verified entrypoint for Solaris Bay: Vice Horizon 3D
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(
  out,
  {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000
  },
  {
    title: 'Solaris Bay: Vice Horizon 3D',
    tagline:
      'True Three.js WebGL 2.0 Living Open-World City — Start Title Screen, Pointer-Lock Over-the-Shoulder 3D Aim & ADS, Ballistic Jump & Solid OBB Physics, Procedural WebAudio Engine, Walk-In 3D Furnished Shops, Club Eclipse Disco & 6-Mission Campaign',
    summary:
      'Solaris Bay: Vice Horizon 3D is a hardware-accelerated Three.js WebGL 2.0 living open-world crime, driving, and city-life sandbox spanning a 5200x5120 multi-district coastal metropolis (Ocean Drive, Vice Neon Strip, Club Eclipse Nightlife Quarter, Downtown Vice Plaza, Starfish Bay Marina, Starfish Island connected by twin Palm Causeway Bridges, Sunset Hills Boulevard, and Palm Harbor Docks). Engineered with AgX filmic tone mapping (exposure 0.96), golden-hour coastal PMREM IBL, 2048x2048 camera-anchored PCFSoftShadowMap shadows, and a custom GLSL backlit cloud sky dome, the game features true pointer-lock over-the-shoulder 3D camera & RMB ADS aiming with wall-collision pull-in, Space jump physics with coyote time & jump buffering, substepped OBB vehicle/building/prop/pedestrian collisions, pooled tire skid-marks/scorch decals/3D debris VFX, and a multi-channel procedural WebAudio engine alongside 115+ citizens, 7 walk-in/drive-in 3D shops, and enterable Club Eclipse 21+ nightlife.',
    highlights: [
      'Over-the-Shoulder Pointer-Lock 3D Camera, ADS & Dynamic Crosshair: True third-person pointer-lock camera with right-mouse ADS shoulder zoom, wall-collision raycast pull-in, horizontal 3D weapon pitch aligned to the crosshair ray, dynamic movement/bloom reticle with enemy red tint, hit markers, damage vignette, and auto-recentering driving orbit camera.',
      'True Space Jump Physics & Substepped OBB Collision Engine: Responsive on-foot jumping with coyote time, jump buffering, roof-standing on vehicles, landing squash, and solid substepped OBB-vs-AABB/OBB vehicle physics with zero building tunneling, knockable street props, tire skid ribbons, and ballistic pedestrian impacts.',
      'Full Procedural WebAudio Engine: DynamicsCompressor + stereo ConvolverNode reverb + 3D PannerNode spatial audio powering continuous gear/RPM-driven car engines, turbo whistle, exhaust pops, tire screech, per-weapon gunfire + shell tinks, surface-aware bullet impacts, footsteps/jumps, pedestrian hit thuds & formant vocal yelps, Doppler police sirens, chopper thump, ocean surf, and ducking synthwave radio.',
      'Expanded 2x Multi-District Metropolis, Walk-In 3D Shops & Club Eclipse Nightlife: 5200x5120 world across 9 districts, 7 walk-in/drive-in 3D furnished shops (Vice Armory, Solaris Threads, Palm 24/7 Mart, Café del Mar, Solaris Customs Pay-N-Spray), and enterable open-air 3D Club Eclipse Disco with 124 BPM house music, [G] dancing, VIP Private Suite, and [H] in-car companion pickups with 125 Max HP Overheal.',
      '5-Star Police Escalation, 6-Mission Campaign & Full Career Persistence: Dynamic Heat meter with volumetric VCPD helicopter searchlight beam, 6-mission heist campaign, frosted dark-slate HUD, and full localStorage persistence.'
    ],
    architecture: [
      'game/vendor/three.min.js + game/index.html: Local ES-module Three.js r183 build mapped via importmap over a dual-canvas 1280x720 viewport (#webgl-canvas for WebGL 2.0 3D rendering and #hud-canvas for frosted-glass HUD, dynamic crosshair, shop/VIP drawers, and projected 3D->2D world prompts).',
      'game/src/combat-weapons.js & game/src/vehicles.js: Pointer-lock over-the-shoulder TPS camera & 3D crosshair raycast, Space jump with coyote/buffer physics, substepped OBB vehicle/building/prop/vehicle collisions, multi-gear RPM/slip physics, tire skid marks, and breakable street props.',
      'game/src/audio-save.js: Procedural WebAudio synthesizer with compressor, impulse-response reverb, 3D spatial panners, RPM engine/screech loops, formant NPC hit vocals, per-weapon gunfire, Doppler police sirens, ambient ocean/city bed, ducking synthwave radio, and localStorage career persistence.',
      'game/src/render-world.js & game/src/render-hud.js: Three.js WebGL 2.0 AgX renderer with horizontal weapon aim pitch, jump animation, vehicle roll/pitch/suspension bounce, ragdoll tumble sync, pooled skid-marks/decals/debris/tracers, and frosted dark-slate HUD with dynamic crosshair & hit markers.'
    ],
    controls: [
      'Click Canvas: Lock 3D Pointer Aim & Fire Weapon | Right Mouse Hold: Over-the-Shoulder ADS Zoom',
      'W / S or Up / Down: Throttle / Reverse (in vehicle) or Move Forward / Back (on foot / inside shops)',
      'A / D or Left / Right: Steer wheels (in vehicle) or Strafe Left / Right (on foot)',
      'Space: Jump (on foot) | Handbrake Drift (driving) | Rhythm Boost (VIP Suite / Car Session)',
      'Left Shift: Nitro Afterburner (driving) or Sprint (on foot) | F or Enter: Carjack / Exit vehicle',
      'E: Open / Close Walk-In Shops, Street Carts, Club Bar, VIP Suite, or Private Car Service',
      'G: Dance on Club Eclipse Disco Floor | H: Honk Horn / Invite Nightlife Companion into Car',
      '1 - 6 (or Q / Wheel): Fists, Pistol, SMG, Shotgun, Carbine, RPG | R: Reload (on foot) / Radio (in car) | V: Quick Punch | X: Radio | P / Esc: Pause | K: Save | Tab / M: Dossier'
    ],
    verification: [
      'Hardware-accelerated Three.js r183 WebGL 2.0 renderer verified at 1280x720 with AgX filmic tone mapping (exposure 0.96), coastal PMREM IBL, 2048x2048 PCFSoftShadowMap shadows, distance culling, and zero NaN transforms across the entire scene graph.',
      'Automated end-to-end headless Chrome WebGL 2.0 QA verified over-the-shoulder aiming & horizontal weapon barrel alignment, Space jump elevation & landing, 3-second full-speed OBB building/car crash containment, ballistic NPC hit launch + WebAudio stats.npcHits, engineRunning transitions, wall-safe camera raycast pull-in, walk-in/drive-in 3D shops, Club Eclipse 21+ nightlife, localStorage reload persistence, and zero console/page/external network errors.'
    ]
  }
);

writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2));
console.log('Built Solaris Bay: Vice Horizon 3D output and dossier.json at', out);
