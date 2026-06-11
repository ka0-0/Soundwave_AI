import { motion } from "framer-motion";

export default function VinylOrb() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        className="relative h-[360px] w-[360px] rounded-full border border-violet/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet/40 via-cyan/15 to-pink/35 blur-md" />
        <div className="absolute inset-9 rounded-full border border-white/20" />
        <div className="absolute inset-[82px] rounded-full border border-cyan/40" />
        <div className="absolute inset-[130px] rounded-full bg-black/55 backdrop-blur-xl" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}

