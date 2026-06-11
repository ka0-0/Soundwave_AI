import { useEffect, useRef } from "react";

export default function WaveformBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let rafId = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const draw = (time) => {
      const t = time * 0.0012;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Equalizer bars
      const bars = 56;
      const bw = w / bars;
      for (let i = 0; i < bars; i += 1) {
        const x = i * bw;
        const amp = (Math.sin(t * 3 + i * 0.33) + Math.sin(t * 1.7 + i * 0.15)) * 0.5;
        const height = Math.max(8, (h * 0.22) * (0.3 + Math.abs(amp)));
        const y = h - height - 20;
        const alpha = 0.18 + Math.abs(amp) * 0.38;
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fillRect(x + 1, y, Math.max(2, bw - 2), height);
      }

      // Multi-line waveform
      const drawWave = (offset, color, width, alpha) => {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        for (let x = 0; x <= w; x += 6) {
          const nx = x / w;
          const y =
            h * (0.6 + offset) +
            Math.sin(nx * 16 + t * 2.4 + offset * 6) * 30 +
            Math.cos(nx * 10 - t * 1.8) * 12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      drawWave(-0.08, "#7c3aed", 2.4, 0.75);
      drawWave(-0.02, "#00f2ff", 2, 0.7);
      drawWave(0.05, "#a855f7", 1.8, 0.45);

      rafId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-65" />;
}

