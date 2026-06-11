import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "../store/usePlayerStore";
import { useAnalyserStore } from "../hooks/useMusicAnalyser";

export default function HeroSphere() {
  const ref = useRef();
  const materialRef = useRef();
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAmp: { value: 0.08 }
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const energy = useAnalyserStore.getState().energy;
      const targetAmp = isPlaying ? 0.08 + energy * 0.45 : 0.08;
      materialRef.current.uniforms.uAmp.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uAmp.value,
        targetAmp,
        0.08
      );
    }
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.4, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uAmp;
          varying vec3 vNormal;
          void main() {
            vNormal = normal;
            float wave = sin(position.x * 5.0 + uTime) * cos(position.y * 6.0 + uTime * 0.8);
            vec3 displaced = position + normal * wave * uAmp;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.5);
            vec3 base = mix(vec3(0.486, 0.227, 1.0), vec3(0.0, 0.898, 1.0), fresnel);
            gl_FragColor = vec4(base, 1.0);
          }
        `}
      />
    </mesh>
  );
}
