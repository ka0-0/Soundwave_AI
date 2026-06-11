import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Settings2,
  Repeat, Repeat1, Shuffle, Sparkles, Heart
} from "lucide-react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useMusicAnalyser } from "../../hooks/useMusicAnalyser";
import { useFavouritesStore } from "../../store/useFavouritesStore";
import { apiGet } from "../../utils/api";
import { resumeAnalyserContext } from "../../store/musicAnalyser";
import { getAudioManager } from "../../store/audioEngine";

const SMOOTH = [0.25, 0.1, 0.25, 1];

function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ── Google Pixel–style seek bar ─────────────────────────────────────────────
// Left of playhead → straight solid line
// Right of playhead → animated sine-wave squiggle (frozen when paused)
function PixelSeekBar({ seekPercent, seekMax, displayTime, accent, accentAlt, isPlaying, onSeekStart, onSeekChange, onSeekCommit }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const currentAmpRef = useRef(0); // smoothly lerps between 0 (flat) and 5 (full wave)

  // Resolve hex color to rgb
  function hexRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const [r1, g1, b1] = hexRgb(accent);
    const [r2, g2, b2] = hexRgb(accentAlt);

    const maxAmp = 5;
    const freq = 0.036;

    // y position on the wave at a given x pixel — amp controlled externally
    const waveY = (x, t, h, amp) => h / 2 + Math.sin((x * freq + t) * Math.PI * 2) * amp;

    const draw = () => {
      const w = canvas.offsetWidth || canvas.width;
      const h = canvas.offsetHeight || canvas.height;
      canvas.width = w;
      canvas.height = h;

      // Smoothly lerp amplitude toward target: maxAmp when playing, 0 when paused
      const targetAmp = isPlaying ? maxAmp : 0;
      currentAmpRef.current += (targetAmp - currentAmpRef.current) * 0.08;
      const amp = currentAmpRef.current;

      const t = Date.now() * 0.0018;
      const prog = Math.max(0, Math.min(1, seekPercent / 100));
      const playX = prog * w;

      ctx.clearRect(0, 0, w, h);

      // ── Played: colored wave (same curve) ──
      if (playX > 1) {
        const grad = ctx.createLinearGradient(0, 0, playX, 0);
        grad.addColorStop(0, `rgba(${r1},${g1},${b1},1)`);
        grad.addColorStop(1, `rgba(${r2},${g2},${b2},1)`);
        ctx.beginPath();
        ctx.moveTo(0, waveY(0, t, h, amp));
        for (let x = 1; x <= playX; x++) {
          ctx.lineTo(x, waveY(x, t, h, amp));
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 9;
        ctx.shadowColor = `rgba(${r1},${g1},${b1},0.85)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── Unplayed: dim wave (same curve, continuous) ──
      if (playX < w) {
        ctx.beginPath();
        ctx.moveTo(playX, waveY(playX, t, h, amp));
        for (let x = playX + 1; x <= w; x++) {
          ctx.lineTo(x, waveY(x, t, h, amp));
        }
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      // ── Playhead dot — sits exactly on the wave ──
      const dotY = waveY(playX, t, h, amp);
      ctx.beginPath();
      ctx.arc(playX, dotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r1},${g1},${b1},0.22)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(playX, dotY, 5, 0, Math.PI * 2);
      ctx.shadowBlur = 14;
      ctx.shadowColor = `rgba(${r1},${g1},${b1},1)`;
      ctx.fillStyle = `rgba(${r1},${g1},${b1},1)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(playX, dotY, 2, 0, Math.PI * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seekPercent, accent, accentAlt, isPlaying]);

  // Keep canvas sized to its container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative flex-1" style={{ height: 28 }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
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
        className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
        style={{ height: "100%" }}
        aria-label="Seek"
      />
    </div>
  );
}

// ── Live waveform mini-visualizer ───────────────────────────────────────────
function WaveVisualizer({ accent, accentAlt }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const { energy, bass, mid, high } = useAnalyserStore.getState();
      const audio = getSharedAudio();
      const isPlaying = audio ? !audio.paused : false;
      const t = Date.now() * 0.001;
      const k = isPlaying ? 1 : 0.15;

      ctx.clearRect(0, 0, w, h);

      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const band = i / bars;
        const level = band < 0.33 ? bass : band < 0.66 ? mid : high;
        const idle = 0.1 + Math.sin(t * 3 + i * 0.7) * 0.07;
        const mix = isPlaying ? level * (0.5 + energy * 0.8) : idle;
        const barH = Math.max(3, mix * h * 0.9);
        const barW = w / bars - 1.5;
        const x = i * (w / bars);
        const y = (h - barH) / 2;

        const r1 = parseInt(accent.slice(1, 3), 16);
        const g1 = parseInt(accent.slice(3, 5), 16);
        const b1 = parseInt(accent.slice(5, 7), 16);
        const r2 = parseInt(accentAlt.slice(1, 3), 16);
        const g2 = parseInt(accentAlt.slice(3, 5), 16);
        const b2 = parseInt(accentAlt.slice(5, 7), 16);
        const color = `rgb(${Math.round(r1+(r2-r1)*band)},${Math.round(g1+(g2-g1)*band)},${Math.round(b1+(b2-b1)*band)})`;

        ctx.shadowBlur = mix > 0.4 ? 8 : 0;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3 + mix * 0.7;
        const radius = barW / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, radius);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [accent, accentAlt]);

  return <canvas ref={canvasRef} width={48} height={36} className="shrink-0 rounded-md" />;
}

// ── Main Player ─────────────────────────────────────────────────────────────
export default function AmbientSongPlayer() {
  const [showPanel, setShowPanel] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [aiDjLoading, setAiDjLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setPortalReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("Player Mounted");
    return () => {
      console.log("Player Unmounted");
    };
  }, []);

  useMusicAnalyser(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDraft, setSeekDraft] = useState(0);

  const {
    currentIndex, current, isPlaying, volume, currentTime, duration,
    initEngine, togglePlay, skip, playTrack, setVolume, seek,
    repeatMode, setRepeatMode, isShuffled, toggleShuffle,
    queue, sourceType, engineReady
  } = usePlayerStore();



  useEffect(() => {
    const manager = getAudioManager();
    const audio = manager ? manager.audio : { src: "" };
    console.log("Current Track Index:", currentIndex);
    console.log("Audio Source:", audio.src);
  }, [currentIndex]);

  const toggleFavourite = useFavouritesStore((s) => s.toggle);
  const isFavourite = useFavouritesStore((s) => s.isFavourite);

  const track = current || { title: "No Track", artist: "Unknown", accent: "#8b5cf6", accentAlt: "#06b6d4" };
  const displayTime = isSeeking ? seekDraft : currentTime;
  const seekMax = duration > 0 ? duration : Math.max(currentTime, 1);
  const seekPercent = seekMax > 0 ? (displayTime / seekMax) * 100 : 0;

  const handleSeekStart = () => { setIsSeeking(true); setSeekDraft(currentTime); };
  const handleSeekCommit = (v) => { seek(v); setIsSeeking(false); };

  const cycleRepeatMode = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  const handleAiDj = async () => {
    setAiDjLoading(true);
    try {
      const newQueue = await apiGet("/workspace/ai-dj");
      usePlayerStore.setState({ queue: newQueue, currentIndex: 0, isShuffled: false });
      playTrack(0, { fromStart: true });
    } catch (err) {
      console.error("AI DJ failed", err);
    } finally {
      setAiDjLoading(false);
    }
  };

  // Detect proximity to bottom of screen via mousemove — bypasses pointer-events:none on anchor
  useEffect(() => {
    const TRIGGER_PX = 90; // px from bottom that wakes the player
    const onMove = (e) => {
      const dist = window.innerHeight - e.clientY;
      if (dist <= TRIGGER_PX) {
        clearTimeout(hideTimer.current);
        setHovered(true);
      } else if (!showPanel) {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setHovered(false), 800);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [showPanel]);

  // Keep visible while queue panel is open
  useEffect(() => {
    if (showPanel) setHovered(true);
  }, [showPanel]);

  const onMouseEnter = useCallback(() => {
    clearTimeout(hideTimer.current);
    setHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!showPanel) {
      hideTimer.current = setTimeout(() => setHovered(false), 800);
    }
  }, [showPanel]);

  useEffect(() => {
    initEngine();
    const sync = () => usePlayerStore.getState().initEngine();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [initEngine]);

  if (!portalReady) return null;

  const accent = track.accent || "#8b5cf6";
  const accentAlt = track.accentAlt || "#06b6d4";

  const player = (
    <div
      className="player-viewport-anchor"
      role="region"
      aria-label="Music player"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {sourceType === "youtube" && isPlaying && (
        <div className="hidden">
          <iframe
            id="youtube-player"
            width="0" height="0"
            src={`https://www.youtube.com/embed/${track.id}?autoplay=1&enablejsapi=1`}
            allow="autoplay"
          />
        </div>
      )}

      <motion.div
        className="player-viewport-inner"
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: hovered ? 1 : 0,
          y: hovered ? 0 : 18,
          pointerEvents: hovered ? "auto" : "none",
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: hovered ? "auto" : "none" }}
      >
        <div className="player-bar relative w-full">
          {/* Queue panel */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25, ease: SMOOTH }}
                className="player-panel glass-premium gold-border absolute bottom-full left-1/2 mb-3 w-full min-w-[280px] max-w-[360px] -translate-x-1/2 rounded-2xl p-3 hologram-layer"
              >
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold neon-gold">Up Next</p>
                  <button
                    onClick={handleAiDj}
                    disabled={aiDjLoading}
                    className="flex items-center gap-1 text-[10px] font-bold text-gold hover:text-cyan transition-colors uppercase tracking-wider"
                  >
                    <Sparkles size={12} className={aiDjLoading ? "animate-spin" : "animate-pulse"} />
                    AI DJ
                  </button>
                </div>
                <ul className="space-y-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {queue.map((t, i) => (
                    <li key={t.id || i}>
                      <button
                        type="button"
                        onClick={() => { playTrack(i); setShowPanel(false); }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                          i === currentIndex
                            ? "bg-gold/20 text-gold gold-border shadow-glow"
                            : "text-muted hover:bg-gold/10 hover:text-gold"
                        }`}
                      >
                        <span className="font-medium truncate flex-1">{t.title || t.name}</span>
                        <span className="truncate text-[10px] opacity-50 uppercase tracking-tighter">{t.artist}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="player-shell player-shell-bar glass-premium gold-border flex w-full flex-col gap-2 px-3 py-2.5 sm:px-4 hologram-layer">
            {/* Top row — flex: [waveform + track info flex-1] [controls] [volume] [AI btn] */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Waveform + track info — fixed width so controls stay left */}
              <div className="flex items-center gap-2 min-w-0" style={{ width: 160 }}>
                <WaveVisualizer accent={accent} accentAlt={accentAlt} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gold neon-gold uppercase tracking-wider">{track.title}</p>
                  <p className="truncate text-[10px] text-muted uppercase tracking-[0.2em]">{track.artist}</p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => track.id && toggleFavourite(track)}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.15 }}
                  className="shrink-0 rounded-full p-1.5 transition-colors"
                  aria-label={isFavourite(track.id) ? "Remove from favourites" : "Add to favourites"}
                  title={isFavourite(track.id) ? "Remove from favourites" : "Add to favourites"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isFavourite(track.id) ? (
                      <motion.div
                        key="liked"
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Heart
                          size={16}
                          fill="currentColor"
                          className="text-pink-400"
                          style={{ filter: "drop-shadow(0 0 6px rgba(244,114,182,0.8))" }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="unliked"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Heart size={16} className="text-muted hover:text-pink-400 transition-colors" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Playback controls — immediately after track info */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleShuffle()}
                  className={`rounded-full p-1.5 transition-colors ${isShuffled ? "text-gold neon-gold" : "text-muted hover:bg-gold/10 hover:text-gold"}`}
                  aria-label="Shuffle"
                >
                  <Shuffle size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => skip(-1)}
                  className="rounded-full p-1.5 text-muted hover:bg-gold/10 hover:text-gold"
                  aria-label="Previous track"
                >
                  <SkipBack size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      resumeAnalyserContext();
                    } catch (err) {
                      console.warn(err);
                    }
                    togglePlay();
                  }}
                  className="player-play-btn flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black shadow-glow gold-border"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log("Next Button Clicked");
                    skip(1);
                  }}
                  className="rounded-full p-1.5 text-muted hover:bg-gold/10 hover:text-gold"
                  aria-label="Next track"
                >
                  <SkipForward size={17} />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeatMode}
                  className={`rounded-full p-1.5 transition-colors ${repeatMode === "off" ? "text-muted hover:bg-gold/10 hover:text-gold" : "text-gold neon-gold"}`}
                  aria-label="Repeat"
                >
                  {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </button>
              </div>

              {/* Volume — right of controls, desktop only */}
              <div className="hidden sm:flex items-center gap-1 shrink-0" style={{ width: 54 }}>
                <button
                  type="button"
                  onClick={() => setVolume(volume === 0 ? 0.55 : 0)}
                  className="shrink-0 text-muted hover:text-gold transition-colors"
                >
                  {volume === 0 ? <VolumeX size={11} /> : <Volume2 size={11} />}
                </button>
                <input
                  className="player-volume flex-1 accent-gold"
                  type="range" min={0} max={1} step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  style={{ height: 2 }}
                />
              </div>

              {/* Spacer pushes AI button to the right */}
              <div className="flex-1" />

              {/* AI Intelligence button */}
              <button
                type="button"
                onClick={() => setShowPanel((v) => !v)}
                className={`player-change-btn flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                  showPanel ? "bg-gold/20 text-gold gold-border shadow-glow" : "glass-premium text-muted hover:text-gold border border-gold/10"
                }`}
                aria-label="View queue"
                aria-expanded={showPanel}
              >
                <Settings2 size={15} />
                <span className="hidden md:inline uppercase tracking-widest">AI Intelligence</span>
              </button>
            </div>

            {/* Pixel seek bar row */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="w-9 shrink-0 text-[10px] tabular-nums text-muted sm:text-xs">
                {formatTime(displayTime)}
              </span>
              <PixelSeekBar
                seekPercent={seekPercent}
                seekMax={seekMax}
                displayTime={displayTime}
                accent={accent}
                accentAlt={accentAlt}
                isPlaying={isPlaying}
                onSeekStart={handleSeekStart}
                onSeekChange={setSeekDraft}
                onSeekCommit={handleSeekCommit}
              />
              <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted sm:text-xs">
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume — mobile */}
            <div className="flex items-center gap-2 px-0.5 sm:hidden">
              <button
                type="button"
                onClick={() => setVolume(volume === 0 ? 0.55 : 0)}
                className="shrink-0 text-muted hover:text-gold"
              >
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                className="player-volume flex-1 accent-gold"
                type="range" min={0} max={1} step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
              />
              <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(player, document.body);
}
