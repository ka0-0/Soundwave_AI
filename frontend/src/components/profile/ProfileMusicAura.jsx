import { useEffect, useRef } from "react";
import { useAnalyserStore } from "../../hooks/useMusicAnalyser";
import { usePlayerStore } from "../../store/usePlayerStore";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbaHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
function mixHex(a, b, t) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return `rgb(${Math.round(c1.r+(c2.r-c1.r)*t)},${Math.round(c1.g+(c2.g-c1.g)*t)},${Math.round(c1.b+(c2.b-c1.b)*t)})`;
}

const PARTICLES = Array.from({ length: 38 }, (_, i) => ({
  angle: (i / 38) * Math.PI * 2,
  radius: 0.18 + Math.random() * 0.28,
  speed: 0.18 + Math.random() * 0.35,
  size: 1.2 + Math.random() * 2.8,
  phase: Math.random() * Math.PI * 2,
  drift: (Math.random() - 0.5) * 0.4,
  life: Math.random(),
}));

const AURORA_BANDS = Array.from({ length: 6 }, (_, i) => ({
  y: 0.25 + i * 0.12,
  speed: 0.08 + i * 0.04,
  amp: 0.04 + i * 0.015,
  phase: i * 1.1,
  width: 0.12 + i * 0.018,
}));

export default function ProfileMusicAura({ accent, accentAlt }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const { energy, bass, mid, high } = useAnalyserStore.getState();
      const isPlaying = usePlayerStore.getState().isPlaying;
      const k = isPlaying ? 1 : 0.18;
      const t = Date.now() * 0.001;
      const pulse = 0.3 + energy * 0.7 * k;

      // ── Deep background
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0,   rgbaHex(accent, 0.32 + pulse * 0.28));
      bg.addColorStop(0.4, rgbaHex(accentAlt, 0.14 + mid * 0.22 * k));
      bg.addColorStop(0.8, "rgba(4,0,18,0.88)");
      bg.addColorStop(1,   "rgba(2,0,12,0.97)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── Aurora bands (horizontal shimmer waves)
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      AURORA_BANDS.forEach((band, bi) => {
        const color = bi % 2 === 0 ? accent : accentAlt;
        const yBase = h * band.y + Math.sin(t * band.speed + band.phase) * h * band.amp * (1 + energy * k);
        const bandH = h * band.width * (0.7 + energy * 0.6 * k);
        const auroraAlpha = (0.06 + mid * 0.12 * k) * (1 - bi * 0.1);
        const grad = ctx.createLinearGradient(0, yBase - bandH, 0, yBase + bandH);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.5, rgbaHex(color, auroraAlpha));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, yBase - bandH, w, bandH * 2);
      });
      ctx.restore();

      // ── Pulsing orb cores
      const orbCount = 5;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < orbCount; i++) {
        const phase = i * 1.26;
        const ox = w * (0.5 + Math.sin(t * 0.5 + phase) * 0.32 * k);
        const oy = h * (0.44 + Math.cos(t * 0.4 + phase) * 0.22 * k);
        const radius = (w * 0.22 + i * 14) * (0.8 + bass * 0.55 * k);
        const color = i % 2 === 0 ? accent : accentAlt;
        const alpha = (0.1 + pulse * 0.18) * (1 - i * 0.11);
        const orb = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        orb.addColorStop(0, rgbaHex(color, alpha * 2.2));
        orb.addColorStop(0.4, rgbaHex(color, alpha));
        orb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = orb;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      // ── Light rays emanating from center
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const cx = w * 0.5, cy = h * 0.42;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t * 0.15;
        const len = w * (0.35 + Math.sin(t * 0.8 + i) * 0.1) * (0.5 + energy * 0.5 * k);
        const rayColor = i % 2 === 0 ? accent : accentAlt;
        const rayAlpha = (0.04 + energy * 0.08 * k);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.strokeStyle = rgbaHex(rayColor, rayAlpha);
        ctx.lineWidth = 2 + bass * 4 * k;
        ctx.stroke();
      }
      ctx.restore();

      // ── Orbiting particles
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      PARTICLES.forEach((p, pi) => {
        p.life = (p.life + 0.003 + energy * 0.005 * k) % 1;
        const angle = p.angle + t * p.speed * (1 + energy * 0.5 * k) + p.drift * t * 0.1;
        const orbitR = w * p.radius * (0.85 + Math.sin(t * 0.4 + p.phase) * 0.15 * k);
        const px = cx + Math.cos(angle) * orbitR;
        const py = cy + Math.sin(angle) * orbitR * 0.42;
        const color = pi % 3 === 0 ? accent : pi % 3 === 1 ? accentAlt : "#ffffff";
        const a = (0.4 + Math.sin(t * 1.5 + p.phase) * 0.3) * (0.6 + energy * 0.4 * k);
        const size = p.size * (0.8 + energy * 0.5 * k);
        ctx.shadowBlur = 8 + size * 3;
        ctx.shadowColor = rgbaHex(color, 0.9);
        ctx.fillStyle = rgbaHex(color, a);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.restore();

      // ── Waveform equalizer bars at bottom
      const bars = 48;
      const barW = w / bars;
      ctx.save();
      for (let i = 0; i < bars; i++) {
        const band = i / bars;
        const level = band < 0.33 ? bass : band < 0.66 ? mid : high;
        const idle = 0.06 + Math.sin(t * 2.2 + i * 0.32) * 0.04;
        const mix = isPlaying ? level * (0.4 + energy * 1.0) : idle;
        const barH = mix * h * 0.32;
        const x = i * barW;
        const y = h - barH;

        // Gradient bar
        const barGrad = ctx.createLinearGradient(0, y, 0, h);
        barGrad.addColorStop(0, rgbaHex(mixHex(accent, accentAlt, band), 0.9));
        barGrad.addColorStop(1, rgbaHex(mixHex(accent, accentAlt, band), 0.15));
        ctx.fillStyle = barGrad;
        ctx.globalAlpha = 0.2 + mix * 0.65 * k;
        ctx.shadowBlur = mix > 0.3 ? 12 : 0;
        ctx.shadowColor = rgbaHex(band < 0.5 ? accent : accentAlt, 0.8);
        ctx.fillRect(x + 0.5, y, barW - 1.5, barH);

        // Top glow cap
        if (barH > 4) {
          ctx.fillStyle = rgbaHex(mixHex(accent, accentAlt, band), 0.95);
          ctx.globalAlpha = 0.6 + mix * 0.4;
          ctx.fillRect(x + 0.5, y, barW - 1.5, 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();

      // ── Elliptical orbit rings
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let ri = 0; ri < 3; ri++) {
        const ringR = w * (0.15 + ri * 0.1);
        const ringAlpha = (0.12 + energy * 0.15 * k) * (1 - ri * 0.25);
        ctx.strokeStyle = rgbaHex(ri % 2 === 0 ? accent : accentAlt, ringAlpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, ringR, ringR * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // ── Vignette
      const vig = ctx.createRadialGradient(w*0.5, h*0.5, w*0.2, w*0.5, h*0.5, w*0.65);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,8,0.68)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [accent, accentAlt]);

  return <canvas ref={canvasRef} width={800} height={380} className="absolute inset-0 h-full w-full" />;
}
