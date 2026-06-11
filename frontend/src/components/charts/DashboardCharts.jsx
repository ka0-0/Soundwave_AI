import { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import ChartShell from "./ChartShell";
import { CHART_ANIMATION, CHART_COLORS, CHART_MARGINS, ChartTooltip } from "./chartTheme";

const areaData = [
  { d: "Mon", v: 42 },
  { d: "Tue", v: 60 },
  { d: "Wed", v: 55 },
  { d: "Thu", v: 68 },
  { d: "Fri", v: 95 },
  { d: "Sat", v: 80 },
  { d: "Sun", v: 62 }
];

const genreData = [
  { genre: "Pop", score: 78 },
  { genre: "Indie", score: 64 },
  { genre: "R&B", score: 50 },
  { genre: "House", score: 71 },
  { genre: "Lofi", score: 57 }
];

const artistData = [
  { name: "Nova Bloom", plays: 84 },
  { name: "Neon Atlas", plays: 70 },
  { name: "Echo Harbor", plays: 62 },
  { name: "Pulse City", plays: 54 }
];

const moodData = [
  { name: "Chill", value: 34 },
  { name: "Focus", value: 42 },
  { name: "Energy", value: 24 }
];

const PIE_COLORS = [CHART_COLORS.violet, CHART_COLORS.cyan, CHART_COLORS.pink];

const axisTick = { fill: CHART_COLORS.muted, fontSize: 11 };

function ChartBox({ children }) {
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={220}>
      {children}
    </ResponsiveContainer>
  );
}

export const ListeningTrendChart = memo(function ListeningTrendChart() {
  return (
    <ChartShell title="Sonic pulse" subtitle="Minutes immersed each day">
      <ChartBox>
        <AreaChart data={areaData} margin={CHART_MARGINS}>
          <defs>
            <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.5} />
              <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pulseStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART_COLORS.violet} />
              <stop offset="100%" stopColor={CHART_COLORS.cyan} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.cyan, strokeOpacity: 0.2 }} />
          <Area
            type="monotone"
            dataKey="v"
            name="Minutes"
            stroke="url(#pulseStroke)"
            strokeWidth={2.5}
            fill="url(#pulseFill)"
            dot={false}
            activeDot={{ r: 5, fill: CHART_COLORS.cyan, strokeWidth: 0 }}
            {...CHART_ANIMATION}
          />
        </AreaChart>
      </ChartBox>
    </ChartShell>
  );
});

export const GenreRadarChart = memo(function GenreRadarChart() {
  return (
    <ChartShell title="Genre gravity" subtitle="Your taste constellation">
      <ChartBox>
        <RadarChart data={genreData} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
          <PolarGrid stroke={CHART_COLORS.grid} />
          <PolarAngleAxis dataKey="genre" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Radar
            dataKey="score"
            name="Affinity"
            stroke={CHART_COLORS.pink}
            fill={CHART_COLORS.violet}
            fillOpacity={0.35}
            strokeWidth={2}
            {...CHART_ANIMATION}
          />
        </RadarChart>
      </ChartBox>
    </ChartShell>
  );
});

export const TopArtistsChart = memo(function TopArtistsChart() {
  return (
    <ChartShell title="Artist orbit" subtitle="Most replayed this week">
      <ChartBox>
        <BarChart data={artistData} margin={CHART_MARGINS} barCategoryGap="20%">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cyan} />
              <stop offset="100%" stopColor={CHART_COLORS.violet} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={48} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.1)" }} />
          <Bar dataKey="plays" name="Plays" fill="url(#barGrad)" radius={[10, 10, 0, 0]} maxBarSize={48} {...CHART_ANIMATION} />
        </BarChart>
      </ChartBox>
    </ChartShell>
  );
});

export const MoodPieChart = memo(function MoodPieChart() {
  return (
    <ChartShell title="Mood spectrum" subtitle="Session emotional mix">
      <ChartBox>
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Legend verticalAlign="bottom" height={32} iconType="circle" formatter={(v) => <span className="text-xs text-muted">{v}</span>} />
          <Pie
            data={moodData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={4}
            stroke="none"
            {...CHART_ANIMATION}
          >
            {moodData.map((entry, i) => (
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartBox>
    </ChartShell>
  );
});
