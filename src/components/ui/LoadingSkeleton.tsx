import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}

export function MetricCardSkeleton() {
  return (
    <div className="card-elevated p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-12 h-4 rounded" />
      </div>
      <div>
        <Skeleton className="w-20 h-7 rounded mb-1" />
        <Skeleton className="w-28 h-3 rounded" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i}`} className="px-4 py-3">
          <Skeleton className="h-4 rounded" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height: `${height}px` }} />;
}