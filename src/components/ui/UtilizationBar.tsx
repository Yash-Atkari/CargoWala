import React from 'react';

interface UtilizationBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function UtilizationBar({ value, max = 100, label, showPercent = true, size = 'md' }: UtilizationBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct >= 90 ? 'bg-negative' :
    pct >= 75 ? 'bg-warning' :
    pct >= 50 ? 'bg-primary': 'bg-positive';

  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showPercent && (
            <span className={`text-xs font-tabular font-600 ${pct >= 90 ? 'text-negative' : pct >= 75 ? 'text-warning' : 'text-foreground'}`}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`utilization-bar ${heights[size]}`}>
        <div
          className={`utilization-fill ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}