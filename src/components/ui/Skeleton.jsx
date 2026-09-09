import { cn } from '@/core/utils/helpers.js';

export function Skeleton({ className, height = 16, width = '100%' }) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card kpi-card">
          <Skeleton height={12} width="40%" />
          <Skeleton height={28} width="60%" className="mt-3" />
        </div>
      ))}
    </div>
  );
}
