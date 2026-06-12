import { motion } from "framer-motion";
import { useMemo } from "react";

export default function FloatingArtists() {
  const artists = useMemo(
    () => [
      { name: "The Weeknd", mood: "Synth R&B", x: "9%", y: "18%", d: 12 },
      { name: "Imagine Dragons", mood: "Indie Rock", x: "76%", y: "24%", d: 16 },
      { name: "Billie Eilish", mood: "Dark Pop", x: "18%", y: "68%", d: 14 },
      { name: "Daft Punk", mood: "Electronic House", x: "72%", y: "70%", d: 18 }
    ],
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {artists.map((a) => (
        <motion.div
          key={a.name}
          className="glass absolute w-44 rounded-2xl p-3"
          style={{ left: a.x, top: a.y }}
          animate={{ y: [0, -18, 9, 0], rotate: [0, 1.6, -1.4, 0] }}
          transition={{ duration: a.d, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="text-sm font-semibold">{a.name}</div>
          <div className="text-xs text-muted">{a.mood}</div>
        </motion.div>
      ))}
    </div>
  );
}

