import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { apiSearch, apiPost } from "../utils/api";
import { PLAYER_TRACKS } from "../components/player/playerTracks";
import GlassCard from "../components/ui/GlassCard";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import HummingSearch from "../components/discover/HummingSearch";
import { useToastStore } from "../store/useToastStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { usePlayerStore } from "../store/usePlayerStore";
import {
  Heart,
  Search,
  Sparkles,
  Disc,
  Play,
  Pause,
  Music,
  Mic,
  Compass,
  History,
  ChevronLeft,
  ChevronRight,
  Brain,
  Zap,
  Coffee,
  Flame,
  Eye,
  X
} from "lucide-react";

// Mood Configuration and Unsplash backgrounds
const MOOD_CONFIG = {
  Focus: {
    term: "study concentration ambient",
    desc: "Deep work focus channels. Clean cyberpunk neon workspace loops to align your cognitive flow.",
    bg: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    color: "from-purple-500/20 to-indigo-500/10",
    glowColor: "rgba(168, 85, 247, 0.4)",
    tag: "NEON FLOW",
    icon: "Brain"
  },
  Energy: {
    term: "workout hype electronic",
    desc: "High velocity kinetic energy. Electric city lights and charging tracks to accelerate motion.",
    bg: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=775&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-pink-500/20 to-red-500/10",
    glowColor: "rgba(244, 114, 182, 0.4)",
    tag: "ACCELERATOR",
    icon: "Zap"
  },
  Chill: {
    term: "lofi relaxing acoustic",
    desc: "Cozy rainy-night sanctuaries. Warm lo-fi record crackle and ambient acoustics for winding down.",
    bg: "https://images.unsplash.com/photo-1546555074-9b423ab59c54?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-emerald-500/20 to-teal-500/10",
    glowColor: "rgba(16, 185, 129, 0.4)",
    tag: "SLOW DOWN",
    icon: "Coffee"
  },
  Dream: {
    term: "ambient cinematic ethereal",
    desc: "Ethereal cosmic landscapes. Floating nebula clouds and drifting cinematic frequencies.",
    bg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
    color: "from-blue-500/20 to-cyan-500/10",
    glowColor: "rgba(59, 130, 246, 0.4)",
    tag: "NEBULA",
    icon: "Sparkles"
  },
  Move: {
    term: "dance pop rhythm",
    desc: "Kinetic strobe dynamics. High rhythm beats, synth grooves, and neon-drenched dance floors.",
    bg: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop",
    color: "from-amber-500/20 to-orange-500/10",
    glowColor: "rgba(245, 158, 11, 0.4)",
    tag: "STROBE BEATS",
    icon: "Disc"
  },
  Glow: {
    term: "synthwave electronic",
    desc: "Retro-futuristic highway grids. Driving basslines and synthetic glows from cybernetic horizons.",
    bg: "https://images.unsplash.com/photo-1476111021705-ac3b3304fe20?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    color: "from-cyan-500/20 to-indigo-500/10",
    glowColor: "rgba(6, 182, 212, 0.4)",
    tag: "SYNTH GRID",
    icon: "Compass"
  },
  Reflect: {
    term: "piano emotional indie",
    desc: "Starry reflective horizons. Calm lake waters, emotional piano signals, and indie shadows.",
    bg: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop",
    color: "from-slate-600/20 to-zinc-500/10",
    glowColor: "rgba(100, 116, 139, 0.4)",
    tag: "DEPTH",
    icon: "Eye"
  },
  Euphoria: {
    term: "party festival edm",
    desc: "Mainstage festival peak. Laser explosions, driving EDM sweeps, and collective euphoria.",
    bg: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
    color: "from-rose-500/20 to-pink-500/10",
    glowColor: "rgba(244, 63, 94, 0.4)",
    tag: "CELEBRATION",
    icon: "Flame"
  }
};

const MoodIcon = ({ name, className }) => {
  const icons = {
    Brain,
    Zap,
    Coffee,
    Sparkles,
    Disc,
    Compass,
    Eye,
    Flame
  };
  const IconComp = icons[name] || Music;
  return <IconComp className={className} />;
};

// Interactive Canvas-based floating particle background
function InteractiveParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.6,
      speedX: Math.random() * 0.25 - 0.125,
      speedY: Math.random() * 0.25 - 0.125,
      alpha: Math.random() * 0.45 + 0.15,
      fadeRate: Math.random() * 0.004 + 0.001,
      ascending: Math.random() > 0.5
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        if (p.ascending) {
          p.alpha += p.fadeRate;
          if (p.alpha >= 0.7) p.ascending = false;
        } else {
          p.alpha -= p.fadeRate;
          if (p.alpha <= 0.1) p.ascending = true;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`; // Purple accent
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-45 z-0" />;
}

// iTunes API Track Fetcher
const fetchiTunesTracks = async (term, limit = 15) => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&limit=${limit}&media=music&entity=song`
    );
    if (!response.ok) throw new Error("iTunes request failed");
    const data = await response.json();
    return (data.results || [])
      .filter((track) => track.previewUrl)
      .map((track) => ({
        id: `itunes-${track.trackId}`,
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName || "Single",
        cover_url: track.artworkUrl100 ? track.artworkUrl100.replace("100x100", "400x400") : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
        preview_url: track.previewUrl,
        src: track.previewUrl,
        duration: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 0,
        source: "itunes"
      }));
  } catch (err) {
    console.error("iTunes fetch failed for term:", term, err);
    return [];
  }
};

const areTracksEqual = (a, b) => {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.src && b.src && a.src === b.src) return true;
  if (a.preview_url && b.preview_url && a.preview_url === b.preview_url) return true;
  return false;
};

export default function Discover() {
  const { t } = useTranslation();
  const pushToast = useToastStore((s) => s.push);
  const { bootstrap, refresh } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // New visual Discover States
  const [moodTracks, setMoodTracks] = useState({});
  const [moodLoading, setMoodLoading] = useState(true);
  const [currentMoodHero, setCurrentMoodHero] = useState("Dream");
  
  // Track carousel reference hooks
  const carouselRefs = useRef({});

  // Sync with player store
  const currentPlayingTrack = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const favorites = bootstrap?.favorites || [];
  const recentSearches = bootstrap?.recent_searches || [];
  const isFavorite = (id) => favorites.some((f) => f.track_id === id);

  // Load mood-related iTunes tracks on component mount
  useEffect(() => {
    let active = true;
    const loadAllMoods = async () => {
      try {
        const resultsMap = {};
        const promises = Object.entries(MOOD_CONFIG).map(async ([mood, config]) => {
          const fetchedTracks = await fetchiTunesTracks(config.term);
          
          // Filter and map local tracks matching this mood
          const localMoodTracks = PLAYER_TRACKS.filter((t) => {
            const trackMoodLower = t.mood ? t.mood.toLowerCase() : "";
            const moodLower = mood.toLowerCase();
            return (
              trackMoodLower === moodLower ||
              (moodLower === "energy" && trackMoodLower.includes("energy")) ||
              (moodLower === "chill" && trackMoodLower.includes("chill"))
            );
          }).map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: "Local Single",
            cover_url: t.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
            preview_url: t.src,
            src: t.src,
            duration: 180,
            source: "audio"
          }));

          if (active) {
            resultsMap[mood] = [...localMoodTracks, ...fetchedTracks];
          }
        });
        await Promise.all(promises);
        if (active) {
          setMoodTracks(resultsMap);
          setMoodLoading(false);
        }
      } catch (e) {
        console.error("Failed loading moods", e);
        if (active) setMoodLoading(false);
      }
    };

    loadAllMoods();

    // Fetch trending on load
    apiSearch("/discover/trending")
      .then(setTrending)
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = useCallback(async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await apiSearch(searchQuery.trim());
      const tracks = data.tracks || [];
      setResults(tracks);
      
      // Persist search history
      apiPost(`/workspace/search?query=${encodeURIComponent(searchQuery.trim())}&results_count=${tracks.length}`)
        .then(() => refresh())
        .catch(() => {});
        
      return tracks;
    } catch (err) {
      console.error("Search error:", err);
      pushToast({ type: "error", message: "Search failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [query, pushToast, refresh]);

  const toggleFavorite = async (track) => {
    try {
      await apiPost("/workspace/favorites", {
        track_id: track.id,
        track_data: track
      });
      refresh();
    } catch {
      pushToast({ type: "error", message: "Failed to update favorites." });
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        
        // Handle "Play X" commands
        if (transcript.toLowerCase().startsWith("play ")) {
          const songToPlay = transcript.substring(5);
          handleSearch(songToPlay).then((tracks) => {
            if (tracks && tracks.length > 0) {
              const { setQueue, playTrack } = usePlayerStore.getState();
              setQueue(tracks);
              playTrack(0, { fromStart: true });
            }
          });
        } else {
          handleSearch(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        pushToast({ type: "error", message: `Voice search failed: ${event.error}` });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
    };
  }, [handleSearch, pushToast]);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      pushToast({ type: "error", message: "Voice search not supported in this browser." });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handlePlayPauseTrack = async (track, moodQueue, index) => {
    const { current, isPlaying: storeIsPlaying, playTrack, togglePlay, setQueue } = usePlayerStore.getState();
    const isSameTrack = areTracksEqual(current, track);
    
    if (isSameTrack) {
      togglePlay();
    } else {
      setQueue(moodQueue);
      // Find actual track index inside queue
      const trackIndex = moodQueue.findIndex((t) => t.id === track.id);
      if (trackIndex !== -1) {
        await playTrack(trackIndex, { fromStart: true });
      } else {
        setQueue([...moodQueue, track]);
        await playTrack(moodQueue.length, { fromStart: true });
      }
    }
  };

  const scrollCarousel = (mood, direction) => {
    const el = carouselRefs.current[mood];
    if (el) {
      const scrollAmount = 450;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Get active hero recommendations
  const heroConfig = MOOD_CONFIG[currentMoodHero];
  const heroTracks = moodTracks[currentMoodHero] || [];
  const heroFeaturedTrack = heroTracks[0];

  const handlePlayHeroMix = async () => {
    if (!heroTracks || heroTracks.length === 0) return;
    const { setQueue, playTrack } = usePlayerStore.getState();
    setQueue(heroTracks);
    await playTrack(0, { fromStart: true });
  };

  const isHeroTrackPlaying =
    areTracksEqual(currentPlayingTrack, heroFeaturedTrack) &&
    isPlaying;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative space-y-12 pb-16 min-h-screen text-white overflow-hidden bg-[#05010f]"
    >
      {/* Immersive Background Canvas */}
      <InteractiveParticleField />

      {/* TOP HEADER */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-purple-500/10 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-purple-400">
            {t("discover.title")}
          </p>
          <h1 className="text-display mt-2 text-4xl font-extrabold md:text-5xl bg-gradient-to-r from-white via-purple-300 to-indigo-200 bg-clip-text text-transparent">
            {t("discover.subtitle")}
          </h1>
        </div>

        {/* State / Mood Selector for Hero */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1">Select state:</span>
          {Object.keys(MOOD_CONFIG).map((m) => (
            <button
              key={m}
              onClick={() => setCurrentMoodHero(m)}
              className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
                currentMoodHero === m
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/30"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* HERO SECTION ("Recommended For Your Current Mood") */}
      <div className="relative z-10">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/80 shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
          style={{ minHeight: "360px" }}
        >
          {/* Parallax Mood Cover Art Image Background */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <motion.img
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ opacity: 0.25, scale: 1 }}
              transition={{ duration: 1.2 }}
              key={currentMoodHero}
              src={heroConfig.bg}
              alt={currentMoodHero}
              className="w-full h-full object-cover filter blur-[2px]"
            />
            {/* Color Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${heroConfig.color} via-zinc-950/90 to-zinc-950`} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          </div>

          {/* Hero Content Grid */}
          <div className="relative z-10 h-full p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            
            {/* Large Visual Rotating Vinyl / Cover Artwork */}
            {heroFeaturedTrack ? (
              <div className="relative group shrink-0 w-48 h-48 md:w-56 md:h-56">
                <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl transition-all group-hover:blur-2xl" />
                <motion.div
                  className="w-full h-full overflow-hidden rounded-2xl border border-white/20 shadow-2xl relative"
                  whileHover={{ scale: 1.03 }}
                >
                  <img
                    src={heroFeaturedTrack.cover_url}
                    alt={heroFeaturedTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handlePlayPauseTrack(heroFeaturedTrack, heroTracks, 0)}
                      className="p-4 rounded-full bg-purple-600/90 text-white hover:bg-purple-500 hover:scale-105 transition-all shadow-lg"
                    >
                      {isHeroTrackPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                    </button>
                  </div>
                </motion.div>
                {/* Glowing Mood Tag */}
                <span className="absolute -top-3 -left-3 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-purple-500 text-white uppercase shadow-lg border border-purple-400">
                  {heroConfig.tag}
                </span>
              </div>
            ) : (
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-white/5 animate-pulse flex items-center justify-center">
                <Music className="w-12 h-12 text-zinc-600" />
              </div>
            )}

            {/* Recommendation Details */}
            <div className="flex-1 text-center md:text-left space-y-4 max-w-2xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">
                  Recommended For Your Current Mood
                </span>
                <h2 className="text-3xl md:text-4xl font-black mt-1 text-white tracking-tight">
                  {currentMoodHero} Universe
                </h2>
                <p className="text-zinc-300 text-sm mt-3 leading-relaxed">
                  {heroConfig.desc} We've gathered 15 premium tracks matching these wavelengths for you.
                </p>
              </div>

              {heroFeaturedTrack && (
                <div className="py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5 inline-flex items-center gap-3 backdrop-blur-md">
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                    <img src={heroFeaturedTrack.cover_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Featured Track</p>
                    <p className="text-sm font-semibold truncate text-white max-w-[200px] md:max-w-[300px]">
                      {heroFeaturedTrack.title}
                    </p>
                    <p className="text-xs text-zinc-400 truncate max-w-[200px] md:max-w-[300px]">
                      {heroFeaturedTrack.artist}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <Button
                  onClick={handlePlayHeroMix}
                  disabled={heroTracks.length === 0}
                  className="rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 shadow-[0_0_25px_rgba(147,51,234,0.4)] flex items-center gap-2"
                >
                  <Play size={16} fill="currentColor" />
                  Play {currentMoodHero} Mix
                </Button>
                
                {heroFeaturedTrack && (
                  <button
                    onClick={() => toggleFavorite(heroFeaturedTrack)}
                    className={`p-3 rounded-full border border-white/10 transition-colors ${
                      isFavorite(heroFeaturedTrack.id) ? "bg-pink-500/20 border-pink-500/40 text-pink-400" : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Heart size={18} fill={isFavorite(heroFeaturedTrack.id) ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI CONTROL PANEL (Search, Humming Search, Recents) */}
      <div className="grid gap-6 lg:grid-cols-3 relative z-10">
        
        {/* Left Control Panel: Search & Recents */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.06] backdrop-blur-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400 w-5 h-5" />
              <h3 className="font-bold text-lg text-white">Neural Transceiver Search</h3>
            </div>
            
            {/* Search Input Widget */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder={t("discover.search_placeholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-12 bg-black/40 border-purple-500/10 focus:border-purple-500/40"
                />
                <button
                  onClick={toggleVoiceSearch}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                    isListening ? "bg-purple-600 text-white animate-pulse" : "text-zinc-500 hover:text-white"
                  }`}
                  title={t("discover.voice_search")}
                >
                  <Mic size={18} />
                </button>
              </div>
              <Button
                onClick={() => handleSearch()}
                loading={loading}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {loading ? "Scanning..." : t("common.search")}
              </Button>
            </div>
          </div>

          {/* Recent Searches Tag Cloud */}
          {recentSearches.length > 0 && (
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <History size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">Recent Signals</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 8).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(s.query)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-purple-600/10 hover:border-purple-500/30 text-xs transition-all text-zinc-400 hover:text-purple-300"
                  >
                    {s.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Control Panel: Humming Search Widget */}
        <div className="relative">
          <HummingSearch onMatch={(match) => handleSearch(match.name + " " + match.artist)} />
        </div>
      </div>

      {/* SEARCH AND HUM RESULTS DIALOG/SPOTLIGHT */}
      <AnimatePresence>
        {(loading || results.length > 0 || (query && !loading && results.length === 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="relative z-20 p-6 md:p-8 rounded-3xl bg-zinc-950/90 border border-purple-500/20 backdrop-blur-2xl shadow-[0_32px_128px_rgba(0,0,0,1)]"
          >
            {/* Spotlight Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {loading ? "Searching Neural Grids..." : `Scan Results for "${query}"`}
                </h2>
              </div>
              
              <button
                onClick={() => {
                  setResults([]);
                  setQuery("");
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-purple-400 font-medium animate-pulse">Scanning the SoundWave universe...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {results.map((track, i) => {
                  const isTrackActive = areTracksEqual(currentPlayingTrack, track) && isPlaying;

                  return (
                    <GlassCard
                      key={track.id || i}
                      className="group overflow-hidden border-white/[0.06] hover:border-purple-500/30 bg-zinc-900/40"
                    >
                      <div className="flex gap-4">
                        <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-lg">
                          <img
                            src={track.cover_url || track.album_art || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop"}
                            alt={track.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => handlePlayPauseTrack(track, results, i)}
                              className="p-2 rounded-full bg-purple-600 text-white"
                            >
                              {isTrackActive ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-sm truncate text-white group-hover:text-purple-300 transition-colors">
                                {track.title}
                              </p>
                              <button
                                onClick={() => toggleFavorite(track)}
                                className={`p-1 rounded-full transition-colors ${
                                  isFavorite(track.id) ? "text-pink-400" : "text-zinc-500 hover:text-pink-400"
                                }`}
                              >
                                <Heart size={14} fill={isFavorite(track.id) ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.album}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] text-purple-400 font-bold uppercase tracking-wider">
                              {track.source || "iTunes"}
                            </span>
                            {track.duration > 0 && (
                              <span className="text-[10px] text-zinc-500">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                          onClick={() => handlePlayPauseTrack(track, results, i)}
                        >
                          {isTrackActive ? "Pause Preview" : "Play Preview"}
                        </Button>
                        {(track.link || track.spotify_url) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 text-zinc-300 text-xs"
                            onClick={() => window.open(track.link || track.spotify_url, "_blank")}
                          >
                            Full Track
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-purple-400 font-bold text-lg mb-1">No tracks matching this signal.</p>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                  Try another keyword, hum a different note, or select a mood.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRENDING NOW SLIDE ROW */}
      {trending.length > 0 && !results.length && (
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="text-purple-400 w-5 h-5 animate-spin-slow" />
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Trending Now</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {trending.slice(0, 5).map((track, i) => {
              const isTrackActive = areTracksEqual(currentPlayingTrack, track) && isPlaying;

              return (
                <GlassCard
                  key={track.id || i}
                  className="group relative overflow-hidden border-white/[0.05] hover:border-purple-500/20 hover:bg-white/[0.03] transition-all p-3"
                  interactive
                  onClick={() => handleSearch(track.title + " " + track.artist)}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg mb-3">
                    <img
                      src={track.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop"}
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 rounded-full bg-purple-600 text-white shadow-lg">
                        <Play size={18} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-sm truncate text-white tracking-tight">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* DYNAMIC MOOD SECTIONS GRID */}
      <div className="relative z-10 space-y-16">
        {Object.entries(MOOD_CONFIG).map(([mood, config]) => {
          const tracks = moodTracks[mood] || [];

          return (
            <section
              key={mood}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-zinc-950/40 p-6 md:p-8 space-y-6 transition-all hover:bg-zinc-950/60 hover:border-purple-500/20"
            >
              {/* Background ambient glow behind each mood card */}
              <div
                className="absolute -right-24 -top-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-700"
                style={{ backgroundColor: config.glowColor }}
              />

              {/* Full Width Mood Banner & Parallax Backdrop Header */}
              <div className="relative overflow-hidden rounded-2xl border border-white/5 h-40 flex items-center p-6 md:p-8">
                {/* Background Image */}
                <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.8 }}
                    src={config.bg}
                    alt={mood}
                    className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.05]"
                  />
                  {/* Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                </div>

                {/* Banner Content */}
                <div className="relative z-10 max-w-2xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <MoodIcon name={config.icon} className="w-5 h-5 animate-pulse" />
                    <span className="text-xs font-black tracking-widest uppercase">{config.tag}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{mood}</h3>
                  <p className="text-xs md:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                    {config.desc}
                  </p>
                </div>
              </div>

              {/* Horizontal Scroll Carousel */}
              <div className="relative">
                {/* Scroll Nav Buttons (Left/Right Arrows visible on hover) */}
                <button
                  onClick={() => scrollCarousel(mood, "left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-950/80 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600/90 shadow-xl focus:outline-none"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scrollCarousel(mood, "right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-950/80 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600/90 shadow-xl focus:outline-none"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Scroll Area */}
                <div
                  ref={(el) => (carouselRefs.current[mood] = el)}
                  className="flex overflow-x-auto gap-4 scrollbar-none pb-2 select-none"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {moodLoading ? (
                    // Load Skeleton
                    Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-48 shrink-0 p-3 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3"
                      >
                        <div className="aspect-square w-full rounded-lg bg-white/5 skeleton" />
                        <div className="h-4 w-3/4 bg-white/5 rounded skeleton" />
                        <div className="h-3 w-1/2 bg-white/5 rounded skeleton" />
                      </div>
                    ))
                  ) : tracks.length > 0 ? (
                    tracks.map((track, i) => {
                      const isTrackActive = areTracksEqual(currentPlayingTrack, track) && isPlaying;

                      return (
                        <div
                          key={track.id}
                          className="w-48 shrink-0 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all group/card"
                          style={{ scrollSnapAlign: "start" }}
                        >
                          {/* Album Art Cover with play preview overlay */}
                          <div className="relative aspect-square w-full overflow-hidden rounded-lg mb-3">
                            <img
                              src={track.cover_url}
                              alt={track.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            />
                            
                            {/* Hover overlay with play/pause */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handlePlayPauseTrack(track, tracks, i)}
                                className="p-3 rounded-full bg-purple-600/90 text-white shadow-xl hover:scale-105 hover:bg-purple-500 transition-all"
                              >
                                {isTrackActive ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                              </button>
                            </div>

                            {/* Active track indicator overlay */}
                            {isTrackActive && (
                              <div className="absolute bottom-2 right-2 p-1.5 rounded-md bg-purple-600/80 backdrop-blur-sm">
                                <div className="flex gap-0.5 items-end h-3">
                                  <div className="w-0.5 bg-white animate-[bounce_0.8s_infinite]" />
                                  <div className="w-0.5 bg-white animate-[bounce_0.6s_infinite_0.1s]" />
                                  <div className="w-0.5 bg-white animate-[bounce_0.7s_infinite_0.2s]" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Text labels */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-1">
                              <p className="font-bold text-sm truncate text-white max-w-[80%] group-hover/card:text-purple-300 transition-colors">
                                {track.title}
                              </p>
                              
                              <button
                                onClick={() => toggleFavorite(track)}
                                className={`shrink-0 p-0.5 rounded-full transition-colors ${
                                  isFavorite(track.id) ? "text-pink-400" : "text-zinc-500 hover:text-pink-400"
                                }`}
                              >
                                <Heart size={12} fill={isFavorite(track.id) ? "currentColor" : "none"} />
                              </button>
                            </div>
                            
                            <p className="text-xs text-zinc-400 truncate leading-none">{track.artist}</p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.album}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full text-center py-10 text-zinc-500">
                      No mood tracks fetched.
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </motion.div>
  );
}
