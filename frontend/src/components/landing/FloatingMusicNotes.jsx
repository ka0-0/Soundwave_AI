import { motion } from "framer-motion";
import { useMemo } from "react";

const symbols = ["♪", "♫", "♬", "♩"];

export default function FloatingMusicNotes() {
  const notes = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        symbol: symbols[i % symbols.length],
        left: `${(i * 17) % 100}%`,
        top: `${(i * 31) % 100}%`,
        duration: 10 + (i % 7) * 2,
        delay: (i % 6) * 0.7,
        size: 16 + (i % 5) * 8,
        color: i % 3 === 0 ? "#00E5FF" : i % 2 ? "#7C3AFF" : "#FF2D87"
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {notes.map((n) => (
        <motion.span
          key={n.id}
          className="absolute select-none font-display"
          style={{ left: n.left, top: n.top, color: n.color, fontSize: n.size, textShadow: `0 0 20px ${n.color}` }}
          animate={{
            y: [0, -30, 10, -45, 0],
            x: [0, 20, -12, 8, 0],
            opacity: [0.2, 0.85, 0.4, 0.9, 0.2],
            scale: [1, 1.2, 0.9, 1.1, 1]
          }}
          transition={{
            duration: n.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: n.delay
          }}
        >
          {n.symbol}
        </motion.span>
      ))}
    </div>
  );
}

