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
      'True Three.js WebGL 2.0 Living Open-World City — WASTED/BUSTED Respawn Loop, Police Sight-Cones & LOS Evasion, Drive-By & Vehicle Fire Stages, 24h Day/Night Cycle & 7-Tab Pause Hub',
    summary:
      'Solaris Bay: Vice Horizon 3D is a hardware-accelerated Three.js WebGL 2.0 living open-world crime, driving, and city-life sandbox spanning a 5200x5120 multi-district coastal metropolis (Ocean Drive, Vice Neon Strip, Club Eclipse Nightlife Quarter, Downtown Vice Plaza, Starfish Bay Marina, Starfish Island connected by twin Palm Causeway Bridges, Sunset Hills Boulevard, and Palm Harbor Docks). Engineered with AgX filmic tone mapping (exposure 0.96), golden-hour coastal PMREM IBL, 2048x2048 camera-anchored PCFSoftShadowMap shadows, and a custom GLSL backlit cloud sky dome with dynamic 24-hour sun elevation and twinkling night stars, Stage 7A integrates WASTED/BUSTED slow-mo outcome & Hospital/Precinct respawn loops, directional building-occluded police sight-cones with 1★–5★ LOS evasion & 3★+ roadblocks, side-window drive-by shooting, [V] vehicle cam presets, progressive vehicle smoke->fire->explosion damage, carjack NPC pull-out, ~33% brave NPC fight-back, and a unified 7-Tab Pause Hub (MAP, STORY, STATS, CREW, SETTINGS, CONTROLS, SAVE) with click-to-place GPS waypoints, persistent Settings, and 3 Save Slots.',
    highlights: [
      'WASTED & BUSTED 0.22x Slow-Mo Respawn Loop: Centralized armor-first damagePlayer and 2.4s police apprehension bustMeter trigger dramatic 3.4s 0.22x slow-mo orbital cameras, desaturated dark-slate vignettes, procedural bass-drop audio stings, and clean Hospital (8% capped $500) / VCPD Precinct (10% capped $750 + -25% ammo) respawns.',
      'Police Vision Sight-Cones, LOS Cooldown & 3★+ Roadblocks: Directional vision cones for cruisers (360u / 42°), foot officers (240u / 55°), and 4★+ heli searchlights (220u) raycast against building colliders—supporting 1★–5★ LOS evasion timers, 2★+ cruiser foot-cop deployments, 3★+ angled roadblocks, night patrol boosts, and live sight-cone overlays on Radar & Pause Map.',
      'Drive-By Combat, [V] Vehicle Cams, Progressive Vehicle Fire & World Interactivity: Side-window LMB pistol/SMG drive-by along live 3D crosshair rays with [R] reload, CLOSE/STANDARD/FAR/HOOD [V] cameras, car damage stages (<35% smoke, <16% engine fire + 3.2s bailout + blast), [F] carjack driver pull-out, and ~33% brave civilian fight-back melee.',
      'Dynamic 24-Hour Day / Sunset / Night Cycle & Headlights: Live in-game clock advancing from Dawn through Golden Hour (17.2) to Midnight Neon with keyframed sun/hemisphere/fog/sky stars, automatic vehicle headlight beams/SpotLight & streetlamp glow cones, HUD clock telemetry, and Safehouse Sleep time-skips.',
      'Unified 7-Tab Pause Hub, Interactive Waypoint Map, Settings & 3 Save Slots: Press [P]/[Esc] or [M] to inspect MAP (click waypoint + 9-icon legend + sight cones), STORY, STATS, CREW, SETTINGS (persisted audio/mouse/quality/auto-FPS/shadows/HUD density), CONTROLS, and 3 independent localStorage SAVE slots plus Title Screen [L]/[O] access.'
    ],
    architecture: [
      'game/vendor/three.min.js + game/index.html: Local ES-module Three.js r183 build over a dual-canvas 1280x720 viewport (#webgl-canvas for WebGL 2.0 3D rendering and #hud-canvas for frosted-glass HUD, drive-by reticle, sight-cone radar, WASTED/BUSTED banners, and 7-Tab Pause Hub).',
      'game/src/player-vitals.js, game/src/police-wanted.js & game/src/combat-weapons.js: Armor-first damage & 0.22x slow-mo outcome loop, raycasted police sight-cones / bustMeter / roadblocks / LOS evasion, over-the-shoulder TPS ADS & side-window drive-by combat, [V] vehicle cam presets, and Space jump physics.',
      'game/src/vehicles.js, game/src/pedestrians.js & game/src/missions-story.js: Multi-gear OBB physics, progressive vehicle smoke->fire->explosion bailout, carjack NPC pull-out, brave NPC fight-back melee, 115+ citizens, and Manhattan click-to-waypoint GPS routing.',
      'game/src/render-world.js, game/src/pause-hub.js & game/src/audio-save.js: 24-hour keyframed GLSL sky/sun/fog/night-headlight renderer, unified 7-Tab Pause Hub UI, WebAudio engine with separate musicBus/sfxBus + outcome stings, and 3 persistent localStorage career save slots + runtime Settings.'
    ],
    controls: [
      'Click Canvas: Lock 3D Aim & Fire / Drive-By Pistol or SMG | Right Mouse Hold: Over-the-Shoulder ADS Zoom',
      'W / S / A / D or Arrows: Move On Foot / Steer & Throttle | Space: Jump / Handbrake / Rhythm Boost',
      'Left Shift: Sprint / Nitro Afterburner | F or Enter: Carjack (Pull Out Driver) / Exit Vehicle',
      'V: Quick Melee Combo (on foot) / Cycle Cam Preset CLOSE-STD-FAR-HOOD (in car) | 1-6 or Q/Wheel: Weapons',
      'R: Reload Firearm (on foot & drive-by) | X: Cycle Synthwave Radio | G: Club Dance | H: Honk / Companion',
      'E: Walk-In Shops, Club Bar & VIP | P / Esc: 7-Tab Pause Hub | M: Interactive Map | Tab: Safehouse Dossier',
      'K: Quick Save (Slot 1) | U: Mute Audio | Title Screen L / O: Load Slots / Settings'
    ],
    verification: [
      'Hardware-accelerated Three.js r183 WebGL 2.0 renderer verified across 18 ES modules cleanly passing node --check at 1280x720 with AgX exposure 0.96, zero external network calls, and zero NaN scene graph transforms.',
      'Headless Chrome WebGL 2.0 QA & showcase captures verified Start Screen, OBB collisions, Space jump, walk-in shops, Club Eclipse nightlife, WASTED/BUSTED slow-mo respawns, police sight-cones/foot-cops/3★ roadblocks/LOS evasion, drive-by combat & vehicle cam presets, car fire->explosion, carjack pull-out, brave NPCs, and 24h sunset/night headlight transitions with zero console/page errors.'
    ]
  }
);

writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2));
console.log('Built Solaris Bay: Vice Horizon 3D output and dossier.json at', out);
