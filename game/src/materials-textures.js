import * as THREE from 'three';

/**
 * Builds a procedural studio + Vice sunset IBL light-dome scene and bakes it
 * with PMREMGenerator so all MeshStandardMaterial and MeshPhysicalMaterial
 * clearcoat car paints and glass facades display rich specular reflections.
 */
export function createStudioEnvironmentMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x180b28);

  const addPanel = (colorHex, intensity, pos, lookAtPos, sx, sy) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(intensity),
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(lookAtPos[0], lookAtPos[1], lookAtPos[2]);
    envScene.add(mesh);
  };

  // Golden-hour sunset horizon softbox
  addPanel(0xff8c42, 4.2, [35, 10, -25], [0, 0, 0], 48, 22);
  // Solar core highlight
  addPanel(0xfff1c1, 7.5, [28, 12, -28], [0, 0, 0], 14, 14);
  // Electric magenta Vice neon bounce panel
  addPanel(0xff2a85, 3.6, [-32, 8, 18], [0, 0, 0], 42, 20);
  // Cyan ocean horizon bounce panel
  addPanel(0x00f0ff, 3.1, [24, 6, 32], [0, 0, 0], 44, 18);
  // Zenith twilight sky fill
  addPanel(0x6366f1, 2.2, [0, 38, 0], [0, 0, 0], 55, 55);
  // Overhead crisp automotive studio softbox strips for clearcoat hood reflections
  addPanel(0xffffff, 4.8, [-10, 28, -8], [0, 0, 0], 34, 8);
  addPanel(0xffe4e6, 4.0, [12, 26, 10], [0, 0, 0], 32, 7);

  // Warm ground bounce ring
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x241634, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -18;
  envScene.add(floor);

  const envTexture = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();
  return envTexture;
}

/**
 * High-detail procedural asphalt road texture with granular aggregate noise,
 * tire-wear sheen bands, crisp double-yellow center divider lines, and dashed lane lines.
 */
export function createAsphaltRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base wet-look dark asphalt
  ctx.fillStyle = '#1b1e28';
  ctx.fillRect(0, 0, 512, 512);

  // Granular asphalt aggregate speckle
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % 512;
    const y = (i * 139 + ((i * 31) % 97)) % 512;
    const lum = 22 + (i % 24);
    ctx.fillStyle = `rgb(${lum}, ${lum + 2}, ${lum + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire track wear zones in lanes
  const gradLeft = ctx.createLinearGradient(96, 0, 192, 0);
  gradLeft.addColorStop(0, 'rgba(12, 14, 20, 0)');
  gradLeft.addColorStop(0.5, 'rgba(10, 12, 18, 0.45)');
  gradLeft.addColorStop(1, 'rgba(12, 14, 20, 0)');
  ctx.fillStyle = gradLeft;
  ctx.fillRect(96, 0, 96, 512);

  const gradRight = ctx.createLinearGradient(320, 0, 416, 0);
  gradRight.addColorStop(0, 'rgba(12, 14, 20, 0)');
  gradRight.addColorStop(0.5, 'rgba(10, 12, 18, 0.45)');
  gradRight.addColorStop(1, 'rgba(12, 14, 20, 0)');
  ctx.fillStyle = gradRight;
  ctx.fillRect(320, 0, 96, 512);

  // Outer road shoulder white trim lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.fillRect(18, 0, 6, 512);
  ctx.fillRect(488, 0, 6, 512);

  // Double-yellow center divider lines
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(247, 0, 6, 512);
  ctx.fillRect(259, 0, 6, 512);

  // White dashed multi-lane markers
  ctx.fillStyle = 'rgba(241, 245, 249, 0.82)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(132, y, 6, 34);
    ctx.fillRect(374, y, 6, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Intersection asphalt texture with zebra crosswalk stripes on all 4 approaches.
 */
export function createIntersectionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b1e28';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = (i * 89) % 512;
    const y = (i * 151 + ((i * 19) % 83)) % 512;
    const lum = 24 + (i % 20);
    ctx.fillStyle = `rgb(${lum}, ${lum + 2}, ${lum + 7})`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = 'rgba(241, 245, 249, 0.82)';
  // Top & Bottom zebra crosswalk bars
  for (let x = 48; x < 464; x += 28) {
    ctx.fillRect(x, 14, 14, 38);
    ctx.fillRect(x, 460, 14, 38);
  }
  // Left & Right zebra crosswalk bars
  for (let y = 48; y < 464; y += 28) {
    ctx.fillRect(14, y, 38, 14);
    ctx.fillRect(460, y, 38, 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Architectural Art-Deco sidewalk paver texture.
 */
export function createSidewalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 256, 256);

  // Warm Art-Deco geometric tiles
  const tile = 32;
  for (let gx = 0; gx < 8; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      const even = (gx + gy) % 2 === 0;
      ctx.fillStyle = even ? '#78716c' : '#64748b';
      ctx.fillRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds 4 distinct architectural facade texture pairs ({ map, emissiveMap })
 * so skyscrapers reflect golden-hour directional sunlight on their stone/glass frames
 * while glowing with warm interior rooms and vertical neon light tubes.
 */
export function createBuildingFacadeTextures() {
  const styles = [
    {
      id: 'art_deco_hotel',
      wallColor: '#f1e4d1',
      trimColor: '#38bdf8',
      neonColor: '#ff2a85',
      windowLitA: '#fde68a',
      windowLitB: '#f472b6',
      windowDark: '#1e293b'
    },
    {
      id: 'glass_skyscraper',
      wallColor: '#1e293b',
      trimColor: '#0ea5e9',
      neonColor: '#00f0ff',
      windowLitA: '#bae6fd',
      windowLitB: '#fef08a',
      windowDark: '#0f172a'
    },
    {
      id: 'neon_casino',
      wallColor: '#1f1235',
      trimColor: '#ec4899',
      neonColor: '#f43f5e',
      windowLitA: '#fbcfe8',
      windowLitB: '#67e8f9',
      windowDark: '#090414'
    },
    {
      id: 'harbor_warehouse',
      wallColor: '#334155',
      trimColor: '#f59e0b',
      neonColor: '#fb923c',
      windowLitA: '#fed7aa',
      windowLitB: '#fde047',
      windowDark: '#0f172a'
    }
  ];

  return styles.map((style, idx) => {
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = 512;
    diffCanvas.height = 512;
    const dCtx = diffCanvas.getContext('2d');

    const emCanvas = document.createElement('canvas');
    emCanvas.width = 512;
    emCanvas.height = 512;
    const eCtx = emCanvas.getContext('2d');

    // Fill diffuse wall structure and black emissive base
    dCtx.fillStyle = style.wallColor;
    dCtx.fillRect(0, 0, 512, 512);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 12;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      // Horizontal floor spandrel beam + Art-Deco ledge
      dCtx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      dCtx.fillRect(0, r * cellH, 512, 6);

      if (r % 3 === 0) {
        dCtx.fillStyle = style.trimColor;
        dCtx.fillRect(0, r * cellH, 512, 3);
        eCtx.fillStyle = style.trimColor;
        eCtx.fillRect(0, r * cellH, 512, 2);
      }

      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + 7;
        const wy = r * cellH + 8;
        const ww = cellW - 14;
        const wh = cellH - 13;

        const hash = ((r * 37 + c * 19 + idx * 11) * 73) % 100;
        const isLit = hash < 58;

        if (isLit) {
          const litCol = hash < 42 ? style.windowLitA : style.windowLitB;
          dCtx.fillStyle = litCol;
          dCtx.fillRect(wx, wy, ww, wh);

          eCtx.fillStyle = litCol;
          eCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);

          // Interior horizontal venetian blind / balcony rail silhouette
          dCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
          dCtx.fillRect(wx, wy + wh * 0.65, ww, 3);
          eCtx.fillStyle = '#000000';
          eCtx.fillRect(wx, wy + wh * 0.65, ww, 3);
        } else {
          dCtx.fillStyle = style.windowDark;
          dCtx.fillRect(wx, wy, ww, wh);
        }

        // Window mullion frame
        dCtx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
        dCtx.lineWidth = 2;
        dCtx.strokeRect(wx, wy, ww, wh);
      }
    }

    // Vertical neon accent tubes on facade edges & center pilaster
    for (const nx of [4, 254, 504]) {
      dCtx.fillStyle = style.neonColor;
      dCtx.fillRect(nx, 0, 4, 512);
      eCtx.fillStyle = style.neonColor;
      eCtx.fillRect(nx, 0, 4, 512);
    }

    const map = new THREE.CanvasTexture(diffCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;

    const emissiveMap = new THREE.CanvasTexture(emCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
    emissiveMap.anisotropy = 4;

    return { id: style.id, map, emissiveMap };
  });
}

/**
 * Animated turquoise ocean wave & specular foam crest texture.
 */
export function createOceanWaveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.5, '#0369a1');
  grad.addColorStop(1, '#0891b2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Wave ribbons & turquoise caustics
  for (let i = 0; i < 90; i++) {
    const y = (i * 29) % 512;
    const x = (i * 83) % 440;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(165, 243, 252, 0.38)' : 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 36, y - 8, x + 72, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 28);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates a glowing 3D rooftop/facade Neon Marquee Sign texture.
 */
export function createNeonSignTexture(text, primaryColor = '#ff2a85', accentColor = '#00f0ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Dark translucent sign backing
  ctx.fillStyle = '#090414';
  ctx.fillRect(0, 0, 512, 128);

  // Outer neon border tube
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 14;
  ctx.strokeRect(8, 8, 496, 112);

  // Inner neon text
  ctx.font = '900 44px "Segoe UI", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = primaryColor;
  ctx.fillText(text, 256, 66);

  // White hot tube core
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates the complete shared PBR material library for Solaris Bay 3D.
 */
export function createMaterialLibrary(renderer) {
  const envMap = createStudioEnvironmentMap(renderer);
  const roadTex = createAsphaltRoadTexture();
  const intersectionTex = createIntersectionTexture();
  const sidewalkTex = createSidewalkTexture();
  const oceanTex = createOceanWaveTexture();
  const facadePairs = createBuildingFacadeTextures();

  const carPaintCache = new Map();
  const neonSignCache = new Map();

  function getCarPaintMaterial(hexColor) {
    if (!carPaintCache.has(hexColor)) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hexColor),
        metalness: 0.42,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.07,
        reflectivity: 1.0,
        envMapIntensity: 1.65
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
        emissiveIntensity: 1.55,
        roughness: 0.2,
        metalness: 0.1
      });
      neonSignCache.set(key, mat);
    }
    return neonSignCache.get(key);
  }

  const buildingMaterials = facadePairs.map((pair, idx) => {
    const isGlass = idx === 1;
    return new THREE.MeshPhysicalMaterial({
      map: pair.map,
      emissiveMap: pair.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.15,
      roughness: isGlass ? 0.16 : 0.48,
      metalness: isGlass ? 0.35 : 0.12,
      clearcoat: isGlass ? 0.85 : 0.15,
      clearcoatRoughness: 0.15,
      envMapIntensity: isGlass ? 1.5 : 0.9
    });
  });

  return {
    envMap,
    roadTex,
    intersectionTex,
    sidewalkTex,
    oceanTex,
    getCarPaintMaterial,
    getNeonSignMaterial,
    buildingMaterials,
    roadMaterial: new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.58,
      metalness: 0.08,
      envMapIntensity: 0.75
    }),
    intersectionMaterial: new THREE.MeshStandardMaterial({
      map: intersectionTex,
      roughness: 0.58,
      metalness: 0.08,
      envMapIntensity: 0.75
    }),
    sidewalkMaterial: new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.72,
      metalness: 0.05
    }),
    grassMaterial: new THREE.MeshStandardMaterial({
      color: 0x1e3a2f,
      roughness: 0.85,
      metalness: 0.02
    }),
    sandMaterial: new THREE.MeshStandardMaterial({
      color: 0xe6c79c,
      roughness: 0.78,
      metalness: 0.04
    }),
    boardwalkMaterial: new THREE.MeshStandardMaterial({
      color: 0x7c4a2d,
      roughness: 0.65,
      metalness: 0.06
    }),
    oceanMaterial: new THREE.MeshPhysicalMaterial({
      map: oceanTex,
      color: 0x0ea5e9,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8
    }),
    glassCanopyMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x091326,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.1
    }),
    chromeMaterial: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.12,
      envMapIntensity: 1.8
    }),
    darkMetalMaterial: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.35
    }),
    tireRubberMaterial: new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.05,
      roughness: 0.85
    }),
    headlightMaterial: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 3.2,
      roughness: 0.1
    }),
    taillightMaterial: new THREE.MeshStandardMaterial({
      color: 0xff1e42,
      emissive: 0xff0033,
      emissiveIntensity: 2.8,
      roughness: 0.15
    }),
    policeRedMaterial: new THREE.MeshStandardMaterial({
      color: 0xff1e42,
      emissive: 0xff0033,
      emissiveIntensity: 4.0,
      roughness: 0.1
    }),
    policeBlueMaterial: new THREE.MeshStandardMaterial({
      color: 0x00d8ff,
      emissive: 0x00a2ff,
      emissiveIntensity: 4.0,
      roughness: 0.1
    }),
    neonPinkMaterial: new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff1e74,
      emissiveIntensity: 2.6,
      roughness: 0.15
    }),
    neonCyanMaterial: new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d8ff,
      emissiveIntensity: 2.6,
      roughness: 0.15
    }),
    neonGoldMaterial: new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.4,
      roughness: 0.15
    }),
    palmTrunkMaterial: new THREE.MeshStandardMaterial({
      color: 0x6b4c35,
      roughness: 0.85,
      metalness: 0.03
    }),
    palmFrondMaterial: new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.52,
      metalness: 0.06,
      side: THREE.DoubleSide
    })
  };
}
