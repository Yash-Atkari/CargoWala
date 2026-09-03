import React from 'react';

type BadgeVariant =
  | 'AVAILABLE'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'MAINTENANCE'
  | 'PLANNED'
  | 'PENDING'
  | 'STAGED'
  | 'READY'
  | 'LOADED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DAMAGED'
  | 'CANCELLED'
  | 'DELAYED'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'URGENT'
  | 'NORMAL'
  | 'FRAGILE'
  | 'ADMIN'
  | 'LOADER'
  | 'ACTIVE'
  | 'INACTIVE';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  AVAILABLE: 'truck-available',
  LOADING: 'truck-loading',
  IN_TRANSIT: 'truck-in-transit',
  MAINTENANCE: 'truck-maintenance',
  PLANNED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PENDING: 'bg-muted text-muted-foreground border border-border',
  STAGED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  READY: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  LOADED: 'bg-primary/10 text-primary border border-primary/20',
  DISPATCHED: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  COMPLETED: 'bg-positive/10 text-positive border border-positive/20',
  OUT_FOR_DELIVERY: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  DELIVERED: 'bg-positive/10 text-positive border border-positive/20',
  DAMAGED: 'bg-negative/10 text-negative border border-negative/20',
  CANCELLED: 'bg-slate-700/40 text-slate-400 border border-slate-700',
  DELAYED: 'bg-negative/10 text-negative border border-negative/20',
  LOW: 'risk-low',
  MEDIUM: 'risk-medium',
  HIGH: 'risk-high',
  CRITICAL: 'bg-negative/20 text-negative border border-negative/30',
  URGENT: 'bg-negative/10 text-negative border border-negative/20',
  NORMAL: 'bg-muted text-muted-foreground border border-border',
  FRAGILE: 'fragility-fragile border border-negative/20',
  ADMIN: 'bg-primary/10 text-primary border border-primary/20',
  LOADER: 'bg-accent/10 text-accent border border-accent/20',
  ACTIVE: 'bg-positive/10 text-positive border border-positive/20',
  INACTIVE: 'bg-muted text-muted-foreground border border-border',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ variant, label, size = 'sm' }: StatusBadgeProps) {
  const classes = VARIANT_CLASSES[variant] ?? 'bg-muted text-muted-foreground border border-border';
  const displayLabel = label ?? variant.replace('_', ' ');
  return (
    <span
      className={`status-badge ${classes} ${size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'}`}
    >
      {displayLabel}
    </span>
  );
}
