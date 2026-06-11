import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Sparkles, Zap } from "lucide-react";

function WaveBar({ index, active }) {
  return (
    <motion.div
      className="rounded-full"
      style={{ width: 3, background: "linear-gradient(180deg, #a855f7, #60a5fa)", borderRadius: 2 }}
      animate={
        active
          ? { height: [8, 24 + Math.sin(index * 1.4) * 12, 6, 20 + Math.cos(index * 0.9) * 10, 8] }
          : { height: 4 }
      }
      transition={
        active
          ? { duration: 0.8 + index * 0.07, repeat: Infinity, ease: "easeInOut", delay: index * 0.06 }
          : { duration: 0.3 }
      }
    />
  );
}

function TypingText({ text, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= text.length) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => {
      setDisplayed((p) => p + text[idx]);
      setIdx((i) => i + 1);
    }, 18);
    return () => clearTimeout(t);
  }, [idx, text, onDone]);

  return (
    <span>
      {displayed}
      {idx < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

function NeuralBackground() {
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    x: (i * 73.1 + 7) % 100,
    y: (i * 47.3 + 13) % 100,
  }));

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="xMidYMid meet">
      {nodes.map((n, i) =>
        nodes.slice(i + 1, i + 3).map((m, j) => (
          <motion.line
            key={`${i}-${j}`}
            x1={`${n.x}%`} y1={`${n.y}%`}
            x2={`${m.x}%`} y2={`${m.y}%`}
            stroke="#7c3aed"
            strokeWidth={0.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
          />
        ))
      )}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={`${n.x}%`} cy={`${n.y}%`}
          r={2}
          fill="#a855f7"
          animate={{ opacity: [0.3, 0.8, 0.3], r: [1.5, 2.5, 1.5] }}
          transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </svg>
  );
}

export default function AIConsole({ analysis, onSubmit, loading }) {
  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const trackRef = useRef(null);

  const hasPending = analysis && ["pending", "processing"].includes(analysis.status);
  const hasResult = analysis && analysis.status === "complete";

  async function handleSubmit(e) {
    e.preventDefault();
    const track = trackName.trim();
    if (!track) { setError("Track name is required."); return; }
    setError("");
    setTypingDone(false);
    await onSubmit({ track_name: track, artist_name: artistName.trim() });
    setTrackName("");
    setArtistName("");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(10,5,20,0.95), rgba(5,5,15,0.98))",
        border: "1px solid rgba(139,92,246,0.25)",
        boxShadow: "0 0 60px rgba(139,92,246,0.1), 0 32px 64px rgba(0,0,0,0.6)",
      }}
    >
      <NeuralBackground />

      <div className="relative z-10 p-6">
        <div className="flex items-center gap-3 mb-5">
          <motion.div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.2))", border: "1px solid rgba(139,92,246,0.4)" }}
            animate={{ boxShadow: ["0 0 10px rgba(139,92,246,0.2)", "0 0 25px rgba(139,92,246,0.5)", "0 0 10px rgba(139,92,246,0.2)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Sparkles size={18} className="text-violet-400" />
          </motion.div>
          <div>
            <h2 className="text-display text-lg font-bold text-white">AI Analysis Console</h2>
            <p className="text-xs text-muted">Powered by SoundWave Intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] text-emerald-400 font-medium">ONLINE</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {hasPending ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl p-4 mb-4"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <div className="flex items-center gap-3">
                <motion.div className="flex gap-1">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <WaveBar key={i} index={i} active={true} />
                  ))}
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-violet-300">Analyzing: {analysis.track_name}</p>
                  <p className="text-[10px] text-muted mt-0.5">AI is processing your track…</p>
                </div>
              </div>
            </motion.div>
          ) : hasResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl p-4 mb-4"
              style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">Analysis complete — {analysis.track_name}</p>
              </div>
              {analysis.result?.summary && (
                <p className="text-xs text-secondary leading-relaxed">
                  {typingDone
                    ? analysis.result.summary
                    : <TypingText text={analysis.result.summary} onDone={() => setTypingDone(true)} />}
                </p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!hasPending && (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <input
                  ref={trackRef}
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Track name…"
                  className="w-full input-premium pr-10"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(139,92,246,0.2)",
                  }}
                />
                {error && <p className="text-[10px] text-red-400 mt-1 ml-1">{error}</p>}
              </div>

              <div className="relative">
                <input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist name (optional)"
                  className="w-full input-premium"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(139,92,246,0.2)" }}
                />
              </div>

              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={() => setMicActive((v) => !v)}
                  className="flex items-center justify-center w-12 h-12 rounded-xl border transition-all"
                  style={{
                    background: micActive ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.1)",
                    borderColor: micActive ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.3)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic size={16} className={micActive ? "text-red-400" : "text-violet-400"} />
                </motion.button>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 h-12 rounded-xl font-semibold text-sm text-white"
                  style={{
                    background: loading ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #7c3aed, #2563eb)",
                    boxShadow: loading ? "none" : "0 0 20px rgba(124,58,237,0.4)",
                    opacity: loading ? 0.7 : 1,
                  }}
                  whileHover={!loading ? { scale: 1.03, boxShadow: "0 0 30px rgba(124,58,237,0.6)" } : {}}
                  whileTap={!loading ? { scale: 0.97 } : {}}
                >
                  {loading ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <Send size={14} />
                  )}
                  {!loading && <span>Analyze</span>}
                </motion.button>
              </div>
            </div>

            {micActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-red-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <div className="flex gap-0.5 items-center">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <WaveBar key={i} index={i} active={true} />
                  ))}
                </div>
                <p className="text-xs text-red-400 ml-auto">Listening…</p>
              </motion.div>
            )}
          </form>
        )}
      </div>
    </motion.div>
  );
}
