import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function makeCover(hue) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, `hsl(${hue},80%,56%)`);
  g.addColorStop(1, `hsl(${(hue + 110) % 360},90%,45%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export default function AlbumWall({ scrollProgressRef }) {
  const group = useRef();
  const items = useMemo(
    () =>
      Array.from({ length: 96 }).map((_, i) => ({
        x: (i % 12) * 1.4 - 8,
        y: Math.floor(i / 12) * 1.2 - 4,
        z: -((i % 6) * 1.5),
        row: Math.floor(i / 12),
        speed: 0.2 + (i % 5) * 0.05,
        texture: makeCover((i * 31) % 360)
      })),
    []
  );

  useFrame(({ pointer }, delta) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.12, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.09, 0.05);

    const scrollT = scrollProgressRef?.current ?? 0;

    group.current.children.forEach((mesh, idx) => {
      const baseZ = items[idx].z;
      const rowIndex = items[idx].row;
      const depth = rowIndex / 8; // 0..1

      // Parallax by scroll: foreground rows shift more than background rows.
      const offset = (1 - depth) * 12 * scrollT;

      mesh.position.z =
        baseZ +
        offset +
        Math.sin(performance.now() * 0.0002 + idx) * delta * items[idx].speed;
    });
  });

  return (
    <group ref={group} position={[0, 0, -10]}>
      {items.map((item, i) => (
        <mesh key={i} position={[item.x, item.y, item.z]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={item.texture} emissive="#14102f" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
