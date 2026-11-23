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
 * Builds an authored multi-part 3D vehicle model with an extruded aerodynamic
 * clearcoat chassis, racing stripe, tapered glass canopy, A/B/C pillars, wing mirrors,
 * rear spoiler, 4 articulated 5-spoke wheels, headlights, brake lights, nitro flame cones,
 * and police lightbars.
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

  const paintMat = lib.getCarPaintMaterial(veh.color || '#ff1e74');
  const stripeMat = lib.getCarPaintMaterial(veh.stripeColor || '#ffffff');

  // 1. Sculpted side-profile lower body using ExtrudeGeometry
  const shape = new THREE.Shape();
  if (veh.isHeavy) {
    // Armored tactical van / bullion truck silhouette
    shape.moveTo(-halfL, 2.2);
    shape.lineTo(halfL - 2, 2.2);
    shape.lineTo(halfL, 4.5);
    shape.lineTo(halfL - 1.5, H * 0.62);
    shape.lineTo(halfL - 8, H * 0.96);
    shape.lineTo(-halfL + 3, H * 0.96);
    shape.lineTo(-halfL, H * 0.72);
    shape.closePath();
  } else {
    // Wedge supercar / sports coupe aerodynamic silhouette
    shape.moveTo(-halfL + 1.5, 2.4);
    shape.lineTo(halfL - 1.0, 2.0);
    // Sloped wedge nose & splitter intake
    shape.lineTo(halfL + 0.6, 3.8);
    shape.lineTo(halfL - 2.2, H * 0.44);
    // Hood contour to base of windshield
    shape.lineTo(halfL * 0.36, H * 0.54);
    // Dip across cabin beltline
    shape.lineTo(-halfL * 0.28, H * 0.56);
    // Raised rear haunch & decklid
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

  // 2. Contrasting Racing Stripe along hood and rear deck
  const stripeGeo = new THREE.BoxGeometry(L * 0.92, 0.45, W * 0.22);
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  stripeMesh.position.set(0, veh.isHeavy ? H * 0.98 : H * 0.55, 0);
  stripeMesh.castShadow = true;
  bodyGroup.add(stripeMesh);

  // 3. Carbon Front Splitter & Rear Diffuser
  const splitterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.8, W * 0.96),
    lib.darkMetalMaterial
  );
  splitterMesh.position.set(halfL - 1.2, 1.9, 0);
  bodyGroup.add(splitterMesh);

  const diffuserMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.4, W * 0.88),
    lib.darkMetalMaterial
  );
  diffuserMesh.position.set(-halfL + 1.4, 2.4, 0);
  bodyGroup.add(diffuserMesh);

  // Dual Chrome Exhaust Tips
  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2.6, 10),
      lib.chromeMaterial
    );
    exhaust.rotation.z = Math.PI * 0.5;
    exhaust.position.set(-halfL - 0.3, 2.5, side * (halfW * 0.45));
    bodyGroup.add(exhaust);
  }

  // 4. Tapered Glass Cabin Canopy or Convertible Open Cockpit
  if (!veh.isHeavy) {
    if (veh.isConvertible) {
      // Sloped windshield frame + dark interior bucket seats
      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, H * 0.42, W * 0.78),
        lib.glassCanopyMaterial
      );
      windshield.position.set(L * 0.14, H * 0.72, 0);
      windshield.rotation.z = 0.48;
      bodyGroup.add(windshield);

      for (const s of [-1, 1]) {
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, 4.8, 5.2),
          lib.darkMetalMaterial
        );
        seat.position.set(-L * 0.04, H * 0.62, s * (W * 0.2));
        bodyGroup.add(seat);
      }
    } else {
      // Sculpted aerodynamic greenhouse canopy
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
      bodyGroup.add(cabinMesh);

      // Painted roof cap panel
      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.28, 0.6, W * 0.68),
        paintMat
      );
      roofCap.position.set(-L * 0.07, H * 0.99, 0);
      bodyGroup.add(roofCap);
    }
  } else {
    // Heavy truck / SWAT armored windshield visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, H * 0.26, W * 0.82),
      lib.glassCanopyMaterial
    );
    visor.position.set(halfL - 4.2, H * 0.74, 0);
    bodyGroup.add(visor);
  }

  // 5. Side Wing Mirrors
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.2), paintMat);
    mirror.position.set(L * 0.16, H * 0.58, side * (halfW + 0.7));
    bodyGroup.add(mirror);
  }

  // 6. Rear Aerodynamic Spoiler Wing on Twin Struts
  if (veh.hasSpoiler) {
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 3.2, 0.8),
        lib.darkMetalMaterial
      );
      strut.position.set(-halfL + 3.2, H * 0.68, side * (W * 0.28));
      bodyGroup.add(strut);
    }
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.7, W * 0.94),
      paintMat
    );
    wing.position.set(-halfL + 2.8, H * 0.84, 0);
    wing.rotation.z = -0.1;
    wing.castShadow = true;
    bodyGroup.add(wing);
  }

  // 7. Front LED Headlights + Additive Ground Beams + Rear LED Taillight Bar
  for (const side of [-1, 1]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.1, 4.4),
      lib.headlightMaterial
    );
    headlight.position.set(halfL + 0.1, H * 0.34, side * (halfW * 0.58));
    bodyGroup.add(headlight);
  }

  // Subtle volumetric ground headlight cone
  const coneGeo = new THREE.ConeGeometry(16, 48, 12, 1, true);
  coneGeo.rotateZ(Math.PI * 0.5);
  coneGeo.translate(halfL + 24, 1.4, 0);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c4,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const lightCone = new THREE.Mesh(coneGeo, coneMat);
  bodyGroup.add(lightCone);

  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.3, W * 0.84),
    lib.taillightMaterial
  );
  tailBar.position.set(-halfL - 0.1, H * 0.42, 0);
  bodyGroup.add(tailBar);

  // 8. Twin 3D Nitro Afterburner Flame Cones
  const nitroGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const outerCone = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 13, 10),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    outerCone.rotation.z = Math.PI * 0.5;
    outerCone.position.set(-halfL - 6.5, 2.6, side * (halfW * 0.45));
    nitroGroup.add(outerCone);

    const innerCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 8.5, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    innerCone.rotation.z = Math.PI * 0.5;
    innerCone.position.set(-halfL - 4.5, 2.6, side * (halfW * 0.45));
    nitroGroup.add(innerCone);
  }
  nitroGroup.visible = false;
  bodyGroup.add(nitroGroup);

  // 9. Police Push-Bar & Roof Siren Lightbar
  let sirenLight = null;
  let sirenRedPod = null;
  let sirenBluePod = null;
  if (veh.isPolice) {
    const pushBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 4.5, W * 0.55),
      lib.darkMetalMaterial
    );
    pushBar.position.set(halfL + 0.9, 3.4, 0);
    bodyGroup.add(pushBar);

    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.1, W * 0.62),
      lib.chromeMaterial
    );
    barBase.position.set(-L * 0.04, H + 0.7, 0);
    bodyGroup.add(barBase);

    sirenRedPod = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.3, W * 0.26),
      lib.policeRedMaterial
    );
    sirenRedPod.position.set(-L * 0.04, H + 1.0, -W * 0.16);
    bodyGroup.add(sirenRedPod);

    sirenBluePod = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.3, W * 0.26),
      lib.policeBlueMaterial
    );
    sirenBluePod.position.set(-L * 0.04, H + 1.0, W * 0.16);
    bodyGroup.add(sirenBluePod);

    sirenLight = new THREE.PointLight(0xff0044, 18, 95);
    sirenLight.position.set(0, H + 4.5, 0);
    bodyGroup.add(sirenLight);
  }

  // 10. Four Articulated 3D Wheels (Tire + 5-Spoke Metallic Rim)
  const wheels = [];
  const wheelRadius = veh.isHeavy ? 4.4 : 3.6;
  const wheelWidth = veh.isHeavy ? 3.4 : 2.8;
  const axleX = L * 0.31;
  const axleZ = halfW - 0.6;

  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
  tireGeo.rotateX(Math.PI * 0.5);
  const hubGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.65,
    wheelRadius * 0.65,
    wheelWidth + 0.3,
    12
  );
  hubGeo.rotateX(Math.PI * 0.5);

  const wheelCoords = [
    { x: axleX, z: -axleZ, isFront: true },
    { x: axleX, z: axleZ, isFront: true },
    { x: -axleX, z: -axleZ, isFront: false },
    { x: -axleX, z: axleZ, isFront: false }
  ];

  for (const wc of wheelCoords) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wc.x, wheelRadius, wc.z);

    const spinGroup = new THREE.Group();
    const tireMesh = new THREE.Mesh(tireGeo, lib.tireRubberMaterial);
    tireMesh.castShadow = true;
    spinGroup.add(tireMesh);

    const hubMesh = new THREE.Mesh(hubGeo, lib.chromeMaterial);
    spinGroup.add(hubMesh);

    // 5-Spoke cross bars for visible wheel rotation
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(wheelRadius * 1.25, 0.65, wheelWidth + 0.45),
        lib.darkMetalMaterial
      );
      spoke.rotation.y = (s * Math.PI) / 3;
      spinGroup.add(spoke);
    }

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
 * Builds an articulated 3D humanoid character rig with 8 pivot groups,
 * open-collar Vice jacket, aviator sunglasses, and a 3D firearm + muzzle flash star.
 */
export function buildCharacterModel3D(person, lib) {
  const root = new THREE.Group();

  const jacketMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.jacketColor || '#ff2a85'),
    roughness: 0.42,
    metalness: 0.15
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.shirtColor || '#00f0ff'),
    roughness: 0.55
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.pantsColor || '#1e293b'),
    roughness: 0.65
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.skinColor || '#eab396'),
    roughness: 0.55
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.hairColor || '#111827'),
    roughness: 0.7
  });

  // Left & Right Articulated Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(0, 7.2, -1.6);
  const leftLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.0, 7.2, 10),
    pantsMat
  );
  leftLegMesh.position.y = -3.6;
  leftLegMesh.castShadow = true;
  leftLegPivot.add(leftLegMesh);
  root.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0, 7.2, 1.6);
  const rightLegMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.0, 7.2, 10),
    pantsMat
  );
  rightLegMesh.position.y = -3.6;
  rightLegMesh.castShadow = true;
  rightLegPivot.add(rightLegMesh);
  root.add(rightLegPivot);

  // Torso & Open-Collar Vice Jacket
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 10.8, 0);

  const jacketMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 7.2, 5.6), jacketMat);
  jacketMesh.castShadow = true;
  torsoGroup.add(jacketMesh);

  const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(4.0, 6.4, 2.2), shirtMat);
  shirtFront.position.x = 0.15;
  torsoGroup.add(shirtFront);

  root.add(torsoGroup);

  // Sculpted Head, Hair & Aviator Sunglasses Visor
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 16.4, 0);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 12), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 4.4), hairMat);
  hairCap.position.set(-0.2, 1.4, 0);
  headGroup.add(hairCap);

  // Glossy Aviator Visor facing +X
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.95, 3.6),
    lib.glassCanopyMaterial
  );
  visor.position.set(1.8, 0.3, 0);
  headGroup.add(visor);

  root.add(headGroup);

  // Left Arm Pivot
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(0, 13.8, -3.5);
  const leftArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 0.85, 6.2, 10),
    jacketMat
  );
  leftArmMesh.position.y = -2.8;
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  root.add(leftArmPivot);

  // Right Arm Pivot + 3D Weapon Assembly
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0, 13.8, 3.5);
  const rightArmMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 0.85, 6.2, 10),
    jacketMat
  );
  rightArmMesh.position.y = -2.8;
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);

  // Detailed 3D Firearm held forward along +X
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(3.2, -3.2, 0);

  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 1.4, 0.9),
    lib.darkMetalMaterial
  );
  weaponGroup.add(receiver);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 3.8, 8),
    lib.chromeMaterial
  );
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.set(3.6, 0.25, 0);
  weaponGroup.add(barrel);

  const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.2, 0.75),
    lib.darkMetalMaterial
  );
  magazine.position.set(0.4, -1.3, 0);
  magazine.rotation.z = 0.25;
  weaponGroup.add(magazine);

  // 3D Muzzle Flash Star
  const muzzleFlashMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.1, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    })
  );
  muzzleFlashMesh.position.set(6.2, 0.25, 0);
  muzzleFlashMesh.visible = false;
  weaponGroup.add(muzzleFlashMesh);

  rightArmPivot.add(weaponGroup);
  root.add(rightArmPivot);

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
 * Builds an authored multi-tiered 3D skyscraper / Art-Deco resort / casino / warehouse
 * with a lobby podium, textured window + emissive facade, glowing vertical neon corner columns,
 * upper penthouse crown, rooftop HVAC units, helipad, communication spire, and 3D Neon Marquee Sign.
 */
export function buildSkyscraperModel3D(b, lib) {
  const group = new THREE.Group();
  const cx = b.x + b.w * 0.5;
  const cz = b.y + b.h * 0.5;
  group.position.set(cx, 0, cz);

  const H = b.height3D || 110;
  const facadeMat = lib.buildingMaterials[b.styleIndex % lib.buildingMaterials.length];
  const neonMat =
    b.neonColor === '#00f0ff'
      ? lib.neonCyanMaterial
      : b.neonColor === '#fde047'
        ? lib.neonGoldMaterial
        : lib.neonPinkMaterial;

  // 1. Ground-floor architectural podium base + glowing storefront canopy
  const podiumH = Math.min(22, H * 0.22);
  const podiumMesh = new THREE.Mesh(
    new THREE.BoxGeometry(b.w, podiumH, b.h),
    facadeMat
  );
  podiumMesh.position.y = podiumH * 0.5;
  podiumMesh.castShadow = true;
  podiumMesh.receiveShadow = true;
  group.add(podiumMesh);

  // Glowing neon canopy trim around the podium
  const canopyTrim = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 3.2, 1.8, b.h + 3.2),
    neonMat
  );
  canopyTrim.position.y = podiumH + 0.5;
  group.add(canopyTrim);

  // 2. Main Tower Shaft
  const mainW = b.w * 0.88;
  const mainD = b.h * 0.88;
  const mainH = H - podiumH;
  const towerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(mainW, mainH, mainD),
    facadeMat
  );
  towerMesh.position.y = podiumH + mainH * 0.5;
  towerMesh.castShadow = true;
  towerMesh.receiveShadow = true;
  group.add(towerMesh);

  // 3. Four Vertical Neon Corner Fin Columns
  const colW = 2.4;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(colW, H + 2, colW),
        neonMat
      );
      col.position.set(sx * (mainW * 0.5), (H + 2) * 0.5, sz * (mainD * 0.5));
      group.add(col);
    }
  }

  // 4. Upper Setback Penthouse Crown Tier & Glowing Parapet
  const crownW = mainW * 0.68;
  const crownD = mainD * 0.68;
  const crownH = Math.min(26, H * 0.18);
  const crownMesh = new THREE.Mesh(
    new THREE.BoxGeometry(crownW, crownH, crownD),
    facadeMat
  );
  crownMesh.position.y = H + crownH * 0.5;
  crownMesh.castShadow = true;
  group.add(crownMesh);

  const crownNeon = new THREE.Mesh(
    new THREE.BoxGeometry(crownW + 2.4, 2.0, crownD + 2.4),
    neonMat
  );
  crownNeon.position.y = H + crownH + 0.8;
  group.add(crownNeon);

  // 5. Rooftop HVAC Chillers & Communication Spire Mast
  const roofY = H + crownH + 1.8;
  const hvacA = new THREE.Mesh(
    new THREE.BoxGeometry(12, 7, 10),
    lib.darkMetalMaterial
  );
  hvacA.position.set(-crownW * 0.22, roofY + 3.5, -crownD * 0.18);
  group.add(hvacA);

  if (H >= 135) {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.8, 34, 8),
      lib.chromeMaterial
    );
    spire.position.set(crownW * 0.2, roofY + 17, crownD * 0.2);
    group.add(spire);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      lib.policeRedMaterial
    );
    beacon.position.set(crownW * 0.2, roofY + 34, crownD * 0.2);
    group.add(beacon);
  }

  // 6. Large 3D Rooftop / Facade Neon Marquee Sign
  if (b.signText) {
    const signMat = lib.getNeonSignMaterial(
      b.signText,
      b.neonColor || '#ff2a85',
      b.trimColor || '#00f0ff'
    );
    const signW = Math.min(b.w * 0.85, 68);
    const signH = 17;
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 2.6),
      signMat
    );
    // Mount facing street + roof skyline
    signBoard.position.set(0, podiumH + Math.min(44, mainH * 0.45), mainD * 0.5 + 1.8);
    group.add(signBoard);

    // Second rooftop sky-marquee on landmark buildings
    const roofSign = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 2.6),
      signMat
    );
    roofSign.position.set(0, roofY + signH * 0.5 + 1, 0);
    roofSign.rotation.y = b.signAngle || 0;
    group.add(roofSign);
  }

  return group;
}

/**
 * Builds an organic curved 7-segment 3D palm tree with coconuts and 9 arched
 * ExtrudeGeometry 3D frond blades.
 */
export function buildPalmTreeModel3D(tree, lib) {
  const group = new THREE.Group();
  group.position.set(tree.x, 0, tree.y);

  const scale = tree.scale || 1.0;
  const leanAngle = tree.leanAngle || 0;
  const trunkGroup = new THREE.Group();
  trunkGroup.rotation.y = leanAngle;
  group.add(trunkGroup);

  // 7-segment curved trunk
  const segments = 7;
  const segH = 5.4 * scale;
  let curX = 0;
  let curY = 0;
  let curTilt = 0.06;

  for (let i = 0; i < segments; i++) {
    const rBottom = (2.1 - i * 0.17) * scale;
    const rTop = (1.92 - i * 0.17) * scale;
    const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segH, 9);
    const segMesh = new THREE.Mesh(segGeo, lib.palmTrunkMaterial);
    segMesh.position.set(curX + Math.sin(curTilt) * (segH * 0.5), curY + Math.cos(curTilt) * (segH * 0.5), 0);
    segMesh.rotation.z = -curTilt;
    segMesh.castShadow = true;
    trunkGroup.add(segMesh);

    curX += Math.sin(curTilt) * segH;
    curY += Math.cos(curTilt) * segH;
    curTilt += 0.038;
  }

  // Crown group at top of curved trunk
  const crownGroup = new THREE.Group();
  crownGroup.position.set(curX, curY, 0);
  trunkGroup.add(crownGroup);

  // Arched 3D frond blade geometry
  const frondShape = new THREE.Shape();
  frondShape.moveTo(0, 0);
  frondShape.quadraticCurveTo(8 * scale, 3.6 * scale, 18 * scale, -3.5 * scale);
  frondShape.quadraticCurveTo(9 * scale, 1.1 * scale, 0, -0.6 * scale);
  frondShape.closePath();

  const frondGeo = new THREE.ExtrudeGeometry(frondShape, {
    depth: 3.4 * scale,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.25 * scale,
    bevelThickness: 0.25 * scale
  });
  frondGeo.translate(0, 0, -1.7 * scale);

  const frondCount = 9;
  for (let f = 0; f < frondCount; f++) {
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = (f * Math.PI * 2) / frondCount;
    frondPivot.rotation.z = (f % 2 === 0 ? 0.18 : -0.14);

    const frondMesh = new THREE.Mesh(frondGeo, lib.palmFrondMaterial);
    frondMesh.castShadow = true;
    frondPivot.add(frondMesh);
    crownGroup.add(frondPivot);
  }

  return group;
}

/**
 * Builds the 3D VCPD Police Helicopter with fuselage, cockpit glass bubble,
 * landing skids, tail boom, spinning main & tail rotors, red/blue belly strobes,
 * and a volumetric additive searchlight cone reaching down to the city street.
 */
export function buildHelicopterModel3D(lib) {
  const root = new THREE.Group();
  const bodyMat = lib.getCarPaintMaterial('#0f172a');
  const stripeMat = lib.getCarPaintMaterial('#f8fafc');

  // Fuselage cabin
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(36, 13, 16), bodyMat);
  fuselage.castShadow = true;
  root.add(fuselage);

  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(28, 3.2, 16.6), stripeMat);
  root.add(sideStripe);

  // Rounded glass cockpit nose
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(8.2, 14, 12),
    lib.glassCanopyMaterial
  );
  cockpit.position.set(15, -0.5, 0);
  cockpit.scale.set(1.3, 0.85, 0.95);
  root.add(cockpit);

  // Tail boom & vertical fin
  const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(34, 4.2, 4.2), bodyMat);
  tailBoom.position.set(-32, 2.2, 0);
  root.add(tailBoom);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(7, 11, 1.8), stripeMat);
  tailFin.position.set(-47, 6.2, 0);
  root.add(tailFin);

  // Twin Landing Skids
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 32, 8),
      lib.darkMetalMaterial
    );
    skid.rotation.z = Math.PI * 0.5;
    skid.position.set(2, -9.5, side * 7.5);
    root.add(skid);
  }

  // Spinning Main 4-Blade Rotor
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

  // Spinning Tail Rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-48, 6.5, 1.8);
  const tBlade = new THREE.Mesh(
    new THREE.BoxGeometry(13, 1.6, 0.5),
    lib.chromeMaterial
  );
  tailRotor.add(tBlade);
  root.add(tailRotor);

  // Belly Police Strobe Pods
  const redPod = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 8), lib.policeRedMaterial);
  redPod.position.set(8, -7, -5);
  const bluePod = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 8), lib.policeBlueMaterial);
  bluePod.position.set(8, -7, 5);
  root.add(redPod, bluePod);

  // Volumetric Additive Searchlight Cone reaching down to the street
  const searchConeGeo = new THREE.ConeGeometry(44, 155, 20, 1, true);
  searchConeGeo.translate(0, -78, 0);
  const searchConeMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
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
 * Builds a 3D luxury superyacht for Starfish Bay Marina & Ocean Drive waters.
 */
export function buildLuxuryYachtModel3D(yacht, lib) {
  const group = new THREE.Group();
  group.position.set(yacht.x, 1.5, yacht.y);
  group.rotation.y = yacht.angle || 0;

  const hullMat = lib.getCarPaintMaterial('#f8fafc');
  const trimMat = lib.getCarPaintMaterial(yacht.trimColor || '#00f0ff');

  const hull = new THREE.Mesh(new THREE.BoxGeometry(115, 12, 32), hullMat);
  hull.position.y = 5;
  hull.castShadow = true;
  group.add(hull);

  // Pointed bow prow
  const bow = new THREE.Mesh(new THREE.ConeGeometry(16, 36, 4), hullMat);
  bow.rotation.z = -Math.PI * 0.5;
  bow.rotation.x = Math.PI * 0.25;
  bow.position.set(74, 5, 0);
  group.add(bow);

  // Multi-deck cabin superstructure
  const cabin1 = new THREE.Mesh(new THREE.BoxGeometry(68, 10, 25), hullMat);
  cabin1.position.set(-4, 15, 0);
  cabin1.castShadow = true;
  group.add(cabin1);

  const glassBridge = new THREE.Mesh(
    new THREE.BoxGeometry(44, 8, 22),
    lib.glassCanopyMaterial
  );
  glassBridge.position.set(2, 22, 0);
  group.add(glassBridge);

  const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(96, 1.4, 33), trimMat);
  neonStrip.position.set(4, 10.5, 0);
  group.add(neonStrip);

  return group;
}
