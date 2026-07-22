import { motion } from "framer-motion";
import logoSrc from "./logon.jpeg";

export default function Logo({ className = "h-9", animate = true }) {
  const logoVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: { 
      scale: 1.08,
      filter: "drop-shadow(0 0 22px rgba(168, 85, 247, 0.85)) brightness(1.1)",
      transition: { duration: 0.35, ease: "backOut" }
    }
  };

  return (
    <motion.div
      variants={animate ? logoVariants : {}}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`relative inline-flex items-center justify-center overflow-visible ${className}`}
    >
      {/* Subtle Purple Glow Layer */}
      {animate && (
        <motion.div 
          className="absolute inset-0 -z-10 bg-purple-600/25 blur-xl rounded-full pointer-events-none"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      <img
        src={logoSrc}
        alt="SoundWave AI Logo"
        className="h-full w-auto object-contain max-w-full rounded-xl pointer-events-none select-none drop-shadow-2xl"
      />
    </motion.div>
  );
}
