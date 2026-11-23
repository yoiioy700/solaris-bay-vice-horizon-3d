import * as THREE from 'three';
import {
  ROAD_WIDTH,
  COAST_X,
  BEACH_WIDTH,
  WORLD_HEIGHT,
  ISLAND_X1,
  ISLAND_X2,
  ISLAND_Y1,
  ISLAND_Y2,
  CAUSEWAY_YS
} from './config.js';
import { createMaterialLibrary } from './materials-textures.js';
import {
  syncTransform3D,
  buildVehicleModel3D,
  buildCharacterModel3D,
  buildSkyscraperModel3D,
  buildPalmTreeModel3D,
  buildBeachPropModel3D,
  buildShopModel3D,
  buildTrafficLightModel3D,
  buildCafePatioModel3D,
  buildStreetPropModel3D,
  buildBoardwalkRailingGroup,
  buildClubEclipseModel3D,
  buildHarborYardModel3D,
  buildHelicopterModel3D,
  buildLuxuryYachtModel3D
} from './model-factories.js';
import { findNearestHijackableVehicle } from './vehicles.js';
import { findNearestShop, getActiveWalkInShopAt } from './shops-economy.js';
import { CLUB_ECLIPSE_BOUNDS, isInsideClubEclipse } from './nightlife-romance.js';

// Shared late-afternoon Miami golden-hour sun vector (~31.5° elevation)
// Keeps sky glow, volumetric clouds, and directional shadows 100% physically aligned.
const SUN_DIR = new THREE.Vector3(0.56, 0.52, -0.64).normalize();

/**
 * Scenic Miami / Vice Coast Golden-Hour Sky Dome Shader:
 * Deep coastal azure zenith -> soft sky blue -> dusty peach-rose -> creamy warm-gold mist,
 * layered with procedural 4-octave fBM backlit clouds (warm golden undersides + slate-blue upper shadows)
 * and a soft diffused solar halo that never clips into harsh glare.
 */
function createGoldenHourSkyDome() {
  const skyGeo = new THREE.SphereGeometry(4200, 44, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenithColor: { value: new THREE.Color(0x265482) },
      uUpperMidColor: { value: new THREE.Color(0x5682ad) },
      uLowerMidColor: { value: new THREE.Color(0xc49c91) },
      uHorizonColor: { value: new THREE.Color(0xe7cca2) },
      uSunColor: { value: new THREE.Color(0xffebd0) },
      uSunDir: { value: SUN_DIR.clone() },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorldOffset;
      void main() {
        vWorldOffset = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenithColor;
      uniform vec3 uUpperMidColor;
      uniform vec3 uLowerMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uTime;
      varying vec3 vWorldOffset;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          val += amp * valueNoise(p);
          p = rot * p * 2.04 + vec2(1.7, 9.2);
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        vec3 dir = normalize(vWorldOffset);
        float h = clamp(dir.y, 0.0, 1.0);

        // Smooth 4-stop Miami golden-hour atmospheric sky gradient
        vec3 col = mix(uHorizonColor, uLowerMidColor, smoothstep(0.0, 0.14, h));
        col = mix(col, uUpperMidColor, smoothstep(0.11, 0.34, h));
        col = mix(col, uZenithColor, smoothstep(0.30, 0.82, h));

        // Subtle muted mist below horizon line
        if (dir.y < 0.0) {
          col = mix(uHorizonColor, vec3(0.55, 0.60, 0.64), smoothstep(0.0, -0.18, dir.y));
        }

        // Gentle diffused Mie atmospheric sun glow & soft solar halo (no harsh pure-white clip)
        float sunAmt = max(dot(dir, uSunDir), 0.0);
        col += uHorizonColor * pow(sunAmt, 4.0) * 0.16;
        col += uSunColor * pow(sunAmt, 28.0) * 0.24;
        col += uSunColor * smoothstep(0.9968, 0.9994, sunAmt) * 0.42;

        // Procedural multi-octave fBM backlit coastal cumulus clouds on curved sky dome
        if (dir.y > 0.025) {
          vec2 cloudUv = dir.xz / (dir.y + 0.22) * 1.42 + vec2(uTime * 0.005, -uTime * 0.003) + vec2(2.4, -1.3);
          float baseN = fbm(cloudUv);
          float detailN = fbm(cloudUv * 2.3 + vec2(5.1, 3.4));
          float combined = baseN * 0.68 + detailN * 0.32;
          float density = smoothstep(0.47, 0.67, combined);

          // Sample slightly toward sun direction for sunlit warm-gold underside & cool slate-blue upper shadow
          vec2 sunStep = normalize(uSunDir.xz) * 0.14;
          float towardSun = fbm(cloudUv + sunStep);
          float lightFactor = clamp(0.42 + (baseN - towardSun) * 3.6 + pow(sunAmt, 2.5) * 0.38, 0.0, 1.0);

          vec3 cloudShadow = vec3(0.39, 0.50, 0.66);
          vec3 cloudLit = mix(vec3(0.95, 0.87, 0.78), vec3(1.0, 0.89, 0.73), pow(sunAmt, 1.8));
          vec3 cloudCol = mix(cloudShadow, cloudLit, lightFactor);

          // Fade clouds smoothly near the horizon mist and overhead zenith
          float horizonFade = smoothstep(0.03, 0.18, dir.y) * smoothstep(0.95, 0.45, dir.y);
          col = mix(col, cloudCol, density * horizonFade * 0.78);
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  return new THREE.Mesh(skyGeo, skyMat);
}

export function createWorldRenderer3D(canvas, state) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(1280, 720, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping =
    THREE.AgXToneMapping !== undefined
      ? THREE.AgXToneMapping
      : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const lib = createMaterialLibrary(renderer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc4c0ba);
  scene.environment = lib.envMap;
  if ('environmentIntensity' in scene) {
    scene.environmentIntensity = 0.54;
  }
  scene.fog = new THREE.FogExp2(0xc4c0ba, 0.00032);

  const camera = new THREE.PerspectiveCamera(58, 1280 / 720, 1.5, 5000);

  // 1. Scenic Golden-Hour Sky Dome with Backlit fBM Clouds
  const skyDome = createGoldenHourSkyDome();
  scene.add(skyDome);

  // 2. Balanced 3-Point Golden-Hour Lighting Rig + Crisp Soft Camera-Anchored Shadows
  const hemiLight = new THREE.HemisphereLight(0x9ec5e8, 0x62554a, 0.92);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffe0b5, 2.35);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 760;
  const shadowHalf = 125;
  sunLight.shadow.camera.left = -shadowHalf;
  sunLight.shadow.camera.right = shadowHalf;
  sunLight.shadow.camera.top = shadowHalf;
  sunLight.shadow.camera.bottom = -shadowHalf;
  sunLight.shadow.bias = -0.00025;
  sunLight.shadow.normalBias = 0.035;
  sunLight.shadow.radius = 2.6;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Opposite soft coastal sky bounce rim so shaded facades and car panels remain cleanly sculpted
  const bounceRimLight = new THREE.DirectionalLight(0xa8c2de, 0.42);
  bounceRimLight.position.set(-SUN_DIR.x * 200, 140, -SUN_DIR.z * 200);
  bounceRimLight.castShadow = false;
  scene.add(bounceRimLight);

  // 3. Static 3D City Geometry (Sidewalks, Roads, Beach, Wet Sand, Foam, Ocean, Buildings, Palms, Props, Yachts)
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const { cityMap } = state;

  // Base urban travertine/concrete sidewalk ground slab
  const groundGeo = new THREE.PlaneGeometry(COAST_X + 60, WORLD_HEIGHT + 400);
  groundGeo.rotateX(-Math.PI * 0.5);
  const groundMesh = new THREE.Mesh(groundGeo, lib.sidewalkMaterial);
  groundMesh.position.set((COAST_X + 60) * 0.5, -0.08, WORLD_HEIGHT * 0.5);
  groundMesh.receiveShadow = true;
  cityGroup.add(groundMesh);

  // Natural Golden Solaris Beach strip
  const beachGeo = new THREE.PlaneGeometry(BEACH_WIDTH + 30, WORLD_HEIGHT + 400);
  beachGeo.rotateX(-Math.PI * 0.5);
  const beachMesh = new THREE.Mesh(beachGeo, lib.sandMaterial);
  beachMesh.position.set(COAST_X + BEACH_WIDTH * 0.5 - 10, -0.04, WORLD_HEIGHT * 0.5);
  beachMesh.receiveShadow = true;
  cityGroup.add(beachMesh);

  // Damp wet-sand shoreline band right where beach meets water
  const wetSandGeo = new THREE.PlaneGeometry(36, WORLD_HEIGHT + 400);
  wetSandGeo.rotateX(-Math.PI * 0.5);
  const wetSandMesh = new THREE.Mesh(wetSandGeo, lib.wetSandMaterial);
  wetSandMesh.position.set(COAST_X + BEACH_WIDTH - 10, -0.01, WORLD_HEIGHT * 0.5);
  wetSandMesh.receiveShadow = true;
  cityGroup.add(wetSandMesh);

  // Soft animated shoreline surf foam strip
  const foamGeo = new THREE.PlaneGeometry(24, WORLD_HEIGHT + 400);
  foamGeo.rotateX(-Math.PI * 0.5);
  const foamMesh = new THREE.Mesh(foamGeo, lib.shoreFoamMaterial);
  foamMesh.position.set(COAST_X + BEACH_WIDTH + 4, 0.08, WORLD_HEIGHT * 0.5);
  cityGroup.add(foamMesh);

  // Weathered Coastal Timber Boardwalk Promenade & Low Limestone Seawall along Ocean Drive
  const boardwalkGeo = new THREE.BoxGeometry(28, 0.65, WORLD_HEIGHT);
  const boardwalkMesh = new THREE.Mesh(boardwalkGeo, lib.boardwalkMaterial);
  boardwalkMesh.position.set(COAST_X - 18, 0.25, WORLD_HEIGHT * 0.5);
  boardwalkMesh.receiveShadow = true;
  cityGroup.add(boardwalkMesh);

  const seawallGeo = new THREE.BoxGeometry(2.6, 2.8, WORLD_HEIGHT);
  const seawallMesh = new THREE.Mesh(seawallGeo, lib.seawallMaterial);
  seawallMesh.position.set(COAST_X - 4.2, 1.4, WORLD_HEIGHT * 0.5);
  seawallMesh.castShadow = true;
  seawallMesh.receiveShadow = true;
  cityGroup.add(seawallMesh);

  // Tropical Turquoise-Teal 3D Ocean Surface (expanded past Starfish Island & Sunset Beach!)
  const oceanGeo = new THREE.PlaneGeometry(3400, WORLD_HEIGHT + 1200);
  oceanGeo.rotateX(-Math.PI * 0.5);
  const oceanMesh = new THREE.Mesh(oceanGeo, lib.oceanMaterial);
  oceanMesh.position.set(COAST_X + BEACH_WIDTH + 1620, -0.22, WORLD_HEIGHT * 0.5);
  oceanMesh.receiveShadow = true;
  cityGroup.add(oceanMesh);

  // Starfish Island Offshore Landmass, Beach Collar & Island Boulevards
  const islandW = ISLAND_X2 - ISLAND_X1;
  const islandH = ISLAND_Y2 - ISLAND_Y1;
  const islandCx = (ISLAND_X1 + ISLAND_X2) * 0.5;
  const islandCy = (ISLAND_Y1 + ISLAND_Y2) * 0.5;

  const islandBeachGeo = new THREE.BoxGeometry(islandW + 76, 0.35, islandH + 76);
  const islandBeach = new THREE.Mesh(islandBeachGeo, lib.sandMaterial);
  islandBeach.position.set(islandCx, -0.05, islandCy);
  islandBeach.receiveShadow = true;
  cityGroup.add(islandBeach);

  const islandSlabGeo = new THREE.BoxGeometry(islandW, 0.45, islandH);
  const islandSlab = new THREE.Mesh(islandSlabGeo, lib.sidewalkMaterial);
  islandSlab.position.set(islandCx, 0.02, islandCy);
  islandSlab.receiveShadow = true;
  cityGroup.add(islandSlab);

  // Starfish Island Roads
  if (cityMap.islandVerticalRoads) {
    for (const rx of cityMap.islandVerticalRoads) {
      const rGeo = new THREE.PlaneGeometry(ROAD_WIDTH, islandH - 60);
      rGeo.rotateX(-Math.PI * 0.5);
      const rMesh = new THREE.Mesh(rGeo, lib.roadMaterial);
      rMesh.position.set(rx, 0.28, islandCy);
      rMesh.receiveShadow = true;
      cityGroup.add(rMesh);
    }
  }
  if (cityMap.islandHorizontalRoads) {
    for (const ry of cityMap.islandHorizontalRoads) {
      const rGeo = new THREE.PlaneGeometry(ROAD_WIDTH, islandW - 40);
      rGeo.rotateX(-Math.PI * 0.5);
      rGeo.rotateY(Math.PI * 0.5);
      const rMesh = new THREE.Mesh(rGeo, lib.roadMaterial);
      rMesh.position.set(islandCx, 0.3, ry);
      rMesh.receiveShadow = true;
      cityGroup.add(rMesh);
    }
  }

  // Two Grand Palm Causeway Bridges connecting Ocean Drive to Starfish Island (y = 896 & 1856)
  for (const cy of CAUSEWAY_YS) {
    const spanLen = ISLAND_X1 - 2720 + 180;
    const midX = 2720 + spanLen * 0.5;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 1.4, ROAD_WIDTH - 4), lib.roadMaterial);
    deck.position.set(midX, 0.32, cy);
    deck.receiveShadow = true;
    cityGroup.add(deck);

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 3.2, 2.2), lib.seawallMaterial);
      rail.position.set(midX, 2.0, cy + side * (ROAD_WIDTH * 0.5 - 1));
      rail.castShadow = true;
      cityGroup.add(rail);
    }
    for (let px = 2860; px <= ISLAND_X1; px += 90) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 12, ROAD_WIDTH - 12), lib.graniteTrimMaterial);
      pier.position.set(px, -5.8, cy);
      cityGroup.add(pier);
    }
  }

  // Starfish Bay Marina Wooden Superyacht Piers
  for (const pierY of [690, 1140, 1620, 2140, 3020, 3860]) {
    const pierMesh = new THREE.Mesh(
      new THREE.BoxGeometry(210, 2.2, 22),
      lib.boardwalkMaterial
    );
    pierMesh.position.set(COAST_X + BEACH_WIDTH + 65, 1.2, pierY);
    pierMesh.castShadow = true;
    pierMesh.receiveShadow = true;
    cityGroup.add(pierMesh);
  }

  // Vertical Avenue Asphalt Road Strips
  for (const rx of cityMap.verticalRoads) {
    const roadMat = lib.roadMaterial.clone();
    roadMat.map = lib.roadTex.clone();
    roadMat.map.needsUpdate = true;
    roadMat.map.repeat.set(1, 34);
    roadMat.roughnessMap = lib.roadRoughTex.clone();
    roadMat.roughnessMap.needsUpdate = true;
    roadMat.roughnessMap.repeat.set(1, 34);

    const rGeo = new THREE.PlaneGeometry(ROAD_WIDTH, WORLD_HEIGHT);
    rGeo.rotateX(-Math.PI * 0.5);
    const rMesh = new THREE.Mesh(rGeo, roadMat);
    rMesh.position.set(rx, 0.08, WORLD_HEIGHT * 0.5);
    rMesh.receiveShadow = true;
    cityGroup.add(rMesh);
  }

  // Horizontal Avenue Asphalt Road Strips
  for (const ry of cityMap.horizontalRoads) {
    const roadMat = lib.roadMaterial.clone();
    roadMat.map = lib.roadTex.clone();
    roadMat.map.needsUpdate = true;
    roadMat.map.repeat.set(1, 26);
    roadMat.roughnessMap = lib.roadRoughTex.clone();
    roadMat.roughnessMap.needsUpdate = true;
    roadMat.roughnessMap.repeat.set(1, 26);

    const rGeo = new THREE.PlaneGeometry(ROAD_WIDTH, COAST_X);
    rGeo.rotateX(-Math.PI * 0.5);
    rGeo.rotateY(Math.PI * 0.5);
    const rMesh = new THREE.Mesh(rGeo, roadMat);
    rMesh.position.set(COAST_X * 0.5, 0.11, ry);
    rMesh.receiveShadow = true;
    cityGroup.add(rMesh);
  }

  // Crosswalk Intersection Tiles
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 4, ROAD_WIDTH + 4);
  interGeo.rotateX(-Math.PI * 0.5);
  for (const inter of cityMap.intersections) {
    const iMesh = new THREE.Mesh(interGeo, lib.intersectionMaterial);
    iMesh.position.set(inter.x, 0.16, inter.y);
    iMesh.receiveShadow = true;
    cityGroup.add(iMesh);
  }

  // Multi-Tiered Architectural Buildings & Coastal Hotels (culled cleanly beyond 1950u fog horizon)
  const cullableStatics = [];
  for (const b of cityMap.buildings) {
    const bModel = buildSkyscraperModel3D(b, lib);
    cityGroup.add(bModel);
    cullableStatics.push({
      x: b.x + b.w * 0.5,
      y: b.y + b.h * 0.5,
      obj: bModel,
      maxDistSq: 1950 * 1950
    });
  }

  // Curved 7-Segment Coastal Palm Trees (distance-culled beyond 1250u for 60 FPS)
  for (const tree of cityMap.palmTrees) {
    const pModel = buildPalmTreeModel3D(tree, lib);
    cityGroup.add(pModel);
    cullableStatics.push({ x: tree.x, y: tree.y, obj: pModel, maxDistSq: 1250 * 1250 });
  }

  // Solaris Beach Umbrellas & Lifeguard Stations
  // Solaris Beach Umbrellas, Loungers, Surfboards & Lifeguard Stations
  if (cityMap.beachProps) {
    for (const prop of cityMap.beachProps) {
      cityGroup.add(buildBeachPropModel3D(prop, lib));
      const m = buildBeachPropModel3D(prop, lib);
      cityGroup.add(m);
      cullableStatics.push({ x: prop.x, y: prop.y, obj: m, maxDistSq: 950 * 950 });
    }
  }

  // Timber Boardwalk Railings & Marina Pier Dock Bollards (instanced batch)
  if (cityMap.boardwalkRailings) {
    cityGroup.add(
      buildBoardwalkRailingGroup(
        cityMap.boardwalkRailings,
        [690, 920, 1620, 2140],
        COAST_X,
        BEACH_WIDTH,
        lib
      )
    );
  }

  // Interactive 3D Shops, Street Food Carts, Vice Armory, 24/7 Mart & Pay-N-Spray Garages
  const shopModels = [];
  if (cityMap.shops) {
    for (const shop of cityMap.shops) {
      const sModel = buildShopModel3D(shop, lib);
      cityGroup.add(sModel);
      shopModels.push({ data: shop, mesh: sModel });
      cullableStatics.push({ x: shop.x, y: shop.y, obj: sModel, maxDistSq: 980 * 980 });
    }
  }

  // Cantilevered Intersection Traffic Lights
  const trafficLightModels = [];
  if (cityMap.trafficLights) {
    for (const tl of cityMap.trafficLights) {
      const tlModel = buildTrafficLightModel3D(tl, lib);
      cityGroup.add(tlModel);
      trafficLightModels.push(tlModel);
      cullableStatics.push({ x: tl.x, y: tl.y, obj: tlModel, maxDistSq: 880 * 880 });
    }
  }

  // Sidewalk Café Patios (bistro tables, chairs, striped umbrellas)
  if (cityMap.cafePatios) {
    for (const patio of cityMap.cafePatios) {
      const m = buildCafePatioModel3D(patio, lib);
      cityGroup.add(m);
      cullableStatics.push({ x: patio.x, y: patio.y, obj: m, maxDistSq: 820 * 820 });
    }
  }

  // Everyday Urban Street Furniture (hydrants, benches, bus stops, planters, bins, vending)
  if (cityMap.streetProps) {
    for (const prop of cityMap.streetProps) {
      const m = buildStreetPropModel3D(prop, lib);
      cityGroup.add(m);
      cullableStatics.push({ x: prop.x, y: prop.y, obj: m, maxDistSq: 780 * 780 });
    }
  }

  // Seamless Open-Air 3D CLUB ECLIPSE • 21+ DISCO & VIP PAVILION
  const clubEclipseMesh = buildClubEclipseModel3D(CLUB_ECLIPSE_BOUNDS, lib);
  cityGroup.add(clubEclipseMesh);

  // Palm Harbor Docks Container Terminals & Gantry Cranes
  if (cityMap.harborProps) {
    for (const hp of cityMap.harborProps) {
      const m = buildHarborYardModel3D(hp, lib);
      cityGroup.add(m);
      cullableStatics.push({ x: hp.x, y: hp.y, obj: m, maxDistSq: 1150 * 1150 });
    }
  }

  // Sleek Coastal Avenue Streetlamps with Warm Amber Luminaires & Grounded AO Shadow
  const poleGeo = new THREE.CylinderGeometry(0.38, 0.58, 22, 8);
  const armGeo = new THREE.BoxGeometry(6.2, 0.45, 0.45);
  const bulbGeo = new THREE.BoxGeometry(2.2, 0.65, 1.25);
  const poleAoGeo = new THREE.PlaneGeometry(6.5, 6.5);
  poleAoGeo.rotateX(-Math.PI * 0.5);
  for (const sl of cityMap.streetlights) {
    const slGroup = new THREE.Group();
    slGroup.position.set(sl.x, 0, sl.y);

    const poleAo = new THREE.Mesh(poleAoGeo, lib.contactShadowMaterial);
    poleAo.position.y = 0.15;
    slGroup.add(poleAo);

    const pole = new THREE.Mesh(poleGeo, lib.darkMetalMaterial);
    pole.position.y = 11;
    pole.castShadow = true;
    slGroup.add(pole);

    const arm = new THREE.Mesh(armGeo, lib.darkMetalMaterial);
    arm.position.set(2.8, 21.8, 0);
    slGroup.add(arm);

    const bulb = new THREE.Mesh(bulbGeo, lib.warmLampMaterial);
    bulb.position.set(5.2, 21.45, 0);
    slGroup.add(bulb);

    cityGroup.add(slGroup);
  }

  // Luxury Superyachts
  const yachtModels = [];
  for (const yacht of cityMap.yachts) {
    const yModel = buildLuxuryYachtModel3D(yacht, lib);
    cityGroup.add(yModel);
    yachtModels.push({ data: yacht, mesh: yModel });
  }

  // 4. Refined Grounded Mission Perimeter Ring + Small Floating 3D Diamond (NO sky-cutting column!)
  const missionBeaconGroup = new THREE.Group();
  const groundRingWall = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 2.2, 32, 1, true),
    lib.beaconRingMaterial
  );
  groundRingWall.position.y = 1.1;
  missionBeaconGroup.add(groundRingWall);

  const groundRingFlatGeo = new THREE.RingGeometry(18.6, 20.6, 32);
  groundRingFlatGeo.rotateX(-Math.PI * 0.5);
  const groundRingFlat = new THREE.Mesh(
    groundRingFlatGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe0b268,
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    })
  );
  groundRingFlat.position.y = 0.26;
  missionBeaconGroup.add(groundRingFlat);

  const beaconDiamondGeo = new THREE.OctahedronGeometry(4.4, 0);
  beaconDiamondGeo.scale(0.85, 1.35, 0.85);
  const beaconDiamond = new THREE.Mesh(beaconDiamondGeo, lib.neonGoldMaterial);
  beaconDiamond.position.y = 26;
  missionBeaconGroup.add(beaconDiamond);
  scene.add(missionBeaconGroup);

  // Subtle Flat Asphalt-Flush GPS Route Chevrons (zero clipping into vehicles)
  const gpsChevrons = [];
  const chevronGeo = new THREE.PlaneGeometry(14, 14);
  chevronGeo.rotateX(-Math.PI * 0.5);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(chevronGeo, lib.gpsChevronMaterial);
    m.visible = false;
    m.renderOrder = 2;
    scene.add(m);
    gpsChevrons.push(m);
  }

  // Soft Ground Light Pool Decal for Airborne VCPD Helicopter Searchlight
  const heliLightPoolGeo = new THREE.PlaneGeometry(76, 76);
  heliLightPoolGeo.rotateX(-Math.PI * 0.5);
  const heliLightPool = new THREE.Mesh(heliLightPoolGeo, lib.lightPoolMaterial);
  heliLightPool.position.y = 0.25;
  heliLightPool.visible = false;
  heliLightPool.renderOrder = 2;
  scene.add(heliLightPool);

  // 5. Dynamic Entity Mesh Caches
  const vehicleMeshes = new Map();
  const npcMeshes = new Map();

  // Natural Vice coastal protagonist outfit (live-updatable via Boutique outfits)
  const playerMesh = buildCharacterModel3D(
    {
      jacketColor: state.player.jacketColor || '#b55649',
      shirtColor: state.player.shirtColor || '#d8d1c5',
      pantsColor: state.player.pantsColor || '#252e3a',
      skinColor: '#cfa07e',
      hairColor: '#262220',
      hasShades: true
    },
    lib
  );
  playerMesh.userData.outfitVersion = state.player.outfitVersion || 0;
  scene.add(playerMesh);

  const helicopterMesh = buildHelicopterModel3D(lib);
  helicopterMesh.visible = false;
  scene.add(helicopterMesh);

  // Projectile tracer pool
  const projectileGroup = new THREE.Group();
  scene.add(projectileGroup);
  const projectilePool = [];
  const tracerGeo = new THREE.BoxGeometry(9.5, 0.75, 0.75);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(
      tracerGeo,
      new THREE.MeshBasicMaterial({
        color: 0xe8c47a,
        transparent: true,
        opacity: 0.88
      })
    );
    m.visible = false;
    projectileGroup.add(m);
    projectilePool.push(m);
  }

  // Layered particle pool: soft wispy cloud-puff Sprites (fireballs, heavy smoke, drift smoke, embers) + ground blast rings
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);
  const spriteParticlePool = [];
  const ringParticlePool = [];
  const ringGeo = new THREE.RingGeometry(0.84, 1.0, 28);
  ringGeo.rotateX(-Math.PI * 0.5);
  for (let i = 0; i < 140; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lib.softPuffTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      })
    );
    sp.visible = false;
    particleGroup.add(sp);
    spriteParticlePool.push(sp);
  }
  for (let i = 0; i < 10; i++) {
    const rm = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd9823b,
        transparent: true,
        opacity: 0.36,
        depthWrite: false
      })
    );
    rm.visible = false;
    particleGroup.add(rm);
    ringParticlePool.push(rm);
  }

  // Pickup pool
  const pickupPool = [];
  const pickupGeo = new THREE.OctahedronGeometry(4.0, 0);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(pickupGeo, lib.neonGoldMaterial);
    m.visible = false;
    scene.add(m);
    pickupPool.push(m);
  }

  const camPos = new THREE.Vector3(2720, 56, 2240);
  const camLook = new THREE.Vector3(2720, 18, 2080);
  const shadowFocus = new THREE.Vector3();
  let camInitialized = false;

  function projectWorldToScreen(wx, wz, wy) {
    const v = new THREE.Vector3(wx, wz, wy);
    v.project(camera);
    if (v.z > 1.0) return null;
    return {
      x: (v.x * 0.5 + 0.5) * 1280,
      y: (-v.y * 0.5 + 0.5) * 720
    };
  }

  function render(dt = 0.016) {
    const { player, vehicles, pedestrians, wanted, missions, projectiles, particles, pickups } =
      state;
    const time = state.time || 0;

    // Animate ocean wave UVs, shoreline foam & sky clouds gently
    lib.oceanTex.offset.x = (time * 0.018) % 1;
    lib.oceanTex.offset.y = (time * 0.012) % 1;
    lib.shoreFoamTex.offset.y = (time * 0.025) % 1;
    skyDome.material.uniforms.uTime.value = time;

    for (const ym of yachtModels) {
      ym.mesh.position.y = 1.35 + Math.sin(time * 1.5 + ym.data.x) * 0.45;
    }

    // Sync 3D Vehicles
    // Animate subtle rising cooking steam over Street Food Carts
    for (const sm of shopModels) {
      const sprites = sm.mesh.userData && sm.mesh.userData.steamSprites;
      if (!sprites || sprites.length === 0) continue;
      for (let i = 0; i < sprites.length; i++) {
        const sp = sprites[i];
        const cycle = (time * 0.55 + sp.userData.phase) % 1;
        sp.position.y = 8.4 + cycle * 5.8;
        sp.material.opacity = Math.sin(cycle * Math.PI) * 0.24;
        const sc = 2.6 + cycle * 2.2;
        sp.scale.set(sc, sc, 1);
      }
    }

    // Cycle intersection traffic lights smoothly (Green -> Amber -> Red)
    for (const tlMesh of trafficLightModels) {
      const ud = tlMesh.userData;
      const phase = ((time * 0.22 + ud.phaseOffset) % 3 + 3) % 3;
      const stateIdx = phase < 1.35 ? 2 : phase < 1.65 ? 1 : 0; // 2=green, 1=amber, 0=red
      if (ud.lastSignalState !== stateIdx) {
        ud.lastSignalState = stateIdx;
        for (const m of ud.redLenses) {
          m.material = stateIdx === 0 ? lib.trafficRedMaterial : lib.trafficOffMaterial;
        }
        for (const m of ud.amberLenses) {
          m.material = stateIdx === 1 ? lib.trafficAmberMaterial : lib.trafficOffMaterial;
        }
        for (const m of ud.greenLenses) {
          m.material = stateIdx === 2 ? lib.trafficGreenMaterial : lib.trafficOffMaterial;
        }
      }
    }

    // Animate Club Eclipse 124 BPM LED disco tiles, spinning DJ turntables & sweeping laser beams
    if (clubEclipseMesh && clubEclipseMesh.userData) {
      const beat = Math.floor(time * 2.067); // 124 BPM beat pulse
      const { discoTiles, discoPalette, turntables, laserBeams } = clubEclipseMesh.userData;
      if (discoTiles && discoPalette) {
        for (const tile of discoTiles) {
          const { gx, gz } = tile.userData;
          const idx = (gx + gz + beat) % discoPalette.length;
          tile.material = discoPalette[idx];
        }
      }
      if (turntables) {
        for (const tt of turntables) {
          tt.rotation.y = time * 3.8;
        }
      }
      if (laserBeams) {
        laserBeams.forEach((beam, i) => {
          beam.rotation.z = Math.sin(time * 1.6 + i * 1.4) * 0.48;
          beam.rotation.x = Math.cos(time * 1.3 + i * 1.9) * 0.42;
        });
      }
    }

    // Reference point for distance culling (camera override eye or player position)
    const cullRefX = state.camera.overridePose ? state.camera.overridePose.look[0] : player.x;
    const cullRefY = state.camera.overridePose ? state.camera.overridePose.look[2] : player.y;

    for (const item of cullableStatics) {
      const dx = item.x - cullRefX;
      const dy = item.y - cullRefY;
      item.obj.visible = dx * dx + dy * dy <= item.maxDistSq;
    }

    // Sync 3D Vehicles (and distance-cull far-away vehicles for 60 FPS)
    const activeVehIds = new Set();
    for (const v of vehicles) {
      activeVehIds.add(v.id);
      let mesh = vehicleMeshes.get(v.id);
      if (!mesh) {
        mesh = buildVehicleModel3D(v, lib);
        mesh.userData.lastColor = v.color;
        scene.add(mesh);
        vehicleMeshes.set(v.id, mesh);
      }
      const vdx = v.x - cullRefX;
      const vdy = v.y - cullRefY;
      if (v !== player.vehicle && vdx * vdx + vdy * vdy > 980 * 980) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;

      if (mesh.userData.lastColor !== v.color) {
        mesh.userData.lastColor = v.color;
        const newPaint = lib.getCarPaintMaterial(v.color);
        mesh.userData.bodyGroup.children[0].material = newPaint;
        const paintTargets =
          mesh.userData.paintMeshes || [mesh.userData.bodyGroup.children[0]];
        for (const pm of paintTargets) {
          if (pm) pm.material = newPaint;
        }
      }

      syncTransform3D(mesh, v.x, v.y, v.z || 0, v.angle);

      const bodyGroup = mesh.userData.bodyGroup;
      const activeSess = state.nightlife && state.nightlife.session;
      const isRockingCar =
        activeSess && activeSess.mode.startsWith('car') && activeSess.vehicle === v;
      if (isRockingCar) {
        const sp = activeSess.phase;
        bodyGroup.position.y = Math.abs(Math.sin(sp)) * 1.65;
        bodyGroup.rotation.x = Math.sin(sp) * 0.088;
        bodyGroup.rotation.z = Math.cos(sp * 0.5) * 0.048;
        if (mesh.userData.steamyGlow) mesh.userData.steamyGlow.visible = true;
      } else {
        bodyGroup.position.y = 0;
        bodyGroup.rotation.x = v.drifting ? v.steerAngle * 0.14 : v.steerAngle * 0.06;
        bodyGroup.rotation.z = v.nitroActive ? 0.032 : 0;
        if (mesh.userData.steamyGlow) mesh.userData.steamyGlow.visible = false;
      }

      for (const w of mesh.userData.wheels) {
        if (w.isFront) {
          w.steerPivot.rotation.y = -v.steerAngle;
        }
        w.spinGroup.rotation.z = -v.wheelSpin;
      }

      if (mesh.userData.nitroGroup) {
        mesh.userData.nitroGroup.visible = Boolean(v.nitroActive && !v.destroyed);
        if (v.nitroActive) {
          const pulse = 0.9 + Math.sin(time * 42) * 0.14;
          mesh.userData.nitroGroup.scale.set(pulse, 1, 1);
        }
      }

      if (v.isPolice && mesh.userData.sirenLight) {
        const isRedHalf = Math.sin(v.sirenPhase) >= 0;
        mesh.userData.sirenLight.color.setHex(isRedHalf ? 0xd43542 : 0x3b8fd4);
        mesh.userData.sirenLight.intensity = wanted.stars > 0 ? 7.5 : 2.5;
      }
    }
    for (const [id, mesh] of vehicleMeshes.entries()) {
      if (!activeVehIds.has(id)) mesh.visible = false;
    }

    // Sync 3D Player Character & live boutique outfit materials
    if (playerMesh.userData.outfitVersion !== (player.outfitVersion || 0)) {
      playerMesh.userData.outfitVersion = player.outfitVersion || 0;
      if (player.jacketColor) playerMesh.userData.jacketMat.color.set(player.jacketColor);
      if (player.shirtColor) playerMesh.userData.shirtMat.color.set(player.shirtColor);
      if (player.pantsColor) playerMesh.userData.pantsMat.color.set(player.pantsColor);
    }
    if (player.vehicle) {
      playerMesh.visible = false;
    } else {
      playerMesh.visible = true;
      const onBoardwalk = player.x >= COAST_X - 32 && player.x <= COAST_X - 4;
      const nl = state.nightlife;
      const vipSess = nl && nl.session && nl.session.mode.startsWith('vip') ? nl.session : null;

      if (vipSess) {
        const pulse = Math.sin(vipSess.phase);
        syncTransform3D(
          playerMesh,
          player.x,
          player.y + pulse * 0.65,
          -1.8 + Math.abs(pulse) * 0.45,
          player.angle
        );
        playerMesh.userData.leftLegPivot.rotation.z = 1.15;
        playerMesh.userData.rightLegPivot.rotation.z = 1.15;
        playerMesh.userData.leftArmPivot.rotation.z = 1.05 + pulse * 0.22;
        playerMesh.userData.rightArmPivot.rotation.z = 1.05 - pulse * 0.22;
        playerMesh.userData.weaponGroup.visible = false;
        playerMesh.userData.muzzleFlashMesh.visible = false;
      } else if (nl && nl.dancing) {
        const dp = nl.dancePhase || time * 6.4;
        const bounce = Math.abs(Math.sin(dp)) * 1.1;
        syncTransform3D(
          playerMesh,
          player.x,
          player.y,
          0.36 + bounce,
          player.angle + Math.sin(dp * 0.5) * 0.35
        );
        playerMesh.userData.leftLegPivot.rotation.z = Math.sin(dp) * 0.42;
        playerMesh.userData.rightLegPivot.rotation.z = -Math.sin(dp) * 0.42;
        playerMesh.userData.leftArmPivot.rotation.z = 1.85 + Math.sin(dp) * 0.55;
        playerMesh.userData.rightArmPivot.rotation.z = 1.85 - Math.sin(dp) * 0.55;
        playerMesh.userData.weaponGroup.visible = false;
        playerMesh.userData.muzzleFlashMesh.visible = false;
      } else {
        syncTransform3D(playerMesh, player.x, player.y, onBoardwalk ? 0.58 : 0, player.angle);
        const swing = Math.sin(player.walkPhase) * 0.55;
        playerMesh.userData.leftLegPivot.rotation.z = swing;
        playerMesh.userData.rightLegPivot.rotation.z = -swing;
        playerMesh.userData.leftArmPivot.rotation.z = -swing * 0.6;
        playerMesh.userData.rightArmPivot.rotation.z = Math.PI * 0.44;
        playerMesh.userData.weaponGroup.visible = true;
        playerMesh.userData.muzzleFlashMesh.visible = player.muzzleTimer > 0;
        if (player.muzzleTimer > 0 && playerMesh.userData.muzzleFlashMesh.material) {
          playerMesh.userData.muzzleFlashMesh.material.rotation += 0.7;
        }
      }
    }

    // Sync 3D Pedestrians, Vendors, Dancers, DJ, Companions, Seated Café Patrons, Joggers & Police
    const activeNpcIds = new Set();
    for (const npc of pedestrians) {
      activeNpcIds.add(npc.id);
      let mesh = npcMeshes.get(npc.id);
      if (!mesh) {
        mesh = buildCharacterModel3D(npc, lib);
        scene.add(mesh);
        npcMeshes.set(npc.id, mesh);
      }
      if (npc.dead || npc.inCar) {
        mesh.visible = false;
        continue;
      }
      const ndx = npc.x - cullRefX;
      const ndy = npc.y - cullRefY;
      if (ndx * ndx + ndy * ndy > 680 * 680) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;

      const vipSess =
        state.nightlife &&
        state.nightlife.session &&
        state.nightlife.session.mode.startsWith('vip') &&
        state.nightlife.session.partnerNpc === npc
          ? state.nightlife.session
          : null;

      if (vipSess) {
        const pulse = Math.sin(vipSess.phase);
        syncTransform3D(
          mesh,
          npc.x,
          npc.y - pulse * 0.65,
          -1.6 + Math.abs(pulse) * 0.55,
          npc.angle
        );
        mesh.userData.leftLegPivot.rotation.z = 1.1;
        mesh.userData.rightLegPivot.rotation.z = 1.1;
        mesh.userData.leftArmPivot.rotation.z = 1.15 - pulse * 0.25;
        mesh.userData.rightArmPivot.rotation.z = 1.15 + pulse * 0.25;
      } else if (npc.isDancer || npc.role === 'dj') {
        const dp = npc.walkPhase + time * 6.4;
        const bounce = Math.abs(Math.sin(dp)) * 0.9;
        syncTransform3D(
          mesh,
          npc.x,
          npc.y,
          (npc.z || 0) + bounce,
          npc.angle + (npc.isDancer ? Math.sin(dp * 0.4) * 0.3 : 0)
        );
        mesh.userData.leftLegPivot.rotation.z = npc.isDancer ? Math.sin(dp) * 0.38 : 0;
        mesh.userData.rightLegPivot.rotation.z = npc.isDancer ? -Math.sin(dp) * 0.38 : 0;
        mesh.userData.leftArmPivot.rotation.z =
          npc.role === 'dj' ? 0.9 + Math.sin(dp) * 0.25 : 1.7 + Math.sin(dp) * 0.5;
        mesh.userData.rightArmPivot.rotation.z =
          npc.role === 'dj' ? 0.9 - Math.sin(dp) * 0.25 : 1.7 - Math.sin(dp) * 0.5;
        mesh.userData.headGroup.rotation.y = Math.sin(dp * 0.5) * 0.22;
      } else if (npc.isSeated && npc.panicTimer <= 0) {
        const seatDrop = -2.8;
        syncTransform3D(mesh, npc.x, npc.y, (npc.z || 0) + seatDrop, npc.angle);
        mesh.userData.leftLegPivot.rotation.z = 1.25;
        mesh.userData.rightLegPivot.rotation.z = 1.25;
        const chatWave = Math.sin((npc.idlePhase || 0) + time * 2.2) * 0.16;
        mesh.userData.leftArmPivot.rotation.z = 0.55 + chatWave;
        mesh.userData.rightArmPivot.rotation.z = 0.45 - chatWave;
        mesh.userData.headGroup.rotation.y = Math.sin((npc.idlePhase || 0) * 0.7 + time) * 0.18;
      } else if (npc.isVendor || npc.role === 'vip_companion') {
        const duckOffset = npc.duckTimer > 0 ? -3.8 : 0;
        syncTransform3D(mesh, npc.x, npc.y, (npc.z || 0) + duckOffset, npc.angle);
        mesh.userData.leftLegPivot.rotation.z = 0;
        mesh.userData.rightLegPivot.rotation.z = 0;
        const tend = Math.sin((npc.idlePhase || 0) + time * 2.5) * 0.22;
        mesh.userData.leftArmPivot.rotation.z = npc.duckTimer > 0 ? 1.1 : 0.35 + tend;
        mesh.userData.rightArmPivot.rotation.z = npc.duckTimer > 0 ? 1.1 : 0.45 - tend;
        mesh.userData.headGroup.rotation.y = Math.sin((npc.idlePhase || 0) + time * 1.1) * 0.22;
      } else {
        syncTransform3D(mesh, npc.x, npc.y, npc.z || 0, npc.angle);
        const swingAmp = npc.isJogger || npc.panicTimer > 0 ? 0.68 : 0.46;
        const swing = Math.sin(npc.walkPhase) * swingAmp;
        mesh.userData.leftLegPivot.rotation.z = swing;
        mesh.userData.rightLegPivot.rotation.z = -swing;
        mesh.userData.leftArmPivot.rotation.z = npc.panicTimer > 0 ? 2.4 : -swing * 0.55;
        mesh.userData.rightArmPivot.rotation.z = npc.hostile
          ? Math.PI * 0.42
          : npc.panicTimer > 0
            ? 2.2
            : swing * 0.55;
        mesh.userData.headGroup.rotation.y = 0;
      }
      mesh.userData.weaponGroup.visible = Boolean(npc.hasWeapon);
      mesh.userData.muzzleFlashMesh.visible = npc.muzzleTimer > 0;
    }
    for (const [id, mesh] of npcMeshes.entries()) {
      if (!activeNpcIds.has(id)) mesh.visible = false;
    }

    // Sync Airborne VCPD Helicopter & Soft Street Searchlight Pool
    const heli = wanted.helicopter;
    if (heli && heli.active) {
      helicopterMesh.visible = true;
      syncTransform3D(helicopterMesh, heli.x, heli.y, heli.z || 145, heli.angle);
      helicopterMesh.rotation.z = -0.14;
      helicopterMesh.userData.mainRotor.rotation.y = heli.rotorAngle;
      helicopterMesh.userData.tailRotor.rotation.z = heli.rotorAngle * 1.6;

      const beamForward = Math.tan(0.24) * (heli.z || 115) + 14;
      heliLightPool.visible = true;
      heliLightPool.position.set(
        heli.x + Math.cos(heli.angle) * beamForward,
        0.25,
        heli.y + Math.sin(heli.angle) * beamForward
      );
    } else {
      helicopterMesh.visible = false;
      heliLightPool.visible = false;
    }

    // Sync Grounded Mission Perimeter Ring & Floating Diamond
    const activeMission = missions.activeMission;
    if (activeMission) {
      missionBeaconGroup.visible = true;
      missionBeaconGroup.position.set(activeMission.targetX, 0, activeMission.targetY);
      beaconDiamond.rotation.y = time * 2.0;
      beaconDiamond.position.y = 26 + Math.sin(time * 3.0) * 2.5;
    } else {
      missionBeaconGroup.visible = false;
    }

    // Place subtle asphalt-flush GPS road chevrons ahead of the player
    for (const c of gpsChevrons) c.visible = false;
    if (missions.gpsPoints && missions.gpsPoints.length >= 2) {
      let cIdx = 0;
      for (let s = 0; s < missions.gpsPoints.length - 1 && cIdx < gpsChevrons.length; s++) {
        const pA = missions.gpsPoints[s];
        const pB = missions.gpsPoints[s + 1];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        if (segLen < 24) continue;
        const ang = Math.atan2(pB.y - pA.y, pB.x - pA.x);
        for (let d = 70; d < segLen && cIdx < gpsChevrons.length; d += 92) {
          const cx = pA.x + Math.cos(ang) * d;
          const cy = pA.y + Math.sin(ang) * d;
          if (Math.hypot(cx - player.x, cy - player.y) < 88) continue;
          const chev = gpsChevrons[cIdx++];
          chev.visible = true;
          chev.position.set(cx, 0.24, cy);
          chev.rotation.set(0, -ang - Math.PI * 0.5, 0);
        }
      }
    }

    // Sync 3D Projectiles
    for (let i = 0; i < projectilePool.length; i++) {
      const m = projectilePool[i];
      const p = projectiles[i];
      if (!p) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const ang = Math.atan2(p.vy, p.vx);
      syncTransform3D(m, p.x, p.y, p.z || 11, ang);
      m.material.color.set(p.color || '#e8c47a');
      const s = p.isRocket ? 1.65 : 1.0;
      m.scale.set(s, s, s);
    }

    // Sync Layered 3D Particles
    for (const sp of spriteParticlePool) sp.visible = false;
    for (const rm of ringParticlePool) rm.visible = false;
    let spIdx = 0;
    let rmIdx = 0;

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      const progress = 1 - Math.max(0, pt.life / (pt.maxLife || 0.5));

      if (pt.kind === 'shockwave') {
        if (rmIdx >= ringParticlePool.length) continue;
        const m = ringParticlePool[rmIdx++];
        m.visible = true;
        m.position.set(pt.x, pt.z || 1.2, pt.y);
        m.material.color.set(pt.color || '#d9823b');
        const rScale = pt.size * (0.28 + progress * 0.92);
        m.scale.set(rScale, rScale, rScale);
        m.material.opacity = (1 - progress) * 0.34;
        continue;
      }

      if (spIdx >= spriteParticlePool.length) continue;
      const sp = spriteParticlePool[spIdx++];
      sp.visible = true;
      sp.position.set(pt.x, pt.z || 3, pt.y);
      sp.material.color.set(pt.color || '#d8d4cc');

      if (pt.kind === 'fireball_core') {
        sp.material.map = lib.muzzleStarTex;
        const fScale = pt.size * (1.85 + progress * 0.7);
        sp.scale.set(fScale, fScale, 1);
        sp.material.opacity = (1 - progress * 0.82) * 0.88;
        sp.material.blending = THREE.NormalBlending;
        sp.renderOrder = 6;
      } else if (pt.kind === 'fireball') {
        sp.material.map = lib.softPuffTex;
        const fScale = pt.size * (2.2 + progress * 0.9);
        sp.scale.set(fScale, fScale, 1);
        sp.material.opacity = (1 - progress * 0.8) * 0.9;
        sp.material.blending = THREE.NormalBlending;
        sp.renderOrder = 5;
      } else if (pt.kind === 'smoke_heavy') {
        sp.material.map = lib.softPuffTex;
        const sScale = pt.size * (2.4 + progress * 1.1);
        sp.scale.set(sScale, sScale, 1);
        sp.material.opacity = (1 - progress * 0.65) * 0.72;
        sp.material.blending = THREE.NormalBlending;
        sp.renderOrder = 4;
      } else if (pt.kind === 'spark') {
        sp.material.map = lib.muzzleStarTex;
        const eScale = pt.size * 2.2;
        sp.scale.set(eScale, eScale, 1);
        sp.material.opacity = (1 - progress) * 0.92;
        sp.material.blending = THREE.AdditiveBlending;
        sp.renderOrder = 7;
      } else {
        sp.material.map = lib.softPuffTex;
        const sScale = pt.size * (2.6 + progress * 1.4);
        sp.scale.set(sScale, sScale, 1);
        sp.material.opacity = (1 - progress) * 0.28;
        sp.material.blending = THREE.NormalBlending;
        sp.renderOrder = 3;
      }
    }

    // Sync 3D Pickups
    for (let i = 0; i < pickupPool.length; i++) {
      const m = pickupPool[i];
      const pk = pickups[i];
      if (!pk) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(pk.x, 4.5 + Math.sin(pk.phase || 0) * 1.4, pk.y);
      m.rotation.y = (pk.phase || 0) * 1.2;
    }

    // Update 3D Chase Camera, Smart Indoor Shop Camera, Nightlife Camera, or Showcase Pose
    const activePose = state.camera.overridePose || state.camera.nightlifePose;
    if (activePose) {
      const pose = activePose;
      camera.position.set(pose.eye[0], pose.eye[1], pose.eye[2]);
      camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
      camera.fov = pose.fov || 58;
      camera.updateProjectionMatrix();

      shadowFocus.set(
        pose.eye[0] + (pose.look[0] - pose.eye[0]) * 0.52,
        0,
        pose.eye[2] + (pose.look[2] - pose.eye[2]) * 0.52
      );
      state.camera.indoorMode = state.camera.nightlifePose ? 'nightlife' : 'showcase';
    } else {
      const heading = player.vehicle ? player.vehicle.angle : player.angle;
      const spd = player.vehicle ? player.vehicle.speed : 0;
      const insideShop = getActiveWalkInShopAt(player.x, player.y, cityMap.shops);
      const inClub = isInsideClubEclipse(player.x, player.y);

      let distBack = player.vehicle ? 116 + Math.min(28, spd * 0.065) : 88;
      let camHeight = player.vehicle ? 46 + Math.min(12, spd * 0.03) : 38;
      let lookAhead = 62;
      let lookHeight = player.vehicle ? 18 : 15;

      if (insideShop) {
        const ib = insideShop.interior;
        distBack = player.vehicle ? 42 : 28;
        camHeight = player.vehicle
          ? Math.min(ib.ceilingH - 8, 20)
          : Math.min(ib.ceilingH - 9, 17.5);
        lookAhead = 22;
        lookHeight = 11.5;
        state.camera.indoorMode = 'shop';
      } else if (inClub) {
        distBack = 58;
        camHeight = 26;
        lookAhead = 40;
        lookHeight = 13;
        state.camera.indoorMode = 'club';
      } else {
        state.camera.indoorMode = 'outdoor';
      }

      const desiredEye = new THREE.Vector3(
        player.x - Math.cos(heading) * distBack,
        camHeight,
        player.y - Math.sin(heading) * distBack
      );
      if (insideShop && insideShop.interior) {
        const ib = insideShop.interior;
        desiredEye.z = Math.max(ib.y1 + 5, Math.min(ib.y2 - 5, desiredEye.z));
      }

      const desiredLook = new THREE.Vector3(
        player.x + Math.cos(heading) * lookAhead,
        lookHeight,
        player.y + Math.sin(heading) * lookAhead
      );

      if (!camInitialized) {
        camPos.copy(desiredEye);
        camLook.copy(desiredLook);
        camInitialized = true;
      } else {
        const alpha = 1 - Math.exp(-9.5 * dt);
        camPos.lerp(desiredEye, alpha);
        camLook.lerp(desiredLook, alpha);
      }

      state.camera.trauma = Math.max(0, state.camera.trauma - 1.4 * dt);
      const shake = state.camera.trauma * state.camera.trauma * 4.5;
      const sx = (Math.random() - 0.5) * shake;
      const sy = (Math.random() - 0.5) * shake;

      camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z + sx);
      camera.lookAt(camLook.x, camLook.y, camLook.z);

      const targetFov = 58 + Math.min(11, (spd / 420) * 11);
      camera.fov += (targetFov - camera.fov) * Math.min(1, 6 * dt);
      camera.updateProjectionMatrix();

      shadowFocus.set(
        player.x + Math.cos(heading) * 38,
        0,
        player.y + Math.sin(heading) * 38
      );
    }

    // Center Sky Dome on Camera & Align High-Density Sun Shadow Frustum with Exact SUN_DIR
    skyDome.position.copy(camera.position);
    const texelSize = (shadowHalf * 2) / 2048;
    const snappedX = Math.round(shadowFocus.x / texelSize) * texelSize;
    const snappedZ = Math.round(shadowFocus.z / texelSize) * texelSize;
    sunLight.target.position.set(snappedX, 0, snappedZ);
    sunLight.position.set(
      snappedX + SUN_DIR.x * 340,
      SUN_DIR.y * 340,
      snappedZ + SUN_DIR.z * 340
    );
    sunLight.target.updateMatrixWorld();

    // Render WebGL 2.0 3D frame
    renderer.render(scene, camera);

    // Project 3D world waypoints, nearby vehicles, interactive shops & nightlife targets
    const nearestCar = findNearestHijackableVehicle(player, vehicles, 85);
    const nearestShop = findNearestShop(state);
    state.projectedMarkers = {
      missionTarget: activeMission
        ? projectWorldToScreen(activeMission.targetX, 30, activeMission.targetY)
        : null,
      hijackTarget: nearestCar
        ? {
            car: nearestCar,
            screen: projectWorldToScreen(nearestCar.x, nearestCar.height + 11, nearestCar.y)
          }
        : null,
      shopTarget: nearestShop
        ? {
            shop: nearestShop,
            screen: projectWorldToScreen(
              nearestShop.x,
              (nearestShop.z || 0) + (nearestShop.variant === 'cart' ? 19.5 : 23),
              nearestShop.y
            )
          }
        : null,
      vipTarget:
        state.nightlife && state.nightlife.nearVipLounge
          ? {
              screen: projectWorldToScreen(CLUB_ECLIPSE_BOUNDS.vipX, 20, CLUB_ECLIPSE_BOUNDS.vipY)
            }
          : null,
      companionTarget:
        state.nightlife && state.nightlife.nearCompanion
          ? {
              npc: state.nightlife.nearCompanion,
              screen: projectWorldToScreen(
                state.nightlife.nearCompanion.x,
                21,
                state.nightlife.nearCompanion.y
              )
            }
          : null,
      convoyBoss:
        missions.targetEntity && !missions.targetEntity.destroyed
          ? {
              entity: missions.targetEntity,
              screen: projectWorldToScreen(
                missions.targetEntity.x,
                missions.targetEntity.height + 16,
                missions.targetEntity.y
              )
            }
          : null
    };

      if (typeof window !== 'undefined') {
        window.__SOLARIS_SCENE = scene;
        window.__SOLARIS_DIAGNOSTICS = {
          engine: 'Three.js r183 WebGL 2.0',
          webgl2: renderer.capabilities.isWebGL2,
          toneMapping: renderer.toneMapping,
          exposure: renderer.toneMappingExposure,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          shadowMap: renderer.shadowMap.enabled
        };
      }
    }

    return {
      renderer,
      scene,
      camera,
      lib,
      render
    };
  }
