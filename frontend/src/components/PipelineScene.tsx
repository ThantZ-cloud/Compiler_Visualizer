import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

const PHASES = [
  { label: 'LEXING', color: 0x00FF88, desc: 'Break source into tokens' },
  { label: 'PARSING', color: 0x00D4FF, desc: 'Build syntax tree' },
  { label: 'AST', color: 0xFF00FF, desc: 'Abstract syntax tree' },
  { label: 'SEMANTIC', color: 0xFFB000, desc: 'Analyze symbol table' },
  { label: 'BYTECODE', color: 0xFF3366, desc: 'JVM instructions' },
];

const SPACING = 3.5;
const CUBE_SIZE = 0.9;
const PARTICLE_COUNT = 120;
const REDUCED_PARTICLE_COUNT = 30;

interface HoverInfo {
  label: string;
  desc: string;
  x: number;
  y: number;
}

const PipelineScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubesRef = useRef<THREE.Object3D[]>([]);
  const particlesRef = useRef<THREE.Points[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const frameRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const getPhasePosition = useCallback((index: number) => {
    const totalWidth = (PHASES.length - 1) * SPACING;
    const startX = -totalWidth / 2;
    return { x: startX + index * SPACING, y: 0, z: 0 };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0A0F);
    scene.fog = new THREE.FogExp2(0x0A0A0F, 0.04);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x222233, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00FF88, 1.5, 20);
    pointLight1.position.set(-6, 3, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF00FF, 1.0, 20);
    pointLight2.position.set(6, -2, 5);
    scene.add(pointLight2);

    // Grid floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x1E1E30, 0x1E1E30);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Cubes for each phase
    const cubes: THREE.Object3D[] = [];
    const cubeGroup = new THREE.Group();

    PHASES.forEach((phase, i) => {
      const pos = getPhasePosition(i);

      // Main cube
      const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      const edges = new THREE.EdgesGeometry(geometry);
      const material = new THREE.LineBasicMaterial({
        color: phase.color,
        transparent: true,
        opacity: 0.9,
      });
      const wireframe = new THREE.LineSegments(edges, material);
      wireframe.position.set(pos.x, pos.y, pos.z);

      // Inner glow cube
      const innerGeometry = new THREE.BoxGeometry(
        CUBE_SIZE * 0.7,
        CUBE_SIZE * 0.7,
        CUBE_SIZE * 0.7
      );
      const innerMaterial = new THREE.MeshStandardMaterial({
        color: phase.color,
        transparent: true,
        opacity: 0.15,
        emissive: phase.color,
        emissiveIntensity: 0.3,
      });
      const innerCube = new THREE.Mesh(innerGeometry, innerMaterial);
      wireframe.add(innerCube);

      // Point light per cube
      const cubeLight = new THREE.PointLight(phase.color, 0.5, 4);
      wireframe.add(cubeLight);

      cubeGroup.add(wireframe);
      cubes.push(wireframe);
    });

    scene.add(cubeGroup);
    cubesRef.current = cubes;

    // Connecting lines between cubes
    for (let i = 0; i < PHASES.length - 1; i++) {
      const start = getPhasePosition(i);
      const end = getPhasePosition(i + 1);

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x + CUBE_SIZE / 2 + 0.1, start.y, start.z),
        new THREE.Vector3(end.x - CUBE_SIZE / 2 - 0.1, end.y, end.z),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x1E1E30,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
    }

    // Particle streams between cubes
    const particleCount = reducedMotion ? REDUCED_PARTICLE_COUNT : PARTICLE_COUNT;
    const particles: THREE.Points[] = [];

    for (let i = 0; i < PHASES.length - 1; i++) {
      const start = getPhasePosition(i);
      const end = getPhasePosition(i + 1);
      const startColor = new THREE.Color(PHASES[i].color);
      const endColor = new THREE.Color(PHASES[i + 1].color);

      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);

      for (let j = 0; j < particleCount; j++) {
        const t = Math.random();
        positions[j * 3] = start.x + CUBE_SIZE / 2 + 0.2 + t * (SPACING - CUBE_SIZE - 0.4);
        positions[j * 3 + 1] = start.y + (Math.random() - 0.5) * 0.6;
        positions[j * 3 + 2] = start.z + (Math.random() - 0.5) * 0.6;

        const color = startColor.clone().lerp(endColor, t);
        colors[j * 3] = color.r;
        colors[j * 3 + 1] = color.g;
        colors[j * 3 + 2] = color.b;

        speeds[j] = 0.3 + Math.random() * 0.5;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geometry, material);
      (points as any)._speeds = speeds;
      (points as any)._startX = start.x + CUBE_SIZE / 2 + 0.2;
      (points as any)._endX = end.x - CUBE_SIZE / 2 - 0.2;
      (points as any)._segmentStart = i;

      scene.add(points);
      particles.push(points);
    }

    particlesRef.current = particles;

    // Floating ambient particles
    const ambientCount = 200;
    const ambientPositions = new Float32Array(ambientCount * 3);
    const ambientColors = new Float32Array(ambientCount * 3);

    for (let i = 0; i < ambientCount; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * 20;
      ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const brightness = 0.1 + Math.random() * 0.3;
      ambientColors[i * 3] = 0 * brightness;
      ambientColors[i * 3 + 1] = 1 * brightness;
      ambientColors[i * 3 + 2] = 0.5 * brightness;
    }

    const ambientGeometry = new THREE.BufferGeometry();
    ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    ambientGeometry.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));

    const ambientMaterial = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ambientParticles = new THREE.Points(ambientGeometry, ambientMaterial);
    scene.add(ambientParticles);

    // Animation loop
    const clock = new THREE.Clock();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotate cubes gently
      if (!reducedMotion) {
        cubes.forEach((cube, i) => {
          cube.rotation.x = Math.sin(elapsed * 0.5 + i * 0.5) * 0.15;
          cube.rotation.y = elapsed * 0.2 + i * 0.3;
          cube.position.y = Math.sin(elapsed * 0.8 + i * 1.2) * 0.15;
        });
      }

      // Animate particles flowing between cubes
      particles.forEach((points) => {
        const positions = points.geometry.attributes.position as THREE.BufferAttribute;
        const speeds = (points as any)._speeds as Float32Array;
        const startX = (points as any)._startX as number;
        const endX = (points as any)._endX as number;

        for (let j = 0; j < positions.count; j++) {
          let x = positions.getX(j) + speeds[j] * 0.02;
          if (x > endX) {
            x = startX;
            positions.setY(j, (Math.random() - 0.5) * 0.6);
            positions.setZ(j, (Math.random() - 0.5) * 0.6);
          }
          positions.setX(j, x);
        }
        positions.needsUpdate = true;
      });

      // Rotate ambient particles slowly
      if (!reducedMotion) {
        ambientParticles.rotation.y = elapsed * 0.02;
      }

      // Camera gentle orbit (unless reduced motion)
      if (!reducedMotion) {
        camera.position.x = Math.sin(elapsed * 0.1) * 1.5;
        camera.position.y = 2.5 + Math.sin(elapsed * 0.15) * 0.5;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Mouse move for hover detection
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Hover detection interval
    const hoverInterval = setInterval(() => {
      raycasterRef.current.setFromCamera(new THREE.Vector2(mouseRef.current.x, mouseRef.current.y), camera);
      const intersects = raycasterRef.current.intersectObjects(cubes, true);
      const containerRect = container.getBoundingClientRect();

      if (intersects.length > 0) {
        // Find which cube was hit
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && !cubes.includes(hitObject)) {
          hitObject = hitObject.parent;
        }
        const cubeIndex = cubes.indexOf(hitObject!);
        if (cubeIndex >= 0) {
          const phase = PHASES[cubeIndex];
          const screenPos = cubes[cubeIndex].position.clone();
          screenPos.project(camera);
          const x = ((screenPos.x + 1) / 2) * containerRect.width;
          const y = ((-screenPos.y + 1) / 2) * containerRect.height;
          setHoverInfo({ label: phase.label, desc: phase.desc, x, y });
        }
      } else {
        setHoverInfo(null);
      }
    }, 50);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(hoverInterval);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);

      // Dispose Three.js resources
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion, getPhasePosition]);

  return (
    <div className="pipeline-scene-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      />

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: hoverInfo.x,
            top: hoverInfo.y - 60,
            transform: 'translateX(-50%)',
            background: 'rgba(18, 18, 26, 0.95)',
            border: '1px solid var(--color-neon)',
            padding: '8px 14px',
            pointerEvents: 'none',
            zIndex: 10,
            fontFamily: 'var(--font-display)',
            textAlign: 'center',
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.2)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-neon)', letterSpacing: '0.15em', marginBottom: '2px' }}>
            {hoverInfo.label}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {hoverInfo.desc}
          </div>
        </div>
      )}

      {/* Phase labels below scene */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        pointerEvents: 'none',
      }}>
        {PHASES.map((phase) => (
          <span
            key={phase.label}
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: `#${phase.color.toString(16).padStart(6, '0')}`,
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PipelineScene;
