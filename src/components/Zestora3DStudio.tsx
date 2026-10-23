import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Layers,
  Camera,
  Sun,
  Palette,
  ShoppingCart,
  ArrowLeft,
  RotateCw,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Product } from '../types/store.ts';
import { formatINR } from '../utils/cartLogic.ts';
import {
  STUDIO_FINISH_PALETTES,
  STUDIO_CAMERA_PRESETS,
  STUDIO_LIGHTING_PRESETS,
  computeExponentialDecayAlpha,
  calculateExplodedPosition,
  resolveProductArchetype,
  type StudioFinishId,
  type StudioCameraPresetId,
  type StudioLightingPresetId,
} from '../utils/threeStudioLogic.ts';
import {
  buildCompositeProductModel,
  createRadialContactShadowTexture,
  createTurntableDialTexture,
  type BuiltProductModel,
} from './three/proceduralProductModels.ts';

// Module-scope pre-allocated scratch math objects (Zero GC inside requestAnimationFrame)
const _scratchCamGoal = new THREE.Vector3();
const _scratchTargetGoal = new THREE.Vector3();
const _scratchPartGoal = new THREE.Vector3();
const _scratchPointerNDC = new THREE.Vector2();

interface Zestora3DStudioProps {
  products: Product[];
  activeProductId: string | null;
  onSelectProductId: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onOpenProductDetails: (product: Product) => void;
  onCloseStudio: () => void;
}

export function Zestora3DStudio({
  products,
  activeProductId,
  onSelectProductId,
  onAddToCart,
  onOpenProductDetails,
  onCloseStudio,
}: Zestora3DStudioProps) {
  const activeProduct = useMemo(() => {
    if (!products.length) return null;
    if (activeProductId) {
      const match = products.find((p) => p.id === activeProductId);
      if (match) return match;
    }
    return products[0];
  }, [products, activeProductId]);

  const archetype = useMemo(
    () => resolveProductArchetype(activeProduct),
    [activeProduct]
  );

  // Interactive Studio State
  const [finishId, setFinishId] = useState<StudioFinishId>('signature-cobalt');
  const [cameraPresetId, setCameraPresetId] = useState<StudioCameraPresetId>('hero');
  const [lightingPresetId, setLightingPresetId] =
    useState<StudioLightingPresetId>('studio-daylight');
  const [explosionPercent, setExplosionPercent] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [inspectedPart, setInspectedPart] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Dedicated empty canvas mount ref (outside React HUD overlays)
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs for the 60fps render loop so React UI updates never recreate the WebGL context
  const explosionTargetRef = useRef<number>(0);
  const explosionCurrentRef = useRef<number>(0);
  const autoRotateRef = useRef<boolean>(true);
  const cameraGoalPosRef = useRef<[number, number, number]>([3.2, 2.35, 3.6]);
  const cameraGoalTargetRef = useRef<[number, number, number]>([0, 1.05, 0]);
  const cameraTransitionActiveRef = useRef<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelHolderRef = useRef<THREE.Group | null>(null);
  const builtModelRef = useRef<BuiltProductModel | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const turntableRingRef = useRef<THREE.Mesh | null>(null);

  // Keep refs synchronized with React state
  useEffect(() => {
    explosionTargetRef.current = explosionPercent / 100;
  }, [explosionPercent]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Keyboard shortcuts: 'H' toggles Cinema/Zen dock, 'Escape' exits studio, 'E' toggles Exploded view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'e' || e.key === 'E') {
        setExplosionPercent((prev) => (prev > 10 ? 0 : 85));
      } else if (e.key === 'Escape') {
        onCloseStudio();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseStudio]);

  // Initialize WebGLRenderer, Studio Scene, RoomEnvironment, Studio Pedestal & 60fps Loop ONCE
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const initialLighting = STUDIO_LIGHTING_PRESETS[0];
    scene.background = new THREE.Color(initialLighting.backgroundHex);
    scene.fog = new THREE.FogExp2(initialLighting.fogHex, initialLighting.fogDensity);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(3.2, 2.35, 3.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = initialLighting.exposure;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    // Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Studio Area Softboxes (RectAreaLightUniformsLib)
    RectAreaLightUniformsLib.init();
    const softboxLeft = new THREE.RectAreaLight(0xe0f2fe, 3.5, 3.2, 2.2);
    softboxLeft.position.set(-3.8, 2.8, 2.4);
    softboxLeft.lookAt(0, 1.0, 0);
    scene.add(softboxLeft);

    const softboxRight = new THREE.RectAreaLight(0xfff7ed, 2.8, 3.0, 2.0);
    softboxRight.position.set(3.6, 2.6, -2.2);
    softboxRight.lookAt(0, 1.0, 0);
    scene.add(softboxRight);

    // 3-Point Studio Lighting Rig (Key + Hemisphere Fill + Rim)
    const keyLight = new THREE.DirectionalLight(
      initialLighting.keyLightHex,
      initialLighting.keyLightIntensity
    );
    keyLight.position.set(4.2, 6.5, 4.0);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(1024, 1024);
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const hemiLight = new THREE.HemisphereLight(
      initialLighting.hemiSkyHex,
      initialLighting.hemiGroundHex,
      initialLighting.hemiIntensity
    );
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const rimLight = new THREE.DirectionalLight(
      initialLighting.rimLightHex,
      initialLighting.rimLightIntensity
    );
    rimLight.position.set(-4.0, 3.5, -4.2);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Grounded Studio Pedestal & Soft Radial Contact Shadow (y <= 0)
    const pedestalGroup = new THREE.Group();
    const plinthGeo = new THREE.CylinderGeometry(2.15, 2.35, 0.24, 64);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.32,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, -0.12, 0);
    plinthMesh.receiveShadow = true;
    pedestalGroup.add(plinthMesh);

    const rimRingGeo = new THREE.TorusGeometry(2.16, 0.025, 16, 72);
    rimRingGeo.rotateX(Math.PI / 2);
    const rimRingMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      metalness: 0.85,
      roughness: 0.2,
      emissive: new THREE.Color(0x0066ff),
      emissiveIntensity: 0.28,
    });
    const rimRingMesh = new THREE.Mesh(rimRingGeo, rimRingMat);
    rimRingMesh.position.set(0, -0.005, 0);
    pedestalGroup.add(rimRingMesh);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const dialTex = createTurntableDialTexture(maxAnisotropy);
    const dialRingGeo = new THREE.PlaneGeometry(4.1, 4.1);
    dialRingGeo.rotateX(-Math.PI / 2);
    const dialRingMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const dialRingMesh = new THREE.Mesh(dialRingGeo, dialRingMat);
    dialRingMesh.position.set(0, 0.004, 0);
    pedestalGroup.add(dialRingMesh);
    turntableRingRef.current = dialRingMesh;

    // Soft Radial Contact Shadow Plane directly beneath the hero product
    const contactShadowTex = createRadialContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(3.2, 3.2);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const shadowPlaneMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlaneMesh.position.set(0, 0.008, 0);
    pedestalGroup.add(shadowPlaneMesh);

    scene.add(pedestalGroup);

    // Product Model Holder Group
    const modelHolder = new THREE.Group();
    scene.add(modelHolder);
    modelHolderRef.current = modelHolder;

    // OrbitControls with smooth exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.45;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.target.set(0, 1.05, 0);
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 1.35;
    controlsRef.current = controls;

    // Cancel preset transition if user manually drags OrbitControls
    const onControlStart = () => {
      cameraTransitionActiveRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // High-Performance Layer-1 Raycasting for interactive sub-part inspection
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastRaycastMs = 0;

    const performRaycast = (clientX: number, clientY: number) => {
      if (!modelHolderRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      _scratchPointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _scratchPointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_scratchPointerNDC, camera);
      const hits = raycaster.intersectObjects(modelHolderRef.current.children, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const partName = hitObj.userData?.partName as string | undefined;
        const partRole = hitObj.userData?.partRole as string | undefined;
        if (partName) {
          setInspectedPart({
            name: partName,
            role: partRole || 'Composite Sub-Assembly',
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 55) return; // Throttled <= 18Hz
      lastRaycastMs = now;
      performRaycast(e.clientX, e.clientY);
    };

    const handlePointerDown = (e: PointerEvent) => {
      performRaycast(e.clientX, e.clientY);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Responsive Resize Handler
    const handleResize = () => {
      if (!canvasMountRef.current) return;
      const w = canvasMountRef.current.clientWidth || window.innerWidth;
      const h = canvasMountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 60fps Animation Loop with Exponential Damping & Zero GC Allocations
    const clock = new THREE.Clock();
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // 1. Exponentially damp Exploded View separation
      const expAlpha = computeExponentialDecayAlpha(8.5, dt);
      explosionCurrentRef.current +=
        (explosionTargetRef.current - explosionCurrentRef.current) * expAlpha;

      const activeBuilt = builtModelRef.current;
      if (activeBuilt) {
        const progress = explosionCurrentRef.current;
        for (let i = 0; i < activeBuilt.explodableParts.length; i++) {
          const part = activeBuilt.explodableParts[i];
          const [gx, gy, gz] = calculateExplodedPosition(
            part.basePosition,
            part.explodeVector,
            progress
          );
          _scratchPartGoal.set(gx, gy, gz);
          part.object.position.lerp(_scratchPartGoal, expAlpha);
        }

        // Subtle real-time mechanical motion on watch hands / internal rotor
        if (activeBuilt.animatedNodes.secondHand) {
          activeBuilt.animatedNodes.secondHand.rotation.z = -elapsed * 1.05;
        }
        if (activeBuilt.animatedNodes.minuteHand) {
          activeBuilt.animatedNodes.minuteHand.rotation.z =
            Math.PI / 4 - elapsed * 0.04;
        }
        if (activeBuilt.animatedNodes.rotor) {
          activeBuilt.animatedNodes.rotor.rotation.z = elapsed * 0.65;
        }
        if (activeBuilt.animatedNodes.floatingRing) {
          activeBuilt.animatedNodes.floatingRing.rotation.z =
            Math.sin(elapsed * 1.2) * 0.12;
        }
      }

      // 2. Smoothly damp camera toward selected preset when triggered
      if (cameraTransitionActiveRef.current) {
        const camAlpha = computeExponentialDecayAlpha(6.5, dt);
        _scratchCamGoal.set(
          cameraGoalPosRef.current[0],
          cameraGoalPosRef.current[1],
          cameraGoalPosRef.current[2]
        );
        _scratchTargetGoal.set(
          cameraGoalTargetRef.current[0],
          cameraGoalTargetRef.current[1],
          cameraGoalTargetRef.current[2]
        );
        camera.position.lerp(_scratchCamGoal, camAlpha);
        controls.target.lerp(_scratchTargetGoal, camAlpha);
        if (camera.position.distanceToSquared(_scratchCamGoal) < 0.002) {
          cameraTransitionActiveRef.current = false;
        }
      }

      // Subtle studio dial ring rotation
      if (turntableRingRef.current && autoRotateRef.current) {
        turntableRingRef.current.rotation.z += dt * 0.12;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      if (builtModelRef.current) {
        builtModelRef.current.dispose();
        builtModelRef.current = null;
      }
      plinthGeo.dispose();
      plinthMat.dispose();
      rimRingGeo.dispose();
      rimRingMat.dispose();
      dialRingGeo.dispose();
      dialRingMat.dispose();
      dialTex.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      contactShadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Rebuild or update the Composite 3D Product Model when archetype or finish changes
  useEffect(() => {
    const holder = modelHolderRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!holder || !renderer || !scene || !camera) return;

    if (builtModelRef.current) {
      holder.remove(builtModelRef.current.rootGroup);
      builtModelRef.current.dispose();
      builtModelRef.current = null;
    }

    const palette =
      STUDIO_FINISH_PALETTES.find((p) => p.id === finishId) ??
      STUDIO_FINISH_PALETTES[0];
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const built = buildCompositeProductModel(archetype, palette, maxAnisotropy);
    holder.add(built.rootGroup);
    builtModelRef.current = built;

    // Pre-warm shaders once for the newly built composite model
    renderer.compile(scene, camera);

    // Default inspected part summary
    if (built.explodableParts.length > 0) {
      setInspectedPart({
        name: built.explodableParts[0].partName,
        role: `${built.explodableParts.length}-Part Composite Assembly`,
      });
    }
  }, [archetype, finishId]);

  // Apply Studio Lighting & Atmosphere Preset Changes
  useEffect(() => {
    const preset =
      STUDIO_LIGHTING_PRESETS.find((l) => l.id === lightingPresetId) ??
      STUDIO_LIGHTING_PRESETS[0];
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (scene) {
      scene.background = new THREE.Color(preset.backgroundHex);
      scene.fog = new THREE.FogExp2(preset.fogHex, preset.fogDensity);
    }
    if (renderer) {
      renderer.toneMappingExposure = preset.exposure;
    }
    if (keyLightRef.current) {
      keyLightRef.current.color.setHex(preset.keyLightHex);
      keyLightRef.current.intensity = preset.keyLightIntensity;
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.color.setHex(preset.hemiSkyHex);
      hemiLightRef.current.groundColor.setHex(preset.hemiGroundHex);
      hemiLightRef.current.intensity = preset.hemiIntensity;
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.setHex(preset.rimLightHex);
      rimLightRef.current.intensity = preset.rimLightIntensity;
    }
  }, [lightingPresetId]);

  const handleSelectCameraPreset = (presetId: StudioCameraPresetId) => {
    setCameraPresetId(presetId);
    const preset = STUDIO_CAMERA_PRESETS.find((c) => c.id === presetId);
    if (preset) {
      cameraGoalPosRef.current = preset.position;
      cameraGoalTargetRef.current = preset.target;
      cameraTransitionActiveRef.current = true;
    }
  };

  const handleAddCurrentProduct = () => {
    if (!activeProduct) return;
    onAddToCart(activeProduct);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div
      data-testid="zestora-3d-studio"
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#0B1528] select-none"
    >
      {/* Full-Bleed 100vw x 100vh WebGL Canvas Container (Outside React HUD) */}
      <div
        ref={canvasMountRef}
        data-testid="zestora-3d-canvas-mount"
        className="w-full h-full"
      />

      {/* ====================================================================
          TOP HEADER BAR (Minimal Spec & Product Selector - No Side Occlusion)
      ==================================================================== */}
      <div className="pointer-events-none fixed top-4 inset-x-4 z-10 flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: Brand Badge + Product Switcher + Inspected Sub-Part Readout */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2.5 bg-[#0A192F]/95 border border-slate-700/90 rounded-2xl px-3.5 py-2.5 shadow-2xl">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
            <div className="w-8 h-8 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-xs">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
                Zestora 3D Studio
              </p>
              <p className="text-xs font-bold text-white">PBR Interactive Showroom</p>
            </div>
          </div>

          {/* Product Switcher Dropdown */}
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="studio-product-select" className="sr-only">
                Select Product in 3D Studio
              </label>
              <select
                id="studio-product-select"
                data-testid="studio-product-select"
                value={activeProduct?.id ?? ''}
                onChange={(e) => {
                  onSelectProductId(e.target.value);
                  setExplosionPercent(0);
                }}
                className="bg-slate-900 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-2 focus:outline-[#0066FF] max-w-[220px] sm:max-w-[280px] truncate"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Raycasted Sub-Part Callout Pill */}
          {inspectedPart && (
            <div
              data-testid="studio-inspected-part"
              className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-700 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  {inspectedPart.role}
                </span>
                <span className="font-bold text-sky-200">{inspectedPart.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Quick Shopping & Exit Actions */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0A192F]/95 border border-slate-700/90 rounded-2xl p-2 shadow-2xl">
          {activeProduct && (
            <>
              <button
                type="button"
                data-testid="studio-add-to-cart"
                onClick={handleAddCurrentProduct}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors ${
                  justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0066FF] hover:bg-[#0052CC] text-white'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Added ({formatINR(activeProduct.price)})</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart · {formatINR(activeProduct.price)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="studio-open-pdp"
                onClick={() => onOpenProductDetails(activeProduct)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Product Details</span>
              </button>
            </>
          )}

          <button
            type="button"
            data-testid="studio-exit-button"
            onClick={onCloseStudio}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-200 hover:text-rose-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (<= 15% Viewport Footprint)
          Pinned to bottom-center; solid rgba surface (Zero backdrop-filter)
      ==================================================================== */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 w-[94vw] max-w-[940px] flex flex-col items-center">
        {/* Collapse / Expand Cinema Zen Mode Toggle Tab */}
        <button
          type="button"
          data-testid="studio-dock-toggle"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-[#0A192F] border border-b-0 border-slate-700 text-slate-200 hover:text-white text-xs font-bold shadow-lg transition-colors"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show 3D Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls · Zen Mode (H)</span>
            </>
          )}
        </button>

        {/* Main Horizontal Control Dock */}
        {!dockCollapsed && (
          <div
            data-testid="studio-bottom-dock"
            className="w-full bg-[#0A192F]/95 border border-slate-700/95 rounded-2xl px-4 py-3 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
          >
            {/* 1. Exploded View Kinematics Slider (4 cols) */}
            <div className="md:col-span-4 flex flex-col gap-1.5 md:border-r md:border-slate-800 md:pr-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exploded Assembly</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="studio-explode-value"
                    className="text-sky-400 font-extrabold tabular-nums"
                  >
                    {explosionPercent}%
                  </span>
                  <button
                    type="button"
                    data-testid="studio-explode-toggle-btn"
                    onClick={() =>
                      setExplosionPercent((prev) => (prev > 10 ? 0 : 85))
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200"
                  >
                    {explosionPercent > 10 ? 'Assemble' : 'Explode'}
                  </button>
                </div>
              </div>
              <input
                type="range"
                aria-label="Exploded view separation percentage"
                data-testid="studio-explode-slider"
                min={0}
                max={100}
                value={explosionPercent}
                onChange={(e) => setExplosionPercent(Number(e.target.value))}
                className="w-full accent-[#0066FF] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 2. PBR Material Finishes (3 cols) */}
            <div className="md:col-span-3 flex flex-col gap-1.5 md:border-r md:border-slate-800 md:pr-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>PBR Finish</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  {STUDIO_FINISH_PALETTES.find((f) => f.id === finishId)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {STUDIO_FINISH_PALETTES.map((palette) => {
                  const active = palette.id === finishId;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      data-testid={`studio-finish-${palette.id}`}
                      onClick={() => setFinishId(palette.id)}
                      title={palette.name}
                      aria-label={`Select ${palette.name} finish`}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        active
                          ? 'border-white scale-110 ring-2 ring-[#0066FF]'
                          : 'border-slate-600 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span
                        className={`block w-full h-full rounded-full ${
                          palette.id === 'signature-cobalt'
                            ? 'bg-[#0066FF]'
                            : palette.id === 'obsidian-titanium'
                            ? 'bg-slate-700'
                            : palette.id === 'champagne-gold'
                            ? 'bg-amber-500'
                            : palette.id === 'arctic-pearl'
                            ? 'bg-slate-200'
                            : 'bg-emerald-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Camera Angle Presets & Orbit Toggle (3 cols) */}
            <div className="md:col-span-3 flex flex-col gap-1.5 md:border-r md:border-slate-800 md:pr-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Camera Rig</span>
                </span>
                <button
                  type="button"
                  data-testid="studio-autorotate-toggle"
                  onClick={() => setAutoRotate((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    autoRotate
                      ? 'bg-[#0066FF] text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Orbit</span>
                </button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {STUDIO_CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`studio-camera-${preset.id}`}
                    onClick={() => handleSelectCameraPreset(preset.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                      cameraPresetId === preset.id
                        ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Studio Lighting Atmosphere Presets (2 cols) */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Studio Light</span>
              </div>
              <div className="flex items-center gap-1">
                {STUDIO_LIGHTING_PRESETS.map((light) => (
                  <button
                    key={light.id}
                    type="button"
                    data-testid={`studio-light-${light.id}`}
                    onClick={() => setLightingPresetId(light.id)}
                    className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-bold truncate transition-colors ${
                      lightingPresetId === light.id
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {light.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
