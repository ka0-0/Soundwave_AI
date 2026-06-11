import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function VinylTunnel({ cameraRef, scrollProgressRef }) {
  const group = useRef();
  const discs = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        pos: new THREE.Vector3(Math.sin(i * 0.9) * 4, Math.cos(i * 0.5) * 3, -i * 3.4),
        speed: 0.12 + i * 0.001
      })),
    []
  );

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        discs.map((d, i) => new THREE.Vector3(d.pos.x * 0.6, d.pos.y * 0.4, -i * 2.8))
      ),
    [discs]
  );

  useFrame((_, delta) => {
    if (!group.current) return;

    // Scroll-driven camera travel through the vinyl tunnel.
    const t = Math.max(0, Math.min(0.98, scrollProgressRef?.current ?? 0));
    if (cameraRef?.current) {
      const p = curve.getPointAt(t);
      const look = curve.getPointAt(Math.min(0.999, t + 0.01));
      cameraRef.current.position.lerp(p, 0.22);
      cameraRef.current.lookAt(look);
    }

    group.current.children.forEach((mesh, i) => {
      mesh.rotation.z += delta * discs[i].speed;
      mesh.rotation.x += delta * 0.1;
    });
  });

  return (
    <group ref={group}>
      {discs.map((d, i) => (
        <group key={i} position={d.pos}>
          <mesh>
            <cylinderGeometry args={[0.8, 0.8, 0.08, 48]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#7c3aff" : "#00e5ff"} emissive="#6529d9" emissiveIntensity={0.9} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.95, 0.025, 16, 100]} />
            <meshBasicMaterial color="#ff2d87" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
