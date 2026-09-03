'use client';
import React from 'react';
import { PackageStatus, ShipmentStatus } from '@/lib/types';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Navigation,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const LIFECYCLE_STEPS: {
  status: PackageStatus;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}[] = [
  { status: 'PENDING', label: 'Created / Staged', desc: 'Received at terminal', icon: Clock },
  { status: 'LOADED', label: 'Vehicle Loaded', desc: 'Scanned & secured in truck', icon: Package },
  { status: 'IN_TRANSIT', label: 'In Transit', desc: 'En route between hubs', icon: Truck },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'On last-mile delivery vehicle', icon: Navigation },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Signed & verified by consignee', icon: CheckCircle2 },
];

interface StatusTrackingTimelineProps {
  currentStatus: PackageStatus | ShipmentStatus;
  packageId?: string;
  packageName?: string;
  digitalId?: string;
  destination?: string;
  onUpdateStatus?: (newStatus: PackageStatus) => void;
  isInteractive?: boolean;
}

export default function StatusTrackingTimeline({
  currentStatus,
  packageId,
  packageName,
  digitalId,
  destination,
  onUpdateStatus,
  isInteractive = false,
}: StatusTrackingTimelineProps) {
  const currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === currentStatus);
  const isDamaged = currentStatus === 'DAMAGED';
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="card-elevated p-4 rounded-2xl border border-border bg-slate-950/40 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{packageName || 'Shipment Cargo'}</span>
            {digitalId && <span className="text-[10px] font-mono text-muted-foreground">{digitalId}</span>}
          </div>
          {destination && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-primary" />
              <span>Destination: {destination}</span>
            </p>
          )}
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isDamaged
              ? 'bg-negative/20 text-negative border-negative/30'
              : isCancelled
                ? 'bg-slate-700 text-slate-300 border-slate-600'
                : currentStatus === 'DELIVERED'
                  ? 'bg-positive/20 text-positive border-positive/30'
                  : 'bg-primary/20 text-primary border-primary/30'
          }`}
        >
          {currentStatus}
        </span>
      </div>

      {/* Stepper Timeline */}
      <div className="relative flex items-center justify-between pt-2">
        {/* Connecting line */}
        <div className="absolute top-5 inset-x-4 h-0.5 bg-slate-800 -z-0" />
        <div
          className="absolute top-5 left-4 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{
            width: `${Math.max(0, Math.min(100, (currentIndex / (LIFECYCLE_STEPS.length - 1)) * 100))}%`,
          }}
        />

        {LIFECYCLE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.status}
              onClick={() => isInteractive && onUpdateStatus && onUpdateStatus(step.status)}
              className={`flex flex-col items-center text-center z-10 ${
                isInteractive ? 'cursor-pointer group' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent
                    ? 'bg-primary border-white text-white shadow-lg shadow-primary/30 scale-110'
                    : isPassed
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <Icon size={14} />
              </div>

              <span
                className={`text-[10px] font-bold mt-2 ${
                  isCurrent
                    ? 'text-primary'
                    : isPassed
                      ? 'text-white'
                      : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[8px] text-slate-500 hidden sm:block max-w-[70px] leading-tight mt-0.5">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick Advance Status Action */}
      {isInteractive && onUpdateStatus && currentIndex < LIFECYCLE_STEPS.length - 1 && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Advance lifecycle state:</span>
          <button
            onClick={() => onUpdateStatus(LIFECYCLE_STEPS[currentIndex + 1].status)}
            className="px-3 py-1 rounded-lg gradient-primary text-white text-[10px] font-bold hover:opacity-90 flex items-center gap-1 shadow-sm shadow-primary/20"
          >
            <span>Mark {LIFECYCLE_STEPS[currentIndex + 1].label}</span>
            <ArrowRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
