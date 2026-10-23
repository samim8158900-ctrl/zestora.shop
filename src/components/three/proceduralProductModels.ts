import * as THREE from 'three';
import type { ProductArtworkKey } from '../../types/store.ts';
import type { StudioFinishPalette } from '../../utils/threeStudioLogic.ts';

export interface ExplodableSubPart {
  object: THREE.Object3D;
  partName: string;
  partRole: 'Primary Silhouette' | 'Secondary Detail' | 'Accent & Mechanism';
  basePosition: [number, number, number];
  explodeVector: [number, number, number];
}

export interface BuiltProductModel {
  rootGroup: THREE.Group;
  explodableParts: ExplodableSubPart[];
  primaryMaterials: THREE.MeshPhysicalMaterial[];
  secondaryMaterials: THREE.MeshStandardMaterial[];
  accentMaterials: THREE.MeshStandardMaterial[];
  cushionMaterials: THREE.MeshStandardMaterial[];
  animatedNodes: {
    secondHand?: THREE.Object3D;
    minuteHand?: THREE.Object3D;
    rotor?: THREE.Object3D;
    floatingRing?: THREE.Object3D;
  };
  dispose: () => void;
}

/**
 * Generates a procedural radial contact shadow texture (zero external 404s).
 */
export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(3, 7, 18, 0.78)');
    grad.addColorStop(0.45, 'rgba(3, 7, 18, 0.36)');
    grad.addColorStop(0.8, 'rgba(3, 7, 18, 0.08)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a linear-space brushed metal micro-groove bump/roughness map.
 */
export function createBrushedMetalBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 1) {
      const shade = 110 + ((y * 37) % 36);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  // Data map stays in linear space (NoColorSpace)
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a high-contrast sRGB studio turntable degree ring texture.
 */
export function createTurntableDialTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;

    // Outer technical ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 236, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 206, 0, Math.PI * 2);
    ctx.stroke();

    // 72 radial degree ticks
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const rInner = isMajor ? 214 : 224;
      const rOuter = 234;
      ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.85)' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isMajor ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an sRGB AMOLED Smartwatch Chronograph Dial Texture.
 */
export function createChronoDialTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 245);
    grad.addColorStop(0, '#0f2547');
    grad.addColorStop(0.65, '#091526');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Sub-dials
    const subDials = [
      { x: 165, y: 256, label: 'BPM 72' },
      { x: 347, y: 256, label: '98% SPO2' },
      { x: 256, y: 345, label: 'CHRONO' },
    ];
    for (const sd of subDials) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sd.label, sd.x, sd.y + 5);
    }

    // Zestora Chrono branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZESTORA', 256, 152);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CHRONOFIT TITANIUM', 256, 174);

    // Outer hour markers
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r1 = 205;
      const r2 = 232;
      ctx.strokeStyle = i % 3 === 0 ? '#38bdf8' : '#e2e8f0';
      ctx.lineWidth = i % 3 === 0 ? 6 : 3;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(angle) * r1, 256 + Math.sin(angle) * r1);
      ctx.lineTo(256 + Math.cos(angle) * r2, 256 + Math.sin(angle) * r2);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Helper to register a named sub-part on Layer 1 for raycasting and exploded-view kinematics.
 */
function registerPart(
  list: ExplodableSubPart[],
  object: THREE.Object3D,
  partName: string,
  partRole: ExplodableSubPart['partRole'],
  basePosition: [number, number, number],
  explodeVector: [number, number, number]
): void {
  object.position.set(basePosition[0], basePosition[1], basePosition[2]);
  object.userData.partName = partName;
  object.userData.partRole = partRole;
  object.traverse((child) => {
    child.layers.enable(1);
    child.userData.partName = partName;
    child.userData.partRole = partRole;
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  list.push({
    object,
    partName,
    partRole,
    basePosition,
    explodeVector,
  });
}

/**
 * Builds the composite 6-12 part procedural 3D model for the specified Zestora product archetype.
 * All geometries sit flush on y = 0 above the studio pedestal.
 */
export function buildCompositeProductModel(
  archetype: ProductArtworkKey,
  palette: StudioFinishPalette,
  maxAnisotropy = 8
): BuiltProductModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = `zestora-3d-${archetype}`;
  const explodableParts: ExplodableSubPart[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  const bumpTexture = createBrushedMetalBumpTexture(maxAnisotropy);
  texturesToDispose.push(bumpTexture);

  // Shared PBR material tiers with >= 0.25 roughness differentiation across adjacent parts
  const primaryMetalMat = new THREE.MeshPhysicalMaterial({
    color: palette.primaryHex,
    metalness: palette.metalness,
    roughness: palette.roughness,
    anisotropy: palette.anisotropy,
    anisotropyRotation: Math.PI / 4,
    bumpMap: bumpTexture,
    bumpScale: 0.008,
    clearcoat: 0.35,
    clearcoatRoughness: 0.15,
  });

  const secondaryAlloyMat = new THREE.MeshStandardMaterial({
    color: palette.secondaryHex,
    metalness: Math.max(0.25, palette.metalness - 0.3),
    roughness: Math.min(0.65, palette.roughness + 0.28),
    bumpMap: bumpTexture,
    bumpScale: 0.005,
  });

  const accentGlowMat = new THREE.MeshStandardMaterial({
    color: palette.accentHex,
    metalness: 0.72,
    roughness: 0.16,
    emissive: new THREE.Color(palette.accentHex),
    emissiveIntensity: 0.18,
  });

  const matteCushionMat = new THREE.MeshStandardMaterial({
    color: palette.cushionHex,
    metalness: 0.06,
    roughness: 0.82, // >= 0.25 rougher than adjacent metal shells
  });

  const copperCoreMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.95,
    roughness: 0.18,
  });

  const sapphireGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.92,
    ior: 1.65,
    thickness: 0.8,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const animatedNodes: BuiltProductModel['animatedNodes'] = {};

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometriesToDispose.push(geo);
    return geo;
  };

  if (archetype === 'headphones') {
    // =========================================================================
    // 1. ZESTORA SONICPRO MAX ANC HEADPHONES (10 Composite Parts + 36 Instanced Pins)
    // =========================================================================
    // Part 1: Spring-Steel Headband Arch (TubeGeometry along 3D arch curve)
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, 1.38, 0),
      new THREE.Vector3(-0.78, 2.02, 0),
      new THREE.Vector3(0, 2.32, 0),
      new THREE.Vector3(0.78, 2.02, 0),
      new THREE.Vector3(0.92, 1.38, 0),
    ]);
    const archGeo = trackGeo(new THREE.TubeGeometry(archCurve, 48, 0.085, 16, false));
    const archMesh = new THREE.Mesh(archGeo, primaryMetalMat);
    registerPart(
      explodableParts,
      archMesh,
      'Anodized Spring-Steel Headband Arch',
      'Primary Silhouette',
      [0, 0, 0],
      [0, 0.65, 0]
    );
    rootGroup.add(archMesh);

    // Part 2: Memory-Foam Under-Arch Cushion (Matte leather roughness: 0.82)
    const padCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.56, 2.05, 0),
      new THREE.Vector3(0, 2.24, 0),
      new THREE.Vector3(0.56, 2.05, 0),
    ]);
    const padGeo = trackGeo(new THREE.TubeGeometry(padCurve, 32, 0.072, 14, false));
    const padMesh = new THREE.Mesh(padGeo, matteCushionMat);
    registerPart(
      explodableParts,
      padMesh,
      'Breathable Memory-Foam Canopy Pad',
      'Secondary Detail',
      [0, 0, 0],
      [0, 0.42, 0]
    );
    rootGroup.add(padMesh);

    // Part 3 & 4: Left & Right CNC Titanium Yoke Forks (ExtrudeGeometry with bevels)
    const yokeShape = new THREE.Shape();
    yokeShape.moveTo(-0.06, -0.28);
    yokeShape.lineTo(0.06, -0.28);
    yokeShape.lineTo(0.08, 0.28);
    yokeShape.lineTo(-0.08, 0.28);
    yokeShape.closePath();
    const yokeGeo = trackGeo(
      new THREE.ExtrudeGeometry(yokeShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.015,
        bevelSegments: 3,
      })
    );
    yokeGeo.center();

    const leftYoke = new THREE.Mesh(yokeGeo, secondaryAlloyMat);
    leftYoke.rotation.z = 0.12;
    registerPart(
      explodableParts,
      leftYoke,
      'Left Telescoping Titanium Suspension Yoke',
      'Secondary Detail',
      [-0.94, 1.15, 0],
      [-0.45, 0.2, 0]
    );
    rootGroup.add(leftYoke);

    const rightYoke = new THREE.Mesh(yokeGeo, secondaryAlloyMat);
    rightYoke.rotation.z = -0.12;
    registerPart(
      explodableParts,
      rightYoke,
      'Right Telescoping Titanium Suspension Yoke',
      'Secondary Detail',
      [0.94, 1.15, 0],
      [0.45, 0.2, 0]
    );
    rootGroup.add(rightYoke);

    // Part 5 & 6: Left & Right Lathe-Spun Aluminum Acoustic Shells (LatheGeometry)
    const cupPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.36, 0.02),
      new THREE.Vector2(0.46, 0.12),
      new THREE.Vector2(0.48, 0.28),
      new THREE.Vector2(0.42, 0.34),
    ];
    const cupGeo = trackGeo(new THREE.LatheGeometry(cupPoints, 40));
    cupGeo.computeVertexNormals();

    const leftCup = new THREE.Mesh(cupGeo, primaryMetalMat);
    leftCup.rotation.z = Math.PI / 2;
    registerPart(
      explodableParts,
      leftCup,
      'Left Spun-Aluminum Acoustic Chamber',
      'Primary Silhouette',
      [-1.08, 0.78, 0],
      [-0.85, 0, 0]
    );
    rootGroup.add(leftCup);

    const rightCup = new THREE.Mesh(cupGeo, primaryMetalMat);
    rightCup.rotation.z = -Math.PI / 2;
    registerPart(
      explodableParts,
      rightCup,
      'Right Spun-Aluminum Acoustic Chamber',
      'Primary Silhouette',
      [1.08, 0.78, 0],
      [0.85, 0, 0]
    );
    rootGroup.add(rightCup);

    // Part 7 & 8: Left & Right Plush Ear Cushions (TorusGeometry)
    const earPadGeo = trackGeo(new THREE.TorusGeometry(0.38, 0.11, 20, 40));
    const leftPad = new THREE.Mesh(earPadGeo, matteCushionMat);
    leftPad.rotation.y = Math.PI / 2;
    registerPart(
      explodableParts,
      leftPad,
      'Left Acoustic Seal Memory-Foam Ear Cushion',
      'Secondary Detail',
      [-0.68, 0.78, 0],
      [-0.25, 0, 0]
    );
    rootGroup.add(leftPad);

    const rightPad = new THREE.Mesh(earPadGeo, matteCushionMat);
    rightPad.rotation.y = Math.PI / 2;
    registerPart(
      explodableParts,
      rightPad,
      'Right Acoustic Seal Memory-Foam Ear Cushion',
      'Secondary Detail',
      [0.68, 0.78, 0],
      [0.25, 0, 0]
    );
    rootGroup.add(rightPad);

    // Part 9 & 10: Internal 40mm Neodymium Transducer Drivers + Copper Voice Coils
    const driverGroupLeft = new THREE.Group();
    const coneGeo = trackGeo(new THREE.CylinderGeometry(0.3, 0.16, 0.12, 32));
    coneGeo.rotateZ(Math.PI / 2);
    const coilGeo = trackGeo(new THREE.TorusGeometry(0.24, 0.032, 14, 32));
    coilGeo.rotateY(Math.PI / 2);
    driverGroupLeft.add(new THREE.Mesh(coneGeo, copperCoreMat));
    driverGroupLeft.add(new THREE.Mesh(coilGeo, accentGlowMat));
    registerPart(
      explodableParts,
      driverGroupLeft,
      'Left 40mm Titanium-Coated Neodymium Driver',
      'Accent & Mechanism',
      [-0.84, 0.78, 0],
      [-0.52, 0, 0.32]
    );
    rootGroup.add(driverGroupLeft);

    const driverGroupRight = driverGroupLeft.clone();
    registerPart(
      explodableParts,
      driverGroupRight,
      'Right 40mm Titanium-Coated Neodymium Driver',
      'Accent & Mechanism',
      [0.84, 0.78, 0],
      [0.52, 0, 0.32]
    );
    rootGroup.add(driverGroupRight);

    // Part 11: InstancedMesh (36 Acoustic Micro-Vent Pins across Left & Right Earcups)
    const pinGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10));
    pinGeo.rotateZ(Math.PI / 2);
    const pinCount = 36;
    const instancedPins = new THREE.InstancedMesh(pinGeo, accentGlowMat, pinCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < pinCount; i++) {
      const side = i < 18 ? -1 : 1;
      const idx = i % 18;
      const angle = (idx / 18) * Math.PI * 2;
      const radius = 0.28;
      dummy.position.set(
        side * 1.07,
        0.78 + Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
      const scaleVar = 0.9 + (idx % 3) * 0.1;
      dummy.scale.set(1, scaleVar, scaleVar);
      dummy.updateMatrix();
      instancedPins.setMatrixAt(i, dummy.matrix);
      tint.setHex(palette.accentHex).offsetHSL(0, 0, (idx % 3) * 0.05);
      instancedPins.setColorAt(i, tint);
    }
    instancedPins.instanceMatrix.needsUpdate = true;
    if (instancedPins.instanceColor) instancedPins.instanceColor.needsUpdate = true;
    instancedPins.computeBoundingSphere();
    registerPart(
      explodableParts,
      instancedPins,
      '36-Point Array ANC Reference Microphone & Vent Ring',
      'Accent & Mechanism',
      [0, 0, 0],
      [0, -0.25, 0.45]
    );
    rootGroup.add(instancedPins);
  } else if (archetype === 'watch') {
    // =========================================================================
    // 2. ZESTORA CHRONOFIT TITANIUM SMARTWATCH (9 Composite Parts + 60 Instanced Indices)
    // =========================================================================
    const dialTex = createChronoDialTexture(maxAnisotropy);
    texturesToDispose.push(dialTex);

    // Part 1: CNC Octagonal Titanium Watch Case (ExtrudeGeometry with bevels)
    const caseShape = new THREE.Shape();
    const caseRadius = 0.78;
    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(theta) * caseRadius;
      const y = Math.sin(theta) * caseRadius;
      if (i === 0) caseShape.moveTo(x, y);
      else caseShape.lineTo(x, y);
    }
    caseShape.closePath();
    const caseGeo = trackGeo(
      new THREE.ExtrudeGeometry(caseShape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelSegments: 4,
      })
    );
    caseGeo.center();
    const caseMesh = new THREE.Mesh(caseGeo, primaryMetalMat);
    registerPart(
      explodableParts,
      caseMesh,
      'Grade-5 Brushed Titanium Octagonal Chassis',
      'Primary Silhouette',
      [0, 1.18, 0],
      [0, 0, -0.25]
    );
    rootGroup.add(caseMesh);

    // Part 2: Ceramic Tachymeter Bezel Ring
    const bezelGeo = trackGeo(new THREE.TorusGeometry(0.68, 0.075, 24, 64));
    const bezelMesh = new THREE.Mesh(bezelGeo, secondaryAlloyMat);
    registerPart(
      explodableParts,
      bezelMesh,
      'Micro-Blasted Ceramic Tachymeter Bezel',
      'Secondary Detail',
      [0, 1.18, 0.18],
      [0, 0, 0.42]
    );
    rootGroup.add(bezelMesh);

    // Part 3: AMOLED Chronograph Face Plate
    const dialGeo = trackGeo(new THREE.CylinderGeometry(0.64, 0.64, 0.03, 48));
    dialGeo.rotateX(Math.PI / 2);
    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      roughness: 0.22,
      metalness: 0.15,
    });
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    registerPart(
      explodableParts,
      dialMesh,
      'LTPO AMOLED 2000-Nit Chronograph Display',
      'Secondary Detail',
      [0, 1.18, 0.14],
      [0, 0, 0.22]
    );
    rootGroup.add(dialMesh);

    // Part 4: Animated Sweeping Chronograph Hands Group
    const handsGroup = new THREE.Group();
    const hourGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.34, 0.018));
    hourGeo.translate(0, 0.14, 0);
    const hourHand = new THREE.Mesh(hourGeo, secondaryAlloyMat);
    hourHand.rotation.z = -Math.PI / 6;
    handsGroup.add(hourHand);

    const minGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.48, 0.018));
    minGeo.translate(0, 0.2, 0);
    const minHand = new THREE.Mesh(minGeo, primaryMetalMat);
    minHand.rotation.z = Math.PI / 4;
    handsGroup.add(minHand);
    animatedNodes.minuteHand = minHand;

    const secGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.54, 0.02));
    secGeo.translate(0, 0.22, 0);
    const secHand = new THREE.Mesh(secGeo, accentGlowMat);
    handsGroup.add(secHand);
    animatedNodes.secondHand = secHand;

    registerPart(
      explodableParts,
      handsGroup,
      'Precision Diamond-Cut Luminescent Hands',
      'Accent & Mechanism',
      [0, 1.18, 0.18],
      [0, 0, 0.58]
    );
    rootGroup.add(handsGroup);

    // Part 5: Domed Sapphire Crystal Lens (MeshPhysicalMaterial transmission)
    const lensGeo = trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 0.045, 48));
    lensGeo.rotateX(Math.PI / 2);
    const lensMesh = new THREE.Mesh(lensGeo, sapphireGlassMat);
    lensMesh.renderOrder = 5;
    registerPart(
      explodableParts,
      lensMesh,
      'Anti-Reflective Domed Sapphire Crystal Glass',
      'Secondary Detail',
      [0, 1.18, 0.24],
      [0, 0, 0.88]
    );
    rootGroup.add(lensMesh);

    // Part 6: Internal Copper Coaxial Movement & Optical Biometric Array
    const movementGroup = new THREE.Group();
    const rotorGeo = trackGeo(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 36));
    rotorGeo.rotateX(Math.PI / 2);
    const rotorMesh = new THREE.Mesh(rotorGeo, copperCoreMat);
    movementGroup.add(rotorMesh);
    animatedNodes.rotor = rotorMesh;
    registerPart(
      explodableParts,
      movementGroup,
      'Dual-Frequency BioTracker Optical Core & Rotor',
      'Accent & Mechanism',
      [0, 1.18, -0.06],
      [0, 0, -0.68]
    );
    rootGroup.add(movementGroup);

    // Part 7: Tactile Digital Crown & Chrono Pusher (LatheGeometry)
    const crownPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.13, 0.08),
      new THREE.Vector2(0.11, 0.16),
      new THREE.Vector2(0, 0.16),
    ];
    const crownGeo = trackGeo(new THREE.LatheGeometry(crownPoints, 24));
    crownGeo.rotateZ(-Math.PI / 2);
    const crownMesh = new THREE.Mesh(crownGeo, accentGlowMat);
    registerPart(
      explodableParts,
      crownMesh,
      'Haptic Knurled Titanium Digital Crown',
      'Accent & Mechanism',
      [0.82, 1.24, 0],
      [0.52, 0.1, 0]
    );
    rootGroup.add(crownMesh);

    // Part 8 & 9: Top & Bottom Fluoroelastomer Sport Straps
    const strapShape = new THREE.Shape();
    strapShape.moveTo(-0.34, 0);
    strapShape.lineTo(0.34, 0);
    strapShape.lineTo(0.28, 0.72);
    strapShape.lineTo(-0.28, 0.72);
    strapShape.closePath();
    const strapGeo = trackGeo(
      new THREE.ExtrudeGeometry(strapShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
      })
    );
    strapGeo.center();

    const topStrap = new THREE.Mesh(strapGeo, matteCushionMat);
    topStrap.rotation.x = -0.22;
    registerPart(
      explodableParts,
      topStrap,
      'Upper Ribbed Fluoroelastomer Sport Band',
      'Primary Silhouette',
      [0, 2.02, -0.08],
      [0, 0.55, -0.15]
    );
    rootGroup.add(topStrap);

    const bottomStrap = new THREE.Mesh(strapGeo, matteCushionMat);
    bottomStrap.rotation.x = 0.22;
    registerPart(
      explodableParts,
      bottomStrap,
      'Lower Ribbed Fluoroelastomer Sport Band & Clasp',
      'Primary Silhouette',
      [0, 0.38, -0.08],
      [0, -0.35, -0.15]
    );
    rootGroup.add(bottomStrap);

    // Part 10: InstancedMesh (60 Precision Chapter Ring Indices & Bezel Screws)
    const tickGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.045, 0.025));
    const tickCount = 60;
    const instancedTicks = new THREE.InstancedMesh(tickGeo, accentGlowMat, tickCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const r = 0.62;
      dummy.position.set(Math.cos(angle) * r, 1.18 + Math.sin(angle) * r, 0.19);
      dummy.rotation.set(0, 0, angle - Math.PI / 2);
      const isHour = i % 5 === 0;
      dummy.scale.set(isHour ? 1.6 : 0.9, isHour ? 1.45 : 0.85, 1);
      dummy.updateMatrix();
      instancedTicks.setMatrixAt(i, dummy.matrix);
      tint.setHex(isHour ? palette.accentHex : palette.secondaryHex);
      instancedTicks.setColorAt(i, tint);
    }
    instancedTicks.instanceMatrix.needsUpdate = true;
    if (instancedTicks.instanceColor) instancedTicks.instanceColor.needsUpdate = true;
    instancedTicks.computeBoundingSphere();
    registerPart(
      explodableParts,
      instancedTicks,
      '60-Index Precision Chapter Ring & Bezel Markers',
      'Accent & Mechanism',
      [0, 0, 0],
      [0, 0, 0.65]
    );
    rootGroup.add(instancedTicks);
  } else if (archetype === 'keyboard') {
    // =========================================================================
    // 3. ZESTORA TACTILEPRO MECHANICAL KEYBOARD (7 Composite Parts + 48 Instanced Keycaps)
    // =========================================================================
    // Part 1: CNC Aluminum 75% Wedge Case
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-1.45, -0.58);
    hullShape.lineTo(1.45, -0.58);
    hullShape.lineTo(1.45, 0.58);
    hullShape.lineTo(-1.45, 0.58);
    hullShape.closePath();
    const hullGeo = trackGeo(
      new THREE.ExtrudeGeometry(hullShape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3,
      })
    );
    hullGeo.rotateX(-Math.PI / 2);
    hullGeo.center();
    const hullMesh = new THREE.Mesh(hullGeo, primaryMetalMat);
    hullMesh.rotation.x = 0.14;
    registerPart(
      explodableParts,
      hullMesh,
      'CNC 6063 Anodized Aluminum Gasket Chassis',
      'Primary Silhouette',
      [0, 0.42, 0],
      [0, -0.25, 0]
    );
    rootGroup.add(hullMesh);

    // Part 2: Brushed Brass Bottom Weight Bar
    const brassGeo = trackGeo(new THREE.BoxGeometry(2.2, 0.06, 0.48));
    const brassMesh = new THREE.Mesh(brassGeo, copperCoreMat);
    brassMesh.rotation.x = 0.14;
    registerPart(
      explodableParts,
      brassMesh,
      'PVD Mirror-Brushed Brass Acoustic Counterweight',
      'Secondary Detail',
      [0, 0.24, -0.1],
      [0, -0.45, -0.2]
    );
    rootGroup.add(brassMesh);

    // Part 3: Internal Gold-Trace Hot-Swap PCB & Poron Plate
    const pcbGeo = trackGeo(new THREE.BoxGeometry(2.72, 0.04, 1.02));
    const pcbMesh = new THREE.Mesh(pcbGeo, secondaryAlloyMat);
    pcbMesh.rotation.x = 0.14;
    registerPart(
      explodableParts,
      pcbMesh,
      'Hot-Swap South-Facing RGB PCB & Poron Switch Plate',
      'Secondary Detail',
      [0, 0.52, 0],
      [0, 0.25, 0]
    );
    rootGroup.add(pcbMesh);

    // Part 4: Knurled Rotary Media Volume Encoder Knob (LatheGeometry)
    const knobPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.13, 0),
      new THREE.Vector2(0.13, 0.14),
      new THREE.Vector2(0.11, 0.16),
      new THREE.Vector2(0, 0.16),
    ];
    const knobGeo = trackGeo(new THREE.LatheGeometry(knobPoints, 28));
    const knobMesh = new THREE.Mesh(knobGeo, accentGlowMat);
    knobMesh.rotation.x = 0.14;
    registerPart(
      explodableParts,
      knobMesh,
      'Programmable CNC Aluminum Rotary Media Encoder',
      'Accent & Mechanism',
      [1.24, 0.62, -0.36],
      [0.35, 0.85, -0.2]
    );
    rootGroup.add(knobMesh);

    // Part 5: Coiled Aviator USB-C Braided Cable (TubeGeometry)
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, 0.48, -0.62),
      new THREE.Vector3(-0.9, 0.52, -0.95),
      new THREE.Vector3(-0.3, 0.52, -1.05),
      new THREE.Vector3(0.45, 0.46, -0.98),
    ]);
    const cableGeo = trackGeo(new THREE.TubeGeometry(cableCurve, 36, 0.042, 12, false));
    const cableMesh = new THREE.Mesh(cableGeo, matteCushionMat);
    registerPart(
      explodableParts,
      cableMesh,
      'Double-Sleeved Coiled Aviator USB-C Cable',
      'Accent & Mechanism',
      [0, 0, 0],
      [0, 0.2, -0.55]
    );
    rootGroup.add(cableMesh);

    // Part 6: InstancedMesh (48 Sculpted PBT Keycaps & Tactile Switches)
    const keyGeo = trackGeo(new THREE.BoxGeometry(0.17, 0.11, 0.17));
    const rows = 4;
    const cols = 12;
    const keyCount = rows * cols; // 48 instances
    const instancedKeys = new THREE.InstancedMesh(keyGeo, secondaryAlloyMat, keyCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c === cols - 1) {
          // Leave top-right corner for rotary encoder knob, place key along bottom bar
          dummy.position.set(0, 0.58, 0.42);
        } else {
          const x = -1.22 + c * 0.22;
          const z = -0.36 + r * 0.23;
          const y = 0.62 - z * Math.sin(0.14);
          dummy.position.set(x, y, z);
        }
        dummy.rotation.set(0.14, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instancedKeys.setMatrixAt(idx, dummy.matrix);

        // Accent color on ESC (0,0), Enter, and Arrow keys
        if ((r === 0 && c === 0) || (r === 2 && c === 11) || (r === 3 && c >= 9)) {
          color.setHex(palette.accentHex);
        } else if (c === 0 || c === 11 || r === 3) {
          color.setHex(palette.primaryHex);
        } else {
          color.setHex(palette.secondaryHex);
        }
        instancedKeys.setColorAt(idx, color);
        idx++;
      }
    }
    instancedKeys.instanceMatrix.needsUpdate = true;
    if (instancedKeys.instanceColor) instancedKeys.instanceColor.needsUpdate = true;
    instancedKeys.computeBoundingSphere();
    registerPart(
      explodableParts,
      instancedKeys,
      '48 Double-Shot PBT Keycaps & Lubed Tactile Switches',
      'Primary Silhouette',
      [0, 0, 0],
      [0, 0.68, 0.12]
    );
    rootGroup.add(instancedKeys);
  } else if (archetype === 'sneakers') {
    // =========================================================================
    // 4. ZESTORA AEROSTRIDE CARBON RUNNING SNEAKERS (7 Parts + 28 Instanced Traction Lugs)
    // =========================================================================
    // Part 1: Sculpted Nitrogen-Infused Foam Midsole
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-1.15, -0.36);
    soleShape.quadraticCurveTo(0, -0.46, 1.22, -0.28);
    soleShape.quadraticCurveTo(1.42, 0, 1.22, 0.28);
    soleShape.quadraticCurveTo(0, 0.44, -1.15, 0.36);
    soleShape.quadraticCurveTo(-1.35, 0, -1.15, -0.36);

    const midsoleGeo = trackGeo(
      new THREE.ExtrudeGeometry(soleShape, {
        depth: 0.24,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 4,
      })
    );
    midsoleGeo.rotateX(-Math.PI / 2);
    midsoleGeo.center();
    const midsoleMesh = new THREE.Mesh(midsoleGeo, secondaryAlloyMat);
    registerPart(
      explodableParts,
      midsoleMesh,
      'NitroFoam Dual-Density Energy Return Midsole',
      'Primary Silhouette',
      [0, 0.32, 0],
      [0, -0.22, 0]
    );
    rootGroup.add(midsoleMesh);

    // Part 2: Full-Length Carbon Fiber Propulsion Plate (Sandwiched inside sole)
    const plateGeo = trackGeo(new THREE.BoxGeometry(2.25, 0.035, 0.62));
    const plateMesh = new THREE.Mesh(plateGeo, matteCushionMat);
    registerPart(
      explodableParts,
      plateMesh,
      'Full-Length Spoon-Curved Carbon Fiber Propulsion Plate',
      'Accent & Mechanism',
      [0, 0.46, 0],
      [0, 0.08, 0.48]
    );
    rootGroup.add(plateMesh);

    // Part 3: Engineered Breathable Knit Upper Hull
    const upperGeo = trackGeo(new THREE.CapsuleGeometry(0.42, 1.15, 16, 32));
    upperGeo.rotateZ(Math.PI / 2);
    upperGeo.scale(1, 0.82, 0.92);
    const upperMesh = new THREE.Mesh(upperGeo, primaryMetalMat);
    registerPart(
      explodableParts,
      upperMesh,
      'AeroWeave Seamless Engineered Mesh Upper',
      'Primary Silhouette',
      [-0.08, 0.78, 0],
      [0, 0.42, 0]
    );
    rootGroup.add(upperMesh);

    // Part 4: Anodized TPU Heel Counter Stabilizer Clip
    const heelGeo = trackGeo(new THREE.TorusGeometry(0.42, 0.065, 16, 32, Math.PI));
    heelGeo.rotateX(Math.PI / 2);
    heelGeo.rotateY(Math.PI / 2);
    const heelMesh = new THREE.Mesh(heelGeo, accentGlowMat);
    registerPart(
      explodableParts,
      heelMesh,
      '3D-Molded TPU External Heel Lock Counter',
      'Secondary Detail',
      [-0.78, 0.64, 0],
      [-0.55, 0.25, 0]
    );
    rootGroup.add(heelMesh);

    // Part 5: Padded Ankle Collar Ring
    const collarGeo = trackGeo(new THREE.TorusGeometry(0.32, 0.075, 16, 32));
    collarGeo.rotateX(Math.PI / 2 + 0.25);
    const collarMesh = new THREE.Mesh(collarGeo, matteCushionMat);
    registerPart(
      explodableParts,
      collarMesh,
      'Memory-Foam Achilles Relief Ankle Collar',
      'Secondary Detail',
      [-0.52, 1.08, 0],
      [-0.25, 0.72, 0]
    );
    rootGroup.add(collarMesh);

    // Part 6: Speed Lace Tension Cords (TubeGeometry)
    const laceGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const xOffset = -0.15 + i * 0.22;
      const laceCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOffset, 0.92, -0.32),
        new THREE.Vector3(xOffset + 0.05, 1.08, 0),
        new THREE.Vector3(xOffset, 0.92, 0.32),
      ]);
      const laceGeo = trackGeo(new THREE.TubeGeometry(laceCurve, 20, 0.022, 8, false));
      laceGroup.add(new THREE.Mesh(laceGeo, accentGlowMat));
    }
    registerPart(
      explodableParts,
      laceGroup,
      'Kevlar-Core Quick-Lock Tension Lacing System',
      'Accent & Mechanism',
      [0, 0, 0],
      [0.2, 0.82, 0]
    );
    rootGroup.add(laceGroup);

    // Part 7: InstancedMesh (28 High-Grip Continental Outsole Lugs)
    const lugGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.05, 0.05, 6));
    const lugCount = 28;
    const instancedLugs = new THREE.InstancedMesh(lugGeo, copperCoreMat, lugCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < lugCount; i++) {
      const row = Math.floor(i / 14);
      const col = i % 14;
      const x = -1.05 + col * 0.16;
      const z = (row === 0 ? -0.22 : 0.22) * (1 - Math.abs(x) * 0.25);
      dummy.position.set(x, 0.14, z);
      dummy.scale.setScalar(0.88 + (col % 3) * 0.12);
      dummy.updateMatrix();
      instancedLugs.setMatrixAt(i, dummy.matrix);
    }
    instancedLugs.instanceMatrix.needsUpdate = true;
    instancedLugs.computeBoundingSphere();
    registerPart(
      explodableParts,
      instancedLugs,
      '28 Micro-Hexagonal Wet/Dry Traction Outsole Lugs',
      'Accent & Mechanism',
      [0, 0, 0],
      [0, -0.42, 0]
    );
    rootGroup.add(instancedLugs);
  } else {
    // =========================================================================
    // 5. ARCHITECTURAL / LIFESTYLE STUDIO COMPOSITE MODEL (Lamp, Skincare, Backpack, Hoodie)
    //    7 Distinct Composite Parts + 28 Instanced Radial Fins/Elements
    // =========================================================================
    // Part 1: Weighted CNC Lathe Pedestal Base
    const basePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.76, 0),
      new THREE.Vector2(0.72, 0.14),
      new THREE.Vector2(0.48, 0.26),
      new THREE.Vector2(0, 0.26),
    ];
    const baseGeo = trackGeo(new THREE.LatheGeometry(basePoints, 48));
    const baseMesh = new THREE.Mesh(baseGeo, primaryMetalMat);
    registerPart(
      explodableParts,
      baseMesh,
      'Weighted CNC-Machined Counterbalance Base',
      'Primary Silhouette',
      [0, 0.12, 0],
      [0, -0.35, 0]
    );
    rootGroup.add(baseMesh);

    // Part 2: Central Sculpted Core Vessel / Torso Column
    const corePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.52, 0.55),
      new THREE.Vector2(0.46, 1.15),
      new THREE.Vector2(0.28, 1.38),
      new THREE.Vector2(0, 1.38),
    ];
    const coreGeo = trackGeo(new THREE.LatheGeometry(corePoints, 48));
    const coreMesh = new THREE.Mesh(coreGeo, primaryMetalMat);
    registerPart(
      explodableParts,
      coreMesh,
      'Primary Sculpted Composite Body Shell',
      'Primary Silhouette',
      [0, 0.38, 0],
      [0, 0, 0]
    );
    rootGroup.add(coreMesh);

    // Part 3: Refractive Optical Glass Outer Diffuser Chamber
    const glassGeo = trackGeo(new THREE.CylinderGeometry(0.58, 0.58, 0.86, 48, 1, true));
    const glassMesh = new THREE.Mesh(glassGeo, sapphireGlassMat);
    glassMesh.renderOrder = 5;
    registerPart(
      explodableParts,
      glassMesh,
      'Borosilicate Optical Diffuser & Protective Shield',
      'Secondary Detail',
      [0, 0.96, 0],
      [0, 0.35, 0.55]
    );
    rootGroup.add(glassMesh);

    // Part 4: Internal Warm Copper Luminescent Core
    const innerGeo = trackGeo(new THREE.OctahedronGeometry(0.28, 2));
    const innerMesh = new THREE.Mesh(innerGeo, accentGlowMat);
    animatedNodes.rotor = innerMesh;
    registerPart(
      explodableParts,
      innerMesh,
      'Internal Precision Energy & Luminescence Core',
      'Accent & Mechanism',
      [0, 1.05, 0],
      [0, 0.45, -0.45]
    );
    rootGroup.add(innerMesh);

    // Part 5: Brushed Alloy Crown Halo Ring
    const haloGeo = trackGeo(new THREE.TorusGeometry(0.66, 0.06, 20, 64));
    haloGeo.rotateX(Math.PI / 2);
    const haloMesh = new THREE.Mesh(haloGeo, secondaryAlloyMat);
    animatedNodes.floatingRing = haloMesh;
    registerPart(
      explodableParts,
      haloMesh,
      'Articulated Gimbal Halo Assembly Ring',
      'Secondary Detail',
      [0, 1.56, 0],
      [0, 0.65, 0]
    );
    rootGroup.add(haloMesh);

    // Part 6: Ergonomic Top Cap / Dropper Collar
    const capGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 0.28, 36));
    const capMesh = new THREE.Mesh(capGeo, matteCushionMat);
    registerPart(
      explodableParts,
      capMesh,
      'Soft-Touch Tactile Control Cap Assembly',
      'Secondary Detail',
      [0, 1.88, 0],
      [0, 0.92, 0]
    );
    rootGroup.add(capMesh);

    // Part 7: InstancedMesh (28 Radial Thermal Dissipation Fins / Accents)
    const finGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.52, 0.12));
    const finCount = 28;
    const instancedFins = new THREE.InstancedMesh(finGeo, copperCoreMat, finCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < finCount; i++) {
      const angle = (i / finCount) * Math.PI * 2;
      const r = 0.5;
      dummy.position.set(Math.cos(angle) * r, 0.96, Math.sin(angle) * r);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(1, 0.85 + (i % 3) * 0.12, 1);
      dummy.updateMatrix();
      instancedFins.setMatrixAt(i, dummy.matrix);
    }
    instancedFins.instanceMatrix.needsUpdate = true;
    instancedFins.computeBoundingSphere();
    registerPart(
      explodableParts,
      instancedFins,
      '28-Blade Radial Acoustic & Thermal Louver Array',
      'Accent & Mechanism',
      [0, 0, 0],
      [0, 0.25, -0.35]
    );
    rootGroup.add(instancedFins);
  }

  const primaryMaterials = [primaryMetalMat, sapphireGlassMat];
  const secondaryMaterials = [secondaryAlloyMat, copperCoreMat];
  const accentMaterials = [accentGlowMat];
  const cushionMaterials = [matteCushionMat];

  const dispose = () => {
    for (const g of geometriesToDispose) g.dispose();
    for (const t of texturesToDispose) t.dispose();
    for (const m of primaryMaterials) m.dispose();
    for (const m of secondaryMaterials) m.dispose();
    for (const m of accentMaterials) m.dispose();
    for (const m of cushionMaterials) m.dispose();
  };

  return {
    rootGroup,
    explodableParts,
    primaryMaterials,
    secondaryMaterials,
    accentMaterials,
    cushionMaterials,
    animatedNodes,
    dispose,
  };
}
