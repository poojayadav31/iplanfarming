import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { FarmBed, PlacedTree, PlacedElement, LayerVisibility } from '../../types/designer';
import { BED_TYPES_CATALOGUE } from '../../lib/designerCropsData';
import { RotateCcw, Video, Sunrise, Sun, Sunset, Footprints } from 'lucide-react';

interface DesignerCanvas3DProps {
  boundaryPoints: [number, number][];
  metersWidth: number;
  metersHeight: number;
  beds: FarmBed[];
  trees: PlacedTree[];
  elements: PlacedElement[];
  layers: LayerVisibility;
  isWalkthrough: boolean;
  onToggleWalkthrough: () => void;
}

export default function DesignerCanvas3D({
  boundaryPoints,
  metersWidth,
  metersHeight,
  beds,
  trees,
  elements,
  layers,
  isWalkthrough,
  onToggleWalkthrough,
}: DesignerCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  // Time of Day Lighting
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'noon' | 'sunset'>('morning');

  // Orbit controls state
  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 45, theta: 0.8, phi: 1.1 }); // spherical coordinates
  const targetRef = useRef(new THREE.Vector3(metersWidth / 2, 0, metersHeight / 2));

  // Walkthrough state
  const keysDownRef = useRef<Record<string, boolean>>({});
  const walkthroughPosRef = useRef(new THREE.Vector3(metersWidth / 2, 1.7, metersHeight / 2 + 10));
  const walkthroughYawPitchRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // ── 1. Scene Setup ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(timeOfDay === 'sunset' ? '#fed7aa' : timeOfDay === 'noon' ? '#e0f2fe' : '#fef3c7');
    scene.fog = new THREE.FogExp2(scene.background.getHex(), 0.012);
    sceneRef.current = scene;

    // ── 2. Camera Setup ──
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 500);
    cameraRef.current = camera;

    // ── 3. Renderer Setup ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // ── 4. Dynamic Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, timeOfDay === 'noon' ? 0.7 : 0.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3f6212, 0.4);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(
      timeOfDay === 'sunset' ? 0xf97316 : timeOfDay === 'morning' ? 0xfef08a : 0xffffff,
      timeOfDay === 'noon' ? 1.4 : 1.1
    );
    const sunAngle = timeOfDay === 'morning' ? 0.4 : timeOfDay === 'sunset' ? 0.2 : 1.2;
    sunLight.position.set(metersWidth * 0.8, metersHeight * sunAngle + 20, metersHeight * 0.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    const shadowD = Math.max(metersWidth, metersHeight, 40);
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    scene.add(sunLight);

    // ── 5. Ground Terrain & Boundary Plane ──
    const groundGeo = new THREE.PlaneGeometry(Math.max(metersWidth * 3, 200), Math.max(metersHeight * 3, 200), 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // slate-200 outer landscape
      roughness: 0.9,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(metersWidth / 2, -0.05, metersHeight / 2);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Farm Boundary Soil Patch
    if (layers.boundary && boundaryPoints.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(boundaryPoints[0][0], boundaryPoints[0][1]);
      for (let i = 1; i < boundaryPoints.length; i++) {
        shape.lineTo(boundaryPoints[i][0], boundaryPoints[i][1]);
      }
      shape.closePath();

      const farmGeo = new THREE.ShapeGeometry(shape);
      const farmMat = new THREE.MeshStandardMaterial({
        color: 0x84cc16, // rich pasture green
        roughness: 0.85,
      });
      const farmMesh = new THREE.Mesh(farmGeo, farmMat);
      farmMesh.rotation.x = Math.PI / 2;
      farmMesh.rotation.z = Math.PI;
      farmMesh.position.set(0, 0, 0);
      farmMesh.receiveShadow = true;
      scene.add(farmMesh);
    }

    // ── 6. Procedural 3D Growing Beds ──
    if (layers.beds) {
      beds.forEach((bed) => {
        const typeDef = BED_TYPES_CATALOGUE.find((b) => b.type === bed.type) ?? BED_TYPES_CATALOGUE[0];
        const elevationM = Math.max(0.1, (bed.heightMm || typeDef.defaultHeightMm) / 1000);

        const bedGeo = new THREE.BoxGeometry(bed.width, elevationM, bed.height);
        const bedMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(bed.color || typeDef.defaultColor),
          roughness: 0.75,
        });

        const bedMesh = new THREE.Mesh(bedGeo, bedMat);
        bedMesh.position.set(bed.x + bed.width / 2, elevationM / 2, bed.y + bed.height / 2);
        bedMesh.castShadow = true;
        bedMesh.receiveShadow = true;
        scene.add(bedMesh);

        // Bed Timber Rim / Stone Edge
        const rimGeo = new THREE.BoxGeometry(bed.width + 0.1, 0.05, bed.height + 0.1);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.position.set(bed.x + bed.width / 2, elevationM, bed.y + bed.height / 2);
        scene.add(rimMesh);

        // 3D Crops planted in this bed
        if (layers.crops && bed.crops.length > 0) {
          const totalCrops = bed.crops.length;
          bed.crops.forEach((c, cIdx) => {
            const cropElevation = elevationM + 0.2;
            const plantGeo = new THREE.DodecahedronGeometry(0.2, 1);
            const plantMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.color || 0x22c55e), roughness: 0.5 });
            const plantMesh = new THREE.Mesh(plantGeo, plantMat);
            const offsetX = (bed.width / (totalCrops + 1)) * (cIdx + 1) - bed.width / 2;
            plantMesh.position.set(bed.x + bed.width / 2 + offsetX, cropElevation, bed.y + bed.height / 2);
            plantMesh.castShadow = true;
            scene.add(plantMesh);
          });
        }
      });
    }

    // ── 7. Procedural 3D Trees ──
    if (layers.trees) {
      trees.forEach((tree) => {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(tree.x, 0, tree.y);

        // Trunk
        const trunkHeight = tree.heightM * 0.4;
        const trunkGeo = new THREE.CylinderGeometry(tree.trunkDiameterM / 2, tree.trunkDiameterM / 2 + 0.05, trunkHeight, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
        trunkMesh.position.y = trunkHeight / 2;
        trunkMesh.castShadow = true;
        treeGroup.add(trunkMesh);

        // Foliage Canopy
        const canopyRadius = tree.canopyDiameterM / 2;
        const foliageGeo = new THREE.SphereGeometry(canopyRadius, 12, 10);
        const foliageMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(tree.color || 0x15803d),
          roughness: 0.6,
          flatShading: true,
        });
        const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
        foliageMesh.position.y = trunkHeight + canopyRadius * 0.7;
        foliageMesh.scale.set(1, 1.2, 1);
        foliageMesh.castShadow = true;
        treeGroup.add(foliageMesh);

        // Ground Canopy Ring Indicator
        const ringGeo = new THREE.RingGeometry(canopyRadius - 0.05, canopyRadius, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.02;
        treeGroup.add(ringMesh);

        scene.add(treeGroup);
      });
    }

    // ── 8. Procedural 3D Farm Elements ──
    if (layers.water || layers.buildings || layers.animals || layers.paths || layers.fencing) {
      elements.forEach((elem) => {
        if (elem.category === 'water' && layers.water) {
          // Water Pond
          const waterGeo = new THREE.CylinderGeometry(elem.width / 2, elem.width / 2, 0.3, 24);
          const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.85,
          });
          const waterMesh = new THREE.Mesh(waterGeo, waterMat);
          waterMesh.position.set(elem.x + elem.width / 2, 0.05, elem.y + elem.height / 2);
          scene.add(waterMesh);
        } else if (elem.type === 'pathway' && layers.paths) {
          const pathGeo = new THREE.PlaneGeometry(elem.width, elem.height);
          const pathMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 });
          const pathMesh = new THREE.Mesh(pathGeo, pathMat);
          pathMesh.rotation.x = -Math.PI / 2;
          pathMesh.position.set(elem.x + elem.width / 2, 0.02, elem.y + elem.height / 2);
          scene.add(pathMesh);
        } else if ((elem.category === 'infrastructure' || elem.category === 'animal') && (layers.buildings || layers.animals)) {
          // 3D Shed / Greenhouse / Gaushala
          const bHeight = elem.heightM || 3.0;
          const buildingGeo = new THREE.BoxGeometry(elem.width, bHeight, elem.height);
          const buildingMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(elem.color || 0xb45309),
            roughness: 0.7,
            transparent: elem.type === 'greenhouse',
            opacity: elem.type === 'greenhouse' ? 0.6 : 1.0,
          });
          const bMesh = new THREE.Mesh(buildingGeo, buildingMat);
          bMesh.position.set(elem.x + elem.width / 2, bHeight / 2, elem.y + elem.height / 2);
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;
          scene.add(bMesh);

          // Roof Pyramid / Ridge
          const roofGeo = new THREE.ConeGeometry(Math.max(elem.width, elem.height) * 0.7, 1.5, 4);
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
          const roofMesh = new THREE.Mesh(roofGeo, roofMat);
          roofMesh.position.set(elem.x + elem.width / 2, bHeight + 0.75, elem.y + elem.height / 2);
          roofMesh.rotation.y = Math.PI / 4;
          roofMesh.castShadow = true;
          scene.add(roofMesh);
        }
      });
    }

    // ── 9. Animation & Render Loop ──
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);

      if (isWalkthrough) {
        // Walkthrough Movement
        const speed = 0.2;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), walkthroughYawPitchRef.current.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), walkthroughYawPitchRef.current.yaw);

        if (keysDownRef.current['w'] || keysDownRef.current['ArrowUp']) walkthroughPosRef.current.addScaledVector(forward, speed);
        if (keysDownRef.current['s'] || keysDownRef.current['ArrowDown']) walkthroughPosRef.current.addScaledVector(forward, -speed);
        if (keysDownRef.current['a'] || keysDownRef.current['ArrowLeft']) walkthroughPosRef.current.addScaledVector(right, -speed);
        if (keysDownRef.current['d'] || keysDownRef.current['ArrowRight']) walkthroughPosRef.current.addScaledVector(right, speed);

        camera.position.copy(walkthroughPosRef.current);
        const lookTarget = walkthroughPosRef.current.clone().add(
          new THREE.Vector3(
            Math.sin(walkthroughYawPitchRef.current.yaw) * Math.cos(walkthroughYawPitchRef.current.pitch),
            Math.sin(walkthroughYawPitchRef.current.pitch),
            -Math.cos(walkthroughYawPitchRef.current.yaw) * Math.cos(walkthroughYawPitchRef.current.pitch)
          )
        );
        camera.lookAt(lookTarget);
      } else {
        // Orbit Camera Positioning
        const { radius, theta, phi } = sphericalRef.current;
        camera.position.x = targetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = Math.max(1, radius * Math.cos(phi));
        camera.position.z = targetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(targetRef.current);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      renderer.dispose();
    };
  }, [
    metersWidth,
    metersHeight,
    boundaryPoints,
    beds,
    trees,
    elements,
    layers,
    timeOfDay,
    isWalkthrough,
  ]);

  // Orbit controls mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const deltaX = e.clientX - mousePosRef.current.x;
    const deltaY = e.clientY - mousePosRef.current.y;
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isWalkthrough) {
      walkthroughYawPitchRef.current.yaw -= deltaX * 0.005;
      walkthroughYawPitchRef.current.pitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, walkthroughYawPitchRef.current.pitch - deltaY * 0.005)
      );
    } else {
      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - deltaY * 0.008));
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isWalkthrough) return;
    sphericalRef.current.radius = Math.max(8, Math.min(180, sphericalRef.current.radius + e.deltaY * 0.05));
  };

  // Keyboard navigation for walkthrough
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const resetCamera = () => {
    sphericalRef.current = { radius: 45, theta: 0.8, phi: 1.1 };
    targetRef.current = new THREE.Vector3(metersWidth / 2, 0, metersHeight / 2);
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-stone-900 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Controls HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-2 rounded-2xl border border-white/20 bg-stone-900/80 px-3 py-2 text-xs text-white shadow-xl backdrop-blur">
        {/* Time of Day */}
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setTimeOfDay('morning')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
              timeOfDay === 'morning' ? 'bg-amber-400 text-stone-900 font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Sunrise className="h-3.5 w-3.5" />
            <span>Morning</span>
          </button>
          <button
            type="button"
            onClick={() => setTimeOfDay('noon')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
              timeOfDay === 'noon' ? 'bg-sky-400 text-stone-900 font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Noon</span>
          </button>
          <button
            type="button"
            onClick={() => setTimeOfDay('sunset')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
              timeOfDay === 'sunset' ? 'bg-orange-500 text-white font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Sunset className="h-3.5 w-3.5" />
            <span>Golden Hour</span>
          </button>
        </div>

        <div className="h-4 w-px bg-white/20" />

        {/* Walkthrough Mode Toggle */}
        <button
          type="button"
          onClick={onToggleWalkthrough}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
            isWalkthrough ? 'bg-green-500 text-stone-950 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          <span>{isWalkthrough ? 'Exit Walkthrough' : '360° Walkthrough Mode'}</span>
        </button>

        <button
          type="button"
          onClick={resetCamera}
          title="Reset Bird's Eye View"
          className="rounded-xl bg-white/10 p-1.5 text-stone-300 hover:bg-white/20 hover:text-white transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Walkthrough Navigation Hints */}
      {isWalkthrough && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl border border-white/20 bg-stone-900/90 px-6 py-2.5 text-center text-xs text-white shadow-2xl backdrop-blur">
          <p className="flex items-center justify-center gap-1.5 font-bold text-green-400">
            <Footprints className="h-4 w-4" />
            <span>360° Ground Walkthrough Active</span>
          </p>
          <p className="mt-0.5 text-[11px] text-stone-300">
            Use <kbd className="rounded bg-white/20 px-1 font-mono">W</kbd> <kbd className="rounded bg-white/20 px-1 font-mono">A</kbd> <kbd className="rounded bg-white/20 px-1 font-mono">S</kbd> <kbd className="rounded bg-white/20 px-1 font-mono">D</kbd> or arrow keys to walk • Drag mouse to look 360°
          </p>
        </div>
      )}
    </div>
  );
}
