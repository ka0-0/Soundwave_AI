import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Radio, Disc3, Sparkles, Heart, Zap, Compass, ShieldCheck, Github, Twitter, Youtube, Send } from "lucide-react";
import Logo from "../ui/Logo";

export default function MusicFooter() {
  return (
    <footer className="relative z-20 mt-16 border-t border-purple-500/20 bg-gradient-to-b from-black/80 via-[#06030d] to-black pt-12 pb-8 text-white overflow-hidden">
      {/* Background Cosmic Pulse Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Equalizer Graphic Strip */}
      <div className="max-w-7xl mx-auto px-6 mb-8 flex items-center justify-between border-b border-white/5 pb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs font-black uppercase tracking-[0.25em] text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
            Acoustic <span className="text-pink-400">Intelligence</span> v2.4
          </span>
        </div>

        {/* Live Soundwave Frequency Bars */}
        <div className="flex items-center gap-1.5 h-6 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mr-2">Signal Active</span>
          {[40, 80, 50, 95, 30, 75, 100, 60, 45, 90, 70, 35].map((h, i) => (
            <motion.div
              key={i}
              className="w-1 bg-gradient-to-t from-purple-500 to-cyan-400 rounded-full"
              animate={{ height: ["20%", `${h}%`, "30%"] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.08,
              }}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
        {/* Column 1: SoundWave AI Brand Info */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-display text-xl font-black text-white tracking-wide">
            SoundWave <span className="text-purple-400 font-extrabold">AI</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            Experience real-time acoustic <span className="text-purple-300 font-bold">telemetry</span>, neural mood graphs, and hyper-personalized music discovery tuned to your <span className="text-pink-400 font-bold">cosmic energy</span>.
          </p>

          {/* Telemetry Stats Pills */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-xs">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2.5">
              <p className="text-[9px] font-extrabold text-muted uppercase tracking-widest">Acoustic Nodes</p>
              <p className="text-sm font-black text-purple-300 mt-0.5">14.8M Tracks</p>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2.5">
              <p className="text-[9px] font-extrabold text-muted uppercase tracking-widest">Match Score</p>
              <p className="text-sm font-black text-cyan-300 mt-0.5">99.4% Cosmic</p>
            </div>
          </div>
        </div>

        {/* Column 2: Navigation Shortcuts */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">Navigation</h4>
          <ul className="space-y-2 text-xs text-zinc-400 font-medium">
            <li>
              <Link to="/dashboard" className="hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-400" /> Dashboard Orbit
              </Link>
            </li>
            <li>
              <Link to="/discover" className="hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <Compass size={12} className="text-cyan-300" /> Taste Discover
              </Link>
            </li>
            <li>
              <Link to="/library" className="hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <Music size={12} className="text-pink-400" /> Sound Library
              </Link>
            </li>
            <li>
              <Link to="/player" className="hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <Disc3 size={12} className="text-amber-300" /> Cosmic Player
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Mood & Sonic Genres */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-pink-400">Sonic Energies</h4>
          <ul className="space-y-2 text-xs text-zinc-400 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Synthwave <span className="text-purple-400 font-bold">& Vapor</span></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Desi Beats <span className="text-cyan-300 font-bold">& Hip-Hop</span></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              <span>Acoustic <span className="text-pink-300 font-bold">Soul Flow</span></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Ambient <span className="text-amber-300 font-bold">Space Chill</span></span>
            </li>
          </ul>
        </div>

        {/* Column 4: Cosmic Newsletter Join */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Join Signal</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Subscribe for weekly <span className="text-purple-300 font-bold">acoustic drops</span> and personalized artist recommendations.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-1.5 mt-2">
            <input
              type="email"
              placeholder="Enter frequency email..."
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 flex-1 min-w-0"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-transform"
              title="Subscribe"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Copyright & Rights Strip */}
      <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-medium">
        <p>
          © 2026 <span className="text-purple-400 font-bold">SoundWave AI</span> — All rights reserved. Crafted with <span className="text-pink-400">♥</span> for acoustic lovers.
        </p>
        <div className="flex items-center gap-4">
          <span className="hover:text-purple-300 transition-colors cursor-pointer">Privacy Matrix</span>
          <span>•</span>
          <span className="hover:text-purple-300 transition-colors cursor-pointer">Audio Licensing</span>
          <span>•</span>
          <span className="hover:text-purple-300 transition-colors cursor-pointer">Neural API</span>
        </div>
      </div>
    </footer>
  );
}
