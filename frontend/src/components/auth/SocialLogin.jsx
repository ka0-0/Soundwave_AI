import { motion } from "framer-motion";
import { FaApple, FaGoogle, FaSpotify } from "react-icons/fa";

const providers = [
  { id: "google", icon: FaGoogle, label: "Google" },
  { id: "apple", icon: FaApple, label: "Apple" },
  { id: "spotify", icon: FaSpotify, label: "Spotify" }
];

export default function SocialLogin({ onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {providers.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect?.(p.id)}
            className="glass-subtle flex flex-col items-center gap-2 rounded-xl py-3 text-xs text-muted transition-colors"
          >
            <Icon size={18} className="text-primary" />
            {p.label}
          </motion.button>
        );
      })}
    </div>
  );
}
