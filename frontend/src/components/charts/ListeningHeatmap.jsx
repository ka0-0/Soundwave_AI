import { motion } from "framer-motion";

const hours = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellIntensity(d, h) {
  return 0.15 + (((d * 3 + h * 5) % 11) / 11) * 0.85;
}

export default function ListeningHeatmap() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">Listening heatmap</p>
      <p className="mt-1 text-sm text-secondary">When your sound comes alive</p>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <div className="flex flex-col justify-between py-1 text-[10px] text-muted">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[10px] text-muted">
            {hours.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
            {days.map((_, d) =>
              Array.from({ length: 24 }).map((__, h) => {
                const intensity = cellIntensity(d, h);
                return (
                  <motion.div
                    key={`${d}-${h}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (d * 24 + h) * 0.002 }}
                    className="heat-cell aspect-square w-full min-w-[10px]"
                    style={{
                      background: `rgba(139, 92, 246, ${intensity})`,
                      boxShadow: intensity > 0.7 ? `0 0 8px rgba(139, 92, 246, ${intensity * 0.5})` : "none"
                    }}
                    title={`${days[d]} ${h}:00`}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
