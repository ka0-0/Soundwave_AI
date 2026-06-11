import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export default function AnimatedCounter({ value, suffix = "", className = "" }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}
