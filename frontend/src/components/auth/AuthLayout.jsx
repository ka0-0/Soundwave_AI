import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Waves } from "lucide-react";
import AuthMeshBackground from "./AuthMeshBackground";
import Logo from "../ui/Logo";

export default function AuthLayout({ children, mode = "login" }) {
  const isLogin = mode === "login";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuthMeshBackground />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col justify-between p-10 lg:flex xl:p-14"
        >
          <div>
            <Link to="/" className="mb-6 block">
              <Logo className="h-12" />
            </Link>
            <motion.div
              className="mt-16 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-xs text-gold hologram-layer"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles size={14} className="text-cyan animate-pulse" />
              Neural AI Intelligence
            </motion.div>
            <h1 className="text-display mt-8 max-w-lg text-5xl font-bold leading-[1.08] xl:text-6xl text-gold">
              Understand the <span className="text-gradient">soundtrack</span> of your life.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-secondary">
              Premium analytics, mood-aware recommendations, and cinematic insights — built for listeners who want
              more than a playlist.
            </p>
          </div>

          <div className="glass-premium rounded-card p-6 gold-border hologram-layer">
            <div className="flex items-center gap-3 text-sm text-gold neon-gold font-medium">
              <Waves className="text-cyan animate-pulse" size={20} />
              <span>AI Intelligence Layer</span>
            </div>
            <div className="mt-4 flex gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-gold via-cyan to-gold"
                  animate={{ height: [8, 24 + (i % 5) * 6, 8], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8 + (i % 4) * 0.1, repeat: Infinity, delay: i * 0.04 }}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Auth card */}
        <section className="flex items-center justify-center p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="mb-6 lg:hidden">
              <Link to="/">
                <Logo className="h-10" />
              </Link>
            </div>
            <div className="glass-premium gold-border rounded-card p-8 md:p-10 hologram-layer">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold neon-gold">
                {isLogin ? "Welcome back" : "Join the universe"}
              </p>
              <h2 className="text-display mt-2 text-3xl font-bold text-gold">
                {isLogin ? "Sign in" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {isLogin ? "Continue to your listening universe." : "Start decoding your sonic identity."}
              </p>
              {children}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
