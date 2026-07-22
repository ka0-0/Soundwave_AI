import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const LINES = [
  { text: "Every song is", isGradient: false },
  { text: "searching.", isGradient: true },
];

export default function AudioReactiveHeading({ headlineRef }) {
  const containerRef = useRef(null);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Single initial particle release when letter reveal finishes
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newParticles = Array.from({ length: 28 }).map((_, i) => ({
          id: i,
          x: Math.random() * (rect.width || 450),
          y: (rect.height || 140) * 0.5 + Math.random() * 30 - 15,
          size: Math.random() * 3.5 + 1.5,
          speedY: Math.random() * 45 + 25,
          speedX: (Math.random() - 0.5) * 35,
          opacity: Math.random() * 0.75 + 0.25,
          color: i % 2 === 0 ? "#C084FC" : "#38BDF8",
        }));
        setParticles(newParticles);
        setShowParticles(true);

        // Disappear permanently after 1.8 seconds
        setTimeout(() => setShowParticles(false), 1800);
      }
    }, 950);

    return () => clearTimeout(timer);
  }, []);

  let globalCharIndex = 0;

  return (
    <div ref={containerRef} className="relative select-none">
      {/* One-time Particle Accent */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0 overflow-visible z-20" aria-hidden="true">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{
                x: p.x,
                y: p.y,
                opacity: p.opacity,
                scale: 1,
              }}
              animate={{
                y: p.y - p.speedY,
                x: p.x + p.speedX,
                opacity: 0,
                scale: 0.1,
              }}
              transition={{
                duration: 1.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`,
              }}
            />
          ))}
        </div>
      )}



      <h1
        ref={headlineRef}
        className="audio-reactive-headline font-display text-[clamp(2.8rem,5.6vw,5.45rem)] font-semibold leading-[0.98] tracking-normal text-white"
      >
        {LINES.map((line, lineIdx) => {
          const words = line.text.split(" ");
          return (
            <div key={lineIdx} className="block overflow-hidden py-1">
              {words.map((word, wordIdx) => {
                const isWordGradient = line.isGradient;
                return (
                  <span key={wordIdx} className="inline-block whitespace-nowrap mr-[0.24em] last:mr-0">
                    {word.split("").map((char, charIdx) => {
                      const charIdxValue = globalCharIndex++;
                      return (
                        <motion.span
                          key={charIdx}
                          initial={{ opacity: 0, y: 22, rotate: 2 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          transition={{
                            duration: 0.65,
                            delay: 0.08 + charIdxValue * 0.035,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className={`inline-block char-node ${
                            isWordGradient
                              ? "audio-reactive-gradient-text"
                              : "text-white"
                          }`}
                          style={{
                            "--char-idx": charIdxValue,
                            willChange: "transform, opacity, filter",
                          }}
                        >
                          {char}
                        </motion.span>
                      );
                    })}
                  </span>
                );
              })}
            </div>
          );
        })}
      </h1>

      <style>{`
        /* Flowing Animated Gradient for "searching." */
        .audio-reactive-gradient-text {
          background: linear-gradient(110deg, #ffffff 0%, #C084FC 32%, #8B5CF6 64%, #38BDF8 84%, #ffffff 100%);
          background-size: 240% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          animation: flowingGradient 9s ease infinite;
        }

        @keyframes flowingGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Floating Idle Motion (1-2px subtle float) & Audio Wave Distortion */
        .char-node {
          animation: floatIdle 4.6s ease-in-out infinite, audioWave 5.2s ease-in-out infinite;
          animation-delay: calc(var(--char-idx) * 0.14s), calc(var(--char-idx) * 0.08s + 1.1s);
        }

        @keyframes floatIdle {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1.8px, 0); }
        }

        /* Audio Wave Distortion & Bass Glow Pulse (Every ~5s) */
        @keyframes audioWave {
          0%, 82%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1) skewX(0deg);
            filter: drop-shadow(0 0 0px transparent);
          }
          86% {
            transform: translate3d(0, -2.5px, 0) scale(0.97, 1.06) skewX(-1.5deg);
            filter: drop-shadow(0 0 14px rgba(192, 132, 252, 0.55)) brightness(1.15);
          }
          92% {
            transform: translate3d(0, 0.8px, 0) scale(1.02, 0.98) skewX(0.8deg);
            filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.3));
          }
          96% {
            transform: translate3d(0, 0, 0) scale(1, 1) skewX(0deg);
            filter: drop-shadow(0 0 0px transparent);
          }
        }

        /* Neural Scan Line Sweep (Every 12 seconds) */
        .neural-scan-beam {
          animation: scanSweep 12s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 2.2s;
        }

        @keyframes scanSweep {
          0%, 88%, 100% {
            transform: translate3d(-100%, 0, 0);
            opacity: 0;
          }
          90% {
            opacity: 0.85;
          }
          94% {
            transform: translate3d(550%, 0, 0);
            opacity: 0.85;
          }
          96% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
