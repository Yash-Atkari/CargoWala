import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  variant?: 'default' | 'alert' | 'warning' | 'positive' | 'hero';
  className?: string;
}

export default function MetricCard({
  label, value, unit, subtext, trend, trendValue, icon: Icon,
  iconColor = 'text-primary', variant = 'default', className = '',
}: MetricCardProps) {
  const variantClasses = {
    default: 'card-elevated',
    alert: 'card-elevated border-negative/40 bg-negative/5',
    warning: 'card-elevated border-warning/40 bg-warning/5',
    positive: 'card-elevated border-positive/40 bg-positive/5',
    hero: 'card-elevated border-primary/30 bg-gradient-to-br from-primary/10 to-transparent',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-positive' : trend === 'down' ? 'text-negative' : 'text-muted-foreground';

  return (
    <div className={`${variantClasses[variant]} p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-muted/60`}>
          <Icon size={16} className={iconColor} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-500 ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`font-tabular font-bold text-foreground ${variant === 'hero' ? 'text-3xl' : 'text-2xl'}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
        </div>
        <p className="text-xs font-500 text-muted-foreground mt-0.5 tracking-wide uppercase" style={{ letterSpacing: '0.04em' }}>
          {label}
        </p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </div>
  );
}