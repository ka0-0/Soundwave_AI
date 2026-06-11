import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GENRE_COLORS = {
  pop: "#f472b6",
  rock: "#fb923c",
  indie: "#a78bfa",
  hiphop: "#fbbf24",
  electronic: "#22d3ee",
  jazz: "#34d399",
  classical: "#60a5fa",
  rnb: "#f87171",
  default: "#a855f7",
};

function getGenreColor(genre = "") {
  const lower = genre.toLowerCase().replace(/[^a-z]/g, "");
  return GENRE_COLORS[lower] || GENRE_COLORS.default;
}

function CelestialBody({ artist, x, y, size, color, index, hovered, onHover, isEmpty }) {
  const isHovered = hovered === index;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => !isEmpty && onHover(index)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: isEmpty ? "default" : "pointer" }}
    >
      {isHovered && (
        <motion.circle
          cx={x} cy={y}
          r={size * 2.8}
          fill="transparent"
          stroke={color}
          strokeWidth={0.6}
          strokeDasharray="4 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5, rotate: 360 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
          transition={{ opacity: { duration: 0.2 }, rotate: { duration: 8, repeat: Infinity, ease: "linear" } }}
        />
      )}

      <motion.circle
        cx={x} cy={y}
        r={isHovered ? size + 2 : size}
        fill={color}
        opacity={isEmpty ? 0.2 : 0.85}
        animate={{ r: isHovered ? size + 2 : size }}
        transition={{ duration: 0.25 }}
        style={{ filter: `drop-shadow(0 0 ${isHovered ? 14 : 5}px ${color}99)` }}
      />

      {size > 8 && (
        <circle
          cx={x + size * 0.35}
          cy={y - size * 0.2}
          r={size * 0.25}
          fill="rgba(255,255,255,0.15)"
        />
      )}

      {isHovered && !isEmpty && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <rect
            x={x - 30} y={y - size - 28}
            width={60} height={22}
            rx={4}
            fill="rgba(5,5,5,0.9)"
            stroke={color}
            strokeWidth={0.5}
          />
          <text
            x={x} y={y - size - 19}
            textAnchor="middle"
            fill="white"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            {(artist?.name || "Artist").slice(0, 14)}
          </text>
          <text
            x={x} y={y - size - 10}
            textAnchor="middle"
            fill={color}
            fontSize="6"
            fontFamily="Inter, sans-serif"
          >
            {artist?.genre || "Unknown genre"}
          </text>
        </motion.g>
      )}

      {!isHovered && artist?.name && !isEmpty && (
        <text
          x={x} y={y + size + 9}
          textAnchor="middle"
          fill="rgba(161,161,170,0.6)"
          fontSize="6"
          fontFamily="Inter, sans-serif"
        >
          {artist.name.slice(0, 10)}
        </text>
      )}
    </motion.g>
  );
}

const PLACEHOLDER_BODIES = [
  { name: "Nova Bloom", genre: "Indie", x: 25, y: 30, size: 10 },
  { name: "Echo Harbor", genre: "Electronic", x: 55, y: 20, size: 8 },
  { name: "Neon Atlas", genre: "Pop", x: 78, y: 40, size: 7 },
  { name: "Pulse City", genre: "Hip-Hop", x: 65, y: 68, size: 9 },
  { name: "Drift Wave", genre: "Indie", x: 35, y: 65, size: 6 },
  { name: "Solstice", genre: "Jazz", x: 15, y: 58, size: 5 },
  { name: "Orbit", genre: "Electronic", x: 88, y: 60, size: 6 },
];

export default function DiscoveryUniverse({ artists }) {
  const [hovered, setHovered] = useState(null);
  const isEmpty = !artists || artists.length === 0;

  const bodies = isEmpty
    ? PLACEHOLDER_BODIES.map((b) => ({ ...b, color: getGenreColor(b.genre) }))
    : artists.slice(0, 8).map((a, i) => ({
        ...a,
        x: 10 + (i * 37.3) % 82,
        y: 15 + (i * 53.7) % 72,
        size: 5 + Math.min((a.plays || 50) / 12, 12),
        color: getGenreColor(a.genre),
      }));

  const CONNECTIONS = bodies.flatMap((_, i) =>
    bodies.slice(i + 1).filter((__, j) => {
      const a = bodies[i], b = bodies[i + 1 + j];
      const dx = a.x - b.x, dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy) < 30;
    }).map((b, j) => [i, i + 1 + j])
  ).slice(0, 8);

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-display text-base font-semibold text-white">Discovery Universe</h3>
          <p className="text-xs text-muted mt-0.5">Artists in your orbit</p>
        </div>
        {isEmpty && (
          <p className="text-[10px] text-muted">Explore to populate</p>
        )}
      </div>

      <div className="flex-1 relative min-h-0">
        <svg
          viewBox="0 0 100 100"
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
        >
          <defs>
            <filter id="universeGlow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {Array.from({ length: 50 }).map((_, i) => (
            <circle
              key={i}
              cx={`${(i * 79.3 + 5) % 100}%`}
              cy={`${(i * 43.7 + 9) % 100}%`}
              r={0.35}
              fill="white"
              opacity={(i % 7 === 0) ? 0.25 : 0.07}
            />
          ))}

          {CONNECTIONS.map(([a, b], i) => {
            const nodeA = bodies[a], nodeB = bodies[b];
            return (
              <motion.line
                key={i}
                x1={`${nodeA.x}%`} y1={`${nodeA.y}%`}
                x2={`${nodeB.x}%`} y2={`${nodeB.y}%`}
                stroke="rgba(139,92,246,0.25)"
                strokeWidth={0.3}
                initial={{ opacity: 0 }}
                animate={{ opacity: isEmpty ? 0.1 : 0.4 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              />
            );
          })}

          {bodies.map((body, i) => (
            <CelestialBody
              key={i}
              artist={body}
              x={body.x}
              y={body.y}
              size={body.size}
              color={body.color}
              index={i}
              hovered={hovered}
              onHover={setHovered}
              isEmpty={isEmpty}
            />
          ))}
        </svg>

        {isEmpty && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-4">
            <p className="text-xs text-muted text-center">
              Your listening universe is waiting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
