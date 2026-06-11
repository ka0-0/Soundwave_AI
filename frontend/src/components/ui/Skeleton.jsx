export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
}
