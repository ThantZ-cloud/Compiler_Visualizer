import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface Props {
  scrollProgress: number;
}

const STAR_COUNT = 2500;
const CAMERA_START_X = -20;
const CAMERA_END_X = 20;

/** Generate canvas texture for Saturn's surface (realistic golden/cream banding) */
function createSaturnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic vertical banding: darker pale-tan poles, bright golden equator
  const bands = [
    { y: 0.00, color: '#8a7d63' },
    { y: 0.08, color: '#9c8f73' },
    { y: 0.16, color: '#b3a37f' },
    { y: 0.26, color: '#c8b48a' },
    { y: 0.36, color: '#d9c49a' },
    { y: 0.46, color: '#cbb184' },
    { y: 0.52, color: '#e0cfa6' },
    { y: 0.58, color: '#cbb184' },
    { y: 0.68, color: '#b39a6e' },
    { y: 0.80, color: '#8a7d63' },
    { y: 0.92, color: '#6e6350' },
    { y: 1.00, color: '#574e3e' },
  ];

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  bands.forEach((b) => grad.addColorStop(b.y, b.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Atmospheric turbulence streaks (faint wavy horizontal strokes)
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    const y = 20 + Math.random() * 472;
    const alpha = 0.02 + Math.random() * 0.07;
    const light = Math.random() > 0.5;
    ctx.strokeStyle = light ? `rgba(255, 250, 235, ${alpha})` : `rgba(90, 74, 50, ${alpha})`;
    ctx.beginPath();
    const x0 = Math.random() * 1024;
    ctx.moveTo(x0, y);
    ctx.bezierCurveTo(x0 + 200, y - 6 + Math.random() * 12, x0 + 500, y + 6 + Math.random() * 12, x0 + 900, y - 4 + Math.random() * 8);
    ctx.stroke();
  }

  // Subtle darker oval storm near the equator
  ctx.fillStyle = 'rgba(150, 120, 78, 0.16)';
  ctx.beginPath();
  ctx.ellipse(760, 250, 60, 18, -0.05, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Generate canvas texture for Saturn's ring system (realistic band structure) */
function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Real ring structure mapped along radius (x from inner to outer)
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');            // gap near planet
  grad.addColorStop(0.05, 'rgba(130, 118, 100, 0.35)');   // C ring (faint, dusty)
  grad.addColorStop(0.22, 'rgba(160, 145, 122, 0.45)');   // C ring
  grad.addColorStop(0.30, 'rgba(60, 55, 46, 0.1)');       // small gap
  grad.addColorStop(0.34, 'rgba(225, 208, 175, 0.95)');   // B ring (bright, wide)
  grad.addColorStop(0.55, 'rgba(235, 218, 185, 1.0)');    // B ring core
  grad.addColorStop(0.62, 'rgba(70, 62, 50, 0.08)');      // Cassini Division (dark gap)
  grad.addColorStop(0.66, 'rgba(200, 183, 152, 0.85)');   // A ring
  grad.addColorStop(0.80, 'rgba(190, 173, 143, 0.75)');   // A ring outer
  grad.addColorStop(0.92, 'rgba(140, 128, 105, 0.25)');   // fade out
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  // Fine ringlet texture (thousands of tiny radial striations)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let x = 0; x < 1024; x += 2) {
    if (Math.random() > 0.35) ctx.fillRect(x, 0, 1, 64);
  }
  ctx.fillStyle = 'rgba(255, 248, 230, 0.06)';
  for (let x = 0; x < 1024; x += 3) {
    if (Math.random() > 0.7) ctx.fillRect(x, 0, 1, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Generate a soft round star sprite (avoids default square GL_POINTS) */
function createStarSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type PlanetState = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  t: number;
  duration: number;
  y: number;
  spin: number;
  sweepHalf: number;
};

const PipelineScene: React.FC<Props> = ({ scrollProgress }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotionRef = useRef(prefersReduced);

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    reducedMotionRef.current = prefersReduced;
  }, [prefersReduced]);

  useEffect(() => {
    if (!mountRef.current) return;

    const prefersReduced = reducedMotionRef.current;
    const container = mountRef.current;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(CAMERA_START_X, 0, 45);
    camera.lookAt(CAMERA_START_X, 0, 0);

    // ── Lighting ──
    // Near-black ambient (space is lit by a single sun)
    scene.add(new THREE.AmbientLight(0x0a0a0a, 0.12));

    // Distant Sun Light (directional key light producing realistic planet shadows)
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
    sunLight.position.set(80, 40, 60);
    scene.add(sunLight);

    const disposables: Array<{ dispose(): void }> = [];

    // ── Star Field (two layers: faint dust + bright highlight stars) ──
    const BRIGHT_STAR_COUNT = 140;
    const starFieldGroup = new THREE.Group();

    // Realistic stellar palette: white-dominant with subtle blue-white & warm tones
    const colorPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#eaf2ff'),
      new THREE.Color('#fff4e0'),
    ];

    const makeStars = (count: number, size: number, opacity: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const radius = 120 + Math.random() * 280;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size,
        map: starSprite,
        vertexColors: true,
        transparent: true,
        opacity,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      starFieldGroup.add(points);
      disposables.push(geo, mat);
      return points;
    };

    const starSprite = createStarSpriteTexture();
    disposables.push(starSprite);

    makeStars(STAR_COUNT, 1.4, 0.9); // faint dust
    makeStars(BRIGHT_STAR_COUNT, 4.2, 1.0); // bright highlights (bloom)

    scene.add(starFieldGroup);

    // ── Saturn (single drifting planet with rings) ──
    const createPlanet = (texture: THREE.CanvasTexture, radius: number, ringTexture?: THREE.CanvasTexture) => {
      const group = new THREE.Group();
      const geo = new THREE.SphereGeometry(radius, 48, 48);
      const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.05 });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      disposables.push(texture, geo, mat);

      if (ringTexture) {
        const ringGeo = new THREE.RingGeometry(radius * 1.25, radius * 2.3, 64);
        const uvs = ringGeo.attributes.uv;
        for (let i = 0; i < uvs.count; i++) {
          uvs.setX(i, i % 2 === 0 ? 0 : 1);
        }
        uvs.needsUpdate = true;
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTexture,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          roughness: 0.9,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        group.add(ringMesh);
        disposables.push(ringTexture, ringGeo, ringMat);
      }

      // Tilt the whole planet for a natural look
      group.rotation.z = -0.35;
      group.rotation.x = 0.18;

      scene.add(group);
      return { group, mesh };
    };

    const saturn: PlanetState = {
      ...createPlanet(createSaturnTexture(), 4.2, createSaturnRingTexture()),
      t: 0.35,
      duration: 130,
      y: 1,
      spin: 0.05,
      sweepHalf: 42,
    };
    saturn.group.position.set(camera.position.x - saturn.sweepHalf + 2 * saturn.sweepHalf * saturn.t, saturn.y, 10);

    if (prefersReduced) {
      // Reduced motion: park Saturn at a static, pleasant spot
      saturn.group.position.set(15, 3, 5);
      saturn.group.visible = true;
    }

    // ── Post-processing ──
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Very subtle bloom for brightest star highlights
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth / 2, container.clientHeight / 2),
      0.15, // strength
      0.3, // radius
      0.6, // threshold (only bright highlights bloom)
    );
    composer.addPass(bloomPass);

    // Edge vignette for space depth frame
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms['offset'].value = 0.5;
    vignette.uniforms['darkness'].value = 1.0;
    composer.addPass(vignette);

    composer.addPass(new OutputPass());

    // ── Resize ──
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animation Loop ──
    let frameId = 0;
    let disposed = false;
    let prevElapsed = 0;
    const startTime = performance.now();

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;
      const dt = Math.min(elapsed - prevElapsed, 0.1);
      prevElapsed = elapsed;

      const progress = Math.min(Math.max(scrollRef.current, 0), 1);

      // Camera horizontal pan following scroll progress
      const targetX = CAMERA_START_X + (CAMERA_END_X - CAMERA_START_X) * progress;
      camera.position.x += (targetX - camera.position.x) * 0.05;

      if (!reducedMotionRef.current) {
        // Very subtle camera floating bob
        camera.position.y = Math.sin(elapsed * 0.2) * 0.4;

        // Star field gentle continuous rotation (slow drift through space)
        starFieldGroup.rotation.y += dt * 0.012;
        starFieldGroup.rotation.x = Math.sin(elapsed * 0.004) * 0.06;

        // Saturn: drift across the screen (screen-right = +X), then loop back
        saturn.t += dt / saturn.duration;
        if (saturn.t > 1) {
          saturn.t = 0;
          saturn.duration = 120 + Math.random() * 60;
          saturn.y = -8 + Math.random() * 17;
        }
        const so = -saturn.sweepHalf + 2 * saturn.sweepHalf * saturn.t;
        saturn.group.position.x = camera.position.x + so;
        saturn.group.position.y = saturn.y;
        saturn.group.position.z = 10;
        saturn.mesh.rotation.y += saturn.spin;
      }

      composer.render();
    };
    animate();

    // ── Cleanup ──
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      disposables.forEach((d) => d.dispose());
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />;
};

export default PipelineScene;
