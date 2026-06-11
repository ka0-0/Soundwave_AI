export default function ChartShell({ title, subtitle, children, height = 240 }) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-4 shrink-0">
        <h3 className="text-display text-base font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="min-h-0 min-w-0 flex-1" style={{ height, minHeight: height }}>
        {children}
      </div>
    </div>
  );
}
