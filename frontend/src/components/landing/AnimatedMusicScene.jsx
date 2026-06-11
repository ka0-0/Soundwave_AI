import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import AmbientLights from "./AmbientLights";
import FloatingMusicNotes from "./FloatingMusicNotes";
import FloatingArtists from "./FloatingArtists";
import VinylOrb from "./VinylOrb";
import WaveformBackground from "./WaveformBackground";

export default function AnimatedMusicScene() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 45, damping: 20, mass: 0.2 });
  const sy = useSpring(my, { stiffness: 45, damping: 20, mass: 0.2 });

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      mx.set(x);
      my.set(y);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AmbientLights />
      <WaveformBackground />

      <motion.div style={{ x: sx, y: sy }} className="absolute inset-0">
        <FloatingMusicNotes />
        <FloatingArtists />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        animate={{ rotate: [0, 0.8, -0.7, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
        <VinylOrb />
      </motion.div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,255,0.18),transparent_42%)]" />
    </div>
  );
}

