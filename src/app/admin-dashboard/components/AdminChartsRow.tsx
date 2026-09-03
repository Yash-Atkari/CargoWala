'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { Truck, Shipment } from '@/lib/types';

const TruckUtilizationChart = dynamic(() => import('./charts/TruckUtilizationChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

const ShipmentStatusChart = dynamic(() => import('./charts/ShipmentStatusChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

interface AdminChartsRowProps {
  trucks?: Truck[];
  shipments?: Shipment[];
}

export default function AdminChartsRow({ trucks = [], shipments = [] }: AdminChartsRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-1">
        <TruckUtilizationChart trucks={trucks} />
      </div>
      <div className="lg:col-span-1">
        <ShipmentStatusChart shipments={shipments} />
      </div>
    </div>
  );
}
