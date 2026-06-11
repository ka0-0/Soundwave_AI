import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useAnalyserStore } from "../hooks/useMusicAnalyser";
import { usePlayerStore } from "../store/usePlayerStore";

export default function StatsGlobe({ accent = "#8b5cf6", accentAlt = "#22d3ee" }) {
  const globe = useRef();
  const coreMat = useRef();
  const innerMat = useRef();
  const innerMesh = useRef();
  const ringMats = useRef([]);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const sparkleCount = isPlaying ? 90 : 24;

  const colorA = useMemo(() => new THREE.Color(accent), [accent]);
  const colorB = useMemo(() => new THREE.Color(accentAlt), [accentAlt]);
  const mixColor = useMemo(() => new THREE.Color(), []);

  const arcs = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        rx: (i / 24) * Math.PI * 2,
        ry: ((i * 5) % 13) * 0.24,
        rz: ((i * 3) % 11) * 0.28,
        radius: 2 + (i % 6) * 0.03
      })),
    []
  );

  useFrame(({ clock }, delta) => {
    const { energy, bass, mid, high } = useAnalyserStore.getState();
    const isPlaying = usePlayerStore.getState().isPlaying;
    const k = isPlaying ? 1 : 0.12;
    const t = clock.elapsedTime;

    if (globe.current) {
      globe.current.rotation.y += delta * (0.16 + energy * 0.7 * k);
      globe.current.rotation.x = Math.sin(t * 0.55 + bass * 2) * 0.12 * k;
      globe.current.rotation.z = Math.cos(t * 0.35 + mid) * 0.06 * bass * k;
      const s = 1 + energy * 0.18 * k + bass * 0.06 * k;
      globe.current.scale.setScalar(s);
    }

    if (coreMat.current) {
      const hueMix = bass * 0.45 + mid * 0.35 + high * 0.2;
      mixColor.copy(colorA).lerp(colorB, hueMix);
      coreMat.current.color.copy(mixColor);
      coreMat.current.emissive.copy(mixColor);
      coreMat.current.emissiveIntensity = 0.3 + energy * 1.4 * k;
    }

    if (innerMesh.current && innerMat.current) {
      innerMesh.current.scale.setScalar(0.72 + mid * 0.2 * k + energy * 0.08 * k);
      innerMat.current.opacity = 0.12 + energy * 0.55 * k;
      mixColor.copy(colorB).lerp(colorA, bass);
      innerMat.current.color.copy(mixColor);
      innerMat.current.emissive.copy(mixColor);
      innerMat.current.emissiveIntensity = 0.5 + high * 1.2 * k;
    }

    ringMats.current.forEach((mat, i) => {
      if (!mat) return;
      const band = i / 24;
      const level = band < 0.33 ? bass : band < 0.66 ? mid : high;
      mat.opacity = 0.15 + level * 0.85 * k;
      mixColor.copy(colorA).lerp(colorB, (level + band) * 0.55);
      mat.color.copy(mixColor);
    });
  });

  return (
    <group ref={globe}>
      <Sparkles count={sparkleCount} scale={[8, 8, 8]} size={2} speed={0.4} opacity={0.55} color={accent} />

      <mesh ref={innerMesh}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial
          ref={innerMat}
          transparent
          color={accentAlt}
          emissive={accent}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          ref={coreMat}
          color="#152048"
          emissive="#381681"
          emissiveIntensity={0.45}
          wireframe
        />
      </mesh>

      {arcs.map((arc, a) => (
        <mesh key={a} rotation={[arc.rx, arc.ry, arc.rz]}>
          <torusGeometry args={[arc.radius, 0.003, 8, 100, Math.PI * 0.8]} />
          <meshBasicMaterial
            ref={(el) => {
              ringMats.current[a] = el;
            }}
            transparent
            color={a % 2 ? accentAlt : accent}
            opacity={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}
