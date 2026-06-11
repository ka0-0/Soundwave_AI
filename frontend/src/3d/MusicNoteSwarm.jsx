import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const NOTE_CHARS = ["♪", "♫", "♬"];
const TRAIL_STEPS = 3;

export default function MusicNoteSwarm({ scrollProgressRef }) {
  const groupRef = useRef();
  const starsRef = useRef();

  const tracks = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const radius = 4 + (i % 4) * 1.6;
      const offset = i * 0.33;
      const points = Array.from({ length: 8 }).map((__, p) => {
        const a = (p / 8) * Math.PI * 2 + offset;
        return new THREE.Vector3(
          Math.cos(a) * radius,
          Math.sin(a * 1.5) * (1.5 + (i % 3) * 0.5),
          -10 - i * 3 + Math.sin(a * 2) * 3
        );
      });
      return new THREE.CatmullRomCurve3(points, true);
    });
  }, []);

  const notes = useMemo(() => {
    return Array.from({ length: 120 }).map((_, i) => ({
      trackIndex: i % tracks.length,
      offset: (i % 10) / 10,
      speed: 0.03 + (i % 7) * 0.008,
      scale: 0.22 + (i % 4) * 0.08,
      char: NOTE_CHARS[i % NOTE_CHARS.length],
      hue: i % 2 === 0 ? "#7c3aff" : i % 3 === 0 ? "#ff2d87" : "#00e5ff"
    }));
  }, [tracks.length]);

  const starPositions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    // Use a simple seeded random to satisfy purity requirements if needed, 
    // or just use a fixed seed for these stars.
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 900; i += 1) {
      arr[i * 3 + 0] = (rnd() - 0.5) * 48;
      arr[i * 3 + 1] = (rnd() - 0.5) * 26;
      arr[i * 3 + 2] = -rnd() * 140;
    }
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const scrollBoost = scrollProgressRef?.current ?? 0;

    groupRef.current.children.forEach((noteGroup, i) => {
      const note = notes[i];
      const curve = tracks[note.trackIndex];
      const baseT =
        (clock.elapsedTime * (note.speed + scrollBoost * 0.08) + note.offset + scrollBoost * 0.4) % 1;
      const p = curve.getPointAt(baseT);
      const look = curve.getPointAt((baseT + 0.01) % 1);

      noteGroup.position.lerp(p, 0.25);
      noteGroup.lookAt(look);
      noteGroup.rotateY(Math.PI);
      noteGroup.rotation.z += delta * (0.5 + scrollBoost * 2.2);

      // Pulsing scale gives a music-reactive premium feel.
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.3 + i * 0.2) * (0.06 + scrollBoost * 0.12);
      noteGroup.scale.setScalar(pulse);

      // Trail ghosts follow behind each lead note.
      for (let step = 1; step <= TRAIL_STEPS; step += 1) {
        const child = noteGroup.children[step];
        if (!child) continue;
        const lagT = (baseT - step * 0.018 + 1) % 1;
        const lagP = curve.getPointAt(lagT);
        child.position.copy(noteGroup.worldToLocal(lagP.clone()));
      }
    });

    if (starsRef.current) {
      starsRef.current.rotation.y += delta * (0.015 + scrollBoost * 0.06);
      starsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.15) * 0.04;
    }
  });

  return (
    <>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={starPositions}
            count={starPositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#8fb3ff" size={0.03} sizeAttenuation transparent opacity={0.55} />
      </points>

      <group ref={groupRef}>
      {notes.map((n, i) => (
        <group key={i} position={[0, 0, -20]}>
          <Text fontSize={n.scale} color={n.hue} anchorX="center" anchorY="middle">
            {n.char}
            <meshBasicMaterial transparent opacity={0.95} />
          </Text>
          {Array.from({ length: TRAIL_STEPS }).map((_, idx) => (
            <Text
              key={`${i}-trail-${idx}`}
              fontSize={Math.max(0.12, n.scale - (idx + 1) * 0.05)}
              color={n.hue}
              anchorX="center"
              anchorY="middle"
              position={[0, 0, 0]}
            >
              {n.char}
              <meshBasicMaterial transparent opacity={0.2 - idx * 0.05} />
            </Text>
          ))}
        </group>
      ))}
      </group>
    </>
  );
}

