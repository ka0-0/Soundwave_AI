import { motion } from "framer-motion";
import { useMagnetic } from "../../hooks/useMagnetic";

const variants = {
  primary:
    "bg-gradient-to-r from-gold via-cyan to-gold text-black shadow-glow gold-border hover:scale-105",
  secondary: "glass-premium text-gold border-gold/30 hover:bg-gold/10 hover:border-gold/60",
  ghost: "text-muted hover:text-gold hover:bg-gold/5",
  outline: "border border-gold/20 text-gold hover:border-gold/50 hover:bg-gold/10"
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  magnetic = true,
  loading = false,
  ...props
}) {
  const mag = useMagnetic(8);

  const Comp = magnetic ? motion.button : "button";
  const magProps = magnetic
    ? {
        ref: mag.ref,
        style: mag.style,
        onMouseMove: mag.onMove,
        onMouseLeave: mag.onLeave
      }
    : {};

  const motionProps = magnetic ? { whileTap: { scale: 0.98 } } : {};

  return (
    <Comp
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...motionProps}
      {...magProps}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        children
      )}
    </Comp>
  );
}
