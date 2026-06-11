import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  { name: "Euphoric", x: 50, y: 15, color: "#a855f7", glow: "rgba(168,85,247,0.6)", size: 8 },
  { name: "Melancholic", x: 82, y: 38, color: "#60a5fa", glow: "rgba(96,165,250,0.6)", size: 6 },
  { name: "Energized", x: 70, y: 72, color: "#f472b6", glow: "rgba(244,114,182,0.6)", size: 10 },
  { name: "Focused", x: 28, y: 68, color: "#34d399", glow: "rgba(52,211,153,0.6)", size: 7 },
  { name: "Nostalgic", x: 18, y: 35, color: "#fbbf24", glow: "rgba(251,191,36,0.6)", size: 5 },
  { name: "Dreamy", x: 50, y: 50, color: "#c084fc", glow: "rgba(192,132,252,0.6)", size: 9 },
];

const CONNECTIONS = [
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5],
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
];

function Star({ mood, index, hovered, onHover, isEmpty }) {
  const isHovered = hovered === index;
  const opacity = isEmpty ? 0.25 : (hovered === null ? 0.7 : isHovered ? 1 : 0.4);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ cursor: isEmpty ? "default" : "pointer" }}
      onMouseEnter={() => !isEmpty && onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.circle
        cx={`${mood.x}%`}
        cy={`${mood.y}%`}
        r={isHovered ? mood.size + 4 : mood.size}
        fill={mood.color}
        opacity={opacity}
        animate={{
          r: isHovered ? mood.size + 4 : mood.size,
          opacity: isEmpty ? 0.2 : (isHovered ? 1 : 0.75),
        }}
        transition={{ duration: 0.3 }}
        style={{ filter: `drop-shadow(0 0 ${isHovered ? 16 : 6}px ${mood.glow})` }}
      />
      <motion.circle
        cx={`${mood.x}%`}
        cy={`${mood.y}%`}
        r={mood.size * 2.5}
        fill="transparent"
        stroke={mood.color}
        strokeWidth={0.5}
        opacity={isHovered ? 0.4 : 0}
        animate={{ opacity: isHovered ? 0.4 : 0, r: isHovered ? mood.size * 3.5 : mood.size * 2.5 }}
        transition={{ duration: 0.3 }}
      />
      {isHovered && !isEmpty && (
        <motion.text
          x={`${mood.x}%`}
          y={`${mood.y - 8}%`}
          textAnchor="middle"
          fill={mood.color}
          fontSize="11"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {mood.name}
        </motion.text>
      )}
    </motion.g>
  );
}

export default function MoodGalaxy({ data }) {
  const [hovered, setHovered] = useState(null);
  const isEmpty = !data || data.length === 0;

  const moodNodes = isEmpty ? MOODS : MOODS.map((m, i) => ({
    ...m,
    size: data[i] ? 4 + (data[i].value / 100) * 8 : m.size,
    color: m.color,
  }));

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="mb-3">
        <h3 className="text-display text-base font-semibold text-white">Mood Galaxy</h3>
        <p className="text-xs text-muted mt-0.5">Your emotional constellation</p>
      </div>

      <div className="flex-1 relative">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
          <defs>
            {moodNodes.map((m, i) => (
              <radialGradient key={i} id={`starGlow${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={m.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0} />
              </radialGradient>
            ))}
            <filter id="galaxyBlur">
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>

          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={`bg-star-${i}`}
              cx={`${(i * 73.1 + 7) % 100}%`}
              cy={`${(i * 47.3 + 13) % 100}%`}
              r={0.4}
              fill="white"
              opacity={(i % 5 === 0) ? 0.3 : 0.1}
            />
          ))}

          {CONNECTIONS.map(([a, b], i) => {
            const nodeA = moodNodes[a];
            const nodeB = moodNodes[b];
            const isActive = hovered === a || hovered === b;
            return (
              <motion.line
                key={`conn-${i}`}
                x1={`${nodeA.x}%`} y1={`${nodeA.y}%`}
                x2={`${nodeB.x}%`} y2={`${nodeB.y}%`}
                stroke={isActive ? nodeA.color : "rgba(139,92,246,0.3)"}
                strokeWidth={isActive ? 0.8 : 0.4}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: isEmpty ? 0.15 : (isActive ? 0.8 : 0.3),
                  strokeWidth: isActive ? 0.8 : 0.4
                }}
                transition={{ delay: i * 0.08, duration: 0.8 }}
                style={{ filter: isActive ? `drop-shadow(0 0 2px ${nodeA.color})` : "none" }}
              />
            );
          })}

          {moodNodes.map((mood, i) => (
            <Star key={i} mood={mood} index={i} hovered={hovered} onHover={setHovered} isEmpty={isEmpty} />
          ))}
        </svg>

        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.p
              className="text-xs text-center text-muted px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Start listening to reveal your mood constellation
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}
