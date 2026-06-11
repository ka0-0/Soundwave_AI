import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  Stars
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';

// High-vibrancy design palette for maximum energy and contrast
const COLORS = {
  deepBlack: '#020005', // Darker void black to increase neon contrast
  darkViolet: '#2e0854', // Rich, saturated violet
  electricPurple: '#B026FF', // Blazing neon electric purple
  softLavender: '#FF77FF', // Bright electric magenta-lavender
  neonCyan: '#00FFFF', // Popping cyan accent
  white: '#ffffff'
};

// 1. A glowing neural pulse traveling along the neural path (vibrant cyan/lavender)
const NeuralPulse = ({ curve, speed, delay, color }) => {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = ((t * speed) + delay) % 1.0;
    if (ref.current) {
      const pos = curve.getPointAt(progress);
      ref.current.position.copy(pos);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.14, 8, 8]} />
      <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending} opacity={0.9} />
    </mesh>
  );
};

// 2. Intelligent Universe: Starfield, neural paths & electrical pulses
const DarkUniverse = ({ animState }) => {
  const starsRef = useRef();
  const neuralRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = animState.current;

    // Stars speed up and rotate as travel phase is active
    const travelSpeed = progress.travel * 0.05 + 0.005;
    
    if (starsRef.current) {
      starsRef.current.rotation.y = t * 0.004;
      starsRef.current.rotation.x = t * travelSpeed;
    }
    
    if (neuralRef.current) {
      neuralRef.current.rotation.z = t * 0.002;
    }
  });

  const paths = useMemo(() => {
    const list = [];
    for (let p = 0; p < 6; p++) {
      const points = [];
      const segments = 6;
      const startX = -35;
      const endX = 35;
      for (let i = 0; i < segments; i++) {
        const pct = i / (segments - 1);
        const x = THREE.MathUtils.lerp(startX, endX, pct);
        // Neural path waving shape
        const y = (Math.sin(pct * Math.PI * 2 + p) * 4) + (Math.random() - 0.5) * 5;
        const z = (Math.cos(pct * Math.PI * 1.5 + p) * 4) + (Math.random() - 0.5) * 5;
        points.push(new THREE.Vector3(x, y, z));
      }
      list.push(new THREE.CatmullRomCurve3(points));
    }
    return list;
  }, []);

  // Pre-build standard geometries for the neural paths to avoid dynamic ref bindings
  const pathGeometries = useMemo(() => {
    return paths.map(path => {
      const pts = path.getPoints(60);
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, [paths]);

  return (
    <group>
      <Stars ref={starsRef} radius={120} depth={50} count={3500} factor={6} saturation={0.8} fade speed={1.5} />
      
      {/* Neural Paths & Signals */}
      <group ref={neuralRef}>
        {paths.map((path, idx) => (
          <group key={idx}>
            <line geometry={pathGeometries[idx]}>
              <lineBasicMaterial
                color={idx % 2 === 0 ? COLORS.electricPurple : COLORS.neonCyan}
                transparent
                opacity={0.12} // Increased visibility
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </line>
            <NeuralPulse curve={path} speed={0.12 + idx * 0.02} delay={idx * 0.15} color={idx % 2 === 0 ? COLORS.neonCyan : COLORS.softLavender} />
            <NeuralPulse curve={path} speed={0.08 + idx * 0.03} delay={idx * 0.4} color={COLORS.white} />
          </group>
        ))}
      </group>
    </group>
  );
};

// 3. Volumetric Offset Glow Lines for strands (using vanilla <line> with higher opacities)
const OffsetLine = ({ animState, isStrandTwo, offset, opacity, color }) => {
  const count = 75;
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = animState.current;

    let ampScale = 1.0;
    if (progress.birth < 1.0 && progress.morph === 0) {
      ampScale = progress.birth;
    } else if (progress.burst > 0) {
      ampScale = 1.0 - progress.burst;
    } else if (progress.reform > 0) {
      ampScale = progress.reform;
    }

    const travelX = progress.travel * 8;
    const centerX = travelX + progress.connect * 10;

    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const pct = i / (count - 1);
      const x = (pct - 0.5) * 20;
      const envelope = Math.exp(-x * x / 45.0);

      // Soundwave shape
      const waveY = (Math.sin(x * 1.8 - t * 8.0 + offset) * 1.4 + Math.sin(x * 3.6 + t * 12.0) * 0.6) * envelope;
      const waveZ = (Math.cos(x * 1.5 - t * 7.0 + offset) * 0.8) * envelope;

      // DNA shape
      const dnaFreq = 1.6;
      const dnaRadius = 1.5;
      const dnaAngle = x * dnaFreq + t * 3.0 + offset;
      
      const dnaY = (isStrandTwo ? -1 : 1) * Math.sin(dnaAngle) * (dnaRadius + offset * 0.25);
      const dnaZ = (isStrandTwo ? -1 : 1) * Math.cos(dnaAngle) * (dnaRadius + offset * 0.25);

      const morphVal = progress.morph;
      arr[idx] = x + centerX;
      arr[idx + 1] = (THREE.MathUtils.lerp(waveY, dnaY, morphVal) + offset * 0.08) * ampScale;
      arr[idx + 2] = (THREE.MathUtils.lerp(waveZ, dnaZ, morphVal) + offset * 0.08) * ampScale;
    }
    
    posAttr.needsUpdate = true;
  });

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
};

// 4. DNA Connecting base pairs/filaments (rungs)
const RungSegments = ({ points1, points2, count = 25, animState }) => {
  const matRef = useRef();
  const positions = useMemo(() => new Float32Array(count * 2 * 3), [count]);
  
  // Safe geometry instancing to avoid JSX bufferAttribute compile issues
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);
  
  useFrame(() => {
    const progress = animState.current;
    
    // Connector visibility: fades in as we morph to DNA, disappears on burst
    const opacity = progress.morph * (1.0 - progress.burst) * progress.birth * 0.8; // Increased opacity
    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
    
    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array;
    const step = Math.floor(points1.length / count);
    
    for (let i = 0; i < count; i++) {
      const idx = i * step;
      const p1 = points1[idx];
      const p2 = points2[idx];
      
      if (p1 && p2) {
        arr[i * 6] = p1.x;
        arr[i * 6 + 1] = p1.y;
        arr[i * 6 + 2] = p1.z;
        
        arr[i * 6 + 3] = p2.x;
        arr[i * 6 + 4] = p2.y;
        arr[i * 6 + 5] = p2.z;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        color={COLORS.neonCyan} // Changed connectors to neon cyan to make them pop!
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};

// Helper component for standard dynamic strand rendering
const DynamicStrand = ({ animState, isStrandTwo, points }) => {
  const count = 120;
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame(() => {
    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      const p = points[i];
      if (p) {
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={isStrandTwo ? COLORS.softLavender : COLORS.electricPurple}
        lineWidth={2}
        transparent
        opacity={0.95} // Higher opacity
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
};

// 5. Living DNA Soundwave structure
const StoryDNA = ({ animState, focusTargetRef }) => {
  const count = 120;
  const points1 = useMemo(() => Array.from({ length: count }, () => new THREE.Vector3()), []);
  const points2 = useMemo(() => Array.from({ length: count }, () => new THREE.Vector3()), []);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = animState.current;

    // Amplitude scale based on stage of lifecycle
    let ampScale = 1.0;
    if (progress.birth < 1.0 && progress.morph === 0) {
      ampScale = progress.birth;
    } else if (progress.burst > 0) {
      ampScale = 1.0 - progress.burst;
    } else if (progress.reform > 0) {
      ampScale = progress.reform;
    }

    // Coordinates translation along the X axis
    const travelX = progress.travel * 8;
    const centerX = travelX + progress.connect * 10;

    // Keep camera DOF focused on the center of the DNA wave
    if (focusTargetRef.current) {
      focusTargetRef.current.position.set(centerX, 0, 0);
    }

    for (let i = 0; i < count; i++) {
      const pct = i / (count - 1);
      const x = (pct - 0.5) * 20;
      const envelope = Math.exp(-x * x / 45.0);

      // 1. Soundwave base shape
      const waveY = (Math.sin(x * 1.8 - t * 8.0) * 1.4 + Math.sin(x * 3.6 + t * 12.0) * 0.6) * envelope;
      const waveZ = (Math.cos(x * 1.5 - t * 7.0) * 0.8 + Math.cos(x * 3.0 + t * 10.0) * 0.4) * envelope;

      // 2. DNA helix shape
      const dnaFreq = 1.6;
      const dnaRadius = 1.5;
      const dnaAngle = x * dnaFreq + t * 3.0;
      
      const dnaY1 = Math.sin(dnaAngle) * dnaRadius;
      const dnaZ1 = Math.cos(dnaAngle) * dnaRadius;
      
      const dnaY2 = -Math.sin(dnaAngle) * dnaRadius;
      const dnaZ2 = -Math.cos(dnaAngle) * dnaRadius;

      // Morphing interpolation
      const morphVal = progress.morph;
      const y1 = THREE.MathUtils.lerp(waveY, dnaY1, morphVal) * ampScale;
      const z1 = THREE.MathUtils.lerp(waveZ, dnaZ1, morphVal) * ampScale;
      
      const y2 = THREE.MathUtils.lerp(waveY, dnaY2, morphVal) * ampScale;
      const z2 = THREE.MathUtils.lerp(waveZ, dnaZ2, morphVal) * ampScale;

      points1[i].set(x + centerX, y1, z1);
      points2[i].set(x + centerX, y2, z2);
    }
  });

  return (
    <group>
      {/* Main Strand 1 (Standard dynamic <line>) */}
      <DynamicStrand animState={animState} isStrandTwo={false} points={points1} />
      
      {/* Main Strand 2 (Standard dynamic <line>) */}
      <DynamicStrand animState={animState} isStrandTwo={true} points={points2} />
      
      {/* Secondary Ribbon Glow Lines for Strand 1 (Vibrant purple neon) */}
      <OffsetLine animState={animState} isStrandTwo={false} offset={0.06} opacity={0.65} color={COLORS.electricPurple} />
      <OffsetLine animState={animState} isStrandTwo={false} offset={-0.06} opacity={0.5} color={COLORS.white} />

      {/* Secondary Ribbon Glow Lines for Strand 2 (Vibrant lavender pink neon) */}
      <OffsetLine animState={animState} isStrandTwo={true} offset={0.06} opacity={0.65} color={COLORS.softLavender} />
      <OffsetLine animState={animState} isStrandTwo={true} offset={-0.06} opacity={0.5} color={COLORS.neonCyan} />

      {/* Base Connectors */}
      <RungSegments points1={points1} points2={points2} count={25} animState={animState} />
    </group>
  );
};

// 6. Listener's Mind, Memory, and Emotion Attractor
const ListenerMind = ({ animState }) => {
  const outerRef = useRef();
  const innerRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  
  // Lorenz Attractor complex organic mathematical path representation
  const lorenzPoints = useMemo(() => {
    const points = [];
    let x = 0.1, y = 0, z = 0;
    const sigma = 10, rho = 28, beta = 8/3;
    const dt = 0.011;
    // Integration warm-up
    for (let i = 0; i < 60; i++) {
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      x += dx;
      y += dy;
      z += dz;
    }
    // Record attractor points
    for (let i = 0; i < 380; i++) {
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      x += dx;
      y += dy;
      z += dz;
      points.push(new THREE.Vector3(x * 0.12, y * 0.12, (z - 25) * 0.12));
    }
    return points;
  }, []);

  const lorenzGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(lorenzPoints);
  }, [lorenzPoints]);

  const ringGeometry1 = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * 3.3, Math.sin(theta) * 3.3, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const ringGeometry2 = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, Math.cos(theta) * 3.0, Math.sin(theta) * 3.0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = animState.current;

    // Mind structure fades in as the DNA travels closer, and dims down post-burst
    let visibility = 0;
    if (progress.travel > 0) {
      visibility = progress.travel * 0.7;
    }
    if (progress.connect > 0) {
      visibility = 0.7 + progress.connect * 0.3;
    }
    if (progress.burst > 0) {
      visibility = 1.0 - progress.burst * 0.6;
    }
    if (progress.reform > 0) {
      visibility = 0.4 * (1.0 - progress.reform);
    }

    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.22;
      outerRef.current.rotation.x = t * 0.1;
      outerRef.current.material.opacity = visibility * 0.35; // Increased outer cage visibility
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = -t * 0.28;
      innerRef.current.rotation.x = t * 0.16;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x = t * 0.55;
      ringRef1.current.rotation.y = t * 0.25;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = t * 0.45;
      ringRef2.current.rotation.x = -t * 0.35;
    }
  });

  return (
    <group position={[18, 0, 0]}>
      {/* Outer Cage (Glassy Wireframe Icosahedron) */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[2.6, 1]} />
        <meshBasicMaterial 
          color={COLORS.softLavender} // Pinkish magenta to standout
          wireframe
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Lorenz Attractor emotional heart representation */}
      <group ref={innerRef}>
        <line geometry={lorenzGeometry}>
          <lineBasicMaterial
            color={COLORS.neonCyan} // Vibrant cyan core
            transparent
            opacity={0.8} // Boosted core attractor opacity
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      </group>

      {/* Nested Orbiting Memory Rings */}
      <group ref={ringRef1}>
        <line geometry={ringGeometry1}>
          <lineBasicMaterial
            color={COLORS.electricPurple}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      </group>
      <group ref={ringRef2}>
        <line geometry={ringGeometry2}>
          <lineBasicMaterial
            color={COLORS.softLavender}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      </group>

      {/* Internal Emotional Core Light */}
      <pointLight color={COLORS.softLavender} intensity={12} distance={20} />
    </group>
  );
};

// 7. Energy Burst & Shockwave Rings
const EnergyBurst = ({ animState }) => {
  const shockwaveRef = useRef();
  const shockwaveRef2 = useRef();
  const flashRef = useRef();
  const burstCoreRef = useRef();

  useFrame((state) => {
    const progress = animState.current;
    const b = progress.burst;
    
    // Blinding white-hot connection sphere expands
    if (burstCoreRef.current) {
      burstCoreRef.current.scale.setScalar(b * 6.0);
      burstCoreRef.current.material.opacity = (1 - b) * 0.95;
    }
    
    // Light pulse peaks at contact point
    if (flashRef.current) {
      flashRef.current.intensity = Math.sin(b * Math.PI) * 260; // Doubled light flash
    }

    // Shockwave Ring 1
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.setScalar(b * 24.0);
      shockwaveRef.current.material.opacity = Math.max(0, 1.0 - b) * 0.9;
    }
    
    // Shockwave Ring 2 (delayed offset)
    if (shockwaveRef2.current) {
      const b2 = Math.max(0, b - 0.12) * 1.12;
      shockwaveRef2.current.scale.setScalar(b2 * 20.0);
      shockwaveRef2.current.material.opacity = Math.max(0, 1.0 - b2) * 0.75;
    }
  });

  return (
    <group position={[18, 0, 0]}>
      {/* Expanding Core Flare */}
      <mesh ref={burstCoreRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={COLORS.white} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Concentric Shockwaves (Vibrant Magenta & Cyan glow) */}
      <mesh ref={shockwaveRef} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.96, 1.0, 64]} />
        <meshBasicMaterial color={COLORS.softLavender} side={THREE.DoubleSide} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh ref={shockwaveRef2} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.95, 1.0, 64]} />
        <meshBasicMaterial color={COLORS.neonCyan} side={THREE.DoubleSide} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <pointLight ref={flashRef} color={COLORS.white} distance={60} />
    </group>
  );
};

// 8. Explosion & Reform Particle System (More vibrant color ranges)
const ParticleSystem = ({ animState }) => {
  const pointsRef = useRef();
  const count = 300;
  
  const [velocities, colors, phases] = useMemo(() => {
    const v = [];
    const c = [];
    const p = [];
    const palette = [
      new THREE.Color(COLORS.electricPurple),
      new THREE.Color(COLORS.softLavender),
      new THREE.Color(COLORS.neonCyan),
      new THREE.Color(COLORS.white)
    ];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 4.5 + Math.random() * 11.5;
      v.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
      
      const col = palette[Math.floor(Math.random() * palette.length)];
      c.push(col.r, col.g, col.b);
      
      p.push(Math.random() * 100);
    }
    return [v, new Float32Array(c), new Float32Array(p)];
  }, []);

  const positions = useMemo(() => new Float32Array(count * 3), []);

  // Safe instanced buffer geometry to avoid JSX tag compile/lifecycle differences
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useFrame((state) => {
    const progress = animState.current;
    const t = state.clock.getElapsedTime();
    
    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array;
    const basePoint = new THREE.Vector3(18, 0, 0);
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const vel = velocities[i];
      const phase = phases[i];
      
      const dx = Math.sin(t * 3 + phase) * 0.25;
      const dy = Math.cos(t * 2 + phase) * 0.25;
      const dz = Math.sin(t * 4 + phase) * 0.25;
      
      const bProgress = progress.burst;
      const dist = (1.0 - Math.exp(-bProgress * 3.8)) * 1.6;
      
      const expX = basePoint.x + vel.x * dist + dx;
      const expY = basePoint.y + vel.y * dist + dy;
      const expZ = basePoint.z + vel.z * dist + dz;
      
      const pct = i / (count - 1);
      const targetX = (pct - 0.5) * 20;
      const envelope = Math.exp(-targetX * targetX / 45.0);
      
      const targetY = (Math.sin(targetX * 1.8 - t * 8.0) * 1.4 + Math.sin(targetX * 3.6 + t * 12.0) * 0.6) * envelope;
      const targetZ = (Math.cos(targetX * 1.5 - t * 7.0) * 0.8) * envelope;
      
      const rfProgress = progress.reform;
      const swirl = Math.sin(rfProgress * Math.PI) * 1.8;
      
      const finalX = THREE.MathUtils.lerp(expX, targetX, rfProgress);
      const finalY = THREE.MathUtils.lerp(expY, targetY, rfProgress) + Math.sin(pct * Math.PI + t) * swirl * 0.45;
      const finalZ = THREE.MathUtils.lerp(expZ, targetZ, rfProgress) + Math.cos(pct * Math.PI + t) * swirl * 0.45;
      
      arr[idx] = finalX;
      arr[idx + 1] = finalY;
      arr[idx + 2] = finalZ;
    }
    
    posAttr.needsUpdate = true;
    
    let opacity = 0;
    if (progress.burst > 0.02 && progress.reform === 0) {
      opacity = Math.min(1.0, progress.burst * 7);
    } else if (progress.reform > 0) {
      opacity = 1.0 - Math.pow(progress.reform, 4.0);
    }
    
    if (pointsRef.current) {
      pointsRef.current.material.opacity = opacity;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// 9. Camera Coordinator
const CameraController = ({ animState }) => {
  const { camera } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(), []);
  const currentLookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const progress = animState.current;
    const t = state.clock.getElapsedTime();
    
    // Stage-specific camera paths
    if (progress.birth < 1.0 && progress.morph === 0) {
      // Zoomed on newborn soundwave
      targetPos.set(0, 1.4, 9.5);
      targetLookAt.set(0, 0, 0);
    }
    else if (progress.morph < 1.0 && progress.travel === 0) {
      // Rotate camera to reveal the double helix structure
      const m = progress.morph;
      targetPos.set(
        THREE.MathUtils.lerp(0, -3.5, m),
        THREE.MathUtils.lerp(1.4, 2.5, m),
        THREE.MathUtils.lerp(9.5, 11.0, m)
      );
      targetLookAt.set(0, 0, 0);
    }
    else if (progress.travel < 1.0 && progress.connect === 0) {
      // Tracking/chase camera following the traveling DNA
      const tr = progress.travel;
      const travelX = tr * 8;
      targetPos.set(travelX - 4.5, 2.0, 10.0);
      targetLookAt.set(travelX + 2.5, 0, 0);
    }
    else if (progress.connect < 1.0 && progress.burst === 0) {
      // Sweep forward to frame both DNA & Listener's Mind
      const cn = progress.connect;
      targetPos.set(
        THREE.MathUtils.lerp(3.5, 11.5, cn),
        THREE.MathUtils.lerp(2.0, 3.5, cn),
        THREE.MathUtils.lerp(10.0, 13.0, cn)
      );
      targetLookAt.set(
        THREE.MathUtils.lerp(10.5, 18.0, cn),
        0,
        0
      );
    }
    else if (progress.burst < 1.0 && progress.reform === 0) {
      // Connection burst: shake screen & zoom back slightly
      const b = progress.burst;
      const shake = Math.sin(t * 60) * 0.12 * Math.exp(-b * 5.5);
      
      targetPos.set(
        11.5 - b * 1.5 + shake,
        3.5 + shake,
        13.0 + b * 5.0 + shake
      );
      targetLookAt.set(18.0, 0, 0);
    }
    else {
      // Reform phase: pan slowly back to center starting point
      const rf = progress.reform;
      targetPos.set(
        THREE.MathUtils.lerp(10.0, 0, rf),
        THREE.MathUtils.lerp(3.5, 1.4, rf),
        THREE.MathUtils.lerp(18.0, 9.5, rf)
      );
      targetLookAt.set(
        THREE.MathUtils.lerp(18.0, 0, rf),
        0,
        0
      );
    }

    // Linear interpolations for smooth cinema motions
    camera.position.lerp(targetPos, 0.045);
    currentLookAt.lerp(targetLookAt, 0.045);
    camera.lookAt(currentLookAt);
  });

  return null;
};

// Main Scene Canvas components wrapper
const CinematicScene = () => {
  const animState = useRef({
    birth: 0,
    morph: 0,
    travel: 0,
    connect: 0,
    burst: 0,
    reform: 0
  });

  const [ready, setReady] = React.useState(false);
  const sunRef = useRef();
  const focusTargetRef = useRef();
  const dofRef = useRef();

  useEffect(() => {
    setReady(true);
    
    // Master GSAP Timeline looping infinitely
    const tl = gsap.timeline({
      repeat: -1,
      defaults: { ease: 'power2.inOut' }
    });

    // Reset initial values
    tl.set(animState.current, {
      birth: 0,
      morph: 0,
      travel: 0,
      connect: 0,
      burst: 0,
      reform: 0
    });

    // Phase 1: Glowing purple soundwave is born (0.0 to 1.8s)
    tl.to(animState.current, { birth: 1.0, duration: 1.8, ease: 'power2.out' });

    // Phase 2: Soundwave twists and evolves into DNA helix (1.8s to 3.8s)
    tl.to(animState.current, { morph: 1.0, duration: 2.0, ease: 'power2.inOut' }, '+=0.2');

    // Phase 3 & 4: DNA travels searching through space (3.8s to 6.8s)
    tl.to(animState.current, { travel: 1.0, duration: 3.0, ease: 'sine.inOut' }, '-=0.2');

    // Phase 5 & 6: Mind structure appears, DNA moves towards it (6.8s to 8.8s)
    tl.to(animState.current, { connect: 1.0, duration: 2.0, ease: 'power2.in' }, '-=0.4');

    // Phase 7, 8, 9: DNA connects, huge cinematic energy burst occurs + shockwave expands (8.8s to 9.8s)
    tl.to(animState.current, { burst: 1.0, duration: 1.0, ease: 'power4.out' });

    // Phase 10: Particles explode, drift, and reform back into soundwave (9.8s to 12.8s)
    tl.to(animState.current, { reform: 1.0, duration: 3.0, ease: 'power3.inOut' });

    return () => {
      tl.kill();
    };
  }, []);

  useFrame((state) => {
    // Safely update focusDistance on dofRef to pull focus without dynamic target crashes
    if (dofRef.current && focusTargetRef.current) {
      const dist = state.camera.position.distanceTo(focusTargetRef.current.position);
      // Normalized focus distance calculation (keep bokeh subtle and background stars sharp)
      dofRef.current.focusDistance = dist / state.camera.far;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.4, 9.5]} fov={42} />
      <color attach="background" args={[COLORS.deepBlack]} />
      <ambientLight intensity={0.6} /> {/* Slightly brighter ambient light */}
      
      {/* Invisible DOF focus target tracker */}
      <mesh ref={focusTargetRef} position={[0, 0, 0]} visible={false}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>

      <Suspense fallback={null}>
        <CameraController animState={animState} />
        <StoryDNA animState={animState} focusTargetRef={focusTargetRef} />
        <DarkUniverse animState={animState} />
        <ListenerMind animState={animState} />
        <EnergyBurst animState={animState} />
        <ParticleSystem animState={animState} />

        {/* Dummy sun node to anchor the GodRays flare effect at connection center */}
        <mesh ref={sunRef} position={[18, 0, -2]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color={COLORS.darkViolet} transparent opacity={0.1} />
        </mesh>

        {ready && focusTargetRef.current && (
          <EffectComposer>
            {/* Cinematic Bloom (Boosted for neon intensity) */}
            <Bloom 
              intensity={3.8} 
              luminanceThreshold={0.06} 
              luminanceSmoothing={0.7}
              mipmapBlur 
            />
            {/* Dynamic filmic Depth Of Field (Subtle bokehScale to keep background stars sharp) */}
            <DepthOfField 
              ref={dofRef}
              focalLength={0.035} 
              bokehScale={0.8} // Reduced from 4.0 to prevent muddy blurring of neural paths/stars
              height={480} 
            />
            {/* Vignette border framing */}
            <Vignette eskil={false} offset={0.12} darkness={1.15} />
          </EffectComposer>
        )}
      </Suspense>
    </>
  );
};

export default function CinematicHeroStory() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          alpha: true,
        }}
        dpr={[1, 1.5]}
      >
        <CinematicScene />
      </Canvas>
    </div>
  );
}
