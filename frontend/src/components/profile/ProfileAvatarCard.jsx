import { motion, AnimatePresence } from "framer-motion";
import { User, Star, Heart, Zap, Sparkles, FileText, Image as ImageIcon } from "lucide-react";
import { useAnalyserStore } from "../../hooks/useMusicAnalyser";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useFavouritesStore } from "../../store/useFavouritesStore";
import { useToastStore } from "../../store/useToastStore";
import { getTrackByIndex } from "../player/playerTracks";
import ProfileMusicAura from "./ProfileMusicAura";
import GlassCard from "../ui/GlassCard";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ProfileAvatarCard({
  isEditing,
  imagePreview,
  handleImageChange,
  statsSummary = { searches: 0, favorites: 0, analyses: 0, reports: 0 }
}) {
  const user = useAuthStore((s) => s.user);
  const { push: pushToast } = useToastStore();
  const isFavourite = useFavouritesStore((s) => s.isFavourite);

  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const energy = useAnalyserStore((s) => s.energy);
  const bass = useAnalyserStore((s) => s.bass);
  const track = getTrackByIndex(currentIndex);
  const k = isPlaying ? 1 : 0.15;

  const accent = track.accent || "#8b5cf6";
  const accentAlt = track.accentAlt || "#06b6d4";

  return (
    <GlassCard interactive={false} gradient className="relative overflow-hidden" style={{ minHeight: 540 }}>
      {/* Deep reactive background glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        animate={{
          opacity: 0.55 + energy * 0.45 * k,
          filter: `blur(${52 + bass * 36 * k}px) saturate(${1.2 + energy * k})`
        }}
        transition={{ duration: 0.1 }}
        style={{
          background: `radial-gradient(circle at 50% 38%, ${rgbaHex(accent, 0.65)}, ${rgbaHex(accentAlt, 0.28)}, transparent 72%)`
        }}
      />

      {/* Aura canvas — full card */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <ProfileMusicAura accent={accent} accentAlt={accentAlt} />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-10 pb-8">
        {/* ── Orbital ring system ── */}
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
          {/* Outer spinning ring */}
          <motion.div
            className="absolute rounded-full border border-dashed"
            style={{
              width: 210, height: 210,
              borderColor: rgbaHex(accent, 0.35),
              boxShadow: `0 0 ${10 + energy * 20 * k}px ${rgbaHex(accent, 0.2)}`
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          {/* Mid orbit ring */}
          <motion.div
            className="absolute rounded-full border"
            style={{
              width: 188, height: 188,
              borderColor: rgbaHex(accentAlt, 0.4),
              boxShadow: `0 0 ${8 + bass * 18 * k}px ${rgbaHex(accentAlt, 0.25)}`
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{ width: 170, height: 170 }}
            animate={{
              boxShadow: [
                `0 0 ${12 + energy * 28 * k}px ${rgbaHex(accent, 0.5)}, inset 0 0 20px ${rgbaHex(accent, 0.1)}`,
                `0 0 ${28 + energy * 42 * k}px ${rgbaHex(accentAlt, 0.7)}, inset 0 0 30px ${rgbaHex(accentAlt, 0.15)}`,
                `0 0 ${12 + energy * 28 * k}px ${rgbaHex(accent, 0.5)}, inset 0 0 20px ${rgbaHex(accent, 0.1)}`,
              ]
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Orbiting dots */}
          {[0, 1, 2, 3].map((di) => (
            <motion.div
              key={di}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                background: di % 2 === 0 ? accent : accentAlt,
                boxShadow: `0 0 10px 3px ${di % 2 === 0 ? rgbaHex(accent, 0.8) : rgbaHex(accentAlt, 0.8)}`,
                top: '50%', left: '50%',
              }}
              animate={{
                x: Math.cos((di / 4) * Math.PI * 2) * 104 - 5,
                y: Math.sin((di / 4) * Math.PI * 2) * 104 - 5,
                rotate: 360,
              }}
              transition={{
                x: { duration: 10 + di * 1.5, repeat: Infinity, ease: 'linear', repeatType: 'loop',
                  from: Math.cos((di / 4) * Math.PI * 2) * 104 - 5 },
                y: { duration: 10 + di * 1.5, repeat: Infinity, ease: 'linear', repeatType: 'loop',
                  from: Math.sin((di / 4) * Math.PI * 2) * 104 - 5 },
                rotate: { duration: 10 + di * 1.5, repeat: Infinity, ease: 'linear' }
              }}
            />
          ))}

          {/* Avatar image */}
          <motion.div
            className="relative group cursor-pointer"
            style={{ width: 160, height: 160 }}
            animate={{ scale: 1 + energy * 0.04 * k }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="w-40 h-40 rounded-full overflow-hidden p-[3px] relative"
              style={{
                background: `conic-gradient(from 0deg, ${accent}, ${accentAlt}, ${accent})`,
                boxShadow: `0 0 ${24 + energy * 36 * k}px ${rgbaHex(accent, 0.55)}, 0 0 ${48 + bass * 40 * k}px ${rgbaHex(accentAlt, 0.28)}`
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black/60 backdrop-blur-xl">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle, ${rgbaHex(accent, 0.25)}, transparent)` }}>
                    <User size={56} className="text-white/50" />
                  </div>
                )}
              </div>
            </div>
            {isEditing ? (
              <label className="absolute inset-0 rounded-full bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <ImageIcon size={28} className="text-gold mb-1" />
                <span className="text-[9px] text-gold uppercase font-bold">Change</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            ) : (
              <motion.div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                onClick={() => pushToast({ type: 'info', message: 'Avatar Studio coming soon!' })}
              >
                <Sparkles size={28} className="text-gold" />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Name + badge */}
        <motion.div
          className="mt-5 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold tracking-wide" style={{ textShadow: `0 0 20px ${rgbaHex(accent, 0.6)}` }}>
            {user?.full_name || user?.username || 'Listener'}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <motion.span
              className="text-[9px] uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border font-semibold"
              style={{
                color: accent,
                borderColor: rgbaHex(accent, 0.45),
                background: rgbaHex(accent, 0.1),
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <Star size={8} className="inline mr-1" />
              Sonic Member
            </motion.span>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="mt-7 grid grid-cols-4 gap-0 w-full border-t border-white/8 pt-6 px-4">
          {[
            { val: statsSummary.favorites, label: 'Likes', icon: Heart, color: '#ff6b9d' },
            { val: statsSummary.searches, label: 'Searches', icon: Zap, color: accent },
            { val: statsSummary.analyses, label: 'Insights', icon: Sparkles, color: accentAlt },
            { val: statsSummary.reports, label: 'Reports', icon: FileText, color: '#a8b5ff' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                className="text-center px-1 group cursor-default"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                whileHover={{ scale: 1.08 }}
              >
                <motion.p
                  className="text-2xl font-bold"
                  style={{ color: s.color, textShadow: `0 0 18px ${s.color}88` }}
                  animate={{ textShadow: isPlaying
                    ? [`0 0 12px ${s.color}66`, `0 0 28px ${s.color}cc`, `0 0 12px ${s.color}66`]
                    : `0 0 0px transparent`
                  }}
                  transition={{ duration: 1.8, repeat: isPlaying ? Infinity : 0 }}
                >
                  {s.val}
                </motion.p>
                <Icon size={11} className="mx-auto mt-0.5 mb-0.5" style={{ color: s.color, opacity: 0.7 }} />
                <p className="text-[9px] uppercase text-muted tracking-wider">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
