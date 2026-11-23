import * as THREE from 'three';

/**
 * Maps 2D ground coordinates (wx, wy) + elevation wz + heading yawAngle
 * to Three.js world space (x = wx, y = wz, z = wy) with local +X pointing along yawAngle.
 */
export function syncTransform3D(obj3d, wx, wy, wz = 0, yawAngle = 0) {
  obj3d.position.set(wx, wz, wy);
  obj3d.rotation.y = -yawAngle;
}

/**
 * Shared helper to attach a soft radial AO contact shadow decal directly beneath an entity.
 */
function createContactShadowMesh(widthX, depthZ, yPos, lib, opacity = 0.56) {
  const geo = new THREE.PlaneGeometry(widthX, depthZ);
  geo.rotateX(-Math.PI * 0.5);
  const mat = lib.contactShadowMaterial.clone();
  mat.opacity = opacity;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = yPos;
  mesh.renderOrder = 1;
  return mesh;
}

/**
 * Builds an authored multi-part 3D vehicle model with an extruded aerodynamic
 * clearcoat chassis, subtle racing stripe, tapered tinted glass canopy, side wing mirrors,
 * rear spoiler, 4 properly recessed articulated 5-spoke alloy wheels, grounded AO contact shadow,
 * recessed LED headlights/taillights, nitro exhaust flames, and police lightbars.
 */
export function buildVehicleModel3D(veh, lib) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const L = veh.length || 50;
  const W = veh.width || 24;
  const H = veh.height || 14;
  const halfL = L * 0.5;
  const halfW = W * 0.5;

  // Grounded AO contact shadow directly beneath the vehicle chassis
  const aoShadow = createContactShadowMesh(L * 1.18, W * 1.36, 0.21, lib, 0.58);
  root.add(aoShadow);

  const paintMat = lib.getCarPaintMaterial(veh.color || '#a6283b');
  const stripeMat = lib.getCarPaintMaterial(veh.stripeColor || '#cfc5b4');

  // 1. Sculpted side-profile lower body using ExtrudeGeometry
  const shape = new THREE.Shape();
  if (veh.isHeavy) {
    shape.moveTo(-halfL, 2.2);
    shape.lineTo(halfL - 2, 2.2);
    shape.lineTo(halfL, 4.5);
    shape.lineTo(halfL - 1.5, H * 0.62);
    shape.lineTo(halfL - 8, H * 0.96);
    shape.lineTo(-halfL + 3, H * 0.96);
    shape.lineTo(-halfL, H * 0.72);
    shape.closePath();
  } else {
    shape.moveTo(-halfL + 1.5, 2.4);
    shape.lineTo(halfL - 1.0, 2.0);
    shape.lineTo(halfL + 0.6, 3.8);
    shape.lineTo(halfL - 2.2, H * 0.44);
    shape.lineTo(halfL * 0.36, H * 0.54);
    shape.lineTo(-halfL * 0.28, H * 0.56);
    shape.lineTo(-halfL + 2.0, H * 0.58);
    shape.lineTo(-halfL, 4.2);
    shape.closePath();
  }

  const bevelSize = 0.95;
  const extrudeDepth = Math.max(4, W - bevelSize * 2.2);
  const chassisGeo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness: 1.05
  });
  chassisGeo.translate(0, 0, -extrudeDepth * 0.5);

  const chassisMesh = new THREE.Mesh(chassisGeo, paintMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  bodyGroup.add(chassisMesh);
  const paintMeshes = [chassisMesh];

  // 2. Refined Racing Stripe / Two-Tone Trim along hood & decklid (omitted on classic yellow taxis)
  if (!veh.isTaxi && !veh.isCommercialVan) {
    const stripeGeo = new THREE.BoxGeometry(L * 0.92, 0.32, W * 0.18);
    const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
    stripeMesh.position.set(0, veh.isHeavy ? H * 0.98 : H * 0.55, 0);
    stripeMesh.castShadow = true;
    stripeMesh.receiveShadow = true;
    bodyGroup.add(stripeMesh);
  }

  // Police white side door panels for classic VCPD cruiser silhouette
  if (veh.isPolice && !veh.isHeavy) {
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.42, H * 0.32, W + 0.25),
      stripeMat
    );
    doorPanel.position.set(-L * 0.02, H * 0.35, 0);
    doorPanel.receiveShadow = true;
    bodyGroup.add(doorPanel);
  }

  // Solaris City Cab checkered side trim & warm glowing TAXI roof sign
  if (veh.isTaxi) {
    const checkerBand = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.72, 1.55, W + 0.28),
      lib.taxiCheckerMaterial
    );
    checkerBand.position.set(-L * 0.02, H * 0.34, 0);
    bodyGroup.add(checkerBand);

    const taxiSignBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.75, 9.6),
      lib.darkMetalMaterial
    );
    taxiSignBase.position.set(-L * 0.05, H + 0.35, 0);
    bodyGroup.add(taxiSignBase);

    const taxiSignLamp = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.2, 8.6),
      lib.taxiSignMaterial
    );
    taxiSignLamp.position.set(-L * 0.05, H + 1.65, 0);
    taxiSignLamp.castShadow = true;
    bodyGroup.add(taxiSignLamp);
  }

  // Solaris Fresh Commercial Delivery Van livery side panels
  if (veh.isCommercialVan) {
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(L * 0.66, H * 0.48),
        lib.vanLiveryMaterial
      );
      panel.position.set(-L * 0.08, H * 0.58, side * (halfW + 0.14));
      if (side < 0) panel.rotation.y = Math.PI;
      bodyGroup.add(panel);
    }
  }

  // 3. Carbon Front Splitter, Front Intake Grille & Rear Diffuser
  const splitterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.85, W * 0.96),
    lib.darkMetalMaterial
  );
  splitterMesh.position.set(halfL - 1.2, 1.9, 0);
  bodyGroup.add(splitterMesh);

  const grilleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.0, W * 0.46),
    lib.darkMetalMaterial
  );
  grilleMesh.position.set(halfL + 0.2, H * 0.27, 0);
  bodyGroup.add(grilleMesh);

  const diffuserMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.4, W * 0.88),
    lib.darkMetalMaterial
  );
  diffuserMesh.position.set(-halfL + 1.4, 2.4, 0);
  bodyGroup.add(diffuserMesh);

  // Dual Brushed Alloy Exhaust Tips
  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2.6, 10),
      lib.chromeMaterial
    );
    exhaust.rotation.z = Math.PI * 0.5;
    exhaust.position.set(-halfL - 0.3, 2.5, side * (halfW * 0.45));
    bodyGroup.add(exhaust);
  }

  // 4. Tapered Tinted Glass Cabin Canopy or Convertible Open Cockpit
  if (!veh.isHeavy) {
    if (veh.isConvertible) {
      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, H * 0.42, W * 0.78),
        lib.glassCanopyMaterial
      );
      windshield.position.set(L * 0.14, H * 0.72, 0);
      windshield.rotation.z = 0.48;
      windshield.castShadow = true;
      bodyGroup.add(windshield);

      for (const s of [-1, 1]) {
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, 4.6, 5.0),
          lib.darkMetalMaterial
        );
        seat.position.set(-L * 0.04, H * 0.62, s * (W * 0.2));
        bodyGroup.add(seat);
      }
    } else {
      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-L * 0.32, H * 0.52);
      cabinShape.lineTo(L * 0.24, H * 0.51);
      cabinShape.lineTo(L * 0.08, H * 0.98);
      cabinShape.lineTo(-L * 0.22, H * 0.96);
      cabinShape.closePath();

      const cabinDepth = W * 0.72;
      const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
        depth: cabinDepth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.6,
        bevelThickness: 0.7
      });
      cabinGeo.translate(0, 0, -cabinDepth * 0.5);
      const cabinMesh = new THREE.Mesh(cabinGeo, lib.glassCanopyMaterial);
      cabinMesh.castShadow = true;
      cabinMesh.receiveShadow = true;
      bodyGroup.add(cabinMesh);

      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.28, 0.55, W * 0.68),
        veh.isPolice ? stripeMat : paintMat
      );
      roofCap.position.set(-L * 0.07, H * 0.99, 0);
      roofCap.castShadow = true;
      roofCap.receiveShadow = true;
      bodyGroup.add(roofCap);
      if (!veh.isPolice) paintMeshes.push(roofCap);
    }
  } else {
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, H * 0.26, W * 0.82),
      lib.glassCanopyMaterial
    );
    visor.position.set(halfL - 4.2, H * 0.74, 0);
    bodyGroup.add(visor);
  }

  // 5. Sculpted Side Wing Mirrors
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 2.1), paintMat);
    mirror.position.set(L * 0.16, H * 0.58, side * (halfW + 0.65));
    mirror.castShadow = true;
    bodyGroup.add(mirror);
    paintMeshes.push(mirror);
  }

  // 6. Rear Aerodynamic Spoiler Wing on Twin Struts
  if (veh.hasSpoiler) {
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 3.0, 0.75),
        lib.darkMetalMaterial
      );
      strut.position.set(-halfL + 3.2, H * 0.68, side * (W * 0.28));
      bodyGroup.add(strut);
    }
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.65, W * 0.92),
      paintMat
    );
    wing.position.set(-halfL + 2.8, H * 0.84, 0);
    wing.rotation.z = -0.1;
    wing.castShadow = true;
    bodyGroup.add(wing);
    paintMeshes.push(wing);
  }

  // 7. Recessed Headlight Housings & Rear LED Taillight Bar
  for (const side of [-1, 1]) {
    const headlightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.45, 4.9),
      lib.darkMetalMaterial
    );
    headlightFrame.position.set(halfL - 0.15, H * 0.34, side * (halfW * 0.58));
    bodyGroup.add(headlightFrame);

    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.95, 4.1),
      lib.headlightMaterial
    );
    headlight.position.set(halfL + 0.05, H * 0.34, side * (halfW * 0.58));
    bodyGroup.add(headlight);
  }

  const tailHousing = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.7, W * 0.88),
    lib.darkMetalMaterial
  );
  tailHousing.position.set(-halfL - 0.05, H * 0.42, 0);
  bodyGroup.add(tailHousing);

  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.05, W * 0.8),
    lib.taillightMaterial
  );
  tailBar.position.set(-halfL - 0.12, H * 0.42, 0);
  bodyGroup.add(tailBar);

  // 8. Twin 3D Nitro Exhaust Flame Plumes (soft translucent warm-amber to blue exhaust jet)
  const nitroGroup = new THREE.Group();
  const nitroFlameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uInner: { value: new THREE.Color(0xf6c57a) },
      uOuter: { value: new THREE.Color(0x4aa8c9) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uInner;
      uniform vec3 uOuter;
      varying vec2 vUv;
      void main() {
        // vUv.y = 0 at open base (exhaust tip), 1 at pointed tail tip
        float fade = smoothstep(1.0, 0.15, vUv.y) * smoothstep(0.0, 0.12, vUv.y);
        vec3 col = mix(uInner, uOuter, smoothstep(0.15, 0.78, vUv.y));
        gl_FragColor = vec4(col, fade * 0.62);
      }
    `
  });
  for (const side of [-1, 1]) {
    const outerCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 9.5, 12, 1, true),
      nitroFlameMat
    );
    outerCone.rotation.z = Math.PI * 0.5;
    outerCone.position.set(-halfL - 5.0, 2.55, side * (halfW * 0.45));
    nitroGroup.add(outerCone);
  }
  nitroGroup.visible = false;
  bodyGroup.add(nitroGroup);

  // 9. Police Push-Bar & Roof Siren Lightbar
  let sirenLight = null;
  let sirenRedPod = null;
  let sirenBluePod = null;
  if (veh.isPolice) {
    const pushBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 4.4, W * 0.54),
      lib.darkMetalMaterial
    );
    pushBar.position.set(halfL + 0.85, 3.3, 0);
    bodyGroup.add(pushBar);

    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.9, W * 0.58),
      lib.chromeMaterial
    );
    barBase.position.set(-L * 0.04, H + 0.65, 0);
    bodyGroup.add(barBase);

    sirenRedPod = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.15, W * 0.24),
      lib.policeRedMaterial
    );
    sirenRedPod.position.set(-L * 0.04, H + 0.95, -W * 0.15);
    bodyGroup.add(sirenRedPod);

    sirenBluePod = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.15, W * 0.24),
      lib.policeBlueMaterial
    );
    sirenBluePod.position.set(-L * 0.04, H + 0.95, W * 0.15);
    bodyGroup.add(sirenBluePod);

    sirenLight = new THREE.PointLight(0xd43542, 6, 70);
    sirenLight.position.set(0, H + 4.2, 0);
    bodyGroup.add(sirenLight);
  }

  // 10. Four Articulated 3D Wheels Neatly Tucked into Dark Wheel Arches
  const wheels = [];
  const wheelRadius = veh.isHeavy ? 4.4 : 3.7;
  const wheelWidth = veh.isHeavy ? 3.5 : 3.0;
  const axleX = L * 0.31;
  const axleZ = halfW - 1.05;

  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
  tireGeo.rotateX(Math.PI * 0.5);
  const hubGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.64,
    wheelRadius * 0.64,
    wheelWidth + 0.18,
    14
  );
  hubGeo.rotateX(Math.PI * 0.5);
  const centerCapGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.22,
    wheelRadius * 0.22,
    wheelWidth + 0.34,
    10
  );
  centerCapGeo.rotateX(Math.PI * 0.5);

  const archGeo = new THREE.CylinderGeometry(wheelRadius + 0.7, wheelRadius + 0.7, 2.2, 14);
  archGeo.rotateX(Math.PI * 0.5);

  const wheelCoords = [
    { x: axleX, z: -axleZ, isFront: true },
    { x: axleX, z: axleZ, isFront: true },
    { x: -axleX, z: -axleZ, isFront: false },
    { x: -axleX, z: axleZ, isFront: false }
  ];

  for (const wc of wheelCoords) {
    // Dark recessed wheel well backing
    const wheelWell = new THREE.Mesh(archGeo, lib.tireRubberMaterial);
    wheelWell.position.set(wc.x, wheelRadius + 0.35, wc.z * 0.88);
    bodyGroup.add(wheelWell);

    const steerPivot = new THREE.Group();
    steerPivot.position.set(wc.x, wheelRadius, wc.z);

    const spinGroup = new THREE.Group();
    const tireMesh = new THREE.Mesh(tireGeo, lib.tireRubberMaterial);
    tireMesh.castShadow = true;
    spinGroup.add(tireMesh);

    const hubMesh = new THREE.Mesh(hubGeo, lib.chromeMaterial);
    spinGroup.add(hubMesh);

    // Properly aligned 5-spoke brushed alloy spokes flush inside rim face
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(wheelRadius * 1.12, 0.52, wheelWidth + 0.26),
        lib.darkMetalMaterial
      );
      spoke.rotation.z = (s * Math.PI) / 5;
      spinGroup.add(spoke);
    }

    const capMesh = new THREE.Mesh(centerCapGeo, lib.chromeMaterial);
    spinGroup.add(capMesh);

    steerPivot.add(spinGroup);
    root.add(steerPivot);
    wheels.push({ steerPivot, spinGroup, isFront: wc.isFront });
  }

  // Soft rose-amber cabin glow used during classic GTA in-car intimate sessions
  const steamyGlow = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.44, H * 0.36, W * 0.68),
    new THREE.MeshBasicMaterial({
      color: 0xe68a9c,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    })
  );
  steamyGlow.position.set(-L * 0.04, H * 0.72, 0);
  steamyGlow.visible = false;
  bodyGroup.add(steamyGlow);

  root.userData = {
    bodyGroup,
    paintMeshes,
    wheels,
    nitroGroup,
    steamyGlow,
    sirenLight,
    sirenRedPod,
    sirenBluePod
  };

  return root;
}

/**
 * Builds an authored, rounded multi-part 3D humanoid character rig with matte fabric
 * coastal Vice outfits, grounded AO contact shadow, articulated limbs, aviator shades,
 * and a detailed 3D firearm.
 */
export function buildCharacterModel3D(person, lib) {
  const root = new THREE.Group();

  // Grounded AO contact shadow beneath character feet
  const aoShadow = createContactShadowMesh(10.5, 10.5, 0.21, lib, 0.50);
  root.add(aoShadow);

  const jacketMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.jacketColor || '#b55649'),
    roughness: 0.74,
    metalness: 0.02,
    envMapIntensity: 0.24
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.shirtColor || '#d8d1c5'),
    roughness: 0.78,
    metalness: 0.01,
    envMapIntensity: 0.20
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.pantsColor || '#252e3a'),
    roughness: 0.80,
    metalness: 0.02,
    envMapIntensity: 0.20
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.skinColor || '#cfa07e'),
    roughness: 0.68,
    metalness: 0.01,
    envMapIntensity: 0.22
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.hairColor || '#262220'),
    roughness: 0.76,
    metalness: 0.02
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xc8c4bc,
    roughness: 0.72,
    metalness: 0.02
  });

  function buildArticulatedLeg(sideSign) {
    const legPivot = new THREE.Group();
    legPivot.position.set(0, 7.6, sideSign * 1.55);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.12, 2.3, 6, 12),
      pantsMat
    );
    thigh.position.set(0, -1.7, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.96, 10, 8), pantsMat);
    knee.position.set(0.1, -3.5, 0);
    legPivot.add(knee);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.76, 3.3, 12),
      pantsMat
    );
    shin.position.set(0, -5.1, 0);
    shin.castShadow = true;
    legPivot.add(shin);

    const shoeUpper = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.0, 1.65),
      lib.darkMetalMaterial
    );
    shoeUpper.position.set(0.45, -6.8, 0);
    shoeUpper.castShadow = true;
    legPivot.add(shoeUpper);

    const shoeToe = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 10, 8),
      lib.darkMetalMaterial
    );
    shoeToe.scale.set(1.2, 0.6, 0.98);
    shoeToe.position.set(1.65, -6.85, 0);
    legPivot.add(shoeToe);

    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.42, 1.78), soleMat);
    shoeSole.position.set(0.55, -7.35, 0);
    legPivot.add(shoeSole);

    return legPivot;
  }

  const leftLegPivot = buildArticulatedLeg(-1);
  const rightLegPivot = buildArticulatedLeg(1);
  root.add(leftLegPivot, rightLegPivot);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 11.2, 0);

  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 1.9, 1.8, 14),
    pantsMat
  );
  pelvis.scale.set(0.82, 1, 1.25);
  pelvis.position.y = -3.1;
  torsoGroup.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.15, 0.75, 14),
    lib.darkMetalMaterial
  );
  belt.scale.set(0.84, 1, 1.28);
  belt.position.y = -2.35;
  torsoGroup.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.85, 1.25),
    lib.chromeMaterial
  );
  buckle.position.set(1.75, -2.35, 0);
  torsoGroup.add(buckle);

  const holster = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.9, 0.8),
    lib.darkMetalMaterial
  );
  holster.position.set(0.2, -3.1, 2.65);
  torsoGroup.add(holster);

  const innerTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 1.95, 5.8, 16),
    shirtMat
  );
  innerTorso.scale.set(0.82, 1, 1.26);
  innerTorso.position.y = 0.5;
  innerTorso.castShadow = true;
  torsoGroup.add(innerTorso);

  const jacketBack = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.1, 6.0, 14, 1, false, Math.PI * 0.25, Math.PI * 1.5),
    jacketMat
  );
  jacketBack.scale.set(0.86, 1, 1.32);
  jacketBack.position.y = 0.55;
  jacketBack.castShadow = true;
  torsoGroup.add(jacketBack);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 5.8, 1.65),
      jacketMat
    );
    lapel.position.set(1.15, 0.55, side * 1.85);
    lapel.rotation.y = side * -0.18;
    lapel.castShadow = true;
    torsoGroup.add(lapel);

    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 12, 10),
      jacketMat
    );
    shoulderCap.scale.set(1.05, 0.82, 1.15);
    shoulderCap.position.set(0.1, 3.1, side * 2.95);
    shoulderCap.castShadow = true;
    torsoGroup.add(shoulderCap);
  }

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 1.35, 12, 1, true, Math.PI * 0.3, Math.PI * 1.4),
    jacketMat
  );
  collar.position.set(-0.1, 3.65, 0);
  torsoGroup.add(collar);

  root.add(torsoGroup);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 16.9, 0);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.1, 1.5, 12),
    skinMat
  );
  neck.position.y = -1.55;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.75, 0.95, 8, 16),
    skinMat
  );
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(1.88, 14, 12),
    hairMat
  );
  hairCrown.scale.set(1.08, 0.82, 1.04);
  hairCrown.position.set(-0.22, 0.88, 0);
  headGroup.add(hairCrown);

  const hairPompadour = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.95, 1.4, 6, 12),
    hairMat
  );
  hairPompadour.rotation.z = Math.PI * 0.42;
  hairPompadour.position.set(0.25, 1.55, 0);
  headGroup.add(hairPompadour);

  // Subtle dark-tinted aviator sunglasses (on protagonist, hostiles, and stylish locals)
  const showShades = person.hasShades !== false;
  if (showShades) {
    const browBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.2, 3.25),
      lib.darkMetalMaterial
    );
    browBar.position.set(1.68, 0.52, 0);
    headGroup.add(browBar);

    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 10, 8),
        lib.glassCanopyMaterial
      );
      lens.scale.set(0.42, 0.66, 1.02);
      lens.position.set(1.58, 0.22, side * 0.88);
      headGroup.add(lens);
    }
  }

  // Optional everyday hats & headwear (cap, coastal sunhat, or vendor cap)
  if (person.hat === 'cap') {
    const capMat = lib.getMatteColorMaterial(person.hatColor || '#384c60', 0.82, 0.02);
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(1.94, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    capDome.position.set(-0.05, 0.95, 0);
    headGroup.add(capDome);
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 2.7), capMat);
    capBrim.position.set(1.55, 1.0, 0);
    capBrim.rotation.z = -0.08;
    headGroup.add(capBrim);
  } else if (person.hat === 'sunhat') {
    const strawMat = lib.getMatteColorMaterial('#cbb78e', 0.9, 0.0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.6, 0.24, 14), strawMat);
    brim.position.set(0, 1.18, 0);
    brim.castShadow = true;
    headGroup.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.85, 1.35, 12), strawMat);
    crown.position.set(0, 1.85, 0);
    headGroup.add(crown);
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.86, 1.88, 0.32, 12),
      lib.getMatteColorMaterial(person.hatColor || '#b55d53', 0.8, 0.0)
    );
    ribbon.position.set(0, 1.42, 0);
    headGroup.add(ribbon);
  }

  root.add(headGroup);

  // Vendor apron or tourist daypack attached to torso
  if (person.accessory === 'apron') {
    const apronMat = lib.getMatteColorMaterial(person.apronColor || '#dfd8ca', 0.84, 0.01);
    const apronFront = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 4.1), apronMat);
    apronFront.position.set(2.1, -1.0, 0);
    apronFront.castShadow = true;
    torsoGroup.add(apronFront);
  } else if (person.accessory === 'backpack') {
    const packMat = lib.getMatteColorMaterial(person.bagColor || '#4d6574', 0.82, 0.04);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.6, 3.6), packMat);
    pack.position.set(-2.55, 0.8, 0);
    pack.castShadow = true;
    torsoGroup.add(pack);
  }

  function buildArticulatedArm(sideSign) {
    const armPivot = new THREE.Group();
    armPivot.position.set(0.1, 14.1, sideSign * 3.35);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.92, 2.1, 6, 10),
      jacketMat
    );
    upperArm.position.y = -1.35;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 0.88, 0.55, 10),
      shirtMat
    );
    cuff.position.y = -2.85;
    armPivot.add(cuff);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.65, 2.2, 10),
      skinMat
    );
    forearm.position.set(0.35, -3.95, 0);
    forearm.rotation.z = 0.22;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), skinMat);
    hand.position.set(0.62, -5.05, 0);
    armPivot.add(hand);

    // Subtle tactical leather knuckle wrap accent for unarmed boxing stance & quick melee
    const fistWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.78, 1.15, 10),
      lib.darkMetalMaterial
    );
    fistWrap.position.set(0.56, -4.68, 0);
    fistWrap.rotation.z = 0.22;
    fistWrap.visible = false;
    armPivot.add(fistWrap);
    armPivot.userData.fistWrap = fistWrap;

    return armPivot;
  }

  const leftArmPivot = buildArticulatedArm(-1);
  const rightArmPivot = buildArticulatedArm(1);
  root.add(leftArmPivot, rightArmPivot);

  // Colorful coastal shopping bag held by strolling tourists & shoppers
  if (person.accessory === 'shopping_bag') {
    const bagMat = lib.getMatteColorMaterial(person.bagColor || '#c87d5a', 0.78, 0.02);
    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.1, 1.3), bagMat);
    bagBody.position.set(0.7, -6.9, -0.35);
    bagBody.castShadow = true;
    leftArmPivot.add(bagBody);
    const bagHandle = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 10, Math.PI), lib.stoneTrimMaterial);
    bagHandle.position.set(0.7, -5.3, -0.35);
    leftArmPivot.add(bagHandle);
  }

  if (person.heightScale && person.heightScale !== 1) {
    root.scale.setScalar(person.heightScale);
  }

  const weaponGroup = new THREE.Group();
  // Orient weapon so +X (barrel) aligns with -Y along the arm; when arm raises by +PI/2, barrel points straight forward (+X)!
  weaponGroup.position.set(1.15, -6.1, -0.25);
  weaponGroup.rotation.z = -Math.PI * 0.5;

  const walnutWoodMat = lib.getMatteColorMaterial('#6d4c33', 0.74, 0.04);
  const oliveDrabMat = lib.getMatteColorMaterial('#4d5a3b', 0.72, 0.14);
  const brassWarheadMat = lib.getMatteColorMaterial('#8f7b46', 0.48, 0.35);

  // 1. Fists (empty unarmed slot — weaponGroup hides cleanly)
  const fistsModel = new THREE.Group();

  // 2. Vice 9mm Pistol: compact sleek black frame & brushed-silver slide (muzzle ~2.6)
  const pistolModel = new THREE.Group();
  const pistolSlide = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.72), lib.chromeMaterial);
  pistolSlide.position.set(0.95, 0.46, 0);
  pistolSlide.castShadow = true;
  pistolModel.add(pistolSlide);
  const pistolFrame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.44, 0.68), lib.darkMetalMaterial);
  pistolFrame.position.set(0.82, -0.06, 0);
  pistolModel.add(pistolFrame);
  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.85, 0.64), lib.darkMetalMaterial);
  pistolGrip.position.set(-0.22, -1.02, 0);
  pistolGrip.rotation.z = 0.25;
  pistolModel.add(pistolGrip);
  const pistolBarrelTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8),
    lib.darkMetalMaterial
  );
  pistolBarrelTip.rotation.z = Math.PI * 0.5;
  pistolBarrelTip.position.set(2.55, 0.44, 0);
  pistolModel.add(pistolBarrelTip);
  const pistolFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.2), lib.darkMetalMaterial);
  pistolFrontSight.position.set(2.25, 0.9, 0);
  pistolModel.add(pistolFrontSight);

  // 3. Spectre Micro-SMG: compact tactical boxy receiver, stubby suppressor, long vertical stick mag (muzzle ~5.4)
  const smgModel = new THREE.Group();
  const smgReceiver = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.35, 0.96), lib.darkMetalMaterial);
  smgReceiver.position.set(0.7, 0.28, 0);
  smgReceiver.castShadow = true;
  smgModel.add(smgReceiver);
  const smgTopRail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 0.66), lib.chromeMaterial);
  smgTopRail.position.set(0.65, 1.05, 0);
  smgModel.add(smgTopRail);
  const smgReflex = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.64), lib.darkMetalMaterial);
  smgReflex.position.set(0.5, 1.45, 0);
  smgModel.add(smgReflex);
  const smgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.85, 0.68), lib.darkMetalMaterial);
  smgGrip.position.set(-0.35, -0.95, 0);
  smgGrip.rotation.z = 0.22;
  smgModel.add(smgGrip);
  const smgStickMag = new THREE.Mesh(new THREE.BoxGeometry(0.82, 3.25, 0.66), lib.darkMetalMaterial);
  smgStickMag.position.set(1.55, -1.72, 0);
  smgStickMag.rotation.z = 0.06;
  smgStickMag.castShadow = true;
  smgModel.add(smgStickMag);
  const smgSuppressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 2.75, 10),
    lib.darkMetalMaterial
  );
  smgSuppressor.rotation.z = Math.PI * 0.5;
  smgSuppressor.position.set(3.95, 0.35, 0);
  smgSuppressor.castShadow = true;
  smgModel.add(smgSuppressor);
  const smgWireStock = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 0.45), lib.chromeMaterial);
  smgWireStock.position.set(-1.85, 0.45, 0);
  smgModel.add(smgWireStock);

  // 4. Breacher Tactical 12G Shotgun: walnut stock, grooved pump forend, dual barrel + tube (muzzle ~7.8)
  const shotgunModel = new THREE.Group();
  const sgStock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.32, 0.86), walnutWoodMat);
  sgStock.position.set(-2.15, -0.22, 0);
  sgStock.rotation.z = 0.14;
  sgStock.castShadow = true;
  shotgunModel.add(sgStock);
  const sgReceiver = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.38, 0.96), lib.darkMetalMaterial);
  sgReceiver.position.set(0.85, 0.22, 0);
  sgReceiver.castShadow = true;
  shotgunModel.add(sgReceiver);
  const sgTopBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 5.4, 10),
    lib.chromeMaterial
  );
  sgTopBarrel.rotation.z = Math.PI * 0.5;
  sgTopBarrel.position.set(5.05, 0.55, 0);
  sgTopBarrel.castShadow = true;
  shotgunModel.add(sgTopBarrel);
  const sgMagTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 4.7, 10),
    lib.darkMetalMaterial
  );
  sgMagTube.rotation.z = Math.PI * 0.5;
  sgMagTube.position.set(4.65, -0.05, 0);
  shotgunModel.add(sgMagTube);
  const sgPumpForend = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.96, 1.08), walnutWoodMat);
  sgPumpForend.position.set(3.85, -0.1, 0);
  sgPumpForend.castShadow = true;
  shotgunModel.add(sgPumpForend);

  // 5. V-416 Tactical Carbine: buttstock, curved rifle mag, optic scope, vented handguard, muzzle brake (muzzle ~8.4)
  const carbineModel = new THREE.Group();
  const cbStock = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.45, 0.88), lib.darkMetalMaterial);
  cbStock.position.set(-2.55, 0.08, 0);
  cbStock.castShadow = true;
  carbineModel.add(cbStock);
  const cbReceiver = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.45, 0.98), lib.darkMetalMaterial);
  cbReceiver.position.set(0.8, 0.28, 0);
  cbReceiver.castShadow = true;
  carbineModel.add(cbReceiver);
  const cbGrip = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.8, 0.72), lib.darkMetalMaterial);
  cbGrip.position.set(-0.35, -1.0, 0);
  cbGrip.rotation.z = 0.28;
  carbineModel.add(cbGrip);
  const cbCurvedMagUpper = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.75, 0.76), lib.darkMetalMaterial);
  cbCurvedMagUpper.position.set(1.4, -1.05, 0);
  cbCurvedMagUpper.rotation.z = 0.18;
  carbineModel.add(cbCurvedMagUpper);
  const cbCurvedMagLower = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.45, 0.74), lib.darkMetalMaterial);
  cbCurvedMagLower.position.set(1.75, -2.25, 0);
  cbCurvedMagLower.rotation.z = 0.42;
  carbineModel.add(cbCurvedMagLower);
  const cbScopeMount = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.56), lib.chromeMaterial);
  cbScopeMount.position.set(0.75, 1.18, 0);
  carbineModel.add(cbScopeMount);
  const cbScope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 2.3, 10),
    lib.darkMetalMaterial
  );
  cbScope.rotation.z = Math.PI * 0.5;
  cbScope.position.set(0.75, 1.58, 0);
  cbScope.castShadow = true;
  carbineModel.add(cbScope);
  const cbHandguard = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.15, 0.94), lib.darkMetalMaterial);
  cbHandguard.position.set(4.35, 0.36, 0);
  cbHandguard.castShadow = true;
  carbineModel.add(cbHandguard);
  const cbRail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.24, 0.56), lib.chromeMaterial);
  cbRail.position.set(2.55, 1.02, 0);
  carbineModel.add(cbRail);
  const cbBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 2.75, 10),
    lib.chromeMaterial
  );
  cbBarrel.rotation.z = Math.PI * 0.5;
  cbBarrel.position.set(6.95, 0.38, 0);
  carbineModel.add(cbBarrel);
  const cbBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.34, 0.85, 10),
    lib.darkMetalMaterial
  );
  cbBrake.rotation.z = Math.PI * 0.5;
  cbBrake.position.set(8.2, 0.38, 0);
  carbineModel.add(cbBrake);

  // 6. Titan AT-4 RPG-7 Shoulder-Mounted Rocket Launcher: olive-drab tube, flared venturi, twin grips & warhead (muzzle ~9.2)
  const rpgModel = new THREE.Group();
  const rpgTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 11.4, 14),
    oliveDrabMat
  );
  rpgTube.rotation.z = Math.PI * 0.5;
  rpgTube.position.set(2.4, 0.95, 0);
  rpgTube.castShadow = true;
  rpgModel.add(rpgTube);
  const rpgHeatShield = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 3.8, 14),
    walnutWoodMat
  );
  rpgHeatShield.rotation.z = Math.PI * 0.5;
  rpgHeatShield.position.set(1.2, 0.95, 0);
  rpgModel.add(rpgHeatShield);
  const rpgVenturi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.94, 1.48, 2.0, 14),
    lib.darkMetalMaterial
  );
  rpgVenturi.rotation.z = Math.PI * 0.5;
  rpgVenturi.position.set(-4.1, 0.95, 0);
  rpgModel.add(rpgVenturi);
  const rpgFrontGrip = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.76), lib.darkMetalMaterial);
  rpgFrontGrip.position.set(3.2, -0.55, 0);
  rpgFrontGrip.rotation.z = 0.14;
  rpgModel.add(rpgFrontGrip);
  const rpgRearGrip = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.76), lib.darkMetalMaterial);
  rpgRearGrip.position.set(0.2, -0.62, 0);
  rpgRearGrip.rotation.z = 0.22;
  rpgModel.add(rpgRearGrip);
  const rpgOptic = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.05, 0.78), lib.darkMetalMaterial);
  rpgOptic.position.set(2.0, 1.55, 1.05);
  rpgModel.add(rpgOptic);
  const rpgWarheadBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 0.74, 1.35, 12),
    brassWarheadMat
  );
  rpgWarheadBase.rotation.z = -Math.PI * 0.5;
  rpgWarheadBase.position.set(8.35, 0.95, 0);
  rpgWarheadBase.castShadow = true;
  rpgModel.add(rpgWarheadBase);
  const rpgWarheadTip = new THREE.Mesh(
    new THREE.ConeGeometry(1.18, 1.65, 12),
    oliveDrabMat
  );
  rpgWarheadTip.rotation.z = -Math.PI * 0.5;
  rpgWarheadTip.position.set(9.75, 0.95, 0);
  rpgWarheadTip.castShadow = true;
  rpgModel.add(rpgWarheadTip);

  const weaponVariants = {
    fists: fistsModel,
    pistol: pistolModel,
    smg: smgModel,
    shotgun: shotgunModel,
    carbine: carbineModel,
    rpg: rpgModel
  };
  const weaponMuzzleX = {
    fists: 1.5,
    pistol: 2.8,
    smg: 5.5,
    shotgun: 7.9,
    carbine: 8.65,
    rpg: 10.6
  };

  for (const [id, grp] of Object.entries(weaponVariants)) {
    grp.visible = id === 'pistol';
    weaponGroup.add(grp);
  }

  // Crisp soft star-burst muzzle flash billboard (zero boxy octahedron artifacts)
  const muzzleMat = new THREE.SpriteMaterial({
    map: lib.muzzleStarTex,
    color: 0xf6cf88,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const muzzleFlashMesh = new THREE.Sprite(muzzleMat);
  muzzleFlashMesh.scale.set(5.2, 5.2, 1);
  muzzleFlashMesh.position.set(weaponMuzzleX.pistol, 0.42, 0);
  muzzleFlashMesh.visible = false;
  weaponGroup.add(muzzleFlashMesh);

  rightArmPivot.add(weaponGroup);

  root.userData = {
    aoShadow,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    torsoGroup,
    headGroup,
    weaponGroup,
    weaponVariants,
    weaponMuzzleX,
    activeWeaponId: 'pistol',
    fistWraps: [leftArmPivot.userData.fistWrap, rightArmPivot.userData.fistWrap],
    rpgWarheadParts: [rpgWarheadBase, rpgWarheadTip],
    muzzleFlashMesh,
    jacketMat,
    shirtMat,
    pantsMat
  };

  return root;
}

/**
 * Builds an authored multi-tiered 3D skyscraper / Art-Deco hotel / coastal balcony condo /
 * downtown glass tower with realistic limestone/granite trims, ground-floor retail colonnades,
 * striped coastal awnings, setback penthouse crown, rooftop mechanical units, and tasteful
 * landmark marquee signs — ZERO vertical neon corner wireframes.
 */
export function buildSkyscraperModel3D(b, lib) {
  const group = new THREE.Group();
  const cx = b.x + b.w * 0.5;
  const cz = b.y + b.h * 0.5;
  group.position.set(cx, 0, cz);

  const H = b.height3D || 110;
  const facadeMat = lib.getBuildingMaterial(b.styleIndex === 4 ? 0 : b.styleIndex, b.variant || 0);
  const isModernGlass = b.styleIndex === 1;
  const isVilla = b.styleIndex === 4;
  const trimMat = isModernGlass || b.styleIndex === 3 ? lib.graniteTrimMaterial : lib.stoneTrimMaterial;
  const hasWalkIns = Boolean(b.walkInShops && b.walkInShops.length > 0);
  const maxWalkInH = hasWalkIns
    ? Math.max(...b.walkInShops.map((s) => (s.interior ? s.interior.ceilingH : 28)))
    : 0;

  // 1. Ground-floor architectural retail podium (carved open whenever hosting walk-in / drive-in 3D shops!)
  const podiumH = hasWalkIns ? maxWalkInH : isVilla ? 14 : Math.min(20, H * 0.22);

  if (hasWalkIns) {
    const firstIb = b.walkInShops[0].interior;
    const opensEast = firstIb.dir > 0;
    const maxDepth = Math.max(...b.walkInShops.map((s) => s.interior.depth));
    const backW = Math.max(12, b.w - maxDepth);
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(backW, podiumH, b.h), trimMat);
    backMesh.position.set(
      opensEast ? -b.w * 0.5 + backW * 0.5 : b.w * 0.5 - backW * 0.5,
      podiumH * 0.5,
      0
    );
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    group.add(backMesh);

    // Solid side flanking piers between carved ground-floor shop interiors
    const sorted = [...b.walkInShops].sort((a, c) => a.interior.y1 - c.interior.y1);
    const stripCenterX = opensEast ? b.w * 0.5 - maxDepth * 0.5 : -b.w * 0.5 + maxDepth * 0.5;
    let curY = b.y;
    for (const s of sorted) {
      const ib = s.interior;
      if (ib.y1 > curY + 2) {
        const segH = ib.y1 - curY;
        const segMesh = new THREE.Mesh(new THREE.BoxGeometry(maxDepth, podiumH, segH), trimMat);
        segMesh.position.set(stripCenterX, podiumH * 0.5, curY + segH * 0.5 - cz);
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;
        group.add(segMesh);
      }
      curY = Math.max(curY, ib.y2);
    }
    if (b.y + b.h > curY + 2) {
      const segH = b.y + b.h - curY;
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(maxDepth, podiumH, segH), trimMat);
      segMesh.position.set(stripCenterX, podiumH * 0.5, curY + segH * 0.5 - cz);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      group.add(segMesh);
    }
  } else {
    const podiumMesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, podiumH, b.h),
      trimMat
    );
    podiumMesh.position.y = podiumH * 0.5;
    podiumMesh.castShadow = true;
    podiumMesh.receiveShadow = true;
    group.add(podiumMesh);

    // Recessed warm-lit ground-floor retail shopfront windows along lower podium
    const groundWindowMat =
      b.styleIndex === 3 ? lib.retailGlassMaterial : lib.getShopWindowMaterial('retail');
    const shopfrontMesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.5, podiumH * 0.58, b.h - 10),
      groundWindowMat
    );
    shopfrontMesh.position.y = podiumH * 0.42;
    group.add(shopfrontMesh);

    const shopfrontZ = new THREE.Mesh(
      new THREE.BoxGeometry(b.w - 10, podiumH * 0.58, b.h + 0.5),
      groundWindowMat
    );
    shopfrontZ.position.y = podiumH * 0.42;
    group.add(shopfrontZ);
  }

  // Clean architectural limestone/granite podium cornice ledge
  const corniceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 3.0, 2.2, b.h + 3.0),
    trimMat
  );
  corniceMesh.position.y = podiumH + 0.8;
  corniceMesh.castShadow = true;
  corniceMesh.receiveShadow = true;
  group.add(corniceMesh);

  // Tasteful striped coastal retail awnings (omitted on buildings hosting custom walk-in shops)
  if (!hasWalkIns && (b.styleIndex === 0 || b.styleIndex === 2 || (b.styleIndex === 1 && (b.variant || 0) === 0))) {
    const awningMat =
      (b.variant || 0) % 3 === 0
        ? lib.awningCoralMaterial
        : (b.variant || 0) % 3 === 1
          ? lib.awningTealMaterial
          : lib.awningGoldMaterial;
    for (const side of [-1, 1]) {
      const awningX = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.65, b.h * 0.68),
        awningMat
      );
      awningX.position.set(side * (b.w * 0.5 + 2.1), podiumH * 0.72, 0);
      awningX.rotation.z = side * -0.34;
      awningX.castShadow = true;
      group.add(awningX);
    }
  }

  // Ground-floor street boutique fascia sign along East/West avenue sides
  if (!hasWalkIns && b.retailLabel && b.styleIndex !== 3 && !isVilla) {
    const fasciaMat = lib.getShopSignMaterial(
      b.retailLabel,
      '',
      b.neonColor || '#e0b268',
      b.trimColor || '#5eb3aa'
    );
    for (const side of [-1, 1]) {
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.4, Math.min(28, b.h * 0.34)), fasciaMat);
      fascia.position.set(side * (b.w * 0.5 + 0.65), podiumH * 0.88, 0);
      group.add(fascia);
    }
  }

  // Mediterranean Coastal Luxury Villas (Sunset Hills & Starfish Island)
  if (isVilla && !hasWalkIns) {
    const villaH = Math.max(24, H - podiumH);
    const villaBody = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.86, villaH, b.h * 0.86),
      facadeMat
    );
    villaBody.position.y = podiumH + villaH * 0.5;
    villaBody.castShadow = true;
    villaBody.receiveShadow = true;
    group.add(villaBody);

    const roofRadius = Math.max(b.w, b.h) * 0.66;
    const terracottaMat = lib.getMatteColorMaterial('#a65c44', 0.84, 0.02);
    const hipRoof = new THREE.Mesh(new THREE.ConeGeometry(roofRadius, 18, 4), terracottaMat);
    hipRoof.rotation.y = Math.PI * 0.25;
    hipRoof.position.y = podiumH + villaH + 9;
    hipRoof.castShadow = true;
    hipRoof.receiveShadow = true;
    group.add(hipRoof);
    return group;
  }

  // 2. Main Architectural Tower Shaft
  const mainW = b.w * 0.90;
  const mainD = b.h * 0.90;
  const mainH = H - podiumH;
  const towerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(mainW, mainH, mainD),
    facadeMat
  );
  towerMesh.position.y = podiumH + mainH * 0.5;
  towerMesh.castShadow = true;
  towerMesh.receiveShadow = true;
  group.add(towerMesh);

  // Subtle matte stone / dark-aluminum corner pilasters (real architecture, zero glow)
  const pilasterW = isModernGlass ? 1.8 : 2.6;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pilaster = new THREE.Mesh(
        new THREE.BoxGeometry(pilasterW, mainH + 1.5, pilasterW),
        trimMat
      );
      pilaster.position.set(sx * (mainW * 0.5), podiumH + mainH * 0.5, sz * (mainD * 0.5));
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;
      group.add(pilaster);
    }
  }

  // Architectural roof cornice ledge
  const roofCornice = new THREE.Mesh(
    new THREE.BoxGeometry(mainW + 2.8, 2.4, mainD + 2.8),
    trimMat
  );
  roofCornice.position.y = H + 0.6;
  roofCornice.castShadow = true;
  roofCornice.receiveShadow = true;
  group.add(roofCornice);

  // 3. Upper Setback Penthouse Crown Tier & Matte Parapet
  const crownW = mainW * 0.66;
  const crownD = mainD * 0.66;
  const crownH = Math.min(24, H * 0.16);
  const crownMesh = new THREE.Mesh(
    new THREE.BoxGeometry(crownW, crownH, crownD),
    facadeMat
  );
  crownMesh.position.y = H + crownH * 0.5;
  crownMesh.castShadow = true;
  crownMesh.receiveShadow = true;
  group.add(crownMesh);

  const crownParapet = new THREE.Mesh(
    new THREE.BoxGeometry(crownW + 2.0, 2.0, crownD + 2.0),
    trimMat
  );
  crownParapet.position.y = H + crownH + 0.8;
  crownParapet.castShadow = true;
  group.add(crownParapet);

  // 4. Rooftop HVAC Chillers & Slim Brushed-Steel Communication Spire
  const roofY = H + crownH + 1.8;
  const hvacA = new THREE.Mesh(
    new THREE.BoxGeometry(12, 6.5, 10),
    lib.darkMetalMaterial
  );
  hvacA.position.set(-crownW * 0.22, roofY + 3.25, -crownD * 0.18);
  hvacA.castShadow = true;
  group.add(hvacA);

  if (H >= 135) {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.4, 30, 8),
      lib.chromeMaterial
    );
    spire.position.set(crownW * 0.2, roofY + 15, crownD * 0.2);
    group.add(spire);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 8),
      lib.policeRedMaterial
    );
    beacon.position.set(crownW * 0.2, roofY + 30.4, crownD * 0.2);
    group.add(beacon);
  }

  // 5. Tasteful Coastal Boutique Landmark Marquee Sign (subtle warm glow, never garish)
  if (b.signText) {
    const signMat = lib.getNeonSignMaterial(
      b.signText,
      b.neonColor || '#d67367',
      b.trimColor || '#5eb3aa'
    );
    const signW = Math.min(b.w * 0.72, 58);
    const signH = 13.5;
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 2.2),
      signMat
    );
    signBoard.position.set(0, podiumH + Math.min(36, mainH * 0.4), mainD * 0.5 + 1.4);
    group.add(signBoard);
  }

  return group;
}

/**
 * Builds an organic curved 7-segment 3D coastal palm tree with weathered bark,
 * grounded AO contact shadow, coconut cluster, and 10 two-tone olive-emerald frond blades.
 */
export function buildPalmTreeModel3D(tree, lib) {
  const group = new THREE.Group();
  group.position.set(tree.x, 0, tree.y);

  const scale = tree.scale || 1.0;
  const leanAngle = tree.leanAngle || 0;

  // Grounded AO shadow beneath palm trunk base
  const aoShadow = createContactShadowMesh(17 * scale, 17 * scale, 0.16, lib, 0.42);
  group.add(aoShadow);

  const trunkGroup = new THREE.Group();
  trunkGroup.rotation.y = leanAngle;
  group.add(trunkGroup);

  const segments = 7;
  const segH = 5.4 * scale;
  let curX = 0;
  let curY = 0;
  let curTilt = 0.06;

  for (let i = 0; i < segments; i++) {
    const rBottom = (2.05 - i * 0.16) * scale;
    const rTop = (1.88 - i * 0.16) * scale;
    const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segH, 9);
    const segMesh = new THREE.Mesh(segGeo, lib.palmTrunkMaterial);
    segMesh.position.set(
      curX + Math.sin(curTilt) * (segH * 0.5),
      curY + Math.cos(curTilt) * (segH * 0.5),
      0
    );
    segMesh.rotation.z = -curTilt;
    segMesh.castShadow = true;
    segMesh.receiveShadow = true;
    trunkGroup.add(segMesh);

    curX += Math.sin(curTilt) * segH;
    curY += Math.cos(curTilt) * segH;
    curTilt += 0.036;
  }

  const crownGroup = new THREE.Group();
  crownGroup.position.set(curX, curY, 0);
  trunkGroup.add(crownGroup);

  // Cluster of coconuts nested beneath the fronds
  for (let c = 0; c < 3; c++) {
    const cAng = (c * Math.PI * 2) / 3;
    const coco = new THREE.Mesh(
      new THREE.SphereGeometry(1.15 * scale, 8, 6),
      lib.coconutMaterial
    );
    coco.position.set(Math.cos(cAng) * 1.4 * scale, -1.2 * scale, Math.sin(cAng) * 1.4 * scale);
    crownGroup.add(coco);
  }

  const frondShape = new THREE.Shape();
  frondShape.moveTo(0, 0);
  frondShape.quadraticCurveTo(8 * scale, 3.6 * scale, 18.2 * scale, -3.8 * scale);
  frondShape.quadraticCurveTo(9 * scale, 1.0 * scale, 0, -0.55 * scale);
  frondShape.closePath();

  const frondGeo = new THREE.ExtrudeGeometry(frondShape, {
    depth: 3.1 * scale,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.22 * scale,
    bevelThickness: 0.22 * scale
  });
  frondGeo.translate(0, 0, -1.55 * scale);

  const frondCount = 10;
  for (let f = 0; f < frondCount; f++) {
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = (f * Math.PI * 2) / frondCount + (f % 2) * 0.14;
    frondPivot.rotation.z = f % 2 === 0 ? 0.22 : -0.14;

    const frondMat = f % 2 === 0 ? lib.palmFrondLightMaterial : lib.palmFrondMaterial;
    const frondMesh = new THREE.Mesh(frondGeo, frondMat);
    frondMesh.castShadow = true;
    frondMesh.receiveShadow = true;
    frondPivot.add(frondMesh);
    crownGroup.add(frondPivot);
  }

  return group;
}

/**
 * Builds Solaris Beach coastal props (beach umbrellas + loungers, classic coastal lifeguard tower).
 */
export function buildBeachPropModel3D(prop, lib) {
  const group = new THREE.Group();
  group.position.set(prop.x, 0, prop.y);

  if (prop.kind === 'surfboards') {
    const ao = createContactShadowMesh(14, 14, 0.14, lib, 0.34);
    group.add(ao);
    const colors = [prop.color || '#c8725a', prop.accentColor || '#52939c'];
    for (let i = 0; i < 2; i++) {
      const board = new THREE.Mesh(
        new THREE.CapsuleGeometry(1.35, 9.2, 5, 10),
        lib.getMatteColorMaterial(colors[i], 0.42, 0.08)
      );
      board.scale.set(0.28, 1.0, 1.0);
      board.position.set(i * 3.6 - 1.8, 5.4, i * 1.4 - 0.7);
      board.rotation.z = i === 0 ? -0.18 : 0.16;
      board.rotation.y = i === 0 ? 0.3 : -0.45;
      board.castShadow = true;
      group.add(board);
    }
    return group;
  }

  if (prop.kind === 'lifeguard') {
    const ao = createContactShadowMesh(26, 26, 0.14, lib, 0.40);
    group.add(ao);

    const woodMat = lib.boardwalkMaterial;
    const cabinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(prop.color || '#6ca2a8'),
      roughness: 0.78,
      metalness: 0.02
    });

    // Timber stilts
    for (const sx of [-7, 7]) {
      for (const sz of [-7, 7]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10, 1.4), woodMat);
        leg.position.set(sx, 5, sz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 18), woodMat);
    deck.position.y = 10.2;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(12, 9.5, 12), cabinMat);
    cabin.position.y = 15.4;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    group.add(cabin);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(11.5, 4.5, 4), lib.stoneTrimMaterial);
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = 22.3;
    roof.castShadow = true;
    group.add(roof);
  } else {
    // Coastal Beach Umbrella + AO shadow + twin timber loungers
    const ao = createContactShadowMesh(20, 20, 0.14, lib, 0.36);
    group.add(ao);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 11.5, 8),
      lib.boardwalkMaterial
    );
    pole.position.y = 5.75;
    pole.rotation.z = prop.tilt || 0;
    pole.castShadow = true;
    group.add(pole);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(prop.color || '#b85e54'),
      roughness: 0.86,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.0, 8), canopyMat);
    canopy.position.set(Math.sin(prop.tilt || 0) * 5.2, 11.2, 0);
    canopy.rotation.z = prop.tilt || 0;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);

    // Twin timber beach loungers with colorful beach towels beside umbrella
    const towelMat = lib.getMatteColorMaterial(prop.towelColor || '#d4865c', 0.88, 0.0);
    for (const tz of [-4.6, 4.6]) {
      const lounger = new THREE.Mesh(
        new THREE.BoxGeometry(9.0, 1.1, 3.6),
        lib.boardwalkMaterial
      );
      lounger.position.set(2.4, 0.9, tz);
      lounger.castShadow = true;
      group.add(lounger);

      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.9, 3.4),
        lib.boardwalkMaterial
      );
      backrest.position.set(-1.8, 2.1, tz);
      backrest.rotation.z = -0.58;
      backrest.castShadow = true;
      group.add(backrest);

      const towel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 2.9), towelMat);
      towel.position.set(2.9, 1.55, tz);
      group.add(towel);
    }
  }

  return group;
}

/**
 * Builds interactive 3D Street Food Carts, Armory Storefronts, 24/7 Marts, Coastal Cafés,
 * and Auto Customs / Pay-N-Spray Garages — strictly following the golden-hour PBR palette.
 */
export function buildShopModel3D(shop, lib) {
  const group = new THREE.Group();
  group.position.set(shop.x, shop.z || 0, shop.y);
  group.rotation.y = -(shop.facing || 0);

  const steamSprites = [];

  if (shop.variant === 'cart') {
    // Street Food / Taco / Burger / Tropical Juice Cart (local +X faces street)
    const ao = createContactShadowMesh(16, 26, 0.16, lib, 0.46);
    group.add(ao);

    const woodCounterMat = lib.getMatteColorMaterial('#7c5d42', 0.82, 0.04);
    const tileFrontMat = lib.getMatteColorMaterial(shop.awningColors ? shop.awningColors[0] : '#b55d53', 0.72, 0.06);
    const prepTopMat = lib.chromeMaterial;
    const awningMat = lib.getCustomAwningMaterial(
      shop.awningColors ? shop.awningColors[0] : '#b55d53',
      shop.awningColors ? shop.awningColors[1] : '#d9d0c1'
    );

    // Base cart body & front serving counter
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.2, 16.5), woodCounterMat);
    counterBase.position.set(0.5, 3.4, 0);
    counterBase.castShadow = true;
    counterBase.receiveShadow = true;
    group.add(counterBase);

    const tileInset = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 14.8), tileFrontMat);
    tileInset.position.set(4.15, 3.4, 0);
    group.add(tileInset);

    const prepCounter = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.65, 17.6), prepTopMat);
    prepCounter.position.set(0.8, 6.65, 0);
    prepCounter.castShadow = true;
    prepCounter.receiveShadow = true;
    group.add(prepCounter);

    // Cart wheels at corners
    for (const wz of [-6.8, 6.8]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 1.1, 12),
        lib.tireRubberMaterial
      );
      wheel.rotation.x = Math.PI * 0.5;
      wheel.position.set(2.2, 1.5, wz);
      group.add(wheel);
    }

    // Counter food trays, plates, grill box & tropical drink dispensers
    const grill = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 5.2), lib.darkMetalMaterial);
    grill.position.set(0.8, 7.6, -3.5);
    group.add(grill);

    const trayColors = ['#d49a52', '#b85c48', '#68a278'];
    for (let i = 0; i < 3; i++) {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.7, 2.4),
        lib.getMatteColorMaterial(trayColors[i], 0.68, 0.05)
      );
      tray.position.set(2.2, 7.35, 1.8 + i * 2.5);
      group.add(tray);
    }

    // 4 vertical steel canopy posts
    for (const px of [-2.8, 3.8]) {
      for (const pz of [-7.8, 7.8]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, 14.5, 8),
          lib.darkMetalMaterial
        );
        post.position.set(px, 7.3, pz);
        post.castShadow = true;
        group.add(post);
      }
    }

    // Sloped striped canopy roof
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.75, 18.8), awningMat);
    canopy.position.set(0.8, 15.2, 0);
    canopy.rotation.z = -0.14;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);

    // Readable menu fascia signboards facing street AND both sidewalk directions (North/South)
    const signMat = lib.getShopSignMaterial(
      shop.signText,
      'FRESH FOOD • DRINKS [E]',
      shop.primaryColor,
      shop.accentColor
    );
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.8, 15.8), signMat);
    signBoard.position.set(5.5, 14.8, 0);
    group.add(signBoard);

    const endSignMat = lib.getShopSignMaterial(
      shop.signText,
      '$20+ [E]',
      shop.primaryColor,
      shop.accentColor
    );
    for (const sideZ of [-1, 1]) {
      const endSign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.4, 0.7), endSignMat);
      endSign.position.set(0.8, 15.0, sideZ * 9.35);
      group.add(endSign);
    }

    // Warm under-canopy string bulbs
    for (let b = -2; b <= 2; b++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), lib.warmStringBulbMaterial);
      bulb.position.set(4.1, 13.3, b * 3.2);
      group.add(bulb);
    }

    // Sidewalk A-frame chalkboard menu standing next to cart
    const chalkMat = lib.getChalkboardMaterial(shop.signText, [
      'TACOS  $20',
      'BURGER  $45',
      'COLD BREW $30'
    ]);
    const aFrameGroup = new THREE.Group();
    aFrameGroup.position.set(5.2, 0, 11.4);
    aFrameGroup.rotation.y = -0.35;
    const panelF = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.8, 4.2), chalkMat);
    panelF.position.set(0.65, 2.9, 0);
    panelF.rotation.z = 0.16;
    panelF.castShadow = true;
    const panelB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.8, 4.2), lib.boardwalkMaterial);
    panelB.position.set(-0.65, 2.9, 0);
    panelB.rotation.z = -0.16;
    aFrameGroup.add(panelF, panelB);
    group.add(aFrameGroup);

    // Subtle rising warm cooking steam sprites above grill
    for (let s = 0; s < 3; s++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: lib.softPuffTex,
          color: 0xe6dfd2,
          transparent: true,
          opacity: 0.24,
          depthWrite: false
        })
      );
      sp.position.set(0.8, 9.2 + s * 2.4, -3.5 + (s - 1) * 0.7);
      sp.scale.set(3.2 + s * 0.8, 3.2 + s * 0.8, 1);
      sp.userData.phase = s * 2.1;
      group.add(sp);
      steamSprites.push(sp);
    }
  } else if (shop.variant === 'club_bar') {
    // Club Eclipse Cocktail Bar is built integrally inside buildClubEclipseModel3D
    group.userData = { steamSprites, shopId: shop.id };
    return group;
  } else if (shop.interior) {
    // === SEAMLESS WALK-IN / DRIVE-IN 3D FURNISHED SHOP INTERIORS ===
    // Local +X opens onto the sidewalk; local -X goes deep inside the furnished store!
    const ib = shop.interior;
    const D = ib.depth;
    const W = ib.halfSpan * 2;
    const H = ib.ceilingH;
    const isGarage = shop.kind === 'garage';

    const floorColor =
      shop.kind === 'armory'
        ? '#39404a'
        : shop.kind === 'clothing'
          ? '#b8a288'
          : shop.kind === 'mart_boutique'
            ? '#c2bcb0'
            : isGarage
              ? '#454a52'
              : '#9a7e60';
    const wallColor =
      shop.kind === 'armory'
        ? '#454a52'
        : shop.kind === 'clothing'
          ? '#d2c7b6'
          : shop.kind === 'mart_boutique'
            ? '#c8cfc9'
            : isGarage
              ? '#50565e'
              : '#cbbba4';

    const floorMat = lib.getMatteColorMaterial(floorColor, 0.74, 0.06);
    const wallMat = lib.getMatteColorMaterial(wallColor, 0.84, 0.02);

    // Interior Floor Slab
    const floor = new THREE.Mesh(new THREE.BoxGeometry(D + 2, 0.3, W), floorMat);
    floor.position.set(-D * 0.5, 0.14, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Solid Back Wall, Left Wall, Right Wall & Warm Lit Ceiling
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, H, W), wallMat);
    backWall.position.set(-D + 0.7, H * 0.5, 0);
    backWall.receiveShadow = true;
    group.add(backWall);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(D, H, 1.4), wallMat);
      sideWall.position.set(-D * 0.5, H * 0.5, side * (W * 0.5 - 0.7));
      sideWall.receiveShadow = true;
      group.add(sideWall);
    }

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(D + 1, 0.8, W), wallMat);
    ceiling.position.set(-D * 0.5, H - 0.4, 0);
    group.add(ceiling);

    // Warm overhead interior light bars (comfortable soft warm glow, zero harsh glare)
    for (const lx of [-D * 0.28, -D * 0.68]) {
      const lampBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.55, W * 0.62),
        lib.warmStringBulbMaterial
      );
      lampBar.position.set(lx, H - 1.1, 0);
      group.add(lampBar);
    }

    // Front open-door glass storefront frames (garage leaves full bay wide open to drive inside!)
    if (!isGarage) {
      const doorHalf = 12.5;
      const paneW = (W * 0.5) - doorHalf;
      for (const side of [-1, 1]) {
        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, H * 0.68, paneW),
          lib.shelterGlassMaterial
        );
        glassPane.position.set(0.1, H * 0.36, side * (doorHalf + paneW * 0.5));
        group.add(glassPane);

        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, H * 0.72, 1.1),
          lib.darkMetalMaterial
        );
        mullion.position.set(0.2, H * 0.36, side * doorHalf);
        group.add(mullion);
      }
      // Header transom glass beam above open walk-in doorway
      const headerBeam = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, H * 0.28, W),
        lib.darkMetalMaterial
      );
      headerBeam.position.set(0.2, H * 0.86, 0);
      group.add(headerBeam);

      // Sloped striped boutique/armory awning outside over sidewalk
      const awningMat = lib.getCustomAwningMaterial(
        shop.awningColors ? shop.awningColors[0] : '#467c82',
        shop.awningColors ? shop.awningColors[1] : '#d9d0c1'
      );
      const awning = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.65, W * 0.96), awningMat);
      awning.position.set(3.6, H * 0.74, 0);
      awning.rotation.z = -0.3;
      awning.castShadow = true;
      group.add(awning);
    } else {
      // Rolled-up ribbed garage shutter above drive-in bay
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.8, W - 4), lib.chromeMaterial);
      shutter.position.set(0.4, H - 3.6, 0);
      group.add(shutter);

      // Yellow safety drive-in guide lines on concrete garage floor
      const stripeMat = lib.getMatteColorMaterial('#c9a132', 0.82, 0.02);
      for (const sz of [-20, 20]) {
        const guide = new THREE.Mesh(new THREE.BoxGeometry(D - 8, 0.14, 1.2), stripeMat);
        guide.position.set(-D * 0.5, 0.31, sz);
        group.add(guide);
      }
    }

    // Bold storefront fascia marquee + projecting perpendicular sidewalk blade sign!
    const sub =
      shop.kind === 'armory'
        ? 'WALK-IN GUNS • AMMO • KEVLAR [E]'
        : shop.kind === 'clothing'
          ? 'WALK-IN BOUTIQUE • OUTFITS [E]'
          : shop.kind === 'mart_boutique'
            ? 'WALK-IN 24/7 • MEDS & GEAR [E]'
            : isGarage
              ? 'DRIVE-IN REPAIR & RESPRAY [E]'
              : 'WALK-IN CAFÉ • FOOD & DRINKS [E]';
    const signMat = lib.getShopSignMaterial(shop.signText, sub, shop.primaryColor, shop.accentColor);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.2, Math.min(44, W * 0.82)), signMat);
    signBoard.position.set(1.4, H - 2.6, 0);
    group.add(signBoard);

    const bladeBracket = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.45, 0.45), lib.darkMetalMaterial);
    bladeBracket.position.set(6.0, H - 1.2, W * 0.42);
    group.add(bladeBracket);
    const bladeSign = new THREE.Mesh(new THREE.BoxGeometry(10.8, 4.6, 1.1), signMat);
    bladeSign.position.set(6.6, H - 3.6, W * 0.42);
    bladeSign.castShadow = true;
    group.add(bladeSign);

    // === STORE-SPECIFIC FURNISHED 3D INTERIOR PROPS ===
    if (shop.variant === 'walkin_armory') {
      // Wall-mounted wooden pegboards with 3D Rifles, Shotguns, SMGs, Pistols & RPG Launchers!
      const boardMat = lib.getMatteColorMaterial('#6b523b', 0.84, 0.04);
      const backBoard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, W - 12), boardMat);
      backBoard.position.set(-D + 1.8, 12.5, 0);
      group.add(backBoard);

      for (let row = 0; row < 3; row++) {
        for (let col = -2; col <= 2; col++) {
          const gunBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 1.2, row === 2 ? 7.4 : 5.4),
            row === 2 && col === 0 ? lib.getMatteColorMaterial('#4a684e', 0.6, 0.25) : lib.darkMetalMaterial
          );
          gunBody.position.set(-D + 2.5, 8.2 + row * 4.2, col * 8.5);
          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.24, 2.8, 6),
            lib.chromeMaterial
          );
          barrel.rotation.x = Math.PI * 0.5;
          barrel.position.set(-D + 2.5, 8.4 + row * 4.2, col * 8.5 + 3.4);
          group.add(gunBody, barrel);
        }
      }

      // Glass Weapon Display Counter + Ammo Crates + Tactical Kevlar Vests
      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.2, W - 18), lib.graniteTrimMaterial);
      counterBase.position.set(-D * 0.68, 3.1, 0);
      counterBase.castShadow = true;
      group.add(counterBase);

      const glassCase = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.8, W - 20), lib.shelterGlassMaterial);
      glassCase.position.set(-D * 0.68, 7.6, 0);
      group.add(glassCase);

      // Olive ammo crates & Kevlar vests on side shelves
      const crateMat = lib.getMatteColorMaterial('#4c5e44', 0.78, 0.12);
      for (let c = 0; c < 3; c++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.0, 5.2), crateMat);
        crate.position.set(-14 - c * 8, 1.65, -W * 0.5 + 4.4);
        crate.castShadow = true;
        group.add(crate);
      }
      for (const vz of [-8, 0, 8]) {
        const vest = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 4.8, 3.8),
          lib.getMatteColorMaterial('#252d38', 0.82, 0.08)
        );
        vest.position.set(-18, 5.2, W * 0.5 - 3.6 + vz * 0.15);
        group.add(vest);
      }
    } else if (shop.variant === 'walkin_clothing') {
      // Clothing Racks with colorful hanging jackets along left & right walls
      const outfitColors = ['#c96f5d', '#273c56', '#cfc4ae', '#282f38', '#c79c52', '#569492'];
      for (const side of [-1, 1]) {
        const railZ = side * (W * 0.5 - 5.2);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 22, 8), lib.chromeMaterial);
        rail.rotation.z = Math.PI * 0.5;
        rail.position.set(-17, 10.5, railZ);
        group.add(rail);

        for (let i = 0; i < 6; i++) {
          const hanger = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 5.4, 3.6),
            lib.getMatteColorMaterial(outfitColors[(i + (side > 0 ? 3 : 0)) % outfitColors.length], 0.78, 0.02)
          );
          hanger.position.set(-9 - i * 3.1, 7.6, railZ);
          hanger.castShadow = true;
          group.add(hanger);
        }
      }

      // Twin 3D Display Mannequins on marble pedestals near front glass windows
      for (const side of [-1, 1]) {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 2.2, 12), lib.stoneTrimMaterial);
        ped.position.set(-7.5, 1.1, side * 19.5);
        group.add(ped);
        const torso = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.4, 6.2, 10),
          lib.getMatteColorMaterial(side < 0 ? '#c96f5d' : '#273c56', 0.76, 0.04)
        );
        torso.position.set(-7.5, 7.2, side * 19.5);
        torso.castShadow = true;
        const head = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), lib.stoneTrimMaterial);
        head.position.set(-7.5, 12.0, side * 19.5);
        group.add(torso, head);
      }

      // Sleek Reflective Wall Mirror on back wall + boutique checkout counter
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.4, 13.5, 14), lib.chromeMaterial);
      mirror.position.set(-D + 1.8, 9.2, 0);
      group.add(mirror);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(6.5, 6.2, 22), lib.stoneTrimMaterial);
      counter.position.set(-D * 0.68, 3.1, 0);
      counter.castShadow = true;
      group.add(counter);
    } else if (shop.variant === 'walkin_mart') {
      // Stocked 3D Product Aisles / Shelves
      const prodColors = ['#b85e54', '#4d8287', '#c9a152', '#5c8a6c', '#d4ccbc'];
      for (const side of [-1, 1]) {
        const shelfZ = side * 16.5;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(20, 10.5, 4.2), lib.stoneTrimMaterial);
        shelf.position.set(-16, 5.25, shelfZ);
        shelf.castShadow = true;
        group.add(shelf);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 5; c++) {
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(2.6, 2.0, 4.6),
              lib.getMatteColorMaterial(prodColors[(r * 5 + c) % prodColors.length], 0.72, 0.05)
            );
            box.position.set(-9 - c * 3.5, 2.5 + r * 3.0, shelfZ);
            group.add(box);
          }
        }
      }
      // Illuminated Cold-Drink Refrigerator Coolers along back wall
      for (const cz of [-16, -6, 6, 16]) {
        const cooler = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14.5, 8.2), lib.darkMetalMaterial);
        cooler.position.set(-D + 3.0, 7.25, cz);
        const coolerGlow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10.8, 6.8), lib.getShopWindowMaterial('mart_boutique'));
        coolerGlow.position.set(-D + 4.7, 7.8, cz);
        group.add(cooler, coolerGlow);
      }
      // Checkout Counter & Cash Register
      const counter = new THREE.Mesh(new THREE.BoxGeometry(6.8, 6.0, 20), lib.graniteTrimMaterial);
      counter.position.set(-D * 0.65, 3.0, 0);
      const register = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 3.2), lib.darkMetalMaterial);
      register.position.set(-D * 0.65, 7.1, 3.5);
      group.add(counter, register);
    } else if (shop.variant === 'walkin_cafe') {
      // Glowing Food & Pastry Display Counter + Chrome Espresso Machine
      const counter = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.2, 26), lib.boardwalkMaterial);
      counter.position.set(-D * 0.66, 3.1, 0);
      const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.0, 10), lib.shelterGlassMaterial);
      pastryCase.position.set(-D * 0.66, 7.7, -5);
      const espresso = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 4.6), lib.chromeMaterial);
      espresso.position.set(-D * 0.66, 7.8, 7.5);
      group.add(counter, pastryCase, espresso);

      // Indoor Cushioned Diner Booths along side walls
      const boothMat = lib.getMatteColorMaterial('#a6524a', 0.78, 0.04);
      for (const side of [-1, 1]) {
        const bz = side * (W * 0.5 - 6.0);
        const table = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.2, 6.2), lib.stoneTrimMaterial);
        table.position.set(-14, 2.1, bz);
        const seatA = new THREE.Mesh(new THREE.BoxGeometry(3.0, 5.2, 6.8), boothMat);
        seatA.position.set(-8.2, 2.6, bz);
        const seatB = new THREE.Mesh(new THREE.BoxGeometry(3.0, 5.2, 6.8), boothMat);
        seatB.position.set(-19.8, 2.6, bz);
        group.add(table, seatA, seatB);
      }
    } else if (isGarage) {
      // Drive-In Pay-N-Spray Auto Customs Garage: Twin Hydraulic Lift Posts, Red Tool Chests & Tire Stacks!
      const liftMat = lib.getMatteColorMaterial('#c99438', 0.45, 0.35);
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(2.6, 22, 2.6), liftMat);
        post.position.set(-D * 0.48, 11, side * 22);
        post.castShadow = true;
        group.add(post);
      }
      // Red mechanic rolling tool chests & paint rack along back wall
      const chestMat = lib.getMatteColorMaterial('#a43c38', 0.42, 0.38);
      for (const cz of [-22, 22]) {
        const chest = new THREE.Mesh(new THREE.BoxGeometry(5.5, 7.6, 10.5), chestMat);
        chest.position.set(-D + 5.0, 3.8, cz);
        chest.castShadow = true;
        group.add(chest);
      }
      // Stacked rubber tires along side wall
      for (let t = 0; t < 4; t++) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.5, 12), lib.tireRubberMaterial);
        tire.position.set(-16, 0.8 + t * 1.55, -W * 0.5 + 4.8);
        group.add(tire);
      }
    }
  } else {
    // Ground-Floor Storefront Portico (Armory, 24/7 Mart, Coastal Boutique, Café del Mar)
    const ao = createContactShadowMesh(16, 36, 0.16, lib, 0.42);
    group.add(ao);

    const winKind =
      shop.kind === 'armory'
        ? 'armory'
        : shop.kind === 'mart_boutique'
          ? 'mart_boutique'
          : 'cafe';

    const storefrontFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 16.5, 32),
      shop.kind === 'armory' ? lib.graniteTrimMaterial : lib.stoneTrimMaterial
    );
    storefrontFrame.position.set(-4.2, 8.25, 0);
    storefrontFrame.castShadow = true;
    storefrontFrame.receiveShadow = true;
    group.add(storefrontFrame);

    // Recessed warm-lit display windows flanking open glowing entrance
    const windowMat = lib.getShopWindowMaterial(winKind);
    for (const wz of [-9.5, 9.5]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.2, 9.6), windowMat);
      win.position.set(-0.9, 6.2, wz);
      group.add(win);
    }

    // Open entrance vestibule with warm interior light
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 10.2, 7.2),
      lib.darkMetalMaterial
    );
    doorFrame.position.set(-0.95, 5.1, 0);
    group.add(doorFrame);
    const doorGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 9.2, 5.6),
      lib.getMatteColorMaterial('#c9a46c', 0.65, 0.0)
    );
    doorGlow.position.set(-0.8, 4.7, 0);
    group.add(doorGlow);

    // Sloped striped boutique/armory awning
    const awningMat = lib.getCustomAwningMaterial(
      shop.awningColors ? shop.awningColors[0] : '#467c82',
      shop.awningColors ? shop.awningColors[1] : '#d9d0c1'
    );
    const awning = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.7, 31.2), awningMat);
    awning.position.set(2.2, 12.2, 0);
    awning.rotation.z = -0.32;
    awning.castShadow = true;
    group.add(awning);

    // Bold readable marquee sign above awning + double-sided projecting sidewalk blade sign
    const sub =
      shop.kind === 'armory'
        ? 'GUNS • AMMO • KEVLAR [E]'
        : shop.kind === 'mart_boutique'
          ? 'MEDKITS • OUTFITS 24/7 [E]'
          : 'ESPRESSO • PATIO BISTRO [E]';
    const signMat = lib.getShopSignMaterial(shop.signText, sub, shop.primaryColor, shop.accentColor);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.8, 28.5), signMat);
    signBoard.position.set(1.6, 15.8, 0);
    group.add(signBoard);

    // Projecting perpendicular blade sign readable from down the avenue!
    const bladeBracketTop = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.45, 0.45),
      lib.darkMetalMaterial
    );
    bladeBracketTop.position.set(5.8, 19.6, 11.5);
    group.add(bladeBracketTop);

    const bladeSign = new THREE.Mesh(new THREE.BoxGeometry(10.8, 4.6, 1.1), signMat);
    bladeSign.position.set(6.4, 17.2, 11.5);
    bladeSign.castShadow = true;
    group.add(bladeSign);

    // Warm entrance porch bulbs
    for (let b = -3; b <= 3; b++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), lib.warmStringBulbMaterial);
      bulb.position.set(3.2, 10.9, b * 4.2);
      group.add(bulb);
    }

    // Security bollards in front of Armory or chalkboard in front of Café
    if (shop.kind === 'armory') {
      for (const bz of [-8.5, -4.5, 4.5, 8.5]) {
        const bollard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.65, 4.4, 8),
          lib.darkMetalMaterial
        );
        bollard.position.set(5.4, 2.2, bz);
        bollard.castShadow = true;
        group.add(bollard);
      }
    } else if (shop.variant === 'cafe') {
      const chalkMat = lib.getChalkboardMaterial('CAFE DEL MAR', [
        'COLD BREW $30',
        'TACOS  $20',
        'BURGER  $45'
      ]);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 3.8), chalkMat);
      board.position.set(5.2, 2.75, 12.8);
      board.rotation.y = -0.4;
      board.castShadow = true;
      group.add(board);
    }
  }

  group.userData = { steamSprites, shopId: shop.id };
  return group;
}

/**
 * Builds a cantilevered intersection Traffic Light pole with Red/Amber/Green lenses & crosswalk box.
 */
export function buildTrafficLightModel3D(tl, lib) {
  const group = new THREE.Group();
  group.position.set(tl.x, 0, tl.y);
  group.rotation.y = tl.rot || 0;

  const ao = createContactShadowMesh(7.5, 7.5, 0.15, lib, 0.42);
  group.add(ao);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.85, 25.5, 8),
    lib.darkMetalMaterial
  );
  pole.position.y = 12.75;
  pole.castShadow = true;
  group.add(pole);

  const baseFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.5, 1.4, 8),
    lib.darkMetalMaterial
  );
  baseFlange.position.y = 0.7;
  group.add(baseFlange);

  // Cantilever arm extending over the avenue
  const arm = new THREE.Mesh(new THREE.BoxGeometry(24, 0.75, 0.75), lib.darkMetalMaterial);
  arm.position.set(11.6, 24.4, 0);
  arm.castShadow = true;
  group.add(arm);

  // Two signal housings suspended from cantilever arm
  const redLenses = [];
  const amberLenses = [];
  const greenLenses = [];
  const lensGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.4, 10);
  lensGeo.rotateX(Math.PI * 0.5);

  for (const hx of [9.5, 19.5]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.2, 2.2), lib.darkMetalMaterial);
    housing.position.set(hx, 21.6, 0);
    housing.castShadow = true;
    group.add(housing);

    for (const faceZ of [-1.12, 1.12]) {
      const rLens = new THREE.Mesh(lensGeo, lib.trafficRedMaterial);
      rLens.position.set(hx, 23.3, faceZ);
      const aLens = new THREE.Mesh(lensGeo, lib.trafficOffMaterial);
      aLens.position.set(hx, 21.6, faceZ);
      const gLens = new THREE.Mesh(lensGeo, lib.trafficOffMaterial);
      gLens.position.set(hx, 19.9, faceZ);
      group.add(rLens, aLens, gLens);
      redLenses.push(rLens);
      amberLenses.push(aLens);
      greenLenses.push(gLens);
    }
  }

  // Lower pedestrian crosswalk signal box
  const pedBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.6), lib.darkMetalMaterial);
  pedBox.position.set(1.2, 11.2, 0);
  group.add(pedBox);
  const pedGlow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 1.7), lib.warmStringBulbMaterial);
  pedGlow.position.set(1.2, 11.2, 0);
  group.add(pedGlow);

  group.userData = {
    redLenses,
    amberLenses,
    greenLenses,
    phaseOffset: tl.phaseOffset || 0
  };
  return group;
}

/**
 * Builds an outdoor sidewalk Café Patio cluster (round bistro table, chairs, cups, striped umbrella).
 */
export function buildCafePatioModel3D(patio, lib) {
  const group = new THREE.Group();
  group.position.set(patio.x, 0, patio.y);

  const ao = createContactShadowMesh(15, 15, 0.15, lib, 0.40);
  group.add(ao);

  // Round bistro table + pedestal leg
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 1.6, 4.2, 10),
    lib.darkMetalMaterial
  );
  leg.position.y = 2.1;
  group.add(leg);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.45, 14),
    lib.stoneTrimMaterial
  );
  tableTop.position.y = 4.3;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  group.add(tableTop);

  // Two coffee cups & plates on the tabletop
  for (const cz of [-1.2, 1.2]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.3, 0.7, 8),
      lib.getMatteColorMaterial('#dfd8ca', 0.55, 0.04)
    );
    cup.position.set(0.5, 4.85, cz);
    group.add(cup);
  }

  // Two café bistro chairs placed at z = -4.6 and +4.6
  for (const side of [-1, 1]) {
    const chair = new THREE.Group();
    chair.position.set(0, 0, side * 4.6);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 2.6), lib.boardwalkMaterial);
    seat.position.y = 2.7;
    seat.castShadow = true;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.35), lib.boardwalkMaterial);
    back.position.set(0, 4.1, side * 1.15);
    back.castShadow = true;
    chair.add(back);

    for (const lx of [-1.0, 1.0]) {
      for (const lz of [-1.0, 1.0]) {
        const cLeg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 2.7, 6),
          lib.darkMetalMaterial
        );
        cLeg.position.set(lx, 1.35, lz);
        chair.add(cLeg);
      }
    }
    group.add(chair);
  }

  // Tall café patio umbrella + warm glowing mini bulb underneath
  const uPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 11.8, 8),
    lib.boardwalkMaterial
  );
  uPole.position.y = 5.9;
  uPole.castShadow = true;
  group.add(uPole);

  const canopyMat = lib.getCustomAwningMaterial(patio.umbrellaColor || '#467c82', '#dfd6c5');
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.4, 8), canopyMat);
  canopy.position.y = 11.8;
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), lib.warmStringBulbMaterial);
  bulb.position.y = 10.4;
  group.add(bulb);

  return group;
}

/**
 * Builds grounded everyday urban street furniture (hydrants, benches, bus stops, trash bins,
 * newspaper boxes, soda vending machines, concrete tropical planters, bollards).
 */
export function buildStreetPropModel3D(prop, lib) {
  const group = new THREE.Group();
  group.position.set(prop.x, prop.z || 0, prop.y);
  group.rotation.y = prop.rot || 0;

  if (prop.kind === 'hydrant') {
    group.add(createContactShadowMesh(3.6, 3.6, 0.15, lib, 0.42));
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.05, 3.8, 10),
      lib.hydrantMaterial
    );
    body.position.y = 1.9;
    body.castShadow = true;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 6), lib.hydrantMaterial);
    cap.position.y = 3.85;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.3, 8),
      lib.chromeMaterial
    );
    nozzle.rotation.z = Math.PI * 0.5;
    nozzle.position.y = 2.8;
    group.add(body, cap, nozzle);
  } else if (prop.kind === 'bench') {
    group.add(createContactShadowMesh(6.5, 12.5, 0.15, lib, 0.40));
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 10.5), lib.boardwalkMaterial);
    seat.position.set(0.3, 2.6, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 10.5), lib.boardwalkMaterial);
    back.position.set(-1.1, 4.1, 0);
    back.rotation.z = 0.16;
    back.castShadow = true;
    group.add(seat, back);
    for (const lz of [-4.2, 4.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.55), lib.darkMetalMaterial);
      leg.position.set(0.1, 1.3, lz);
      group.add(leg);
    }
  } else if (prop.kind === 'bus_stop') {
    group.add(createContactShadowMesh(13, 24, 0.15, lib, 0.44));
    // Structural dark-metal frame
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.75, 20.5), lib.darkMetalMaterial);
    roof.position.set(0, 12.6, 0);
    roof.castShadow = true;
    group.add(roof);

    for (const pz of [-9.4, 9.4]) {
      const backPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 12.6, 0.65),
        lib.darkMetalMaterial
      );
      backPost.position.set(-3.4, 6.3, pz);
      backPost.castShadow = true;
      group.add(backPost);
    }
    const backGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 10.8, 18.2),
      lib.shelterGlassMaterial
    );
    backGlass.position.set(-3.4, 6.2, 0);
    group.add(backGlass);

    // Illuminated Solaris Bay Transit Map side panel
    const mapFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 11.2, 1.1), lib.darkMetalMaterial);
    mapFrame.position.set(-0.6, 6.2, 9.4);
    mapFrame.castShadow = true;
    group.add(mapFrame);
    const mapFace = new THREE.Mesh(new THREE.BoxGeometry(4.8, 9.4, 1.25), lib.busMapMaterial);
    mapFace.position.set(-0.6, 6.4, 9.4);
    group.add(mapFace);

    // Internal shelter bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 12.2), lib.boardwalkMaterial);
    bench.position.set(-1.6, 2.6, -1.5);
    bench.castShadow = true;
    group.add(bench);
  } else if (prop.kind === 'trashbin') {
    group.add(createContactShadowMesh(3.8, 3.8, 0.15, lib, 0.38));
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.0, 4.1, 10),
      lib.darkMetalMaterial
    );
    bin.position.y = 2.05;
    bin.castShadow = true;
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
      lib.chromeMaterial
    );
    lid.position.y = 4.05;
    group.add(bin, lid);
  } else if (prop.kind === 'newsbox') {
    group.add(createContactShadowMesh(4.4, 4.4, 0.15, lib, 0.38));
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 4.6, 2.6),
      lib.getMatteColorMaterial('#4c6b82', 0.62, 0.18)
    );
    box.position.y = 2.3;
    box.castShadow = true;
    const windowFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.8, 2.0),
      lib.stoneTrimMaterial
    );
    windowFront.position.set(1.08, 3.2, 0);
    group.add(box, windowFront);
  } else if (prop.kind === 'vending') {
    group.add(createContactShadowMesh(6.0, 7.2, 0.15, lib, 0.42));
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 9.4, 5.2),
      lib.getMatteColorMaterial(prop.color || '#4d8287', 0.48, 0.22)
    );
    body.position.y = 4.7;
    body.castShadow = true;
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 6.2, 3.8),
      lib.warmLampMaterial
    );
    frontPanel.position.set(1.85, 5.4, 0);
    group.add(body, frontPanel);
  } else if (prop.kind === 'planter') {
    group.add(createContactShadowMesh(7.6, 12.6, 0.15, lib, 0.40));
    const pot = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 9.6), lib.stoneTrimMaterial);
    pot.position.y = 1.4;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);
    for (let i = -1; i <= 1; i++) {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.35, 1),
        i === 0 ? lib.bushLightMaterial : lib.bushFoliageMaterial
      );
      bush.scale.set(1.0, 0.85, 1.15);
      bush.position.set(0, 3.6 + (i === 0 ? 0.55 : 0), i * 2.8);
      bush.castShadow = true;
      group.add(bush);
    }
  } else if (prop.kind === 'bollard') {
    group.add(createContactShadowMesh(2.6, 2.6, 0.15, lib, 0.36));
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.58, 4.1, 8),
      lib.darkMetalMaterial
    );
    post.position.y = 2.05;
    post.castShadow = true;
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.45, 8),
      lib.chromeMaterial
    );
    collar.position.y = 3.5;
    group.add(post, collar);
  }

  return group;
}

/**
 * Instanced coastal timber boardwalk railings & marina pier dock bollards (fast single-batch draw).
 */
export function buildBoardwalkRailingGroup(railings, pierYs, coastX, beachWidth, lib) {
  const group = new THREE.Group();
  if (!railings || railings.length === 0) return group;

  const postGeo = new THREE.BoxGeometry(0.85, 4.4, 0.85);
  const inst = new THREE.InstancedMesh(postGeo, lib.boardwalkMaterial, railings.length);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < railings.length; i++) {
    const r = railings[i];
    dummy.position.set(r.x, (r.z || 0.58) + 2.2, r.y);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);

  // Continuous smooth timber top & mid handrail along the boardwalk
  const minY = railings[0].y;
  const maxY = railings[railings.length - 1].y;
  const spanY = maxY - minY;
  const midY = (minY + maxY) * 0.5;
  const xPos = railings[0].x;
  const zBase = railings[0].z || 0.58;

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, spanY), lib.boardwalkMaterial);
  topRail.position.set(xPos, zBase + 4.35, midY);
  topRail.castShadow = true;
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, spanY), lib.boardwalkMaterial);
  midRail.position.set(xPos, zBase + 2.45, midY);
  group.add(topRail, midRail);

  // Marina wooden pier dock bollards
  if (pierYs && pierYs.length > 0) {
    const bollardGeo = new THREE.CylinderGeometry(0.8, 0.95, 3.6, 8);
    const totalBollards = pierYs.length * 6;
    const pierInst = new THREE.InstancedMesh(bollardGeo, lib.darkMetalMaterial, totalBollards);
    let idx = 0;
    for (const py of pierYs) {
      for (const bx of [coastX + beachWidth - 20, coastX + beachWidth + 55, coastX + beachWidth + 135]) {
        for (const side of [-1, 1]) {
          dummy.position.set(bx, 3.8, py + side * 9.5);
          dummy.updateMatrix();
          pierInst.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    pierInst.instanceMatrix.needsUpdate = true;
    group.add(pierInst);
  }

  return group;
}

/**
 * Builds the 3D VCPD Police Helicopter with classic midnight-navy + warm-ivory livery,
 * spinning rotors, subtle belly strobes, and a soft GLSL translucent atmospheric searchlight beam
 * that smoothly feathers at its edges and fades gently toward the street.
 */
export function buildHelicopterModel3D(lib) {
  const root = new THREE.Group();
  const bodyMat = lib.getCarPaintMaterial('#1f2a3a');
  const stripeMat = lib.getCarPaintMaterial('#d8d3c8');

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(36, 13, 16), bodyMat);
  fuselage.castShadow = true;
  root.add(fuselage);

  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(28, 3.0, 16.5), stripeMat);
  root.add(sideStripe);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(8.2, 14, 12),
    lib.glassCanopyMaterial
  );
  cockpit.position.set(15, -0.5, 0);
  cockpit.scale.set(1.3, 0.85, 0.95);
  root.add(cockpit);

  const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(34, 4.2, 4.2), bodyMat);
  tailBoom.position.set(-32, 2.2, 0);
  root.add(tailBoom);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(7, 11, 1.8), stripeMat);
  tailFin.position.set(-47, 6.2, 0);
  root.add(tailFin);

  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 32, 8),
      lib.darkMetalMaterial
    );
    skid.rotation.z = Math.PI * 0.5;
    skid.position.set(2, -9.5, side * 7.5);
    root.add(skid);
  }

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 8.2, 0);
  const bladeA = new THREE.Mesh(
    new THREE.BoxGeometry(68, 0.5, 3.2),
    lib.darkMetalMaterial
  );
  const bladeB = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.5, 68),
    lib.darkMetalMaterial
  );
  mainRotor.add(bladeA, bladeB);
  root.add(mainRotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(-48, 6.5, 1.8);
  const tBlade = new THREE.Mesh(
    new THREE.BoxGeometry(13, 1.6, 0.5),
    lib.chromeMaterial
  );
  tailRotor.add(tBlade);
  root.add(tailRotor);

  const redPod = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), lib.policeRedMaterial);
  redPod.position.set(8, -7, -5);
  const bluePod = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), lib.policeBlueMaterial);
  bluePod.position.set(8, -7, 5);
  root.add(redPod, bluePod);

  // Soft volumetric Fresnel + vertical-gradient atmospheric searchlight beam (never a solid opaque cone)
  const searchConeGeo = new THREE.ConeGeometry(38, 138, 28, 1, true);
  searchConeGeo.translate(0, -69, 0);
  const searchConeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0xdeebf7) },
      uOpacity: { value: 0.21 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        // vUv.y = 1 at helicopter lamp apex, 0 at ground opening
        float verticalFade = smoothstep(0.0, 0.72, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
        float fresnel = pow(clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0), 1.85);
        float alpha = verticalFade * fresnel * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });
  const searchCone = new THREE.Mesh(searchConeGeo, searchConeMat);
  searchCone.position.set(14, -6, 0);
  searchCone.rotation.z = 0.24;
  root.add(searchCone);

  root.userData = {
    mainRotor,
    tailRotor,
    searchCone
  };

  return root;
}

/**
 * Builds a 3D luxury superyacht with warm pearl-ivory hull, teak deck, tinted bridge glass,
 * and refined coastal trim.
 */
export function buildLuxuryYachtModel3D(yacht, lib) {
  const group = new THREE.Group();
  group.position.set(yacht.x, 1.5, yacht.y);
  group.rotation.y = yacht.angle || 0;

  const hullMat = lib.getCarPaintMaterial('#d6d1c8');
  const trimMat = lib.getCarPaintMaterial(yacht.trimColor || '#2c6e80');

  const hull = new THREE.Mesh(new THREE.BoxGeometry(115, 12, 32), hullMat);
  hull.position.y = 5;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(16, 36, 4), hullMat);
  bow.rotation.z = -Math.PI * 0.5;
  bow.rotation.x = Math.PI * 0.25;
  bow.position.set(74, 5, 0);
  bow.castShadow = true;
  group.add(bow);

  const teakDeck = new THREE.Mesh(
    new THREE.BoxGeometry(108, 0.9, 29),
    lib.boardwalkMaterial
  );
  teakDeck.position.set(0, 11.2, 0);
  teakDeck.receiveShadow = true;
  group.add(teakDeck);

  const cabin1 = new THREE.Mesh(new THREE.BoxGeometry(68, 10, 25), hullMat);
  cabin1.position.set(-4, 15.5, 0);
  cabin1.castShadow = true;
  cabin1.receiveShadow = true;
  group.add(cabin1);

  const glassBridge = new THREE.Mesh(
    new THREE.BoxGeometry(44, 8, 22),
    lib.glassCanopyMaterial
  );
  glassBridge.position.set(2, 22.5, 0);
  group.add(glassBridge);

  const trimStripe = new THREE.Mesh(new THREE.BoxGeometry(96, 1.4, 32.8), trimMat);
  trimStripe.position.set(4, 9.8, 0);
  group.add(trimStripe);

  return group;
}

/**
 * Builds the seamless open-air / glass-truss 3D CLUB ECLIPSE • 21+ DISCO & VIP PAVILION.
 */
export function buildClubEclipseModel3D(bounds, lib) {
  const group = new THREE.Group();
  const cx = (bounds.x1 + bounds.x2) * 0.5;
  const cz = (bounds.y1 + bounds.y2) * 0.5;
  const W = bounds.x2 - bounds.x1;
  const D = bounds.y2 - bounds.y1;
  group.position.set(cx, 0, cz);

  const wallMat = lib.getMatteColorMaterial('#262b36', 0.76, 0.12);
  const floorMat = lib.getMatteColorMaterial('#1b2029', 0.42, 0.22);
  const velvetRedMat = lib.getMatteColorMaterial('#7c2434', 0.88, 0.02);
  const goldTrimMat = lib.getMatteColorMaterial('#c9a152', 0.36, 0.62);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, D), floorMat);
  floor.position.y = 0.16;
  floor.receiveShadow = true;
  group.add(floor);

  const wallH = 28;
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, D), wallMat);
  westWall.position.set(-W * 0.5 + 2, wallH * 0.5, 0);
  westWall.castShadow = true;
  westWall.receiveShadow = true;
  group.add(westWall);

  for (const side of [-1, 1]) {
    const nsWall = new THREE.Mesh(new THREE.BoxGeometry(W, wallH, 4), wallMat);
    nsWall.position.set(0, wallH * 0.5, side * (D * 0.5 - 2));
    nsWall.castShadow = true;
    nsWall.receiveShadow = true;
    group.add(nsWall);

    const wingLen = 54;
    const eastWing = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, wingLen), wallMat);
    eastWing.position.set(W * 0.5 - 2, wallH * 0.5, side * (D * 0.5 - wingLen * 0.5));
    eastWing.castShadow = true;
    eastWing.receiveShadow = true;
    group.add(eastWing);

    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(5.2, wallH + 2, 3.2), goldTrimMat);
    pilaster.position.set(W * 0.5 - 1.5, wallH * 0.5 + 1, side * 34);
    group.add(pilaster);
  }

  const archTop = new THREE.Mesh(new THREE.BoxGeometry(8, 7.5, 74), wallMat);
  archTop.position.set(W * 0.5 - 1, wallH - 2, 0);
  archTop.castShadow = true;
  group.add(archTop);

  const marqueeMat = lib.getShopSignMaterial(
    'CLUB ECLIPSE',
    '21+ DISCO • COCKTAILS • VIP SUITE',
    '#d996c4',
    '#e0b268'
  );
  const marqueeBoard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7.2, 58), marqueeMat);
  marqueeBoard.position.set(W * 0.5 + 3.4, wallH - 1.5, 0);
  group.add(marqueeBoard);

  const bladeMat = lib.getShopSignMaterial('CLUB ECLIPSE', 'DISCO & VIP', '#d996c4', '#e0b268');
  const bladeSign = new THREE.Mesh(new THREE.BoxGeometry(14, 6.2, 1.4), bladeMat);
  bladeSign.position.set(W * 0.5 + 9.5, wallH - 2.2, 34);
  bladeSign.castShadow = true;
  group.add(bladeSign);

  // Red Carpet & Velvet Rope Entrance
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(44, 0.25, 24), velvetRedMat);
  carpet.position.set(W * 0.5 + 6, 0.28, 0);
  carpet.receiveShadow = true;
  group.add(carpet);

  for (const side of [-1, 1]) {
    for (const rx of [W * 0.5 + 4, W * 0.5 + 16, W * 0.5 + 26]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 5.4, 8), goldTrimMat);
      post.position.set(rx, 2.7, side * 13.5);
      post.castShadow = true;
      group.add(post);
    }
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 22, 6), velvetRedMat);
    rope.rotation.z = Math.PI * 0.5;
    rope.position.set(W * 0.5 + 15, 4.4, side * 13.5);
    group.add(rope);
  }

  for (const tz of [-36, 36]) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(W - 12, 1.8, 2.0), lib.darkMetalMaterial);
    truss.position.set(0, wallH - 1.5, tz);
    group.add(truss);
  }

  // Pulsing 6x6 LED Disco Dancefloor
  const discoTiles = [];
  const discoPalette = [
    new THREE.MeshStandardMaterial({ color: 0x7c4688, emissive: 0x6c387a, emissiveIntensity: 0.72, roughness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: 0x3f8a94, emissive: 0x357c86, emissiveIntensity: 0.72, roughness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: 0xb88642, emissive: 0xa67636, emissiveIntensity: 0.72, roughness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: 0xa44662, emissive: 0x943854, emissiveIntensity: 0.72, roughness: 0.22 })
  ];
  const tileGeo = new THREE.BoxGeometry(12.2, 0.32, 12.2);
  for (let gx = 0; gx < 6; gx++) {
    for (let gz = 0; gz < 6; gz++) {
      const mat = discoPalette[(gx + gz) % discoPalette.length];
      const tile = new THREE.Mesh(tileGeo, mat);
      tile.position.set(10 + (gx - 2.5) * 13.0, 0.36, (gz - 2.5) * 13.0);
      tile.receiveShadow = true;
      tile.userData = { gx, gz };
      group.add(tile);
      discoTiles.push(tile);
    }
  }

  // Elevated DJ Booth + Spinning Turntables + Subwoofer Speaker Stacks
  const djStage = new THREE.Mesh(new THREE.BoxGeometry(22, 4.2, 54), lib.graniteTrimMaterial);
  djStage.position.set(-54, 2.1, 0);
  djStage.castShadow = true;
  djStage.receiveShadow = true;
  group.add(djStage);

  const djDeck = new THREE.Mesh(new THREE.BoxGeometry(8, 6.2, 24), lib.darkMetalMaterial);
  djDeck.position.set(-48, 7.2, 0);
  djDeck.castShadow = true;
  group.add(djDeck);

  const turntables = [];
  for (const tz of [-5.5, 5.5]) {
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.45, 14), lib.chromeMaterial);
    platter.position.set(-48, 10.5, tz);
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.55, 14), lib.tireRubberMaterial);
    vinyl.position.set(0, 0.08, 0);
    const label = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.62, 0.4), goldTrimMat);
    platter.add(vinyl, label);
    group.add(platter);
    turntables.push(platter);
  }

  for (const sz of [-30, 30]) {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(10, 22, 14), lib.darkMetalMaterial);
    stack.position.set(-58, 11, sz);
    stack.castShadow = true;
    group.add(stack);
    for (const cy of [6.5, 15.5]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.2, 0.8, 14), lib.tireRubberMaterial);
      cone.rotation.z = Math.PI * 0.5;
      cone.position.set(-52.8, cy, sz);
      group.add(cone);
    }
  }

  // Sweeping Translucent Volumetric Disco Laser Beams
  const laserBeams = [];
  const beamColors = [0xc97cb8, 0x5eb8c4, 0xe0b268, 0xd46a88];
  const beamGeo = new THREE.ConeGeometry(16, 48, 18, 1, true);
  beamGeo.translate(0, -24, 0);
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(i < 2 ? -22 : 34, wallH - 2, i % 2 === 0 ? -34 : 34);
    const bMat = new THREE.MeshBasicMaterial({
      color: beamColors[i],
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const cone = new THREE.Mesh(beamGeo, bMat);
    pivot.add(cone);
    group.add(pivot);
    laserBeams.push(pivot);
  }

  // Backlit Cocktail Bar (South Wing)
  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(58, 6.4, 8), lib.boardwalkMaterial);
  barCounter.position.set(10, 3.2, 62);
  barCounter.castShadow = true;
  group.add(barCounter);

  const barShelf = new THREE.Mesh(new THREE.BoxGeometry(50, 12, 2.4), lib.getShopWindowMaterial('cafe'));
  barShelf.position.set(10, 10, 81);
  group.add(barShelf);

  const barSign = new THREE.Mesh(
    new THREE.BoxGeometry(24, 3.6, 0.9),
    lib.getShopSignMaterial('ECLIPSE BAR', 'COCKTAILS • CHAMPAGNE [E]', '#d996c4', '#e0b268')
  );
  barSign.position.set(10, 18.5, 81.5);
  group.add(barSign);

  for (let s = -2; s <= 2; s++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 4.4, 10), lib.darkMetalMaterial);
    stool.position.set(10 + s * 10, 2.2, 54);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.7, 10), velvetRedMat);
    cushion.position.set(10 + s * 10, 4.7, 54);
    group.add(stool, cushion);
  }

  // Velvet-Curtained 21+ VIP Private Suite (North-West Lounge)
  const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(66, 0.4, 42), velvetRedMat);
  vipFloor.position.set(-40, 0.35, -62);
  group.add(vipFloor);

  const daybedBase = new THREE.Mesh(new THREE.BoxGeometry(26, 3.6, 14), velvetRedMat);
  daybedBase.position.set(-48, 2.1, -72);
  daybedBase.castShadow = true;
  const daybedBack = new THREE.Mesh(new THREE.BoxGeometry(26, 7.2, 3.2), velvetRedMat);
  daybedBack.position.set(-48, 5.4, -78);
  group.add(daybedBase, daybedBack);

  const vipTable = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 4.0, 12), goldTrimMat);
  vipTable.position.set(-30, 2.0, -70);
  group.add(vipTable);

  for (const cxOff of [-68, -12]) {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(10, 22, 2.2), velvetRedMat);
    drape.position.set(cxOff, 11, -43);
    group.add(drape);
  }

  const vipSign = new THREE.Mesh(
    new THREE.BoxGeometry(26, 4.0, 0.9),
    lib.getShopSignMaterial('VIP PRIVATE SUITE', '21+ EXCLUSIVE LOUNGE [E]', '#d97c8c', '#e0b268')
  );
  vipSign.position.set(-40, 20.5, -42.2);
  group.add(vipSign);

  const vipLight = new THREE.PointLight(0xd96b7c, 4.5, 95);
  vipLight.position.set(-44, 15, -64);
  group.add(vipLight);

  group.userData = { discoTiles, discoPalette, turntables, laserBeams };
  return group;
}

/**
 * Builds Palm Harbor Docks container stacks and tall industrial gantry cargo cranes.
 */
export function buildHarborYardModel3D(yard, lib) {
  const group = new THREE.Group();
  group.position.set(yard.x, 0, yard.y);

  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(yard.w, 0.35, yard.h),
    lib.graniteTrimMaterial
  );
  pad.position.y = 0.14;
  pad.receiveShadow = true;
  group.add(pad);

  const containerColors = ['#9e4b45', '#3f6a7d', '#b88b48', '#4d7260', '#5a5f6b'];
  const cGeo = new THREE.BoxGeometry(18, 12, 42);
  let ci = 0;
  for (const sx of [-36, 36]) {
    for (const sz of [-24, 24]) {
      const levels = ((ci + 1) % 2) + 1;
      for (let lv = 0; lv < levels; lv++) {
        const cont = new THREE.Mesh(
          cGeo,
          lib.getMatteColorMaterial(containerColors[ci % containerColors.length], 0.72, 0.25)
        );
        cont.position.set(sx, 6.2 + lv * 12.2, sz);
        cont.castShadow = true;
        cont.receiveShadow = true;
        group.add(cont);
        ci++;
      }
    }
  }

  if (yard.hasCrane) {
    const craneMat = lib.getMatteColorMaterial('#b8893a', 0.56, 0.32);
    for (const lx of [-54, 54]) {
      for (const lz of [-36, 36]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(3.2, 66, 3.2), craneMat);
        leg.position.set(lx, 33, lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(126, 4.8, 16), craneMat);
    bridge.position.set(0, 66, 0);
    bridge.castShadow = true;
    group.add(bridge);
  }

  return group;
}
