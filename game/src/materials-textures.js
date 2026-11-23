import * as THREE from 'three';

/**
 * Builds a calm, natural Miami golden-hour coastal sky IBL dome and bakes it
 * with PMREMGenerator so clearcoat cars, architectural glass, and ocean surfaces
 * reflect serene azure sky, warm sunlit golden horizon, and muted ground bounce
 * without harsh neon or overexposed white studio panels.
 */
export function createStudioEnvironmentMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x5a7ea3);

  // Smooth procedural sky-dome sphere for clean gradient reflections
  const domeGeo = new THREE.SphereGeometry(60, 24, 16);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uZenith: { value: new THREE.Color(0x285682) },
      uMidSky: { value: new THREE.Color(0x638cb4) },
      uHorizon: { value: new THREE.Color(0xe2c39b) },
      uGround: { value: new THREE.Color(0x3a342e) },
      uSunDir: { value: new THREE.Vector3(0.56, 0.52, -0.64).normalize() }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMidSky;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col;
        if (d.y >= 0.0) {
          col = mix(uHorizon, uMidSky, smoothstep(0.0, 0.28, d.y));
          col = mix(col, uZenith, smoothstep(0.22, 0.85, d.y));
          float sunDot = max(dot(d, uSunDir), 0.0);
          col += vec3(1.0, 0.88, 0.72) * pow(sunDot, 12.0) * 0.45;
          col += vec3(1.0, 0.92, 0.80) * pow(sunDot, 64.0) * 0.75;
        } else {
          col = mix(uHorizon * 0.65, uGround, smoothstep(0.0, -0.35, d.y));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  domeGeo.dispose();
  domeMat.dispose();
  pmrem.dispose();
  return envTexture;
}

/**
 * Rich weathered dark slate asphalt road diffuse & roughness map pair
 * with granite curb gutters, subtle tire wear lanes, muted double-yellow centerlines,
 * and weathered warm-white dashed lane markers.
 */
export function createAsphaltRoadTextures() {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 512;
  diffCanvas.height = 512;
  const ctx = diffCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rCtx = roughCanvas.getContext('2d');

  // Base weathered slate asphalt (#2b2f37)
  ctx.fillStyle = '#2b2f37';
  ctx.fillRect(0, 0, 512, 512);

  // Base asphalt roughness (~0.85 -> 217)
  rCtx.fillStyle = 'rgb(218, 218, 218)';
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle multi-scale mineral aggregate grain
  for (let i = 0; i < 9000; i++) {
    const x = (i * 73 + ((i * 17) % 31)) % 512;
    const y = (i * 139 + ((i * 29) % 97)) % 512;
    const delta = (i % 17) - 8;
    const r = 43 + delta;
    const g = 47 + delta;
    const b = 55 + delta;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, 2, 2);

    const rv = 208 + (i % 28);
    rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
    rCtx.fillRect(x, y, 2, 2);
  }

  // Darker tire-wear tracks with slightly smoother roughness so golden sunlight grazes the lanes
  for (const laneCenter of [144, 368]) {
    for (const trackOffset of [-26, 26]) {
      const tx = laneCenter + trackOffset;
      const grad = ctx.createLinearGradient(tx - 24, 0, tx + 24, 0);
      grad.addColorStop(0, 'rgba(24, 27, 33, 0)');
      grad.addColorStop(0.5, 'rgba(24, 27, 33, 0.36)');
      grad.addColorStop(1, 'rgba(24, 27, 33, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tx - 24, 0, 48, 512);

      const rGrad = rCtx.createLinearGradient(tx - 24, 0, tx + 24, 0);
      rGrad.addColorStop(0, 'rgba(182, 182, 182, 0)');
      rGrad.addColorStop(0.5, 'rgba(176, 176, 176, 0.65)');
      rGrad.addColorStop(1, 'rgba(182, 182, 182, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(tx - 24, 0, 48, 512);
    }
  }

  // Subtle granite curb & concrete gutter along road shoulders
  ctx.fillStyle = '#7b766e';
  ctx.fillRect(0, 0, 12, 512);
  ctx.fillRect(500, 0, 12, 512);
  ctx.fillStyle = 'rgba(18, 21, 26, 0.45)';
  ctx.fillRect(12, 0, 5, 512);
  ctx.fillRect(495, 0, 5, 512);

  // Subtle weathered outer edge lines
  ctx.fillStyle = 'rgba(196, 191, 179, 0.68)';
  ctx.fillRect(24, 0, 5, 512);
  ctx.fillRect(483, 0, 5, 512);

  // Muted golden-yellow double center divider lines (#c49c42)
  ctx.fillStyle = 'rgba(196, 156, 66, 0.88)';
  ctx.fillRect(248, 0, 5, 512);
  ctx.fillRect(259, 0, 5, 512);

  // Weathered warm-white dashed lane dividers (#c4bfb3)
  ctx.fillStyle = 'rgba(196, 191, 179, 0.78)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(136, y, 5, 32);
    ctx.fillRect(371, y, 5, 32);
  }

  const map = new THREE.CanvasTexture(diffCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;

  return { map, roughnessMap };
}

/**
 * Intersection asphalt texture with weathered warm-ivory zebra crosswalk stripes.
 */
export function createIntersectionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b2f37';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6000; i++) {
    const x = (i * 89) % 512;
    const y = (i * 151 + ((i * 19) % 83)) % 512;
    const delta = (i % 15) - 7;
    ctx.fillStyle = `rgb(${43 + delta}, ${47 + delta}, ${55 + delta})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle center wear patch
  const centerGrad = ctx.createRadialGradient(256, 256, 20, 256, 256, 220);
  centerGrad.addColorStop(0, 'rgba(30, 34, 40, 0.35)');
  centerGrad.addColorStop(1, 'rgba(30, 34, 40, 0)');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Weathered warm-ivory crosswalk bars (#c4bfb3)
  ctx.fillStyle = 'rgba(196, 191, 179, 0.76)';
  for (let x = 52; x < 460; x += 28) {
    ctx.fillRect(x, 16, 13, 34);
    ctx.fillRect(x, 462, 13, 34);
  }
  for (let y = 52; y < 460; y += 28) {
    ctx.fillRect(16, y, 34, 13);
    ctx.fillRect(462, y, 34, 13);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Warm travertine & coastal concrete sidewalk paver texture (matte, natural tonal range).
 */
export function createSidewalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#979188';
  ctx.fillRect(0, 0, 256, 256);

  const tile = 32;
  for (let gx = 0; gx < 8; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      const n = ((gx * 13 + gy * 29) % 5) - 2;
      const r = 154 + n * 3;
      const g = 148 + n * 3;
      const b = 139 + n * 3;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);

      // Fine recessed concrete joint seam
      ctx.strokeStyle = 'rgba(84, 79, 72, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gx * tile + 0.5, gy * tile + 0.5, tile - 1, tile - 1);
    }
  }

  // Fine mineral grain so concrete feels tactile and never flat
  for (let i = 0; i < 2400; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97 + (i % 19)) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(60, 56, 50, 0.08)' : 'rgba(215, 208, 198, 0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 48);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Natural warm coastal golden-tan beach sand with organic wind-ripple grain (zero white glare).
 */
export function createBeachSandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#c5ac84';
  ctx.fillRect(0, 0, 512, 512);

  // Soft wind-blown sand dunes & ripple bands
  for (let y = 0; y < 512; y += 16) {
    const grad = ctx.createLinearGradient(0, y, 0, y + 16);
    grad.addColorStop(0, 'rgba(176, 150, 112, 0.22)');
    grad.addColorStop(0.5, 'rgba(214, 191, 152, 0.16)');
    grad.addColorStop(1, 'rgba(176, 150, 112, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, 512, 16);
  }

  // Organic fine sand mineral speckles
  for (let i = 0; i < 12000; i++) {
    const x = (i * 67 + ((i * 23) % 41)) % 512;
    const y = (i * 127 + ((i * 13) % 59)) % 512;
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(155, 130, 94, 0.24)' : 'rgba(220, 198, 162, 0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 42);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Sun-bleached weathered wooden boardwalk plank texture.
 */
export function createBoardwalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8d755c';
  ctx.fillRect(0, 0, 256, 256);

  const plankH = 16;
  for (let row = 0; row < 16; row++) {
    const shift = ((row * 17) % 7) - 3;
    ctx.fillStyle = `rgb(${141 + shift * 3}, ${117 + shift * 3}, ${92 + shift * 2})`;
    ctx.fillRect(0, row * plankH + 1, 256, plankH - 2);

    ctx.fillStyle = 'rgba(54, 42, 30, 0.45)';
    ctx.fillRect(0, row * plankH, 256, 1.5);

    // Subtle wood grain streaks
    ctx.fillStyle = 'rgba(72, 56, 40, 0.12)';
    ctx.fillRect(0, row * plankH + 5, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 56);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Weathered coastal palm bark texture with organic horizontal growth rings.
 */
export function createPalmBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6a5342';
  ctx.fillRect(0, 0, 128, 256);

  for (let y = 0; y < 256; y += 12) {
    ctx.fillStyle = 'rgba(58, 43, 33, 0.45)';
    ctx.fillRect(0, y, 128, 3);
    ctx.fillStyle = 'rgba(134, 108, 86, 0.25)';
    ctx.fillRect(0, y + 3, 128, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

/**
 * Rich tropical turquoise-teal ocean wave texture with soft golden sunlight glints.
 */
export function createOceanWaveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.0, '#22879c');
  grad.addColorStop(0.28, '#176c86');
  grad.addColorStop(0.65, '#125874');
  grad.addColorStop(1.0, '#0e4762');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Delicate ocean wave swells & sunlit crests
  for (let i = 0; i < 140; i++) {
    const y = (i * 23) % 512;
    const x = (i * 79) % 440;
    ctx.strokeStyle =
      i % 4 === 0 ? 'rgba(205, 238, 244, 0.28)' : 'rgba(62, 166, 186, 0.24)';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 34, y - 6, x + 68, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 26);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Soft wispy organic cloud puff texture for explosion fireballs, smoke plumes, and tire drift smoke.
 * Zero hard circular sphere edges.
 */
export function createSoftCloudPuffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // Multi-lobe overlapping soft radial gradients for natural turbulent puff silhouette
  const lobes = [
    [128, 128, 108, 0.65],
    [98, 118, 76, 0.52],
    [156, 122, 74, 0.50],
    [124, 96, 70, 0.48],
    [134, 154, 72, 0.46],
    [106, 146, 58, 0.38],
    [152, 100, 56, 0.38]
  ];
  for (const [cx, cy, rad, alpha] of lobes) {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    g.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
    g.addColorStop(0.45, `rgba(255, 255, 255, ${alpha * 0.55})`);
    g.addColorStop(0.8, `rgba(255, 255, 255, ${alpha * 0.14})`);
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft warm-amber star-burst texture for weapon muzzle flashes and hot sparks.
 */
export function createMuzzleStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // Soft warm halo
  const halo = ctx.createRadialGradient(64, 64, 2, 64, 64, 58);
  halo.addColorStop(0.0, 'rgba(255, 242, 204, 0.95)');
  halo.addColorStop(0.28, 'rgba(242, 184, 94, 0.65)');
  halo.addColorStop(0.62, 'rgba(220, 122, 52, 0.18)');
  halo.addColorStop(1.0, 'rgba(220, 122, 52, 0.0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle 6-ray star spikes
  ctx.save();
  ctx.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    const rg = ctx.createLinearGradient(0, -48, 0, 48);
    rg.addColorStop(0.0, 'rgba(255, 214, 138, 0.0)');
    rg.addColorStop(0.5, 'rgba(255, 240, 200, 0.78)');
    rg.addColorStop(1.0, 'rgba(255, 214, 138, 0.0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 46, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Twin-edge tire skid-mark smudge texture for drift & hard-brake asphalt ribbons.
 */
export function createSkidMarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);

  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0.0, 'rgba(18, 20, 24, 0.0)');
  grad.addColorStop(0.22, 'rgba(18, 20, 24, 0.85)');
  grad.addColorStop(0.5, 'rgba(14, 16, 20, 0.92)');
  grad.addColorStop(0.78, 'rgba(18, 20, 24, 0.85)');
  grad.addColorStop(1.0, 'rgba(18, 20, 24, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Radial scorch / bullet impact mark decal texture.
 */
export function createImpactMarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(16, 18, 22, 0.92)');
  grad.addColorStop(0.38, 'rgba(28, 30, 34, 0.56)');
  grad.addColorStop(0.78, 'rgba(40, 42, 46, 0.16)');
  grad.addColorStop(1.0, 'rgba(40, 42, 46, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft shoreline surf foam band texture.
 */
export function createShoreFoamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 512);

  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(225, 234, 236, 0.0)');
  grad.addColorStop(0.35, 'rgba(225, 234, 236, 0.42)');
  grad.addColorStop(0.55, 'rgba(235, 240, 240, 0.62)');
  grad.addColorStop(0.8, 'rgba(195, 224, 228, 0.22)');
  grad.addColorStop(1, 'rgba(195, 224, 228, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  // Scalloped wave edge variation
  for (let i = 0; i < 40; i++) {
    const y = (i * 19) % 512;
    const x = 44 + ((i * 13) % 28);
    const rad = 10 + (i % 9);
    const rg = ctx.createRadialGradient(x, y, 1, x, y, rad);
    rg.addColorStop(0, 'rgba(236, 242, 242, 0.48)');
    rg.addColorStop(1, 'rgba(236, 242, 242, 0.0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
  return tex;
}

/**
 * Shared radial soft dark-charcoal AO contact shadow decal texture for grounding
 * every vehicle, character, palm tree, streetlamp, and beach umbrella cleanly.
 */
export function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  grad.addColorStop(0.0, 'rgba(10, 14, 20, 0.86)');
  grad.addColorStop(0.45, 'rgba(10, 14, 20, 0.62)');
  grad.addColorStop(0.75, 'rgba(10, 14, 20, 0.22)');
  grad.addColorStop(1.0, 'rgba(10, 14, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft radial ground light-pool decal for the VCPD helicopter searchlight.
 */
export function createLightPoolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  grad.addColorStop(0.0, 'rgba(225, 238, 248, 0.72)');
  grad.addColorStop(0.42, 'rgba(210, 228, 244, 0.32)');
  grad.addColorStop(0.78, 'rgba(195, 218, 238, 0.08)');
  grad.addColorStop(1.0, 'rgba(195, 218, 238, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHeadlightBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 128);
  const grad = ctx.createLinearGradient(0, 64, 256, 64);
  grad.addColorStop(0.0, 'rgba(255, 242, 204, 0.72)');
  grad.addColorStop(0.35, 'rgba(255, 236, 190, 0.34)');
  grad.addColorStop(0.82, 'rgba(245, 224, 175, 0.08)');
  grad.addColorStop(1.0, 'rgba(245, 224, 175, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 42);
  ctx.lineTo(256, 6);
  ctx.lineTo(256, 122);
  ctx.lineTo(0, 86);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sleek flat road-flush GPS chevron decal texture (zero clipping, comfortable subtle contrast).
 */
export function createGpsChevronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = '#64bcc9';
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Primary sleek forward arrow chevron
  ctx.beginPath();
  ctx.moveTo(48, 168);
  ctx.lineTo(128, 78);
  ctx.lineTo(208, 168);
  ctx.stroke();

  // Secondary subtle inner chevron
  ctx.strokeStyle = 'rgba(224, 178, 104, 0.78)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(76, 206);
  ctx.lineTo(128, 146);
  ctx.lineTo(180, 206);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Low grounded vertical-fade perimeter ring texture for active mission zones.
 */
export function createBeaconRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 256);
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0.0, 'rgba(224, 178, 104, 0.85)');
  grad.addColorStop(0.22, 'rgba(224, 178, 104, 0.42)');
  grad.addColorStop(0.65, 'rgba(100, 188, 201, 0.14)');
  grad.addColorStop(1.0, 'rgba(100, 188, 201, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Classic striped Miami coastal retail awning texture.
 */
export function createAwningTexture(stripeA = '#b55d53', stripeB = '#d4cbbd') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const stripeW = 32;
  for (let x = 0; x < 256; x += stripeW) {
    ctx.fillStyle = (x / stripeW) % 2 === 0 ? stripeA : stripeB;
    ctx.fillRect(x, 0, stripeW, 128);
  }
  // Subtle underside valance shadow
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255, 250, 240, 0.08)');
  grad.addColorStop(0.85, 'rgba(20, 24, 30, 0.12)');
  grad.addColorStop(1, 'rgba(20, 24, 30, 0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

/**
 * Builds realistic, strict-PBR architectural facade texture sets ({ map, roughnessMap, emissiveMap }).
 * Keeps all albedos inside natural 0.16-0.78 sRGB range with NO pure white/black zebra glare
 * and NO vertical neon wireframe lines.
 */
export function createBuildingFacadeTextures() {
  const specs = [
    // Style 0 variants: Art Deco Limestone & Pastel Coastal Stucco
    {
      id: 'art_deco_limestone',
      kind: 'art_deco',
      wallColor: '#cbbda8',
      ledgeColor: '#b7a892',
      accentBand: '#a99982',
      windowGlassTop: '#3e5366',
      windowGlassBot: '#2d3f4f',
      mullionColor: '#7a7268',
      litColor: '#d6a86c',
      litChance: 18,
      metalness: 0.06,
      envIntensity: 0.45,
      emissiveIntensity: 0.18
    },
    {
      id: 'art_deco_sand',
      kind: 'art_deco',
      wallColor: '#c4ae98',
      ledgeColor: '#b09a84',
      accentBand: '#9f8772',
      windowGlassTop: '#3c5061',
      windowGlassBot: '#2c3c4b',
      mullionColor: '#786e64',
      litColor: '#d8ab70',
      litChance: 17,
      metalness: 0.06,
      envIntensity: 0.45,
      emissiveIntensity: 0.18
    },
    {
      id: 'art_deco_sage',
      kind: 'art_deco',
      wallColor: '#9cb3ab',
      ledgeColor: '#8ba39b',
      accentBand: '#7a928a',
      windowGlassTop: '#384c5c',
      windowGlassBot: '#293a47',
      mullionColor: '#667670',
      litColor: '#d6ac72',
      litChance: 18,
      metalness: 0.06,
      envIntensity: 0.45,
      emissiveIntensity: 0.18
    },
    // Style 1 variants: Modern Downtown Curtain-Wall Glass Towers
    {
      id: 'glass_tower_blue',
      kind: 'glass_tower',
      wallColor: '#2c3642',
      ledgeColor: '#465666',
      accentBand: '#374756',
      windowGlassTop: '#4c677f',
      windowGlassBot: '#33485c',
      mullionColor: '#29313a',
      litColor: '#d8b47c',
      litChance: 16,
      metalness: 0.42,
      envIntensity: 0.72,
      emissiveIntensity: 0.16
    },
    {
      id: 'glass_tower_bronze',
      kind: 'glass_tower',
      wallColor: '#363331',
      ledgeColor: '#544f4a',
      accentBand: '#46423e',
      windowGlassTop: '#5e5852',
      windowGlassBot: '#433f3b',
      mullionColor: '#2c2927',
      litColor: '#d9b074',
      litChance: 16,
      metalness: 0.42,
      envIntensity: 0.68,
      emissiveIntensity: 0.16
    },
    // Style 2: Coastal Balcony Condo (Warm Travertine + Shaded Balcony Recesses)
    {
      id: 'coastal_condo',
      kind: 'balcony_condo',
      wallColor: '#cdc0ad',
      ledgeColor: '#bfb19d',
      accentBand: '#8ea89f',
      windowGlassTop: '#495663',
      windowGlassBot: '#36414c',
      mullionColor: '#666b73',
      litColor: '#d8aa6e',
      litChance: 18,
      metalness: 0.1,
      envIntensity: 0.48,
      emissiveIntensity: 0.18
    },
    // Style 3: Harbor Bronze-Slate Loft / Industrial Brick-Concrete
    {
      id: 'harbor_loft',
      kind: 'harbor_loft',
      wallColor: '#6c655d',
      ledgeColor: '#58524b',
      accentBand: '#8c7260',
      windowGlassTop: '#3c4c5c',
      windowGlassBot: '#2b3845',
      mullionColor: '#3a3d42',
      litColor: '#d4a366',
      litChance: 15,
      metalness: 0.12,
      envIntensity: 0.42,
      emissiveIntensity: 0.16
    }
  ];

  return specs.map((spec, idx) => {
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = 512;
    diffCanvas.height = 512;
    const dCtx = diffCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rCtx = roughCanvas.getContext('2d');

    const emCanvas = document.createElement('canvas');
    emCanvas.width = 512;
    emCanvas.height = 512;
    const eCtx = emCanvas.getContext('2d');

    // Base architectural wall diffuse + matte stucco/concrete roughness (~0.84 -> 214)
    dCtx.fillStyle = spec.wallColor;
    dCtx.fillRect(0, 0, 512, 512);

    rCtx.fillStyle = spec.kind === 'glass_tower' ? 'rgb(148, 148, 148)' : 'rgb(214, 214, 214)';
    rCtx.fillRect(0, 0, 512, 512);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    // Subtle organic plaster / concrete wall grain
    if (spec.kind !== 'glass_tower') {
      for (let i = 0; i < 4200; i++) {
        const x = (i * 71 + (i % 19)) % 512;
        const y = (i * 113 + (i % 23)) % 512;
        dCtx.fillStyle =
          i % 2 === 0 ? 'rgba(35, 30, 26, 0.045)' : 'rgba(240, 232, 220, 0.045)';
        dCtx.fillRect(x, y, 3, 2);
      }
    }

    const cols = spec.kind === 'glass_tower' ? 8 : spec.kind === 'balcony_condo' ? 4 : 6;
    const rows = spec.kind === 'balcony_condo' ? 8 : 10;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const ry = r * cellH;

      // Architectural floor spandrel & subtle cornice shadow
      dCtx.fillStyle = spec.ledgeColor;
      dCtx.fillRect(0, ry, 512, spec.kind === 'balcony_condo' ? 11 : 7);

      // Soft ambient-occlusion shadow directly beneath floor slab / cornice
      const aoGrad = dCtx.createLinearGradient(0, ry + 7, 0, ry + 16);
      aoGrad.addColorStop(0, 'rgba(24, 28, 36, 0.30)');
      aoGrad.addColorStop(1, 'rgba(24, 28, 36, 0.0)');
      dCtx.fillStyle = aoGrad;
      dCtx.fillRect(0, ry + 7, 512, 9);

      if (r % 3 === 0) {
        dCtx.fillStyle = spec.accentBand;
        dCtx.fillRect(0, ry + 2, 512, 3);
      }

      for (let c = 0; c < cols; c++) {
        const hash = ((r * 41 + c * 23 + idx * 17) * 89) % 100;
        const isLit = hash < spec.litChance;

        if (spec.kind === 'balcony_condo') {
          // Recessed shaded balcony bay + tinted glass railing + interior sliding doors
          const bx = c * cellW + 8;
          const by = ry + 11;
          const bw = cellW - 16;
          const bh = cellH - 13;

          // Deep shaded alcove interior
          dCtx.fillStyle = '#50555e';
          dCtx.fillRect(bx, by, bw, bh);

          // Recessed balcony sliding glass door
          const gGrad = dCtx.createLinearGradient(0, by + 3, 0, by + bh - 4);
          gGrad.addColorStop(0, isLit ? '#a6875c' : spec.windowGlassTop);
          gGrad.addColorStop(1, isLit ? '#8a6d48' : spec.windowGlassBot);
          dCtx.fillStyle = gGrad;
          dCtx.fillRect(bx + 10, by + 4, bw - 20, bh - 8);

          // Glass roughness on sliding door
          rCtx.fillStyle = 'rgb(64, 64, 64)';
          rCtx.fillRect(bx + 10, by + 4, bw - 20, bh - 8);

          if (isLit) {
            eCtx.fillStyle = spec.litColor;
            eCtx.fillRect(bx + 12, by + 6, bw - 24, bh * 0.55);
          }

          // Top under-slab AO shadow inside balcony
          dCtx.fillStyle = 'rgba(22, 26, 34, 0.38)';
          dCtx.fillRect(bx, by, bw, 7);

          // Sleek tinted glass balcony railing on lower 40%
          dCtx.fillStyle = 'rgba(116, 142, 158, 0.34)';
          dCtx.fillRect(bx, by + bh * 0.56, bw, bh * 0.44);
          dCtx.fillStyle = spec.mullionColor;
          dCtx.fillRect(bx, by + bh * 0.54, bw, 2.5);
          dCtx.fillRect(bx + bw * 0.5 - 1, by + bh * 0.54, 2, bh * 0.46);
        } else if (spec.kind === 'glass_tower') {
          // Modern curtain-wall architectural glazing with crisp slender aluminum mullions
          const wx = c * cellW + 3;
          const wy = ry + 8;
          const ww = cellW - 6;
          const wh = cellH - 10;

          const gGrad = dCtx.createLinearGradient(0, wy, 0, wy + wh);
          if (isLit) {
            gGrad.addColorStop(0, '#9a8465');
            gGrad.addColorStop(1, '#7a684e');
          } else {
            // Subtle sky-to-ground gradient reflection baked into glass panes
            const tintShift = ((r * 7 + c * 13) % 5) - 2;
            gGrad.addColorStop(0, spec.windowGlassTop);
            gGrad.addColorStop(1, spec.windowGlassBot);
            if (tintShift > 0) {
              dCtx.fillStyle = 'rgba(150, 178, 200, 0.06)';
            }
          }
          dCtx.fillStyle = gGrad;
          dCtx.fillRect(wx, wy, ww, wh);

          // Glossy architectural glass roughness (~0.24 -> 62)
          rCtx.fillStyle = 'rgb(62, 62, 62)';
          rCtx.fillRect(wx, wy, ww, wh);

          if (isLit) {
            eCtx.fillStyle = spec.litColor;
            eCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
            // Subtle interior horizontal blind shadow
            dCtx.fillStyle = 'rgba(28, 34, 42, 0.25)';
            dCtx.fillRect(wx, wy + wh * 0.52, ww, 2);
            eCtx.fillStyle = '#000000';
            eCtx.fillRect(wx, wy + wh * 0.52, ww, 2);
          }

          // Slender dark-aluminum structural mullions
          dCtx.strokeStyle = spec.mullionColor;
          dCtx.lineWidth = 2.4;
          dCtx.strokeRect(wx, wy, ww, wh);
        } else {
          // Art-Deco Limestone / Pastel Stucco / Harbor Loft recessed architectural windows
          const padX = spec.kind === 'harbor_loft' ? 8 : 11;
          const wx = c * cellW + padX;
          const wy = ry + 11;
          const ww = cellW - padX * 2;
          const wh = cellH - 16;

          // Outer stone frame shadow & sill
          dCtx.fillStyle = 'rgba(34, 30, 26, 0.26)';
          dCtx.fillRect(wx - 2, wy - 2, ww + 4, wh + 3);

          const gGrad = dCtx.createLinearGradient(0, wy, 0, wy + wh);
          if (isLit) {
            gGrad.addColorStop(0, '#b39063');
            gGrad.addColorStop(1, '#8c6f4a');
          } else {
            gGrad.addColorStop(0, spec.windowGlassTop);
            gGrad.addColorStop(1, spec.windowGlassBot);
          }
          dCtx.fillStyle = gGrad;
          dCtx.fillRect(wx, wy, ww, wh);

          // Glass smoothness vs matte limestone
          rCtx.fillStyle = 'rgb(66, 66, 66)';
          rCtx.fillRect(wx, wy, ww, wh);

          if (isLit) {
            eCtx.fillStyle = spec.litColor;
            eCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          }

          // Subtle mullion cross + sunlit stone windowsill
          dCtx.fillStyle = spec.mullionColor;
          dCtx.fillRect(wx + ww * 0.5 - 1, wy, 2, wh);
          dCtx.fillRect(wx, wy + wh * 0.54, ww, 2);
          dCtx.fillStyle = spec.ledgeColor;
          dCtx.fillRect(wx - 3, wy + wh, ww + 6, 3);
        }
      }
    }

    const map = new THREE.CanvasTexture(diffCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.anisotropy = 4;

    const emissiveMap = new THREE.CanvasTexture(emCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
    emissiveMap.anisotropy = 4;

    return {
      id: spec.id,
      map,
      roughnessMap,
      emissiveMap,
      metalness: spec.metalness,
      envIntensity: spec.envIntensity,
      emissiveIntensity: spec.emissiveIntensity
    };
  });
}

/**
 * Creates a tasteful coastal boutique hotel / landmark marquee sign texture
 * with muted warm coral, seafoam, or champagne gold lettering on dark charcoal slate.
 */
export function createNeonSignTexture(text, primaryColor = '#d67367', accentColor = '#5eb3aa') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Matte dark architectural charcoal housing
  ctx.fillStyle = '#1b222c';
  ctx.fillRect(0, 0, 512, 128);

  // Subtle metallic bevel frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 120);

  // Tasteful inset accent border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 8;
  ctx.strokeRect(12, 12, 488, 104);

  // Clean warm marquee typography (no blinding white core)
  ctx.font = '800 40px "Segoe UI", "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = primaryColor;
  ctx.fillText(text, 256, 66);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(242, 236, 224, 0.72)';
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Readable warm-lit street shop / vendor cart menu signboard texture (strict PBR).
 */
export function createShopSignTexture(title, subtitle = '', primaryColor = '#e0b268', accentColor = '#5eb3aa') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c242e';
  ctx.fillRect(0, 0, 512, 144);

  // Warm recessed trim frame
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 128);

  ctx.strokeStyle = 'rgba(240, 232, 218, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 480, 112);

  // Main readable title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = primaryColor;
  ctx.font = '800 42px "Segoe UI", "Trebuchet MS", sans-serif';
  ctx.fillText(title, 256, subtitle ? 56 : 74);

  if (subtitle) {
    ctx.fillStyle = '#ddd4c4';
    ctx.font = '700 20px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, 256, 102);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Sidewalk A-frame chalkboard menu texture for street carts & cafés.
 */
export function createChalkboardMenuTexture(header, items) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Wooden frame
  ctx.fillStyle = '#6c523b';
  ctx.fillRect(0, 0, 256, 320);

  // Matte slate chalkboard interior
  ctx.fillStyle = '#242b33';
  ctx.fillRect(14, 14, 228, 292);

  ctx.strokeStyle = 'rgba(224, 178, 104, 0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, 212, 276);

  ctx.fillStyle = '#e0b268';
  ctx.font = '800 24px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(header, 128, 62);

  ctx.fillStyle = 'rgba(224, 178, 104, 0.45)';
  ctx.fillRect(46, 76, 164, 2);

  ctx.fillStyle = '#ddd6c7';
  ctx.font = '700 18px "Segoe UI", sans-serif';
  items.forEach((line, idx) => {
    ctx.fillText(line, 128, 118 + idx * 54);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Detailed warm-lit recessed storefront display window texture per shop type.
 */
export function createShopWindowTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Warm recessed interior gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  if (kind === 'armory') {
    bg.addColorStop(0, '#3a342e');
    bg.addColorStop(1, '#22262d');
  } else if (kind === 'mart_boutique') {
    bg.addColorStop(0, '#5a6a6c');
    bg.addColorStop(1, '#2f3d44');
  } else if (kind === 'garage') {
    bg.addColorStop(0, '#3e4449');
    bg.addColorStop(1, '#22272c');
  } else {
    bg.addColorStop(0, '#6c5a46');
    bg.addColorStop(1, '#332c27');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle overhead warm track-light cones inside display window
  for (const lx of [96, 256, 416]) {
    const glow = ctx.createRadialGradient(lx, 24, 6, lx, 90, 120);
    glow.addColorStop(0, 'rgba(232, 198, 138, 0.48)');
    glow.addColorStop(1, 'rgba(232, 198, 138, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 120, 0, 240, 220);
  }

  if (kind === 'armory') {
    // Wooden pegboard back wall + tactical rifle & shotgun rack silhouettes
    ctx.fillStyle = '#4e3f32';
    ctx.fillRect(28, 36, 456, 184);
    ctx.fillStyle = '#1b2028';
    for (let row = 0; row < 3; row++) {
      const y = 66 + row * 52;
      // Rack rail
      ctx.fillStyle = '#7c766c';
      ctx.fillRect(46, y + 14, 420, 4);
      // Rifle silhouettes
      ctx.fillStyle = '#1a2029';
      for (let col = 0; col < 3; col++) {
        const rx = 64 + col * 140;
        ctx.fillRect(rx, y, 86, 10);
        ctx.fillRect(rx + 86, y + 2, 26, 5);
        ctx.fillRect(rx + 28, y + 10, 11, 14);
        ctx.fillRect(rx + 4, y + 8, 16, 10);
      }
    }
  } else if (kind === 'mart_boutique') {
    // Store shelves with colorful essentials + folded resort outfits
    const boxColors = ['#b86658', '#5c9398', '#c8a25e', '#6c987c', '#c8bfb0'];
    for (let row = 0; row < 3; row++) {
      const sy = 74 + row * 54;
      ctx.fillStyle = '#8b7d6c';
      ctx.fillRect(26, sy, 460, 6);
      for (let c = 0; c < 11; c++) {
        ctx.fillStyle = boxColors[(row * 5 + c) % boxColors.length];
        ctx.fillRect(36 + c * 40, sy - 26, 28, 26);
      }
    }
  } else {
    // Café / retail interior with warm pendant lamps and pastry counter
    ctx.fillStyle = '#5c4738';
    ctx.fillRect(24, 152, 464, 80);
    ctx.fillStyle = '#cbbba4';
    ctx.fillRect(24, 146, 464, 10);
    for (const px of [120, 256, 392]) {
      ctx.fillStyle = '#2b3038';
      ctx.fillRect(px - 2, 0, 4, 48);
      ctx.fillStyle = '#d9b474';
      ctx.beginPath();
      ctx.arc(px, 54, 14, Math.PI, 0);
      ctx.fill();
    }
  }

  // Mullion window framing + subtle diagonal glass sheen
  ctx.fillStyle = 'rgba(185, 210, 224, 0.12)';
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(130, 0);
  ctx.lineTo(60, 256);
  ctx.lineTo(0, 256);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2b323c';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 246);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(172, 0);
  ctx.lineTo(172, 256);
  ctx.moveTo(340, 0);
  ctx.lineTo(340, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Solaris Bay transit map texture for glass bus stop shelters.
 */
export function createBusMapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1f2833';
  ctx.fillRect(0, 0, 256, 384);

  ctx.fillStyle = '#2d4f60';
  ctx.fillRect(168, 56, 74, 290);

  ctx.fillStyle = '#e0b268';
  ctx.font = '800 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLARIS TRANSIT', 128, 34);

  // Route lines
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#64bcc9';
  ctx.beginPath();
  ctx.moveTo(42, 80);
  ctx.lineTo(148, 80);
  ctx.lineTo(148, 324);
  ctx.stroke();

  ctx.strokeStyle = '#d67367';
  ctx.beginPath();
  ctx.moveTo(42, 165);
  ctx.lineTo(148, 165);
  ctx.lineTo(148, 255);
  ctx.lineTo(42, 255);
  ctx.stroke();

  for (const [sx, sy] of [
    [42, 80],
    [148, 80],
    [148, 165],
    [148, 255],
    [148, 324]
  ]) {
    ctx.fillStyle = '#edf1f5';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Checkered side band texture for Solaris City Cabs (Taxis).
 */
export function createTaxiCheckerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const sq = 16;
  for (let x = 0; x < 256; x += sq) {
    for (let y = 0; y < 32; y += sq) {
      const dark = ((x / sq) + (y / sq)) % 2 === 0;
      ctx.fillStyle = dark ? '#20242b' : '#dfd7c6';
      ctx.fillRect(x, y, sq, sq);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Commercial livery decal texture for Solaris Fresh Delivery Vans.
 */
export function createVanLiveryTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfc9bc';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#4c7e76';
  ctx.fillRect(0, 92, 512, 22);
  ctx.fillStyle = '#c89b55';
  ctx.fillRect(0, 84, 512, 8);

  ctx.fillStyle = '#25343c';
  ctx.font = '800 38px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLARIS FRESH', 256, 54);
  ctx.fillStyle = '#4c7e76';
  ctx.font = '700 18px "Segoe UI", sans-serif';
  ctx.fillText('COASTAL MARKET DELIVERY', 256, 76);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates the complete shared PBR material library for Solaris Bay 3D.
 */
export function createMaterialLibrary(renderer) {
  const envMap = createStudioEnvironmentMap(renderer);
  const { map: roadTex, roughnessMap: roadRoughTex } = createAsphaltRoadTextures();
  const intersectionTex = createIntersectionTexture();
  const sidewalkTex = createSidewalkTexture();
  const sandTex = createBeachSandTexture();
  const boardwalkTex = createBoardwalkTexture();
  const palmBarkTex = createPalmBarkTexture();
  const oceanTex = createOceanWaveTexture();
  const shoreFoamTex = createShoreFoamTexture();
  const contactShadowTex = createContactShadowTexture();
  const lightPoolTex = createLightPoolTexture();
  const headlightBeamTex = createHeadlightBeamTexture();
  const gpsChevronTex = createGpsChevronTexture();
  const beaconRingTex = createBeaconRingTexture();
  const softPuffTex = createSoftCloudPuffTexture();
  const muzzleStarTex = createMuzzleStarTexture();
  const skidMarkTex = createSkidMarkTexture();
  const impactMarkTex = createImpactMarkTexture();
  const awningCoralTex = createAwningTexture('#b55d53', '#d4cbbd');
  const awningTealTex = createAwningTexture('#467c82', '#d4cbbd');
  const awningGoldTex = createAwningTexture('#b88948', '#d8d0c2');
  const awningSlateTex = createAwningTexture('#394552', '#c4a162');
  const taxiCheckerTex = createTaxiCheckerTexture();
  const vanLiveryTex = createVanLiveryTexture();
  const busMapTex = createBusMapTexture();
  const facadeSets = createBuildingFacadeTextures();

  const carPaintCache = new Map();
  const neonSignCache = new Map();
  const shopSignCache = new Map();
  const shopWindowCache = new Map();
  const chalkboardCache = new Map();
  const awningCache = new Map();
  const matteColorCache = new Map();

  function getMatteColorMaterial(hexColor, roughness = 0.80, metalness = 0.04) {
    const key = `${hexColor}|${roughness}|${metalness}`;
    if (!matteColorCache.has(key)) {
      matteColorCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(hexColor),
          roughness,
          metalness,
          envMapIntensity: 0.24
        })
      );
    }
    return matteColorCache.get(key);
  }

  function getCustomAwningMaterial(colorA, colorB) {
    const key = `${colorA}|${colorB}`;
    if (!awningCache.has(key)) {
      const tex = createAwningTexture(colorA, colorB);
      awningCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.86,
          metalness: 0.0,
          envMapIntensity: 0.2,
          side: THREE.DoubleSide
        })
      );
    }
    return awningCache.get(key);
  }

  function getShopSignMaterial(title, subtitle, primaryColor, accentColor) {
    const key = `${title}|${subtitle}|${primaryColor}|${accentColor}`;
    if (!shopSignCache.has(key)) {
      const tex = createShopSignTexture(title, subtitle, primaryColor, accentColor);
      shopSignCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.42,
          roughness: 0.42,
          metalness: 0.12,
          envMapIntensity: 0.35
        })
      );
    }
    return shopSignCache.get(key);
  }

  function getShopWindowMaterial(kind) {
    if (!shopWindowCache.has(kind)) {
      const tex = createShopWindowTexture(kind);
      shopWindowCache.set(
        kind,
        new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color(0xfff1dc),
          emissiveIntensity: 0.36,
          roughness: 0.22,
          metalness: 0.18,
          envMapIntensity: 0.65
        })
      );
    }
    return shopWindowCache.get(kind);
  }

  function getChalkboardMaterial(header, items) {
    const key = `${header}|${items.join('|')}`;
    if (!chalkboardCache.has(key)) {
      const tex = createChalkboardMenuTexture(header, items);
      chalkboardCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.85,
          metalness: 0.02,
          envMapIntensity: 0.18
        })
      );
    }
    return chalkboardCache.get(key);
  }

  function getCarPaintMaterial(hexColor) {
    if (!carPaintCache.has(hexColor)) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hexColor),
        metalness: 0.50,
        roughness: 0.25,
        clearcoat: 0.82,
        clearcoatRoughness: 0.16,
        reflectivity: 0.85,
        envMapIntensity: 0.92
      });
      carPaintCache.set(hexColor, mat);
    }
    return carPaintCache.get(hexColor);
  }

  function getNeonSignMaterial(text, primaryColor, accentColor) {
    const key = `${text}|${primaryColor}|${accentColor}`;
    if (!neonSignCache.has(key)) {
      const tex = createNeonSignTexture(text, primaryColor, accentColor);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.52,
        roughness: 0.38,
        metalness: 0.15,
        envMapIntensity: 0.4
      });
      neonSignCache.set(key, mat);
    }
    return neonSignCache.get(key);
  }

  // Indexed architectural facade materials:
  // [0..2]: Art-Deco Limestone, Sand, Sage | [3..4]: Glass Tower Blue, Bronze
  // [5]: Coastal Balcony Condo | [6]: Harbor Bronze-Slate Loft
  const buildingMaterials = facadeSets.map((set) => {
    return new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      emissiveMap: set.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: set.emissiveIntensity,
      roughness: 1.0,
      metalness: set.metalness,
      envMapIntensity: set.envIntensity
    });
  });

  function getBuildingMaterial(styleIndex, variant = 0) {
    if (styleIndex === 0) {
      return buildingMaterials[variant % 3];
    }
    if (styleIndex === 1) {
      return buildingMaterials[3 + (variant % 2)];
    }
    if (styleIndex === 2) {
      return variant % 3 === 2 ? buildingMaterials[1] : buildingMaterials[5];
    }
    return buildingMaterials[6];
  }

  return {
    envMap,
    roadTex,
    roadRoughTex,
    intersectionTex,
    sidewalkTex,
    sandTex,
    boardwalkTex,
    oceanTex,
    shoreFoamTex,
    contactShadowTex,
    lightPoolTex,
    headlightBeamTex,
    gpsChevronTex,
    beaconRingTex,
    softPuffTex,
    muzzleStarTex,
    skidMarkTex,
    impactMarkTex,
    getCarPaintMaterial,
    getNeonSignMaterial,
    getShopSignMaterial,
    getShopWindowMaterial,
    getChalkboardMaterial,
    getCustomAwningMaterial,
    getMatteColorMaterial,
    getBuildingMaterial,
    buildingMaterials,
    awningGoldMaterial: new THREE.MeshStandardMaterial({
      map: awningGoldTex,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.2
    }),
    awningSlateMaterial: new THREE.MeshStandardMaterial({
      map: awningSlateTex,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.2
    }),
    taxiCheckerMaterial: new THREE.MeshStandardMaterial({
      map: taxiCheckerTex,
      roughness: 0.42,
      metalness: 0.12
    }),
    taxiSignMaterial: new THREE.MeshStandardMaterial({
      color: 0xe8c458,
      emissive: 0xd9a83c,
      emissiveIntensity: 0.72,
      roughness: 0.28
    }),
    vanLiveryMaterial: new THREE.MeshStandardMaterial({
      map: vanLiveryTex,
      roughness: 0.36,
      metalness: 0.18,
      envMapIntensity: 0.55
    }),
    busMapMaterial: new THREE.MeshStandardMaterial({
      map: busMapTex,
      emissiveMap: busMapTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.38,
      roughness: 0.26,
      metalness: 0.1
    }),
    hydrantMaterial: new THREE.MeshStandardMaterial({
      color: 0x9c3834,
      roughness: 0.48,
      metalness: 0.28,
      envMapIntensity: 0.42
    }),
    bushFoliageMaterial: new THREE.MeshStandardMaterial({
      color: 0x436e48,
      roughness: 0.82,
      metalness: 0.02,
      envMapIntensity: 0.22
    }),
    bushLightMaterial: new THREE.MeshStandardMaterial({
      color: 0x568252,
      roughness: 0.78,
      metalness: 0.02,
      envMapIntensity: 0.24
    }),
    trafficRedMaterial: new THREE.MeshStandardMaterial({
      color: 0xc94246,
      emissive: 0xc4363a,
      emissiveIntensity: 1.1,
      roughness: 0.2
    }),
    trafficAmberMaterial: new THREE.MeshStandardMaterial({
      color: 0xd49d3b,
      emissive: 0xc98d2e,
      emissiveIntensity: 0.95,
      roughness: 0.2
    }),
    trafficGreenMaterial: new THREE.MeshStandardMaterial({
      color: 0x46a66e,
      emissive: 0x3b9660,
      emissiveIntensity: 1.05,
      roughness: 0.2
    }),
    trafficOffMaterial: new THREE.MeshStandardMaterial({
      color: 0x1e2329,
      roughness: 0.65,
      metalness: 0.2
    }),
    shelterGlassMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x7ea2b5,
      transparent: true,
      opacity: 0.34,
      roughness: 0.14,
      metalness: 0.1,
      envMapIntensity: 0.8
    }),
    warmStringBulbMaterial: new THREE.MeshStandardMaterial({
      color: 0xf0d29c,
      emissive: 0xe6ba70,
      emissiveIntensity: 0.92,
      roughness: 0.22
    }),
    roadMaterial: new THREE.MeshStandardMaterial({
      map: roadTex,
      roughnessMap: roadRoughTex,
      roughness: 1.0,
      metalness: 0.04,
      envMapIntensity: 0.35
    }),
    intersectionMaterial: new THREE.MeshStandardMaterial({
      map: intersectionTex,
      roughness: 0.84,
      metalness: 0.04,
      envMapIntensity: 0.32
    }),
    sidewalkMaterial: new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.90,
      metalness: 0.02,
      envMapIntensity: 0.24
    }),
    grassMaterial: new THREE.MeshStandardMaterial({
      color: 0x456347,
      roughness: 0.88,
      metalness: 0.01,
      envMapIntensity: 0.20
    }),
    sandMaterial: new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.16
    }),
    wetSandMaterial: new THREE.MeshStandardMaterial({
      color: 0x947e62,
      roughness: 0.42,
      metalness: 0.04,
      envMapIntensity: 0.55
    }),
    shoreFoamMaterial: new THREE.MeshStandardMaterial({
      map: shoreFoamTex,
      transparent: true,
      opacity: 0.65,
      roughness: 0.72,
      metalness: 0.0,
      depthWrite: false
    }),
    boardwalkMaterial: new THREE.MeshStandardMaterial({
      map: boardwalkTex,
      roughness: 0.84,
      metalness: 0.02,
      envMapIntensity: 0.24
    }),
    seawallMaterial: new THREE.MeshStandardMaterial({
      color: 0xb8ae9e,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.25
    }),
    stoneTrimMaterial: new THREE.MeshStandardMaterial({
      color: 0xb7aa96,
      roughness: 0.84,
      metalness: 0.04,
      envMapIntensity: 0.28
    }),
    graniteTrimMaterial: new THREE.MeshStandardMaterial({
      color: 0x545c66,
      roughness: 0.74,
      metalness: 0.12,
      envMapIntensity: 0.38
    }),
    retailGlassMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x263544,
      roughness: 0.18,
      metalness: 0.25,
      clearcoat: 0.65,
      clearcoatRoughness: 0.14,
      envMapIntensity: 0.78
    }),
    awningCoralMaterial: new THREE.MeshStandardMaterial({
      map: awningCoralTex,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.2
    }),
    awningTealMaterial: new THREE.MeshStandardMaterial({
      map: awningTealTex,
      roughness: 0.86,
      metalness: 0.0,
      envMapIntensity: 0.2
    }),
    oceanMaterial: new THREE.MeshStandardMaterial({
      map: oceanTex,
      color: 0xffffff,
      roughness: 0.46,
      metalness: 0.06,
      envMapIntensity: 0.35
    }),
    glassCanopyMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x18232e,
      metalness: 0.16,
      roughness: 0.10,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.05
    }),
    chromeMaterial: new THREE.MeshStandardMaterial({
      color: 0x9da4ad,
      metalness: 0.82,
      roughness: 0.24,
      envMapIntensity: 0.95
    }),
    darkMetalMaterial: new THREE.MeshStandardMaterial({
      color: 0x2d343e,
      metalness: 0.52,
      roughness: 0.44,
      envMapIntensity: 0.5
    }),
    tireRubberMaterial: new THREE.MeshStandardMaterial({
      color: 0x1e2024,
      metalness: 0.04,
      roughness: 0.88,
      envMapIntensity: 0.2
    }),
    headlightMaterial: new THREE.MeshStandardMaterial({
      color: 0xf4ead4,
      emissive: 0xf2dfb8,
      emissiveIntensity: 1.15,
      roughness: 0.16
    }),
    taillightMaterial: new THREE.MeshStandardMaterial({
      color: 0xb82838,
      emissive: 0xb82230,
      emissiveIntensity: 1.35,
      roughness: 0.2
    }),
    policeRedMaterial: new THREE.MeshStandardMaterial({
      color: 0xd43542,
      emissive: 0xc92a38,
      emissiveIntensity: 1.85,
      roughness: 0.16
    }),
    policeBlueMaterial: new THREE.MeshStandardMaterial({
      color: 0x3b8fd4,
      emissive: 0x2d7ec4,
      emissiveIntensity: 1.85,
      roughness: 0.16
    }),
    warmLampMaterial: new THREE.MeshStandardMaterial({
      color: 0xe8c890,
      emissive: 0xdfb26b,
      emissiveIntensity: 0.82,
      roughness: 0.25
    }),
    // Toned-down accent materials retained for compatibility
    neonPinkMaterial: new THREE.MeshStandardMaterial({
      color: 0xd67367,
      emissive: 0xc45e52,
      emissiveIntensity: 0.65,
      roughness: 0.28
    }),
    neonCyanMaterial: new THREE.MeshStandardMaterial({
      color: 0x64bcc9,
      emissive: 0x4ca3b0,
      emissiveIntensity: 0.65,
      roughness: 0.28
    }),
    neonGoldMaterial: new THREE.MeshStandardMaterial({
      color: 0xe0b268,
      emissive: 0xc9964a,
      emissiveIntensity: 0.72,
      roughness: 0.25
    }),
    palmTrunkMaterial: new THREE.MeshStandardMaterial({
      map: palmBarkTex,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.2
    }),
    palmFrondMaterial: new THREE.MeshStandardMaterial({
      color: 0x3e6d44,
      roughness: 0.74,
      metalness: 0.02,
      envMapIntensity: 0.25,
      side: THREE.DoubleSide
    }),
    palmFrondLightMaterial: new THREE.MeshStandardMaterial({
      color: 0x4d7e4e,
      roughness: 0.72,
      metalness: 0.02,
      envMapIntensity: 0.26,
      side: THREE.DoubleSide
    }),
    coconutMaterial: new THREE.MeshStandardMaterial({
      color: 0x5c4432,
      roughness: 0.82,
      metalness: 0.02
    }),
    contactShadowMaterial: new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    }),
    lightPoolMaterial: new THREE.MeshBasicMaterial({
      map: lightPoolTex,
      transparent: true,
      opacity: 0.20,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }),
    headlightBeamMaterial: new THREE.MeshBasicMaterial({
      map: headlightBeamTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }),
    streetlampGlowMaterial: new THREE.MeshBasicMaterial({
      color: 0xffd28a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    }),
    gpsChevronMaterial: new THREE.MeshBasicMaterial({
      map: gpsChevronTex,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    }),
    beaconRingMaterial: new THREE.MeshBasicMaterial({
      map: beaconRingTex,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false
    }),
    skidMarkMaterial: new THREE.MeshBasicMaterial({
      map: skidMarkTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3
    }),
    impactMarkMaterial: new THREE.MeshBasicMaterial({
      map: impactMarkTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    }),
    debrisMaterial: new THREE.MeshStandardMaterial({
      color: 0x262930,
      roughness: 0.78,
      metalness: 0.35
    })
  };
}
