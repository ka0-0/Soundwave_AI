import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, ShieldAlert } from "lucide-react";
import { useAnalyserStore } from "../../hooks/useMusicAnalyser";
import { usePlayerStore } from "../../store/usePlayerStore";
import { getTrackByIndex } from "./playerTracks";

// Helper functions for hex color mixing and conversions
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a, b, t) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const bl = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function rgbaHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Background Ambient Blobs ──────────────────────────────────────────────────
function AuroraBackground({ accent, accentAlt }) {
  const canvasRef = useRef(null);
  const blobsRef = useRef([]);

  useEffect(() => {
    if (blobsRef.current.length === 0) {
      blobsRef.current = Array.from({ length: 5 }).map((_, i) => ({
        x: 0.2 + Math.random() * 0.6,
        y: 0.15 + Math.random() * 0.5,
        r: 0.28 + Math.random() * 0.22,
        phase: i * 1.7,
        speed: 0.25 + i * 0.08
      }));
    }

    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const { energy, bass, mid, high } = useAnalyserStore.getState();
      const isPlaying = usePlayerStore.getState().isPlaying;
      const t = Date.now() * 0.001;
      const pulse = isPlaying ? 0.35 + energy * 0.65 : 0.15;
      const spread = isPlaying ? 1 + bass * 0.85 : 1;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#070412");
      bg.addColorStop(0.45, mixHex("#070412", accent, 0.08 + mid * 0.15));
      bg.addColorStop(1, "#02000c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      blobsRef.current.forEach((blob, i) => {
        const drift = Math.sin(t * blob.speed + blob.phase) * 0.08 * spread;
        const cx = (blob.x + drift) * w;
        const cy = (blob.y + Math.cos(t * blob.speed * 0.9 + blob.phase) * 0.06) * h;
        const radius = blob.r * Math.min(w, h) * (0.85 + pulse * 0.35) * spread;

        const color = i % 3 === 0 ? accent : i % 3 === 1 ? accentAlt : mixHex(accent, accentAlt, 0.5);
        const alpha = 0.12 + pulse * 0.15 + (i % 2 === 0 ? high * 0.1 : 0);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, rgbaHex(color, alpha));
        grad.addColorStop(0.55, rgbaHex(color, alpha * 0.35));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [accent, accentAlt]);

  return <canvas ref={canvasRef} width={800} height={500} className="absolute inset-0 h-full w-full opacity-60" />;
}

// ── Unified Combined Visualizer Canvas ────────────────────────────────────────
function CombinedVisualizerCanvas({ accent, accentAlt, density, speed, bassGain }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const initParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      const targetCount = Math.floor(180 * density);
      
      if (particlesRef.current.length > targetCount) {
        particlesRef.current = particlesRef.current.slice(0, targetCount);
      } else {
        const diff = targetCount - particlesRef.current.length;
        const newParticles = Array.from({ length: diff }).map(() => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          size: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.6 + 0.15,
          isBurst: false
        }));
        particlesRef.current.push(...newParticles);
      }
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const { energy, bass, mid, high } = useAnalyserStore.getState();
      const isPlaying = usePlayerStore.getState().isPlaying;

      ctx.clearRect(0, 0, w, h);

      // 1. Particle trail overlay (creates motion blur glow)
      ctx.fillStyle = "rgba(7, 4, 15, 0.22)";
      ctx.fillRect(0, 0, w, h);

      // 2. Draw 3D perspective grid lines
      ctx.strokeStyle = rgbaHex(accent, 0.06);
      ctx.lineWidth = 1;
      const horizon = h * 0.28;
      const gridCount = 20;
      
      for (let i = 0; i <= gridCount; i++) {
        const xOffset = (i / gridCount) * w;
        ctx.beginPath();
        ctx.moveTo(xOffset, h);
        ctx.lineTo(w / 2 + (xOffset - w / 2) * 0.15, horizon);
        ctx.stroke();
      }

      const horizGridCount = 8;
      for (let i = 0; i <= horizGridCount; i++) {
        const py = horizon + (h - horizon) * Math.pow(i / horizGridCount, 1.8);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }

      const t = Date.now() * 0.0015 * speed;

      // 3. Draw 5 overlapping neon waveforms (Oscilloscope)
      const waveCount = 5;
      for (let wIdx = 0; wIdx < waveCount; wIdx++) {
        const level = wIdx === 0 || wIdx === 1 ? bass : wIdx === 2 || wIdx === 3 ? mid : high;
        const gain = isPlaying ? (level * (0.85 + energy * 1.35) * bassGain) : (0.12 + Math.sin(t + wIdx * 0.5) * 0.04);
        const waveH = h * 0.22 * gain;
        const waveY = h * 0.48 + (wIdx - 2) * 35;

        ctx.beginPath();
        const segments = 80;
        for (let i = 0; i <= segments; i++) {
          const pct = i / segments;
          const x = pct * w;
          
          const sinFactor = Math.sin(pct * Math.PI * 4 - t * 2.2 + wIdx * 0.7);
          const feather = Math.sin(pct * Math.PI); // anchors ends
          const y = waveY + sinFactor * waveH * feather;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const color = mixHex(accent, accentAlt, wIdx / (waveCount - 1));
        ctx.strokeStyle = color;
        ctx.lineWidth = wIdx === 2 ? 4.0 : 2.0;
        ctx.globalAlpha = 0.35 + (wIdx === 2 ? 0.45 : 0.22);
        ctx.shadowColor = color;
        ctx.shadowBlur = wIdx === 2 ? 18 : 6;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // 4. Update and draw Particle Storm
      const mouse = mouseRef.current;
      particlesRef.current = particlesRef.current.filter((p) => {
        let fx = 0;
        let fy = 0;

        // Interactive mouse attraction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200) {
            const pullForce = (1 - dist / 200) * 0.26 * speed;
            fx += (dx / dist) * pullForce;
            fy += (dy / dist) * pullForce;
          }
        }

        // Noise flow field
        fx += Math.sin(p.y * 0.012 + t * 1.2 * speed) * 0.06;
        fy += Math.cos(p.x * 0.012 + t * 1.0 * speed) * 0.06;

        p.vx += fx;
        p.vy += fy;

        p.vx *= 0.95;
        p.vy *= 0.95;

        const speedFactor = isPlaying ? (1 + energy * 4.2 * bassGain) * speed : 0.8;
        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;

        const currentSize = p.size * (isPlaying ? (1 + bass * 3.5 * bassGain) : 1);
        const currentAlpha = p.alpha * (isPlaying ? (0.5 + energy * 0.5) : 0.5);

        if (!p.isBurst) {
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
        } else {
          p.life -= p.decay;
          if (p.life <= 0) return false;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);

        const mixRatio = p.x / w;
        ctx.fillStyle = p.isBurst 
          ? rgbaHex(accent, p.life) 
          : rgbaHex(mixHex(accent, accentAlt, mixRatio), currentAlpha);

        ctx.shadowColor = p.isBurst ? accent : mixHex(accent, accentAlt, mixRatio);
        ctx.shadowBlur = p.isBurst ? 15 : 5;
        ctx.fill();

        return true;
      });

      // Maintain particle density
      const targetCount = Math.floor(180 * density);
      const regularParticles = particlesRef.current.filter(p => !p.isBurst);
      if (regularParticles.length < targetCount) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          size: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.6 + 0.15,
          isBurst: false
        });
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accent, accentAlt, density, speed, bassGain]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: null, y: null };
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Interactive sparkle burst
    const burstCount = 28;
    const burstParticles = Array.from({ length: burstCount }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const forceSpeed = 2.5 + Math.random() * 6.5;
      return {
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * forceSpeed,
        vy: Math.sin(angle) * forceSpeed,
        size: Math.random() * 3.8 + 1.2,
        alpha: 1.0,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.018,
        isBurst: true
      };
    });

    particlesRef.current.push(...burstParticles);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleCanvasClick}
      className="absolute inset-0 h-full w-full cursor-crosshair"
    />
  );
}

// ── Main Visualizer Component ────────────────────────────────────────────────
export default function MusicReactiveVisualizer({ 
  particleDensity = 1.0, 
  speedMult = 1.0, 
  bassGain = 1.0 
}) {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const track = getTrackByIndex(currentIndex);

  const leftMeterRef = useRef(null);
  const rightMeterRef = useRef(null);
  const [hudFlicker, setHudFlicker] = useState(true);

  // Status flickering and telemetry ticks
  useEffect(() => {
    const statusTimer = setInterval(() => {
      setHudFlicker(prev => !prev);
    }, 1500);

    let raf;
    const tick = () => {
      const { bass, high } = useAnalyserStore.getState();
      const isPlaying = usePlayerStore.getState().isPlaying;
      
      const lVal = isPlaying ? bass : 0.12 + Math.sin(Date.now() * 0.003) * 0.06;
      const rVal = isPlaying ? high : 0.08 + Math.cos(Date.now() * 0.0024) * 0.05;

      if (leftMeterRef.current) {
        leftMeterRef.current.style.height = `${Math.max(5, lVal * 100)}%`;
      }
      if (rightMeterRef.current) {
        rightMeterRef.current.style.height = `${Math.max(5, rVal * 100)}%`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearInterval(statusTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div 
      className="visualizer-stage relative h-[420px] overflow-hidden rounded-2xl border border-white/[0.08] lg:h-[440px] shadow-2xl transition-all duration-300"
      style={{
        boxShadow: `0 0 25px -5px ${track.accent}25, inset 0 0 35px ${track.accent}10`
      }}
    >
      {/* Background ambient light */}
      <AuroraBackground accent={track.accent} accentAlt={track.accentAlt} />

      <motion.div
        className="pointer-events-none absolute inset-0"
        key={track.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          background: `radial-gradient(circle at 50% 45%, ${track.accent}20, transparent 55%)`
        }}
      />

      {/* Render Single Unified Particle & Wave Visualizer */}
      <div className="absolute inset-0 z-10">
        <CombinedVisualizerCanvas
          accent={track.accent}
          accentAlt={track.accentAlt}
          density={particleDensity}
          speed={speedMult}
          bassGain={bassGain}
        />
      </div>

      {/* Screen scanlines/glass overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] z-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/30 z-20" />

      {/* Cybernetic HUD Frame overlay */}
      <div className="pointer-events-none absolute inset-0 border border-white/5 rounded-2xl z-30">
        {/* Glowing corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 transition-colors duration-300" style={{ borderColor: track.accent }} />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 transition-colors duration-300" style={{ borderColor: track.accent }} />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 transition-colors duration-300" style={{ borderColor: track.accent }} />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 transition-colors duration-300" style={{ borderColor: track.accent }} />

        {/* Real-time vertical meters on left/right edges */}
        <div className="absolute left-2.5 top-[15%] bottom-[15%] w-1 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
          <div 
            ref={leftMeterRef} 
            className="w-full rounded-full transition-all duration-75" 
            style={{ 
              background: `linear-gradient(to top, ${track.accentAlt}, ${track.accent})`,
              boxShadow: `0 0 6px ${track.accent}`
            }} 
          />
        </div>
        <div className="absolute right-2.5 top-[15%] bottom-[15%] w-1 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
          <div 
            ref={rightMeterRef} 
            className="w-full rounded-full transition-all duration-75" 
            style={{ 
              background: `linear-gradient(to top, ${track.accentAlt}, ${track.accent})`,
              boxShadow: `0 0 6px ${track.accent}`
            }} 
          />
        </div>

        {/* Cyber Readouts Top */}
        <div className="absolute top-3 left-8 right-8 flex justify-between items-center text-[8px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-1.5">
            <Activity size={10} className="text-white/30 animate-pulse" />
            <span>NEURAL WAVEFORM: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu size={10} className="text-white/30" />
            <span>PARTICLES: FLOW FIELD</span>
          </div>
        </div>

        {/* Cyber Readouts Bottom */}
        <div className="absolute bottom-3 left-8 right-8 flex justify-between items-center text-[8px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-1">
            <span 
              className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${hudFlicker ? "bg-cyan-500 shadow-[0_0_6px_#06b6d4]" : "bg-cyan-500/40"}`} 
            />
            <span>SYSTEM SYNCED</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert size={10} className="text-white/30" />
            <span>SPECTRUM: {track.mood.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
