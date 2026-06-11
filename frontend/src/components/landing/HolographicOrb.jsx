import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function HolographicOrb() {
  const meshRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#00f2ff") }
  }), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.5;
      meshRef.current.rotation.z = time * 0.3;
      meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x = time * 0.8;
      ringRef1.current.rotation.y = time * 0.4;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.y = time * -0.6;
      ringRef2.current.rotation.z = time * 0.3;
    }
  });

  return (
    <group scale={1.2}>
      {/* Core Energy Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial 
          color="#00f2ff" 
          emissive="#00f2ff" 
          emissiveIntensity={2} 
          transparent 
          opacity={0.4} 
          wireframe
        />
      </mesh>

      {/* Outer Holographic Rings */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[1.5, 0.01, 16, 100]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={5} />
      </mesh>

      <mesh ref={ringRef2}>
        <torusGeometry args={[1.8, 0.005, 16, 100]} />
        <meshStandardMaterial color="#00f2ff" emissive="#00f2ff" emissiveIntensity={3} transparent opacity={0.6} />
      </mesh>

      {/* Inner Glow */}
      <pointLight intensity={10} distance={5} color="#00f2ff" />
      <pointLight intensity={5} position={[2, 2, 2]} color="#a855f7" />
    </group>
  );
}
