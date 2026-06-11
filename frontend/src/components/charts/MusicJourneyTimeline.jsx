import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLANET_COLORS = [
  { bg: "#7c3aed", glow: "rgba(124,58,237,0.7)", ring: "#a855f7" },
  { bg: "#2563eb", glow: "rgba(37,99,235,0.7)", ring: "#60a5fa" },
  { bg: "#db2777", glow: "rgba(219,39,119,0.7)", ring: "#f472b6" },
  { bg: "#059669", glow: "rgba(5,150,105,0.7)", ring: "#34d399" },
  { bg: "#d97706", glow: "rgba(217,119,6,0.7)", ring: "#fbbf24" },
  { bg: "#7c3aed", glow: "rgba(124,58,237,0.7)", ring: "#c084fc" },
  { bg: "#0e7490", glow: "rgba(14,116,144,0.7)", ring: "#22d3ee" },
];

function Planet({ session, index, x, y, hovered, onHover, isEmpty }) {
  const isHovered = hovered === index;
  const color = PLANET_COLORS[index % PLANET_COLORS.length];
  const size = isEmpty ? 6 : 5 + Math.min((session?.minutes || 30) / 10, 10);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 + 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: isEmpty ? "default" : "pointer" }}
    >
      {isHovered && (
        <motion.circle
          cx={x} cy={y}
          r={size * 2.2}
          fill="transparent"
          stroke={color.ring}
          strokeWidth={0.5}
          strokeDasharray="3 2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.6, scale: 1, rotate: 360 }}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}
      <motion.circle
        cx={x} cy={y}
        r={isHovered ? size + 2 : size}
        fill={color.bg}
        animate={{ r: isHovered ? size + 2 : size }}
        transition={{ duration: 0.25 }}
        opacity={isEmpty ? 0.3 : 1}
        style={{ filter: `drop-shadow(0 0 ${isHovered ? 12 : 4}px ${color.glow})` }}
      />
      <text
        x={x} y={y + size + 10}
        textAnchor="middle"
        fill={isEmpty ? "rgba(161,161,170,0.3)" : "rgba(161,161,170,0.8)"}
        fontSize="7"
        fontFamily="Inter, sans-serif"
      >
        {DAYS[index]}
      </text>
    </motion.g>
  );
}

export default function MusicJourneyTimeline({ data }) {
  const [hovered, setHovered] = useState(null);
  const isEmpty = !data || data.length === 0;

  const sessions = isEmpty
    ? DAYS.map((d) => ({ day: d, minutes: 0, track: null, artist: null, mood: null }))
    : DAYS.map((d) => data.find((s) => s.day === d) || { day: d, minutes: 0 });

  const WIDTH = 320;
  const HEIGHT = 120;
  const PAD = 24;
  const usableW = WIDTH - PAD * 2;
  const midY = HEIGHT * 0.45;

  const points = sessions.map((s, i) => {
    const x = PAD + (i / (sessions.length - 1)) * usableW;
    const offsetY = isEmpty ? 0 : (i % 2 === 0 ? -12 : 12) + (Math.sin(i * 1.3) * 8);
    return { x, y: midY + offsetY, session: s };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const hoveredSession = hovered !== null ? sessions[hovered] : null;

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-display text-base font-semibold text-white">Music Journey</h3>
          <p className="text-xs text-muted mt-0.5">Your week through space</p>
        </div>
        <AnimatePresence>
          {hoveredSession && !isEmpty && hoveredSession.track && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="text-right"
            >
              <p className="text-xs font-semibold text-white">{hoveredSession.track}</p>
              <p className="text-[10px] text-muted">{hoveredSession.artist}</p>
              {hoveredSession.minutes > 0 && (
                <p className="text-[10px] text-violet-400">{hoveredSession.minutes}m</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 relative min-h-0">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id="journeyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={isEmpty ? 0.2 : 0.8} />
              <stop offset="50%" stopColor="#2563eb" stopOpacity={isEmpty ? 0.2 : 0.8} />
              <stop offset="100%" stopColor="#0e7490" stopOpacity={isEmpty ? 0.2 : 0.8} />
            </linearGradient>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {Array.from({ length: 30 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 83.7 + 11) % WIDTH}
              cy={(i * 53.1 + 7) % HEIGHT}
              r={0.5}
              fill="white"
              opacity={0.08 + (i % 4 === 0 ? 0.12 : 0)}
            />
          ))}

          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#journeyGrad)"
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ filter: "url(#pathGlow)" }}
          />

          {points.map((p, i) => (
            <Planet
              key={i}
              session={p.session}
              index={i}
              x={p.x}
              y={p.y}
              hovered={hovered}
              onHover={setHovered}
              isEmpty={isEmpty}
            />
          ))}
        </svg>

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted text-center px-4 pb-6">
              Your listening orbit is still forming
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
