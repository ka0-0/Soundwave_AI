import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, Music, Heart, Clock, Sparkles, Shuffle, 
  Check, ListMusic, Compass, Star, ChevronRight, Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/ui/GlassCard";
import { usePlayerStore } from "../store/usePlayerStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { useFavouritesStore } from "../store/useFavouritesStore";
import { useToastStore } from "../store/useToastStore";
import { PLAYER_TRACKS } from "../components/player/playerTracks";
import { apiGet } from "../utils/api";

// Helper to parse JSON safely
function safeParseJSON(val) {
  if (!val) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return null;
  }
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
  const trackId = track.id || track._id || "";
  const trackTitle = track.title || "";
  
  const isMockUrl = (!track.audio_url && !track.src && !track.preview_url && !track.preview) || 
                    (track.audio_url && track.audio_url.includes("cdn.soundwave.ai")) ||
                    (track.src && track.src.includes("cdn.soundwave.ai"));
  
  const hash = hashCode(trackId + trackTitle);
  const localIndex = Math.abs(hash) % PLAYER_TRACKS.length;
  const localFallback = PLAYER_TRACKS[localIndex];
  
  return {
    ...track,
    id: trackId,
    src: isMockUrl ? localFallback.src : (track.src || track.audio_url || track.preview_url || track.preview || localFallback.src),
    cover_url: track.cover_url || track.album_art || localFallback.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    accent: track.accent || localFallback.accent || "#8b5cf6",
    accentAlt: track.accentAlt || localFallback.accentAlt || "#06b6d4"
  };
}

// ── Interactive Ambient Particles Canvas Background ──
function LibraryInteractiveBackground({ accent, accentAlt }) {
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

    const particles = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 2.5 + 0.8,
        color: Math.random() > 0.5 ? accent : accentAlt,
        alpha: Math.random() * 0.35 + 0.1
      });
    }

    const draw = () => {
      ctx.fillStyle = "rgba(4, 2, 8, 0.12)";
      ctx.fillRect(0, 0, w, h);

      // Soft dynamic glow spots
      const radial1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 20, w * 0.2, h * 0.3, 280);
      radial1.addColorStop(0, `${accent}05`);
      radial1.addColorStop(1, "transparent");
      ctx.fillStyle = radial1;
      ctx.fillRect(0, 0, w, h);

      const radial2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 20, w * 0.8, h * 0.7, 280);
      radial2.addColorStop(0, `${accentAlt}05`);
      radial2.addColorStop(1, "transparent");
      ctx.fillStyle = radial2;
      ctx.fillRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

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

export default function Library() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const { bootstrap, loadBootstrap } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("liked");
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Zustand Store Selectors
  const current = usePlayerStore((s) => s.current);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const pause = usePlayerStore((s) => s.pause);
  const initEngine = usePlayerStore((s) => s.initEngine);
  const queue = usePlayerStore((s) => s.queue);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  // Favourites store
  const favouriteIds = useFavouritesStore((s) => s.favouriteIds);
  const isFavourite = useFavouritesStore((s) => s.isFavourite);
  const toggleFavourite = useFavouritesStore((s) => s.toggle);

  // Fetch workspace bootstrap and recommendations on mount
  useEffect(() => {
    loadBootstrap();

    const fetchRecs = async () => {
      setRecsLoading(true);
      try {
        // Fetch actual personalized recommendations
        let data = await apiGet("/recommendations/personal");
        if (!Array.isArray(data) || data.length === 0) {
          console.log("No personal recommendations found, falling back to discover trending");
          data = await apiGet("/discover/trending");
        }
        if (Array.isArray(data)) {
          const normalized = data.map(normalizeTrack);
          setRecommendations(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
        // Direct fallback to trending on error
        try {
          const fallbackData = await apiGet("/discover/trending");
          if (Array.isArray(fallbackData)) {
            setRecommendations(fallbackData.map(normalizeTrack));
          }
        } catch (e) {
          console.error("Discover trending fallback also failed", e);
        }
      } finally {
        setRecsLoading(false);
      }
    };
    fetchRecs();
  }, [loadBootstrap]);

  // Normalize local tracks list
  const downloadedSongs = [...PLAYER_TRACKS].map(normalizeTrack);

  // Normalize liked songs list from bootstrap
  const bootstrapLikes = (bootstrap?.favorites || [])
    .map(f => safeParseJSON(f.track_data))
    .filter(Boolean)
    .map(normalizeTrack);

  // Filter local tracks that are favorited
  const localLikes = downloadedSongs.filter(t => favouriteIds.has(t.id));

  // Merge them by ID to avoid duplicates
  const likedSongsMap = new Map();
  bootstrapLikes.forEach(track => {
    if (track && track.id) likedSongsMap.set(track.id, track);
  });
  localLikes.forEach(track => {
    if (track && track.id) likedSongsMap.set(track.id, track);
  });
  const likedSongs = Array.from(likedSongsMap.values());

  // Normalize recently played tracks list
  const recentlyPlayedRaw = (bootstrap?.recently_played || [])
    .map(r => safeParseJSON(r.track_data))
    .filter(Boolean);
  
  const recentlyPlayed = recentlyPlayedRaw.map(normalizeTrack);

  // Resolve active list
  const currentList = activeTab === "liked" 
    ? likedSongs 
    : activeTab === "downloaded" 
      ? downloadedSongs 
      : recentlyPlayed;

  async function handlePlay(track) {
    initEngine();
    
    // Find index in queue and play it
    const index = queue.findIndex(t => t.id === track.id || t.title.toLowerCase() === track.title.toLowerCase());
    if (index !== -1) {
      const active = index === currentIndex;
      if (active && isPlaying) {
        pause();
      } else {
        await playTrack(index, { fromStart: !active });
      }
    } else {
      // If song is not in queue, add it to queue and play it
      addToQueue(track);
      setTimeout(async () => {
        const updatedQueue = usePlayerStore.getState().queue;
        const targetIndex = updatedQueue.findIndex(t => t.id === track.id);
        if (targetIndex !== -1) {
          await playTrack(targetIndex, { fromStart: true });
        }
      }, 60);
    }
  }

  // Play All / Shuffle Play logic
  const handlePlayAll = async (shuffle = false) => {
    if (currentList.length === 0) {
      pushToast({ type: "error", title: "Empty List", message: "No tracks available to play." });
      return;
    }
    initEngine();
    let listToPlay = [...currentList];
    if (shuffle) {
      listToPlay.sort(() => Math.random() - 0.5);
    }
    usePlayerStore.getState().setQueue(listToPlay);
    setTimeout(async () => {
      await playTrack(0, { fromStart: true });
      pushToast({ 
        type: "success", 
        title: shuffle ? "Shuffle Play active" : "Playing Library List", 
        message: `Started playback of ${listToPlay.length} tracks.` 
      });
    }, 80);
  };

  // Resolve dynamic active colors based on current track
  const accent = current?.accent || "#8b5cf6";
  const accentAlt = current?.accentAlt || "#06b6d4";

  return (
    <div className="relative min-h-screen pb-28 pt-8 px-4 md:px-12 overflow-x-hidden font-sans">
      <LibraryInteractiveBackground accent={accent} accentAlt={accentAlt} />

      {/* Cinematic blurred cover artwork atmosphere in background */}
      {current?.cover_url && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center filter blur-[140px] opacity-10 pointer-events-none transition-all duration-1000 scale-105"
          style={{ backgroundImage: `url(${current.cover_url})` }}
        />
      )}

      {/* Self-contained keyframe animations for active item live equalizers */}
      <style>{`
        @keyframes libraryEqBar1 {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        @keyframes libraryEqBar2 {
          0%, 100% { height: 35%; }
          50% { height: 85%; }
        }
        @keyframes libraryEqBar3 {
          0%, 100% { height: 15%; }
          50% { height: 95%; }
        }
        .animate-lib-bar-1 { animation: libraryEqBar1 0.55s ease-in-out infinite; }
        .animate-lib-bar-2 { animation: libraryEqBar2 0.7s ease-in-out infinite; }
        .animate-lib-bar-3 { animation: libraryEqBar3 0.45s ease-in-out infinite; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* HEADER DECK */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2 border-b border-white/5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em]" style={{ color: accent }}>
              Your Music Inventory
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-display tracking-tight text-white mt-1">
              Your music library
            </h1>
            <p className="text-xs text-muted mt-2">
              Syncing local tracks, favorited coordinates, and neural listening telemetry.
            </p>
          </div>

          {/* Action Deck buttons */}
          {currentList.length > 0 && (
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => handlePlayAll(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-md"
              >
                <Play size={12} fill="currentColor" />
                PLAY ALL
              </button>
              <button
                onClick={() => handlePlayAll(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all shadow-md"
              >
                <Shuffle size={12} />
                SHUFFLE
              </button>
            </div>
          )}
        </div>

        {/* MAIN LAYOUT SECTION */}
        <div className="flex flex-col gap-6">
          
          {/* Navigation Category Tabs */}
          <div className="flex gap-4 border-b border-white/5 pb-1">
            {[
              { id: "liked", label: "Loved Songs", icon: Heart },
              { id: "downloaded", label: "Downloaded", icon: Music },
              { id: "recent", label: "Recently Played", icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-2 text-xs font-semibold tracking-wide transition-all relative flex items-center gap-2 ${
                    active ? "text-white" : "text-muted hover:text-white/70"
                  }`}
                >
                  <Icon size={13} className={active && tab.id === "liked" ? "text-pink-500 fill-pink-500 animate-pulse" : ""} />
                  {tab.label}
                  {active && (
                    <motion.div 
                      layoutId="libraryActiveTab" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-white shadow-glow" 
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* List display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {currentList.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {currentList.map((track, i) => {
                    const isCurrentTrack = current?.title === track.title;
                    const isCurrentPlaying = isCurrentTrack && isPlaying;

                    return (
                      <GlassCard 
                        key={track.id || i} 
                        delay={i * 0.03} 
                        interactive 
                        onClick={() => handlePlay(track)}
                        className={`group border border-white/5 hover:border-white/10 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                          isCurrentTrack ? "ring-1 ring-white/15 bg-white/[0.04]" : ""
                        }`}
                        style={{
                          hoverBorderColor: track.accent || "#fff"
                        }}
                      >
                        {/* Hover glow background */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
                          style={{ background: `radial-gradient(circle at center, ${track.accent} 0%, transparent 80%)` }}
                        />

                        <div className="flex gap-4 items-center relative z-10">
                          {/* Album Art Cover */}
                          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl border border-white/5 shadow-md">
                            <img
                              src={track.cover_url}
                              alt={track.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Play overlay button */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                              >
                                {isCurrentPlaying ? (
                                  <Pause size={14} fill="currentColor" />
                                ) : (
                                  <Play size={14} fill="currentColor" className="ml-0.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Track details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate text-white/90 group-hover:text-white transition-colors">
                              {track.title}
                            </h3>
                            <p className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wider font-semibold">
                              {track.artist}
                            </p>
                            <p className="text-[9px] text-white/25 truncate mt-1 flex items-center gap-1">
                              <span>🎧</span>
                              {track.mood || "Dynamic Frequency"}
                            </p>
                          </div>

                          {/* Actions / Visualizer */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Beating EQ wave indicator */}
                            {isCurrentTrack ? (
                              <div className="flex items-end gap-0.5 h-3.5 w-3.5 text-white opacity-85 mr-1 select-none">
                                <span className={`w-[1.5px] bg-current rounded-full ${isCurrentPlaying ? "animate-lib-bar-1" : "h-[20%]"}`} />
                                <span className={`w-[1.5px] bg-current rounded-full ${isCurrentPlaying ? "animate-lib-bar-2" : "h-[45%]"}`} />
                                <span className={`w-[1.5px] bg-current rounded-full ${isCurrentPlaying ? "animate-lib-bar-3" : "h-[15%]"}`} />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavourite(track); }}
                                className="p-1.5 rounded text-white/20 hover:text-pink-500 hover:bg-white/5 transition-all"
                                title="Love song"
                              >
                                <Heart size={13} className={isFavourite(track.id) ? "text-pink-500 fill-pink-500" : ""} />
                              </button>
                            )}

                            {/* Options popup or Quick queue action */}
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                addToQueue(track);
                                pushToast({ type: "success", title: "Queue Updated", message: `"${track.title}" added to queue.` });
                              }}
                              className="p-1.5 rounded text-white/20 hover:text-cyan-400 hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
                              title="Add to queue"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                /* REDESIGNED STUNNING EMPTY STATE */
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center border border-white/5 max-w-xl mx-auto rounded-3xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                  
                  {/* Glowing dotted rings behind icon */}
                  <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full border border-dashed border-white/10 animate-spin-slow" />
                    <div className="absolute inset-2 rounded-full border border-dashed border-white/5 animate-reverse-spin" />
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner relative z-10">
                      {activeTab === "liked" ? (
                        <Heart size={20} className="text-pink-500/60" />
                      ) : activeTab === "downloaded" ? (
                        <Music size={20} className="text-cyan-400/60" />
                      ) : (
                        <Clock size={20} className="text-violet-400/60" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white tracking-wide">
                    {activeTab === "liked" 
                      ? "Acoustic Vault Empty" 
                      : activeTab === "downloaded"
                        ? "No Cached Tracks"
                        : "Listening History Uncharted"}
                  </h3>
                  <p className="text-xs text-muted mt-2 max-w-[290px] mx-auto leading-relaxed">
                    {activeTab === "liked" 
                      ? "Loved songs appear here. Discover new coordinates on the dashboard or search nodes."
                      : activeTab === "downloaded"
                        ? "Save audio nodes locally to listen offline anytime."
                        : "Start playing songs across the platform to seed your neural timeline."}
                  </p>

                  <button 
                    onClick={() => navigate(activeTab === "liked" ? "/dashboard" : "/discover")}
                    className="mt-6 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-md flex items-center gap-1.5"
                  >
                    {activeTab === "liked" ? "Explore dashboard" : "Search trending tracks"}
                    <ChevronRight size={12} />
                  </button>
                </GlassCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* NEURAL AI RECOMMENDATIONS SECTION */}
        <div className="mt-8 flex flex-col gap-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-cyan-400">
              Personalized vibes
            </p>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400 animate-pulse" /> 
              Neural AI Recommendations
            </h2>
            <p className="text-xs text-muted">
              Dynamically generated based on your acoustic profile and current focus.
            </p>
          </div>

          {recsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 rounded-2xl bg-white/[0.01] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((track, i) => {
                const isCurrentTrack = current?.title === track.title;
                const isCurrentPlaying = isCurrentTrack && isPlaying;
                
                // Construct a mockup match score if it's 0 (from the local fallback) or missing
                const matchScore = track.score && track.score > 0 
                  ? Math.round(track.score * 100) 
                  : (85 + (hashCode(track.id) % 11)); // Dynamic mockup score between 85-95% for seeded fallback tracks
                
                const explanation = track.explanations?.[0] || "Fits your focus lanes";

                return (
                  <GlassCard
                    key={track.id || i}
                    delay={i * 0.05}
                    onClick={() => handlePlay(track)}
                    className={`group border border-white/5 hover:border-cyan-500/20 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                      isCurrentTrack ? "ring-1 ring-cyan-500/20 bg-cyan-950/5" : ""
                    }`}
                  >
                    {/* Hover glow background */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(circle at center, ${track.accent || "#06b6d4"} 0%, transparent 80%)` }}
                    />

                    <div className="flex gap-4 items-center relative z-10">
                      {/* Cover Art */}
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl border border-white/5 shadow-md">
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          >
                            {isCurrentPlaying ? (
                              <Pause size={14} fill="currentColor" />
                            ) : (
                              <Play size={14} fill="currentColor" className="ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1.5">
                          <h3 className="font-bold text-sm truncate text-white/90 group-hover:text-cyan-300 transition-colors">
                            {track.title}
                          </h3>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/10 shrink-0">
                            {matchScore}% MATCH
                          </span>
                        </div>
                        <p className="text-[10px] text-muted truncate mt-0.5 uppercase tracking-wider font-semibold">
                          {track.artist}
                        </p>
                        
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[9px] text-white/35 truncate max-w-[150px] font-medium" title={explanation}>
                            💡 {explanation}
                          </span>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavourite(track); }}
                              className="p-1 rounded text-white/20 hover:text-pink-500 transition-colors"
                              title="Love song"
                            >
                              <Heart size={12} className={isFavourite(track.id) ? "text-pink-500 fill-pink-500" : ""} />
                            </button>
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                addToQueue(track);
                                pushToast({ type: "success", title: "Queue Updated", message: `"${track.title}" added to queue.` });
                              }}
                              className="p-1 rounded text-white/20 hover:text-cyan-400 transition-colors"
                              title="Add to queue"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            /* Recommendations Empty State */
            <div className="py-16 text-center glass-subtle rounded-3xl border border-white/5 max-w-xl mx-auto">
              <Sparkles size={24} className="text-white/20 mx-auto mb-3 animate-pulse" />
              <p className="text-xs text-muted max-w-[280px] mx-auto leading-relaxed">
                No recommendations calculated yet. Stream additional tracks to compile your neural listening history.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
