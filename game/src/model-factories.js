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

  // 2. Refined Racing Stripe / Two-Tone Trim along hood & decklid
  const stripeGeo = new THREE.BoxGeometry(L * 0.92, 0.4, W * 0.2);
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  stripeMesh.position.set(0, veh.isHeavy ? H * 0.98 : H * 0.55, 0);
  stripeMesh.castShadow = true;
  stripeMesh.receiveShadow = true;
  bodyGroup.add(stripeMesh);

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

  root.userData = {
    bodyGroup,
    wheels,
    nitroGroup,
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

  // Subtle dark-tinted aviator sunglasses
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

  root.add(headGroup);

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

    return armPivot;
  }

  const leftArmPivot = buildArticulatedArm(-1);
  const rightArmPivot = buildArticulatedArm(1);
  root.add(leftArmPivot, rightArmPivot);

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(3.4, -4.6, -0.3);

  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 1.45, 0.95),
    lib.darkMetalMaterial
  );
  receiver.castShadow = true;
  weaponGroup.add(receiver);

  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.35, 0.65),
    lib.chromeMaterial
  );
  topRail.position.set(0.2, 0.88, 0);
  weaponGroup.add(topRail);

  const opticSight = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.85, 0.75),
    lib.darkMetalMaterial
  );
  opticSight.position.set(-0.2, 1.35, 0);
  weaponGroup.add(opticSight);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 4.2, 10),
    lib.chromeMaterial
  );
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.set(3.9, 0.25, 0);
  weaponGroup.add(barrel);

  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 2.5, 0.78),
    lib.darkMetalMaterial
  );
  magazine.position.set(0.6, -1.45, 0);
  magazine.rotation.z = 0.26;
  weaponGroup.add(magazine);

  // Crisp soft star-burst muzzle flash billboard (zero boxy octahedron artifacts)
  const muzzleMat = new THREE.SpriteMaterial({
    map: lib.muzzleStarTex,
    color: 0xf6cf88,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const muzzleFlashMesh = new THREE.Sprite(muzzleMat);
  muzzleFlashMesh.scale.set(4.8, 4.8, 1);
  muzzleFlashMesh.position.set(6.3, 0.25, 0);
  muzzleFlashMesh.visible = false;
  weaponGroup.add(muzzleFlashMesh);

  rightArmPivot.add(weaponGroup);

  root.userData = {
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    torsoGroup,
    headGroup,
    weaponGroup,
    muzzleFlashMesh
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
  const facadeMat = lib.getBuildingMaterial(b.styleIndex, b.variant || 0);
  const isModernGlass = b.styleIndex === 1;
  const trimMat = isModernGlass || b.styleIndex === 3 ? lib.graniteTrimMaterial : lib.stoneTrimMaterial;

  // 1. Ground-floor architectural retail podium + tinted storefront glazing
  const podiumH = Math.min(20, H * 0.22);
  const podiumMesh = new THREE.Mesh(
    new THREE.BoxGeometry(b.w, podiumH, b.h),
    trimMat
  );
  podiumMesh.position.y = podiumH * 0.5;
  podiumMesh.castShadow = true;
  podiumMesh.receiveShadow = true;
  group.add(podiumMesh);

  // Recessed tinted retail shopfront windows along lower podium
  const shopfrontMesh = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 0.5, podiumH * 0.58, b.h - 10),
    lib.retailGlassMaterial
  );
  shopfrontMesh.position.y = podiumH * 0.42;
  group.add(shopfrontMesh);

  const shopfrontZ = new THREE.Mesh(
    new THREE.BoxGeometry(b.w - 10, podiumH * 0.58, b.h + 0.5),
    lib.retailGlassMaterial
  );
  shopfrontZ.position.y = podiumH * 0.42;
  group.add(shopfrontZ);

  // Clean architectural limestone/granite podium cornice ledge
  const corniceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 3.0, 2.2, b.h + 3.0),
    trimMat
  );
  corniceMesh.position.y = podiumH + 0.8;
  corniceMesh.castShadow = true;
  corniceMesh.receiveShadow = true;
  group.add(corniceMesh);

  // Tasteful striped coastal retail awnings on Art-Deco hotels & boutique condos
  if (b.styleIndex === 0 || b.styleIndex === 2) {
    const awningMat = (b.variant || 0) % 2 === 0 ? lib.awningCoralMaterial : lib.awningTealMaterial;
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

    // Subtle wooden beach lounger beside umbrella
    const lounger = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 1.1, 3.4),
      lib.stoneTrimMaterial
    );
    lounger.position.set(2.5, 0.9, 5.2);
    lounger.castShadow = true;
    group.add(lounger);
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
