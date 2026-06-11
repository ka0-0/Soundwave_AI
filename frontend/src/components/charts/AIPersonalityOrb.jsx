import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function OrbRing({ radius, speed, color, opacity, reverse, delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{
        width: radius * 2,
        height: radius * 2,
        left: `calc(50% - ${radius}px)`,
        top: `calc(50% - ${radius}px)`,
        borderColor: color,
        borderWidth: 1,
        opacity,
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear", delay }}
    />
  );
}

function FloatingParticle({ x, y, color, size, duration, delay }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
      animate={{
        y: [0, -12, 0, 8, 0],
        x: [0, 6, -4, 2, 0],
        opacity: [0.4, 0.9, 0.5, 0.8, 0.4],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function AIPersonalityOrb({ profile, isEmpty }) {
  const noData = isEmpty || !profile;

  const orbColors = noData
    ? { primary: "#3b2a6b", secondary: "#1e3a5f", glow: "rgba(139,92,246,0.15)" }
    : { primary: "#7c3aed", secondary: "#2563eb", glow: "rgba(139,92,246,0.5)" };

  const particles = [
    { x: 12, y: 20, color: "#a855f7", size: 3, duration: 4, delay: 0 },
    { x: 80, y: 15, color: "#60a5fa", size: 2, duration: 5, delay: 0.8 },
    { x: 88, y: 70, color: "#f472b6", size: 3, duration: 3.5, delay: 1.2 },
    { x: 10, y: 75, color: "#34d399", size: 2, duration: 6, delay: 0.4 },
    { x: 50, y: 8, color: "#fbbf24", size: 2, duration: 4.5, delay: 2 },
    { x: 92, y: 45, color: "#c084fc", size: 2, duration: 5.5, delay: 1.6 },
  ];

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="mb-3">
        <h3 className="text-display text-base font-semibold text-white">AI Personality Orb</h3>
        <p className="text-xs text-muted mt-0.5">
          {noData ? "Play 5 tracks to generate your AI profile" : profile?.archetype || "Your sonic identity"}
        </p>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}

        <div className="relative" style={{ width: 140, height: 140 }}>
          <OrbRing radius={68} speed={12} color="rgba(139,92,246,0.3)" opacity={noData ? 0.3 : 0.7} reverse={false} />
          <OrbRing radius={80} speed={20} color="rgba(96,165,250,0.2)" opacity={noData ? 0.2 : 0.5} reverse={true} delay={0.5} />
          <OrbRing radius={92} speed={30} color="rgba(244,114,182,0.15)" opacity={noData ? 0.15 : 0.4} reverse={false} delay={1} />

          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 40% 35%, ${orbColors.primary}, ${orbColors.secondary}, #050505)`,
              boxShadow: `0 0 40px ${orbColors.glow}, 0 0 80px ${orbColors.glow.replace("0.5", "0.2")}, inset 0 0 30px rgba(0,0,0,0.5)`,
            }}
            animate={{
              scale: [1, 1.04, 1, 0.97, 1],
              boxShadow: noData
                ? [`0 0 20px rgba(139,92,246,0.1)`, `0 0 30px rgba(139,92,246,0.15)`, `0 0 20px rgba(139,92,246,0.1)`]
                : [`0 0 40px ${orbColors.glow}`, `0 0 70px ${orbColors.glow}`, `0 0 40px ${orbColors.glow}`],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {noData ? (
              <motion.div
                className="text-center"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <p className="text-[10px] text-muted">awaiting</p>
                <p className="text-[10px] text-muted">data</p>
              </motion.div>
            ) : (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-[10px] font-bold text-white/90 leading-tight">
                  {profile?.archetype?.split(" ").slice(0, 2).join("\n") || "SONIC\nEXPLORER"}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {!noData && profile?.traits && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 flex gap-2 justify-center flex-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {profile.traits.slice(0, 3).map((trait, i) => (
              <span
                key={i}
                className="text-[9px] px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-300"
                style={{ background: "rgba(124,58,237,0.15)" }}
              >
                {trait}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
