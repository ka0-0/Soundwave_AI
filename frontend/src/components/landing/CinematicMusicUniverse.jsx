import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const lavender = "#C084FC";
const violet = "#8B5CF6";
const purple = "#6D28D9";

function JourneyPath() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, -1.25, -1.2),
    new THREE.Vector3(-2.6, 0.95, -0.7),
    new THREE.Vector3(-0.45, 0.18, 0.5),
    new THREE.Vector3(1.65, -0.62, -0.15),
    new THREE.Vector3(3.7, 1.05, -1.05),
  ]);
}

function SongEntity({ path, progressRef }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const haloRef = useRef();
  const trailRef = useRef();
  const trailLength = 58;

  const haloTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(192,132,252,0.82)");
    gradient.addColorStop(0.26, "rgba(139,92,246,0.34)");
    gradient.addColorStop(1, "rgba(109,40,217,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  const trailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(trailLength * 3), 3));
    return geo;
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    const travel = (t * 0.055) % 1;
    progressRef.current = travel;

    const point = path.getPointAt(travel);
    const tangent = path.getTangentAt(travel);
    groupRef.current.position.copy(point);
    groupRef.current.position.x += pointer.x * 0.16;
    groupRef.current.position.y += pointer.y * -0.12;
    groupRef.current.lookAt(point.clone().add(tangent));

    const pulse = 1 + Math.sin(t * 2.4) * 0.075;
    coreRef.current.scale.setScalar(pulse);
    haloRef.current.scale.setScalar(1.55 + Math.sin(t * 1.35) * 0.14);
    haloRef.current.material.opacity = 0.18 + Math.sin(t * 1.15) * 0.035;

    const arr = trailGeometry.attributes.position.array;
    for (let i = 0; i < trailLength; i += 1) {
      const age = i / (trailLength - 1);
      const p = (travel - age * 0.115 + 1) % 1;
      const trailPoint = path.getPointAt(p);
      trailPoint.x += Math.sin(t * 0.9 + i * 0.21) * age * 0.025;
      trailPoint.y += Math.cos(t * 0.7 + i * 0.18) * age * 0.025;
      arr[i * 3] = trailPoint.x;
      arr[i * 3 + 1] = trailPoint.y;
      arr[i * 3 + 2] = trailPoint.z;
    }
    trailGeometry.attributes.position.needsUpdate = true;
    trailRef.current.material.opacity = 0.5 + Math.sin(t * 0.8) * 0.05;
  });

  return (
    <>
      <line ref={trailRef} geometry={trailGeometry}>
        <lineBasicMaterial color={lavender} transparent opacity={0.52} blending={THREE.AdditiveBlending} depthWrite={false} />
      </line>
      <group ref={groupRef}>
        <sprite ref={haloRef}>
          <spriteMaterial map={haloTexture} color={purple} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
        <mesh ref={coreRef}>
          <octahedronGeometry args={[0.18, 3]} />
          <meshStandardMaterial color="#FFFFFF" emissive={lavender} emissiveIntensity={1.9} roughness={0.18} metalness={0.05} />
        </mesh>
        <pointLight color={lavender} intensity={2.6} distance={3.4} />
      </group>
    </>
  );
}

function DepthFields({ progressRef }) {
  const groupRef = useRef();
  const fields = useMemo(
    () => [
      { label: "memory", x: -2.95, y: 0.72, z: -0.95, color: lavender, lines: 9 },
      { label: "mood", x: -0.7, y: -0.28, z: 0.12, color: violet, lines: 7 },
      { label: "listeners", x: 1.35, y: -0.82, z: -0.32, color: lavender, lines: 11 },
      { label: "gateway", x: 2.85, y: 0.72, z: -0.9, color: purple, lines: 8 },
    ],
    []
  );

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = pointer.x * 0.035;
    groupRef.current.rotation.x = pointer.y * -0.025;
    groupRef.current.children.forEach((field, index) => {
      const activation = Math.max(0, 1 - Math.abs((progressRef.current || 0) - (0.18 + index * 0.22)) * 7);
      field.children.forEach((child, childIndex) => {
        if (child.material) {
          child.material.opacity = 0.08 + activation * 0.22 + Math.sin(t * 0.7 + childIndex) * 0.015;
        }
      });
      field.position.y = fields[index].y + Math.sin(t * 0.42 + index) * 0.045;
    });
  });

  return (
    <group ref={groupRef}>
      {fields.map((field, fieldIndex) => (
        <group key={field.label} position={[field.x, field.y, field.z]} rotation={[0, 0, fieldIndex % 2 ? -0.18 : 0.22]}>
          {Array.from({ length: field.lines }, (_, i) => (
            <mesh key={i} position={[0, (i - field.lines / 2) * 0.075, 0]} scale={[0.9 + Math.sin(i) * 0.28, 1, 1]}>
              <planeGeometry args={[0.84, 0.012]} />
              <meshBasicMaterial color={field.color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
          {field.label === "gateway" && (
            <>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.032, 1.08]} />
                <meshBasicMaterial color={lavender} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
              <mesh position={[0.42, 0, 0.02]}>
                <planeGeometry args={[0.032, 1.08]} />
                <meshBasicMaterial color={lavender} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function NeuralPathways() {
  const ref = useRef();
  const geometry = useMemo(() => {
    const segments = 44;
    const positions = new Float32Array(segments * 2 * 3);
    for (let i = 0; i < segments; i += 1) {
      const x = -3.4 + i * 0.16;
      positions[i * 6] = x;
      positions[i * 6 + 1] = Math.sin(i * 0.55) * 0.75 - 1.35;
      positions[i * 6 + 2] = -1.55;
      positions[i * 6 + 3] = x + 0.12;
      positions[i * 6 + 4] = Math.sin((i + 1) * 0.55) * 0.75 - 1.35;
      positions[i * 6 + 5] = -1.55;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    ref.current.material.opacity = 0.075 + Math.sin(clock.elapsedTime * 0.45) * 0.02;
  });

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial color={violet} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function CameraRig({ progressRef }) {
  const cameraRef = useRef();

  useFrame(({ camera, pointer }) => {
    cameraRef.current = camera;
    const p = progressRef.current || 0;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, -0.25 + Math.sin(p * Math.PI * 2) * 0.34 + pointer.x * 0.26, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.1 + Math.cos(p * Math.PI * 2) * 0.12 + pointer.y * -0.16, 0.035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6.35 - Math.sin(p * Math.PI) * 0.28, 0.035);
    camera.lookAt(0.08, 0, -0.5);
  });

  return null;
}

function Scene() {
  const path = useMemo(() => JourneyPath(), []);
  const progressRef = useRef(0);

  return (
    <>
      <color attach="background" args={["#05010F"]} />
      <fog attach="fog" args={["#05010F", 5.8, 10.5]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-3, 2.4, 2.8]} intensity={1.8} color={lavender} />
      <pointLight position={[3.2, -1.4, 2.5]} intensity={1.1} color={purple} />
      <NeuralPathways />
      <DepthFields progressRef={progressRef} />
      <SongEntity path={path} progressRef={progressRef} />
      <CameraRig progressRef={progressRef} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.54} luminanceThreshold={0.2} luminanceSmoothing={0.48} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.45} />
      </EffectComposer>
    </>
  );
}

export default function CinematicMusicUniverse() {
  const wrapRef = useRef(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;

    const onMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 7;
      const y = (event.clientY / window.innerHeight - 0.5) * 5;
      element.style.setProperty("--journey-x", `${x}px`);
      element.style.setProperty("--journey-y", `${y}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={wrapRef} className="song-journey-universe">
      <div className="song-journey-ambience" />
      <Canvas
        camera={{ position: [0, 0.1, 6.35], fov: 40 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
