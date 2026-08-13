'use client';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { TRUCK_UTILIZATION_DATA } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated p-3 shadow-elevated text-xs space-y-1.5 min-w-[140px]">
      <p className="font-600 text-foreground border-b border-border pb-1.5 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={`tooltip-${p.name}`} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-tabular font-600 text-foreground">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function TruckUtilizationChart() {
  return (
    <div className="card-elevated p-4 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-600 text-foreground">Truck Utilization</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Space & weight % per truck</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={TRUCK_UTILIZATION_DATA} barSize={8} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="space" name="Space %" radius={[2, 2, 0, 0]}>
            {TRUCK_UTILIZATION_DATA.map((entry, index) => (
              <Cell
                key={`space-cell-${index}`}
                fill={entry.space >= 90 ? '#EF4444' : entry.space >= 75 ? '#F59E0B' : 'var(--primary)'}
              />
            ))}
          </Bar>
          <Bar dataKey="weight" name="Weight %" fill="var(--secondary-foreground)" radius={[2, 2, 0, 0]} opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}