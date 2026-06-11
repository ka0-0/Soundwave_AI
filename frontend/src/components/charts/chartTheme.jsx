export const CHART_COLORS = {
  violet: "#8b5cf6",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  pink: "#ec4899",
  gold: "#a855f7",
  muted: "#94a3b8",
  grid: "rgba(255, 255, 255, 0.06)",
  tooltipBg: "rgba(12, 8, 28, 0.95)",
  tooltipBorder: "rgba(139, 92, 246, 0.35)"
};

export const CHART_MARGINS = { top: 12, right: 12, left: -4, bottom: 4 };

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out"
};

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-xs shadow-premium backdrop-blur-xl"
      style={{
        background: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder
      }}
    >
      {label && <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="font-medium" style={{ color: entry.color || CHART_COLORS.cyan }}>
          {entry.name}: <span className="text-primary">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}
