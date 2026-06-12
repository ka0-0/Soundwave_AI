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
              scale: 1.02,
              rotateX: 2,
              rotateY: -2,
              boxShadow: "0 48px 96px rgba(0,0,0,0.5), 0 0 20px rgba(197,160,89,0.2)",
              borderColor: "rgba(197,160,89,0.4)"
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
