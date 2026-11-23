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
 * Builds an authored, rounded multi-part 3D humanoid character rig with 8 pivot groups,
 * tapered thigh/shin/sneaker limbs, utility belt with chrome buckle & holster,
 * layered V-neck tee + open-collar tailored Vice jacket with shoulder pads,
 * sculpted head with hair crest & wrap-around aviator sunglasses, and a detailed 3D firearm + muzzle flash star.
 */
export function buildCharacterModel3D(person, lib) {
  const root = new THREE.Group();

  const jacketMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(person.jacketColor || '#ff1e74'),
    roughness: 0.34,
    metalness: 0.18,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.shirtColor || '#00f0ff'),
    roughness: 0.5
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.pantsColor || '#1e293b'),
    roughness: 0.62
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.skinColor || '#eab396'),
    roughness: 0.48
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.hairColor || '#111827'),
    roughness: 0.65
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4
  });

  function buildArticulatedLeg(sideSign) {
    const legPivot = new THREE.Group();
    legPivot.position.set(0, 7.6, sideSign * 1.55);

    // Tapered upper thigh
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.12, 2.3, 6, 12),
      pantsMat
    );
    thigh.position.set(0, -1.7, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Rounded knee joint
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.96, 10, 8), pantsMat);
    knee.position.set(0.1, -3.5, 0);
    legPivot.add(knee);

    // Tapered lower shin/calf
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.76, 3.3, 12),
      pantsMat
    );
    shin.position.set(0, -5.1, 0);
    shin.castShadow = true;
    legPivot.add(shin);

    // Sculpted sneaker with white sole & rounded toe cap
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

  // Torso, Pelvis, Tactical Belt & Tailored Open-Collar Vice Jacket
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 11.2, 0);

  // Rounded pelvis & tactical belt with chrome buckle + side holster
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

  // Tapered athletic inner V-neck shirt torso
  const innerTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 1.95, 5.8, 16),
    shirtMat
  );
  innerTorso.scale.set(0.82, 1, 1.26);
  innerTorso.position.y = 0.5;
  innerTorso.castShadow = true;
  torsoGroup.add(innerTorso);

  // Open-front tailored Vice jacket back & left/right front lapel panels
  const jacketBack = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.1, 6.0, 14, 1, false, Math.PI * 0.25, Math.PI * 1.5),
    jacketMat
  );
  jacketBack.scale.set(0.86, 1, 1.32);
  jacketBack.position.y = 0.55;
  jacketBack.castShadow = true;
  torsoGroup.add(jacketBack);

  for (const side of [-1, 1]) {
    // Front jacket lapel panel
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 5.8, 1.65),
      jacketMat
    );
    lapel.position.set(1.15, 0.55, side * 1.85);
    lapel.rotation.y = side * -0.18;
    lapel.castShadow = true;
    torsoGroup.add(lapel);

    // Contoured shoulder pad
    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 12, 10),
      jacketMat
    );
    shoulderCap.scale.set(1.05, 0.82, 1.15);
    shoulderCap.position.set(0.1, 3.1, side * 2.95);
    shoulderCap.castShadow = true;
    torsoGroup.add(shoulderCap);
  }

  // Popped Vice jacket collar
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 1.35, 12, 1, true, Math.PI * 0.3, Math.PI * 1.4),
    jacketMat
  );
  collar.position.set(-0.1, 3.65, 0);
  torsoGroup.add(collar);

  root.add(torsoGroup);

  // Sculpted Head, Neck, Swept Hair Crest & Wrap-Around Aviator Sunglasses
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

  // Swept-back Vice hair crown & textured crest
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

  // Wrap-around Aviator Sunglasses (twin angled lenses + chrome brow bar)
  const browBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.22, 3.3),
    lib.chromeMaterial
  );
  browBar.position.set(1.68, 0.52, 0);
  headGroup.add(browBar);

  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 10, 8),
      lib.glassCanopyMaterial
    );
    lens.scale.set(0.42, 0.68, 1.05);
    lens.position.set(1.58, 0.22, side * 0.88);
    headGroup.add(lens);
  }

  root.add(headGroup);

  // Articulated Two-Segment Left Arm
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

  // Detailed 3D Firearm held in the right hand
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

  // 3D Muzzle Flash Star
  const muzzleFlashMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending
    })
  );
  muzzleFlashMesh.position.set(6.5, 0.25, 0);
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
