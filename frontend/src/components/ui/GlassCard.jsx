import { motion } from "framer-motion";

export default function GlassCard({
  children,
  className = "",
  interactive = true,
  delay = 0,
  gradient = false,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        interactive
          ? { 
              y: -8, 
              scale: 1.025,
              rotateX: 1,
              rotateY: -1,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(168,85,247,0.45), 0 0 20px rgba(244,114,182,0.3)",
              borderColor: "rgba(192,132,252,0.65)"
            }
          : undefined
      }
      className={`glass-premium rounded-card p-6 transition-all duration-500 perspective-1000 ${gradient ? "gold-border" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
