'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SHIPMENT_STATUS_DATA } from '@/lib/mockData';

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="card-elevated p-3 shadow-elevated text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: d.payload.color }}
        />
        <span className="text-muted-foreground">{d.name}</span>
        <span className="font-tabular font-700 text-foreground ml-1">{d.value}</span>
      </div>
    </div>
  );
};

interface ShipmentStatusChartProps {
  shipments?: any[];
}

export default function ShipmentStatusChart({ shipments = [] }: ShipmentStatusChartProps) {
  const statusCounts = {
    'In Transit': shipments.filter((s) => s.status === 'IN_TRANSIT').length,
    'Loading': shipments.filter((s) => s.status === 'LOADING').length,
    'Delivered': shipments.filter((s) => s.status === 'DELIVERED').length,
    'Delayed': shipments.filter((s) => s.status === 'DELAYED').length,
    'Pending': shipments.filter((s) => s.status === 'PENDING').length,
  };

  const chartData = shipments.length > 0
    ? [
        { name: 'In Transit', value: statusCounts['In Transit'], color: '#A78BFA' },
        { name: 'Loading', value: statusCounts['Loading'], color: '#0EA5E9' },
        { name: 'Delivered', value: statusCounts['Delivered'], color: '#22C55E' },
        { name: 'Delayed', value: statusCounts['Delayed'], color: '#EF4444' },
        { name: 'Pending', value: statusCounts['Pending'], color: '#64748B' },
      ]
    : SHIPMENT_STATUS_DATA;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card-elevated p-4 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-600 text-foreground">Shipment Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{total} total shipments</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData.filter((d) => d.value > 0)}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.filter((d) => d.value > 0).map((entry, index) => (
              <Cell key={`cell-status-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
