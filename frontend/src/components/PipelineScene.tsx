import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PipelineStepData } from '../data/pipelineData';

interface Props {
  activeStep: number;
  steps: PipelineStepData[];
}

const NODE_SPACING = 2.8;
const RING_RADIUS = 0.6;
const RING_TUBE = 0.04;
const PARTICLE_COUNT = 60;
const AMBIENT_COUNT = 120;

const PipelineScene: React.FC<Props> = ({ activeStep, steps: pipelineSteps }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; color: string } | null>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    startTime: number;
    nodes: THREE.Group[];
    particleSystems: THREE.Points[];
    frameId: number;
    disposed: boolean;
  } | null>(null);
  const activeStepRef = useRef(activeStep);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const rect = ctx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ctx.camera);

    for (let i = 0; i < ctx.nodes.length; i++) {
      const intersects = raycaster.intersectObjects(ctx.nodes[i].children, true);
      if (intersects.length > 0) {
        const step = pipelineSteps[i];
        setTooltip({ x: e.clientX, y: e.clientY, label: `${step.title} — ${step.subtitle}`, color: step.color });
        return;
      }
    }
    setTooltip(null);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = mountRef.current;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.08);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x222233, 0.6));
    const topLight = new THREE.PointLight(0x8B5CF6, 1.5, 20);
    topLight.position.set(2, 4, 3);
    scene.add(topLight);
    const bottomLight = new THREE.PointLight(0xFF3366, 1.5, 20);
    bottomLight.position.set(-2, -4, 3);
    scene.add(bottomLight);

    // ── Build nodes (vertical, top to bottom) ──
    const nodes: THREE.Group[] = [];
    const nodeLights: THREE.PointLight[] = [];
    const totalHeight = (pipelineSteps.length - 1) * NODE_SPACING;

    pipelineSteps.forEach((step, i) => {
      const group = new THREE.Group();
      const y = totalHeight / 2 - i * NODE_SPACING;
      group.position.set(0, y, 0);

      // Outer ring
      const ringGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(step.color),
        emissive: new THREE.Color(step.color),
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Inner glow sphere
      const glowGeo = new THREE.SphereGeometry(RING_RADIUS * 0.45, 16, 16);
      const glowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(step.color),
        emissive: new THREE.Color(step.color),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.15,
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      // Wireframe icosahedron inside
      const icoGeo = new THREE.IcosahedronGeometry(RING_RADIUS * 0.3, 0);
      const icoMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(step.color),
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      group.add(new THREE.Mesh(icoGeo, icoMat));

      // Node point light
      const light = new THREE.PointLight(new THREE.Color(step.color), 0.5, 4);
      group.add(light);
      nodeLights.push(light);

      scene.add(group);
      nodes.push(group);
    });

    // ── Connecting lines ──
    for (let i = 0; i < nodes.length - 1; i++) {
      const start = nodes[i].position.clone();
      const end = nodes[i + 1].position.clone();
      const points = [start, end];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x333355,
        transparent: true,
        opacity: 0.4,
      });
      scene.add(new THREE.Line(lineGeo, lineMat));
    }

    // ── Particle streams between nodes ──
    const particleSystems: THREE.Points[] = [];

    for (let seg = 0; seg < nodes.length - 1; seg++) {
      const count = prefersReduced ? 15 : PARTICLE_COUNT;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const speeds: number[] = [];

      const c1 = new THREE.Color(pipelineSteps[seg].color);
      const c2 = new THREE.Color(pipelineSteps[seg + 1].color);
      const startY = nodes[seg].position.y;
      const endY = nodes[seg + 1].position.y;

      for (let j = 0; j < count; j++) {
        const t = Math.random();
        positions[j * 3] = (Math.random() - 0.5) * 0.4;
        positions[j * 3 + 1] = startY + (endY - startY) * t;
        positions[j * 3 + 2] = (Math.random() - 0.5) * 0.4;

        const c = c1.clone().lerp(c2, t);
        colors[j * 3] = c.r;
        colors[j * 3 + 1] = c.g;
        colors[j * 3 + 2] = c.b;

        speeds.push(0.3 + Math.random() * 0.7);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8,
      });

      const points = new THREE.Points(geo, mat);
      (points as any)._speeds = speeds;
      (points as any)._startY = startY;
      (points as any)._endY = endY;
      scene.add(points);
      particleSystems.push(points);
    }

    // ── Ambient floating particles ──
    const ambientPositions = new Float32Array(AMBIENT_COUNT * 3);
    const ambientColors = new Float32Array(AMBIENT_COUNT * 3);
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * 12;
      ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * totalHeight + 2;
      ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;

      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.8, 0.5);
      ambientColors[i * 3] = c.r;
      ambientColors[i * 3 + 1] = c.g;
      ambientColors[i * 3 + 2] = c.b;
    }
    const ambientGeo = new THREE.BufferGeometry();
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    ambientGeo.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));
    const ambientMat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.4,
    });
    scene.add(new THREE.Points(ambientGeo, ambientMat));

    // ── Mouse interaction ──
    window.addEventListener('mousemove', handleMouseMove);

    // ── Resize ──
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ──
    const startTime = performance.now();

    const animate = () => {
      if (sceneRef.current?.disposed) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const currentActive = activeStepRef.current;

      // Rotate node rings and inner shapes
      nodes.forEach((group, i) => {
        const ring = group.children[0] as THREE.Mesh;
        const ico = group.children[2] as THREE.Mesh;

        if (!prefersReduced) {
          ring.rotation.z = elapsed * 0.3 + i * 0.5;
          ico.rotation.x = elapsed * 0.5 + i;
          ico.rotation.y = elapsed * 0.3;
        }

        // Active node glow
        const isActive = i === currentActive;
        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isActive ? 0.6 + Math.sin(elapsed * 3) * 0.3 : 0.3;
        mat.opacity = isActive ? 1.0 : 0.7;

        const icoMat = ico.material as THREE.MeshStandardMaterial;
        icoMat.opacity = isActive ? 0.7 : 0.3;

        nodeLights[i].intensity = isActive ? 1.5 + Math.sin(elapsed * 3) * 0.5 : 0.4;
      });

      // Animate particle streams (flow downward)
      particleSystems.forEach((ps) => {
        const posAttr = ps.geometry.getAttribute('position') as THREE.BufferAttribute;
        const speeds = (ps as any)._speeds as number[];
        const startY = (ps as any)._startY as number;
        const endY = (ps as any)._endY as number;
        const range = endY - startY; // negative (flowing down)

        for (let j = 0; j < posAttr.count; j++) {
          let y = posAttr.getY(j) + range * speeds[j] * 0.003;
          if (y < endY) y = startY; // Reset to top when reaching bottom
          if (y > startY) y = endY; // Safety wrap
          posAttr.setY(j, y);

          // Slight horizontal wobble
          const x = posAttr.getX(j) + Math.sin(elapsed * 2 + j) * 0.0005;
          posAttr.setX(j, x);
        }
        posAttr.needsUpdate = true;
      });

      // Camera follows active step smoothly
      const targetY = totalHeight / 2 - currentActive * NODE_SPACING;
      const targetCamY = targetY * 0.4;

      if (!prefersReduced) {
        camera.position.x = 3 + Math.sin(elapsed * 0.2) * 0.5;
        camera.position.z = 5 + Math.cos(elapsed * 0.15) * 0.3;
      }
      camera.position.y += (targetCamY - camera.position.y) * 0.02;
      camera.lookAt(0, targetY * 0.3, 0);

      renderer.render(scene, camera);
      sceneRef.current!.frameId = requestAnimationFrame(animate);
    };

    sceneRef.current = {
      renderer,
      scene,
      camera,
      startTime,
      nodes,
      particleSystems,
      frameId: requestAnimationFrame(animate),
      disposed: false,
    };

    return () => {
      const ctx = sceneRef.current;
      if (!ctx) return;
      ctx.disposed = true;
      cancelAnimationFrame(ctx.frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', handleMouseMove);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [handleMouseMove]);

  return (
    <div className="relative w-full h-full" ref={mountRef}>
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 text-[10px] font-bold tracking-wider border"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            fontFamily: 'var(--font-display)',
            color: tooltip.color,
            borderColor: tooltip.color,
            background: 'var(--color-card)',
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
};

export default PipelineScene;
