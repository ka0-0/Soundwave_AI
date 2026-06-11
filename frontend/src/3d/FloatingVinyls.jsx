import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAnalyserStore } from "../hooks/useMusicAnalyser";
import { usePlayerStore } from "../store/usePlayerStore";

export default function FloatingVinyls({ tint = "#7c3aff" }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () => Array.from({ length: 20 }).map((_, i) => ({ off: i * 0.4, speed: 0.2 + i * 0.01 })),
    []
  );
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const energy = useAnalyserStore.getState().energy;
    const isPlaying = usePlayerStore.getState().isPlaying;
    const musicScale = isPlaying ? 1 + energy * 0.22 : 1;

    data.forEach((d, i) => {
      const t = clock.elapsedTime * d.speed + d.off;
      dummy.position.set(Math.sin(t * 0.8) * 6, Math.cos(t * 1.2) * 3, -((i % 5) * 4 + 2));
      dummy.rotation.set(Math.sin(t), Math.cos(t * 0.6), t);
      dummy.scale.setScalar((0.4 + (i % 3) * 0.2) * musicScale);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.rotation.y += delta * 0.05;
  });
  return (
    <instancedMesh ref={ref} args={[null, null, 20]}>
      <cylinderGeometry args={[0.6, 0.6, 0.06, 40]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.45} />
    </instancedMesh>
  );
}
