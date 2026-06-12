import { motion } from "framer-motion";
import logoSrc from "./logon.jpeg";

const placeholderLogo = "https://placehold.co/400x400/020204/c5a059?text=SoundWave+AI";

export default function Logo({ className = "h-8", animate = true }) {
<img src={logoSrc} alt="SoundWave AI" />;

  const logoVariants = {
    initial: { opacity: 0, scale: 0.9, filter: "brightness(0) saturate(100%)" },
    animate: { 
      opacity: 1, 
      scale: 1,
      filter: "brightness(1) saturate(100%)",
      transition: { duration: 1, ease: "easeOut" }
    },
    hover: { 
      scale: 1.08,
      filter: "drop-shadow(0 0 20px rgba(197, 160, 89, 0.8)) brightness(1.1)",
      transition: { duration: 0.4, ease: "backOut" }
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
      {/* Subtle Glow Layer */}
      {animate && (
        <motion.div 
          className="absolute inset-0 -z-10 bg-gold/10 blur-2xl rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      <img
        src={logoSrc}
        alt="SoundWave AI Logo"
        className="h-full w-auto object-contain max-w-full pointer-events-none select-none drop-shadow-2xl"
        onError={(e) => {
          e.target.src = placeholderLogo;
          e.target.onerror = null;
        }}
      />
    </motion.div>
  );
}
