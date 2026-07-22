import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, AudioLines, BarChart2, Brain, ChevronDown, Sparkles, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CinematicHeroStory from "../components/landing/CinematicHeroStory";
import AudioReactiveHeading from "../components/landing/AudioReactiveHeading";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";

import MusicFooter from "../components/layout/MusicFooter";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { icon: Brain, title: "Neural Taste Graph", desc: "Models listening history, mood, tempo, and skips into recommendations that feel handpicked.", color: "#C084FC", titleColor: "text-purple-300" },
  { icon: AudioLines, title: "Realtime Audio DNA", desc: "Frequency, energy, and memory patterns become a living profile for every session.", color: "#38BDF8", titleColor: "text-cyan-300" },
  { icon: BarChart2, title: "Private Listening Intelligence", desc: "Your habits become a quiet map of memory, energy, and taste without turning discovery into homework.", color: "#F472B6", titleColor: "text-pink-300" },
  { icon: Zap, title: "Instant Queue AI", desc: "Builds a queue that holds momentum, avoids fatigue, and adapts between songs.", color: "#FBBF24", titleColor: "text-amber-300" },
  { icon: Sparkles, title: "Mood Signal Engine", desc: "Converts how you feel into a sonic direction your library can understand.", color: "#34D399", titleColor: "text-emerald-300" },
  { icon: Sparkles, title: "Discovery Memory", desc: "Surfaces forgotten favorites and new artists with context instead of random shuffle.", color: "#E879F9", titleColor: "text-fuchsia-300" },
];

const JOURNEY_STEPS = [
  { label: "Memory fields", text: "The song brushes against moments you forgot you loved.", badgeColor: "text-purple-400" },
  { label: "Mood constellations", text: "Its feeling is mapped against the shape of your current state.", badgeColor: "text-cyan-300" },
  { label: "Recommendation gateway", text: "SoundWave AI finds the listener it was meant to reach.", badgeColor: "text-pink-400" },
];

const STATS = [
  { value: "60fps", label: "Realtime visual engine", color: "text-purple-400" },
  { value: "8.9m", label: "Signal paths mapped", color: "text-cyan-300" },
  { value: "0.2s", label: "Queue adaptation", color: "text-pink-400" },
];

export default function Landing() {
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const eyebrowRef = useRef(null);
  const copyRef = useRef(null);
  const ctaRef = useRef(null);
  const cardsRef = useRef([]);

  const { scrollY, scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.5 });
  const scrollProgressRef = useRef(0);

  smoothProgress.on("change", (v) => {
    scrollProgressRef.current = v;
  });

  const heroY = useTransform(scrollY, [0, 600], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 500, 800], [1, 1, 0.2]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.98]);
  const hintOpacity = useTransform(scrollY, [0, 150], [1, 0]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(eyebrowRef.current, { autoAlpha: 0, y: 18, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.8 })
        .fromTo(copyRef.current, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.4")
        .fromTo(ctaRef.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.46")
        .fromTo(cardsRef.current, { autoAlpha: 0, y: 24, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, stagger: 0.08 }, "-=0.5");

      gsap.to(".hero-intelligence-stage", {
        scale: 1.05,
        y: -24,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      gsap.to(cardsRef.current, {
        y: -24,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
        },
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="relative overflow-x-hidden text-white">
      <div className="fixed inset-0 z-0 bg-[#05010F]" aria-hidden="true">
        <CinematicHeroStory />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,1,15,0.02),rgba(5,1,15,0.82))]" />
      </div>

      {/* Commented out Navbar for now
      <motion.nav
        className="fixed left-1/2 top-4 z-40 flex w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 items-center justify-between rounded-2xl px-4 py-3 md:px-5"
        style={{ background: navBg, backdropFilter: "blur(24px) saturate(170%)", border: "1px solid rgba(192,132,252,0.18)" }}
      >
        <Logo className="h-10" />
        <div className="hidden items-center gap-7 text-sm text-zinc-200 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Platform</a>
          <a href="#story" className="transition-colors hover:text-white">Signal</a>
          <Link to="/login" className="transition-colors hover:text-white">Sign in</Link>
        </div>
        <Link to="/signup" className="shrink-0">
          <Button variant="secondary" className="rounded-full px-4 py-2 text-xs text-white">Launch</Button>
        </Link>
      </motion.nav>
      */}

      <section ref={heroRef} className="relative z-10 flex min-h-[90vh] flex-col justify-center overflow-hidden px-5 py-12 md:px-8 md:py-16">
        <motion.div
          className="relative z-30 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.08fr_0.78fr]"
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        >
          <div className="max-w-xl text-left py-2">
            <div ref={eyebrowRef} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C084FC]/22 bg-white/[0.035] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C084FC] backdrop-blur-2xl">
              <Sparkles size={14} />
              Cinematic audio intelligence
            </div>

            <AudioReactiveHeading headlineRef={headlineRef} />

            <p ref={copyRef} className="mt-8 max-w-[540px] text-base leading-8 text-zinc-100 drop-shadow-[0_2px_8px_rgba(5,1,15,0.9)] md:text-lg">
              SoundWave AI follows the emotional signal inside a track, understands where it belongs, and connects it to the listener it was meant for.
            </p>

            <div ref={ctaRef} className="mt-[36px] flex flex-wrap items-center gap-3.5">
              <Link to="/signup">
                <Button className="rounded-full bg-[linear-gradient(135deg,#C084FC,#8B5CF6_50%,#6D28D9)] px-6 py-3.5 text-sm text-white shadow-[0_0_34px_rgba(139,92,246,0.36)]">
                  Begin the journey <ArrowRight size={17} />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" className="rounded-full px-6 py-3.5 text-sm text-white">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="hero-intelligence-stage pointer-events-none relative h-[420px] min-h-[360px] lg:h-[610px]" aria-hidden="true">
            {/* The CinematicHeroStory is in the background, this stage can stay empty or have subtle overlays */}
          </div>

          <div className="flex flex-col gap-4">
            {JOURNEY_STEPS.map((step, index) => (
              <motion.div
                key={step.label}
                ref={(el) => {
                  cardsRef.current[index] = el;
                }}
                className="hero-card rounded-2xl p-5"
                style={{
                  background: "rgba(15, 10, 30, 0.35)",
                  border: "1px solid rgba(192, 132, 252, 0.25)",
                  boxShadow: "0 16px 50px rgba(0, 0, 0, 0.35)",
                }}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-7 w-px rounded-full bg-gradient-to-b from-[#C084FC] to-transparent" />
                  <div className={`text-[10px] uppercase tracking-[0.2em] font-extrabold ${step.badgeColor || "text-purple-400"}`}>Chapter {index + 1}</div>
                </div>
                <div className="mt-4 font-display text-xl font-semibold tracking-normal text-white">{step.label}</div>
                <p className="mt-2 text-sm leading-6 text-zinc-200 drop-shadow-[0_2px_8px_rgba(5,1,15,0.9)]">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 text-[#C084FC]/75 md:bottom-8"
          style={{ opacity: hintOpacity }}
        >
          <ChevronDown size={20} className="animate-bounce text-pink-400" />
          <span className="text-[10px] uppercase tracking-[0.32em] text-cyan-300 font-extrabold">Follow the signal</span>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 max-w-2xl"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-pink-400">The signal layer</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-normal text-white md:text-6xl">
            Built like an <span className="text-purple-400">AI lab</span>.{" "}
            <span className="inline-block">
              {"Tuned like a studio.".split(" ").map((word, wordIdx, wordsArr) => {
                const prevCharsCount = wordsArr.slice(0, wordIdx).join(" ").length + (wordIdx > 0 ? 1 : 0);
                return (
                  <span key={wordIdx} className="inline-block whitespace-nowrap mr-[0.24em] last:mr-0">
                    {word.split("").map((char, charIdx) => {
                      const totalIdx = prevCharsCount + charIdx;
                      return (
                        <span
                          key={charIdx}
                          className="inline-block char-node audio-reactive-gradient-text"
                          style={{
                            "--char-idx": totalIdx,
                            willChange: "transform, opacity, filter",
                          }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                );
              })}
            </span>
          </h2>
          <p className="relative z-20 mt-4 text-sm leading-7 !text-white font-medium drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] md:text-base" style={{ color: "#ffffff" }}>
            Every surface is designed for fast scanning, <span className="text-cyan-300 font-extrabold">deep personalization</span>, and the feeling that the product is listening with you.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5 }}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(15, 10, 30, 0.35)",
                border: `1px solid ${feature.color}40`,
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${feature.color}1f`, color: feature.color }}>
                <feature.icon size={20} />
              </div>
              <div
                className="text-lg font-black tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                style={{ color: feature.color || "#c084fc" }}
              >
                {feature.title}
              </div>
              <p className="mt-2.5 text-sm leading-7 !text-zinc-100 font-medium drop-shadow-[0_2px_8px_rgba(5,1,15,0.9)]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl p-6"
              style={{
                background: "rgba(15, 10, 30, 0.35)",
                border: "1px solid rgba(192,132,252,0.25)",
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
            >
              <div className={`font-display text-4xl font-bold tracking-normal ${stat.color}`}>{stat.value}</div>
              <div className="mt-2 text-sm text-zinc-200 drop-shadow-[0_2px_8px_rgba(5,1,15,0.9)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="story" className="relative z-10 mx-auto max-w-6xl px-5 pb-28 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, rgba(192,132,252,0.16), rgba(109,40,217,0.12) 45%, rgba(79,140,255,0.08))",
            border: "1px solid rgba(192,132,252,0.24)",
            backdropFilter: "blur(28px) saturate(170%)",
            boxShadow: "0 32px 120px rgba(0,0,0,0.42)",
          }}
        >
          <div className="flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div>
              <div className="font-display text-4xl font-bold tracking-normal text-white md:text-6xl">
                Make every queue feel inevitable.
              </div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-200 drop-shadow-[0_2px_8px_rgba(5,1,15,0.9)]">
                Sign in to save your listening graph and unlock adaptive recommendations across moods, genres, and memories.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-4">
              <Link to="/login"><Button variant="secondary" className="rounded-full px-6 py-4 text-white">Sign in</Button></Link>
              <Link to="/signup"><Button className="rounded-full px-6 py-4 text-white">Create account</Button></Link>
            </div>
          </div>
        </motion.div>
      </section>

      <MusicFooter />
    </div>
  );
}
