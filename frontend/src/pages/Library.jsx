import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, Music, Heart, Clock, Sparkles, Shuffle, 
  Check, ListMusic, Compass, Star, ChevronRight, Plus,
  RefreshCw, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/ui/GlassCard";
import { usePlayerStore } from "../store/usePlayerStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { useFavouritesStore } from "../store/useFavouritesStore";
import { useToastStore } from "../store/useToastStore";
import { PLAYER_TRACKS } from "../components/player/playerTracks";
import { apiGet, apiPost } from "../utils/api";

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
  const [followedArtists, setFollowedArtists] = useState({});
  const carouselRefs = useRef({});
  const [dashboardData, setDashboardData] = useState({
    insights: null,
    recommendations: [],
    artists_you_may_like: [],
    trending_for_you: [],
    recommendation_groups: null,
    insufficient_history: false
  });
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(null);
  const hasFetched = useRef(false);

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

  const fetchRecs = async (silent = false) => {
    console.log(`[API LOG] fetchRecs: Request Start: GET /recommendations/dashboard | Silent: ${silent}`);
    if (!silent) {
      setRecsLoading(true);
    }
    setRecsError(null);
    try {
      const data = await apiGet("/recommendations/dashboard");
      console.log("[API LOG] fetchRecs: Request Complete: GET /recommendations/dashboard | HTTP status: 200");
      if (data) {
        // Verify recommendation data contains playable URLs
        if (data.recommendations) {
          console.log("[AUDIO DEBUG] Verifying recommendation data contains playable URLs:");
          data.recommendations.forEach((t, i) => {
            const url = t.src || t.audio_url || t.preview_url || t.preview;
            console.log(`  - Rec #${i} ID: ${t.id}, Title: "${t.title}", URL: ${url || "MISSING"}`);
          });
        }

        // Helper to check if track has a valid playback URL or can be resolved
        const isPlayableTrack = (t) => {
          if (!t) return false;
          const url = t.src || t.audio_url || t.preview_url || t.preview;
          const hasUrl = url && url !== "None" && url !== "null" && url !== "undefined";
          const hasMetadata = !!(t.title && t.artist);
          return hasUrl || hasMetadata;
        };

        // 1. Process main recommendations
        const rawRecs = data.recommendations || [];
        const playableRecs = rawRecs.filter(isPlayableTrack).map(normalizeTrack).filter(Boolean);
        const finalRecs = [...playableRecs];

        // 2. Process trending_for_you
        const rawTrending = data.trending_for_you || [];
        const playableTrending = rawTrending.filter(isPlayableTrack).map(normalizeTrack).filter(Boolean);
        const finalTrending = [...playableTrending];

        // 3. Process recommendation_groups
        const normalizedGroups = {};
        if (data.recommendation_groups) {
          Object.keys(data.recommendation_groups).forEach((key) => {
            const group = data.recommendation_groups[key];
            const rawGroupTracks = group.tracks || [];
            const playableGroupTracks = rawGroupTracks.filter(isPlayableTrack).map(normalizeTrack).filter(Boolean);
            const finalGroupTracks = [...playableGroupTracks];
            
            normalizedGroups[key] = {
              title: group.title,
              tracks: finalGroupTracks
            };
          });
        }

        setDashboardData({
          insights: data.insights,
          recommendations: finalRecs,
          artists_you_may_like: data.artists_you_may_like || [],
          trending_for_you: finalTrending,
          recommendation_groups: data.recommendation_groups ? normalizedGroups : null,
          insufficient_history: !!data.insufficient_history
        });
        hasFetched.current = true;
      }
    } catch (err) {
      console.error("[API LOG] fetchRecs: Request Failed: GET /recommendations/dashboard | Error:", err);
      if (!silent) {
        setRecsError(err.message || "Failed to load neural recommendations.");
      }
    } finally {
      if (!silent) {
        console.log("[API LOG] fetchRecs: Transition recsLoading -> false");
        setRecsLoading(false);
      }
    }
  };

  const scrollGroup = (key, direction) => {
    const el = carouselRefs.current[key];
    if (el) {
      const amount = 400;
      el.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth"
      });
    }
  };

  const toggleFollowArtist = (artistName) => {
    setFollowedArtists(prev => ({ ...prev, [artistName]: !prev[artistName] }));
  };

  // Fetch workspace bootstrap on mount
  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const recentlyPlayedIds = (bootstrap?.recently_played || []).map(r => r.song_id).join(",");
  const favoriteIdsString = (bootstrap?.favorites || []).map(f => f.track_id).join(",");
  const searchQueries = (bootstrap?.recent_searches || []).map(s => s.query).join(",");

  // Re-fetch recommendations when user history changes (e.g., new play, new favorite, or new search)
  useEffect(() => {
    if (bootstrap) {
      fetchRecs(hasFetched.current);
    }
  }, [recentlyPlayedIds, favoriteIdsString, searchQueries]);

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

  const handlePlay = useCallback(async (track) => {
    console.log("[PLAYER DECK LOG] Recommendation / Track Clicked:");
    console.log("  - Recommendation track ID:", track?.id);
    console.log("  - Preview URL:", track?.preview_url || track?.preview || "None");
    console.log("  - Playback URL (src):", track?.src || "None");
    console.log("  - Player payload:", track);

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
      const updatedQueue = usePlayerStore.getState().queue;
      const targetIndex = updatedQueue.findIndex(t => t.id === track.id);
      if (targetIndex !== -1) {
        await playTrack(targetIndex, { fromStart: true });
      }
    }
  }, [initEngine, queue, currentIndex, isPlaying, pause, playTrack, addToQueue]);

  const handleAddToPlaylist = useCallback(async (track) => {
    try {
      const playlists = await apiGet("/playlists");
      let targetPlaylist = playlists && playlists.find(p => p.name === "AI Discoveries");
      
      if (!targetPlaylist) {
        targetPlaylist = await apiPost("/playlists", {
          name: "AI Discoveries",
          description: "Curated by SoundWave AI recommendations."
        });
      }
      
      await apiPost(`/playlists/${targetPlaylist.id}/songs?song_id=${encodeURIComponent(track.id)}`);
      
      pushToast({
        type: "success",
        title: "Added to Playlist",
        message: `"${track.title}" added to "${targetPlaylist.name}".`
      });
    } catch (err) {
      console.error("Failed to add to playlist:", err);
      pushToast({
        type: "error",
        title: "Playlist Error",
        message: "Could not add track to playlist."
      });
    }
  }, [pushToast]);

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
    await playTrack(0, { fromStart: true });
    pushToast({ 
      type: "success", 
      title: shuffle ? "Shuffle Play active" : "Playing Library List", 
      message: `Started playback of ${listToPlay.length} tracks.` 
    });
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
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-36 rounded-2xl bg-white/[0.01] border border-white/5" />
                <div className="h-36 rounded-2xl bg-white/[0.01] border border-white/5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-2xl bg-white/[0.01] border border-white/5" />
                ))}
              </div>
            </div>
          ) : recsError ? (
            <GlassCard className="flex flex-col items-center justify-center py-20 text-center border border-red-500/20 max-w-xl mx-auto rounded-3xl relative overflow-hidden bg-red-950/[0.03]">
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/[0.02] to-transparent pointer-events-none" />
              
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-dashed border-red-500/20 animate-spin-slow" />
                <div className="w-12 h-12 rounded-full bg-red-500/[0.05] border border-red-500/20 flex items-center justify-center shadow-inner relative z-10">
                  <AlertCircle size={20} className="text-red-400" />
                </div>
              </div>

              <h3 className="text-base font-black text-white tracking-wide">
                Neural Connection Failed
              </h3>
              <p className="text-xs text-muted mt-2 max-w-[340px] mx-auto leading-relaxed px-4">
                {recsError}
              </p>

              <button 
                onClick={() => fetchRecs(false)}
                className="mt-6 px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-md flex items-center gap-2"
              >
                <RefreshCw size={12} className="text-black" />
                RETRY CONNECTION
              </button>
            </GlassCard>
          ) : dashboardData.insufficient_history ? (
            <GlassCard className="flex flex-col items-center justify-center py-20 text-center border border-white/5 max-w-xl mx-auto rounded-3xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/20 animate-spin-slow" />
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner relative z-10">
                  <Sparkles size={20} className="text-cyan-400/60" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white/90 max-w-[320px] leading-relaxed px-4">
                SoundWave AI is learning your taste. Listen to more music and personalized recommendations will appear here.
              </p>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-10">
              {/* Premium AI Command Center Metrics */}
              {dashboardData.insights && (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Top Artist */}
                    <GlassCard className="p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-cyan-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      <div>
                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Top Artist</p>
                        <div className="flex items-center gap-3 mt-3">
                          <img 
                            src={dashboardData.insights.top_artist.cover_url} 
                            alt={dashboardData.insights.top_artist.name} 
                            className="w-12 h-12 rounded-full object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{dashboardData.insights.top_artist.name}</h4>
                            <p className="text-[10px] text-muted truncate">Most Replayed Artist</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-2">
                        <span className="text-[10px] text-muted">Genre affinity</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/10 uppercase">
                          {dashboardData.insights.top_genre}
                        </span>
                      </div>
                    </GlassCard>

                    {/* Listening & Growth */}
                    <GlassCard className="p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-emerald-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      <div>
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Listening Telemetry</p>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-muted">Listening Hours</p>
                            <p className="text-xl font-black text-white mt-0.5">{dashboardData.insights.listening_hours}h</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted">Monthly Growth</p>
                            <p className="text-xl font-black text-emerald-400 mt-0.5">{dashboardData.insights.monthly_growth}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-white/5 pt-2 flex justify-between text-[10px] text-muted">
                        <span>Active Sessions: {dashboardData.insights.total_sessions}</span>
                        <span>Streak Active</span>
                      </div>
                    </GlassCard>

                    {/* Mood & Discovery */}
                    <GlassCard className="p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-pink-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      <div>
                        <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Taste Profile</p>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-muted">Favorite Mood</p>
                            <p className="text-xs font-black text-white mt-1.5 truncate uppercase tracking-wider">{dashboardData.insights.favorite_mood}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted">Discovery Score</p>
                            <p className="text-xl font-black text-pink-400 mt-0.5">{dashboardData.insights.discovery_score}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-white/5 pt-2 text-[10px] text-muted flex justify-between">
                        <span>Acoustic Waveform</span>
                        <span className="text-pink-400 font-bold">Uncharted Taste</span>
                      </div>
                    </GlassCard>

                    {/* Recommendation Confidence */}
                    <GlassCard className="p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:border-purple-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      <div>
                        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">AI Sync Rate</p>
                        <div className="flex items-center gap-4 mt-3">
                          {/* Circle Progress Meter */}
                          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent" />
                              <circle cx="24" cy="24" r="20" stroke="#a855f7" strokeWidth="3" fill="transparent"
                                      strokeDasharray={2 * Math.PI * 20}
                                      strokeDashoffset={2 * Math.PI * 20 * (1 - (dashboardData.insights.confidence_score || 85) / 100)}
                                      className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <span className="absolute text-[10px] font-black text-white">{dashboardData.insights.confidence_score}%</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted">Rec Confidence</p>
                            <p className="text-[10px] font-bold text-purple-300 mt-0.5">Optimal Connection</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-white/5 pt-2 text-[10px] text-muted flex justify-between">
                        <span>Matching Wavelengths</span>
                        <span className="text-purple-400 font-bold">LOCKED</span>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Animated Insights Row */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {dashboardData.insights.dynamic_insights?.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ y: -2 }}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 flex items-start gap-3 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/[0.01] to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <span className="text-base shrink-0 select-none">
                          {idx === 0 ? "📈" : idx === 1 ? "🎨" : "⚡"}
                        </span>
                        <p className="text-xs text-zinc-300 font-medium leading-relaxed mt-0.5">
                          {insight}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Featured AI Pick Hero Card */}
              {dashboardData.recommendations.length > 0 && (() => {
                const topTrack = dashboardData.recommendations[0];
                const isCurrentTrack = current?.title === topTrack.title;
                const isCurrentPlaying = isCurrentTrack && isPlaying;
                const topArtistName = dashboardData.insights?.top_artist?.name || "Harrdy Sandhu";
                const topGenreName = dashboardData.insights?.top_genre || "Pop";

                return (
                  <div className="relative mt-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-purple-400 mb-3 flex items-center gap-1.5">
                      <Sparkles size={11} className="animate-pulse" /> Strongest Match For You
                    </p>
                    <GlassCard className="p-6 border border-white/10 hover:border-purple-500/20 transition-all duration-500 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-gradient-to-tr from-purple-950/10 via-white/[0.01] to-transparent rounded-[2rem] shadow-2xl">
                      {/* Ambient Glow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                      
                      {/* Album Art Cover */}
                      <div className="relative w-44 h-44 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl group cursor-pointer" onClick={() => handlePlay(topTrack)}>
                        <img
                          src={topTrack.cover_url}
                          alt={topTrack.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            {isCurrentPlaying ? (
                              <Pause size={18} fill="currentColor" />
                            ) : (
                              <Play size={18} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                        <span className="absolute bottom-2.5 right-2.5 text-[9px] font-black px-2 py-0.5 rounded bg-purple-600 text-white shadow-md">
                          {topTrack.score || 98}% AI MATCH
                        </span>
                      </div>

                      {/* Track Details & Actions */}
                      <div className="flex-1 min-w-0 text-center md:text-left space-y-4">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">FEATURED AI PICK</span>
                          <h3 className="font-black text-2xl md:text-3xl truncate text-white leading-tight mt-1 hover:text-purple-300 transition-colors cursor-pointer" onClick={() => handlePlay(topTrack)}>
                            {topTrack.title}
                          </h3>
                          <p className="text-xs text-muted truncate mt-0.5 font-bold uppercase tracking-widest">
                            {topTrack.artist}
                          </p>
                          <p className="text-xs text-purple-300/95 font-medium mt-3 leading-relaxed">
                            Recommended because you frequently listen to <span className="font-extrabold text-white">{topArtistName}</span> and <span className="font-extrabold text-white">{topGenreName}</span>.
                          </p>
                        </div>

                        {/* Actions Deck */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                          <button
                            onClick={() => handlePlay(topTrack)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-md"
                          >
                            {isCurrentPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                            {isCurrentPlaying ? "PAUSE PREVIEW" : "PLAY PREVIEW"}
                          </button>
                          <button
                            onClick={() => toggleFavourite(topTrack)}
                            className={`p-2.5 rounded-full border transition-all ${
                              isFavourite(topTrack.id) 
                                ? "bg-pink-500/10 border-pink-500/25 text-pink-400 hover:bg-pink-500/20" 
                                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:scale-105"
                            }`}
                            title="Love song"
                          >
                            <Heart size={14} className={isFavourite(topTrack.id) ? "fill-pink-500" : ""} />
                          </button>
                          <button
                            onClick={() => {
                              addToQueue(topTrack);
                              pushToast({ type: "success", title: "Queue Updated", message: `"${topTrack.title}" added to queue.` });
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all"
                            title="Add to queue"
                          >
                            <Plus size={12} />
                            ADD TO QUEUE
                          </button>
                          <button
                            onClick={() => handleAddToPlaylist(topTrack)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all"
                            title="Add to playlist"
                          >
                            <ListMusic size={12} />
                            ADD TO PLAYLIST
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                );
              })()}

              {/* 3. Smart Recommendation Groups Carousels */}
              {dashboardData.recommendation_groups && (
                <div className="flex flex-col gap-10">
                  {Object.keys(dashboardData.recommendation_groups).map((groupKey) => {
                    const group = dashboardData.recommendation_groups[groupKey];
                    if (!group || !group.tracks || group.tracks.length === 0) return null;
                    
                    return (
                      <div key={groupKey} className="flex flex-col gap-4 relative group/slider">
                        <div className="flex justify-between items-center pr-2">
                          <h3 className="text-base font-bold text-white/90 tracking-wide">
                            {group.title}
                          </h3>
                          {/* Slide Controls */}
                          <div className="flex gap-1.5 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300">
                            <button 
                              onClick={() => scrollGroup(groupKey, "left")}
                              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white"
                            >
                              <ChevronRight size={14} className="rotate-180" />
                            </button>
                            <button 
                              onClick={() => scrollGroup(groupKey, "right")}
                              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div 
                          ref={(el) => (carouselRefs.current[groupKey] = el)}
                          className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth pr-4"
                        >
                          {group.tracks.map((track, i) => {
                            const isCurrentTrack = current?.title === track.title;
                            const isCurrentPlaying = isCurrentTrack && isPlaying;
                            const matchScore = track.score || 85;
                            const explanation = track.reason || "Matches your preferred vibes";

                            return (
                              <GlassCard
                                key={track.id || i}
                                delay={i * 0.02}
                                onClick={() => handlePlay(track)}
                                className={`group border border-white/5 hover:border-purple-500/30 cursor-pointer relative overflow-hidden transition-all duration-300 flex-shrink-0 w-72 ${
                                  isCurrentTrack ? "ring-1 ring-purple-500/30 bg-purple-950/5" : ""
                                }`}
                              >
                                <div 
                                  className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
                                  style={{ background: `radial-gradient(circle at center, ${track.accent || "#8b5cf6"} 0%, transparent 80%)` }}
                                />

                                <div className="flex gap-4 items-center relative z-10">
                                  <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl border border-white/5 shadow-md">
                                    <img
                                      src={track.cover_url}
                                      alt={track.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                      >
                                        {isCurrentPlaying ? (
                                          <Pause size={12} fill="currentColor" />
                                        ) : (
                                          <Play size={12} fill="currentColor" className="ml-0.5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0 flex flex-col justify-between h-16 py-0.5">
                                    <div className="flex justify-between items-start gap-1">
                                      <h4 className="font-bold text-xs truncate text-white/95 group-hover:text-purple-300 transition-colors leading-tight">
                                        {track.title}
                                      </h4>
                                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-500/10 shrink-0">
                                        {matchScore}% MATCH
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-muted truncate uppercase tracking-wider font-semibold">
                                      {track.artist}
                                    </p>
                                    
                                    <p className="text-[9px] text-white/40 truncate font-medium mt-1" title={explanation}>
                                      💡 {explanation}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-1.5 shrink-0 ml-1">
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
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleAddToPlaylist(track);
                                      }}
                                      className="p-1 rounded text-white/20 hover:text-purple-400 transition-colors"
                                      title="Add to playlist"
                                    >
                                      <ListMusic size={12} />
                                    </button>
                                  </div>
                                </div>
                              </GlassCard>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Artists You May Like */}
              {dashboardData.artists_you_may_like.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Artists You May Like</h3>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                    {dashboardData.artists_you_may_like.map((artist, idx) => {
                      const isFollowed = !!followedArtists[artist.name];
                      return (
                        <GlassCard 
                          key={idx}
                          className="p-5 border border-white/5 flex flex-col items-center gap-3 text-center relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300"
                        >
                          {/* Circle artist image */}
                          <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/10 shadow-md">
                            <img 
                              src={artist.cover_url} 
                              alt={artist.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Quick Play overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <button
                                onClick={async () => {
                                  if (artist.track_id) {
                                    const mockTrack = { id: artist.track_id, title: "Top Track", artist: artist.name, cover_url: artist.cover_url };
                                    handlePlay(mockTrack);
                                  } else {
                                    pushToast({ type: "info", title: "Artist Playlist", message: `Scanning tracks for ${artist.name}` });
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                              >
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                              </button>
                            </div>
                          </div>

                          <div className="min-w-0 w-full">
                            <p className="text-xs font-bold text-white/90 truncate">{artist.name}</p>
                            <span className="inline-block text-[8px] font-black text-purple-400 bg-purple-950/40 border border-purple-500/10 px-2.5 py-0.5 rounded-full uppercase mt-1">
                              {artist.taste_match || "87% Taste Match"}
                            </span>
                          </div>

                          {/* Follow Button */}
                          <button
                            onClick={() => {
                              toggleFollowArtist(artist.name);
                              pushToast({ 
                                type: "success", 
                                title: isFollowed ? "Unfollowed" : "Following Artist", 
                                message: isFollowed ? `You stopped following ${artist.name}` : `You are now following ${artist.name}!` 
                              });
                            }}
                            className={`w-full py-1.5 rounded-full font-bold text-[9px] uppercase tracking-wider transition-all ${
                              isFollowed 
                                ? "bg-white/10 hover:bg-white/15 text-white" 
                                : "bg-purple-600 hover:bg-purple-500 text-white hover:scale-[1.03]"
                            }`}
                          >
                            {isFollowed ? "Following" : "Follow"}
                          </button>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Trending For You Redesigned */}
              {dashboardData.trending_for_you.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-pink-500">HOT SELECTIONS</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider -mt-2">Trending For You</h3>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {dashboardData.trending_for_you.map((track, i) => {
                      const isCurrentTrack = current?.title === track.title;
                      const isCurrentPlaying = isCurrentTrack && isPlaying;

                      return (
                        <GlassCard
                          key={track.id || i}
                          delay={i * 0.03}
                          onClick={() => handlePlay(track)}
                          className={`group border border-white/5 hover:border-pink-500/30 cursor-pointer relative overflow-hidden transition-all duration-300 rounded-2xl ${
                            isCurrentTrack ? "ring-1 ring-pink-500/25 bg-pink-950/5" : ""
                          }`}
                        >
                          {/* Album Artwork Cover */}
                          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/5 shadow-md mb-3">
                            <img
                              src={track.cover_url}
                              alt={track.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            
                            {/* Trend Indicator Badge */}
                            <span className="absolute top-2.5 left-2.5 text-[8px] font-black px-2 py-0.5 rounded bg-pink-600/90 text-white flex items-center gap-1 shadow-md border border-pink-400/30">
                              ⚡ {track.trend_indicator || "Viral"}
                            </span>

                            {/* Play Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                              >
                                {isCurrentPlaying ? (
                                  <Pause size={14} fill="currentColor" />
                                ) : (
                                  <Play size={14} fill="currentColor" className="ml-0.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-3 justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs truncate text-white group-hover:text-pink-300 transition-colors leading-tight">
                                {track.title}
                              </h4>
                              <p className="text-[9px] text-muted truncate mt-0.5 uppercase tracking-wider font-semibold">
                                {track.artist}
                              </p>
                              
                              <p className="text-[9px] text-pink-400/80 font-medium truncate mt-2">
                                🔥 {track.trend_reason || "Trending among listeners with similar taste"}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 shrink-0 ml-1">
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
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleAddToPlaylist(track);
                                }}
                                className="p-1 rounded text-white/20 hover:text-purple-400 transition-colors"
                                title="Add to playlist"
                              >
                                <ListMusic size={12} />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
