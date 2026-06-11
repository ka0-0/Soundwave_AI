import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, Sliders, Disc, Activity, Music, Database, Volume2, VolumeX, Shield, 
  Heart, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import MusicReactiveVisualizer from "../components/player/MusicReactiveVisualizer";
import { PLAYER_TRACKS, getTrackByIndex } from "../components/player/playerTracks";
import { useMusicAnalyser, useAnalyserStore } from "../hooks/useMusicAnalyser";
import { usePlayerStore } from "../store/usePlayerStore";
import { useFavouritesStore } from "../store/useFavouritesStore";

// Formatting utility for time display
function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// Helper to hash a string to a number
function hashCode(str) {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

// Helper to normalize and map track objects
function normalizeTrack(track) {
  if (!track) return null;
  if (track.accent && track.accentAlt) return track;
  const trackId = track.id || track._id || "";
  const trackTitle = track.title || "";
  
  const hash = hashCode(trackId + trackTitle);
  const localIndex = Math.abs(hash) % PLAYER_TRACKS.length;
  const localFallback = PLAYER_TRACKS[localIndex];
  
  return {
    ...track,
    id: trackId,
    accent: track.accent || localFallback.accent || "#8b5cf6",
    accentAlt: track.accentAlt || localFallback.accentAlt || "#06b6d4"
  };
}


// ── Real-Time 8-Band Equalizer Widget ─────────────────────────────────────────
function AudioEqualizerHUD({ accent }) {
  const eqRefs = useRef([]);
  const equalizerMode = usePlayerStore((s) => s.equalizerMode);
  const setEqualizerMode = usePlayerStore((s) => s.setEqualizerMode);

  useEffect(() => {
    let raf;
    const tick = () => {
      const { bass, mid, high, energy } = useAnalyserStore.getState();
      const isPlaying = usePlayerStore.getState().isPlaying;
      
      const values = isPlaying
        ? [
            bass * 0.95 + Math.random() * 0.08,
            bass * 0.8 + mid * 0.2 + Math.random() * 0.08,
            mid * 0.85 + Math.random() * 0.08,
            mid * 0.9 + high * 0.1 + Math.random() * 0.08,
            high * 0.8 + mid * 0.2 + Math.random() * 0.08,
            high * 0.95 + Math.random() * 0.08,
            high * 0.65 + energy * 0.35 + Math.random() * 0.08,
            energy * 0.9 + Math.random() * 0.08
          ]
        : [0.08, 0.12, 0.08, 0.1, 0.07, 0.09, 0.11, 0.08];

      values.forEach((val, idx) => {
        if (eqRefs.current[idx]) {
          eqRefs.current[idx].style.height = `${Math.max(6, val * 100)}%`;
        }
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const EQ_MODES = [
    { id: "normal", label: "Flat" },
    { id: "bass-boost", label: "Bass+" },
    { id: "treble-boost", label: "Treble+" },
    { id: "clear-vocals", label: "Vocal" },
    { id: "cinematic", label: "3D EQ" }
  ];

  return (
    <div className="glass-subtle rounded-xl p-3 border border-white/5">
      <div className="flex justify-between items-center mb-2 text-[9px] font-mono tracking-widest text-white/40 uppercase">
        <span className="flex items-center gap-1"><Activity size={10} className="animate-pulse" /> Spectrum Analyzer</span>
        <span>8-Band</span>
      </div>
      <div className="flex items-end justify-between h-20 px-1 gap-1.5">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="flex-1 bg-white/5 rounded-t-sm h-full flex flex-col justify-end">
            <div
              ref={(el) => (eqRefs.current[idx] = el)}
              className="w-full rounded-t-sm transition-all duration-75"
              style={{
                background: `linear-gradient(to top, ${accent}88, ${accent})`,
                boxShadow: `0 0 8px ${accent}44`
              }}
            />
          </div>
        ))}
      </div>

      {/* Interactive Audio Equalizer Presets */}
      <div className="grid grid-cols-5 gap-1 mt-3 pt-2.5 border-t border-white/5 text-[8px] font-mono">
        {EQ_MODES.map((mode) => {
          const active = equalizerMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setEqualizerMode(mode.id)}
              className={`py-1 rounded text-center font-bold tracking-tight transition-all duration-300 border ${
                active 
                  ? "bg-white/10 text-white border-white/20 shadow-glow" 
                  : "bg-white/[0.02] text-white/40 border-white/[0.03] hover:text-white"
              }`}
              style={active ? { borderColor: accent, color: accent } : undefined}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Technical Telemetry Widget ───────────────────────────────────────────────
function TelemetryHUD({ track }) {
  const [bpm, setBpm] = useState(128);
  const [gain, setGain] = useState("-2.4");
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    const trackHash = track.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const calculatedBpm = 95 + (trackHash % 55); 
    setBpm(calculatedBpm);
    
    const calculatedGain = (-1.5 - (trackHash % 3.5)).toFixed(1);
    setGain(calculatedGain);
  }, [track]);

  return (
    <div className="glass-subtle rounded-xl p-3 border border-white/5 grid grid-cols-2 gap-2 font-mono text-[9px] text-white/50">
      <div className="bg-white/[0.02] rounded p-2 flex flex-col gap-0.5 border border-white/[0.01]">
        <span className="text-white/30 text-[8px] uppercase tracking-wider">Estimated BPM</span>
        <span className="text-xs font-semibold text-white/85 flex items-center gap-1.5">
          <Music size={11} className={isPlaying ? "animate-spin" : ""} style={{ animationDuration: `${60 / bpm * 2}s` }} /> 
          {bpm}
        </span>
      </div>
      <div className="bg-white/[0.02] rounded p-2 flex flex-col gap-0.5 border border-white/[0.01]">
        <span className="text-white/30 text-[8px] uppercase tracking-wider">Gain Offset</span>
        <span className="text-xs font-semibold text-white/85 flex items-center gap-1">
          <Shield size={11} /> {gain} dB
        </span>
      </div>
      <div className="bg-white/[0.02] rounded p-2 flex flex-col gap-0.5 border border-white/[0.01]">
        <span className="text-white/30 text-[8px] uppercase tracking-wider">Audio Stream</span>
        <span className="text-[10px] font-semibold text-white/85 flex items-center gap-1">
          <Database size={10} /> 1411kbps FLAC
        </span>
      </div>
      <div className="bg-white/[0.02] rounded p-2 flex flex-col gap-0.5 border border-white/[0.01]">
        <span className="text-white/30 text-[8px] uppercase tracking-wider">Channel Output</span>
        <span className="text-[10px] font-semibold text-white/85 flex items-center gap-1">
          <Volume2 size={10} /> 2ch Stereo
        </span>
      </div>
    </div>
  );
}

// ── Spinning Vinyl Record Deck Component ─────────────────────────────────────
function TurntableCD({ track, isPlaying }) {
  return (
    <div className="glass-subtle rounded-xl p-4 border border-white/5 flex flex-col items-center relative overflow-hidden">
      {/* Vinyl record spinning deck */}
      <div className="relative w-44 h-44 rounded-full bg-neutral-950 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.85)]">
        {/* Grooves */}
        <div className="absolute inset-2 rounded-full border border-white/5 opacity-40" />
        <div className="absolute inset-4 rounded-full border border-white/5 opacity-25" />
        <div className="absolute inset-6 rounded-full border border-white/5 opacity-40" />
        <div className="absolute inset-10 rounded-full border border-white/5 opacity-20" />
        <div className="absolute inset-14 rounded-full border border-white/5 opacity-30" />

        {/* Spin wrapper */}
        <motion.div
          className="w-28 h-28 rounded-full overflow-hidden relative border border-black/50 shadow-inner flex items-center justify-center"
          animate={isPlaying ? { rotate: 360 } : {}}
          transition={isPlaying ? { repeat: Infinity, duration: 9, ease: "linear" } : {}}
          style={{
            background: `radial-gradient(circle, ${track.accent}99 0%, ${track.accentAlt}cc 100%)`
          }}
        >
          {/* Hologram details on record label */}
          <div className="absolute inset-4 rounded-full border border-white/10 flex items-center justify-center">
            <span className="text-[8px] font-mono tracking-widest text-white/60 uppercase truncate max-w-[80px]">
              {track.title}
            </span>
          </div>
          {/* Spindle hole */}
          <div className="w-4 h-4 rounded-full bg-neutral-900 border border-white/20 z-10" />
        </motion.div>
      </div>

      {/* Tone Arm SVG overlay */}
      <div className="absolute top-4 right-8 w-20 h-28 pointer-events-none">
        <motion.svg
          width="80"
          height="110"
          viewBox="0 0 80 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="origin-[45px_15px]"
          animate={{ rotate: isPlaying ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 45, damping: 10 }}
        >
          {/* Arm Base pivot */}
          <circle cx="45" cy="15" r="9" fill="#2a2a2a" stroke="#4a4a4a" strokeWidth="2" />
          <circle cx="45" cy="15" r="3" fill="#111" />
          
          {/* Arm Shaft */}
          <path d="M45 15 L16 82 L21 92" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Cartridge head */}
          <rect x="11" y="88" width="9" height="14" rx="1" fill={track.accent} stroke="#111" strokeWidth="1" />
        </motion.svg>
      </div>

      {/* Turntable Info */}
      <div className="mt-4 text-center">
        <p className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Disc size={12} className={isPlaying ? "animate-pulse text-pink-500" : "text-white/40"} /> Vinyl Deck
        </p>
        <p className="text-[8px] text-white/30 font-mono mt-0.5">SPEED: {isPlaying ? "33 RPM" : "PAUSED"}</p>
      </div>
    </div>
  );
}

// ── Cyber Futuristic Seek Bar Component ──────────────────────────────────────
function FuturisticSeekBar({ 
  seekPercent, 
  seekMax, 
  displayTime, 
  duration, 
  accent, 
  accentAlt, 
  isPlaying, 
  onSeekStart, 
  onSeekChange, 
  onSeekCommit 
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center gap-3">
        {/* Current Time Display */}
        <span className="text-[10px] font-mono text-white/40 w-10 shrink-0 select-none">
          {formatTime(displayTime)}
        </span>
        
        {/* Seek Track Wrapper */}
        <div className="relative flex-1 h-6 flex items-center group cursor-pointer">
          {/* Unplayed dim track */}
          <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-full border border-white/5 overflow-hidden">
            {/* Audio reactive timeline backdrop waves (cosmetic) */}
            {isPlaying && (
              <div 
                className="absolute inset-0 opacity-[0.06] animate-[pulse_1.5s_infinite]"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 4px, ${accent} 4px, ${accent} 6px)`
                }}
              />
            )}
          </div>

          {/* Played progress track */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full pointer-events-none transition-all duration-75 overflow-hidden"
            style={{
              width: `${seekPercent}%`,
              background: `linear-gradient(90deg, ${accent}, ${accentAlt})`,
              boxShadow: `0 0 10px ${accent}aa, 0 0 4px ${accentAlt}66`
            }}
          >
            {/* Futuristic energy pulse running along the progress bar */}
            {isPlaying && (
              <div 
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{
                  animation: "progressPulse 2.4s linear infinite"
                }}
              />
            )}
          </div>

          {/* Interactive thumb playhead */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-100 group-hover:scale-125"
            style={{
              left: `${seekPercent}%`
            }}
          >
            {/* Outer expanding ring */}
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: accent, animationDuration: "2s" }}
            />
            {/* Middle colored ring */}
            <div 
              className="w-3.5 h-3.5 rounded-full bg-neutral-950 border-2 shadow-[0_0_10px_currentColor]"
              style={{ borderColor: accent, color: accent }}
            />
            {/* Inner solid center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-white absolute" />
          </div>

          {/* Invisible range input spanning the whole width for dragging */}
          <input
            type="range"
            min={0}
            max={seekMax}
            step={1}
            value={displayTime}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={(e) => onSeekChange(Number(e.target.value))}
            onMouseUp={(e) => onSeekCommit(Number(e.target.value))}
            onTouchEnd={(e) => onSeekCommit(Number(e.target.value))}
            className="w-full absolute inset-0 opacity-0 cursor-pointer h-full z-10"
            aria-label="Futuristic Seek"
          />
        </div>

        {/* Total Time Display */}
        <span className="text-[10px] font-mono text-white/40 w-10 shrink-0 text-right select-none">
          {formatTime(duration)}
        </span>
      </div>

      <style>{`
        @keyframes progressPulse {
          0% { left: -100px; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Redesigned Player Page ───────────────────────────────────────────────────
export default function Player() {
  useMusicAnalyser(true);

  // Zustand Store Selectors
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const pause = usePlayerStore((s) => s.pause);
  const initEngine = usePlayerStore((s) => s.initEngine);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const skip = usePlayerStore((s) => s.skip);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode);
  const current = usePlayerStore((s) => s.current);
  const queue = usePlayerStore((s) => s.queue);
  const shuffledQueue = usePlayerStore((s) => s.shuffledQueue);

  // Favourites Store
  const toggleFavourite = useFavouritesStore((s) => s.toggle);
  const isFavourite = useFavouritesStore((s) => s.isFavourite);

  const track = normalizeTrack(current || getTrackByIndex(currentIndex));
  const activeQueue = (isShuffled ? shuffledQueue : queue).map(normalizeTrack);

  // Visualizer custom states
  const [particleDensity, setParticleDensity] = useState(1.0);
  const [speedMult, setSpeedMult] = useState(1.0);
  const [bassGain, setBassGain] = useState(1.0);

  // Custom seeking states
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDraft, setSeekDraft] = useState(0);

  const displayTime = isSeeking ? seekDraft : currentTime;
  const seekMax = duration > 0 ? duration : Math.max(currentTime, 1);
  const seekPercent = seekMax > 0 ? (displayTime / seekMax) * 100 : 0;

  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekDraft(currentTime);
  };
  const handleSeekChange = (v) => {
    setSeekDraft(v);
  };
  const handleSeekCommit = (v) => {
    seek(v);
    setIsSeeking(false);
  };

  const cycleRepeatMode = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  async function handleSelect(index) {
    initEngine();
    if (currentIndex === index && isPlaying) {
      pause();
      return;
    }
    await playTrack(index, { fromStart: currentIndex !== index });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }}
      className="relative min-h-[calc(100vh-140px)] rounded-3xl p-0.5 overflow-hidden"
    >
      {/* Self-contained keyframe animations for active item live equalizers */}
      <style>{`
        @keyframes eqBar1 {
          0%, 100% { height: 25%; }
          50% { height: 100%; }
        }
        @keyframes eqBar2 {
          0%, 100% { height: 35%; }
          50% { height: 85%; }
        }
        @keyframes eqBar3 {
          0%, 100% { height: 15%; }
          50% { height: 95%; }
        }
        @keyframes eqBar4 {
          0%, 100% { height: 30%; }
          50% { height: 75%; }
        }
        .animate-eq-bar-1 { animation: eqBar1 0.65s ease-in-out infinite; }
        .animate-eq-bar-2 { animation: eqBar2 0.85s ease-in-out infinite; }
        .animate-eq-bar-3 { animation: eqBar3 0.55s ease-in-out infinite; }
        .animate-eq-bar-4 { animation: eqBar4 0.75s ease-in-out infinite; }
      `}</style>

      {/* Dynamic ambient background glow synced to track accent color */}
      <div 
        className="absolute inset-0 -z-20 transition-all duration-1000 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 30%, ${track.accent}44 0%, transparent 45%), radial-gradient(circle at 80% 70%, ${track.accentAlt}33 0%, transparent 45%)`
        }}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Now playing</p>
      <motion.h1
        key={track.title}
        className="text-display mt-2 text-4xl font-bold md:text-5xl tracking-tight"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {track.title}
      </motion.h1>
      <p className="mt-2 text-secondary font-medium">
        {track.artist} · <span className="transition-colors duration-500" style={{ color: track.accent }}>{track.mood}</span>
      </p>

      {/* Cyber Console Card container */}
      <div className="glass gradient-border relative mt-8 overflow-hidden rounded-card p-4 sm:p-6 shadow-2xl">
        <div
          className="absolute inset-0 -z-10 blur-3xl transition-colors duration-1000 opacity-30"
          style={{
            background: `linear-gradient(90deg, ${track.accent}50, ${track.accentAlt}40)`
          }}
        />

        {/* Responsive Grid */}
        <div className="grid gap-6 lg:grid-cols-12 relative z-10">
          
          {/* Left Column: Visualizer & Full Playback Console */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Visualizer box */}
            <MusicReactiveVisualizer 
              particleDensity={particleDensity}
              speedMult={speedMult}
              bassGain={bassGain}
            />

            {/* INTEGRATED DECK CONTROL CONSOLE */}
            <div className="glass-subtle rounded-2xl p-5 border border-white/5 flex flex-col gap-4 shadow-xl">
              
              {/* Futuristic Seek Bar */}
              <FuturisticSeekBar
                seekPercent={seekPercent}
                seekMax={seekMax}
                displayTime={displayTime}
                duration={duration}
                accent={track.accent}
                accentAlt={track.accentAlt}
                isPlaying={isPlaying}
                onSeekStart={handleSeekStart}
                onSeekChange={handleSeekChange}
                onSeekCommit={handleSeekCommit}
              />

              {/* Playback Buttons & Volume */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
                
                {/* Left controls: Like and Shuffle */}
                <div className="flex items-center gap-4">
                  <motion.button
                    type="button"
                    onClick={() => track.id && toggleFavourite(track)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.12 }}
                    className="p-2 rounded-full hover:bg-white/5 transition-all text-white/50 hover:text-white"
                  >
                    <Heart 
                      size={17} 
                      className={isFavourite(track.id) ? "text-pink-500 fill-pink-500" : ""}
                      style={isFavourite(track.id) ? { filter: `drop-shadow(0 0 8px ${track.accent})` } : {}}
                    />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={toggleShuffle}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.12 }}
                    className={`p-2 rounded-full hover:bg-white/5 transition-all ${isShuffled ? "text-white" : "text-white/40"}`}
                    style={isShuffled ? { color: track.accent, filter: `drop-shadow(0 0 6px ${track.accent})` } : {}}
                  >
                    <Shuffle size={17} />
                  </motion.button>
                </div>

                {/* Center controls: Skip, Play/Pause */}
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={() => skip(-1)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.12 }}
                    className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all"
                  >
                    <SkipBack size={18} />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={togglePlay}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.08 }}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-black shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${track.accent}, ${track.accentAlt})`,
                      boxShadow: `0 0 20px -3px ${track.accent}aa`
                    }}
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => skip(1)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.12 }}
                    className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all"
                  >
                    <SkipForward size={18} />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={cycleRepeatMode}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.12 }}
                    className={`p-2 rounded-full hover:bg-white/5 transition-all ${repeatMode !== "off" ? "text-white" : "text-white/40"}`}
                    style={repeatMode !== "off" ? { color: track.accent, filter: `drop-shadow(0 0 6px ${track.accent})` } : {}}
                  >
                    {repeatMode === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
                  </motion.button>
                </div>

                {/* Right controls: Mute & Volume Slider */}
                <div className="flex items-center gap-2 w-36">
                  <motion.button
                    type="button"
                    onClick={() => setVolume(volume === 0 ? 0.55 : 0)}
                    whileTap={{ scale: 0.88 }}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </motion.button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                    style={{ accentColor: track.accent }}
                  />
                </div>

              </div>

            </div>

            {/* Synthesizer Control Panel Card (Visualizer Configuration) */}
            <div className="glass-subtle rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
              <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Visualizer Configuration</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                    <span className="flex items-center gap-1"><Sliders size={11} /> Particle Density</span>
                    <span className="text-white/60">{particleDensity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={particleDensity}
                    onChange={(e) => setParticleDensity(Number(e.target.value))}
                    className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                    style={{ accentColor: track.accent }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                    <span className="flex items-center gap-1"><Sliders size={11} /> Wave Speed</span>
                    <span className="text-white/60">{speedMult.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={speedMult}
                    onChange={(e) => setSpeedMult(Number(e.target.value))}
                    className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                    style={{ accentColor: track.accent }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                    <span className="flex items-center gap-1"><Sliders size={11} /> Audio Sensitivity</span>
                    <span className="text-white/60">{bassGain.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={bassGain}
                    onChange={(e) => setBassGain(Number(e.target.value))}
                    className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                    style={{ accentColor: track.accent }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Track Deck & Playlist Deck */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Spinning Turntable Deck */}
            <TurntableCD track={track} isPlaying={isPlaying} />

            {/* Equalizer & Audio Telemetry info */}
            <AudioEqualizerHUD accent={track.accent} />
            <TelemetryHUD track={track} />

            {/* Queue Playlist Card */}
            <GlassCard className="!shadow-none flex-1 flex flex-col min-h-[260px] max-h-[380px]">
              <p className="font-semibold text-sm tracking-wide">Your queue</p>
              <p className="mt-1 text-[10px] text-muted">Click a track to play. Visualizer adapts in real-time.</p>
              <ul className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                {activeQueue.map((t, i) => {
                  const active = i === currentIndex;
                  const playing = active && isPlaying;
                  const trackAccent = t.accent || "#8b5cf6";
                  const trackAccentAlt = t.accentAlt || "#06b6d4";
                  return (
                    <li key={t.id || i}>
                      <button
                        type="button"
                        onClick={() => handleSelect(i)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition-all duration-300 ${
                          active
                            ? "ring-1"
                            : "hover:bg-white/5 opacity-70 hover:opacity-100"
                        }`}
                        style={
                          active
                            ? {
                                background: `linear-gradient(90deg, ${trackAccent}20, transparent)`,
                                boxShadow: `0 0 15px -3px ${trackAccent}44, inset 0 0 0 1px ${trackAccent}44`,
                                borderColor: `${trackAccent}55`
                              }
                            : undefined
                        }
                      >
                        {/* Play/Pause state background wrapper */}
                        <span
                          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg text-white transition-all duration-300"
                          style={{ 
                            background: `linear-gradient(135deg, ${trackAccent}, ${trackAccentAlt})`,
                            boxShadow: active ? `0 0 10px ${trackAccent}66` : "none"
                          }}
                        >
                          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </span>
                        
                        {/* Title and artist */}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white/90">{t.title}</span>
                          <span className="block truncate text-[10px] text-muted">{t.artist}</span>
                        </span>

                        {/* Animated Equalizer bar on active index */}
                        {playing && (
                          <div className="flex items-end gap-0.5 h-3.5 w-3.5 shrink-0 text-white mr-1 opacity-80">
                            <span className="w-[1.5px] bg-current rounded-full animate-eq-bar-1" />
                            <span className="w-[1.5px] bg-current rounded-full animate-eq-bar-2" />
                            <span className="w-[1.5px] bg-current rounded-full animate-eq-bar-3" />
                            <span className="w-[1.5px] bg-current rounded-full animate-eq-bar-4" />
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
