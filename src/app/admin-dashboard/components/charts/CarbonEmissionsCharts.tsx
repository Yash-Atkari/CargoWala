'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CARBON_EMISSION_DATA } from '@/lib/mockData';

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated p-3 shadow-elevated text-xs space-y-1.5">
      <p className="font-600 text-foreground border-b border-border pb-1 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={`co2-tip-${p.name}`} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-tabular font-600 text-foreground">
            {p.value}
            {p.name === 'CO₂ (kg)' ? ' kg' : ' L'}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function CarbonEmissionsChart() {
  return (
    <div className="card-elevated p-4 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-600 text-foreground">CO₂ & Fuel Estimates</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Last 7 days — kg CO₂ & litres</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={CARBON_EMISSION_DATA}>
          <defs>
            <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="emissions"
            name="CO₂ (kg)"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#co2Gradient)"
          />
          <Area
            type="monotone"
            dataKey="fuel"
            name="Fuel (L)"
            stroke="#0EA5E9"
            strokeWidth={2}
            fill="url(#fuelGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
