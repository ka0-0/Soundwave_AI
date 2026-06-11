import { useEffect, useRef } from "react";

export default function AuthMeshBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;

    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      a: 0.2 + Math.random() * 0.5
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = (t) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 40;
      const bw = w / bars;
      for (let i = 0; i < bars; i += 1) {
        const amp = Math.sin(t * 0.002 + i * 0.25) * 0.5 + 0.5;
        const bh = 40 + amp * 120;
        const x = i * bw;
        const grad = ctx.createLinearGradient(x, h - bh, x, h);
        grad.addColorStop(0, "rgba(139, 92, 246, 0.35)");
        grad.addColorStop(1, "rgba(34, 211, 238, 0.05)");
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, h - bh - 80, Math.max(2, bw - 4), bh);
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.a})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="mesh-bg">
        <div className="mesh-orb mesh-orb-1" />
        <div className="mesh-orb mesh-orb-2" />
        <div className="mesh-orb mesh-orb-3" />
      </div>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden />
    </>
  );
}
