import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Sparkles, Music, Radio, Heart, Play, Pause, Plus, X,
  SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1, Shuffle,
  TrendingUp, Calendar, Compass, Award, Search, Send, Mic, Info, History
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useToastStore } from "../store/useToastStore";
import { useFavouritesStore } from "../store/useFavouritesStore";
import { useAnalyserStore, useMusicAnalyser } from "../hooks/useMusicAnalyser";
import { apiGet, apiPost, apiSearch } from "../utils/api";
import { getSharedAudio } from "../store/audioEngine";
import { PLAYER_TRACKS } from "../components/player/playerTracks";

// Helper: Format Time
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
  const trackId = String(track.id || track._id || "");
  const trackTitle = track.title || "";
  
  const rawUrl = track.src || track.audio_url || track.preview_url || track.preview || "";
  const isMockUrl = !rawUrl || 
                    rawUrl === "None" || 
                    rawUrl === "null" || 
                    rawUrl === "undefined" || 
                    String(rawUrl).includes("cdn.soundwave.ai") ||
                    String(rawUrl).includes("soundhelix.com");
  
  const hash = hashCode(trackId + trackTitle);
  const localIndex = Math.abs(hash) % PLAYER_TRACKS.length;
  const localFallback = PLAYER_TRACKS[localIndex];
  
  return {
    ...track,
    id: trackId,
    src: isMockUrl ? localFallback.src : rawUrl,
    isMockUrl: isMockUrl,
    cover_url: track.cover_url || track.album_art || localFallback.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    accent: track.accent || localFallback.accent || "#8b5cf6",
    accentAlt: track.accentAlt || localFallback.accentAlt || "#06b6d4"
  };
}

// ── DJ Cosmic Warp Field Background Canvas ──
function ElectricNeuralBackground({ accent, accentAlt }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize 3D projected particles for warp speed tunnel
    const particleCount = 120;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * w,
        y: (Math.random() - 0.5) * h,
        z: Math.random() * 1000,
        size: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.5 ? accent : accentAlt
      });
    }

    // Expanding beat ripples centered on warp focal point
    let ripples = [];
    let lastBassLevel = 0;

    const draw = () => {
      // Dark trail overlay to create fluid space particle paths
      ctx.fillStyle = "rgba(4, 2, 8, 0.16)";
      ctx.fillRect(0, 0, w, h);

      const levels = useAnalyserStore.getState() || { energy: 0, bass: 0, mid: 0, high: 0 };
      const { energy, bass, mid, high } = levels;

      // Trigger expanding circular energy ripples on bass spikes
      if (bass > 0.65 && bass - lastBassLevel > 0.08) {
        ripples.push({
          x: w / 2,
          y: h / 2,
          r: 10,
          maxR: 300 + bass * 400,
          color: Math.random() > 0.5 ? accent : accentAlt,
          alpha: 0.65
        });
      }
      lastBassLevel = bass;

      // Enable additive blending for glowing holographic particle overlay
      ctx.globalCompositeOperation = "lighter";

      // Ambient dynamic bloom glow in space (pulsates with music beats)
      const glowRadius = 240 + bass * 180;
      const centerGlow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, glowRadius);
      const alphaHex = Math.max(0, Math.min(255, Math.floor(15 + bass * 25))).toString(16).padStart(2, "0");
      const alphaAltHex = Math.max(0, Math.min(255, Math.floor(8 + mid * 18))).toString(16).padStart(2, "0");
      centerGlow.addColorStop(0, `${accent}${alphaHex}`);
      centerGlow.addColorStop(0.5, `${accentAlt}${alphaAltHex}`);
      centerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, w, h);

      // Draw and animate expanding energy ripples
      ripples.forEach((rip, rIdx) => {
        rip.r += 4.2 * (1 + energy * 0.9);
        rip.alpha -= 0.012;

        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          ripples.splice(rIdx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = rip.color;
        ctx.globalAlpha = rip.alpha;
        ctx.lineWidth = 2.0;
        ctx.stroke();
      });

      // Update and draw 3D projected warp particles (no lag-inducing shadowBlur used!)
      const speed = (2.2 + energy * 6.5) * (1.0 + (bass > 0.65 ? (bass - 0.65) * 5 : 0));
      particles.forEach((p) => {
        p.z -= speed;
        if (p.z <= 0) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * w;
          p.y = (Math.random() - 0.5) * h;
          p.color = Math.random() > 0.5 ? accent : accentAlt;
        }

        // Project coordinates from 3D space to 2D screen coordinates
        const px = w / 2 + (p.x / p.z) * 450;
        const py = h / 2 + (p.y / p.z) * 450;

        // Reset particle if it drifts off-screen
        if (px < 0 || px > w || py < 0 || py > h) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * w;
          p.y = (Math.random() - 0.5) * h;
          p.color = Math.random() > 0.5 ? accent : accentAlt;
          return;
        }

        // Size and brightness scale as they get closer (smaller depth z)
        const size = p.size * (1.0 - p.z / 1000) * (3.0 + bass * 2.0);
        const alpha = (1.0 - p.z / 1000) * (0.4 + energy * 0.6);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Restore default compositing
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, [accent, accentAlt]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

// ── Live Symmetric Waveform Visualizer ──
function CompactWaveform({ accent, accentAlt, isPlaying }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth || 180;
      const h = canvas.height = canvas.offsetHeight || 30;
      ctx.clearRect(0, 0, w, h);

      const levels = useAnalyserStore.getState() || { energy: 0, bass: 0, mid: 0, high: 0 };
      const { energy, bass, mid, high } = levels;

      const bars = 16;
      const spacing = 4;
      const barW = (w - (bars - 1) * spacing) / bars;
      const t = Date.now() * 0.003;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, accentAlt);

      for (let i = 0; i < bars; i++) {
        const centerDist = Math.abs(i - bars / 2) / (bars / 2);
        const level = centerDist < 0.33 ? bass : centerDist < 0.66 ? mid : high;
        const idle = 0.15 + Math.sin(t * 3.5 + i * 0.45) * 0.08;
        const mix = isPlaying ? level * (0.6 + energy * 0.7) : idle;
        const barH = Math.max(4, mix * h * 0.85);
        const x = i * (barW + spacing);
        const y = (h - barH) / 2;

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.45 + mix * 0.55;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, barW / 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [accent, accentAlt, isPlaying]);

  return <canvas ref={canvasRef} className="w-full max-w-[180px] h-[30px] opacity-80" />;
}



// ── Main Redesigned Dashboard Page ──
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const { toggle, isFavourite } = useFavouritesStore();
  const favouriteIds = useFavouritesStore((s) => s.favouriteIds);

  // Player state
  const {
    current, isPlaying, volume, currentTime, duration,
    togglePlay, skip, seek, setVolume, playTrack, queue, repeatMode, setRepeatMode, isShuffled, toggleShuffle, addToQueue
  } = usePlayerStore();

  useMusicAnalyser(true);

  const [debugInfo, setDebugInfo] = useState("");
  useEffect(() => {
    const intv = setInterval(() => {
      const audio = getSharedAudio();
      if (audio) {
        setDebugInfo(`Class: ${audio.constructor?.name || "Audio"} | Src: ${audio.src ? audio.src.substring(0, 40) + "..." : "none"} | Ready: ${audio.readyState} | Err: ${audio.error ? audio.error.code : "none"} | Paused: ${audio.paused}`);
      } else {
        setDebugInfo("No Audio");
      }
    }, 300);
    return () => clearInterval(intv);
  }, []);

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [aiDjQueue, setAiDjQueue] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search states and handlers
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (queryStr) => {
    if (!queryStr.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const data = await apiSearch(queryStr.trim());
      const tracks = data.tracks || [];
      setSearchResults(tracks.map(normalizeTrack));

      // Save search query to sqlite backend to trigger taste profiling
      apiPost(`/workspace/search?query=${encodeURIComponent(queryStr.trim())}&results_count=${tracks.length}`)
        .catch((e) => console.error("Failed to save search:", e));
    } catch (err) {
      console.error("[DASHBOARD] Search failed", err);
      pushToast({ type: "error", title: "Search Error", message: "Failed to query tracks." });
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePlaySearchResult = async (trackItem) => {
    const norm = normalizeTrack(trackItem);
    const idx = queue.findIndex(t => t.id === norm.id || t.title.toLowerCase() === norm.title.toLowerCase());
    if (idx !== -1) {
      await playTrack(idx, { fromStart: true });
    } else {
      addToQueue(norm);
      const updatedQueue = usePlayerStore.getState().queue;
      const targetIdx = updatedQueue.findIndex(t => t.id === norm.id);
      if (targetIdx !== -1) {
        await playTrack(targetIdx, { fromStart: true });
      }
    }
    pushToast({ type: "success", title: "Playing Track", message: `Playing "${norm.title}"` });
  };

  // Load dashboard data
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [currentAnalysis, djData, analytics] = await Promise.all([
        apiGet("/analysis/current").catch(() => null),
        apiGet("/recommendations/ai-dj").catch(() => []),
        apiGet("/analytics/summary").catch(() => null),
      ]);
      const normalizedDj = Array.isArray(djData) ? djData.map(normalizeTrack) : [];
      
      setAnalysis(currentAnalysis);
      setAiDjQueue(normalizedDj);
      setAnalyticsData(analytics);
    } catch (err) {
      console.error("[DASHBOARD] Load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Action Triggers
  const handlePlaySong = async (trackTitle) => {
    const idx = queue.findIndex(t => t.title.toLowerCase() === trackTitle.toLowerCase());
    if (idx !== -1) {
      await playTrack(idx, { fromStart: true });
      pushToast({ type: "success", title: "Playing Track", message: `Started playback of "${trackTitle}"` });
    } else {
      pushToast({ type: "error", title: "Playback Error", message: `Could not find "${trackTitle}" in player queue.` });
    }
  };

  const handleQueueSong = (trackItem) => {
    const norm = normalizeTrack(trackItem);
    addToQueue(norm);
    pushToast({ type: "success", title: "Queue Updated", message: `"${norm.title}" added to queue.` });
  };

  // Resolve dynamic colors
  const track = current || { title: "No Track", artist: "Unknown", accent: "#8b5cf6", accentAlt: "#06b6d4" };
  const accent = track.accent || "#8b5cf6";
  const accentAlt = track.accentAlt || "#06b6d4";

  // Seek bar math
  const displayTime = currentTime;
  const seekMax = duration > 0 ? duration : Math.max(currentTime, 1);
  const seekPercent = seekMax > 0 ? (displayTime / seekMax) * 100 : 0;

  // Greeting & Stats Strip math
  const greetingHour = new Date().getHours();
  const greetingText = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  const totalSongs = analyticsData?.total_tracks || 46;
  const listeningHours = Math.round((analyticsData?.total_minutes || 377) / 60 * 10) / 10;
  const streakDays = 7;
  const dominantMood = analyticsData?.personality?.archetype || "Electronic Pulse";

  // 3D Tilt Parallax effect for central player card
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -6,
      y: (x / (rect.width / 2)) * 6
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Liked songs display (intersect with queue songs to get cover metadata)
  const likedSongsList = queue.filter(t => favouriteIds.has(t.id));
  const fallbackLikedSongs = likedSongsList.length > 0 ? likedSongsList : queue.slice(0, 4);

  return (
    <div className="relative min-h-screen pb-28 pt-8 px-4 md:px-12 overflow-x-hidden font-sans">
      {/* Dynamic Neural network Canvas Background */}
      <ElectricNeuralBackground accent={accent} accentAlt={accentAlt} />

      {/* Cinematic blurred cover artwork atmosphere */}
      <AnimatePresence mode="wait">
        {track.src && (
          <motion.div
            key={track.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="fixed inset-0 z-0 bg-cover bg-center filter blur-[150px] saturate-[180%] scale-110 pointer-events-none"
            style={{
              backgroundImage: `url(${track.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop"})`
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* HERO SECTION: Apple Keynote side-by-side composition (Height max 75-80vh) */}
        <div className="w-full flex flex-col lg:flex-row justify-between items-center gap-8 lg:min-h-[500px] lg:h-[76vh] relative py-4">
          
          {/* LEFT: Greeting + Compact Telemetry Stats Strip + AI Insight */}
          <div className="flex flex-col gap-6 text-left w-full lg:max-w-xl">
            <div>
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] font-extrabold uppercase tracking-[0.35em]"
                style={{ color: accent }}
              >
                SOUNDWAVE MUSIC INTELLIGENCE
              </motion.p>
              
              <motion.h1
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[clamp(1.75rem,5vw,3rem)] font-black text-display tracking-tight text-white mt-1 leading-tight break-words"
              >
                {greetingText},<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-violet-300">
                  {user?.username || "Jitarth"}
                </span>.
              </motion.h1>
              
              <p className="text-sm text-cyan-300 font-semibold tracking-wide mt-2.5">
                Your universe is resonating at 87%.
              </p>
            </div>

            {/* Neural Transceiver Search Input */}
            <div className="relative w-full lg:max-w-md mt-1 z-20">
              <input
                type="text"
                placeholder="Search tracks, artists, or moods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-full py-2.5 pl-10 pr-24 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <button
                onClick={() => handleSearch(searchQuery)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white text-black hover:bg-zinc-200 transition-colors font-bold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-full"
              >
                {searchLoading ? "Scanning..." : "Search"}
              </button>
            </div>

            {/* Compact Listening Statistics Strip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-premium gold-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-x-6 gap-y-3 items-center justify-between border border-white/5 w-full"
            >
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold text-muted uppercase tracking-widest">Total Songs</p>
                <p className="text-sm font-black text-white mt-0.5">{totalSongs} tracks</p>
              </div>
              <div className="h-6 w-px bg-white/5 hidden lg:block animate-pulse" />
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold text-muted uppercase tracking-widest">Listening Time</p>
                <p className="text-sm font-black text-cyan-300 mt-0.5">{listeningHours} hrs</p>
              </div>
              <div className="h-6 w-px bg-white/5 hidden lg:block animate-pulse" />
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold text-muted uppercase tracking-widest">Active Streak</p>
                <p className="text-sm font-black text-pink-400 mt-0.5">🔥 {streakDays} days</p>
              </div>
              <div className="h-6 w-px bg-white/5 hidden lg:block animate-pulse" />
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold text-muted uppercase tracking-widest">Dominant Mood</p>
                <p className="text-sm font-black text-violet-300 mt-0.5 truncate">{dominantMood}</p>
              </div>
            </motion.div>

            {/* AI Insight Text block */}
            <div className="flex gap-2.5 items-start text-xs text-muted leading-relaxed">
              <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <p>
                <span className="text-white font-extrabold">DOMINANT FREQUENCY:</span> Your audio nodes indicate a heavy drift into <span className="text-cyan-300 font-bold">Electronic Pulse</span> rhythms today. We've optimized your AI recommendations deck accordingly.
              </p>
            </div>
          </div>

          {/* CENTER-RIGHT: Shifted Music Player Card (Luxury horizontal DAC device) */}
          <div className="relative flex-shrink-0 z-10 w-full lg:w-auto flex justify-center lg:justify-end lg:pr-8">
            
            {/* Soft ambient light glow wrapper behind the player */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-[380px] h-[380px] rounded-full filter blur-[60px] opacity-40 animate-pulse"
                   style={{ background: `radial-gradient(circle, ${accent} 0%, ${accentAlt} 100%)` }} />
            </div>

            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: "transform 0.1s ease-out",
                borderColor: `${accent}35`,
                boxShadow: `0 32px 128px rgba(0, 0, 0, 0.85), 0 0 50px ${accent}20`
              }}
              className="w-full max-w-[560px] h-auto lg:h-[440px] glass-premium rounded-[2rem] p-6 relative z-10 overflow-hidden flex flex-col md:flex-row gap-6 items-center border border-white/10"
            >
              {/* Left Side: Capped 320x320 Album Art */}
              <div className="w-[280px] md:w-[320px] max-w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group shrink-0">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                     style={{ backgroundImage: `url(${track.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop"})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                  </button>
                </div>
              </div>

              {/* Right Side: Player Details, Seek Bar, Waveform & Controls */}
              <div className="flex-1 w-full min-w-0 flex flex-col justify-between md:h-full py-1 gap-4 md:gap-0">
                {/* Meta details */}
                <div>
                  <div className="flex justify-between items-center gap-1.5 mb-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Active Coordinates
                    </span>
                    <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-violet-300 truncate">
                      {track.mood || "Acoustic"}
                    </span>
                  </div>
                  <h2 className="text-white text-lg font-black tracking-wide truncate leading-tight">{track.title}</h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest truncate mt-0.5">{track.artist}</p>
                  {/* Diagnostic Debug info */}
                  <div className="text-[9px] font-mono text-cyan-400 mt-1 truncate w-full" title={debugInfo}>
                    {debugInfo}
                  </div>
                </div>

                {/* Symmetric compact visualizer */}
                <div className="my-2.5">
                  <CompactWaveform accent={accent} accentAlt={accentAlt} isPlaying={isPlaying} />
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[9px] text-muted font-bold tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="relative mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden cursor-pointer group">
                    <input
                      type="range"
                      min={0}
                      max={seekMax}
                      value={displayTime}
                      onChange={(e) => seek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      aria-label="Seek"
                    />
                    <div className="absolute left-0 top-0 bottom-0 rounded-full group-hover:brightness-110"
                         style={{ 
                           width: `${seekPercent}%`,
                           background: `linear-gradient(90deg, ${accent}, ${accentAlt})`
                         }} />
                  </div>
                </div>

                {/* Main controls row */}
                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={() => toggleShuffle()}
                    className={`p-2 transition-colors ${isShuffled ? "text-cyan-400" : "text-muted hover:text-white"}`}
                  >
                    <Shuffle size={14} />
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => skip(-1)} className="p-2 text-muted hover:text-white transition-colors animate-pulse" style={{ minWidth: 44, minHeight: 44, display: 'flex', items: 'center', justify: 'center' }}>
                      <SkipBack size={16} />
                    </button>
                    <button
                      onClick={togglePlay}
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accentAlt})`, minWidth: 44, minHeight: 44 }}
                      className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={() => skip(1)} className="p-2 text-muted hover:text-white transition-colors animate-pulse" style={{ minWidth: 44, minHeight: 44, display: 'flex', items: 'center', justify: 'center' }}>
                      <SkipForward size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => setRepeatMode(repeatMode === "off" ? "all" : "off")}
                    className={`p-2 transition-colors ${repeatMode !== "off" ? "text-violet-400" : "text-muted hover:text-white"}`}
                  >
                    <Repeat size={14} />
                  </button>
                </div>

                {/* Like Button Trigger */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => track.id && toggle(track)}
                    className="flex items-center gap-1.5 text-[9px] text-muted hover:text-white transition-colors font-bold uppercase"
                    style={{ minHeight: 44 }}
                  >
                    <Heart size={12} fill={isFavourite(track.id) ? "#ec4899" : "none"} stroke={isFavourite(track.id) ? "#ec4899" : "currentColor"} className={isFavourite(track.id) ? "text-pink-400" : ""} />
                    {isFavourite(track.id) ? "Loved Song" : "Love Song"}
                  </button>
                  <span className="text-[8px] text-muted uppercase tracking-widest font-extrabold">Active Device</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* FIVE ACTIONABLE MUSIC SECTIONS */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Section 1: Most Played Songs (Actionable List) */}
          <div className="relative overflow-hidden rounded-2xl glass-premium gold-border p-6 h-[340px] flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-cyan-300">Popular Coordinates</p>
              <h3 className="text-display text-lg font-black text-white tracking-wide mt-1">Most Played</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">Your highest frequency tracks in the current cycle.</p>
            </div>

            <div className="mt-4 space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {queue.slice(0, 4).map((item, idx) => (
                <div key={item.id || idx} className="flex gap-3 items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/25 hover:bg-white/[0.04] transition-all group">
                  <button
                    onClick={() => handlePlaySong(item.title)}
                    className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:bg-cyan-500 group-hover:text-black transition-colors"
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">{item.title}</p>
                    <p className="text-[9px] text-muted truncate mt-0.5">{item.artist}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => toggle(item)}
                      className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-pink-400 transition-colors"
                    >
                      <Heart size={12} fill={isFavourite(item.id) ? "#ec4899" : "none"} stroke={isFavourite(item.id) ? "#ec4899" : "currentColor"} />
                    </button>
                    <button
                      onClick={() => handleQueueSong(item)}
                      className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-cyan-400 transition-colors"
                      title="Add to queue"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Liked Songs Horizontal Slider */}
          <div className="glass-premium gold-border rounded-2xl p-6 flex flex-col justify-between h-[340px] overflow-hidden">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-pink-300">Your Vault</p>
              <h3 className="text-display text-lg font-black text-white tracking-wide mt-1">Liked Songs</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">Your personal acoustic inventory. Swipe to play.</p>
            </div>

            <div className="flex gap-4 overflow-x-auto py-4 pr-2 custom-scrollbar flex-1 items-center">
              {fallbackLikedSongs.map((track) => (
                <motion.div
                  key={track.id}
                  whileHover={{ scale: 1.06, y: -4 }}
                  className="flex-shrink-0 w-28 aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-lg"
                  onClick={() => handlePlaySong(track.title)}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${track.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

                  {/* Liked quick play */}
                  <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 bg-black/45 transition-opacity flex flex-col justify-between p-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggle(track); }}
                      className="p-1 rounded bg-black/30 self-end text-pink-400 hover:text-white transition-colors"
                      title="Unlike"
                    >
                      <Heart size={10} fill="currentColor" />
                    </button>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-white truncate leading-none">{track.title}</p>
                        <p className="text-[7px] text-muted truncate mt-0.5">{track.artist}</p>
                      </div>
                      <div
                        style={{ background: track.accent || "#fff" }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-black shadow-md shrink-0"
                      >
                        <Play size={8} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Section 3: Listening Story (timeline) */}
          <div className="relative overflow-hidden rounded-2xl glass-premium gold-border p-6 h-[340px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-pink-300">Telemetry History</p>
                <TrendingUp className="text-pink-400 w-4 h-4" />
              </div>
              <h3 className="text-display text-lg font-black text-white tracking-wide mt-1">Listening Story</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">Your chronological listening coordinates this week.</p>
            </div>

            <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {[
                { title: "First Cosmic Alignment", desc: "Your coordinates synchronized with Dhurandhar for the first time.", date: "Today", mood: "Romantic flow" },
                { title: "Midnight Vibe Active", desc: "Tuesday energy peaked with Fortuner, driving a 75-minute productivity orbit.", date: "June 10", mood: "Desi energy" },
                { title: "Nostalgia Frequency Active", desc: "Nostalgia reached 92% during Kitaab's chill wave.", date: "June 08", mood: "Chill wave" }
              ].map((m, idx) => (
                <div key={idx} className="flex gap-4 items-start relative group">
                  {idx < 2 && (
                    <div className="absolute left-[8px] top-[16px] bottom-[-22px] w-0.5 bg-gradient-to-b from-pink-500/20 to-violet-500/5" />
                  )}
                  <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-[8px] text-pink-300 shrink-0 mt-0.5 z-10">
                    ⏱️
                  </div>
                  <div className="flex-1 min-w-0 bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                    <div className="flex justify-between items-center gap-1.5">
                      <p className="text-xs font-black text-white truncate">{m.title}</p>
                      <span className="text-[8px] text-muted shrink-0">{m.date}</span>
                    </div>
                    <p className="text-[10px] text-muted mt-1 leading-relaxed">{m.desc}</p>
                    <span className="inline-block text-[8px] font-extrabold text-pink-400 uppercase tracking-widest mt-1">
                      {m.mood}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: AI Recommendations (Dynamic Personalized Queue) */}
          <div className="relative overflow-hidden rounded-2xl glass-premium gold-border p-6 h-[340px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-cyan-300">Vibe Generator</p>
                <Sparkles className="text-cyan-400 w-4 h-4 animate-spin-slow" />
              </div>
              <h3 className="text-display text-lg font-black text-white tracking-wide mt-1">AI Recommendations</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">Personalized recommendations based on your listening streak.</p>
            </div>

            <div className="mt-4 space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {aiDjQueue.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePlaySearchResult(item)}
                  className="rounded-xl p-2.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/35 transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Play size={11} fill="currentColor" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center gap-1.5">
                      <p className="text-xs font-black text-white truncate">{item.title || item.name}</p>
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 shrink-0">
                        {Math.round((item.confidence_score || 0.85) * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted truncate">{item.artist}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQueueSong(item); }}
                    className="p-1.5 text-muted hover:text-cyan-400 transition-colors shrink-0"
                    title="Add to queue"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Creator of the Month Spotlight (Span full columns in wide view) */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="relative overflow-hidden rounded-2xl glass-premium gold-border p-6 min-h-[280px] flex flex-col justify-between text-white bg-gradient-to-tr from-violet-950/20 via-black/40 to-black/95">
              <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
                   style={{ backgroundImage: "url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040208] via-transparent to-transparent z-0" />

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-pink-300">Spotlight Creator</p>
                  <h3 className="text-display text-3xl md:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-violet-300 mt-1">
                    {analyticsData?.top_artists && analyticsData.top_artists.length > 0 ? analyticsData.top_artists[0].artist : "Revenge"}
                  </h3>
                  <p className="text-xs text-violet-300/80 font-bold uppercase tracking-[0.3em] mt-1">Creator Of The Month</p>
                </div>

                <button
                  onClick={() => handlePlaySong("Dhurandhar")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-white text-black hover:bg-white/80 hover:scale-105 transition-all shadow-md mt-2 md:mt-0"
                >
                  <Play size={12} fill="currentColor" />
                  PLAY SPOTLIGHT TRACK
                </button>
              </div>

              <div className="relative z-10 grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted">Acoustic Gravity Index</p>
                  <p className="text-2xl font-black text-white mt-1">92.4% Match</p>
                  <p className="text-[10px] text-muted mt-1">This creator's atmospheric beats align 92.4% with your late-night focus flow.</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted">Coordinate Play count</p>
                  <p className="text-2xl font-black text-white mt-1">12 plays this cycle</p>
                  <p className="text-[10px] text-muted mt-1">Revenge was your most-played artist, anchoring your late-night aesthetic sessions.</p>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-6 border-t border-white/5 pt-4">
                <p className="text-[10px] text-muted uppercase tracking-widest">SPOTLIGHT COORDINATES SYNCHRONIZED</p>
                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-pink-500/20 bg-pink-950/40 text-pink-300">
                  SPOTLIGHT ACTIVE
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Search results spotlight overlay (similar to Discover) */}
      <AnimatePresence>
        {(searchLoading || searchResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed left-4 right-4 md:left-auto md:right-12 top-24 z-50 md:w-[480px] p-6 rounded-3xl glass-premium gold-border border border-cyan-500/20 shadow-[0_32px_128px_rgba(0,0,0,0.95)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Search Results</h3>
              </div>
              <button
                onClick={() => { setSearchResults([]); setSearchQuery(""); }}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {searchLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-3" />
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Scanning Neural Grids...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((item, idx) => (
                  <div key={item.id || idx} className="flex gap-3 items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/25 hover:bg-white/[0.04] transition-all group">
                    <button
                      onClick={() => handlePlaySearchResult(item)}
                      className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:bg-cyan-500 group-hover:text-black transition-colors"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate leading-tight">{item.title}</p>
                      <p className="text-[9px] text-muted truncate mt-0.5">{item.artist}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => toggle(item)}
                        className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-pink-400 transition-colors"
                      >
                        <Heart size={12} fill={isFavourite(item.id) ? "#ec4899" : "none"} stroke={isFavourite(item.id) ? "#ec4899" : "currentColor"} />
                      </button>
                      <button
                        onClick={() => handleQueueSong(item)}
                        className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-cyan-400 transition-colors"
                        title="Add to queue"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
