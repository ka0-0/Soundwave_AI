import { memo } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHART_COLORS, CHART_MARGINS } from "./chartTheme";

const weekData = [
  { d: "Mon", v: 38 },
  { d: "Tue", v: 52 },
  { d: "Wed", v: 47 },
  { d: "Thu", v: 61 },
  { d: "Fri", v: 74 },
  { d: "Sat", v: 68 },
  { d: "Sun", v: 55 }
];

const artistData = [
  { name: "Nova", plays: 72 },
  { name: "Neon", plays: 64 },
  { name: "Echo", plays: 58 }
];

const axisTick = { fill: CHART_COLORS.muted, fontSize: 10 };
const noAnim = { isAnimationActive: false };

function MiniChart({ children }) {
  return (
    <div className="h-[140px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export const AuthPreviewCharts = memo(function AuthPreviewCharts() {
  return (
    <div className="hidden w-full max-w-md flex-col gap-4 lg:flex">
      <div className="glass rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Preview</p>
        <h2 className="mt-1 font-display text-3xl">Your listening pulse</h2>
        <p className="mt-2 text-sm text-muted">Stable analytics preview while you sign in.</p>
        <div className="mt-5">
          <MiniChart>
            <AreaChart data={weekData} margin={CHART_MARGINS}>
              <defs>
                <linearGradient id="authAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 80]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={CHART_COLORS.cyan}
                strokeWidth={2}
                fill="url(#authAreaFill)"
                dot={false}
                {...noAnim}
              />
            </AreaChart>
          </MiniChart>
        </div>
      </div>
      <div className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">Top artists this week</p>
        <div className="mt-4">
          <MiniChart>
            <BarChart data={artistData} margin={CHART_MARGINS} barCategoryGap="28%">
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 80]} />
              <Bar dataKey="plays" fill={CHART_COLORS.violet} radius={[6, 6, 0, 0]} maxBarSize={36} {...noAnim} />
            </BarChart>
          </MiniChart>
        </div>
      </div>
    </div>
  );
});
