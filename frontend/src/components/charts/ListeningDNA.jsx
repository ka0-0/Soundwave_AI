import { motion } from "framer-motion";

const ARCHETYPES = [
  { id: "night", label: "Night Listener", icon: "🌙", color: "#7c3aed", desc: "Your sound peaks after midnight" },
  { id: "explorer", label: "Sonic Explorer", icon: "🔭", color: "#2563eb", desc: "You discover 3× more artists than average" },
  { id: "energy", label: "High Energy", icon: "⚡", color: "#f59e0b", desc: "80%+ of your sessions are high BPM" },
  { id: "emotional", label: "Emotional Depth", icon: "🌊", color: "#06b6d4", desc: "You lean into mood-shifting tracks" },
  { id: "indie", label: "Indie Hunter", icon: "🎸", color: "#10b981", desc: "You find artists before they blow up" },
  { id: "focus", label: "Deep Focus", icon: "🧠", color: "#8b5cf6", desc: "Long uninterrupted listening sessions" },
];

function DNAStrand({ index, color, active }) {
  const y1 = index * 16 + 8;
  const curveDir = index % 2 === 0 ? 1 : -1;

  return (
    <motion.g
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
    >
      <path
        d={`M 8 ${y1} Q 24 ${y1 + curveDir * 8} 40 ${y1}`}
        fill="none"
        stroke={active ? color : "rgba(139,92,246,0.2)"}
        strokeWidth={active ? 2 : 1}
        style={{ filter: active ? `drop-shadow(0 0 3px ${color})` : "none" }}
      />
      {active && (
        <circle cx={24} cy={y1 + curveDir * 8} r={2} fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      )}
    </motion.g>
  );
}

function TraitCard({ archetype, index, active }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: active ? 1 : 0.35, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="flex items-start gap-3 p-3 rounded-xl border transition-all duration-300"
      style={{
        background: active ? `${archetype.color}12` : "rgba(255,255,255,0.02)",
        borderColor: active ? `${archetype.color}40` : "rgba(255,255,255,0.05)",
        boxShadow: active ? `0 0 20px ${archetype.color}20` : "none",
      }}
    >
      <span className="text-lg leading-none mt-0.5">{archetype.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white leading-tight">{archetype.label}</p>
        <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{archetype.desc}</p>
      </div>
      {active && (
        <motion.div
          className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1"
          style={{ background: archetype.color, boxShadow: `0 0 6px ${archetype.color}` }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

export default function ListeningDNA({ profile, isEmpty }) {
  const noData = isEmpty || !profile;
  const activeTraits = noData ? [] : (profile.traits || []).slice(0, 3);
  const activeArchetypes = ARCHETYPES.map((a) => ({
    ...a,
    active: !noData && activeTraits.some((t) => t.toLowerCase().includes(a.id)),
  }));

  const displayArchetypes = noData
    ? ARCHETYPES.slice(0, 4)
    : activeArchetypes.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0)).slice(0, 4);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-display text-base font-semibold text-white">Listening DNA</h3>
          <p className="text-xs text-muted mt-0.5">
            {noData ? "Play 5 tracks to generate your AI profile" : "Your sonic fingerprint"}
          </p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{ height: 20 + i * 8, background: `hsl(${260 + i * 20}, 80%, 60%)` }}
              animate={{ scaleY: noData ? 1 : [1, 1.4, 0.8, 1.2, 1] }}
              transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {noData && (
        <motion.div
          className="mb-4 p-4 rounded-xl border border-violet-500/20 text-center"
          style={{ background: "rgba(124,58,237,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-2xl mb-2">🎵</p>
          <p className="text-sm font-medium text-white/80">Your listening universe is still forming</p>
          <p className="text-xs text-muted mt-1">Start exploring music to unlock your AI DNA profile</p>
        </motion.div>
      )}

      <div className="space-y-2 flex-1">
        {displayArchetypes.map((archetype, i) => (
          <TraitCard key={archetype.id} archetype={archetype} index={i} active={archetype.active} />
        ))}
      </div>

      {!noData && profile?.archetype && (
        <motion.div
          className="mt-4 p-3 rounded-xl text-center"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.1))",
            border: "1px solid rgba(139,92,246,0.3)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-[10px] text-muted uppercase tracking-widest">Primary archetype</p>
          <p className="text-sm font-bold text-violet-300 mt-0.5">{profile.archetype}</p>
        </motion.div>
      )}
    </div>
  );
}
