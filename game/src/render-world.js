import * as THREE from 'three';
import { ROAD_WIDTH, COAST_X, BEACH_WIDTH, WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { createMaterialLibrary } from './materials-textures.js';
import {
  syncTransform3D,
  buildVehicleModel3D,
  buildCharacterModel3D,
  buildSkyscraperModel3D,
  buildPalmTreeModel3D,
  buildHelicopterModel3D,
  buildLuxuryYachtModel3D
} from './model-factories.js';
import { findNearestHijackableVehicle } from './vehicles.js';

/**
 * Custom GLSL Sunset Sky Dome Shader (shader-cookbook.md pattern):
 * Deep violet twilight zenith -> electric Vice magenta -> golden-orange horizon
 * with a glowing volumetric sunset sun disc and horizon haze.
 */
function createSunsetSkyDome() {
  const skyGeo = new THREE.SphereGeometry(4200, 36, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x120624) },
      uMidColor: { value: new THREE.Color(0xd92672) },
      uHorizonColor: { value: new THREE.Color(0xff9238) },
      uSunColor: { value: new THREE.Color(0xfff4c2) },
      uSunDir: { value: new THREE.Vector3(0.62, 0.16, -0.76).normalize() }
    },
    vertexShader: `
      varying vec3 vWorldOffset;
      void main() {
        vWorldOffset = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      varying vec3 vWorldOffset;
      void main() {
        vec3 dir = normalize(vWorldOffset);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, h));
        col = mix(col, uTopColor, smoothstep(0.20, 0.72, h));

        // Sunset glow & solar disc
        float sunAmt = max(dot(dir, uSunDir), 0.0);
        col += uHorizonColor * pow(sunAmt, 6.0) * 0.45;
        col += uSunColor * pow(sunAmt, 42.0) * 0.95;
        col += vec3(1.0, 0.98, 0.9) * smoothstep(0.9965, 0.9992, sunAmt) * 2.2;

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const lib = createMaterialLibrary(renderer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0b28);
  scene.environment = lib.envMap;
  scene.fog = new THREE.FogExp2(0x231130, 0.00038);

  const camera = new THREE.PerspectiveCamera(58, 1280 / 720, 1.5, 5000);

  // 1. Custom GLSL Sunset Sky Dome
  const skyDome = createSunsetSkyDome();
  scene.add(skyDome);

  // 2. Golden-Hour Directional Sun Light (2048x2048 PCFSoftShadowMap) + Hemisphere Fill
  const hemiLight = new THREE.HemisphereLight(0xff9e80, 0x1e1b4b, 1.38);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff1d6, 3.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 25;
  sunLight.shadow.camera.far = 950;
  const shadowHalf = 270;
  sunLight.shadow.camera.left = -shadowHalf;
  sunLight.shadow.camera.right = shadowHalf;
  sunLight.shadow.camera.top = shadowHalf;
  sunLight.shadow.camera.bottom = -shadowHalf;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // 3. Build Static 3D City Geometry (Ground, Roads, Intersections, Beach, Ocean, Buildings, Palms, Yachts)
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const { cityMap } = state;

  // Base urban sidewalk ground slab
  const groundGeo = new THREE.PlaneGeometry(COAST_X + 60, WORLD_HEIGHT + 400);
  groundGeo.rotateX(-Math.PI * 0.5);
  const groundMesh = new THREE.Mesh(groundGeo, lib.sidewalkMaterial);
  groundMesh.position.set((COAST_X + 60) * 0.5, -0.2, WORLD_HEIGHT * 0.5);
  groundMesh.receiveShadow = true;
  cityGroup.add(groundMesh);

  // Golden Solaris Sandy Beach strip
  const beachGeo = new THREE.PlaneGeometry(BEACH_WIDTH + 60, WORLD_HEIGHT + 400);
  beachGeo.rotateX(-Math.PI * 0.5);
  const beachMesh = new THREE.Mesh(beachGeo, lib.sandMaterial);
  beachMesh.position.set(COAST_X + BEACH_WIDTH * 0.5, -0.1, WORLD_HEIGHT * 0.5);
  beachMesh.receiveShadow = true;
  cityGroup.add(beachMesh);

  // Wooden Coastal Boardwalk Promenade along Ocean Drive
  const boardwalkGeo = new THREE.BoxGeometry(28, 0.7, WORLD_HEIGHT);
  const boardwalkMesh = new THREE.Mesh(boardwalkGeo, lib.boardwalkMaterial);
  boardwalkMesh.position.set(COAST_X - 18, 0.25, WORLD_HEIGHT * 0.5);
  boardwalkMesh.receiveShadow = true;
  cityGroup.add(boardwalkMesh);

  // Specular 3D Ocean Surface
  const oceanGeo = new THREE.PlaneGeometry(1400, WORLD_HEIGHT + 800);
  oceanGeo.rotateX(-Math.PI * 0.5);
  const oceanMesh = new THREE.Mesh(oceanGeo, lib.oceanMaterial);
  oceanMesh.position.set(COAST_X + BEACH_WIDTH + 660, -0.35, WORLD_HEIGHT * 0.5);
  oceanMesh.receiveShadow = true;
  cityGroup.add(oceanMesh);

  // Starfish Bay Marina Wooden Superyacht Piers
  for (const pierY of [690, 920, 1620, 2140]) {
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

  // Multi-Tiered 3D Skyscrapers, Art-Deco Hotels, Casinos & Neon Marquees
  for (const b of cityMap.buildings) {
    const bModel = buildSkyscraperModel3D(b, lib);
    cityGroup.add(bModel);
  }

  // Curved 7-Segment 3D Palm Trees
  for (const tree of cityMap.palmTrees) {
    const pModel = buildPalmTreeModel3D(tree, lib);
    cityGroup.add(pModel);
  }

  // 3D Avenue Streetlight Poles & Glowing Luminaires
  const poleGeo = new THREE.CylinderGeometry(0.45, 0.65, 22, 6);
  const armGeo = new THREE.BoxGeometry(6.5, 0.5, 0.5);
  const bulbGeo = new THREE.BoxGeometry(2.4, 0.8, 1.4);
  for (const sl of cityMap.streetlights) {
    const slGroup = new THREE.Group();
    slGroup.position.set(sl.x, 0, sl.y);

    const pole = new THREE.Mesh(poleGeo, lib.darkMetalMaterial);
    pole.position.y = 11;
    slGroup.add(pole);

    const arm = new THREE.Mesh(armGeo, lib.darkMetalMaterial);
    arm.position.set(3, 21.8, 0);
    slGroup.add(arm);

    const bulb = new THREE.Mesh(
      bulbGeo,
      sl.color === '#ff2a85' ? lib.neonPinkMaterial : lib.neonGoldMaterial
    );
    bulb.position.set(5.4, 21.4, 0);
    slGroup.add(bulb);

    cityGroup.add(slGroup);
  }

  // 3D Luxury Superyachts
  const yachtModels = [];
  for (const yacht of cityMap.yachts) {
    const yModel = buildLuxuryYachtModel3D(yacht, lib);
    cityGroup.add(yModel);
    yachtModels.push({ data: yacht, mesh: yModel });
  }

  // 4. 3D Glowing Mission Target Beacon Cylinder + Diamond + 3D GPS Road Chevrons
  const missionBeaconGroup = new THREE.Group();
  const beaconCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(24, 24, 140, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  beaconCylinder.position.y = 70;
  missionBeaconGroup.add(beaconCylinder);

  const beaconDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(10, 0),
    lib.neonCyanMaterial
  );
  beaconDiamond.position.y = 28;
  missionBeaconGroup.add(beaconDiamond);
  scene.add(missionBeaconGroup);

  // Pool of 3D Glowing GPS Chevrons on the road surface
  const gpsChevrons = [];
  const chevronGeo = new THREE.ConeGeometry(5.5, 13, 4);
  chevronGeo.rotateX(Math.PI * 0.5);
  const chevronMat = new THREE.MeshBasicMaterial({
    color: 0xff2a85,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(chevronGeo, chevronMat);
    m.visible = false;
    scene.add(m);
    gpsChevrons.push(m);
  }

  // 5. Dynamic Entity Mesh Caches (Vehicles, Characters, Player, Chopper, Projectiles, Pickups, Particles)
  const vehicleMeshes = new Map();
  const npcMeshes = new Map();

  const playerMesh = buildCharacterModel3D(
    {
      jacketColor: '#ff1e74',
      shirtColor: '#00f0ff',
      pantsColor: '#0f172a',
      skinColor: '#eab396',
      hairColor: '#111827'
    },
    lib
  );
  scene.add(playerMesh);

  const helicopterMesh = buildHelicopterModel3D(lib);
  helicopterMesh.visible = false;
  scene.add(helicopterMesh);

  // Projectile pool
  const projectileGroup = new THREE.Group();
  scene.add(projectileGroup);
  const projectilePool = [];
  const tracerGeo = new THREE.BoxGeometry(11, 1.1, 1.1);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(
      tracerGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        blending: THREE.AdditiveBlending
      })
    );
    m.visible = false;
    projectileGroup.add(m);
    projectilePool.push(m);
  }

  // Particle pool (fireballs, shockwaves, drift smoke, sparks)
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);
  const particlePool = [];
  const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
  const ringGeo = new THREE.RingGeometry(0.75, 1.0, 24);
  ringGeo.rotateX(-Math.PI * 0.5);
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    );
    m.visible = false;
    particleGroup.add(m);
    particlePool.push(m);
  }

  // Pickup pool
  const pickupPool = [];
  const pickupGeo = new THREE.OctahedronGeometry(4.5, 0);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(pickupGeo, lib.neonGoldMaterial);
    m.visible = false;
    scene.add(m);
    pickupPool.push(m);
  }

  const camPos = new THREE.Vector3(2720, 56, 2240);
  const camLook = new THREE.Vector3(2720, 18, 2080);
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

    // Animate ocean wave UVs & superyacht bobbing
    lib.oceanTex.offset.x = (time * 0.03) % 1;
    lib.oceanTex.offset.y = (time * 0.018) % 1;
    for (const ym of yachtModels) {
      ym.mesh.position.y = 1.4 + Math.sin(time * 1.8 + ym.data.x) * 0.55;
    }

    // Sync 3D Vehicles
    for (const v of vehicles) {
      let mesh = vehicleMeshes.get(v.id);
      if (!mesh) {
        mesh = buildVehicleModel3D(v, lib);
        mesh.userData.lastColor = v.color;
        scene.add(mesh);
        vehicleMeshes.set(v.id, mesh);
      }

      // If vehicle was resprayed or destroyed, update chassis paint material
      if (mesh.userData.lastColor !== v.color) {
        mesh.userData.lastColor = v.color;
        const newPaint = lib.getCarPaintMaterial(v.color);
        mesh.userData.bodyGroup.children[0].material = newPaint;
      }

      syncTransform3D(mesh, v.x, v.y, v.z || 0, v.angle);

      // Pitch/roll suspension lean during acceleration and cornering
      const bodyGroup = mesh.userData.bodyGroup;
      bodyGroup.rotation.x = v.drifting ? v.steerAngle * 0.14 : v.steerAngle * 0.06;
      bodyGroup.rotation.z = v.nitroActive ? 0.035 : 0;

      // Wheel steering & rotation
      for (const w of mesh.userData.wheels) {
        if (w.isFront) {
          w.steerPivot.rotation.y = -v.steerAngle;
        }
        w.spinGroup.rotation.z = -v.wheelSpin;
      }

      // Nitro flame cones
      if (mesh.userData.nitroGroup) {
        mesh.userData.nitroGroup.visible = Boolean(v.nitroActive && !v.destroyed);
        if (v.nitroActive) {
          const pulse = 0.9 + Math.sin(time * 45) * 0.18;
          mesh.userData.nitroGroup.scale.set(pulse, 1, 1);
        }
      }

      // Police alternating Red / Blue strobe lightbar & street PointLight
      if (v.isPolice && mesh.userData.sirenLight) {
        const isRedHalf = Math.sin(v.sirenPhase) >= 0;
        mesh.userData.sirenLight.color.setHex(isRedHalf ? 0xff0033 : 0x00b4ff);
        mesh.userData.sirenLight.intensity = wanted.stars > 0 ? 24 : 8;
      }
    }

    // Sync 3D Player Character (visible when on foot)
    if (player.vehicle) {
      playerMesh.visible = false;
    } else {
      playerMesh.visible = true;
      syncTransform3D(playerMesh, player.x, player.y, 0, player.angle);
      const swing = Math.sin(player.walkPhase) * 0.55;
      playerMesh.userData.leftLegPivot.rotation.z = swing;
      playerMesh.userData.rightLegPivot.rotation.z = -swing;
      playerMesh.userData.leftArmPivot.rotation.z = -swing * 0.6;
      // Right arm raised forward in combat aim pose
      playerMesh.userData.rightArmPivot.rotation.z = Math.PI * 0.44;
      playerMesh.userData.muzzleFlashMesh.visible = player.muzzleTimer > 0;
      if (player.muzzleTimer > 0) {
        playerMesh.userData.muzzleFlashMesh.rotation.x += 0.7;
      }
    }

    // Sync 3D Pedestrians, Syndicate Guards & Police Officers
    for (const npc of pedestrians) {
      let mesh = npcMeshes.get(npc.id);
      if (!mesh) {
        mesh = buildCharacterModel3D(npc, lib);
        scene.add(mesh);
        npcMeshes.set(npc.id, mesh);
      }
      if (npc.dead) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      syncTransform3D(mesh, npc.x, npc.y, 0, npc.angle);
      const swing = Math.sin(npc.walkPhase) * 0.48;
      mesh.userData.leftLegPivot.rotation.z = swing;
      mesh.userData.rightLegPivot.rotation.z = -swing;
      mesh.userData.leftArmPivot.rotation.z = -swing * 0.5;
      mesh.userData.rightArmPivot.rotation.z = npc.hostile ? Math.PI * 0.42 : swing * 0.5;
      mesh.userData.weaponGroup.visible = Boolean(npc.hasWeapon);
      mesh.userData.muzzleFlashMesh.visible = npc.muzzleTimer > 0;
    }

    // Sync 3D VCPD Police Helicopter & Volumetric Searchlight Cone
    const heli = wanted.helicopter;
    if (heli && heli.active) {
      helicopterMesh.visible = true;
      syncTransform3D(helicopterMesh, heli.x, heli.y, heli.z || 145, heli.angle);
      helicopterMesh.rotation.z = -0.14; // Forward pursuit pitch
      helicopterMesh.userData.mainRotor.rotation.y = heli.rotorAngle;
      helicopterMesh.userData.tailRotor.rotation.z = heli.rotorAngle * 1.6;
    } else {
      helicopterMesh.visible = false;
    }

    // Sync 3D Mission Target Beacon & 3D GPS Road Chevrons
    const activeMission = missions.activeMission;
    if (activeMission) {
      missionBeaconGroup.visible = true;
      missionBeaconGroup.position.set(activeMission.targetX, 0, activeMission.targetY);
      beaconDiamond.rotation.y = time * 2.4;
      beaconDiamond.position.y = 24 + Math.sin(time * 3.5) * 4;
    } else {
      missionBeaconGroup.visible = false;
    }

    // Place 3D glowing GPS chevrons along route segments
    for (const c of gpsChevrons) c.visible = false;
    if (missions.gpsPoints && missions.gpsPoints.length >= 2) {
      let cIdx = 0;
      for (let s = 0; s < missions.gpsPoints.length - 1 && cIdx < gpsChevrons.length; s++) {
        const pA = missions.gpsPoints[s];
        const pB = missions.gpsPoints[s + 1];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        if (segLen < 20) continue;
        const ang = Math.atan2(pB.y - pA.y, pB.x - pA.x);
        for (let d = 55; d < segLen && cIdx < gpsChevrons.length; d += 85) {
          const chev = gpsChevrons[cIdx++];
          chev.visible = true;
          const cx = pA.x + Math.cos(ang) * d;
          const cy = pA.y + Math.sin(ang) * d;
          chev.position.set(cx, 1.8, cy);
          chev.rotation.set(Math.PI * 0.5, -ang - Math.PI * 0.5, 0);
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
      m.material.color.set(p.color || '#00f0ff');
      const s = p.isRocket ? 1.8 : 1.0;
      m.scale.set(s, s, s);
    }

    // Sync 3D Particles (Fireballs, Shockwaves, Drift Smoke, Sparks)
    for (let i = 0; i < particlePool.length; i++) {
      const m = particlePool[i];
      const pt = particles[i];
      if (!pt) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const progress = 1 - Math.max(0, pt.life / (pt.maxLife || 0.5));
      m.position.set(pt.x, pt.z || 3, pt.y);
      m.material.color.set(pt.color || '#ffffff');

      if (pt.kind === 'shockwave') {
        m.geometry = ringGeo;
        const rScale = pt.size * (0.25 + progress * 1.15);
        m.scale.set(rScale, rScale, rScale);
        m.material.opacity = (1 - progress) * 0.85;
        m.material.blending = THREE.AdditiveBlending;
      } else if (pt.kind === 'fireball') {
        m.geometry = sphereGeo;
        const fScale = pt.size * (0.45 + progress * 0.85);
        m.scale.set(fScale, fScale, fScale);
        m.material.opacity = (1 - progress * 0.85) * 0.92;
        m.material.blending = THREE.AdditiveBlending;
      } else {
        m.geometry = sphereGeo;
        const sScale = pt.size * (1 + (pt.kind === 'smoke' ? progress * 1.15 : 0));
        m.scale.set(sScale, sScale, sScale);
        m.material.opacity = (1 - progress) * (pt.kind === 'smoke' ? 0.32 : 0.95);
        m.material.blending =
          pt.kind === 'spark' ? THREE.AdditiveBlending : THREE.NormalBlending;
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
      m.position.set(pk.x, 4.5 + Math.sin(pk.phase || 0) * 1.5, pk.y);
      m.rotation.y = (pk.phase || 0) * 1.2;
    }

    // Update 3D Chase Camera or Showcase Camera Pose
    if (state.camera.overridePose) {
      const pose = state.camera.overridePose;
      camera.position.set(pose.eye[0], pose.eye[1], pose.eye[2]);
      camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
      camera.fov = pose.fov || 58;
      camera.updateProjectionMatrix();
    } else {
      const heading = player.vehicle ? player.vehicle.angle : player.angle;
      const spd = player.vehicle ? player.vehicle.speed : 0;
      const distBack = player.vehicle ? 116 + Math.min(28, spd * 0.065) : 88;
      const camHeight = player.vehicle ? 46 + Math.min(12, spd * 0.03) : 38;

      const desiredEye = new THREE.Vector3(
        player.x - Math.cos(heading) * distBack,
        camHeight,
        player.y - Math.sin(heading) * distBack
      );
      const desiredLook = new THREE.Vector3(
        player.x + Math.cos(heading) * 62,
        player.vehicle ? 18 : 15,
        player.y + Math.sin(heading) * 62
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

      // Trauma-squared camera shake
      state.camera.trauma = Math.max(0, state.camera.trauma - 1.4 * dt);
      const shake = state.camera.trauma * state.camera.trauma * 4.5;
      const sx = (Math.random() - 0.5) * shake;
      const sy = (Math.random() - 0.5) * shake;

      camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z + sx);
      camera.lookAt(camLook.x, camLook.y, camLook.z);

      const targetFov = 58 + Math.min(11, (spd / 420) * 11);
      camera.fov += (targetFov - camera.fov) * Math.min(1, 6 * dt);
      camera.updateProjectionMatrix();
    }

    // Center Sky Dome & Directional Sun Shadow Frustum on Player
    skyDome.position.copy(camera.position);
    sunLight.position.set(player.x + 210, 250, player.y - 240);
    sunLight.target.position.set(player.x, 0, player.y);
    sunLight.target.updateMatrixWorld();

    // Render WebGL 2.0 3D frame
    renderer.render(scene, camera);

    // Project 3D world waypoints to 2D screen coordinates for the diegetic HUD
    const nearestCar = findNearestHijackableVehicle(player, vehicles, 85);
    state.projectedMarkers = {
      missionTarget: activeMission
        ? projectWorldToScreen(activeMission.targetX, 26, activeMission.targetY)
        : null,
      hijackTarget: nearestCar
        ? {
            car: nearestCar,
            screen: projectWorldToScreen(nearestCar.x, nearestCar.height + 10, nearestCar.y)
          }
        : null,
      convoyBoss:
        missions.targetEntity && !missions.targetEntity.destroyed
          ? {
              entity: missions.targetEntity,
              screen: projectWorldToScreen(
                missions.targetEntity.x,
                missions.targetEntity.height + 14,
                missions.targetEntity.y
              )
            }
          : null
    };

    // Expose live WebGL 2.0 diagnostics for automated audit verification
    if (typeof window !== 'undefined') {
      window.__SOLARIS_DIAGNOSTICS = {
        engine: 'Three.js r183 WebGL 2.0',
        webgl2: renderer.capabilities.isWebGL2,
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
