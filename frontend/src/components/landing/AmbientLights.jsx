import { motion } from "framer-motion";

export default function AmbientLights() {
  const blobs = [
    { c: "bg-violet/45", x: "-12%", y: "8%", s: 420, d: 18 },
    { c: "bg-cyan/40", x: "62%", y: "4%", s: 360, d: 22 },
    { c: "bg-pink/35", x: "24%", y: "56%", s: 440, d: 20 },
    { c: "bg-violet/30", x: "74%", y: "64%", s: 380, d: 24 }
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[90px] ${b.c}`}
          style={{ left: b.x, top: b.y, width: b.s, height: b.s }}
          animate={{ x: [0, 70, -35, 0], y: [0, -40, 45, 0], scale: [1, 1.15, 0.94, 1] }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

